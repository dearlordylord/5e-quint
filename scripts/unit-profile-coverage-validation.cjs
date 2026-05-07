const fs = require("node:fs");
const path = require("node:path");
const {
  claimTags,
  collectionIds,
  completedRuntimeParityKinds,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
  fungiTerms,
  nearCanonicalDenyList,
  profileKinds,
  protectedExpressionFields,
  selectedIdentityMbtEvidenceTag,
  unitEvidenceTags,
  unitProfileOwnerClaimKinds,
} = require("./unit-profile-coverage-config.cjs");
const { stable } = require("./unit-profile-coverage-report.cjs");

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

function validateUnitClaims(claims, inventory, profiles) {
  const issues = [];
  const inventoryIds = new Set(inventory.map((unit) => unit.unitId));
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const claimsByUnit = new Map();

  for (const claim of claims) {
    if (!inventoryIds.has(claim.unitId)) {
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
    if (claim.claim.tag === "supported-profile") {
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
  return issues;
}

function validateUnitEvidence(
  root,
  evidenceRows,
  unitClaims,
  scannedUnitEvidence,
) {
  const issues = [];
  const claimsByUnit = new Map(
    unitClaims.map((claim) => [claim.unitId, claim]),
  );
  const seen = new Set();

  for (const row of evidenceRows) {
    const rowKey = `${row.unitId}\u0000${row.evidence?.tag}\u0000${row.evidence?.ownerPath}`;
    if (seen.has(rowKey)) {
      issues.push(
        `Duplicate Unit evidence for ${row.unitId} at ${row.evidence?.ownerPath}.`,
      );
    }
    seen.add(rowKey);

    const claim = claimsByUnit.get(row.unitId);
    if (claim === undefined) {
      issues.push(`Unit evidence references unknown Unit claim ${row.unitId}.`);
      continue;
    }
    if (!claim.claim || claim.claim.tag !== "supported-profile") {
      issues.push(
        `Unit evidence for ${row.unitId} requires a supported-profile claim.`,
      );
      continue;
    }
    if (!row.evidence || !unitEvidenceTags.has(row.evidence.tag)) {
      issues.push(
        `Unit evidence for ${row.unitId} has unknown tag ${row.evidence?.tag}.`,
      );
      continue;
    }
    if (
      typeof row.evidence.taskId !== "string" ||
      row.evidence.taskId.length === 0
    ) {
      issues.push(`Unit evidence for ${row.unitId} requires taskId.`);
    }
    if (
      typeof row.evidence.ownerPath !== "string" ||
      row.evidence.ownerPath.length === 0
    ) {
      issues.push(`Unit evidence for ${row.unitId} requires ownerPath.`);
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
  const unitEvidenceRowsByMarker = new Set(
    unitEvidenceRows.map((row) =>
      unitEvidenceRowKey(
        row.evidence?.ownerPath,
        row.evidence?.tag,
        row.evidence?.taskId,
        row.unitId,
      ),
    ),
  );
  const selectedUnitEvidenceRowsByMarker = new Set(
    unitEvidenceRows
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
  for (const replay of scannedUnitEvidence.selectedUnitIdentityReplays) {
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
  }
  for (const taskClaim of taskClaims) {
    for (const profileId of taskClaim.profileIds ?? []) {
      if (!profileIds.has(profileId)) {
        issues.push(
          `Task claim ${taskClaim.taskId} references missing profile ${profileId}.`,
        );
      }
    }
    if (completedRuntimeParityKinds.has(taskClaim.claimKind)) {
      for (const profileId of taskClaim.profileIds ?? []) {
        const profile = profiles.find(
          (candidate) => candidate.id === profileId,
        );
        const parityOwners =
          profile?.verificationOwners?.filter(
            (owner) =>
              owner.kind === "focused-mbt" || owner.kind === "runtime-test",
          ) ?? [];
        if (parityOwners.length === 0) {
          issues.push(
            `Completed runtime parity claim ${taskClaim.taskId} for ${profileId} has no MBT/runtime-test owner.`,
          );
        }
      }
    }
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
  scannedClaims,
}) {
  return [
    ...validateCollections(collections.collections, inventory),
    ...validateProfiles(profiles),
    ...validateUnitClaims(unitClaims, inventory, profiles),
    ...validateUnitEvidence(root, unitEvidence, unitClaims, scannedClaims),
    ...validateOwnerClaims(
      profiles,
      taskClaims,
      scannedClaims.profileClaims,
      scannedClaims,
      unitEvidence,
    ),
  ];
}

module.exports = {
  validateCollections,
  validateCoverageInputs,
  validateOwnerClaims,
};
