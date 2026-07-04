#!/usr/bin/env node
// Quint MBT driver closure gate.
//
// WHY THIS EXISTS
// A simulated `*.mbt.qnt` driver is random-walked by quint-connect. The Quint
// evaluator instantiates the driver's ENTIRE transitive import closure on every
// generated trace, so per-trace cost grows with the size of that closure -- not
// with the driver's own state. Importing an aggregation/barrel or a behavioural
// rule module drags its whole closure into every step and makes the driver
// tens-to-hundreds of times slower (measured: ~0.8s/50 traces for a leaf driver
// vs ~85s/50 traces for one importing the full battle-runtime closure; an UNUSED
// barrel import alone took a 0.6s spec to 85s).
//
// THE RULE
// Simulated drivers must compose over small leaf modules (types + pure facts),
// never over barrels or behavioural machines. We bound each driver's transitive
// import file-count (a stable proxy: a stray barrel/behaviour import pulls in many
// files, while line-count churns on every comment edit to a shared module). Pure
// vocabulary leaves are counted separately: they are tiny shared domain type/fact
// modules, and the checker validates that they have no imports, vars, actions, or
// run blocks before discounting them from the behavioural closure budget.
//   - A NEW driver must keep its closure <= BUDGET_FILES.
//   - The heavy drivers that predate this gate are listed in ALLOWLIST as the
//     migration backlog. Convert each to a leaf-based projection witness, then
//     delete its entry. When an allowlisted driver drops to <= BUDGET_FILES the
//     gate tells you to remove it, locking in the win.
//
// Run: node scripts/check-mbt-driver-closure.cjs

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BUDGET_FILES = 8;

