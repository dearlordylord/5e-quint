const { spawn } = require("node:child_process");

const HANDLED_SIGNAL_EXIT_STATUSES = Object.freeze([129, 130, 143]);

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function awaitDeterministicHelperClose(closePromise, signal) {
  try {
    return await closePromise;
  } catch (error) {
    throw new Error(
      `The deterministic helper cleanup failed during ${signal}: ${describeError(error)}`,
    );
  }
}

function createDeterministicRunner({
  boundary,
  environment,
  superviseOnly = false,
}) {
  let activeRun;

  return {
    async run(command, args) {
      if (activeRun !== undefined) {
        throw new Error(
          "The deterministic runner cannot start a concurrent command.",
        );
      }

      const child = spawn(
        boundary,
        [
          "--owner-pid",
          String(process.pid),
          ...(superviseOnly ? ["--supervise-only"] : []),
          command,
          ...args,
        ],
        {
          env: environment,
          stdio: "inherit",
        },
      );
      const closePromise = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (status, signal) => resolve({ status, signal }));
      });
      const active = { child, closePromise };
      activeRun = active;

      try {
        return await closePromise;
      } catch (error) {
        throw new Error(
          `The deterministic network boundary could not start ${command}: ${describeError(error)}`,
        );
      } finally {
        if (activeRun === active) activeRun = undefined;
      }
    },

    async terminateActive(signal) {
      const active = activeRun;
      if (active === undefined) return;
      active.child.kill(signal);
      const result = await awaitDeterministicHelperClose(
        active.closePromise,
        signal,
      );
      if (
        result.signal === null &&
        (result.status === 0 ||
          HANDLED_SIGNAL_EXIT_STATUSES.includes(result.status))
      ) {
        return result;
      }
      throw new Error(
        `The deterministic helper cleanup failed during ${signal}: exited with ${result.signal ?? String(result.status)}.`,
      );
    },
  };
}

module.exports = { createDeterministicRunner };
