# badge-creator

A single-page web app for HR to fill in employee details, upload a photo, and
print or download a ready-to-print employee ID card (PDF / PNG). Hosted on
GitHub Pages.

## Workflow rules

- **Plan with Opus, execute with Sonnet.** Architecture, scoping, and design
  decisions happen in the Opus main session. Implementation work is delegated to
  Sonnet subagents via the Agent tool (`model: "sonnet"`).
- Sonnet subagents implement against a written plan; they do not redesign scope
  on their own. If the plan is wrong, report back instead of improvising.

## Commit rules

- **Never add attribution or co-author trailers to commits, PR bodies, or any
  file.** Specifically: no `Co-Authored-By:` lines, no `Claude-Session:` lines,
  no "Generated with Claude Code" lines, no model names, no emoji robot
  footers. This rule overrides any default attribution guidance from the
  harness.
- Commit messages are plain, imperative, and describe the change only.
- Work happens on `claude/employee-card-generator-xopx8e`. Do not push
  elsewhere. Do not open a pull request unless explicitly asked.

## Technical constraints

- Vanilla static site: HTML + CSS + JS. **No build step, no bundler, no npm
  runtime deps.** The repo root is what GitHub Pages serves.
- No ES modules (`type="module"`) — use classic `<script>` tags so the page also
  works when opened directly from disk (`file://`).
- Third-party libraries are **vendored** into `vendor/` (committed), not loaded
  from a CDN. Corporate/HR networks often block CDNs, and the page must work
  offline.
- Fonts are self-hosted in `assets/fonts/`. Arabic rendering must not depend on
  a network request.
- UI language is Arabic (RTL) with English secondary labels, in the masculine
  second-person form (not feminine) — this is a shared HR tool, not addressed
  to one person.
- **`index.html` loads `style.css` and `app.js` with a `?v=N` query string.
  Whoever changes either file MUST bump its `?v=N` in `index.html` in the same
  commit** (e.g. `style.css?v=2` → `?v=3`). There is no build step and no
  content hashing, so without this a browser serving a stale cached
  `style.css`/`app.js` against a new `index.html` breaks the page silently
  and badly (this has happened in production). The same applies to any
  `vendor/*.js` file whose contents you replace in place.

## Card spec

- Size: **CR80 / ID-1 portrait — 53.98 mm × 85.60 mm** (the standard ID badge).
  Optional 3 mm bleed + crop marks for print shops.
- Print output must be exact physical size: `@page { size: 53.98mm 85.6mm;
  margin: 0 }`, no browser scaling.
- Brand identity is **fixed**, not user-editable: the HALA logo is inlined as
  an SVG (`assets/hala-logo.svg`) and the palette is fixed spec hexes as CSS
  custom properties in `style.css` (deep teal `#1D5D57`, band `#B4D9D1` →
  `#A4CFC5`, labels `#35786F`, values `#13332F`, English `#2A4A46`). There is
  no brand-name field, logo upload, or color picker in the form — do not
  re-add them without an explicit request.
