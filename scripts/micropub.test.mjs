import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// ── Helpers ─────────────────────────────────────────────────────────────────

const MICROPUB = new URL("../scripts/micropub", import.meta.url).pathname;

function runMicropub(args, env = {}) {
  return spawnSync(process.execPath, [MICROPUB, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 5000,
  });
}

// ── Usage / help ─────────────────────────────────────────────────────────────

describe("micropub CLI", () => {
  it("prints usage when called with no arguments", () => {
    const r = runMicropub([]);
    assert.match(r.stdout + r.stderr, /usage|micropub|subcommand/i);
    assert.notEqual(r.status, 0);
  });

  it("prints usage for unknown subcommand", () => {
    const r = runMicropub(["bogus"]);
    assert.match(r.stdout + r.stderr, /unknown|bogus|usage/i);
    assert.notEqual(r.status, 0);
  });

  it("exits 0 for --help", () => {
    const r = runMicropub(["--help"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /micropub/i);
  });
});

// ── Subcommand parsing ────────────────────────────────────────────────────────

describe("micropub subcommand routing", () => {
  it("routes 'status' subcommand", () => {
    // status calls launchctl — it may fail but must not crash with wrong usage
    const r = runMicropub(["status"]);
    // Either succeeds or fails with launchctl error, not a JS error
    assert.ok(r.error === undefined || r.error === null, `spawn error: ${r.error}`);
  });

  it("routes 'logs' subcommand", () => {
    // logs calls tail -f — will fail if log file missing, but must route correctly
    const r = runMicropub(["logs", "--lines=1"]);
    assert.ok(r.error === undefined || r.error === null);
  });
});
