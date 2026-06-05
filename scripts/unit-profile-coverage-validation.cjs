const fs = require("node:fs");
const path = require("node:path");
const {
  battleReadinessClosureKinds,
  claimTags,
  collectionIds,
  completedRuntimeParityKinds,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
  fungiTerms,
  nearCanonicalDenyList,
  profileKinds,
  protectedExpressionFields,
  rulesKernelProfileKindClassificationIssues,
  selectedIdentityMbtEvidenceTag,
  selectedIdentityNonApplicableDispositionTag,
  unitEvidenceTags,
  unitProfileOwnerClaimKinds,
} = require("./unit-profile-coverage-config.cjs");
const { stable } = require("./unit-profile-coverage-report.cjs");

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

const unitEvidenceRowFields = new Set(["unitId", "evidence"]);
const unitEvidenceFields = new Set(["tag", "taskId", "ownerPath"]);
const selectedIdentityEvidenceDispositionFields = new Set([
  "tag",
  "owner",
  "reason",
]);
const deferredMechanicsSelectedIdentityDispositionFields =
  selectedIdentityEvidenceDispositionFields;

function unexpectedFieldIssues(value, allowedFields, context) {
  return Object.keys(value)
    .filter((field) => !allowedFields.has(field))
    .map(
      (field) =>
        `${context} must not include unsupported field ${field}; Unit evidence rows have no optional fields.`,
    );
}

function unitEvidenceRowSchemaIssues(row, index) {
  const context = `Unit evidence row ${index + 1}`;
  const issues = [];
  if (!isRecord(row)) {
    return [`${context} must be an object.`];
  }
  issues.push(...unexpectedFieldIssues(row, unitEvidenceRowFields, context));
  if (!isNonEmptyString(row.unitId)) {
    issues.push(`${context}.unitId must be a non-empty string.`);
  }
  if (!isRecord(row.evidence)) {
    issues.push(`${context}.evidence must be an object.`);
    return issues;
  }
  issues.push(
    ...unexpectedFieldIssues(
      row.evidence,
      unitEvidenceFields,
      `${context}.evidence`,
    ),
  );
  for (const field of unitEvidenceFields) {
    if (!isNonEmptyString(row.evidence[field])) {
      issues.push(`${context}.evidence.${field} must be a non-empty string.`);
    }
  }
  return issues;
}

function selectedIdentityEvidenceDispositionIssues(unitId, disposition) {
  if (disposition === undefined) return [];
  const context = `Unit ${unitId} selectedIdentityEvidenceDisposition`;
  const issues = [];
  if (!isRecord(disposition)) {
    return [`${context} must be an object.`];
  }
  for (const field of Object.keys(disposition).filter(
    (field) => !selectedIdentityEvidenceDispositionFields.has(field),
  )) {
    issues.push(`${context} must not include unsupported field ${field}.`);
  }
  if (disposition.tag !== selectedIdentityNonApplicableDispositionTag) {
    issues.push(
      `${context}.tag must be ${selectedIdentityNonApplicableDispositionTag}.`,
    );
  }
  for (const field of ["owner", "reason"]) {
    if (!isNonEmptyString(disposition[field])) {
      issues.push(`${context}.${field} must be a non-empty string.`);
    }
  }
  return issues;
}

function deferredMechanicsSelectedIdentityDispositionIssues(
  unitId,
  disposition,
) {
  if (disposition === undefined) return [];
  const context = `Unit ${unitId} deferredMechanicsSelectedIdentityDisposition`;
  const issues = [];
  if (!isRecord(disposition)) {
    return [`${context} must be an object.`];
  }
  for (const field of Object.keys(disposition).filter(
    (field) => !deferredMechanicsSelectedIdentityDispositionFields.has(field),
  )) {
    issues.push(`${context} must not include unsupported field ${field}.`);
  }
  if (disposition.tag !== selectedIdentityNonApplicableDispositionTag) {
    issues.push(
      `${context}.tag must be ${selectedIdentityNonApplicableDispositionTag}.`,
    );
  }
  for (const field of ["owner", "reason"]) {
    if (!isNonEmptyString(disposition[field])) {
      issues.push(`${context}.${field} must be a non-empty string.`);
    }
  }
  return issues;
}

function hasSelectedIdentityNonApplicableDisposition(claim) {
  const disposition = claim?.claim?.selectedIdentityEvidenceDisposition;
  return (
    isRecord(disposition) &&
    disposition.tag === selectedIdentityNonApplicableDispositionTag &&
    isNonEmptyString(disposition.owner) &&
    isNonEmptyString(disposition.reason)
  );
}

function isUsableUnitEvidenceRow(row) {
  return (
    isRecord(row) &&
    isRecord(row.evidence) &&
    isNonEmptyString(row.unitId) &&
    isNonEmptyString(row.evidence.tag) &&
    isNonEmptyString(row.evidence.taskId) &&
    isNonEmptyString(row.evidence.ownerPath)
  );
}

