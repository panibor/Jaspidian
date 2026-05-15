/**
 * Vault folder handle: persists a FileSystemDirectoryHandle in IndexedDB
 * so the popup can write notes directly to disk if ever needed.
 */

const DB_NAME = 'fb-obsidian';
const DB_VERSION = 1;
const STORE = 'handles';
const VAULT_KEY = 'vaultRoot';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVaultHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, VAULT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(VAULT_KEY);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

/**
 * Query whether the stored handle already has readwrite permission.
 * Does NOT prompt — safe to call without a user gesture.
 */
export async function queryVaultPermission(
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> {
  return handle.queryPermission({ mode: 'readwrite' });
}

/**
 * Request readwrite permission. Must be called from a user gesture.
 */
export async function requestVaultPermission(
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> {
  return handle.requestPermission({ mode: 'readwrite' });
}

/**
 * Write a text file at relativePath inside rootHandle, creating directories as needed.
 * relativePath uses forward or back slashes, e.g. "Facebook/2026/note.md".
 */
export async function writeToVault(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<void> {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const filename = parts.pop()!;
  let dir: FileSystemDirectoryHandle = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
