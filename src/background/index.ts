/**
 * Background service worker entry point.
 */
import { handleScanRequest } from './handlers/scanRequest';
import { handleExportBatchStart, handleExportBatchStatus, handleExportBatchAck } from './handlers/exportBatch';
import { handleVaultProbeRequest } from './handlers/vaultProbeRequest';
import { MESSAGE_KIND } from '../shared/constants';

function init(): void {
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (!message || message.v !== 2) return false;

      switch (message.type) {
        case MESSAGE_KIND.SCAN_REQUEST:
          return handleScanRequest(message, sendResponse);
        case MESSAGE_KIND.EXPORT_BATCH_START:
          return handleExportBatchStart(message, sendResponse);
        case MESSAGE_KIND.EXPORT_BATCH_STATUS:
          return handleExportBatchStatus(message, sendResponse);
        case MESSAGE_KIND.EXPORT_BATCH_ACK:
          return handleExportBatchAck(message, sendResponse);
        case MESSAGE_KIND.VAULT_PROBE_REQUEST:
          return handleVaultProbeRequest(message, sendResponse);
        default:
          return false;
      }
    }
  );
}

init();
