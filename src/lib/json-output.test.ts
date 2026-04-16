import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { postToJson, folderToJson } from "./json-output.js";
import type { Entry, FolderEntry } from "./content.js";

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "0042",
    lang: "zh",
    slug: "0042-on-writing",
    filePath: "/tmp/x.md",
    folder: "",
    fm: {},
    body: "",
    title: "On writing",
    date: "2026-04-14T12:00:00-04:00",
    tags: ["writing", "craft"],
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

describe("postToJson", () => {
  it("includes all required fields", () => {
    const obj = postToJson(makeEntry());
    assert.equal(obj.id, "0042");
    assert.equal(obj.title, "On writing");
    assert.equal(obj.date, "2026-04-14T12:00:00-04:00");
    assert.equal(obj.lang, "zh");
    assert.deepEqual(obj.tags, ["writing", "craft"]);
    assert.equal(obj.slug, "0042-on-writing");
  });

  it("does not include body or filePath", () => {
    const obj = postToJson(makeEntry()) as unknown as Record<string, unknown>;
    assert.equal(obj["body"], undefined);
    assert.equal(obj["filePath"], undefined);
    assert.equal(obj["fm"], undefined);
  });

  it("includes empty tags array when no tags", () => {
    const obj = postToJson(makeEntry({ tags: [] }));
    assert.deepEqual(obj.tags, []);
  });
});

describe("folderToJson", () => {
  it("includes required fields", () => {
    const obj = folderToJson(makeFolder());
    assert.equal(obj.title, "Sketch");
    assert.equal(obj.slug, "sketch");
    assert.equal(obj.date, "2026-04-10T00:00:00Z");
    assert.equal(obj.lang, "zh");
    assert.deepEqual(obj.tags, []);
  });

  it("does not include id field", () => {
    const obj = folderToJson(makeFolder()) as unknown as Record<string, unknown>;
    assert.equal(obj["id"], undefined);
  });
});
