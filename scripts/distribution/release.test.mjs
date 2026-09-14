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
      ".git",
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
    cpSync(
      resolve(repository, "distribution/CHANGELOG.md"),
      resolve(root, "distribution/CHANGELOG.md"),
    );
    const originalVersion = JSON.parse(
      readFileSync(resolve(root, "distribution/sdk/package.json"), "utf8"),
    ).version;
    writeFileSync(resolve(root, "initial-version"), originalVersion);
    if (environment.MOCK_PENDING)
      writeFileSync(
        resolve(root, ".git/dnd-npm-release.json"),
        JSON.stringify({
          version: originalVersion,
          status: "pending",
          accepted: [],
        }),
      );
    writeFileSync(
      resolve(root, "scripts/distribution/qualify.mjs"),
      `
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
if(process.env.MOCK_FAIL_BUILD) process.exit(1);
const entries = ["sdk","mcp"].map(kind => {
 const manifest=JSON.parse(readFileSync("distribution/"+kind+"/package.json","utf8"));
 const archiveName=manifest.name.slice(1).replace("/","-")+"-"+manifest.version+".tgz";
 writeFileSync("dist/npm/"+archiveName, kind);
 return {name:manifest.name,version:manifest.version,archiveName,integrity:"sha512-"+createHash("sha512").update(kind).digest("base64")};
});
writeFileSync("dist/npm/verification.json",JSON.stringify(entries));
if(process.env.MOCK_TAMPER) writeFileSync("dist/npm/"+entries[0].archiveName,"unverified bytes");
`,
    );
    if (environment.MOCK_ACK_SDK) {
      writeFileSync(
        resolve(root, ".git/dnd-npm-release.json"),
        JSON.stringify({
          version: originalVersion,
          status: "pending",
          accepted: [
            {
              name: "@dearlordylord/dnd-sdk",
              integrity:
                "sha512-" + createHash("sha512").update("sdk").digest("base64"),
            },
          ],
        }),
      );
      writeFileSync(resolve(root, "sdk.published"), "yes");
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
  if (args[0] === 'rev-parse') console.log(args[1] === '--git-common-dir' ? '.git' : 'source-commit');
} else if (command === 'gh') {
  throw Error('Release must not invoke GitHub CLI');
}
else if (args[0] === 'install' && process.env.MOCK_FAIL_INSTALL) process.exit(1);
else if (args[0] === 'whoami' && process.env.MOCK_NPM_EXPIRED) process.exit(1);
else if (args[0] === 'view') {
  const kind = args[1].includes('dnd-sdk@') ? 'sdk' : 'mcp';
  if (process.env.MOCK_ACK_SDK && kind === 'sdk' && !existsSync('sdk.lagged')) {
    writeFileSync('sdk.lagged','yes'); console.log(JSON.stringify({error:{code:'E404'}})); process.exit(1);
  }
  if (process.env.MOCK_DELAY_VISIBILITY && existsSync(kind + '.published') && !existsSync(kind + '.visibility-checked')) {
    writeFileSync(kind + '.visibility-checked', 'yes');
    console.log(JSON.stringify({error:{code:'E404'}})); process.exit(1);
  }
  if (process.env.MOCK_VIEW === 'error') { console.log(JSON.stringify({error:{code:'E401'}})); process.exit(1); }
  if (process.env.MOCK_VIEW === 'conflict' && kind === 'mcp') { console.log(JSON.stringify('wrong-integrity')); }
  else if ((process.env.MOCK_VIEW === 'matching' && args[1].endsWith('@' + readFileSync('initial-version','utf8'))) || (process.env.MOCK_VIEW === 'sdk-matching' && kind === 'sdk') || existsSync(kind + '.published')) {
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
Object.defineProperty(process, "platform", {value: "darwin"});
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

test("host release builds packages locally and never invokes GitHub or the full suite", () => {
  const { result, calls, publications } = release([]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert(
    !calls.some(
      (call) => call[0] === "gh" || call.includes("quality:milestone"),
    ),
  );
  assert(
    calls.some(
      (call) =>
        call[0] === "pnpm" &&
        call[1] === "install" &&
        call.includes("--frozen-lockfile"),
    ),
  );
});

test("dry run does not publish or bump versions", () => {
  const { result, calls, publications } = release(["--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert(publications.every((call) => call.includes("--dry-run")));
  assert(!calls.some((call) => call[1] === "commit" || call[1] === "whoami"));
});

test("dirty source, failed install and failed package checks prevent publication", () => {
  for (const environment of [
    { MOCK_DIRTY: "1" },
    { MOCK_FAIL_INSTALL: "1" },
    { MOCK_FAIL_BUILD: "1" },
  ]) {
    const { result, publications } = release([], environment);
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});

test("registry errors and package conflicts prevent publication", () => {
  for (const environment of [
    { MOCK_VIEW: "error" },
    { MOCK_VIEW: "conflict" },
    { MOCK_TARBALL_SDK: "1", MOCK_TARBALL_CONFLICT: "1" },
    { MOCK_TARBALL_ERROR: "1" },
  ]) {
    const { result, publications } = release([], environment);
    assert.notEqual(result.status, 0);
    assert.equal(publications.length, 0);
  }
});

test("already-published versions cause a real patch bump, commit and push", () => {
  const { result, calls, publications } = release([], {
    MOCK_VIEW: "matching",
  });
  assert.equal(result.status, 0, result.stderr);
  const original = JSON.parse(
    readFileSync(resolve(repository, "distribution/sdk/package.json"), "utf8"),
  ).version;
  const next = original.replace(/\d+$/, (number) => String(Number(number) + 1));
  assert(
    calls.some(
      (call) =>
        call[1] === "commit" && call.includes("release: SDK and MCP " + next),
    ),
  );
  assert(calls.some((call) => call[1] === "push"));
  assert.equal(publications.length, 2);
  assert(publications.every((call) => call[2].includes("-" + next + ".tgz")));
});

test("pending publication resumes the same version instead of bumping", () => {
  const { result, calls, publications } = release([], {
    MOCK_VIEW: "matching",
    MOCK_PENDING: "1",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 0);
  assert(!calls.some((call) => call[1] === "commit"));
});

test("published SDK with missing metadata is verified by tarball and skipped", () => {
  const { result, publications } = release([], { MOCK_TARBALL_SDK: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 1);
  assert.match(publications[0][2], /dnd-mcp-/);
});

test("altered package cannot use earlier consumer evidence", () => {
  const { result, publications } = release([], { MOCK_TAMPER: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(publications.length, 0);
  assert.match(result.stderr, /tarball differs/);
});

test("temporary visibility delay is reported and retried after publishing both packages", () => {
  const { result, publications } = release([], { MOCK_DELAY_VISIBILITY: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 2);
  assert.match(result.stdout, /registry still returns E404/);
});

test("persisted npm acknowledgement prevents republishing while metadata is lagging", () => {
  const { result, calls, publications } = release([], { MOCK_ACK_SDK: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(publications.length, 1);
  assert.match(publications[0][2], /dnd-mcp-/);
  assert(!calls.some((call) => call[1] === "commit"));
  assert.match(result.stdout, /skipping repeated publication/);
});
