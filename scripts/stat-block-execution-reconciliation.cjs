#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");

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
const rawTaskClaimsPath = path.join(
  root,
  "plans/raw-coverage/task-claims.jsonl",
);
const profileTaskClaimsPath = path.join(
  root,
  "plans/unit-profile-coverage/task-claims.jsonl",
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

function validateCoverageJoin(reconciliation) {
  const requirementIds = new Set(
    readJsonl(requirementsPath).map(({ id }) => id),
  );
  const profiles = new Map(
    readJsonl(profilesPath).map((profile) => [profile.id, profile]),
  );
  const obligations = new Map(
    readJsonl(obligationsPath).map((obligation) => [obligation.id, obligation]),
  );
  const rawTaskClaims = new Map(
    readJsonl(rawTaskClaimsPath).map((claim) => [claim.taskId, claim]),
  );
  const profileTaskClaims = new Map(
    readJsonl(profileTaskClaimsPath).map((claim) => [claim.taskId, claim]),
  );
  if (requirementIds.has("RAW-QCORE11-STAT-BLOCK-CONTROLS-001")) {
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
  for (const family of reconciliation.families) {
    for (const requirementId of family.rawRequirementIds ?? []) {
      if (!requirementIds.has(requirementId)) {
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
    if (
      family.state === "executable" &&
      (profile.qntOwners.length === 0 ||
        profile.runtimeOwners.length === 0 ||
        profile.verificationOwners.length === 0 ||
        obligation.qntOwners.length === 0 ||
        obligation.runtimeOwners.length === 0 ||
        obligation.parityWitnesses.length === 0 ||
        obligation.status !== "covered")
    ) {
      fail(`${family.id} executable ownership is incomplete.`);
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
      const rawTaskClaim = rawTaskClaims.get(taskId);
      const profileTaskClaim = profileTaskClaims.get(taskId);
      if (
        profile.taskRefs.length !== 1 ||
        profile.taskRefs[0] !== taskId ||
        obligation.followUpTaskIds.length !== 1 ||
        obligation.followUpTaskIds[0] !== taskId ||
        rawTaskClaim?.coverageMetric !== "missing-runtime-owner" ||
        rawTaskClaim.requirementIds.length !==
          family.rawRequirementIds.length ||
        !family.rawRequirementIds.every((id) =>
          rawTaskClaim.requirementIds.includes(id),
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
    "| Family | State | Rows | Stat Blocks | Profile | Obligation | Issue |",
    "| --- | --- | ---: | ---: | --- | --- | ---: |",
    ...reconciliation.families.map(
      (family) =>
        `| ${family.id} | ${family.state} | ${family.occurrenceCount} | ${family.statBlockCount} | ${family.profileId ?? "—"} | ${family.obligationId ?? "—"} | ${family.issueNumber === undefined ? "—" : `#${family.issueNumber}`} |`,
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

function runSelfTest() {
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
}

async function main() {
  if (selfTest) {
    runSelfTest();
    console.log("Stat Block execution reconciliation self-test passed.");
    return;
  }
  const reconciliation = buildReconciliation(readJson(pressurePath));
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
