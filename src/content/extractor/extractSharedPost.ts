/**
 * src-v2/content/extractor/extractSharedPost.ts
 * Extracts a shared post (post-within-post) if present.
 */
import type { SharedPostV2 } from '../../shared/types';
import { extractImages } from './extractImages';

/**
 * Extract a shared post (post-within-post) if present.
 *
 * @param postEl Post root element.
 * @returns SharedPostV2 if found, undefined otherwise.
 */
export function extractSharedPost(postEl: Element): SharedPostV2 | undefined {
  // Detection: nested [role="article"] that is a *real* shared post, not a
  // comment. Facebook marks every comment with role="article" too, so we have
  // to identify the shared post by its story-message body marker — the same
  // marker the top-level post carries — and explicitly reject anything that
  // looks like a comment (matching the exclusion in commentWalker).
  for (const nested of postEl.querySelectorAll('[role="article"]')) {
    if (nested === postEl) continue;
    if (!_isSharedPostArticle(nested)) continue;
    return _extractFromElement(nested);
  }

  // Fallback: a structured preview block (external share card)
  const shareCard = postEl.querySelector(
    'a[href*="facebook.com"][role="link"] div, [data-testid="share-story"]'
  );
  if (shareCard) {
    const anchor = shareCard.closest('a[href]');
    const href = anchor?.getAttribute('href') || '';
    if (href.includes('/posts/') || href.includes('story_fbid')) {
      return {
        permalink: href,
        body: (shareCard.textContent || '').trim().slice(0, 500) || undefined,
      };
    }
  }

  return undefined;
}

/**
 * Decide whether a nested [role="article"] is a real shared post (a
 * post-within-a-post) or a comment masquerading as one.
 *
 * Real shared posts carry the same body marker as the outer post
 * (`[data-ad-rendering-role="story_message"]` or one of the related comet
 * markers). Comments never carry these markers, and their aria-label always
 * starts with "Comment by …" / "תגובה של …".
 */
function _isSharedPostArticle(el: Element): boolean {
  // Comments self-identify via aria-label — bail immediately if so.
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  if (
    ariaLabel.startsWith('comment by') ||
    ariaLabel.includes('reply by') ||
    ariaLabel.includes('תגובה של') ||
    ariaLabel.includes('תשובה של')
  ) {
    return false;
  }
  // Real shared posts contain a story-message body.
  if (
    el.querySelector('[data-ad-rendering-role="story_message"]') ||
    el.querySelector('[data-ad-comet-preview="message"]') ||
    el.querySelector('[data-ad-preview="message"]')
  ) {
    return true;
  }
  return false;
}

function _extractFromElement(el: Element): SharedPostV2 {
  // Author
  let authorName: string | undefined;
  let authorUrl: string | undefined;
  const authorLink = el.querySelector('a[role="link"][href*="/user/"], a[role="link"][href*="facebook.com"]');
  if (authorLink) {
    authorName = (authorLink.textContent || '').trim() || undefined;
    authorUrl = authorLink.getAttribute('href') || undefined;
  }

  // Body
  const bodyEl =
    el.querySelector('[data-ad-rendering-role="story_message"]') ||
    el.querySelector('[data-ad-comet-preview="message"]') ||
    el.querySelector('[data-ad-preview="message"]');

  let body: string | undefined;
  if (bodyEl) {
    body = (bodyEl.textContent || '').trim().slice(0, 2000) || undefined;
  } else {
    // Fallback: same [dir="auto"] heuristic as extractBody —
    // pick the first element that is not inside an anchor, has enough text,
    // and doesn't look like a timestamp / engagement counter.
    const TIMESTAMP_RE =
      /^[‎‏\s]*\d+\s*(שעות?|דקות?|ימים|יום|שבועות?|חודשים?|hours?|hr?s?|mins?|minutes?|days?|wks?|weeks?|months?)/i;
    for (const candidate of el.querySelectorAll('[dir="auto"]')) {
      if (candidate.closest('a[href]')) continue;
      const text = (candidate.textContent || '').trim();
      if (text.length < 10) continue;
      if (TIMESTAMP_RE.test(text)) continue;
      body = text.slice(0, 2000);
      break;
    }
  }

  // Permalink
  const permalinkLink = el.querySelector('a[role="link"][href*="multi_permalinks"], a[href*="/posts/"]');
  const permalink = permalinkLink?.getAttribute('href') || undefined;

  // Images
  const images = extractImages(el);

  return {
    authorName,
    authorUrl,
    body,
    permalink,
    images: images.length > 0 ? images : undefined,
  };
}
