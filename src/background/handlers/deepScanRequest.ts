/**
 * src-v2/background/handlers/deepScanRequest.ts
 * Handles DEEP_SCAN_REQUEST: expands selected posts in the content script and
 * returns the fully-populated post objects to the popup — no vault write.
 */
import type {
  RuntimeMessageV2,
  ExtractedFacebookPostV2,
  ExpandAndExtractResponse,
  ScanOptions,
} from '../../shared/types';
import { MESSAGE_KIND, DEFAULT_COMMENT_MODE } from '../../shared/constants';

interface DeepScanMessage extends RuntimeMessageV2 {
  tabId: number;
  postIds: string[];
  expandOpts?: ScanOptions['expand'];
  commentMode?: string;
}

export interface DeepScanResponse {
  ok: boolean;
  posts?: ExtractedFacebookPostV2[];
  error?: string;
}

export function handleDeepScanRequest(
  message: RuntimeMessageV2,
  sendResponse: (response: DeepScanResponse) => void
): boolean {
  const msg = message as DeepScanMessage;

  chrome.tabs.sendMessage(
    msg.tabId,
    {
      v: 2,
      type: MESSAGE_KIND.EXPAND_AND_EXTRACT_REQUEST,
      postIds: msg.postIds,
      expand: msg.expandOpts || { body: true, comments: true, replies: true },
      commentMode: msg.commentMode || DEFAULT_COMMENT_MODE,
    },
    (resp: ExpandAndExtractResponse | undefined) => {
      if (chrome.runtime.lastError || !resp) {
        sendResponse({
          ok: false,
          error: chrome.runtime.lastError?.message || 'Content script did not respond — try reloading the Facebook page',
        });
        return;
      }
      if (!resp.ok) {
        sendResponse({ ok: false, error: resp.error || 'Expansion failed' });
        return;
      }
      sendResponse({ ok: true, posts: resp.posts || [] });
    }
  );

  return true; // async response
}
