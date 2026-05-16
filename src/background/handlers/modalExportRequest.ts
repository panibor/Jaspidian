/**
 * exportOnePost: opens the post's permalink in a hidden background tab, runs a
 * full scan there, closes the tab, renders Markdown, and writes the note to the
 * vault via the Obsidian plugin. Called once per post by the background batch
 * loop (handlers/exportBatch.ts).
 */
import type {
  ExtractedFacebookPostV2,
  ExportResultItemV2,
  ScanResponse,
  CommentMode,
} from '../../shared/types';
import { renderNote } from '../../obsidian/render/renderNote';
import { postNote } from '../../obsidian/transport/obsidianPluginClient';
import {
  OBSIDIAN_PLUGIN_CONFIG,
  DEFAULT_VAULT_PATTERN,
  DEFAULT_ATTACHMENTS_FOLDER,
  DEFAULT_COMMENT_MODE,
  EXPANDER_CAPS,
  MESSAGE_KIND,
} from '../../shared/constants';

export interface ModalExportOneInput {
  postId: string;
  /** Post permalink URL (from initial scan). Used to open a background tab for full scan. */
  permalink: string;
  commentMode?: CommentMode;
  vaultPattern?: string;
  attachmentsFolder?: string;
  pluginToken?: string;
}

export interface ModalExportOneResponse {
  ok: boolean;
  result?: ExportResultItemV2;
  /** Title extracted from the post - lets the popup show which post just finished. */
  title?: string;
  error?: string;
}

/**
 * Core per-post export logic - exported so the batch handler can call it
 * directly without going through chrome.runtime messaging.
 */
