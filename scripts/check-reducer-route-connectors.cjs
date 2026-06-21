#!/usr/bin/env node
"use strict";

// Reducer-route connector gate.
//
// A reducer-routed cleanroom assignment must have an executable QNT connector,
// not only prose guidance or a curated inventory row. This checker validates
// that the currently queued route batch is represented by `.route.mbt.qnt`
// drivers that import the reducer-route vocabulary and expose `qRoute`.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const EXPECTED_ROUTE_CONNECTORS = [
  "battle-runtime-magic-missile.route.mbt.qnt",
  "battle-runtime-save-gated-spell-ordering.route.mbt.qnt",
  "battle-runtime-hit-point-restoration-ordering.route.mbt.qnt",
];

function listRouteConnectors(root) {
  const dir = path.join(root, "packages/battle-runtime");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".route.mbt.qnt"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function toRepoPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function checkReducerRouteConnectors(root) {
  const failures = [];
  const connectors = listRouteConnectors(root);
  const basenames = new Set(connectors.map((file) => path.basename(file)));

  for (const expected of EXPECTED_ROUTE_CONNECTORS) {
    if (!basenames.has(expected)) {
      failures.push(`${expected}: missing reducer-route connector driver.`);
    }
  }

  for (const file of connectors) {
    const rel = toRepoPath(root, file);
    const text = fs.readFileSync(file, "utf8");
    if (!/\bimport\s+battleRuntimeReducerRoute\.\*\s+from\s+"\.\/battle-runtime-reducer-route"/.test(text)) {
      failures.push(`${rel}: must import battle-runtime-reducer-route.`);
    }
    if (!/\bqRoute\b/.test(text)) {
      failures.push(`${rel}: must expose qRoute route projection.`);
    }
    if (!/\brouteStartBattle\s*\(/.test(text)) {
      failures.push(`${rel}: must record start_battle route evidence.`);
    }
    if (!/\brouteDiscoverBattleActs\s*\(/.test(text)) {
      failures.push(`${rel}: must record discover_battle_acts route evidence.`);
    }
    if (!/\brouteResolveBattleSubject\s*\(/.test(text)) {
      failures.push(`${rel}: must record resolve_battle_subject route evidence.`);
    }
    if (/\bGoblin\b|\bgoblin\b/.test(text)) {
      failures.push(`${rel}: route connectors must not model by fixture identity.`);
    }
  }

  return failures;
}

function withFixtureRoot(fn) {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "reducer-route-connectors-"),
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

function writeConnector(root, basename, body = "") {
  fs.writeFileSync(
    path.join(root, "packages/battle-runtime", basename),
    [
      "module fixtureRouteMbt {",
      '  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"',
      "  var qRoute: List[ReducerRouteEvent]",
      "  action init = all {",
      "    qRoute' = List(routeStartBattle(BattleActionEconomyOwner))",
      "  }",
      "  action step = all {",
      "    qRoute' = qRoute",
      "    routeDiscoverBattleActs(SlotSpellRouteSubject, Set(TargetChoiceHoleKind), BattleActionEconomyOwner) == routeDiscoverBattleActs(SlotSpellRouteSubject, Set(TargetChoiceHoleKind), BattleActionEconomyOwner)",
      "    routeResolveBattleSubject(SlotSpellRouteSubject, TargetChoiceFillKind, Set(), BattleHoleFrontierOwner) == routeResolveBattleSubject(SlotSpellRouteSubject, TargetChoiceFillKind, Set(), BattleHoleFrontierOwner)",
      "  }",
      body,
      "}",
      "",
    ].join("\n"),
  );
}

function runSelfTest() {
  withFixtureRoot((fixtureRoot) => {
    for (const basename of EXPECTED_ROUTE_CONNECTORS) {
      writeConnector(fixtureRoot, basename);
    }
    const failures = checkReducerRouteConnectors(fixtureRoot);
    if (failures.length > 0) {
      throw new Error(
        `Self-test expected valid fixture route connectors, got ${JSON.stringify(failures)}`,
      );
    }
  });

  withFixtureRoot((fixtureRoot) => {
    writeConnector(fixtureRoot, EXPECTED_ROUTE_CONNECTORS[0]);
    const failures = checkReducerRouteConnectors(fixtureRoot);
    if (
      !failures.some((failure) =>
        failure.includes(`${EXPECTED_ROUTE_CONNECTORS[1]}: missing`),
      )
    ) {
      throw new Error(
        `Self-test expected missing connector failure, got ${JSON.stringify(failures)}`,
      );
    }
  });

  console.log("Reducer-route connector self-test OK.");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const failures = checkReducerRouteConnectors(ROOT);
  if (failures.length > 0) {
    console.error("Reducer-route connector gate FAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(
    `Reducer-route connector gate passed (${EXPECTED_ROUTE_CONNECTORS.length} queued connectors discovered).`,
  );
}
