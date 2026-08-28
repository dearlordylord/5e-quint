#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");
const { validateRawCoverageOwnerClaims } = require("./raw-coverage-check.cjs");

const root = process.cwd();
const pressurePath = path.join(
  root,
  "plans/stat-block-procedure-pressure/inventory.json",
);
const outputDirectory = path.join(
  root,
  "plans/stat-block-execution-reconciliation",
);
const inventoryPath = path.join(outputDirectory, "inventory.json");
const reportPath = path.join(outputDirectory, "REPORT.md");
const profilesPath = path.join(
  root,
  "plans/unit-profile-coverage/profiles.jsonl",
);
const requirementsPath = path.join(
  root,
  "plans/raw-coverage/requirements.jsonl",
);
const obligationsPath = path.join(
  root,
  "plans/rules-kernel-coverage/obligations.jsonl",
);
const rawTrackerClaimsPath = path.join(
  root,
  "plans/raw-coverage/tracker-claims.jsonl",
);
const profileTaskClaimsPath = path.join(
  root,
  "plans/unit-profile-coverage/task-claims.jsonl",
);
const evidenceClaimsPath = path.join(
  root,
  "plans/raw-coverage/evidence-claims.jsonl",
);
const qntOwnerRolesPath = path.join(
  root,
  "plans/rules-kernel-coverage/qnt-owner-roles.jsonl",
);
const generatorReadinessPath = path.join(
  root,
  "plans/rules-kernel-coverage/generator-readiness.jsonl",
);

const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

const pressureDispositionKinds = new Set([
  "executable",
  "missingOwner",
  "textOnly",
  "tableOwned",
  "malformed",
]);

const semanticFamiliesByPressureOwner = new Map([
  ["battle-runtime Stat Block Action lifecycle", "stat-block.action-lifecycle"],
  [
    "battle-runtime Stat Block Bonus Action lifecycle",
    "stat-block.bonus-action-lifecycle",
  ],
  [
    "battle-runtime Stat Block Legendary Action lifecycle",
    "stat-block.legendary-action-lifecycle",
  ],
  [
    "battle-runtime generic Stat Block attack procedure",
    "stat-block.attack-procedure",
  ],
  [
    "battle-runtime generic Stat Block Multiattack control",
    "stat-block.multiattack",
  ],
  [
    "battle-runtime Stat Block Multiattack dispatch graph",
    "stat-block.multiattack",
  ],
  ["battle-runtime Stat Block resource pool", "stat-block.resource-lifecycle"],
  ["battle-runtime Stat Block resource graph", "stat-block.resource-lifecycle"],
  [
    "battle-runtime Legendary Action resource pool",
    "stat-block.legendary-action-lifecycle",
  ],
  [
    "battle-runtime Stat Block trait attack-roll mode",
    "stat-block.attack-procedure",
  ],
  [
    "battle-runtime delegated Bonus Action procedure",
    "stat-block.bonus-action-lifecycle",
  ],
]);

const semanticFamilyDefinitions = [
  {
    id: "stat-block.action-lifecycle",
    title: "Stat Block Action lifecycle",
    state: "executable",
    rawRequirementIds: ["RAW-STAT-BLOCK-ACTION-LIFECYCLE-001"],
    profileId: "stat-block.action-lifecycle",
    obligationId: "BATTLE.STAT_BLOCK.ACTION_LIFECYCLE",
  },
  {
    id: "stat-block.bonus-action-lifecycle",
    title: "Stat Block Bonus Action lifecycle",
    state: "executable",
    rawRequirementIds: ["RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001"],
    profileId: "stat-block.bonus-action-lifecycle",
    obligationId: "BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE",
  },
  {
    id: "stat-block.legendary-action-lifecycle",
    title: "Stat Block Legendary Action lifecycle",
    state: "executable",
    rawRequirementIds: ["RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001"],
    profileId: "stat-block.legendary-action-lifecycle",
    obligationId: "BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE",
  },
  {
    id: "stat-block.attack-procedure",
    title: "Stat Block attack and damage procedure",
    state: "executable",
    rawRequirementIds: [
      "RAW-STAT-BLOCK-ATTACK-PROCEDURE-001",
      "RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001",
    ],
    profileId: "stat-block.attack-procedure",
    obligationId: "BATTLE.STAT_BLOCK.ATTACK_PROCEDURE",
    formalEvidenceState: "needs-qnt-owner",
    proofFollowUpIssueNumber: 427,
  },
  {
    id: "stat-block.multiattack",
    title: "Stat Block Multiattack control and dispatch",
    state: "executable",
    rawRequirementIds: ["RAW-STAT-BLOCK-MULTIATTACK-001"],
    profileId: "stat-block.multiattack",
    obligationId: "BATTLE.STAT_BLOCK.MULTIATTACK",
  },
  {
    id: "stat-block.resource-lifecycle",
    title: "Stat Block limited-use and recharge resource lifecycle",
    state: "executable",
    rawRequirementIds: ["RAW-STAT-BLOCK-LIMITED-USAGE-001"],
    profileId: "stat-block.resource-lifecycle",
    obligationId: "BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE",
  },
];

const formallyCoveredFamilyIds = new Set([
  "stat-block.action-lifecycle",
  "stat-block.bonus-action-lifecycle",
  "stat-block.legendary-action-lifecycle",
  "stat-block.multiattack",
  "stat-block.resource-lifecycle",
]);

