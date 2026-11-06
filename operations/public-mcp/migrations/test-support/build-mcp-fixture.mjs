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

export async function buildMcpFixture({
  checkoutDirectory,
  release,
  outputDirectory,
}) {
  const source = resolve(checkoutDirectory);
  const checkoutRelease = git(source, ["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/.test(release) || checkoutRelease !== release)
    throw new Error("Fixture checkout differs from the required release.");
  if (
    git(source, ["status", "--porcelain", "--untracked-files=no"]) !== "" ||
    git(source, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      ".",
      ":(exclude).audit/**",
      ":(exclude).artifacts/**",
    ]) !== ""
  )
    throw new Error("MCP fixture requires a clean release checkout.");
  const entry = readFileSync(resolve(directory, "mcp-fixture.mjs"));
  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
  const outfile = resolve(outputDirectory, "mcp-fixture.mjs");
  const built = await build({
    absWorkingDir: source,
    stdin: {
      contents: entry.toString("utf8"),
      resolveDir: resolve(source, "packages/mcp/test-support"),
      sourcefile: "mcp-fixture.mjs",
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
    resolve(outputDirectory, "fixture.json"),
    JSON.stringify(
      {
        release: checkoutRelease,
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
  const [checkoutDirectory, release, outputDirectory] = process.argv.slice(2);
  if (!outputDirectory || process.argv.length !== 5)
    throw new Error(
      "usage: node build-mcp-fixture.mjs CLEAN_RELEASE_CHECKOUT FULL_RELEASE_COMMIT ABSENT_OUTPUT_DIRECTORY",
    );
  await buildMcpFixture({
    checkoutDirectory,
    release,
    outputDirectory,
  });
}
