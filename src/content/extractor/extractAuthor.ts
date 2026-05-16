/**
 * src-v2/content/extractor/extractAuthor.ts
 * Extract author name and URL from a post element.
 *
 * DOM findings (live inspection 2026-05-09):
 * - [data-ad-rendering-role="profile_name"] contains group + author links
 * - Author link: a[role="link"] with /groups/{id}/user/{id}/ in href (relative)
 * - Group posts have two a[role="link"]: group first, then author
 * - Non-group posts: last non-empty a[role="link"] in profile_name area is the author
 */
import { absoluteFacebookUrl, cleanFacebookUrl } from '../../shared/facebookUrl';

export interface AuthorInfo {
  name?: string;
  url?: string;
  avatarUrl?: string;
}

/**
 * Extract author from a post element.
 *
 * @param postEl Post root element.
 * @param _messageRoot Unused (kept for signature stability).
 * @param baseUrl Current page URL (for resolving relative hrefs).
 * @returns AuthorInfo with name, url, optional avatarUrl.
 */
export function extractAuthor(
  postEl: Element,
  _messageRoot: Element | null,
  baseUrl: string
): AuthorInfo {
  // Strategy 1: profile_name container
  const profileNameEl = postEl.querySelector('[data-ad-rendering-role="profile_name"]');
  if (profileNameEl) {
    // Anonymous group posts - never fall through to Strategy 2 (which would grab a commenter)
    const pnText = (profileNameEl.textContent || '').toLowerCase();
    if (pnText.includes('anonymous') || pnText.includes('אנונימי')) {
      return {};
    }

    const links = [...profileNameEl.querySelectorAll('a[role="link"]')].filter(
      (a) => (a.textContent || '').trim().length > 0
    );

    // Group posts: author link contains /user/ in the path
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (/\/user\/|\/groups\/[^/]+\/user\//.test(href)) {
        return {
          name: (link.textContent || '').trim(),
          url: cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)),
          avatarUrl: _findAvatarUrl(postEl),
        };
      }
    }

    // Non-group / named-profile posts: pick the link that is NOT a group or timestamp link
    if (links.length > 0) {
      const nonGroup = links.filter((a) => {
        const href = a.getAttribute('href') || '';
        return !href.includes('/groups/') && !href.includes('multi_permalink') && !href.includes('permalink');
      });
      const target = nonGroup.length > 0 ? nonGroup[nonGroup.length - 1] : null;
      if (target) {
        const href = target.getAttribute('href') || '';
        return {
          name: (target.textContent || '').trim(),
          url: cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)),
          avatarUrl: _findAvatarUrl(postEl),
        };
      }

      // profile_name exists but only has group/context links (group permalink wrapper pattern).
      // The actual author link lives just outside profile_name - look for the first
      // /groups/.../user/... link in the post subtree that isn't inside profile_name.
      for (const link of postEl.querySelectorAll<HTMLElement>('a[role="link"]')) {
        if (profileNameEl.contains(link)) continue;
        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').trim();
        if (text.length < 2) continue;
        if (/\/groups\/[^/]+\/user\//.test(href)) {
          return {
            name: text,
            url: cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)),
            avatarUrl: _findAvatarUrl(postEl),
          };
        }
      }
    }

    // profile_name exists but no identifiable author link - truly anonymous / page admin
    return {};
  }

  // Strategy 2: no profile_name at all - scan the post HEADER only (first child) to avoid
  // picking up commenter names from the comment section.
  const headerEl = postEl.firstElementChild || postEl;
  const headerLinks = [...headerEl.querySelectorAll('a[role="link"]')].slice(0, 12);

  // Pass 1: prefer explicit /user/ path (group-scoped profile links)
  for (const link of headerLinks) {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim();
    if (text && /\/user\/|\/groups\/[^/]+\/user\//.test(href)) {
      return {
        name: text,
        url: cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)),
        avatarUrl: _findAvatarUrl(postEl),
      };
    }
  }

  // Pass 2: profile slugs and profile.php links - any link that isn't a group/page/action URL
  const SKIP_PATTERNS = ['/groups/', '/pages/', '/events/', '/photo/', '/posts/',
    '/permalink', '/story.php', '/reel/', 'multi_permalink', '?__cft__', '?comment_id='];
  for (const link of headerLinks) {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim();
    if (!text || text.length < 2) continue;
    if (SKIP_PATTERNS.some((p) => href.includes(p))) continue;
    if (href.startsWith('/') || href.includes('facebook.com/')) {
      return {
        name: text,
        url: cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)),
        avatarUrl: _findAvatarUrl(postEl),
      };
    }
  }

  return {};
}

function _findAvatarUrl(postEl: Element): string | undefined {
  const img = postEl.querySelector('img[src*="scontent"]') as HTMLImageElement | null;
  if (!img) return undefined;
  const w = img.getAttribute('width');
  const width = w ? parseInt(w, 10) : (img as HTMLImageElement).naturalWidth || 0;
  if (width > 0 && width <= 80) return img.getAttribute('src') || undefined;
  return undefined;
}