const missingOwnerDefinitions = [
  {
    rank: 1,
    id: "stat-block.spell-invocation.unrestricted",
    title: "Unrestricted Stat Block spell invocation",
    issueNumber: 418,
    rawRequirementIds: ["RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001"],
    profileId: "stat-block.spell-invocation.unrestricted",
    obligationId: "BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED",
  },
  {
    rank: 2,
    id: "stat-block.spellcasting.procedure",
    title: "Stat Block spellcasting procedure",
    issueNumber: 419,
    rawRequirementIds: ["RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001"],
    profileId: "stat-block.spellcasting.procedure",
    obligationId: "BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE",
  },
  {
    rank: 3,
    id: "stat-block.spellcasting.limited-group",
    title: "Limited-use Stat Block spellcasting group",
    issueNumber: 420,
    rawRequirementIds: ["RAW-STAT-BLOCK-SPELLCASTING-LIMITED-GROUP-001"],
    profileId: "stat-block.spellcasting.limited-group",
    obligationId: "BATTLE.STAT_BLOCK.SPELLCASTING_LIMITED_GROUP",
  },
  {
    rank: 4,
    id: "stat-block.save-procedure",
    title: "Stat Block save-gated procedure",
    issueNumber: 421,
    rawRequirementIds: ["RAW-STAT-BLOCK-SAVE-PROCEDURE-001"],
    profileId: "stat-block.save-procedure",
    obligationId: "BATTLE.STAT_BLOCK.SAVE_PROCEDURE",
  },
  {
    rank: 5,
    id: "stat-block.spellcasting.at-will-group",
    title: "At-will Stat Block spellcasting group",
    issueNumber: 422,
    rawRequirementIds: ["RAW-STAT-BLOCK-SPELLCASTING-AT-WILL-GROUP-001"],
    profileId: "stat-block.spellcasting.at-will-group",
    obligationId: "BATTLE.STAT_BLOCK.SPELLCASTING_AT_WILL_GROUP",
  },
  {
    rank: 6,
    id: "stat-block.reaction-lifecycle",
    title: "Stat Block reaction trigger and resource lifecycle",
    issueNumber: 423,
    rawRequirementIds: ["RAW-STAT-BLOCK-REACTION-LIFECYCLE-001"],
    profileId: "stat-block.reaction-lifecycle",
    obligationId: "BATTLE.STAT_BLOCK.REACTION_LIFECYCLE",
  },
  {
    rank: 7,
    id: "stat-block.spell-invocation.restricted",
    title: "Restricted Stat Block spell invocation",
    issueNumber: 424,
    rawRequirementIds: ["RAW-STAT-BLOCK-SPELL-INVOCATION-RESTRICTED-001"],
    profileId: "stat-block.spell-invocation.restricted",
    obligationId: "BATTLE.STAT_BLOCK.SPELL_INVOCATION_RESTRICTED",
  },
  {
    rank: 8,
    id: "stat-block.attack-additional-effect",
    title: "Typed Stat Block attack additional-effect continuation",
    issueNumber: 425,
    rawRequirementIds: ["RAW-STAT-BLOCK-ATTACK-ADDITIONAL-EFFECT-001"],
    profileId: "stat-block.attack-additional-effect",
    obligationId: "BATTLE.STAT_BLOCK.ATTACK_ADDITIONAL_EFFECT",
  },
  {
    rank: 9,
    id: "stat-block.standard-action-option",
    title: "Stat Block standard action-option delegation",
    issueNumber: 426,
    rawRequirementIds: ["RAW-STAT-BLOCK-STANDARD-ACTION-OPTION-001"],
    profileId: "stat-block.standard-action-option",
    obligationId: "BATTLE.STAT_BLOCK.STANDARD_ACTION_OPTION",
  },
].map((definition) => ({ ...definition, state: "missingOwner" }));

const closedFamilyDefinitions = [
  {
    id: "stat-block.text-only.procedure",
    title: "Text-only Stat Block procedure presentation",
    state: "textOnly",
  },
  {
    id: "stat-block.text-only.trait",
    title: "Text-only Stat Block trait presentation",
    state: "textOnly",
  },
  {
    id: "stat-block.table-owned.legendary-lair-presence",
    title: "Table-owned lair presence for Legendary Action uses",
    state: "tableOwned",
  },
  {
    id: "stat-block.table-owned.legendary-lair-section",
    title: "Table-owned lair presence for the Legendary Action section",
    state: "tableOwned",
  },
  {
    id: "stat-block.malformed",
    title: "Malformed Stat Block structural occurrence",
    state: "malformed",
  },
];