const PURE_VOCABULARY_LEAF_MODULES = new Map([
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

const forbiddenName = (...parts) => parts.join("");
const forbiddenProtocolResultName = forbiddenName("q", "Last", "Result");
const forbiddenProtocolInvalidReasonName = forbiddenName(
  "q",
  "Last",
  "Invalid",
  "Reason",
);
const forbiddenProtocolHolesName = forbiddenName("q", "Holes");
const forbiddenProtocolPreviousHolesName = forbiddenName("q", "Last", "Holes");
const forbiddenScenarioResultName = forbiddenName("q", "Scenario", "Result");
const forbiddenScenarioInvalidReasonName = forbiddenName(
  "q",
  "Scenario",
  "Invalid",
  "Reason",
);
const forbiddenScenarioResultFieldName = forbiddenName("scenario", "Result");
const forbiddenScenarioInvalidReasonFieldName = forbiddenName(
  "scenario",
  "Invalid",
  "Reason",
);

function forbiddenVarPattern(name, typePattern) {
  return new RegExp(
    `^\\s*var\\s+${escapeRegExp(name)}\\s*:\\s*${typePattern}`,
    "m",
  );
}

function escapeRegExp(raw) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Witness replay protocol state must use WitnessProtocol.
const FORBIDDEN_WITNESS_PROTOCOL_STORAGE = [
  {
    label: "string result var",
    pattern: forbiddenVarPattern(forbiddenProtocolResultName, "str\\b"),
  },
  {
    label: "string reason var",
    pattern: forbiddenVarPattern(forbiddenProtocolInvalidReasonName, "str\\b"),
  },
  {
    label: "parallel holes var",
    pattern: forbiddenVarPattern(forbiddenProtocolHolesName, "Set\\["),
  },
  {
    label: "previous-holes var",
    pattern: forbiddenVarPattern(forbiddenProtocolPreviousHolesName, "Set\\["),
  },
];

// Scenario outcome projection labels must be closed local variants, not open
// string fields.
const FORBIDDEN_SCENARIO_OUTCOME_STORAGE = [
  {
    label: "q-prefixed scenario outcome storage",
    pattern: new RegExp(`\\b${escapeRegExp(forbiddenScenarioResultName)}\\b`),
  },
  {
    label: "q-prefixed scenario reason storage",
    pattern: new RegExp(
      `\\b${escapeRegExp(forbiddenScenarioInvalidReasonName)}\\b`,
    ),
  },
  {
    label: "string scenario outcome field",
    pattern: new RegExp(
      `^\\s*${escapeRegExp(forbiddenScenarioResultFieldName)}\\s*:\\s*str\\b`,
      "m",
    ),
  },
  {
    label: "string scenario reason field",
    pattern: new RegExp(
      `^\\s*_?${escapeRegExp(forbiddenScenarioInvalidReasonFieldName)}\\s*:\\s*str\\b`,
      "m",
    ),
  },
  {
    label: "string scenario outcome state read",
    pattern: new RegExp(
      `\\bqState\\.${escapeRegExp(forbiddenScenarioResultFieldName)}\\b`,
    ),
  },
];

const AGGREGATION_BARRELS = {
  "packages/battle-runtime/battle-runtime-model.qnt":
    "battle-runtime type-model barrel",
};

const BATTLE_RUNTIME_LEAF_MODULES = new Set([
  "battle-runtime-fill-kinds.qnt",
  "battle-runtime-hole-kinds.qnt",
  "battle-runtime-acid-arrow.qnt",
  "battle-runtime-command-ordering.qnt",
  "battle-runtime-hit-point-restoration-ordering.qnt",
  "battle-runtime-magic-missile-facts.qnt",
  "battle-runtime-mirror-image-constants.qnt",
  "battle-runtime-condition-rider-route-facts.qnt",
  "battle-runtime-marked-damage-immunity-route-facts.qnt",
  "battle-runtime-mixed-target-outcome-route-facts.qnt",
  "battle-runtime-movement-presentation-route-facts.qnt",
  "battle-runtime-next-attack-roll-mode-route-facts.qnt",
  "battle-runtime-object-light-rider-route-facts.qnt",
  "battle-runtime-opportunity-attack-denial-route-facts.qnt",
  "battle-runtime-reaction-kinds.qnt",
  "battle-runtime-reducer-route.qnt",
  "battle-runtime-replay-equivalence.qnt",
  "battle-runtime-route-choice-payloads.qnt",
  "battle-runtime-save-gated-spell-ordering.qnt",
  "battle-runtime-see-invisibility-constants.qnt",
  "battle-runtime-spatial-effect-route-facts.qnt",
  "battle-runtime-spatial-effect-route-surfaces.qnt",
  "battle-runtime-spell-attack-ordering.qnt",
  "battle-runtime-stat-block-action-ordering.qnt",
  "battle-runtime-subject-kinds.qnt",
  "battle-runtime-sorcerous-burst-damage-choice.qnt",
  "battle-runtime-witness-protocol.qnt",
  "battle-runtime-weapon-attack-ordering.qnt",
  "battle-runtime-weapon-hosted-capability-facts.qnt",
  "creature-attack.qnt",
  "rule-core-component-route.qnt",
]);

// Grandfathered heavy drivers. These import a behavioural module / the type
// model and pay its whole closure per trace. Do not add to this list. Two kinds
// remain, by design:
//   - "computed oracle": the projection is computed from MUTABLE driver state via
//     the rule reducer, so the reducer (the SRD formalization) is the oracle.
//     Converting to literals would duplicate that rule logic into the witness and
//     weaken the parity check -- keep these as-is.
//   - "convertible": a deterministic fixed-outcome scenario that can become a
//     self-contained literal witness (capture the reducer values via the Quint
//     REPL, then assert them). adrenaline-rush / death-saving-throw / sleep-repeat-save
//     / bardic-inspiration / monk-martial-arts were migrated this way; do the rest.
const ALLOWLIST_CLASSIFICATIONS = new Set(["computed oracle", "convertible"]);

const ALLOWLIST = {
  "battle-runtime-direct-condition-lifecycle.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "condition source, duration, slot, and concentration projections depend on mutable lifecycle state",
  },
  "battle-runtime-flaming-sphere-hazard-ram.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "active sphere, bonus action, slot, ram movement, saving throw, and target vitals all mutate through the reducer",
  },
  "battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "attack-roll mode depends on mutable bypass/advantage state",
  },
  "battle-runtime-mirror-image-hit-interception.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "duplicate interception depends on mutable remaining-duplicate count and attack context",
  },
  "battle-runtime-moonbeam-movable-zone.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "zone lifecycle, saved-this-turn, reposition, vitals, and shapeshift projection depend on mutable reducer state",
  },
  "battle-runtime-warding-bond-damage-sharing.mbt.qnt": {
    classification: "computed oracle",
    rationale:
      "shared damage and cleanup outcomes depend on mutable source/ward hit points and bond presence",
  },
  "rule-core-stat-block-controls.mbt.qnt": {
    classification: "computed oracle",
    rationale: "dispatch resolution depends on mutable remaining-dispatch counts",
  },
  "rule-core-spells.mbt.qnt": {
    classification: "convertible",
    rationale: "~33-action fixed-outcome rule-core spell tracer",
  },
  "rule-core-features.mbt.qnt": {
    classification: "convertible",
    rationale: "~32-action rule-core feature tracer (partly state-dependent)",
  },
};

