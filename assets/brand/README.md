# Gistio brand assets

## Icons

| File | Use |
|---|---|
| favicon-16 / -32 / -48.png | browser favicon (simplified mark — inner arc + pivot dot removed) |
| icon-64 / -128 / -192 / -512.png | PWA / web manifest, docs site |
| apple-touch-icon-180.png | iOS home screen (no corner radius — iOS masks it) |
| maskable-512.png | Android adaptive icon (`purpose: "maskable"`, mark at 44% for safe zone) |
| addon-logo-96-light.png | Workspace add-on `logoUrl` on white chrome (ink mark) |
| addon-logo-96-teal.png | add-on logo on dark chrome |
| mark-512-{teal,white,black}-transparent.png | slides, docs, print |
| sweep-mark.svg | vector master — uses `currentColor` |
| sweep-mark-small.svg | 16–24px vector — heavier strokes, no inner arc |

Head tags:

```html
<link rel="icon" sizes="32x32" href="/favicon-32.png">
<link rel="icon" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">
```

For `app-scripts/appsscript.json`, point `addOns.common.logoUrl` at the hosted
`addon-logo-96-light.png` and set `layoutProperties` to
`primaryColor: "#111A1F"`, `secondaryColor: "#00C9A7"`.

## Tokens

```
ink        #111A1F   header band, icon ground
surface    #1C2E34   stat bar, panels
elevated   #243840   hover, selected
teal       #00C9A7   brand accent, "cleared"
teal-hi    #00F5CC   hover / active
amber      #F59E0B   "needs attention"
fg         #E8F4F2   text on ink
fg2        #8FB8B2   secondary text on ink
fg3        #4A6B67   captions on ink
```

Type: Outfit 200–400 for the wordmark and display, Inter 400/500 for body and UI.
Wordmark is always lowercase `gistio`, letter-spacing `0.06em`.
Clear space around the mark equals the mark's own height. Minimum wordmark size 13px —
below that use the mark alone.

## Digest email

`DigestHeader.gs` drops into `app-scripts/`. It exposes `digestShellOpen_()`,
`digestSection_()`, `digestRow_()`, `digestShellClose_()` and `digestSubject_()`.
Everything is inline-styled table markup — Gmail strips SVG and most `<style>`
blocks, so the mark ships as a hosted PNG.
