/**
 * src-v2/content/extractor/extractEngagement.ts
 * Extract reaction, comment, and share counts from post.
 */

export interface EngagementInfo {
  reactionsText?: string;
  commentsText?: string;
  sharesText?: string;
}

/**
 * Extract engagement counts from post element.
 */
export function extractEngagement(postEl: Element): EngagementInfo {
  const content = postEl.textContent || '';

  // Regex patterns for counts (English + Hebrew)
  const reactions = content.match(/(\d+(?:[.,]\d+)?[KkMm]?)\s+(reactions?|likes?)/i);
  const comments = content.match(/(\d+(?:[.,]\d+)?[KkMm]?)\s+(comments?|תגובות)/i);
  const shares = content.match(/(\d+(?:[.,]\d+)?[KkMm]?)\s+(shares?|שיתופים)/i);

  return {
    reactionsText: reactions ? reactions[0] : undefined,
    commentsText: comments ? comments[0] : undefined,
    sharesText: shares ? shares[0] : undefined,
  };
}