const IMPORT_RE = /from "((?:\.\/|\.\.\/)[A-Za-z0-9/\-]+)"/g;

function toRepoPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function listDrivers(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".worktrees") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listDrivers(full));
    else if (entry.name.endsWith(".mbt.qnt")) out.push(full);
  }
  return out;
}

function depsOf(file) {
  if (!fs.existsSync(file)) return [];
  const deps = [];
  let m;
  const re = new RegExp(IMPORT_RE.source, "g");
  while ((m = re.exec(fs.readFileSync(file, "utf8"))) !== null) {
    deps.push(path.resolve(path.dirname(file), m[1]) + ".qnt");
  }
  return deps;
}

function repoPathToFile(root, rel) {
  return path.join(root, ...rel.split("/"));
}

function validateNoRuntimeDeclarations(rel, text, label) {
  const issues = [];
  for (const [declaration, pattern] of [
    ["var", /^\s*var\b/m],
    ["action", /^\s*action\b/m],
    ["run", /^\s*run\b/m],
  ]) {
    if (pattern.test(text)) {
      issues.push(`${rel}: ${label} must not contain ${declaration} declarations.`);
    }
  }
  return issues;
}

function validatePureImportClosure(root, file, label, visited = new Set()) {
  const rel = toRepoPath(root, file);
  if (visited.has(file)) return [];
  visited.add(file);
  if (!fs.existsSync(file)) {
    return [`${rel}: ${label} dependency does not exist.`];
  }
  const text = fs.readFileSync(file, "utf8");
  const issues = validateNoRuntimeDeclarations(rel, text, label);
  const barrelReason = AGGREGATION_BARRELS[rel];
  if (barrelReason) {
    issues.push(`${rel}: ${label} must not import ${barrelReason}.`);
  }
  if (rel.endsWith(".mbt.qnt")) {
    issues.push(`${rel}: ${label} must not import MBT drivers.`);
  }
  if (rel.startsWith("packages/battle-runtime/")) {
    const base = path.basename(file);
    if (!BATTLE_RUNTIME_LEAF_MODULES.has(base)) {
      issues.push(
        `${rel}: ${label} imports a battle-runtime module that is not in BATTLE_RUNTIME_LEAF_MODULES.`,
      );
    }
  }
  for (const dep of depsOf(file)) {
    issues.push(...validatePureImportClosure(root, dep, label, visited));
  }
  return issues;
}

function validateConfiguredBattleRuntimeLeaves(root) {
  const failures = [];
  for (const base of BATTLE_RUNTIME_LEAF_MODULES) {
    const rel = `packages/battle-runtime/${base}`;
    const file = repoPathToFile(root, rel);
    if (!fs.existsSync(file)) {
      failures.push(`${rel}: configured battle-runtime leaf module does not exist.`);
      continue;
    }
    failures.push(
      ...validatePureImportClosure(root, file, "battle-runtime leaf module"),
    );
  }
  return failures;
}

function validateAllowlistEntries() {
  const failures = [];
  for (const [base, entry] of Object.entries(ALLOWLIST)) {
    if (!ALLOWLIST_CLASSIFICATIONS.has(entry.classification)) {
      failures.push(
        `${base}: ALLOWLIST entry must use one of ${Array.from(
          ALLOWLIST_CLASSIFICATIONS,
        ).join(", ")} classifications.`,
      );
    }
    if (!entry.rationale || entry.rationale.trim().length === 0) {
      failures.push(`${base}: ALLOWLIST entry must include a rationale.`);
    }
  }
  return failures;
}

