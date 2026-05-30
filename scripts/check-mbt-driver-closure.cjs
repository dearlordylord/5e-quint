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
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PKGS = path.join(ROOT, "packages");
const BUDGET_FILES = 8;

// Grandfathered heavy drivers (basename -> reason). Migration backlog: each
// imports a behavioural module / the type model for a few symbols and pays that
// module's whole closure per trace. Shrink this list; do not add to it.
const ALLOWLIST = {
  "battle-runtime-sleep-repeat-save.mbt.qnt": "imports concentration + sleep-hideous-laughter + turn-advancement behaviour",
  "battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt": "imports blur attack-roll-defense behaviour",
  "battle-runtime-starry-wisp-object.mbt.qnt": "imports object/light-emitter behaviour",
  "bardic-inspiration-selected-identity.mbt.qnt": "calls bardic-inspiration impl fn via feature-bridge",
  "rule-core-spells.mbt.qnt": "rule-core inductive spell driver",
  "monk-martial-arts-selected-identity.mbt.qnt": "imports monk-focus/martial-arts behaviour",
  "rule-core-features.mbt.qnt": "rule-core inductive feature driver",
  "rule-core-stat-block-controls.mbt.qnt": "rule-core inductive stat-block driver",
};

const IMPORT_RE = /from "((?:\.\/|\.\.\/)[A-Za-z0-9/\-]+)"/g;

function listDrivers(dir) {
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

const failures = [];
const graduated = [];
const seenAllowed = new Set();
for (const driver of listDrivers(PKGS)) {
  const base = path.basename(driver);
  const count = importedFileCount(driver);
  if (base in ALLOWLIST) {
    seenAllowed.add(base);
    if (count <= BUDGET_FILES) {
      graduated.push(`${base}: now imports ${count} files (<= ${BUDGET_FILES}). Remove it from ALLOWLIST to lock the win.`);
    }
  } else if (count > BUDGET_FILES) {
    failures.push(`${base}: imports ${count} files (budget ${BUDGET_FILES}). Compose over leaf modules, not barrels/behaviour. If unavoidable, add to ALLOWLIST with a reason.`);
  }
}
for (const base of Object.keys(ALLOWLIST)) {
  if (!seenAllowed.has(base)) graduated.push(`${base}: no longer present. Remove its stale ALLOWLIST entry.`);
}

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
