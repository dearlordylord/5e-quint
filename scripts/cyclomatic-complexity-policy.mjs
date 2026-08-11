import { relative, resolve } from "node:path";

import { NON_PRODUCTION_TYPESCRIPT_GLOBS } from "./workspace-source-policy.mjs";

export const CYCLOMATIC_COMPLEXITY_THRESHOLD = 8;
export const CYCLOMATIC_COMPLEXITY_VARIANT = "classic";
export const CYCLOMATIC_COMPLEXITY_IGNORES = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  ...NON_PRODUCTION_TYPESCRIPT_GLOBS,
];

const complexityMessagePattern = /complexity of (?<complexity>\d+)\./u;

/**
 * @typedef {{
 *   readonly threshold: number;
 *   readonly variant: string;
 *   readonly files: Readonly<Record<string, Readonly<Record<string, number>>>>;
 * }} ComplexityBaseline
 */

/**
 * @param {string} workspaceRoot
 * @param {readonly { readonly filePath: string; readonly messages: readonly { readonly ruleId: string | null; readonly message: string; readonly line?: number; readonly column?: number }[] }[]} results
 * @param {(filename: string, diagnostic: { readonly line: number; readonly column: number }) => string} identityForDiagnostic
 * @returns {Record<string, Record<string, number>>}
 */
export function complexityMeasurementsFromEslint(
  workspaceRoot,
  results,
  identityForDiagnostic,
) {
  /** @type {Map<string, Map<string, number>>} */
  const measurements = new Map();

  for (const result of results) {
    const filename = relative(workspaceRoot, resolve(result.filePath));
    for (const message of result.messages) {
      if (message.ruleId !== "complexity") continue;
      if (message.line === undefined || message.column === undefined) {
        throw new Error(
          `Complexity diagnostic for ${filename} has no location.`,
        );
      }
      const match = complexityMessagePattern.exec(message.message);
      if (match?.groups?.complexity === undefined) {
        throw new Error(
          `Unexpected ESLint complexity diagnostic for ${filename}: ${message.message}`,
        );
      }
      const measuredComplexity = Number.parseInt(match.groups.complexity, 10);
      const identity = identityForDiagnostic(result.filePath, {
        line: message.line,
        column: message.column,
      });
      const fileMeasurements = measurements.get(filename) ?? new Map();
      if (fileMeasurements.has(identity)) {
        throw new Error(
          `Cyclomatic complexity identity is not unique in ${filename}: ${identity}`,
        );
      }
      fileMeasurements.set(identity, measuredComplexity);
      measurements.set(filename, fileMeasurements);
    }
  }

  return Object.fromEntries(
    [...measurements]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([filename, identities]) => [
        filename,
        Object.fromEntries(
          [...identities].sort(([left], [right]) => left.localeCompare(right)),
        ),
      ]),
  );
}

/**
 * @param {ComplexityBaseline} baseline
 * @param {number} configuredThreshold
 * @param {string} configuredVariant
 * @param {Readonly<Record<string, Readonly<Record<string, number>>>>} measurements
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
    const expected = baseline.files[filename] ?? {};
    const actual = measurements[filename] ?? {};
    const identities = new Set([
      ...Object.keys(expected),
      ...Object.keys(actual),
    ]);
    for (const identity of [...identities].sort((left, right) =>
      left.localeCompare(right),
    )) {
      const expectedComplexity = expected[identity];
      const actualComplexity = actual[identity];
      if (expectedComplexity !== actualComplexity) {
        issues.push(
          `${filename} :: ${identity}: expected ${expectedComplexity ?? "absent"}, found ${actualComplexity ?? "absent"}`,
        );
      }
    }
  }
  return issues;
}

/**
 * @param {ComplexityBaseline} baseline
 * @param {Readonly<Record<string, Readonly<Record<string, number>>>>} measurements
 * @returns {string[]}
 */
export function complexityRegressionsAgainstBaseline(baseline, measurements) {
  const issues = [];
  for (const [filename, actual] of Object.entries(measurements).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const expected = baseline.files[filename] ?? {};
    for (const [identity, measuredComplexity] of Object.entries(actual)) {
      const recordedComplexity = expected[identity];
      if (recordedComplexity === undefined) {
        issues.push(
          `${filename} :: ${identity}: added complexity ${measuredComplexity} above the threshold`,
        );
      } else if (measuredComplexity > recordedComplexity) {
        issues.push(
          `${filename} :: ${identity}: increased from ${recordedComplexity} to ${measuredComplexity}`,
        );
      }
    }
  }
  return issues;
}
