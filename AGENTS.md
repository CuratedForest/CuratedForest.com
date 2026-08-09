# AGENTS.md

Workflow guide for coding agents (Cline, Cursor, Codex, Claude Code, …)
working on **CuratedForest.com**. Read `README.md` first — it covers the
project overview, tech stack, and repository layout. This file focuses
on **how to make changes without breaking things**.

> Human contributors: `README.md` is the friendlier starting point.
> This file assumes you've read it.

---

## Golden rules (read before touching anything)

- **Never edit the theme module directly.** The `github.com/onweru/compose`
  theme is consumed as a Hugo Module (see `go.mod`), not a submodule. Override
  by creating a file at the same relative path under `layouts/`, `assets/`,
  or `static/` in this repo.
- **Never hand-edit `resources/_gen/`.** It's the SASS build cache; delete the
  whole directory if it looks stale and Hugo will rebuild it.
- **Never edit generated icon/logo/favicon PNGs directly.** They are produced
  from `static/images/icons.png` by `scripts/split_icons.py`. Edit the source
  sheet, rerun the script.
- **Front matter is YAML, not TOML.** `_index.md` = section landing page;
  `index.md` = single-page bundle with sibling assets.
- **All raster/vector images are Git LFS tracked** per `.gitattributes`
  (jpg/jpeg/png/gif/webp/svg). `git lfs install` before committing images.
- **Hugo version is pinned** in `netlify.toml` (`HUGO_VERSION = "0.151.0"`).
  Version drift is the most common CI break — match it if you ever run Hugo
  locally.
- **Do NOT remove `JSON` from `outputs.home`** in `hugo.yaml`. `layouts/index.json`
  emits the Fuse.js search corpus; without JSON output the front end fetches
  the 404 HTML page and search dies with `Unexpected token '<'`.
- **Do NOT unquote `"on": true`** under `params.search`. YAML 1.1 turns the
  bareword `on` into a boolean key and the theme's `site.Params.search.on`
  lookup silently misses.
- **Do NOT set `params.iconsPath`.** The theme uses that to locate SVG glyphs
  under `static/icons/`; the favicon path is separately hardcoded to
  `favicons/`. Setting it breaks one or the other.
- **This env has no `hugo` binary.** Assume you cannot preview locally. Rely
  on careful reading, Netlify's build for verification, and the diagnostics
  cheat sheet at the bottom of this file.

---

## Where to make each kind of change

A decision table so you can jump straight to the right file.

| I want to… | Edit here | Notes |
| --- | --- | --- |
| Add a docs page | `content/<section>/<slug>/index.md` (page bundle) or `content/<section>/<slug>.md` | Set `title`, `weight` (lower = higher in sidebar), `draft: true` until ready. Parent section must have an `_index.md`. |
| Add a top-level section | `content/<name>/_index.md` **and** append `<name>` to `params.docSections` in `hugo.yaml` | Keep the leading `""` in `docSections` — it's what keeps the home page's sidebar rendering. |
| Add a sub-section | `content/<section>/<sub>/_index.md` | Add `weight` in the `_index.md` front matter to order it in the sidebar. |
| Change nav / any layout | `layouts/_partials/<same-path-as-theme>.html` | Discover the theme's version by running `hugo mod vendor` on a machine that has Hugo, or read from `github.com/onweru/compose` on GitHub. Delete `_vendor/` afterwards; do not commit it. |
| Inject `<head>` or scripts | `layouts/partials/hooks/head.html` / `layouts/partials/hooks/scripts.html` | Prefer these hook partials over cloning `baseof.html`. |
| Change CSS | `assets/sass/_custom.sass` (and its `@import`ed partials, e.g. `_mobile-nav.sass`) | The theme's `main.sass` only imports `custom`; new SASS files must be `@import`ed from `_custom.sass`. |
| Change JS | `assets/js/custom.js` | Auto-bundled by the theme's scripts partial when this file exists. |
| Change icons / favicons / nav logo | Edit `static/images/icons.png` source sheet, then run `python scripts/split_icons.py` | Manual step, not part of `hugo`. Requires Pillow. Overwrites `static/images/icons/`, `static/favicons/*`, and `static/images/logo.png`. |
| Change search behavior | `layouts/index.json` (Fuse corpus); search UI lives in the theme | Do not delete `layouts/index.json`. |
| Change dark-mode enforcement | **Three files must move together:** `hugo.yaml` (`enableDarkMode`, `defaultLightingMode`), `layouts/_partials/mode.html`, and the `forceDarkMode()` IIFE in `assets/js/custom.js` + the `.color_choice { display: none }` block in `assets/sass/_custom.sass` | Miss one and returning users get stuck in the wrong mode. |
| Update the theme or a Hugo Module | `hugo mod get -u ./...` then `hugo mod tidy` | Never `git submodule` — this repo does not use submodules for the theme. |