function forbiddenReason(root, file) {
  const rel = toRepoPath(root, file);
  if (rel in AGGREGATION_BARRELS) return AGGREGATION_BARRELS[rel];
  if (!rel.startsWith("packages/battle-runtime/")) return undefined;
  if (!rel.endsWith(".qnt") || rel.endsWith(".mbt.qnt")) return undefined;
  const base = path.basename(file);
  if (BATTLE_RUNTIME_LEAF_MODULES.has(base)) return undefined;
  return "battle-runtime behavioral rule module";
}

function validatePureVocabularyLeaf(root, rel, rationale) {
  const file = repoPathToFile(root, rel);
  const issues = [];
  if (!rationale || rationale.trim().length === 0) {
    issues.push(`${rel}: pure vocabulary leaf entry must include a rationale.`);
  }
  if (!fs.existsSync(file)) {
    return [...issues, `${rel}: configured pure vocabulary leaf does not exist.`];
  }
  const text = fs.readFileSync(file, "utf8");
  if (depsOf(file).length > 0) {
    issues.push(`${rel}: pure vocabulary leaf must not import other modules.`);
  }
  for (const [label, pattern] of [
    ["var", /^\s*var\b/m],
    ["action", /^\s*action\b/m],
    ["run", /^\s*run\b/m],
  ]) {
    if (pattern.test(text)) {
      issues.push(
        `${rel}: pure vocabulary leaf must not contain ${label} declarations.`,
      );
    }
  }
  return issues;
}

function validPureVocabularyLeaves(root) {
  const valid = new Set();
  const failures = [];
  for (const [rel, rationale] of PURE_VOCABULARY_LEAF_MODULES) {
    const issues = validatePureVocabularyLeaf(root, rel, rationale);
    if (issues.length > 0) {
      failures.push(...issues);
    } else {
      valid.add(repoPathToFile(root, rel));
    }
  }
  return { valid, failures };
}

// OTHER .qnt files transitively imported (excludes the driver itself)
function importedFiles(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !fs.existsSync(f)) continue;
    seen.add(f);
    stack.push(...depsOf(f));
  }
  seen.delete(start);
  return seen;
}

function importedFileStats(start, pureVocabularyLeaves) {
  const files = importedFiles(start);
  let pureVocabularyLeafCount = 0;
  for (const file of files) {
    if (pureVocabularyLeaves.has(file)) pureVocabularyLeafCount += 1;
  }
  return {
    counted: files.size - pureVocabularyLeafCount,
    pureVocabularyLeafCount,
    total: files.size,
  };
}

function formatImportStats(stats) {
  if (stats.pureVocabularyLeafCount === 0) return `${stats.counted} files`;
  return `${stats.counted} counted files plus ${stats.pureVocabularyLeafCount} pure vocabulary leaves (${stats.total} total)`;
}

function findForbiddenImportPaths(root, start) {
  const found = [];
  const stack = [{ file: start, chain: [start] }];
  const visited = new Set();
  while (stack.length) {
    const { file, chain } = stack.pop();
    if (visited.has(file) || !fs.existsSync(file)) continue;
    visited.add(file);
    for (const dep of depsOf(file)) {
      const depChain = [...chain, dep];
      const reason = forbiddenReason(root, dep);
      if (reason) {
        found.push({ chain: depChain, reason });
        continue;
      }
      stack.push({ file: dep, chain: depChain });
    }
  }
  return found;
}

function formatImportPath(root, chain) {
  return chain.map((file) => toRepoPath(root, file)).join(" -> ");
}

function checkMbtDriverClosure(root) {
  const pkgs = path.join(root, "packages");
  const { valid: pureVocabularyLeaves, failures: pureVocabularyFailures } =
    validPureVocabularyLeaves(root);
  const failures = [
    ...validateAllowlistEntries(),
    ...pureVocabularyFailures,
    ...validateConfiguredBattleRuntimeLeaves(root),
  ];
  const graduated = [];
  const seenAllowed = new Set();
  for (const driver of listDrivers(pkgs)) {
    const base = path.basename(driver);
    const stats = importedFileStats(driver, pureVocabularyLeaves);
    const forbiddenPaths = findForbiddenImportPaths(root, driver);
    if (base in ALLOWLIST) {
      seenAllowed.add(base);
      if (stats.counted <= BUDGET_FILES && forbiddenPaths.length === 0) {
        graduated.push(
          `${base}: now imports ${formatImportStats(stats)} (counted budget ${BUDGET_FILES}) and has no forbidden imports. Remove it from ALLOWLIST to lock the win.`,
        );
      }
    } else {
      if (stats.counted > BUDGET_FILES) {
        failures.push(
          `${base}: imports ${formatImportStats(stats)} (counted budget ${BUDGET_FILES}). Compose over leaf modules, not barrels/behaviour. If unavoidable, add to ALLOWLIST with a classification and rationale.`,
        );
      }
      for (const { chain, reason } of forbiddenPaths) {
        failures.push(
          `${base}: forbidden ${reason} import path: ${formatImportPath(root, chain)}. Compose over leaf modules, not barrels/behaviour. If unavoidable, add to ALLOWLIST with a classification and rationale.`,
        );
      }
    }
  }
  for (const base of Object.keys(ALLOWLIST)) {
    if (!seenAllowed.has(base))
      graduated.push(
        `${base}: no longer present. Remove its stale ALLOWLIST entry.`,
      );
  }
  return { failures, graduated };
}