const familyDefinitions = [
  ...semanticFamilyDefinitions,
  ...missingOwnerDefinitions,
  ...closedFamilyDefinitions,
];

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} repeats ${value}.`);
    seen.add(value);
  }
}

function proposalMembership(pressure) {
  const memberships = new Map();
  assertUnique(
    pressure.capabilityProposals.map(({ rank }) => rank),
    "Capability proposal rank",
  );
  for (const proposal of pressure.capabilityProposals) {
    for (const rowId of proposal.memberRowIds) {
      if (memberships.has(rowId)) {
        fail(`Missing-owner row ${rowId} belongs to multiple proposals.`);
      }
      memberships.set(rowId, proposal.rank);
    }
  }
  return memberships;
}

function closedFamilyId(occurrence) {
  if (occurrence.disposition.kind === "malformed") {
    return "stat-block.malformed";
  }
  if (occurrence.disposition.kind === "textOnly") {
    return occurrence.kind === "trait"
      ? "stat-block.text-only.trait"
      : "stat-block.text-only.procedure";
  }
  if (occurrence.disposition.kind === "tableOwned") {
    return occurrence.kind === "section"
      ? "stat-block.table-owned.legendary-lair-section"
      : "stat-block.table-owned.legendary-lair-presence";
  }
  fail(`No closed family for ${occurrence.rowId}.`);
}

function familyIdForOccurrence(occurrence, missingMemberships) {
  if (!pressureDispositionKinds.has(occurrence.disposition.kind)) {
    fail(
      `Occurrence ${occurrence.rowId} has unknown disposition ${occurrence.disposition.kind}.`,
    );
  }
  if (occurrence.disposition.kind === "executable") {
    const familyId = semanticFamiliesByPressureOwner.get(
      occurrence.disposition.owner,
    );
    if (familyId === undefined) {
      fail(
        `Executable occurrence ${occurrence.rowId} has unmapped owner ${occurrence.disposition.owner}.`,
      );
    }
    return familyId;
  }
  if (occurrence.disposition.kind === "missingOwner") {
    const rank = missingMemberships.get(occurrence.rowId);
    const family = missingOwnerDefinitions.find(
      (definition) => definition.rank === rank,
    );
    if (family === undefined) {
      fail(`Missing-owner occurrence ${occurrence.rowId} has no proposal.`);
    }
    return family.id;
  }
  return closedFamilyId(occurrence);
}

function buildReconciliation(pressure, requirePopulatedFamilies = true) {
  if (
    pressure.kind !== "statBlockProcedurePressureReport" ||
    pressure.recordCount !== 330 ||
    pressure.occurrenceCount !== 2602
  ) {
    fail("#350 pressure inventory denominator or kind changed.");
  }
  assertUnique(
    pressure.occurrences.map(({ rowId }) => rowId),
    "Pressure row ID",
  );
  assertUnique(
    familyDefinitions.map(({ id }) => id),
    "Reconciliation family ID",
  );
  const missingMemberships = proposalMembership(pressure);
  const assignments = pressure.occurrences.map((occurrence) => ({
    rowId: occurrence.rowId,
    familyId: familyIdForOccurrence(occurrence, missingMemberships),
  }));
  assertUnique(
    assignments.map(({ rowId }) => rowId),
    "Reconciled row ID",
  );

  const occurrenceByRowId = new Map(
    pressure.occurrences.map((occurrence) => [occurrence.rowId, occurrence]),
  );
  const families = familyDefinitions.map((definition) => {
    const memberRowIds = assignments
      .filter(({ familyId }) => familyId === definition.id)
      .map(({ rowId }) => rowId);
    const statBlockCount = new Set(
      memberRowIds.map(
        (rowId) => occurrenceByRowId.get(rowId).witness.recordOrdinal,
      ),
    ).size;
    return {
      ...definition,
      occurrenceCount: memberRowIds.length,
      statBlockCount,
      memberRowIds,
    };
  });

  const emptyFamilies = families.filter(
    (family) => family.occurrenceCount === 0 && family.state !== "malformed",
  );
  if (requirePopulatedFamilies && emptyFamilies.length > 0) {
    fail(
      `Reconciliation contains empty families: ${emptyFamilies.map(({ id }) => id).join(", ")}.`,
    );
  }
  const assignedRowCount = families.reduce(
    (total, family) => total + family.occurrenceCount,
    0,
  );
  if (assignedRowCount !== pressure.occurrenceCount) {
    fail(
      `Reconciliation assigns ${assignedRowCount}/${pressure.occurrenceCount} rows.`,
    );
  }
  const stateCounts = Object.fromEntries(
    [...pressureDispositionKinds].map((state) => [
      state,
      families
        .filter((family) => family.state === state)
        .reduce((total, family) => total + family.occurrenceCount, 0),
    ]),
  );
  for (const [state, count] of Object.entries(stateCounts)) {
    if (count !== pressure.dispositionCounts[state]) {
      fail(
        `Reconciliation assigns ${count} ${state} rows; #350 reports ${pressure.dispositionCounts[state]}.`,
      );
    }
  }

  return {
    kind: "statBlockExecutionReconciliation",
    source: {
      kind: pressure.kind,
      path: "plans/stat-block-procedure-pressure/inventory.json",
      recordCount: pressure.recordCount,
      occurrenceCount: pressure.occurrenceCount,
    },
    stateCounts,
    assignments,
    families,
  };
}

function readCoverageJoinInputs() {
  return {
    requirements: readJsonl(requirementsPath),
    profiles: readJsonl(profilesPath),
    obligations: readJsonl(obligationsPath),
    rawTrackerClaims: readJsonl(rawTrackerClaimsPath),
    profileTaskClaims: readJsonl(profileTaskClaimsPath),
    evidenceClaims: readJsonl(evidenceClaimsPath),
    qntOwnerRoles: readJsonl(qntOwnerRolesPath),
    generatorReadiness: readJsonl(generatorReadinessPath),
  };
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    expected.every((member) => actual.includes(member))
  );
}

function verificationOwnerKey(owner) {
  return `${owner.kind}:${owner.ownerPath}`;
}

function sameVerificationOwners(actual, expected) {
  return sameMembers(
    actual.map(verificationOwnerKey),
    expected.map(verificationOwnerKey),
  );
}

function memberUnion(collections) {
  return [...new Set(collections.flat())];
}

function verificationOwnerUnion(collections) {
  return [
    ...new Map(
      collections.flat().map((owner) => [verificationOwnerKey(owner), owner]),
    ).values(),
  ];
}

function evidenceMetricForVerificationKind(kind) {
  if (kind === "qnt-proof") return "qnt-proof";
  if (kind === "focused-mbt") return "runtime-parity";
  if (kind === "runtime-test") return "runtime-test";
  fail(`Unknown verification owner kind ${kind}.`);
}

function validateRetiredExecutionIdentities(texts) {
  for (const [ownerPath, text] of Object.entries(texts)) {
    if (/\bQMBT6\b/.test(text)) {
      fail(`Retired omnibus identity QMBT6 survives in ${ownerPath}.`);
    }
  }
}

