import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getContentType,
  getPublicOverrideDir,
  getPublicOverridePath,
} from "./public-override.js";

describe("getPublicOverrideDir", () => {
  it("defaults to public-override", () => {
    assert.equal(getPublicOverrideDir({}), "public-override");
  });

  it("uses PUBLIC_OVERRIDE_DIR when set", () => {
    assert.equal(getPublicOverrideDir({ PUBLIC_OVERRIDE_DIR: ".public" }), ".public");
  });
});

describe("getPublicOverridePath", () => {
  it("returns existing override file path", () => {
    const root = mkdtempSync(join(tmpdir(), "public-override-"));
    mkdirSync(join(root, "public-override"), { recursive: true });
    writeFileSync(join(root, "public-override", "logo.svg"), "<svg />\n");

    assert.equal(
      getPublicOverridePath("/logo.svg", {}, root),
      join(root, "public-override", "logo.svg"),
    );
  });

  it("supports nested files", () => {
    const root = mkdtempSync(join(tmpdir(), "public-override-"));
    mkdirSync(join(root, "public-override", "images"), { recursive: true });
    writeFileSync(join(root, "public-override", "images", "og.png"), "png\n");

    assert.equal(
      getPublicOverridePath("/images/og.png", {}, root),
      join(root, "public-override", "images", "og.png"),
    );
  });

  it("returns null when override file is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "public-override-"));
    assert.equal(getPublicOverridePath("/logo.svg", {}, root), null);
  });

  it("returns null for root and traversal paths", () => {
    const root = mkdtempSync(join(tmpdir(), "public-override-"));
    assert.equal(getPublicOverridePath("/", {}, root), null);
    assert.equal(getPublicOverridePath("/../secret.txt", {}, root), null);
    assert.equal(getPublicOverridePath("/%2e%2e/secret.txt", {}, root), null);
  });

  it("respects PUBLIC_OVERRIDE_DIR", () => {
    const root = mkdtempSync(join(tmpdir(), "public-override-"));
    mkdirSync(join(root, ".public"), { recursive: true });
    writeFileSync(join(root, ".public", "favicon.svg"), "<svg />\n");

    assert.equal(
      getPublicOverridePath("/favicon.svg", { PUBLIC_OVERRIDE_DIR: ".public" }, root),
      join(root, ".public", "favicon.svg"),
    );
  });
});

describe("getContentType", () => {
  it("returns type for common public assets", () => {
    assert.equal(getContentType("logo.svg"), "image/svg+xml");
    assert.equal(getContentType("images/og.png"), "image/png");
    assert.equal(getContentType("models/chair.glb"), "model/gltf-binary");
    assert.equal(getContentType("site.webmanifest"), "application/manifest+json; charset=utf-8");
  });
});
