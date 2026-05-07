#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  buildMatrix,
  renderReport,
  stable,
} = require("./unit-profile-coverage-report.cjs");

const root = process.env.UNIT_PROFILE_COVERAGE_ROOT ?? process.cwd();
const coverageDir = path.join(root, "plans/unit-profile-coverage");
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

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
  ".ralph",
  ".turbo",
  ".worktrees",
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
  }

  return issues;
}

function scanClaimFiles() {
  const claims = [];
  const unitEvidence = [];
  const unitIdentityMbtReplays = [];
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
        const unitIdentityMbtReplayMatch = line.match(
          /UNIT-IDENTITY-MBT-REPLAY:\s+(\S+)\s+(\S+)\s+(.+)$/,
        );
        if (unitIdentityMbtReplayMatch) {
          const mbtActionSet = extractMbtFixtureActionSet(text, filePath);
          const driverActionUnitIds = extractDriverActionUnitIds(text);
          unitIdentityMbtReplays.push({
            ownerPath: repoPath,
            line: index + 1,
            taskId: unitIdentityMbtReplayMatch[1],
            unitId: unitIdentityMbtReplayMatch[2],
            actionNames: unitIdentityMbtReplayMatch[3].trim().split(/\s+/),
            declaredActions: extractDriverSchemaActionNames(text),
            driverActionUnitIds,
            stepActionNames: mbtActionSet.actionNames,
            stepDescription: mbtActionSet.description,
          });
        }
      }
    }
  }
  visit(root);
  return { profileClaims: claims, unitEvidence, unitIdentityMbtReplays };
}

function extractDriverSchemaActionNames(text) {
  const schemaMatch = text.match(
    /const\s+driverSchema\s*=\s*\{([\s\S]*?)\}\s+as const;/,
  );
  if (!schemaMatch) return new Set();
  return new Set(
    [...schemaMatch[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*\{\}\s*,/gm)].map(
      (match) => match[1],
    ),
  );
}

function extractDriverActionUnitIds(text) {
  const helperBodies = extractNamedFunctionBodies(text);
  const actionUnitIds = new Map();
  for (const actionName of extractDriverSchemaActionNames(text)) {
    const actionBody = extractDriverActionBody(text, actionName);
    actionUnitIds.set(
      actionName,
      actionBody === undefined
        ? new Set()
        : extractReachableUnitBindingIds(actionBody, helperBodies),
    );
  }
  return actionUnitIds;
}

