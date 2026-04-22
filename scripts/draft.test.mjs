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
    env: { ...process.env, IA_WRITER_PATH: iaPath },
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
    assert.match(content, /lang: "zh"/);
    assert.match(content, /desc: ""/);
  });

  it("creates NNNN.en.md with --lang en", () => {
    // seed a file so ID advances
    writeFileSync(join(tmp, "0001.md"), "");
    const r = run(["--lang", "en"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/\d{4}\.en\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "en"/);
  });

  it("--lang zh still produces NNNN.md (no suffix for default)", () => {
    const r = run(["--lang", "zh"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/\d{4}\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "zh"/);
  });

  it("--lang en with folder creates file in subdirectory", () => {
    const r = run(["--lang", "en", "sketch"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/sketch\/\d{4}\.en\.md$/);
    const content = readFileSync(created, "utf-8");
    assert.match(content, /lang: "en"/);
  });

  it("folder before --lang also works", () => {
    const r = run(["notes", "--lang", "en"], tmp);
    assert.equal(r.status, 0, r.stderr);
    const created = r.stdout.trim();
    assert.match(created, /\/notes\/\d{4}\.en\.md$/);
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

  it("errors on missing IA_WRITER_PATH", () => {
    const r = spawnSync(process.execPath, [DRAFT], {
      encoding: "utf-8",
      env: { ...process.env, IA_WRITER_PATH: "" },
      timeout: 5000,
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /IA_WRITER_PATH/);
  });
});
