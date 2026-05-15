/**
 * src-v2/content/scanner/scenarioDetector.ts
 * Detects the current Facebook surface: feed, permalink, photo viewer, modal, group, page, profile.
 */
import type { Scenario } from '../../shared/types';

/**
 * Detect the scenario (page type) based on URL and DOM structure.
 *
 * Decision order (first match wins):
 * 1. URL /photo/, /photo.php -> photoViewer
 * 2. URL /reel/ -> photoViewer (treated same)
 * 3. Dialog with comments heading visible -> commentsModal
 * 4. URL /posts/, /permalink.php, /story.php, /groups/{id}/posts/ -> permalink
 * 5. URL /groups/<slug>/ -> groupPage
 * 6. Page-like structure (page info side panel) -> pagePage
 * 7. Profile-like structure (profile tabs) -> profilePage
 * 8. Otherwise -> feed
 *
 * @param doc Document to inspect.
 * @param url Current page URL.
 * @returns Detected scenario.
 */
export function detectScenario(doc: Document, url: string): Scenario {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return 'unknown';
  }

  // 1. Photo viewer — but only when NOT opened as a modal over a feed.
  // When the user clicks a photo on the feed, Facebook changes the URL to /photo/?fbid=…
  // while the feed posts remain in the DOM behind the overlay.  Detecting as photoViewer
  // in that case would cause the scanner to look only at the modal panel and miss every
  // feed post.  If a live feed (or aria-posinset items) is present in the DOM alongside
  // the photo URL we fall through to feed detection so all posts are captured.
  if (/\/photo\/|\/photo\.php/.test(pathname) || pathname.includes('/reel/')) {
    const feedInDom = doc.querySelector('[role="feed"]') || doc.querySelector('[aria-posinset]');
    if (!feedInDom) return 'photoViewer';
    // else: photo modal over feed — fall through to feed detection below
  }

  // 2. Comments modal — dialog element present with role=dialog
  const dialog = doc.querySelector('[role="dialog"]');
  if (dialog) {
    const hasCommentInput = dialog.querySelector('[aria-label*="comment" i], [aria-label*="תגובות" i]');
    if (hasCommentInput) return 'commentsModal';
  }

  // 3. Permalink / post detail
  if (
    /\/posts\/\d+/.test(pathname) ||
    pathname.includes('/permalink.php') ||
    pathname.includes('/story.php') ||
    /\/groups\/[^/]+\/posts\//.test(pathname) ||
    /\/groups\/[^/]+\/permalink\//.test(pathname)
  ) {
    return 'permalink';
  }

  // 4. Group page
  if (/\/groups\/[^/]+/.test(pathname)) {
    return 'groupPage';
  }

  // 5. Page (has info side panel with page-info pagelet)
  if (
    doc.querySelector('[data-pagelet*="PageInfo"], [data-pagelet*="PageTimeline"]') ||
    doc.querySelector('[aria-label*="Page info" i]')
  ) {
    return 'pagePage';
  }

  // 6. Profile (has profile tabs: Timeline, About, Friends, etc.)
  if (
    doc.querySelector('[data-pagelet*="ProfileTimeline"], [data-pagelet*="ProfileAboutSection"]') ||
    doc.querySelector('[aria-label*="Profile" i][role="navigation"]')
  ) {
    return 'profilePage';
  }

  // 7. Feed / home
  if (
    pathname === '/' ||
    pathname.startsWith('/home') ||
    doc.querySelector('[data-pagelet="Feed"], [role="feed"]')
  ) {
    return 'feed';
  }

  return 'unknown';
}
