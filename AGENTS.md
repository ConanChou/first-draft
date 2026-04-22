# Writing-First Site — Agent Orientation

## What this is

Writing-first personal site. One author. Markdown in iA Writer → one command → site ships.
Not a CMS. Markdown files are canonical. Site is derived.

**Full spec:** `docs/project.md`

---

## Quick orientation

| Layer | Choice |
|-------|--------|
| SSG | Astro 6 |
| Styling | Tailwind CSS v4 plus hand-written global CSS (warm minimal palette, dark mode via `prefers-color-scheme`) |
| Content source | iA Writer library (iCloud), exposed as `src/content` symlink and verified by `fetch` |
| Output | Static HTML → GitHub Pages (public repo, separate from source) |
| Scripts | Node ESM (`scripts/`), shared lib at `scripts/_lib.mjs` |
| Micropub server | Zig stdlib, `scripts/micropub-server/src/main.zig` |

### Repo layout (source)

```text
site/
  src/
    layouts/Base.astro       # HTML shell, preferred-lang handling, fixed logo + footer
    pages/
      index.astro            # home listing
      [...slug].astro        # post + folder pages
      tags/                  # tag pages + markdown siblings
    lib/
      content.ts             # loadAllEntries(), front matter parsing
      render.ts              # marked → HTML, strips leading h1
      markdown.ts            # #hashtag rewriting
      routes.ts              # getStaticPaths()
    styles/global.css        # all CSS (design tokens, layout, entry list, post)
  scripts/
    _lib.mjs                 # shared: env, FM parse/stringify/template, slugify, date, walkMd
    draft / translate / publish / link / fetch / build / deploy
    micropub                 # lifecycle wrapper (install/start/stop/status/logs)
    micropub-server/         # Zig signal server
  src/content                # gitignored symlink to iA Writer library
  docs/project.md            # full product spec
```

### Filename convention

`NNNN[-slug][.lang].md` — e.g., `0042-on-writing-well.md`, `0042-writing-well.en.md`.

- 4-digit zero-padded ID is globally unique and immutable.
- Default lang (`zh`) carries no suffix; other langs get `.<code>` suffix.
- Translations share the same ID.

### Publishing flow (two paths, never cross)

**A. CLI:** `draft` → write in iA → `publish <id>`  
**B. Micropub:** write in iA → iA's Publish menu → local Micropub server → shells out to `publish --title "..."`

`publish` does: rename file, fill front matter, `fetch` → `build` → `deploy`.

---

## Code Quality

- naming should be accurate and descriptive
- always try to reuse existing utilities. If you notice certain patterns emerging, factor out a new utility.

## TDD mandate

**All scripts and major pipeline components use red-green TDD.**

### Scope

TDD applies to:

- Everything in `scripts/` (draft, translate, publish, fetch, build, deploy, micropub lifecycle wrapper)
- `scripts/_lib.mjs` and any shared utilities
- The Micropub server (`scripts/micropub-server/`)
- `src/lib/*.ts` — content loading, rendering, routing

TDD is *not* required for:

- Astro layout/page templates (`.astro` files) — test manually in browser
- CSS / design tokens — test visually

### Workflow

1. **Red** — write a failing test that precisely describes the behavior.
2. **Green** — write the minimum code to pass it. No extras.
3. **Refactor** — clean up without breaking tests. Run linter after refactor (see below).

Never write implementation before a failing test exists for scripts/lib code.

### Test runner

Node's built-in `node:test` + `node:assert`. No Jest, no Vitest, no extra deps.

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
```

Tests live adjacent to the file under test, suffixed `.test.mjs` (scripts) or `.test.ts` (src/lib).

Run all: `node --test scripts/**/*.test.mjs` or `node --test src/lib/**/*.test.ts` (via tsx/ts-node if needed).

### What to test

- **Pure logic**: slugify, parseFrontMatter, stringifyFrontMatter, parseFilename, formatDateISO, firstHeading, scanMaxId
- **Side-effecting scripts**: use a temp dir (`fs.mkdtempSync`) — never touch real iA library or content/
- **Micropub server**: spin up on an ephemeral port, send real HTTP requests, assert responses
- **render.ts**: feed known markdown, assert HTML output (especially h1 stripping, hashtag rewriting)

### Linting (run after refactor)

Run linters for every language/format touched in the current change:

| Target | Tool | Command |
|--------|------|---------|
| TypeScript / JS | `tsc` (type-check only) | `pnpm astro check` (Astro files) or `npx tsc --noEmit` |
| Markdown `.md` | `markdownlint-cli2` | `npx markdownlint-cli2 "**/*.md" "#node_modules"` |
| CSS | (none yet — add `stylelint` if lint errors grow) | — |
| Zig | `zig fmt` | `zig fmt src/` |
| Shell scripts (bash/sh only) | `shellcheck` | `shellcheck scripts/build scripts/deploy` |
| Node scripts (no extension) | `node --check` | `node --check scripts/draft scripts/translate scripts/publish scripts/fetch scripts/micropub scripts/link` |

Linter errors block the refactor step — fix before marking done. No `// eslint-disable` or `markdownlint-disable` without a comment explaining why.

### What NOT to test

- `astro build` output (integration concern, not unit)
- `deploy` git operations (mock or skip in CI)
- Anything that requires the real iA Writer library to exist

---

## Pending work (Phase 1)

- [x] Sibling output endpoints: `.md` (prose form per spec §5.3) and `.partial.html` per each post/folder/home
- [x] Folder-as-section pages (`/sketch/` renders its own listing)
- [x] ID shortcut routes: `/0042` → canonical slug of active-lang version
- [x] Micropub server (Zig, ~150 lines) + launchd plist + `micropub` lifecycle wrapper
- [x] Tag pages (`/tags/<name>/`, `/tags/`)
- [x] RSS feeds per language (`/feed.zh.xml`, `/feed.en.xml`)

---

## Key decisions already made

- Logo: fixed top-left, SVG, dim "engraving" opacity on idle, full opacity on hover. CSS filter vars: `--logo-filter` / `--logo-filter-dim` (avoids `filter: none` mixing bug).
- Footer: fixed bottom, full viewport width, copyright only.
- Preferred language: set by translation link on post pages. Listing dedupe and `/[id]` redirect read `localStorage`.
- Entry list: uniform `1.3em`, dot leaders (`border-bottom: dotted`), full `li` clickable via `a::after { position: absolute; inset: 0 }`.
- Post body: leading `h1` stripped at render time to avoid duplicate h1 (regex `^\s*#[^#]` handles leading whitespace left by FM parser).
- Warm color palette, dark mode darker bg, muted text: see `src/styles/global.css` design tokens.
- No `filter` on ancestors of `position: fixed` elements (creates stacking context, breaks layout).