function extractNamedFunctionBodies(text) {
  const bodies = new Map();
  for (const match of text.matchAll(/\bfunction\s+([A-Za-z_]\w*)\s*\(/g)) {
    const openBrace = text.indexOf("{", match.index);
    if (openBrace === -1) continue;
    const block = extractBalancedBraceBlock(text, openBrace);
    if (block !== undefined) bodies.set(match[1], block.body);
  }
  return bodies;
}

function extractDriverActionBody(text, actionName) {
  const driverBody = extractDriverReturnedObjectBody(text);
  if (driverBody === undefined) return undefined;
  const match = new RegExp(
    String.raw`\b${escapeRegExp(actionName)}\s*:\s*\(\)\s*=>\s*`,
    "m",
  ).exec(driverBody);
  if (!match) return undefined;
  const bodyStart = match.index + match[0].length;
  if (driverBody[bodyStart] === "{") {
    return extractBalancedBraceBlock(driverBody, bodyStart)?.body;
  }
  const lineEnd = driverBody.indexOf("\n", bodyStart);
  const bodyEnd = lineEnd === -1 ? driverBody.length : lineEnd;
  return driverBody.slice(bodyStart, bodyEnd).replace(/,\s*$/, "");
}

function extractDriverReturnedObjectBody(text) {
  const driverMatch = /defineDriver\s*\(\s*driverSchema\s*,/.exec(text);
  if (!driverMatch) return undefined;
  const driverText = text.slice(driverMatch.index);
  const conciseMatch = /=>\s*\(\s*\{/.exec(driverText);
  const returnMatch = /\breturn\s*\{/.exec(driverText);
  if (
    conciseMatch !== null &&
    (returnMatch === null || conciseMatch.index < returnMatch.index)
  ) {
    const openBrace =
      driverMatch.index + conciseMatch.index + conciseMatch[0].lastIndexOf("{");
    return extractBalancedBraceBlock(text, openBrace)?.body;
  }
  if (!returnMatch) return undefined;
  const openBrace =
    driverMatch.index + returnMatch.index + returnMatch[0].lastIndexOf("{");
  return extractBalancedBraceBlock(text, openBrace)?.body;
}

function extractBalancedBraceBlock(text, openBrace) {
  let depth = 0;
  for (let index = openBrace; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          body: text.slice(openBrace + 1, index),
          end: index + 1,
        };
      }
    }
  }
  return undefined;
}

function extractReachableUnitBindingIds(rootBody, helperBodies) {
  const visited = new Set();
  const unitIds = new Set();
  function visit(body) {
    collectUnitBoundaryLiterals(body, unitIds);
    for (const call of body.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
      const helperName = call[1];
      if (visited.has(helperName)) continue;
      const helperBody = helperBodies.get(helperName);
      if (helperBody === undefined) continue;
      visited.add(helperName);
      visit(helperBody);
    }
  }
  visit(rootBody);
  return unitIds;
}

function collectUnitBoundaryLiterals(body, unitIds) {
  const boundaryPatterns = [
    /\b(?:unitFeatureSubject|unitResource)\s*\(\s*"([A-Za-z0-9_-]+)"/g,
    /\bunitLibrary\.requireUnit\s*\(\s*"([A-Za-z0-9_-]+)"/g,
    /\b(?:unitId|activatedOngoingFeatureUnitId)\s*:\s*"([A-Za-z0-9_-]+)"/g,
    /\bselectedAttackDamageRiderUnitIds\s*:\s*\[\s*"([A-Za-z0-9_-]+)"/g,
  ];
  for (const pattern of boundaryPatterns) {
    for (const match of body.matchAll(pattern)) {
      unitIds.add(match[1]);
    }
  }
}

function extractMbtFixtureActionSet(text, filePath) {
  const runMatch = text.match(
    /run\s*\(\s*\{[\s\S]*?spec:\s*path\.resolve\(import\.meta\.dirname,\s*"([^"]+\.qnt)"\)[\s\S]*?step:\s*"([A-Za-z_]\w*)"[\s\S]*?\}\s*\)/,
  );
  if (!runMatch) {
    return {
      actionNames: new Set(),
      description: "no focused MBT run spec/step",
    };
  }
  const specPath = path.resolve(path.dirname(filePath), runMatch[1]);
  const stepName = runMatch[2];
  if (!fs.existsSync(specPath)) {
    return {
      actionNames: new Set(),
      description: `${toRepoPath(specPath)} ${stepName}`,
    };
  }
  const specText = fs.readFileSync(specPath, "utf8");
  return {
    actionNames: extractQuintAnyActionNames(specText, stepName),
    description: `${toRepoPath(specPath)} ${stepName}`,
  };
}

function extractQuintAnyActionNames(text, actionName) {
  const actionMatch = text.match(
    new RegExp(
      String.raw`action\s+${escapeRegExp(actionName)}\s*=\s*any\s*\{([\s\S]*?)\n\s*\}`,
      "m",
    ),
  );
  if (!actionMatch) return new Set();
  return new Set(
    actionMatch[1]
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").replace(/,.*$/, "").trim())
      .filter((line) => /^[A-Za-z_]\w*$/.test(line)),
  );
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
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

function hasUnitIdentityMbtReplay(
  scannedClaims,
  ownerPath,
  taskId,
  unitId,
) {
  return scannedClaims.unitIdentityMbtReplays.some(
    (claim) =>
      claim.ownerPath === ownerPath &&
      claim.taskId === taskId &&
      claim.unitId === unitId,
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
      if (!claim.driverActionUnitIds.get(actionName)?.has(claim.unitId)) {
        issues.push(
          `${claim.ownerPath}:${claim.line} cites Unit identity MBT replay action ${actionName} that does not bind Unit id ${claim.unitId}.`,
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

function runSelfTest() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "unit-profile-coverage-self-test-"),
  );
  try {
    const specPath = path.join(tempDir, "fixture.mbt.qnt");
    const testPath = path.join(tempDir, "fixture.mbt.test.ts");
    fs.writeFileSync(
      specPath,
      [
        "module fixture {",
        "  action doReachableBareString = true",
        "  action doReachableAction = true",
        "  action doReachableWrongUnit = true",
        "  action step = any {",
        "    doReachableBareString,",
        "    doReachableAction,",
        "    doReachableWrongUnit,",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    const testText = [
      "const driverSchema = {",
      "  doReachableBareString: {},",
      "  doReachableAction: {},",
      "  doDriverOnly: {},",
      "  doReachableWrongUnit: {},",
      "} as const;",
      "function helper() {",
      '  return "other_unit";',
      "}",
      "function bareStringHelper() {",
      '  return "fixture_unit";',
      "}",
      "const driver = defineDriver(driverSchema, () => ({",
      '  doReachableBareString: () => bareStringHelper(),',
      '  doReachableAction: () => unitFeatureSubject("fixture_unit"),',
      "  doReachableWrongUnit: () => helper(),",
      "}));",
      "await run({",
      '  spec: path.resolve(import.meta.dirname, "./fixture.mbt.qnt"),',
      '  step: "step",',
      "});",
      "",
    ].join("\n");
    const fixtureActionSet = extractMbtFixtureActionSet(testText, testPath);
    const issues = validateOwnerClaims(
      [],
      [],
      [],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 1,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doDriverOnly"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 2,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableBareString"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 3,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 4,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableWrongUnit"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
        ],
      },
      [
        {
          unitId: "fixture_unit",
          evidence: {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "QMBT10",
          },
        },
      ],
    );
    const expected =
      `fixture/rule-core-features.mbt.test.ts:1 cites Unit identity MBT replay action doDriverOnly that is not reachable from ${toRepoPath(specPath)} step.`;
    if (!issues.includes(expected)) {
      fail(
        `Self-test failed: expected unreachable Quint step action issue, got ${JSON.stringify(issues)}`,
      );
    }
    const wrongUnitExpected =
      "fixture/rule-core-features.mbt.test.ts:4 cites Unit identity MBT replay action doReachableWrongUnit that does not bind Unit id fixture_unit.";
    if (!issues.includes(wrongUnitExpected)) {
      fail(
        `Self-test failed: expected wrong Unit binding issue, got ${JSON.stringify(issues)}`,
      );
    }
    const bareStringExpected =
      "fixture/rule-core-features.mbt.test.ts:2 cites Unit identity MBT replay action doReachableBareString that does not bind Unit id fixture_unit.";
    if (!issues.includes(bareStringExpected)) {
      fail(
        `Self-test failed: expected bare string literal issue, got ${JSON.stringify(issues)}`,
      );
    }
    const boundaryIssue = issues.find((issue) =>
      issue.includes("doReachableAction"),
    );
    if (boundaryIssue !== undefined) {
      fail(
        `Self-test failed: expected explicit Unit boundary action to pass, got ${JSON.stringify(issues)}`,
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("Unit profile coverage self-test OK.");
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
      scannedClaims,
    ),
    ...validateOwnerClaims(
      profiles,
      taskClaims,
      scannedClaims.profileClaims,
      scannedClaims,
      unitEvidence,
    ),
  ];
  if (issues.length > 0) {
    for (const issue of issues)
      console.error(`unit-profile-coverage: ${issue}`);
    process.exitCode = 1;
    return;
  }

  const matrix = buildMatrix(
    {
      collections,
      inventory,
      authoredSurfaceUnits,
      profiles,
      unitClaims,
      unitEvidence,
      taskClaims,
    },
    {
      executableProfileKinds,
      deterministicAdmissionProjectionEvidenceTag,
      selectedIdentityMbtEvidenceTag,
    },
  );
  writeOrCompare(paths.matrix, `${JSON.stringify(matrix, null, 2)}\n`);
  writeOrCompare(
    paths.report,
    renderReport(matrix, {
      executableProfileKinds,
      deterministicAdmissionProjectionEvidenceTag,
      selectedIdentityMbtEvidenceTag,
    }),
  );
  console.log(
    `Unit profile coverage OK: ${inventory.length} Units, ${profiles.length} profiles.`,
  );
}

if (selfTest) runSelfTest();
else main();
