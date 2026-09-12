# Vendored libraries

All third-party code used at runtime is vendored here and committed to the
repo so the page works offline and behind locked-down corporate networks
(no CDN requests at runtime).

| File | Library | Version | License | Source |
|---|---|---|---|---|
| `qrcode.js` | qrcode-generator (Kazuhiko Arase) | 1.4.4 | MIT | https://github.com/kazuhikoarase/qrcode-generator |
| `jspdf.umd.min.js` | jsPDF | 2.5.1 | MIT | https://github.com/parallax/jsPDF |
| `html2canvas.min.js` | html2canvas | 1.4.1 | MIT | https://github.com/niklasvh/html2canvas |

Downloaded via `npm pack <name>@<version>` and copied out of the resulting
tarball's `dist/` (or package root for qrcode-generator) — no build step is
required to use them, they are loaded directly as classic `<script>` tags.

The self-hosted Arabic/Latin font (`assets/fonts/`) is IBM Plex Sans Arabic,
obtained the same way from the `@fontsource/ibm-plex-sans-arabic` npm package
(SIL Open Font License — see `assets/fonts/OFL-LICENSE.txt`).

`assets/hala-logo.svg` is the client-provided HALA logo vector, inlined into
the DOM as `<svg><path fill="currentColor">` so it can be recolored per
instance (wordmark vs. band watermark) and stays crisp at print resolution.
