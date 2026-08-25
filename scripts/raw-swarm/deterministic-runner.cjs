const { spawn } = require("node:child_process");

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

      const child = spawn(boundary, [command, ...args], {
        env: environment,
        stdio: "inherit",
      });
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
      await active.closePromise;
    },
  };
}

module.exports = { createDeterministicRunner };
