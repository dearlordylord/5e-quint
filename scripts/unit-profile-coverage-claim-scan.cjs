const fs = require("node:fs");
const path = require("node:path");
const { skippedClaimScanDirs } = require("./unit-profile-coverage-config.cjs");
const { toRepoPath } = require("./unit-profile-coverage-io.cjs");

function scanClaimFiles(root) {
  const claims = [];
  const selectedUnitIdentityReplayConsumers = [];
  const unitEvidence = [];
  const unitIdentityMbtReplays = [];
  const selectedUnitIdentityReplays = [];
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
      const repoPath = toRepoPath(root, filePath);
      for (const replay of extractSelectedUnitIdentityReplays(
        root,
        text,
        filePath,
      )) {
        selectedUnitIdentityReplays.push({
          ownerPath: repoPath,
          ...replay,
        });
      }
      if (hasSelectedUnitIdentityReplayConsumer(text)) {
        selectedUnitIdentityReplayConsumers.push({ ownerPath: repoPath });
      }
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
          const mbtActionSet = extractMbtFixtureActionSet(root, text, filePath);
          unitIdentityMbtReplays.push({
            ownerPath: repoPath,
            line: index + 1,
            taskId: unitIdentityMbtReplayMatch[1],
            unitId: unitIdentityMbtReplayMatch[2],
            actionNames: unitIdentityMbtReplayMatch[3].trim().split(/\s+/),
            declaredActions: extractDriverSchemaActionNames(text),
            stepActionNames: mbtActionSet.actionNames,
            stepDescription: mbtActionSet.description,
          });
        }
      }
    }
  }
  visit(root);
  return {
    profileClaims: claims,
    selectedUnitIdentityReplayConsumers,
    selectedUnitIdentityReplays,
    unitEvidence,
    unitIdentityMbtReplays,
  };
}

function extractSelectedUnitIdentityReplays(rootOrText, maybeText, maybeFilePath) {
  const legacyTextOnlyCall = maybeText === undefined;
  const root = legacyTextOnlyCall ? process.cwd() : rootOrText;
  const text = legacyTextOnlyCall ? rootOrText : maybeText;
  const filePath = legacyTextOnlyCall
    ? path.join(root, "inline-selected-identity-replay.test.ts")
    : maybeFilePath;
  const tableRows = extractTableSelectedUnitIdentityReplays(text);
  const witnessActions = extractSelectedIdentityWitnessActionNames(text);
  if (tableRows.length === 0 && witnessActions.size === 0) {
    return [];
  }
  const reducerReachability = legacyTextOnlyCall
    ? {
        reachable: true,
        entrypoints: [],
        description: "legacy text-only scanner call",
      }
    : selectedIdentityReducerReachability(root, filePath);
  const rows = tableRows.map((row) => ({
    ...row,
    reducerReachability,
  }));
  if (witnessActions.size > 0) {
    for (const match of text.matchAll(
      /UNIT-IDENTITY-MBT-REPLAY:\s+(\S+)\s+(\S+)\s+(.+)$/gm,
    )) {
      const actionNames = match[3].trim().split(/\s+/);
      if (actionNames.every((actionName) => witnessActions.has(actionName))) {
        rows.push({
          taskId: match[1],
          unitId: match[2],
          actionNames,
          reducerReachability,
        });
      }
    }
  }
  return uniqueSelectedUnitIdentityReplayRows(rows);
}

