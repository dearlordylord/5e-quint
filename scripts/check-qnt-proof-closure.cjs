#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  closureLineCount,
  discoverRunBlockRoots,
  importClosure,
  pureVocabularyLeafIssues,
  repoPathToFile,
  toRepoPath,
} = require("./qnt-import-closure.cjs");

const ROOT = path.resolve(__dirname, "..");
const PROOF_ROOT = "packages/battle-runtime";
const DEFAULT_MAX_FILES = 60;
const DEFAULT_MAX_LINES = 12_500;

const PURE_VOCABULARY_LEAVES = new Map([
  [
    "packages/battle-runtime/battle-runtime-saving-throw-roll-mode.qnt",
    "saving-throw roll-mode vocabulary and cancellation",
  ],
  [
    "packages/shared-algebras/proofs/rule-core/attack-roll-damage-dice-core.qnt",
    "shared attack-damage dice vocabulary",
  ],
  [
    "packages/shared-algebras/proofs/rule-core/creature-size-order.qnt",
    "shared creature-size ordering vocabulary",
  ],
  [
    "packages/battle-runtime/rule-core-component-route.qnt",
    "rule-core component route vocabulary",
  ],
]);

// Existing integration proofs may only retain their current closure size. A
// root that reaches the defaults must graduate by deleting its entry.
const EXCEPTIONS = {
  "packages/battle-runtime/battle-runtime-core-combat-tests.qnt": {
    maxFiles: 108,
    maxLines: 20_500,
  },
  "packages/battle-runtime/battle-runtime-light-concentration-movement-reaction-tests.qnt":
    { maxFiles: 106, maxLines: 21_000 },
  "packages/battle-runtime/battle-runtime-save-spell-tests.qnt": {
    maxFiles: 110,
    maxLines: 21_000,
  },
};

function roundedLineCeiling(lines) {
  return Math.ceil(lines / 500) * 500;
}

function validPureLeaves(root) {
  const valid = new Set();
  const failures = [];
  for (const [relativePath, rationale] of PURE_VOCABULARY_LEAVES) {
    const issues = pureVocabularyLeafIssues(root, relativePath, rationale);
    if (issues.length > 0) failures.push(...issues);
    else valid.add(repoPathToFile(root, relativePath));
  }
  return { failures, valid };
}

function proofClosureStats(rootFile, pureLeaves) {
  const files = importClosure(rootFile);
  let excludedLeaves = 0;
  for (const file of files) if (pureLeaves.has(file)) excludedLeaves += 1;
  return {
    countedFiles: files.size - excludedLeaves,
    excludedLeaves,
    lines: closureLineCount(files),
    totalFiles: files.size,
  };
}

function checkProofClosures(root, exceptions = EXCEPTIONS) {
  const { failures, valid } = validPureLeaves(root);
  const proofDirectory = repoPathToFile(root, PROOF_ROOT);
  const roots = discoverRunBlockRoots(proofDirectory, {
    prefix: "test_",
    recursive: false,
  });
  const seenExceptions = new Set();
  const reports = [];
  for (const proofRoot of roots) {
    const relativePath = toRepoPath(root, proofRoot);
    const stats = proofClosureStats(proofRoot, valid);
    reports.push({ relativePath, ...stats });
    const exception = exceptions[relativePath];
    if (exception !== undefined) {
      seenExceptions.add(relativePath);
      if (
        stats.countedFiles <= DEFAULT_MAX_FILES &&
        stats.lines <= DEFAULT_MAX_LINES
      ) {
        failures.push(
          `${relativePath}: closure is within defaults; remove its stale exception.`,
        );
        continue;
      }
      if (
        stats.countedFiles > exception.maxFiles ||
        stats.lines > exception.maxLines
      ) {
        failures.push(
          `${relativePath}: closure ${stats.countedFiles} files/${stats.lines} lines exceeds exception ${exception.maxFiles} files/${exception.maxLines} lines.`,
        );
        continue;
      }
      const expectedMaxLines = roundedLineCeiling(stats.lines);
      if (
        exception.maxFiles !== stats.countedFiles ||
        exception.maxLines !== expectedMaxLines
      ) {
        failures.push(
          `${relativePath}: exception ${exception.maxFiles} files/${exception.maxLines} lines does not match current baseline ${stats.countedFiles} files/${expectedMaxLines} lines.`,
        );
      }
    } else if (
      stats.countedFiles > DEFAULT_MAX_FILES ||
      stats.lines > DEFAULT_MAX_LINES
    ) {
      failures.push(
        `${relativePath}: closure ${stats.countedFiles} counted files/${stats.lines} lines exceeds defaults ${DEFAULT_MAX_FILES} files/${DEFAULT_MAX_LINES} lines.`,
      );
    }
  }
  for (const relativePath of Object.keys(exceptions)) {
    if (!seenExceptions.has(relativePath))
      failures.push(
        `${relativePath}: stale proof-closure exception; root is absent.`,
      );
  }
  return { failures, reports };
}

function withFixture(run) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "qnt-proof-closure-"));
  try {
    fs.mkdirSync(path.join(fixture, PROOF_ROOT), { recursive: true });
    for (const [relativePath] of PURE_VOCABULARY_LEAVES) {
      const file = repoPathToFile(fixture, relativePath);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        `module ${path.basename(file, ".qnt").replace(/-/g, "_")} { type Leaf = Leaf }\n`,
      );
    }
    run(fixture);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

