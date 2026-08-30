import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  CYCLOMATIC_COMPLEXITY_THRESHOLD,
  CYCLOMATIC_COMPLEXITY_VARIANT,
  complexityBaselineIssues,
  complexityMeasurementsFromEslint,
  complexityRegressionsAgainstBaseline,
} from "./cyclomatic-complexity-policy.mjs";
import {
  NON_PRODUCTION_TYPESCRIPT_GLOBS,
  PRODUCTION_TYPESCRIPT_INCLUDE,
  sourceGlobsUnder,
} from "./workspace-source-policy.mjs";
import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS } from "./shared-host-test-policy.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGE_ROOT = join(ROOT, "packages");
const COMPLEXITY_BASELINE_PATH = join(
  ROOT,
  "cyclomatic-complexity-baseline.json",
);
const COMMON_COVERAGE_EXCLUDES = sourceGlobsUnder("src");

// Every production package must appear here. Library coverage floors are
// temporary non-regression ratchets remeasured with Vitest 4.1.11 and
// @vitest/coverage-v8 4.1.11's AST remapper on 2026-08-22. The previous
// 2026-07-26 values came from Vitest 3's legacy remapper and are not
// comparable. Issue #227's real target remains 99% for every metric in every
// package.
// Duplication ceilings remain at issue #228's real 2% target except
// for an explicitly identified temporary ratchet. Libraries are consumed as
// TypeScript source by their owning applications; the root Turbo build
// discovers the packages that own build scripts.
const PACKAGE_POLICIES = {
  app: {
    coverage: "packageConfig",
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "battle-runtime": {
    coverage: {
      lines: 97.13,
      statements: 96.77,
      functions: 98.31,
      branches: 93.85,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-battle-runtime": {
    coverage: {
      lines: 99.21,
      statements: 99.16,
      functions: 100,
      branches: 98.58,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-creation-runtime": {
    coverage: {
      lines: 99.48,
      statements: 99.37,
      functions: 99.44,
      branches: 98.01,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-sheet-runtime": {
    coverage: {
      lines: 99.24,
      statements: 99.04,
      functions: 99.37,
      branches: 97.57,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  mcp: {
    // Remeasured on 2026-08-26 after the recoverable/public MCP expansion.
    // Issue #227's 99% target remains the destination for this ratchet.
    coverage: {
      lines: 89.78,
      statements: 88.27,
      functions: 90.85,
      branches: 81.15,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "opaque-oracle": {
    // Initial contract coverage ratchet; raise toward issue #227's 99% target
    // as the later battle and fixture increments add their focused cases.
    coverage: {
      lines: 68.18,
      statements: 61.87,
      functions: 69.08,
      branches: 47.9,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  shared: {
    coverage: {
      lines: 98.16,
      statements: 98.18,
      functions: 96.2,
      branches: 98.18,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "shared-algebras": {
    coverage: {
      lines: 98.99,
      statements: 99.03,
      functions: 98.37,
      branches: 98.01,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  surface: {
    coverage: {
      lines: 99.17,
      statements: 99.08,
      functions: 98.66,
      branches: 96.7,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "tactical-space": {
    coverage: {
      lines: 99.56,
      statements: 99.58,
      functions: 100,
      branches: 98.62,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
};

const WORKSPACE_PACKAGE_KINDS = new Set(["production", "throwawayPrototype"]);

function discoveredPackages(packageRoot = PACKAGE_ROOT) {
  return readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageJsonPath = join(packageRoot, entry.name, "package.json");
      if (!existsSync(packageJsonPath)) return [];
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return [
        {
          name: entry.name,
          kind: packageJson.dndWorkspacePackageKind,
        },
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function packageKindIssues(discovered) {
  return discovered
    .filter((entry) => !WORKSPACE_PACKAGE_KINDS.has(entry.kind))
    .map((entry) => entry.name);
}

function productionPackageNames(discovered) {
  return discovered
    .filter((entry) => entry.kind === "production")
    .map((entry) => entry.name);
}

function inventoryIssues(discovered, configured) {
  const missing = discovered.filter((name) => !configured.includes(name));
  const stale = configured.filter((name) => !discovered.includes(name));
  return { missing, stale };
}

function checkInventory() {
  const discovered = discoveredPackages();
  const kindIssues = packageKindIssues(discovered);
  if (kindIssues.length > 0) {
    throw new Error(
      `Workspace packages must declare dndWorkspacePackageKind as production or throwawayPrototype: ${kindIssues.join(", ")}.`,
    );
  }
  const configured = Object.keys(PACKAGE_POLICIES).sort();
  const issues = inventoryIssues(
    productionPackageNames(discovered),
    configured,
  );
  if (issues.missing.length > 0 || issues.stale.length > 0) {
    throw new Error(
      `Workspace quality inventory mismatch. Missing: ${issues.missing.join(", ") || "none"}; stale: ${issues.stale.join(", ") || "none"}.`,
    );
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    stdio: options.capture === true ? "pipe" : "inherit",
  });
  if (result.error !== undefined) throw result.error;
  return result;
}

function checkCircularDependencies() {
  checkInventory();
  for (const [packageName, policy] of Object.entries(PACKAGE_POLICIES)) {
    const packageDirectory = join(PACKAGE_ROOT, packageName);
    const result = run(
      "pnpm",
      [
        "exec",
        "madge",
        "--extensions",
        "ts,tsx",
        "--circular",
        "--json",
        "--exclude",
        ".*\\.(test|mbt\\.test|gen)\\.(ts|tsx)$",
        "src",
      ],
      { cwd: packageDirectory, capture: true },
    );
    if (
      (result.status !== 0 && result.status !== 1) ||
      result.stdout.trim() === ""
    ) {
      process.stderr.write(result.stderr);
      throw new Error(`${packageName} circular-dependency analysis failed.`);
    }
    const cycles = JSON.parse(result.stdout);
    if (!Array.isArray(cycles)) {
      throw new Error(
        `${packageName} circular-dependency analysis returned a non-array report.`,
      );
    }
    if (result.status === 1 && cycles.length === 0) {
      process.stderr.write(result.stderr);
      throw new Error(
        `${packageName} circular-dependency analysis failed without reporting a cycle.`,
      );
    }
    if (cycles.length > policy.circularBaseline) {
      throw new Error(
        `${packageName} has ${cycles.length} circular dependencies; the ratchet allows at most ${policy.circularBaseline}.`,
      );
    }
    process.stdout.write(
      `${packageName}: ${cycles.length} circular dependencies (ceiling ${policy.circularBaseline}, target 0)\n`,
    );
  }
}

function checkDuplication() {
  checkInventory();
  for (const [packageName, policy] of Object.entries(PACKAGE_POLICIES)) {
    const reportDirectory = mkdtempSync(
      join(tmpdir(), `dnd-jscpd-${packageName}-`),
    );
    try {
      const result = run(
        "pnpm",
        [
          "exec",
          "jscpd",
          "src",
          "--threshold",
          "100",
          "--ignore",
          NON_PRODUCTION_TYPESCRIPT_GLOBS.join(","),
          "--reporters",
          "json",
          "--output",
          reportDirectory,
        ],
        { cwd: join(PACKAGE_ROOT, packageName), capture: true },
      );
      if (result.status !== 0) {
        process.stderr.write(result.stderr);
        throw new Error(`${packageName} duplication analysis failed.`);
      }
      const percentage = duplicationPercentage(
        join(reportDirectory, "jscpd-report.json"),
      );
      if (percentage > policy.duplicationCeiling) {
        throw new Error(
          `${packageName} duplication is ${percentage}%; the ratchet allows at most ${policy.duplicationCeiling}% (target 2%).`,
        );
      }
      process.stdout.write(
        `${packageName}: ${percentage}% duplication (ceiling ${policy.duplicationCeiling}%, target 2%)\n`,
      );
    } finally {
      rmSync(reportDirectory, { recursive: true, force: true });
    }
  }
}

function duplicationPercentage(reportPath) {
  if (!existsSync(reportPath)) return 0;
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  return report.statistics.total.percentage;
}

async function checkCyclomaticComplexity(pruneBaseline) {
  checkInventory();
  const { ESLint } = await import("eslint");
  const { complexityIdentityResolver } =
    await import("./cyclomatic-complexity-identities.mjs");
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: join(ROOT, "eslint.complexity.config.mjs"),
    errorOnUnmatchedPattern: false,
  });
  const results = await eslint.lintFiles(
    Object.keys(PACKAGE_POLICIES).map(
      (packageName) => `packages/${packageName}/src/**/*.{ts,tsx,mts,cts}`,
    ),
  );
  const fatalDiagnostics = results.flatMap((result) =>
    result.messages
      .filter((message) => message.fatal === true)
      .map(
        (message) =>
          `${relative(ROOT, result.filePath)}:${message.line ?? 0}:${message.column ?? 0}: ${message.message}`,
      ),
  );
  if (fatalDiagnostics.length > 0) {
    throw new Error(
      `Cyclomatic complexity analysis failed:\n${fatalDiagnostics.join("\n")}`,
    );
  }

  const measurements = complexityMeasurementsFromEslint(
    ROOT,
    results,
    complexityIdentityResolver(),
  );
  const baseline = JSON.parse(readFileSync(COMPLEXITY_BASELINE_PATH, "utf8"));
  if (pruneBaseline) {
    const policyIssues = complexityBaselineIssues(
      { ...baseline, files: measurements },
      CYCLOMATIC_COMPLEXITY_THRESHOLD,
      CYCLOMATIC_COMPLEXITY_VARIANT,
      measurements,
    );
    const regressions = complexityRegressionsAgainstBaseline(
      baseline,
      measurements,
    );
    if (policyIssues.length > 0 || regressions.length > 0) {
      throw new Error(
        `Cyclomatic complexity baseline cannot be pruned:\n${[
          ...policyIssues,
          ...regressions,
        ].join("\n")}`,
      );
    }
    writeFileSync(
      COMPLEXITY_BASELINE_PATH,
      `${JSON.stringify(
        {
          threshold: CYCLOMATIC_COMPLEXITY_THRESHOLD,
          variant: CYCLOMATIC_COMPLEXITY_VARIANT,
          files: measurements,
        },
        undefined,
        2,
      )}\n`,
    );
    process.stdout.write("Pruned the cyclomatic complexity baseline.\n");
    return;
  }

  const issues = complexityBaselineIssues(
    baseline,
    CYCLOMATIC_COMPLEXITY_THRESHOLD,
    CYCLOMATIC_COMPLEXITY_VARIANT,
    measurements,
  );
  if (issues.length > 0) {
    throw new Error(
      `Cyclomatic complexity baseline is out of sync:\n${issues.join("\n")}\nReduce regressions; after improvements, run pnpm check:complexity:prune.`,
    );
  }
  const violationCount = Object.values(measurements).reduce(
    (count, identities) => count + Object.keys(identities).length,
    0,
  );
  process.stdout.write(
    `Cyclomatic complexity is within the exact baseline: ${violationCount} existing violations across ${Object.keys(measurements).length} files; new production functions must be at most ${CYCLOMATIC_COMPLEXITY_THRESHOLD}.\n`,
  );
}

function coverageArguments(coverage) {
  return [
    "exec",
    "vitest",
    "run",
    "--exclude",
    "**/*.mbt.test.ts",
    "--coverage",
    "--coverage.reporter=text-summary",
    `--coverage.include=${PRODUCTION_TYPESCRIPT_INCLUDE}`,
    ...COMMON_COVERAGE_EXCLUDES.map(
      (excluded) => `--coverage.exclude=${excluded}`,
    ),
    `--coverage.thresholds.lines=${coverage.lines}`,
    `--coverage.thresholds.statements=${coverage.statements}`,
    `--coverage.thresholds.functions=${coverage.functions}`,
    `--coverage.thresholds.branches=${coverage.branches}`,
    "--maxWorkers=1",
    `--testTimeout=${SHARED_HOST_TEST_TIMEOUT_MILLISECONDS}`,
  ];
}

function checkCoverage() {
  checkInventory();
  for (const [packageName, policy] of Object.entries(PACKAGE_POLICIES)) {
    const args =
      policy.coverage === "packageConfig"
        ? ["--filter", "@dnd/app", "test:coverage", "--maxWorkers=1"]
        : coverageArguments(policy.coverage);
    const result = run("pnpm", args, {
      cwd:
        policy.coverage === "packageConfig"
          ? ROOT
          : join(PACKAGE_ROOT, packageName),
    });
    if (result.status !== 0) {
      throw new Error(`${packageName} coverage gate failed.`);
    }
  }
}

function selfTest() {
  checkInventory();
  const rootPackage = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  );
  assert.equal(
    rootPackage.scripts.quality,
    "node scripts/quality-milestone-guidance.cjs",
    "The ordinary quality command must fail fast with milestone guidance.",
  );
  assert.equal(
    rootPackage.scripts["quality:milestone"],
    ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-broad-workspace-lock.sh pnpm run quality:body",
    "The milestone quality command must own the broad workspace lock.",
  );
  const qualityWorkflow = readFileSync(
    join(ROOT, ".github/workflows/quality.yml"),
    "utf8",
  );
  assert.equal(
    (qualityWorkflow.match(/^\s*run: pnpm quality:milestone\s*$/gm) ?? [])
      .length,
    1,
    "The quality workflow must run the milestone quality command exactly once.",
  );
  assert.doesNotMatch(
    qualityWorkflow,
    /run: pnpm quality\s*(?:#.*)?$/m,
    "The quality workflow must not use the guarded development command.",
  );
  const qualityGuidance = run(
    process.execPath,
    [join(ROOT, "scripts/quality-milestone-guidance.cjs")],
    { capture: true },
  );
  assert.equal(
    qualityGuidance.status,
    64,
    "The guarded quality command must fail before starting verification.",
  );
  assert.match(qualityGuidance.stderr, /pnpm quality:milestone/);
  assert.match(qualityGuidance.stderr, /Raw Swarm deterministic verification/);
  assert.match(
    rootPackage.scripts["quality:body"],
    /(?:^|&&\s*)pnpm run coverage:body(?:\s*&&|$)/,
    "The public quality gate must run the workspace coverage thresholds.",
  );
  const configured = Object.keys(PACKAGE_POLICIES);
  assert.deepEqual(inventoryIssues(configured, configured), {
    missing: [],
    stale: [],
  });
  const fixtureRoot = mkdtempSync(join(ROOT, ".quality-self-test-"));
  try {
    const packageRoot = join(fixtureRoot, "packages");
    const unlistedPackage = join(packageRoot, "unlisted-package");
    mkdirSync(unlistedPackage, { recursive: true });
    writeFileSync(
      join(unlistedPackage, "package.json"),
      JSON.stringify({ name: "unlisted-package", private: false }),
    );
    const unclassified = discoveredPackages(packageRoot);
    assert.deepEqual(packageKindIssues(unclassified), ["unlisted-package"]);
    writeFileSync(
      join(unlistedPackage, "package.json"),
      JSON.stringify({
        name: "unlisted-package",
        private: false,
        dndWorkspacePackageKind: "production",
      }),
    );
    const classified = discoveredPackages(packageRoot);
    assert.deepEqual(packageKindIssues(classified), []);
    assert.deepEqual(
      inventoryIssues(productionPackageNames(classified), configured),
      { missing: ["unlisted-package"], stale: configured },
    );

    const absentDuplicationReport = join(
      fixtureRoot,
      "absent-jscpd-report.json",
    );
    assert.equal(duplicationPercentage(absentDuplicationReport), 0);
    const duplicationReport = join(fixtureRoot, "jscpd-report.json");
    writeFileSync(
      duplicationReport,
      JSON.stringify({ statistics: { total: { percentage: 1.25 } } }),
    );
    assert.equal(duplicationPercentage(duplicationReport), 1.25);

    const coverageFixture = join(fixtureRoot, "coverage-fixture");
    const coverageSource = join(coverageFixture, "src");
    const coverageReports = join(coverageFixture, "coverage");
    mkdirSync(coverageSource, { recursive: true });
    writeFileSync(
      join(coverageSource, "passing.test.ts"),
      'test("runs", () => expect(1).toBe(1));\n',
    );
    writeFileSync(
      join(coverageSource, "unimported.ts"),
      "export const unimportedProductionValue = 1;\n",
    );
    const coverageResult = run(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--root",
        coverageFixture,
        "--globals",
        "--coverage",
        "--coverage.provider=v8",
        "--coverage.reporter=json-summary",
        `--coverage.reportsDirectory=${coverageReports}`,
        `--coverage.include=${PRODUCTION_TYPESCRIPT_INCLUDE}`,
        "--coverage.exclude=src/**/*.test.ts",
        "--maxWorkers=1",
      ],
      { capture: true },
    );
    if (coverageResult.status !== 0) {
      process.stderr.write(coverageResult.stderr);
      throw new Error("Unimported-production coverage self-test failed.");
    }
    const summary = JSON.parse(
      readFileSync(join(coverageReports, "coverage-summary.json"), "utf8"),
    );
    const unimportedEntry = Object.entries(summary).find(([file]) =>
      file.endsWith("/src/unimported.ts"),
    );
    assert.notEqual(unimportedEntry, undefined);
    assert.equal(unimportedEntry[1].lines.covered, 0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
  for (const policy of Object.values(PACKAGE_POLICIES)) {
    if (policy.coverage !== "packageConfig") {
      const args = coverageArguments(policy.coverage);
      assert(
        args.includes(`--coverage.include=${PRODUCTION_TYPESCRIPT_INCLUDE}`),
      );
      assert(
        args.includes(`--testTimeout=${SHARED_HOST_TEST_TIMEOUT_MILLISECONDS}`),
      );
      assert(
        !COMMON_COVERAGE_EXCLUDES.some(
          (excluded) => excluded === "src/**/*.ts" || excluded === "src/**",
        ),
      );
    }
  }
  process.stdout.write(
    "Workspace quality inventory and unimported-production coverage policy self-test passed.\n",
  );
}

const command = process.argv[2];
if (command === "--self-test") selfTest();
else if (command === "inventory") checkInventory();
else if (command === "circular") checkCircularDependencies();
else if (command === "complexity") await checkCyclomaticComplexity(false);
else if (command === "complexity:prune") await checkCyclomaticComplexity(true);
else if (command === "duplication") checkDuplication();
else if (command === "coverage") checkCoverage();
else {
  throw new Error(
    "Usage: workspace-quality-harness.mjs --self-test|inventory|circular|complexity|complexity:prune|duplication|coverage",
  );
}
