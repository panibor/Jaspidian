# Changelog

## v1.0.0 — 2026-05-16

First public release. Licensed under PolyForm Noncommercial 1.0.0 — personal/non-commercial use only. Distributed via GitHub Releases; no Chrome Web Store listing.

### Architecture

Two pieces — a Chrome / Edge extension that reads the visible Facebook page, and an Obsidian plugin that listens on `127.0.0.1:37123` and writes notes into the vault. Loopback only; nothing leaves the machine.

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
