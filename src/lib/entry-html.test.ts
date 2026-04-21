import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entryLiHtml, folderLiHtml } from "./entry-html.js";
import type { Entry, FolderEntry } from "./content.js";

describe("entryLiHtml", () => {
  it("includes content language metadata on entry list items", () => {
    const entry: Entry = {
      id: "0042",
      lang: "en",
      slug: "en/0042-writing-well",
      filePath: "/tmp/0042-writing-well.en.md",
      folder: "",
      fm: {},
      body: "",
      title: "On Writing Well",
      date: "2026-04-21T00:00:00.000Z",
      tags: [],
      description: "",
      translations: ["zh"],
    };

    assert.match(
      entryLiHtml(entry),
      /<li lang="en" data-id="0042" data-lang="en">/,
    );
  });
});

describe("folderLiHtml", () => {
  it("includes folder language metadata on folder list items", () => {
    const folder: FolderEntry = {
      name: "sketch",
      dirPath: "/tmp/sketch",
      folder: "",
      slug: "sketch",
      title: "Sketch",
      date: "2026-04-21T00:00:00.000Z",
      lang: "zh",
      tags: [],
      description: "",
      children: [],
    };

    assert.match(folderLiHtml(folder), /<li lang="zh">/);
  });
});
