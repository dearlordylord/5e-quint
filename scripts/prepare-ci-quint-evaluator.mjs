import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";

// Reviewed upstream release asset digest:
// https://github.com/quint-co/quint/releases/download/evaluator/v0.8.0/quint_evaluator-x86_64-unknown-linux-gnu.tar.gz
export const REVIEWED_EVALUATOR_RELEASE = Object.freeze({
  version: "v0.8.0",
  repository: "quint-co/quint",
  assetName: "quint_evaluator-x86_64-unknown-linux-gnu.tar.gz",
  sha256: "774020b648a887f511d040fd564a8223c62a996b80f8dc50ea24d8630235be51",
});

export async function prepareQuintEvaluator({
  release,
  installedEvaluatorVersion,
  evaluatorDirectory,
  githubToken,
  execute = execFileSync,
  pause = setTimeout,
}) {
  if (installedEvaluatorVersion !== release.version) {
    throw new Error(
      `Installed Quint requires evaluator ${installedEvaluatorVersion}; review its release asset and digest before updating the ${release.version} acquisition pin.`,
    );
  }
  if (!githubToken) {
    throw new Error("Quint evaluator acquisition requires GH_TOKEN.");
  }
  const scratch = mkdtempSync(join(tmpdir(), "quint-evaluator-acquisition-"));
  try {
    const archive = join(scratch, release.assetName);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        execute(
          "gh",
          [
            "release",
            "download",
            `evaluator/${release.version}`,
            "--repo",
            release.repository,
            "--pattern",
            release.assetName,
            "--dir",
            scratch,
            "--clobber",
          ],
          {
            env: { ...process.env, GH_TOKEN: githubToken },
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30_000,
          },
        );
        break;
      } catch {
        if (attempt === 3) {
          throw new Error(
            "Authenticated Quint evaluator download failed after 3 attempts.",
          );
        }
        await pause(attempt * 1000);
      }
    }
    const digest = createHash("sha256")
      .update(readFileSync(archive))
      .digest("hex");
    if (digest !== release.sha256) {
      throw new Error(
        "Quint evaluator archive does not match the reviewed SHA-256 digest.",
      );
    }
    const extracted = join(scratch, "extracted");
    mkdirSync(extracted);
    execute("tar", ["-xzf", archive, "-C", extracted], { timeout: 10_000 });
    const executable = join(extracted, "quint_evaluator");
    chmodSync(executable, 0o755);
    execute(executable, ["--help"], { stdio: "pipe", timeout: 10_000 });
    mkdirSync(evaluatorDirectory, { recursive: true });
    const destination = join(evaluatorDirectory, "quint_evaluator");
    copyFileSync(executable, destination);
    chmodSync(destination, 0o755);
    return destination;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

async function main() {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("The CI Quint evaluator pin supports Linux x64 runners.");
  }
  const require = createRequire(import.meta.url);
  const {
    QUINT_EVALUATOR_VERSION,
  } = require("@informalsystems/quint/dist/src/rust/binaryManager.js");
  const {
    rustEvaluatorDir,
  } = require("@informalsystems/quint/dist/src/config.js");
  const destination = await prepareQuintEvaluator({
    release: REVIEWED_EVALUATOR_RELEASE,
    installedEvaluatorVersion: QUINT_EVALUATOR_VERSION,
    evaluatorDirectory: rustEvaluatorDir(QUINT_EVALUATOR_VERSION),
    githubToken: process.env.GH_TOKEN,
  });
  console.log(
    `Prepared verified Quint evaluator ${QUINT_EVALUATOR_VERSION} at ${destination}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
