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

const FETCH = new URL("./fetch", import.meta.url).pathname;
const LINK = new URL("./link", import.meta.url).pathname;
const LIB = new URL("./_lib.mjs", import.meta.url).pathname;

function run(args) {
  return spawnSync(process.execPath, [FETCH, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

function runInTempRoot() {
  const root = mkdtempSync(join(tmpdir(), "conan-fetch-"));
  const scriptsDir = join(root, "scripts");
  const srcDir = join(root, "src");
  const iaPath = join(root, "ia");
  const wrongIaPath = join(root, "wrong-ia");

  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(iaPath, { recursive: true });
  mkdirSync(wrongIaPath, { recursive: true });

  copyFileSync(FETCH, join(scriptsDir, "fetch"));
  copyFileSync(LINK, join(scriptsDir, "link"));
  copyFileSync(LIB, join(scriptsDir, "_lib.mjs"));
  writeFileSync(join(root, ".env"), `IA_WRITER_PATH="${iaPath}"\n`);
  symlinkSync(wrongIaPath, join(srcDir, "content"));

  const result = spawnSync(process.execPath, [join(scriptsDir, "fetch")], {
    cwd: root,
    encoding: "utf-8",
    timeout: 5000,
  });

  return {
    ...result,
    root,
    contentTarget: readlinkSync(join(srcDir, "content")),
    iaPath,
  };
}

describe("fetch --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*fetch/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*fetch/i);
  });
});

describe("fetch", () => {
  it("relinks src/content when symlink points to wrong target", () => {
    const r = runInTempRoot();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.contentTarget, r.iaPath);
    assert.match(r.stdout, /running link|linked:/i);
  });
});
