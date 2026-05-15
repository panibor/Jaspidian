/**
 * src-v2/obsidian/render/renderBody.ts
 * Renders the post body: H1 title, "Posted by…in…" line, body text, media embeds, link previews.
 */
import type { ExtractedFacebookPostV2 } from '../../shared/types';
import type { RenderOptions } from './renderNote';
import { escapeMdLink } from './mdEscape';
import { getStrings } from './i18n';

/**
 * Render the post body section (excluding frontmatter and comments).
 *
 * @param post Extracted post.
 * @param opts Render options.
 * @returns Rendered body section.
 */
export function renderBody(post: ExtractedFacebookPostV2, opts: RenderOptions): string {
  const t = getStrings(opts.language);
  const parts: string[] = [];

  // H1 title
  parts.push(`# ${post.title || t.untitledPost}`);
  parts.push('');

  // Attribution line
  parts.push(_renderAttribution(post, t));
  parts.push('');

  // ## Post
  parts.push(`## ${t.sectionPost}`);
  parts.push('');

  if (post.body) {
    parts.push(post.body);
    parts.push('');
  }

  // Shared post
  if (post.sharedPost) {
    parts.push(`### ${t.sectionSharedPost}`);
    parts.push('');
    if (post.sharedPost.authorName) {
      const authorMd = post.sharedPost.authorUrl
        ? `[${escapeMdLink(post.sharedPost.authorName)}](${post.sharedPost.authorUrl})`
        : post.sharedPost.authorName;
      parts.push(`*${t.sharedFrom} ${authorMd}*`);
      parts.push('');
    }
    if (post.sharedPost.body) {
      parts.push(post.sharedPost.body);
      parts.push('');
    }
    // Images from the shared post
    if (post.sharedPost.images?.length) {
      for (let i = 0; i < post.sharedPost.images.length; i++) {
        const img = post.sharedPost.images[i];
        if (img.localPath) {
          parts.push(`![[${img.localPath}]]`);
        } else {
          const url = img.fullResolutionUrl || img.remoteUrl;
          const label = img.altText || `${t.imageLabel} ${i + 1}`;
          parts.push(`![${label}](${url})`);
        }
      }
      parts.push('');
    }
  }

  // ## Media
  if (post.images.length > 0 || post.videos.length > 0) {
    parts.push(`## ${t.sectionMedia}`);
    parts.push('');
    post.images.forEach((img, i) => {
      const label = `${t.imageLabel} ${i + 1}`;
      if (img.localPath) {
        parts.push(`![[${img.localPath}]]`);
      } else {
        const url = img.fullResolutionUrl || img.remoteUrl;
        parts.push(`![${label}](${url})`);
      }
    });
    post.videos.forEach((vid) => {
      if (vid.posterUrl) {
        parts.push(`![${t.videoPosterAlt}](${vid.posterUrl})`);
      } else if (vid.permalink) {
        parts.push(`*(${t.videoLabel}: ${vid.permalink})*`);
      } else {
        parts.push(`*${t.videoLabel}*`);
      }
    });
    parts.push('');
  }

  // ## Link Previews
  if (post.linkPreviews.length > 0) {
    parts.push(`## ${t.sectionLinkPreviews}`);
    parts.push('');
    for (const link of post.linkPreviews) {
      const displayTitle = link.title || link.url;
      parts.push(`[${escapeMdLink(displayTitle)}](${link.url})`);
      if (link.description) parts.push(`> ${link.description}`);
      parts.push('');
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function _renderAttribution(post: ExtractedFacebookPostV2, t: ReturnType<typeof getStrings>): string {
  const authorName = post.authorName || 'Unknown';
  const authorMd = post.authorUrl
    ? `[${escapeMdLink(authorName)}](${post.authorUrl})`
    : authorName;

  const ctx = post.context;
  let contextMd = '';

  if (ctx.kind === 'group' && ctx.groupName) {
    contextMd = ctx.groupUrl
      ? ` ${t.contextIn} [${escapeMdLink(ctx.groupName)}](${ctx.groupUrl})`
      : ` ${t.contextIn} ${ctx.groupName}`;
  } else if (ctx.kind === 'page' && ctx.pageName) {
    contextMd = ctx.pageUrl
      ? ` ${t.contextOn} [${escapeMdLink(ctx.pageName)}](${ctx.pageUrl})`
      : ` ${t.contextOn} ${ctx.pageName}`;
  } else if (ctx.kind === 'profile' && ctx.profileName) {
    contextMd = ctx.profileUrl
      ? ` (${t.contextProfile} [${escapeMdLink(ctx.profileName)}](${ctx.profileUrl}))`
      : ` (${t.contextProfile} ${ctx.profileName})`;
  }

  const timestampMd = post.postedAtText ? ` · *${post.postedAtText}*` : '';
  const permalinkMd = post.permalink ? ` · [${t.linkLabel}](${post.permalink})` : '';

  return `*${t.postedBy} ${authorMd}${contextMd}${timestampMd}${permalinkMd}*`;
}
