/**
 * v2 - Constants: expander caps, label dictionaries, selector patterns, defaults.
 */

/**
 * Expander caps per post (hard limits on DOM mutation budget).
 * After these are hit, stop expanding even if there are more "See more" buttons.
 */
export const EXPANDER_CAPS = {
  maxClicks: 60, // total clicks across body / comments / replies
  maxMs: 30_000, // total milliseconds
  maxMutationNodes: 200, // total mutation events observed
  bodyMaxClicks: 5,
  commentMaxClicks: 30,
  replyMaxClicks: 30,
};

/**
 * Labels to deny-list (don't click even if matched as "expand" button).
 * Used to avoid clicking "Like", "Share", "Follow", "Message", etc.
 */
export const DENY_LIST_LABELS = [
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
  'care',
  'share',
  'message',
  'follow',
  'unfollow',
  'add friend',
  'accept',
  'decline',
  'block',
  'report',
  'delete',
  'edit',
  'pin',
  'unpin',
  'save',
  'unsave',
  'mute',
  'unmute',
  'copy link',
  'find posts',
  'turn on',
  'turn off',
  'hide all',
];

/**
 * English labels for "expand" buttons.
 * Matched case-insensitively against aria-label, title, button text.
 */
export const EXPAND_LABELS_EN = [
  'see more',
  'see less',
  'view more comments',
  'view previous comments',
  'view all comments',
  'see all comments',
  'view replies',
  'view previous replies',
  'view all replies',
  'show more',
  'show less',
  'expand',
  'collapse',
];

/**
 * Hebrew labels for "expand" buttons.
 */
export const EXPAND_LABELS_HE = [
  'עוד',        // Facebook inline "more" truncation button (exact short form)
  'ראה עוד',
  'ראה פחות',
  'הצג תגובות נוספות',
  'הצג תגובות קודמות',
  'הצג את כל התגובות',
  'ראה את כל התגובות',
  'הצג תשובות',
  'הצג תשובות קודמות',
  'הצג את כל התשובות',
  'הצג יותר',
  'הצג פחות',
  'הרחב',
  'כווץ',
];

/**
 * Minimum image dimension to include (px). Filters out small icons, emojis, etc.
 */
export const MIN_IMAGE_PX = 80;

/**
 * Message bus message kinds.
 */
export const MESSAGE_KIND = {
  /** popup → background or background → content: scan posts on the active tab. */
  SCAN_REQUEST: 'SCAN_REQUEST',
  /** background → content: open modal for one post, scan it, return post data. */
  MODAL_SCAN_POST: 'MODAL_SCAN_POST',
  /** popup → background: start a batch export job; background drives the loop. */
  EXPORT_BATCH_START: 'EXPORT_BATCH_START',
  /** popup → background: get current/last batch job status. */
  EXPORT_BATCH_STATUS: 'EXPORT_BATCH_STATUS',
  /** popup → background: clear last-finished job state so the next popup open shows idle. */
  EXPORT_BATCH_ACK: 'EXPORT_BATCH_ACK',
  /** background → broadcast: per-post progress while a batch job runs. */
  EXPORT_PROGRESS: 'EXPORT_PROGRESS',
  /** background → content: expand stored posts and return full data (called inside the batch loop). */
  EXPAND_AND_EXTRACT_REQUEST: 'EXPAND_AND_EXTRACT_REQUEST',
  /** popup → background: probe whether the Obsidian plugin is reachable. */
  VAULT_PROBE_REQUEST: 'VAULT_PROBE_REQUEST',
  VAULT_PROBE_RESPONSE: 'VAULT_PROBE_RESPONSE',
} as const;

/**
 * Obsidian plugin HTTP server configuration. The plugin listens on this
 * loopback port and receives note POSTs from the extension.
 */
export const OBSIDIAN_PLUGIN_CONFIG = {
  host: '127.0.0.1',
  port: 37_123,
  timeoutMs: 15_000,
  retries: 2,
  retryBackoffMs: [1_000, 4_000],
};

/**
 * Default vault path pattern for note organization.
 */
export const DEFAULT_VAULT_PATTERN = 'Facebook/{{year}}/{{groupOrAuthor}}/{{slug}}.md';

/**
 * Default attachments folder relative to vault root.
 */
export const DEFAULT_ATTACHMENTS_FOLDER = 'Facebook/_attachments';

/**
 * Default comment mode when a user hasn't specified.
 */