function currentExecutionIdentityTexts() {
  const ownerPaths = [
    "packages/battle-runtime/rule-core-stat-block-multiattack.mbt.qnt",
    "packages/battle-runtime/src/rule-core-stat-block-multiattack.mbt.test.ts",
  ];
  return Object.fromEntries(
    ownerPaths.map((ownerPath) => [
      ownerPath,
      fs.readFileSync(path.join(root, ownerPath), "utf8"),
    ]),
  );
}

function assertFamilyOwnerSeparation(reconciliation, profiles) {
  const coveredFamilies = reconciliation.families
    .filter((family) => formallyCoveredFamilyIds.has(family.id))
    .map((family) => ({
      family,
      profile: profiles.get(family.profileId),
    }));
  for (const { family, profile } of coveredFamilies) {
    if (profile === undefined) {
      fail(`${family.id} references missing profile ${family.profileId}.`);
    }
  }
  for (const [index, left] of coveredFamilies.entries()) {
    for (const right of coveredFamilies.slice(index + 1)) {
      const sharedQntOwners = left.profile.qntOwners.filter((ownerPath) =>
        right.profile.qntOwners.includes(ownerPath),
      );
      if (sharedQntOwners.length > 0) {
        fail(
          `${left.family.id} and ${right.family.id} share forbidden semantic owner ${sharedQntOwners[0]}.`,
        );
      }
      const leftProofOwners = left.profile.verificationOwners
        .filter((owner) => owner.kind === "qnt-proof")
        .map((owner) => owner.ownerPath);
      const rightProofOwners = right.profile.verificationOwners
        .filter((owner) => owner.kind === "qnt-proof")
        .map((owner) => owner.ownerPath);
      const sharedProofOwners = leftProofOwners.filter((ownerPath) =>
        rightProofOwners.includes(ownerPath),
      );
      if (sharedProofOwners.length > 0) {
        fail(
          `${left.family.id} and ${right.family.id} share forbidden qnt-proof owner ${sharedProofOwners[0]}.`,
        );
      }
    }
  }
}

