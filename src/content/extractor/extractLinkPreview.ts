/**
 * src-v2/content/extractor/extractLinkPreview.ts
 * Extract link preview cards (native Facebook meta-cards).
 */
import type { ExtractedLinkV2 } from '../../shared/types';
import { isFacebookUrl, absoluteFacebookUrl, cleanFacebookUrl } from '../../shared/facebookUrl';

/**
 * Extract link previews from a post element.
 */
export function extractLinkPreview(postEl: Element, baseUrl: string): ExtractedLinkV2[] {
  const links: ExtractedLinkV2[] = [];

  // Find link cards: a[role='link'] with sibling img or [role='img']
  const anchors = postEl.querySelectorAll("a[role='link'][href]");

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') || '';
    // Absolutify first so isFacebookUrl works on relative hrefs too
    const absoluteHref = absoluteFacebookUrl(href, baseUrl);

    // Skip Facebook links (internal posts/profiles)
    if (isFacebookUrl(absoluteHref)) continue;

    // Check for sibling image (Facebook's link card pattern)
    const parent = anchor.parentElement;
    if (!parent) continue;

    let hasImage = false;
    let imageUrl: string | undefined;

    // Check for img sibling
    const img = parent.querySelector('img[src]');
    if (img) {
      hasImage = true;
      imageUrl = img.getAttribute('src') || undefined;
    }

    // Check for [role='img'] sibling
    const roleImg = parent.querySelector("[role='img']");
    if (roleImg && !hasImage) {
      hasImage = true;
      const bgImg = getComputedStyle(roleImg).backgroundImage;
      if (bgImg && bgImg.includes('url(')) {
        imageUrl = bgImg.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      }
    }

    if (!hasImage) continue;

    // Extract title (anchor text or next sibling span)
    let title = (anchor.textContent || '').trim();
    if (!title) {
      const titleSpan = anchor.querySelector('span');
      title = (titleSpan?.textContent || '').trim();
    }

    // Extract description (next sibling text)
    let description: string | undefined;
    const nextSibling = anchor.nextElementSibling;
    if (nextSibling) {
      description = (nextSibling.textContent || '').trim();
    }

    links.push({
      url: cleanFacebookUrl(absoluteHref),
      title: title || undefined,
      description,
      imageUrl,
    });
  }

  return links;
}