function checkForbiddenWitnessProtocolStorage(root) {
  const runtimeDir = path.join(root, "packages/battle-runtime");
  const failures = [];
  for (const witness of listDrivers(runtimeDir)) {
    const text = fs.readFileSync(witness, "utf8");
    for (const { label, pattern } of FORBIDDEN_WITNESS_PROTOCOL_STORAGE) {
      const match = pattern.exec(text);
      if (match) {
        const line = text.slice(0, match.index).split("\n").length;
        failures.push(
          `${toRepoPath(root, witness)}:${line}: forbidden witness protocol ${label}. Use battle-runtime-witness-protocol.qnt's WitnessProtocol record and helper constructors.`,
        );
      }
    }
  }
  return failures;
}

function checkForbiddenScenarioOutcomeStorage(root) {
  const runtimeDir = path.join(root, "packages/battle-runtime");
  const failures = [];
  for (const witness of listDrivers(runtimeDir)) {
    const text = fs.readFileSync(witness, "utf8");
    for (const { label, pattern } of FORBIDDEN_SCENARIO_OUTCOME_STORAGE) {
      const match = pattern.exec(text);
      if (match) {
        const line = text.slice(0, match.index).split("\n").length;
        failures.push(
          `${toRepoPath(root, witness)}:${line}: forbidden ${label}. Use a file-local scenario outcome variant field instead of open string projection labels.`,
        );
      }
    }
  }
  return failures;
}

