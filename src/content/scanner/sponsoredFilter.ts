/**
 * src-v2/content/scanner/sponsoredFilter.ts
 * Rejects ads, sponsored, suggested-for-you, and other non-post chrome.
 */
import { REJECT_ANCESTOR_ROLES } from '../../shared/constants';

export interface RejectionResult {
  rejected: boolean;
  reason?: string;
}

const SPONSORED_TEXTS = [
  'sponsored',
  'ממומן',
  'مدفوع',
  'gesponsert',
  'patrocinado',
  'parrainé',
];

const SUGGESTED_TEXTS = [
  'suggested for you',
  'מוצע בשבילך',
  'people you may know',
  'suggested post',
  'suggested group',
  'suggested event',
];

/**
 * Check if an element should be rejected as non-post chrome.
 *
 * @param el Element to check.
 * @param doc Document (for ancestor checks).
 * @returns RejectionResult.
 */
export function isRejectedChrome(el: Element, doc: Document): RejectionResult {
  // 1. Ancestor role checks
  for (const sel of REJECT_ANCESTOR_ROLES) {
    if (el.closest(sel)) {
      return { rejected: true, reason: `inside rejected ancestor: ${sel}` };
    }
  }

  // 2. Check for sponsored/suggested text in the first ~300 chars of visible text
  const firstText = (el.textContent || '').slice(0, 300).toLowerCase();
  for (const phrase of SPONSORED_TEXTS) {
    if (firstText.includes(phrase)) {
      // Verify it's in a small span (not part of body text)
      if (_hasSponsoredMarker(el, phrase)) {
        return { rejected: true, reason: `sponsored: "${phrase}"` };
      }
    }
  }

  for (const phrase of SUGGESTED_TEXTS) {
    if (firstText.includes(phrase)) {
      return { rejected: true, reason: `suggested: "${phrase}"` };
    }
  }

  // 3. aria-label checks
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  for (const phrase of [...SPONSORED_TEXTS, ...SUGGESTED_TEXTS]) {
    if (ariaLabel.includes(phrase)) {
      return { rejected: true, reason: `aria-label: "${phrase}"` };
    }
  }

  // 4. Check for composer (text input in first 100px - it's not a post)
  const isComposer = el.matches('[role="dialog"] [role="textbox"]') ||
    (el.querySelector('[role="textbox"]') !== null && el.querySelector('[data-ad-rendering-role="story_message"]') === null);
  if (isComposer) {
    return { rejected: true, reason: 'composer element' };
  }

  return { rejected: false };
}

/**
 * Check if element has a sponsored marker span (distinct from body text containing the word).
 */
function _hasSponsoredMarker(el: Element, phrase: string): boolean {
  const spans = [...el.querySelectorAll('span, a')];
  return spans.some((s) => {
    const text = (s.textContent || '').trim().toLowerCase();
    return text === phrase || text === `· ${phrase}` || text === `${phrase} ·`;
  });
}
