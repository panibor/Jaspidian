/**
 * src-v2/shared/messageBus.ts
 * Typed message bus wrapper over chrome.runtime.
 */
import type { RuntimeMessageV2 } from './types';

/**
 * Send a message and wait for response.
 */
export async function send<T extends RuntimeMessageV2, R>(message: T): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response as R);
      }
    });
  });
}

/**
 * Listen for messages. Reject any message without v: 2.
 */
export function listen<T extends RuntimeMessageV2>(
  handler: (message: T, sender: chrome.runtime.MessageSender) => Promise<unknown>
): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const msg = message as Partial<RuntimeMessageV2>;
    if (msg.v !== 2) {
      return false; // Don't handle
    }
    handler(msg as T, sender)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: (err as Error).message }));
    return true; // async
  });
}
