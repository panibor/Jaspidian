/**
 * src/obsidian/transport/obsidianPluginClient.ts
 * HTTP client used by the extension to talk to the Obsidian plugin's local
 * loopback receiver (POST /notes, GET /health, GET /vault/info).
 */
import type {
  PluginNoteRequest,
  PluginNoteResponse,
  PluginBatchRequest,
  PluginBatchResponse,
  VaultInfoResponse,
} from '../../shared/types';

interface ClientSettings {
  baseUrl: string;
  token?: string;
}

/**
 * POST a single note to the Obsidian plugin's local receiver.
 */
export async function postNote(
  req: PluginNoteRequest,
  settings: ClientSettings
): Promise<PluginNoteResponse> {
  try {
    const response = await fetch(`${settings.baseUrl}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.token && { Authorization: `Bearer ${settings.token}` }),
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(90_000),
    });
    return await response.json();
  } catch (err) {
    return {
      postId: req.postId,
      status: 'failed',
      warnings: [(err as Error).message],
      attachmentResults: [],
    };
  }
}

/**
 * POST a batch of notes.
 */
export async function postNotesBatch(
  req: PluginBatchRequest,
  settings: ClientSettings
): Promise<PluginBatchResponse> {
  try {
    const response = await fetch(`${settings.baseUrl}/notes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.token && { Authorization: `Bearer ${settings.token}` }),
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(90_000),
    });
    return await response.json();
  } catch (err) {
    return {
      ok: false,
      results: [],
      error: (err as Error).message,
    };
  }
}

/**
 * GET vault info from the Obsidian plugin.
 */
export async function getVaultInfo(settings: ClientSettings): Promise<VaultInfoResponse> {
  try {
    const response = await fetch(`${settings.baseUrl}/vault/info`, {
      headers: settings.token ? { Authorization: `Bearer ${settings.token}` } : {},
      signal: AbortSignal.timeout(90_000),
    });
    return await response.json();
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message,
    };
  }
}
