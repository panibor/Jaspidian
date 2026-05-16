/**
 * v2 -- Full type definitions for the Facebook -> Obsidian scanner & export pipeline.
 */

export type TextDirection = 'ltr' | 'rtl' | 'auto';

export type Scenario =
  | 'feed'
  | 'permalink'
  | 'photoViewer'
  | 'commentsModal'
  | 'groupPage'
  | 'pagePage'
  | 'profilePage'
  | 'unknown';

export type CandidateKind =
  | 'postRoot'
  | 'commentRoot'
  | 'photoViewerPanel'
  | 'dialogRoot'
  | 'sponsored'
  | 'suggested'
  | 'composer'
  | 'navigationChrome'
  | 'storyChrome'
  | 'railChrome'
  | 'feedChrome'
  | 'mediaControl'
  | 'emptySkeleton'
  | 'unknown';

export type CommentMode = 'all' | 'opOnly' | 'opAnsweredOnly';

export type CollisionPolicy = 'skip' | 'overwrite' | 'suffix';

export type AssetDownloadStatus = 'pending' | 'ok' | 'failed' | 'skipped';

/**
 * Post context: group, page, or profile.
 * Always exactly one of `groupName`/`groupUrl`, `pageName`/`pageUrl`, or `profileName`/`profileUrl` is set.
 */
export interface PostContextV2 {
  kind: 'group' | 'page' | 'profile' | 'unknown';
  groupName?: string;
  groupUrl?: string;
  groupSlug?: string;
  pageName?: string;
  pageUrl?: string;
  pageSlug?: string;
  profileName?: string;
  profileUrl?: string;
  profileSlug?: string;
}

/**
 * Image captured from the post. Priority: photo permalink > srcset > wrapped <a> > img.src.
 * Always has `remoteUrl`. `fullResolutionUrl` is the best-effort highest resolution available.
 */
export interface ExtractedImageV2 {
  remoteUrl: string;
  fullResolutionUrl?: string;
  altText?: string;
  inCarousel?: boolean;
  carouselIndex?: number;
  localPath?: string; // set by the Obsidian plugin after download, e.g. "Facebook/_attachments/slug/image-01.jpg"
}

/**
 * Video reference. We capture the poster URL and permalink; don't download video.
 */
export interface ExtractedVideoV2 {
  posterUrl?: string;
  remoteUrl?: string;
  permalink?: string;
  duration?: number;
}

/**
 * Native Facebook link preview (metadata card).
 */
