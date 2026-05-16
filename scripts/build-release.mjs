/**
 * Builds all release artifacts into release/ for the version in package.json.
 *
 * Produces:
 *   release/jaspidian-extension-vX.Y.Z.zip          Chrome / Edge build
 *   release/jaspidian-firefox-vX.Y.Z.xpi            Firefox build
 *   release/jaspidian-obsidian-plugin-vX.Y.Z.zip    Obsidian plugin (main.js + manifest.json)
 *   release/jaspidian-full-vX.Y.Z.zip               Everything + docs (what end-users download)
 *   release/jaspidian-source-vX.Y.Z.zip             Source archive (for AMO reviewers)
 *
 * Signed-XPI workflow:
 *   The unsigned Firefox build comes out of `dist-firefox/`. If you've already
 *   submitted to AMO and dropped the signed XPI into `release/` under the
 *   expected name, this script detects the signature and *preserves* it -
 *   only the other artifacts are regenerated, and the full bundle is rebuilt
 *   around the signed XPI so end-user downloads ship the signed copy.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const releaseDir = resolve(repoRoot, 'release');

const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Invalid package.json version: ${version}`);
  process.exit(1);
}

const extensionName = `jaspidian-extension-v${version}`;
const firefoxName = `jaspidian-firefox-v${version}`;
const pluginName = `jaspidian-obsidian-plugin-v${version}`;
const fullName = `jaspidian-full-v${version}`;
const sourceName = `jaspidian-source-v${version}`;

console.log(`Building release artifacts for v${version}`);

// ---------------------------------------------------------------------------
// Preserve a signed XPI if the user has dropped one into release/.
// We read it before any rm/build so the bytes are safe in memory.
// ---------------------------------------------------------------------------
const releaseXpi = resolve(releaseDir, `${firefoxName}.xpi`);
let signedXpiBuf = null;
if (existsSync(releaseXpi) && await isMozillaSigned(releaseXpi)) {
  signedXpiBuf = readFileSync(releaseXpi);
  console.log(`Found Mozilla-signed XPI at release/${firefoxName}.xpi - preserving.`);
}

// ---------------------------------------------------------------------------
// Wipe regenerable artifacts (but not the directory itself, so anything else
// the user has staged in release/ survives).
// ---------------------------------------------------------------------------
mkdirSync(releaseDir, { recursive: true });
for (const f of [extensionName + '.zip', pluginName + '.zip', fullName + '.zip', sourceName + '.zip']) {
  const p = resolve(releaseDir, f);
  if (existsSync(p)) rmSync(p);
}
// release/<firefox>.xpi: only delete if it's an unsigned build artifact (we'll restore the signed one).
if (existsSync(releaseXpi) && !signedXpiBuf) rmSync(releaseXpi);

// ---------------------------------------------------------------------------
// 1) Chrome / Edge + Firefox extension builds (always rebuilt)
// ---------------------------------------------------------------------------
run('npm', ['run', 'build:firefox'], repoRoot);

// ---------------------------------------------------------------------------
// 2) Obsidian plugin build
// ---------------------------------------------------------------------------
const pluginDir = resolve(repoRoot, 'obsidian-plugin');
if (!existsSync(resolve(pluginDir, 'node_modules'))) {
  console.log('Installing obsidian-plugin dependencies...');
  run('npm', ['install'], pluginDir);
}
run('npm', ['run', 'build'], pluginDir);

// ---------------------------------------------------------------------------
// 3) Package per-piece zips + place the Firefox XPI
// ---------------------------------------------------------------------------
await zipDir({
  srcDir: resolve(repoRoot, 'dist'),
  outFile: resolve(releaseDir, `${extensionName}.zip`),
  topLevelDir: extensionName,
});

// If we preserved a signed XPI, write it back; otherwise copy the unsigned build.
const firefoxXpiBuf = signedXpiBuf ?? readFileSync(resolve(repoRoot, 'dist-firefox', `${firefoxName}.xpi`));
writeFileSync(releaseXpi, firefoxXpiBuf);

await zipFiles({
  files: [
    { src: resolve(pluginDir, 'main.js'), arc: `${pluginName}/main.js` },
    { src: resolve(pluginDir, 'manifest.json'), arc: `${pluginName}/manifest.json` },
  ],
  outFile: resolve(releaseDir, `${pluginName}.zip`),
});

// ---------------------------------------------------------------------------
// 4) Bundled full zip - uses whichever Firefox XPI we ended up with (signed
// when available, unsigned otherwise).
// ---------------------------------------------------------------------------
const fullZip = new JSZip();
addDirToZip(fullZip, resolve(repoRoot, 'dist'), `${fullName}/${extensionName}`);
fullZip.file(`${fullName}/${firefoxName}.xpi`, firefoxXpiBuf);
fullZip.file(`${fullName}/${pluginName}/main.js`, readFileSync(resolve(pluginDir, 'main.js')));
fullZip.file(`${fullName}/${pluginName}/manifest.json`, readFileSync(resolve(pluginDir, 'manifest.json')));
for (const doc of ['INSTALL.md', 'README.md', 'LICENSE', 'DISCLAIMER.md', 'PRIVACY.md', 'CHANGELOG.md']) {
  const p = resolve(repoRoot, doc);
  if (existsSync(p)) fullZip.file(`${fullName}/${doc}`, readFileSync(p));
}
const fullBuf = await fullZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(resolve(releaseDir, `${fullName}.zip`), fullBuf);

// ---------------------------------------------------------------------------
// 5) Source archive - what AMO reviewers need to reproduce the .xpi.
// ---------------------------------------------------------------------------
const sourceOut = resolve(releaseDir, `${sourceName}.zip`);
run('git', ['archive', '--format=zip', `--prefix=${sourceName}/`, '-o', sourceOut, 'HEAD'], repoRoot);

// ---------------------------------------------------------------------------
// Done - summarise
// ---------------------------------------------------------------------------
console.log('\nRelease artifacts:');
for (const f of readdirSync(releaseDir).sort()) {
  const size = statSync(resolve(releaseDir, f)).size;
  const label = f === `${firefoxName}.xpi` && signedXpiBuf ? '  (signed)' : '';
  console.log(`  ${relative(repoRoot, resolve(releaseDir, f))}  (${(size / 1024).toFixed(1)} KB)${label}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd, args, cwd) {
  // shell:true is required on Windows so .cmd files resolve. Pass as a single
  // string to avoid Node's DEP0190 (the args here are all static literals).
  const r = spawnSync([cmd, ...args].join(' '), { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function addDirToZip(zip, absDir, arcPrefix) {
  for (const entry of readdirSync(absDir)) {
    const abs = join(absDir, entry);
    const arc = `${arcPrefix}/${entry}`;
    if (statSync(abs).isDirectory()) {
      addDirToZip(zip, abs, arc);
    } else {
      zip.file(arc, readFileSync(abs));
    }
  }
}

async function zipDir({ srcDir, outFile, topLevelDir }) {
  const zip = new JSZip();
  addDirToZip(zip, srcDir, topLevelDir);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(outFile, buf);
}

async function zipFiles({ files, outFile }) {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.arc, readFileSync(f.src));
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(outFile, buf);
}

/**
 * Detect a Mozilla-signed XPI. Both legacy (mozilla.rsa) and modern (cose.sig)
 * signatures live under META-INF/. Unsigned builds have neither.
 */
async function isMozillaSigned(xpiPath) {
  try {
    const zip = await JSZip.loadAsync(readFileSync(xpiPath));
    return zip.file('META-INF/mozilla.rsa') !== null
        || zip.file('META-INF/cose.sig') !== null;
  } catch {
    return false;
  }
}
