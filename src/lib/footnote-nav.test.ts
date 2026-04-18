import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldHandleFootnoteItemClick } from "./footnote-nav.js";

function fakeTarget(matches: string[] = []) {
  return {
    closest(selector: string) {
      return matches.includes(selector) ? this : null;
    },
  };
}

describe("shouldHandleFootnoteItemClick", () => {
  it("handles clicks on empty footnote row area", () => {
    assert.equal(shouldHandleFootnoteItemClick(fakeTarget()), true);
  });

  it("handles clicks on the dedicated back-link", () => {
    assert.equal(shouldHandleFootnoteItemClick(fakeTarget([".fn-back"])), true);
  });

  it("does not hijack external or internal content links", () => {
    assert.equal(shouldHandleFootnoteItemClick(fakeTarget(["a[href], button, input, textarea, select, summary"])), false);
  });

  it("defaults to handled when event target is missing", () => {
    assert.equal(shouldHandleFootnoteItemClick(null), true);
  });
});