export interface ExtractedLinkV2 {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Post-within-post (shared post). Minimal shape; don't recurse.
 */
export interface SharedPostV2 {
  authorName?: string;
  authorUrl?: string;
  body?: string;
  permalink?: string;
  images?: ExtractedImageV2[];
  timestamp?: string;
}

/**
 * Expansion stats for this post: how many clicks, mutations, time spent expanding body / comments / replies.
 */
export interface ExpansionStatsV2 {
  bodyClicks: number;
  bodyMs: number;
  commentClicks: number;
  commentMs: number;
  replyClicks: number;
  replyMs: number;
  totalClicks: number;
  totalMs: number;
  mutationNodes: number;
  hitClickCap: boolean;
  hitTimeCap: boolean;
  hitMutationCap: boolean;
  warnings: string[];
}

/**
 * Extracted comment with author, text, depth, OP marker.
 */
export interface ExtractedFacebookCommentV2 {
  id?: string;
  authorName: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  body: string;
  imageUrl?: string;           // photo attached to this comment (if any)
  timestamp?: string;
  timestampText?: string;
  permalink?: string;
  isOP?: boolean;
  parentAnsweredByOP?: boolean;
  depth: number;
  replies: ExtractedFacebookCommentV2[];
}

/**
 * Extracted Facebook post - the canonical output of the scanner + extractor pipeline.
 */
export interface ExtractedFacebookPostV2 {
  id: string;
  postId: string;
  title?: string;
  body: string;
  bodyWasTruncated?: boolean;
  authorName: string;
  authorUrl: string;
  authorAvatarUrl?: string;
  context: PostContextV2;
  postedAt: string;
  /** True iff postedAt came from the post's own timestamp (not a capture-time fallback). */
  postedAtIsActual?: boolean;
  postedAtText: string;
  permalink: string;
  engagementReactionCount?: number;
  engagementCommentCount?: number;
  engagementShareCount?: number;
  engagementCommentText?: string; // raw parsed text like "45 comments"
  images: ExtractedImageV2[];
  videos: ExtractedVideoV2[];
  linkPreviews: ExtractedLinkV2[];
  sharedPost?: SharedPostV2;
  comments: ExtractedFacebookCommentV2[];
  commentsWereExpanded: boolean;
  repliesWereExpanded: boolean;
  expansionStats: ExpansionStatsV2;
  language?: string;
  direction?: TextDirection;
  hashtags?: string[];
}

export interface ScanOptions {
  expand: {
    body: boolean;
    comments: boolean;
    replies: boolean;
    maxClicks?: number;
    maxMs?: number;
    maxMutationNodes?: number;
  };
  commentMode: CommentMode;
}

/**
 * Envelope returned by scan(). Contains all posts found, scenario, warnings, optional debug report.
 */
export interface ScanEnvelopeV2 {
  v: 2;
  posts: ExtractedFacebookPostV2[];
  scenario: Scenario;
  url: string;
  scannedAt: string;
  warnings: string[];
  debugReport?: ScanDebugReportV2;
}

/**
 * Optional debug report: candidate detection details.
 */
export interface ScanDebugReportV2 {
  scenarioDetected: Scenario;
  candidatesCount: number;
  classifiedCount: number;
  rejectionReasons: Record<string, number>;
  topCandidates?: Omit<ClassifiedCandidateV2, 'el'>[];
}

export interface CandidateSignalV2 {
  name: string;
  weight: number;
  reason: string;
}

/**
 * Candidate after classification (signals assigned, kind determined).
 */
export interface ClassifiedCandidateV2 {
  el: Element;
  origin: string;
  kind: CandidateKind;
  signals: CandidateSignalV2[];
  score: number;
}

/**
 * Runtime environment injected into scanner + expander. Enables testing without real DOM.
 */
export interface Env {
  document: Document;
  url: string;
  htmlLang?: string; // document.documentElement.lang - Facebook's declared page language (BCP 47)
  now: () => string; // ISO timestamp
  fetch: typeof fetch;
  /**
   * Observe mutations on root for `timeoutMs`.
   * Returns array of MutationRecords observed (may be empty if nothing changed).
   * Used by expander to detect if a click produced DOM changes.
   */
  observeMutations: (root: Element, opts: { timeoutMs: number }) => Promise<MutationRecord[]>;
  log: {
    debug: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

// HTTP message types
export interface RuntimeMessageV2 {
  v: 2;
  type: string;
}

export interface ScanResponse {
  ok: boolean;
  envelope?: ScanEnvelopeV2;
  /** The tab ID that was scanned - included so the popup can pass it back at export time. */
  tabId?: number;
  error?: string;
}

/**
 * Sent from the background to the content script to expand + re-extract specific posts.
 * The content script must have previously scanned the page and stored element references.
 */
export interface ExpandAndExtractRequest extends RuntimeMessageV2 {
  postIds: string[];
  expand: {
    body: boolean;
    comments: boolean;
    replies: boolean;
    maxClicks?: number;
    maxMs?: number;
    maxMutationNodes?: number;
  };
  commentMode: CommentMode;
}

export interface ExpandAndExtractResponse {
  ok: boolean;
  posts?: ExtractedFacebookPostV2[];
  notFound?: string[];
  error?: string;
}

/** Per-post result row tracked across the popup and background. */
export interface ExportResultRow {
  postId: string;
  title: string;
  status: 'ok' | 'skipped' | 'failed';
  notePath?: string;
  error?: string;
  warnings: string[];
}

/**
 * Background-owned state for an in-flight or just-finished batch export job.
 * Persisted to chrome.storage.session so the popup can rejoin a running job.
 */
export interface ExportJobState {
  status: 'running' | 'done';
  total: number;
  completed: number;
  currentTitle: string;
  /** Post IDs still to process. Empty when status is 'done'. */
  remaining: string[];
  results: ExportResultRow[];
  /** ISO timestamp of the last state mutation. Lets the popup detect stale "running" state. */
  updatedAt: string;
}

export interface ExportBatchStartRequest extends RuntimeMessageV2 {
  posts: ExtractedFacebookPostV2[];
  postIds: string[];
  commentMode: CommentMode;
  vaultPattern: string;
  pluginToken?: string;
}

export interface ExportBatchStartResponse {
  ok: boolean;
  error?: string;
  /** Returned when a job is already running so the popup can rejoin without starting another. */
  alreadyRunning?: boolean;
}

export interface ExportBatchStatusResponse {
  ok: boolean;
  job: ExportJobState | null;
}

export interface ExportProgressMessage extends RuntimeMessageV2 {
  job: ExportJobState;
}

export interface ExportResultItemV2 {
  postId: string;
  status: 'ok' | 'skipped' | 'failed';
  notePath?: string;
  warnings: string[];
  error?: string;
}

export interface VaultInfoResponse {
  ok: boolean;
  vaultRoot?: string;
  vaultName?: string;
  attachmentsRoot?: string;
  version?: string;
  writable?: boolean;
  error?: string;
}

export interface VaultEntry {
  name: string;
  path: string;
}

// Plugin HTTP request/response shapes
export interface PluginAttachmentItem {
  key: string;
  remoteUrl: string;
  fullResolutionUrl?: string;
  alt?: string;
  data?: string;      // base64 image data pre-fetched by extension service worker
  mimeType?: string;  // e.g. "image/jpeg"
}

export interface PluginAttachmentResult {
  key: string;
  status: AssetDownloadStatus;
  path?: string;
  bytes?: number;
  error?: string;
}

export interface PluginNoteRequest {
  postId: string;
  title: string;
  markdown: string;
  attachments: PluginAttachmentItem[];
  filename: string;
  folder: string;
  attachmentFolder: string;
  vaultPattern: string;
  collisionPolicy: CollisionPolicy;
}

export interface PluginNoteResponse {
  postId: string;
  status: 'ok' | 'skipped' | 'failed';
  notePath?: string;
  attachmentResults: PluginAttachmentResult[];
  warnings: string[];
  error?: string;
}

export interface PluginBatchRequest {
  notes: PluginNoteRequest[];
  collisionPolicy: CollisionPolicy;
}

export interface PluginBatchResponse {
  ok: boolean;
  results: PluginNoteResponse[];
  error?: string;
}
