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
import qualityMilestonePlan from "./quality-milestone-plan.cjs";

const { QUALITY_MILESTONE_PLAN } = qualityMilestonePlan;

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
    // Recertified on 2026-09-02 after the accepted Effect 4 source
    // reconstruction made the 2026-08-22 floor stale on master. The candidate
    // preserves master's absolute uncovered statement/function/line counts
    // and covers at least one additional branch. Issue #227's 99% target remains.
    coverage: {
      lines: 96.16,
      statements: 95.41,
      functions: 97.06,
      branches: 92.29,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-battle-runtime": {
    // Recertified on 2026-09-02 against the accepted Effect 4 master baseline;
    // the candidate adds two covered statements/functions/lines without
    // increasing any absolute uncovered count. Issue #227's 99% target remains.
    coverage: {
      lines: 99.08,
      statements: 99.05,
      functions: 98.48,
      branches: 97.89,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-creation-runtime": {
    // Recertified on 2026-09-02 against the accepted Effect 4 master tree.
    // Issue #227's 99% target remains the destination for this ratchet.
    coverage: {
      lines: 98.38,
      statements: 98.02,
      functions: 99.06,
      branches: 96.07,
    },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-sheet-runtime": {
    // Recertified on 2026-09-02 against the accepted Effect 4 master tree.
    // Issue #227's 99% target remains the destination for this ratchet.
    coverage: {
      lines: 97.77,
      statements: 97.18,
      functions: 97.89,
      branches: 94.81,
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
    // Terminal collector run on 2026-09-02 measured 55 uncovered functions
    // (1,721/1,776 covered; 96.90%). This temporary floor matches that
    // measured baseline. Issue #227's 99% target remains.
    coverage: {
      lines: 96.95,
      statements: 96.75,
      functions: 96.9,
      branches: 94.9,
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

function validateQualityMilestonePlan(plan) {
  assert(Array.isArray(plan), "The quality milestone plan must be an array.");
  assert(plan.length > 0, "The quality milestone plan must not be empty.");
  const priorIds = new Set();
  for (const check of plan) {
    assert.equal(
      typeof check.id,
      "string",
      "Every quality milestone check must have a string id.",
    );
    assert.notEqual(check.id, "", "Quality milestone ids must not be empty.");
    assert.equal(
      priorIds.has(check.id),
      false,
      `Duplicate quality milestone id: ${check.id}.`,
    );
    assert.equal(
      typeof check.command,
      "string",
      `Quality milestone check ${check.id} must have a string command.`,
    );
    assert.notEqual(
      check.command,
      "",
      `Quality milestone check ${check.id} must have a command.`,
    );
    assert(
      Array.isArray(check.args) &&
        check.args.every((argument) => typeof argument === "string"),
      `Quality milestone check ${check.id} must have string arguments.`,
    );
    assert(
      Array.isArray(check.prerequisites) &&
        check.prerequisites.every(
          (prerequisite) => typeof prerequisite === "string",
        ),
      `Quality milestone check ${check.id} must have string prerequisites.`,
    );
    assert.equal(
      new Set(check.prerequisites).size,
      check.prerequisites.length,
      `Quality milestone check ${check.id} has duplicate prerequisites.`,
    );
    for (const prerequisite of check.prerequisites) {
      assert(
        priorIds.has(prerequisite),
        `Quality milestone prerequisite ${prerequisite} for ${check.id} must name an earlier check.`,
      );
    }
    priorIds.add(check.id);
  }
}

function elapsedMilliseconds(startedAt, finishedAt) {
  return Number(finishedAt - startedAt) / 1_000_000;
}

function failureDescription(result) {
  if (result.error !== undefined) {
    return `spawn error: ${result.error instanceof Error ? result.error.message : String(result.error)}`;
  }
  if (result.signal !== null && result.signal !== undefined) {
    return `signal ${result.signal}`;
  }
  return `exit ${result.status ?? "unknown"}`;
}

function outcomeLine(outcome) {
  const duration = `${(outcome.durationMilliseconds / 1_000).toFixed(3)}s`;
  if (outcome.status === "PASS") {
    return `PASS ${duration} ${outcome.id}`;
  }
  if (outcome.status === "FAIL") {
    return `FAIL ${duration} ${outcome.id} (${outcome.failure})`;
  }
  return `BLOCKED ${duration} ${outcome.id} (blocked by ${outcome.blockedBy.join(", ")})`;
}

function executeQualityMilestoneCheck(check, execute) {
  try {
    return execute(check);
  } catch (error) {
    return { status: null, signal: null, error };
  }
}

function executeQualityMilestone(
  plan,
  {
    execute = (check) =>
      spawnSync(check.command, check.args, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "inherit",
      }),
    now = () => process.hrtime.bigint(),
    write = (message) => process.stdout.write(message),
  } = {},
) {
  validateQualityMilestonePlan(plan);
  const outcomes = [];
  const outcomesById = new Map();
  let emergencyCheckId;
  const recordOutcome = (outcome) => {
    outcomes.push(outcome);
    outcomesById.set(outcome.id, outcome);
    write(`${outcomeLine(outcome)}\n`);
  };

  for (const check of plan) {
    const blockedBy =
      emergencyCheckId === undefined
        ? check.prerequisites.filter(
            (prerequisite) => outcomesById.get(prerequisite)?.status !== "PASS",
          )
        : [emergencyCheckId];
    if (blockedBy.length > 0) {
      const outcome = {
        status: "BLOCKED",
        id: check.id,
        durationMilliseconds: 0,
        blockedBy,
      };
      recordOutcome(outcome);
      continue;
    }

    write(`RUN ${check.id}: ${check.command} ${check.args.join(" ")}\n`);
    const startedAt = now();
    const result = executeQualityMilestoneCheck(check, execute);
    const durationMilliseconds = elapsedMilliseconds(startedAt, now());
    const outcome =
      result.error === undefined && result.status === 0
        ? { status: "PASS", id: check.id, durationMilliseconds }
        : {
            status: "FAIL",
            id: check.id,
            durationMilliseconds,
            failure: failureDescription(result),
          };
    recordOutcome(outcome);
    if (result.status === 137 || result.signal === "SIGKILL") {
      emergencyCheckId = check.id;
    }
  }

  write("\nQUALITY MILESTONE SUMMARY\n");
  for (const outcome of outcomes) write(`${outcomeLine(outcome)}\n`);
  const exitCode =
    emergencyCheckId !== undefined
      ? 137
      : outcomes.some((outcome) => outcome.status === "FAIL")
        ? 1
        : 0;
  return { outcomes, exitCode };
}

function runQualityMilestone() {
  const result = executeQualityMilestone(QUALITY_MILESTONE_PLAN);
  process.exitCode = result.exitCode;
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
  assert.equal(
    rootPackage.scripts["quality:body"],
    "scripts/assert-resource-lock.sh broad && node scripts/workspace-quality-harness.mjs milestone",
    "The quality body must assert the inherited broad lock and invoke the collector.",
  );
  assert.equal(
    rootPackage.scripts["check:srd-stat-block-catalog"],
    "pnpm exec tsx scripts/check-srd-stat-block-catalog.ts",
    "The public SRD Stat Block catalog diagnostic must retain its exact alias.",
  );
  validateQualityMilestonePlan(QUALITY_MILESTONE_PLAN);
  assert.equal(
    QUALITY_MILESTONE_PLAN.length,
    49,
    "The quality milestone plan must retain every existing check.",
  );
  assert.deepEqual(
    QUALITY_MILESTONE_PLAN.map(({ command, args }) =>
      [command, ...args].join(" "),
    ),
    [
      "pnpm check:effect4-cohort:self-test",
      "pnpm check:effect4-cohort",
      "pnpm check:effect4-certification-typecheck",
      "pnpm check:effect4-oracle-delta:self-test",
      "pnpm check:effect4-oracle-delta",
      "pnpm smoke:effect4-clean-consumer",
      "pnpm run build:turbo",
      "pnpm check:workspace-quality-inventory",
      "pnpm check:authored-id-dispatch",
      "pnpm check:battle-runtime-import-ownership",
      "pnpm check:battle-runtime-test-support-boundary",
      "pnpm check:character-sheet-runtime-split",
      "pnpm check:surface-publication-typecheck",
      "pnpm run check:surface-publication-self-test:body",
      "pnpm check:surface-content-publication",
      "pnpm check:srd-stat-block-catalog",
      "pnpm check:stat-block-procedure-pressure:self-test",
      "pnpm check:stat-block-procedure-pressure",
      "pnpm check:stat-block-restricted-invocation-deltas:self-test",
      "pnpm check:stat-block-restricted-invocation-deltas",
      "pnpm check:stat-block-execution-reconciliation:self-test",
      "pnpm check:stat-block-execution-reconciliation",
      "pnpm check:opaque-oracle-schema-sync",
      "pnpm check:opaque-oracle-corpus",
      "pnpm check:opaque-oracle-distribution",
      "pnpm check:cleanroom-provenance",
      "pnpm check:markdown-links",
      "pnpm check:mbt-driver-closure",
      "pnpm check:qnt-proof-closure",
      "pnpm check:qnt-proof-harness",
      "pnpm check:qnt-proof-timing-report",
      "pnpm check:test-lane-hygiene",
      "pnpm check:mbt-script-inventory",
      "pnpm check:qnt-inventory",
      "pnpm check:qnt-run-block-separation",
      "pnpm check:resource-lock",
      "pnpm check:raw-swarm-lane-hygiene",
      "pnpm rules-kernel-coverage:check",
      "pnpm unit-profile-coverage:check",
      "pnpm gh381-registry-path-manifest:check",
      "pnpm sdk-raw-integration-inventory:check",
      "pnpm lint",
      "pnpm check:complexity:self-test",
      "pnpm check:complexity",
      "pnpm duplication",
      "pnpm circular",
      "pnpm run typecheck:turbo",
      "pnpm run test:turbo",
      "pnpm run coverage:body",
    ],
    "The quality milestone collector invocations must retain their certified order.",
  );
  assert(
    QUALITY_MILESTONE_PLAN.every(
      (check) =>
        Object.isFrozen(check) &&
        Object.isFrozen(check.args) &&
        Object.isFrozen(check.prerequisites),
    ),
    "The quality milestone plan and its records must be immutable.",
  );
  assert.equal(Object.isFrozen(QUALITY_MILESTONE_PLAN), true);
  const catalogDiagnosticIndex = QUALITY_MILESTONE_PLAN.findIndex(
    (check) => check.id === "srd-stat-block-catalog",
  );
  assert.equal(
    QUALITY_MILESTONE_PLAN[catalogDiagnosticIndex - 1].id,
    "surface-content-publication",
    "The catalog diagnostic must immediately follow Surface publication checks.",
  );
  assert.equal(
    QUALITY_MILESTONE_PLAN[catalogDiagnosticIndex + 1].id,
    "stat-block-procedure-pressure-self-test",
    "The catalog diagnostic must precede the execution-evidence families.",
  );
  assert.deepEqual(QUALITY_MILESTONE_PLAN[catalogDiagnosticIndex].args, [
    "check:srd-stat-block-catalog",
  ]);
  assert.deepEqual(QUALITY_MILESTONE_PLAN.at(-1).args, [
    "run",
    "coverage:body",
  ]);
  const fixtureCheck = (id, prerequisites = []) => ({
    id,
    command: "fixture",
    args: [id],
    prerequisites,
  });
  const collectingPlan = [
    fixtureCheck("failure"),
    fixtureCheck("dependent", ["failure"]),
    fixtureCheck("independent-pass"),
    fixtureCheck("independent-failure"),
    fixtureCheck("transitive-dependent", ["dependent"]),
  ];
  const collectingCalls = [];
  let collectingOutput = "";
  let collectingClock = 0n;
  const collectingResult = executeQualityMilestone(collectingPlan, {
    execute: (check) => {
      collectingCalls.push(check.id);
      return {
        status:
          check.id === "failure"
            ? 2
            : check.id === "independent-failure"
              ? 3
              : 0,
        signal: null,
      };
    },
    now: () => {
      const current = collectingClock;
      collectingClock += 1_000_000_000n;
      return current;
    },
    write: (message) => {
      collectingOutput += message;
    },
  });
  assert.deepEqual(collectingCalls, [
    "failure",
    "independent-pass",
    "independent-failure",
  ]);
  assert.deepEqual(
    collectingResult.outcomes.map((outcome) => outcome.status),
    ["FAIL", "BLOCKED", "PASS", "FAIL", "BLOCKED"],
  );
  assert.deepEqual(collectingResult.outcomes[1].blockedBy, ["failure"]);
  assert.deepEqual(collectingResult.outcomes[4].blockedBy, ["dependent"]);
  assert.equal(collectingResult.outcomes[0].durationMilliseconds, 1_000);
  assert.equal(collectingResult.outcomes[1].durationMilliseconds, 0);
  assert.equal(collectingResult.exitCode, 1);
  assert.match(collectingOutput, /FAIL 1\.000s failure \(exit 2\)/);
  assert.match(
    collectingOutput,
    /BLOCKED 0\.000s dependent \(blocked by failure\)/,
  );
  assert.match(collectingOutput, /PASS 1\.000s independent-pass/);
  assert.match(collectingOutput, /QUALITY MILESTONE SUMMARY/);

  const allPassResult = executeQualityMilestone(
    [fixtureCheck("first"), fixtureCheck("second")],
    {
      execute: () => ({ status: 0, signal: null }),
      now: () => 0n,
      write: () => {},
    },
  );
  assert.deepEqual(
    allPassResult.outcomes.map((outcome) => outcome.status),
    ["PASS", "PASS"],
  );
  assert.equal(allPassResult.exitCode, 0);

  const spawnFailureResult = executeQualityMilestone(
    [fixtureCheck("spawn-failure"), fixtureCheck("after-spawn-failure")],
    {
      execute: (check) => {
        if (check.id === "spawn-failure") throw new Error("synthetic spawn");
        return { status: 0, signal: null };
      },
      now: () => 0n,
      write: () => {},
    },
  );
  assert.deepEqual(
    spawnFailureResult.outcomes.map((outcome) => outcome.status),
    ["FAIL", "PASS"],
  );
  assert.match(spawnFailureResult.outcomes[0].failure, /synthetic spawn/);

  const signalFailureResult = executeQualityMilestone(
    [fixtureCheck("signal-failure"), fixtureCheck("after-signal-failure")],
    {
      execute: (check) =>
        check.id === "signal-failure"
          ? { status: null, signal: "SIGTERM" }
          : { status: 0, signal: null },
      now: () => 0n,
      write: () => {},
    },
  );
  assert.deepEqual(
    signalFailureResult.outcomes.map((outcome) => outcome.status),
    ["FAIL", "PASS"],
  );
  assert.equal(signalFailureResult.outcomes[0].failure, "signal SIGTERM");
  assert.equal(signalFailureResult.exitCode, 1);

  const emergencyCalls = [];
  const emergencyResult = executeQualityMilestone(
    [
      fixtureCheck("emergency"),
      fixtureCheck("independent-after-emergency"),
      fixtureCheck("another-independent-after-emergency"),
    ],
    {
      execute: (check) => {
        emergencyCalls.push(check.id);
        return { status: 137, signal: null };
      },
      now: () => 0n,
      write: () => {},
    },
  );
  assert.deepEqual(emergencyCalls, ["emergency"]);
  assert.deepEqual(
    emergencyResult.outcomes.map((outcome) => outcome.status),
    ["FAIL", "BLOCKED", "BLOCKED"],
  );
  assert.equal(emergencyResult.exitCode, 137);

  const signalEmergencyCalls = [];
  const signalEmergencyResult = executeQualityMilestone(
    [
      fixtureCheck("signal-emergency"),
      fixtureCheck("independent-after-signal-emergency"),
      fixtureCheck("another-independent-after-signal-emergency"),
    ],
    {
      execute: (check) => {
        signalEmergencyCalls.push(check.id);
        return { status: null, signal: "SIGKILL" };
      },
      now: () => 0n,
      write: () => {},
    },
  );
  assert.deepEqual(signalEmergencyCalls, ["signal-emergency"]);
  assert.deepEqual(
    signalEmergencyResult.outcomes.map((outcome) => outcome.status),
    ["FAIL", "BLOCKED", "BLOCKED"],
  );
  assert.equal(signalEmergencyResult.outcomes[0].failure, "signal SIGKILL");
  assert.equal(signalEmergencyResult.exitCode, 137);
  assert.throws(
    () =>
      validateQualityMilestonePlan([
        fixtureCheck("dependent", ["not-yet-run"]),
        fixtureCheck("not-yet-run"),
      ]),
    /must name an earlier check/,
  );
  assert.throws(
    () =>
      validateQualityMilestonePlan([
        fixtureCheck("duplicate"),
        fixtureCheck("duplicate"),
      ]),
    /Duplicate quality milestone id/,
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
else if (command === "milestone") runQualityMilestone();
else {
  throw new Error(
    "Usage: workspace-quality-harness.mjs --self-test|inventory|circular|complexity|complexity:prune|duplication|coverage|milestone",
  );
}
