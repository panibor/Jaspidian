/**
 * src-v2/shared/env.ts
 * Concrete browser environment implementation.
 */
import type { Env } from './types';
import { createLogger } from './log';

/**
 * Create a concrete browser environment (uses window, document, fetch, MutationObserver).
 */
export function createBrowserEnv(): Env {
  const log = createLogger('env');

  return {
    document,
    url: window.location.href,
    htmlLang: document.documentElement.lang || undefined,
    now: () => new Date().toISOString(),
    fetch: globalThis.fetch,
    observeMutations: async (root: Element, opts: { timeoutMs: number }) => {
      return new Promise((resolve) => {
        const mutations: MutationRecord[] = [];
        let timeoutHandle = -1;
        let lastMutationTime = Date.now();

        const observer = new MutationObserver((records) => {
          mutations.push(...records);
          lastMutationTime = Date.now();
        });

        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false,
        });

        // Resolve on timeout or 50ms quiet
        const checkQuiet = () => {
          const now = Date.now();
          if (now - lastMutationTime > 50) {
            clearTimeout(timeoutHandle);
            observer.disconnect();
            resolve(mutations);
          } else {
            timeoutHandle = window.setTimeout(checkQuiet, 50) as unknown as number;
          }
        };

        // Main timeout
        const mainTimeout = window.setTimeout(() => {
          observer.disconnect();
          resolve(mutations);
        }, opts.timeoutMs) as unknown as number;

        checkQuiet();
      });
    },
    log,
  };
}
