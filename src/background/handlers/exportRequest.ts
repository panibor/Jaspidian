/**
 * src-v2/background/handlers/exportRequest.ts
 * Handles EXPORT_REQUEST:
 *   1. Sends EXPAND_AND_EXTRACT_REQUEST to the content script on the source tab
 *      so the DOM is expanded (comments, replies, "See more") at export time — not at scan time.
 *   2. Renders each post and sends to the Obsidian plugin.
 */
import type {
  RuntimeMessageV2,
  ExportResponse,
  ExportResultItemV2,
  ExtractedFacebookPostV2,
  ExpandAndExtractResponse,
  ScanOptions,
} from '../../shared/types';
import { renderNote } from '../../obsidian/render/renderNote';
import { postNote } from '../../obsidian/transport/obsidianPluginClient';
import {
  OBSIDIAN_PLUGIN_CONFIG,
  DEFAULT_VAULT_PATTERN,
  DEFAULT_ATTACHMENTS_FOLDER,
  DEFAULT_COMMENT_MODE,
  MESSAGE_KIND,
} from '../../shared/constants';

interface ExportMessage extends RuntimeMessageV2 {
  /** Tab that was scanned — used to send EXPAND_AND_EXTRACT_REQUEST. */
  tabId?: number;
  /** IDs of the posts to export (preferred — triggers deferred expansion). */
  postIds?: string[];
  /** Expansion flags forwarded to the content script. */
  expandOpts?: ScanOptions['expand'];
  /** Legacy: full post objects (used when tabId/postIds are not available). */
  posts?: ExtractedFacebookPostV2[];
  commentMode?: string;
  vaultPattern?: string;
  attachmentsFolder?: string;
  pluginToken?: string;
  vaultPath?: string;
  vaultName?: string;
}

