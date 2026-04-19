# Conan.one — Writing-First Personal Hub (v2)

## 1. Purpose

A calm, text-first publishing system for one author. Optimized for writing flow.

Write Markdown in iA Writer. Run one command. Site rebuilds and ships.

Not a CMS. Not a framework showcase. Not a complex content engine.

---

## 2. Core principles

1. **Minimal effort to write and publish.** Publishing friction is the product problem.
2. **iA Writer is the only writing environment.** All other friction absorbed by scripts.
3. **Start simple, add as needed.** No sections, categories, or splits invented in advance — folders carry that weight.
4. **Durable ownership.** Markdown files are canonical. The site is derived.
5. **Readable defaults.** Borrow the typography, calm pace, and CJK-friendly feel of [`cbp.tldr.ink`](/Users/conan/work/cbp.tldr.ink).

---

## 3. Tech stack

| Layer | Choice |
|-------|--------|
| Static site generator | **Astro** |
| Styling | Tailwind CSS (match cbp feel) |
| Content source | External — iA Writer library (iCloud Drive) |
| Built output | Static HTML/CSS/minimal JS |
| Hosting | **GitHub Pages** (public static repo) |
| Source repo | Private — generator code + fetched content cache |

Why Astro:

- file-system-driven content collections map naturally onto the folder-as-section model
- MDX / Markdown rendering with good typography plugins
- easy to produce both full-page HTML and content fragments (for the future explore mode)
- low JS by default (islands), fits zen-mode-first plan

---

## 4. Content model

### 4.1 File source

- Canonical md files live in the **iA Writer library** (iCloud).
- A `fetch` script rsyncs them into the Astro project's `content/` tree at build time.
- The generator repo never hand-edits content.

Path to iA Writer library is configured via `.env`:

```bash
IA_WRITER_PATH="/Users/conan/Library/Mobile Documents/27N4MQEA55~pro~writer/Documents"
```

### 4.2 Filename convention — the numbering system

Inspired by Dijkstra's EWD writings. Every file carries a zero-padded numeric ID as its **filename prefix**. The number is the source of truth for identity.

| Phase | Filename (default lang) | Filename (translation) |
|-------|-------------------------|------------------------|
| Draft | `0042.md` | `0042.en.md` |
| Published | `0042-on-writing-well.md` | `0042-writing-well.en.md` |

Rules:

- 4-digit zero-padded. IDs are globally unique across the whole tree (not per folder).
- No acronym yet; just the bare number. Placeholder until chosen (easy to add later via a config prefix).
- IDs are immutable once assigned.
- **Translations share the ID** — a piece has one ID, multiple language renderings. `draft` never reuses a taken ID; translations are created via the `translate` command instead (see §9.1).
- **Lang suffix**: the default lang (`DEFAULT_LANG`, e.g. `zh`) carries no suffix. Any other lang gets a `.<code>` suffix before `.md`. Scales past two translations: `0042.ja.md`, `0042.fr.md`, etc.
- Slugs may differ per lang (they should — titles translate).

### 4.3 Front matter

Kept deliberately small. Full set:

```yaml
---
title: "On writing well"
date: 2026-04-14T12:00:00-04:00
slug: "on-writing-well"
draft: false
lang: "zh"         # zh | en | …
tags: ["writing", "craft"]
---
```

Rules:

- `title` — filled in by the `publish` script from the first `#` heading if missing.
- `date` — set by `publish` at publish time. ISO 8601 with offset, anchored to `HOME_TZ` (e.g. `2026-04-14T15:30:00-04:00`). See §9.3.
- `slug` — auto-derived from title; manually overridable.
- `draft` — `true` excludes the file from build.
- `lang` — required. Drives the site-wide language switch. If absent, inferred from the filename lang suffix (or `DEFAULT_LANG` if no suffix).
- `tags` — optional. Merged at build time with any inline `#tag` tokens found in the body (see §8). Use front matter for meta tags not naturally mentioned in prose.

