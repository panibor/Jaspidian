import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

interface FBPluginSettings {
  port: number;
  token: string;
  // AI prettify
  aiProvider: 'none' | 'openrouter' | 'ollama';
  openrouterApiKey: string;
  openrouterModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  ollamaApiKey: string;   // optional - for remote/cloud Ollama instances that require auth
  ollamaFormat: 'native' | 'openai'; // native = /api/chat, openai = /v1/chat/completions
  autoPrettify: boolean;
}

const DEFAULT_SETTINGS: FBPluginSettings = {
  port: 37123,
  token: '',
  aiProvider: 'none',
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-flash-1.5',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  ollamaApiKey: '',
  ollamaFormat: 'native',
  autoPrettify: false,
};

// ---------------------------------------------------------------------------
// Types matching the Chrome extension's request shapes
// ---------------------------------------------------------------------------

interface AttachmentItem {
  key: string;
  remoteUrl?: string;
  fullResolutionUrl?: string;
  alt?: string;
  data?: string;
  mimeType?: string;
}

interface NoteRequest {
  postId?: string;
  filename: string;
  folder: string;
  attachmentFolder?: string;
  markdown: string;
  collisionPolicy?: 'skip' | 'overwrite' | 'suffix';
  attachments?: AttachmentItem[];
}

interface BatchRequest {
  notes: NoteRequest[];
}

// ---------------------------------------------------------------------------
// AI Prettify - system prompt + API callers
// ---------------------------------------------------------------------------

const PRETTIFY_SYSTEM_PROMPT = `You are a formatter for Facebook posts saved as Obsidian notes.
Transform the raw captured note into a clean, structured, beautiful Obsidian note.

## Language

**Target language for this note: {LANG_NAME} ({LANG_CODE}).** (Detected from the post body.)

The English templates below are shown with English labels. If the target language is English, use the labels VERBATIM. If the target language is anything else, TRANSLATE only the English label words shown in the templates (Source, Posted by, Group, Page, Date, Link, "Open the post on Facebook", Summary, Media, Comments, "No comments on this post.", Product, Details, Price) into natural {LANG_NAME}. Do NOT change Markdown punctuation, Obsidian callout syntax, the \`>\` prefix on callout lines, the \`**bold**\` markup, frontmatter keys, URLs, dates, or numbers.

Never translate the post body itself - preserve the author's original wording exactly.

Never emit literal placeholder text like \`{Source}\` or \`{LANG_NAME}\` in the output - those are meta-references inside this prompt, not output tokens.

## Transformation rules

### Frontmatter
- Keep these existing fields exactly as they appear: title, author, permalink, group, page, profile, date.
- The \`author\`, \`group\`, \`page\`, and \`profile\` fields are already markdown links in the form \`[Name](url)\` - preserve them verbatim. Do not split them into separate \`*_url\` fields.
- Add \`source: "Facebook"\` if not present.
- Do NOT add \`type\`, \`lang\`, \`language\`, \`author_url\`, \`group_url\`, \`page_url\`, \`profile_url\`, \`cssclasses\` - these fields must not appear in the output frontmatter.
- Infer and add if present: location, status (in {LANG_NAME})
- For \`tags\`: replace any existing tags (or add if absent) with 4–8 relevant lowercase tags in {LANG_NAME} (hyphens between words, no spaces, no emoji). Use YAML list format:
\`\`\`
tags:
  - tag-one
  - tag-two
\`\`\`
- Strip tracking params from ALL urls (__cft__[...], __tn__=..., hoisted_section_header_type=...)

### Source callout
Replace the raw "*Posted by [Name](url) in [Group](url) · time · [link](url)*" line with a callout. The English template - EVERY line MUST begin with \`> \` exactly:
\`\`\`
> [!info] Source
> **Posted by:** [Name](clean_url)
> **Group:** [Group](clean_url)
> **Date:** YYYY-MM-DD
> **Link:** [Open the post on Facebook](clean_permalink)
\`\`\`
Use "Group" if the post is in a group, "Page" if on a page, "Profile" if on a personal profile. The Posted-by name and URL come from the \`author\` frontmatter field (which is already a \`[Name](url)\` markdown link). Translate the English label words to {LANG_NAME} when {LANG_NAME} is not English.

### Summary
Immediately after the source callout, add a Summary section with a [!summary] callout listing 3–6 key facts (who/what/where/price range/etc.). English template - every line MUST begin with \`> \`:
\`\`\`
## Summary

> [!summary] Summary
> - Key fact one
> - Key fact two
> - Key fact three
\`\`\`
Translate "Summary" (used twice - heading and callout title) and the bullet contents to {LANG_NAME} when {LANG_NAME} is not English.

### Content structure
- Remove the raw "## Post" heading - the content follows naturally after the Summary section
- Convert unordered item/price lists into clean markdown tables. English column headers: Product / Details / Price. Price column always right-aligned (---:). Keep prices in the post's original currency and format.
- Split long product lists into logical ### sub-headings
- Preserve all text; do not summarise or omit product details

### Sections
- \`## Media\` keeps that heading in English when {LANG_NAME} is English; translate "Media" otherwise.
- \`## Comments\` likewise - keep "Comments" in English when {LANG_NAME} is English, translate otherwise. If the section is empty, write a single line below it: \`No comments on this post.\` (translated to {LANG_NAME} when not English).
- Keep every image embed exactly as-is, with a blank line between each image. This includes both \`![[Facebook/_attachments/...]]\` Obsidian wikilinks and \`![alt](url)\` standard markdown embeds - preserve the form, the alt text, and the URL verbatim. Never strip the leading \`!\`, never replace a URL with a placeholder, never convert one form into the other.

### Comment callouts (preserving structure)
Comments arrive as one Obsidian callout each. The exact syntax that MUST be preserved on every comment header line:
\`\`\`
> [!note]+ 💬 [Author Name](url) · *time*
> comment body line 1
> comment body line 2
\`\`\`
Rules:
- \`[!note]+\` is a single token: there is NO space between \`]\` and \`+\`. Never write \`[!note] +\`.
- Every line of the callout (header AND body lines) MUST start with \`> \`. Do not strip the \`>\` prefix.
- Do not translate or rewrite comment body text - keep it verbatim.
- Replies use \`[!example]+ ↳ \` with one extra \`> \` of nesting per depth.

### Output
Return ONLY the complete transformed markdown. No explanation. No code fences around the whole output. No preamble.`;

