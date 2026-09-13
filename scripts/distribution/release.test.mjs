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
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const command = basename(process.argv[1]);
appendFileSync('calls.log', JSON.stringify([command, ...args]) + '\\n');
if (command === 'git') {
  if (args[0] === 'branch') console.log('master');
  if (args[0] === 'status' && process.env.MOCK_DIRTY) console.log(' M source.ts');
  if (args[0] === 'rev-parse') console.log('source-commit');
} else if (args[0] === 'install:release' && process.env.MOCK_FAIL_INSTALL) process.exit(1);
else if (args[0] === 'quality:milestone' && process.env.MOCK_FAIL_QUALITY) process.exit(1);
else if (args[0] === 'view') {
  const kind = args[1].includes('dnd-sdk@') ? 'sdk' : 'mcp';
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
    for (const command of ["git", "pnpm"])
      writeFileSync(resolve(root, "bin", command), mock, { mode: 0o755 });
    const result = spawnSync(
      process.execPath,
      ["scripts/distribution/release.mjs", ...args],
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

test("default release qualifies both artifacts and only dry-runs publication", () => {
  const { result, calls, publications } = release([]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert(publications.every((call) => call.includes("--dry-run")));
  assert.deepEqual(calls.slice(1, 4), [
    ["pnpm", "install:release"],
    ["pnpm", "quality:milestone"],
    ["pnpm", "check:distribution"],
  ]);
});
test("dirty checkout and failed quality gate prevent publication", () => {
  for (const environment of [{ MOCK_DIRTY: "1" }, { MOCK_FAIL_QUALITY: "1" }]) {
    const { result, publications } = release(["--publish"], environment);
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});
test("registry errors and conflicts in the second package prevent all publication", () => {
  for (const MOCK_VIEW of ["error", "conflict"]) {
    const { result, publications } = release(["--publish"], { MOCK_VIEW });
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});
test("matching published artifacts resume without republishing", () => {
  const { result, publications } = release(["--publish"], {
    MOCK_VIEW: "matching",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 0);
});
test("publishes absent artifacts and verifies registry integrity", () => {
  const { result, publications, calls } = release(["--publish"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert(publications.every((call) => !call.includes("--dry-run")));
  assert.equal(calls.filter((call) => call[1] === "view").length, 4);
});

test("partial publication resumes with only the absent MCP package", () => {
  const { result, publications } = release(["--publish"], {
    MOCK_VIEW: "sdk-matching",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 1);
  assert.match(publications[0][2], /dnd-mcp-/);
});

test("changed tarball bytes cannot use earlier qualification evidence", () => {
  const { result, publications } = release(["--publish"], { MOCK_TAMPER: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
  assert.match(result.stderr, /tarball differs from verified artifact/);
});

test("failed frozen install prevents qualification and publication", () => {
  const { result, calls, publications } = release(["--publish"], {
    MOCK_FAIL_INSTALL: "1",
  });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
  assert(
    !calls.some(
      (call) =>
        call[1] === "quality:milestone" || call[1] === "check:distribution",
    ),
  );
});
