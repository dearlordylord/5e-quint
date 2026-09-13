import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { root, output, packages, archiveIntegrity } from "./packages.mjs";

const registry = "https://registry.npmjs.org/";
const args = process.argv.slice(2);
if (
  args.length > 1 ||
  (args.length === 1 && !["--dry-run", "--publish"].includes(args[0]))
) {
  throw new Error("Usage: pnpm local-release [--dry-run|--publish]");
}
const publish = args[0] === "--publish";
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
const read = (command, args) =>
  execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
const manifests = packages.map(({ manifest }) => manifest);
const version = manifests[0].version;
if (manifests.some((manifest) => manifest.version !== version))
  throw new Error("SDK and MCP versions must match.");
if (!/^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(version))
  throw new Error("Use a stable version or alpha.N, beta.N, rc.N prerelease.");
const channel = version.includes("-")
  ? version.split("-")[1].split(".")[0]
  : "latest";
const source = read("git", ["rev-parse", "HEAD"]);
function assertPublishCheckout() {
  if (read("git", ["branch", "--show-current"]) !== "master")
    throw new Error("Publish from master.");
  if (read("git", ["status", "--porcelain"]))
    throw new Error("Publish requires a clean worktree.");
  if (read("git", ["rev-parse", "HEAD"]) !== source)
    throw new Error("Source changed during release.");
  if (read("git", ["rev-parse", "origin/master"]) !== source)
    throw new Error("Publish requires HEAD to equal origin/master.");
}
if (publish) {
  run("git", ["fetch", "origin", "master"]);
  assertPublishCheckout();
  run("pnpm", ["whoami", `--registry=${registry}`]);
}
run("pnpm", ["install:release"]);
run("pnpm", ["quality:milestone"]);
run("pnpm", ["check:distribution"]);
if (publish) assertPublishCheckout();

function registryIntegrity(name) {
  const result = spawnSync(
    "pnpm",
    [
      "view",
      `${name}@${version}`,
      "dist.integrity",
      "--json",
      `--registry=${registry}`,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status === 0) return JSON.parse(result.stdout);
  // Only a structured registry 404 means absence; authentication/network errors stop publication.
  const response = (() => {
    try {
      return JSON.parse(result.stdout);
    } catch {
      return undefined;
    }
  })();
  if (response?.error?.code === "E404") return undefined;
  throw new Error(result.stderr || result.stdout || "Registry lookup failed");
}
const evidence = JSON.parse(
  readFileSync(resolve(output, "verification.json"), "utf8"),
);
const snapshot = mkdtempSync(resolve(tmpdir(), "dnd-release-artifacts-"));
try {
  const archives = packages.map(({ manifest, archiveName }) => {
    const path = resolve(snapshot, archiveName);
    cpSync(resolve(output, archiveName), path);
    const integrity = archiveIntegrity(path);
    if (
      !evidence.some(
        (entry) =>
          entry.name === manifest.name &&
          entry.version === manifest.version &&
          entry.archiveName === archiveName &&
          entry.integrity === integrity,
      )
    ) {
      throw new Error(
        `${manifest.name}: tarball differs from verified artifact`,
      );
    }
    return { ...manifest, path, integrity };
  });
  // Preflight every package before the first mutation, including resumable partial releases.
  const pending = archives.filter((archive) => {
    if (!publish) return true;
    const found = registryIntegrity(archive.name);
    if (found === undefined) return true;
    if (found !== archive.integrity)
      throw new Error(
        `${archive.name}@${version} already exists with different content; choose a new version.`,
      );
    console.log(
      `${archive.name}@${version} already published with matching integrity.`,
    );
    return false;
  });
  for (const archive of pending) {
    run("pnpm", [
      "publish",
      archive.path,
      "--access",
      "public",
      "--tag",
      channel,
      `--registry=${registry}`,
      "--no-git-checks",
      ...(publish ? [] : ["--dry-run"]),
    ]);
    if (!publish) continue;
    let visible = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const found = registryIntegrity(archive.name);
      if (found !== undefined && found !== archive.integrity)
        throw new Error(`${archive.name}: registry integrity mismatch`);
      if (found === archive.integrity) {
        visible = true;
        break;
      }
      await delay(2000);
    }
    if (!visible)
      throw new Error(
        `${archive.name}: registry visibility timed out; rerun to resume.`,
      );
  }
  console.log(
    `${publish ? "Published" : "Dry run passed for"} SDK and MCP ${version} (${channel}) from ${source}.`,
  );
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
