# Jaspidian - Privacy Policy

**Last updated: 2026-05-16**

Jaspidian is a personal-use tool that runs entirely on your own computer. It does not collect, transmit, or store any personal data on any remote server. It is not affiliated with Meta, Facebook, or Obsidian.

Jaspidian is licensed under PolyForm Noncommercial 1.0.0 and is intended for personal, hobby, educational, research, and non-profit use only. See [LICENSE](LICENSE) and [DISCLAIMER.md](DISCLAIMER.md).

## What Jaspidian accesses

When you click "Scan this page" on a Facebook tab, the extension reads the **already-rendered DOM** of that tab. That means it looks at the posts, authors, comments, images, and timestamps that Facebook has already shown you. It does not access:

- Your Facebook password, email, or session cookies
- Any private API, GraphQL endpoint, or non-public Facebook data
- Any other browser tab
- Your browsing history or bookmarks
- Files on your computer outside the Obsidian vault folder you have configured

## What Jaspidian stores

The browser extension stores the following in Chrome's extension storage (which lives only on your computer):

- Your preferences: comment mode, folder pattern, attachments folder, vault list
- An optional bearer token, if you choose to require one for the plugin
- A short log of recent export results, used to show success/failure in the popup

The Obsidian plugin stores its settings inside your vault (in `.obsidian/plugins/jaspidian/data.json`).

Nothing in either store is ever transmitted anywhere.

## What Jaspidian transmits

Jaspidian transmits exactly one thing: the extracted post content (Markdown + image data) from the browser extension to the Obsidian plugin running inside Obsidian, over **`127.0.0.1:37123`** - a loopback address. The data never leaves your computer.

Jaspidian also fetches image files from Facebook's CDN (`*.fbcdn.net`, `*.scontent.*`) so it can download attachments into your vault. These requests use your existing Facebook session - exactly the same requests your browser would make when displaying the page.

## Third-party services

Jaspidian does not use any third-party analytics, error reporting, advertising, or telemetry service. It does not contact a Jaspidian update server.

### Optional AI "prettify" feature (off by default)

The Obsidian plugin contains an optional feature that uses an AI model to clean up the rendered note (fix punctuation, normalise spacing, etc.). This feature is **disabled by default**. To use it, you must:

1. Open the Jaspidian plugin settings inside Obsidian
2. Pick a provider: **OpenRouter** (a cloud service) or **Ollama** (typically a local server, but it accepts any URL you type)
3. Enter an API key or endpoint URL

If - and only if - you enable this feature, the plugin will send the **content of the note you are saving** to the provider you configured:

- **OpenRouter (cloud):** notes are sent over HTTPS to `https://openrouter.ai/api/v1/chat/completions`. OpenRouter is operated by a third party with its own privacy policy.
- **Ollama (typically local):** notes are sent to whatever URL you enter. If you point Ollama at `http://localhost:11434`, the data stays on your machine. If you point it at a remote server, the data goes there.

If you do not configure a provider, this feature does nothing and no data is transmitted. **No data ever goes to any third-party service when the AI feature is off.** Apart from this opt-in feature, all extension ↔ plugin traffic is loopback-only.

## Permissions explained

The extension manifest requests:

| Permission | Why |
|---|---|
| `storage` | Save your preferences locally |
| `tabs` | Open a hidden tab on a post's permalink so we can capture comments that haven't lazy-loaded in your current view |
| `downloads` | Save Markdown as a `.md` file as a fallback if the plugin is unavailable |
| `scripting` | Briefly scroll the hidden permalink tab to trigger Facebook's lazy-loaded comments |
| `host_permissions: *.facebook.com, *.fbcdn.net` | Read the DOM and fetch images |
| `host_permissions: http://127.0.0.1:37123/*` | Send the rendered note to the Obsidian plugin running on loopback |

## Children's privacy

Jaspidian is not directed at children under 13.

## Changes to this policy

If this policy changes, the updated version will be published in the same `PRIVACY.md` file in the project repository, with a new "Last updated" date.

## Contact

For questions, open an issue at https://github.com/panibor/jaspidian/issues.
