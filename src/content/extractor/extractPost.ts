/**
 * src-v2/content/extractor/extractPost.ts
 * Composition: extracts all post fields and assembles ExtractedFacebookPostV2.
 */
import type { Env, ExtractedFacebookPostV2, PostContextV2, ExpansionStatsV2 } from '../../shared/types';
import { extractAuthor } from './extractAuthor';
import { extractTimestamp } from './extractTimestamp';
import { extractBody } from './extractBody';
import { extractEngagement } from './extractEngagement';
import { extractImages } from './extractImages';
import { extractSharedPost } from './extractSharedPost';
import { extractLinkPreview } from './extractLinkPreview';
import { walkComments } from '../comments/commentWalker';
import { detectDirection, detectLanguage } from '../../shared/text';

let _idCounter = 0;

/**
 * Extract a post element into ExtractedFacebookPostV2.
 *
 * @param postEl Post root element.
 * @param context Resolved group/page/profile context.
 * @param expansionStats Stats from expansion.
 * @param env Injected environment.
 * @returns ExtractedFacebookPostV2.
 */
export function extractPost(
  postEl: Element,
  context: PostContextV2,
  expansionStats: ExpansionStatsV2,
  env: Env
): ExtractedFacebookPostV2 {
  const baseUrl = env.url;
  const warnings = [...expansionStats.warnings];

  // Author
  const bodyEl = postEl.querySelector('[data-ad-rendering-role="story_message"]') ||
    postEl.querySelector('[data-ad-comet-preview="message"]') ||
    null;
  const authorInfo = extractAuthor(postEl, bodyEl, baseUrl);
  if (!authorInfo.name) warnings.push('extractPost: author not found');

  // Timestamp — pass env.now() so relative dates ("2 hours ago") resolve to a
  // real ISO timestamp rather than the capture time.
  const tsInfo = extractTimestamp(postEl, baseUrl, env.now());
  if (!tsInfo.text && !tsInfo.permalink) warnings.push('extractPost: timestamp not found');

  // Body text
  const bodyInfo = extractBody(postEl);
  warnings.push(...bodyInfo.warnings);

  // Engagement
  const engagement = extractEngagement(postEl);

  // Narrow to the inner [role="article"] that contains the post body.
  // This excludes stories/reels carousels that may share the same [aria-posinset] container
  // but sit as DOM siblings to the actual post article.
  const articleEl = _findPostArticle(postEl);

  // Images
  const images = extractImages(articleEl);

  // Videos (basic: find video elements and their poster)
  const videos = _extractVideos(articleEl);

  // Link previews
  const linkPreviews = extractLinkPreview(articleEl, baseUrl);

  // Shared post
  const sharedPost = extractSharedPost(articleEl);

  // Comments — start with postEl scope, then widen if nothing found.
  // In photo viewer the selected candidate is the inner [role="article"] but comments
  // sit as siblings within the enclosing [role="complementary"] panel, not inside the
  // article. Climbing to complementary (or dialog for modal photo viewer) fixes that
  // without risk of bleeding into adjacent feed posts (which have no such ancestor).
  let comments = walkComments(postEl, authorInfo.name, authorInfo.url);
  if (comments.length === 0) {
    const widerRoot =
      postEl.closest('[role="complementary"]') ||
      postEl.closest('[role="dialog"]');
    if (widerRoot && widerRoot !== postEl) {
      comments = walkComments(widerRoot, authorInfo.name, authorInfo.url);
    }
  }

  // Language / direction
  const bodyText = bodyInfo.text;
  const direction = detectDirection(bodyText);
  // Note labels follow the post body script only — never the Facebook UI language.
  // Latin-script posts (Czech, English, French, etc.) always get English labels.
  // Non-Latin scripts (Hebrew, Arabic, Cyrillic, etc.) get their own labels.
  const language = detectLanguage(bodyText);

  // Hashtags
  const hashtags = _extractHashtags(bodyText);

  // Title (first line of body, author fallback, image-count fallback)
  const title = _deriveTitle(bodyText, authorInfo.name, images.length, postEl);

  // Post ID from the in-post timestamp permalink.
  const postId = _extractPostId(tsInfo.permalink || '');

  // Stable ID — if we can't derive one, use a session-scoped counter + timestamp.
  const id = postId || `post-${++_idCounter}-${Date.now()}`;

  return {
    id,
    postId,
    title,
    body: bodyText,
    authorName: authorInfo.name || '',
    authorUrl: authorInfo.url || '',
    authorAvatarUrl: authorInfo.avatarUrl,
    context,
    postedAt: tsInfo.iso || env.now(),
    postedAtText: tsInfo.text || '',
    permalink: tsInfo.permalink || '',
    engagementReactionCount: _parseCount(engagement.reactionsText),
    engagementCommentCount: _parseCount(engagement.commentsText),
    engagementShareCount: _parseCount(engagement.sharesText),
    engagementCommentText: engagement.commentsText,
    images,
    videos,
    linkPreviews,
    sharedPost,
    comments,
    commentsWereExpanded: expansionStats.commentClicks > 0,
    repliesWereExpanded: expansionStats.replyClicks > 0,
    expansionStats: { ...expansionStats, warnings },
    language,
    direction,
    hashtags,
    postedAtIsActual: Boolean(tsInfo.iso),
  };
}

