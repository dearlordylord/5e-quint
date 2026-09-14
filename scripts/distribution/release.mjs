import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { root, output, packages, archiveIntegrity } from "./packages.mjs";

const registry = "https://registry.npmjs.org/";
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--dry-run")) {
  throw new Error("Usage: pnpm local-release [--dry-run]");
}
const publish = args[0] !== "--dry-run";
const environment = process.env;
const run = (command, args) =>
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: environment,
  });
const read = (command, args) =>
  execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: environment,
  }).trim();
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
run("git", ["fetch", "origin", "master"]);
assertPublishCheckout();
async function registryIntegrity(name) {
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
  if (response?.error?.code === "E404") {
    // npm can serve the immutable tarball before package metadata becomes visible.
    const basename = name.split("/").at(-1);
    const tarball = await fetch(
      `${registry}${name}/-/${basename}-${version}.tgz`,
      {
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (tarball.status === 404) return undefined;
    if (!tarball.ok)
      throw new Error(`${name}: tarball lookup failed: HTTP ${tarball.status}`);
    return `sha512-${createHash("sha512")
      .update(Buffer.from(await tarball.arrayBuffer()))
      .digest("base64")}`;
  }
  throw new Error(result.stderr || result.stdout || "Registry lookup failed");
}
const statePath = resolve(
  root,
  read("git", ["rev-parse", "--git-common-dir"]),
  "dnd-npm-release.json",
);
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, "utf8"))
  : undefined;
if (publish && !(state?.version === version && state.status === "pending")) {
  const existing = await Promise.all(
    manifests.map((manifest) => registryIntegrity(manifest.name)),
  );
  if (existing.every((integrity) => integrity !== undefined)) {
    const next = version.replace(/\d+$/, (number) =>
      String(Number(number) + 1),
    );
    for (const { source: directory, manifest } of packages)
      writeFileSync(
        resolve(directory, "package.json"),
        JSON.stringify({ ...manifest, version: next }, null, 2) + "\n",
      );
    const changelogPath = resolve(root, "distribution/CHANGELOG.md");
    const changelog = readFileSync(changelogPath, "utf8");
    writeFileSync(
      changelogPath,
      changelog.replace(
        "# Release notes",
        `# Release notes\n\n## ${next}\n\n- Release the current SDK and MCP packages.`,
      ),
    );
    run("git", [
      "add",
      "distribution/sdk/package.json",
      "distribution/mcp/package.json",
      "distribution/CHANGELOG.md",
    ]);
    run("git", ["commit", "-m", `release: SDK and MCP ${next}`]);
    run("git", ["push", "origin", "master"]);
    console.log(`Prepared and pushed version ${next}.`);
    run(process.execPath, [...process.execArgv, process.argv[1], ...args]);
    process.exit(0);
  }
}
console.log(
  `Building and checking SDK and MCP ${version} locally; no CI wait or workspace milestone.`,
);
// Operator-owned installation: use this host's native dependencies.
const install = [
  "env",
  "CI=true",
  "pnpm",
  "install",
  "--frozen-lockfile",
  "--prod=false",
];
if (process.platform === "linux") {
  run("bash", [
    "-c",
    '. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-broad-workspace-lock.sh "$@"',
    "release-install",
    ...install,
  ]);
  run("pnpm", ["check:distribution"]);
} else {
  run(install[0], install.slice(1));
  run(process.execPath, ["scripts/distribution/qualify.mjs"]);
}
assertPublishCheckout();
const snapshot = mkdtempSync(resolve(tmpdir(), "dnd-release-artifacts-"));
try {
  cpSync(output, snapshot, { recursive: true });
  const evidence = JSON.parse(
    readFileSync(resolve(snapshot, "verification.json"), "utf8"),
  );
  const archives = packages.map(({ manifest, archiveName }) => {
    const path = resolve(snapshot, archiveName);
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
  const accepted = state?.version === version ? (state.accepted ?? []) : [];
  const saveState = (status) =>
    writeFileSync(
      statePath,
      JSON.stringify({ version, source, status, accepted }) + "\n",
    );
  // Preflight every package before the first mutation, including resumable partial releases.
  const pending = [];
  for (const archive of archives) {
    const found = publish ? await registryIntegrity(archive.name) : undefined;
    if (found === undefined) {
      const acknowledgement = accepted.find(
        (entry) => entry.name === archive.name,
      );
      if (acknowledgement) {
        if (acknowledgement.integrity !== archive.integrity)
          throw new Error(
            `${archive.name}: this version was accepted with different bytes; restore the release source before resuming.`,
          );
        console.log(
          `${archive.name}: npm already accepted these bytes; skipping repeated publication.`,
        );
        continue;
      }
      pending.push(archive);
      continue;
    }
    if (found !== archive.integrity)
      throw new Error(
        `${archive.name}@${version} already exists with different content; choose a new version.`,
      );
    console.log(
      `${archive.name}@${version} already published with matching integrity.`,
    );
  }
  if (publish && pending.length > 0) {
    console.log(
      "Artifacts are qualified. Checking npm authentication immediately before publication.",
    );
    run("pnpm", ["whoami", `--registry=${registry}`]);
  }
  if (publish && pending.length > 0) saveState("pending");
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
    if (publish) {
      accepted.push({ name: archive.name, integrity: archive.integrity });
      saveState("pending");
    }
  }
  for (const archive of publish ? archives : []) {
    let visible = false;
    const visibilityDeadline = Date.now() + 5 * 60_000;
    console.log(
      `${archive.name}: npm reported publication success; waiting for registry integrity (up to five minutes, plus any in-flight lookup).`,
    );
    for (let attempt = 0; Date.now() < visibilityDeadline; attempt++) {
      const found = await registryIntegrity(archive.name);
      if (found !== undefined && found !== archive.integrity)
        throw new Error(`${archive.name}: registry integrity mismatch`);
      if (found === archive.integrity) {
        visible = true;
        break;
      }
      if (attempt % 5 === 0)
        console.log(
          `${archive.name}: registry still returns E404; publication is not yet verified.`,
        );
      await delay(2000);
    }
    if (!visible)
      throw new Error(
        `${archive.name}: npm reported success, but registry visibility timed out. Publication remains unverified; MCP may still be pending. Rerun pnpm local-release to resume this version.`,
      );
  }
  if (publish) saveState("complete");
  console.log(
    `${publish ? "Published" : "Dry run passed for"} SDK and MCP ${version} (${channel}) from ${source}.`,
  );
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