function withFixtureRoot(fn) {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "mbt-driver-closure-"),
  );
  try {
    fs.mkdirSync(path.join(fixtureRoot, "packages/battle-runtime"), {
      recursive: true,
    });
    fn(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function fixtureModuleName(rel) {
  return path
    .basename(rel, ".qnt")
    .replace(/[^A-Za-z0-9]/g, "_");
}

function writeConfiguredLeafFixtures(root) {
  const configuredLeaves = [
    ...Array.from(PURE_VOCABULARY_LEAF_MODULES.keys()),
    ...Array.from(
      BATTLE_RUNTIME_LEAF_MODULES,
      (base) => `packages/battle-runtime/${base}`,
    ),
  ];
  for (const rel of configuredLeaves) {
    const file = repoPathToFile(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(
      file,
      `module ${fixtureModuleName(rel)} { type FixtureLeaf = FixtureLeaf }\n`,
    );
  }
}

function runSelfTest() {
  withFixtureRoot((fixtureRoot) => {
    writeConfiguredLeafFixtures(fixtureRoot);
    const runtimeDir = path.join(fixtureRoot, "packages/battle-runtime");
    const ruleCoreDir = path.join(
      fixtureRoot,
      "packages/shared-algebras/proofs/rule-core",
    );
    fs.mkdirSync(ruleCoreDir, { recursive: true });
    fs.writeFileSync(
      path.join(runtimeDir, "battle-runtime-model.qnt"),
      "module battleRuntimeModel { type Fixture = Fixture }\n",
    );
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-forbidden-model.mbt.qnt"),
      [
        "module fixtureForbiddenModelMbt {",
        '  import battleRuntimeModel.* from "./battle-runtime-model"',
        "}",
        "",
      ].join("\n"),
    );
    const { failures } = checkMbtDriverClosure(fixtureRoot);
    const expectedPath =
      "fixture-forbidden-model.mbt.qnt: forbidden battle-runtime type-model barrel import path: packages/battle-runtime/fixture-forbidden-model.mbt.qnt -> packages/battle-runtime/battle-runtime-model.qnt.";
    if (!failures.some((failure) => failure.startsWith(expectedPath))) {
      throw new Error(
        `Self-test failed: expected semantic forbidden import failure, got ${JSON.stringify(failures)}`,
      );
    }
    if (
      failures.some((failure) => failure.includes("imports 1 files (budget"))
    ) {
      throw new Error(
        `Self-test failed: forbidden import fixture failed only by closure count, got ${JSON.stringify(failures)}`,
      );
    }
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-forbidden-protocol-storage.mbt.qnt"),
      [
        "module fixtureForbiddenProtocolStorageMbt {",
        `  var ${forbiddenProtocolResultName}: str`,
        "}",
        "",
      ].join("\n"),
    );
    const protocolFailures = checkForbiddenWitnessProtocolStorage(fixtureRoot);
    const expectedProtocolFailure =
      "packages/battle-runtime/fixture-forbidden-protocol-storage.mbt.qnt:2: forbidden witness protocol string result var.";
    if (
      !protocolFailures.some((failure) =>
        failure.startsWith(expectedProtocolFailure),
      )
    ) {
      throw new Error(
        `Self-test failed: expected forbidden protocol storage failure, got ${JSON.stringify(protocolFailures)}`,
      );
    }
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-forbidden-scenario-storage.mbt.qnt"),
      [
        "module fixtureForbiddenScenarioStorageMbt {",
        "  type FixtureScenarioState = {",
        `    ${forbiddenScenarioResultFieldName}: str,`,
        "  }",
        `  var ${forbiddenScenarioResultName}: str`,
        "}",
        "",
      ].join("\n"),
    );
    const scenarioOutcomeFailures =
      checkForbiddenScenarioOutcomeStorage(fixtureRoot);
    const expectedScenarioOutcomeFailure =
      "packages/battle-runtime/fixture-forbidden-scenario-storage.mbt.qnt:5: forbidden q-prefixed scenario outcome storage.";
    if (
      !scenarioOutcomeFailures.some((failure) =>
        failure.startsWith(expectedScenarioOutcomeFailure),
      )
    ) {
      throw new Error(
        `Self-test failed: expected forbidden scenario outcome storage failure, got ${JSON.stringify(scenarioOutcomeFailures)}`,
      );
    }
    const expectedLowercaseScenarioOutcomeFailure =
      "packages/battle-runtime/fixture-forbidden-scenario-storage.mbt.qnt:3: forbidden string scenario outcome field.";
    if (
      !scenarioOutcomeFailures.some((failure) =>
        failure.startsWith(expectedLowercaseScenarioOutcomeFailure),
      )
    ) {
      throw new Error(
        `Self-test failed: expected string scenario outcome field failure, got ${JSON.stringify(scenarioOutcomeFailures)}`,
      );
    }
  });
  withFixtureRoot((fixtureRoot) => {
    writeConfiguredLeafFixtures(fixtureRoot);
    const runtimeDir = path.join(fixtureRoot, "packages/battle-runtime");
    const ruleCoreDir = path.join(
      fixtureRoot,
      "packages/shared-algebras/proofs/rule-core",
    );
    fs.mkdirSync(ruleCoreDir, { recursive: true });
    fs.writeFileSync(
      path.join(ruleCoreDir, "creature-size-order.qnt"),
      [
        "module creatureSizeOrder {",
        "  type RuleSize = SmallSize | MediumSize",
        "  pure def sizeRank(creatureSize: RuleSize): int = if (creatureSize == SmallSize) 1 else 2",
        "}",
        "",
      ].join("\n"),
    );
    for (let index = 0; index < 9; index += 1) {
      fs.writeFileSync(
        path.join(ruleCoreDir, `counted-${index}.qnt`),
        `module counted${index} { type Counted${index} = Counted${index} }\n`,
      );
    }
    const imports = (countedCount) => [
      ...Array.from(
        { length: countedCount },
        (_, index) =>
          `  import counted${index}.* from "../shared-algebras/proofs/rule-core/counted-${index}"`,
      ),
      '  import creatureSizeOrder.* from "../shared-algebras/proofs/rule-core/creature-size-order"',
    ];
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-pure-vocabulary-budget.mbt.qnt"),
      ["module fixturePureVocabularyBudgetMbt {", ...imports(8), "}", ""].join(
        "\n",
      ),
    );
    const passingResult = checkMbtDriverClosure(fixtureRoot);
    if (passingResult.failures.length > 0) {
      throw new Error(
        `Self-test failed: expected pure vocabulary leaf not to consume the counted budget, got ${JSON.stringify(passingResult.failures)}`,
      );
    }
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-pure-vocabulary-budget.mbt.qnt"),
      ["module fixturePureVocabularyBudgetMbt {", ...imports(9), "}", ""].join(
        "\n",
      ),
    );
    const countedFailure = checkMbtDriverClosure(fixtureRoot);
    if (
      !countedFailure.failures.some((failure) =>
        failure.includes(
          "imports 9 counted files plus 1 pure vocabulary leaves (10 total)",
        ),
      )
    ) {
      throw new Error(
        `Self-test failed: expected only counted files to consume the budget, got ${JSON.stringify(countedFailure.failures)}`,
      );
    }
    fs.writeFileSync(
      path.join(ruleCoreDir, "creature-size-order.qnt"),
      [
        "module creatureSizeOrder {",
        "  action notVocabulary = true",
        "}",
        "",
      ].join("\n"),
    );
    const badVocabularyResult = checkMbtDriverClosure(fixtureRoot);
    if (
      !badVocabularyResult.failures.some((failure) =>
        failure.includes(
          "pure vocabulary leaf must not contain action declarations",
        ),
      )
    ) {
      throw new Error(
        `Self-test failed: expected invalid pure vocabulary leaf to fail, got ${JSON.stringify(badVocabularyResult.failures)}`,
      );
    }
  });
  withFixtureRoot((fixtureRoot) => {
    writeConfiguredLeafFixtures(fixtureRoot);
    const runtimeDir = path.join(fixtureRoot, "packages/battle-runtime");
    fs.writeFileSync(
      path.join(runtimeDir, "battle-runtime-fill-kinds.qnt"),
      ["module battleRuntimeFillKinds {", "  action notLeaf = true", "}", ""].join(
        "\n",
      ),
    );
    fs.writeFileSync(
      path.join(runtimeDir, "fixture-impure-battle-leaf.mbt.qnt"),
      [
        "module fixtureImpureBattleLeafMbt {",
        '  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"',
        "}",
        "",
      ].join("\n"),
    );
    const impureBattleLeafResult = checkMbtDriverClosure(fixtureRoot);
    if (
      !impureBattleLeafResult.failures.some((failure) =>
        failure.includes(
          "packages/battle-runtime/battle-runtime-fill-kinds.qnt: battle-runtime leaf module must not contain action declarations",
        ),
      )
    ) {
      throw new Error(
        `Self-test failed: expected invalid battle-runtime leaf to fail, got ${JSON.stringify(impureBattleLeafResult.failures)}`,
      );
    }
  });
  console.log(
    "MBT driver closure, leaf whitelist purity, and forbidden witness storage self-test OK.",
  );
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const { failures, graduated } = checkMbtDriverClosure(ROOT);
  const protocolFailures = checkForbiddenWitnessProtocolStorage(ROOT);
  const scenarioOutcomeFailures = checkForbiddenScenarioOutcomeStorage(ROOT);
  if (graduated.length) {
    console.log("MBT driver closure gate -- tighten the allowlist:");
    for (const g of graduated) console.log("  - " + g);
    console.log("");
  }
  if (failures.length) {
    console.error("MBT driver closure gate FAILED:");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  if (protocolFailures.length) {
    console.error("MBT witness protocol storage gate FAILED:");
    for (const f of protocolFailures) console.error("  - " + f);
    process.exit(1);
  }
  if (scenarioOutcomeFailures.length) {
    console.error("MBT scenario outcome storage gate FAILED:");
    for (const f of scenarioOutcomeFailures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `MBT driver closure gate passed (counted budget ${BUDGET_FILES} files; pure vocabulary leaves are validated and counted separately; ${Object.keys(ALLOWLIST).length} grandfathered drivers tracked for migration).`,
  );
  console.log("MBT witness protocol storage gate passed.");
  console.log("MBT scenario outcome storage gate passed.");
}
