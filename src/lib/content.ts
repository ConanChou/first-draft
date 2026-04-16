/**
 * Content loader — reads the src/content/ tree populated by `scripts/fetch`.
 *
 * Each file must have a 4-digit numeric prefix (e.g. 0042-on-writing.md).
 * Drafts (bare NNNN.md or front-matter draft:true) are excluded by `fetch`.
 *
 * This module:
 *  - parses front matter
 *  - infers ID, slug, lang from filename
 *  - pairs translations by shared numeric ID
 *  - provides helpers used by Astro page routes
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const CONTENT_DIR = join(process.cwd(), "src/content");
const DEFAULT_LANG = process.env.DEFAULT_LANG ?? "zh";

// ── Types ──────────────────────────────────────────────────────────

export interface FrontMatter {
  title?: string;
  date?: string;
  slug?: string;
  draft?: boolean;
  lang?: string;
  tags?: string[];
  desc?: string;
}

export interface Entry {
  /** Numeric ID string, e.g. "0042" */
  id: string;
  /** Language code */
  lang: string;
  /** URL slug (no leading/trailing slash) */
  slug: string;
  /** Absolute path to source .md file */
  filePath: string;
  /** Folder path relative to content root (empty string for top-level) */
  folder: string;
  /** Parsed front matter */
  fm: FrontMatter;
  /** Raw markdown body (front matter stripped) */
  body: string;
  /** Resolved title */
  title: string;
  /** Resolved date (ISO string) */
  date: string;
  /** Tags merged from FM + inline #tags */
  tags: string[];
  /** Meta description (from fm.desc or first paragraph) */
  description: string;
  /** IDs of sibling language versions */
  translations: string[];
}

export interface FolderEntry {
  /** Folder name */
  name: string;
  /** Full path on disk */
  dirPath: string;
  /** Relative path from content root */
  folder: string;
  /** URL slug */
  slug: string;
  /** Title (from index.md or folder name) */
  title: string;
  /** Date (from index.md or latest mtime) */
  date: string;
  /** Lang */
  lang: string;
  /** Tags */
  tags: string[];
  /** Optional intro body from index.md */
  intro?: string;
  /** Direct child entries */
  children: Entry[];
}

// ── Filename parsing ───────────────────────────────────────────────

/** Pattern: NNNN-slug.md or NNNN-slug.en.md */
const FILE_RE = /^(\d{4})(?:-(.+?))?(?:\.([a-z]{2}))?\.md$/;

export function parseFilename(filename: string): {
  id: string;
  slug: string;
  lang: string;
} | null {
  const m = FILE_RE.exec(filename);
  if (!m) return null;
  const id = m[1]!;
  const slugPart = m[2] ?? "";
  const langSuffix = m[3];
  const lang = langSuffix ?? DEFAULT_LANG;
  const slug = slugPart ? `${id}-${slugPart}` : id;
  return { id, slug, lang };
}

// ── Front matter parser (minimal — no external dep) ───────────────

