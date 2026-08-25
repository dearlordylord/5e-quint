const { spawnSync } = require("node:child_process");
const {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} = require("node:fs");
const { delimiter, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { installDeterministicCleanup } = require("./deterministic-cleanup.cjs");
const { compileTrustedCSource } = require("./deterministic-toolchain.cjs");

const {
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
} = require("./lane-classification.cjs");

const deterministicCapabilityGuard = resolve(
  __dirname,
  "deterministic-capability-guard.cjs",
);
const deterministicNodeOptions = `--require=${deterministicCapabilityGuard}`;
const deterministicNetworkBoundarySource = resolve(
  __dirname,
  "deterministic-network-boundary.c",
);

function compileDeterministicNetworkBoundary() {
  if (process.platform !== "linux") {
    process.stderr.write(
      "Raw Swarm deterministic verification requires Linux seccomp; refusing to run without the kernel boundary.\n",
    );
    process.exit(78);
  }
  const buildDirectory = mkdtempSync(
    resolve(tmpdir(), "dnd-raw-swarm-seccomp-"),
  );
  const binaryPath = join(buildDirectory, "deterministic-network-boundary");
  installDeterministicCleanup(() => {
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const compilation = compileTrustedCSource(
    deterministicNetworkBoundarySource,
    binaryPath,
  );
  if (!compilation.ok) {
    process.stderr.write(
      `Raw Swarm deterministic verification could not compile its Linux seccomp boundary; refusing to weaken the lane. ${compilation.message}\n`,
    );
    process.exit(78);
  }
  return binaryPath;
}

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
  NODE_OPTIONS: deterministicNodeOptions,
};
const deterministicNetworkBoundary = compileDeterministicNetworkBoundary();

function run(command, args) {
  const buildDirectory = resolve(deterministicNetworkBoundary, "..");
  const stdoutPath = join(buildDirectory, `${command}.stdout`);
  const stderrPath = join(buildDirectory, `${command}.stderr`);
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  const result = (() => {
    try {
      return spawnSync(deterministicNetworkBoundary, [command, ...args], {
        env: deterministicEnvironment,
        stdio: ["ignore", stdoutFd, stderrFd],
      });
    } finally {
      closeSync(stdoutFd);
      closeSync(stderrFd);
    }
  })();
  process.stdout.write(readFileSync(stdoutPath));
  process.stderr.write(readFileSync(stderrPath));
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
  resolve(__dirname, "../../node_modules/.bin/vitest"),
  "run",
  ...QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  "--pool=threads",
  "--maxWorkers=1",
]);
