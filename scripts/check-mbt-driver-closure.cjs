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
// files, while line-count churns on every comment edit to a shared module).
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

const AGGREGATION_BARRELS = {
  "packages/battle-runtime/battle-runtime-model.qnt": "battle-runtime type-model barrel",
};

const BATTLE_RUNTIME_LEAF_MODULES = new Set([
  "battle-runtime-mirror-image-constants.qnt",
  "battle-runtime-reaction-kinds.qnt",
  "battle-runtime-see-invisibility-constants.qnt",
  "battle-runtime-sorcerous-burst-damage-choice.qnt",
]);

// Grandfathered heavy drivers (basename -> reason). These import a behavioural
// module / the type model and pay its whole closure per trace. Do not add to this
// list. Two kinds remain, by design:
//   - "computed oracle": the projection is computed from MUTABLE driver state via
//     the rule reducer, so the reducer (the SRD formalization) is the oracle.
//     Converting to literals would duplicate that rule logic into the witness and
//     weaken the parity check -- keep these as-is.
//   - "convertible": a deterministic fixed-outcome scenario that can become a
//     self-contained literal witness (capture the reducer values via the Quint
//     REPL, then assert them). adrenaline-rush / death-saving-throw / sleep-repeat-save
//     / bardic-inspiration / monk-martial-arts were migrated this way; do the rest.
const ALLOWLIST = {
  "battle-runtime-direct-condition-lifecycle.mbt.qnt": "computed oracle: condition source, duration, slot, and concentration projections depend on mutable lifecycle state",
  "battle-runtime-flaming-sphere-hazard-ram.mbt.qnt": "computed oracle: active sphere, bonus action, slot, ram movement, saving throw, and target vitals all mutate through the reducer",
  "battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt": "computed oracle: attack-roll mode depends on mutable bypass/advantage state",
  "battle-runtime-mirror-image-hit-interception.mbt.qnt": "computed oracle: duplicate interception depends on mutable remaining-duplicate count and attack context",
  "battle-runtime-moonbeam-movable-zone.mbt.qnt": "computed oracle: zone lifecycle, saved-this-turn, reposition, vitals, and shapeshift projection depend on mutable reducer state",
  "battle-runtime-warding-bond-damage-sharing.mbt.qnt": "computed oracle: shared damage and cleanup outcomes depend on mutable source/ward hit points and bond presence",
  "creature-attack.mbt.qnt": "computed oracle: attacker choice and hit result mutate the two-creature hit point state",
  "rule-core-stat-block-controls.mbt.qnt": "computed oracle: dispatch resolution depends on mutable remaining-dispatch counts",
  "battle-runtime-starry-wisp-object.mbt.qnt": "convertible but projects complex ObjectDamageOutcome/LightEmitter records",
  "rule-core-spells.mbt.qnt": "convertible: ~33-action fixed-outcome rule-core spell tracer",
  "rule-core-features.mbt.qnt": "convertible: ~32-action rule-core feature tracer (partly state-dependent)",
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

function forbiddenReason(root, file) {
  const rel = toRepoPath(root, file);
  if (rel in AGGREGATION_BARRELS) return AGGREGATION_BARRELS[rel];
  if (!rel.startsWith("packages/battle-runtime/")) return undefined;
  if (!rel.endsWith(".qnt") || rel.endsWith(".mbt.qnt")) return undefined;
  const base = path.basename(file);
  if (BATTLE_RUNTIME_LEAF_MODULES.has(base)) return undefined;
  return "battle-runtime behavioral rule module";
}

// number of OTHER .qnt files transitively imported (excludes the driver itself)
function importedFileCount(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !fs.existsSync(f)) continue;
    seen.add(f);
    stack.push(...depsOf(f));
  }
  seen.delete(start);
  return seen.size;
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
  const failures = [];
  const graduated = [];
  const seenAllowed = new Set();
  for (const driver of listDrivers(pkgs)) {
    const base = path.basename(driver);
    const count = importedFileCount(driver);
    const forbiddenPaths = findForbiddenImportPaths(root, driver);
    if (base in ALLOWLIST) {
      seenAllowed.add(base);
      if (count <= BUDGET_FILES && forbiddenPaths.length === 0) {
        graduated.push(`${base}: now imports ${count} files (<= ${BUDGET_FILES}) and has no forbidden imports. Remove it from ALLOWLIST to lock the win.`);
      }
    } else {
      if (count > BUDGET_FILES) {
        failures.push(`${base}: imports ${count} files (budget ${BUDGET_FILES}). Compose over leaf modules, not barrels/behaviour. If unavoidable, add to ALLOWLIST with a reason.`);
      }
      for (const { chain, reason } of forbiddenPaths) {
        failures.push(`${base}: forbidden ${reason} import path: ${formatImportPath(root, chain)}. Compose over leaf modules, not barrels/behaviour. If unavoidable, add to ALLOWLIST with a reason.`);
      }
    }
  }
  for (const base of Object.keys(ALLOWLIST)) {
    if (!seenAllowed.has(base)) graduated.push(`${base}: no longer present. Remove its stale ALLOWLIST entry.`);
  }
  return { failures, graduated };
}

function withFixtureRoot(fn) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mbt-driver-closure-"));
  try {
    fs.mkdirSync(path.join(fixtureRoot, "packages/battle-runtime"), { recursive: true });
    fn(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function runSelfTest() {
  withFixtureRoot((fixtureRoot) => {
    const runtimeDir = path.join(fixtureRoot, "packages/battle-runtime");
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
      throw new Error(`Self-test failed: expected semantic forbidden import failure, got ${JSON.stringify(failures)}`);
    }
    if (failures.some((failure) => failure.includes("imports 1 files (budget"))) {
      throw new Error(`Self-test failed: forbidden import fixture failed only by closure count, got ${JSON.stringify(failures)}`);
    }
  });
  console.log("MBT driver closure self-test OK.");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const { failures, graduated } = checkMbtDriverClosure(ROOT);
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
  console.log(`MBT driver closure gate passed (budget ${BUDGET_FILES} files; ${Object.keys(ALLOWLIST).length} grandfathered drivers tracked for migration).`);
}
