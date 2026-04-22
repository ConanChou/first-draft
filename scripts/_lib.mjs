/**
 * Shared utilities for site scripts.
 * All functions are synchronous unless noted.
 */

import {
  readFileSync, readdirSync, statSync, existsSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FM_STRING_FIELDS = new Set(["title", "slug", "date", "lang", "desc"]);
const FM_ARRAY_FIELDS = new Set(["tags"]);
const FM_BOOLEAN_FIELDS = new Set(["draft"]);
const FM_ORDER = ["title", "date", "slug", "draft", "lang", "tags", "desc"];

// ── .env ──────────────────────────────────────────────────────────
export function loadEnv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// ── Front matter ─────────────────────────────────────────────────
export function parseFrontMatter(raw) {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const yaml = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const fm = {};
  for (const line of yaml.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (FM_STRING_FIELDS.has(key)) {
      fm[key] = val.replace(/^["']|["']$/g, "");
    } else if (FM_BOOLEAN_FIELDS.has(key)) {
      fm[key] = val === "true";
    } else if (FM_ARRAY_FIELDS.has(key)) {
      const inner = val.replace(/^\[|\]$/g, "");
      fm[key] = inner.split(",").map(t => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
  }
  return { fm, body };
}

export function stringifyFrontMatter(fm, body) {
  const lines = ["---"];
  const keys = [...new Set([...FM_ORDER, ...Object.keys(fm)])];
  for (const key of keys) {
    if (!(key in fm) || fm[key] === undefined || fm[key] === null) continue;
    const val = fm[key];
    if (FM_ARRAY_FIELDS.has(key)) {
      const arr = Array.isArray(val) ? val : [val];
      lines.push(`tags: [${arr.map(t => `"${t}"`).join(", ")}]`);
    } else if (typeof val === "boolean" || FM_BOOLEAN_FIELDS.has(key)) {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: "${val}"`);
    }
  }
  lines.push("---", "");
  return lines.join("\n") + body;
}

export function buildDraftFrontMatter(lang) {
  return {
    slug: "",
    draft: true,
    lang,
    tags: [],
    desc: "",
  };
}

export function buildDraftTemplate(lang) {
  return stringifyFrontMatter(buildDraftFrontMatter(lang), "# ");
}

// ── Slug ─────────────────────────────────────────────────────────
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}

// ── Date with TZ ─────────────────────────────────────────────────
export function formatDateISO(tz) {
  const date = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map(({ type, value }) => [type, value])
  );
  // Get offset string like "GMT-4" or "GMT+5:30"
  const tzFmt = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" });
  const tzStr = tzFmt.formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "GMT";
  let offset = "+00:00";
  if (tzStr !== "GMT") {
    const m = tzStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (m) {
      const h = m[2].padStart(2, "0");
      const min = (m[3] ?? "0").padStart(2, "0");
      offset = `${m[1]}${h}:${min}`;
    }
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

// ── Filename pattern: NNNN[-slug][.lang].md ───────────────────────
const FILE_RE = /^(\d{4})(?:-(.+?))?(?:\.([a-z]{2}))?\.md$/;

export function parseFilename(name) {
  const m = FILE_RE.exec(basename(name));
  if (!m) return null;
  // m[2] = slug part (undefined = bare draft), m[3] = lang suffix
  return { id: m[1], slug: m[2] ?? null, lang: m[3] ?? null };
}

// ── Walk directory ────────────────────────────────────────────────
export function walkMd(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMd(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

// ── Scan max numeric ID across whole library ──────────────────────
export function scanMaxId(iaPath) {
  let max = 0;
  for (const f of walkMd(iaPath)) {
    const p = parseFilename(f);
    if (p) max = Math.max(max, parseInt(p.id, 10));
  }
  return max;
}

// ── Find files by ID ──────────────────────────────────────────────
export function findById(iaPath, id, lang = null) {
  const padded = String(parseInt(id, 10)).padStart(4, "0");
  const defaultLang = loadEnv().DEFAULT_LANG ?? "zh";
  return walkMd(iaPath).filter(f => {
    const p = parseFilename(f);
    if (!p || p.id !== padded) return false;
    if (lang !== null) {
      return (p.lang ?? defaultLang) === lang;
    }
    return true;
  });
}

// ── Find draft files ──────────────────────────────────────────────
export function findDrafts(iaPath, titleMatch = null) {
  return walkMd(iaPath).filter(f => {
    const p = parseFilename(f);
    if (!p) return false;
    // bare NNNN.md → always draft; named file → check FM
    if (p.slug !== null) {
      const { fm } = parseFrontMatter(readFileSync(f, "utf-8"));
      if (!fm.draft) return false;
    }
    if (titleMatch) {
      const { body } = parseFrontMatter(readFileSync(f, "utf-8"));
      const heading = firstHeading(body);
      return heading?.toLowerCase() === titleMatch.toLowerCase();
    }
    return true;
  });
}

export function findLatestDraft(iaPath) {
  const drafts = findDrafts(iaPath);
  if (drafts.length === 0) return null;
  return drafts.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

// ── First # heading ───────────────────────────────────────────────
export function firstHeading(body) {
  return /^#[ \t]+(.+)$/m.exec(body)?.[1]?.trim() ?? null;
}
