const MAXIMUM_TIMEOUT_MILLISECONDS = 7 * 24 * 60 * 60 * 1_000;
const DEADLINE_SETTINGS = Object.freeze([
  [
    "acquisitionMs",
    "DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS",
    2 * 60 * 60 * 1_000,
  ],
  ["executionMs", "DND_VERIFICATION_EXECUTION_TIMEOUT_MS", 8 * 60 * 60 * 1_000],
  ["stageMs", "DND_VERIFICATION_STAGE_TIMEOUT_MS", 2 * 60 * 60 * 1_000],
]);

export function readVerificationDeadlinePolicy(env = process.env) {
  return Object.fromEntries(
    DEADLINE_SETTINGS.map(([key, variable, fallback]) => {
      const input = env[variable];
      const value = input === undefined ? fallback : Number(input);
      if (
        (input !== undefined && !/^[1-9][0-9]*$/.test(input)) ||
        !Number.isSafeInteger(value) ||
        value <= 0 ||
        value > MAXIMUM_TIMEOUT_MILLISECONDS
      ) {
        throw new Error(
          `${variable} must be a positive decimal integer no greater than ${MAXIMUM_TIMEOUT_MILLISECONDS}.`,
        );
      }
      return [key, value];
    }),
  );
}

if (process.argv[1] === import.meta.filename) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== "--shell")
      throw new Error("Usage: verification-deadline-policy.mjs --shell");
    const policy = readVerificationDeadlinePolicy();
    process.stdout.write(
      `${policy.acquisitionMs}\n${policy.executionMs}\n${policy.stageMs}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 64;
  }
}
