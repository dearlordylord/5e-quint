const SIGNAL_EXIT_STATUS = Object.freeze({
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
});

function installDeterministicCleanup(cleanup) {
  let cleaned = false;
  const runCleanup = () => {
    if (cleaned) return;
    cleaned = true;
    cleanup();
  };
  process.once("exit", runCleanup);
  for (const [signal, exitStatus] of Object.entries(SIGNAL_EXIT_STATUS)) {
    process.once(signal, () => {
      try {
        runCleanup();
      } finally {
        process.exit(exitStatus);
      }
    });
  }
}

module.exports = { installDeterministicCleanup };