function validateCoverageJoin(
  reconciliation,
  inputs = readCoverageJoinInputs(),
) {
  validateRawCoverageOwnerClaims(inputs.requirements, root);
  const requirements = new Map(
    inputs.requirements.map((requirement) => [requirement.id, requirement]),
  );
  const profiles = new Map(
    inputs.profiles.map((profile) => [profile.id, profile]),
  );
  const obligations = new Map(
    inputs.obligations.map((obligation) => [obligation.id, obligation]),
  );
  const rawTrackerClaims = new Map(
    inputs.rawTrackerClaims.map((claim) => [claim.trackerId, claim]),
  );
  const profileTaskClaims = new Map(
    inputs.profileTaskClaims.map((claim) => [claim.taskId, claim]),
  );
  const evidenceClaims = new Map(
    inputs.evidenceClaims.map((claim) => [claim.evidenceId, claim]),
  );
  const qntOwnerRoles = new Map(
    inputs.qntOwnerRoles.map((owner) => [owner.ownerPath, owner.role]),
  );
  const generatorReadiness = new Map(
    inputs.generatorReadiness.map((readiness) => [
      readiness.obligationId,
      readiness,
    ]),
  );
  if (requirements.has("RAW-QCORE11-STAT-BLOCK-CONTROLS-001")) {
    fail("Retired catch-all RAW-QCORE11-STAT-BLOCK-CONTROLS-001 still exists.");
  }
  if (profiles.has("stat-block.attack-control")) {
    fail("Retired catch-all profile stat-block.attack-control still exists.");
  }
  if (obligations.has("BATTLE.STAT_BLOCK.ATTACK_CONTROL")) {
    fail(
      "Retired catch-all obligation BATTLE.STAT_BLOCK.ATTACK_CONTROL still exists.",
    );
  }
  assertFamilyOwnerSeparation(reconciliation, profiles);
  for (const family of reconciliation.families) {
    for (const requirementId of family.rawRequirementIds ?? []) {
      if (!requirements.has(requirementId)) {
        fail(
          `${family.id} references missing RAW requirement ${requirementId}.`,
        );
      }
    }
    if (family.profileId === undefined) continue;
    const profile = profiles.get(family.profileId);
    if (profile === undefined) {
      fail(`${family.id} references missing profile ${family.profileId}.`);
    }
    const obligation = obligations.get(family.obligationId);
    if (obligation === undefined) {
      fail(
        `${family.id} references missing obligation ${family.obligationId}.`,
      );
    }
    const familyRequirements = (family.rawRequirementIds ?? []).map((id) =>
      requirements.get(id),
    );
    if (familyRequirements.length > 0) {
      const familyQntOwners = memberUnion(
        familyRequirements.map((requirement) => requirement.qntOwners),
      );
      const familyRuntimeOwners = memberUnion(
        familyRequirements.map((requirement) => requirement.runtimeOwners),
      );
      const familyVerificationOwners = verificationOwnerUnion(
        familyRequirements.map((requirement) => requirement.verificationOwners),
      );
      if (
        !sameMembers(profile.qntOwners, familyQntOwners) ||
        !sameMembers(obligation.qntOwners, familyQntOwners) ||
        !sameMembers(profile.runtimeOwners, familyRuntimeOwners) ||
        !sameMembers(obligation.runtimeOwners, familyRuntimeOwners) ||
        !sameVerificationOwners(
          profile.verificationOwners,
          familyVerificationOwners,
        ) ||
        !sameVerificationOwners(
          obligation.parityWitnesses,
          familyVerificationOwners.filter(
            (owner) => owner.kind !== "qnt-proof",
          ),
        )
      ) {
        fail(`${family.id} cross-layer owner join is not exact.`);
      }
    }
    if (family.state === "executable") {
      if (
        profile.runtimeOwners.length === 0 ||
        profile.verificationOwners.length === 0 ||
        obligation.runtimeOwners.length === 0 ||
        familyRequirements.some(
          (requirement) => requirement.runtimeOwners.length === 0,
        )
      ) {
        fail(`${family.id} executable runtime ownership is incomplete.`);
      }
      if (family.formalEvidenceState === "needs-qnt-owner") {
        const trackerId = `GH-${family.proofFollowUpIssueNumber}`;
        const rawTrackerClaim = rawTrackerClaims.get(trackerId);
        const profileTaskClaim = profileTaskClaims.get(trackerId);
        if (
          profile.qntOwnershipStatus !== "needs-qnt-owner" ||
          profile.qntOwners.length > 0 ||
          obligation.status !== "needs-qnt-owner" ||
          obligation.qntOwners.length > 0 ||
          !sameMembers(obligation.followUpTaskIds ?? [], [trackerId]) ||
          familyRequirements.some(
            (requirement) => requirement.qntOwners.length > 0,
          ) ||
          rawTrackerClaim?.coverageMetric !== "missing-qnt-owner" ||
          !sameMembers(
            rawTrackerClaim?.requirementIds ?? [],
            family.rawRequirementIds,
          ) ||
          profileTaskClaim?.claimKind !== "missing-qnt-owner" ||
          !sameMembers(profileTaskClaim?.profileIds ?? [], [
            family.profileId,
          ]) ||
          !(profile.taskRefs ?? []).includes(trackerId)
        ) {
          fail(`${family.id} does not expose formal gap ${trackerId} exactly.`);
        }
      } else if (
        profile.qntOwnershipStatus === "needs-qnt-owner" ||
        profile.qntOwners.length === 0 ||
        !profile.verificationOwners.some(
          (owner) => owner.kind === "qnt-proof",
        ) ||
        obligation.status !== "covered" ||
        obligation.qntOwners.length === 0 ||
        obligation.parityWitnesses.length === 0 ||
        familyRequirements.some(
          (requirement) =>
            requirement.qntOwners.length === 0 ||
            !requirement.verificationOwners.some(
              (owner) => owner.kind === "qnt-proof",
            ),
        )
      ) {
        fail(`${family.id} covered formal ownership is incomplete.`);
      }
      if (family.formalEvidenceState !== "needs-qnt-owner") {
        const readiness = generatorReadiness.get(family.obligationId);
        if (
          readiness === undefined ||
          !sameMembers(readiness.semanticCore, obligation.qntOwners) ||
          !sameMembers(
            readiness.bridgeOwners ?? [],
            obligation.bridgeOwners ?? [],
          ) ||
          obligation.qntOwners.some(
            (ownerPath) => qntOwnerRoles.get(ownerPath) !== "semantic-core",
          ) ||
          (obligation.bridgeOwners ?? []).some(
            (ownerPath) => qntOwnerRoles.get(ownerPath) !== "bridge",
          )
        ) {
          fail(`${family.id} semantic/bridge owner partition is not exact.`);
        }
        const proofOwners = profile.verificationOwners.filter(
          (owner) => owner.kind === "qnt-proof",
        );
        const readinessSemanticAndBridgeOwners = new Set([
          ...readiness.semanticCore,
          ...(readiness.bridgeOwners ?? []),
        ]);
        if (
          proofOwners.some(
            (owner) =>
              qntOwnerRoles.get(owner.ownerPath) !== "proof-only" ||
              !readiness.proofOnly.includes(owner.ownerPath),
          ) ||
          readiness.proofOnly.some(
            (ownerPath) =>
              qntOwnerRoles.get(ownerPath) !== "proof-only" ||
              readinessSemanticAndBridgeOwners.has(ownerPath),
          )
        ) {
          fail(`${family.id} qnt-proof owner partition is not exact.`);
        }
      }
      const evidenceForFamily = profile.verificationOwners.map((owner) => {
        const metric = evidenceMetricForVerificationKind(owner.kind);
        return [...evidenceClaims.values()].find(
          (claim) =>
            claim.coverageMetric === metric &&
            claim.ownerPath === owner.ownerPath &&
            family.rawRequirementIds.every((requirementId) =>
              claim.requirementIds.includes(requirementId),
            ),
        );
      });
      if (
        evidenceForFamily.some((claim) => claim === undefined) ||
        evidenceForFamily.some(
          (claim) => !profile.taskRefs.includes(claim.evidenceId),
        )
      ) {
        fail(`${family.id} verification evidence identity join is not exact.`);
      }
    }
    if (
      family.state === "missingOwner" &&
      (profile.qntOwnershipStatus !== "needs-qnt-owner" ||
        profile.qntOwners.length > 0 ||
        profile.runtimeOwners.length > 0 ||
        profile.verificationOwners.length > 0 ||
        obligation.qntOwners.length > 0 ||
        obligation.runtimeOwners.length > 0 ||
        obligation.parityWitnesses.length > 0 ||
        obligation.status === "covered")
    ) {
      fail(`${family.id} missing-owner state contradicts coverage metadata.`);
    }
    if (family.state === "missingOwner") {
      const taskId = `GH-${family.issueNumber}`;
      const rawTrackerClaim = rawTrackerClaims.get(taskId);
      const profileTaskClaim = profileTaskClaims.get(taskId);
      if (
        profile.taskRefs.length !== 1 ||
        profile.taskRefs[0] !== taskId ||
        obligation.followUpTaskIds.length !== 1 ||
        obligation.followUpTaskIds[0] !== taskId ||
        rawTrackerClaim?.coverageMetric !== "missing-runtime-owner" ||
        !sameMembers(
          rawTrackerClaim?.requirementIds ?? [],
          family.rawRequirementIds,
        ) ||
        profileTaskClaim?.claimKind !== "missing-runtime-owner" ||
        profileTaskClaim.profileIds.length !== 1 ||
        profileTaskClaim.profileIds[0] !== family.profileId
      ) {
        fail(`${family.id} does not join exactly to tracker task ${taskId}.`);
      }
    }
  }
}

