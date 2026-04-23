import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMd } from "./render.js";

describe("renderMd", () => {
  it("renders basic markdown to HTML", async () => {
    const html = await renderMd("Hello **world**.");
    assert.ok(html.includes("<strong>world</strong>"));
  });

  it("uses english smart typography by default", async () => {
    const html = await renderMd(`He said "hi" -- then left.`);
    assert.ok(html.includes("\u201Chi\u201D"), html);
    assert.ok(html.includes("\u2014"), html);
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

  it("renders thematic break as three-dot ornament", async () => {
    const html = await renderMd("Para one.\n\n---\n\nPara two.");
    assert.ok(html.includes(`class="hr-dots"`), html);
    assert.ok(!/<hr\s*\/?>/i.test(html), html);
  });

  it("applies smart typography to english body", async () => {
    const html = await renderMd(`He said "hi" -- then left.`, "en");
    assert.ok(html.includes("\u201Chi\u201D"), html);
    assert.ok(html.includes("\u2014"), html);
  });

  it("applies smart typography to chinese body", async () => {
    const html = await renderMd(`是--真`, "zh");
    assert.ok(html.includes("\u2014\u2014"), html);
  });

  it("rewrites Δ mentions in body", async () => {
    const html = await renderMd(`See [note](/0042) later.`);
    assert.ok(html.includes("Δ\u20090042"), html);
  });

  it("renders footnote reference as superscript", async () => {
    const html = await renderMd("Text[^1] end.\n\n[^1]: A note.");
    assert.ok(html.includes('<sup class="fn-ref"'), html);
    assert.ok(html.includes('href="#fn-1"'), html);
  });

  it("renders footnote section at end", async () => {
    const html = await renderMd("Text[^1] end.\n\n[^1]: A note.");
    assert.ok(html.includes('<section class="footnotes"'), html);
    assert.ok(html.includes('id="fn-1"'), html);
    assert.ok(html.includes("A note."), html);
    assert.ok(html.includes("↩"), html);
  });

  it("omits footnote section when no footnotes", async () => {
    const html = await renderMd("Just a paragraph.");
    assert.ok(!html.includes("footnotes"), html);
  });

  it("autolinks bare URL in footnote content", async () => {
    const html = await renderMd("See[^1].\n\n[^1]: Visit https://example.com for more.");
    assert.ok(html.includes('href="https://example.com"'), html);
  });

  it("autolinks bare URL in body text", async () => {
    const html = await renderMd("Go to https://example.com now.");
    assert.ok(html.includes('href="https://example.com"'), html);
  });

  it("adds target=_blank and rel to external links", async () => {
    const html = await renderMd("[site](https://example.com)");
    assert.ok(html.includes('target="_blank"'), html);
    assert.ok(html.includes('rel="noopener noreferrer"'), html);
  });

  it("does not add target=_blank to relative links", async () => {
    const html = await renderMd("[about](/about)");
    assert.ok(!html.includes('target="_blank"'), html);
  });

  it("does not add target=_blank to anchor links", async () => {
    const html = await renderMd("[section](#heading)");
    assert.ok(!html.includes('target="_blank"'), html);
  });

  it("adds target=_blank to bare URL autolinks", async () => {
    const html = await renderMd("See https://example.com for info.");
    assert.ok(html.includes('target="_blank"'), html);
  });

  it("adds target=_blank to external links in footnote content", async () => {
    const html = await renderMd("Text[^1].\n\n[^1]: See https://example.com here.");
    assert.ok(html.includes('target="_blank"'), html);
  });

  it("applies smart typography in footnote content", async () => {
    const html = await renderMd(`Body[^1].\n\n[^1]: He said "hi" -- ok.`, "en");
    assert.ok(html.includes("\u201Chi\u201D"), html);
    assert.ok(html.includes("\u2014"), html);
  });

  it("rewrites Δ mentions in footnote content", async () => {
    const html = await renderMd(`Body[^1].\n\n[^1]: See [note](/0042).`);
    assert.ok(html.includes("Δ\u20090042"), html);
  });

  it("rewrites hashtags in footnote content", async () => {
    const html = await renderMd(`Body[^1].\n\n[^1]: A #tag here.`);
    assert.ok(html.includes(`href="/tags/tag/"`), html);
  });
});
