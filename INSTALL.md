# Jaspidian - Installation Guide

Save Facebook posts directly into your Obsidian vault, complete with images, the author, which group it came from, and the comments.

> **Personal use only.** Jaspidian is licensed under PolyForm Noncommercial 1.0.0 and is **not** affiliated with Meta, Facebook, or Obsidian. Read [DISCLAIMER.md](DISCLAIMER.md) before installing.

---

## What you need

- A supported browser:
  - [Google Chrome](https://www.google.com/chrome/) or Microsoft Edge, **or**
  - [Mozilla Firefox](https://www.mozilla.org/firefox/) 142 or newer
- [Obsidian](https://obsidian.md/) (desktop, v1.4+), with a vault you use

That's it - no Node.js, no helper apps, no background processes to remember to start.

---

## Step 1 - Install the Obsidian plugin

The plugin is what actually writes notes into your vault. It also starts a small loopback listener inside Obsidian on `127.0.0.1:37123` that the browser extension talks to. Nothing is exposed to the internet.

1. **Close Obsidian** if it is open.
2. Open your vault folder in File Explorer (or Finder).
3. Open the hidden folder `.obsidian/plugins/`. If `plugins/` doesn't exist, create it.
4. Inside `plugins/`, create a folder called `jaspidian`.
5. Copy these two files into that folder (from the downloaded release zip):
   - `main.js`
   - `manifest.json`
6. **Open Obsidian** → **Settings → Community plugins**.
7. If you see a "Turn on community plugins" button, click it.
8. Find **Jaspidian** in the **Installed plugins** list and toggle it ON.

> **macOS:** the `.obsidian` folder is hidden. In Finder, press `Cmd+Shift+.` to show hidden folders.

When the plugin is enabled, you'll see a small notice in Obsidian: "Jaspidian listening on 127.0.0.1:37123".

---

## Step 2 - Install the browser extension

Follow **2a** for Chrome or Edge, or **2b** for Firefox.

### 2a - Chrome / Edge

1. Unzip `jaspidian-extension-vX.Y.Z.zip` (from the release zip) somewhere you won't accidentally delete it (e.g. `C:\Tools\jaspidian-extension`).
2. Open Chrome (or Edge) and go to **`chrome://extensions/`** (or `edge://extensions/`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **"Load unpacked"**.
5. Select the folder you unzipped in step 1.
6. Click the **puzzle-piece icon** (🧩) in the toolbar, find **"Jaspidian"**, and click the **pin icon** so it stays visible.

### 2b - Firefox (142 or newer)

The Firefox build ships as an `.xpi` file (`jaspidian-firefox-vX.Y.Z.xpi`) that has been **signed by Mozilla**. Drag-install it once and it persists across restarts:

1. Open Firefox.
2. Drag `jaspidian-firefox-vX.Y.Z.xpi` onto any Firefox window.
3. Approve the install prompt.
4. Pin the toolbar icon: right-click the toolbar → **Customize toolbar** → drag the Jaspidian icon into place.

---

## Step 3 - Use it

1. Open **Facebook** in your browser and scroll to a post you want to save.
2. Click the **Jaspidian** icon in the toolbar.
3. The popup should show a green dot (= the plugin is reachable). If you see a red dot, make sure Obsidian is open with Jaspidian enabled, then click Retry.
4. Click **"Scan this page"**.
5. Uncheck any posts you don't want.
6. Pick a **comment mode**:
   - **OP answered** *(default)* - only comment threads where the original poster replied
   - **OP only** - only comments from the original poster
   - **All** - every visible comment
7. Click **"Export selected"**.
8. Switch back to Obsidian - your notes are in the **Facebook** folder, organised by year and group.

---

## Where notes are saved

```
<Your vault>/Facebook/<year>/<group or author>/<post-slug>.md
```

Images go to:

```
<Your vault>/Facebook/_attachments/<post-slug>/
```

You can change the folder pattern in the extension's **Options** page (⚙ in the popup).

---

## Troubleshooting

**Red dot in the popup / "Plugin isn't responding"**
> Open Obsidian, go to Settings → Community plugins, and make sure Jaspidian is enabled. Then click Retry in the popup.

**"Couldn't find any posts on this page"**
> Scroll on the Facebook page so posts have loaded, then scan again. Best results on feeds, groups, and permalinks.

**A note saved but images are missing**
> Some Facebook image URLs expire quickly. Export sooner after scanning. If a specific image keeps failing, open it on Facebook directly first.

**The extension disappeared from Chrome**
> Chrome occasionally disables developer-mode extensions. Go to `chrome://extensions/` and re-enable it.

**The extension disappeared from Firefox after restart**
> Temporary add-ons are removed when Firefox restarts. Reload it via `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…". This is unavoidable until an AMO-signed build is available.

**Need to use a bearer token?**
> The Jaspidian plugin can require a token if you want extra protection on the loopback port. In the plugin's settings inside Obsidian, set a token. Then in the extension's Options page, paste the same token in the "Obsidian plugin auth token" field.

---

## Updating

When a new version is released:

1. Replace `main.js` and `manifest.json` in `<vault>/.obsidian/plugins/jaspidian/` with the new versions
2. Replace the contents of your browser-extension folder with the new build
3. In `chrome://extensions/` (or `about:debugging#/runtime/this-firefox`), find Jaspidian and click the **refresh icon** (↺ on Chrome, **Reload** on Firefox)
4. Restart Obsidian to reload the plugin