const LANG_NAME_MAP: Record<string, string> = {
  en: 'English', he: 'Hebrew', ar: 'Arabic', ru: 'Russian', uk: 'Ukrainian',
  fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
  nl: 'Dutch', pl: 'Polish', tr: 'Turkish', el: 'Greek', sv: 'Swedish',
  da: 'Danish', no: 'Norwegian', nb: 'Norwegian', nn: 'Norwegian',
  fi: 'Finnish', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian',
  id: 'Indonesian', vi: 'Vietnamese', th: 'Thai',
  ja: 'Japanese', zh: 'Chinese', ko: 'Korean', hi: 'Hindi',
  ka: 'Georgian', hy: 'Armenian', am: 'Amharic', km: 'Khmer', my: 'Burmese',
  fa: 'Persian', ur: 'Urdu', yi: 'Yiddish',
};

function _stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/**
 * Detect the post body's language from the dominant non-Latin script.
 * Falls back to "en" - the AI will treat any Latin-script content as English
 * unless the body is clearly another script, which matches the existing
 * scanner-side behaviour for posts where script detection is inconclusive.
 */
function _detectBodyLanguage(content: string): string {
  const body = _stripFrontmatter(content);
  let hebrew = 0, arabic = 0, cyrillic = 0, greek = 0, devanagari = 0;
  let thai = 0, hiragana = 0, katakana = 0, hangul = 0, cjk = 0;
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    if (code >= 0x0590 && code <= 0x05ff) hebrew++;
    else if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if (code >= 0x0400 && code <= 0x04ff) cyrillic++;
    else if (code >= 0x0370 && code <= 0x03ff) greek++;
    else if (code >= 0x0900 && code <= 0x097f) devanagari++;
    else if (code >= 0x0e00 && code <= 0x0e7f) thai++;
    else if (code >= 0x3040 && code <= 0x309f) hiragana++;
    else if (code >= 0x30a0 && code <= 0x30ff) katakana++;
    else if (code >= 0xac00 && code <= 0xd7af) hangul++;
    else if (code >= 0x4e00 && code <= 0x9fff) cjk++;
  }
  if (hebrew > 10) return 'he';
  if (arabic > 10) return 'ar';
  if (hangul > 10) return 'ko';
  if (thai > 10) return 'th';
  if (devanagari > 10) return 'hi';
  if (greek > 10) return 'el';
  if (hiragana + katakana > 5) return 'ja';
  if (cjk > 10) return 'zh';
  if (cyrillic > 10) return 'ru';
  return 'en';
}

