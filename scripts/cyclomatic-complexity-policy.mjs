import { relative, resolve } from "node:path";

export const CYCLOMATIC_COMPLEXITY_THRESHOLD = 8;
export const CYCLOMATIC_COMPLEXITY_VARIANT = "classic";

const complexityMessagePattern = /complexity of (?<complexity>\d+)\./u;

/** @param {readonly number[]} values */
function formatComplexityVector(values) {
  return `[${values.join(", ")}]`;
}

/**
 * @typedef {{
 *   readonly threshold: number;
 *   readonly variant: string;
 *   readonly files: Readonly<Record<string, readonly number[]>>;
 * }} ComplexityBaseline
 */

/**
 * @param {string} workspaceRoot
 * @param {readonly { readonly filePath: string; readonly messages: readonly { readonly ruleId: string | null; readonly message: string }[] }[]} results
 * @returns {Record<string, number[]>}
 */
export function complexityMeasurementsFromEslint(workspaceRoot, results) {
  /** @type {Map<string, number[]>} */
  const measurements = new Map();

  for (const result of results) {
    const filename = relative(workspaceRoot, resolve(result.filePath));
    for (const message of result.messages) {
      if (message.ruleId !== "complexity") continue;
      const match = complexityMessagePattern.exec(message.message);
      if (match?.groups?.complexity === undefined) {
        throw new Error(
          `Unexpected ESLint complexity diagnostic for ${filename}: ${message.message}`,
        );
      }
      const measuredComplexity = Number.parseInt(match.groups.complexity, 10);
      measurements.set(filename, [
        ...(measurements.get(filename) ?? []),
        measuredComplexity,
      ]);
    }
  }

  return Object.fromEntries(
    [...measurements]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([filename, values]) => [
        filename,
        values.toSorted((left, right) => right - left),
      ]),
  );
}

/**
 * @param {ComplexityBaseline} baseline
 * @param {number} configuredThreshold
 * @param {string} configuredVariant
 * @param {Readonly<Record<string, readonly number[]>>} measurements
 * @returns {string[]}
 */
export function complexityBaselineIssues(
  baseline,
  configuredThreshold,
  configuredVariant,
  measurements,
) {
  const issues = [];
  if (baseline.threshold !== configuredThreshold) {
    issues.push(
      `baseline threshold is ${baseline.threshold}; configured threshold is ${configuredThreshold}`,
    );
  }
  if (baseline.variant !== configuredVariant) {
    issues.push(
      `baseline variant is ${JSON.stringify(baseline.variant)}; configured variant is ${JSON.stringify(configuredVariant)}`,
    );
  }

  const filenames = new Set([
    ...Object.keys(baseline.files),
    ...Object.keys(measurements),
  ]);
  for (const filename of [...filenames].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const expected = baseline.files[filename] ?? [];
    const actual = measurements[filename] ?? [];
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      issues.push(
        `${filename}: expected ${formatComplexityVector(expected)}, found ${formatComplexityVector(actual)}`,
      );
    }
  }
  return issues;
}

/**
 * @param {ComplexityBaseline} baseline
 * @param {Readonly<Record<string, readonly number[]>>} measurements
 * @returns {string[]}
 */
export function complexityRegressionsAgainstBaseline(baseline, measurements) {
  const issues = [];
  for (const [filename, actual] of Object.entries(measurements).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const expected = baseline.files[filename] ?? [];
    for (const [index, measuredComplexity] of actual.entries()) {
      const recordedComplexity = expected[index];
      if (recordedComplexity === undefined) {
        const addedCount = actual.length - expected.length;
        issues.push(
          `${filename}: added ${addedCount} ${addedCount === 1 ? "violation" : "violations"} above the threshold`,
        );
        break;
      }
      if (measuredComplexity > recordedComplexity) {
        issues.push(
          `${filename}: ranked violation ${index + 1} increased from ${recordedComplexity} to ${measuredComplexity}`,
        );
      }
    }
  }
  return issues;
}
