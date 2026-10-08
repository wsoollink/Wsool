# Marketing site design (approved by the owner)

Copied from the owner's Claude design canvas "وصول — الموقع الرئيسي"
(https://claude.ai/artifact/56qSec4XDMeGS7zsZ3Mdcx) on 2026-10-08. The canvas is the source of
truth; this folder is a snapshot so every session can read it.

- `Main.dc.html` = Home, desktop, Arabic. `Home-mobile.dc.html`, `Home-en.dc.html`,
  `Home-mobile-en.dc.html` = the other variants.
- `Pricing*.dc.html` = Pricing page. `State-404*`, `State-500*`, `State-private*` = error and
  hidden-page states.
- `canvas.json` = artboard list (sizes, titles).
- `assets/<id>.<ext>` = the images the artboards reference as `/_blob/<id>` (logos, platform
  icons, sample photo, social icons used as CSS masks).
- The fonts (GT America Arabic, Menda) are **not** copied: their web license isn't bought yet
  (CLAUDE.md section 4). The site keeps the free fallbacks behind `--font-text` / `--font-numbers`.
