import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFontProfileForLang, getFontProfileForLangs } from "./font-profile";

describe("getFontProfileForLang", () => {
  it("returns latin for english pages", () => {
    assert.equal(getFontProfileForLang("en"), "latin");
  });

  it("returns mixed for non-english pages", () => {
    assert.equal(getFontProfileForLang("zh"), "mixed");
  });
});

describe("getFontProfileForLangs", () => {
  it("returns latin when all content is english", () => {
    assert.equal(getFontProfileForLangs(["en", "en"]), "latin");
  });

  it("returns mixed when any content is non-english", () => {
    assert.equal(getFontProfileForLangs(["en", "zh"]), "mixed");
  });

  it("returns mixed for empty collections", () => {
    assert.equal(getFontProfileForLangs([]), "mixed");
  });
});
