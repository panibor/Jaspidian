/**
 * src-v2/content/comments/commentClassifier.ts
 * Classifies comments: marks OP comments and parent-answered-by-OP relationships.
 */
import type { ExtractedFacebookCommentV2 } from '../../shared/types';
import { normalizeName } from '../../shared/text';
import { absoluteFacebookUrl } from '../../shared/facebookUrl';

/**
 * Mark OP comments and parent-answered-by-OP relationships.
 *
 * @param comments Flat list of extracted comments (with nested replies).
 * @param opAuthorName OP author name.
 * @param opAuthorUrl OP author URL.
 * @returns Warnings array.
 */
export function markOPAnswers(
  comments: ExtractedFacebookCommentV2[],
  opAuthorName: string | undefined,
  opAuthorUrl: string | undefined
): string[] {
  if (!opAuthorName && !opAuthorUrl) return [];

  const normalizedName = opAuthorName ? normalizeName(opAuthorName) : '';
  const normalizedUrl = opAuthorUrl ? _normalizeUrl(opAuthorUrl) : '';

  _markRecursive(comments, normalizedName, normalizedUrl);

  // Warning if many comments but no OP found
  const total = _countAll(comments);
  const opCount = _countOP(comments);
  const warnings: string[] = [];
  if (total >= 5 && opCount === 0) {
    warnings.push(
      `walkComments: ${total} comments but 0 identified as OP — possible author mismatch`
    );
  }

  return warnings;
}

function _markRecursive(
  comments: ExtractedFacebookCommentV2[],
  normalizedName: string,
  normalizedUrl: string
): void {
  for (const comment of comments) {
    // Mark isOP
    const matchName = normalizedName && normalizeName(comment.authorName) === normalizedName;
    const matchUrl = normalizedUrl && comment.authorUrl && _normalizeUrl(comment.authorUrl) === normalizedUrl;
    comment.isOP = matchName || matchUrl || false;

    // Recurse into replies
    if (comment.replies.length > 0) {
      _markRecursive(comment.replies, normalizedName, normalizedUrl);
      // If any reply is OP, mark this comment as parentAnsweredByOP
      if (comment.replies.some((r) => r.isOP)) {
        comment.parentAnsweredByOP = true;
      }
    }
  }
}

function _countAll(comments: ExtractedFacebookCommentV2[]): number {
  return comments.reduce((n, c) => n + 1 + _countAll(c.replies), 0);
}

function _countOP(comments: ExtractedFacebookCommentV2[]): number {
  return comments.reduce((n, c) => n + (c.isOP ? 1 : 0) + _countOP(c.replies), 0);
}

function _normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/+$/, '');
  } catch {
    return url;
  }
}