export function parseFrontMatter(raw: string): {
  fm: FrontMatter;
  body: string;
} {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const yaml = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const fm: FrontMatter = {};
  for (const line of yaml.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim() as keyof FrontMatter;
    const val = line.slice(colon + 1).trim();
    if (key === "title" || key === "slug" || key === "date" || key === "lang" || key === "desc") {
      (fm as Record<string, unknown>)[key] = val.replace(/^["']|["']$/g, "");
    } else if (key === "draft") {
      (fm as Record<string, unknown>)[key] = val === "true";
    } else if (key === "tags") {
      // simple inline array: ["a","b"] or [a, b]
      const inner = val.replace(/^\[|\]$/g, "");
      (fm as Record<string, unknown>)[key] = inner
        .split(",")
        .map((t) => t.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  return { fm, body };
}

// ── Inline hashtag extraction ──────────────────────────────────────

const HASHTAG_RE = /(?:^|(?<=\s))#([A-Za-z\u4e00-\u9fff\u3040-\u30ff][A-Za-z0-9_\-\u4e00-\u9fff\u3040-\u30ff]*)/gm;

export function extractInlineTags(body: string): string[] {
  // Strip code blocks and inline code before matching
  const stripped = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/https?:\/\/\S+/g, "");
  const tags: string[] = [];
  for (const m of stripped.matchAll(HASHTAG_RE)) {
    tags.push(m[1]!);
  }
  return [...new Set(tags)];
}

// ── First heading extraction ───────────────────────────────────────

export function extractFirstHeading(body: string): string | undefined {
  const m = /^#\s+(.+)$/m.exec(body);
  return m?.[1]?.trim();
}

export function extractFirstParagraph(body: string): string | undefined {
  const noCode = body.replace(/```[\s\S]*?```/g, "");
  const noH1 = noCode.replace(/^\s*#[^#][^\n]*\n/, "");
  for (const block of noH1.split(/\n\n+/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^[#>]/.test(trimmed)) continue;
    if (/^(- |\* |\+ |\d+\. )/.test(trimmed)) continue;
    const plain = trimmed
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`[^`]*`/g, "")
      .replace(/\*\*([^*]*)\*\*/g, "$1")
      .replace(/\*([^*]*)\*/g, "$1")
      .replace(/_([^_]*)_/g, "$1")
      .replace(/\n/g, " ")
      .trim();
    if (plain) return plain;
  }
  return undefined;
}

// ── File walker ───────────────────────────────────────────────────

function walkDir(dir: string, relative = ""): string[] {
  const entries: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walkDir(full, relative ? `${relative}/${name}` : name));
    } else if (name.endsWith(".md")) {
      entries.push(relative ? `${relative}/${name}` : name);
    }
  }
  return entries;
}

// ── Load all entries ──────────────────────────────────────────────

// process.env.NODE_ENV is reliably set by Vite/Astro in both dev and build;
// import.meta.env.DEV is only available in Vite-transformed modules (not prerender scripts).
const IS_DEV = process.env.NODE_ENV === "development";

let _cache: Entry[] | null = null;

export function loadAllEntries(): Entry[] {
  // Don't cache in dev — file changes should be reflected on each request
  if (!IS_DEV && _cache) return _cache;
  const paths = walkDir(CONTENT_DIR);
  const entries: Entry[] = [];

  for (const rel of paths) {
    const filename = basename(rel);
    if (filename === "index.md") continue; // handled as folder metadata

    const parsed = parseFilename(filename);
    if (!parsed) continue;

    const filePath = join(CONTENT_DIR, rel);
    const raw = readFileSync(filePath, "utf-8");
    const { fm, body } = parseFrontMatter(raw);

    if (!IS_DEV && fm.draft === true) continue;

    const folder = dirname(rel) === "." ? "" : dirname(rel);
    const lang = fm.lang ?? parsed.lang;
    const baseSlug = fm.slug || parsed.slug || parsed.id;
    // Non-default languages always get a /{lang}/ prefix to avoid slug collisions.
    // fm.slug is treated as the base (prefix-free) slug, not the final URL path.
    const slug = lang !== DEFAULT_LANG ? `${lang}/${baseSlug}` : baseSlug;
    const title = fm.title || extractFirstHeading(body) || parsed.slug || parsed.id;
    const date = fm.date ?? new Date(statSync(filePath).mtime).toISOString();
    const inlineTags = extractInlineTags(body);
    const tags = [...new Set([...(fm.tags ?? []), ...inlineTags])];
    const description = fm.desc ?? extractFirstParagraph(body) ?? "";

    entries.push({
      id: parsed.id,
      lang,
      slug,
      filePath,
      folder,
      fm,
      body,
      title,
      date,
      tags,
      description,
      translations: [], // filled in next pass
    });
  }

  // Fill translation pairs
  const byId = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byId.get(e.id) ?? [];
    list.push(e);
    byId.set(e.id, list);
  }
  for (const e of entries) {
    e.translations = (byId.get(e.id) ?? [])
      .filter((t) => t.lang !== e.lang)
      .map((t) => t.lang);
  }

  _cache = entries;
  return entries;
}

/** Top-level folders only — nested section dirs are not supported. */
export function loadAllFolders(
  contentDir: string = CONTENT_DIR,
  allEntries: Entry[] = loadAllEntries(),
): FolderEntry[] {
  const folders: FolderEntry[] = [];

  for (const name of readdirSync(contentDir)) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const dirPath = join(contentDir, name);
    const stat = statSync(dirPath);
    if (!stat.isDirectory()) continue;

    let title = name;
    let date: string | undefined;
    let lang = DEFAULT_LANG;
    let tags: string[] = [];
    let intro: string | undefined;

    const indexPath = join(dirPath, "index.md");
    try {
      const raw = readFileSync(indexPath, "utf-8");
      const { fm, body } = parseFrontMatter(raw);
      title = fm.title ?? name;
      date = fm.date;
      lang = fm.lang ?? DEFAULT_LANG;
      tags = fm.tags ?? [];
      if (body.trim()) intro = body.trim();
    } catch {
      // No index.md — derive date from mtimes below
    }

    if (!date) {
      let latest = 0;
      for (const child of readdirSync(dirPath)) {
        if (child === "index.md") continue;
        try {
          const ms = statSync(join(dirPath, child)).mtimeMs;
          if (ms > latest) latest = ms;
        } catch { /* skip */ }
      }
      date = latest > 0 ? new Date(latest).toISOString() : new Date().toISOString();
    }

    const children = allEntries.filter((e) => e.folder === name);

    folders.push({
      name,
      dirPath,
      folder: "",
      slug: name,
      title,
      date,
      lang,
      tags,
      intro,
      children,
    });
  }

  return folders;
}

export function getEntryBySlug(slug: string): Entry | undefined {
  return loadAllEntries().find((e) => e.slug === slug);
}

export function getEntryById(id: string, lang?: string): Entry | undefined {
  const all = loadAllEntries().filter((e) => e.id === id);
  if (lang) return all.find((e) => e.lang === lang) ?? all[0];
  return all[0];
}

export function getAllTags(): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const entry of loadAllEntries()) {
    for (const tag of entry.tags) {
      const list = map.get(tag) ?? [];
      list.push(entry);
      map.set(tag, list);
    }
  }
  return map;
}
