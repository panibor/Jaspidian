/**
 * src-v2/content/scanner/candidateFinder.ts
 * Finds candidate post elements by running all known selectors and deduplicating.
 */
import type { Scenario } from '../../shared/types';

export interface Candidate {
  el: Element;
  origin: string;
}

/**
 * Find all candidate elements that might be posts.
 *
 * Runs scenario-appropriate selectors and deduplicates by element identity.
 * Priority: aria-posinset > [role="article"] > feed children > data-pagelet.
 *
 * @param doc Document to search.
 * @param scenario Page type.
 * @returns Array of candidates (may be empty).
 */
export function findCandidates(doc: Document, scenario: Scenario): Candidate[] {
  const seen = new Map<Element, string>();

  function add(el: Element, origin: string): void {
    if (!seen.has(el)) seen.set(el, origin);
  }

  // Highest confidence: aria-posinset (feed items are indexed).
  // Exception: on permalink / profile / page scenarios, [aria-posinset] elements that sit
  // inside a [role="feed"] are sidebar "Suggested posts" widgets — not the main content.
  // Including them causes the scanner to return two "posts" for a single permalink post.
  const isNonFeedScenario =
    scenario === 'permalink' ||
    scenario === 'pagePage' ||
    scenario === 'profilePage' ||
    scenario === 'photoViewer';
  for (const el of doc.querySelectorAll('[aria-posinset]')) {
    if (isNonFeedScenario && el.closest('[role="feed"]')) continue;
    add(el, 'aria-posinset');
  }

  // Universal: [role="article"] — the primary Facebook post container.
  // On non-feed scenarios (permalink, profile, page) also skip articles inside
  // [role="feed"] — those are sidebar "Suggested posts", same as the aria-posinset filter.
  for (const el of doc.querySelectorAll('[role="article"]')) {
    // Skip articles nested inside another article (those are comments)
    if (el.parentElement?.closest('[role="article"]')) continue;
    // Skip sidebar feed articles on permalink / profile / page views
    if (isNonFeedScenario && el.closest('[role="feed"]')) continue;
    add(el, 'role-article');
  }

  // Feed / group page: direct children of [role="feed"] or feed containers
  if (scenario === 'feed' || scenario === 'groupPage' || scenario === 'unknown') {
    for (const el of doc.querySelectorAll('[role="feed"] > div, [data-pagelet*="FeedUnit"] > div')) {
      // Skip wrapper elements that CONTAIN aria-posinset posts — they're feed containers,
      // not individual posts. Adding them causes the dedup to eat all real post candidates.
      if (el.children.length > 0 && !el.querySelector('[aria-posinset]')) {
        add(el, 'feed-child');
      }
    }
  }

  // Permalink: the single post at the top of the page
  if (scenario === 'permalink') {
    const mainRegion = doc.querySelector('[role="main"]');
    if (mainRegion) {
      const articles = mainRegion.querySelectorAll('[role="article"]');
      if (articles.length > 0) add(articles[0], 'permalink-main');
    }
  }

  // Comments modal: dialog root contains the post
  if (scenario === 'commentsModal') {
    const dialog = doc.querySelector('[role="dialog"]');
    if (dialog) add(dialog, 'dialog-root');
  }

  // Photo viewer: complementary panel (post info + comments lives here)
  if (scenario === 'photoViewer') {
    // Case A: photo opened as a modal over a feed (dialog wrapper present)
    const inDialog = doc.querySelector('[role="dialog"] [role="complementary"]');
    if (inDialog) {
      add(inDialog, 'photo-viewer-panel');
    } else {
      // Case B: direct photo permalink URL (/photo/?fbid=…) — no dialog wrapper.
      // The right-side panel with author/text/comments sits at page level.
      for (const comp of doc.querySelectorAll('[role="complementary"]')) {
        add(comp, 'photo-viewer-panel');
      }
      // Last resort: treat [role="main"] as the candidate (single-post permalink layout)
      const seen_panel = [...seen.values()].some((v) => v === 'photo-viewer-panel');
      if (!seen_panel) {
        const main = doc.querySelector('[role="main"]');
        if (main) add(main, 'photo-viewer-panel');
      }
    }
  }

  // Data pagelet fallback — skip if the pagelet is a container holding aria-posinset posts
  for (const el of doc.querySelectorAll('[data-pagelet*="FeedUnit"], [data-pagelet*="GroupsFeed"]')) {
    if (!el.querySelector('[aria-posinset]')) add(el, 'pagelet');
  }

  // Filter: must have some post-like content to be a real candidate
  const results: Candidate[] = [];
  for (const [el, origin] of seen) {
    if (_looksLikePost(el)) {
      results.push({ el, origin });
    }
  }

  return results;
}

function _looksLikePost(el: Element): boolean {
  // Must have some text content
  if ((el.textContent || '').trim().length < 5) return false;

  // Exclude Facebook non-post widgets (People You May Know, friend suggestions, ads, etc.)
  const EXCLUDE_PAGELETS = [
    'PeopleYouMayKnow', 'FriendSuggestions', 'BirthdayWidget', 'GroupsYouShouldJoin',
    'PagesYouMightLike', 'EventsWidget', 'MarketplaceWidget', 'ShortcutList',
  ];
  if (EXCLUDE_PAGELETS.some((p) => el.closest(`[data-pagelet*="${p}"]`))) return false;

  // Exclude elements with aria-labels that clearly indicate non-post content
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  if (/people you may know|אנשים שאולי תכיר|friend suggestion/i.test(ariaLabel)) return false;

  // Strong signal: has story_message (body) or profile_name (author area)
  if (
    el.querySelector('[data-ad-rendering-role="story_message"]') ||
    el.querySelector('[data-ad-rendering-role="profile_name"]') ||
    el.querySelector('[data-ad-comet-preview="message"]') ||
    el.querySelector('[data-ad-preview="message"]')
  ) {
    return true;
  }

  // Weaker signal: has a role=link with timestamp pattern
  if (el.querySelector('a[role="link"][aria-label]') && el.querySelector('a[role="link"]')) {
    return true;
  }

  // Photo viewer: complementary / main panel has an image (the photo) + links
  if (
    (el.getAttribute('role') === 'complementary' || el.getAttribute('role') === 'main') &&
    el.querySelector('img[src]') &&
    el.querySelector('a[role="link"]')
  ) {
    return true;
  }

  return false;
}