function extractTableSelectedUnitIdentityReplays(text) {
  const tableMatch = text.match(
    /const\s+selectedUnitIdentityReplays\s*=\s*\[([\s\S]*?)\]\s+as const satisfies/s,
  );
  if (!tableMatch) return [];
  return [
    ...tableMatch[1].matchAll(
      /\{\s*taskId:\s*"([^"]+)"[\s\S]*?unitId:\s*"([^"]+)"[\s\S]*?actions:\s*\[([\s\S]*?)\][\s\S]*?sequences:\s*\[/g,
    ),
  ].map((match) => ({
    taskId: match[1],
    unitId: match[2],
    actionNames: [...match[3].matchAll(/"([A-Za-z_]\w*)"/g)].map(
      (actionMatch) => actionMatch[1],
    ),
  }));
}

function hasSelectedUnitIdentityReplayConsumer(text) {
  return (
    /defineSelectedIdentityWitness\s*\(/.test(text) ||
    /it\s*\(\s*"replays selected Unit identities deterministically"/.test(
      text,
    ) &&
    /for\s*\(\s*const\s+replay\s+of\s+selectedUnitIdentityReplays\s*\)/.test(
      text,
    ) &&
    /for\s*\(\s*const\s+sequence\s+of\s+replay\.sequences\s*\)/.test(text)
  );
}

function extractDriverSchemaActionNames(text) {
  return new Set([
    ...[
      ...text.matchAll(
        /const\s+(?:driverSchema|[A-Za-z_]\w*DriverSchema)\s*=\s*\{([\s\S]*?)\}\s+as const;/g,
      ),
    ].flatMap((schemaMatch) =>
      [...schemaMatch[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*\{\}\s*,/gm)].map(
        (match) => match[1],
      ),
    ),
    ...extractSelectedIdentityWitnessActionNames(text),
  ]);
}

function extractMbtFixtureActionSet(root, text, filePath) {
  const runMatches = [
    ...text.matchAll(
      /run\s*\(\s*\{[\s\S]*?spec:\s*path\.resolve\(\s*import\.meta\.dirname\s*,\s*"([^"]+\.qnt)"[\s\S]*?\)[\s\S]*?step:\s*"([A-Za-z_]\w*)"[\s\S]*?\}\s*\)/g,
    ),
    ...[
      ...text.matchAll(
        /run\s*\(\s*\{[\s\S]*?spec:\s*mbtSpecPath\(\s*import\.meta\.dirname\s*,\s*"([^"]+\.qnt)"\s*,?\s*\)[\s\S]*?step:\s*"([A-Za-z_]\w*)"[\s\S]*?\}\s*\)/g,
      ),
    ].map((match) => [undefined, `../${match[1]}`, match[2]]),
  ];
  const selectedIdentityWitnessMatches = [
    ...text.matchAll(
      /defineSelectedIdentityWitness\s*\(\s*\{[\s\S]*?specFile:\s*mbtSpecPath\(\s*import\.meta\.dirname\s*,\s*"([^"]+\.qnt)"\s*,?\s*\)[\s\S]*?\}\s*\)/g,
    ),
  ].map((match) => [undefined, `../${match[1]}`, "step"]);
  const legacySelectedIdentityWitnessMatches = [
    ...text.matchAll(
      /defineSelectedIdentityWitness\s*\(\s*\{[\s\S]*?specFile:\s*path\.resolve\(\s*import\.meta\.dirname\s*,\s*"([^"]+\.qnt)"[\s\S]*?\)[\s\S]*?\}\s*\)/g,
    ),
  ].map((match) => [undefined, match[1], "step"]);
  const allMatches = [...runMatches, ...selectedIdentityWitnessMatches];
  allMatches.push(...legacySelectedIdentityWitnessMatches);
  if (allMatches.length === 0) {
    return {
      actionNames: new Set(),
      description: "no focused MBT run spec/step",
    };
  }

  const actionNames = new Set();
  const descriptions = [];
  for (const runMatch of allMatches) {
    const specPath = path.resolve(path.dirname(filePath), runMatch[1]);
    const stepName = runMatch[2];
    descriptions.push(`${toRepoPath(root, specPath)} ${stepName}`);
    if (!fs.existsSync(specPath)) {
      continue;
    }
    for (const actionName of extractQuintAnyActionNames(
      fs.readFileSync(specPath, "utf8"),
      stepName,
    )) {
      actionNames.add(actionName);
    }
  }

  return {
    actionNames,
    description: descriptions.join(", "),
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
      .map((line) =>
        line
          .replace(/\/\/.*$/, "")
          .replace(/,.*$/, "")
          .trim(),
      )
      .filter((line) => /^[A-Za-z_]\w*$/.test(line)),
  );
}

function uniqueSelectedUnitIdentityReplayRows(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = `${row.taskId}\u0000${row.unitId}\u0000${row.actionNames.join("\u0000")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function extractSelectedIdentityWitnessActionNames(text) {
  if (!/defineSelectedIdentityWitness\s*\(/.test(text)) return new Set();
  return new Set(
    [...text.matchAll(/"((?:do)[A-Za-z_]\w*)"/g)].map((match) => match[1]),
  );
}

function selectedIdentityReducerReachability(root, filePath) {
  const visited = new Set();
  const reachableFiles = [];
  const publicEntrypoints = new Set();
  const packageLocalRuntimeEntrypoints = new Set();
  const isBattleRuntimeOwner = filePath.includes(
    `${path.sep}packages${path.sep}battle-runtime${path.sep}`,
  );
  const isCharacterSheetRuntimeOwner = filePath.includes(
    `${path.sep}packages${path.sep}character-sheet-runtime${path.sep}`,
  );

  function visit(currentFile) {
    if (visited.has(currentFile)) return;
    visited.add(currentFile);
    if (!fs.existsSync(currentFile)) return;
    const text = fs.readFileSync(currentFile, "utf8");
    const importedPublicEntrypoints = [
      ...extractPublicBattleRuntimeEntrypoints(text),
      ...extractPublicCharacterSheetRuntimeEntrypoints(text),
    ];
    const localRuntimeEntrypoints = extractPackageLocalRuntimeEntrypoints(text);
    for (const entrypoint of importedPublicEntrypoints) {
      publicEntrypoints.add(entrypoint);
    }
    for (const entrypoint of localRuntimeEntrypoints) {
      packageLocalRuntimeEntrypoints.add(entrypoint);
    }
    if (
      importedPublicEntrypoints.length > 0 ||
      localRuntimeEntrypoints.length > 0
    ) {
      reachableFiles.push(toRepoPath(root, currentFile));
    }
    for (const importPath of extractRelativeTsImports(text)) {
      const nextFile = resolveRelativeTsImport(currentFile, importPath);
      if (nextFile !== undefined) visit(nextFile);
    }
  }

  visit(filePath);

  const hasCreationOrDiscovery =
    publicEntrypoints.has("startBattle") ||
    publicEntrypoints.has("discoverBattleActs");
  const hasReducerResolution =
    publicEntrypoints.has("resolveBattleSubject") ||
    publicEntrypoints.has("resolveBattleReaction") ||
    publicEntrypoints.has("resolveBattlePossessionAttempt") ||
    publicEntrypoints.has("resolveBattleConcentrationSave");
  const hasCharacterSheetProjection = publicEntrypoints.has(
    "characterSheetArmorClassState",
  );
  const hasPackageLocalRuntimeEntrypoint =
    packageLocalRuntimeEntrypoints.size > 0;
  const reachable =
    (isBattleRuntimeOwner &&
      ((hasCreationOrDiscovery && hasReducerResolution) ||
        hasPackageLocalRuntimeEntrypoint)) ||
    (isCharacterSheetRuntimeOwner &&
      (hasCharacterSheetProjection || hasPackageLocalRuntimeEntrypoint)) ||
    (!isBattleRuntimeOwner &&
      !isCharacterSheetRuntimeOwner &&
      hasPackageLocalRuntimeEntrypoint);

  return {
    reachable,
    entrypoints: [
      ...new Set([...publicEntrypoints, ...packageLocalRuntimeEntrypoints]),
    ].sort(),
    description:
      reachableFiles.length === 0
        ? "no production runtime entrypoints in owner/import closure"
        : reachableFiles.join(", "),
  };
}

function extractPublicBattleRuntimeEntrypoints(text) {
  const result = new Set();
  for (const match of text.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*"(.\/index\.ts)"\s*;/g,
  )) {
    for (const name of match[1].split(",")) {
      const imported = name.trim().split(/\s+as\s+/)[0]?.trim();
      if (
        [
          "startBattle",
          "discoverBattleActs",
          "resolveBattleSubject",
          "resolveBattleReaction",
          "resolveBattlePossessionAttempt",
          "resolveBattleConcentrationSave",
        ].includes(imported)
      ) {
        result.add(imported);
      }
    }
  }
  return [...result];
}

function extractPublicCharacterSheetRuntimeEntrypoints(text) {
  const result = new Set();
  for (const match of text.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*"(.\/index\.ts)"\s*;/g,
  )) {
    for (const name of match[1].split(",")) {
      const imported = name.trim().split(/\s+as\s+/)[0]?.trim();
      if (["characterSheetArmorClassState"].includes(imported)) {
        result.add(imported);
      }
    }
  }
  return [...result];
}

function extractPackageLocalRuntimeEntrypoints(text) {
  const result = new Set();
  for (const match of text.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*"(.\/index\.ts)"\s*;/g,
  )) {
    for (const name of match[1].split(",")) {
      const imported = name.trim().split(/\s+as\s+/)[0]?.trim();
      if (
        imported.length > 0 &&
        !imported.startsWith("type ") &&
        !/^[A-Z][A-Za-z_]*$/.test(imported)
      ) {
        result.add(imported);
      }
    }
  }
  return [...result];
}

function extractRelativeTsImports(text) {
  return [
    ...text.matchAll(/from\s+"(\.{1,2}\/[^"]+\.ts)"/g),
    ...text.matchAll(/import\s*\(\s*"(\.{1,2}\/[^"]+\.ts)"\s*\)/g),
  ].map((match) => match[1]);
}

function resolveRelativeTsImport(currentFile, importPath) {
  const resolved = path.resolve(path.dirname(currentFile), importPath);
  if (!resolved.endsWith(".ts")) return undefined;
  if (!fs.existsSync(resolved)) return undefined;
  return resolved;
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

module.exports = {
  extractDriverSchemaActionNames,
  extractMbtFixtureActionSet,
  extractSelectedUnitIdentityReplays,
  hasSelectedUnitIdentityReplayConsumer,
  scanClaimFiles,
};
