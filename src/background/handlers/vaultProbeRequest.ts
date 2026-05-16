/**
 * src-v2/background/handlers/vaultProbeRequest.ts
 * Handles VAULT_PROBE_REQUEST: checks whether the Obsidian plugin's local
 * HTTP receiver is reachable on loopback.
 */
import type { RuntimeMessageV2, VaultInfoResponse } from '../../shared/types';
import { getVaultInfo } from '../../obsidian/transport/obsidianPluginClient';
import { OBSIDIAN_PLUGIN_CONFIG } from '../../shared/constants';

export function handleVaultProbeRequest(
  _message: RuntimeMessageV2,
  sendResponse: (response: VaultInfoResponse) => void
): boolean {
  const baseUrl = `http://${OBSIDIAN_PLUGIN_CONFIG.host}:${OBSIDIAN_PLUGIN_CONFIG.port}`;

  // Quick fetch helper - 5 s timeout so the popup doesn't hang
  const quickFetch = (path: string): Promise<Record<string, unknown>> =>
    fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5_000) }).then((r) => r.json());

  // Hit /health first - it requires no auth token regardless of plugin settings.
  // Only if health passes do we also try /vault/info for the vault name.
  quickFetch('/health')
    .then(async (health) => {
      if (!health?.ok) {
        sendResponse({ ok: false, error: 'Plugin unhealthy' });
        return;
      }
      try {
        const info = await quickFetch('/vault/info');
        sendResponse({
          ok: true,
          vaultName: (info.vaultName as string) || undefined,
          vaultRoot: (info.vaultRoot as string) || undefined,
        });
      } catch {
        // Health passed but vault/info needs a token - still show as connected
        sendResponse({ ok: true });
      }
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true; // async
}
