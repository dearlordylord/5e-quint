import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const directory = dirname(fileURLToPath(import.meta.url));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

export async function buildOriginalFixture({
  sourceDirectory,
  manifestPath,
  outputDirectory,
}) {
  const source = resolve(sourceDirectory);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sourceRelease = git(source, ["rev-parse", "HEAD"]);
  if (
    !/^[0-9a-f]{40}$/.test(manifest.sourceRelease) ||
    sourceRelease !== manifest.sourceRelease
  )
    throw new Error("Fixture source differs from the frozen original release.");
  if (git(source, ["status", "--porcelain", "--untracked-files=all"]) !== "")
    throw new Error("Original MCP fixture requires a clean source checkout.");
  const entry = readFileSync(resolve(directory, "original-mcp-fixture.mjs"));
  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
  const outfile = resolve(outputDirectory, "original-mcp-fixture.mjs");
  const built = await build({
    absWorkingDir: source,
    stdin: {
      contents: entry.toString("utf8"),
      resolveDir: resolve(source, "packages/mcp/test-support"),
      sourcefile: "original-mcp-fixture.mjs",
      loader: "js",
    },
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
  writeFileSync(
    resolve(outputDirectory, "original-fixture.json"),
    JSON.stringify(
      {
        sourceRelease,
        entrySha256: sha256(entry),
        bundleSha256: sha256(readFileSync(outfile)),
        inputs: Object.keys(built.metafile.inputs).sort(),
      },
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
      "usage: node build-original-fixture.mjs CLEAN_ORIGINAL_CHECKOUT FROZEN_MANIFEST ABSENT_OUTPUT_DIRECTORY",
    );
  await buildOriginalFixture({
    sourceDirectory,
    manifestPath,
    outputDirectory,
  });
}
