#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.env.UNIT_PROFILE_COVERAGE_ROOT ?? process.cwd();
const coverageDir = path.join(root, "plans/unit-profile-coverage");
const write = process.argv.includes("--write");

const paths = {
  collections: path.join(coverageDir, "collections.json"),
  profiles: path.join(coverageDir, "profiles.jsonl"),
  unitClaims: path.join(coverageDir, "unit-claims.jsonl"),
  unitEvidence: path.join(coverageDir, "unit-evidence.jsonl"),
  taskClaims: path.join(coverageDir, "task-claims.jsonl"),
  matrix: path.join(coverageDir, "unit-matrix.json"),
  report: path.join(coverageDir, "UNIT_REPORT.md"),
};

const collectionIds = new Set(["srd-5.2.1", "classic-2024-non-srd-mechanics"]);
const profileKinds = new Set([
  "character-creation",
  "passive",
  "action",
  "bonus-action",
  "reaction",
  "spell-invocation",
  "persistent-effect",
  "summoned-companion",
  "stat-block-control",
  "resource",
  "equipment",
  "table-caller",
]);
const claimTags = new Set([
  "supported-profile",
  "unsupported-profile",
  "needs-surface-widening",
  "needs-assumption",
  "closed-by-assumption",
]);
const deterministicAdmissionProjectionEvidenceTag =
  "deterministic-admission-projection";