No `summary`, no `type`, no `section`, no `series`, no `translations`. Folders carry any grouping that was previously "sections". **Translations are paired implicitly by shared numeric ID** — no front-matter mapping needed.

### 4.4 Folders

A folder is itself a first-class entry.

- A folder at `/sketch/` renders as its own index page.
- It shows **only its direct children** (no recursion). Subfolders appear as entries in the list.
- Optional `index.md` inside a folder:
  - its front matter supplies the folder's `title`, `date`, `lang`, `tags`
  - its body renders as **intro content above** the children list
- Without `index.md`:
  - folder title = folder name
  - folder date = latest `mtime` among contained files (used for sort order in parent listings)

Hidden folders (prefixed with `.` or `_`) are ignored.

### 4.5 Home page

The home page `/` is the top-level folder.

- Lists: top-level `.md` files and top-level folders, together, reverse-chronological by date.
- Each entry is one line: number, title, date.
- Folder entries appear in the same flow as files — no symbol, no section header. (Visual treatment like weight or color can be layered in CSS later if distinction becomes useful.)
- Optional `index.md` at the repo root supplies a site intro above the list.

### 4.6 Sort order

Reverse-chronological by `date` (front matter).

- For a file: its own `date`.
- For a folder: `index.md` date if present, else latest `mtime` of its contents.

---

## 5. URL scheme

### 5.1 Routes

| Resource | URL |
|----------|-----|
| Home | `/` |
| Top-level file `0042-on-writing.md` (zh) | `/0042-on-writing/` |
| Translation `0042-writing-well.en.md` | `/0042-writing-well/` |
| Folder `sketch/` | `/sketch/` |
| File inside folder `sketch/0051-studio.md` | `/0051-studio/` |
| Shortcut by ID | `/0042` → canonical URL of the active-lang version |
| Tag page | `/tags/writing/` |
| Tag index | `/tags/` |
| RSS per language | `/feed.zh.xml`, `/feed.en.xml` |

- Clean URLs, no `.html` extension in canonical path.
- **Flat URL space**: IDs are globally unique across all folders, so sub-folder files use the same flat `/{slug}/` scheme as top-level files. The folder provides organizational structure on disk and in listings, but is not part of the URL.
- Lang is **not** in the URL path. Each lang version has its own slug and its own URL. Active lang switch filters listings; direct URLs always work regardless of current switch state.
- `/0042` short form resolves to the canonical slug URL of the active-lang version. If the active lang has no version of this ID, falls back to `DEFAULT_LANG`.

### 5.2 Per-page output formats

Every post and folder emits **four sibling files** from one source. The home page emits the same minus `.json`.

| Extension | Content | Audience |
|-----------|---------|----------|
| `/slug/` (serving `/slug/index.html`) | full-chrome HTML | humans |
| `/slug.html` | same HTML, explicit-extension alias | humans who type it |
| `/slug.md` | clean markdown (see §5.3) | bots, LLMs, quoters |
| `/slug.partial.html` | rendered body HTML, no layout, stable container | explore-mode shell (Phase 2) |
| `/slug.json` | structured metadata (see §5.4) | explore-mode shell, API consumers |

- `<link rel="canonical">` always points to the clean form (`/slug/`).
- `.html` and `/slug/index.html` are byte-identical.
- GH Pages serves all five as static files; directory `slug/` and sibling files coexist without conflict.
- `.json` is not emitted for the home page — the listing is already in `index.partial.html`.

### 5.3 `.md` output shape

The `.md` endpoint is a **consumption artifact**, not a raw source dump. Front matter is stripped; metadata is rendered as a prose line. This keeps the file readable in any surface (chat UI, terminal, preview), while still trivially machine-parseable.

**Post `.md`:**

```markdown
# On writing well

*2026-04-14 · zh · [#writing](/tags/writing.md) · [#craft](/tags/craft.md)*

See also [my earlier note](/0038-first-steps.md)…

---
*[← Index](/index.md) · Source: https://conan.one/0042-on-writing/*
```

