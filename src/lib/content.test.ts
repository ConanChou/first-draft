import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseFilename,
  parseFrontMatter,
  extractInlineTags,
  extractFirstHeading,
  extractFirstParagraph,
  buildFolderDescription,
  loadAllFolders,
  type Entry,
} from "./content.js";

// ── parseFilename ────────────────────────────────────────────────

describe("parseFilename", () => {
  it("parses bare draft NNNN.md (default lang)", () => {
    const p = parseFilename("0042.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, "0042");  // bare draft: slug = id
  });

  it("parses named file NNNN-slug.md", () => {
    const p = parseFilename("0042-on-writing.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, "0042-on-writing");
    assert.equal(p.lang, process.env.DEFAULT_LANG ?? "zh");
  });

  it("parses translation NNNN-slug.en.md", () => {
    const p = parseFilename("0042-writing-well.en.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, "0042-writing-well");
    assert.equal(p.lang, "en");
  });

  it("returns null for non-matching filenames", () => {
    assert.equal(parseFilename("README.md"), null);
    assert.equal(parseFilename("index.md"), null);
    assert.equal(parseFilename("notes.md"), null);
  });
});

// ── parseFrontMatter ─────────────────────────────────────────────

describe("parseFrontMatter", () => {
  it("returns empty fm when no front matter", () => {
    const { fm, body } = parseFrontMatter("Hello world");
    assert.deepEqual(fm, {});
    assert.equal(body, "Hello world");
  });

  it("parses all supported fields", () => {
    const raw = `---
title: "On writing well"
date: 2026-04-14T12:00:00-04:00
slug: on-writing-well
draft: false
lang: en
tags: ["writing", "craft"]
desc: "A short description."
---

Body here.`;
    const { fm, body } = parseFrontMatter(raw);
    assert.equal(fm.title, "On writing well");
    assert.equal(fm.date, "2026-04-14T12:00:00-04:00");
    assert.equal(fm.slug, "on-writing-well");
    assert.equal(fm.draft, false);
    assert.equal(fm.lang, "en");
    assert.deepEqual(fm.tags, ["writing", "craft"]);
    assert.equal(fm.desc, "A short description.");
    assert.equal(body.trim(), "Body here.");
  });

  it("draft:true parses as boolean", () => {
    const { fm } = parseFrontMatter("---\ndraft: true\n---\n");
    assert.equal(fm.draft, true);
  });

  it("handles missing closing --- gracefully", () => {
    const raw = "---\ntitle: broken";
    const { fm, body } = parseFrontMatter(raw);
    assert.deepEqual(fm, {});
    assert.equal(body, raw);
  });

  it("body after FM can have leading blank line (\\s* stripping)", () => {
    const raw = "---\ntitle: Test\n---\n\n# Heading\n\nBody.";
    const { body } = parseFrontMatter(raw);
    // body starts with \n# Heading after the single \n strip
    assert.ok(body.includes("# Heading"));
  });
});

// ── extractInlineTags ────────────────────────────────────────────

describe("extractInlineTags", () => {
  it("extracts #tag tokens after whitespace", () => {
    const tags = extractInlineTags("See #writing for more.");
    assert.deepEqual(tags, ["writing"]);
  });

  it("extracts tag at line start", () => {
    const tags = extractInlineTags("#craft matters");
    assert.deepEqual(tags, ["craft"]);
  });

  it("extracts CJK tags", () => {
    const tags = extractInlineTags("关于 #写作 的想法");
    assert.deepEqual(tags, ["写作"]);
  });

  it("deduplicates tags", () => {
    const tags = extractInlineTags("#a stuff #a more #b");
    assert.deepEqual(tags, ["a", "b"]);
  });

  it("skips tags inside fenced code blocks", () => {
    const tags = extractInlineTags("```\n#writing\n```");
    assert.deepEqual(tags, []);
  });

  it("skips tags inside inline code", () => {
    const tags = extractInlineTags("Use `#tag` here");
    assert.deepEqual(tags, []);
  });

  it("skips #tag inside URLs", () => {
    const tags = extractInlineTags("See https://example.com/path#writing for more");
    assert.deepEqual(tags, []);
  });

  it("does not match C# (no preceding space)", () => {
    const tags = extractInlineTags("Written in C#.");
    assert.deepEqual(tags, []);
  });

  it("does not match #42 (digit after #)", () => {
    const tags = extractInlineTags("See issue #42 above.");
    assert.deepEqual(tags, []);
  });
});

// ── extractFirstHeading ──────────────────────────────────────────

describe("extractFirstHeading", () => {
  it("extracts first # heading", () => {
    assert.equal(extractFirstHeading("# Hello World\n\nBody."), "Hello World");
  });

  it("returns undefined when no heading", () => {
    assert.equal(extractFirstHeading("No heading here."), undefined);
  });

  it("returns first heading, ignoring deeper headings above it", () => {
    // ## is skipped; # is the first h1
    assert.equal(extractFirstHeading("## Not h1\n# This is h1"), "This is h1");
  });

  it("trims whitespace from heading text", () => {
    assert.equal(extractFirstHeading("#   Padded  "), "Padded");
  });
});

// ── extractFirstParagraph ────────────────────────────────────────

describe("extractFirstParagraph", () => {
  it("returns first plain paragraph", () => {
    assert.equal(extractFirstParagraph("Hello world."), "Hello world.");
  });

  it("skips leading h1 and returns first paragraph", () => {
    assert.equal(
      extractFirstParagraph("# Title\n\nFirst para.\n\nSecond para."),
      "First para.",
    );
  });

  it("skips headings and returns first text block", () => {
    assert.equal(
      extractFirstParagraph("## Subheading\n\nActual text."),
      "Actual text.",
    );
  });

  it("strips inline markdown", () => {
    assert.equal(
      extractFirstParagraph("**Bold** and *italic* and [link](https://x.com)."),
      "Bold and italic and link.",
    );
  });

  it("returns undefined for heading-only body", () => {
    assert.equal(extractFirstParagraph("# Only heading"), undefined);
  });

  it("returns undefined for empty body", () => {
    assert.equal(extractFirstParagraph(""), undefined);
  });

  it("skips fenced code blocks", () => {
    assert.equal(
      extractFirstParagraph("```\ncode\n```\n\nActual text."),
      "Actual text.",
    );
  });
});

// ── list page descriptions ───────────────────────────────────────

describe("buildFolderDescription", () => {
  it("builds fallback description from folder name", () => {
    assert.equal(
      buildFolderDescription("sketch", "example.com"),
      'Browse entries in the "sketch" folder on example.com.',
    );
  });
});

// ── loadAllFolders ───────────────────────────────────────────────

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "0001",
    lang: "zh",
    slug: "0001-test",
    filePath: "/tmp/test/0001-test.md",
    folder: "sketch",
    fm: {},
    body: "",
    title: "Test",
    description: "",
    date: "2026-01-01T00:00:00.000Z",
    tags: [],
    translations: [],
    ...overrides,
  };
}

describe("loadAllFolders", () => {
  it("returns empty array when no subdirectories", () => {
    const tmp = mkdtempSync(join(tmpdir(), "content-"));
    const result = loadAllFolders(tmp, []);
    assert.deepEqual(result, []);
  });

  it("skips hidden and underscore-prefixed dirs", () => {
    const tmp = mkdtempSync(join(tmpdir(), "content-"));
    mkdirSync(join(tmp, ".hidden"));
    mkdirSync(join(tmp, "_private"));
    const result = loadAllFolders(tmp, []);
    assert.equal(result.length, 0);
  });

  it("returns folder entry for a plain subdir (no index.md)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "content-"));
    mkdirSync(join(tmp, "sketch"));
    writeFileSync(join(tmp, "sketch", "0001-post.md"), "# Post\n\nBody.", "utf-8");
    const result = loadAllFolders(tmp, []);
    assert.equal(result.length, 1);
    const f = result[0]!;
    assert.equal(f.name, "sketch");
    assert.equal(f.slug, "sketch");
    assert.equal(f.title, "sketch"); // folder name as fallback
    assert.equal(f.description, 'Browse entries in the "sketch" folder on conan.one.');
    assert.ok(f.date); // derived from mtime
  });

  it("uses index.md title, date, lang, tags, desc, and intro", () => {
    const tmp = mkdtempSync(join(tmpdir(), "content-"));
    mkdirSync(join(tmp, "notes"));
    writeFileSync(
      join(tmp, "notes", "index.md"),
      `---
title: "My Notes"
date: 2026-03-01T00:00:00Z
lang: en
tags: ["foo", "bar"]
desc: "Folder-level description."
---

Intro paragraph here.`,
      "utf-8",
    );
    const result = loadAllFolders(tmp, []);
    assert.equal(result.length, 1);
    const f = result[0]!;
    assert.equal(f.title, "My Notes");
    assert.equal(f.date, "2026-03-01T00:00:00Z");
    assert.equal(f.lang, "en");
    assert.deepEqual(f.tags, ["foo", "bar"]);
    assert.equal(f.description, "Folder-level description.");
    assert.ok(f.intro?.includes("Intro paragraph"));
  });

  it("populates children from matching entries", () => {
    const tmp = mkdtempSync(join(tmpdir(), "content-"));
    mkdirSync(join(tmp, "sketch"));
    const entries = [
      makeEntry({ folder: "sketch", slug: "0001-in-sketch" }),
      makeEntry({ id: "0002", folder: "", slug: "0002-top-level" }),
    ];
    const result = loadAllFolders(tmp, entries);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.children.length, 1);
    assert.equal((result[0]!.children[0] as Entry).slug, "0001-in-sketch");
  });
});
