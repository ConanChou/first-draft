import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canUseSidenotes } from "./post-footnotes.js";

describe("canUseSidenotes", () => {
  it("requires the minimum viewport width", () => {
    assert.equal(
      canUseSidenotes({
        viewportWidth: 1059,
        postBodyRight: 700,
        requiredRightGutter: 250,
      }),
      false,
    );
  });

  it("falls back to inline footnotes when the sidenote would overflow", () => {
    assert.equal(
      canUseSidenotes({
        viewportWidth: 1060,
        postBodyRight: 930,
        requiredRightGutter: 250,
      }),
      false,
    );
  });

  it("enables sidenotes once the full note fits inside the viewport", () => {
    assert.equal(
      canUseSidenotes({
        viewportWidth: 1260,
        postBodyRight: 930,
        requiredRightGutter: 250,
      }),
      true,
    );
  });
});
