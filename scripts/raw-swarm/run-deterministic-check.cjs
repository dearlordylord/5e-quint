const { mkdtempSync, rmSync } = require("node:fs");
const { delimiter, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { installDeterministicCleanup } = require("./deterministic-cleanup.cjs");
const { compileTrustedCSource } = require("./deterministic-toolchain.cjs");
const { createDeterministicRunner } = require("./deterministic-runner.cjs");

const {
  DETERMINISTIC_TRUSTED_BOUNDARY_TESTS,
  GUARDED_DETERMINISTIC_RAW_SWARM_TESTS,
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
    };
    delete deterministicEnvironment.NODE_OPTIONS;
    const trustedBoundaryRunner = createDeterministicRunner({
      boundary: processSupervisor,
      environment: deterministicEnvironment,
      superviseOnly: true,
    });
    const guardedRepositoryRunner = createDeterministicRunner({
      boundary: processSupervisor,
      environment: {
        ...deterministicEnvironment,
        NODE_OPTIONS: deterministicNodeOptions,
      },
    });

    const vitestInvocation = (tests) => ({
      command: "mise",
      args: [
        "exec",
        "--",
        "pnpm",
        "exec",
        resolve(__dirname, "../../node_modules/.bin/vitest"),
        "run",
        ...tests,
        "--pool=threads",
        "--maxWorkers=1",
      ],
    });
    const runPhase = async ({ phaseName, phaseRunner, invocation }) => {
      runner = phaseRunner;
      const result = await phaseRunner.run(invocation.command, invocation.args);
      if (result.signal !== null) {
        process.stderr.write(
          `Raw Swarm deterministic ${phaseName} phase stopped by ${result.signal}.\n`,
        );
        process.exitCode = 1;
        return false;
      }
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        return false;
      }
      return true;
    };

    if (
      !(await runPhase({
        phaseName: "guarded typecheck",
        phaseRunner: guardedRepositoryRunner,
        invocation: {
          command: "pnpm",
          args: [
            "exec",
            "tsc",
            "-p",
            "scripts/raw-swarm/sdk-player/tsconfig.json",
          ],
        },
      }))
    ) {
      return;
    }
    if (
      !(await runPhase({
        phaseName: "trusted boundary",
        phaseRunner: trustedBoundaryRunner,
        invocation: vitestInvocation(DETERMINISTIC_TRUSTED_BOUNDARY_TESTS),
      }))
    ) {
      return;
    }
    if (
      !(await runPhase({
        phaseName: "guarded repository",
        phaseRunner: guardedRepositoryRunner,
        invocation: vitestInvocation(GUARDED_DETERMINISTIC_RAW_SWARM_TESTS),
      }))
    ) {
      return;
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
