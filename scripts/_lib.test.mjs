import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseFrontMatter,
  stringifyFrontMatter,
  buildDraftTemplate,
  slugify,
  parseFilename,
  formatDateISO,
  firstHeading,
  scanMaxId,
  findById,
  findDrafts,
  findLatestDraft,
} from "./_lib.mjs";

// ── parseFrontMatter ─────────────────────────────────────────────

describe("parseFrontMatter", () => {
  it("returns empty fm and full body when no front matter", () => {
    const { fm, body } = parseFrontMatter("Hello world");
    assert.deepEqual(fm, {});
    assert.equal(body, "Hello world");
  });

  it("parses all supported fields", () => {
    const raw = `---
title: "On writing well"
date: 2026-04-14T12:00:00-04:00
slug: "on-writing-well"
draft: false
lang: en
tags: ["writing", "craft"]
desc: "Short summary."
---

Body here.`;
    const { fm, body } = parseFrontMatter(raw);
    assert.equal(fm.title, "On writing well");
    assert.equal(fm.date, "2026-04-14T12:00:00-04:00");
    assert.equal(fm.slug, "on-writing-well");
    assert.equal(fm.draft, false);
    assert.equal(fm.lang, "en");
    assert.deepEqual(fm.tags, ["writing", "craft"]);
    assert.equal(fm.desc, "Short summary.");
    assert.equal(body.trim(), "Body here.");
  });

  it("draft:true parses as boolean true", () => {
    const { fm } = parseFrontMatter("---\ndraft: true\n---\n");
    assert.equal(fm.draft, true);
  });

  it("handles missing closing --- gracefully", () => {
    const raw = "---\ntitle: broken";
    const { fm, body } = parseFrontMatter(raw);
    assert.deepEqual(fm, {});
    assert.equal(body, raw);
  });

  it("strips quotes from string fields", () => {
    const { fm } = parseFrontMatter("---\ntitle: 'Hello'\nlang: \"zh\"\n---\n");
    assert.equal(fm.title, "Hello");
    assert.equal(fm.lang, "zh");
  });
});

// ── stringifyFrontMatter ─────────────────────────────────────────

describe("stringifyFrontMatter", () => {
  it("roundtrips basic fields", () => {
    const fm = { title: "Test", draft: false, lang: "zh", tags: ["a", "b"], desc: "Summary" };
    const result = stringifyFrontMatter(fm, "body");
    assert.ok(result.startsWith("---\n"));
    assert.ok(result.includes('title: "Test"'));
    assert.ok(result.includes("draft: false"));
    assert.ok(result.includes('lang: "zh"'));
    assert.ok(result.includes('tags: ["a", "b"]'));
    assert.ok(result.includes('desc: "Summary"'));
    assert.ok(result.endsWith("body"));
  });

  it("omits undefined fields", () => {
    const result = stringifyFrontMatter({ title: "X" }, "");
    assert.ok(!result.includes("date:"));
    assert.ok(!result.includes("draft:"));
  });
});

describe("buildDraftTemplate", () => {
  it("creates standardized draft front matter for script tools", () => {
    const template = buildDraftTemplate("en");
    assert.match(template, /slug: ""/);
    assert.match(template, /draft: true/);
    assert.match(template, /lang: "en"/);
    assert.match(template, /tags: \[\]/);
    assert.match(template, /desc: ""/);
    assert.match(template, /# $/);
  });
});

// ── slugify ──────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("removes special characters", () => {
    assert.equal(slugify("It's a test!"), "its-a-test");
  });

  it("collapses multiple hyphens", () => {
    assert.equal(slugify("a  --  b"), "a-b");
  });

  it("trims leading/trailing hyphens", () => {
    assert.equal(slugify("--hello--"), "hello");
  });

  it("truncates at 60 chars", () => {
    const long = "a".repeat(80);
    assert.equal(slugify(long).length, 60);
  });

  it("returns untitled for empty/punctuation input", () => {
    assert.equal(slugify("!!!"), "untitled");
  });

  it("passes through unicode letters (CJK)", () => {
    const result = slugify("写作笔记");
    assert.ok(result.length > 0);
    assert.notEqual(result, "untitled");
  });
});

// ── parseFilename ────────────────────────────────────────────────

