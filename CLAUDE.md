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
- UI language is Arabic (RTL) with English secondary labels.

## Card spec

- Size: **CR80 / ID-1 portrait — 53.98 mm × 85.60 mm** (the standard ID badge).
  Optional 3 mm bleed + crop marks for print shops.
- Print output must be exact physical size: `@page { size: 53.98mm 85.6mm;
  margin: 0 }`, no browser scaling.
- Brand defaults (HALA): deep teal `#2E6B63`, mid teal `#6FAFA4`, light mint
  `#A9D3CA`, paper `#F4F8F6`. Brand color and name are user-editable so the
  template is reusable.
