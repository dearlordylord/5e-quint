import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const {
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
} = require("./lane-classification.cjs");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(64);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) {
    process.stderr.write(
      `Raw Swarm model operation stopped by ${result.signal}.\n`,
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const [profile, ...profileArguments] = process.argv.slice(2);
const modelArguments =
  profileArguments[0] === "--" ? profileArguments.slice(1) : profileArguments;
const [operationName, ...operationArguments] = modelArguments;
if (
  (profile !== "trial" && profile !== "campaign") ||
  operationName === undefined
) {
  fail(
    "usage: run-model-backed.mjs <trial|campaign> <operation> [operation arguments]",
  );
}
const operation = MODEL_BACKED_OPERATIONS[operationName];
if (operation === undefined) {
  fail(
    `Unknown model-backed operation ${operationName}. Expected one of: ${Object.keys(MODEL_BACKED_OPERATIONS).join(", ")}.`,
  );
}
if (
  !/^[123]$/.test(process.env.DND_RAW_SWARM_MODEL_LANE ?? "") ||
  process.env.DND_RAW_SWARM_MODEL_LANE_GUARD !== "v1"
) {
  fail("Raw Swarm model operations require the public model-lane lock.");
}
const expectedGitSha = process.env.RAW_SWARM_EXPECTED_GIT_SHA ?? "";
if (!/^[0-9a-f]{40}$/.test(expectedGitSha)) {
  fail(
    "RAW_SWARM_EXPECTED_GIT_SHA must name one full lowercase 40-character Git SHA.",
  );
}
const status = spawnSync("git", ["status", "--porcelain=v1"], {
  encoding: "utf8",
});
if (status.error !== undefined) throw status.error;
if (status.status !== 0 || status.stdout !== "") {
  fail("Raw Swarm model execution requires a clean tracked worktree.");
}
const currentGitSha = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
});
if (currentGitSha.error !== undefined) throw currentGitSha.error;
if (
  currentGitSha.status !== 0 ||
  currentGitSha.stdout.trim() !== expectedGitSha
) {
  fail(
    `RAW_SWARM_EXPECTED_GIT_SHA does not match the current revision: expected ${expectedGitSha}, current ${currentGitSha.stdout.trim() || "unreadable"}.`,
  );
}

if (profile === "campaign") {
  const operationId = process.env.RAW_SWARM_OPERATION_ID ?? "";
  const deadline = process.env.RAW_SWARM_OPERATION_DEADLINE_UTC ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(operationId)) {
    fail("RAW_SWARM_OPERATION_ID must be a lowercase hyphenated identity.");
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(deadline) ||
    !Number.isFinite(Date.parse(deadline)) ||
    Date.parse(deadline) <= Date.now()
  ) {
    fail("RAW_SWARM_OPERATION_DEADLINE_UTC must be a future UTC timestamp.");
  }
}

const authentication = spawnSync("codex", ["login", "status"], {
  stdio: "ignore",
});
if (authentication.error !== undefined || authentication.status !== 0) {
  fail(
    "Codex authentication is unavailable. Configure the Codex CLI before starting model-backed Raw Swarm work.",
  );
}

const commandArguments = [...operation.fixedArguments, ...operationArguments];
const environment = {
  ...process.env,
  DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD: `v1:${expectedGitSha}`,
};
if (operationName === "sdk-player") {
  if (!commandArguments.includes("--implementation-git-sha")) {
    commandArguments.push("--implementation-git-sha", expectedGitSha);
  }
}
if (operationName === "post-play-review") {
  environment.RAW_REVIEW_IMPLEMENTATION_GIT_SHA = expectedGitSha;
}

let executable = operation.command.endsWith(".sh") ? operation.command : "pnpm";
let args = operation.command.endsWith(".sh")
  ? commandArguments
  : ["exec", "tsx", operation.command, ...commandArguments];
if (operation.writesCatalogue) {
  const commonDirectory = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  );
  if (commonDirectory.error !== undefined) throw commonDirectory.error;
  if (commonDirectory.status !== 0 || commonDirectory.stdout.trim() === "") {
    fail("Raw Swarm could not resolve the catalogue-writer lock directory.");
  }
  args = [
    "--exclusive",
    resolve(commonDirectory.stdout.trim(), "raw-swarm-catalogue-writer.lock"),
    executable,
    ...args,
  ];
  executable = "flock";
}
args = [
  "--signal=TERM",
  "--kill-after=30s",
  `${MODEL_BACKED_PROFILE_BUDGET_SECONDS[profile]}s`,
  executable,
  ...args,
];
executable = "timeout";
run(executable, args, { env: environment });
