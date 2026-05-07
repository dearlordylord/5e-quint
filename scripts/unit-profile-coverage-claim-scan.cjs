const fs = require("node:fs");
const path = require("node:path");
const { skippedClaimScanDirs } = require("./unit-profile-coverage-config.cjs");
const { toRepoPath } = require("./unit-profile-coverage-io.cjs");

function scanClaimFiles(root) {
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
      const repoPath = toRepoPath(root, filePath);
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

function extractMbtFixtureActionSet(root, text, filePath) {
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
      description: `${toRepoPath(root, specPath)} ${stepName}`,
    };
  }
  const specText = fs.readFileSync(specPath, "utf8");
  return {
    actionNames: extractQuintAnyActionNames(specText, stepName),
    description: `${toRepoPath(root, specPath)} ${stepName}`,
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
  extractDriverActionUnitIds,
  extractDriverSchemaActionNames,
  extractMbtFixtureActionSet,
  scanClaimFiles,
};
