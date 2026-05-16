/**
 * src-v2/obsidian/render/renderComments.ts
 * Renders comments as collapsible Obsidian callout threads.
 *
 * Layout:
 *   > [!note]+  top-level comment from others  (blue, expanded)
 *   > [!tip]+   top-level comment from OP      (green, expanded - stands out)
 *   > > [!quote]+  reply from others           (gray, inside parent)
 *   > > [!tip]+    reply from OP               (green, inside parent)
 *
 * Each thread (top-level comment + its replies) collapses as a unit.
 * OP comments render in a different callout colour automatically.
 */
import type { ExtractedFacebookCommentV2, CommentMode } from '../../shared/types';
import { escapeMdLink } from './mdEscape';
import { getStrings } from './i18n';

export function renderComments(
  comments: ExtractedFacebookCommentV2[],
  mode: CommentMode,
  totalCount?: number,
  lang?: string,
): string {
  const t = getStrings(lang);

  if (comments.length === 0) {
    return `## ${t.sectionComments}\n\n${t.noComments}`;
  }

  const filtered = _filterComments(comments, mode);
  const total = totalCount ?? _countAll(comments);
  const shown = _countAll(filtered);
  const modeLabel = { all: t.commentModeAll, opOnly: t.commentModeOpOnly, opAnsweredOnly: t.commentModeOpAnswered }[mode];
  const header = `## ${t.sectionComments}  *(${modeLabel}, ${t.shownOf(shown, total)})*`;

  if (filtered.length === 0) {
    return `${header}\n\n*${t.noCommentsMatched}*`;
  }

  const lines: string[] = [header, ''];
  for (const c of filtered) {
    lines.push(..._renderCallout(c, 0, mode, t));
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

// ---------------------------------------------------------------------------
// Callout renderer
// ---------------------------------------------------------------------------

/**
 * Render one comment (and its filtered replies) as a collapsible callout.
 * depth 0 = top-level, 1 = reply, 2 = reply-to-reply, etc.
 */
function _renderCallout(
  comment: ExtractedFacebookCommentV2,
  depth: number,
  mode: CommentMode,
  t: ReturnType<typeof getStrings>,
): string[] {
  const q = '> '.repeat(depth + 1);
  const type = comment.isOP ? 'tip' : depth === 0 ? 'note' : 'quote';
  const icon = depth === 0 ? '💬' : '↩';

  const authorMd = comment.authorUrl
    ? `[${escapeMdLink(comment.authorName)}](${comment.authorUrl})`
    : escapeMdLink(comment.authorName);
  const opBadge = comment.isOP ? ` **${t.opBadge}**` : '';
  const timeStr = comment.timestampText ? ` · *${comment.timestampText}*` : '';

  const lines: string[] = [];
  lines.push(`${q}[!${type}]+ ${icon} ${authorMd}${opBadge}${timeStr}`);

  const bodyLines = (comment.body || '').split('\n').filter(Boolean);
  for (const line of bodyLines) {
    lines.push(`${q}${line}`);
  }

  if (comment.imageUrl) {
    lines.push(`${q}![${t.commentImageAlt}](${comment.imageUrl})`);
  }

  const replies = _filterReplies(comment.replies, mode);
  if (replies.length > 0) {
    lines.push(q.trimEnd());
    for (const reply of replies) {
      lines.push(..._renderCallout(reply, depth + 1, mode, t));
    }
  }

  if (depth === 0) lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------

function _filterComments(
  comments: ExtractedFacebookCommentV2[],
  mode: CommentMode
): ExtractedFacebookCommentV2[] {
  if (mode === 'all') return comments;
  if (mode === 'opOnly') return comments.filter((c) => c.isOP);
  return comments.filter((c) => c.parentAnsweredByOP || c.isOP);
}

function _filterReplies(
  replies: ExtractedFacebookCommentV2[],
  mode: CommentMode
): ExtractedFacebookCommentV2[] {
  if (mode === 'all') return replies;
  if (mode === 'opOnly') return replies.filter((r) => r.isOP);
  return replies.filter((r) => r.isOP || r.parentAnsweredByOP);
}

function _countAll(comments: ExtractedFacebookCommentV2[]): number {
  return comments.reduce((n, c) => n + 1 + _countAll(c.replies), 0);
}
