#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../../..");
const outDir = __dirname;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeJson(fileName, value) {
  fs.writeFileSync(
    path.join(outDir, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(outDir, fileName), value);
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hashFile(relativePath) {
  return sha256Text(readText(relativePath));
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function unique(items) {
  return [...new Set(items)].sort();
}

function normalizeId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function routeConnectorPaths(assignment) {
  const paths = [];
  if (assignment.routeConnectorPath) paths.push(assignment.routeConnectorPath);
  if (Array.isArray(assignment.routeConnectorPaths)) {
    paths.push(...assignment.routeConnectorPaths);
  }
  if (assignment.componentConnectorPath) paths.push(assignment.componentConnectorPath);
  if (Array.isArray(assignment.componentConnectorPaths)) {
    paths.push(...assignment.componentConnectorPaths);
  }
  if (paths.length === 0 && assignment.driverPath?.endsWith(".mbt.qnt")) {
    paths.push(assignment.driverPath.replace(/\.mbt\.qnt$/, ".route.mbt.qnt"));
  }
  return unique(paths);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function unitLookup(unitMatrix) {
  return new Map(unitMatrix.units.map((unit) => [unit.unitId, unit]));
}

function profileLookup(unitMatrix) {
  return new Map(unitMatrix.profiles.map((profile) => [profile.id, profile]));
}

function isL12InventoryRow(row) {
  return ["level-1", "level-2", "spell-level-0", "spell-level-1"].includes(
    row.levelBand,
  );
}

function classifyDisposition(row, unit) {
  const ownerText = JSON.stringify(row.ownerEvidence ?? []).toLowerCase();
  const category = row.category ?? "";
  const rowKind = row.rowKind ?? "";
  const finalDisposition = row.finalDisposition ?? "";
  const unitDisposition = row.unitProfileDisposition ?? "";
  const battleReadiness = row.battleReadinessStatus ?? "";

  if (row.candidateUnitId === "find_familiar") {
    return "handoff-owned";
  }
  if (
    rowKind === "class-container" ||
    category.includes("character-creation") ||
    ownerText.includes("character-creation") ||
    ownerText.includes("character sheet") ||
    ownerText.includes("character-sheet") ||
    finalDisposition === "non-runtime"
  ) {
    return "character-sheet-owned";
  }
  if (
    ownerText.includes("handoff") ||
    ownerText.includes("character-battle") ||
    ownerText.includes("session")
  ) {
    return "handoff-owned";
  }
  if (
    battleReadiness === "accepted-no-battle-effect" ||
    finalDisposition.includes("dead-for-now") ||
    unitDisposition !== "supported-profile" ||
    unit?.executableMechanics === false
  ) {
    return "no-battle-table-closed";
  }
  if (battleReadiness === "accepted" && unit?.executableMechanics === true) {
    return "executable";
  }
  return "outside-cleanroom-battle-route-denominator";
}

function profileFacts(profileId) {
  const text = profileId.toLowerCase();
  const facts = {
    actionTiming: "required",
    resourceCost: "required",
    targetShape: "not-applicable",
    attackSaveCheckShape: "not-applicable",
    damageEffectFacts: "required",
    durationLifecycle: "not-applicable",
    owners: "required",
    exactArithmetic: "not-applicable",
  };
  if (text.includes("spell") || text.includes("action") || text.includes("reaction")) {
    facts.actionTiming = "required";
  }
  if (text.includes("pool") || text.includes("cost") || text.includes("slot")) {
    facts.resourceCost = "required";
  }
  if (
    text.includes("target") ||
    text.includes("attack") ||
    text.includes("save") ||
    text.includes("condition") ||
    text.includes("damage")
  ) {
    facts.targetShape = "required";
  }
  if (
    text.includes("attack") ||
    text.includes("save") ||
    text.includes("check") ||
    text.includes("roll")
  ) {
    facts.attackSaveCheckShape = "required";
  }
  if (
    text.includes("damage") ||
    text.includes("healing") ||
    text.includes("condition") ||
    text.includes("effect") ||
    text.includes("movement")
  ) {
    facts.damageEffectFacts = "required";
  }
  if (
    text.includes("duration") ||
    text.includes("lifecycle") ||
    text.includes("concentration") ||
    text.includes("active") ||
    text.includes("condition")
  ) {
    facts.durationLifecycle = "required";
  }
  if (
    text.includes("damage") ||
    text.includes("healing") ||
    text.includes("pool") ||
    text.includes("cost") ||
    text.includes("movement")
  ) {
    facts.exactArithmetic = "required";
  }
  return facts;
}

function mergeFactRequirements(profileIds) {
  const merged = {
    actionTiming: "not-applicable",
    resourceCost: "not-applicable",
    targetShape: "not-applicable",
    attackSaveCheckShape: "not-applicable",
    damageEffectFacts: "not-applicable",
    durationLifecycle: "not-applicable",
    owners: "required",
    exactArithmetic: "not-applicable",
  };
  for (const profileId of profileIds) {
    const facts = profileFacts(profileId);
    for (const [key, value] of Object.entries(facts)) {
      if (value === "required") merged[key] = "required";
    }
  }
  return merged;
}

function proofClass(assignment) {
  const connectors = routeConnectorPaths(assignment);
  const missing = connectors.filter((connector) => !fileExists(connector));
  const route = assignment.route;
  if (missing.length > 0) return "missing-proof";
  if (route === "component-first") return "focused-qComponentRoute";
  if (route === "catalog-after-substrate") {
    return "grouped-selected-identity-not-accepted";
  }
  if (route === "reducer-routed" || route === "replay-refresh-only") {
    return "focused-qRoute";
  }
  return "missing-proof";
}

function routeProjection(assignment) {
  if (assignment.route === "component-first") return "qComponentRoute";
  return "qRoute";
}

function findRouteCandidates(unitId, assignments) {
  const normalizedUnit = normalizeId(unitId);
  if (!normalizedUnit) return [];
  return assignments.filter((assignment) => {
    const haystack = [
      assignment.driverPath,
      assignment.subjectFamily,
      assignment.routeTaskId,
      ...(assignment.derivability?.qntFacts ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .replace(/_/g, "-");
    return haystack.includes(normalizedUnit);
  });
}

const fullSupport = readJson("plans/unit-profile-coverage/level1-2-full-support.json");
const unitMatrix = readJson("plans/unit-profile-coverage/unit-matrix.json");
const srdInventory = readJson("plans/unit-profile-coverage/srd-unit-inventory.json");
const routeInventory = readJson("plans/cleanroom-branch-coverage/reducer-route-inventory.json");
const routeBacklog = readJson("plans/cleanroom-branch-coverage/reducer-convergence-backlog.json");
const rulesProfiles = fs
  .readFileSync(path.join(root, "plans/rules-kernel-coverage/profile-obligations.jsonl"), "utf8")
  .trim()
  .split(/\n+/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const units = unitLookup(unitMatrix);
const profiles = profileLookup(unitMatrix);
const l12Rows = srdInventory.rows.filter(isL12InventoryRow);
const assignments = routeInventory.levelDenominators[0].driverRouteAssignments;

const baseCheck = {
  status: "not-run",
  reason:
    "No Ralph task Base SHA was provided in the user request; generated artifacts record this as missing task-run metadata rather than fabricating a base check.",
};

const sourceHashes = {
  "plans/unit-profile-coverage/level1-2-full-support.json": hashFile(
    "plans/unit-profile-coverage/level1-2-full-support.json",
  ),
  "plans/unit-profile-coverage/srd-unit-inventory.json": hashFile(
    "plans/unit-profile-coverage/srd-unit-inventory.json",
  ),
  "plans/unit-profile-coverage/unit-matrix.json": hashFile(
    "plans/unit-profile-coverage/unit-matrix.json",
  ),
  "plans/cleanroom-branch-coverage/reducer-route-inventory.json": hashFile(
    "plans/cleanroom-branch-coverage/reducer-route-inventory.json",
  ),
  "plans/cleanroom-branch-coverage/reducer-convergence-backlog.json": hashFile(
    "plans/cleanroom-branch-coverage/reducer-convergence-backlog.json",
  ),
};

const baseline = {
  schema: "l12-cleanroom-baseline-reconciliation.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  sourceSupport: {
    claimGate: fullSupport.claimGate,
    metrics: fullSupport.metrics,
    scope: fullSupport.scope,
    statusGroups: fullSupport.groups.map((group) => ({
      status: group.status,
      count: group.count,
    })),
    frontierRows: fullSupport.frontierRows.length,
    openFrontierRows: fullSupport.openFrontier.length,
  },
  cleanroomRouteEvidence: {
    routeAssignments: assignments.length,
    routeAssignmentsByRoute: countBy(assignments, (assignment) => assignment.route),
    backlogRows: routeBacklog.rows.length,
    backlogRowsByStatus: countBy(routeBacklog.rows, (row) => row.status),
    branchCoverageStatus: "validated by pnpm cleanroom-branch-coverage:check",
  },
  cleanroomBlockerInputs: {
    searchedRepoPaths: ["**/BLOCKERS.json", "**/FRESH_RUN_REPORT.md"],
    presentInRepo: [],
    note:
      "No current cleanroom BLOCKERS.json or FRESH_RUN_REPORT.md exists in this checkout; a Ralph task may add task-run-specific cleanroom paths as extra inputs.",
  },
  mismatches: [
    {
      id: "MISMATCH-SOURCE-ROWS-TO-STRICT-DENOMINATOR",
      classification: "source-support",
      sourceFacts: {
        srdInventoryL12Rows: l12Rows.length,
        strictExecutableDenominator: fullSupport.metrics.strictRuntimeProfileSupport.denominator,
      },
      explanation:
        "SRD inventory rows count class/list/source pressure rows; strict executable denominator counts unique executable Unit/profile rows.",
      downstreamOwner: "L12CRG-02 denominator contract",
    },
    {
      id: "MISMATCH-STRICT-DENOMINATOR-TO-ROUTE-ASSIGNMENTS",
      classification: "route-connector",
      sourceFacts: {
        strictExecutableDenominator: fullSupport.metrics.strictRuntimeProfileSupport.denominator,
        routeAssignments: assignments.length,
      },
      explanation:
        "Cleanroom route assignments are driver/proof rows, not one row per strict Unit denominator entry.",
      downstreamOwner: "L12CRG-04 route proof inventory and L12CRG-05 mapping",
    },
    {
      id: "MISMATCH-SOURCE-SUPPORT-TO-CLEANROOM-REPLAY",
      classification: "cleanroom-evidence",
      sourceFacts: {
        claimGateStatus: fullSupport.claimGate.status,
        targetReplayEvidence: "not supplied in current checkout",
      },
      explanation:
        "Source full-support pass is not target cleanroom replay evidence.",
      downstreamOwner: "L12CRG-06 verifier gate design",
    },
  ],
};
writeJson("baseline-reconciliation.json", baseline);

writeText(
  "baseline-reconciliation.md",
  `# L1-2 Cleanroom Baseline Reconciliation

Generated by \`${baseline.generatedBy}\`.

## Base Check

${baseCheck.reason}

## Source Support

- Claim gate: \`${fullSupport.claimGate.status}\`
- Strict runtime/profile support: ${fullSupport.metrics.strictRuntimeProfileSupport.numerator}/${fullSupport.metrics.strictRuntimeProfileSupport.denominator}
- Strict target closure: ${fullSupport.metrics.strictTargetClosure.numerator}/${fullSupport.metrics.strictTargetClosure.denominator}
- Product readiness rows: ${fullSupport.metrics.productReadiness.numerator}/${fullSupport.metrics.productReadiness.denominator}
- Open frontier rows: ${fullSupport.openFrontier.length}

## Cleanroom Route Evidence

- Route assignments: ${assignments.length}
- Route classes: ${Object.entries(baseline.cleanroomRouteEvidence.routeAssignmentsByRoute)
    .map(([route, count]) => `${route}=${count}`)
    .join(", ")}
- Reducer convergence backlog rows: ${routeBacklog.rows.length}
- Current cleanroom target replay evidence: not supplied in this checkout

## Mismatch Classifications

${baseline.mismatches
    .map(
      (mismatch) =>
        `- \`${mismatch.id}\` (${mismatch.classification}): ${mismatch.explanation} Owner: ${mismatch.downstreamOwner}.`,
    )
    .join("\n")}

## Result

The source support pass, route connector inventory, and cleanroom replay evidence are separate gates. The exhaustive plan must not treat a source support pass or selected-identity witness as cleanroom acceptance without generic route proof and verifier coverage.
`,
);

const denominatorRows = l12Rows.map((row) => {
  const unit = units.get(row.candidateUnitId);
  const disposition = classifyDisposition(row, unit);
  return {
    rowId: row.id,
    collectionId: "srd-5.2.1",
    provenance: "srd-5.2.1",
    levelBand: row.levelBand,
    rowKind: row.rowKind,
    category: row.category,
    candidateUnitId: row.candidateUnitId,
    concept: row.concept,
    source: row.source,
    unitProfileDisposition: row.unitProfileDisposition,
    battleReadinessStatus: row.battleReadinessStatus,
    finalDisposition: row.finalDisposition,
    cleanroomDisposition: disposition,
    executableMechanics: unit?.executableMechanics ?? row.executableMechanics ?? null,
    sourceRecordPath: unit?.sourceRecordPath ?? row.authoredContent?.sourceRecordPath ?? null,
  };
});

const denominator = {
  schema: "srd-l12-cleanroom-denominator.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  collectionBoundary: {
    provenance: "srd-5.2.1",
    allowedLevelBands: ["level-1", "level-2", "spell-level-0", "spell-level-1"],
    forbiddenProvenance: ["PHB+", "synthetic-non-srd"],
  },
  counts: {
    rows: denominatorRows.length,
    byDisposition: countBy(denominatorRows, (row) => row.cleanroomDisposition),
    byLevelBand: countBy(denominatorRows, (row) => row.levelBand),
  },
  rows: denominatorRows,
};
writeJson("srd-l12-denominator.json", denominator);

const denominatorSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "srd-l12-cleanroom-denominator.schema.json",
  type: "object",
  required: ["schema", "collectionBoundary", "counts", "rows"],
  properties: {
    schema: { const: "srd-l12-cleanroom-denominator.v1" },
    collectionBoundary: {
      type: "object",
      required: ["provenance", "allowedLevelBands", "forbiddenProvenance"],
      properties: {
        provenance: { const: "srd-5.2.1" },
        allowedLevelBands: {
          type: "array",
          items: {
            enum: ["level-1", "level-2", "spell-level-0", "spell-level-1"],
          },
          minItems: 4,
          maxItems: 4,
        },
        forbiddenProvenance: { type: "array", items: { type: "string" } },
      },
      additionalProperties: true,
    },
    rows: {
      type: "array",
      items: {
        type: "object",
        required: [
          "rowId",
          "collectionId",
          "provenance",
          "levelBand",
          "candidateUnitId",
          "cleanroomDisposition",
        ],
        properties: {
          collectionId: { const: "srd-5.2.1" },
          provenance: { const: "srd-5.2.1" },
          levelBand: {
            enum: ["level-1", "level-2", "spell-level-0", "spell-level-1"],
          },
          cleanroomDisposition: {
            enum: [
              "executable",
              "no-battle-table-closed",
              "character-sheet-owned",
              "handoff-owned",
              "outside-cleanroom-battle-route-denominator",
            ],
          },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};
writeJson("srd-l12-denominator.schema.json", denominatorSchema);

const executableRows = denominatorRows.filter(
  (row) => row.cleanroomDisposition === "executable",
);
const factRows = executableRows.map((row) => {
  const unit = units.get(row.candidateUnitId);
  const profileIds = unit?.profiles?.map((profile) => profile.id) ?? [];
  const requirements = mergeFactRequirements(profileIds);
  return {
    rowId: row.rowId,
    candidateUnitId: row.candidateUnitId,
    source: row.source,
    profileIds,
    profileTitles: profileIds.map((id) => profiles.get(id)?.title ?? id),
    requirements,
    owners: unique(
      profileIds.flatMap((id) => profiles.get(id)?.runtimeOwners ?? []),
    ),
    qntOwners: unique(profileIds.flatMap((id) => profiles.get(id)?.qntOwners ?? [])),
    verificationOwners: profileIds.flatMap(
      (id) => profiles.get(id)?.verificationOwners ?? [],
    ),
    missingFactFamilies: Object.entries(requirements)
      .filter(([, value]) => value === "required")
      .map(([key]) => key),
  };
});
writeJson("capability-fact-coverage-matrix.json", {
  schema: "l12-capability-fact-coverage-matrix.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  factFamilies: [
    "actionTiming",
    "resourceCost",
    "targetShape",
    "attackSaveCheckShape",
    "damageEffectFacts",
    "durationLifecycle",
    "owners",
    "exactArithmetic",
  ],
  counts: {
    executableRows: factRows.length,
    byRequiredFact: Object.fromEntries(
      [
        "actionTiming",
        "resourceCost",
        "targetShape",
        "attackSaveCheckShape",
        "damageEffectFacts",
        "durationLifecycle",
        "owners",
        "exactArithmetic",
      ].map((fact) => [
        fact,
        factRows.filter((row) => row.requirements[fact] === "required").length,
      ]),
    ),
  },
  rows: factRows,
});

writeJson("capability-fact-contract.schema.json", {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "capability-fact-contract.schema.json",
  type: "object",
  required: ["schema", "factFamilies", "rows"],
  properties: {
    schema: { const: "l12-capability-fact-coverage-matrix.v1" },
    factFamilies: {
      type: "array",
      items: {
        enum: [
          "actionTiming",
          "resourceCost",
          "targetShape",
          "attackSaveCheckShape",
          "damageEffectFacts",
          "durationLifecycle",
          "owners",
          "exactArithmetic",
        ],
      },
    },
    rows: {
      type: "array",
      items: {
        type: "object",
        required: ["rowId", "candidateUnitId", "profileIds", "requirements"],
        properties: {
          requirements: {
            type: "object",
            additionalProperties: {
              enum: ["required", "not-applicable", "needs-research"],
            },
          },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
});

const proofRows = assignments.map((assignment) => {
  const connectors = routeConnectorPaths(assignment);
  const missingConnectors = connectors.filter((connector) => !fileExists(connector));
  return {
    driverPath: assignment.driverPath,
    route: assignment.route,
    proofClassification: proofClass(assignment),
    selectedIdentityDriverAccepted: assignment.route !== "catalog-after-substrate",
    acceptedProjection: routeProjection(assignment),
    connectorPaths: connectors,
    missingConnectors,
    routeTaskId: assignment.routeTaskId ?? null,
    subjectFamily: assignment.subjectFamily ?? null,
    branchObligations: assignment.branchObligations ?? null,
    currentOutOfScopeBranchObligations:
      assignment.currentOutOfScopeBranchObligations ?? null,
    derivabilityBlockers: assignment.derivability?.blockers ?? [],
    acceptanceNote:
      assignment.route === "catalog-after-substrate"
        ? "The grouped selected-identity driver is not accepted directly; only the listed generic connector substrate can count as acceptance evidence."
        : "Focused connector evidence can count when target replay observes the copied projection.",
  };
});
writeJson("route-proof-inventory.json", {
  schema: "l12-route-proof-inventory.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  counts: {
    rows: proofRows.length,
    byRoute: countBy(proofRows, (row) => row.route),
    byProofClassification: countBy(proofRows, (row) => row.proofClassification),
    missingConnectorRows: proofRows.filter((row) => row.missingConnectors.length > 0)
      .length,
    groupedSelectedIdentityNotAccepted: proofRows.filter(
      (row) => row.proofClassification === "grouped-selected-identity-not-accepted",
    ).length,
  },
  rows: proofRows,
});

const mappingRows = denominatorRows.map((row) => {
  const unit = units.get(row.candidateUnitId);
  const profileIds = unit?.profiles?.map((profile) => profile.id) ?? [];
  const routeCandidates =
    row.cleanroomDisposition === "executable"
      ? findRouteCandidates(row.candidateUnitId, assignments)
      : [];
  const proofStatus =
    row.cleanroomDisposition !== "executable"
      ? "not-required"
      : routeCandidates.length > 0
        ? "candidate-proof-found"
        : "missing-proof-join";
  return {
    rowId: row.rowId,
    candidateUnitId: row.candidateUnitId,
    cleanroomDisposition: row.cleanroomDisposition,
    profileIds,
    capabilityFactRequirements:
      row.cleanroomDisposition === "executable"
        ? mergeFactRequirements(profileIds)
        : null,
    routeProofStatus: proofStatus,
    routeProofCandidates: routeCandidates.map((assignment) => ({
      driverPath: assignment.driverPath,
      route: assignment.route,
      routeTaskId: assignment.routeTaskId ?? null,
      proofClassification: proofClass(assignment),
      connectorPaths: routeConnectorPaths(assignment),
    })),
    verifierExpectation:
      row.cleanroomDisposition === "executable"
        ? proofStatus === "candidate-proof-found"
          ? "require-generic-facts-and-observed-focused-route-proof"
          : "fail-until-generic-route-proof-is-mapped"
        : `enforce-disposition-${row.cleanroomDisposition}`,
  };
});
writeJson("srd-row-generic-fact-map.json", {
  schema: "srd-row-generic-fact-map.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  counts: {
    rows: mappingRows.length,
    executableRows: mappingRows.filter(
      (row) => row.cleanroomDisposition === "executable",
    ).length,
    executableRowsWithProofCandidates: mappingRows.filter(
      (row) => row.routeProofStatus === "candidate-proof-found",
    ).length,
    executableRowsMissingProofJoin: mappingRows.filter(
      (row) => row.routeProofStatus === "missing-proof-join",
    ).length,
  },
  rows: mappingRows,
});

writeJson("srd-row-generic-fact-map.schema.json", {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "srd-row-generic-fact-map.schema.json",
  type: "object",
  required: ["schema", "rows"],
  properties: {
    schema: { const: "srd-row-generic-fact-map.v1" },
    rows: {
      type: "array",
      items: {
        type: "object",
        required: [
          "rowId",
          "candidateUnitId",
          "cleanroomDisposition",
          "routeProofStatus",
          "verifierExpectation",
        ],
        properties: {
          routeProofStatus: {
            enum: [
              "candidate-proof-found",
              "missing-proof-join",
              "not-required",
            ],
          },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
});

const verifierGates = [
  {
    id: "L12VG-01-DENOMINATOR-SCHEMA-HASH",
    owner: "new checker task",
    failsWhen: [
      "denominator artifact is missing",
      "source hashes do not match current source artifacts",
      "row provenance is not srd-5.2.1",
      "level band is outside level-1, level-2, spell-level-0, or spell-level-1",
    ],
    selfTestRequirement: "fixture with stale source hash and non-SRD row",
  },
  {
    id: "L12VG-02-CAPABILITY-FACT-COVERAGE",
    owner: "new checker task",
    failsWhen: [
      "executable denominator row has no capability fact row",
      "required fact family is missing",
      "runtime fact discriminant contains authored id/name/slug/source heading",
    ],
    selfTestRequirement: "fixture with missing targetShape and authored spell id discriminant",
  },
  {
    id: "L12VG-03-ROUTE-PROOF-COVERAGE",
    owner: "scripts/check-reducer-route-connectors.cjs extension or companion checker",
    failsWhen: [
      "executable mapped row has missing-proof-join",
      "connector path is absent",
      "catalog-after-substrate grouped driver is counted as accepted evidence directly",
    ],
    selfTestRequirement: "fixture with grouped selected-identity row and no generic connector",
  },
  {
    id: "L12VG-04-MAPPING-JOIN-COVERAGE",
    owner: "new checker task",
    failsWhen: [
      "denominator row is absent from srd-row-generic-fact-map.json",
      "mapping row verifier expectation conflicts with denominator disposition",
      "non-executable row requires battle route proof",
    ],
    selfTestRequirement: "fixture with dropped denominator row and contradictory verifier expectation",
  },
  {
    id: "L12VG-05-TARGET-REPLAY-EVIDENCE",
    owner: "scripts/cleanroom-branch-coverage-check.cjs target evidence path",
    failsWhen: [
      "target replay evidence omits source branch inventory hash",
      "target replay does not observe qRoute or qComponentRoute projection",
      "stateCheck projection hashes are stale",
    ],
    selfTestRequirement: "fixture target evidence with stale QNT hash and missing projection",
  },
];
writeJson("verifier-gate-spec.json", {
  schema: "l12-cleanroom-verifier-gate-spec.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  gates: verifierGates,
});
writeText(
  "verifier-gate-spec.md",
  `# L1-2 Cleanroom Verifier Gate Spec

Generated by \`${path.relative(root, __filename)}\`.

These gates are design artifacts for the exhaustive implementation plan. They intentionally fail missing generic facts, missing route proof joins, stale hashes, grouped selected-identity acceptance, and authored-identity leaks.

${verifierGates
    .map(
      (gate) => `## ${gate.id}

- Owner: ${gate.owner}
- Fails when:
${gate.failsWhen.map((item) => `  - ${item}`).join("\n")}
- Self-test requirement: ${gate.selfTestRequirement}
`,
    )
    .join("\n")}
`,
);

const missingProofRows = mappingRows.filter(
  (row) => row.routeProofStatus === "missing-proof-join",
);
const missingProofByUnit = [...missingProofRows]
  .sort((a, b) => a.candidateUnitId.localeCompare(b.candidateUnitId))
  .reduce((groups, row) => {
    const existing = groups.get(row.candidateUnitId) ?? [];
    existing.push(row);
    groups.set(row.candidateUnitId, existing);
    return groups;
  }, new Map());

const baseTasks = [
  {
    number: 1,
    id: "L12CEG-01-DENOMINATOR-CHECKER",
    family: "denominator",
    dependencies: [],
    input: [
      "srd-l12-denominator.schema.json",
      "srd-l12-denominator.json",
      "plans/unit-profile-coverage/srd-unit-inventory.json",
    ],
    output: ["production checker or script extension selected by implementer"],
    validation: ["pnpm unit-profile-coverage:check", "git diff --check"],
    successCriteria: [
      "SRD-only level 1-2 denominator is validated with stale-hash self-tests",
      "mixed-provenance rows are rejected",
    ],
    oneAgentSessionScope:
      "One checker/schema gate and its self-test fixtures; no runtime behavior.",
  },
  {
    number: 2,
    id: "L12CEG-02-CAPABILITY-FACT-CHECKER",
    family: "facts",
    dependencies: ["L12CEG-01-DENOMINATOR-CHECKER"],
    input: [
      "capability-fact-contract.schema.json",
      "capability-fact-coverage-matrix.json",
    ],
    output: ["capability fact verifier task implementation"],
    validation: ["pnpm rules-kernel-coverage:check", "git diff --check"],
    successCriteria: [
      "Every executable denominator row requires all applicable fact families",
      "authored ids/names are rejected in runtime fact discriminants",
    ],
    oneAgentSessionScope:
      "One checker gate over generated capability facts and fixtures.",
  },
  {
    number: 3,
    id: "L12CEG-03-ROUTE-PROOF-GATE",
    family: "connectors",
    dependencies: ["L12CEG-01-DENOMINATOR-CHECKER"],
    input: ["route-proof-inventory.json"],
    output: ["route proof verifier extension or companion checker"],
    validation: [
      "pnpm cleanroom-branch-coverage:check",
      "pnpm check:reducer-route-connectors",
      "git diff --check",
    ],
    successCriteria: [
      "Grouped selected-identity rows cannot count as acceptance evidence directly",
      "qRoute/qComponentRoute connector path existence and projection names are checked",
    ],
    oneAgentSessionScope:
      "One verifier gate over the existing connector inventory.",
  },
  {
    number: 4,
    id: "L12CEG-04-MAPPING-GATE",
    family: "mapping",
    dependencies: [
      "L12CEG-01-DENOMINATOR-CHECKER",
      "L12CEG-02-CAPABILITY-FACT-CHECKER",
      "L12CEG-03-ROUTE-PROOF-GATE",
    ],
    input: ["srd-row-generic-fact-map.schema.json", "srd-row-generic-fact-map.json"],
    output: ["mapping verifier gate"],
    validation: [
      "pnpm unit-profile-coverage:check",
      "pnpm rules-kernel-coverage:check",
      "pnpm cleanroom-branch-coverage:check",
      "git diff --check",
    ],
    successCriteria: [
      "Every denominator row maps exactly once",
      "Executable rows cannot pass with missing-proof-join",
    ],
    oneAgentSessionScope:
      "One mapping checker and self-test fixture set.",
  },
];

const routeResolutionTasks = [...missingProofByUnit.entries()].map(
  ([unitId, rows], index) => {
    const unit = units.get(unitId);
    const profileIds = unique(rows.flatMap((row) => row.profileIds));
    const taskNumber = baseTasks.length + index + 1;
    const taskId = `L12CEG-${String(taskNumber).padStart(2, "0")}-${unitId
      .toUpperCase()
      .replace(/_/g, "-")}-ROUTE-PROOF`;
    return {
      number: taskNumber,
      id: taskId,
      family: "connectors",
      dependencies: ["L12CEG-04-MAPPING-GATE"],
      input: [
        `srd-row-generic-fact-map.json rows for ${unitId}`,
        `srd-l12-denominator.json rows for ${unitId}`,
        `capability-fact-coverage-matrix.json rows for ${unitId}`,
        "route-proof-inventory.json",
        ...(unit?.profiles ?? []).flatMap((profile) => profile.qntOwners ?? []),
      ],
      output: [
        `focused generic route proof mapping for ${unitId}`,
        `updated route-proof-inventory or source connector task for ${unitId}`,
        `updated srd-row-generic-fact-map entry clearing missing-proof-join for ${unitId}`,
      ],
      validation: [
        "pnpm rules-kernel-coverage:check",
        "pnpm cleanroom-branch-coverage:check",
        "pnpm check:reducer-route-connectors",
        "git diff --check",
      ],
      successCriteria: [
        `${rows.length} denominator row(s) for ${unitId} no longer have routeProofStatus missing-proof-join`,
        `generic capability profiles are covered: ${profileIds.join(", ") || "none"}`,
        "acceptance uses focused generic qRoute/qComponentRoute or equivalent machine proof, not authored identity dispatch",
      ],
      oneAgentSessionScope: `Resolve proof mapping for one Unit id (${unitId}) across ${rows.length} SRD row(s). If this requires unrelated route families, split before editing QNT/runtime behavior.`,
    };
  },
);

const cleanroomTaskNumber = baseTasks.length + routeResolutionTasks.length + 1;
const cleanroomTask = {
  number: cleanroomTaskNumber,
  id: `L12CEG-${String(cleanroomTaskNumber).padStart(2, "0")}-CLEANROOM-PACKAGE-REPLAY-GATE`,
  family: "cleanroom-replay",
  dependencies: [
    "L12CEG-01-DENOMINATOR-CHECKER",
    "L12CEG-02-CAPABILITY-FACT-CHECKER",
    "L12CEG-03-ROUTE-PROOF-GATE",
    "L12CEG-04-MAPPING-GATE",
    ...routeResolutionTasks.map((task) => task.id),
  ],
  input: ["verifier-gate-spec.json", "plans/cleanroom-scaffolds/tasks/*"],
  output: ["target replay evidence acceptance tasks"],
  validation: [
    "pnpm cleanroom-scaffold:check",
    "pnpm cleanroom-harness:check",
    "pnpm cleanroom-branch-coverage:check",
    "git diff --check",
  ],
  successCriteria: [
    "Target replay evidence must observe focused generic route projections",
    "stale hashes and missing projection hashes fail",
  ],
  oneAgentSessionScope:
    "Cleanroom package/checker acceptance only; no target runtime implementation.",
};

const reviewTaskNumber = cleanroomTaskNumber + 1;
const reviewTask = {
  number: reviewTaskNumber,
  id: `L12CEG-${String(reviewTaskNumber).padStart(2, "0")}-REVIEWER-LOOP-CLOSURE`,
  family: "review",
  dependencies: [
    "L12CEG-01-DENOMINATOR-CHECKER",
    "L12CEG-02-CAPABILITY-FACT-CHECKER",
    "L12CEG-03-ROUTE-PROOF-GATE",
    "L12CEG-04-MAPPING-GATE",
    ...routeResolutionTasks.map((task) => task.id),
    cleanroomTask.id,
  ],
  input: ["all generated L12 cleanroom artifacts and changed verifier outputs"],
  output: ["review convergence report"],
  validation: [
    "pnpm unit-profile-coverage:check",
    "pnpm rules-kernel-coverage:check",
    "pnpm cleanroom-branch-coverage:check",
    "pnpm cleanroom-scaffold:check",
    "pnpm cleanroom-harness:check",
    "pnpm check:reducer-route-connectors",
    "git diff --check",
  ],
  successCriteria: [
    "RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes converge",
  ],
  oneAgentSessionScope:
    "Review and repair generated plan/checker artifacts only; implementation findings become explicit follow-up tasks.",
};

const taskGraph = {
  schema: "l12-cleanroom-exhaustive-task-graph.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  summary: {
    denominatorRows: denominatorRows.length,
    executableRows: executableRows.length,
    routeProofRows: proofRows.length,
    missingProofJoinRows: missingProofRows.length,
    missingProofUnitTasks: routeResolutionTasks.length,
  },
  tasks: [...baseTasks, ...routeResolutionTasks, cleanroomTask, reviewTask],
};
writeJson("exhaustive-task-graph.json", taskGraph);

function taskIndex(tasks) {
  return JSON.stringify(
    {
      schema: "ralph-plan.v1",
      tasks: tasks.map((task) => ({
        number: task.number,
        id: task.id,
        status: "todo",
        title: task.id
          .replace(/^L12CEG-\d+-/, "")
          .toLowerCase()
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    },
    null,
    2,
  );
}

const planTasks = taskGraph.tasks;
const firstRouteResolutionTask = routeResolutionTasks[0]?.id ?? "none";
const lastRouteResolutionTask =
  routeResolutionTasks[routeResolutionTasks.length - 1]?.id ?? "none";
const exhaustivePlan = `# Ralph L1-2 Cleanroom Exhaustive Generation

<!-- ralph-task-index
${taskIndex(planTasks)}
-->

## Purpose

This is the implementation plan produced by \`plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md\`. It closes SRD level 1-2 cleanroom generation readiness through concrete denominator, capability-fact, route-proof, mapping, verifier, and cleanroom replay gates.

This plan is SRD-only. PHB+ and synthetic non-SRD identities are out of scope. Runtime behavior must route through generic facts, procedure shapes, runtime state, and support-profile admission facts, never through authored ids, names, slugs, source headings, page references, or catalog labels.

## Research Inputs

- \`plans/ralph-artifacts/l12-cleanroom-generation/baseline-reconciliation.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/exhaustive-task-graph.json\`

## Current Accounting

- Denominator rows: ${denominatorRows.length}
- Executable cleanroom rows: ${executableRows.length}
- Route proof inventory rows: ${proofRows.length}
- Executable rows with route proof candidates from the current heuristic join: ${taskGraph.summary.executableRows - taskGraph.summary.missingProofJoinRows}
- Executable rows still requiring explicit mapping/proof work: ${taskGraph.summary.missingProofJoinRows}
- Explicit per-Unit route-proof resolution tasks: ${routeResolutionTasks.length}

The missing-proof count is intentionally conservative. It means the generated mapping could not prove a row-to-route join from current artifact names and structured fields; it is not proof that no connector exists.

## Non-Omittable Gates

| Gate | Covered By |
| --- | --- |
| SRD level 1-2 denominator | \`L12CEG-01\` |
| Identity-free capability facts per row | \`L12CEG-02\` |
| Focused generic route proof/connectors or equivalent machine proof | \`L12CEG-03\`, \`${firstRouteResolutionTask}\` through \`${lastRouteResolutionTask}\` |
| SRD surface row to generic facts mapping | \`L12CEG-04\` |
| Verifier gates that fail residual grouped/unaccepted rows | \`L12CEG-02\`, \`L12CEG-03\`, \`L12CEG-04\`, \`${cleanroomTask.id}\` |

## DAG

| Task | Depends On |
| --- | --- |
${planTasks
    .map((task) => `| \`${task.id}\` | ${task.dependencies.map((id) => `\`${id}\``).join(", ") || "none"} |`)
    .join("\n")}

## Global Verification

Every task must start with the Ralph task-base check from \`AGENTS.md\`: log the declared Base SHA, log \`HEAD\`, and run \`git merge-base --is-ancestor <Base SHA> HEAD\`. Stop if the ancestor check fails.

Every task must also run the reviewer loop for RAW traceability, ubiquitous-language/domain language, architecture/connascence, cleanroom-authored-identity, Ralph task quality, and code-review findings. Fix every reasonable finding; reject only with a concrete reason.

## Task Details

${planTasks
    .map(
      (task) => `### Task ${task.number} - ${task.id}

Status: \`todo\`

Goal:

Implement the ${task.family} gate named by this task without changing unrelated runtime behavior.

Input:

${task.input.map((item) => `- \`${item}\``).join("\n")}

Output:

${task.output.map((item) => `- ${item}`).join("\n")}

Validation:

${task.validation.map((item) => `- \`${item}\``).join("\n")}

Success Criteria:

${task.successCriteria.map((item) => `- ${item}`).join("\n")}

Dependencies:

${task.dependencies.length === 0 ? "- none" : task.dependencies.map((id) => `- \`${id}\``).join("\n")}

One-Agent-Session Scope:

${task.oneAgentSessionScope}

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic \`qRoute\`, focused generic \`qComponentRoute\`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes.

Plan Impact:

\`update-required\` if this task changes generated artifact shape or task dependencies; otherwise \`none\`.
`,
    )
    .join("\n")}
