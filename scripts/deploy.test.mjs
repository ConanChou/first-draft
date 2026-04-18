import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const DEPLOY = new URL("./deploy", import.meta.url).pathname;

function run(args) {
  return spawnSync("sh", [DEPLOY, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

describe("deploy --help", () => {
  it("--help prints usage and exits 0", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*deploy/i);
  });

  it("-h prints usage and exits 0", () => {
    const r = run(["-h"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /usage.*deploy/i);
  });
});
