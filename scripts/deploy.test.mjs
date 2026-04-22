import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DEPLOY = new URL("./deploy", import.meta.url).pathname;

function run(args) {
  return spawnSync("sh", [DEPLOY, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
}

function runInTempRoot(extraEnv = {}) {
  const root = mkdtempSync(join(tmpdir(), "site-deploy-"));
  const scriptsDir = join(root, "scripts");
  const distDir = join(root, "dist");
  const fakeBin = join(root, "fake-bin");
  const gitLog = join(root, "git.log");

  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(distDir, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });

  copyFileSync(DEPLOY, join(scriptsDir, "deploy"));
  writeFileSync(join(root, ".env"), 'PUBLIC_REPO="git@example.com:yourname/site-output.git"\nSITE_URL="https://blog.example.com"\n');
  writeFileSync(join(distDir, "index.html"), "<!doctype html>\n");
  writeFileSync(
    join(fakeBin, "git"),
    '#!/bin/sh\n' +
    'printf \'%s\\n\' "$*" >> "$GIT_LOG"\n' +
    'if [ "$1" = "commit" ] && [ -n "$FAKE_GIT_COMMIT_STATUS" ]; then\n' +
    '  echo "${FAKE_GIT_COMMIT_STDERR:-}" >&2\n' +
    '  exit "$FAKE_GIT_COMMIT_STATUS"\n' +
    'fi\n' +
    'exit 0\n',
    { mode: 0o755 },
  );

  const result = spawnSync("sh", [join(scriptsDir, "deploy")], {
    cwd: root,
    encoding: "utf-8",
    timeout: 5000,
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
      GIT_LOG: gitLog,
      ...extraEnv,
    },
  });

  return {
    ...result,
    gitLog: readFileSync(gitLog, "utf-8"),
  };
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

describe("deploy", () => {
  it("configures local git identity before commit", () => {
    const r = runInTempRoot();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.gitLog, /^config user\.email deploy@blog\.example\.com$/m);
    assert.match(r.gitLog, /^config user\.name /m);
  });

  it("still succeeds when there is nothing new to commit", () => {
    const r = runInTempRoot({
      FAKE_GIT_COMMIT_STATUS: "1",
      FAKE_GIT_COMMIT_STDERR: "nothing to commit, working tree clean",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.gitLog, /^push --force git@example\.com:yourname\/site-output\.git main$/m);
  });
});
