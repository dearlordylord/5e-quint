const { mkdtempSync, rmSync } = require("node:fs");
const { delimiter, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { installDeterministicCleanup } = require("./deterministic-cleanup.cjs");
const { compileTrustedCSource } = require("./deterministic-toolchain.cjs");
const { createDeterministicRunner } = require("./deterministic-runner.cjs");

const {
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
} = require("./lane-classification.cjs");

const deterministicCapabilityGuard = resolve(
  __dirname,
  "deterministic-capability-guard.cjs",
);
const deterministicNodeOptions = `--require=${deterministicCapabilityGuard}`;
const processSupervisorSource = resolve(__dirname, "process-supervisor.c");

function compileProcessSupervisor(buildDirectory) {
  const binaryPath = join(buildDirectory, "process-supervisor");
  const compilation = compileTrustedCSource(
    processSupervisorSource,
    binaryPath,
  );
  if (!compilation.ok) {
    throw new Error(
      `Raw Swarm deterministic verification could not compile its Linux seccomp boundary; refusing to weaken the lane. ${compilation.message}`,
    );
  }
  return binaryPath;
}

async function main() {
  if (process.platform !== "linux") {
    process.stderr.write(
      "Raw Swarm deterministic verification requires Linux seccomp; refusing to run without the kernel boundary.\n",
    );
    process.exitCode = 78;
    return;
  }
  if (process.env.DND_RESOURCE_LOCK_KIND !== "broad") {
    process.stderr.write(
      "Raw Swarm deterministic verification requires the broad resource lock.\n",
    );
    process.exitCode = 70;
    return;
  }

  const buildDirectory = mkdtempSync(
    resolve(tmpdir(), "dnd-raw-swarm-seccomp-"),
  );
  let runner;
  const cleanup = installDeterministicCleanup({
    cleanup: () => rmSync(buildDirectory, { recursive: true, force: true }),
    onSignal: async ({ cleanup: runCleanup, exitStatus, signal }) => {
      const cleanupExitStatus = await (async () => {
        try {
          await runner?.terminateActive(signal);
          return exitStatus;
        } catch (error) {
          process.stderr.write(
            `Raw Swarm deterministic verification could not settle its owned process tree: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          return 1;
        } finally {
          runCleanup();
        }
      })();
      process.exit(cleanupExitStatus);
    },
  });

  try {
    const processSupervisor = compileProcessSupervisor(buildDirectory);
    const deterministicEnvironment = {
      ...process.env,
      PATH: `${resolve(__dirname, "deterministic-bin")}${delimiter}${process.env.PATH ?? ""}`,
      RAW_SWARM_EXECUTION_LANE: "deterministic",
      NODE_OPTIONS: deterministicNodeOptions,
    };
    runner = createDeterministicRunner({
      boundary: processSupervisor,
      environment: deterministicEnvironment,
    });

    for (const [command, args] of [
      [
        "pnpm",
        ["exec", "tsc", "-p", "scripts/raw-swarm/sdk-player/tsconfig.json"],
      ],
      [
        "mise",
        [
          "exec",
          "--",
          "pnpm",
          "exec",
          resolve(__dirname, "../../node_modules/.bin/vitest"),
          "run",
          ...QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
          "--pool=threads",
          "--maxWorkers=1",
        ],
      ],
    ]) {
      const result = await runner.run(command, args);
      if (result.signal !== null) {
        process.stderr.write(
          `Raw Swarm deterministic verification stopped by ${result.signal}.\n`,
        );
        process.exitCode = 1;
        return;
      }
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        return;
      }
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 78;
  } finally {
    cleanup();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `Raw Swarm deterministic verification failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