- `# Title` — from front matter `title`.
- Meta line — `YYYY-MM-DD` (date only, TZ dropped), `lang`, tags as markdown links to `/tags/<name>.md`, joined by middle dot ` · `. Omit any field that is empty.
- Body — source markdown with two rewrites:
  - **Inline `#tag` tokens** (see §8) become `[#tag](/tags/<tag>.md)` links.
  - **Internal links** (paths starting with `/`) are rewritten to point at the `.md` sibling of their target (e.g. `/0038-first-steps/` → `/0038-first-steps.md`).
  - External links (absolute URLs) untouched.
  - Code blocks and inline code untouched.
- Trailing `Source:` line — canonical **HTML** URL, matching `<link rel="canonical">`. Bots that prefer the `.md` can swap the path themselves; this line is for attribution to the authoritative page identity.

**Folder / home `.md`:**

Same shape, with an entries section appended. Internal links in the entries list also point to `.md` siblings:

```markdown
# sketch

*2026-04-10*

Folder intro prose (from `index.md` body, if present).

## Entries

- [0051 Studio notes](/0051-studio.md) — 2026-04-10
- [0048 On drawing](/0048-on-drawing.md) — 2026-04-08

---
*[← Index](/index.md) · Source: https://conan.one/sketch/*
```

- If the folder has no `index.md`, drop the title + meta + intro prose; keep only the `## Entries` list and footer. Title falls back to folder name.
- Entry links use flat URLs (see §5.1) — `/0051-studio.md`, not `/sketch/0051-studio.md`.
- Footer includes `[← Index](/index.md)` for discoverability from any entry point.
- Entries list is reverse-chronological, same as the HTML listing.
- Active-language filtering is **not** applied to the `.md` output — bots should see all content regardless of a human's UI switch.

**Deliberately excluded fields from `.md`:** `slug` (in URL), `draft` (always false if published), full ISO timestamp (date-only is enough for reading; the canonical HTML keeps the full ISO in `<time datetime>`). A future `/slug.src.md` endpoint can expose the raw source with full front matter if a real need appears — not part of MVP.

### 5.4 `.json` output shape

The `.json` endpoint exposes structured metadata for the explore-mode shell and other API consumers. It is emitted for posts and folders only (not the home page).

**Post `.json`:**

```json
{
  "id": "0042",
  "title": "On writing well",
  "date": "2026-04-14T12:00:00-04:00",
  "lang": "zh",
  "tags": ["writing", "craft"],
  "slug": "0042-on-writing-well"
}
```

**Folder `.json`:**

```json
{
  "title": "Sketch",
  "date": "2026-04-10T00:00:00Z",
  "lang": "zh",
  "tags": [],
  "slug": "sketch"
}
```

- `date` is the full ISO 8601 timestamp with offset (unlike `.md` which uses date-only).
- `id` is omitted from folders (folders have no numeric ID).
- Body content is not included — use `.partial.html` for that.

---

## 6. Rendering modes

### 6.1 Zen mode (default, MVP)

Standard link navigation. Click an entry → full-page replacement.

- Simple HTML. Minimal JS.
- Single article centered, comfortable line length.
- Suitable for focused reading.

### 6.2 Explore mode (later, hooks planned now)

Borrowed and modernized from `cbp.tldr.ink`: each clicked link opens as an additional column to the right, forming a reading stack. Hover peek. URL stores stack as query.

MVP does **not** ship explore mode UI, but the generator must leave hooks so it can be added without refactor:

- Every post emits a content **fragment endpoint** (`/<path>.partial.html` or `.json`) that returns just the article body + metadata — no layout chrome.
- Post pages render their body inside a stable container element (e.g., `<article class="note" data-id="0042">`) so a shell shell can extract and compose.
- URL shape supports a `?stack=0042,0051` query in the future (ignored by zen mode today).
- Each post has a short numeric ID as its stacking key (already true by design).

