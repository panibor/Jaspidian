/**
 * src-v2/obsidian/render/renderFrontmatter.ts
 * Renders clean YAML frontmatter — only fields with meaningful values.
 */
import type { ExtractedFacebookPostV2 } from '../../shared/types';
import type { RenderOptions } from './renderNote';
import { escapeYamlString } from './mdEscape';
import { cleanFacebookUrl } from '../../shared/facebookUrl';

export function renderFrontmatter(post: ExtractedFacebookPostV2, _opts: RenderOptions): string {
  const lines: string[] = ['---'];

  const field = (key: string, value: string | undefined | null) => {
    if (value) lines.push(`${key}: ${escapeYamlString(value)}`);
  };

  field('title', post.title || 'Untitled Post');

  // Author — embed the link directly so Obsidian's properties panel shows
  // it as a clickable name. No separate author_url row.
  field('author', _renderAuthorish(post.authorName, post.authorUrl));

  field('permalink', post.permalink ? cleanFacebookUrl(post.permalink) : undefined);

  // Context — only emit the kind that applies. Same link-embedded shape.
  const ctx = post.context;
  if (ctx.kind === 'group') {
    field('group', _renderAuthorish(ctx.groupName, ctx.groupUrl));
  } else if (ctx.kind === 'page') {
    field('page', _renderAuthorish(ctx.pageName, ctx.pageUrl));
  } else if (ctx.kind === 'profile') {
    field('profile', _renderAuthorish(ctx.profileName, ctx.profileUrl));
  }

  // Date — only emit when it came from the post's own timestamp. We
  // deliberately do NOT fall back to the capture time, so the user can tell
  // the difference between "we know when this was posted" and "we don't."
  if (post.postedAt && post.postedAtIsActual) {
    const date = post.postedAt.slice(0, 10);
    field('date', date);
  }

  // Tags — only if non-empty
  const tags = post.hashtags || [];
  if (tags.length > 0) {
    lines.push('tags:');
    for (const tag of tags) lines.push(`  - ${escapeYamlString(tag)}`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Render a "name + URL" pair into the form Obsidian's properties panel renders
 * as a clickable link: `[Name](https://...)`. When only the name is known,
 * return the bare name; when only the URL is known, return the bare URL.
 */
function _renderAuthorish(name: string | undefined, url: string | undefined): string | undefined {
  const cleanedUrl = url ? cleanFacebookUrl(url) : '';
  if (name && cleanedUrl) return `[${name}](${cleanedUrl})`;
  if (name) return name;
  if (cleanedUrl) return cleanedUrl;
  return undefined;
}
