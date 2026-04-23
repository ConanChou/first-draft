import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  symlinkSync,
  readlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const LINK = new URL("./link", import.meta.url).pathname;
const LIB = new URL("./_lib.mjs", import.meta.url).pathname;

function run(args) {
  return spawnSync(process.execPath, [LINK, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

describe("link --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*link/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*link/i);
  });
});

describe("link", () => {
  it("relinks src/content when symlink points to wrong target", () => {
    const root = mkdtempSync(join(tmpdir(), "conan-link-"));
    const scriptsDir = join(root, "scripts");
    const srcDir = join(root, "src");
    const contentPath = join(root, "content");
    const wrongPath = join(root, "wrong-content");

    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(contentPath, { recursive: true });
    mkdirSync(wrongPath, { recursive: true });

    copyFileSync(LINK, join(scriptsDir, "link"));
    copyFileSync(LIB, join(scriptsDir, "_lib.mjs"));
    writeFileSync(join(root, ".env"), `CONTENT_PATH="${contentPath}"\n`);
    symlinkSync(wrongPath, join(srcDir, "content"));

    const r = spawnSync(process.execPath, [join(scriptsDir, "link")], {
      cwd: root,
      encoding: "utf-8",
      timeout: 5000,
    });

    assert.equal(r.status, 0, r.stderr);
    assert.equal(readlinkSync(join(srcDir, "content")), contentPath);
    assert.match(r.stdout, /linked:/i);
  });
});
