import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const TRANSLATE = new URL("./translate", import.meta.url).pathname;

function run(args) {
  return spawnSync(process.execPath, [TRANSLATE, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

describe("translate --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*translate/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*translate/i);
  });
});