export async function exportOnePost(msg: ModalExportOneInput): Promise<ModalExportOneResponse> {
  const commentMode = msg.commentMode || (DEFAULT_COMMENT_MODE as CommentMode);
  const vaultPattern = msg.vaultPattern || DEFAULT_VAULT_PATTERN;
  const attachmentsFolder = msg.attachmentsFolder || DEFAULT_ATTACHMENTS_FOLDER;
  const baseUrl = `http://${OBSIDIAN_PLUGIN_CONFIG.host}:${OBSIDIAN_PLUGIN_CONFIG.port}`;
  const capturedAt = new Date().toISOString();

  try {
    if (!msg.permalink) {
      return {
        ok: false,
        result: { postId: msg.postId, status: 'failed', warnings: [], error: 'No permalink URL for this post' },
        error: 'No permalink URL for this post',
      };
    }

    // 1. Open permalink in a hidden background tab and run full scan
    const scanResp = await _scanViaPermalinkTab(msg.permalink, msg.postId, commentMode);
    if (!scanResp.ok || !scanResp.post) {
      return {
        ok: false,
        result: {
          postId: msg.postId, status: 'failed', warnings: [],
          error: scanResp.error || 'Permalink scan failed',
        },
        error: scanResp.error,
      };
    }

    const post = scanResp.post;

    // 2. Render markdown
    const rendered = renderNote(post, {
      commentMode, vaultPattern, attachmentsFolder, capturedAt,
    });

    // 3. Collect images for download
    const allImgs: Array<{ key: string; remoteUrl: string; fullResolutionUrl?: string; alt?: string }> = [];
    post.images.forEach((img, i) => allImgs.push({
      key: `image-${String(i + 1).padStart(2, '0')}`,
      remoteUrl: img.remoteUrl, fullResolutionUrl: img.fullResolutionUrl, alt: img.altText,
    }));
    (post.sharedPost?.images ?? []).forEach((img, i) => allImgs.push({
      key: `shared-${String(i + 1).padStart(2, '0')}`,
      remoteUrl: img.remoteUrl, fullResolutionUrl: img.fullResolutionUrl,
    }));
    let cIdx = 0;
    const walkCImgs = (comments: ExtractedFacebookPostV2['comments']) => {
      for (const c of comments) {
        if (c.imageUrl) allImgs.push({ key: `cimg-${String(++cIdx).padStart(2, '0')}`, remoteUrl: c.imageUrl });
        walkCImgs(c.replies);
      }
    };
    walkCImgs(post.comments);

    // 4. Pre-fetch images as base64
    const attachments = await Promise.all(allImgs.map(async (item) => {
      const safeFull = item.fullResolutionUrl && _isCdnUrl(item.fullResolutionUrl)
        ? item.fullResolutionUrl : undefined;
      const fetched = await _fetchB64(safeFull || item.remoteUrl);
      return {
        key: item.key,
        remoteUrl: item.remoteUrl,
        fullResolutionUrl: safeFull,
        alt: item.alt,
        data: fetched?.data,
        mimeType: fetched?.mimeType,
      };
    }));

    // 5. Write to vault via Obsidian plugin
    const compResp = await postNote(
      {
        postId: post.postId || post.id,
        title: rendered.filename.replace(/\.md$/, ''),
        markdown: rendered.markdown,
        attachments,
        filename: rendered.filename,
        folder: rendered.folder,
        attachmentFolder: rendered.attachmentFolder,
        vaultPattern,
        collisionPolicy: 'suffix',
      },
      { baseUrl, token: msg.pluginToken }
    );

    if (compResp.status === 'ok' || compResp.status === 'skipped') {
      const result: ExportResultItemV2 = {
        postId: post.postId || post.id,
        status: compResp.status,
        notePath: compResp.notePath,
        warnings: [...rendered.warnings, ...(compResp.warnings ?? [])],
      };
      return { ok: true, result, title: post.title || post.body?.slice(0, 60) || post.postId };
    }

    const pluginErr =
      compResp.error ||
      (compResp.warnings ?? []).join('; ') ||
      'Obsidian plugin returned failure status';
    const result: ExportResultItemV2 = {
      postId: post.postId || post.id,
      status: 'failed',
      warnings: rendered.warnings,
      error: `Obsidian plugin error: ${pluginErr}`,
    };
    return { ok: false, result, error: pluginErr };
  } catch (err) {
    return {
      ok: false,
      result: {
        postId: msg.postId, status: 'failed', warnings: [],
        error: err instanceof Error ? err.message : String(err),
      },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a feed-style URL (multi_permalinks / story_fbid query param) into the
 * canonical permalink URL that shows only the one post.
 *
 * Examples:
 *   /groups/123/?multi_permalinks=456  →  /groups/123/permalink/456/
 *   /?story_fbid=456&id=789            →  /permalink.php?story_fbid=456&id=789
 */
function _canonicalPermalink(permalink: string): string {
  try {
    const u = new URL(permalink);

    // Group feed: /groups/<gid>/?multi_permalinks=<postId>
    const multiPl = u.searchParams.get('multi_permalinks');
    const groupMatch = u.pathname.match(/^\/groups\/([^/]+)\/?$/);
    if (multiPl && groupMatch) {
      return `https://www.facebook.com/groups/${groupMatch[1]}/permalink/${multiPl}/`;
    }

    // profile.php / home: ?story_fbid=<id>&id=<authorId>
    const storyFbid = u.searchParams.get('story_fbid');
    if (storyFbid) {
      const authorId = u.searchParams.get('id') || '';
      return authorId
        ? `https://www.facebook.com/permalink.php?story_fbid=${storyFbid}&id=${authorId}`
        : `https://www.facebook.com/permalink.php?story_fbid=${storyFbid}`;
    }

    // Already canonical (has /permalink/ or /posts/) - just strip tracking params
    const clean = new URL(permalink);
    for (const key of [...clean.searchParams.keys()]) {
      if (key.startsWith('__')) clean.searchParams.delete(key);
    }
    return clean.toString();
  } catch {
    return permalink;
  }
}

/**
 * Open the post's permalink in a hidden background tab, run a full SCAN_REQUEST,
 * close the tab, and return the matching extracted post.
 */
async function _scanViaPermalinkTab(
  permalink: string,
  postId: string,
  commentMode: CommentMode,
): Promise<{ ok: boolean; post?: ExtractedFacebookPostV2; error?: string }> {
  // Canonicalize before opening so we land on a single-post page, not the group feed
  const canonicalUrl = _canonicalPermalink(permalink);
  let tabId: number | undefined;

  try {
    // Open canonical permalink in background (active: false keeps user's tab focused)
    const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
      chrome.tabs.create({ url: canonicalUrl, active: false }, (t) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'chrome.tabs.create failed'));
        } else {
          resolve(t);
        }
      });
    });
    tabId = tab.id!;

    // Wait for the tab to reach 'complete' status
    await _waitForTabLoad(tabId);

    // Give Facebook's React renderer time to paint the content
    await _sleep(1500);

    // Scroll the background tab to trigger Facebook's intersection observers -
    // comments and lazy-loaded sections only render when they enter the viewport.
    // Even in an inactive tab, programmatic scroll fires IntersectionObserver callbacks.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId! },
        func: () => {
          window.scrollTo(0, document.body.scrollHeight);
        },
      });
      await _sleep(800);
      await chrome.scripting.executeScript({
        target: { tabId: tabId! },
        func: () => { window.scrollTo(0, 0); },
      });
      await _sleep(500);
    } catch {
      // scripting injection may fail on restricted pages - continue regardless
    }

    // Send SCAN_REQUEST with permalink-appropriate caps (lower than feed defaults)
    const scanResp = await new Promise<ScanResponse>((resolve) => {
      chrome.tabs.sendMessage(
        tabId!,
        {
          v: 2,
          type: MESSAGE_KIND.SCAN_REQUEST,
          opts: {
            expand: {
              body: true,
              comments: true,
              replies: true,
              maxClicks: 20,
              maxMs: 10_000,
              maxMutationNodes: EXPANDER_CAPS.maxMutationNodes,
            },
            commentMode,
          },
        },
        (resp) => {
          if (chrome.runtime.lastError || !resp) {
            resolve({
              ok: false,
              error: chrome.runtime.lastError?.message || 'No response from content script in permalink tab',
            });
          } else {
            resolve(resp as ScanResponse);
          }
        }
      );
    });

    if (!scanResp.ok || !scanResp.envelope?.posts.length) {
      return {
        ok: false,
        error: `Permalink tab scan failed: ${scanResp.error || 'no posts found'}`,
      };
    }

    // Prefer the post whose postId matches (canonical page may still have sidebar posts)
    const posts = scanResp.envelope.posts;
    const matched = posts.find((p) => p.postId === postId) ?? posts[0];
    return { ok: true, post: matched };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (tabId !== undefined) {
      chrome.tabs.remove(tabId, () => {
        // Ignore close errors (tab may have already been closed)
        void chrome.runtime.lastError;
      });
    }
  }
}

function _waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    // Check if already complete
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) { resolve(); return; }
      if (tab.status === 'complete') { resolve(); return; }

      let settled = false;
      const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
        if (id === tabId && info.status === 'complete' && !settled) {
          settled = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);

      // 20-second safety timeout
      setTimeout(() => {
        if (!settled) {
          settled = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }, 20_000);
    });
  });
}

function _isCdnUrl(url: string): boolean {
  return url.includes('scontent') || url.includes('fbcdn.net');
}

async function _fetchB64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) return null;
    const mime = resp.headers.get('content-type') || 'image/jpeg';
    if (!mime.startsWith('image/')) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { data: btoa(bin), mimeType: mime.split(';')[0] };
  } catch { return null; }
}

function _sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
