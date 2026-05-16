# Changelog

## v1.1.1 - 2026-05-16

Same as v1.1.0 below. Version bumped only because AMO permanently reserves any version number that has ever been submitted, and v1.1.0 had been used during the pre-release validation cycle.

## v1.1.0 (never released) - 2026-05-16

Firefox support, popup that survives being closed mid-export, and a few latent bugs squashed along the way.

### Added
- **Firefox (142+) support.** New `npm run build:firefox` produces `dist-firefox/` and a `.xpi`. Firefox requires `background.scripts` (event page) instead of MV3 `background.service_worker`; the build script transforms the manifest automatically. INSTALL.md documents the temporary-load workflow via `about:debugging`.
- **Reusable release packaging.** `npm run release` builds Chrome, Firefox, and Obsidian-plugin artifacts plus a bundled `jaspidian-full-vX.Y.Z.zip` and a source archive (`jaspidian-source-vX.Y.Z.zip`) into `release/`. The script detects a Mozilla-signed XPI already sitting in `release/` (by `META-INF/mozilla.rsa` or `META-INF/cose.sig`) and preserves it across rebuilds, so the AMO-signed Firefox build flows through to the full bundle without being clobbered by the unsigned build.

### Changed
- **Export loop moved to background.** Closing the popup mid-export no longer kills the job - the background drives the loop, persists progress to `chrome.storage.session`, and broadcasts `EXPORT_PROGRESS` events. Reopening the popup rejoins the in-flight job and shows live progress.
- **Selections survive popup close.** `selectedIds` and the chosen vault are persisted alongside the scan, so reopening the popup restores everything (no need to re-scan and re-tick checkboxes).
- **Popup and options rewritten as vanilla DOM.** Dropped React entirely (along with `react-dom`, `lucide-react`, `@vitejs/plugin-react`, Tailwind, and PostCSS). Bundle is ~57% smaller (extension zip 98 KB -> 53 KB). AMO submission produces zero `innerHTML` warnings since `react-dom`'s internal `dangerouslySetInnerHTML` / SVG namespace handling is no longer in the bundle.

### Fixed
- **Popup logo.** `assets/logo-2.png` referenced a file that doesn't exist (broken image in both browsers). Now resolved via `chrome.runtime.getURL('assets/logo_48.png')` so it's bulletproof.
- **Firefox scan failure ("Receiving end does not exist").** Scanner debug payload contained raw DOM `Element` references in `topCandidates`. Chrome silently dropped them when cloning the response; Firefox threw `DataCloneError`. The transport shape now omits `el`.

### Removed
- **"Options" right-click entry.** `options_ui` removed from the manifest so Chrome no longer adds an Options item to the toolbar icon's right-click menu. Options now live behind a gear icon in the popup header (which INSTALL.md had been promising all along).
- **Options page trimmed.** Default comment mode and plugin auth token sections removed from the UI - comment mode is already adjustable per-export in the popup; the auth token is a niche feature with no friendly path to set. Vault list and note path pattern are the only configurable items now.
- **Dead code purge.** 7 unused source files deleted (`deepScanRequest`, `exportRequest`, `popup/state`, `shared/result`, `shared/log`, `shared/messageBus`, `shared/vaultHandle`). Unused `MESSAGE_KIND` entries, types (`ExportResponse`, `Result<T>`), and the `WizardView` first-run flow (never reachable: `showWizard = false`) removed.

## v1.0.0 - 2026-05-16

First public release. Licensed under PolyForm Noncommercial 1.0.0 - personal/non-commercial use only. Distributed via GitHub Releases; no Chrome Web Store listing.

### Architecture

Two pieces - a Chrome / Edge extension that reads the visible Facebook page, and an Obsidian plugin that listens on `127.0.0.1:37123` and writes notes into the vault. Loopback only; nothing leaves the machine.

### Extension
- Detect and extract posts from feed, group, page, profile, permalink, and photo-viewer surfaces
- Author, group/page context, timestamp, body, images, link previews, shared posts, comments
- Comment modes: all / OP only / OP-answered
- Bounded expander for "See more" and "View more comments"
- Per-post background-tab scan for missing comments (with scroll trigger for lazy-loaded content)
- Multi-script language detection (Hebrew, Arabic, Cyrillic, CJK, Latin) with proportional thresholds
- RTL layout for Hebrew/Arabic notes

### Obsidian plugin
- Local HTTP receiver inside Obsidian on `127.0.0.1:37123`
- Safe vault-writer (path resolution cannot escape the configured vault root)
- Optional bearer-token auth
