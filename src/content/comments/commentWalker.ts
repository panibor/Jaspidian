/**
 * src-v2/content/comments/commentWalker.ts
 * Walks the DOM comment tree, extracts comment data, and builds parent/child relationships.
 */
import type { ExtractedFacebookCommentV2 } from '../../shared/types';
import { markOPAnswers } from './commentClassifier';
import { absoluteFacebookUrl } from '../../shared/facebookUrl';
import { COMMENT_ARIA_LABELS } from '../../shared/constants';

/**
 * Walk the comment tree within a post element.
 *
 * @param postEl Post root element.
 * @param opAuthorName Original post author name.
 * @param opAuthorUrl Original post author URL.
 * @returns Array of top-level ExtractedFacebookCommentV2 (with nested replies).
 */
export function walkComments(
  postEl: Element,
  opAuthorName: string | undefined,
  opAuthorUrl: string | undefined
): ExtractedFacebookCommentV2[] {
  // Find comment containers
  // Facebook renders comments as [role="article"] inside a comment list area
  const commentEls = _findCommentElements(postEl);

  if (commentEls.length === 0) return [];

  // Extract flat list with depth information
  const flat: Array<{ comment: ExtractedFacebookCommentV2; depth: number; el: Element }> = [];

  for (const { el, depth } of commentEls) {
    const comment = _extractComment(el, postEl, depth);
    flat.push({ comment, depth, el });
  }

  // Build tree structure from depth
  const roots: ExtractedFacebookCommentV2[] = [];
  const stack: Array<{ comment: ExtractedFacebookCommentV2; depth: number }> = [];

  for (const { comment, depth } of flat) {
    // Pop stack back to parent level
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(comment);
    } else {
      stack[stack.length - 1].comment.replies.push(comment);
    }

    stack.push({ comment, depth });
  }

  // Mark OP comments
  const opWarnings = markOPAnswers(roots, opAuthorName, opAuthorUrl);
  // Warnings are returned embedded; callers check expansionStats.warnings
  void opWarnings;

  return roots;
}

interface CommentRef {
  el: Element;
  depth: number;
}

function _findCommentElements(postEl: Element): CommentRef[] {
  const results: CommentRef[] = [];
  const seen = new Set<Element>();

  // Strategy 1: aria-label patterns (English + Hebrew)
  const allLabels = [
    ...COMMENT_ARIA_LABELS.comment,
    ...COMMENT_ARIA_LABELS.commentHE,
  ];

  const selector = allLabels.map((l) => `[aria-label*="${l}" i]`).join(', ');

  for (const el of postEl.querySelectorAll(selector)) {
    if (seen.has(el) || el === postEl) continue;
    seen.add(el);
    const depth = _nestingDepth(el, postEl);
    results.push({ el, depth });
  }

  // Strategy 2: Nested [role="article"] inside the post (each comment gets role="article")
  for (const el of postEl.querySelectorAll('[role="article"]')) {
    if (seen.has(el) || el === postEl) continue;
    // Skip if it's another post (shared post)
    if (el.querySelector('[data-ad-rendering-role="story_message"]')) continue;
    // Skip story/reel/suggested cards embedded in the same feed unit
    if (el.closest('[data-pagelet*="Stories"],[data-pagelet*="Reels"],[data-pagelet*="Suggested"],[data-pagelet*="Recommend"]')) continue;
    if (el.closest('a[href*="/stories/"],a[href*="/reels/"]')) continue;
    seen.add(el);
    const depth = _nestingDepth(el, postEl);
    results.push({ el, depth });
  }

  // Sort by DOM order
  results.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  return results;
}

function _nestingDepth(el: Element, postEl: Element): number {
  let depth = 0;
  let current: Element | null = el.parentElement;
  while (current && current !== postEl) {
    const role = current.getAttribute('role');
    if (role === 'article' || current.getAttribute('aria-label')?.toLowerCase().includes('comment')) {
      depth++;
    }
    current = current.parentElement;
  }
  return depth;
}

// Matches time-like display text: "1 h", "2 min", "5 d", "Just now", "1 w", etc.
const TIME_TEXT = /^(\d+\s*(s|sec|min|h|hr|d|w)|just now)/i;
// Matches aria-label time descriptions: "1 hour ago", "5 minutes ago"
const TIME_ARIA = /\d+\s+(second|minute|hour|day|week)/i;

/** Facebook UI button labels that should never appear in comment text. */
const COMMENT_UI_FRAGMENTS =
  /\b(See\s+more|See\s+less|Show\s+more|Show\s+less|Read\s+more|Load\s+more|View\s+more|View\s+less|ראה\s+עוד|ראה\s+פחות|הצג\s+עוד|הצג\s+פחות|Like|Reply|Share)\b/gi;

