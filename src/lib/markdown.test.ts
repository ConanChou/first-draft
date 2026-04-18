import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rewriteHashtagsHtml,
  rewriteHashtagsMd,
  rewriteInternalLinksMd,
  rewriteDeltaMentions,
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

// ── rewriteDeltaMentions ─────────────────────────────────────────

describe("rewriteDeltaMentions", () => {
  it("prepends Δ sigil to titled internal link", () => {
    const out = rewriteDeltaMentions(
      `<p>see <a href="/0042">On writing well</a> for context</p>`,
    );
    assert.ok(
      out.includes(
        `<a href="/0042"><span class="delta">Δ\u20090042</span>\u00A0On writing well</a>`,
      ),
      out,
    );
  });

  it("replaces bare ID link text with Δ sigil", () => {
    const out = rewriteDeltaMentions(
      `<p>see <a href="/0042">0042</a></p>`,
    );
    assert.ok(
      out.includes(
        `<a href="/0042"><span class="delta">Δ\u20090042</span></a>`,
      ),
      out,
    );
  });

  it("works with slug href", () => {
    const out = rewriteDeltaMentions(
      `<p><a href="/0042-on-writing-well">On writing well</a></p>`,
    );
    assert.ok(out.includes(`<span class="delta">Δ\u20090042</span>`), out);
  });

  it("works with .html suffix", () => {
    const out = rewriteDeltaMentions(
      `<p><a href="/0042.html">title</a></p>`,
    );
    assert.ok(out.includes(`<span class="delta">Δ\u20090042</span>`), out);
  });

  it("works with hash anchor", () => {
    const out = rewriteDeltaMentions(
      `<p><a href="/0042/#intro">title</a></p>`,
    );
    assert.ok(out.includes(`<span class="delta">Δ\u20090042</span>`), out);
  });

  it("ignores external URLs", () => {
    const input = `<p><a href="https://example.com/0042">x</a></p>`;
    assert.equal(rewriteDeltaMentions(input), input);
  });

  it("ignores non-ID paths", () => {
    const input = `<p><a href="/about">about</a></p>`;
    assert.equal(rewriteDeltaMentions(input), input);
  });

  it("ignores 5-digit paths", () => {
    const input = `<p><a href="/00423-foo">x</a></p>`;
    assert.equal(rewriteDeltaMentions(input), input);
  });

  it("is idempotent", () => {
    const once = rewriteDeltaMentions(
      `<p><a href="/0042">title</a></p>`,
    );
    const twice = rewriteDeltaMentions(once);
    assert.equal(twice, once);
  });

  it("handles multiple mentions in one string", () => {
    const out = rewriteDeltaMentions(
      `<p><a href="/0042">a</a> and <a href="/0099">b</a></p>`,
    );
    assert.ok(out.includes("Δ\u20090042"), out);
    assert.ok(out.includes("Δ\u20090099"), out);
  });

  it("matches anchor when href is not the first attribute", () => {
    const out = rewriteDeltaMentions(
      `<p><a class="x" href="/0042">title</a></p>`,
    );
    assert.ok(out.includes("Δ\u20090042"), out);
  });
});