export function handleExportRequest(
  message: RuntimeMessageV2,
  sendResponse: (response: ExportResponse) => void
): boolean {
  const msg = message as ExportMessage;
  const commentMode = (msg.commentMode as any) || DEFAULT_COMMENT_MODE;
  const vaultPattern = msg.vaultPattern || DEFAULT_VAULT_PATTERN;
  const attachmentsFolder = msg.attachmentsFolder || DEFAULT_ATTACHMENTS_FOLDER;
  const baseUrl = `http://${OBSIDIAN_PLUGIN_CONFIG.host}:${OBSIDIAN_PLUGIN_CONFIG.port}`;
  const capturedAt = new Date().toISOString();

  // Resolve which posts to export: deferred expansion path vs. legacy full-posts path
  interface PostsWithFailures {
    posts: ExtractedFacebookPostV2[];
    /** Pre-built failure results for post IDs the content script couldn't find. */
    preFailures: ExportResultItemV2[];
  }

  const _getPostsWithFailures = (): Promise<PostsWithFailures> => {
    if (msg.tabId && msg.postIds?.length) {
      return _expandAndExtract(
        msg.tabId,
        msg.postIds,
        msg.expandOpts || { body: true, comments: true, replies: true },
        commentMode
      ).then((resp) => {
        if (!resp.ok) throw new Error(resp.error || 'Expand failed');
        const posts = resp.posts || [];
        // Turn every postId that came back as notFound into an explicit failure result
        const preFailures: ExportResultItemV2[] = (resp.notFound || []).map((postId) => ({
          postId,
          status: 'failed' as const,
          warnings: [],
          error: 'Post element not found in page — the page may have navigated or the post scrolled out of the DOM since the last scan. Try rescanning.',
        }));
        return { posts, preFailures };
      });
    }
    // Legacy: posts were already expanded at scan time
    return Promise.resolve({ posts: msg.posts || [], preFailures: [] });
  };

  _getPostsWithFailures()
    .then(async ({ posts, preFailures }) => {
      const processed = await Promise.all(
        posts.map(async (post): Promise<ExportResultItemV2> => {
          const rendered = renderNote(post, { commentMode, vaultPattern, attachmentsFolder, capturedAt });

          // Collect ALL images that need downloading:
          //   1. post body images
          //   2. shared-post images (rendered under ### Shared Post)
          //   3. comment / reply images (rendered inline inside callouts)
          interface _ImgEntry {
            key: string;
            remoteUrl: string;
            fullResolutionUrl?: string;
            alt?: string;
          }
          const _allImgs: _ImgEntry[] = [];

          post.images.forEach((img, i) => {
            _allImgs.push({
              key: `image-${String(i + 1).padStart(2, '0')}`,
              remoteUrl: img.remoteUrl,
              fullResolutionUrl: img.fullResolutionUrl,
              alt: img.altText,
            });
          });

          (post.sharedPost?.images ?? []).forEach((img, i) => {
            _allImgs.push({
              key: `shared-${String(i + 1).padStart(2, '0')}`,
              remoteUrl: img.remoteUrl,
              fullResolutionUrl: img.fullResolutionUrl,
              alt: img.altText,
            });
          });

          // Recursive walk for comment + reply images
          let _cIdx = 0;
          const _walkCImgs = (comments: typeof post.comments) => {
            for (const c of comments) {
              if (c.imageUrl) {
                _allImgs.push({
                  key: `cimg-${String(++_cIdx).padStart(2, '0')}`,
                  remoteUrl: c.imageUrl,
                });
              }
              _walkCImgs(c.replies);
            }
          };
          _walkCImgs(post.comments);

          // Pre-fetch all as base64 from the authenticated browser context.
          // Only use fullResolutionUrl if it is a direct CDN URL; otherwise it
          // may be a Facebook photo-viewer page (/photo/?fbid=...) which returns
          // HTML — we fall back to remoteUrl in that case.
          const fetchWarnings: string[] = [];
          const attachments = await Promise.all(
            _allImgs.map(async (item) => {
              // Guard: only pass fullResolutionUrl to the plugin when it is a CDN
              // image URL — non-CDN links would cause the plugin to download HTML.
              const safeFull = item.fullResolutionUrl && _isCdnImageUrl(item.fullResolutionUrl)
                ? item.fullResolutionUrl
                : undefined;
              // Pre-fetch using the best CDN URL we have.
              const urlToFetch = safeFull || item.remoteUrl;
              const fetched = await _fetchImageAsBase64(urlToFetch);
              if (!fetched) {
                const msg = `image fetch failed (${item.key}): ${urlToFetch.slice(0, 120)}`;
                fetchWarnings.push(msg);
                console.warn('[jaspidian] ' + msg);
              }
              return {
                key: item.key,
                remoteUrl: item.remoteUrl,
                fullResolutionUrl: safeFull,   // plugin-safe: CDN only, or undefined
                alt: item.alt,
                data: fetched?.data,
                mimeType: fetched?.mimeType,
              };
            })
          );

          // Send to Obsidian plugin
          const pluginResult = await postNote(
            {
              postId: post.postId,
              title: post.title || 'Untitled Post',
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

          if (pluginResult.status === 'ok' || pluginResult.status === 'skipped') {
            return {
              postId: post.postId,
              status: pluginResult.status,
              notePath: pluginResult.notePath,
              warnings: [...rendered.warnings, ...fetchWarnings, ...(pluginResult.warnings ?? [])],
            };
          }

          // Plugin returned an error — report it clearly
          const pluginErr =
            pluginResult.error ||
            (pluginResult.warnings ?? []).join('; ') ||
            'Plugin returned failure status';
          return {
            postId: post.postId,
            status: 'failed' as const,
            warnings: [...rendered.warnings, ...fetchWarnings],
            error: `Plugin error: ${pluginErr}`,
          };
        })
      );

      // Merge notFound pre-failures with successfully-processed results
      return [...processed, ...preFailures];
    })
    .then((results) => sendResponse({ ok: true, results }))
    .catch((err) => sendResponse({ ok: false, results: [], error: String(err) }));

  return true; // async
}

/** Ask the content script in `tabId` to expand + re-extract the given post IDs. */
function _expandAndExtract(
  tabId: number,
  postIds: string[],
  expandOpts: ScanOptions['expand'],
  commentMode: string
): Promise<ExpandAndExtractResponse> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(
        tabId,
        {
          v: 2,
          type: MESSAGE_KIND.EXPAND_AND_EXTRACT_REQUEST,
          postIds,
          expand: expandOpts,
          commentMode,
        },
        (response: ExpandAndExtractResponse) => {
          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              error:
                chrome.runtime.lastError.message ||
                'Content script did not respond — please reload the Facebook tab and try again.',
            });
            return;
          }
          resolve(response || { ok: false, error: 'No response from content script' });
        }
      );
    } catch (e) {
      resolve({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}

async function _fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[jaspidian] image fetch HTTP ${resp.status} for ${url.slice(0, 120)}`);
      return null;
    }
    // Reject if the server returned anything other than an image (e.g. a Facebook
    // photo-viewer HTML page when fullResolutionUrl is a /photo/?fbid= URL).
    const mimeType = (resp.headers.get('content-type') || '').split(';')[0].trim();
    if (!mimeType.startsWith('image/')) {
      console.warn(`[jaspidian] image fetch non-image content-type "${mimeType}" for ${url.slice(0, 120)}`);
      return null;
    }
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return { data: btoa(binary), mimeType };
  } catch (err) {
    console.warn(`[jaspidian] image fetch threw for ${url.slice(0, 120)}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** True for direct Facebook / Instagram CDN image URLs (not page links). */
function _isCdnImageUrl(url: string): boolean {
  return (
    url.includes('scontent') ||
    url.includes('fbcdn.net') ||
    url.includes('cdninstagram.com') ||
    url.includes('fbsbx.com')
  );
}
