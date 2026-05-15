/**
 * src-v2/popup/strings.ts
 * User-facing strings for the popup (English, plain language).
 */

export const STRINGS = {
  // Buttons
  scanButton: 'Scan this page',
  exportButton: 'Export selected',
  retryButton: 'Retry',

  // Status messages
  scanning: 'Scanning...',
  exporting: 'Exporting...',
  noPostsDetected: "Couldn't find any posts on this page. Try scrolling or opening a specific post.",
  notOnFacebook: "This isn't a Facebook page. Open Facebook in this tab and try again.",
  pluginDown: "The Jaspidian Obsidian plugin isn't responding. Open Obsidian, enable the Jaspidian plugin, then click Retry.",
  vaultPathInvalid: "Couldn't find your Obsidian vault. Check the path in Options.",

  // Success/error
  exportSuccess: (n: number) => `Saved ${n} post${n === 1 ? '' : 's'} to your vault.`,
  exportNone: (fail: number) => `Nothing was saved — ${fail} post${fail === 1 ? '' : 's'} failed. See details below.`,
  exportPartial: (ok: number, fail: number) =>
    `Saved ${ok}, but ${fail} couldn't be saved. See details below.`,
  exportFailed: 'Export failed. Check the error below and try again.',

  // Comment mode
  commentModeLabel: 'Comments to show:',
  commentModeAll: 'All',
  commentModeOpOnly: 'OP only',
  commentModeOpAnswered: 'OP answered',

  // Vault status
  vaultConnected: (path: string) => `Connected to: ${path}`,
  vaultDisconnected: 'Not connected to a vault',

  // Post list
  author: 'By',
  group: 'In',
  images: 'images',
  comments: 'comments',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',

  // Warnings
  warningTitle: 'Warning',
  warningNetwork: 'Network error. Check your connection.',
  warningTimeout: 'Request timed out. Try again.',
  warningAttachment: 'Some images failed to download.',
};
