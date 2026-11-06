import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const directory = dirname(fileURLToPath(import.meta.url));
const target = resolve(directory, "../../..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ownerPaths = new Set([
  "packages/battle-runtime/src/battle-runtime-context.ts",
  "packages/battle-runtime/src/battle-runtime-transaction.ts",
  "packages/battle-runtime/src/d20-test-circumstance.ts",
  "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
  "packages/battle-runtime/src/index.ts",
  "packages/mcp/src/battle-action-selection-store.ts",
  "packages/mcp/src/session-store-types.ts",
  "packages/mcp/src/session-store.ts",
  "packages/mcp/src/dice-sampling-service.ts",
]);
const copiedModules = ["play-session-continuation.ts", "continuation-graph.ts"];
const supportedPins = new Set([
  "23b919207ff7f2b04da849a8f6f521ea07cdd3be",
  "c9cef52573e5b08407e0d6dd1b9106f1ad5b589c",
]);
function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** Mutates only the explicitly supplied clean, isolated historical checkout. */
export async function prepareMigrationKit({
  sourceDirectory,
  manifestPath,
  outputDirectory,
}) {
  const source = resolve(sourceDirectory);
  if (source === target)
    throw new Error("Historical instrumentation requires a separate checkout.");
  const manifestDirectory = dirname(resolve(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!supportedPins.has(manifest.sourceRelease))
    throw new Error("Unsupported full source/target release identity.");
  const targetRelease = git(target, ["rev-parse", "HEAD"]);
  if (
    git(source, ["rev-parse", "HEAD"]) !== manifest.sourceRelease ||
    !/^[0-9a-f]{40}$/.test(targetRelease)
  )
    throw new Error(
      "Checkout identity differs from the frozen release manifest.",
    );
  if (git(source, ["status", "--porcelain", "--untracked-files=all"]) !== "")
    throw new Error(
      "Historical checkout must be clean, including untracked source files.",
    );
  if (git(target, ["status", "--porcelain", "--untracked-files=no"]) !== "")
    throw new Error("Target checkout contains tracked modifications.");
  if (
    git(target, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      ".",
      ":(exclude).audit/**",
      ":(exclude).artifacts/**",
    ]) !== ""
  )
    throw new Error("Target checkout contains uncommitted source files.");
  const patchPath = resolve(manifestDirectory, manifest.patch.path);
  if (sha256(readFileSync(patchPath)) !== manifest.patch.sha256)
    throw new Error("Owner patch hash mismatch.");
  const patchPaths = git(source, ["apply", "--numstat", patchPath])
    .split("\n")
    .map((line) => line.split("\t")[2]);
  if (
    patchPaths.some((path) => !ownerPaths.has(path)) ||
    patchPaths.length === 0
  )
    throw new Error("Instrumentation patch changes a non-owner path.");
  if (
    manifest.sourceFiles
      .map(({ path }) => path)
      .sort()
      .join("\n") !== [...new Set(patchPaths)].sort().join("\n")
  )
    throw new Error("Every patched source file needs an exact preimage hash.");
  for (const { path, sha256: hash } of manifest.sourceFiles) {
    if (sha256(readFileSync(resolve(source, path))) !== hash)
      throw new Error(`Original source hash mismatch: ${path}`);
  }
  for (const name of copiedModules) {
    const path = `packages/mcp/src/${name}`;
    if (
      sha256(readFileSync(resolve(target, path))) !==
      manifest.captureModules[path]
    )
      throw new Error(`Capture module hash mismatch: ${path}`);
  }
  git(source, ["apply", "--check", patchPath]);
  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
  git(source, ["apply", patchPath]);
  for (const name of copiedModules)
    copyFileSync(
      resolve(target, "packages/mcp/src", name),
      resolve(source, "packages/mcp/src", name),
    );
  const exporterEntry = resolve(
    source,
    "operations/public-mcp/migrations/source-exporter.ts",
  );
  mkdirSync(dirname(exporterEntry), { recursive: true });
  copyFileSync(resolve(directory, "source-exporter.ts"), exporterEntry);
  const bundles = {};
  const bundleInputs = {};
  for (const [root, entry, output] of [
    [source, exporterEntry, "source-exporter.mjs"],
    [target, resolve(directory, "target-validator.ts"), "target-validator.mjs"],
  ]) {
    const outfile = resolve(outputDirectory, output);
    const built = await build({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      external: ["redis"],
      legalComments: "linked",
      metafile: true,
      banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
      },
    });
    bundles[output] = sha256(readFileSync(outfile));
    bundleInputs[output] = Object.keys(built.metafile.inputs).sort();
  }
  writeFileSync(
    resolve(outputDirectory, "prepared.json"),
    JSON.stringify(
      { ...manifest, targetRelease, targetFormat: 5, bundles, bundleInputs },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [sourceDirectory, manifestPath, outputDirectory] =
    process.argv.slice(2);
  if (!outputDirectory || process.argv.length !== 5)
    throw new Error(
      "usage: node prepare.mjs ISOLATED_SOURCE_CHECKOUT FROZEN_MANIFEST ABSENT_OUTPUT_DIRECTORY",
    );
  await prepareMigrationKit({ sourceDirectory, manifestPath, outputDirectory });
}
