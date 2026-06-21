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
const ROUTE_INVENTORY_PATH = "plans/cleanroom-branch-coverage/reducer-route-inventory.json";
const ROUTE_SURFACES = [
  {
    packageDir: "packages/battle-runtime",
    routeVocabularyPath: "packages/battle-runtime/battle-runtime-reducer-route.qnt",
    vocabularyImport: /\bimport\s+battleRuntimeReducerRoute\.\*\s+from\s+"\.\/battle-runtime-reducer-route"/,
    requiredEvidenceCalls: [
      "routeStartBattle",
      "routeDiscoverBattleActs",
      "routeResolveBattleSubject",
    ],
  },
  {
    packageDir: "packages/character-creation-runtime",
    routeVocabularyPath:
      "packages/character-creation-runtime/character-creation-reducer-route.qnt",
    vocabularyImport: /\bimport\s+characterCreationReducerRoute\.\*\s+from\s+"\.\/character-creation-reducer-route"/,
    requiredEvidenceCalls: [],
  },
  {
    packageDir: "packages/character-sheet-runtime",
    routeVocabularyPath:
      "packages/character-sheet-runtime/character-sheet-reducer-route.qnt",
    vocabularyImport: /\bimport\s+characterSheetReducerRoute\.\*\s+from\s+"\.\/character-sheet-reducer-route"/,
    requiredEvidenceCalls: [],
  },
  {
    packageDir: "packages/character-battle-runtime",
    routeVocabularyPath:
      "packages/character-battle-runtime/character-battle-reducer-route.qnt",
    vocabularyImport: /\bimport\s+characterBattleReducerRoute\.\*\s+from\s+"\.\/character-battle-reducer-route"/,
    requiredEvidenceCalls: [],
  },
];

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), "utf8"));
}

function listRouteConnectors(root) {
  return ROUTE_SURFACES.flatMap((surface) => {
    const dir = path.join(root, surface.packageDir);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".route.mbt.qnt"))
      .map((entry) => path.join(dir, entry.name));
  }).sort();
}

function toRepoPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function surfaceForRepoPath(repoPath) {
  return ROUTE_SURFACES.find((surface) =>
    repoPath.startsWith(`${surface.packageDir}/`),
  );
}

function defaultRouteConnectorPath(driverPath) {
  if (typeof driverPath !== "string" || !driverPath.endsWith(".mbt.qnt")) {
    return undefined;
  }
  return driverPath.replace(/\.mbt\.qnt$/, ".route.mbt.qnt");
}

function reducerRoutedRows(inventory) {
  const rows = [];
  for (const [index, prerequisite] of (inventory.prerequisites ?? []).entries()) {
    if (prerequisite.route === "reducer-routed") {
      rows.push({
        source: `prerequisite ${index + 1} ${prerequisite.driverPath}`,
        driverPath: prerequisite.driverPath,
        routeConnectorPath: prerequisite.routeConnectorPath,
      });
    }
  }
  for (const batch of inventory.diagnosticBatches ?? []) {
    for (const entry of batch.entries ?? []) {
      if (entry.route === "reducer-routed") {
        rows.push({
          source: `diagnostic batch ${batch.batchId} entry ${entry.order}`,
          driverPath: entry.driverPath,
          routeConnectorPath: entry.routeConnectorPath,
        });
      }
    }
  }
  for (const denominator of inventory.levelDenominators ?? []) {
    for (const assignment of denominator.driverRouteAssignments ?? []) {
      if (assignment.route === "reducer-routed") {
        rows.push({
          source: `${denominator.denominatorId} assignment ${assignment.driverPath}`,
          driverPath: assignment.driverPath,
          routeConnectorPath: assignment.routeConnectorPath,
        });
      }
    }
  }
  return rows;
}

function expectedRouteConnectors(inventory, failures) {
  const expected = new Map();
  for (const row of reducerRoutedRows(inventory)) {
    const connectorPath =
      typeof row.routeConnectorPath === "string" && row.routeConnectorPath.length > 0
        ? row.routeConnectorPath
        : defaultRouteConnectorPath(row.driverPath);
    if (connectorPath === undefined) {
      failures.push(`${row.source}: reducer-routed row needs a routeConnectorPath.`);
      continue;
    }
    if (!connectorPath.endsWith(".route.mbt.qnt")) {
      failures.push(
        `${row.source}: routeConnectorPath must point at a .route.mbt.qnt driver.`,
      );
      continue;
    }
    if (surfaceForRepoPath(connectorPath) === undefined) {
      failures.push(`${row.source}: ${connectorPath} is outside a route package.`);
      continue;
    }
    const sources = expected.get(connectorPath) ?? [];
    sources.push(row.source);
    expected.set(connectorPath, sources);
  }
  return expected;
}

function hasQRouteProjection(text) {
  return /\bvar\s+qRoute\s*:\s*List\[[^\]]+RouteEvent\]/.test(text)
    || /\bpure\s+def\s+qRoute\s*:\s*List\[[^\]]+RouteEvent\]/.test(text);
}

