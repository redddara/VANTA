# Hacking Practice

## Store & Ammunation (what you want)

Open **`store-and-ammunation/`** — it works as a standalone folder (copy anywhere).

- Double-click **`store-and-ammunation/OPEN.bat`**
- Or **`store-and-ammunation/index.html`**
- Or double-click **`OPEN.bat`** in this folder (shortcut to the above)

## Why the old page was empty

The previous root `index.html` used JavaScript modules that do not run when you double-click a file in the browser. The launcher now sends you to the working practice pack.

## Netlify

Deploy the **`store-and-ammunation`** folder — see `store-and-ammunation/README.md` for step-by-step.

Quick version: zip the contents of `store-and-ammunation`, drag it onto [Netlify manual deploy](https://app.netlify.com/drop).

## Other minigames (optional)

The `js/games/` folder has generic tablet minigames. Those need a local server:

```bash
npx serve .
```

Then open the URL shown — modules will load correctly.
