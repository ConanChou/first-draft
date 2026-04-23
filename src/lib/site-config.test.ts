import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LANG,
  DEFAULT_SITE_OWNER,
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_URL,
  getDefaultLang,
  getSiteOwner,
  getSiteName,
  getSiteDescription,
  getSiteUrl,
} from "./site-config.js";

describe("getSiteDescription", () => {
  it("returns env-provided site description when set", () => {
    assert.equal(
      getSiteDescription({ SITE_DESCRIPTION: "Writing-first personal site." }),
      "Writing-first personal site.",
    );
  });

  it("falls back to generic open-source-safe description", () => {
    assert.equal(getSiteDescription({}), DEFAULT_SITE_DESCRIPTION);
    assert.equal(DEFAULT_SITE_DESCRIPTION, "A calm, text-first publishing system.");
  });
});

describe("getSiteUrl", () => {
  it("returns env-provided site url when set", () => {
    assert.equal(getSiteUrl({ SITE_URL: "https://example.com" }), "https://example.com");
  });

  it("falls back to default site url", () => {
    assert.equal(getSiteUrl({}), DEFAULT_SITE_URL);
    assert.equal(DEFAULT_SITE_URL, "https://example.com");
  });
});

describe("getSiteName", () => {
  it("prefers explicit site name when set", () => {
    assert.equal(getSiteName({ SITE_NAME: "Writing Garden", SITE_URL: "https://example.com" }), "Writing Garden");
  });

  it("derives the hostname from site url", () => {
    assert.equal(getSiteName({ SITE_URL: "https://writing.example.com/posts/" }), "writing.example.com");
  });

  it("strips leading www", () => {
    assert.equal(getSiteName({ SITE_URL: "https://www.example.com" }), "example.com");
  });

  it("falls back cleanly for malformed site url", () => {
    assert.equal(getSiteName({ SITE_URL: "example.com/path" }), "example.com");
  });

  it("falls back to default site name", () => {
    assert.equal(getSiteName({}), DEFAULT_SITE_NAME);
    assert.equal(DEFAULT_SITE_NAME, "example.com");
  });
});

describe("getSiteOwner", () => {
  it("returns explicit site owner when set", () => {
    assert.equal(getSiteOwner({ SITE_OWNER: "Jane Doe" }), "Jane Doe");
  });

  it("falls back to site name when owner is absent", () => {
    assert.equal(getSiteOwner({ SITE_NAME: "Writing Garden" }), "Writing Garden");
  });

  it("falls back to default owner", () => {
    assert.equal(getSiteOwner({}), DEFAULT_SITE_NAME);
    assert.equal(DEFAULT_SITE_OWNER, "Site Owner");
  });
});

describe("getDefaultLang", () => {
  it("returns env-provided default lang when set", () => {
    assert.equal(getDefaultLang({ DEFAULT_LANG: "en" }), "en");
  });

  it("falls back to en", () => {
    assert.equal(getDefaultLang({}), DEFAULT_LANG);
    assert.equal(DEFAULT_LANG, "en");
  });
});