function _deriveTitle(body: string, authorName?: string, imageCount = 0, postEl?: Element): string {
  if (body) {
    const firstLine = body.split('\n')[0].trim();
    if (firstLine.length > 0) {
      return firstLine.length <= 80 ? firstLine : firstLine.slice(0, 77) + '...';
    }
  }
  if (authorName && imageCount > 0) return `Photos by ${authorName}`;
  if (authorName) return `Post by ${authorName}`;
  // Try aria-label on the article element itself (sometimes contains author info)
  if (postEl) {
    const label = postEl.getAttribute('aria-label') || postEl.closest('[role="article"]')?.getAttribute('aria-label');
    if (label && label.trim().length > 3) return label.trim().slice(0, 80);
  }
  if (imageCount > 0) return `Photo post (${imageCount} image${imageCount === 1 ? '' : 's'})`;
  return 'Untitled Post';
}

function _extractPostId(permalink: string): string {
  if (!permalink) return '';
  // multi_permalinks=123456
  const mpl = permalink.match(/multi_permalinks=(\d+)/);
  if (mpl) return mpl[1];
  // /posts/<id>  — numeric (legacy) or pfbid (modern encoded) format
  const posts = permalink.match(/\/posts\/([\w-]+)/);
  if (posts) return posts[1];
  // story_fbid=123456
  const story = permalink.match(/story_fbid=(\d+)/);
  if (story) return story[1];
  // pfbid anywhere in URL (photo permalinks, share links, etc.)
  const pfbid = permalink.match(/(pfbid[\w]+)/);
  if (pfbid) return pfbid[1];
  return '';
}

function _parseCount(text?: string): number | undefined {
  if (!text) return undefined;
  const m = text.match(/[\d,]+/);
  if (!m) return undefined;
  return parseInt(m[0].replace(/,/g, ''), 10);
}

function _extractHashtags(body: string): string[] {
  const matches = body.match(/#[\wא-ת؀-ۿ]+/g);
  return matches ? [...new Set(matches.map((t) => t.slice(1)))] : [];
}

function _extractVideos(postEl: Element) {
  const videos = [];
  for (const video of postEl.querySelectorAll('video')) {
    const poster = video.getAttribute('poster') || undefined;
    const src = video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || undefined;
    videos.push({ posterUrl: poster, remoteUrl: src });
  }
  return videos;
}

/**
 * Find the inner [role="article"] that contains the actual post body.
 * On Facebook, the outer [aria-posinset] feed unit may include a stories/reels
 * carousel as a sibling to the real post article. By scoping extraction to the
 * article element that owns the message body, we exclude that surrounding chrome.
 */
function _findPostArticle(postEl: Element): Element {
  const bodySelectors = [
    '[data-ad-rendering-role="story_message"]',
    '[data-ad-comet-preview="message"]',
    '[data-ad-preview="message"]',
  ];
  for (const article of postEl.querySelectorAll('[role="article"]')) {
    if (bodySelectors.some((sel) => article.querySelector(sel))) {
      return article;
    }
  }
  return postEl;
}