function runSelfTest() {
  withFixture((root) => {
    const directory = repoPathToFile(root, PROOF_ROOT);
    for (let index = 0; index < DEFAULT_MAX_FILES; index += 1) {
      fs.writeFileSync(
        path.join(directory, `dep-${index}.qnt`),
        `module dep_${index} { type D${index} = D${index} }\n`,
      );
    }
    const imports = Array.from(
      { length: DEFAULT_MAX_FILES },
      (_, index) => `  import dep_${index}.* from "./dep-${index}"`,
    );
    fs.writeFileSync(
      path.join(directory, "growth-tests.qnt"),
      [
        "module growthTests {",
        ...imports,
        "  run test_growth = true",
        "}",
        "",
      ].join("\n"),
    );
    const growth = checkProofClosures(root, {});
    if (
      !growth.failures.some((failure) => failure.includes("exceeds defaults"))
    )
      throw new Error(
        `transitive growth self-test failed: ${JSON.stringify(growth)}`,
      );
  });
  withFixture((root) => {
    const leaf = repoPathToFile(
      root,
      "packages/battle-runtime/battle-runtime-saving-throw-roll-mode.qnt",
    );
    fs.writeFileSync(leaf, "module impureLeaf {\n  action notPure = true\n}\n");
    const result = checkProofClosures(root, {});
    if (
      !result.failures.some((failure) =>
        failure.includes("must not contain action"),
      )
    )
      throw new Error(
        `impure leaf self-test failed: ${JSON.stringify(result)}`,
      );
  });
  withFixture((root) => {
    const directory = repoPathToFile(root, PROOF_ROOT);
    for (let index = 0; index < DEFAULT_MAX_FILES; index += 1) {
      fs.writeFileSync(
        path.join(directory, `exception-dep-${index}.qnt`),
        `module exception_dep_${index} { type D${index} = D${index} }\n`,
      );
    }
    const imports = Array.from(
      { length: DEFAULT_MAX_FILES },
      (_, index) =>
        `  import exception_dep_${index}.* from "./exception-dep-${index}"`,
    );
    const proof = path.join(directory, "exception-tests.qnt");
    fs.writeFileSync(
      proof,
      [
        "module exceptionTests {",
        ...imports,
        "  run test_exception = true",
        "}",
        "",
      ].join("\n"),
    );
    const ceiling = checkProofClosures(root, {
      [`${PROOF_ROOT}/exception-tests.qnt`]: {
        maxFiles: DEFAULT_MAX_FILES,
        maxLines: 100_000,
      },
    });
    if (
      !ceiling.failures.some((failure) => failure.includes("exceeds exception"))
    )
      throw new Error(
        `exception ceiling self-test failed: ${JSON.stringify(ceiling)}`,
      );
  });
  withFixture((root) => {
    const directory = repoPathToFile(root, PROOF_ROOT);
    for (let index = 0; index < DEFAULT_MAX_FILES; index += 1) {
      fs.writeFileSync(
        path.join(directory, `baseline-dep-${index}.qnt`),
        `module baseline_dep_${index} { type D${index} = D${index} }\n`,
      );
    }
    const imports = Array.from(
      { length: DEFAULT_MAX_FILES },
      (_, index) =>
        `  import baseline_dep_${index}.* from "./baseline-dep-${index}"`,
    );
    const proof = path.join(directory, "baseline-tests.qnt");
    fs.writeFileSync(
      proof,
      [
        "module baselineTests {",
        ...imports,
        "  run test_baseline = true",
        "}",
        "",
      ].join("\n"),
    );
    const stale = checkProofClosures(root, {
      [`${PROOF_ROOT}/baseline-tests.qnt`]: {
        maxFiles: DEFAULT_MAX_FILES + 2,
        maxLines: 100_000,
      },
    });
    if (
      !stale.failures.some((failure) =>
        failure.includes("does not match current baseline"),
      )
    )
      throw new Error(
        `stale exception baseline self-test failed: ${JSON.stringify(stale)}`,
      );
  });
  withFixture((root) => {
    const proof = repoPathToFile(root, `${PROOF_ROOT}/exception-tests.qnt`);
    fs.writeFileSync(
      proof,
      "module exceptionTests {\n  run test_exception = true\n}\n",
    );
    const graduation = checkProofClosures(root, {
      [`${PROOF_ROOT}/exception-tests.qnt`]: {
        maxFiles: 10,
        maxLines: roundedLineCeiling(1),
      },
    });
    if (
      !graduation.failures.some((failure) =>
        failure.includes("remove its stale exception"),
      )
    )
      throw new Error(
        `exception graduation self-test failed: ${JSON.stringify(graduation)}`,
      );
  });
  console.log("QNT proof closure self-test OK.");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const result = checkProofClosures(ROOT);
  for (const report of result.reports) {
    console.log(
      `${report.relativePath}: ${report.countedFiles} counted files + ${report.excludedLeaves} vocabulary leaves, ${report.lines} lines`,
    );
  }
  if (result.failures.length > 0) {
    console.error("QNT proof closure gate FAILED:");
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(
    `QNT proof closure gate passed (${DEFAULT_MAX_FILES} files/${DEFAULT_MAX_LINES} lines).`,
  );
}
