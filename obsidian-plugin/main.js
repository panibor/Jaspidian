"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => JaspidianPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var http = __toESM(require("http"));
var DEFAULT_SETTINGS = {
  port: 37123,
  token: "",
  aiProvider: "none",
  openrouterApiKey: "",
  openrouterModel: "google/gemini-flash-1.5",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  ollamaApiKey: "",
  ollamaFormat: "native",
  autoPrettify: false
};
var PRETTIFY_SYSTEM_PROMPT = `You are a formatter for Facebook posts saved as Obsidian notes.
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
- For \`tags\`: replace any existing tags (or add if absent) with 4\u20138 relevant lowercase tags in {LANG_NAME} (hyphens between words, no spaces, no emoji). Use YAML list format:
\`\`\`
tags:
  - tag-one
  - tag-two
\`\`\`
- Strip tracking params from ALL urls (__cft__[...], __tn__=..., hoisted_section_header_type=...)

### Source callout
Replace the raw "*Posted by [Name](url) in [Group](url) \xB7 time \xB7 [link](url)*" line with a callout. The English template - EVERY line MUST begin with \`> \` exactly:
\`\`\`
> [!info] Source
> **Posted by:** [Name](clean_url)
> **Group:** [Group](clean_url)
> **Date:** YYYY-MM-DD
> **Link:** [Open the post on Facebook](clean_permalink)
\`\`\`
Use "Group" if the post is in a group, "Page" if on a page, "Profile" if on a personal profile. The Posted-by name and URL come from the \`author\` frontmatter field (which is already a \`[Name](url)\` markdown link). Translate the English label words to {LANG_NAME} when {LANG_NAME} is not English.

### Summary
Immediately after the source callout, add a Summary section with a [!summary] callout listing 3\u20136 key facts (who/what/where/price range/etc.). English template - every line MUST begin with \`> \`:
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
> [!note]+ \u{1F4AC} [Author Name](url) \xB7 *time*
> comment body line 1
> comment body line 2
\`\`\`
Rules:
- \`[!note]+\` is a single token: there is NO space between \`]\` and \`+\`. Never write \`[!note] +\`.
- Every line of the callout (header AND body lines) MUST start with \`> \`. Do not strip the \`>\` prefix.
- Do not translate or rewrite comment body text - keep it verbatim.
- Replies use \`[!example]+ \u21B3 \` with one extra \`> \` of nesting per depth.

### Output
Return ONLY the complete transformed markdown. No explanation. No code fences around the whole output. No preamble.`;
var LANG_NAME_MAP = {
  en: "English",
  he: "Hebrew",
  ar: "Arabic",
  ru: "Russian",
  uk: "Ukrainian",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  el: "Greek",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  nb: "Norwegian",
  nn: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  hi: "Hindi",
  ka: "Georgian",
  hy: "Armenian",
  am: "Amharic",
  km: "Khmer",
  my: "Burmese",
  fa: "Persian",
  ur: "Urdu",
  yi: "Yiddish"
};
function _stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}
function _detectBodyLanguage(content) {
  const body = _stripFrontmatter(content);
  let hebrew = 0, arabic = 0, cyrillic = 0, greek = 0, devanagari = 0;
  let thai = 0, hiragana = 0, katakana = 0, hangul = 0, cjk = 0;
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    if (code >= 1424 && code <= 1535) hebrew++;
    else if (code >= 1536 && code <= 1791) arabic++;
    else if (code >= 1024 && code <= 1279) cyrillic++;
    else if (code >= 880 && code <= 1023) greek++;
    else if (code >= 2304 && code <= 2431) devanagari++;
    else if (code >= 3584 && code <= 3711) thai++;
    else if (code >= 12352 && code <= 12447) hiragana++;
    else if (code >= 12448 && code <= 12543) katakana++;
    else if (code >= 44032 && code <= 55215) hangul++;
    else if (code >= 19968 && code <= 40959) cjk++;
  }
  if (hebrew > 10) return "he";
  if (arabic > 10) return "ar";
  if (hangul > 10) return "ko";
  if (thai > 10) return "th";
  if (devanagari > 10) return "hi";
  if (greek > 10) return "el";
  if (hiragana + katakana > 5) return "ja";
  if (cjk > 10) return "zh";
  if (cyrillic > 10) return "ru";
  return "en";
}
function _resolvePromptLanguage(content) {
  const code = _detectBodyLanguage(content);
  const name = LANG_NAME_MAP[code] || "English";
  return { code, name };
}
function _buildPrettifyPrompt(content) {
  const { code, name } = _resolvePromptLanguage(content);
  return PRETTIFY_SYSTEM_PROMPT.replace(/\{LANG_NAME\}/g, name).replace(/\{LANG_CODE\}/g, code);
}
async function _callOpenRouter(content, apiKey, model) {
  var _a, _b, _c;
  const systemPrompt = _buildPrettifyPrompt(content);
  const resp = await (0, import_obsidian.requestUrl)({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://jaspidian.app",
      "X-Title": "Jaspidian"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      temperature: 0.2,
      max_tokens: 6e3
    })
  });
  if (resp.status >= 400) {
    throw new Error(`OpenRouter ${resp.status}: ${resp.text.slice(0, 200)}`);
  }
  return (((_c = (_b = (_a = resp.json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "").trim();
}
function _ollamaBase(url) {
  return url.replace(/\/$/, "").replace(/\/api$/, "");
}
async function _callOllama(content, baseUrl, model, apiKey, format = "native") {
  var _a, _b, _c, _d;
  const systemPrompt = _buildPrettifyPrompt(content);
  const base = _ollamaBase(baseUrl);
  const url = format === "openai" ? `${base}/v1/chat/completions` : `${base}/api/chat`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content }
    ]
  };
  if (format === "openai") {
    body.temperature = 0.2;
    body.max_tokens = 6e3;
  } else {
    body.stream = false;
  }
  const resp = await (0, import_obsidian.requestUrl)({ url, method: "POST", headers, body: JSON.stringify(body) });
  if (resp.status >= 400) {
    throw new Error(`Ollama ${resp.status}: ${resp.text.slice(0, 200)}`);
  }
  if (format === "openai") {
    return (((_c = (_b = (_a = resp.json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "").trim();
  }
  return (((_d = resp.json.message) == null ? void 0 : _d.content) || "").trim();
}
var MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg"
};
function mimeToExt(mime) {
  return MIME_TO_EXT[mime || ""] || "jpg";
}
var UI_FRAGMENTS = /\b(See less|See more|ראה פחות|ראה עוד|פחות|עוד)\b/g;
function stripUIFragments(text) {
  return text.replace(UI_FRAGMENTS, "").replace(/  +/g, " ").trim();
}
function stripTrackingParams(text) {
  return text.replace(
    /(https?:\/\/[^\s)\]"]+)/g,
    (url) => {
      try {
        const u = new URL(url);
        for (const key of [...u.searchParams.keys()]) {
          if (key.startsWith("__") || key === "hoisted_section_header_type") u.searchParams.delete(key);
        }
        return u.toString();
      } catch (e) {
        return url;
      }
    }
  );
}
function fixNote(content) {
  return stripTrackingParams(stripUIFragments(content));
}
var JaspidianPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "server", null);
    __publicField(this, "_serverStatus", "stopped");
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FBSettingTab(this.app, this));
    this.startServer();
    this.addCommand({
      id: "fix-facebook-notes",
      name: "Fix all Facebook notes (strip UI text, clean URLs)",
      callback: () => this.fixAllFacebookNotes()
    });
    this.addCommand({
      id: "prettify-current-note",
      name: "Prettify current note with AI",
      callback: () => this.prettifyCurrentNote()
    });
    this.addCommand({
      id: "preview-prettify-current-note",
      name: "Preview AI prettify (show output without saving)",
      callback: () => this.previewPrettifyCurrentNote()
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
  get serverStatus() {
    return this._serverStatus;
  }
  // ---- AI prettify ----
  async prettifyNote(content) {
    const { aiProvider, openrouterApiKey, openrouterModel, ollamaUrl, ollamaModel } = this.settings;
    let raw;
    if (aiProvider === "openrouter") {
      if (!openrouterApiKey) throw new Error("OpenRouter API key not set");
      raw = await _callOpenRouter(content, openrouterApiKey, openrouterModel);
    } else if (aiProvider === "ollama") {
      raw = await _callOllama(content, ollamaUrl, ollamaModel, this.settings.ollamaApiKey || void 0, this.settings.ollamaFormat);
    } else {
      throw new Error("No AI provider configured. Set one in Jaspidian settings.");
    }
    return raw.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)```\s*$/, "$1").trim();
  }
  async _runPrettify(file, dryRun) {
    if (!file) {
      new import_obsidian.Notice("No active file.", 3e3);
      return;
    }
    const notice = new import_obsidian.Notice(`\u23F3 ${dryRun ? "Previewing" : "Prettifying"} with AI\u2026`, 0);
    try {
      const original = await this.app.vault.read(file);
      const prettified = await this.prettifyNote(original);
      notice.hide();
      if (!prettified) {
        new import_obsidian.Notice("\u26A0 AI returned empty response.", 6e3);
        return;
      }
      if (dryRun) {
        const preview = prettified.slice(0, 400) + (prettified.length > 400 ? "\n\u2026" : "");
        new import_obsidian.Notice(`Preview (${prettified.length} chars):

${preview}`, 0);
        return;
      }
      await this.app.vault.modify(file, prettified);
      const delta = prettified.length - original.length;
      const sign = delta >= 0 ? "+" : "";
      new import_obsidian.Notice(`\u2713 Prettified: ${file.name}  (${sign}${delta} chars)`, 5e3);
    } catch (err) {
      notice.hide();
      new import_obsidian.Notice(`\u2717 Prettify failed: ${err instanceof Error ? err.message : String(err)}`, 1e4);
    }
  }
  async prettifyCurrentNote() {
    if (this.settings.aiProvider === "none") {
      new import_obsidian.Notice("No AI provider configured. Set one in Jaspidian settings.", 6e3);
      return;
    }
    await this._runPrettify(this.app.workspace.getActiveFile(), false);
  }
  async previewPrettifyCurrentNote() {
    if (this.settings.aiProvider === "none") {
      new import_obsidian.Notice("No AI provider configured. Set one in Jaspidian settings.", 6e3);
      return;
    }
    await this._runPrettify(this.app.workspace.getActiveFile(), true);
  }
  // ---- Server lifecycle ----
  startServer() {
    this.stopServer();
    const port = this.settings.port;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.server.on("error", (err) => {
      this._serverStatus = "error";
      const msg = err.code === "EADDRINUSE" ? `Jaspidian: Port ${port} is in use. Change the port in plugin settings.` : `Jaspidian: Server error - ${err.message}`;
      new import_obsidian.Notice(msg, 8e3);
    });
    this.server.listen(port, "127.0.0.1", () => {
      this._serverStatus = "running";
    });
  }
  stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this._serverStatus = "stopped";
    }
  }
  restartServer() {
    this.startServer();
  }
  // ---- Request router ----
  handleRequest(req, res) {
    var _a;
    const method = (req.method || "GET").toUpperCase();
    const pathname = (req.url || "/").split("?")[0];
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (pathname !== "/health" && this.settings.token) {
      const auth = req.headers["authorization"] || "";
      if (auth !== `Bearer ${this.settings.token}`) {
        this.sendJson(res, 401, { ok: false, error: "Unauthorized" });
        return;
      }
    }
    if (method === "GET" && pathname === "/health") {
      this.sendJson(res, 200, { ok: true, aiProvider: this.settings.aiProvider });
      return;
    }
    if (method === "GET" && pathname === "/vault/info") {
      this.sendJson(res, 200, {
        ok: true,
        vaultName: this.app.vault.getName(),
        vaultRoot: (_a = this.app.vault.adapter.basePath) != null ? _a : ""
      });
      return;
    }
    if (method === "POST" && (pathname === "/notes" || pathname === "/notes/batch")) {
      this.readBody(req).then(async (body) => {
        try {
          if (pathname === "/notes") {
            const result = await this.writeNote(body);
            this.sendJson(res, 200, { ok: true, ...result });
          } else {
            const batch = body;
            const results = await Promise.all((batch.notes || []).map((n) => this.writeNote(n)));
            this.sendJson(res, 200, { ok: true, results });
          }
        } catch (err) {
          this.sendJson(res, 500, { ok: false, error: String(err) });
        }
      }).catch(() => this.sendJson(res, 400, { ok: false, error: "Invalid JSON body" }));
      return;
    }
    if (method === "POST" && pathname === "/prettify") {
      this.readBody(req).then(async (body) => {
        const { notePath } = body;
        if (!notePath) {
          this.sendJson(res, 400, { ok: false, error: "notePath required" });
          return;
        }
        try {
          const warnings = [];
          const file = this.app.vault.getAbstractFileByPath(notePath);
          if (!(file instanceof import_obsidian.TFile)) {
            this.sendJson(res, 404, { ok: false, error: `Note not found: ${notePath}` });
            return;
          }
          const original = await this.app.vault.read(file);
          const prettified = await this.prettifyNote(original);
          if (!prettified) throw new Error("AI returned empty response");
          await this.app.vault.modify(file, prettified);
          this.sendJson(res, 200, { ok: true, notePath, warnings });
        } catch (err) {
          this.sendJson(res, 500, { ok: false, error: String(err) });
        }
      }).catch(() => this.sendJson(res, 400, { ok: false, error: "Invalid JSON body" }));
      return;
    }
    this.sendJson(res, 404, { ok: false, error: `No route for ${method} ${pathname}` });
  }
  // ---- Write a note (with attachments) ----
  async writeNote(note) {
    var _a;
    const warnings = [];
    const folder = (note.folder || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const attachFolder = (note.attachmentFolder || `${folder}/_attachments/${(_a = note.filename) == null ? void 0 : _a.replace(/\.md$/, "")}`).replace(/\\/g, "/");
    const notePath = folder ? `${folder}/${note.filename}` : note.filename;
    if (folder) await this.ensureFolder(folder);
    const urlToWikilink = /* @__PURE__ */ new Map();
    for (const att of note.attachments || []) {
      if (!att.data) {
        warnings.push(`No image data for ${att.key}`);
        continue;
      }
      const ext = mimeToExt(att.mimeType);
      const localPath = `${attachFolder}/${att.key}.${ext}`;
      try {
        await this.ensureFolder(attachFolder);
        const buf = Buffer.from(att.data, "base64");
        const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        await this.app.vault.adapter.writeBinary(localPath, arrayBuffer);
        const url = att.fullResolutionUrl || att.remoteUrl;
        if (url) urlToWikilink.set(url, localPath);
        if (att.remoteUrl && att.remoteUrl !== url) urlToWikilink.set(att.remoteUrl, localPath);
      } catch (err) {
        warnings.push(`Failed to write ${att.key}: ${err}`);
      }
    }
    let markdown = note.markdown;
    for (const [url, localPath] of urlToWikilink) {
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      markdown = markdown.replace(new RegExp(`!?\\[[^\\]]*\\]\\(${escaped}\\)`, "g"), `![[${localPath}]]`);
    }
    let finalPath = notePath;
    const exists = await this.app.vault.adapter.exists(notePath);
    if (exists && note.collisionPolicy === "skip") {
      return { status: "skipped", notePath, warnings: ["skipped: file already exists"] };
    }
    if (exists && note.collisionPolicy === "suffix") {
      finalPath = await this.suffixPath(notePath);
    }
    if (await this.app.vault.adapter.exists(finalPath)) {
      await this.app.vault.adapter.write(finalPath, markdown);
    } else {
      await this.app.vault.create(finalPath, markdown);
    }
    new import_obsidian.Notice(`Saved: ${finalPath.split("/").pop()}`, 3e3);
    const missingAttachments = (note.attachments || []).filter((a) => !a.data).length;
    if (missingAttachments > 0) {
      new import_obsidian.Notice(
        `\u26A0 ${missingAttachments} image${missingAttachments === 1 ? "" : "s"} couldn't be downloaded - check the extension service-worker console for "[jaspidian] image fetch" errors.`,
        8e3
      );
    }
    if (this.settings.autoPrettify && this.settings.aiProvider !== "none") {
      this.prettifyNote(markdown).then(async (prettified) => {
        if (!prettified) return;
        const file = this.app.vault.getAbstractFileByPath(finalPath);
        if (file instanceof import_obsidian.TFile) {
          await this.app.vault.modify(file, prettified);
          new import_obsidian.Notice(`\u2713 Auto-prettified: ${finalPath.split("/").pop()}`, 3e3);
        }
      }).catch((err) => {
        new import_obsidian.Notice(`Auto-prettify failed: ${err instanceof Error ? err.message : String(err)}`, 6e3);
      });
    }
    return { status: "ok", notePath: finalPath, warnings };
  }
  // ---- Fix existing Facebook notes ----
  async fixAllFacebookNotes() {
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("Facebook/"));
    if (files.length === 0) {
      new import_obsidian.Notice("No Facebook notes found.", 4e3);
      return;
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
    new import_obsidian.Notice(`Fixed ${fixed} of ${files.length} Facebook note${files.length !== 1 ? "s" : ""}.`, 5e3);
  }
  // ---- Helpers ----
  async ensureFolder(folderPath) {
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      if (!part) continue;
      current = current ? `${current}/${part}` : part;
      if (!await this.app.vault.adapter.exists(current)) {
        try {
          await this.app.vault.createFolder(current);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("Folder already exists")) throw err;
        }
      }
    }
  }
  async suffixPath(path) {
    const dot = path.lastIndexOf(".");
    const base = dot > 0 ? path.slice(0, dot) : path;
    const ext = dot > 0 ? path.slice(dot) : "";
    let n = 1;
    let candidate = path;
    while (await this.app.vault.adapter.exists(candidate)) {
      candidate = `${base}-${n}${ext}`;
      n++;
    }
    return candidate;
  }
  readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });
  }
  sendJson(res, status, body) {
    const json = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) });
    res.end(json);
  }
};
var FBSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    __publicField(this, "availableModels", []);
    this.plugin = plugin;
  }
  async fetchOllamaModels() {
    const base = _ollamaBase(this.plugin.settings.ollamaUrl);
    if (!base) throw new Error("Ollama URL is not set");
    const headers = {};
    if (this.plugin.settings.ollamaApiKey) headers["Authorization"] = `Bearer ${this.plugin.settings.ollamaApiKey}`;
    if (this.plugin.settings.ollamaFormat === "openai") {
      const resp = await (0, import_obsidian.requestUrl)({ url: `${base}/v1/models`, headers });
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status} from ${base}/v1/models - ${resp.text.slice(0, 120)}`);
      return (resp.json.data || []).map((m) => m.id).filter(Boolean).sort();
    } else {
      const resp = await (0, import_obsidian.requestUrl)({ url: `${base}/api/tags`, headers });
      if (resp.status >= 400) throw new Error(`HTTP ${resp.status} from ${base}/api/tags - ${resp.text.slice(0, 120)}`);
      return (resp.json.models || []).map((m) => m.name).filter(Boolean).sort();
    }
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Jaspidian" });
    containerEl.createEl("p", {
      text: "Runs a local server so the Jaspidian Chrome extension can save posts directly into this vault.",
      cls: "setting-item-description"
    });
    new import_obsidian.Setting(containerEl).setName("Port").setDesc("Local port. Default: 37123. Restart required after change.").addText((text) => text.setPlaceholder("37123").setValue(String(this.plugin.settings.port)).onChange(async (value) => {
      const n = parseInt(value, 10);
      if (n > 1024 && n < 65536) {
        this.plugin.settings.port = n;
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Auth token (optional)").setDesc("Secret shared with the extension to block other local apps from writing to your vault.").addText((text) => text.setPlaceholder("Leave blank to disable").setValue(this.plugin.settings.token).onChange(async (value) => {
      this.plugin.settings.token = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Restart server").setDesc("Apply port or token changes without restarting Obsidian.").addButton((btn) => btn.setButtonText("Restart").onClick(() => {
      this.plugin.restartServer();
      new import_obsidian.Notice("Server restarted.", 3e3);
    }));
    new import_obsidian.Setting(containerEl).setName("Fix existing Facebook notes").setDesc("Scans all notes in Facebook/ and strips UI text and tracking URLs.").addButton((btn) => btn.setButtonText("Run now").onClick(() => {
      this.plugin.fixAllFacebookNotes();
    }));
    containerEl.createEl("p", {
      text: `Status: ${this.plugin.serverStatus === "running" ? `listening on port ${this.plugin.settings.port}` : this.plugin.serverStatus}`,
      cls: "setting-item-description"
    }).style.fontStyle = "italic";
    containerEl.createEl("h2", { text: "AI Prettify" });
    containerEl.createEl("p", {
      text: 'Restructure raw captured notes into clean Hebrew Obsidian notes with callouts, tables, and inferred tags. Use the command palette: "Prettify current Facebook note with AI".',
      cls: "setting-item-description"
    });
    new import_obsidian.Setting(containerEl).setName("AI provider").setDesc("Which AI service to use for prettification.").addDropdown((dd) => dd.addOption("none", "Disabled").addOption("openrouter", "OpenRouter (cloud)").addOption("ollama", "Ollama (local / cloud)").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
      this.plugin.settings.aiProvider = value;
      await this.plugin.saveSettings();
      this.display();
    }));
    if (this.plugin.settings.aiProvider === "openrouter") {
      new import_obsidian.Setting(containerEl).setName("OpenRouter API key").setDesc("Get one at openrouter.ai/keys").addText((text) => text.setPlaceholder("sk-or-...").setValue(this.plugin.settings.openrouterApiKey).onChange(async (value) => {
        this.plugin.settings.openrouterApiKey = value.trim();
        await this.plugin.saveSettings();
      }));
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("Recommended: google/gemini-flash-1.5 (fast, cheap). Or: anthropic/claude-haiku-3-5").addText((text) => text.setPlaceholder("google/gemini-flash-1.5").setValue(this.plugin.settings.openrouterModel).onChange(async (value) => {
        this.plugin.settings.openrouterModel = value.trim();
        await this.plugin.saveSettings();
      }));
    }
    if (this.plugin.settings.aiProvider === "ollama") {
      new import_obsidian.Setting(containerEl).setName("Endpoint format").setDesc("Native \u2192 /api/chat + /api/tags (self-hosted Ollama). OpenAI \u2192 /v1/chat/completions + /v1/models (most cloud providers).").addDropdown((dd) => dd.addOption("native", "Ollama native").addOption("openai", "OpenAI-compatible").setValue(this.plugin.settings.ollamaFormat).onChange(async (value) => {
        this.plugin.settings.ollamaFormat = value;
        await this.plugin.saveSettings();
        this.availableModels = [];
        this.display();
      }));
      const urlSetting = new import_obsidian.Setting(containerEl).setName("Ollama URL").setDesc("Local: http://localhost:11434  |  Remote: https://your-server.com").addText((text) => text.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaUrl).onChange(async (value) => {
        this.plugin.settings.ollamaUrl = value.trim();
        await this.plugin.saveSettings();
        this.availableModels = [];
      }));
      urlSetting.addButton((btn) => {
        btn.setButtonText("Fetch models").setCta().onClick(async () => {
          btn.setButtonText("Fetching\u2026").setDisabled(true);
          try {
            const models = await this.fetchOllamaModels();
            this.availableModels = models;
            new import_obsidian.Notice(`\u2713 Found ${models.length} model${models.length !== 1 ? "s" : ""}`, 3e3);
            this.display();
          } catch (err) {
            new import_obsidian.Notice(`\u2717 ${err instanceof Error ? err.message : String(err)}`, 1e4);
            btn.setButtonText("Fetch models").setDisabled(false);
          }
        });
      });
      if (this.availableModels.length > 0) {
        new import_obsidian.Setting(containerEl).setName("Model").setDesc(`${this.availableModels.length} models fetched from server`).addDropdown((dd) => {
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
        new import_obsidian.Setting(containerEl).setName("Model").setDesc('Type a model name - or click "Fetch models" above to pick from a list.').addText((text) => text.setPlaceholder("llama3.2").setValue(this.plugin.settings.ollamaModel).onChange(async (value) => {
          this.plugin.settings.ollamaModel = value.trim();
          await this.plugin.saveSettings();
        }));
      }
      new import_obsidian.Setting(containerEl).setName("API key (optional)").setDesc("Leave blank for local Ollama. Required for cloud instances that enforce authentication.").addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("sk-\u2026").setValue(this.plugin.settings.ollamaApiKey).onChange(async (value) => {
          this.plugin.settings.ollamaApiKey = value.trim();
          await this.plugin.saveSettings();
        });
      });
    }
    if (this.plugin.settings.aiProvider !== "none") {
      new import_obsidian.Setting(containerEl).setName("Auto-prettify on save").setDesc("Automatically prettify every note saved by the extension (runs in background after save).").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoPrettify).onChange(async (value) => {
        this.plugin.settings.autoPrettify = value;
        await this.plugin.saveSettings();
      }));
      const testDesc = (() => {
        const p = this.plugin.settings;
        if (p.aiProvider === "ollama") {
          const base = _ollamaBase(p.ollamaUrl);
          const path = p.ollamaFormat === "openai" ? "/v1/chat/completions" : "/api/chat";
          return `Endpoint: ${base}${path}  |  model: ${p.ollamaModel || "(not set)"}`;
        }
        return "Send a minimal test request to verify your settings.";
      })();
      new import_obsidian.Setting(containerEl).setName("Test AI connection").setDesc(testDesc).addButton((btn) => btn.setButtonText("Test").onClick(async () => {
        btn.setButtonText("Testing\u2026").setDisabled(true);
        try {
          const result = await this.plugin.prettifyNote("---\ntitle: test\n---\n\n## Post\n\nHello world.\n\n## Comments\n\nNo comments.");
          btn.setButtonText("Test").setDisabled(false);
          new import_obsidian.Notice(result ? "\u2713 AI connection works!" : "\u26A0 AI returned empty response", 5e3);
        } catch (err) {
          btn.setButtonText("Test").setDisabled(false);
          new import_obsidian.Notice(`\u2717 ${err instanceof Error ? err.message : String(err)}`, 1e4);
        }
      }));
    }
  }
};
