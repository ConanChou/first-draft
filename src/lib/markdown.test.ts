import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rewriteHashtagsHtml,
  rewriteHashtagsMd,
  rewriteInternalLinksMd,
} from "./markdown.js";

// ── rewriteHashtagsHtml ──────────────────────────────────────────

describe("rewriteHashtagsHtml", () => {
  it("rewrites #tag after whitespace", () => {
    const out = rewriteHashtagsHtml("<p>See #writing for details.</p>");
    assert.ok(out.includes('<a href="/tags/writing/">#writing</a>'));
  });

  it("rewrites #tag at start of text node", () => {
    const out = rewriteHashtagsHtml("<p>#craft is important.</p>");
    assert.ok(out.includes('<a href="/tags/craft/">#craft</a>'));
  });

  it("rewrites CJK hashtags", () => {
    const out = rewriteHashtagsHtml("<p>主题 #写作 很重要</p>");
    assert.ok(out.includes('<a href="/tags/写作/">#写作</a>'));
  });

  it("does not rewrite #tag inside <code>", () => {
    const out = rewriteHashtagsHtml("<p><code>#writing</code></p>");
    assert.ok(!out.includes("/tags/"));
    assert.ok(out.includes("<code>#writing</code>"));
  });

  it("does not rewrite #tag inside <pre>", () => {
    const out = rewriteHashtagsHtml("<pre><code>#writing</code></pre>");
    assert.ok(!out.includes("/tags/"));
  });

  it("does not match C# (no preceding whitespace)", () => {
    const out = rewriteHashtagsHtml("<p>Written in C#.</p>");
    assert.ok(!out.includes("/tags/"));
  });

  it("does not match issue #42 (digit after #)", () => {
    const out = rewriteHashtagsHtml("<p>See issue #42.</p>");
    assert.ok(!out.includes("/tags/"));
  });

  it("rewrites multiple tags in one string", () => {
    const out = rewriteHashtagsHtml("<p>Tags: #a and #b</p>");
    assert.ok(out.includes('/tags/a/'));
    assert.ok(out.includes('/tags/b/'));
  });
});

// ── rewriteHashtagsMd ────────────────────────────────────────────

describe("rewriteHashtagsMd", () => {
  it("rewrites #tag to markdown link", () => {
    const out = rewriteHashtagsMd("See #writing here.");
    assert.ok(out.includes("[#writing](/tags/writing.md)"));
  });

  it("does not rewrite #tag inside fenced code block", () => {
    const out = rewriteHashtagsMd("```\n#writing\n```");
    assert.ok(!out.includes("/tags/"));
  });

  it("does not rewrite #tag inside inline code", () => {
    const out = rewriteHashtagsMd("Use `#tag` syntax.");
    assert.ok(!out.includes("/tags/"));
    assert.ok(out.includes("`#tag`"));
  });

  it("rewrites CJK tags", () => {
    const out = rewriteHashtagsMd("关于 #写作 的笔记");
    assert.ok(out.includes("[#写作](/tags/写作.md)"));
  });
});

// ── rewriteInternalLinksMd ───────────────────────────────────────

describe("rewriteInternalLinksMd", () => {
  it("rewrites internal path to .md sibling", () => {
    const out = rewriteInternalLinksMd("[note](/0042-some-post/)");
    assert.ok(out.includes("(/0042-some-post.md)"));
  });

  it("rewrites path without trailing slash", () => {
    const out = rewriteInternalLinksMd("[note](/0042-some-post)");
    assert.ok(out.includes("(/0042-some-post.md)"));
  });

  it("does not rewrite external URLs", () => {
    const input = "[external](https://example.com/path)";
    assert.equal(rewriteInternalLinksMd(input), input);
  });

  it("preserves hash anchor", () => {
    const out = rewriteInternalLinksMd("[note](/0042-post/#section)");
    assert.ok(out.includes("(/0042-post.md#section)"));
  });
});
