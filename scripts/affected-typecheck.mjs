import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || `${command} failed`);
  return result.stdout;
}

export function affectedPackages(packages, paths) {
  const owners = new Set();
  for (const path of paths) {
    const owner = packages.find((pkg) => path.startsWith(`${pkg.directory}/`));
    if (owner === undefined) return packages;
    owners.add(owner.name);
  }
  for (;;) {
    const previousSize = owners.size;
    for (const pkg of packages) {
      if (pkg.dependencies.some((name) => owners.has(name)))
        owners.add(pkg.name);
    }
    if (owners.size === previousSize)
      return packages.filter((pkg) => owners.has(pkg.name));
  }
}

export function typecheckExitCode(result, inputsStable) {
  if (result.status === 137 || result.signal === "SIGKILL") return 137;
  return result.status === 0 && inputsStable ? 0 : 1;
}

function inputs() {
  const files = capture("git", [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  ])
    .split("\0")
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256");
  hash.update(capture("git", ["rev-parse", "HEAD"]).trim());
  for (const file of files) {
    hash.update(`${file}\0`);
    try {
      hash.update(readFileSync(resolve(ROOT, file)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("deleted");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

function main() {
  const lock = spawnSync("bash", ["scripts/assert-resource-lock.sh", "broad"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  assert.equal(
    lock.status,
    0,
    "Use the public pnpm typecheck:affected command",
  );
  const args = process.argv.slice(2);
  assert(
    args.length === 0 || (args.length === 2 && args[0] === "--base"),
    "Usage: pnpm typecheck:affected [--base <revision>]",
  );
  const base = capture("git", [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${args[1] ?? "HEAD"}^{commit}`,
  ]).trim();
  const fingerprint = inputs();
  const packages = JSON.parse(
    capture("pnpm", ["list", "--recursive", "--depth", "-1", "--json"]),
  )
    .filter((pkg) => pkg.path !== ROOT)
    .map((pkg) => {
      const manifest = JSON.parse(
        readFileSync(resolve(pkg.path, "package.json"), "utf8"),
      );
      assert.equal(
        typeof manifest.scripts?.typecheck,
        "string",
        `${pkg.name} must own a public typecheck`,
      );
      return {
        name: pkg.name,
        directory: relative(ROOT, pkg.path),
        dependencies: Object.keys({
          ...manifest.dependencies,
          ...manifest.devDependencies,
          ...manifest.peerDependencies,
          ...manifest.optionalDependencies,
        }),
      };
    });
  const paths = [
    ...new Set(
      [
        ...capture("git", [
          "diff",
          "--no-renames",
          "--name-only",
          "-z",
          base,
          "--",
        ]).split("\0"),
        ...capture("git", [
          "ls-files",
          "--others",
          "--exclude-standard",
          "-z",
        ]).split("\0"),
      ].filter(Boolean),
    ),
  ];
  const affected = affectedPackages(packages, paths);
  const startedAt = performance.now();
  const result =
    affected.length === 0
      ? { status: 0 }
      : spawnSync(
          "pnpm",
          [
            ...affected.flatMap((pkg) => ["--filter", pkg.name]),
            "--workspace-concurrency=1",
            "--recursive",
            "run",
            "typecheck",
          ],
          { cwd: ROOT, stdio: "inherit" },
        );
  const stable = fingerprint === inputs();
  const exitCode = typecheckExitCode(result, stable);
  const execution =
    result.error !== undefined
      ? { kind: "spawnFailure", message: result.error.message }
      : result.signal != null
        ? { kind: "signal", signal: result.signal }
        : { kind: "exit", code: result.status };
  const evidence = {
    revision: capture("git", ["rev-parse", "HEAD"]).trim(),
    base,
    inputSha256: fingerprint,
    packages: affected.map((pkg) => pkg.name),
    durationMilliseconds: Math.round(performance.now() - startedAt),
    status: exitCode === 0 ? "PASS" : "FAIL",
    execution,
    inputsStable: stable,
  };
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
  process.exitCode = exitCode;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
