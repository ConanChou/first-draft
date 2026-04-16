import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { postToMd, folderToMd, homeToMd } from "./md-output.js";
import type { Entry, FolderEntry } from "./content.js";

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "0042",
    lang: "zh",
    slug: "0042-on-writing",
    filePath: "/tmp/0042-on-writing.md",
    folder: "",
    fm: { title: "On writing", date: "2026-04-14T12:00:00-04:00", lang: "zh", draft: false },
    body: "# On writing\n\nSome content here.",
    title: "On writing",
    date: "2026-04-14T12:00:00-04:00",
    tags: [],
    description: "",
    translations: [],
    ...overrides,
  };
}

function makeFolder(overrides: Partial<FolderEntry> = {}): FolderEntry {
  return {
    name: "sketch",
    dirPath: "/tmp/sketch",
    folder: "",
    slug: "sketch",
    title: "Sketch",
    date: "2026-04-10T00:00:00Z",
    lang: "zh",
    tags: [],
    intro: undefined,
    children: [],
    ...overrides,
  };
}

// ── postToMd ─────────────────────────────────────────────────────

describe("postToMd", () => {
  it("starts with h1 title", () => {
    const md = postToMd(makeEntry(), "https://conan.one");
    assert.ok(md.startsWith("# On writing\n"));
  });

  it("includes date, lang in meta line", () => {
    const md = postToMd(makeEntry(), "https://conan.one");
    const lines = md.split("\n");
    const meta = lines[2]!;
    assert.ok(meta.includes("2026-04-14"), "date in meta");
    assert.ok(meta.includes("zh"), "lang in meta");
  });

  it("includes source line", () => {
    const md = postToMd(makeEntry(), "https://conan.one");
    assert.ok(md.includes("[← Index](/index.md)"), "index link");
    assert.ok(md.includes("Source: https://conan.one/0042-on-writing/*"), "source line");
  });

  it("strips leading h1 from body to avoid duplicate", () => {
    const md = postToMd(makeEntry({ body: "# On writing\n\nBody content." }), "https://conan.one");
    const h1s = (md.match(/^# /gm) ?? []).length;
    assert.equal(h1s, 1, "exactly one h1");
    assert.ok(md.includes("Body content."), "body preserved");
  });

  it("includes tags as .md links in meta line", () => {
    const md = postToMd(makeEntry({ tags: ["writing", "craft"] }), "https://conan.one");
    assert.ok(md.includes("[#writing](/tags/writing.md)"), "writing tag link");
    assert.ok(md.includes("[#craft](/tags/craft.md)"), "craft tag link");
  });

  it("omits tag links when no tags", () => {
    const md = postToMd(makeEntry({ tags: [] }), "https://conan.one");
    const metaLine = md.split("\n")[2] ?? "";
    assert.ok(!metaLine.includes("/tags/"), "no tag links in meta");
  });

  it("rewrites internal links to .md siblings in body", () => {
    const entry = makeEntry({ body: "See [note](/0038-first-steps/) here." });
    const md = postToMd(entry, "https://conan.one");
    assert.ok(md.includes("[note](/0038-first-steps.md)"), "internal link rewritten");
  });

  it("rewrites inline hashtags to .md tag links in body", () => {
    const entry = makeEntry({ body: "About #writing today." });
    const md = postToMd(entry, "https://conan.one");
    assert.ok(md.includes("[#writing](/tags/writing.md)"), "inline hashtag rewritten");
  });
});

// ── folderToMd ───────────────────────────────────────────────────

describe("folderToMd", () => {
  it("includes title, date, source", () => {
    const md = folderToMd(makeFolder(), "https://conan.one");
    assert.ok(md.includes("# Sketch"), "title");
    assert.ok(md.includes("2026-04-10"), "date");
    assert.ok(md.includes("[← Index](/index.md)"), "index link");
    assert.ok(md.includes("Source: https://conan.one/sketch/*"), "source");
  });

  it("includes ## Entries section", () => {
    const md = folderToMd(makeFolder(), "https://conan.one");
    assert.ok(md.includes("## Entries"), "entries header");
  });

  it("lists children with .md links", () => {
    const child = makeEntry({
      id: "0051",
      slug: "0051-studio",
      title: "Studio notes",
      date: "2026-04-10T00:00:00Z",
      folder: "sketch",
    });
    const md = folderToMd(makeFolder({ children: [child] }), "https://conan.one");
    assert.ok(md.includes("/0051-studio.md"), "child .md link");
    assert.ok(md.includes("Studio notes"), "child title");
  });

  it("includes intro when present", () => {
    const md = folderToMd(makeFolder({ intro: "This is the intro." }), "https://conan.one");
    assert.ok(md.includes("This is the intro."), "intro text");
  });

  it("omits intro block when absent", () => {
    const md = folderToMd(makeFolder({ intro: undefined }), "https://conan.one");
    // The intro block should not be present — check no blank line cluster before Entries
    const entriesIdx = md.indexOf("## Entries");
    const before = md.slice(0, entriesIdx);
    assert.ok(!before.includes("undefined"), "no undefined in output");
  });

  it("sorts children reverse-chronological", () => {
    const older = makeEntry({ slug: "0048-older", date: "2026-04-08T00:00:00Z", folder: "sketch" });
    const newer = makeEntry({ slug: "0051-newer", date: "2026-04-10T00:00:00Z", folder: "sketch" });
    const md = folderToMd(makeFolder({ children: [older, newer] }), "https://conan.one");
    assert.ok(md.indexOf("0051-newer") < md.indexOf("0048-older"), "newer before older");
  });
});

// ── homeToMd ─────────────────────────────────────────────────────

describe("homeToMd", () => {
  it("includes ## Entries and source line", () => {
    const md = homeToMd([], "https://conan.one");
    assert.ok(md.includes("## Entries"), "entries section");
    assert.ok(md.includes("*Source: https://conan.one/*"), "source line");
  });

  it("lists entries with .md links", () => {
    const md = homeToMd([makeEntry()], "https://conan.one");
    assert.ok(md.includes("/0042-on-writing.md"), "entry link");
    assert.ok(md.includes("On writing"), "entry title");
  });

  it("lists folders with .md links", () => {
    const md = homeToMd([makeFolder()], "https://conan.one");
    assert.ok(md.includes("/sketch.md"), "folder link");
    assert.ok(md.includes("Sketch"), "folder title");
  });
});
