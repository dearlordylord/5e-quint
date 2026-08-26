const SIGNAL_EXIT_STATUS = Object.freeze({
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
});

function installDeterministicCleanup({ cleanup, onSignal }) {
  let cleaned = false;
  let signalHandled = false;
  const runCleanup = () => {
    if (cleaned) return;
    cleaned = true;
    cleanup();
  };
  process.once("exit", runCleanup);
  for (const [signal, exitStatus] of Object.entries(SIGNAL_EXIT_STATUS)) {
    process.once(signal, () => {
      if (signalHandled) return;
      signalHandled = true;
      try {
        Promise.resolve(
          onSignal({ cleanup: runCleanup, exitStatus, signal }),
        ).catch((error) => {
          process.stderr.write(
            `Deterministic cleanup failed during ${signal}: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          runCleanup();
          process.exit(1);
        });
      } catch (error) {
        process.stderr.write(
          `Deterministic cleanup failed during ${signal}: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        runCleanup();
        process.exit(1);
      }
    });
  }
  return runCleanup;
}

module.exports = { installDeterministicCleanup };