function _resolvePromptLanguage(content: string): { code: string; name: string } {
  const code = _detectBodyLanguage(content);
  const name = LANG_NAME_MAP[code] || 'English';
  return { code, name };
}

function _buildPrettifyPrompt(content: string): string {
  const { code, name } = _resolvePromptLanguage(content);
  return PRETTIFY_SYSTEM_PROMPT
    .replace(/\{LANG_NAME\}/g, name)
    .replace(/\{LANG_CODE\}/g, code);
}

async function _callOpenRouter(content: string, apiKey: string, model: string): Promise<string> {
  const systemPrompt = _buildPrettifyPrompt(content);
  const resp = await requestUrl({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jaspidian.app',
      'X-Title': 'Jaspidian',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      temperature: 0.2,
      max_tokens: 6000,
    }),
  });
  if (resp.status >= 400) {
    throw new Error(`OpenRouter ${resp.status}: ${resp.text.slice(0, 200)}`);
  }
  return (resp.json.choices?.[0]?.message?.content || '').trim();
}

function _ollamaBase(url: string): string {
  // Strip trailing slash and trailing /api so users can paste either
  // https://ollama.com  OR  https://ollama.com/api and both work.
  return url.replace(/\/$/, '').replace(/\/api$/, '');
}

async function _callOllama(
  content: string, baseUrl: string, model: string,
  apiKey?: string, format: 'native' | 'openai' = 'native'
): Promise<string> {
  const systemPrompt = _buildPrettifyPrompt(content);
  const base = _ollamaBase(baseUrl);
  const url = format === 'openai' ? `${base}/v1/chat/completions` : `${base}/api/chat`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
  };
  if (format === 'openai') {
    body.temperature = 0.2;
    body.max_tokens = 6000;
  } else {
    body.stream = false;
  }
  const resp = await requestUrl({ url, method: 'POST', headers, body: JSON.stringify(body) });
  if (resp.status >= 400) {
    throw new Error(`Ollama ${resp.status}: ${resp.text.slice(0, 200)}`);
  }
  if (format === 'openai') {
    return (resp.json.choices?.[0]?.message?.content || '').trim();
  }
  return (resp.json.message?.content || '').trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function mimeToExt(mime?: string): string {
  return MIME_TO_EXT[mime || ''] || 'jpg';
}

const UI_FRAGMENTS = /\b(See less|See more|ראה פחות|ראה עוד|פחות|עוד)\b/g;

function stripUIFragments(text: string): string {
  return text.replace(UI_FRAGMENTS, '').replace(/  +/g, ' ').trim();
}

function stripTrackingParams(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s)\]"]+)/g,
    (url) => {
      try {
        const u = new URL(url);
        for (const key of [...u.searchParams.keys()]) {
          if (key.startsWith('__') || key === 'hoisted_section_header_type') u.searchParams.delete(key);
        }
        return u.toString();
      } catch {
        return url;
      }
    }
  );
}

