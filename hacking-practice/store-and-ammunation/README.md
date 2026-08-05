# Store & Ammunation Hacking Practice (portable)

**Self-contained folder** — copy `store-and-ammunation` anywhere (USB, Desktop, another PC). No server repo, no internet required.

## Quick start (Windows)

1. Double-click **`OPEN.bat`**  
   — or double-click **`index.html`**

2. Pick a minigame from the menu.

3. **Space** = retry after win/loss · **Esc** = back to menu

Thermite only: open **`thermite.html`** (starts immediately).

## What’s included

```
store-and-ammunation/
  OPEN.bat          ← launch in browser
  index.html        ← main menu (all 4 games)
  thermite.html     ← thermite only
  css/              ← styles
  js/               ← games + jquery (bundled)
  sounds/           ← glitch-minigames MP3s
```

## Minigames

| Game | Job step |
|------|----------|
| Word Crack | Store USB hack |
| Pairs | Store door |
| Circuit Rhythm (45 hits) | Ammunation thermite |
| Circuit Rhythm (unlimited) | Thermite practice — no hit cap |
| Numbered Sequence | Ammunation crate |

## Deploy to Netlify

Upload **this folder** (`store-and-ammunation`) — not the parent `hacking-practice` folder unless you use Git (see below).

### Option A — Drag & drop (easiest)

1. Zip **everything inside** `store-and-ammunation` (index.html, css/, js/, sounds/, etc. at the zip root).
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Deploy manually**.
3. Drop the zip file.
4. Your site URL will be something like `https://random-name-123.netlify.app`.

### Option B — Netlify CLI

```bash
cd store-and-ammunation
npx netlify-cli deploy --prod --dir=.
```

Log in when prompted, then pick **Create & configure a new site**.

### Option C — Git

Push the repo to GitHub/GitLab, connect it in Netlify, and set:

| Setting | Value |
|---------|--------|
| **Base directory** | `hacking-practice` (if repo is the whole server folder) |
| **Publish directory** | `store-and-ammunation` |

`netlify.toml` in this folder is already configured.

## Optional: local server

If audio or minigames act odd in your browser, from this folder run:

```bash
npx serve .
```

Then open the URL shown. Not required on Netlify or for most local use.

## Requirements

- Any modern browser (Chrome, Edge, Firefox)
- No Node, no FiveM, no network after copy

Sounds and jQuery are bundled inside this folder.
