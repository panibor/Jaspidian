/**
 * background/handlers/scanRequest.ts
 * Handles SCAN_REQUEST: forward to content script on the active Facebook tab.
 * If the content script isn't injected yet, inject it then retry once.
 */
import type { RuntimeMessageV2, ScanResponse } from '../../shared/types';

export function handleScanRequest(
  message: RuntimeMessageV2,
  sendResponse: (response: ScanResponse) => void
): boolean {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      sendResponse({ ok: false, error: 'No active tab found' });
      return;
    }

    const tabId = tab.id;

    // Try sending to existing content script first
    const firstTry = await _sendToContent(tabId, message);
    if (firstTry !== null) {
      // Attach the tab ID so the popup can pass it back at export time
      sendResponse({ ...firstTry, tabId });
      return;
    }

    // Content script not there - inject it then retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['assets/content.js'],
      });
      // Small wait for script to register its listener
      await new Promise<void>((r) => setTimeout(r, 200));
    } catch {
      sendResponse({ ok: false, error: 'Could not inject content script - please reload the Facebook tab and try again.' });
      return;
    }

    const secondTry = await _sendToContent(tabId, message);
    if (secondTry !== null) {
      sendResponse({ ...secondTry, tabId });
      return;
    }
    // Still failing - surface the real Chrome error so the user can act on it
    const diagError = await _lastSendError(tabId, message);
    sendResponse({
      ok: false,
      error: diagError
        ? `Scan error: ${diagError} - try reloading the Facebook tab.`
        : 'Content script did not respond. Please reload the Facebook tab and try again.',
    });
  });

  return true; // async
}

/** Attempt sendMessage and return lastError.message (or null if it succeeded). */
function _lastSendError(tabId: number, message: RuntimeMessageV2): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, () => {
        resolve(chrome.runtime.lastError?.message ?? null);
      });
    } catch (e) {
      resolve(e instanceof Error ? e.message : String(e));
    }
  });
}

function _sendToContent(tabId: number, message: RuntimeMessageV2): Promise<ScanResponse | null> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response: ScanResponse) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}
