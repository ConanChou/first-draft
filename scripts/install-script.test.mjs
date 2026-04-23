import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = new URL("./install-script", import.meta.url).pathname;

function run(args, binDir) {
  return execFileSync(SCRIPT, args, {
    env: { ...process.env, BIN_DIR: binDir },
    encoding: "utf-8",
  });
}

function runExpectFail(args, binDir) {
  try {
    execFileSync(SCRIPT, args, {
      env: { ...process.env, BIN_DIR: binDir },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    assert.fail("expected non-zero exit");
  } catch (e) {
    return e;
  }
}

describe("install-script", () => {
  let tmp;
  before(() => { tmp = mkdtempSync(join(tmpdir(), "install-script-test-")); });
  after(() => { rmSync(tmp, { recursive: true }); });

  describe("install all", () => {
    it("creates symlinks for all installable scripts", () => {
      const bin = join(tmp, "bin-install-all");
      mkdirSync(bin);
      run(["install"], bin);
      // spot-check a few known installable scripts
      for (const name of ["draft", "publish", "link", "build", "deploy", "micropub"]) {
        const link = join(bin, name);
        assert.ok(existsSync(link), `symlink missing: ${name}`);
        assert.ok(lstatSync(link).isSymbolicLink(), `not a symlink: ${name}`);
      }
    });

    it("does not symlink internal files", () => {
      const bin = join(tmp, "bin-no-internals");
      mkdirSync(bin);
      run(["install"], bin);
      for (const name of ["_lib.mjs", "install-script", "install-script.test.mjs"]) {
        assert.ok(!existsSync(join(bin, name)), `should not be linked: ${name}`);
      }
    });
  });

  describe("install <name>", () => {
    it("creates a symlink for a named script", () => {
      const bin = join(tmp, "bin-single");
      mkdirSync(bin);
      run(["install", "draft"], bin);
      const link = join(bin, "draft");
      assert.ok(lstatSync(link).isSymbolicLink());
    });

    it("is idempotent — re-running install does not error", () => {
      const bin = join(tmp, "bin-idempotent");
      mkdirSync(bin);
      run(["install", "draft"], bin);
      assert.doesNotThrow(() => run(["install", "draft"], bin));
    });

    it("errors on unknown script name", () => {
      const bin = join(tmp, "bin-unknown");
      mkdirSync(bin);
      const e = runExpectFail(["install", "nonexistent"], bin);
      assert.match(e.stderr, /unknown script/i);
    });
  });

  describe("uninstall all", () => {
    it("removes all symlinks it created", () => {
      const bin = join(tmp, "bin-uninstall-all");
      mkdirSync(bin);
      run(["install"], bin);
      run(["uninstall"], bin);
      for (const name of ["draft", "publish", "link"]) {
        assert.ok(!existsSync(join(bin, name)), `symlink should be gone: ${name}`);
      }
    });
  });

  describe("uninstall <name>", () => {
    it("removes a named symlink", () => {
      const bin = join(tmp, "bin-uninstall-single");
      mkdirSync(bin);
      run(["install", "draft"], bin);
      run(["uninstall", "draft"], bin);
      assert.ok(!existsSync(join(bin, "draft")));
    });

    it("is idempotent — uninstalling twice does not error", () => {
      const bin = join(tmp, "bin-uninstall-idem");
      mkdirSync(bin);
      run(["install", "draft"], bin);
      run(["uninstall", "draft"], bin);
      assert.doesNotThrow(() => run(["uninstall", "draft"], bin));
    });

    it("errors on unknown script name", () => {
      const bin = join(tmp, "bin-unknown2");
      mkdirSync(bin);
      const e = runExpectFail(["uninstall", "nonexistent"], bin);
      assert.match(e.stderr, /unknown script/i);
    });
  });

  describe("usage errors", () => {
    it("prints usage and exits non-zero with no args", () => {
      const e = runExpectFail([], tmp);
      assert.match(e.stderr, /usage/i);
    });

    it("prints usage and exits non-zero with unknown command", () => {
      const e = runExpectFail(["destroy"], tmp);
      assert.match(e.stderr, /usage/i);
    });
  });

  describe("--help / -h", () => {
    it("--help prints usage and exits 0", () => {
      const out = run(["--help"], tmp);
      assert.match(out, /usage.*install-script/i);
    });

    it("-h prints usage and exits 0", () => {
      const out = run(["-h"], tmp);
      assert.match(out, /usage.*install-script/i);
    });
  });
});
