# README.md
Guidance for assistants working in this repository. Primarily for AI

## Project overview
CuratedForest.com is the static website for "The Curated Forest" — documentation
of an open-source technology stack (Home Assistant, ESPHome, TimescaleDB, Grafana,
Kubernetes/k3s, Immich, Kopia, SeaweedFS) and related plant/aeroponics content.
It is a **documentation site**, dark-themed only. Content is authored in Markdown;
the site is generated with Hugo.

## Tech stack
- **Generator:** Hugo (extended edition required for SASS). **Pinned to v0.151.0**
  (see `netlify.toml`). Use this version locally to match CI.
- **Theme:** `github.com/onweru/compose` — a Hugo docs theme with Fuse.js search,
  consumed as a **Hugo Module** (NOT a git submodule). See `go.mod` / `go.sum`.
- **Extra module:** `github.com/lkhrs/hugo-dark-visitors`.
- **Config:** single `hugo.yaml` at repo root (YAML — not TOML, no `config/` dir).
- **Hosting:** Netlify (`netlify.toml`: `command = "hugo"`, `publish = "public"`).
- **Language mix:** HTML (layout overrides), Sass, Python (build script), JS.
- **License:** AGPL-3.0.

## Repository layout
- `content/` — Markdown content. Two doc sections: `tech/` and `plants/`.
  Section landing pages are `_index.md`; the home page is `content/_index.md`.
- `layouts/` — project overrides of the compose theme (unified filesystem: a file
  here at the same path overrides the theme's copy). Notable overrides:
  - `layouts/index.json` — renders the Fuse.js search index (REQUIRED, see gotchas).
  - `layouts/_partials/mode.html` — removes the light/dark toggle from the nav.
- `assets/` — pipeline inputs. `assets/sass/_custom.sass` (custom CSS incl. hiding
  the mode toggle + nav logo sizing) and `assets/js/custom.js` (clears stale
  dark-mode localStorage). Compiled output is cached in `resources/_gen/`.
- `static/` — copied verbatim. `static/icons/` holds theme SVG glyphs
  (info/sun/moon/next.svg); `static/favicons/` holds favicons; `images/logo.png`
  is the nav logo.
- `scripts/` — Python tooling. `scripts/split_icons.py` generates the 256×256
  `images/logo.png`. Run manually when the logo/icon source changes; not part of
  the Hugo build.
- `archetypes/` — front-matter templates for `hugo new`.
- `hugo.yaml`, `netlify.toml`, `go.mod`, `go.sum`, `.gitattributes`.

## Common commands
- Local preview:            `hugo server`
- Preview incl. drafts:     `hugo server -D`
- Debug module/asset cache: `hugo server --disableFastRender --gc`
- Production build:         `hugo` (outputs to `public/`)
- New content page:         `hugo new tech/<topic>/_index.md`
- Update theme/modules:     `hugo mod get -u ./...`  then  `hugo mod tidy`
- Inspect theme source:     `hugo mod vendor`  (writes `_vendor/`; delete when done)
- Dependency graph:         `hugo mod graph`
Requires the **extended** Hugo build (SASS) and Go installed (for `hugo mod`).

## Content conventions
- Front matter is **YAML**. Common fields: `title`, `weight` (controls sidebar /
  list ordering — lower = higher). Mark work-in-progress with `draft: true`.
- Sections live under `content/tech/` and `content/plants/`. Each section and
  sub-section needs an `_index.md` for the docs sidebar hierarchy to render.
- To add a section to the docs (sidebar + pager) layout, add it to
  `params.docSections` in `hugo.yaml` (currently `["", tech, plants]`; keep the
  leading `""` so the home page keeps its sidebar).
- Images: place under `static/` (or a page bundle) and reference accordingly.
  **All raster/vector images are Git-LFS tracked** (see `.gitattributes`:
  jpg/jpeg/png/gif/webp/svg). Install Git LFS before committing images.

## Theme / layout customization
- **Do not edit the theme module directly.** Override by creating a file at the
  same relative path under `layouts/` or `assets/` in this repo.
- Prefer compose's hook partials for head/script injection:
  `layouts/partials/hooks/head.html` and `layouts/partials/hooks/scripts.html`.
- Custom styling → `assets/sass/_custom.sass`; custom JS → `assets/js/custom.js`.
- To browse the theme's real source for reference, run `hugo mod vendor` and look
  in `_vendor/github.com/onweru/compose/`.

## Deployment
- Netlify builds on push: `hugo` → `public/`.
- Hugo version is pinned via `HUGO_VERSION` in `netlify.toml`. **Keep it in sync
  with your local Hugo version** — version drift is the most common build failure.
- Netlify must have Git LFS fetch enabled so LFS-tracked images are present at build.

## Gotchas
- **Search depends on JSON output.** `hugo.yaml` must keep `JSON` in
  `outputs.home` (`[HTML, RSS, JSON]`) so `layouts/index.json` emits `/index.json`.
  Remove it and search breaks with `Unexpected token '<'` (front end gets a 404
  HTML page instead of the index).
- **Dark-mode-only is enforced in three places**, all of which must stay aligned:
  `params.enableDarkMode: true` + `params.defaultLightingMode: dark` in `hugo.yaml`,
  the `layouts/_partials/mode.html` override, and the CSS in `_custom.sass` +
  the localStorage-clearing `assets/js/custom.js`.
- **`params.search.on` is quoted** (`"on": true`) on purpose: unquoted `on` is a
  YAML 1.1 boolean and breaks the theme's `site.Params.search.on` lookup.
- **Do NOT set `params.iconsPath`** — the theme uses it to locate SVG glyphs under
  `static/icons/`, separate from the hardcoded `favicons/` path.
- **Theme updates use Hugo Modules, not submodules:** `hugo mod get -u`, never
  `git submodule`.
- **`go.mod` module path** is `github.com/OwnYourIO/SpencersLab/sites/help`
  (inherited/borrowed) — this is just the module identifier and does not affect
  builds; leave it unless intentionally renaming.
- `scripts/split_icons.py` is a manual asset-prep step, not part of `hugo`.