function repoRelativePathIssue(ownerPath, context) {
  if (
    path.isAbsolute(ownerPath) ||
    ownerPath.includes("\\") ||
    ownerPath.split("/").includes("..")
  ) {
    return `${context} ownerPath must be a repo-relative source path.`;
  }
  return undefined;
}

function battleReadinessClosureIssues(unitId, closure, context) {
  const issues = [];
  if (!isRecord(closure)) {
    return [`${context} for ${unitId} must be an object.`];
  }
  if (!battleReadinessClosureKinds.has(closure.kind)) {
    issues.push(`${context} for ${unitId} has unknown kind ${closure.kind}.`);
  }
  if (typeof closure.owner !== "string" || closure.owner.length === 0) {
    issues.push(`${context} for ${unitId} requires owner.`);
  }
  if (
    closure.reason !== undefined &&
    (typeof closure.reason !== "string" || closure.reason.length === 0)
  ) {
    issues.push(`${context} for ${unitId} reason must be a non-empty string.`);
  }
  return issues;
}

function followUpTaskIssues(unitId, tasks) {
  const issues = [];
  if (tasks === undefined) return issues;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [`Unit ${unitId} followUpTasks must be a non-empty array.`];
  }
  for (const [index, task] of tasks.entries()) {
    const context = `Unit ${unitId} followUpTasks[${index}]`;
    if (!isRecord(task)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    for (const field of [
      "id",
      "title",
      "owner",
      "mechanic",
      "requiredOutput",
    ]) {
      if (typeof task[field] !== "string" || task[field].length === 0) {
        issues.push(`${context}.${field} must be a non-empty string.`);
      }
    }
    if (
      typeof task.id === "string" &&
      !/^(?:L12G|L3)-[A-Z0-9-]+$/.test(task.id)
    ) {
      issues.push(`${context}.id must be an L12G or L3 task id.`);
    }
  }
  return issues;
}

function collectFields(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectFields(entry, `${prefix}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => [
      prefix ? `${prefix}.${key}` : key,
      ...collectFields(entry, prefix ? `${prefix}.${key}` : key),
    ]);
  }
  return [];
}

const forbiddenRulesKernelJoinFields = [
  "obligationIds",
  "profileObligations",
  "profiles",
  "rulesKernelObligationIds",
  "rulesKernelObligations",
  "rulesKernelProfileObligations",
  "rulesKernelProfiles",
];

function forbiddenRulesKernelJoinFieldIssues(value, context) {
  if (!isRecord(value)) return [];
  const issues = [];
  for (const field of forbiddenRulesKernelJoinFields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${context} must not copy rules-kernel join field ${field}; use plans/rules-kernel-coverage/profile-obligations.jsonl.`,
      );
    }
  }
  if (isRecord(value.claim)) {
    issues.push(
      ...forbiddenRulesKernelJoinFieldIssues(value.claim, `${context}.claim`),
    );
  }
  return issues;
}

function hasFungiTheme(value) {
  const text = String(value ?? "").toLowerCase();
  return fungiTerms.some((term) => text.includes(term));
}

function validateCollections(collections, inventory) {
  const issues = [];
  const seenIds = new Map();
  const srdMechanicsByStableJson = new Map(
    inventory
      .filter(
        (unit) =>
          unit.collectionId === "srd-5.2.1" && unit.rawRecord?.mechanics,
      )
      .map((unit) => [
        JSON.stringify(stable(unit.rawRecord.mechanics)),
        unit.unitId,
      ]),
  );
  for (const collection of collections) {
    if (!collectionIds.has(collection.id))
      issues.push(`Unknown collection id: ${collection.id}.`);
    if (collection.id === "srd-5.2.1" && collection.policy.tag !== "srd") {
      issues.push("srd-5.2.1 collection must use the srd policy tag.");
    }
    if (
      collection.id === "classic-2024-non-srd-mechanics" &&
      collection.policy.tag !== "classic-non-srd-mechanics"
    ) {
      issues.push(
        "classic-2024-non-srd-mechanics collection must use the classic non-SRD policy tag.",
      );
    }
  }

  for (const unit of inventory) {
    const prior = seenIds.get(unit.unitId);
    if (prior) {
      issues.push(
        `Duplicate Unit id ${unit.unitId} in ${prior} and ${unit.sourceRecordPath}.`,
      );
    }
    seenIds.set(unit.unitId, unit.sourceRecordPath);

    if (
      unit.collectionId === "srd-5.2.1" &&
      unit.provenance?.kind !== "srd-5.2.1"
    ) {
      issues.push(
        `${unit.unitId} is in the SRD collection with non-SRD provenance ${unit.provenance?.kind}.`,
      );
    }
    if (unit.collectionId === "classic-2024-non-srd-mechanics") {
      if (unit.provenance?.kind === "srd-5.2.1") {
        issues.push(
          `${unit.unitId} is in the Classic non-SRD collection with SRD provenance.`,
        );
      }
      if (unit.provenance?.kind !== "classic-2024-mechanics-source-lane") {
        issues.push(
          `${unit.unitId} must use classic-2024-mechanics-source-lane provenance.`,
        );
      }
      if (!hasFungiTheme(unit.unitId) || !hasFungiTheme(unit.syntheticLabel)) {
        issues.push(
          `${unit.unitId} must use fungi-themed synthetic id and label.`,
        );
      }
      const fields = new Set(collectFields(unit.rawRecord));
      for (const field of protectedExpressionFields) {
        if (fields.has(field)) {
          issues.push(
            `${unit.unitId} contains protected-expression field ${field}.`,
          );
        }
      }
      const deniedText = `${unit.unitId} ${unit.syntheticLabel}`.toLowerCase();
      for (const denied of nearCanonicalDenyList) {
        if (deniedText.includes(denied)) {
          issues.push(
            `${unit.unitId} uses near-canonical protected label/id text: ${denied}.`,
          );
        }
      }
      const srdOverlap = srdMechanicsByStableJson.get(
        JSON.stringify(stable(unit.rawRecord.mechanics)),
      );
      if (srdOverlap) {
        issues.push(
          `${unit.unitId} duplicates SRD Unit mechanics from ${srdOverlap}.`,
        );
      }
    }
  }
  return issues;
}

