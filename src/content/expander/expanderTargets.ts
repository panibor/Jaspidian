/**
 * src-v2/content/expander/expanderTargets.ts
 * Button finder utilities for expansion.
 */
import { EXPAND_LABELS_EN, EXPAND_LABELS_HE, DENY_LIST_LABELS } from '../../shared/constants';

/**
 * Find "See more" / truncation buttons in post body.
 * Language-agnostic: relies on aria-expanded="false" which Facebook sets on the
 * truncation control in every language (English, Hebrew, Russian, German, etc.).
 * Label-based matching is kept as a secondary fallback only.
 */
export function findSeeMoreInBody(postEl: Element): HTMLElement[] {
  const results: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  // Primary: aria-expanded="false" inside the message body container
  const messageRoot =
    postEl.querySelector('[data-ad-rendering-role="story_message"]') ||
    postEl.querySelector('[data-ad-comet-preview="message"]') ||
    postEl.querySelector('[data-ad-preview="message"]');

  const searchRoot = messageRoot || postEl;
  for (const el of searchRoot.querySelectorAll('[aria-expanded="false"]')) {
    const h = el as HTMLElement;
    if (isVisible(h) && !isOnDenyList(h) && !seen.has(h)) {
      seen.add(h);
      results.push(h);
    }
  }

  // Secondary fallback: label-based search for button/role="button" elements
  // (catches edge cases where aria-expanded is absent)
  for (const el of findExpandButtons(postEl, EXPAND_LABELS_EN.concat(EXPAND_LABELS_HE))) {
    if (!seen.has(el)) { seen.add(el); results.push(el); }
  }

  return results;
}

/**
 * Find "View comments" buttons.
 */
export function findViewCommentsButtons(postEl: Element): HTMLElement[] {
  const labels = ['view more comments', 'view previous comments', 'view all comments', 'הצג תגובות נוספות', 'הצג תגובות קודמות', 'הצג את כל התגובות'];
  return findExpandButtons(postEl, labels);
}

/**
 * Find "View replies" buttons - uses both label matching AND aria-expanded="false"
 * so it catches dynamically-loaded nested reply sections Facebook adds after first expansion.
 */
export function findViewRepliesButtons(commentsRoot: Element): HTMLElement[] {
  const labels = [
    // English
    'view replies', 'view previous replies', 'view all replies',
    'view more replies', 'load more replies',
    // Hebrew
    'הצג תשובות', 'הצג תשובות קודמות', 'הצג את כל התשובות',
    'הצג תשובות נוספות', 'טען תשובות נוספות',
    // Numeric patterns caught by partial match: "3 replies", "5 תשובות"
    ' replies', ' תשובות',
  ];

  const byLabel = findExpandButtons(commentsRoot, labels);
  const seen = new Set<HTMLElement>(byLabel);

  // Strategy 2: aria-expanded="false" buttons that live INSIDE a comment
  // (reply threads that are collapsed and not yet expanded)
  for (const el of commentsRoot.querySelectorAll('[role="article"] [aria-expanded="false"]')) {
    const h = el as HTMLElement;
    // Only if NOT a deny-listed button (like/share) and not the body "See more"
    if (!isVisible(h) || isOnDenyList(h) || seen.has(h)) continue;
    // Must be inside a comment article, not a top-level post body
    const parentArticle = h.closest('[role="article"]');
    if (!parentArticle || parentArticle === commentsRoot) continue;
    seen.add(h);
    byLabel.push(h);
  }

  return byLabel;
}

/**
 * Internal: find clickable buttons matching any of the given labels.
 */
function findExpandButtons(root: Element, labels: string[]): HTMLElement[] {
  const buttons: HTMLElement[] = [];
  const candidates = root.querySelectorAll('button, [role="button"]');

  for (const candidate of candidates) {
    if (!isVisible(candidate)) continue;
    if (isOnDenyList(candidate)) continue;

    const text = (candidate.textContent || '').toLowerCase();
    const ariaLabel = (candidate.getAttribute('aria-label') || '').toLowerCase();
    const title = (candidate.getAttribute('title') || '').toLowerCase();

    const match = labels.some(
      (label) => text.includes(label.toLowerCase()) || ariaLabel.includes(label.toLowerCase()) || title.includes(label.toLowerCase())
    );

    if (match) {
      buttons.push(candidate as HTMLElement);
    }
  }

  return buttons;
}

/**
 * Check if an element is visible.
 */
function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return true;
}

/**
 * Check if element's label is on the deny list.
 */
function isOnDenyList(el: Element): boolean {
  const text = ((el.textContent || '') + (el.getAttribute('aria-label') || '')).toLowerCase();
  return DENY_LIST_LABELS.some((label) => text.includes(label.toLowerCase()));
}
