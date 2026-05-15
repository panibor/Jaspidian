/**
 * src-v2/content/scanner/contextResolver.ts
 * Resolves the group / page / profile context for a post.
 */
import type { PostContextV2, Scenario } from '../../shared/types';
import { absoluteFacebookUrl } from '../../shared/facebookUrl';

/**
 * Resolve the group, page, or profile context for a post element.
 *
 * Strategy order (first successful -> return):
 * 1. URL pattern /groups/<slug>/ -> group
 * 2. a[role="link"] with /groups/ path in profile_name container -> group
 * 3. Page-info pagelet in document -> page
 * 4. Profile-like URL -> profile
 * 5. Fallback: scenario-derived kind
 *
 * @param doc Document.
 * @param postEl Post element being classified.
 * @param scenario Detected page scenario.
 * @param url Current page URL.
 * @returns PostContextV2.
 */
export function resolveContext(
  doc: Document,
  postEl: Element,
  scenario: Scenario,
  url: string
): PostContextV2 {
  // Strategy 1: URL contains /groups/<slug>
  const groupFromUrl = _groupFromUrl(url);
  if (groupFromUrl) {
    // Try to get the group name from the post header
    const name = _groupNameFromPost(postEl, url) || groupFromUrl.slug;
    return {
      kind: 'group',
      groupSlug: groupFromUrl.slug,
      groupUrl: groupFromUrl.url,
      groupName: name,
    };
  }

  // Strategy 2: profile_name container has a group link
  const groupFromPost = _groupFromPost(postEl, url);
  if (groupFromPost) {
    return groupFromPost;
  }

  // Strategy 3: Page detection via pagelet
  if (
    scenario === 'pagePage' ||
    doc.querySelector('[data-pagelet*="PageInfo"], [data-pagelet*="PageTimeline"]')
  ) {
    return _resolvePageContext(doc, url);
  }

  // Strategy 4: Profile
  if (
    scenario === 'profilePage' ||
    doc.querySelector('[data-pagelet*="ProfileTimeline"]')
  ) {
    return _resolveProfileContext(doc, url);
  }

  // Strategy 5: Scenario-derived fallback
  if (scenario === 'groupPage') {
    const slug = _slugFromGroupUrl(url);
    return { kind: 'group', groupSlug: slug, groupUrl: url };
  }
  if (scenario === 'pagePage') return _resolvePageContext(doc, url);
  if (scenario === 'profilePage') return _resolveProfileContext(doc, url);

  return { kind: 'unknown' };
}

function _groupFromUrl(url: string): { slug: string; url: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/groups\/([^/]+)/);
    if (match) {
      const slug = match[1];
      return { slug, url: `https://www.facebook.com/groups/${slug}/` };
    }
  } catch {
    // ignore
  }
  return null;
}

function _groupFromPost(postEl: Element, baseUrl: string): PostContextV2 | null {
  const profileNameEl = postEl.querySelector('[data-ad-rendering-role="profile_name"]');
  if (!profileNameEl) return null;

  const links = [...profileNameEl.querySelectorAll('a[role="link"]')].filter(
    (a) => (a.textContent || '').trim().length > 0
  );

  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim();
    // Group link: /groups/{id}/ without /user/
    if (/\/groups\/[^/]+\/?$/.test(href) || /\/groups\/[^/]+\/?(\?|$)/.test(href)) {
      const match = href.match(/\/groups\/([^/?#]+)/);
      const slug = match?.[1] || '';
      return {
        kind: 'group',
        groupName: text,
        groupSlug: slug,
        groupUrl: absoluteFacebookUrl(href, baseUrl),
      };
    }
  }
  return null;
}

function _groupNameFromPost(postEl: Element, baseUrl: string): string | undefined {
  const profileNameEl = postEl.querySelector('[data-ad-rendering-role="profile_name"]');
  if (!profileNameEl) return undefined;
  const links = [...profileNameEl.querySelectorAll('a[role="link"]')].filter(
    (a) => (a.textContent || '').trim().length > 0
  );
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (/\/groups\//.test(href) && !/\/user\//.test(href)) {
      return (link.textContent || '').trim() || undefined;
    }
  }
  return undefined;
}

function _slugFromGroupUrl(url: string): string {
  try {
    const match = new URL(url).pathname.match(/\/groups\/([^/]+)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

function _resolvePageContext(doc: Document, url: string): PostContextV2 {
  const h1 = doc.querySelector('h1');
  const pageName = h1?.textContent?.trim() || '';
  let slug = '';
  try {
    slug = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
  } catch {
    // ignore
  }
  return {
    kind: 'page',
    pageName: pageName || slug,
    pageSlug: slug,
    pageUrl: url,
  };
}

function _resolveProfileContext(doc: Document, url: string): PostContextV2 {
  const h1 = doc.querySelector('h1');
  const profileName = h1?.textContent?.trim() || '';
  let slug = '';
  try {
    slug = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
  } catch {
    // ignore
  }
  return {
    kind: 'profile',
    profileName: profileName || slug,
    profileSlug: slug,
    profileUrl: url,
  };
}
