/**
 * User-facing strings for the popup (English, plain language).
 */
export const STRINGS = {
  scanButton: 'Scan this page',
  retryButton: 'Retry',

  scanning: 'Scanning...',
  exporting: 'Exporting...',
  noPostsDetected: "Couldn't find any posts on this page. Try scrolling or opening a specific post.",
  notOnFacebook: "This isn't a Facebook page. Open Facebook in this tab and try again.",

  exportSuccess: (n: number) => `Saved ${n} post${n === 1 ? '' : 's'} to your vault.`,
  exportNone: (fail: number) => `Nothing was saved - ${fail} post${fail === 1 ? '' : 's'} failed. See details below.`,
  exportPartial: (ok: number, fail: number) =>
    `Saved ${ok}, but ${fail} couldn't be saved. See details below.`,

  commentModeLabel: 'Comments to show:',
  commentModeAll: 'All',
  commentModeOpOnly: 'OP only',
  commentModeOpAnswered: 'OP answered',

  author: 'By',
  group: 'In',
  images: 'images',
  comments: 'comments',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
};
