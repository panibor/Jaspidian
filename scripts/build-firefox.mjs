/**
 * Derives a Firefox build from the Chrome `dist/` output.
 *
 * Run after `npm run build`. Produces:
 *   dist-firefox/                    unpacked, ready for about:debugging
 *   dist-firefox/jaspidian-firefox-v<version>.xpi
 *
 * The Chrome and Firefox sources are identical; only the manifest differs.
 * Firefox needs `browser_specific_settings.gecko.id` to install the add-on.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distDir = resolve(repoRoot, 'dist');
const outDir = resolve(repoRoot, 'dist-firefox');

if (!existsSync(distDir)) {
  console.error('dist/ not found - run `npm run build` first.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(distDir, outDir, { recursive: true });

const manifestPath = resolve(outDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// data_collection_permissions is required by AMO for new Firefox extensions.
// Jaspidian never transmits data to the developer or any third-party server -
// scanned content goes only to the user's own Obsidian plugin on 127.0.0.1.
// Per Mozilla guidance that maps to `["none"]`.
// See https://mzl.la/firefox-builtin-data-consent
// strict_min_version 142.0 because data_collection_permissions support
// landed in Firefox 140 (desktop) / 142 (Android). AMO warns if we claim a
// lower minimum than the key needs. Auto-update users are well past 142;
// ESR is on 140+; no meaningful compatibility loss.
manifest.browser_specific_settings = {
  gecko: {
    id: 'jaspidian@panibor.github.io',
    strict_min_version: '142.0',
    data_collection_permissions: {
      required: ['none'],
    },
  },
};

// Firefox MV3 keeps background.service_worker behind a default-off pref
// (extensions.backgroundServiceWorker.enabled). Use background.scripts (event
// page) instead - chrome.runtime / chrome.tabs / chrome.scripting behave the
// same from the script's point of view.
if (manifest.background?.service_worker) {
  manifest.background = {
    scripts: [manifest.background.service_worker],
    type: manifest.background.type ?? 'module',
  };
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const zip = new JSZip();
function addDir(absDir, zipDir) {
  for (const entry of readdirSync(absDir)) {
    const abs = join(absDir, entry);
    const rel = relative(outDir, abs).replace(/\\/g, '/');
    if (statSync(abs).isDirectory()) {
      addDir(abs, zipDir);
    } else {
      zip.file(rel, readFileSync(abs));
    }
  }
}
addDir(outDir, '');

const xpiName = `jaspidian-firefox-v${manifest.version}.xpi`;
const xpiPath = resolve(outDir, xpiName);
const xpiBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(xpiPath, xpiBuffer);

console.log(`Firefox build: ${relative(repoRoot, outDir)}`);
console.log(`XPI:           ${relative(repoRoot, xpiPath)}`);
