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
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGE_ROOT = join(ROOT, "packages");
const PRODUCTION_INCLUDE = "src/**/*.{ts,tsx}";
const COMMON_COVERAGE_EXCLUDES = [
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "src/**/*.mbt.test.ts",
  "src/**/*.test-support.ts",
  "src/**/*.qnt-replay.test-support.ts",
  "src/**/*.replay-data.test-support.ts",
  "src/**/*.gen.*",
];
const COMMON_DUPLICATION_EXCLUDES = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.mbt.test.ts",
  "**/*.test-support.ts",
  "**/*.qnt-replay.test-support.ts",
  "**/*.replay-data.test-support.ts",
  "**/*.gen.*",
];

// Every production package must appear here. Coverage floors are temporary
// non-regression ratchets, initially measured on 2026-07-26, incrementally
// remeasured as coverage lands, and rounded down to whole percentages; issue
// #227's real target remains 99% for every metric in every package.
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
    coverage: { lines: 85, statements: 85, functions: 90, branches: 84 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-battle-runtime": {
    coverage: { lines: 99, statements: 99, functions: 100, branches: 99 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-creation-runtime": {
    coverage: { lines: 94, statements: 94, functions: 99, branches: 90 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "character-sheet-runtime": {
    coverage: { lines: 85, statements: 85, functions: 96, branches: 75 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  mcp: {
    coverage: { lines: 99, statements: 99, functions: 100, branches: 99 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  shared: {
    coverage: { lines: 99, statements: 99, functions: 100, branches: 99 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  "shared-algebras": {
    coverage: { lines: 99, statements: 99, functions: 100, branches: 99 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
  surface: {
    coverage: { lines: 86, statements: 86, functions: 83, branches: 84 },
    circularBaseline: 0,
    duplicationCeiling: 2,
  },
};

function discoveredProductionPackages(packageRoot = PACKAGE_ROOT) {
  return readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const packageJsonPath = join(packageRoot, entry.name, "package.json");
      if (!existsSync(packageJsonPath)) return false;
      JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return true;
    })
    .map((entry) => entry.name)
    .sort();
}

function inventoryIssues(discovered, configured) {
  const missing = discovered.filter((name) => !configured.includes(name));
  const stale = configured.filter((name) => !discovered.includes(name));
  return { missing, stale };
}

function checkInventory() {
  const discovered = discoveredProductionPackages();
  const configured = Object.keys(PACKAGE_POLICIES).sort();
  const issues = inventoryIssues(discovered, configured);
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
          COMMON_DUPLICATION_EXCLUDES.join(","),
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
      const report = JSON.parse(
        readFileSync(join(reportDirectory, "jscpd-report.json"), "utf8"),
      );
      const percentage = report.statistics.total.percentage;
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

function coverageArguments(coverage) {
  return [
    "exec",
    "vitest",
    "run",
    "--exclude",
    "**/*.mbt.test.ts",
    "--coverage",
    "--coverage.reporter=text-summary",
    `--coverage.include=${PRODUCTION_INCLUDE}`,
    ...COMMON_COVERAGE_EXCLUDES.map(
      (excluded) => `--coverage.exclude=${excluded}`,
    ),
    `--coverage.thresholds.lines=${coverage.lines}`,
    `--coverage.thresholds.statements=${coverage.statements}`,
    `--coverage.thresholds.functions=${coverage.functions}`,
    `--coverage.thresholds.branches=${coverage.branches}`,
    "--maxWorkers=1",
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
    assert.deepEqual(
      inventoryIssues(discoveredProductionPackages(packageRoot), configured),
      { missing: ["unlisted-package"], stale: configured },
    );

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
        `--coverage.include=${PRODUCTION_INCLUDE}`,
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
      assert(args.includes(`--coverage.include=${PRODUCTION_INCLUDE}`));
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
else if (command === "duplication") checkDuplication();
else if (command === "coverage") checkCoverage();
else {
  throw new Error(
    "Usage: workspace-quality-harness.mjs --self-test|inventory|circular|duplication|coverage",
  );
}