function fixNote(content: string): string {
  return stripTrackingParams(stripUIFragments(content));
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default class JaspidianPlugin extends Plugin {
  settings: FBPluginSettings;
  private server: http.Server | null = null;
  private _serverStatus = 'stopped';

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FBSettingTab(this.app, this));
    this.startServer();

    this.addCommand({
      id: 'fix-facebook-notes',
      name: 'Fix all Facebook notes (strip UI text, clean URLs)',
      callback: () => this.fixAllFacebookNotes(),
    });

    this.addCommand({
      id: 'prettify-current-note',
      name: 'Prettify current note with AI',
      callback: () => this.prettifyCurrentNote(),
    });

    this.addCommand({
      id: 'preview-prettify-current-note',
      name: 'Preview AI prettify (show output without saving)',
      callback: () => this.previewPrettifyCurrentNote(),
    });
  }

  async onunload() {
    this.stopServer();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get serverStatus() { return this._serverStatus; }

  // ---- AI prettify ----

  async prettifyNote(content: string): Promise<string> {
    const { aiProvider, openrouterApiKey, openrouterModel, ollamaUrl, ollamaModel } = this.settings;
    let raw: string;
    if (aiProvider === 'openrouter') {
      if (!openrouterApiKey) throw new Error('OpenRouter API key not set');
      raw = await _callOpenRouter(content, openrouterApiKey, openrouterModel);
    } else if (aiProvider === 'ollama') {
      raw = await _callOllama(content, ollamaUrl, ollamaModel, this.settings.ollamaApiKey || undefined, this.settings.ollamaFormat);
    } else {
      throw new Error('No AI provider configured. Set one in Jaspidian settings.');
    }
    // Strip wrapping code fences that some models add despite being told not to
    return raw.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)```\s*$/, '$1').trim();
  }

  private async _runPrettify(file: ReturnType<typeof this.app.workspace.getActiveFile>, dryRun: boolean) {
    if (!file) { new Notice('No active file.', 3000); return; }
    const notice = new Notice(`⏳ ${dryRun ? 'Previewing' : 'Prettifying'} with AI…`, 0);
    try {
      const original = await this.app.vault.read(file);
      const prettified = await this.prettifyNote(original);
      notice.hide();
      if (!prettified) { new Notice('⚠ AI returned empty response.', 6000); return; }
      if (dryRun) {
        // Show first 400 chars so user can verify the model is working
        const preview = prettified.slice(0, 400) + (prettified.length > 400 ? '\n…' : '');
        new Notice(`Preview (${prettified.length} chars):\n\n${preview}`, 0);
        return;
      }
      await this.app.vault.modify(file, prettified);
      const delta = prettified.length - original.length;
      const sign = delta >= 0 ? '+' : '';
      new Notice(`✓ Prettified: ${file.name}  (${sign}${delta} chars)`, 5000);
    } catch (err) {
      notice.hide();
      new Notice(`✗ Prettify failed: ${err instanceof Error ? err.message : String(err)}`, 10000);
    }
  }

  private async prettifyCurrentNote() {
    if (this.settings.aiProvider === 'none') {
      new Notice('No AI provider configured. Set one in Jaspidian settings.', 6000);
      return;
    }
    await this._runPrettify(this.app.workspace.getActiveFile(), false);
  }

  private async previewPrettifyCurrentNote() {
    if (this.settings.aiProvider === 'none') {
      new Notice('No AI provider configured. Set one in Jaspidian settings.', 6000);
      return;
    }
    await this._runPrettify(this.app.workspace.getActiveFile(), true);
  }

  // ---- Server lifecycle ----

  startServer() {
    this.stopServer();
    const port = this.settings.port;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.server.on('error', (err: NodeJS.ErrnoException) => {
      this._serverStatus = 'error';
      const msg = err.code === 'EADDRINUSE'
        ? `Jaspidian: Port ${port} is in use. Change the port in plugin settings.`
        : `Jaspidian: Server error - ${err.message}`;
      new Notice(msg, 8000);
    });
    this.server.listen(port, '127.0.0.1', () => {
      this._serverStatus = 'running';
    });
  }

  stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this._serverStatus = 'stopped';
    }
  }

  restartServer() { this.startServer(); }

  // ---- Request router ----

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const method = (req.method || 'GET').toUpperCase();
    const pathname = (req.url || '/').split('?')[0];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (pathname !== '/health' && this.settings.token) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${this.settings.token}`) {
        this.sendJson(res, 401, { ok: false, error: 'Unauthorized' }); return;
      }
    }

    if (method === 'GET' && pathname === '/health') {
      this.sendJson(res, 200, { ok: true, aiProvider: this.settings.aiProvider }); return;
    }

    if (method === 'GET' && pathname === '/vault/info') {
      this.sendJson(res, 200, {
        ok: true,
        vaultName: this.app.vault.getName(),
        vaultRoot: (this.app.vault.adapter as any).basePath ?? '',
      });
      return;
    }

    if (method === 'POST' && (pathname === '/notes' || pathname === '/notes/batch')) {
      this.readBody(req).then(async (body) => {
        try {
          if (pathname === '/notes') {
            const result = await this.writeNote(body as NoteRequest);
            this.sendJson(res, 200, { ok: true, ...result });
          } else {
            const batch = body as BatchRequest;
            const results = await Promise.all((batch.notes || []).map(n => this.writeNote(n)));
            this.sendJson(res, 200, { ok: true, results });
          }
        } catch (err) {
          this.sendJson(res, 500, { ok: false, error: String(err) });
        }
      }).catch(() => this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' }));
      return;
    }

    // POST /prettify  { "notePath": "Facebook/2026/note.md" }
    if (method === 'POST' && pathname === '/prettify') {
      this.readBody(req).then(async (body) => {
        const { notePath } = body as { notePath?: string };
        if (!notePath) {
          this.sendJson(res, 400, { ok: false, error: 'notePath required' }); return;
        }
        try {
          const warnings: string[] = [];
          const file = this.app.vault.getAbstractFileByPath(notePath);
          if (!(file instanceof TFile)) {
            this.sendJson(res, 404, { ok: false, error: `Note not found: ${notePath}` }); return;
          }
          const original = await this.app.vault.read(file);
          const prettified = await this.prettifyNote(original);
          if (!prettified) throw new Error('AI returned empty response');
          await this.app.vault.modify(file, prettified);
          this.sendJson(res, 200, { ok: true, notePath, warnings });
        } catch (err) {
          this.sendJson(res, 500, { ok: false, error: String(err) });
        }
      }).catch(() => this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' }));
      return;
    }

    this.sendJson(res, 404, { ok: false, error: `No route for ${method} ${pathname}` });
  }

  // ---- Write a note (with attachments) ----

  private async writeNote(note: NoteRequest): Promise<{ status: string; notePath?: string; warnings: string[] }> {
    const warnings: string[] = [];
    const folder = (note.folder || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const attachFolder = (note.attachmentFolder || `${folder}/_attachments/${note.filename?.replace(/\.md$/, '')}`).replace(/\\/g, '/');
    const notePath = folder ? `${folder}/${note.filename}` : note.filename;

    if (folder) await this.ensureFolder(folder);

    // Write attachment files and build remoteUrl → local wikilink map
    const urlToWikilink: Map<string, string> = new Map();
    for (const att of (note.attachments || [])) {
      if (!att.data) { warnings.push(`No image data for ${att.key}`); continue; }
      const ext = mimeToExt(att.mimeType);
      const localPath = `${attachFolder}/${att.key}.${ext}`;
      try {
        await this.ensureFolder(attachFolder);
        const buf = Buffer.from(att.data, 'base64');
        const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
        await this.app.vault.adapter.writeBinary(localPath, arrayBuffer);
        const url = att.fullResolutionUrl || att.remoteUrl;
        if (url) urlToWikilink.set(url, localPath);
        if (att.remoteUrl && att.remoteUrl !== url) urlToWikilink.set(att.remoteUrl, localPath);
      } catch (err) {
        warnings.push(`Failed to write ${att.key}: ${err}`);
      }
    }

    // Replace image links in markdown with local wikilink embeds
    let markdown = note.markdown;
    for (const [url, localPath] of urlToWikilink) {
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      markdown = markdown.replace(new RegExp(`!?\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), `![[${localPath}]]`);
    }

    // Collision handling
    let finalPath = notePath;
    const exists = await this.app.vault.adapter.exists(notePath);
    if (exists && note.collisionPolicy === 'skip') {
      return { status: 'skipped', notePath, warnings: ['skipped: file already exists'] };
    }
    if (exists && note.collisionPolicy === 'suffix') {
      finalPath = await this.suffixPath(notePath);
    }

    if (await this.app.vault.adapter.exists(finalPath)) {
      await this.app.vault.adapter.write(finalPath, markdown);
    } else {
      await this.app.vault.create(finalPath, markdown);
    }

    new Notice(`Saved: ${finalPath.split('/').pop()}`, 3000);

    // Surface attachment failures - broken images in the note are usually
    // explained by the extension failing to fetch the CDN URL before sending.
    const missingAttachments = (note.attachments || []).filter((a) => !a.data).length;
    if (missingAttachments > 0) {
      new Notice(
        `⚠ ${missingAttachments} image${missingAttachments === 1 ? '' : 's'} couldn't be downloaded - check the extension service-worker console for "[jaspidian] image fetch" errors.`,
        8000,
      );
    }

    // Auto-prettify if configured
    if (this.settings.autoPrettify && this.settings.aiProvider !== 'none') {
      // Fire and forget - don't block the response
      this.prettifyNote(markdown).then(async (prettified) => {
        if (!prettified) return;
        const file = this.app.vault.getAbstractFileByPath(finalPath);
        if (file instanceof TFile) {
          await this.app.vault.modify(file, prettified);
          new Notice(`✓ Auto-prettified: ${finalPath.split('/').pop()}`, 3000);
        }
      }).catch((err) => {
        new Notice(`Auto-prettify failed: ${err instanceof Error ? err.message : String(err)}`, 6000);
      });
    }

    return { status: 'ok', notePath: finalPath, warnings };
  }

  // ---- Fix existing Facebook notes ----

  private async fixAllFacebookNotes() {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Facebook/'));
    if (files.length === 0) {
      new Notice('No Facebook notes found.', 4000); return;
    }
    let fixed = 0;
    for (const file of files) {
      const original = await this.app.vault.read(file);
      const updated = fixNote(original);
      if (updated !== original) {
        await this.app.vault.modify(file, updated);
        fixed++;
      }
    }
    new Notice(`Fixed ${fixed} of ${files.length} Facebook note${files.length !== 1 ? 's' : ''}.`, 5000);
  }

  // ---- Helpers ----

  private async ensureFolder(folderPath: string): Promise<void> {
    const parts = folderPath.split('/');
    let current = '';
    for (const part of parts) {
      if (!part) continue;
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        try {
          await this.app.vault.createFolder(current);
        } catch (err) {
          // Another concurrent export may have created the folder between our
          // exists() check and createFolder() - that is fine, just continue.
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('Folder already exists')) throw err;
        }
      }
    }
  }

  private async suffixPath(path: string): Promise<string> {
    const dot = path.lastIndexOf('.');
    const base = dot > 0 ? path.slice(0, dot) : path;
    const ext = dot > 0 ? path.slice(dot) : '';
    let n = 1;
    let candidate = path;
    while (await this.app.vault.adapter.exists(candidate)) {
      candidate = `${base}-${n}${ext}`; n++;
    }
    return candidate;
  }

  private readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: http.ServerResponse, status: number, body: unknown) {
    const json = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
    res.end(json);
  }
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