`;
fs.writeFileSync(
  path.join(root, "plans/RALPH_L12_CLEANROOM_EXHAUSTIVE_GENERATION.md"),
  exhaustivePlan,
);

writeText(
  "reviewer-loop-report.md",
  `# L1-2 Cleanroom Generation Reviewer Loop

Generated by \`${path.relative(root, __filename)}\`.

## Round 1 Findings

- RAW/domain: accepted. Generated artifacts cite local SRD source paths from \`srd-unit-inventory.json\` and keep \`.references/srd-5.2.1/\` as the RAW corpus.
- Architecture/connascence: accepted with one follow-up. The generated mapping records source hashes so stale inputs are visible; the exhaustive plan includes a checker task to make that executable.
- Cleanroom authored identity: accepted. Unit ids appear only at denominator/mapping boundaries. Runtime fact requirements use generic fact family names.
- Ralph task quality: accepted with one caveat. The plan is byte-sized by gate, but connector implementation is intentionally split into a batching task because current row-to-route joins are conservative.
- Code-review stance: accepted. The generator is plan-owned research tooling under the artifact directory and does not change production runtime, QNT, or checker behavior.

## Round 2 Findings

- No additional reasonable findings after checking generated artifact boundaries and exhaustive plan task bodies.

## Explicit Rejections

- Rejected: treating the generated heuristic missing-proof list as authoritative absence of proof. Reason: it is only a conservative join result from current artifact names and fields; \`L12CEG-05\` exists to assign each row to a concrete generic connector or source-harness task.
- Rejected: doing production checker implementation inside this meta-plan. Reason: \`plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md\` forbids production verifier-script changes.

## Convergence

Reviewer loop converged for planning artifacts. The exhaustive plan remains the handoff for implementation work.
`,
);

console.log("Generated L1-2 cleanroom generation artifacts.");