---

## Content authoring conventions

- **Cross-page links:** use `{{< ref "path/to/page" >}}` shortcode. Never raw
  relative `.md` links (they 404) and **never Obsidian `[[wikilinks]]`** — Hugo
  does not resolve them. If you see wikilinks in existing content, they are
  bugs; convert them.
- **Front matter fields we use:** `title` (required), `weight` (sidebar sort;
  lower = higher), `draft` (bool), `date` (optional).
- **Every section directory needs an `_index.md`** or it won't render in the
  docs sidebar hierarchy.
- **Page bundles** (folder with `index.md`) are preferred whenever a page has
  its own images — keeps assets colocated with content.
- **Images:** place under a page bundle or `static/`, reference by path. LFS
  applies automatically per `.gitattributes`. `images/logo.png` is the nav
  logo (do not edit by hand; see icons step above).
- **Shortcodes in-repo** (`layouts/_shortcodes/`):
  - `gallery` — responsive grid of thumbnails with a CSS-only lightbox.
    Use this for any multi-image display so the styling stays consistent.
  - `examples`, `all-examples` — used by the label-based-features docs.
  - `drafts` — lists links to all draft pages ordered by Lastmod desc.
    Only renders content in `-D` builds; used by
    `content/search/drafts.md` (itself `draft: true`, so it never
    publishes to prod).
  - `todos` — lists links to all pages with a `todo:` front-matter entry,
    showing the note text, ordered by Lastmod desc; used by
    `content/search/todo.md` (also `draft: true`).
  - `recent` — lists links to all non-draft pages ordered by Lastmod desc
    (git-derived via `enableGitInfo`); used by `content/search/recent.md`.
- **Draft deployment (curatedforest.farm):** a second Netlify deploy builds
  with drafts enabled. Sidebar links to draft pages get a `.draft` class in
  `layouts/_partials/sidebar.html` and render cyan (`#42CAD7`) via an
  `!important` rule in `_custom.sass` (the `.active` orange rule still wins
  via higher class specificity). Links inside the `drafts` shortcode list
  are painted the same cyan via `.draft-list a`.
- **Drafts:** Netlify runs plain `hugo` (no `-D`), so `draft: true` pages
  will not publish. Remove the flag when a page is ready to go live.

---

## Nav breadcrumb

`layouts/_partials/nav.html` renders a 1-level breadcrumb in the middle of
the top nav (`.nav_breadcrumb` in `_custom.sass`):

- Home: `The Curated Forest`; top-level page/section:
  `<Title> | The Curated Forest`; deeper pages: `<top section> | The
  Curated Forest` (uses `.FirstSection`).
- Styled to match the page `<h1>` it replaces (200%, weight 500,
  `--text`) on the standard blurred translucent panel.
- Because it shows the title, `layouts/_partials/document.html` skips the
  visible `<h1>` on the home page and top-level pages/sections
  (`and .Parent (not .Parent.IsHome)`); deeper pages keep their `<h1>`
  since the breadcrumb only names the top section.
- The nav grid is re-proportioned at ≥992px to mirror the content grid
  (`calc((100% - 2rem) * 0.285714) 1fr auto`, 25px padding, 2rem column
  gap) so the breadcrumb's left edge aligns with the content block's;
  breadcrumb hidden below 992px (drawer nav).

---

## The per-page Table of Contents

`layouts/_partials/document.html` renders a single unified TOC on every
non-home page that has one (`.page-toc` in `assets/sass/_custom.sass`):

- Rendered as the **first child** of `<main class="content">`, before
  the `<h1>`. Ordering matters — `float: right` only affects siblings
  that come *after* the floated element in source order, so the TOC has
  to precede the heading and body.
- Always expanded. No `<details>` / `<summary>`, no per-section
  branching.
- On viewports ≥ **900 px**: `float: right`, `width: 14rem` (capped at
  `max-width: 40%`), with `shape-outside: margin-box` so article text
  hugs the rounded translucent panel.
- On narrower viewports: renders full-width above the article as a
  plain block (no float) — floating would starve the body of column
  width and a sticky panel would collide with the mobile sidebar
  drawer.
- `.content .pager` has `clear: both` so the prev/next pager at the
  bottom of the article never floats alongside a tall TOC.
- Colors: all TOC links are plain text color; a scroll-spy in
  `assets/js/custom.js` (`setupPageTocSpy`) adds `.active` to the link
  whose heading is in view, turning it green (`var(--theme)`). The
  theme's own scroll-spy only covers the sidebar TOC, not this one.
  The link rules are written as `.content .page-toc a` on purpose: the
  theme's `.content a:not(.button)` (specificity 0,2,1) colors every
  link in `<main class="content">` green, and a bare `.page-toc a`
  (0,1,1) loses to it.