function renderReport(reconciliation) {
  const lines = [
    "# Stat Block Execution Reconciliation",
    "",
    "> Generated planning and coverage evidence. Production code must not import this directory. Regenerate with `pnpm generate:stat-block-execution-reconciliation`.",
    "",
    `Every one of the **${reconciliation.source.occurrenceCount}** #350 structural rows is assigned exactly once. The checked state remains distinct from authored catalog presence and from GitHub execution status.`,
    "",
    "## State totals",
    "",
    "| State | Rows |",
    "| --- | ---: |",
    ...Object.entries(reconciliation.stateCounts).map(
      ([state, count]) => `| ${state} | ${count} |`,
    ),
    "",
    "## Generic families",
    "",
    "| Family | Runtime state | Formal evidence | Rows | Stat Blocks | Profile | Obligation | Follow-up |",
    "| --- | --- | --- | ---: | ---: | --- | --- | ---: |",
    ...reconciliation.families.map(
      (family) =>
        `| ${family.id} | ${family.state} | ${family.formalEvidenceState ?? (family.state === "executable" ? "covered" : "not-applicable")} | ${family.occurrenceCount} | ${family.statBlockCount} | ${family.profileId ?? "—"} | ${family.obligationId ?? "—"} | ${family.issueNumber === undefined ? (family.proofFollowUpIssueNumber === undefined ? "—" : `#${family.proofFollowUpIssueNumber}`) : `#${family.issueNumber}`} |`,
    ),
    "",
    "The JSON companion owns the complete row-to-family assignments and each family's complete member-row list. GitHub #114 owns the nine missing-owner child issues; #351 is their reconciliation blocker until this checked mapping is integrated.",
    "",
  ];
  return lines.join("\n");
}

function assertCurrent(filePath, expected) {
  if (
    !fs.existsSync(filePath) ||
    fs.readFileSync(filePath, "utf8") !== expected
  ) {
    fail(
      `${path.relative(root, filePath)} is stale. Run pnpm generate:stat-block-execution-reconciliation.`,
    );
  }
}

async function formatArtifact(contents, filePath) {
  const configuration = await prettier.resolveConfig(filePath);
  return prettier.format(contents, { ...configuration, filepath: filePath });
}

function assertThrowsWith(label, fn, expectedMessage) {
  try {
    fn();
  } catch (error) {
    if (error.message.includes(expectedMessage)) return;
    fail(`${label} threw the wrong error: ${error.message}`);
  }
  fail(`${label} did not throw.`);
}

