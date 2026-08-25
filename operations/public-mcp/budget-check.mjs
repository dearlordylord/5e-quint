import { readFile } from "node:fs/promises";

const [policyPath, measurementPath, recipient] = process.argv.slice(2);
if (
  policyPath === undefined ||
  measurementPath === undefined ||
  recipient === undefined
) {
  process.stderr.write(
    "usage: node budget-check.mjs <policy.json> <measurement.json> <recipient>\n",
  );
  process.exitCode = 64;
} else {
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const measurement = JSON.parse(await readFile(measurementPath, "utf8"));
  if (
    typeof policy !== "object" ||
    policy === null ||
    typeof policy.window !== "string" ||
    typeof policy.warningFraction !== "number" ||
    !Number.isFinite(policy.warningFraction) ||
    policy.warningFraction <= 0 ||
    policy.warningFraction > 1 ||
    typeof policy.limits !== "object" ||
    policy.limits === null
  ) {
    throw new Error("Budget policy is invalid.");
  }
  const dimensions = Object.keys(policy.limits);
  if (dimensions.length === 0) throw new Error("Budget policy has no limits.");
  const alerts = dimensions.flatMap((dimension) => {
    const measured = measurement[dimension];
    const limit = policy.limits[dimension];
    if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
      throw new Error(
        `Budget limit ${dimension} must be a positive finite number.`,
      );
    }
    if (
      typeof measured !== "number" ||
      !Number.isFinite(measured) ||
      measured < 0
    ) {
      throw new Error(
        `Measurement ${dimension} must be a non-negative finite number.`,
      );
    }
    return measured >= limit * policy.warningFraction
      ? [{ dimension, measured, limit }]
      : [];
  });
  process.stdout.write(
    `${JSON.stringify({ recipient, window: policy.window, alerts })}\n`,
  );
  if (alerts.length > 0) process.exitCode = 2;
}