function validateProfiles(profiles) {
  const issues = [];
  const seen = new Set();
  for (const profile of profiles) {
    issues.push(
      ...forbiddenRulesKernelJoinFieldIssues(
        profile,
        `${profile.id ?? "<unknown profile>"} profile row`,
      ),
    );
    if (seen.has(profile.id))
      issues.push(`Duplicate profile id ${profile.id}.`);
    seen.add(profile.id);
    if (!profileKinds.has(profile.profileKind)) {
      issues.push(
        `${profile.id} has unknown profileKind ${profile.profileKind}.`,
      );
    }
    if (!Array.isArray(profile.qntOwners))
      issues.push(`${profile.id} must declare qntOwners.`);
    if (!Array.isArray(profile.runtimeOwners))
      issues.push(`${profile.id} must declare runtimeOwners.`);
    if (!Array.isArray(profile.verificationOwners)) {
      issues.push(`${profile.id} must declare verificationOwners.`);
    }
    if (
      executableProfileKinds.has(profile.profileKind) &&
      profile.profileKind !== "stat-block-control"
    ) {
      if ((profile.qntOwners ?? []).length === 0) {
        issues.push(
          `${profile.id} claims executable semantics but has no QNT owner.`,
        );
      }
    }
  }
  return issues;
}

function unitClaimCollectionId(unit) {
  return (
    unit.collectionId ??
    (unit.provenance?.kind === "srd-5.2.1" ? "srd-5.2.1" : undefined)
  );
}

