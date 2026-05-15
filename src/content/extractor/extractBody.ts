/**
 * src-v2/content/extractor/extractBody.ts
 * Extract post body text, preserving paragraph breaks.
 */
import { normalizeWhitespace } from '../../shared/text';

export interface BodyInfo {
  text: string;
  warnings: string[];
}

/**
 * Extract body text from a post element.
 */
export function extractBody(postEl: Element): BodyInfo {
  const warnings: string[] = [];

  // Facebook timestamp/metadata lines: optional Unicode directional marks + digits + time unit.
  // E.g. "‏21 שעות · ציבורי".
  // \b word-boundary does NOT work with Hebrew (עברית chars are non-ASCII => \W in JS regex).
  const TIMESTAMP_RE =
    /^[\u200e\u200f\s]*\d+\s*(שעות?|דקות?|ימים|יום|שבועות?|חודשים?|hours?|hr?s?|mins?|minutes?|days?|wks?|weeks?|months?)/i;

  // Find message root — try modern data-ad-rendering-role first (confirmed 2026-05-09),
  // then legacy data-ad-comet-preview, then data-ad-preview.
  let messageRoot: Element | null =
    postEl.querySelector('[data-ad-rendering-role="story_message"]') ||
    postEl.querySelector("[data-ad-comet-preview='message']") ||
    postEl.querySelector("[data-ad-preview='message']");

  if (!messageRoot) {
    // Fallback A: first [dir='auto'] sibling after the header element.
    // Validate it's not a timestamp — if it is, fall through to Fallback B.
    const header = postEl.querySelector('header, h2, h3, h4, h5');
    if (header) {
      const afterHeader = header.nextElementSibling;
      if (afterHeader) {
        const candidate = afterHeader.querySelector("[dir='auto']") || afterHeader;
        const ctext = (candidate.textContent || '').trim();
        if (ctext.length >= 20 && !TIMESTAMP_RE.test(ctext)) {
          messageRoot = candidate;
        }
      }
    }
  }

  if (!messageRoot) {
    // Fallback B: photo-viewer / permalink layout — no data-ad-* attrs or Fallback A got a
    // timestamp element. Walk every [dir="auto"] in the post and pick the first one that is:
    //   • not inside a hyperlink (author name links are always wrapped in <a>)
    //   • not inside a nested [role="article"] (those are comments, not the post body)
    //   • text length ≥ 20 (skips engagement counts like "1.4K", "37")
    //   • doesn't start like a timestamp ("20 שעות · ציבורי", "2 hours ago", etc.)
    //   • comes after the H2/header in document order
    const anchorH2 = postEl.querySelector('h2, h3, header');
    for (const candidate of postEl.querySelectorAll('[dir="auto"]')) {
      if (candidate.closest('a[href]')) continue;
      const closestArticle = candidate.closest('[role="article"]');
      if (closestArticle && closestArticle !== postEl) continue;
      const text = (candidate.textContent || '').trim();
      if (text.length < 20) continue;
      if (TIMESTAMP_RE.test(text)) continue;
      if (anchorH2) {
        const rel = anchorH2.compareDocumentPosition(candidate);
        if (!(rel & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      }
      messageRoot = candidate;
      break;
    }
  }

  if (!messageRoot) {
    return { text: '', warnings: ['No message root found'] };
  }

  // Walk text nodes, filtering out any interactive controls (buttons, expansion links)
  // so their labels can't bleed into the post body.
  let text = '';
  const walker = document.createTreeWalker(messageRoot, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        // Skip expansion controls ("See more" / "See less" / "Show more" etc.).
        // Facebook sets aria-expanded on truncation buttons in every language.
        if (el.hasAttribute('aria-expanded')) return NodeFilter.FILTER_REJECT;
        // Also skip any generic button/role="button" — their labels should never
        // appear in the post body (catches cases where aria-expanded is absent).
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
          return NodeFilter.FILTER_REJECT;
        }
      }
      // Skip emoji images
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === 'IMG') {
          const w = el.getAttribute('width');
          const width = w ? parseInt(w) : (el as any).width || 0;
          const src = el.getAttribute('src') || '';
          if (width <= 48 && (src.includes('emoji') || el.className.includes('emoji'))) {
            return NodeFilter.FILTER_REJECT;
          }
        }
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      text += currentNode.textContent || '';
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const el = currentNode as Element;
      if (['BR', 'P', 'DIV', 'LI'].includes(el.tagName)) {
        text += '\n';
      }
    }
  }

  // Strip Facebook UI button text that leaks into body content.
  // Covers both pre-expansion ("See more") and post-expansion ("See less") states,
  // across English and Hebrew, and Facebook's two label styles ("See" vs "Show").
  const UI_FRAGMENTS =
    /\b(See\s+more|See\s+less|Show\s+more|Show\s+less|Read\s+more|Read\s+less|Load\s+more|View\s+more|View\s+less|ראה\s+עוד|ראה\s+פחות|הצג\s+עוד|הצג\s+פחות)\b/gi;
  text = text.replace(UI_FRAGMENTS, '').trim();

  // Normalize
  text = normalizeWhitespace(text);

  if (text.length < 10) {
    warnings.push('Extracted text is very short (< 10 chars)');
  }

  return { text, warnings };
}
