# Blockfort UI kit

Plain HTML / CSS / JS. No build step, no dependencies. Open `index.html` (playground) or `gallery.html` (every component with copy-paste snippets).

```
assets/            cropped PNGs (transparent), grouped: buttons, panels, plates, icons, islands, misc
assets/sheets/     your 3 original sprite sheets
assets/manifest.json   name, size and source rectangle of every crop
css/blockfort.css  all components
js/blockfort.js    modals, dialogs, tabs, selection, enable/disable, toasts
crop.py            re-runs the cropping from the original sheets (needs Pillow + numpy)
```

## Use it
```html
<link rel="stylesheet" href="css/blockfort.css">
<script src="js/blockfort.js"></script>
```
Keep `css/` and `assets/` side by side (CSS uses `../assets/...`).
Add class `bf` to `<body>` if you want the box-sizing reset.

## Open / close (no JS needed)
`data-bf-open="#id"`, `data-bf-close`, `data-bf-toggle="#id"`, `data-bf-static` (on the overlay: blocks Esc/backdrop close).
Esc, backdrop click, focus trap, scroll lock and auto-shrink on small screens are built in.

## JS API
`BF.open/close/toggle/closeAll` · `await BF.dialog({title,message,buttons})` · `await BF.confirm(msg)` · `BF.toast(msg)` · `BF.setEnabled(el,bool)` · `BF.select(el)`
Events: `bf:open`, `bf:close`, `bf:select`, `bf:tab`.

## Notes
- Text is NOT baked into the art, so any label fits. `bf-btn--plain`, plates, panels, rows are 9-slice and grow to any size.
- Icon buttons (build/mail/remove/home) have their icon baked into the PNG; `btn-plain.png` is a clean version I made by painting the icon out.
- The gray placeholder areas in your small panels were made transparent (`bf-frame`).
- The 建筑 ("Buildings") banner has Chinese text baked into the art.
- Font: Lilita One from Google Fonts (needs internet), falls back to rounded system fonts. Change `--bf-font`.

## QBLOCK additions
- `qblock.html` — game HUD + windows: Shop (tabs), Island upgrade, Backpack, Quests, Daily rewards, Settings. Star coin is the only currency.
- **Font:** download InterDisplay-SemiBold.otf and put it in `fonts/` (the CSS loads it from there). Until then it falls back to Inter / system UI.
- New classes: `bf-xp`, `bf-bar`, `bf-price`, `bf-blk` (block swatch), `bf-hotbar`, `bf-toggle`, `bf-range`. Currency icon: `<i class="bf-icon bf-icon--coin">` (big: add `bf-icon--lg`).
