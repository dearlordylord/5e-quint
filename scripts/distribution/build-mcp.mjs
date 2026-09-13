import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { root, output } from "./packages.mjs";
import { thirdPartyNotices } from "./third-party-notices.mjs";

// Redis ships as an npm dependency; its module packages omit standalone license files.
const externalDependencies = ["redis"];
export async function buildMcpDistribution() {
  const bundle = await build({
    absWorkingDir: root,
    entryPoints: ["packages/mcp/src/index.ts"],
    outfile: resolve(output, "mcp/dist/index.mjs"),
    bundle: true,
    external: externalDependencies,
    platform: "node",
    format: "esm",
    target: "node22",
    banner: {
      js: '#!/usr/bin/env node\nimport { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
    },
    legalComments: "linked",
    metafile: true,
  });
  const bundledInputs = Object.keys(bundle.metafile.inputs);
  if (
    bundledInputs.some((input) =>
      /test-support|\.test\.|\.mbt\.|\.references\//.test(input),
    )
  ) {
    throw new Error(
      "MCP bundle reaches verification-only or local reference inputs.",
    );
  }
  writeFileSync(
    resolve(output, "mcp/dist/THIRD-PARTY-NOTICES.txt"),
    thirdPartyNotices(bundledInputs, root),
  );
  const manifestPath = resolve(output, "mcp/package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const owner = JSON.parse(
    readFileSync(resolve(root, "packages/mcp/package.json"), "utf8"),
  );
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        dependencies: Object.fromEntries(
          externalDependencies.map((name) => [name, owner.dependencies[name]]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
}
