import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMd } from "./render.js";

describe("renderMd", () => {
  it("renders basic markdown to HTML", async () => {
    const html = await renderMd("Hello **world**.");
    assert.ok(html.includes("<strong>world</strong>"));
  });

  it("strips leading h1 matching title pattern", async () => {
    const html = await renderMd("# Hello World\n\nBody paragraph.");
    assert.ok(!html.includes("<h1>"));
    assert.ok(html.includes("Body paragraph"));
  });

  it("strips h1 when preceded by whitespace/blank lines", async () => {
    const html = await renderMd("\n\n# Hello World\n\nBody.");
    assert.ok(!html.includes("<h1>"));
    assert.ok(html.includes("Body"));
  });

  it("does not strip ## or deeper headings", async () => {
    const html = await renderMd("## Section\n\nBody.");
    assert.ok(html.includes("<h2>"));
  });

  it("preserves non-title h1 if body has no leading h1", async () => {
    const html = await renderMd("Intro.\n\n# Subheading\n\nMore.");
    assert.ok(html.includes("<h1>"));
  });

  it("rewrites #hashtags to links", async () => {
    const html = await renderMd("See #writing for more.");
    assert.ok(html.includes('<a href="/tags/writing/">#writing</a>'));
  });

  it("does not rewrite #hashtags inside code blocks", async () => {
    const html = await renderMd("```\n#notag\n```");
    assert.ok(!html.includes("/tags/"));
  });
});
