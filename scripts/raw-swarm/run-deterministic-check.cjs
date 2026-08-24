const { spawnSync } = require("node:child_process");
const { delimiter, resolve } = require("node:path");

const { DETERMINISTIC_RAW_SWARM_TESTS } = require("./lane-classification.cjs");

if (process.env.DND_RESOURCE_LOCK_KIND !== "broad") {
  process.stderr.write(
    "Raw Swarm deterministic verification requires the broad resource lock.\n",
  );
  process.exit(70);
}

const deterministicEnvironment = {
  ...process.env,
  PATH: `${resolve(__dirname, "deterministic-bin")}${delimiter}${process.env.PATH ?? ""}`,
  RAW_SWARM_EXECUTION_LANE: "deterministic",
};

function run(command, args) {
  const result = spawnSync(command, args, {
    env: deterministicEnvironment,
    stdio: "inherit",
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) {
    process.stderr.write(
      `Raw Swarm deterministic verification stopped by ${result.signal}.\n`,
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", [
  "exec",
  "tsc",
  "-p",
  "scripts/raw-swarm/sdk-player/tsconfig.json",
]);
run("mise", [
  "exec",
  "--",
  "pnpm",
  "exec",
  "vitest",
  "run",
  ...DETERMINISTIC_RAW_SWARM_TESTS,
  "--pool=threads",
  "--maxWorkers=1",
]);