export const DEFAULT_COMMENT_MODE = 'opAnsweredOnly';

/**
 * URL patterns to detect Facebook scenarios.
 */
export const URL_PATTERNS = {
  photoViewer: [
    /\/photo\/?(\?|#)/,
    /\/photo\.php/,
    /\/reel\//,
  ],
  permalink: [
    /\/posts\/\d+/,
    /\/permalink\.php/,
    /\/story\.php/,
    /\/groups\/[^/]+\/posts\/\d+/,
  ],
  groupPage: /\/groups\/([^/]+)\/?(?:\?|$)/,
  pagePage: /\/([^/]+)\/?(?:\?|$)/, // must have page-info side panel
  profilePage: /\/([^/?#]+)\/?(?:\?|$|#)/, // must have profile tabs
};

/**
 * Ancestor rejection selectors (don't treat children as posts if inside these).
 */
export const REJECT_ANCESTOR_ROLES = [
  '[role="banner"]',
  '[role="navigation"]',
  '[role="complementary"][data-pagelet*="PageletSideData"]',
  '[data-pagelet="Stories"]',
];

/**
 * Emoji/icon patterns to filter from image extraction.
 */
export const REJECT_IMAGE_PATTERNS = [
  /^data:image/,
  /emoji/i,
  /icon/i,
  /reaction/i,
  /16x16|20x20|24x24|32x32|48x48/,
];

/**
 * Comment aria-label patterns (English + Hebrew).
 */
export const COMMENT_ARIA_LABELS = {
  comment: ['comment by', 'reply by', 'replied by'],
  commentHE: ['תגובה מאת', 'תגובה של', 'תשובה מאת', 'תשובה של', 'הגיב'],
};

/**
 * Frontmatter key ordering (from plan.md § E.1).
 * Grouped semantically: identity, context, timing, post settings, stats, media, engagement, structure.
 */
export const FRONTMATTER_KEY_ORDER = [
  // Identity
  'title',
  'source',
  'post_id',
  'source_url',
  'permalink',

  // Author
  'author',
  'author_url',

  // Context
  'context_kind',
  'group_name',
  'group_url',
  'page_name',
  'page_url',
  'profile_name',
  'profile_url',

  // Timing
  'posted_at',
  'posted_at_text',
  'captured_at',

  // Post settings
  'language',
  'direction',
  'comment_mode',

  // Stats
  'comment_count_total',
  'comment_count_included',
  'image_count',
  'has_video',
  'has_shared_post',

  // Expansion
  'expansion_body_clicks',
  'expansion_comment_clicks',
  'expansion_reply_clicks',
  'expansion_total_clicks',
  'expansion_total_ms',
  'expansion_hit_click_cap',
  'expansion_hit_time_cap',

  // Tags
  'tags',
];

/**
 * Safe YAML characters that don't need quoting.
 * Anything else gets quoted with "".
 */
export const UNSAFE_YAML_CHARS = /[:,#\[\]{}&*!|>'"%@`]/;

/**
 * Obsidian datetime format (ISO 8601 with Z suffix).
 */
export const OBSIDIAN_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.sssZ';

/**
 * File collision strategies.
 */
export const COLLISION_POLICIES = ['skip', 'overwrite', 'suffix'] as const;

/**
 * Supported image content types to file extension map.
 */
export const CONTENT_TYPE_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/**
 * Candidate classification weights (from plan.md § B.1).
 */
export const CANDIDATE_SIGNALS = {
  ARTICLE_ROLE: { name: 'article role', weight: 6, reason: 'role="article" or header-with-author-and-time' },
  ARIA_POSINSET: { name: 'aria-posinset', weight: 5, reason: 'aria-posinset present' },
  MESSAGE_BODY: { name: 'message body', weight: 5, reason: 'message body element present' },
  PERMALINK: { name: 'permalink anchor', weight: 4, reason: 'permalink anchor found' },
  MEDIA: { name: 'media or link card', weight: 2, reason: 'media or link preview present' },
  REJECT_RAIL: { name: 'reject: rail ancestor', weight: -8, reason: 'inside rail / nav / sidebar' },
  REJECT_SUGGESTED: { name: 'reject: suggested', weight: -10, reason: 'inside suggested/recommendations' },
  REJECT_COMPOSER: { name: 'reject: composer', weight: -10, reason: 'is composer or in comment subtree' },
};
