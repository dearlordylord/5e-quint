import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const quoteShellArgument = (value) =>
  "'" + value.replaceAll("'", "'\\''") + "'";
const typecheckCommand = `node ${quoteShellArgument(join(root, "packages/shared/node_modules/typescript/bin/tsc"))} --noEmit`;
const testImport = `import {test,expect} from ${JSON.stringify(join(root, "packages/shared/node_modules/vitest/dist/index.js"))};\n`;
const fixture = mkdtempSync(join(tmpdir(), "dnd-affected-typecheck-"));
const run = (command, args, options = {}) =>
  spawnSync(command, args, { cwd: fixture, encoding: "utf8", ...options });
try {
  mkdirSync(join(fixture, "scripts"));
  mkdirSync(join(fixture, "packages/core"), { recursive: true });
  for (const file of ["affected-typecheck.mjs", "assert-resource-lock.sh"])
    copyFileSync(join(root, "scripts", file), join(fixture, "scripts", file));
  writeFileSync(join(fixture, ".gitignore"), "node_modules\n");
  writeFileSync(
    join(fixture, "pnpm-workspace.yaml"),
    'packages:\n  - "packages/*"\n',
  );
  writeFileSync(join(fixture, "package.json"), '{"private":true}\n');
  writeFileSync(
    join(fixture, "packages/core/package.json"),
    JSON.stringify({
      name: "fixture-core",
      private: true,
      scripts: {
        typecheck: typecheckCommand,
      },
    }),
  );
  writeFileSync(
    join(fixture, "packages/core/tsconfig.json"),
    '{"include":["*.ts"],"compilerOptions":{"skipLibCheck":true,"moduleResolution":"bundler","module":"esnext","target":"es2022","strict":true}}',
  );
  writeFileSync(
    join(fixture, "packages/core/vitest.config.mjs"),
    'export default {test:{maxWorkers:1,pool:"threads"}};',
  );
  assert.equal(run("git", ["init", "--quiet"]).status, 0);
  assert.equal(run("git", ["add", "."]).status, 0);
  assert.equal(
    run("git", [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Fixture base",
    ]).status,
    0,
  );
  writeFileSync(
    join(fixture, "packages/core/check.test.ts"),
    testImport +
      'const value: number = "runtime succeeds";\ntest("runtime witness",()=>expect(value).toBe("runtime succeeds"));\n',
  );
  const vitest = run(process.execPath, [
    join(root, "packages/shared/node_modules/vitest/vitest.mjs"),
    "run",
    "--root",
    join(fixture, "packages/core"),
    "--config",
    join(fixture, "packages/core/vitest.config.mjs"),
  ]);
  assert.equal(vitest.status, 0, vitest.stdout + vitest.stderr);
  const typecheck = run(process.execPath, ["scripts/affected-typecheck.mjs"], {
    env: { ...process.env, DND_RESOURCE_LOCK_KIND: "broad" },
  });
  assert.equal(typecheck.status, 1, typecheck.stdout + typecheck.stderr);
  assert.match(typecheck.stdout, /TS2322/);
  const evidence = JSON.parse(typecheck.stdout.trim().split("\n").at(-1));
  assert.deepEqual(evidence.packages, ["fixture-core"]);
  assert.equal(evidence.status, "FAIL");
  assert.equal(evidence.inputsStable, true);
  writeFileSync(
    join(fixture, "packages/core/check.test.ts"),
    testImport +
      'const value: string = "runtime succeeds";\ntest("runtime witness",()=>expect(value).toBe("runtime succeeds"));\n',
  );
  const passing = run(process.execPath, ["scripts/affected-typecheck.mjs"], {
    env: { ...process.env, DND_RESOURCE_LOCK_KIND: "broad" },
  });
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  const passingEvidence = JSON.parse(passing.stdout.trim().split("\n").at(-1));
  assert.equal(passingEvidence.status, "PASS");
  assert.notEqual(passingEvidence.inputSha256, evidence.inputSha256);
  writeFileSync(
    join(fixture, "packages/core/mutate.cjs"),
    'require("node:fs").appendFileSync("check.test.ts", "\\n// changed during check\\n");',
  );
  const manifestPath = join(fixture, "packages/core/package.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({
      name: "fixture-core",
      private: true,
      scripts: { typecheck: "node mutate.cjs" },
    }),
  );
  const changed = run(process.execPath, ["scripts/affected-typecheck.mjs"], {
    env: { ...process.env, DND_RESOURCE_LOCK_KIND: "broad" },
  });
  assert.equal(changed.status, 1, changed.stdout + changed.stderr);
  const changedEvidence = JSON.parse(changed.stdout.trim().split("\n").at(-1));
  assert.equal(changedEvidence.inputsStable, false);
  assert.equal(changedEvidence.status, "FAIL");
  const otherPackage = join(fixture, "packages/other");
  mkdirSync(otherPackage);
  writeFileSync(
    join(otherPackage, "package.json"),
    JSON.stringify({
      name: "fixture-other",
      private: true,
      scripts: { typecheck: typecheckCommand },
    }),
  );
  copyFileSync(
    join(fixture, "packages/core/tsconfig.json"),
    join(otherPackage, "tsconfig.json"),
  );
  writeFileSync(
    manifestPath,
    JSON.stringify({
      name: "fixture-core",
      private: true,
      scripts: { typecheck: typecheckCommand },
    }),
  );
  writeFileSync(
    join(fixture, "packages/core/retained.ts"),
    "export const retained = 1;\n",
  );
  assert.equal(run("git", ["add", "."]).status, 0);
  assert.equal(
    run("git", [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Before package move",
    ]).status,
    0,
  );
  renameSync(
    join(fixture, "packages/core/check.test.ts"),
    join(otherPackage, "check.test.ts"),
  );
  assert.equal(run("git", ["add", "-A"]).status, 0);
  const moved = run(process.execPath, ["scripts/affected-typecheck.mjs"], {
    env: { ...process.env, DND_RESOURCE_LOCK_KIND: "broad" },
  });
  assert.equal(moved.status, 0, moved.stdout + moved.stderr);
  const movedEvidence = JSON.parse(moved.stdout.trim().split("\n").at(-1));
  assert.deepEqual(movedEvidence.packages, ["fixture-core", "fixture-other"]);
  console.log(
    `Vitest passed; affected typecheck rejected the same test in ${evidence.durationMilliseconds}ms.`,
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
