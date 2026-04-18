import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySmartTypography } from "./typography.js";

// ── English ───────────────────────────────────────────────────────

describe("applySmartTypography (en)", () => {
  it("curls double quotes", () => {
    const out = applySmartTypography(`<p>He said "hello" loudly.</p>`, "en");
    assert.ok(out.includes("\u201Chello\u201D"), out);
  });

  it("curls single quotes and apostrophes", () => {
    const out = applySmartTypography(`<p>it's 'fine' really</p>`, "en");
    assert.ok(out.includes("it\u2019s"), out);
    assert.ok(out.includes("\u2018fine\u2019"), out);
  });

  it("converts -- to em-dash (no surrounding spaces)", () => {
    const out = applySmartTypography(`<p>yes--really</p>`, "en");
    assert.ok(out.includes("yes\u2014really"), out);
  });

  it("converts spaced -- to em-dash with hair-thin spacing preserved", () => {
    const out = applySmartTypography(`<p>yes -- really</p>`, "en");
    assert.ok(out.includes("\u2014"), out);
    assert.ok(!out.includes("--"), out);
  });

  it("converts ... to ellipsis", () => {
    const out = applySmartTypography(`<p>and then...what?</p>`, "en");
    assert.ok(out.includes("\u2026"), out);
    assert.ok(!out.includes("..."), out);
  });

  it("converts (c), (r), (tm) to symbols", () => {
    const out = applySmartTypography(`<p>(c) 2026 (r) (tm)</p>`, "en");
    assert.ok(out.includes("\u00A9"), out);
    assert.ok(out.includes("\u00AE"), out);
    assert.ok(out.includes("\u2122"), out);
  });

  it("leaves content inside <code> untouched", () => {
    const out = applySmartTypography(
      `<p>x <code>"raw" -- ...</code> y</p>`,
      "en",
    );
    assert.ok(out.includes(`<code>"raw" -- ...</code>`), out);
  });

  it("leaves content inside <pre> untouched", () => {
    const out = applySmartTypography(
      `<pre><code>"raw" -- ...</code></pre>`,
      "en",
    );
    assert.ok(out.includes(`"raw" -- ...`), out);
  });

  it("does not touch existing curly quotes", () => {
    const input = `<p>\u201Calready\u201D curled</p>`;
    const out = applySmartTypography(input, "en");
    assert.equal(out, input);
  });

  it("handles quotes at start of paragraph", () => {
    const out = applySmartTypography(`<p>"Opening"</p>`, "en");
    assert.ok(out.includes("\u201COpening\u201D"), out);
  });

  it("does not treat year apostrophe as opening quote (e.g. '90s)", () => {
    const out = applySmartTypography(`<p>back in '90s era</p>`, "en");
    assert.ok(!out.includes("\u2018"), `should not open-quote: ${out}`);
    assert.ok(out.includes("\u201990s"), out);
  });

  it("does not break HTML attribute quotes", () => {
    const out = applySmartTypography(
      `<p><a href="/foo">"link"</a></p>`,
      "en",
    );
    assert.ok(out.includes(`href="/foo"`), out);
    assert.ok(out.includes("\u201Clink\u201D"), out);
  });
});

// ── Chinese ───────────────────────────────────────────────────────

describe("applySmartTypography (zh)", () => {
  it("leaves existing CJK corner brackets alone", () => {
    const input = `<p>他说\u300C你好\u300D。</p>`;
    const out = applySmartTypography(input, "zh");
    assert.equal(out, input);
  });

  it("converts -- to double em-dash \u2014\u2014", () => {
    const out = applySmartTypography(`<p>是的--真的</p>`, "zh");
    assert.ok(out.includes("\u2014\u2014"), out);
  });

  it("converts ... to double ellipsis \u2026\u2026", () => {
    const out = applySmartTypography(`<p>然后...呢</p>`, "zh");
    assert.ok(out.includes("\u2026\u2026"), out);
  });

  it("does not curl ASCII double quotes in zh", () => {
    const input = `<p>code "foo" end</p>`;
    const out = applySmartTypography(input, "zh");
    assert.ok(!out.includes("\u201C"), out);
    assert.ok(!out.includes("\u201D"), out);
  });

  it("leaves content inside <code> untouched (zh)", () => {
    const out = applySmartTypography(
      `<p><code>-- ...</code></p>`,
      "zh",
    );
    assert.ok(out.includes(`<code>-- ...</code>`), out);
  });
});
