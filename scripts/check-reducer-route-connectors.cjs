#!/usr/bin/env node
"use strict";

// Reducer-route and component connector gate.
//
// A reducer-routed cleanroom assignment must have an executable QNT connector,
// not only prose guidance or a curated inventory row. This checker validates
// that the currently queued route batch is represented by `.route.mbt.qnt`
// drivers that import the reducer-route vocabulary and expose `qRoute`.
//
// A component-first assignment must also point at executable QNT connector
// evidence. Rule-core components expose `qComponentRoute` over a small leaf
// vocabulary instead of routing through BattleState.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ROUTE_INVENTORY_PATH = "plans/cleanroom-branch-coverage/reducer-route-inventory.json";
const COMPONENT_VOCABULARY_PATH =
  "packages/battle-runtime/rule-core-component-route.qnt";
const COMPONENT_VOCABULARY_IMPORT =
  /\bimport\s+ruleCoreComponentRoute\.\*\s+from\s+"\.\/rule-core-component-route"/;
const COMPONENT_EVIDENCE_CALL = "ruleCoreComponentRoute";
const COMPONENT_BRIDGE_IMPORT =
  /\bfrom\s+"\.\/rule-core-component-route\.ts"/;
const COMPONENT_RUNTIME_BRIDGE_CALL = "withRuleCoreComponentRoute";
const COMPONENT_QUINT_BRIDGE_DECODER = "decodeRuleCoreComponentRoute";
const ROUTE_SURFACES = [
  {
    packageDir: "packages/battle-runtime",
    routeVocabularyPath: "packages/battle-runtime/battle-runtime-reducer-route.qnt",
    vocabularyImport: /\bimport\s+battleRuntimeReducerRoute\.\*\s+from\s+"\.\/battle-runtime-reducer-route"/,
    requiredEvidenceCalls: [
      "routeStartBattle",
      "routeDiscoverBattleActs",
      {
        label:
          "routeResolveBattleSubject or routeResolveBattleSubjectWithoutFill",
        calls: [
          "routeResolveBattleSubject",
          "routeResolveBattleSubjectWithoutFill",
        ],
      },
    ],
  },
  {
    packageDir: "packages/character-creation-runtime",
    routeVocabularyPath:
      "packages/character-creation-runtime/character-creation-reducer-route.qnt",
    vocabularyImport: /\bimport\s+characterCreationReducerRoute\.\*\s+from\s+"\.\/character-creation-reducer-route"/,
    requiredEvidenceCalls: [
      {
        label: "routeCreateCharacterDraft or completedFighterCreationRoute",
        calls: ["routeCreateCharacterDraft", "completedFighterCreationRoute"],
      },
      {
        label: "routeDiscoverCreationHoles or completedFighterCreationRoute",
        calls: ["routeDiscoverCreationHoles", "completedFighterCreationRoute"],
      },
      {
        label:
          "routeApplyCreationFillBatch, routeProjectCharacterBuildFacts, or completedFighterCreationRoute",
        calls: [
          "routeApplyCreationFillBatch",
          "routeProjectCharacterBuildFacts",
          "completedFighterCreationRoute",
        ],
      },
      {
        label:
          "routeFinalizeCharacterDraft, routeRetainCreationSelectedReferences, or completedFighterCreationRoute",
        calls: [
          "routeFinalizeCharacterDraft",
          "routeRetainCreationSelectedReferences",
          "completedFighterCreationRoute",
        ],
      },
    ],
  },
  {
    packageDir: "packages/character-sheet-runtime",
    routeVocabularyPath:
      "packages/character-sheet-runtime/character-sheet-reducer-route.qnt",
    vocabularyImport: /\bimport\s+characterSheetReducerRoute\.\*\s+from\s+"\.\/character-sheet-reducer-route"/,
    requiredEvidenceCalls: [
      "routeCreateCharacterSheet",
      {
        label:
          "routeProjectCharacterSheetFacts, routeResolveCharacterSheetSubject, routeCompleteCharacterSheetRest, or routeRetainCharacterSheetSelectedReferences",
        calls: [
          "routeProjectCharacterSheetFacts",
          "routeResolveCharacterSheetSubject",
          "routeCompleteCharacterSheetRest",
          "routeRetainCharacterSheetSelectedReferences",
        ],
      },
    ],
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

function defaultComponentConnectorPath(driverPath) {
  if (typeof driverPath !== "string" || !driverPath.endsWith(".mbt.qnt")) {
    return undefined;
  }
  return driverPath;
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

function componentFirstDriverRows(inventory) {
  const rows = [];
  for (const [index, prerequisite] of (inventory.prerequisites ?? []).entries()) {
    if (prerequisite.route === "component-first") {
      rows.push({
        source: `prerequisite ${index + 1} ${prerequisite.driverPath}`,
        driverPath: prerequisite.driverPath,
        componentConnectorPath: prerequisite.componentConnectorPath,
        componentOwners: prerequisite.componentOwners,
        dependentRouteTaskIds: prerequisite.dependentRouteTaskIds,
      });
    }
  }
  for (const batch of inventory.diagnosticBatches ?? []) {
    for (const entry of batch.entries ?? []) {
      if (entry.route === "component-first") {
        rows.push({
          source: `diagnostic batch ${batch.batchId} entry ${entry.order}`,
          driverPath: entry.driverPath,
          componentConnectorPath: entry.componentConnectorPath,
          componentOwners: entry.componentOwners,
          dependentRouteTaskIds: entry.dependentRouteTaskIds,
        });
      }
    }
  }
  for (const denominator of inventory.levelDenominators ?? []) {
    for (const assignment of denominator.driverRouteAssignments ?? []) {
      if (assignment.route === "component-first") {
        rows.push({
          source: `${denominator.denominatorId} assignment ${assignment.driverPath}`,
          driverPath: assignment.driverPath,
          componentConnectorPath: assignment.componentConnectorPath,
          componentOwners: assignment.componentOwners,
          dependentRouteTaskIds: assignment.dependentRouteTaskIds,
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

function expectedComponentConnectors(inventory, failures) {
  const expected = new Map();
  for (const row of componentFirstDriverRows(inventory)) {
    const connectorPath =
      typeof row.componentConnectorPath === "string" &&
      row.componentConnectorPath.length > 0
        ? row.componentConnectorPath
        : defaultComponentConnectorPath(row.driverPath);
    if (connectorPath === undefined) {
      failures.push(`${row.source}: component-first row needs a componentConnectorPath.`);
      continue;
    }
    if (!connectorPath.endsWith(".mbt.qnt")) {
      failures.push(
        `${row.source}: componentConnectorPath must point at an .mbt.qnt driver.`,
      );
      continue;
    }
    if (!connectorPath.startsWith("packages/battle-runtime/rule-core-")) {
      failures.push(
        `${row.source}: componentConnectorPath must point at a battle rule-core driver.`,
      );
      continue;
    }
    if (!Array.isArray(row.componentOwners) || row.componentOwners.length === 0) {
      failures.push(`${row.source}: component-first row needs componentOwners.`);
      continue;
    }
    if (
      row.componentOwners.some(
        (owner) => typeof owner !== "string" || owner.trim() === "",
      )
    ) {
      failures.push(`${row.source}: componentOwners must be non-empty strings.`);
      continue;
    }
    if (
      !Array.isArray(row.dependentRouteTaskIds) ||
      row.dependentRouteTaskIds.length === 0
    ) {
      failures.push(`${row.source}: component-first row needs dependentRouteTaskIds.`);
      continue;
    }
    if (
      row.dependentRouteTaskIds.some(
        (taskId) => typeof taskId !== "string" || taskId.trim() === "",
      )
    ) {
      failures.push(`${row.source}: dependentRouteTaskIds must be non-empty strings.`);
      continue;
    }
    const sources = expected.get(connectorPath) ?? [];
    sources.push(row);
    expected.set(connectorPath, sources);
  }
  return expected;
}

function hasQRouteProjection(text) {
  return /\bvar\s+qRoute\s*:\s*List\[[^\]]+RouteEvent\]/.test(text)
    || /\bpure\s+def\s+qRoute\s*:\s*List\[[^\]]+RouteEvent\]/.test(text);
}

function hasQComponentRouteProjection(text) {
  return /\bvar\s+qComponentRoute\s*:\s*List\[RuleCoreComponentRouteEvent\]/.test(text);
}

function hasQComponentRouteAssignment(text) {
  return /\bqComponentRoute'\s*=/.test(text);
}

function componentBridgePath(repoPath) {
  const fileName = path.basename(repoPath).replace(/\.qnt$/, ".test.ts");
  return path.join("packages/battle-runtime/src", fileName);
}

function hasRouteEvidence(text, call) {
  if (call === "completedFighterCreationRoute") {
    return /\bcompletedFighterCreationRoute\b/.test(text);
  }
  return new RegExp(`\\b${call}\\s*\\(`).test(text);
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
    const calls =
      typeof evidenceCall === "string" ? [evidenceCall] : evidenceCall.calls;
    if (!calls.some((call) => hasRouteEvidence(text, call))) {
      const label =
        typeof evidenceCall === "string" ? evidenceCall : evidenceCall.label;
      failures.push(`${repoPath}: must record ${label} route evidence.`);
    }
  }
  if (/\bGoblin\b|\bgoblin\b/.test(text)) {
    failures.push(`${repoPath}: route connectors must not model by fixture identity.`);
  }
}

function validateComponentConnector(root, repoPath, rows, failures) {
  const text = fs.readFileSync(path.join(root, repoPath), "utf8");
  if (!COMPONENT_VOCABULARY_IMPORT.test(text)) {
    failures.push(`${repoPath}: must import ${COMPONENT_VOCABULARY_PATH}.`);
  }
  if (!hasQComponentRouteProjection(text)) {
    failures.push(`${repoPath}: must expose qComponentRoute as MBT state.`);
  }
  if (!hasQComponentRouteAssignment(text)) {
    failures.push(`${repoPath}: must assign qComponentRoute in connector actions.`);
  }
  if (!new RegExp(`\\b${COMPONENT_EVIDENCE_CALL}\\s*\\(`).test(text)) {
    failures.push(`${repoPath}: must record ${COMPONENT_EVIDENCE_CALL} evidence.`);
  }
  if (/\bimport\s+battleRuntimeModel\.\*\s+from\s+"\.\/battle-runtime-model"/.test(text)) {
    failures.push(`${repoPath}: component connectors must not import battle-runtime-model.`);
  }
  if (/\bimport\s+battleRuntimeReducerRoute\.\*\s+from\s+"\.\/battle-runtime-reducer-route"/.test(text)) {
    failures.push(
      `${repoPath}: component connectors must not import the battle reducer-route vocabulary.`,
    );
  }
  for (const row of rows) {
    for (const owner of row.componentOwners) {
      if (!new RegExp(`\\b${owner}\\b`).test(text)) {
        failures.push(`${repoPath}: missing component owner ${owner} for ${row.source}.`);
      }
    }
  }
  validateComponentBridge(root, repoPath, rows, failures);
}

function validateComponentBridge(root, repoPath, rows, failures) {
  const bridgePath = componentBridgePath(repoPath);
  const absoluteBridgePath = path.join(root, bridgePath);
  if (!fs.existsSync(absoluteBridgePath)) {
    failures.push(`${bridgePath}: missing component MBT bridge for ${repoPath}.`);
    return;
  }
  const text = fs.readFileSync(absoluteBridgePath, "utf8");
  if (!COMPONENT_BRIDGE_IMPORT.test(text)) {
    failures.push(`${bridgePath}: must import rule-core component route bridge.`);
  }
  if (!new RegExp(`\\b${COMPONENT_RUNTIME_BRIDGE_CALL}\\s*\\(`).test(text)) {
    failures.push(
      `${bridgePath}: must project runtime component route with ${COMPONENT_RUNTIME_BRIDGE_CALL}.`,
    );
  }
  if (!new RegExp(`\\b${COMPONENT_QUINT_BRIDGE_DECODER}\\s*\\(`).test(text)) {
    failures.push(
      `${bridgePath}: must decode qComponentRoute with ${COMPONENT_QUINT_BRIDGE_DECODER}.`,
    );
  }
  if (!/\bcomponentRoute\b/.test(text)) {
    failures.push(`${bridgePath}: state check must compare componentRoute.`);
  }
  for (const row of rows) {
    for (const owner of row.componentOwners) {
      if (!text.includes(`"${owner}"`)) {
        failures.push(`${bridgePath}: missing runtime component owner ${owner} for ${row.source}.`);
      }
    }
  }
}

function checkReducerRouteConnectors(root) {
  const failures = [];
  const inventory = readJson(root, ROUTE_INVENTORY_PATH);
  const expected = expectedRouteConnectors(inventory, failures);
  const expectedComponents = expectedComponentConnectors(inventory, failures);
  const connectors = listRouteConnectors(root);
  const connectorPaths = new Set(connectors.map((file) => toRepoPath(root, file)));

  for (const surface of ROUTE_SURFACES) {
    if (!fs.existsSync(path.join(root, surface.routeVocabularyPath))) {
      failures.push(`${surface.routeVocabularyPath}: missing route vocabulary.`);
    }
  }
  if (!fs.existsSync(path.join(root, COMPONENT_VOCABULARY_PATH))) {
    failures.push(`${COMPONENT_VOCABULARY_PATH}: missing component route vocabulary.`);
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
  for (const [repoPath, rows] of expectedComponents) {
    if (!fs.existsSync(path.join(root, repoPath))) {
      failures.push(
        `${repoPath}: missing component connector driver for ${rows.map((row) => row.source).join(", ")}.`,
      );
      continue;
    }
    validateComponentConnector(root, repoPath, rows, failures);
  }

  return {
    failures,
    expectedConnectorCount: expected.size,
    expectedComponentConnectorCount: expectedComponents.size,
  };
}

function writeRouteVocabularies(root) {
  for (const surface of ROUTE_SURFACES) {
    const file = path.join(root, surface.routeVocabularyPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `module fixtureRouteVocabulary {}\n`);
  }
  const componentFile = path.join(root, COMPONENT_VOCABULARY_PATH);
  fs.mkdirSync(path.dirname(componentFile), { recursive: true });
  fs.writeFileSync(componentFile, `module fixtureComponentRouteVocabulary {}\n`);
}

function writeInventory(root, entries, prerequisites = [], levelDenominators = []) {
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
        levelDenominators,
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

function fixtureComponentAssignment(input = {}) {
  return {
    driverPath: "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    route: "component-first",
    routeTaskId: "fixture-component-task",
    subjectFamily: "fixture component",
    componentConnectorPath: "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    componentOwners: ["FixtureComponentOwner"],
    dependentRouteTaskIds: ["fixture-dependent-route-task"],
    derivability: {
      qntFacts: [],
      rawDomainFacts: [],
      blockers: [],
    },
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

function writeComponentConnector(root, repoPath, body = "") {
  const file = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      "module fixtureComponentMbt {",
      '  import ruleCoreComponentRoute.* from "./rule-core-component-route"',
      "  var qComponentRoute: List[RuleCoreComponentRouteEvent]",
      "  action init = qComponentRoute' = ruleCoreComponentRoute(FixtureComponentOwner)",
      "  action step = qComponentRoute' = ruleCoreComponentRoute(FixtureComponentOwner)",
      body,
      "}",
      "",
    ].join("\n"),
  );
}

function writeComponentBridge(root, repoPath, body = "") {
  const file = path.join(root, componentBridgePath(repoPath));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      'import { decodeRuleCoreComponentRoute, withRuleCoreComponentRoute } from "./rule-core-component-route.ts";',
      'const componentOwner = "FixtureComponentOwner";',
      "function runtimeProjection() {",
      "  return withRuleCoreComponentRoute(componentOwner, { value: true });",
      "}",
      "function quintProjection(state) {",
      "  return { componentRoute: decodeRuleCoreComponentRoute(state.qComponentRoute) };",
      "}",
      "void runtimeProjection;",
      "void quintProjection;",
      body,
      "",
    ].join("\n"),
  );
}

function writeComponentConnectorWithoutQComponentRoute(root, repoPath) {
  const file = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      "module fixtureComponentMbt {",
      '  import ruleCoreComponentRoute.* from "./rule-core-component-route"',
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

  runFixture((fixtureRoot) => {
    writeInventory(
      fixtureRoot,
      [],
      [],
      [
        {
          denominatorId: "fixture-denominator",
          driverRouteAssignments: [fixtureComponentAssignment()],
        },
      ],
    );
    writeComponentConnector(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    writeComponentBridge(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    assertNoFailures(checkReducerRouteConnectors(fixtureRoot));
  });

  runFixture((fixtureRoot) => {
    writeInventory(
      fixtureRoot,
      [],
      [],
      [
        {
          denominatorId: "fixture-denominator",
          driverRouteAssignments: [fixtureComponentAssignment()],
        },
      ],
    );
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "missing component connector driver",
      "Self-test expected missing component connector failure",
    );
  });

  runFixture((fixtureRoot) => {
    writeInventory(
      fixtureRoot,
      [],
      [],
      [
        {
          denominatorId: "fixture-denominator",
          driverRouteAssignments: [fixtureComponentAssignment()],
        },
      ],
    );
    writeComponentConnectorWithoutQComponentRoute(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    writeComponentBridge(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "must expose qComponentRoute as MBT state",
      "Self-test expected missing qComponentRoute failure",
    );
  });

  runFixture((fixtureRoot) => {
    writeInventory(
      fixtureRoot,
      [],
      [],
      [
        {
          denominatorId: "fixture-denominator",
          driverRouteAssignments: [fixtureComponentAssignment()],
        },
      ],
    );
    writeComponentConnector(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "missing component MBT bridge",
      "Self-test expected missing component bridge failure",
    );
  });

  runFixture((fixtureRoot) => {
    writeInventory(
      fixtureRoot,
      [],
      [],
      [
        {
          denominatorId: "fixture-denominator",
          driverRouteAssignments: [
            fixtureComponentAssignment({ componentOwners: [] }),
          ],
        },
      ],
    );
    writeComponentConnector(
      fixtureRoot,
      "packages/battle-runtime/rule-core-fixture.mbt.qnt",
    );
    const result = checkReducerRouteConnectors(fixtureRoot);
    expectFailure(
      result.failures,
      "component-first row needs componentOwners",
      "Self-test expected missing component owner failure",
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
    `Reducer-route connector gate passed (${result.expectedConnectorCount} queued reducer connectors and ${result.expectedComponentConnectorCount} component connectors discovered).`,
  );
}
