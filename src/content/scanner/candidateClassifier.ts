/**
 * src-v2/content/scanner/candidateClassifier.ts
 * Classifies candidates as posts, comments, chrome, ads, etc.
 */
import type { ClassifiedCandidateV2, CandidateKind } from '../../shared/types';
import type { Candidate } from './candidateFinder';
import { isRejectedChrome } from './sponsoredFilter';
import { CANDIDATE_SIGNALS, REJECT_ANCESTOR_ROLES } from '../../shared/constants';

/**
 * Classify a single candidate element.
 *
 * @param c Candidate to classify.
 * @param doc Document (for contextual checks).
 * @returns Classified candidate with kind and signal array.
 */
export function classify(c: Candidate, doc: Document): ClassifiedCandidateV2 {
  const { el, origin } = c;
  const signals: ClassifiedCandidateV2['signals'] = [];
  let kind: CandidateKind = 'unknown';

  // 1. Check chrome rejection first
  const rejection = isRejectedChrome(el, doc);
  if (rejection.rejected) {
    const reason = rejection.reason || 'rejected chrome';
    if (reason.includes('sponsored')) {
      kind = 'sponsored';
    } else if (reason.includes('suggested')) {
      kind = 'suggested';
    } else if (reason.includes('composer')) {
      kind = 'composer';
    } else if (reason.includes('banner') || reason.includes('nav')) {
      kind = 'navigationChrome';
    } else {
      kind = 'railChrome';
    }
    signals.push({ name: 'reject: ' + reason, weight: -10, reason });
    return { el, origin, kind, signals, score: -10 };
  }

  // 2. Check if nested inside another article (likely a comment)
  if (el.parentElement?.closest('[role="article"]')) {
    kind = 'commentRoot';
    signals.push({ name: 'reject: nested article', weight: -8, reason: 'nested inside article = comment' });
    return { el, origin, kind, signals, score: -8 };
  }

  // 3. Assign positive signals

  // Photo viewer panel: explicitly targeted by candidateFinder for photo permalinks.
  // Give it the same weight as role="article" so it easily clears the score threshold.
  if (origin === 'photo-viewer-panel') {
    signals.push({ name: 'photo-viewer-panel', weight: 6, reason: 'photo viewer complementary / main panel' });
  }

  // role="article" on the element itself
  if (el.getAttribute('role') === 'article') {
    signals.push({ ...CANDIDATE_SIGNALS.ARTICLE_ROLE });
  }

  // aria-posinset = feed-indexed item
  if (el.hasAttribute('aria-posinset')) {
    signals.push({ ...CANDIDATE_SIGNALS.ARIA_POSINSET });
  }

  // Message body present
  if (
    el.querySelector('[data-ad-rendering-role="story_message"]') ||
    el.querySelector('[data-ad-comet-preview="message"]') ||
    el.querySelector('[data-ad-preview="message"]')
  ) {
    signals.push({ ...CANDIDATE_SIGNALS.MESSAGE_BODY });
  }

  // Permalink anchor present (timestamp link)
  const hasPermalink =
    el.querySelector('a[role="link"][href*="multi_permalinks"]') ||
    el.querySelector('a[href*="/posts/"], a[href*="/permalink/"]') ||
    el.querySelector('a[href*="/photo/"], a[href*="fbid="], a[href*="/reel/"]'); // photo / reel posts
  if (hasPermalink) {
    signals.push({ ...CANDIDATE_SIGNALS.PERMALINK });
  }

  // Media or link card
  if (
    el.querySelector('[data-imgperflogname="feedImage"], img[src*="scontent"]') ||
    el.querySelector('[data-testid="story-card-viewer"]')
  ) {
    signals.push({ ...CANDIDATE_SIGNALS.MEDIA });
  }

  // 4. Ancestor rejection checks
  for (const sel of REJECT_ANCESTOR_ROLES) {
    if (el.closest(sel)) {
      signals.push({ ...CANDIDATE_SIGNALS.REJECT_RAIL });
      break;
    }
  }

  // Inside [data-pagelet*="Recommended"] or similar
  if (el.closest('[data-pagelet*="Recommend"], [data-pagelet*="Suggested"]')) {
    signals.push({ ...CANDIDATE_SIGNALS.REJECT_SUGGESTED });
  }

  // 5. Determine kind from signals
  const totalScore = signals.reduce((s, sig) => s + sig.weight, 0);
  if (totalScore >= 5) {
    kind = 'postRoot';
  } else if (totalScore > 0) {
    kind = 'postRoot'; // Marginal — still accept, scorer will filter
  } else {
    kind = 'feedChrome';
  }

  return { el, origin, kind, signals, score: totalScore };
}
