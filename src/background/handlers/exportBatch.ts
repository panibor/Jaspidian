/**
 * Background-owned batch export loop.
 *
 * The popup fires EXPORT_BATCH_START once, then closes whenever the user
 * clicks away. The loop here keeps running, persists progress to
 * chrome.storage.session, and broadcasts EXPORT_PROGRESS so any open popup
 * updates live. On reopen, the popup queries EXPORT_BATCH_STATUS and rejoins
 * the in-flight job.
 */
import type {
  RuntimeMessageV2,
  ExportBatchStartRequest,
  ExportBatchStartResponse,
  ExportBatchStatusResponse,
  ExportJobState,
  ExportResultRow,
  ExtractedFacebookPostV2,
} from '../../shared/types';
import { MESSAGE_KIND } from '../../shared/constants';
import { exportOnePost } from './modalExportRequest';

const STORAGE_KEY = 'exportJob';

let currentJob: ExportJobState | null = null;
let currentRequest: ExportBatchStartRequest | null = null;
let loopRunning = false;

async function _persist(state: ExportJobState): Promise<void> {
  currentJob = state;
  if (chrome.storage?.session) {
    try { await chrome.storage.session.set({ [STORAGE_KEY]: state }); } catch { /* ignore */ }
  }
}

function _broadcast(state: ExportJobState): void {
  // No specific recipient - the popup picks it up if open. lastError is set
  // when nothing's listening; consume it so it doesn't pollute the console.
  try {
    chrome.runtime.sendMessage(
      { v: 2, type: MESSAGE_KIND.EXPORT_PROGRESS, job: state },
      () => { void chrome.runtime.lastError; }
    );
  } catch { /* ignore */ }
}

async function _saveAndEmit(state: ExportJobState): Promise<void> {
  await _persist(state);
  _broadcast(state);
}

function _titleFor(post: ExtractedFacebookPostV2 | undefined, postId: string): string {
  if (!post) return postId;
  return post.title || post.body?.slice(0, 60) || postId;
}

async function _runLoop(): Promise<void> {
  if (loopRunning) return;
  loopRunning = true;
  try {
    while (currentJob && currentRequest && currentJob.remaining.length > 0) {
      const [currentId, ...rest] = currentJob.remaining;
      const post = currentRequest.posts.find((p) => p.id === currentId);
      const req = currentRequest;

      const resp = await exportOnePost({
        postId: currentId,
        permalink: post?.permalink || '',
        commentMode: req.commentMode,
        vaultPattern: req.vaultPattern,
        pluginToken: req.pluginToken,
      });

      const row: ExportResultRow = resp.result
        ? {
            postId: resp.result.postId,
            title: resp.title || _titleFor(post, currentId),
            status: resp.result.status,
            notePath: resp.result.notePath,
            error: resp.result.error,
            warnings: resp.result.warnings ?? [],
          }
        : {
            postId: currentId,
            title: _titleFor(post, currentId),
            status: 'failed',
            error: resp.error || 'No response',
            warnings: [],
          };

      const nextPost = rest.length > 0
        ? currentRequest.posts.find((p) => p.id === rest[0])
        : undefined;

      const next: ExportJobState = {
        ...currentJob,
        completed: currentJob.completed + 1,
        currentTitle: rest.length > 0 ? _titleFor(nextPost, rest[0]) : '',
        remaining: rest,
        results: [...currentJob.results, row],
        updatedAt: new Date().toISOString(),
      };
      await _saveAndEmit(next);
    }

    if (currentJob) {
      const done: ExportJobState = {
        ...currentJob,
        status: 'done',
        currentTitle: '',
        updatedAt: new Date().toISOString(),
      };
      await _saveAndEmit(done);
    }
  } finally {
    loopRunning = false;
    currentRequest = null;
  }
}

export function handleExportBatchStart(
  message: RuntimeMessageV2,
  sendResponse: (r: ExportBatchStartResponse) => void
): boolean {
  if (currentJob?.status === 'running') {
    sendResponse({ ok: true, alreadyRunning: true });
    return false;
  }

  const req = message as ExportBatchStartRequest;
  if (!req.postIds?.length) {
    sendResponse({ ok: false, error: 'No posts selected' });
    return false;
  }

  const firstPost = req.posts.find((p) => p.id === req.postIds[0]);
  const initial: ExportJobState = {
    status: 'running',
    total: req.postIds.length,
    completed: 0,
    currentTitle: _titleFor(firstPost, req.postIds[0]),
    remaining: [...req.postIds],
    results: [],
    updatedAt: new Date().toISOString(),
  };
  currentRequest = req;
  _saveAndEmit(initial).then(() => {
    void _runLoop();
  });

  sendResponse({ ok: true });
  return false;
}

export function handleExportBatchStatus(
  _message: RuntimeMessageV2,
  sendResponse: (r: ExportBatchStatusResponse) => void
): boolean {
  if (currentJob) {
    sendResponse({ ok: true, job: currentJob });
    return false;
  }
  if (chrome.storage?.session) {
    chrome.storage.session.get(STORAGE_KEY, (data) => {
      const stored = data[STORAGE_KEY] as ExportJobState | undefined;
      if (stored) currentJob = stored;
      sendResponse({ ok: true, job: stored ?? null });
    });
    return true;
  }
  sendResponse({ ok: true, job: null });
  return false;
}

export function handleExportBatchAck(
  _message: RuntimeMessageV2,
  sendResponse: (r: { ok: true }) => void
): boolean {
  if (currentJob?.status === 'done') {
    currentJob = null;
    if (chrome.storage?.session) {
      chrome.storage.session.remove(STORAGE_KEY, () => { void chrome.runtime.lastError; });
    }
  }
  sendResponse({ ok: true });
  return false;
}
