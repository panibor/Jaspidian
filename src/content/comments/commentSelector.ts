/**
 * src-v2/content/comments/commentSelector.ts
 * Select comments based on render mode (all / opOnly / opAnsweredOnly).
 */
import type { ExtractedFacebookCommentV2, CommentMode } from '../../shared/types';

/**
 * Select comments based on render mode.
 */
export function selectComments(
  comments: ExtractedFacebookCommentV2[],
  mode: CommentMode
): ExtractedFacebookCommentV2[] {
  if (mode === 'all') {
    return comments;
  }

  if (mode === 'opOnly') {
    return comments.filter((c) => c.isOP === true);
  }

  if (mode === 'opAnsweredOnly') {
    const kept = new Set<ExtractedFacebookCommentV2>();

    // Mark comments where OP replied
    for (const comment of comments) {
      if (comment.parentAnsweredByOP === true) {
        kept.add(comment);
      }
    }

    // Also include OP comments if their parent is kept
    for (const comment of comments) {
      if (comment.isOP === true) {
        // Include if parent is kept or if it's a top-level OP comment
        const parentComment = comments.find(
          (c) => c.replies && c.replies.some((r) => r === comment)
        );
        if (!parentComment || kept.has(parentComment)) {
          kept.add(comment);
        }
      }
    }

    return Array.from(kept);
  }

  return comments;
}
