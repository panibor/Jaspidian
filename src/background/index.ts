/**
 * src-v2/background/index.ts
 * Background service worker entry point for the v2 extension.
 */
import { handleScanRequest } from './handlers/scanRequest';
import { handleExportRequest } from './handlers/exportRequest';
import { handleDeepScanRequest } from './handlers/deepScanRequest';
import { handleModalExportOne } from './handlers/modalExportRequest';
import { handleVaultProbeRequest } from './handlers/vaultProbeRequest';
import { MESSAGE_KIND } from '../shared/constants';

function init(): void {
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (!message || message.v !== 2) return false;

      switch (message.type) {
        case MESSAGE_KIND.SCAN_REQUEST:
          return handleScanRequest(message, sendResponse);
        case MESSAGE_KIND.DEEP_SCAN_REQUEST:
          return handleDeepScanRequest(message, sendResponse);
        case MESSAGE_KIND.MODAL_EXPORT_ONE:
          return handleModalExportOne(message, sendResponse);
        case MESSAGE_KIND.EXPORT_REQUEST:
          return handleExportRequest(message, sendResponse);
        case MESSAGE_KIND.VAULT_PROBE_REQUEST:
          return handleVaultProbeRequest(message, sendResponse);
        default:
          return false;
      }
    }
  );
}

init();
