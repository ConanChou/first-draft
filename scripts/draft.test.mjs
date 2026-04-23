import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const DRAFT = new URL("./draft", import.meta.url).pathname;

function run(args, iaPath) {
  return spawnSync(process.execPath, [DRAFT, ...args], {
    encoding: "utf-8",
    env: { ...process.env, CONTENT_PATH: iaPath, DEFAULT_LANG: "en" },
    timeout: 5000,
  });
}

describe("draft", () => {
  let tmp;
  before(() => { tmp = mkdtempSync(join(tmpdir(), "draft-test-")); });
  after(() => { rmSync(tmp, { recursive: true }); });

  it("creates NNNN.md for default lang", () => {
    const r = run([], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/\d{4}\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "en"/);
    assert.match(content, /desc: ""/);
  });

  it("creates NNNN.zh.md with --lang zh", () => {
    // seed a file so ID advances
    writeFileSync(join(tmp, "0001.md"), "");
    const r = run(["--lang", "zh"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/\d{4}\.zh\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "zh"/);
  });

  it("--lang en still produces NNNN.md (no suffix for default)", () => {
    const r = run(["--lang", "en"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/\d{4}\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "en"/);
  });

  it("--lang zh with folder creates file in subdirectory", () => {
    const r = run(["--lang", "zh", "sketch"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/sketch\/\d{4}\.zh\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "zh"/);
  });

  it("folder before --lang also works", () => {
    const r = run(["notes", "--lang", "zh"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/notes\/\d{4}\.zh\.md$/);
  });

  it("--translate reuses existing id and defaults to same folder", () => {
    writeFileSync(join(tmp, "0042.md"), "# Source");
    const r = run(["--translate", "42", "--lang", "zh"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/0042\.zh\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "zh"/);
  });

  it("--translate with --folder writes translation to target folder", () => {
    writeFileSync(join(tmp, "0042.md"), "# Source");
    const r = run(["--translate", "42", "--lang", "zh", "--folder", "essays"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/essays\/0042\.zh\.md$/);
  });

  it("--help prints usage and exits 0", () => {
    const r = run(["--help"], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*draft/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*draft/i);
  });

  it("errors when --lang has no value", () => {
    const r = run(["--lang"], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--lang requires/i);
  });

  it("errors when --translate has no value", () => {
    const r = run(["--translate"], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--translate requires/i);
  });

  it("errors when --translate is missing --lang", () => {
    writeFileSync(join(tmp, "0042.md"), "# Source");
    const r = run(["--translate", "42"], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--lang/i);
  });

  it("errors on missing CONTENT_PATH", () => {
    const r = spawnSync(process.execPath, [DRAFT], {
      encoding: "utf-8",
      env: { ...process.env, CONTENT_PATH: "" },
      timeout: 5000,
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /CONTENT_PATH/);
  });
});