`hugo.yaml` bounds the TOC entries to h2–h4
(`markup.tableOfContents.startLevel: 2`, `endLevel: 4`).

**Redesigning the TOC?** Edit `layouts/_partials/document.html` and the
`.page-toc*` rules in `assets/sass/_custom.sass` together. Both live in
this repo — no theme override to worry about.

---

## Sidebar behavior (custom.js)

`assets/js/custom.js` decorates the theme's docs sidebar with collapsible
sections. The rules it hard-codes:

- Depths ≥ 4 auto-collapse on load.
- Sections with `autoshrink: true` in their `_index.md` front matter
  auto-collapse at any depth (currently About, Kubernetes, Running
  Software, and the Shared and Productivity stacks under Software
  Stacks). The
  partial renders an `.autoshrink` class on the section's `.aside_inner`;
  `custom.js` adds `.collapsed` when it sees it. Only the marked group
  itself shrinks — descendants follow their own depth/flag rules.
- The active page's ancestor `.aside_inner` chain is force-expanded and
  each ancestor `.section_title` gets `.active` (so the whole breadcrumb
  lights up orange — the sidebar's active color, see the color rules at
  the top of the depth-styling block in `_custom.sass`).
- Depth 0 (site root, "The Curated Forest") is excluded — no chevron,
  never collapses.

Sidebar link colors live at the top of the depth-styling block in
`assets/sass/_custom.sass`: root title + tier-1 + tier-2 entries are
green (`var(--theme)`), tier 3+ inherit the default text color, and
`.active` is orange. The green rules use exact-depth child selectors
anchored at `.aside` on purpose — descendant selectors like
`.aside_inner .aside_inner` match every level below the root and leak
green into tier 3+.

**If you restructure the tree deeper than 4 levels or change the number
of top-level sections, revisit both:**

1. `assets/js/custom.js` (depth thresholds).
2. `assets/sass/_custom.sass` — the `.aside_inner .aside_inner …` depth
   blocks only handle up to 4 nested levels; add another block for level 5.

---

## Theme / module updates

- `hugo mod get -u ./...` then `hugo mod tidy`.
- To inspect the current theme source (useful when adding an override):
  `hugo mod vendor` writes `_vendor/`; look under
  `_vendor/github.com/onweru/compose/`. **Delete `_vendor/` when done — do
  not commit it.**
- After a bump, re-diff the theme's partials against every file in
  `layouts/`. If a partial you override changed upstream, port the diff
  into your override; otherwise your override silently regresses new
  theme features.

---

## Deployment (Netlify)

- Builds on push to `main`: `hugo` → `public/`.
- `HUGO_VERSION` in `netlify.toml` **must** be kept in sync with the version
  the site actually requires (extended edition, for SASS). Version drift is
  the #1 CI break.
- Netlify site settings must have **Git LFS fetch enabled** — otherwise
  LFS-tracked images publish as ~130-byte pointer files.
- Build command: `hugo`. Publish dir: `public`. Do not change without a
  reason.

---

## Diagnostics cheat sheet

Match the symptom, jump to the fix.

| Symptom | Likely cause |
| --- | --- |
| Search returns `Unexpected token '<'` in the browser console | `outputs.home` in `hugo.yaml` lost `JSON`, or `layouts/index.json` was deleted. |
| Pages under `content/search/` render the search UI instead of their content | Pages inherit `.Type` from the section name ("search") and match `layouts/search/single.html`. Set `type: docs` in the page's front matter. |
| Home page has no sidebar | `params.docSections` in `hugo.yaml` missing the leading `""`. |
| Flash of light-mode on load, or stuck in light mode | One of the three dark-mode enforcement points is out of sync (see decision table above). |
| `hugo` build error: `ref "…" not found` | `{{< ref >}}` target path is wrong. Path is relative to `content/`, without the `.md`. |
| Deep sidebar looks flat past level 4 | `.aside_inner` depth rules in `_custom.sass` cap at 4; add another nested block. |
| Netlify build fails after `hugo mod get -u` | `HUGO_VERSION` in `netlify.toml` older than the theme's new minimum — bump it. |
| Favicon or nav logo looks wrong after commit | Someone edited generated PNGs directly instead of re-running `scripts/split_icons.py`. |
| Homepage links look like `[[Something]]` in output | Obsidian wikilinks were committed; Hugo doesn't resolve them. Convert to `{{< ref >}}`. |
| Images publish as tiny text files on Netlify | LFS fetch disabled on the Netlify site. |
| Sidebar chevron appears on the site root | Depth-0 exclusion in `custom.js` broke — check `depthOf()` logic. |

---