Toggle between modes (when explore lands) will be a UI switch + URL query; zen remains default.

---

## 7. Bilingual

- Every post declares `lang` (or inherits it from filename suffix).
- A **site-wide language switch** (header toggle) filters the visible content:
  - zh mode: only `lang: zh` posts/folders appear in listings
  - en mode: only `lang: en`
  - additional langs added as needed
- Default language: `zh` (can be overridden by browser `Accept-Language` or saved preference).
- **Translation pairing is implicit by shared ID.** The renderer scans for sibling files with the same numeric prefix but different lang. On a post page, if a sibling exists, a link showing the sibling language's native name (e.g. "中文", "English") is rendered inline with the date. Clicking it saves that lang as the preferred language.
- Folder listings also respect the active language filter. Folders without any posts in the active language are hidden from their parent listing.

RSS is emitted per-language.

---

## 8. Tags

### 8.1 Sources

A post's tag set is the union of two sources:

1. **Front-matter `tags: [...]`** — explicit. Use for meta tags not naturally mentioned in prose.
2. **Inline `#tag` tokens** in the body — natural. Write `#writing` in context, it becomes both a link and a tag membership.

Build-time collector walks the post AST, extracts inline tags, merges with front-matter, de-dupes. The merged set drives `/tags/<name>/` listings, the post's displayed tag strip, and the meta line in `.md` output.

### 8.2 Inline hashtag rules

- **Pattern**: `#` preceded by whitespace or line-start, followed by a letter, then any run of letters, digits, `_`, or `-`. CJK letters count (`#写作` works).
- **Excluded contexts**: fenced code blocks, inline code spans, URLs, link text, link hrefs. Unicode-aware matching.
- **Edge cases documented for authors**: `C#` does not match (first char after `#` must be a letter, and `#` is not preceded by whitespace here anyway). `issue #42` does not match (first char must be a letter, not a digit). Year tags like `#2026` therefore require front-matter entry; accepted trade-off for less ambiguity.
- **Rendering**:
  - HTML output: inline `#foo` → `<a href="/tags/foo/">#foo</a>`.
  - `.md` output: inline `#foo` → `[#foo](/tags/foo.md)`.
  - Tag bar at the bottom of the post page lists the merged set, de-duped.

### 8.3 Tag pages

- `/tags/<name>/` — reverse-chronological list of posts with that tag. Also emits `.md` and `.html` siblings per §5.2.
- `/tags/` — index of all tags with post counts.
- No hierarchy, no tag descriptions, no colors — until clearly needed.

---

## 9. Publishing workflow

### 9.0 Two entry points

The daily loop has two parallel shapes. Both call the same internal publish pipeline. **Do not cross them.**

| Flow | Start | Trigger publish |
|------|-------|-----------------|
| **A. CLI-driven** | `draft` CLI (run manually or via Shortcuts.app / keyboard) → file created in iA library → iA opens it | `publish <id>` CLI |
| **B. Micropub-driven** | Open any file in iA, write | iA's Publish menu → POSTs to local Micropub server → server shells out to `publish --title "<name>"` |

Pick whichever is in front of you at the moment. A is friction-free for "start writing now" via Shortcuts. B is friction-free for "publish the thing I've been editing" without switching to a terminal.

