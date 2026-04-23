# FirstDraft

Writing-first personal site generator.

Markdown files live outside repo, in any local folder of markdown files. Repo reads them through symlink, builds static site with Astro, then force-pushes `dist/` to separate public output repo.

Current shape: single-author, file-first, calm publishing flow. Not CMS. Not multi-user platform.

## What it does

- keeps markdown as canonical source
- supports drafts, publish-time slugging, translations, tags, folder sections
- emits HTML plus sibling `.md`, `.partial.html`, and `.json` outputs
- supports local Micropub publish flow for writing apps that can publish to a Micropub endpoint
- deploys static output to GitHub Pages-style repo

## Stack

- Astro 6
- hand-written global CSS
- Node 22+, pnpm 10+
- Zig for Micropub server
- macOS launchd + local Caddy TLS proxy for Micropub workflow

## How content works

Content repo does not store canonical writing.

- real markdown files live in external markdown folder
- `scripts/link` creates `src/content -> CONTENT_PATH` symlink
- `scripts/link` creates or repairs that symlink
- `publish` updates markdown file in place, then runs `link -> build -> deploy`

Source repo can be open source because `src/content` is gitignored.

## Quick Start

### 1. Install deps

```sh
pnpm install
```

Optional: install repo scripts into `~/.local/bin`.

```sh
node scripts/install-script install
```

### 2. Configure env

```sh
cp .env.example .env
```

Set at least:

- `CONTENT_PATH`: path to local markdown folder
- `SITE_URL`: canonical site URL
- `SITE_NAME`: display/site name
- `SITE_OWNER`: copyright/owner label
- `PUBLIC_REPO`: git remote for built output
- `DEFAULT_LANG`: default language code

Optional but useful:

- `DEPLOY_GIT_NAME` / `DEPLOY_GIT_EMAIL`: deploy commit identity
- `MICROPUB_PORT` / `MICROPUB_TOKEN`: local Micropub server
- `OPEN_EDITOR_COMMAND`: command prefix used by `draft` to auto-open created files

`dist/CNAME` derives from `SITE_URL` host by default. `CNAME_DOMAIN` still works as advanced override, but normal setups should not need it.

See [`./.env.example`](./.env.example).

### 3. Link content

```sh
node scripts/link
```

This creates `src/content` symlink to `CONTENT_PATH`.
`draft` will auto-open created files with `OPEN_EDITOR_COMMAND` when set; otherwise it falls back to system `open` when available.

### 4. Run dev server

```sh
pnpm dev
```

## Everyday Workflow

Create draft:

```sh
node scripts/draft
node scripts/draft notes
node scripts/draft --lang en
```

Create translation draft for existing piece:

```sh
node scripts/draft --translate 42 --lang zh
```

Publish draft by ID or path:

```sh
node scripts/publish 42
node scripts/publish path/to/0042.md
```

Build site:

```sh
node scripts/build
```

Deploy `dist/` to output repo:

```sh
node scripts/deploy
```

Full publish flow:

- find draft by ID, path, title, or latest draft
- derive title from first `#` heading if needed
- rename `NNNN[.lang].md` to `NNNN-slug[.lang].md`
- write front matter: `title`, `date`, `slug`, `draft`, `lang`, `tags`, `desc`
- run `link`
- run `build`
- run `deploy`

## Routes And Outputs

Current outputs:

- posts: HTML page, `.html`, `.md`, `.partial.html`, `.json`
- folders: HTML page, `.html`, `.md`, `.partial.html`, `.json`
- home: HTML page, `index.md`, `index.partial.html`
- tags: HTML index/page plus markdown index/page
- feeds: `/feed.<lang>.xml`

Language model:

- default language uses flat routes: `/<slug>/`
- non-default language uses prefixed routes: `/<lang>/<slug>/`
- `/0042` redirects to preferred-language variant when available

## Micropub

Local Micropub server lives in `scripts/micropub-server/`.

Wrapper CLI:

```sh
node scripts/micropub install
node scripts/micropub status
node scripts/micropub logs --lines=100
```

Current setup assumes macOS launchd service and local TLS reverse proxy. Good for personal workflow; not packaged yet as generic cross-platform service. This path works especially well with iA Writer, but core site flow does not depend on iA Writer specifically.

## Testing

Run all:

```sh
pnpm test
pnpm astro check
pnpm test:zig
```

Repo uses:

- `node:test` for scripts
- `node:test` + `tsx` for `src/lib/*.ts`
- `shellcheck` for shell scripts
- `markdownlint-cli2` for markdown docs
- `zig build test` for Micropub server

## Project Status

Good fit now:

- single-author writing site
- local markdown-folder workflow
- static hosting via separate output repo
- forks willing to edit `.env` and a few docs

Still rough:

- public README/docs still being shaped for outside users
- Micropub setup still assumes local launchd/Caddy knowledge

## Docs

- product/architecture spec: [`./docs/project.md`](./docs/project.md)
- agent/repo orientation: [`./AGENTS.md`](./AGENTS.md)

## License

MIT.
