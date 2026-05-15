/**
 * src-v2/content/index.ts
 * Content script entry point for the v2 extension.
 *
 * Two message kinds are handled here:
 *   SCAN_REQUEST             — quick scan (no DOM clicks), returns post list
 *   EXPAND_AND_EXTRACT_REQUEST — expand stored posts and return full data
 */
import { scan, expandAndExtractPosts } from './scanner/pipeline';
import { openAndScanViaModal } from './modalScanner';
import { createBrowserEnv } from '../shared/env';
import { MESSAGE_KIND } from '../shared/constants';
import type {
  ScanOptions,
  ScanResponse,
  ExpandAndExtractRequest,
  ExpandAndExtractResponse,
  ExtractedFacebookPostV2,
  CommentMode,
} from '../shared/types';

interface ModalScanPostRequest {
  v: number;
  type: string;
  postId: string;
  commentMode: CommentMode;
}

interface ModalScanPostResponse {
  ok: boolean;
  post?: ExtractedFacebookPostV2;
  error?: string;
}

/**
 * Module-level store: postId → WeakRef<Element>.
 * Populated during SCAN_REQUEST; consumed during EXPAND_AND_EXTRACT_REQUEST.
 * WeakRef lets the browser GC elements if the user navigates away.
 */
const _postElementStore = new Map<string, WeakRef<Element>>();

function init(): void {
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (!message || message.v !== 2) return false;

      // ---- Quick scan (no expansion) ----
      if (message.type === MESSAGE_KIND.SCAN_REQUEST) {
        try {
          const opts: ScanOptions = message.opts || {
            expand: { body: false, comments: false, replies: false },
            commentMode: 'opAnsweredOnly',
          };

          const env = createBrowserEnv();

          scan(env, opts)
            .then(({ envelope, elementMap }) => {
              // Refresh element store — clear stale refs from a previous scan
              _postElementStore.clear();
              for (const [postId, el] of elementMap) {
                _postElementStore.set(postId, new WeakRef(el));
              }

              const resp: ScanResponse = { ok: true, envelope };
              sendResponse(resp);
            })
            .catch((err) => {
              const resp: ScanResponse = {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              };
              sendResponse(resp);
            });

          return true; // keep port open for async response
        } catch (err) {
          const resp: ScanResponse = {
            ok: false,
            error: `Content script setup error: ${err instanceof Error ? err.message : String(err)}`,
          };
          sendResponse(resp);
          return false;
        }
      }

      // ---- Deferred expansion + re-extraction ----
      if (message.type === MESSAGE_KIND.EXPAND_AND_EXTRACT_REQUEST) {
        const req = message as ExpandAndExtractRequest;
        const postIds = req.postIds || [];
        const expandOpts = req.expand || { body: true, comments: true, replies: true };
        const commentMode = req.commentMode || 'opAnsweredOnly';

        const doExpand = async (): Promise<ExpandAndExtractResponse> => {
          const env = createBrowserEnv();

          // Check if any stored element refs have gone stale.
          // This happens when Facebook re-renders its photo viewer / dialog between
          // scan and export — the element is replaced in the DOM even though the user
          // never left the page.
          const anyStale = postIds.some((id) => {
            const el = _postElementStore.get(id)?.deref();
            return !el || !el.isConnected;
          });

          if (anyStale) {
            // Re-scan silently (no expansion, no clicks) to refresh element refs.
            const { elementMap } = await scan(env, {
              expand: { body: false, comments: false, replies: false },
              commentMode,
            });
            // Merge fresh refs into the store — do NOT clear, in case other posts are still valid.
            for (const [postId, el] of elementMap) {
              _postElementStore.set(postId, new WeakRef(el));
            }
          }

          const { posts, warnings, notFound } = await expandAndExtractPosts(
            env, postIds, _postElementStore, expandOpts, commentMode
          );
          return { ok: true, posts, notFound: notFound.length ? notFound : undefined };
        };

        doExpand()
          .then((resp) => sendResponse(resp))
          .catch((err) => {
            const resp: ExpandAndExtractResponse = {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            };
            sendResponse(resp);
          });

        return true; // keep port open for async response
      }

      // ---- Modal scan: open post's comments modal, scan, close, return post ----
      if (message.type === MESSAGE_KIND.MODAL_SCAN_POST) {
        const req = message as ModalScanPostRequest;
        const postId = req.postId;
        const commentMode: CommentMode = req.commentMode || 'opAnsweredOnly';

        const doModalScan = async (): Promise<ModalScanPostResponse> => {
          const env = createBrowserEnv();

          // Find the stored element; re-scan if stale
          let postEl = _postElementStore.get(postId)?.deref();
          if (!postEl || !(postEl as HTMLElement).isConnected) {
            const { elementMap } = await scan(env, {
              expand: { body: false, comments: false, replies: false },
              commentMode,
            });
            for (const [id, el] of elementMap) {
              _postElementStore.set(id, new WeakRef(el));
            }
            postEl = _postElementStore.get(postId)?.deref();
          }

          if (!postEl || !(postEl as HTMLElement).isConnected) {
            return { ok: false, error: `Post element not found in DOM for id: ${postId}` };
          }

          const { post, error } = await openAndScanViaModal(postEl, env, commentMode);
          if (error || !post) return { ok: false, error: error || 'Modal scan returned no post' };
          return { ok: true, post };
        };

        doModalScan()
          .then((resp) => sendResponse(resp))
          .catch((err) => sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }));

        return true; // keep port open
      }

      return false;
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
