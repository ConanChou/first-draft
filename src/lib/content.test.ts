import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFilename,
  parseFrontMatter,
  extractInlineTags,
  extractFirstHeading,
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
---

Body here.`;
    const { fm, body } = parseFrontMatter(raw);
    assert.equal(fm.title, "On writing well");
    assert.equal(fm.date, "2026-04-14T12:00:00-04:00");
    assert.equal(fm.slug, "on-writing-well");
    assert.equal(fm.draft, false);
    assert.equal(fm.lang, "en");
    assert.deepEqual(fm.tags, ["writing", "craft"]);
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
