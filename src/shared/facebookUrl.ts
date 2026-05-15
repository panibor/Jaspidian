/**
 * src-v2/shared/facebookUrl.ts
 * Facebook URL classification and normalization.
 */

/**
 * Check if a URL is from facebook.com domain.
 */
export function isFacebookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'facebook.com' || u.hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

export interface FacebookUrlClassification {
  kind: 'feed' | 'group' | 'page' | 'profile' | 'permalink' | 'photoViewer' | 'reel' | 'unknown';
  slug?: string;
  postId?: string;
}

/**
 * Classify a Facebook URL.
 */
export function classifyFacebookUrl(url: string): FacebookUrlClassification {
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Photo viewer
    if (path.includes('/photo/') || path.includes('/photo.php')) {
      const fbid = u.searchParams.get('fbid') || path.match(/fbid=(\d+)/)?.[1];
      return { kind: 'photoViewer', postId: fbid };
    }

    // Reel
    if (path.includes('/reel/')) {
      const match = path.match(/\/reel\/(\d+)/);
      return { kind: 'reel', postId: match?.[1] };
    }

    // Permalink / post
    if (path.includes('/posts/') || path.includes('/permalink.php') || path.includes('/story.php')) {
      const match = path.match(/\/posts\/(\d+)/);
      return { kind: 'permalink', postId: match?.[1] };
    }

    // Group
    const groupMatch = path.match(/\/groups\/([^/]+)/);
    if (groupMatch) {
      return { kind: 'group', slug: groupMatch[1] };
    }

    // Page or profile (heuristic: if has tabs or sidebar info)
    const pageMatch = path.match(/^\/([^/]+)\/?$/);
    if (pageMatch && pageMatch[1] !== 'pages') {
      return { kind: 'page', slug: pageMatch[1] };
    }

    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}

const TRACKING_PARAMS = ['__cft__', '__tn__', '__cft__[0]', '__cft__[1]'];

/**
 * Strip Facebook tracking query params (__cft__, __tn__, etc.) from a URL.
 */
export function cleanFacebookUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('__')) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Resolve relative or protocol-less URLs to absolute.
 */
export function absoluteFacebookUrl(href: string, baseUrl: string): string {
  // Already absolute
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  // Protocol-less
  if (href.startsWith('//')) {
    return 'https:' + href;
  }
  // Relative
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}