function _extractComment(el: Element, postEl: Element, depth: number): ExtractedFacebookCommentV2 {
  // ── Author ────────────────────────────────────────────────────────────────
  // Strategy 1: parse the comment article's own aria-label.
  // Facebook always puts it there in the form:
  //   Hebrew  → "תגובה של <Name> לפני <time>"
  //   English → "Comment by <Name>, <time>" or "<Name>'s comment"
  let authorName = '';
  let authorUrl: string | undefined;

  const ariaLabel = el.getAttribute('aria-label') || '';
  const heMatch = ariaLabel.match(/תגובה של (.+?) לפני/);
  const enMatch = ariaLabel.match(/[Cc]omment(?:\s+by)?\s+(.+?)(?:,|\s+\d+|\s*$)/);
  if (heMatch) authorName = heMatch[1].trim();
  else if (enMatch) authorName = enMatch[1].trim();

  // Strategy 2 (fallback): first <a role="link"> with text that is NOT a
  // post/permalink URL.  Facebook puts comment_id= on ALL links (including profile
  // ones) so we must NOT filter by that — instead exclude by path patterns.
  if (!authorName) {
    const allLinks = [...el.querySelectorAll('a[role="link"]')].filter(
      (a) => (a.textContent || '').trim().length > 0
    );
    const authorLink = allLinks.find((a) => {
      const href = a.getAttribute('href') || '';
      return (
        (href.startsWith('/') || href.includes('facebook.com')) &&
        !href.includes('/posts/') &&
        !href.includes('/permalink/') &&
        !href.includes('/story.php') &&
        !href.includes('/photo/')
      );
    });
    authorName = (authorLink?.textContent || '').trim();
    const authorHref = authorLink?.getAttribute('href') || '';
    if (authorHref) authorUrl = absoluteFacebookUrl(authorHref, 'https://www.facebook.com');
  }

  // Get authorUrl when we found the name from aria-label (need to get it from link)
  if (authorName && !authorUrl) {
    const profileLink = [...el.querySelectorAll('a[href]')].find((a) => {
      const href = a.getAttribute('href') || '';
      return (href.startsWith('/') || href.includes('facebook.com')) &&
        !href.includes('/posts/') && !href.includes('/permalink/') &&
        !href.includes('/story.php') && !href.includes('/photo/');
    });
    const h = profileLink?.getAttribute('href') || '';
    if (h) authorUrl = absoluteFacebookUrl(h, 'https://www.facebook.com');
  }

  if (!authorName) authorName = 'Unknown';

  // ── Image attached to comment ─────────────────────────────────────────────
  // Check BEFORE cloning — look for a content image (not avatar, not emoji).
  let imageUrl: string | undefined;
  for (const img of el.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src') || '';
    if (!src.includes('scontent')) continue;           // must be a CDN content image
    const w = parseInt(img.getAttribute('width') || '0');
    if (w > 48) { imageUrl = src; break; }             // skip avatars / emoji (≤48 px)
  }

  // ── Clone + strip for text extraction ─────────────────────────────────────
  const clone = el.cloneNode(true) as Element;
  // Remove nested replies so their text doesn't bleed into this comment's body
  for (const nested of [...clone.querySelectorAll('[role="article"]')]) {
    nested.parentElement?.removeChild(nested);
  }
  // Remove interactive controls (Like, Reply, See more labels, etc.)
  for (const btn of [...clone.querySelectorAll('button, [role="button"], [aria-expanded]')]) {
    btn.parentElement?.removeChild(btn);
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  // First [dir="auto"] that is not inside an <a> (those are author name spans).
  let body = '';
  for (const candidate of clone.querySelectorAll('[dir="auto"]')) {
    const text = (candidate.textContent || '').trim();
    if (!text) continue;
    if ((candidate as Element).closest('a')) continue;
    if (text === authorName) continue;
    body = text;
    break;
  }

  if (!body) {
    body = (clone.textContent || '').trim();
    if (authorName && body.startsWith(authorName)) {
      body = body.slice(authorName.length).trim();
    }
  }

  body = body.replace(COMMENT_UI_FRAGMENTS, '').replace(/\s{2,}/g, ' ').trim();

  // ── Timestamp ─────────────────────────────────────────────────────────────
  let timestampText: string | undefined;
  let permalink: string | undefined;
  const cloneLinks = [...clone.querySelectorAll('a[role="link"]')].filter(
    (a) => (a.textContent || '').trim().length > 0
  );
  for (const link of cloneLinks) {
    const href = link.getAttribute('href') || '';
    const ala = link.getAttribute('aria-label') || '';
    const text = (link.textContent || '').trim();
    if (TIME_TEXT.test(text) || TIME_ARIA.test(ala)) {
      timestampText = ala || text || undefined;
      permalink = href ? absoluteFacebookUrl(href, 'https://www.facebook.com') : undefined;
      break;
    }
  }

  return {
    authorName,
    authorUrl,
    body,
    imageUrl,
    timestampText,
    permalink,
    depth,
    isOP: false,
    parentAnsweredByOP: false,
    replies: [],
  };
}
