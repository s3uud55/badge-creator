# badge-creator

A single-page web app for HR to fill in an employee's details, upload a
photo, and print or download a ready-to-print employee ID card as PDF or
PNG — no designer needed. Runs entirely in the browser: nothing is uploaded
anywhere, and it keeps working offline or on a locked-down corporate network
(no CDN calls, all fonts and libraries are bundled in this repo).

## Card size

Standard **CR80 / ID-1 portrait ID card — 53.98 mm × 85.6 mm**, with an
optional 3 mm bleed and crop marks for professional print shops.

## Using it

1. Open `index.html` in a browser (works straight from disk, or hosted on
   GitHub Pages — see below).
2. Fill in the form on the right: brand name/logo/color, employee name,
   department (Arabic + English), and employee ID.
3. Upload a photo — drag it into the photo frame or use the file picker.
   After uploading, drag the photo inside its frame to reposition it and use
   the zoom slider to crop it in, since photos are never auto-cropped.
4. The QR code defaults to the employee ID; override it with any text or URL
   if needed.
5. Optionally turn on "علامات القص والحواف" (bleed + crop marks) for print
   shop files, or hide the lanyard-slot guide.
6. Use one of the three buttons:
   - **طباعة (Print)** — prints only the card at exact physical size
     (`@page` set to 53.98mm × 85.6mm, or larger with bleed on). Sharpest
     output since it stays vector text, not a raster.
   - **تنزيل PDF** — a PDF sized to the exact card dimensions, rendered at
     300+ DPI.
   - **تنزيل PNG** — a 300+ DPI PNG raster of the card.

The brand name, logo, and brand color are remembered in the browser
(`localStorage`) so HR doesn't have to re-enter them each time. Employee
names, department, ID, and photos are **never** stored — they reset on
reload.

## Publishing to GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. In the repo's **Settings → Pages**, set the source to **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) deploys the repo
   root automatically on every push to `main`, and can also be run manually
   from the Actions tab (`workflow_dispatch`).

## Project layout

```
index.html          the app shell (form + preview)
style.css            layout, card design, print rules
app.js               all logic: state, color derivation, photo pan/zoom,
                      QR rendering, PDF/PNG/print export
vendor/               vendored third-party libraries (see vendor/README.md)
assets/fonts/         self-hosted IBM Plex Sans Arabic font (Arabic + Latin), OFL license
assets/hala-logo.svg  client logo vector (inlined as <svg><path> for recoloring)
```

## Customizing for another brand

Everything about the visual identity is editable from the form: brand name,
logo image, and brand color. The mint side-band and the Arabic label/value
colors are all derived automatically from the picked brand color, using the
same relationships the default HALA palette expresses, so the same template
can be reused for other departments or companies. QR modules always stay a
fixed near-black regardless of brand color, to protect scan contrast.
