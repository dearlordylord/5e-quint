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
      for (const replay of extractSelectedUnitIdentityReplays(text)) {
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

function extractSelectedUnitIdentityReplays(text) {
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
  return new Set(
    [
      ...text.matchAll(
        /const\s+(?:driverSchema|[A-Za-z_]\w*DriverSchema)\s*=\s*\{([\s\S]*?)\}\s+as const;/g,
      ),
    ].flatMap((schemaMatch) =>
      [...schemaMatch[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*\{\}\s*,/gm)].map(
        (match) => match[1],
      ),
    ),
  );
}

function extractMbtFixtureActionSet(root, text, filePath) {
  const runMatches = [
    ...text.matchAll(
      /run\s*\(\s*\{[\s\S]*?spec:\s*path\.resolve\(\s*import\.meta\.dirname\s*,\s*"([^"]+\.qnt)"[\s\S]*?\)[\s\S]*?step:\s*"([A-Za-z_]\w*)"[\s\S]*?\}\s*\)/g,
    ),
  ];
  if (runMatches.length === 0) {
    return {
      actionNames: new Set(),
      description: "no focused MBT run spec/step",
    };
  }

  const actionNames = new Set();
  const descriptions = [];
  for (const runMatch of runMatches) {
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