const selectedIdentityMbtEvidenceTag = "selected-identity-mbt";
const unitEvidenceTags = new Set([
  deterministicAdmissionProjectionEvidenceTag,
  selectedIdentityMbtEvidenceTag,
]);
const unitProfileOwnerClaimKinds = new Set([
  "qnt-owner",
  "runtime-owner",
  "verification-owner:qnt-proof",
  "verification-owner:focused-mbt",
  "verification-owner:runtime-test",
]);
const executableProfileKinds = new Set([
  "action",
  "bonus-action",
  "reaction",
  "spell-invocation",
  "persistent-effect",
  "summoned-companion",
  "stat-block-control",
  "resource",
]);
const completedRuntimeParityKinds = new Set([
  "completed-runtime-parity",
  "runtime-parity",
]);
const skippedClaimScanDirs = new Set([
  ".git",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);
const fungiTerms = [
  "agaric",
  "bolete",
  "chanterelle",
  "fungi",
  "fungus",
  "hypha",
  "morel",
  "mushroom",
  "mycelium",
  "porcini",
  "spore",
  "truffle",
];
const protectedExpressionFields = new Set([
  "name",
  "description",
  "flavorText",
  "rulesText",
  "examples",
  "lore",
  "artwork",
  "canonicalName",
  "canonicalSource",
]);
const nearCanonicalDenyList = [
  "action surge",
  "cunning action",
  "rage",
  "sneak attack",
  "uncanny dodge",
  "shield",
  "magic missile",
  "fireball",
];
const surfaceUnitKinds = new Set([
  "armor",
  "armor_template",
  "background",
  "class",
  "class_feature",
  "feat",
  "magic_item",
  "mastery",
  "shield",
  "shield_template",
  "species",
  "species_trait",
  "subclass",
  "weapon",
  "weapon_template",
  "spell",
]);

function fail(message) {
  throw new Error(message);
}

function toRepoPath(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail(
          `${toRepoPath(filePath)}:${index + 1} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function writeOrCompare(filePath, text) {
  if (write) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return;
  }
  const actual = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  if (actual !== text) {
    fail(
      `${toRepoPath(filePath)} is stale. Run node scripts/unit-profile-coverage-check.cjs --write.`,
    );
  }
}

function discoverSrdUnits(collection) {
  const catalogPath = path.join(root, collection.discovery.sourcePath);
  const source = fs.readFileSync(catalogPath, "utf8");
  const imports = new Map(
    [
      ...source.matchAll(
        /import (\w+) from "\.\.\/\.\.\/content\/([^"]+)\.json";/g,
      ),
    ].map((match) => [match[1], `${match[2]}.json`]),
  );
  const unitsBlock = source.match(
    /export const srdUnitCollection[\s\S]*?units: \[([\s\S]*?)\]\.map/,
  );
  if (!unitsBlock)
    fail(
      `Could not find srdUnitCollection units in ${collection.discovery.sourcePath}.`,
    );

  return [...unitsBlock[1].matchAll(/\b(\w+Input)\b/g)].map((match) => {
    const importName = match[1];
    const importPath = imports.get(importName);
    if (!importPath)
      fail(
        `Could not resolve ${importName} import in ${collection.discovery.sourcePath}.`,
      );
    const sourceRecordPath = `packages/surface/content/${importPath}`;
    const record = readJson(path.join(root, sourceRecordPath));
    return {
      unitId: record.id,
      collectionId: collection.id,
      sourceRecordPath,
      kind: record.kind,
      provenance: record.provenance,
      executableMechanics: Boolean(record.mechanics),
      rawRecord: record,
    };
  });
}

function discoverClassicFixtureUnits(collection) {
  const fixtureDir = path.join(root, collection.discovery.sourcePath);
  return fs
    .readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const sourceRecordPath = `${collection.discovery.sourcePath}/${entry.name}`;
      const record = readJson(path.join(root, sourceRecordPath));
      return {
        unitId: record.id,
        collectionId: collection.id,
        syntheticLabel: record.syntheticLabel,
        sourceRecordPath,
        kind: "classic-non-srd-mechanics-fixture",
        provenance: record.provenance,
        executableMechanics: Boolean(record.mechanics),
        rawRecord: record,
      };
    });
}

function discoverInventory(collections) {
  return collections.flatMap((collection) => {
    if (collection.discovery.kind === "surface-srd-unit-catalog") {
      return discoverSrdUnits(collection);
    }
    if (collection.discovery.kind === "classic-fixture-directory") {
      return discoverClassicFixtureUnits(collection);
    }
    fail(`Unknown collection discovery kind: ${collection.discovery.kind}`);
  });
}

function discoverAuthoredSurfaceUnits() {
  const contentDir = path.join(root, "packages/surface/content");
  return fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const sourceRecordPath = `packages/surface/content/${entry.name}`;
      const record = readJson(path.join(root, sourceRecordPath));
      if (!surfaceUnitKinds.has(record.kind)) return [];
      return [
        {
          unitId: record.id,
          sourceRecordPath,
          kind: record.kind,
          provenance: record.provenance,
          executableMechanics: Boolean(record.mechanics),
          rawRecord: record,
        },
      ];
    });
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

function validateUnitEvidence(evidenceRows, unitClaims, scannedUnitEvidence) {
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
        scannedUnitEvidence,
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
  }

  return issues;
}

function scanClaimFiles() {
  const claims = [];
  const unitEvidence = [];
  function visit(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skippedClaimScanDirs.has(entry.name))
          visit(path.join(dirPath, entry.name));
        continue;
      }
      if (!entry.isFile() || !/\.(md|qnt|ts|tsx|js|cjs|mjs)$/.test(entry.name))
        continue;
      const filePath = path.join(dirPath, entry.name);
      const text = fs.readFileSync(filePath, "utf8");
      const repoPath = toRepoPath(filePath);
      for (const [index, line] of text.split("\n").entries()) {
        const match = line.match(/UNIT-PROFILE-COVERAGE:\s+(\S+)\s+(.+)$/);
        if (match) {
          const claimKind = match[1];
          const profileIds = match[2].trim().split(/\s+/);
          claims.push({
            ownerPath: repoPath,
            line: index + 1,
            claimKind,
            profileIds,
          });
        }
        const unitEvidenceMatch = line.match(
          /UNIT-IDENTITY-EVIDENCE:\s+(\S+)\s+(\S+)\s+(.+)$/,
        );
        if (unitEvidenceMatch) {
          unitEvidence.push({
            ownerPath: repoPath,
            line: index + 1,
            evidenceTag: unitEvidenceMatch[1],
            taskId: unitEvidenceMatch[2],
            unitIds: unitEvidenceMatch[3].trim().split(/\s+/),
          });
        }
      }
    }
  }
  visit(root);
  return { profileClaims: claims, unitEvidence };
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

function unitEvidenceRowKey(ownerPath, evidenceTag, taskId, unitId) {
  return `${ownerPath}\u0000${evidenceTag}\u0000${taskId}\u0000${unitId}`;
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
  for (const claim of scannedUnitEvidence) {
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

function groupUnitEvidence(unitEvidence) {
  const grouped = new Map();
  for (const row of unitEvidence) {
    const current = grouped.get(row.unitId) ?? [];
    current.push(row);
    grouped.set(row.unitId, current);
  }
  return grouped;
}

function buildMatrix({
  collections,
  inventory,
  authoredSurfaceUnits,
  profiles,
  unitClaims,
  unitEvidence,
  taskClaims,
}) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const claimsByUnit = new Map(
    unitClaims.map((claim) => [claim.unitId, claim]),
  );
  const evidenceByUnit = groupUnitEvidence(unitEvidence);
  const installedSourcePaths = new Set(
    inventory.map((unit) => unit.sourceRecordPath),
  );
  const authoredUnitIdCounts = authoredSurfaceUnits.reduce((counts, unit) => {
    counts.set(unit.unitId, (counts.get(unit.unitId) ?? 0) + 1);
    return counts;
  }, new Map());
  const units = inventory
    .map((unit) => {
      const claim = claimsByUnit.get(unit.unitId);
      return stable({
        unitId: unit.unitId,
        collectionId: unit.collectionId,
        catalogAdmission: {
          status: "installed",
          collectionId: unit.collectionId,
        },
        sourceRecordPath: unit.sourceRecordPath,
        syntheticLabel: unit.syntheticLabel ?? claim?.syntheticLabel,
        kind: unit.kind,
        executableMechanics: unit.executableMechanics,
        authoredSurfaceDuplicateIdCount:
          authoredUnitIdCounts.get(unit.unitId) ?? undefined,
        claim: claim?.claim,
        profiles:
          claim?.claim?.tag === "supported-profile"
            ? claim.claim.profileIds.map((profileId) =>
                profileMap.get(profileId),
              )
            : [],
        evidence: (evidenceByUnit.get(unit.unitId) ?? []).map(
          (row) => row.evidence,
        ),
      });
    })
    .concat(
      authoredSurfaceUnits
        .filter((unit) => !installedSourcePaths.has(unit.sourceRecordPath))
        .map((unit) =>
          stable({
            unitId: unit.unitId,
            collectionId: undefined,
            catalogAdmission: {
              status: "not-in-unit-catalog",
              expectedCollectionId:
                unit.provenance?.kind === "srd-5.2.1" ? "srd-5.2.1" : undefined,
            },
            sourceRecordPath: unit.sourceRecordPath,
            kind: unit.kind,
            executableMechanics: unit.executableMechanics,
            authoredSurfaceDuplicateIdCount:
              authoredUnitIdCounts.get(unit.unitId) ?? undefined,
            claim: undefined,
            profiles: [],
            evidence: [],
          }),
        ),
    );
  const executableProfiles = profiles.filter((profile) =>
    executableProfileKinds.has(profile.profileKind),
  );
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    collectionBoundaryNote:
      "SRD 5.2.1 is conceptually part of Classic, but stored separately for SRD provenance and distribution policy; the Classic 2024 library is a derived view.",
    collections: collections.collections,
    derivedViews: collections.derivedViews,
    metrics: metrics({
      inventory,
      authoredSurfaceUnits,
      profiles,
      unitClaims,
      unitEvidence,
      executableProfiles,
    }),
    units,
    profiles,
    taskClaims,
  });
}

function percent(numerator, denominator) {
  if (denominator === 0) return "n/a";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function metrics({
  inventory,
  authoredSurfaceUnits,
  profiles,
  unitClaims,
  unitEvidence,
  executableProfiles,
}) {
  const classified = unitClaims.length;
  const supportedUnitClaims = unitClaims.filter(
    (claim) => claim.claim.tag === "supported-profile",
  );
  const deterministicAdmissionProjection = new Set(
    unitEvidence
      .filter(
        (row) =>
          row.evidence.tag === deterministicAdmissionProjectionEvidenceTag,
      )
      .map((row) => row.unitId),
  );
  const selectedIdentityMbt = new Set(
    unitEvidence
      .filter((row) => row.evidence.tag === selectedIdentityMbtEvidenceTag)
      .map((row) => row.unitId),
  );
  const executableUnits = inventory.filter((unit) => unit.executableMechanics);
  const classicUnits = inventory.filter(
    (unit) => unit.collectionId === "classic-2024-non-srd-mechanics",
  );
  const installedSurfaceSourcePaths = new Set(
    inventory
      .filter((unit) =>
        unit.sourceRecordPath.startsWith("packages/surface/content/"),
      )
      .map((unit) => unit.sourceRecordPath),
  );
  const authoredSurfaceAdmitted = authoredSurfaceUnits.filter((unit) =>
    installedSurfaceSourcePaths.has(unit.sourceRecordPath),
  );
  const authoredSurfaceExecutable = authoredSurfaceUnits.filter(
    (unit) => unit.executableMechanics,
  );
  const authoredSurfaceExecutableAdmitted = authoredSurfaceExecutable.filter(
    (unit) => installedSurfaceSourcePaths.has(unit.sourceRecordPath),
  );
  const qntModeled = executableProfiles.filter(
    (profile) => (profile.qntOwners ?? []).length > 0,
  );
  const qntProved = executableProfiles.filter((profile) =>
    (profile.verificationOwners ?? []).some(
      (owner) => owner.kind === "qnt-proof",
    ),
  );
  const runtimeMapped = executableProfiles.filter(
    (profile) => (profile.runtimeOwners ?? []).length > 0,
  );
  const runtimeParity = executableProfiles.filter((profile) =>
    (profile.verificationOwners ?? []).some(
      (owner) => owner.kind === "focused-mbt" || owner.kind === "runtime-test",
    ),
  );
  return {
    collectionInventoryCoverage: {
      numerator: inventory.length,
      denominator: inventory.length,
      percent: percent(inventory.length, inventory.length),
    },
    authoredSurfaceUnitCatalogAdmissionCoverage: {
      numerator: authoredSurfaceAdmitted.length,
      denominator: authoredSurfaceUnits.length,
      percent: percent(
        authoredSurfaceAdmitted.length,
        authoredSurfaceUnits.length,
      ),
    },
    authoredSurfaceExecutableCatalogAdmissionCoverage: {
      numerator: authoredSurfaceExecutableAdmitted.length,
      denominator: authoredSurfaceExecutable.length,
      percent: percent(
        authoredSurfaceExecutableAdmitted.length,
        authoredSurfaceExecutable.length,
      ),
    },
    profileClassificationCoverage: {
      numerator: classified,
      denominator: inventory.length,
      percent: percent(classified, inventory.length),
    },
    supportedProfileCoverage: {
      numerator: supportedUnitClaims.length,
      denominator: executableUnits.length,
      percent: percent(supportedUnitClaims.length, executableUnits.length),
    },
    qntProfileModelingCoverage: {
      numerator: qntModeled.length,
      denominator: executableProfiles.length,
      percent: percent(qntModeled.length, executableProfiles.length),
    },
    qntProofCoverage: {
      numerator: qntProved.length,
      denominator: executableProfiles.length,
      percent: percent(qntProved.length, executableProfiles.length),
    },
    runtimeMappingCoverage: {
      numerator: runtimeMapped.length,
      denominator: executableProfiles.length,
      percent: percent(runtimeMapped.length, executableProfiles.length),
    },
    runtimeParityCoverage: {
      numerator: runtimeParity.length,
      denominator: executableProfiles.length,
      percent: percent(runtimeParity.length, executableProfiles.length),
    },
    deterministicAdmissionProjectionCoverage: {
      numerator: deterministicAdmissionProjection.size,
      denominator: supportedUnitClaims.length,
      percent: percent(
        deterministicAdmissionProjection.size,
        supportedUnitClaims.length,
      ),
    },
    selectedIdentityMbtCoverage: {
      numerator: selectedIdentityMbt.size,
      denominator: supportedUnitClaims.length,
      percent: percent(selectedIdentityMbt.size, supportedUnitClaims.length),
    },
    classicNonSrdExpressionGate: {
      numerator: classicUnits.length,
      denominator: classicUnits.length,
      percent: percent(classicUnits.length, classicUnits.length),
    },
  };
}

function renderMetric(label, metric) {
  return `| ${label} | ${metric.numerator}/${metric.denominator} | ${metric.percent} |`;
}

function renderReport(matrix) {
  const installedUnits = matrix.units.filter(
    (unit) => unit.catalogAdmission?.status === "installed",
  );
  const authoredNotInCatalog = matrix.units.filter(
    (unit) => unit.catalogAdmission?.status === "not-in-unit-catalog",
  );
  const unsupported = installedUnits.filter(
    (unit) => unit.claim?.tag !== "supported-profile",
  );
  const supported = installedUnits.filter(
    (unit) => unit.claim?.tag === "supported-profile",
  );
  const authoredNotInCatalogByKind = Array.from(
    authoredNotInCatalog
      .reduce((groups, unit) => {
        const current = groups.get(unit.kind) ?? [];
        current.push(unit.unitId);
        groups.set(unit.kind, current);
        return groups;
      }, new Map())
      .entries(),
  ).sort(
    ([kindA, unitsA], [kindB, unitsB]) =>
      unitsB.length - unitsA.length || kindA.localeCompare(kindB),
  );
  const deterministicEvidence = supported.flatMap((unit) =>
    (unit.evidence ?? [])
      .filter(
        (evidence) =>
          evidence.tag === deterministicAdmissionProjectionEvidenceTag,
      )
      .map((evidence) => ({ unit, evidence })),
  );
  const selectedIdentityMbtEvidence = supported.flatMap((unit) =>
    (unit.evidence ?? [])
      .filter((evidence) => evidence.tag === selectedIdentityMbtEvidenceTag)
      .map((evidence) => ({ unit, evidence })),
  );
  const unsupportedPressure = Array.from(
    unsupported
      .reduce((groups, unit) => {
        const key = [
          unit.collectionId,
          unit.claim?.futureProfileOwner ?? "unassigned",
          unit.claim?.tag ?? "missing",
        ].join("\u0000");
        const current = groups.get(key) ?? {
          collectionId: unit.collectionId,
          futureProfileOwner: unit.claim?.futureProfileOwner ?? "unassigned",
          disposition: unit.claim?.tag ?? "missing",
          units: [],
        };
        current.units.push(unit.unitId);
        groups.set(key, current);
        return groups;
      }, new Map())
      .values(),
  ).sort(
    (a, b) =>
      b.units.length - a.units.length ||
      a.collectionId.localeCompare(b.collectionId) ||
      a.futureProfileOwner.localeCompare(b.futureProfileOwner) ||
      a.disposition.localeCompare(b.disposition),
  );
  const supportedProfilesWithoutParity = matrix.profiles.filter(
    (profile) =>
      executableProfileKinds.has(profile.profileKind) &&
      !(profile.verificationOwners ?? []).some(
        (owner) =>
          owner.kind === "focused-mbt" || owner.kind === "runtime-test",
      ),
  );
  const taskLines = matrix.taskClaims.map((claim) => {
    const profiles =
      (claim.profileIds ?? []).length > 0
        ? claim.profileIds.map((id) => `\`${id}\``).join(", ")
        : "_none_";
    return `| ${claim.taskId} | ${claim.claimKind} | ${profiles} |`;
  });

  return `${[
    "# Unit Profile Coverage Report",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    "SRD 5.2.1 is conceptually part of Classic, but it is stored separately because the SRD collection has Creative Commons SRD provenance and distribution policy. The Classic 2024 library is a derived view from the SRD collection plus the Classic non-SRD mechanics-only collection; mixed authored provenance is not a valid collection state.",
    "",
    "## Metrics",
    "",
    "| Metric | Covered | Percent |",
    "| --- | ---: | ---: |",
    renderMetric(
      "Collection inventory coverage",
      matrix.metrics.collectionInventoryCoverage,
    ),
    renderMetric(
      "Authored Surface Unit catalog admission",
      matrix.metrics.authoredSurfaceUnitCatalogAdmissionCoverage,
    ),
    renderMetric(
      "Authored Surface executable catalog admission",
      matrix.metrics.authoredSurfaceExecutableCatalogAdmissionCoverage,
    ),
    renderMetric(
      "Profile classification coverage",
      matrix.metrics.profileClassificationCoverage,
    ),
    renderMetric(
      "Supported profile coverage",
      matrix.metrics.supportedProfileCoverage,
    ),
    renderMetric(
      "QNT profile modeling coverage",
      matrix.metrics.qntProfileModelingCoverage,
    ),
    renderMetric("QNT proof coverage", matrix.metrics.qntProofCoverage),
    renderMetric(
      "Runtime mapping coverage",
      matrix.metrics.runtimeMappingCoverage,
    ),
    renderMetric(
      "Runtime parity coverage",
      matrix.metrics.runtimeParityCoverage,
    ),
    renderMetric(
      "Deterministic admission/projection coverage",
      matrix.metrics.deterministicAdmissionProjectionCoverage,
    ),
    renderMetric(
      "Selected identity MBT coverage",
      matrix.metrics.selectedIdentityMbtCoverage,
    ),
    renderMetric(
      "Classic non-SRD expression gate",
      matrix.metrics.classicNonSrdExpressionGate,
    ),
    "",
    "## Supported Unit Claims",
    "",
    "| Unit | Collection | Profiles |",
    "| --- | --- | --- |",
    ...supported.map(
      (unit) =>
        `| \`${unit.unitId}\` | ${unit.collectionId} | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} |`,
    ),
    "",
    "## Authored Surface Units Not In Unit Catalog",
    "",
    "| Kind | Count | Units |",
    "| --- | ---: | --- |",
    ...(authoredNotInCatalogByKind.length === 0
      ? ["| _none_ | 0 | _none_ |"]
      : authoredNotInCatalogByKind.map(
          ([kind, units]) =>
            `| ${kind} | ${units.length} | ${units.map((unitId) => `\`${unitId}\``).join(", ")} |`,
        )),
    "",
    "| Unit | Kind | Mechanics | Source |",
    "| --- | --- | --- | --- |",
    ...(authoredNotInCatalog.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : authoredNotInCatalog.map(
          (unit) =>
            `| \`${unit.unitId}\` | ${unit.kind} | ${unit.executableMechanics ? "yes" : "no"} | \`${unit.sourceRecordPath}\` |`,
        )),
    "",
    "## Deterministic Admission/Projection Evidence",
    "",
    "| Unit | Profiles | Task | Owner |",
    "| --- | --- | --- | --- |",
    ...(deterministicEvidence.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : deterministicEvidence.map(
          ({ unit, evidence }) =>
            `| \`${unit.unitId}\` | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${evidence.taskId} | \`${evidence.ownerPath}\` |`,
        )),
    "",
    "## Selected Identity MBT Evidence",
    "",
    "| Unit | Profiles | Task | Owner |",
    "| --- | --- | --- | --- |",
    ...(selectedIdentityMbtEvidence.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : selectedIdentityMbtEvidence.map(
          ({ unit, evidence }) =>
            `| \`${unit.unitId}\` | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${evidence.taskId} | \`${evidence.ownerPath}\` |`,
        )),
    "",
    "## Unsupported And Widening Pressure",
    "",
    "| Unit | Disposition | Detail |",
    "| --- | --- | --- |",
    ...unsupported.map(
      (unit) =>
        `| \`${unit.unitId}\` | ${unit.claim?.tag ?? "missing"} | ${unit.claim?.reason ?? unit.claim?.issue ?? unit.claim?.assumptionId ?? ""} |`,
    ),
    "",
    "## Unsupported Pressure Summary",
    "",
    "| Collection | Future owner | Disposition | Count | Units |",
    "| --- | --- | --- | ---: | --- |",
    ...unsupportedPressure.map(
      (group) =>
        `| ${group.collectionId} | ${group.futureProfileOwner} | ${group.disposition} | ${group.units.length} | ${group.units.map((unitId) => `\`${unitId}\``).join(", ")} |`,
    ),
    "",
    "## Profile Claims By Task",
    "",
    "| Task | Claim | Profiles |",
    "| --- | --- | --- |",
    ...taskLines,
    "",
    "## Supported Profiles Lacking Runtime Parity",
    "",
    ...(supportedProfilesWithoutParity.length === 0
      ? [
          "All executable supported profiles currently have focused MBT or runtime-test owners.",
        ]
      : supportedProfilesWithoutParity.map((profile) => `- \`${profile.id}\``)),
    "",
  ].join("\n")}`;
}

function main() {
  const collections = readJson(paths.collections);
  const profiles = readJsonl(paths.profiles);
  const unitClaims = readJsonl(paths.unitClaims);
  const unitEvidence = readJsonl(paths.unitEvidence);
  const taskClaims = readJsonl(paths.taskClaims);
  const inventory = discoverInventory(collections.collections);
  const authoredSurfaceUnits = discoverAuthoredSurfaceUnits();
  const scannedClaims = scanClaimFiles();
  const issues = [
    ...validateCollections(collections.collections, inventory),
    ...validateProfiles(profiles),
    ...validateUnitClaims(unitClaims, inventory, profiles),
    ...validateUnitEvidence(
      unitEvidence,
      unitClaims,
      scannedClaims.unitEvidence,
    ),
    ...validateOwnerClaims(
      profiles,
      taskClaims,
      scannedClaims.profileClaims,
      scannedClaims.unitEvidence,
      unitEvidence,
    ),
  ];
  if (issues.length > 0) {
    for (const issue of issues)
      console.error(`unit-profile-coverage: ${issue}`);
    process.exitCode = 1;
    return;
  }

  const matrix = buildMatrix({
    collections,
    inventory,
    authoredSurfaceUnits,
    profiles,
    unitClaims,
    unitEvidence,
    taskClaims,
  });
  writeOrCompare(paths.matrix, `${JSON.stringify(matrix, null, 2)}\n`);
  writeOrCompare(paths.report, renderReport(matrix));
  console.log(
    `Unit profile coverage OK: ${inventory.length} Units, ${profiles.length} profiles.`,
  );
}

main();
