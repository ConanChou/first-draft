import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processFootnotes, buildFootnoteSection } from "./footnotes.js";

describe("processFootnotes", () => {
  it("returns unchanged md and empty footnotes when none present", () => {
    const { md, footnotes } = processFootnotes("Hello world.");
    assert.equal(md, "Hello world.");
    assert.deepEqual(footnotes, []);
  });

  it("replaces inline ref with superscript HTML", () => {
    const { md } = processFootnotes("Text[^1] more.\n\n[^1]: Content.");
    assert.ok(
      md.includes('<sup class="fn-ref" id="fnref-1"><a href="#fn-1">1</a></sup>'),
      `got: ${md}`,
    );
  });

  it("removes definition lines from output md", () => {
    const { md } = processFootnotes("Text[^1] more.\n\n[^1]: Content.");
    assert.ok(!md.includes("[^1]:"), `got: ${md}`);
  });

  it("collects footnote entries in order of first appearance", () => {
    const { footnotes } = processFootnotes(
      "A[^b] and B[^a].\n\n[^a]: Alpha.\n[^b]: Beta.",
    );
    assert.equal(footnotes.length, 2);
    assert.equal(footnotes[0].label, "b");
    assert.equal(footnotes[0].index, 1);
    assert.equal(footnotes[1].label, "a");
    assert.equal(footnotes[1].index, 2);
  });

  it("assigns sequential numbers to multiple footnotes", () => {
    const { md } = processFootnotes(
      "A[^x] B[^y].\n\n[^x]: X.\n[^y]: Y.",
    );
    assert.ok(md.includes('id="fnref-1"'), md);
    assert.ok(md.includes('id="fnref-2"'), md);
    assert.ok(md.includes('href="#fn-1"'), md);
    assert.ok(md.includes('href="#fn-2"'), md);
  });

  it("captures footnote content", () => {
    const { footnotes } = processFootnotes("T[^a].\n\n[^a]: Hello content.");
    assert.equal(footnotes[0].content, "Hello content.");
  });

  it("does not duplicate a label used multiple times", () => {
    const { footnotes } = processFootnotes(
      "A[^x] and B[^x].\n\n[^x]: Shared.",
    );
    assert.equal(footnotes.length, 1);
  });

  it("reuses the same number for repeated inline refs", () => {
    const { md } = processFootnotes("A[^x] and B[^x].\n\n[^x]: Shared.");
    const matches = [...md.matchAll(/id="fnref-1"/g)];
    assert.equal(matches.length, 2, `expected 2 fnref-1 refs, got: ${md}`);
  });

  it("ignores ref inside inline code span", () => {
    const { md, footnotes } = processFootnotes(
      "Use `arr[^1]` syntax.\n\n[^1]: Defined.",
    );
    assert.ok(md.includes("`arr[^1]`"), `inline code mangled: ${md}`);
    assert.equal(footnotes.length, 0, "no inline ref outside code → no footnote");
  });

  it("ignores ref inside fenced code block", () => {
    const md0 = "Outside.\n\n```\nx[^1]\n```\n\n[^1]: Defined.";
    const { md, footnotes } = processFootnotes(md0);
    assert.ok(md.includes("x[^1]"), `fence body mangled: ${md}`);
    assert.equal(footnotes.length, 0);
  });

  it("ignores definition line inside fenced code block", () => {
    const md0 = "```\n[^x]: not a def\n```\n";
    const { md } = processFootnotes(md0);
    assert.ok(md.includes("[^x]: not a def"), `def stripped from fence: ${md}`);
  });

  it("captures multi-line indented continuation", () => {
    const md0 = "T[^a].\n\n[^a]: Line one.\n    Line two.\n    Line three.\n\nNext para.";
    const { footnotes } = processFootnotes(md0);
    assert.equal(footnotes.length, 1);
    assert.match(footnotes[0].content, /Line one\./);
    assert.match(footnotes[0].content, /Line two\./);
    assert.match(footnotes[0].content, /Line three\./);
  });
});

describe("buildFootnoteSection", () => {
  it("returns empty string for empty footnotes", () => {
    assert.equal(buildFootnoteSection([]), "");
  });

  it("wraps in <section class='footnotes'>", () => {
    const html = buildFootnoteSection([{ label: "1", index: 1, content: "Note." }]);
    assert.ok(html.includes('<section class="footnotes"'), html);
  });

  it("includes footnote content in <li id='fn-N'>", () => {
    const html = buildFootnoteSection([{ label: "a", index: 1, content: "My note." }]);
    assert.ok(html.includes('id="fn-1"'), html);
    assert.ok(html.includes("My note."), html);
  });

  it("includes back-link with ↩", () => {
    const html = buildFootnoteSection([{ label: "a", index: 1, content: "Note." }]);
    assert.ok(html.includes('href="#fnref-1"'), html);
    assert.ok(html.includes("↩"), html);
  });

  it("includes fn-back class on back-link", () => {
    const html = buildFootnoteSection([{ label: "a", index: 1, content: "Note." }]);
    assert.ok(html.includes('class="fn-back"'), html);
  });
});