function validateUnitClaims(claims, inventory, authoredSurfaceUnits, profiles) {
  const issues = [];
  const claimableUnitsById = new Map(
    [...inventory, ...authoredSurfaceUnits].map((unit) => [unit.unitId, unit]),
  );
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const claimsByUnit = new Map();

  for (const claim of claims) {
    issues.push(
      ...forbiddenRulesKernelJoinFieldIssues(
        claim,
        `Unit ${claim.unitId ?? "<unknown unit>"} claim row`,
      ),
    );
    const claimedUnit = claimableUnitsById.get(claim.unitId);
    if (claimedUnit === undefined) {
      issues.push(`Claim references unknown Unit id ${claim.unitId}.`);
    }
    if (claimsByUnit.has(claim.unitId)) {
      issues.push(
        `Unit ${claim.unitId} has more than one profile disposition.`,
      );
    }
    claimsByUnit.set(claim.unitId, claim);
    if (!collectionIds.has(claim.collectionId)) {
      issues.push(
        `Unit ${claim.unitId} references unknown collection ${claim.collectionId}.`,
      );
    }
    if (!claim.claim || !claimTags.has(claim.claim.tag)) {
      issues.push(
        `Unit ${claim.unitId} has unknown claim tag ${claim.claim?.tag}.`,
      );
      continue;
    }
    issues.push(
      ...selectedIdentityEvidenceDispositionIssues(
        claim.unitId,
        claim.claim.selectedIdentityEvidenceDisposition,
      ),
    );
    issues.push(
      ...deferredMechanicsSelectedIdentityDispositionIssues(
        claim.unitId,
        claim.claim.deferredMechanicsSelectedIdentityDisposition,
      ),
    );
    if (
      claim.claim.selectedIdentityEvidenceDisposition !== undefined &&
      claim.claim.tag !== "supported-profile" &&
      claim.claim.tag !== "profile-subset-supported"
    ) {
      issues.push(
        `Unit ${claim.unitId} selectedIdentityEvidenceDisposition requires a supported-profile or profile-subset-supported claim.`,
      );
    }
    if (
      claim.claim.selectedIdentityEvidenceDisposition !== undefined &&
      claim.claim.deferredMechanicsSelectedIdentityDisposition !== undefined
    ) {
      issues.push(
        `Unit ${claim.unitId} must not declare both selectedIdentityEvidenceDisposition and deferredMechanicsSelectedIdentityDisposition.`,
      );
    }
    if (
      claim.claim.deferredMechanicsSelectedIdentityDisposition !== undefined &&
      claim.claim.tag !== "profile-subset-supported"
    ) {
      issues.push(
        `Unit ${claim.unitId} deferredMechanicsSelectedIdentityDisposition requires a profile-subset-supported claim.`,
      );
    }
    if (
      claim.claim.tag === "supported-profile" ||
      claim.claim.tag === "profile-subset-supported"
    ) {
      if (
        !Array.isArray(claim.claim.profileIds) ||
        claim.claim.profileIds.length === 0
      ) {
        issues.push(
          `Supported Unit ${claim.unitId} must reference at least one profile id.`,
        );
      } else {
        for (const profileId of claim.claim.profileIds) {
          if (!profileIds.has(profileId)) {
            issues.push(
              `Unit ${claim.unitId} references missing profile ${profileId}.`,
            );
          }
        }
      }
    }
    if (claim.claim.battleReadinessClosure !== undefined) {
      issues.push(
        ...battleReadinessClosureIssues(
          claim.unitId,
          claim.claim.battleReadinessClosure,
          "Unit claim battleReadinessClosure",
        ),
      );
    }
    issues.push(...followUpTaskIssues(claim.unitId, claim.claim.followUpTasks));
    if (claim.claim.tag === "profile-subset-supported") {
      if (
        !Array.isArray(claim.claim.supportedMechanics) ||
        claim.claim.supportedMechanics.length === 0
      ) {
        issues.push(
          `Profile-subset Unit ${claim.unitId} must list supportedMechanics.`,
        );
      }
      if (
        !Array.isArray(claim.claim.deferredMechanics) ||
        claim.claim.deferredMechanics.length === 0
      ) {
        issues.push(
          `Profile-subset Unit ${claim.unitId} must list deferredMechanics.`,
        );
      } else {
        for (const deferredMechanic of claim.claim.deferredMechanics) {
          const hasFollowUpTaskId =
            typeof deferredMechanic.followUpTaskId === "string" &&
            deferredMechanic.followUpTaskId.length > 0;
          const hasBattleReadinessClosure =
            deferredMechanic.battleReadinessClosure !== undefined;
          if (
            typeof deferredMechanic.mechanic !== "string" ||
            deferredMechanic.mechanic.length === 0 ||
            (!hasFollowUpTaskId && !hasBattleReadinessClosure)
          ) {
            issues.push(
              `Profile-subset Unit ${claim.unitId} deferredMechanics entries require mechanic and either followUpTaskId or battleReadinessClosure.`,
            );
          }
          if (deferredMechanic.battleReadinessClosure !== undefined) {
            issues.push(
              ...battleReadinessClosureIssues(
                claim.unitId,
                deferredMechanic.battleReadinessClosure,
                "Profile-subset deferredMechanic battleReadinessClosure",
              ),
            );
          }
        }
      }
    }
    if (
      claim.collectionId === "classic-2024-non-srd-mechanics" &&
      !claim.syntheticLabel
    ) {
      issues.push(
        `Classic non-SRD Unit claim ${claim.unitId} requires syntheticLabel.`,
      );
    }
  }

  for (const unit of inventory) {
    const claim = claimsByUnit.get(unit.unitId);
    if (!claim) {
      issues.push(
        `Installed Unit ${unit.unitId} has no profile disposition claim.`,
      );
      continue;
    }
    if (claim.collectionId !== unit.collectionId) {
      issues.push(
        `Unit ${unit.unitId} claim collection ${claim.collectionId} does not match inventory ${unit.collectionId}.`,
      );
    }
  }
  for (const [unitId, claim] of claimsByUnit.entries()) {
    const claimedUnit = claimableUnitsById.get(unitId);
    if (claimedUnit === undefined || claimedUnit.collectionId !== undefined) {
      continue;
    }
    const expectedCollectionId = unitClaimCollectionId(claimedUnit);
    if (
      expectedCollectionId !== undefined &&
      claim.collectionId !== expectedCollectionId
    ) {
      issues.push(
        `Unit ${unitId} claim collection ${claim.collectionId} does not match authored Surface provenance ${expectedCollectionId}.`,
      );
    }
  }
  return issues;
}

