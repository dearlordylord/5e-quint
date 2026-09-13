import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { root, output, packages, archiveIntegrity } from "./packages.mjs";

const consumer = mkdtempSync(resolve(tmpdir(), "dnd-package-consumer-"));
const run = (command, args, cwd = consumer) =>
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    timeout: 300_000,
    env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
  });
try {
  const archives = [];
  for (const { kind, directory, archiveName } of packages) {
    const manifest = JSON.parse(
      readFileSync(resolve(directory, "package.json"), "utf8"),
    );
    assert.equal(manifest.private, undefined);
    assert.equal(
      manifest.name,
      JSON.parse(
        readFileSync(
          resolve(root, "distribution", kind, "package.json"),
          "utf8",
        ),
      ).name,
    );
    execFileSync("pnpm", ["pack", "--pack-destination", consumer], {
      cwd: directory,
      stdio: ["ignore", "pipe", "inherit"],
      timeout: 60_000,
    });
    console.log(`Packed ${manifest.name}@${manifest.version}`);
    const archive = resolve(consumer, archiveName);
    const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
      .trim()
      .split("\n");
    for (const file of files) {
      assert.match(
        file,
        /^package\/(dist\/.*|package\.json|README\.md|LICENSE|NOTICE)$/,
      );
      if (file.startsWith("package/dist/")) {
        assert.match(file, /(?:\.js|\.mjs|\.d\.ts|\.json|\.txt)$/);
      }
      assert.doesNotMatch(
        file,
        /(?:node_modules|test-support|\.test\.|\.mbt\.|\.qnt|\.dhall|\.map$)/,
      );
    }
    for (const name of ["LICENSE", "NOTICE"])
      assert(files.includes(`package/${name}`));
    cpSync(archive, resolve(output, archive.split("/").at(-1)));
    archives.push(archive);
  }
  const dev = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  ).devDependencies;
  writeFileSync(
    resolve(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run("pnpm", [
    "add",
    "--ignore-scripts",
    ...archives,
    `typescript@${dev.typescript}`,
    `@types/node@${dev["@types/node"]}`,
    `@modelcontextprotocol/sdk@${dev["@modelcontextprotocol/sdk"]}`,
  ]);
  for (const file of ["consumer.ts", "mcp-smoke.mjs"]) {
    cpSync(
      resolve(
        root,
        "scripts/distribution",
        file === "consumer.ts" ? "consumer.ts.txt" : file,
      ),
      resolve(consumer, file),
    );
  }
  run("pnpm", [
    "exec",
    "tsc",
    "consumer.ts",
    "--noEmit",
    "--strict",
    "--module",
    "NodeNext",
    "--target",
    "ES2022",
  ]);
  run("node", ["consumer.ts"]);
  run("node", ["mcp-smoke.mjs"]);
  const sdkName = JSON.parse(
    readFileSync(resolve(root, "distribution/sdk/package.json"), "utf8"),
  ).name;
  const installed = resolve(consumer, "node_modules", sdkName, "dist");
  for (const entry of readdirSync(installed, { recursive: true })) {
    if (!/\.(?:js|ts)$/.test(entry)) continue;
    const text = readFileSync(resolve(installed, entry), "utf8");
    assert.doesNotMatch(text, /(?:from\s*|import\s*\()\s*["'](?:@dnd\/|#\/)/);
  }
  writeFileSync(
    resolve(output, "verification.json"),
    JSON.stringify(
      packages.map(({ manifest, archiveName }) => ({
        name: manifest.name,
        version: manifest.version,
        archiveName,
        integrity: archiveIntegrity(resolve(output, archiveName)),
      })),
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Packed SDK declarations, runtime imports, and MCP stdio protocol passed in an isolated consumer.",
  );
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
