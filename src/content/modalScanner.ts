/**
 * src-v2/content/modalScanner.ts
 * Opens a Facebook post's comments modal, scans its contents, closes it.
 *
 * Strategy: click the comment-count link (or "Comment" action button) on the
 * feed post element → wait for [role="dialog"] → run full scan pipeline inside
 * the dialog → press Escape to close → return extracted post.
 */
import type { Env, ExtractedFacebookPostV2, CommentMode } from '../shared/types';
import { scan } from './scanner/pipeline';
import { EXPANDER_CAPS } from '../shared/constants';

const DIALOG_APPEAR_MS = 7000;
const DIALOG_SETTLE_MS = 600;
const DIALOG_CLOSE_MS  = 2000;

export interface ModalScanResult {
  post: ExtractedFacebookPostV2 | null;
  error?: string;
}

/**
 * Open the comments modal for a feed post element, scan its full content,
 * close the modal, and return the extracted post.
 */
export async function openAndScanViaModal(
  postEl: Element,
  env: Env,
  commentMode: CommentMode
): Promise<ModalScanResult> {
  const { document: doc } = env;

  // Close any stale dialog before we start
  const stale = doc.querySelector('[role="dialog"]');
  if (stale) {
    _pressEscape(doc);
    await _waitDialogGone(doc, 2000);
    await _sleep(300);
  }

  // Find the click target that opens the comments modal
  const trigger = _findCommentsTrigger(postEl);
  if (!trigger) {
    return { post: null, error: 'No comment trigger found on post element' };
  }

  // Click to open
  trigger.click();

  // Wait for the dialog to appear
  const dialog = await _waitForDialog(doc, DIALOG_APPEAR_MS);
  if (!dialog) {
    return { post: null, error: 'Comments modal did not open (timeout after 7 s)' };
  }

  // Let the dialog finish rendering
  await _sleep(DIALOG_SETTLE_MS);

  // Run the full scan pipeline inside the dialog context.
  // scenarioDetector will see [role="dialog"] with a comment input → 'commentsModal'.
  // candidateFinder will use the dialog as the post root.
  const scanResult = await scan(env, {
    expand: {
      body: true,
      comments: true,
      replies: true,
      maxClicks: EXPANDER_CAPS.maxClicks,
      maxMs: EXPANDER_CAPS.maxMs,
      maxMutationNodes: EXPANDER_CAPS.maxMutationNodes,
    },
    commentMode,
  });

  const posts = scanResult.envelope.posts;
  const post = posts.length > 0 ? posts[0] : null;

  // Close the dialog
  _pressEscape(doc);
  // Also try the close button inside the dialog
  const closeBtn = dialog.querySelector<HTMLElement>(
    '[aria-label*="close" i], [aria-label*="סגור" i], [aria-label*="Close" i]'
  );
  if (closeBtn) closeBtn.click();

  await _waitDialogGone(doc, DIALOG_CLOSE_MS);
  await _sleep(400); // let feed re-settle

  if (!post) {
    return { post: null, error: 'Modal opened but scanner found no post inside' };
  }
  return { post };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the element to click to open the comments modal.
 * Priority: comment-count text link > "Comment" action button.
 */
function _findCommentsTrigger(postEl: Element): HTMLElement | null {
  // Strategy 1: comment count link - "45 Comments", "45 תגובות", "45 تعليق"
  const countRe = /\d+\s*(comments?|תגובות?|تعليقات?)/i;
  for (const el of postEl.querySelectorAll<HTMLElement>('a, [role="link"], span[dir]')) {
    if (el === postEl) continue;
    const text = (el.textContent || '').trim();
    if (countRe.test(text) && _isVisible(el)) return el;
  }

  // Strategy 2: "Comment" action button in the post footer row
  const actionRe = /^(comment|תגובה|تعليق)$/i;
  for (const el of postEl.querySelectorAll<HTMLElement>('[role="button"], button')) {
    const text = (el.textContent || '').trim();
    const label = el.getAttribute('aria-label') || '';
    if ((actionRe.test(text) || actionRe.test(label)) && _isVisible(el)) return el;
  }

  return null;
}

function _isVisible(el: HTMLElement): boolean {
  try {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  } catch { return false; }
}

function _pressEscape(doc: Document): void {
  doc.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true,
  }));
}

function _waitForDialog(doc: Document, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    // Already open?
    const existing = doc.querySelector('[role="dialog"]');
    if (existing) { resolve(existing); return; }

    let done = false;
    const observer = new MutationObserver(() => {
      const d = doc.querySelector('[role="dialog"]');
      if (d && !done) { done = true; observer.disconnect(); resolve(d); }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    setTimeout(() => {
      if (!done) { done = true; observer.disconnect(); resolve(null); }
    }, timeoutMs);
  });
}

function _waitDialogGone(doc: Document, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!doc.querySelector('[role="dialog"]')) { resolve(); return; }
    let done = false;
    const observer = new MutationObserver(() => {
      if (!doc.querySelector('[role="dialog"]') && !done) {
        done = true; observer.disconnect(); resolve();
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    setTimeout(() => { if (!done) { done = true; observer.disconnect(); resolve(); } }, timeoutMs);
  });
}

function _sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