function validateUnitEvidence(
  root,
  evidenceRows,
  unitClaims,
  scannedUnitEvidence,
  claimableUnits,
) {
  const issues = [];
  const claimableUnitsById = new Map(
    claimableUnits.map((unit) => [unit.unitId, unit]),
  );
  const claimsByUnit = new Map(
    unitClaims.map((claim) => [claim.unitId, claim]),
  );
  const seen = new Set();

  for (const [index, row] of evidenceRows.entries()) {
    const rowSchemaIssues = unitEvidenceRowSchemaIssues(row, index);
    issues.push(...rowSchemaIssues);
    if (rowSchemaIssues.length > 0) {
      continue;
    }

    const rowKey = `${row.unitId}\u0000${row.evidence?.tag}\u0000${row.evidence?.taskId}\u0000${row.evidence?.ownerPath}`;
    if (seen.has(rowKey)) {
      issues.push(
        `Duplicate Unit evidence for ${row.unitId} at ${row.evidence?.ownerPath}.`,
      );
    }
    seen.add(rowKey);

    if (!claimableUnitsById.has(row.unitId)) {
      issues.push(`Unit evidence references unknown Unit id ${row.unitId}.`);
      continue;
    }
    const claim = claimsByUnit.get(row.unitId);
    if (claim === undefined) {
      issues.push(
        `Unit evidence for ${row.unitId} has no profile disposition claim.`,
      );
      continue;
    }
    if (
      !claim.claim ||
      (claim.claim.tag !== "supported-profile" &&
        claim.claim.tag !== "profile-subset-supported")
    ) {
      issues.push(
        `Unit evidence for ${row.unitId} requires a supported-profile or profile-subset-supported claim.`,
      );
      continue;
    }
    if (!row.evidence || !unitEvidenceTags.has(row.evidence.tag)) {
      issues.push(
        `Unit evidence for ${row.unitId} has unknown tag ${row.evidence?.tag}.`,
      );
      continue;
    }
    const ownerPathIssue = repoRelativePathIssue(
      row.evidence.ownerPath,
      `Unit evidence for ${row.unitId}`,
    );
    if (ownerPathIssue !== undefined) {
      issues.push(ownerPathIssue);
      continue;
    }
    if (
      row.evidence.tag === selectedIdentityMbtEvidenceTag &&
      !row.evidence.ownerPath.endsWith(".mbt.test.ts")
    ) {
      issues.push(
        `Selected identity MBT evidence for ${row.unitId} ownerPath must be a repo-relative .mbt.test.ts source test path.`,
      );
      continue;
    }
    if (!fs.existsSync(path.join(root, row.evidence.ownerPath))) {
      issues.push(
        `Unit evidence for ${row.unitId} references missing owner ${row.evidence.ownerPath}.`,
      );
      continue;
    }
    if (
      !hasUnitEvidenceClaim(
        scannedUnitEvidence.unitEvidence,
        row.evidence.ownerPath,
        row.evidence.tag,
        row.evidence.taskId,
        row.unitId,
      )
    ) {
      issues.push(
        `Unit evidence for ${row.unitId} lacks matching UNIT-IDENTITY-EVIDENCE claim in ${row.evidence.ownerPath}.`,
      );
    }
    if (
      row.evidence.tag === selectedIdentityMbtEvidenceTag &&
      !hasUnitIdentityMbtReplay(
        scannedUnitEvidence,
        row.evidence.ownerPath,
        row.evidence.taskId,
        row.unitId,
      )
    ) {
      issues.push(
        `Selected identity MBT evidence for ${row.unitId} lacks matching UNIT-IDENTITY-MBT-REPLAY action marker in ${row.evidence.ownerPath}.`,
      );
    }
    if (
      row.evidence.tag === selectedIdentityMbtEvidenceTag &&
      !hasSelectedUnitIdentityReplay(
        scannedUnitEvidence,
        row.evidence.ownerPath,
        row.evidence.taskId,
        row.unitId,
      )
    ) {
      issues.push(
        `Selected identity MBT evidence for ${row.unitId} lacks deterministic replay data in ${row.evidence.ownerPath}.`,
      );
    }
  }

  return issues;
}

function hasOwnerClaim(scannedClaims, ownerPath, claimKind, profileId) {
  return scannedClaims.some(
    (claim) =>
      claim.ownerPath === ownerPath &&
      claim.claimKind === claimKind &&
      claim.profileIds.includes(profileId),
  );
}

function hasUnitEvidenceClaim(
  scannedUnitEvidence,
  ownerPath,
  evidenceTag,
  taskId,
  unitId,
) {
  return scannedUnitEvidence.some(
    (claim) =>
      claim.ownerPath === ownerPath &&
      claim.evidenceTag === evidenceTag &&
      claim.taskId === taskId &&
      claim.unitIds.includes(unitId),
  );
}

function hasUnitIdentityMbtReplay(scannedClaims, ownerPath, taskId, unitId) {
  return scannedClaims.unitIdentityMbtReplays.some(
    (claim) =>
      claim.ownerPath === ownerPath &&
      claim.taskId === taskId &&
      claim.unitId === unitId,
  );
}

function hasSelectedUnitIdentityReplay(
  scannedClaims,
  ownerPath,
  taskId,
  unitId,
) {
  return scannedClaims.selectedUnitIdentityReplays.some(
    (claim) =>
      claim.ownerPath === ownerPath &&
      claim.taskId === taskId &&
      claim.unitId === unitId,
  );
}

function unitEvidenceRowKey(ownerPath, evidenceTag, taskId, unitId) {
  return `${ownerPath}\u0000${evidenceTag}\u0000${taskId}\u0000${unitId}`;
}

