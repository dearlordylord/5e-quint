const { spawn } = require("node:child_process");

const SIGNAL_EXIT_STATUS = Object.freeze({
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
});

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function createDeterministicRunner({ boundary, environment }) {
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
        ["--owner-pid", String(process.pid), command, ...args],
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
      let result;
      try {
        result = await active.closePromise;
      } catch (error) {
        throw new Error(
          `The deterministic helper cleanup failed during ${signal}: ${describeError(error)}`,
        );
      }
      const expectedStatus = SIGNAL_EXIT_STATUS[signal];
      if (
        result.signal === null &&
        (result.status === 0 || result.status === expectedStatus)
      ) {
        return result;
      }
      if (
        result.signal !== null ||
        expectedStatus === undefined ||
        result.status !== expectedStatus
      ) {
        throw new Error(
          `The deterministic helper cleanup failed during ${signal}: exited with ${result.signal ?? String(result.status)}.`,
        );
      }
      return result;
    },
  };
}

module.exports = { createDeterministicRunner };