Rule: whichever side kicked off the piece, that side publishes it. Crossing (draft via A, publish via B when A hasn't been finalized) is not modeled — risk of the Micropub server matching the wrong file.

### 9.1 Scripts (in source repo, under `scripts/`)

#### `draft [folder]`

- Scans the iA Writer library for the current max numeric ID across all files (drafts + published, all langs).
- Creates `<next-id>.md` (e.g., `0053.md`) at the given folder path inside the iA Writer library (default: library root).
- Writes minimal draft front matter: `draft: true`, `lang: <DEFAULT_LANG>`.
- Prints the file path and (on macOS) opens it in iA Writer.
- Designed to be triggered from Shortcuts.app / AppleScript / keyboard shortcut — no TTY prompts.

#### `translate <id> --lang <code> [--folder <path>]`

- Creates a translation draft for an existing piece. Never allocates a new ID.
- Errors if ID `<id>` does not already exist in any lang.
- Creates `<id>.<code>.md` (e.g., `0053.en.md`) in the target folder. Default folder = the same folder as the source-lang file.
- Writes draft front matter: `draft: true`, `lang: <code>`.
- Opens in iA Writer.

#### `publish <id-or-path> [--lang <code>] [--tz <zone|local>] [--title <name>] [--latest-draft]`

- Accepts either a numeric ID (`publish 53`) or a file path.
- If passed just an ID and multiple lang versions exist, requires `--lang` to disambiguate.
- `--title "..."` — finds a draft file whose first `#` heading matches (used by the Micropub server).
- `--latest-draft` — publishes the most recently modified draft file matching `NNNN(.<lang>)?.md`. Fallback for the Micropub server when no title is present in the payload.
- Reads the file. If no `title` in front matter, extracts from first `#` heading.
- Slugifies title → renames file on disk, preserving lang suffix:
  - `0053.md` → `0053-on-writing-well.md`
  - `0053.en.md` → `0053-writing-well.en.md`
- Updates front matter: `draft: false`, fills `title`/`slug`/`date`/`lang`.
- `date` is stamped in `HOME_TZ` by default. Override with `--tz Asia/Tokyo` or `--tz local` (system TZ) when traveling and you want the local wall clock on the file.
- Calls `fetch` → `build` → `deploy`.
- Prints clear success / error output. Fails loudly on missing required fields, invalid lang, or ambiguous title match.

#### `fetch`

- rsyncs the iA Writer library into the Astro project's `content/` tree.
- Excludes drafts (files whose filename is only digits OR whose front matter has `draft: true`).
- Excludes hidden folders (`.` / `_` prefix).

#### `build`

- Thin wrapper around `astro build`.

#### `deploy`

- Takes `dist/`.
- Commits + force-pushes to the **public static-site repo** (e.g., `conan-one-site`), branch `main`, which GitHub Pages serves.
- The source repo and the public repo are separate. The source repo is private and contains generator code plus a gitignored `content/` cache; the public repo holds only built output.

### 9.2 Config / env

`.env` (gitignored) in the source repo:

```bash
IA_WRITER_PATH="..."
SITE_URL="https://conan.one"
SITE_DESCRIPTION="A calm, text-first publishing system."
PUBLIC_REPO="git@github.com:conan/conan-one-site.git"
DEFAULT_LANG="zh"
HOME_TZ="America/New_York"
MICROPUB_PORT="4567"
MICROPUB_TOKEN="..."     # secret; registered in iA Writer once
```

### 9.3 Time zone policy

- `HOME_TZ` (IANA zone name) is the default for all `date` front-matter stamps.
- `SITE_DESCRIPTION` supplies the home page meta description. If unset, the app falls back to a generic default suitable for open-sourcing.
- `publish` computes the correct offset at the moment of publish — DST handled automatically (`-05:00` winter, `-04:00` summer for `America/New_York`).
- Dates always written as full ISO 8601 with offset, e.g. `2026-04-15T15:30:00-04:00`. No ambiguity in feeds, sitemaps, or sort order.
- Override per invocation with `publish --tz <zone>` or `publish --tz local` when traveling and you want the local wall clock recorded instead.
- Known quirk: writing late at night in a distant TZ while stamping in `HOME_TZ` may push the date onto the previous home-calendar day. Usually fine. Override fixes it.

### 9.4 Micropub server (Flow B)

A tiny local HTTPS service that lets iA Writer's native **Publish** menu kick off the `publish` pipeline — no terminal context switch. The server is a **signal channel**, not a content ingest. It inspects just enough of the payload to identify which file to publish, then shells out to `publish`. File renaming, front-matter rewrite, fetch, build, and deploy all happen in the CLI — the server does none of it.

#### Scope

- **Binds** `127.0.0.1:$MICROPUB_PORT` (default `4567`). Never `0.0.0.0`.
- **TLS**: iA Writer requires HTTPS even for local servers. Caddy runs as a reverse proxy on `micropub.internal:443`, terminates TLS using its internal CA (`caddy trust` installs the root cert into the system keychain), and forwards plain HTTP to `127.0.0.1:4567`. The Zig server speaks plain HTTP only.
- **Local domain**: `micropub.internal` is aliased to `127.0.0.1` in `/etc/hosts`. iA Writer requires a domain-like URL, not a bare IP or `localhost`.
- **Auth**: static bearer token `MICROPUB_TOKEN` from `.env`. Matches iA Writer's "Enter Token Manually" option — no IndieAuth / OAuth.
- **Endpoints**:
  - `GET /` (unauthenticated) → minimal HTML with `<link rel="micropub" href="https://micropub.internal">`. iA Writer fetches this page during account setup to discover the micropub endpoint.
  - `GET /?q=config` (authenticated) → minimal capabilities JSON `{"media-endpoint":null}`. Does **not** advertise `post-status` support, so iA falls back to publish-immediately. This is desired — the moment iA talks to us = the moment we publish.
  - `POST /micropub` (authenticated, form-urlencoded or JSON) → publish-intent signal.
- **No draft endpoint, no update endpoint, no media endpoint** in MVP.

#### Publish-intent handling

On `POST /micropub`:

1. Verify `Authorization: Bearer <token>`. `401` on mismatch.
2. Extract **only** the `name` field (post title) from the payload. Ignore `content`, `category`, `published`, everything else — the source of truth is the file already in the iA Writer library.
3. Call `publish --title "<name>"`:
   - Primary path: scan drafts in iA Writer library, match first-`#`-heading to `<name>`, publish that file.
   - Fallback: if no `name` present, `publish --latest-draft`.
   - On ambiguity (multiple drafts sharing the title), respond `400` with JSON `{"error": "ambiguous", "candidates": [...]}` — user disambiguates via CLI.
4. On success, respond `201 Created` with `Location: <canonical-https-url>` header. iA Writer uses this as the post's URL.

#### Implementation

- **Language: Zig**, stdlib only. No framework (no Zap, no routing library). `std.http.Server` handles the endpoints; ~20 lines of form-urlencoded parsing cover the body; `std.process.Child` shells out to `./scripts/publish`.
- **Why Zig**: tiny binary (~100–200 KB), tiny idle footprint (2–5 MB RAM), no runtime dependency, fast cold start. Frictionless as a persistent background service.
- **Version pin**: Zig stdlib HTTP API changes pre-1.0. Pin the exact Zig version in `build.zig.zon` so the binary stays reproducible across rebuilds.
- **Scope**: ~150 lines of Zig in one `.zig` file. Shares no logic with the generator beyond the env file.
- Logs to stdout/stderr; launchd captures to log paths (see below).

#### TLS setup (one-time, per machine)

```sh
brew install caddy
ln -sf ~/work/conan.one/scripts/launchd/Caddyfile /opt/homebrew/etc/Caddyfile
brew services start caddy
caddy trust          # installs Caddy's local CA into system keychain
```

`scripts/launchd/Caddyfile` contains:

```caddy
micropub.internal {
    tls internal
    reverse_proxy 127.0.0.1:4567
}
```

Add to `/etc/hosts` (if not already present):

```hosts
127.0.0.1  micropub.internal
```

Caddy is managed by Homebrew's launchd integration (`brew services`) and restarts automatically on login — no manual steps after initial setup.

#### Lifecycle (launchd)

Server runs **always** while the user is logged in, via a `LaunchAgent`:

- Label: `one.conan.micropub`
- Plist: `scripts/launchd/one.conan.micropub.plist`, installed into `~/Library/LaunchAgents/`.
- Logs: `~/Library/Logs/one.conan.micropub/{out.log,err.log}` (configured in plist `StandardOutPath` / `StandardErrorPath`).
- Idle cost a few MB RAM. Keeping it always-on eliminates "did draft spawn the server?" state.

All lifecycle operations go through a single multi-subcommand wrapper, `scripts/micropub`:

| Subcommand | Behavior | Underlying |
|------------|----------|-----------|
| `micropub install` | copy plist to `~/Library/LaunchAgents/`, bootstrap, enable | `launchctl bootstrap gui/$UID <plist>` |
| `micropub uninstall` | bootout, remove plist | `launchctl bootout …` |
| `micropub start` | bootstrap (loads plist + starts service) | `launchctl bootstrap gui/$UID <plist>` |
| `micropub stop` | bootout (fully unloads; won't respawn despite KeepAlive) | `launchctl bootout …` |
| `micropub restart` | bootout then bootstrap | `launchctl bootout … && bootstrap …` |
| `micropub enable` | allow to run without reinstalling | `launchctl enable …` |
| `micropub disable` | bootout + disable (blocks auto-start on next login) | `launchctl bootout … && disable …` |
| `micropub status` | print current state + PID + port | `launchctl print …` |
| `micropub logs` | tail `~/Library/Logs/one.conan.micropub/err.log` | `tail -n 50 …` |

Note: `launchctl stop` is intentionally **not** used — for `KeepAlive` services it sends SIGTERM but launchd immediately respawns. `bootout` fully unloads the service.

`draft` CLI does **not** spawn the server. If the server isn't running when iA hits it, the POST fails — iA surfaces the error, user runs `micropub install` once, done forever. Temporary pauses (debugging, offline, travel) use `micropub disable` / `micropub enable` — no reinstall needed.

#### One-time iA Writer setup

Settings → Accounts → Add Micropub → **Enter Token Manually**:

- URL: `micropub.internal`
- Token: (paste `MICROPUB_TOKEN` from `.env`)

iA Writer fetches `https://micropub.internal`, reads the `<link rel="micropub">` tag, and uses that endpoint for all subsequent calls.

---

## 10. Repo layout (source repo)

```text
conan.one/
  astro.config.mjs
  package.json
  src/
    content/             # populated by `fetch`, gitignored
    layouts/
    pages/
      index.astro        # home (top-level listing)
      [...slug].astro    # posts and folder pages
      tags/
      feed.[lang].xml.ts
    components/
    styles/
  public/                # static assets (favicon, fonts)
  scripts/
    draft
    translate
    publish
    fetch
    build
    deploy
    micropub                 # wrapper: install/uninstall/start/stop/restart/enable/disable/status/logs
    micropub-server/         # Zig source for the signal-only HTTP service
      build.zig
      build.zig.zon          # pins Zig version + deps
      src/main.zig
    launchd/
      one.conan.micropub.plist
  docs/
    project.md
  .env                   # gitignored
```

---

## 11. Style and typography

Primary reference: [`conanchou.github.com`](/Users/conan/work/conanchou.github.com) — the current personal blog. The new site should feel **the same paperwhite minimalism**: narrow column, light font weight, calm whitespace, nothing decorative.

Secondary reference: [`cbp.tldr.ink`](/Users/conan/work/cbp.tldr.ink) — only for the multi-column stack interaction in the future explore mode. Do not borrow its visual chrome (gem logo, tinted backgrounds, playful shadows) — conan.one stays plainer than cbp.

Concrete defaults:

- **Font stack** (from conanchou's paperwhite theme):

  ```text
  -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Roboto, Arial,
  "PingFang SC", "Hiragino Sans GB", "Microsoft Yahei", "Microsoft Jhenghei", sans-serif
  ```

  System sans-serif with strong CJK fallbacks. Not serif.
- **Font weight**: light (200–300 for body). Headings slightly heavier but not bold.
- **Base font size**: ~1.1em. **Line height**: 1.5. **Content width**: ~700px.
- **Colors**: near-black on near-white. Match conanchou's values to start (`#111` on `#fefefe` light; `#c8c8c8` on `#323232` dark). Adjust only if needed.
- **Dark mode**: `prefers-color-scheme`, no toggle.
- **Header**: site title only, small, left-aligned. Language switch on the right. No logo in MVP.
- **Footer**: copyright line. Nothing else.
- **Links**: simple underline; brand accent color only on hover or active state.
- **Listings**: one entry per line — `NNNN  Title …………………  Date`. No cards, no thumbnails.
- **Post page**: title, date meta, body. Translation-sibling links as small text under the date. Tags as `#tag` at the bottom. No prev/next nav unless it proves needed.
- **Code blocks**: highlight only when a post actually has code (lazy-load highlight.js or similar).
- **Math**: KaTeX only when a post uses it.
- **No**: thumbnails, author bylines, social share buttons, comments, related posts widgets.

Guiding rule: if a visual element cannot justify itself against "does this help reading?", drop it.

---

## 12. SEO / feeds / metadata

- Semantic HTML baseline.
- Per-page `<title>` and meta description (description falls back to first paragraph plain text).
- Canonical URL tags.
- Open Graph + Twitter card minimum.
- `sitemap.xml` (Astro built-in).
- RSS per language: `/feed.zh.xml`, `/feed.en.xml`.

---

## 13. Performance

- Plain HTML/CSS first.
- Astro islands only where interaction is unavoidable (language switch; future explore mode).
- No client-side rendering of core content.
- No hydration of static article bodies.

---

## 14. Implementation phases

### Phase 1 — MVP (zen mode, ship the writing loop)

- Astro scaffold.
- Content collection + routing for files and folders.
- Home page, folder pages, single post page.
- Front matter parsing, draft exclusion.
- Triple-output per page: clean URL HTML, `.html` alias, `.md` (cleaned), `.partial.html` (explore-mode hook).
- `draft`, `translate`, `publish`, `fetch`, `build`, `deploy` scripts.
- Signal-only Micropub server + launchd LaunchAgent for Flow B (iA Writer's native Publish menu triggers the pipeline).
- Basic typography + dark mode.
- Sitemap, per-language RSS, OG metadata.
- Language switch (client-side filter on listings).
- Tags pages.

### Phase 2 — Explore mode

- Shell UI: stackable columns, hover peek, keyboard nav.
- Consume the already-emitted content fragments.
- Mode toggle in header. Zen remains default.

### Phase 3 — Organizational polish

- Reading time / ToC for long posts.
- Per-folder RSS if it becomes useful.

---

## 15. Acceptance criteria (Phase 1)

1. `draft` in a fresh state creates `0001.md` in the iA Writer library, opens it.
2. Drafting a post, then running `publish 1`, renames the file, fills front matter, builds, deploys.
3. The deployed site shows the post on the home page with correct date / number / title.
4. A folder with entries renders correctly, including `index.md` intro when present.
5. Language switch correctly hides opposite-language posts.
6. RSS feeds are served per language.
7. Each post is additionally reachable at `.html`, `.md` (cleaned prose form per §5.3), and `.partial.html` — verifying all three sibling outputs exist.
8. No content is mirrored into the public repo beyond built static files.
9. Flow B works end-to-end: with the launchd agent loaded, clicking Publish in iA Writer (on a draft file with a `#` title) triggers the full `fetch → build → deploy` pipeline and the post appears on the live site.

---

## 16. Guardrails

**Do not build:**

- comments, search, analytics dashboards
- per-section taxonomies beyond folders
- a theme system — templates live in this repo
- bilingual auto-translation
- any database

**Do not over-abstract:**

- scripts stay readable shell or short Node files
- no custom DSLs, no plugin frameworks
- no speculative generality for features not listed here

**When in doubt:** choose the option that makes the next post easier to ship, not the option that is more elegant.

---

## 17. Final instruction

If a design decision pits framework cleanliness against author friction, choose friction reduction. If a feature does not serve the weekly habit of writing and publishing, defer it.