function actionSetKey(actionNames) {
  return [...new Set(actionNames)].sort().join("\u0000");
}

function validateOwnerClaims(
  profiles,
  taskClaims,
  scannedClaims,
  scannedUnitEvidence,
  unitEvidenceRows,
) {
  const issues = [];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const usableUnitEvidenceRows = unitEvidenceRows.filter(
    isUsableUnitEvidenceRow,
  );
  const unitEvidenceRowsByMarker = new Set(
    usableUnitEvidenceRows.map((row) =>
      unitEvidenceRowKey(
        row.evidence?.ownerPath,
        row.evidence?.tag,
        row.evidence?.taskId,
        row.unitId,
      ),
    ),
  );
  const selectedUnitEvidenceRowsByMarker = new Set(
    usableUnitEvidenceRows
      .filter((row) => row.evidence?.tag === selectedIdentityMbtEvidenceTag)
      .map((row) =>
        unitEvidenceRowKey(
          row.evidence?.ownerPath,
          row.evidence?.tag,
          row.evidence?.taskId,
          row.unitId,
        ),
      ),
  );
  const selectedReplayRowsByMarker = new Set(
    scannedUnitEvidence.selectedUnitIdentityReplays.map((row) =>
      unitEvidenceRowKey(
        row.ownerPath,
        selectedIdentityMbtEvidenceTag,
        row.taskId,
        row.unitId,
      ),
    ),
  );
  const selectedReplayRowsByMarkerAndActions = new Set(
    scannedUnitEvidence.selectedUnitIdentityReplays.map(
      (row) =>
        `${unitEvidenceRowKey(
          row.ownerPath,
          selectedIdentityMbtEvidenceTag,
          row.taskId,
          row.unitId,
        )}\u0000${actionSetKey(row.actionNames)}`,
    ),
  );
  const selectedReplayConsumerOwnerPaths = new Set(
    scannedUnitEvidence.selectedUnitIdentityReplayConsumers.map(
      (consumer) => consumer.ownerPath,
    ),
  );
  const qntProofTaskClaimProfileIds = taskClaimProfileIds(
    taskClaims,
    (claimKind) => claimKind === "qnt-proof",
  );
  const runtimeParityTaskClaimProfileIds = taskClaimProfileIds(
    taskClaims,
    (claimKind) => completedRuntimeParityKinds.has(claimKind),
  );
  for (const replay of scannedUnitEvidence.selectedUnitIdentityReplays) {
    if (replay.reducerReachability?.reachable !== true) {
      issues.push(
        `${replay.ownerPath} selected Unit identity replay data for ${replay.unitId} does not reach production runtime entrypoints (${replay.reducerReachability?.description ?? "no reducer reachability evidence"}).`,
      );
    }
    if (!selectedReplayConsumerOwnerPaths.has(replay.ownerPath)) {
      issues.push(
        `${replay.ownerPath} has selected Unit identity replay data but no deterministic replay test consumer.`,
      );
    }
    if (replay.actionNames.length === 0) {
      issues.push(
        `${replay.ownerPath} has selected Unit identity replay data for ${replay.unitId} with no actions.`,
      );
    }
    if (
      !selectedUnitEvidenceRowsByMarker.has(
        unitEvidenceRowKey(
          replay.ownerPath,
          selectedIdentityMbtEvidenceTag,
          replay.taskId,
          replay.unitId,
        ),
      )
    ) {
      issues.push(
        `${replay.ownerPath} has selected Unit identity replay data for ${replay.unitId} without a matching unit-evidence.jsonl row.`,
      );
    }
    const marker = scannedUnitEvidence.unitIdentityMbtReplays.find(
      (claim) =>
        claim.ownerPath === replay.ownerPath &&
        claim.taskId === replay.taskId &&
        claim.unitId === replay.unitId,
    );
    if (marker === undefined) {
      issues.push(
        `${replay.ownerPath} has selected Unit identity replay data for ${replay.unitId} without a matching UNIT-IDENTITY-MBT-REPLAY marker.`,
      );
      continue;
    }
    if (actionSetKey(marker.actionNames) !== actionSetKey(replay.actionNames)) {
      issues.push(
        `${replay.ownerPath} selected Unit identity replay data for ${replay.unitId} does not match UNIT-IDENTITY-MBT-REPLAY actions.`,
      );
    }
  }
  for (const claim of scannedUnitEvidence.unitIdentityMbtReplays) {
    if (claim.taskId.length === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has empty Unit identity MBT replay task id.`,
      );
    }
    if (claim.unitId.length === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has empty Unit identity MBT replay Unit id.`,
      );
    }
    if (claim.actionNames.length === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has no Unit identity MBT replay actions.`,
      );
    }
    for (const actionName of claim.actionNames) {
      if (!claim.declaredActions.has(actionName)) {
        issues.push(
          `${claim.ownerPath}:${claim.line} cites Unit identity MBT replay action ${actionName} that is not declared in driverSchema.`,
        );
      }
      if (!claim.stepActionNames.has(actionName)) {
        issues.push(
          `${claim.ownerPath}:${claim.line} cites Unit identity MBT replay action ${actionName} that is not reachable from ${claim.stepDescription}.`,
        );
      }
    }
    if (claim.declaredActions.size === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} cites Unit identity MBT replay actions in a file with no driverSchema.`,
      );
    }
    if (claim.stepActionNames.size === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} cites Unit identity MBT replay actions in a file with no readable Quint MBT step action set.`,
      );
    }
    if (
      !selectedUnitEvidenceRowsByMarker.has(
        unitEvidenceRowKey(
          claim.ownerPath,
          selectedIdentityMbtEvidenceTag,
          claim.taskId,
          claim.unitId,
        ),
      )
    ) {
      issues.push(
        `${claim.ownerPath}:${claim.line} claims selected identity MBT replay for ${claim.unitId} without a matching unit-evidence.jsonl row.`,
      );
    }
    if (
      !selectedReplayRowsByMarker.has(
        unitEvidenceRowKey(
          claim.ownerPath,
          selectedIdentityMbtEvidenceTag,
          claim.taskId,
          claim.unitId,
        ),
      )
    ) {
      issues.push(
        `${claim.ownerPath}:${claim.line} claims selected identity MBT replay for ${claim.unitId} without deterministic replay data.`,
      );
    } else if (
      !selectedReplayRowsByMarkerAndActions.has(
        `${unitEvidenceRowKey(
          claim.ownerPath,
          selectedIdentityMbtEvidenceTag,
          claim.taskId,
          claim.unitId,
        )}\u0000${actionSetKey(claim.actionNames)}`,
      )
    ) {
      issues.push(
        `${claim.ownerPath}:${claim.line} claims selected identity MBT replay actions for ${claim.unitId} that do not match deterministic replay data.`,
      );
    }
  }
  for (const claim of scannedUnitEvidence.unitEvidence) {
    if (!unitEvidenceTags.has(claim.evidenceTag)) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has unknown Unit identity evidence tag ${claim.evidenceTag}.`,
      );
    }
    if (claim.taskId.length === 0) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has empty Unit evidence task id.`,
      );
    }
    if (claim.unitIds.length === 0) {
      issues.push(`${claim.ownerPath}:${claim.line} has no Unit evidence ids.`);
    }
    for (const unitId of claim.unitIds) {
      if (
        !unitEvidenceRowsByMarker.has(
          unitEvidenceRowKey(
            claim.ownerPath,
            claim.evidenceTag,
            claim.taskId,
            unitId,
          ),
        )
      ) {
        issues.push(
          `${claim.ownerPath}:${claim.line} claims Unit identity evidence for ${unitId} without a matching unit-evidence.jsonl row.`,
        );
      }
    }
  }
  for (const claim of scannedClaims) {
    if (!unitProfileOwnerClaimKinds.has(claim.claimKind)) {
      issues.push(
        `${claim.ownerPath}:${claim.line} has unknown Unit profile claim kind ${claim.claimKind}.`,
      );
    }
    for (const profileId of claim.profileIds) {
      if (!profileIds.has(profileId)) {
        issues.push(
          `${claim.ownerPath}:${claim.line} references unknown Unit profile ${profileId}.`,
        );
      }
    }
  }
  for (const profile of profiles) {
    for (const ownerPath of profile.qntOwners) {
      if (!hasOwnerClaim(scannedClaims, ownerPath, "qnt-owner", profile.id)) {
        issues.push(
          `${profile.id} qnt owner ${ownerPath} lacks UNIT-PROFILE-COVERAGE claim.`,
        );
      }
    }
    for (const ownerPath of profile.runtimeOwners) {
      if (
        !hasOwnerClaim(scannedClaims, ownerPath, "runtime-owner", profile.id)
      ) {
        issues.push(
          `${profile.id} runtime owner ${ownerPath} lacks UNIT-PROFILE-COVERAGE claim.`,
        );
      }
    }
    for (const owner of profile.verificationOwners) {
      const claimKind = `verification-owner:${owner.kind}`;
      if (
        !hasOwnerClaim(scannedClaims, owner.ownerPath, claimKind, profile.id)
      ) {
        issues.push(
          `${profile.id} verification owner ${owner.ownerPath} lacks ${claimKind} claim.`,
        );
      }
    }
    if (
      hasVerificationOwner(profile, "qnt-proof") &&
      !qntProofTaskClaimProfileIds.has(profile.id)
    ) {
      issues.push(
        `${profile.id} has qnt-proof verification ownership but no qnt-proof task claim.`,
      );
    }
    if (
      hasRuntimeParityOwner(profile) &&
      !runtimeParityTaskClaimProfileIds.has(profile.id)
    ) {
      issues.push(
        `${profile.id} has runtime parity verification ownership but no completed runtime parity task claim.`,
      );
    }
    for (const taskId of profile.taskRefs ?? []) {
      if (!taskClaimIncludesProfile(taskClaims, taskId, profile.id)) {
        issues.push(
          `${profile.id} taskRefs includes ${taskId} but no matching task claim includes the profile.`,
        );
      }
    }
  }
  for (const taskClaim of taskClaims) {
    for (const profileId of taskClaim.profileIds ?? []) {
      if (!profileIds.has(profileId)) {
        issues.push(
          `Task claim ${taskClaim.taskId} references missing profile ${profileId}.`,
        );
        continue;
      }
      const profile = profiles.find((candidate) => candidate.id === profileId);
      if (!(profile.taskRefs ?? []).includes(taskClaim.taskId)) {
        issues.push(
          `Task claim ${taskClaim.taskId} includes ${profileId} but the profile taskRefs do not include the task.`,
        );
      }
    }
    if (taskClaim.claimKind === "qnt-proof") {
      for (const profileId of taskClaim.profileIds ?? []) {
        const profile = profiles.find(
          (candidate) => candidate.id === profileId,
        );
        if (
          profile !== undefined &&
          !hasVerificationOwner(profile, "qnt-proof")
        ) {
          issues.push(
            `QNT proof task claim ${taskClaim.taskId} for ${profileId} has no qnt-proof verification owner.`,
          );
        }
      }
    }
    if (completedRuntimeParityKinds.has(taskClaim.claimKind)) {
      for (const profileId of taskClaim.profileIds ?? []) {
        const profile = profiles.find(
          (candidate) => candidate.id === profileId,
        );
        if (profile !== undefined && !hasRuntimeParityOwner(profile)) {
          issues.push(
            `Completed runtime parity claim ${taskClaim.taskId} for ${profileId} has no MBT/runtime-test owner.`,
          );
        }
      }
    }
  }
  return issues;
}

function hasVerificationOwner(profile, kind) {
  return (profile.verificationOwners ?? []).some(
    (owner) => owner.kind === kind,
  );
}

function hasRuntimeParityOwner(profile) {
  return (profile.verificationOwners ?? []).some(
    (owner) => owner.kind === "focused-mbt" || owner.kind === "runtime-test",
  );
}

function taskClaimProfileIds(taskClaims, claimKindMatches) {
  return new Set(
    taskClaims.flatMap((taskClaim) =>
      claimKindMatches(taskClaim.claimKind) ? (taskClaim.profileIds ?? []) : [],
    ),
  );
}

function taskClaimIncludesProfile(taskClaims, taskId, profileId) {
  return taskClaims.some(
    (taskClaim) =>
      taskClaim.taskId === taskId &&
      (taskClaim.profileIds ?? []).includes(profileId),
  );
}

function validateSelectedIdentityHardGate({
  inventory,
  unitClaims,
  unitEvidence,
}) {
  const selectedIdentityEvidenceUnitIds = new Set(
    unitEvidence
      .filter((row) => row.evidence?.tag === selectedIdentityMbtEvidenceTag)
      .map((row) => row.unitId),
  );
  const claimsByUnitId = new Map(
    unitClaims.map((claim) => [claim.unitId, claim]),
  );
  const issues = [];

  for (const unit of inventory) {
    if (unit.executableMechanics !== true) continue;
    const claim = claimsByUnitId.get(unit.unitId);
    if (
      claim?.claim?.tag !== "supported-profile" &&
      claim?.claim?.tag !== "profile-subset-supported"
    ) {
      continue;
    }
    if (selectedIdentityEvidenceUnitIds.has(unit.unitId)) continue;
    if (hasSelectedIdentityNonApplicableDisposition(claim)) continue;
    issues.push(
      `Supported executable Unit ${unit.unitId} has no ${selectedIdentityMbtEvidenceTag} evidence and no selectedIdentityEvidenceDisposition not-applicable classification.`,
    );
  }

  return issues;
}

function validateCoverageInputs({
  root,
  collections,
  inventory,
  profiles,
  unitClaims,
  unitEvidence,
  taskClaims,
  authoredSurfaceUnits,
  scannedClaims,
}, options = {}) {
  const issues = [
    ...rulesKernelProfileKindClassificationIssues(),
    ...validateCollections(collections.collections, inventory),
    ...validateProfiles(profiles),
    ...validateUnitClaims(
      unitClaims,
      inventory,
      authoredSurfaceUnits,
      profiles,
    ),
    ...validateUnitEvidence(root, unitEvidence, unitClaims, scannedClaims, [
      ...inventory,
      ...authoredSurfaceUnits,
    ]),
    ...validateOwnerClaims(
      profiles,
      taskClaims,
      scannedClaims.profileClaims,
      scannedClaims,
      unitEvidence,
    ),
  ];
  if (options.selectedIdentityHardGate === true) {
    issues.push(
      ...validateSelectedIdentityHardGate({
        inventory,
        unitClaims,
        unitEvidence,
      }),
    );
  }
  return issues;
}

module.exports = {
  validateCollections,
  validateCoverageInputs,
  validateOwnerClaims,
};