class FBSettingTab extends PluginSettingTab {
  plugin: JaspidianPlugin;
  availableModels: string[] = [];

  constructor(app: App, plugin: JaspidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async fetchOllamaModels(): Promise<string[]> {
    const base = _ollamaBase(this.plugin.settings.ollamaUrl);
    if (!base) throw new Error('Ollama URL is not set');
    const headers: Record<string, string> = {};
    if (this.plugin.settings.ollamaApiKey) headers['Authorization'] = `Bearer ${this.plugin.settings.ollamaApiKey}`;

    if (this.plugin.settings.ollamaFormat === 'openai') {
      const resp = await requestUrl({ url: `${base}/v1/models`, headers });
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status} from ${base}/v1/models - ${resp.text.slice(0, 120)}`);
      return ((resp.json.data || []) as {id: string}[]).map(m => m.id).filter(Boolean).sort();
    } else {
      const resp = await requestUrl({ url: `${base}/api/tags`, headers });
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status} from ${base}/api/tags - ${resp.text.slice(0, 120)}`);
      return ((resp.json.models || []) as {name: string}[]).map(m => m.name).filter(Boolean).sort();
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Server ──────────────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Jaspidian' });
    containerEl.createEl('p', {
      text: 'Runs a local server so the Jaspidian Chrome extension can save posts directly into this vault.',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('Port')
      .setDesc('Local port. Default: 37123. Restart required after change.')
      .addText(text => text
        .setPlaceholder('37123')
        .setValue(String(this.plugin.settings.port))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          if (n > 1024 && n < 65536) { this.plugin.settings.port = n; await this.plugin.saveSettings(); }
        }));

    new Setting(containerEl)
      .setName('Auth token (optional)')
      .setDesc('Secret shared with the extension to block other local apps from writing to your vault.')
      .addText(text => text
        .setPlaceholder('Leave blank to disable')
        .setValue(this.plugin.settings.token)
        .onChange(async (value) => {
          this.plugin.settings.token = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Restart server')
      .setDesc('Apply port or token changes without restarting Obsidian.')
      .addButton(btn => btn.setButtonText('Restart').onClick(() => {
        this.plugin.restartServer();
        new Notice('Server restarted.', 3000);
      }));

    new Setting(containerEl)
      .setName('Fix existing Facebook notes')
      .setDesc('Scans all notes in Facebook/ and strips UI text and tracking URLs.')
      .addButton(btn => btn.setButtonText('Run now').onClick(() => {
        (this.plugin as any).fixAllFacebookNotes();
      }));

    containerEl.createEl('p', {
      text: `Status: ${this.plugin.serverStatus === 'running' ? `listening on port ${this.plugin.settings.port}` : this.plugin.serverStatus}`,
      cls: 'setting-item-description',
    }).style.fontStyle = 'italic';

    // ── AI Prettify ─────────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'AI Prettify' });
    containerEl.createEl('p', {
      text: 'Restructure raw captured notes into clean Hebrew Obsidian notes with callouts, tables, and inferred tags. Use the command palette: "Prettify current Facebook note with AI".',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('AI provider')
      .setDesc('Which AI service to use for prettification.')
      .addDropdown(dd => dd
        .addOption('none', 'Disabled')
        .addOption('openrouter', 'OpenRouter (cloud)')
        .addOption('ollama', 'Ollama (local / cloud)')
        .setValue(this.plugin.settings.aiProvider)
        .onChange(async (value) => {
          this.plugin.settings.aiProvider = value as FBPluginSettings['aiProvider'];
          await this.plugin.saveSettings();
          this.display(); // re-render to show/hide relevant fields
        }));

    if (this.plugin.settings.aiProvider === 'openrouter') {
      new Setting(containerEl)
        .setName('OpenRouter API key')
        .setDesc('Get one at openrouter.ai/keys')
        .addText(text => text
          .setPlaceholder('sk-or-...')
          .setValue(this.plugin.settings.openrouterApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openrouterApiKey = value.trim();
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Model')
        .setDesc('Recommended: google/gemini-flash-1.5 (fast, cheap). Or: anthropic/claude-haiku-3-5')
        .addText(text => text
          .setPlaceholder('google/gemini-flash-1.5')
          .setValue(this.plugin.settings.openrouterModel)
          .onChange(async (value) => {
            this.plugin.settings.openrouterModel = value.trim();
            await this.plugin.saveSettings();
          }));
    }

    if (this.plugin.settings.aiProvider === 'ollama') {
      // ── Endpoint format (first - affects which URLs the fetch button tries) ──
      new Setting(containerEl)
        .setName('Endpoint format')
        .setDesc('Native → /api/chat + /api/tags (self-hosted Ollama). OpenAI → /v1/chat/completions + /v1/models (most cloud providers).')
        .addDropdown(dd => dd
          .addOption('native', 'Ollama native')
          .addOption('openai', 'OpenAI-compatible')
          .setValue(this.plugin.settings.ollamaFormat)
          .onChange(async (value) => {
            this.plugin.settings.ollamaFormat = value as 'native' | 'openai';
            await this.plugin.saveSettings();
            this.availableModels = [];
            this.display();
          }));

      // ── URL + Fetch button ──────────────────────────────────────────────────
      const urlSetting = new Setting(containerEl)
        .setName('Ollama URL')
        .setDesc('Local: http://localhost:11434  |  Remote: https://your-server.com')
        .addText(text => text
          .setPlaceholder('http://localhost:11434')
          .setValue(this.plugin.settings.ollamaUrl)
          .onChange(async (value) => {
            this.plugin.settings.ollamaUrl = value.trim();
            await this.plugin.saveSettings();
            this.availableModels = [];
          }));
      urlSetting.addButton(btn => {
        btn.setButtonText('Fetch models').setCta().onClick(async () => {
          btn.setButtonText('Fetching…').setDisabled(true);
          try {
            const models = await this.fetchOllamaModels();
            this.availableModels = models;
            new Notice(`✓ Found ${models.length} model${models.length !== 1 ? 's' : ''}`, 3000);
            this.display();
          } catch (err) {
            new Notice(`✗ ${err instanceof Error ? err.message : String(err)}`, 10000);
            btn.setButtonText('Fetch models').setDisabled(false);
          }
        });
      });

      // ── Model - dropdown when fetched, text input otherwise ────────────────
      if (this.availableModels.length > 0) {
        new Setting(containerEl)
          .setName('Model')
          .setDesc(`${this.availableModels.length} models fetched from server`)
          .addDropdown(dd => {
            // Keep current value even if not in list
            if (this.plugin.settings.ollamaModel && !this.availableModels.includes(this.plugin.settings.ollamaModel)) {
              dd.addOption(this.plugin.settings.ollamaModel, `${this.plugin.settings.ollamaModel} (saved)`);
            }
            for (const m of this.availableModels) dd.addOption(m, m);
            dd.setValue(this.plugin.settings.ollamaModel || this.availableModels[0]);
            dd.onChange(async (value) => {
              this.plugin.settings.ollamaModel = value;
              await this.plugin.saveSettings();
            });
          });
      } else {
        new Setting(containerEl)
          .setName('Model')
          .setDesc('Type a model name - or click "Fetch models" above to pick from a list.')
          .addText(text => text
            .setPlaceholder('llama3.2')
            .setValue(this.plugin.settings.ollamaModel)
            .onChange(async (value) => {
              this.plugin.settings.ollamaModel = value.trim();
              await this.plugin.saveSettings();
            }));
      }

      // ── API key ─────────────────────────────────────────────────────────────
      new Setting(containerEl)
        .setName('API key (optional)')
        .setDesc('Leave blank for local Ollama. Required for cloud instances that enforce authentication.')
        .addText(text => {
          text.inputEl.type = 'password';
          text.setPlaceholder('sk-…')
            .setValue(this.plugin.settings.ollamaApiKey)
            .onChange(async (value) => {
              this.plugin.settings.ollamaApiKey = value.trim();
              await this.plugin.saveSettings();
            });
        });
    }

    if (this.plugin.settings.aiProvider !== 'none') {
      new Setting(containerEl)
        .setName('Auto-prettify on save')
        .setDesc('Automatically prettify every note saved by the extension (runs in background after save).')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.autoPrettify)
          .onChange(async (value) => {
            this.plugin.settings.autoPrettify = value;
            await this.plugin.saveSettings();
          }));

      const testDesc = (() => {
        const p = this.plugin.settings;
        if (p.aiProvider === 'ollama') {
          const base = _ollamaBase(p.ollamaUrl);
          const path = p.ollamaFormat === 'openai' ? '/v1/chat/completions' : '/api/chat';
          return `Endpoint: ${base}${path}  |  model: ${p.ollamaModel || '(not set)'}`;
        }
        return 'Send a minimal test request to verify your settings.';
      })();
      new Setting(containerEl)
        .setName('Test AI connection')
        .setDesc(testDesc)
        .addButton(btn => btn.setButtonText('Test').onClick(async () => {
          btn.setButtonText('Testing…').setDisabled(true);
          try {
            const result = await this.plugin.prettifyNote('---\ntitle: test\n---\n\n## Post\n\nHello world.\n\n## Comments\n\nNo comments.');
            btn.setButtonText('Test').setDisabled(false);
            new Notice(result ? '✓ AI connection works!' : '⚠ AI returned empty response', 5000);
          } catch (err) {
            btn.setButtonText('Test').setDisabled(false);
            new Notice(`✗ ${err instanceof Error ? err.message : String(err)}`, 10000);
          }
        }));
    }
  }
}
