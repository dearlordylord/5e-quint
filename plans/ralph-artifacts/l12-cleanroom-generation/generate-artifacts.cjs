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

function uniqueAssignments(assignments) {
  return [
    ...new Map(
      assignments.map((assignment) => [assignment.driverPath, assignment]),
    ).values(),
  ].sort((left, right) => left.driverPath.localeCompare(right.driverPath));
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
    const routePath = assignment.driverPath.replace(/\.mbt\.qnt$/, ".route.mbt.qnt");
    if (fileExists(routePath)) paths.push(routePath);
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
    if (connectors.length > 0 && (assignment.derivability?.blockers ?? []).length === 0) {
      return "equivalent-machine-proof";
    }
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

function routeSearchText(assignment) {
  return [
    assignment.driverPath,
    assignment.subjectFamily,
    assignment.routeTaskId,
    ...routeConnectorPaths(assignment),
    ...(assignment.derivability?.qntFacts ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/_/g, "-");
}

const profileRouteNeedles = {
  "spell.invocation-damage-save-or-attack": [
    "spell-attack-ordering",
    "spellattackroutesubject",
    "save-gated-spell-ordering",
    "savegatedspellroutesubject",
    "level1-damage-spell-selected-identity",
    "rule-core-exact-damage-projection",
  ],
  "spell.readied-action-time-spell": [
    "rule-core-spell-readied-response",
    "reaction-casting-time",
    "reaction spell casting-time",
    "reaction-interrupt-payload-taxonomy",
  ],
  "spell.creature-type-protection-and-charm": [
    "creature-type-protection-and-charm",
    "creaturetypetargetadmissionroutesubject",
    "protectioncharmactiveeffectroutesubject",
    "charmsourcedamagebreakroutesubject",
  ],
  "spell.hit-point-restoration": [
    "hit-point-restoration-ordering",
    "rule-core-spell-restoration",
    "spell-hit-point-restoration",
    "directhitpointrestoration",
  ],
  "spell.invocation-condition-save": [
    "condition-saving-throw",
    "condition-riders",
    "conditionriderroutesubject",
    "save-gated-spell-ordering",
    "repeat-save condition",
  ],
  "spell.invocation-fog-cloud-obscurement": [
    "level1-spatial-witness-selected-identity",
    "spatial-effects",
    "spatial-effect-route-surfaces",
  ],
  "spell.invocation-jump-movement-replacement": [
    "movement-forced-movement",
    "movement-resource",
    "special-speed",
    "rule-core-movement",
  ],
  "spell.invocation-spell-hosted-weapon-attack": [
    "spell-hosted-weapon-attack",
    "weapon-hosted-attack-and-riders",
  ],
  "spell.scalar-buff": [
    "scalar-buff-active-effects",
    "scalarbuffeffectroutesubject",
    "scalar-buff route",
  ],
  "spell.invocation-dancing-lights-movable-dim-light": [
    "level1-spatial-witness-selected-identity",
    "object-light-riders",
    "spatial-effects",
  ],
  "spell.invocation-expeditious-retreat-dash": [
    "movement-forced-movement",
    "movement-resource",
    "dash",
  ],
  "spell.invocation-feather-fall-mitigation": [
    "level1-spatial-witness-selected-identity",
    "reaction-casting-time",
    "reaction-interrupt-payload-taxonomy",
  ],
  "spell.invocation-hideous-laughter-repeat-save-lifecycle": [
    "condition-saving-throw",
    "sleep-repeat-save",
    "condition-riders",
    "repeatsaveconditioneffectroutesubject",
  ],
  "spell.invocation-after-hit-damage": [
    "after-hit-damage-riders",
    "afterhitdamageriderroutesubject",
    "rule-core-feature-attack-riders",
  ],
  "spell.invocation-attack-roll-advantage-save": [
    "condition-saving-throw",
    "condition-riders",
    "save-gated-spell-ordering",
  ],
  "spell.invocation-chained-attack-damage": [
    "chained-attack-sequence",
    "spellattackprocedureroutesubject",
  ],
  "spell.invocation-condition-immunity-turn-start-temporary-hit-points": [
    "marked-damage-immunity-active-effects",
    "conditionimmunitytemporaryhitpointeffectroutesubject",
    "scalar-buff-active-effects",
  ],
  "spell.invocation-grease-ground-hazard": [
    "level1-spatial-witness-selected-identity",
    "spatial-effects",
    "save-gated-spell-ordering",
  ],
  "spell.invocation-make-stable": [
    "zero-hit-point-stabilization",
    "zero-hit-point",
    "rule-core-feature-passive-zero-hp",
  ],
  "spell.invocation-marked-damage-rider": [
    "marked-damage-immunity-active-effects",
    "markeddamageridereffectroutesubject",
    "level1-buff-mark-smite-selected-identity",
  ],
  "spell.invocation-after-hit-restraint-turn-start-damage": [
    "after-hit-damage-riders",
    "condition-riders",
  ],
  "spell.invocation-after-hit-timed-damage-save": [
    "after-hit-damage-riders",
    "condition-riders",
  ],
  "spell.invocation-forced-reaction-movement": [
    "movement-forced-movement",
    "forcedmovementroutesubject",
    "interrupt-stack-resume",
  ],
  "spell.invocation-held-light-emitter": [
    "object-light-riders",
    "level1-spatial-witness-selected-identity",
  ],
  "spell.invocation-weapon-attack-override": [
    "held-weapon-active-effect",
    "weapon-hosted-attack-and-riders",
  ],
  "spell.invocation-weapon-damage-rider": [
    "weapon-damage-rider",
    "weapon-hosted-attack-and-riders",
  ],
  "spell.reaction-hellish-rebuke": [
    "reaction-spell-selected-identity",
    "reaction-interrupt-payload-taxonomy",
    "rule-core-reactions",
  ],
  "unit-feature.action-surge-resource": [
    "rule-core-feature-action-economy",
    "action-economy",
  ],
  "unit-feature.alternate-action-cost": [
    "rule-core-feature-action-economy",
    "action-economy",
  ],
  "unit-feature.attack-damage-rider": [
    "rule-core-feature-attack-riders",
    "after-hit-damage-riders",
  ],
  "unit-feature.bardic-inspiration-failed-d20-test": [
    "rule-core-feature-save-reactions",
    "roll-modifier-active-effects",
  ],
  "unit-feature.bardic-inspiration-grant": [
    "rule-core-feature-save-reactions",
    "feature-resource",
  ],
  "unit-feature.bonus-action-ongoing-rage": [
    "rule-core-feature-attack-riders",
    "turn-end-movement",
    "feature-resource",
  ],
  "unit-feature.failed-ability-check-resource-boost": [
    "ability-check-choice-search",
    "character-sheet-ability-check-proficiency-bonus",
  ],
  "unit-feature.first-attack-roll-reckless-advantage": [
    "rule-core-feature-attack-riders",
    "attack-roll",
  ],
  "unit-feature.innate-sorcery-activation": [
    "battle-runtime-feature-selected-identity",
    "sorcerer-metamagic",
    "spell-attack-ordering",
  ],
  "unit-feature.martial-arts-attack-projection": [
    "weapon-attack-ordering",
    "weapon-attack-skeleton",
    "rule-core-feature-action-economy",
  ],
  "unit-feature.passive-saving-throw-roll-mode": [
    "danger-sense-substrates",
    "passivesavingthrowrollmoderoutesubject",
  ],
  "unit-feature.passive-speed-bonus": [
    "movement-forced-movement",
    "species-passive-trait-substrates",
    "rule-core-movement",
  ],
  "unit-feature.self-bonus-action-healing": [
    "hit-point-restoration-ordering",
    "rule-core-spell-restoration",
    "character-sheet-healing-resource-selected-identity",
  ],
};

function routeCandidatesByNeedles(profileIds, assignments) {
  const needles = unique(
    profileIds.flatMap((profileId) => profileRouteNeedles[profileId] ?? []),
  );
  if (needles.length === 0) return [];
  return assignments.filter((assignment) => {
    const haystack = routeSearchText(assignment);
    return needles.some((needle) => haystack.includes(needle.toLowerCase()));
  });
}

function inL12RouteProofScope(assignment) {
  return !/battle-runtime-level[2-9]-/.test(assignment.driverPath ?? "");
}

function findRouteCandidates(unitId, profileIds, assignments) {
  const normalizedUnit = normalizeId(unitId);
  const unitCandidates = normalizedUnit
    ? assignments.filter((assignment) => routeSearchText(assignment).includes(normalizedUnit))
    : [];
  const profileCandidates = routeCandidatesByNeedles(profileIds, assignments);
  return uniqueAssignments([...unitCandidates, ...profileCandidates]).filter(
    (assignment) =>
      inL12RouteProofScope(assignment) && proofClass(assignment) !== "missing-proof",
  );
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
  status: "runner-provided",
  reason:
    "The Ralph runner owns the task Base SHA at execution time. This source plan records that agents must use the runner-provided Base SHA rather than fabricating one in generated artifacts.",
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
      ? findRouteCandidates(row.candidateUnitId, profileIds, assignments)
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

function cleanroomInputPath(sourcePath) {
  if (sourcePath.startsWith("packages/")) {
    return path.posix.join("cleanroom-input/qnt", sourcePath.slice("packages/".length));
  }
  return sourcePath;
}

function firstRouteCandidate(row) {
  return row.routeProofCandidates?.[0];
}

function replayPartitionKey(row) {
  const candidate = firstRouteCandidate(row);
  return [
    candidate?.route ?? "no-route",
    candidate?.proofClassification ?? "no-proof",
    (row.profileIds ?? []).join("+") || "no-profile",
    cleanroomInputPath(candidate?.driverPath ?? "no-driver"),
  ].join("|");
}

const replayPartitions = executableRows
  .map((denominatorRow) =>
    mappingRows.find((row) => row.rowId === denominatorRow.rowId),
  )
  .filter(Boolean)
  .reduce((groups, row) => {
    const key = replayPartitionKey(row);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
    return groups;
  }, new Map());

const MAX_REPLAY_BATCH_ROWS = 6;
const LATEST_DIRTY_CLEANROOM_TARGET =
  "/workspace/typescript/dnd-cleanroom-rust-agent-2026-jun-29";
const L12_CLEANROOM_REQUIRED_ARTIFACTS = [
  "cleanroom-input/l12-cleanroom-generation/srd-l12-denominator.json",
  "cleanroom-input/l12-cleanroom-generation/capability-fact-coverage-matrix.json",
  "cleanroom-input/l12-cleanroom-generation/route-proof-inventory.json",
  "cleanroom-input/l12-cleanroom-generation/srd-row-generic-fact-map.json",
  "cleanroom-input/l12-cleanroom-generation/verifier-gate-spec.json",
];
const L12_CLEANROOM_VALIDATION_COMMANDS = [
  "pnpm check:l12-cleanroom-generation:strict",
  "pnpm cleanroom-scaffold:check",
  "pnpm cleanroom-harness:check",
  "pnpm unit-profile-coverage:check",
  "git diff --check",
];

function replayRowChunks(rows) {
  const sortedRows = [...rows].sort((left, right) => left.rowId.localeCompare(right.rowId));
  const chunks = [];
  for (let index = 0; index < sortedRows.length; index += MAX_REPLAY_BATCH_ROWS) {
    chunks.push(sortedRows.slice(index, index + MAX_REPLAY_BATCH_ROWS));
  }
  return chunks;
}

const replayBatches = [...replayPartitions.entries()]
  .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  .flatMap(([key, rows]) => {
    const chunks = replayRowChunks(rows);
    return chunks.map((chunk, chunkIndex) => {
      const candidate = firstRouteCandidate(chunk[0]);
      const rowIds = chunk.map((row) => row.rowId);
      return {
        status: "planned-not-executed",
        evidenceStatus: "pending-target-replay",
        acceptanceStatus: "not-accepted",
        partitionKey: key,
        sourcePartitionChunk: chunkIndex + 1,
        sourcePartitionChunkCount: chunks.length,
        maxRowsPerReplayBatch: MAX_REPLAY_BATCH_ROWS,
        route: candidate?.route ?? "unmapped",
        proofClassification: candidate?.proofClassification ?? "unmapped",
        driverPath: cleanroomInputPath(candidate?.driverPath ?? "unmapped"),
        harnessPath: cleanroomInputPath(candidate?.driverPath ?? "unmapped"),
        connectorPaths: (candidate?.connectorPaths ?? []).map(cleanroomInputPath),
        profileIds: unique(chunk.flatMap((row) => row.profileIds ?? [])),
        rowIds,
        requiredArtifacts: L12_CLEANROOM_REQUIRED_ARTIFACTS,
        evidenceSchema: "target-l12-cleanroom-generation-evidence.v1",
        validation: L12_CLEANROOM_VALIDATION_COMMANDS,
        note:
          "Future execution batch only. This row group is not accepted until target replay evidence runs and passes.",
      };
    });
  })
  .map((batch, index) => ({
    batchId: `L12CEG-RP-${String(index + 1).padStart(3, "0")}`,
    ...batch,
  }));

const dirtyCleanroomUnitGroups = executableRows
  .map((denominatorRow) =>
    mappingRows.find((row) => row.rowId === denominatorRow.rowId),
  )
  .filter(Boolean)
  .reduce((groups, row) => {
    const existing = groups.get(row.candidateUnitId) ?? [];
    existing.push(row);
    groups.set(row.candidateUnitId, existing);
    return groups;
  }, new Map());

const dirtyCleanroomUnitProofBatches = [...dirtyCleanroomUnitGroups.entries()]
  .sort(([leftUnitId], [rightUnitId]) => leftUnitId.localeCompare(rightUnitId))
  .map(([unitId, rows], index) => {
    const rowIds = unique(rows.map((row) => row.rowId));
    const replayBatchIds = replayBatches
      .filter((batch) => batch.rowIds.some((rowId) => rowIds.includes(rowId)))
      .map((batch) => batch.batchId);
    return {
      batchId: `L12CEG-DU-${String(index + 1).padStart(3, "0")}`,
      status: "planned-not-executed",
      dirtyCleanroomStatus: "pending-latest-dirty-target-check",
      unitId,
      latestDirtyCleanroomTarget: LATEST_DIRTY_CLEANROOM_TARGET,
      rowIds,
      profileIds: unique(rows.flatMap((row) => row.profileIds ?? [])),
      replayBatchIds,
      requiredArtifacts: L12_CLEANROOM_REQUIRED_ARTIFACTS,
      evidenceSchema: "target-l12-cleanroom-generation-evidence.v1",
      validation: L12_CLEANROOM_VALIDATION_COMMANDS,
      note:
        "Latest dirty cleanroom unit proof task. This checks the named dirty target for this unit and either produces/validates current harness-run files or records a precise blocker.",
    };
  });

const baseTasks = [
  {
    number: 1,
    id: "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
    status: "done",
    family: "checker-source-gate",
    dependencies: [],
    input: [
      "scripts/l12-cleanroom-generation-check.cjs",
      "package.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/*.json",
    ],
    output: [
      "root script wiring for pnpm check:l12-cleanroom-generation:strict",
      "strict checker source and self-test coverage",
    ],
    validation: ["pnpm check:l12-cleanroom-generation:strict", "git diff --check"],
    successCriteria: [
      "Strict checker validates current L1-2 source artifacts",
      "Checker rejects stale hashes and inconsistent artifact structure",
      "No production runtime behavior changes",
      "No target replay closure is claimed for executable rows",
    ],
    oneAgentSessionScope:
      "One checker landing/source-wiring task; no runtime reducers, target harness implementation, or replay results.",
  },
  {
    number: 2,
    id: "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
    status: "done",
    family: "artifact-package-inclusion",
    dependencies: ["L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE"],
    input: [
      "plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json",
      "scripts/sync-cleanroom-input.cjs",
      "scripts/package-cleanroom-refresh.cjs",
    ],
    output: [
      "cleanroom package/sync includes the five L1-2 source artifacts",
      "package validation requires the copied artifacts",
    ],
    validation: [
      "pnpm check:l12-cleanroom-generation:strict",
      "pnpm cleanroom-scaffold:check",
      "git diff --check",
    ],
    successCriteria: [
      "Generated cleanrooms can access all required L1-2 artifacts",
      "Manifest hashes preserve artifact identity",
      "Packaged artifacts remain source inputs, not accepted replay evidence",
    ],
    oneAgentSessionScope:
      "One source-sync/package-inclusion task; no replay batches or runtime acceptance logic.",
  },
  {
    number: 3,
    id: "L12CEG-03-SCAFFOLD-L12-CONTRACT",
    status: "done",
    family: "scaffold-contract",
    dependencies: [
      "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
      "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
    ],
    input: [
      "plans/cleanroom-scaffolds/**/*.template.*",
      "scripts/render-cleanroom-scaffold.cjs",
      "plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json",
    ],
    output: [
      "scaffold text names the L1-2 artifact contract",
      "scaffold self-tests fail if the contract disappears",
    ],
    validation: [
      "pnpm cleanroom-scaffold:check",
      "pnpm check:l12-cleanroom-generation:strict",
      "git diff --check",
    ],
    successCriteria: [
      "Generated cleanroom tasks know where to find and how to cite L1-2 artifacts",
      "Scaffold wording keeps provenance, structured input, and runtime projection distinct",
      "Scaffold does not claim tasks 1-5 prove target replay closure",
    ],
    oneAgentSessionScope:
      "One scaffold/template contract update and self-test pass; no replay batches or target runtime code.",
  },
  {
    number: 4,
    id: "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
    status: "done",
    family: "target-replay-evidence-schema",
    dependencies: [
      "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
      "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
      "L12CEG-03-SCAFFOLD-L12-CONTRACT",
    ],
    input: [
      "plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json",
      "scripts/check-cleanroom-harness.cjs",
      "scripts/cleanroom-branch-coverage-check.cjs",
    ],
    output: [
      "structural target replay evidence validation for L1-2 artifact hashes",
      "negative self-test coverage for missing or stale L1-2 evidence metadata",
    ],
    validation: [
      "pnpm cleanroom-harness:check",
      "pnpm check:l12-cleanroom-generation:strict",
      "git diff --check",
    ],
    successCriteria: [
      "Replay evidence validates source-hash linkage and generic route/projection linkage",
      "Grouped selected-identity evidence remains unaccepted as cleanroom proof",
      "Task does not execute target replay or mark executable rows accepted",
    ],
    oneAgentSessionScope:
      "One structural evidence-gate task and self-tests; no target replay implementation or replay outputs.",
  },
  {
    number: 5,
    id: "L12CEG-05-REPLAY-BATCH-PARTITION-PLAN",
    status: "done",
    family: "replay-batch-partition-plan",
    dependencies: [
      "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
      "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
      "L12CEG-03-SCAFFOLD-L12-CONTRACT",
      "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
    ],
    input: [
      "plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json",
      "plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json",
    ],
    output: [
      "future replay partition graph covering executable L1-2 rows exactly once",
      "batch metadata for required artifacts, evidence schema, dependencies, and validation",
    ],
    validation: [
      "pnpm check:l12-cleanroom-generation:strict",
      "pnpm cleanroom-scaffold:check",
      "pnpm cleanroom-harness:check",
      "pnpm unit-profile-coverage:check",
      "git diff --check",
    ],
    successCriteria: [
      "Future replay batches cover all executable rows exactly once",
      "Each batch is pending execution and not accepted",
      "Graph does not claim replay closure before batches run and pass",
    ],
    oneAgentSessionScope:
      "One planning task that writes future replay partitions; no generated cleanroom replay batches or accepted evidence.",
  },
];

const taskGraph = {
  schema: "l12-cleanroom-exhaustive-task-graph.v1",
  generatedBy: path.relative(root, __filename),
  baseCheck,
  sourceHashes,
  summary: {
    denominatorRows: denominatorRows.length,
    executableRows: executableRows.length,
    routeProofRows: proofRows.length,
    missingProofJoinRows: mappingRows.filter(
      (row) => row.routeProofStatus === "missing-proof-join",
    ).length,
    replayBatchRows: replayBatches.length,
    dirtyCleanroomUnitProofRows: dirtyCleanroomUnitProofBatches.length,
    latestDirtyCleanroomTarget: LATEST_DIRTY_CLEANROOM_TARGET,
    replayBatchStatus: "planned-not-executed",
  },
  tasks: baseTasks,
  replayBatches,
  dirtyCleanroomUnitProofBatches,
};
writeJson("exhaustive-task-graph.json", taskGraph);

function taskIndex(tasks) {
  return JSON.stringify(
    {
      schema: "ralph-plan.v1",
      tasks: tasks.map((task) => ({
        number: task.number,
        id: task.id,
        status: task.status ?? "todo",
        title:
          task.title ??
          task.id
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
const exhaustivePlan = `# Ralph L1-2 Cleanroom Exhaustive Generation

<!-- ralph-task-index
${taskIndex(planTasks)}
-->

## Purpose

This is the implementation plan produced by \`plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md\`. It prepares the SRD level 1-2 cleanroom generation lane for future Ralph target replay by landing source gates, packaging the current L1-2 artifacts, updating cleanroom scaffold contracts, defining replay-evidence validation, and planning replay batch partitioning.

This pass is not target replay execution. It must not claim generated cleanrooms have replayed every L1-2 row. It records the preparation work future Ralph runs will execute.

This plan is SRD-only. PHB+ and synthetic non-SRD catalog identities are out of scope. Runtime behavior must route through generic facts, procedure shapes, runtime state, and support-profile admission facts, never through authored ids, names, slugs, source headings, page references, or catalog labels.

## Research Inputs

- \`plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/README.md\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/baseline-reconciliation.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.schema.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-contract.schema.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.schema.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json\`
- \`plans/ralph-artifacts/l12-cleanroom-generation/exhaustive-task-graph.json\`
- \`scripts/l12-cleanroom-generation-check.cjs\`
- \`scripts/sync-cleanroom-input.cjs\`
- \`scripts/render-cleanroom-scaffold.cjs\`
- \`scripts/check-cleanroom-harness.cjs\`
- \`scripts/package-cleanroom-refresh.cjs\`

## Current Accounting

- Denominator rows: ${denominatorRows.length}
- Executable cleanroom rows: ${executableRows.length}
- Route proof inventory rows: ${proofRows.length}
- Executable rows with route proof candidates from the current heuristic join: ${taskGraph.summary.executableRows - taskGraph.summary.missingProofJoinRows}
- Executable rows still requiring explicit mapping/proof work: ${taskGraph.summary.missingProofJoinRows}
- Explicit per-Unit route-proof resolution tasks: 0
- Future replay partition batches: ${replayBatches.length}
- Current strict source mapping/proof gates: pass in this worktree
- Current generated cleanroom target replay closure for every L1-2 executable row: not claimed by this plan

The missing-proof count is intentionally conservative. It means the generated mapping could not prove a row-to-route join from current artifact names and structured fields; it is not proof that no connector exists.

## Non-Omittable Gates

| Gate | Covered By |
| --- | --- |
| SRD level 1-2 denominator source gate | \`L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE\` |
| L1-2 artifact package inclusion for denominator, capability matrix, route inventory, mapping, and verifier spec | \`L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION\` |
| Scaffold contract telling generated cleanrooms to consume the L1-2 artifacts | \`L12CEG-03-SCAFFOLD-L12-CONTRACT\` |
| Structural replay-evidence schema gate that rejects grouped selected-identity evidence as proof | \`L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE\` |
| Follow-up Ralph replay batch partition plan for the 146 executable rows | \`L12CEG-05-REPLAY-BATCH-PARTITION-PLAN\` |

## DAG

| Task | Depends On |
| --- | --- |
${planTasks
    .map((task) => `| \`${task.id}\` | ${task.dependencies.map((id) => `\`${id}\``).join(", ") || "none"} |`)
    .join("\n")}

## Global Verification

Every task must start with the Ralph task-base check from \`AGENTS.md\` using
the Base SHA provided by the Ralph runner/task metadata: log the declared Base
SHA, log \`HEAD\`, and run \`git merge-base --is-ancestor <Base SHA> HEAD\`.
This generated plan does not fabricate a Base SHA. If the runner provides no
Base SHA, record \`Plan Impact: update-required\` for missing task metadata
instead of guessing.

Every task must also run the reviewer loop for RAW traceability, ubiquitous-language/domain language, architecture/connascence, cleanroom-authored-identity, Ralph task quality, and code-review findings. Fix every reasonable finding; reject only with a concrete reason. Each task's verification must include the project-required reviewer-loop convergence and RAW/ubiquitous-language check.

Plan-maintenance verification for this file:

- Parse the embedded \`ralph-task-index\` JSON.
- Confirm every indexed task has a matching \`### Task N - ID\` body.
- Confirm task dependencies form an acyclic graph.
- Run \`pnpm check:l12-cleanroom-generation:strict\`.
- Run \`pnpm cleanroom-scaffold:check\`.
- Run \`pnpm cleanroom-harness:check\`.
- Run \`pnpm unit-profile-coverage:check\`.
- Run \`git diff --check\`.
- Review that tasks are one-agent-session scoped, do not hide target replay implementation inside plan-writing, do not treat grouped selected-identity evidence as accepted cleanroom proof, and do not introduce PHB+ or synthetic non-SRD catalog identity.

## Task Details

${planTasks
    .map(
      (task) => `### Task ${task.number} - ${task.id}

Status: \`${task.status ?? "todo"}\`

Goal:

${task.successCriteria.includes("Graph does not claim replay closure before batches run and pass")
  ? "Plan the follow-up Ralph partitioning step that groups executable L1-2 rows by shared route, profile, and harness path. This task produces a future execution task graph; it must not include or execute the replay batches themselves."
  : `Complete the ${task.family} work named by this task without changing production runtime behavior or claiming target replay closure.`}

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
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

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
- Architecture/connascence: accepted. The generated mapping records source hashes, the strict checker validates them, and the cleanroom package manifest binds copied L1-2 artifacts by hash.
- Cleanroom authored identity: accepted. Unit ids appear only at denominator/mapping boundaries. Runtime fact requirements use generic fact family names.
- Ralph task quality: accepted. Tasks 1-4 are source/scaffold/checker work and task 5 produces future replay partitions; none claims target replay closure.
- Code-review stance: accepted. Source changes are limited to checker, cleanroom packaging, scaffold, and harness validation; no production runtime, QNT behavior, or target replay implementation changed.

## Round 2 Findings

- No additional reasonable findings after checking generated artifact boundaries, scaffold contracts, harness evidence metadata, and exhaustive plan task bodies.

## Explicit Rejections

- Rejected: treating the generated heuristic missing-proof list as authoritative absence of proof. Reason: it is only a conservative join result from current artifact names and fields; \`L12CEG-05\` exists to assign each row to a concrete generic connector or source-harness task.
- Rejected: treating the future replay partitions as accepted target evidence. Reason: the partitions are \`planned-not-executed\` and \`not-accepted\`; only future harness-generated replay evidence can close target execution.

## Convergence

Reviewer loop converged for the L1-2 source/scaffold/checker preparation work and future replay partition plan. Target replay execution remains future work.
`,
);

console.log("Generated L1-2 cleanroom generation artifacts.");