async function runSelfTest() {
  const occurrences = [
    {
      rowId: "synthetic-executable",
      kind: "section",
      disposition: {
        kind: "executable",
        owner: "battle-runtime Stat Block Action lifecycle",
      },
      witness: { recordOrdinal: 1 },
    },
    {
      rowId: "synthetic-missing",
      kind: "spellReference",
      disposition: { kind: "missingOwner" },
      witness: { recordOrdinal: 2 },
    },
    {
      rowId: "synthetic-text",
      kind: "trait",
      disposition: { kind: "textOnly" },
      witness: { recordOrdinal: 3 },
    },
  ];
  const pressure = {
    kind: "statBlockProcedurePressureReport",
    recordCount: 330,
    occurrenceCount: 2602,
    dispositionCounts: {
      executable: 1,
      missingOwner: 1,
      textOnly: 1,
      tableOwned: 0,
      malformed: 0,
    },
    occurrences,
    capabilityProposals: [{ rank: 1, memberRowIds: ["synthetic-missing"] }],
  };
  pressure.occurrences = [
    ...occurrences,
    ...Array.from({ length: 2599 }, (_, index) => ({
      rowId: `synthetic-padding-${index}`,
      kind: "procedure",
      disposition: { kind: "textOnly" },
      witness: { recordOrdinal: 4 },
    })),
  ];
  pressure.dispositionCounts.textOnly = 2600;
  const reconciliation = buildReconciliation(pressure, false);
  if (
    reconciliation.assignments.find(
      ({ rowId }) => rowId === "synthetic-missing",
    ).familyId !== "stat-block.spell-invocation.unrestricted" ||
    reconciliation.stateCounts.textOnly !== 2600
  ) {
    fail("Synthetic reconciliation did not preserve exact membership.");
  }

  const realPressure = readJson(pressurePath);
  const realReconciliation = buildReconciliation(realPressure);
  const realCoverage = readCoverageJoinInputs();
  validateRetiredExecutionIdentities(currentExecutionIdentityTexts());
  validateCoverageJoin(realReconciliation, realCoverage);

  assertThrowsWith(
    "retired execution identity",
    () =>
      validateRetiredExecutionIdentities({
        "synthetic.qnt": "// retired QMBT6 catch-all",
      }),
    "Retired omnibus identity QMBT6 survives",
  );

  const catchallCoverage = structuredClone(realCoverage);
  catchallCoverage.requirements.push({
    id: "RAW-QCORE11-STAT-BLOCK-CONTROLS-001",
  });
  assertThrowsWith(
    "retired catch-all survival",
    () => validateCoverageJoin(realReconciliation, catchallCoverage),
    "Retired catch-all RAW-QCORE11-STAT-BLOCK-CONTROLS-001 still exists",
  );

  const contradictoryCoverage = structuredClone(realCoverage);
  contradictoryCoverage.profiles.find(
    ({ id }) => id === "stat-block.action-lifecycle",
  ).qntOwnershipStatus = "needs-qnt-owner";
  assertThrowsWith(
    "contradictory covered profile",
    () => validateCoverageJoin(realReconciliation, contradictoryCoverage),
    "stat-block.action-lifecycle covered formal ownership is incomplete",
  );

  const missingCoveredProfileCoverage = structuredClone(realCoverage);
  missingCoveredProfileCoverage.profiles =
    missingCoveredProfileCoverage.profiles.filter(
      ({ id }) => id !== "stat-block.action-lifecycle",
    );
  assertThrowsWith(
    "missing covered family profile",
    () =>
      validateCoverageJoin(realReconciliation, missingCoveredProfileCoverage),
    "stat-block.action-lifecycle references missing profile stat-block.action-lifecycle",
  );

  const sharedSemanticOwnerCoverage = structuredClone(realCoverage);
  sharedSemanticOwnerCoverage.profiles.find(
    ({ id }) => id === "stat-block.bonus-action-lifecycle",
  ).qntOwners = structuredClone(
    sharedSemanticOwnerCoverage.profiles.find(
      ({ id }) => id === "stat-block.action-lifecycle",
    ).qntOwners,
  );
  assertThrowsWith(
    "shared family semantic owner",
    () => validateCoverageJoin(realReconciliation, sharedSemanticOwnerCoverage),
    "share forbidden semantic owner",
  );

  const sharedProofOwnerCoverage = structuredClone(realCoverage);
  const actionProofOwner = sharedProofOwnerCoverage.profiles
    .find(({ id }) => id === "stat-block.action-lifecycle")
    .verificationOwners.find(({ kind }) => kind === "qnt-proof");
  const bonusProfile = sharedProofOwnerCoverage.profiles.find(
    ({ id }) => id === "stat-block.bonus-action-lifecycle",
  );
  bonusProfile.verificationOwners = bonusProfile.verificationOwners.map(
    (owner) => (owner.kind === "qnt-proof" ? actionProofOwner : owner),
  );
  assertThrowsWith(
    "shared family qnt-proof owner",
    () => validateCoverageJoin(realReconciliation, sharedProofOwnerCoverage),
    "share forbidden qnt-proof owner",
  );

  const mismatchedSemanticOwnerCoverage = structuredClone(realCoverage);
  mismatchedSemanticOwnerCoverage.profiles.find(
    ({ id }) => id === "stat-block.action-lifecycle",
  ).qntOwners = [
    "packages/shared-algebras/proofs/rule-core/attack-damage-composition.qnt",
  ];
  assertThrowsWith(
    "wrong but nonempty semantic owner",
    () =>
      validateCoverageJoin(realReconciliation, mismatchedSemanticOwnerCoverage),
    "stat-block.action-lifecycle cross-layer owner join is not exact",
  );

  const mismatchedRuntimeOwnerCoverage = structuredClone(realCoverage);
  mismatchedRuntimeOwnerCoverage.profiles.find(
    ({ id }) => id === "stat-block.action-lifecycle",
  ).runtimeOwners = ["packages/battle-runtime/src/stat-block-execution.ts"];
  assertThrowsWith(
    "wrong but nonempty runtime owner",
    () =>
      validateCoverageJoin(realReconciliation, mismatchedRuntimeOwnerCoverage),
    "stat-block.action-lifecycle cross-layer owner join is not exact",
  );

  const swappedAttackDamageOwnersCoverage = structuredClone(realCoverage);
  const swappedAttackRequirement =
    swappedAttackDamageOwnersCoverage.requirements.find(
      ({ id }) => id === "RAW-STAT-BLOCK-ATTACK-PROCEDURE-001",
    );
  const swappedDamageRequirement =
    swappedAttackDamageOwnersCoverage.requirements.find(
      ({ id }) => id === "RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001",
    );
  [
    swappedAttackRequirement.runtimeOwners,
    swappedDamageRequirement.runtimeOwners,
  ] = [
    swappedDamageRequirement.runtimeOwners,
    swappedAttackRequirement.runtimeOwners,
  ];
  assertThrowsWith(
    "swapped attack and damage runtime owners",
    () =>
      validateCoverageJoin(
        realReconciliation,
        swappedAttackDamageOwnersCoverage,
      ),
    "cites RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 as runtime-owner, but requirements.jsonl does not list that owner",
  );

  const wrongRequirementRuntimeOwnerCoverage = structuredClone(realCoverage);
  wrongRequirementRuntimeOwnerCoverage.requirements.find(
    ({ id }) => id === "RAW-STAT-BLOCK-ATTACK-PROCEDURE-001",
  ).runtimeOwners[0] = "packages/battle-runtime/src/stat-block-execution.ts";
  assertThrowsWith(
    "wrong but nonempty requirement runtime owner",
    () =>
      validateCoverageJoin(
        realReconciliation,
        wrongRequirementRuntimeOwnerCoverage,
      ),
    "cites RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 as runtime-owner, but requirements.jsonl does not list that owner",
  );

  const missingRequirementRuntimeOwnerCoverage = structuredClone(realCoverage);
  missingRequirementRuntimeOwnerCoverage.requirements
    .find(({ id }) => id === "RAW-STAT-BLOCK-ATTACK-PROCEDURE-001")
    .runtimeOwners.pop();
  assertThrowsWith(
    "missing requirement runtime owner",
    () =>
      validateCoverageJoin(
        realReconciliation,
        missingRequirementRuntimeOwnerCoverage,
      ),
    "cites RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 as runtime-owner, but requirements.jsonl does not list that owner",
  );

  const extraRequirementRuntimeOwnerCoverage = structuredClone(realCoverage);
  extraRequirementRuntimeOwnerCoverage.requirements
    .find(({ id }) => id === "RAW-STAT-BLOCK-ATTACK-PROCEDURE-001")
    .runtimeOwners.push("packages/battle-runtime/src/stat-block-execution.ts");
  assertThrowsWith(
    "extra requirement runtime owner",
    () =>
      validateCoverageJoin(
        realReconciliation,
        extraRequirementRuntimeOwnerCoverage,
      ),
    "lists runtime owner packages/battle-runtime/src/stat-block-execution.ts, but that artifact does not cite it with RAW-COVERAGE: runtime-owner",
  );

  const mismatchedVerificationOwnerCoverage = structuredClone(realCoverage);
  mismatchedVerificationOwnerCoverage.profiles.find(
    ({ id }) => id === "stat-block.action-lifecycle",
  ).verificationOwners[0].ownerPath =
    "packages/shared-algebras/proofs/rule-core/attack-damage-composition-inductive.qnt";
  assertThrowsWith(
    "wrong but nonempty verification owner",
    () =>
      validateCoverageJoin(
        realReconciliation,
        mismatchedVerificationOwnerCoverage,
      ),
    "stat-block.action-lifecycle cross-layer owner join is not exact",
  );

  const mismatchedEvidenceOwnerCoverage = structuredClone(realCoverage);
  mismatchedEvidenceOwnerCoverage.evidenceClaims.find(
    ({ evidenceId }) => evidenceId === "SB-ACTION-LIFECYCLE-INDUCTIVE",
  ).ownerPath =
    "packages/shared-algebras/proofs/rule-core/attack-damage-composition-inductive.qnt";
  assertThrowsWith(
    "wrong but nonempty evidence owner",
    () =>
      validateCoverageJoin(realReconciliation, mismatchedEvidenceOwnerCoverage),
    "stat-block.action-lifecycle verification evidence identity join is not exact",
  );

  const mismatchedBridgeOwnerCoverage = structuredClone(realCoverage);
  mismatchedBridgeOwnerCoverage.obligations.find(
    ({ id }) => id === "BATTLE.STAT_BLOCK.MULTIATTACK",
  ).bridgeOwners = [
    "packages/battle-runtime/battle-runtime-stat-block-recharge-bridge.qnt",
  ];
  assertThrowsWith(
    "wrong but nonempty bridge owner",
    () =>
      validateCoverageJoin(realReconciliation, mismatchedBridgeOwnerCoverage),
    "stat-block.multiattack semantic/bridge owner partition is not exact",
  );

  const brokenRuntimeTrackerCoverage = structuredClone(realCoverage);
  brokenRuntimeTrackerCoverage.rawTrackerClaims.find(
    ({ trackerId }) => trackerId === "GH-418",
  ).requirementIds = [];
  assertThrowsWith(
    "broken missing-runtime tracker join",
    () =>
      validateCoverageJoin(realReconciliation, brokenRuntimeTrackerCoverage),
    "does not join exactly to tracker task GH-418",
  );

  const hiddenFormalGapCoverage = structuredClone(realCoverage);
  hiddenFormalGapCoverage.obligations.find(
    ({ id }) => id === "BATTLE.STAT_BLOCK.ATTACK_PROCEDURE",
  ).status = "covered";
  assertThrowsWith(
    "hidden attack formal gap",
    () => validateCoverageJoin(realReconciliation, hiddenFormalGapCoverage),
    "does not expose formal gap GH-427 exactly",
  );

  const duplicateRankPressure = structuredClone(realPressure);
  duplicateRankPressure.capabilityProposals[1].rank =
    duplicateRankPressure.capabilityProposals[0].rank;
  assertThrowsWith(
    "duplicate proposal rank",
    () => buildReconciliation(duplicateRankPressure),
    "Capability proposal rank repeats",
  );

  const duplicateMembershipPressure = structuredClone(realPressure);
  duplicateMembershipPressure.capabilityProposals[1].memberRowIds.push(
    duplicateMembershipPressure.capabilityProposals[0].memberRowIds[0],
  );
  assertThrowsWith(
    "duplicate proposal row membership",
    () => buildReconciliation(duplicateMembershipPressure),
    "belongs to multiple proposals",
  );

  const expectedInventory = await formatArtifact(
    `${JSON.stringify(realReconciliation, null, 2)}\n`,
    inventoryPath,
  );
  const expectedReport = await formatArtifact(
    renderReport(realReconciliation),
    reportPath,
  );
  assertCurrent(inventoryPath, expectedInventory);
  assertCurrent(reportPath, expectedReport);

  const staleFixtureDirectory = fs.mkdtempSync(
    path.join(root, ".stat-block-reconciliation-self-test-"),
  );
  try {
    const stalePath = path.join(staleFixtureDirectory, "inventory.json");
    fs.writeFileSync(stalePath, "{}\n");
    assertThrowsWith(
      "stale artifact bytes",
      () => assertCurrent(stalePath, expectedInventory),
      "is stale",
    );
  } finally {
    fs.rmSync(staleFixtureDirectory, { recursive: true, force: true });
  }
}

async function main() {
  if (selfTest) {
    await runSelfTest();
    console.log("Stat Block execution reconciliation self-test passed.");
    return;
  }
  const reconciliation = buildReconciliation(readJson(pressurePath));
  validateRetiredExecutionIdentities(currentExecutionIdentityTexts());
  validateCoverageJoin(reconciliation);
  const inventory = await formatArtifact(
    `${JSON.stringify(reconciliation, null, 2)}\n`,
    inventoryPath,
  );
  const report = await formatArtifact(renderReport(reconciliation), reportPath);
  if (write) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(inventoryPath, inventory);
    fs.writeFileSync(reportPath, report);
  } else {
    assertCurrent(inventoryPath, inventory);
    assertCurrent(reportPath, report);
  }
  console.log(
    `Stat Block execution reconciliation current: ${reconciliation.assignments.length} rows across ${reconciliation.families.length} families.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
