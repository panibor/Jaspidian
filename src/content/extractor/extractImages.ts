/**
 * src-v2/content/extractor/extractImages.ts
 * Extracts images from a post element at highest resolution available.
 */
import type { ExtractedImageV2 } from '../../shared/types';
import { MIN_IMAGE_PX, REJECT_IMAGE_PATTERNS } from '../../shared/constants';

/**
 * Extract all images from a post element.
 *
 * @param postEl Post root element.
 * @returns Array of ExtractedImageV2.
 */
export function extractImages(postEl: Element): ExtractedImageV2[] {
  const results: ExtractedImageV2[] = [];
  const seen = new Set<string>();

  // Collect all img elements
  const imgs = postEl.querySelectorAll('img');
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    if (!src || _isRejected(img, src)) continue;

    // Skip images that live inside a nested [role="article"] (comments, shared-post
    // previews).  Those images are extracted separately by commentWalker /
    // extractSharedPost and must not appear in the post's own image list.
    const nearestArticle = img.closest('[role="article"]');
    if (nearestArticle && nearestArticle !== postEl) continue;

    // Get dimensions
    const w = parseInt(img.getAttribute('width') || '0', 10) || (img as HTMLImageElement).naturalWidth || 0;
    const h = parseInt(img.getAttribute('height') || '0', 10) || (img as HTMLImageElement).naturalHeight || 0;
    if ((w > 0 && w < MIN_IMAGE_PX) || (h > 0 && h < MIN_IMAGE_PX)) continue;

    // Best resolution URL
    const fullResolutionUrl = _bestResUrl(img, src);
    const key = fullResolutionUrl || src;
    if (seen.has(key)) continue;
    seen.add(key);

    const altText = img.getAttribute('alt') || undefined;
    results.push({
      remoteUrl: src,
      fullResolutionUrl: fullResolutionUrl !== src ? fullResolutionUrl : undefined,
      altText,
    });
  }

  // Carousel detection: if 2+ images share the same overflow parent, mark them
  _detectCarousel(results, postEl);

  // Also catch photo links with no img (e.g. video thumbnails via a[href*="photo"])
  for (const link of postEl.querySelectorAll('a[href*="/photo/"]')) {
    const href = link.getAttribute('href') || '';
    if (href && !seen.has(href)) {
      // Only add if the link contains an img we already captured, or is a bare photo link
      const linkedImg = link.querySelector('img');
      if (!linkedImg) continue; // Already handled via img loop
    }
  }

  return results;
}

function _isRejected(img: Element, src: string): boolean {
  if (REJECT_IMAGE_PATTERNS.some((p) => p.test(src) || p.test(img.className || ''))) return true;
  // Skip images inside stories, reels, or suggested content sections
  if (img.closest('[data-pagelet*="Stories"],[data-pagelet*="Reels"],[data-pagelet*="Suggested"],[data-pagelet*="Recommend"]')) return true;
  // Skip images whose nearest link points to a story or reel (not a photo permalink)
  const anchor = img.closest('a[href]');
  if (anchor) {
    const href = anchor.getAttribute('href') || '';
    if (/\/stories\/|\/reel\/|\/reels\//.test(href)) return true;
  }
  return false;
}

function _bestResUrl(img: Element, fallback: string): string {
  // 1. Wrapping anchor — only useful if it points directly at the CDN image.
  //    A /photo/?fbid=… anchor is a Facebook *webpage*, not an image, so we
  //    must NOT return it as the image URL or the note will embed HTML.
  const anchor = img.closest('a[href]');
  if (anchor) {
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('http') && (href.includes('scontent') || href.includes('fbcdn.net'))) {
      return href;
    }
  }

  // 2. srcset — pick widest descriptor
  const srcset = img.getAttribute('srcset') || '';
  if (srcset) {
    const best = _parseSrcsetBest(srcset);
    if (best) return best;
  }

  return fallback;
}

function _parseSrcsetBest(srcset: string): string | undefined {
  const entries = srcset.split(',').map((s) => s.trim()).filter(Boolean);
  let bestUrl = '';
  let bestW = 0;
  for (const entry of entries) {
    const parts = entry.split(/\s+/);
    if (parts.length < 2) continue;
    const url = parts[0];
    const desc = parts[1];
    const w = desc.endsWith('w') ? parseInt(desc, 10) : 0;
    if (w > bestW) { bestW = w; bestUrl = url; }
  }
  return bestUrl || undefined;
}

function _detectCarousel(results: ExtractedImageV2[], postEl: Element): void {
  // Simple heuristic: if post has 2+ images, check if they share an overflow container
  if (results.length < 2) return;

  const imgs = [...postEl.querySelectorAll('img')].filter(
    (img) => !_isRejected(img, img.getAttribute('src') || '')
  );

  if (imgs.length < 2) return;

  // Check if multiple imgs share a parent with overflow style
  const parentCounts = new Map<Element, number>();
  for (const img of imgs) {
    const p = img.parentElement;
    if (p) parentCounts.set(p, (parentCounts.get(p) || 0) + 1);
  }

  const hasCarouselParent = [...parentCounts.values()].some((n) => n >= 2);
  if (hasCarouselParent || results.length >= 2) {
    results.forEach((r, i) => {
      r.inCarousel = true;
      r.carouselIndex = i;
    });
  }
}
