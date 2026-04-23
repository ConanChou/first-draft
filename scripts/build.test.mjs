import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BUILD = new URL("./build", import.meta.url).pathname;

function run(args) {
  return spawnSync("sh", [BUILD, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

function runInTempRoot(envFile = "") {
  const root = mkdtempSync(join(tmpdir(), "site-build-"));
  const scriptsDir = join(root, "scripts");
  const fakeBin = join(root, "fake-bin");
  const pnpmLog = join(root, "pnpm.log");

  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });

  copyFileSync(BUILD, join(scriptsDir, "build"));
  writeFileSync(join(root, ".env"), envFile);
  writeFileSync(
    join(fakeBin, "pnpm"),
    '#!/bin/sh\n' +
    'printf \'%s\\n\' "$*" >> "$PNPM_LOG"\n' +
    'mkdir -p dist\n' +
    'printf \'<!doctype html>\\n\' > dist/index.html\n',
    { mode: 0o755 },
  );

  const result = spawnSync("sh", [join(scriptsDir, "build")], {
    cwd: root,
    encoding: "utf-8",
    timeout: 5000,
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
      PNPM_LOG: pnpmLog,
    },
  });

  return {
    ...result,
    root,
    pnpmLog: readFileSync(pnpmLog, "utf-8"),
  };
}

describe("build --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*build/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*build/i);
  });
});

describe("build", () => {
  it("writes dist/CNAME from env when CNAME_DOMAIN is set", () => {
    const r = runInTempRoot('CNAME_DOMAIN="blog.example.com"\n');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(r.root, "dist", "CNAME"), "utf-8"), "blog.example.com\n");
    assert.match(r.pnpmLog, /^build$/m);
  });

  it("falls back to SITE_URL host when CNAME_DOMAIN is unset", () => {
    const r = runInTempRoot('SITE_URL="https://conan.one"\n');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(r.root, "dist", "CNAME"), "utf-8"), "conan.one\n");
  });

  it("does not write CNAME for github.io host when CNAME_DOMAIN is unset", () => {
    const r = runInTempRoot('SITE_URL="https://user.github.io"\n');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(join(r.root, "dist", "CNAME")), false);
  });

  it("removes stale dist/CNAME when CNAME_DOMAIN is unset", () => {
    const r = runInTempRoot("");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(join(r.root, "dist", "CNAME")), false);
  });
});