function validateConnector(root, repoPath, failures) {
  const surface = surfaceForRepoPath(repoPath);
  if (surface === undefined) {
    failures.push(`${repoPath}: route connector is outside a route package.`);
    return;
  }

  const text = fs.readFileSync(path.join(root, repoPath), "utf8");
  if (!surface.vocabularyImport.test(text)) {
    failures.push(`${repoPath}: must import ${surface.routeVocabularyPath}.`);
  }
  if (!hasQRouteProjection(text)) {
    failures.push(`${repoPath}: must expose qRoute route projection.`);
  }
  for (const evidenceCall of surface.requiredEvidenceCalls) {
    if (!new RegExp(`\\b${evidenceCall}\\s*\\(`).test(text)) {
      failures.push(`${repoPath}: must record ${evidenceCall} route evidence.`);
    }
  }
  if (/\bGoblin\b|\bgoblin\b/.test(text)) {
    failures.push(`${repoPath}: route connectors must not model by fixture identity.`);
  }
}

function checkReducerRouteConnectors(root) {
  const failures = [];
  const inventory = readJson(root, ROUTE_INVENTORY_PATH);
  const expected = expectedRouteConnectors(inventory, failures);
  const connectors = listRouteConnectors(root);
  const connectorPaths = new Set(connectors.map((file) => toRepoPath(root, file)));

  for (const surface of ROUTE_SURFACES) {
    if (!fs.existsSync(path.join(root, surface.routeVocabularyPath))) {
      failures.push(`${surface.routeVocabularyPath}: missing route vocabulary.`);
    }
  }

  for (const [repoPath, sources] of expected) {
    if (!connectorPaths.has(repoPath)) {
      failures.push(
        `${repoPath}: missing reducer-route connector driver for ${sources.join(", ")}.`,
      );
    }
  }

  for (const repoPath of connectorPaths) {
    validateConnector(root, repoPath, failures);
  }

  return { failures, expectedConnectorCount: expected.size };
}

function writeRouteVocabularies(root) {
  for (const surface of ROUTE_SURFACES) {
    const file = path.join(root, surface.routeVocabularyPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `module fixtureRouteVocabulary {}\n`);
  }
}

function writeInventory(root, entries, prerequisites = []) {
  fs.mkdirSync(path.join(root, "plans/cleanroom-branch-coverage"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, ROUTE_INVENTORY_PATH),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        activeDiagnosticBatchId: "fixture-route",
        routeTags: ["reducer-routed"],
        prerequisites,
        diagnosticBatches: [
          {
            batchId: "fixture-route",
            assignmentId: "fixture-assignment",
            entries,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function fixtureEntry(input = {}) {
  return {
    order: 1,
    driverPath: "packages/battle-runtime/fixture.mbt.qnt",
    routeConnectorPath: "packages/battle-runtime/fixture.route.mbt.qnt",
    route: "reducer-routed",
    ...input,
  };
}

function expectFailure(failures, fragment, message) {
  if (!failures.some((failure) => failure.includes(fragment))) {
    throw new Error(`${message}, got ${JSON.stringify(failures)}`);
  }
}

function assertNoFailures(result) {
  if (result.failures.length > 0) {
    throw new Error(
      `Self-test expected valid fixture route connectors, got ${JSON.stringify(
        result.failures,
      )}`,
    );
  }
}

function writeConnector(root, repoPath, body = "") {
  const file = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
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

function writeConnectorWithoutQRoute(root, repoPath) {
  const file = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      "module fixtureRouteMbt {",
      '  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"',
      "  action init = true",
      "  action step = true",
      "}",
      "",
    ].join("\n"),
  );
}

function runFixture(fn) {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "reducer-route-connectors-"),
  );
  try {
    writeRouteVocabularies(fixtureRoot);
    fn(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function runSelfTest() {
  runFixture((fixtureRoot) => {
    writeInventory(fixtureRoot, [fixtureEntry()]);
    writeConnector(fixtureRoot, "packages/battle-runtime/fixture.route.mbt.qnt");
    assertNoFailures(checkReducerRouteConnectors(fixtureRoot));
  });

  runFixture((fixtureRoot) => {
    writeInventory(fixtureRoot, [
      fixtureEntry({
        routeConnectorPath: undefined,
      }),
    ]);
    writeConnector(fixtureRoot, "packages/battle-runtime/fixture.route.mbt.qnt");
    assertNoFailures(checkReducerRouteConnectors(fixtureRoot));
  });

  runFixture((fixtureRoot) => {
    writeInventory(fixtureRoot, [fixtureEntry()]);
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "missing reducer-route connector driver",
      "Self-test expected missing connector failure",
    );
  });

  runFixture((fixtureRoot) => {
    writeInventory(fixtureRoot, [], [
      {
        driverPath: "packages/battle-runtime/prerequisite.mbt.qnt",
        route: "reducer-routed",
      },
    ]);
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "prerequisite 1",
      "Self-test expected prerequisite missing connector failure",
    );
  });

  runFixture((fixtureRoot) => {
    writeInventory(fixtureRoot, [fixtureEntry()]);
    writeConnectorWithoutQRoute(
      fixtureRoot,
      "packages/battle-runtime/fixture.route.mbt.qnt",
    );
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "must expose qRoute route projection",
      "Self-test expected missing qRoute failure",
    );
  });

  console.log("Reducer-route connector self-test OK.");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const result = checkReducerRouteConnectors(ROOT);
  if (result.failures.length > 0) {
    console.error("Reducer-route connector gate FAILED:");
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(
    `Reducer-route connector gate passed (${result.expectedConnectorCount} queued connectors discovered).`,
  );
}