describe("parseFilename", () => {
  it("parses bare draft NNNN.md", () => {
    const p = parseFilename("0042.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, null);
    assert.equal(p.lang, null);
  });

  it("parses named file NNNN-slug.md", () => {
    const p = parseFilename("0042-on-writing.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, "on-writing");
    assert.equal(p.lang, null);
  });

  it("parses translation NNNN-slug.en.md", () => {
    const p = parseFilename("0042-writing-well.en.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, "writing-well");
    assert.equal(p.lang, "en");
  });

  it("parses bare translation draft NNNN.en.md", () => {
    const p = parseFilename("0042.en.md");
    assert.ok(p);
    assert.equal(p.id, "0042");
    assert.equal(p.slug, null);
    assert.equal(p.lang, "en");
  });

  it("returns null for non-matching names", () => {
    assert.equal(parseFilename("README.md"), null);
    assert.equal(parseFilename("index.md"), null);
    assert.equal(parseFilename("notes.md"), null);
  });
});

// ── formatDateISO ────────────────────────────────────────────────

describe("formatDateISO", () => {
  it("returns a valid ISO 8601 string with offset", () => {
    const result = formatDateISO("America/New_York");
    assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it("reflects UTC offset", () => {
    const result = formatDateISO("UTC");
    assert.ok(result.endsWith("+00:00"), `expected UTC offset, got: ${result}`);
  });
});

// ── firstHeading ─────────────────────────────────────────────────

describe("firstHeading", () => {
  it("extracts first # heading", () => {
    assert.equal(firstHeading("# Hello World\n\nBody."), "Hello World");
  });

  it("returns null when no heading", () => {
    assert.equal(firstHeading("No heading here."), null);
  });

  it("does not match ## or deeper", () => {
    // ## is skipped; # is matched
    assert.equal(firstHeading("## Not this\n\n# This one"), "This one");
  });
});

// ── File-system tests (temp dir) ─────────────────────────────────

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "conan-lib-test-"));
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeMd(dir, name, content = "") {
  writeFileSync(join(dir, name), content);
}

describe("scanMaxId", () => {
  it("returns 0 for empty directory", () => {
    const empty = mkdtempSync(join(tmpdir(), "conan-empty-"));
    try {
      assert.equal(scanMaxId(empty), 0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("finds max id across files", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-scan-"));
    try {
      writeMd(dir, "0001.md");
      writeMd(dir, "0042-hello.md");
      writeMd(dir, "0010-world.en.md");
      assert.equal(scanMaxId(dir), 42);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recurses into subdirectories", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-scan2-"));
    const sub = join(dir, "sketch");
    mkdirSync(sub);
    try {
      writeMd(dir, "0005-top.md");
      writeMd(sub, "0099-sub.md");
      assert.equal(scanMaxId(dir), 99);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("findById", () => {
  it("finds all lang versions of an id", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-findid-"));
    try {
      writeMd(dir, "0007-hello.md", "---\nlang: zh\n---\n");
      writeMd(dir, "0007-hello.en.md", "---\nlang: en\n---\n");
      writeMd(dir, "0008-other.md", "---\nlang: zh\n---\n");
      const results = findById(dir, "7");
      assert.equal(results.length, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("filters by lang when specified", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-findid2-"));
    try {
      writeMd(dir, "0007-hello.md", "---\nlang: zh\n---\n");
      writeMd(dir, "0007-hello.en.md", "---\nlang: en\n---\n");
      const results = findById(dir, "7", "en");
      assert.equal(results.length, 1);
      assert.ok(results[0].endsWith("0007-hello.en.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("findDrafts", () => {
  it("finds bare NNNN.md files as drafts", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-drafts-"));
    try {
      writeMd(dir, "0003.md", "# My Draft\n\nContent.");
      writeMd(dir, "0002-published.md", "---\ndraft: false\n---\n# Published\n");
      const drafts = findDrafts(dir);
      assert.equal(drafts.length, 1);
      assert.ok(drafts[0].endsWith("0003.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("finds named files with draft:true in FM", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-drafts2-"));
    try {
      writeMd(dir, "0004-named-draft.md", "---\ndraft: true\n---\n# Named Draft\n");
      writeMd(dir, "0005-published.md", "---\ndraft: false\n---\n# Published\n");
      const drafts = findDrafts(dir);
      assert.equal(drafts.length, 1);
      assert.ok(drafts[0].endsWith("0004-named-draft.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches by title when titleMatch provided", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-drafts3-"));
    try {
      writeMd(dir, "0010.md", "# My Post\n\nContent.");
      writeMd(dir, "0011.md", "# Another Post\n\nContent.");
      const drafts = findDrafts(dir, "my post");
      assert.equal(drafts.length, 1);
      assert.ok(drafts[0].endsWith("0010.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("findLatestDraft", () => {
  it("returns null when no drafts", () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-latest-"));
    try {
      writeMd(dir, "0001-published.md", "---\ndraft: false\n---\n");
      assert.equal(findLatestDraft(dir), null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns most recently modified draft", async () => {
    const dir = mkdtempSync(join(tmpdir(), "conan-latest2-"));
    try {
      writeMd(dir, "0001.md", "# First");
      // small delay so mtime differs
      await new Promise(r => setTimeout(r, 10));
      writeMd(dir, "0002.md", "# Second");
      const latest = findLatestDraft(dir);
      assert.ok(latest?.endsWith("0002.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
