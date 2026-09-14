import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function release(args, environment = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "dnd-release-test-"));
  try {
    for (const directory of [
      "scripts/distribution",
      "distribution/sdk",
      "distribution/mcp",
      "dist/npm",
      "bin",
    ])
      mkdirSync(resolve(root, directory), { recursive: true });
    for (const file of ["release.mjs", "packages.mjs"])
      cpSync(
        resolve(repository, "scripts/distribution", file),
        resolve(root, "scripts/distribution", file),
      );
    for (const kind of ["sdk", "mcp"]) {
      cpSync(
        resolve(repository, "distribution", kind, "package.json"),
        resolve(root, "distribution", kind, "package.json"),
      );
      const manifest = JSON.parse(
        readFileSync(
          resolve(root, "distribution", kind, "package.json"),
          "utf8",
        ),
      );
      writeFileSync(
        resolve(
          root,
          "dist/npm",
          `${manifest.name.slice(1).replace("/", "-")}-${manifest.version}.tgz`,
        ),
        kind,
      );
    }
    writeFileSync(
      resolve(root, "dist/npm/verification.json"),
      JSON.stringify(
        ["sdk", "mcp"].map((kind) => {
          const manifest = JSON.parse(
            readFileSync(
              resolve(root, "distribution", kind, "package.json"),
              "utf8",
            ),
          );
          return {
            name: manifest.name,
            version: manifest.version,
            archiveName: `${manifest.name.slice(1).replace("/", "-")}-${manifest.version}.tgz`,
            integrity: `sha512-${createHash("sha512").update(kind).digest("base64")}`,
          };
        }),
      ),
    );
    if (environment.MOCK_TAMPER) {
      const manifest = JSON.parse(
        readFileSync(resolve(root, "distribution/sdk/package.json"), "utf8"),
      );
      writeFileSync(
        resolve(
          root,
          "dist/npm",
          `${manifest.name.slice(1).replace("/", "-")}-${manifest.version}.tgz`,
        ),
        "unverified bytes",
      );
    }
    const mock = `#!${process.execPath}
import { appendFileSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const command = basename(process.argv[1]);
appendFileSync('calls.log', JSON.stringify([command, ...args]) + '\\n');
if (command === 'git') {
  if (args[0] === 'merge-base') process.exit(1);
  if (args[0] === 'remote') console.log('git@github.com:dearlordylord/5e-quint.git');
  if (args[0] === 'branch') console.log('master');
  if (args[0] === 'status' && process.env.MOCK_DIRTY) console.log(' M source.ts');
  if (args[0] === 'rev-parse') console.log('source-commit');
} else if (command === 'gh') {
  if (process.env.GH_REPO !== 'github.com/dearlordylord/5e-quint') process.exit(1);
  if (args[0] === 'auth' && process.env.MOCK_INACTIVE_AUTH_INVALID) process.exit(1);
  if (args[0] === 'api') {
    if (process.env.MOCK_ACTIVE_AUTH_INVALID) process.exit(1);
    if (args.includes('user')) console.log('dearlordylord');
    else if (!process.env.MOCK_NO_REUSABLE_ARTIFACT) console.log('100');
  }
  if (args[0] === 'workflow') writeFileSync('dispatched', 'yes');
  if (args[1] === 'list') {
    const dispatched = existsSync('dispatched');
    const candidate = {databaseId: dispatched ? 42 : 41, headSha: process.env.MOCK_OLD_RUN && !dispatched ? 'old-commit' : 'source-commit',
      event: dispatched ? 'workflow_dispatch' : 'push',
      status: process.env.MOCK_EXISTING_PENDING && !dispatched ? 'in_progress' : 'completed', conclusion: 'success'};
    console.log(JSON.stringify(dispatched || process.env.MOCK_EXISTING_SUCCESS || process.env.MOCK_EXISTING_PENDING || process.env.MOCK_OLD_RUN ? [candidate] : []));
  }
  if (args[1] === 'watch' && process.env.MOCK_FAIL_QUALITY) process.exit(1);
  if (args[1] === 'view') console.log(JSON.stringify({
    headSha: process.env.MOCK_WRONG_RUN ? 'other-commit' : 'source-commit',
    headBranch: 'master', event: 'workflow_dispatch', status: 'completed',
    conclusion: process.env.MOCK_FAILED_RUN ? 'failure' : 'success'
  }));
  if (args[1] === 'download') {
    if (process.env.MOCK_MISSING_ARTIFACT) process.exit(1);
    const destination = args[args.indexOf('--dir') + 1];
    cpSync('dist/npm', destination, {recursive: true});
    writeFileSync(resolve(destination, 'source.txt'), process.env.MOCK_WRONG_SOURCE ? 'other-commit' : 'source-commit');
  }
}
else if (args[0] === 'whoami' && process.env.MOCK_NPM_EXPIRED) process.exit(1);
else if (args[0] === 'view') {
  const kind = args[1].includes('dnd-sdk@') ? 'sdk' : 'mcp';
  if (process.env.MOCK_DELAY_VISIBILITY && existsSync(kind + '.published') && !existsSync(kind + '.visibility-checked')) {
    writeFileSync(kind + '.visibility-checked', 'yes');
    console.log(JSON.stringify({error:{code:'E404'}})); process.exit(1);
  }
  if (process.env.MOCK_VIEW === 'error') { console.log(JSON.stringify({error:{code:'E401'}})); process.exit(1); }
  if (process.env.MOCK_VIEW === 'conflict' && kind === 'mcp') { console.log(JSON.stringify('wrong-integrity')); }
  else if (process.env.MOCK_VIEW === 'matching' || (process.env.MOCK_VIEW === 'sdk-matching' && kind === 'sdk') || existsSync(kind + '.published')) {
    const manifest = JSON.parse(readFileSync('distribution/' + kind + '/package.json', 'utf8'));
    const path = resolve('dist/npm', manifest.name.slice(1).replace('/', '-') + '-' + manifest.version + '.tgz');
    console.log(JSON.stringify('sha512-' + createHash('sha512').update(readFileSync(path)).digest('base64')));
  } else { console.log(JSON.stringify({error:{code:'E404'}})); process.exit(1); }
} else if (args[0] === 'publish' && !args.includes('--dry-run')) {
  writeFileSync(args[1].includes('dnd-sdk-') ? 'sdk.published' : 'mcp.published', 'yes');
}
`;
    writeFileSync(resolve(root, "package.json"), '{"type":"module"}');
    for (const command of ["git", "pnpm", "gh"])
      writeFileSync(resolve(root, "bin", command), mock, { mode: 0o755 });
    writeFileSync(
      resolve(root, "fetch-stub.mjs"),
      `
import { existsSync } from "node:fs";
globalThis.fetch = async (url) => {
  const kind = url.includes("dnd-sdk") ? "sdk" : "mcp";
  if (process.env.MOCK_TARBALL_ERROR) return new Response("", {status: 503});
  if (process.env.MOCK_TARBALL_SDK && kind === "sdk")
    return new Response(process.env.MOCK_TARBALL_CONFLICT ? "different" : "sdk");
  return new Response("", {status: 404});
};
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "./fetch-stub.mjs",
        "scripts/distribution/release.mjs",
        ...args,
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 20_000,
        env: {
          ...process.env,
          ...environment,
          PATH: `${resolve(root, "bin")}:${process.env.PATH}`,
        },
      },
    );
    const calls = readFileSync(resolve(root, "calls.log"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    return {
      result,
      calls,
      publications: calls.filter(
        (call) => call[0] === "pnpm" && call[1] === "publish",
      ),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("explicit dry run qualifies both artifacts without publication", () => {
  const { result, calls, publications } = release(["--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert(publications.every((call) => call.includes("--dry-run")));
  assert(!calls.some((call) => call[0] === "pnpm" && call[1] === "whoami"));
  assert(
    calls.some(
      (call) => call[0] === "gh" && call[1] === "run" && call[2] === "watch",
    ),
  );
  assert(
    !calls.some((call) =>
      ["install:release", "quality:milestone", "check:distribution"].includes(
        call[1],
      ),
    ),
  );
});
test("dirty checkout and failed quality gate prevent publication", () => {
  for (const environment of [{ MOCK_DIRTY: "1" }, { MOCK_FAIL_QUALITY: "1" }]) {
    const { result, publications } = release([], environment);
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});
test("registry errors and conflicts in the second package prevent all publication", () => {
  for (const MOCK_VIEW of ["error", "conflict"]) {
    const { result, publications } = release([], { MOCK_VIEW });
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});
test("matching published artifacts resume without republishing", () => {
  const { result, publications } = release([], {
    MOCK_VIEW: "matching",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 0);
});
test("default command publishes absent artifacts and verifies registry integrity", () => {
  const { result, publications, calls } = release([]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert(publications.every((call) => !call.includes("--dry-run")));
  assert.equal(calls.filter((call) => call[1] === "view").length, 4);
});

test("partial publication resumes with only the absent MCP package", () => {
  const { result, publications } = release([], {
    MOCK_VIEW: "sdk-matching",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 1);
  assert.match(publications[0][2], /dnd-mcp-/);
});

test("changed tarball bytes cannot use earlier qualification evidence", () => {
  const { result, publications } = release([], { MOCK_TAMPER: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
  assert.match(result.stderr, /tarball differs from verified artifact/);
});

test("unqualified or missing remote artifacts prevent publication", () => {
  for (const key of [
    "MOCK_WRONG_RUN",
    "MOCK_FAILED_RUN",
    "MOCK_MISSING_ARTIFACT",
    "MOCK_WRONG_SOURCE",
  ]) {
    const { result, publications } = release([], { [key]: "1" });
    assert.notEqual(result.status, 0, key);
    assert.equal(publications.length, 0, key);
  }
});

test("remote dry run also requires a clean checkout", () => {
  const { result, publications } = release(["--dry-run"], { MOCK_DIRTY: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
});

test("an invalid inactive GitHub account does not block the active account", () => {
  const { result, publications } = release([], {
    MOCK_INACTIVE_AUTH_INVALID: "1",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert.match(result.stdout, /Authenticated to GitHub as dearlordylord/);
});

test("invalid active GitHub credentials stop before workflow dispatch and publication", () => {
  const { result, calls, publications } = release([], {
    MOCK_ACTIVE_AUTH_INVALID: "1",
  });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
  assert(!calls.some((call) => call[0] === "gh" && call[1] === "workflow"));
});

test("successful exact-commit artifacts bypass dispatch and waiting even on an npm-auth retry", () => {
  for (const expired of ["1", ""]) {
    const { result, calls, publications } = release([], {
      MOCK_EXISTING_SUCCESS: "1",
      MOCK_NPM_EXPIRED: expired,
    });
    assert.equal(result.status === 0, !expired, result.stderr);
    assert.equal(publications.length, expired ? 0 : 2);
    assert(
      !calls.some(
        (call) =>
          call[0] === "gh" && (call[1] === "workflow" || call[2] === "watch"),
      ),
    );
    const download = calls.findIndex((call) => call[2] === "download");
    const authentication = calls.findIndex((call) => call[1] === "whoami");
    assert(download >= 0 && authentication > download);
  }
});

test("an existing run is awaited without duplicate dispatch", () => {
  const { result, calls } = release([], { MOCK_EXISTING_PENDING: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert(calls.some((call) => call[2] === "watch" && call[3] === "41"));
  assert(!calls.some((call) => call[1] === "workflow"));
});

test("missing artifacts and runs for another commit require fresh qualification", () => {
  for (const environment of [
    { MOCK_EXISTING_SUCCESS: "1", MOCK_NO_REUSABLE_ARTIFACT: "1" },
    { MOCK_EXISTING_PENDING: "1", MOCK_NO_REUSABLE_ARTIFACT: "1" },
    { MOCK_OLD_RUN: "1" },
  ]) {
    const { result, calls } = release([], environment);
    assert.equal(result.status, 0, result.stderr);
    assert(calls.some((call) => call[1] === "workflow"));
  }
});

test("temporary post-publication absence is retried with visible progress", () => {
  const { result, publications } = release([], { MOCK_DELAY_VISIBILITY: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert.match(result.stdout, /registry still returns E404/);
  assert.match(result.stdout, /Published SDK and MCP/);
});

test("published SDK tarball with missing metadata is verified and never republished", () => {
  const { result, publications } = release([], { MOCK_TARBALL_SDK: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 1);
  assert.match(publications[0][2], /dnd-mcp-/);
});

test("tarball conflicts and transport errors stop all publication", () => {
  for (const environment of [
    { MOCK_TARBALL_SDK: "1", MOCK_TARBALL_CONFLICT: "1" },
    { MOCK_TARBALL_ERROR: "1" },
  ]) {
    const { result, publications } = release([], environment);
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});
