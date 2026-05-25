#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {
  battleFrontierClassifications,
  battleFrontierSubjects,
  coveragePaths,
  coveredStatuses,
  generatorReadinessBlockerCatalogIssues,
  generatorReadinessBlockers,
  generatorReadinessScannerBlockers,
  generatorReadinessStatuses,
  generatorSubsetConstructs,
  kernelIrBoundaryKinds,
  markerKinds,
  nonSemanticStatuses,
  obligationKinds,
  obligationStatuses,
  parityWitnessKinds,
  qntOwnerRoles,
  runtimes,
} = require("./rules-kernel-coverage-config.cjs");
const { scanClaimFiles } = require("./rules-kernel-coverage-claim-scan.cjs");
const {
  isUnitFeatureProfileId,
  rulesKernelProfileKinds,
  rulesKernelProfileKindClassificationIssues,
} = require("./unit-profile-coverage-config.cjs");
const {
  witnessKindCatalogIssues,
} = require("./evidence-witness-kind-config.cjs");

const root = process.env.RULES_KERNEL_COVERAGE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");
const generatorReadinessArrayFields = [
  "semanticCore",
  "proofOnly",
  "generatorSubset",
  "blockedBy",
];
const kernelIrBoundaryArrayFields = [
  "runtimeBoundaryPaths",
  "obligationIds",
];
const generatorReadinessSemanticCoreStatuses = new Set([
  "semantic-core-candidate",
  "fixture-bound",
  "generation-subset-clean",
]);
const generatorReadinessSubsetStatuses = new Set([
  "semantic-core-candidate",
  "fixture-bound",
  "generation-subset-clean",
]);
const generatorReadinessBlockerStatuses = new Set(["fixture-bound", "blocked"]);
const semanticCoreRunBlockBlocker =
  generatorReadinessScannerBlockers.semanticCoreRunBlock;
const unitFeatureProcedureProfileObligationId =
  "BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS";

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function repoPath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

function readJsonl(rootPath, filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(
          `${repoPath(rootPath, filePath)}:${index + 1} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function stripCommentsPreserveLines(text) {
  let output = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        output += "\n";
      } else {
        output += " ";
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        output += "  ";
        index += 1;
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (quote !== null) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      output += "  ";
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      output += "  ";
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    }
    output += char;
  }
  return output;
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function findQntRunBlockLines(text) {
  const source = stripCommentsPreserveLines(text);
  const lines = [];
  const runBlockPattern = /^[ \t]*run[ \t]+[A-Za-z_][A-Za-z0-9_]*[ \t]*=/gm;
  for (
    let match = runBlockPattern.exec(source);
    match !== null;
    match = runBlockPattern.exec(source)
  ) {
    lines.push(lineNumberAt(source, match.index));
  }
  return lines;
}

function scanSemanticCoreRunBlocks(rootPath, qntOwnerRoleRows) {
  const runBlocksByPath = new Map();
  for (const row of qntOwnerRoleRows) {
    if (
      !isRecord(row) ||
      row.role !== "semantic-core" ||
      typeof row.ownerPath !== "string"
    ) {
      continue;
    }
    const ownerAbsolutePath = path.join(rootPath, row.ownerPath);
    if (!fs.existsSync(ownerAbsolutePath)) continue;
    const lines = findQntRunBlockLines(fs.readFileSync(ownerAbsolutePath, "utf8"));
    if (lines.length > 0) runBlocksByPath.set(row.ownerPath, lines);
  }
  return runBlocksByPath;
}

function stripStringLiteralsPreserveLines(text) {
  let output = "";
  let quote = null;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      if (char === "\n") {
        output += "\n";
      } else {
        output += " ";
      }
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += " ";
      continue;
    }
    output += char;
  }
  return output;
}

function qntConstructScanSource(text) {
  return stripStringLiteralsPreserveLines(stripCommentsPreserveLines(text));
}

function hasQntRecordConstruct(source) {
  return (
    /\btype\s+\w+\s*=\s*\{/.test(source) ||
    /[=,(]\s*\{[\s\S]*?:/.test(source)
  );
}

function hasQntVariantConstruct(source) {
  return (
    /\btype\s+\w+\s*=\s*(?:\r?\n\s*\||[A-Z]\w*\s*\()/m.test(source) ||
    /\b[A-Z]\w*\s*\(/.test(source)
  );
}

function findQntGeneratorSubsetConstructs(text) {
  const source = qntConstructScanSource(text);
  const constructs = new Set();
  const add = (construct, detected) => {
    if (detected) constructs.add(construct);
  };
  add("all-block", /\ball\s*\{/.test(source));
  add(
    "arithmetic",
    /[+/%]|(^|[^.])\*|\bmax\s*\(|\bmin\s*\(|(^|[^=<>!])-($|[^>])/.test(
      source,
    ),
  );
  add(
    "boolean-connective",
    /\b(?:and|or|not)\s*\(|\b(?:and|or)\b/.test(source),
  );
  add("bool", /\btrue\b|\bfalse\b|\bbool\b/.test(source));
  add(
    "comparison",
    /==|!=|<=|>=|(^|[^=<>!])<($|[^=])|(^|[^=<>!])>($|[^=])/.test(
      source,
    ),
  );
  add(
    "constant-def",
    /^\s*pure\s+def\s+\w+\s*(?:\(\s*\))?\s*:/m.test(source),
  );
  add("constant-val", /^\s*pure\s+val\s+/m.test(source));
  add("exists", /\.exists\s*\(/.test(source));
  add("filter", /\.filter\s*\(/.test(source));
  add("fold", /\.(?:fold|foldl)\s*\(/.test(source));
  add("forall", /\.forall\s*\(/.test(source));
  add("if-expression", /\bif\s*\(/.test(source));
  add("import", /^\s*import\s+/m.test(source));
  add("implies", /\bimplies\b/.test(source));
  add("int", /\b\d+\b|\bint\b/.test(source));
  add("let-binding", /^\s*val\s+\w+\s*=/m.test(source));
  add("list", /\bList\s*(?:\[|\()/.test(source));
  add("map", /\.map\s*\(/.test(source));
  add("membership", /\.(?:contains|in)\s*\(/.test(source));
  add("pattern-match", /\bmatch\s+/.test(source));
  add("pure-def", /^\s*pure\s+def\s+\w+/m.test(source));
  add("range", /\.to\s*\(/.test(source));
  add("record", hasQntRecordConstruct(source));
  add("record-update", /\.with\s*\(|\{\s*\.\.\./.test(source));
  add("set", /\bSet\s*(?:\[|\()/.test(source));
  add(
    "set-operators",
    /\.(?:union|intersect|exclude|diff|flatten)\s*\(/.test(source),
  );
  add("size", /\.size\s*\(/.test(source));
  add("variant", hasQntVariantConstruct(source));
  return constructs;
}

function findUnsupportedUnitFeatureGeneratorConstructs(text) {
  const source = qntConstructScanSource(text);
  const unsupported = [];
  if (/^\s*action\s+\w+/m.test(source)) unsupported.push("action-def");
  if (/^\s*run\s+\w+/m.test(source)) unsupported.push("run-block");
  if (/^\s*nondet\s+\w+/m.test(source)) unsupported.push("nondet");
  if (/\bassume\s*\(/.test(source)) unsupported.push("assume");
  if (/\bassert\s*\(/.test(source)) unsupported.push("assert");
  return unsupported;
}

function isUnitFeatureGeneratorSubsetAuditRow(readiness) {
  const semanticCorePaths = stringArrayOrEmpty(readiness.semanticCore);
  return (
    (typeof readiness.obligationId === "string" &&
      readiness.obligationId.startsWith("BATTLE.FEATURE.")) ||
    semanticCorePaths.some((ownerPath) => ownerPath.includes("/unit-feature-"))
  );
}

function validateUnitFeatureGeneratorSubsetAudit(readiness, context, rootPath) {
  if (!isUnitFeatureGeneratorSubsetAuditRow(readiness)) return [];
  const semanticCore = stringArrayOrEmpty(readiness.semanticCore);
  if (semanticCore.length === 0) return [];
  const issues = [];
  const observedConstructs = new Set();
  const unsupportedByPath = [];
  for (const ownerPath of semanticCore) {
    const ownerAbsolutePath = path.join(rootPath, ownerPath);
    if (!fs.existsSync(ownerAbsolutePath)) continue;
    const ownerText = fs.readFileSync(ownerAbsolutePath, "utf8");
    for (const construct of findQntGeneratorSubsetConstructs(ownerText)) {
      observedConstructs.add(construct);
    }
    const unsupported = findUnsupportedUnitFeatureGeneratorConstructs(ownerText);
    if (unsupported.length > 0) {
      unsupportedByPath.push({ ownerPath, unsupported });
    }
  }
  const claimedConstructs = new Set(
    stringArrayOrEmpty(readiness.generatorSubset),
  );
  const missing = [...observedConstructs]
    .filter((construct) => !claimedConstructs.has(construct))
    .sort();
  const extra = [...claimedConstructs]
    .filter((construct) => !observedConstructs.has(construct))
    .sort();
  const undocumented = [...observedConstructs]
    .filter((construct) => !generatorSubsetConstructs.has(construct))
    .sort();
  if (undocumented.length > 0) {
    issues.push(
      `${context}.generatorSubset scanner found undocumented unit-feature QNT construct(s): ${undocumented.join(", ")}.`,
    );
  }
  if (missing.length > 0) {
    issues.push(
      `${context}.generatorSubset omits observed unit-feature QNT construct(s): ${missing.join(", ")}.`,
    );
  }
  if (extra.length > 0) {
    issues.push(
      `${context}.generatorSubset claims unobserved unit-feature QNT construct(s): ${extra.join(", ")}.`,
    );
  }
  for (const finding of unsupportedByPath) {
    issues.push(
      `${context}.semanticCore path ${finding.ownerPath} contains unsupported unit-feature generator construct(s): ${finding.unsupported.join(", ")}.`,
    );
  }
  return issues;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function compareOrWrite(rootPath, writeOutput, filePath, text) {
  if (writeOutput) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return [];
  }
  if (!fs.existsSync(filePath)) {
    return [
      `${repoPath(rootPath, filePath)} is missing. Run rules-kernel-coverage:check -- --write.`,
    ];
  }
  const actual = fs.readFileSync(filePath, "utf8");
  if (actual !== text) {
    return [
      `${repoPath(rootPath, filePath)} is stale. Run rules-kernel-coverage:check -- --write.`,
    ];
  }
  return [];
}

function markerKey(markerKind, obligationId, ownerPath) {
  return `${markerKind}\u0000${obligationId}\u0000${ownerPath}`;
}

function buildMarkerIndex(markers) {
  return new Set(
    markers.flatMap((marker) =>
      marker.obligationIds.map((obligationId) =>
        markerKey(marker.markerKind, obligationId, marker.ownerPath),
      ),
    ),
  );
}

function hasMarker(markerIndex, markerKind, obligationId, ownerPath) {
  return markerIndex.has(markerKey(markerKind, obligationId, ownerPath));
}

function validateStringArray(value, context) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [`${context} must be an array.`];
  return value.flatMap((entry, index) =>
    typeof entry === "string" && entry.length > 0
      ? []
      : [`${context}[${index}] must be a non-empty string.`],
  );
}

function validateRequiredStringArray(value, context) {
  if (value === undefined) return [`${context} must be an array.`];
  return validateStringArray(value, context);
}

const ralphFollowUpTaskIdPattern = /^[ABC][0-9]+-[A-Z0-9-]+$/;

function validFollowUpTaskId(taskId) {
  return (
    /^RKBC-[A-Z0-9-]+$/.test(taskId) ||
    ralphFollowUpTaskIdPattern.test(taskId)
  );
}

function readKnownRalphTaskIds(rootPath) {
  const taskIds = new Set();
  const taskHeadingPattern =
    /^### Task [0-9]+ - ([ABC][0-9]+-[A-Z0-9-]+) - /gm;
  const plansPath = path.join(rootPath, "plans");
  const planNames = fs.existsSync(plansPath)
    ? fs
        .readdirSync(plansPath)
        .filter((planName) => /^RALPH_LANE_.*\.md$/.test(planName))
    : [];
  let foundAnyPlan = false;
  for (const planName of planNames) {
    const planPath = path.join(rootPath, "plans", planName);
    if (!fs.existsSync(planPath)) continue;
    foundAnyPlan = true;
    const text = fs.readFileSync(planPath, "utf8");
    for (
      let match = taskHeadingPattern.exec(text);
      match !== null;
      match = taskHeadingPattern.exec(text)
    ) {
      taskIds.add(match[1]);
    }
  }
  return foundAnyPlan ? taskIds : undefined;
}

function validateFollowUpTaskIds(taskIds, context, knownRalphTaskIds) {
  const issues = [];
  for (const taskId of taskIds) {
    if (!validFollowUpTaskId(taskId)) {
      issues.push(`${context}.followUpTaskIds has invalid task id ${taskId}.`);
      continue;
    }
    if (
      knownRalphTaskIds !== undefined &&
      ralphFollowUpTaskIdPattern.test(taskId) &&
      !knownRalphTaskIds.has(taskId)
    ) {
      issues.push(
        `${context}.followUpTaskIds references unknown Ralph task id ${taskId}.`,
      );
    }
  }
  return issues;
}

function stringArrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function duplicateStrings(value) {
  const seen = new Set();
  const duplicates = new Set();
  for (const entry of stringArrayOrEmpty(value)) {
    if (typeof entry !== "string") continue;
    if (seen.has(entry)) duplicates.add(entry);
    seen.add(entry);
  }
  return [...duplicates];
}

function lastTypeName(typeName) {
  return ts.isIdentifier(typeName) ? typeName.text : typeName.right.text;
}

function typeAliasMap(sourceFile) {
  const aliases = new Map();
  function visit(node) {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return aliases;
}

function unionTypeMembers(aliases, typeName) {
  const alias = aliases.get(typeName);
  if (alias === undefined) {
    throw new Error(`Missing type alias ${typeName}.`);
  }
  return ts.isUnionTypeNode(alias) ? alias.types : [alias];
}

function topLevelKindLiterals(typeNode, aliases) {
  const kinds = [];
  function collectLiteralKind(kindType) {
    if (
      ts.isLiteralTypeNode(kindType) &&
      ts.isStringLiteral(kindType.literal)
    ) {
      kinds.push(kindType.literal.text);
      return;
    }
    if (ts.isUnionTypeNode(kindType)) {
      for (const member of kindType.types) collectLiteralKind(member);
    }
  }
  function walk(node) {
    if (ts.isTypeLiteralNode(node)) {
      for (const member of node.members) {
        if (
          ts.isPropertySignature(member) &&
          ts.isIdentifier(member.name) &&
          member.name.text === "kind" &&
          member.type !== undefined
        ) {
          collectLiteralKind(member.type);
        }
      }
      return;
    }
    if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
      for (const member of node.types) walk(member);
      return;
    }
    if (ts.isTypeReferenceNode(node)) {
      const referenceName = lastTypeName(node.typeName);
      if (referenceName === "Extract") {
        for (const argument of node.typeArguments ?? []) walk(argument);
        return;
      }
      const alias = aliases.get(referenceName);
      if (alias !== undefined) walk(alias);
    }
  }
  walk(typeNode);
  return Array.from(new Set(kinds));
}

function extractBattleFrontierSource(rootPath) {
  const battleReducerPath = path.join(
    rootPath,
    "packages",
    "battle-runtime",
    "src",
    "battle-reducer.ts",
  );
  const text = fs.readFileSync(battleReducerPath, "utf8");
  const sourceFile = ts.createSourceFile(
    battleReducerPath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const aliases = typeAliasMap(sourceFile);
  const holeFamilies = new Map();
  for (const member of unionTypeMembers(aliases, "BattleHole")) {
    if (!ts.isTypeReferenceNode(member) || !ts.isIdentifier(member.typeName)) {
      throw new Error(
        `BattleHole member ${member.getText(sourceFile)} is not a named hole family.`,
      );
    }
    const family = member.typeName.text;
    const kinds = topLevelKindLiterals(member, aliases);
    if (kinds.length !== 1) {
      throw new Error(
        `BattleHole family ${family} must expose exactly one top-level kind; found ${kinds.join(", ") || "none"}.`,
      );
    }
    holeFamilies.set(family, kinds[0]);
  }

  const fillKinds = new Set();
  for (const member of unionTypeMembers(aliases, "BattleFill")) {
    const kinds = topLevelKindLiterals(member, aliases);
    if (kinds.length !== 1) {
      throw new Error(
        `BattleFill member ${member.getText(sourceFile)} must expose exactly one top-level kind; found ${kinds.join(", ") || "none"}.`,
      );
    }
    fillKinds.add(kinds[0]);
  }

  return { fillKinds, holeFamilies };
}

function findObjectEnd(text, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function runObjectBodies(text) {
  const bodies = [];
  const runPattern = /\brun\s*\(\s*\{/g;
  for (
    let match = runPattern.exec(text);
    match !== null;
    match = runPattern.exec(text)
  ) {
    const openBraceIndex = text.indexOf("{", match.index);
    const closeBraceIndex = findObjectEnd(text, openBraceIndex);
    if (closeBraceIndex < 0) continue;
    bodies.push(text.slice(openBraceIndex + 1, closeBraceIndex));
    runPattern.lastIndex = closeBraceIndex + 1;
  }
  return bodies;
}

function extractRunSpecLiteral(body) {
  const pathResolveMatch = body.match(
    /\bspec\s*:\s*path\.resolve\s*\(\s*import\.meta\.dirname\s*,\s*(["'])([^"']+)\1\s*,?\s*\)/,
  );
  if (pathResolveMatch) return pathResolveMatch[2];
  const directStringMatch = body.match(/\bspec\s*:\s*(["'])([^"']+)\1/);
  return directStringMatch?.[2];
}

function extractRunStepLiteral(body) {
  const stepMatch = body.match(/\bstep\s*:\s*(["'])([^"']+)\1/);
  return stepMatch?.[2];
}

function extractRunTargets(rootPath, ownerPath, witnessText) {
  const ownerDir = path.dirname(path.join(rootPath, ownerPath));
  return runObjectBodies(witnessText)
    .map((body) => {
      const specLiteral = extractRunSpecLiteral(body);
      const step = extractRunStepLiteral(body);
      if (specLiteral === undefined || step === undefined) return undefined;
      return {
        hasStateCheck: /\bstateCheck\s*:/.test(body),
        specPath: repoPath(rootPath, path.resolve(ownerDir, specLiteral)),
        step,
      };
    })
    .filter((target) => target !== undefined);
}

function validateWitness(witness, context) {
  const issues = [];
  if (!isRecord(witness)) return [`${context} must be an object.`];
  if (!parityWitnessKinds.has(witness.kind)) {
    issues.push(`${context}.kind has unknown value ${witness.kind}.`);
  }
  if (typeof witness.ownerPath !== "string" || witness.ownerPath.length === 0) {
    issues.push(`${context}.ownerPath must be a non-empty string.`);
  }
  if (
    witness.qntSpecPath !== undefined &&
    (typeof witness.qntSpecPath !== "string" ||
      witness.qntSpecPath.length === 0)
  ) {
    issues.push(
      `${context}.qntSpecPath must be a non-empty string when present.`,
    );
  }
  if (
    witness.stepAction !== undefined &&
    (typeof witness.stepAction !== "string" || witness.stepAction.length === 0)
  ) {
    issues.push(
      `${context}.stepAction must be a non-empty string when present.`,
    );
  }
  if (
    witness.kind === "focused-mbt" ||
    witness.kind === "deterministic-qnt-replay"
  ) {
    if (
      typeof witness.qntSpecPath !== "string" ||
      witness.qntSpecPath.length === 0
    ) {
      issues.push(
        `${context}.qntSpecPath must be a non-empty string for ${witness.kind} witnesses.`,
      );
    }
    if (
      typeof witness.stepAction !== "string" ||
      witness.stepAction.length === 0
    ) {
      issues.push(
        `${context}.stepAction must be a non-empty string for ${witness.kind} witnesses.`,
      );
    }
  }
  if (witness.kind === "deterministic-qnt-replay") {
    if (
      typeof witness.deterministicReplayRationale !== "string" ||
      witness.deterministicReplayRationale.trim().length === 0
    ) {
      issues.push(
        `${context}.deterministicReplayRationale must be a non-empty string for deterministic-qnt-replay witnesses.`,
      );
    }
  }
  if (witness.kind === "runtime-test") {
    if (
      typeof witness.ownerPath === "string" &&
      !witness.ownerPath.endsWith(".test.ts")
    ) {
      issues.push(`${context}.ownerPath must point to a .test.ts file.`);
    }
    for (const field of [
      "qntSpecPath",
      "stepAction",
      "deterministicReplayRationale",
    ]) {
      if (witness[field] !== undefined) {
        issues.push(`${context}.${field} is not valid for runtime-test.`);
      }
    }
  }
  return issues;
}

function validateObligationShape(obligation) {
  const issues = [];
  if (!isRecord(obligation)) return ["Obligation row must be an object."];
  for (const field of ["id", "title", "runtime", "kind", "status"]) {
    if (
      typeof obligation[field] !== "string" ||
      obligation[field].length === 0
    ) {
      issues.push(
        `${obligation.id ?? "<unknown>"}.${field} must be a non-empty string.`,
      );
    }
  }
  if (
    typeof obligation.id === "string" &&
    !/^[A-Z][A-Z0-9]*(?:\.[A-Z0-9_]+)+$/.test(obligation.id)
  ) {
    issues.push(
      `${obligation.id} must be a stable uppercase dotted obligation id.`,
    );
  }
  if (!runtimes.has(obligation.runtime)) {
    issues.push(`${obligation.id} has unknown runtime ${obligation.runtime}.`);
  }
  if (!obligationKinds.has(obligation.kind)) {
    issues.push(`${obligation.id} has unknown kind ${obligation.kind}.`);
  }
  if (!obligationStatuses.has(obligation.status)) {
    issues.push(`${obligation.id} has unknown status ${obligation.status}.`);
  }
  for (const field of ["surfaceEvidence", "qntOwners", "runtimeOwners"]) {
    issues.push(
      ...validateStringArray(obligation[field], `${obligation.id}.${field}`),
    );
  }
  if (Object.prototype.hasOwnProperty.call(obligation, "followUpTaskIds")) {
    issues.push(
      ...validateStringArray(
        obligation.followUpTaskIds,
        `${obligation.id}.followUpTaskIds`,
      ),
    );
    if (
      Array.isArray(obligation.followUpTaskIds) &&
      obligation.followUpTaskIds.length === 0
    ) {
      issues.push(
        `${obligation.id}.followUpTaskIds must name a follow-up task when present; omit the field when no follow-up is assigned.`,
      );
    }
    if (Array.isArray(obligation.followUpTaskIds)) {
      for (const taskId of obligation.followUpTaskIds) {
        if (!validFollowUpTaskId(taskId)) {
          issues.push(
            `${obligation.id}.followUpTaskIds has invalid task id ${taskId}.`,
          );
        }
      }
    }
  }
  if (obligation.parityWitnesses !== undefined) {
    if (!Array.isArray(obligation.parityWitnesses)) {
      issues.push(`${obligation.id}.parityWitnesses must be an array.`);
    } else {
      for (const [index, witness] of obligation.parityWitnesses.entries()) {
        issues.push(
          ...validateWitness(
            witness,
            `${obligation.id}.parityWitnesses[${index}]`,
          ),
        );
      }
    }
  }
  if (
    nonSemanticStatuses.has(obligation.status) &&
    (typeof obligation.reason !== "string" || obligation.reason.length === 0)
  ) {
    issues.push(
      `${obligation.id} with status ${obligation.status} must declare reason.`,
    );
  }
  return issues;
}

function validateProfileMapping(
  mapping,
  index,
  obligationIds,
  profilesById,
  knownRalphTaskIds,
) {
  const issues = [];
  const context = `profile-obligations row ${index + 1}`;
  if (!isRecord(mapping)) return [`${context} must be an object.`];
  if (typeof mapping.profileId !== "string" || mapping.profileId.length === 0) {
    issues.push(`${context}.profileId must be a non-empty string.`);
  } else {
    const profile = profilesById.get(mapping.profileId);
    if (profile === undefined) {
      issues.push(
        `${context} references unknown profile ${mapping.profileId}.`,
      );
    } else if (!rulesKernelProfileKinds.has(profile.profileKind)) {
      issues.push(
        `${context} maps non-rules-kernel profile ${mapping.profileId} with profileKind ${profile.profileKind}.`,
      );
    }
  }
  const hasObligationIds = Object.prototype.hasOwnProperty.call(
    mapping,
    "obligationIds",
  );
  const hasFollowUpTaskIds = Object.prototype.hasOwnProperty.call(
    mapping,
    "followUpTaskIds",
  );
  if (hasObligationIds && hasFollowUpTaskIds) {
    issues.push(
      `${context} must declare either obligationIds or followUpTaskIds, not both.`,
    );
  }
  if (!hasObligationIds && !hasFollowUpTaskIds) {
    issues.push(`${context} must declare obligationIds or followUpTaskIds.`);
  }
  if (hasObligationIds) {
    if (
      !Array.isArray(mapping.obligationIds) ||
      mapping.obligationIds.length === 0
    ) {
      issues.push(`${context}.obligationIds must be a non-empty array.`);
    } else {
      const obligationIdSet = new Set();
      for (const obligationId of mapping.obligationIds) {
        if (obligationIdSet.has(obligationId)) {
          issues.push(
            `${context}.obligationIds repeats obligation ${obligationId}.`,
          );
        }
        obligationIdSet.add(obligationId);
        if (!obligationIds.has(obligationId)) {
          issues.push(
            `${context} references unknown obligation ${obligationId}.`,
          );
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(mapping, "reason")) {
      issues.push(`${context}.reason is only valid with followUpTaskIds.`);
    }
  }
  if (hasFollowUpTaskIds) {
    issues.push(
      ...validateRequiredStringArray(
        mapping.followUpTaskIds,
        `${context}.followUpTaskIds`,
      ),
    );
    if (
      Array.isArray(mapping.followUpTaskIds) &&
      mapping.followUpTaskIds.length === 0
    ) {
      issues.push(
        `${context}.followUpTaskIds must name at least one follow-up task.`,
      );
    }
    if (Array.isArray(mapping.followUpTaskIds)) {
      for (const duplicate of duplicateStrings(mapping.followUpTaskIds)) {
        issues.push(`${context}.followUpTaskIds repeats ${duplicate}.`);
      }
      issues.push(
        ...validateFollowUpTaskIds(
          mapping.followUpTaskIds,
          context,
          knownRalphTaskIds,
        ),
      );
    }
    if (typeof mapping.reason !== "string" || mapping.reason.length === 0) {
      issues.push(`${context}.reason must be a non-empty string.`);
    }
  }
  return issues;
}

function validateUnitFeatureProfileOwnerJoins(
  profileObligations,
  profilesById,
  obligationsById,
) {
  const issues = [];
  for (const [index, mapping] of profileObligations.entries()) {
    const context = `profile-obligations row ${index + 1}`;
    if (!isRecord(mapping) || typeof mapping.profileId !== "string") continue;
    if (!isUnitFeatureProfileId(mapping.profileId)) continue;
    const profile = profilesById.get(mapping.profileId);
    if (profile === undefined) continue;
    const obligationIds = Array.isArray(mapping.obligationIds)
      ? mapping.obligationIds
      : [];
    if (obligationIds.length === 0) {
      issues.push(
        `${context} for unit-feature profile ${mapping.profileId} must join to at least one rules-kernel obligation.`,
      );
      continue;
    }
    const mappedQntOwners = new Set(
      obligationIds.flatMap(
        (obligationId) => obligationsById.get(obligationId)?.qntOwners ?? [],
      ),
    );
    for (const ownerPath of profile.qntOwners ?? []) {
      if (!mappedQntOwners.has(ownerPath)) {
        const mappedOwnerList =
          Array.from(mappedQntOwners).sort().join(", ") || "_none_";
        issues.push(
          `${context} for unit-feature profile ${mapping.profileId} has stale QNT owner ${ownerPath}; mapped obligation QNT owners are ${mappedOwnerList}.`,
        );
      }
    }
  }
  return issues;
}

function validateBattleFrontierRow(
  row,
  index,
  obligationIds,
  obligationsById,
  expectedBattleFrontier,
) {
  const issues = [];
  const context = `battle-hole-frontier row ${index + 1}`;
  if (!isRecord(row)) return [`${context} must be an object.`];
  if (!battleFrontierSubjects.has(row.subject)) {
    issues.push(`${context}.subject has unknown value ${row.subject}.`);
  }
  if (typeof row.id !== "string" || row.id.length === 0) {
    issues.push(`${context}.id must be a non-empty string.`);
  }
  if (!battleFrontierClassifications.has(row.classification)) {
    issues.push(
      `${context}.classification has unknown value ${row.classification}.`,
    );
  }
  if (typeof row.reason !== "string" || row.reason.length === 0) {
    issues.push(`${context}.reason must be a non-empty string.`);
  }
  issues.push(
    ...validateRequiredStringArray(
      row.coveredByObligationIds,
      `${context}.coveredByObligationIds`,
    ),
    ...validateRequiredStringArray(
      row.followUpTaskIds,
      `${context}.followUpTaskIds`,
    ),
  );

  if (row.subject === "battle-hole-family") {
    const expectedHoleKind = expectedBattleFrontier.holeFamilies.get(row.id);
    if (expectedHoleKind === undefined) {
      issues.push(`${context} references unknown BattleHole family ${row.id}.`);
    }
    if (typeof row.holeKind !== "string" || row.holeKind.length === 0) {
      issues.push(`${context}.holeKind must be a non-empty string.`);
    } else if (
      expectedHoleKind !== undefined &&
      row.holeKind !== expectedHoleKind
    ) {
      issues.push(
        `${context}.holeKind is ${row.holeKind}, expected ${expectedHoleKind} for ${row.id}.`,
      );
    }
    if (Object.prototype.hasOwnProperty.call(row, "fillKind")) {
      issues.push(
        `${context}.fillKind is only valid for battle-fill-kind rows.`,
      );
    }
  }

  if (row.subject === "battle-fill-kind") {
    if (typeof row.fillKind !== "string" || row.fillKind.length === 0) {
      issues.push(`${context}.fillKind must be a non-empty string.`);
    } else if (!expectedBattleFrontier.fillKinds.has(row.fillKind)) {
      issues.push(
        `${context} references unknown BattleFill kind ${row.fillKind}.`,
      );
    }
    if (
      typeof row.id === "string" &&
      typeof row.fillKind === "string" &&
      row.id !== row.fillKind
    ) {
      issues.push(
        `${context}.id must match fillKind for battle-fill-kind rows.`,
      );
    }
    if (Object.prototype.hasOwnProperty.call(row, "holeKind")) {
      issues.push(
        `${context}.holeKind is only valid for battle-hole-family rows.`,
      );
    }
  }

  for (const obligationId of row.coveredByObligationIds ?? []) {
    if (!obligationIds.has(obligationId)) {
      issues.push(
        `${context}.coveredByObligationIds references unknown obligation ${obligationId}.`,
      );
    }
  }
  for (const taskId of row.followUpTaskIds ?? []) {
    if (!validFollowUpTaskId(taskId)) {
      issues.push(`${context}.followUpTaskIds has invalid task id ${taskId}.`);
    }
  }

  const coveredByObligations = (row.coveredByObligationIds ?? [])
    .map((obligationId) => obligationsById.get(obligationId))
    .filter((obligation) => obligation !== undefined);
  if (row.classification === "semantic-frontier") {
    const hasCoveredSemanticObligation = coveredByObligations.some(
      (obligation) => coveredStatuses.has(obligation.status),
    );
    const hasFollowUpTask = (row.followUpTaskIds ?? []).length > 0;
    if (!hasCoveredSemanticObligation && !hasFollowUpTask) {
      issues.push(
        `${context} semantic-frontier rows must name a covered semantic obligation or follow-up task.`,
      );
    }
    for (const obligation of coveredByObligations) {
      if (
        !coveredStatuses.has(obligation.status) &&
        !nonSemanticStatuses.has(obligation.status)
      ) {
        issues.push(
          `${context} semantic-frontier row cannot claim non-covered obligation ${obligation.id} with status ${obligation.status}; use followUpTaskIds for uncovered semantic work.`,
        );
      }
    }
  } else if (row.classification !== undefined) {
    if ((row.coveredByObligationIds ?? []).length === 0) {
      issues.push(
        `${context} ${row.classification} rows must name a non-semantic covering obligation.`,
      );
    }
    const hasNonSemanticCoverage = coveredByObligations.some((obligation) =>
      nonSemanticStatuses.has(obligation.status),
    );
    if (coveredByObligations.length > 0 && !hasNonSemanticCoverage) {
      issues.push(
        `${context} ${row.classification} row must be covered by at least one boundary-only or unsupported-by-admission obligation.`,
      );
    }
  }

  return issues;
}

function validateGeneratorReadiness(
  readiness,
  index,
  rootPath,
  obligationsById,
  qntOwnerRolesByPath,
  semanticCoreRunBlocksByPath,
  knownRalphTaskIds,
) {
  const issues = [];
  const context = `generator-readiness row ${index + 1}`;
  if (!isRecord(readiness)) return [`${context} must be an object.`];
  const obligation =
    typeof readiness.obligationId === "string"
      ? obligationsById.get(readiness.obligationId)
      : undefined;
  if (
    typeof readiness.obligationId !== "string" ||
    readiness.obligationId.length === 0
  ) {
    issues.push(`${context}.obligationId must be a non-empty string.`);
  } else if (obligation === undefined) {
    issues.push(
      `${context} references unknown obligation ${readiness.obligationId}.`,
    );
  }
  if (!generatorReadinessStatuses.has(readiness.status)) {
    issues.push(`${context}.status has unknown value ${readiness.status}.`);
  }
  for (const field of generatorReadinessArrayFields) {
    issues.push(
      ...validateRequiredStringArray(readiness[field], `${context}.${field}`),
    );
  }
  for (const field of generatorReadinessArrayFields) {
    for (const duplicate of duplicateStrings(readiness[field])) {
      issues.push(`${context}.${field} repeats ${duplicate}.`);
    }
  }
  const semanticCore = stringArrayOrEmpty(readiness.semanticCore);
  const proofOnly = stringArrayOrEmpty(readiness.proofOnly);
  const generatorSubset = stringArrayOrEmpty(readiness.generatorSubset);
  const blockedBy = stringArrayOrEmpty(readiness.blockedBy);
  const followUpTaskIds = stringArrayOrEmpty(readiness.followUpTaskIds);
  if (Object.prototype.hasOwnProperty.call(readiness, "followUpTaskIds")) {
    issues.push(
      ...validateStringArray(
        readiness.followUpTaskIds,
        `${context}.followUpTaskIds`,
      ),
    );
    for (const duplicate of duplicateStrings(readiness.followUpTaskIds)) {
      issues.push(`${context}.followUpTaskIds repeats ${duplicate}.`);
    }
    issues.push(
      ...validateFollowUpTaskIds(
        followUpTaskIds,
        context,
        knownRalphTaskIds,
      ),
    );
  }
  for (const construct of generatorSubset) {
    if (!generatorSubsetConstructs.has(construct)) {
      issues.push(
        `${context}.generatorSubset has unknown generation-subset construct ${construct}.`,
      );
    }
  }
  for (const blocker of blockedBy) {
    if (!generatorReadinessBlockers.has(blocker)) {
      issues.push(
        `${context}.blockedBy has unknown generator-readiness blocker ${blocker}.`,
      );
    }
  }
  const semanticCoreSet = new Set(semanticCore);
  for (const ownerPath of proofOnly) {
    if (semanticCoreSet.has(ownerPath)) {
      issues.push(
        `${context}.${ownerPath} cannot be both semanticCore and proofOnly.`,
      );
    }
  }
  if (readiness.status === "not-assessed") {
    for (const field of generatorReadinessArrayFields) {
      const entries = stringArrayOrEmpty(readiness[field]);
      if (entries.length > 0) {
        issues.push(`${context}.not-assessed must have empty ${field}.`);
      }
    }
  }
  if (
    generatorReadinessSemanticCoreStatuses.has(readiness.status) &&
    semanticCore.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires semanticCore.`);
  }
  if (
    generatorReadinessSubsetStatuses.has(readiness.status) &&
    generatorSubset.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires generatorSubset.`);
  }
  if (
    generatorReadinessBlockerStatuses.has(readiness.status) &&
    blockedBy.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires blockedBy.`);
  }
  if (
    generatorReadinessBlockerStatuses.has(readiness.status) &&
    followUpTaskIds.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires followUpTaskIds.`);
  }
  if (readiness.status === "generation-subset-clean" && blockedBy.length > 0) {
    issues.push(`${context}.generation-subset-clean must not have blockedBy.`);
  }
  if (
    !generatorReadinessBlockerStatuses.has(readiness.status) &&
    blockedBy.length > 0
  ) {
    issues.push(`${context}.${readiness.status} must have empty blockedBy.`);
  }
  if (readiness.status === "blocked" && semanticCore.length > 0) {
    issues.push(`${context}.blocked must not declare semanticCore.`);
  }
  const semanticCoreWithRunBlocks = semanticCore.filter(
    (ownerPath) => (semanticCoreRunBlocksByPath.get(ownerPath) ?? []).length > 0,
  );
  if (
    semanticCoreWithRunBlocks.length > 0 &&
    !generatorReadinessBlockerStatuses.has(readiness.status)
  ) {
    issues.push(
      `${context}.${readiness.status} cannot include semanticCore path(s) with run blocks (${semanticCoreWithRunBlocks.join(", ")}); split the run blocks out or classify with ${semanticCoreRunBlockBlocker}.`,
    );
  }
  if (
    semanticCoreWithRunBlocks.length > 0 &&
    generatorReadinessBlockerStatuses.has(readiness.status) &&
    !blockedBy.includes(semanticCoreRunBlockBlocker)
  ) {
    issues.push(
      `${context}.${readiness.status} has semanticCore path(s) with run blocks (${semanticCoreWithRunBlocks.join(", ")}) and must include blockedBy ${semanticCoreRunBlockBlocker}.`,
    );
  }
  for (const field of ["semanticCore", "proofOnly"]) {
    for (const ownerPath of stringArrayOrEmpty(readiness[field])) {
      if (!fs.existsSync(path.join(rootPath, ownerPath))) {
        issues.push(`${context}.${field} path ${ownerPath} does not exist.`);
      }
    }
  }
  if (obligation !== undefined) {
    const qntOwners = new Set(obligation.qntOwners ?? []);
    for (const ownerPath of semanticCore) {
      if (!qntOwners.has(ownerPath)) {
        issues.push(
          `${context}.semanticCore path ${ownerPath} is not declared as a QNT owner by ${obligation.id}.`,
        );
      }
      const ownerRole = qntOwnerRolesByPath.get(ownerPath);
      if (ownerRole !== undefined && ownerRole !== "semantic-core") {
        issues.push(
          `${context}.semanticCore path ${ownerPath} has QNT owner role ${ownerRole}; expected semantic-core.`,
        );
      }
    }
  }
  issues.push(
    ...validateUnitFeatureGeneratorSubsetAudit(readiness, context, rootPath),
  );
  if (readiness.dryRun !== undefined) {
    if (typeof readiness.dryRun !== "string" || readiness.dryRun.length === 0) {
      issues.push(`${context}.dryRun must be a non-empty string when present.`);
    } else if (!fs.existsSync(path.join(rootPath, readiness.dryRun))) {
      issues.push(`${context}.dryRun path ${readiness.dryRun} does not exist.`);
    }
  }
  return issues;
}

function validateKernelIrBoundary(row, index, rootPath, obligationIds) {
  const issues = [];
  const context = `kernel-ir-boundaries row ${index + 1}`;
  if (!isRecord(row)) return [`${context} must be an object.`];
  if (!kernelIrBoundaryKinds.has(row.boundary)) {
    issues.push(`${context}.boundary has unknown value ${row.boundary}.`);
  }
  for (const field of kernelIrBoundaryArrayFields) {
    issues.push(
      ...validateRequiredStringArray(row[field], `${context}.${field}`),
    );
  }
  for (const field of kernelIrBoundaryArrayFields) {
    for (const duplicate of duplicateStrings(row[field])) {
      issues.push(`${context}.${field} repeats ${duplicate}.`);
    }
  }
  if (typeof row.summary !== "string" || row.summary.length === 0) {
    issues.push(`${context}.summary must be a non-empty string.`);
  }
  if (typeof row.evidence !== "string" || row.evidence.length === 0) {
    issues.push(`${context}.evidence must be a non-empty string.`);
  }
  for (const ownerPath of stringArrayOrEmpty(row.runtimeBoundaryPaths)) {
    if (!fs.existsSync(path.join(rootPath, ownerPath))) {
      issues.push(
        `${context}.runtimeBoundaryPaths path ${ownerPath} does not exist.`,
      );
    }
  }
  for (const obligationId of stringArrayOrEmpty(row.obligationIds)) {
    if (!obligationIds.has(obligationId)) {
      issues.push(
        `${context}.obligationIds references unknown obligation ${obligationId}.`,
      );
    }
  }
  return issues;
}

function qntOwnerPaths(obligations) {
  const ownerPaths = new Set();
  for (const obligation of obligations) {
    if (!coveredStatuses.has(obligation.status)) continue;
    for (const ownerPath of obligation.qntOwners ?? []) {
      ownerPaths.add(ownerPath);
    }
  }
  return ownerPaths;
}

function generatorReadinessDenominatorGaps(
  obligations,
  qntOwnerRolesByPath,
  readinessObligationIds,
) {
  const issues = [];
  for (const obligation of obligations) {
    if (!coveredStatuses.has(obligation.status)) continue;
    const semanticCoreOwners = (obligation.qntOwners ?? []).filter(
      (ownerPath) => qntOwnerRolesByPath.get(ownerPath) === "semantic-core",
    );
    if (
      semanticCoreOwners.length > 0 &&
      !readinessObligationIds.has(obligation.id)
    ) {
      issues.push(
        `generator-readiness is missing row for covered obligation ${obligation.id} with semantic-core QNT owner(s): ${semanticCoreOwners.join(", ")}.`,
      );
    }
  }
  return issues;
}

function validateQntOwnerRole(row, index, rootPath, expectedQntOwnerPaths) {
  const issues = [];
  const context = `qnt-owner-roles row ${index + 1}`;
  if (!isRecord(row)) return [`${context} must be an object.`];
  if (typeof row.ownerPath !== "string" || row.ownerPath.length === 0) {
    issues.push(`${context}.ownerPath must be a non-empty string.`);
  } else {
    if (!expectedQntOwnerPaths.has(row.ownerPath)) {
      issues.push(
        `${context}.ownerPath ${row.ownerPath} is not a covered obligation QNT owner.`,
      );
    }
    if (!fs.existsSync(path.join(rootPath, row.ownerPath))) {
      issues.push(`${context}.ownerPath ${row.ownerPath} does not exist.`);
    }
  }
  if (!qntOwnerRoles.has(row.role)) {
    issues.push(`${context}.role has unknown value ${row.role}.`);
  }
  if (typeof row.evidence !== "string" || row.evidence.length === 0) {
    issues.push(`${context}.evidence must be a non-empty string.`);
  }
  return issues;
}

function validateCoveredEvidence(rootPath, obligation, markerIndex) {
  const issues = [];
  const qntOwners = obligation.qntOwners ?? [];
  const runtimeOwners = obligation.runtimeOwners ?? [];
  const parityWitnesses = obligation.parityWitnesses ?? [];
  if (qntOwners.length === 0)
    issues.push(`${obligation.id} is covered but has no qntOwners.`);
  if (runtimeOwners.length === 0)
    issues.push(`${obligation.id} is covered but has no runtimeOwners.`);
  if (parityWitnesses.length === 0) {
    issues.push(`${obligation.id} is covered but has no parityWitnesses.`);
  }

  for (const ownerPath of qntOwners) {
    const absolutePath = path.join(rootPath, ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(`${obligation.id} QNT owner ${ownerPath} does not exist.`);
      continue;
    }
    if (!hasMarker(markerIndex, "qnt-owner", obligation.id, ownerPath)) {
      issues.push(
        `${obligation.id} QNT owner ${ownerPath} lacks KERNEL-COVERAGE qnt-owner marker.`,
      );
    }
  }

  for (const ownerPath of runtimeOwners) {
    const absolutePath = path.join(rootPath, ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(
        `${obligation.id} runtime owner ${ownerPath} does not exist.`,
      );
      continue;
    }
    if (!hasMarker(markerIndex, "runtime-owner", obligation.id, ownerPath)) {
      issues.push(
        `${obligation.id} runtime owner ${ownerPath} lacks KERNEL-COVERAGE runtime-owner marker.`,
      );
    }
  }

  for (const witness of parityWitnesses) {
    const absolutePath = path.join(rootPath, witness.ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(
        `${obligation.id} parity witness ${witness.ownerPath} does not exist.`,
      );
      continue;
    }
    if (
      !hasMarker(
        markerIndex,
        "parity-witness",
        obligation.id,
        witness.ownerPath,
      )
    ) {
      issues.push(
        `${obligation.id} parity witness ${witness.ownerPath} lacks KERNEL-COVERAGE parity-witness marker.`,
      );
    }
    const witnessText = readTextIfExists(absolutePath);
    if (
      witness.kind === "focused-mbt" ||
      witness.kind === "deterministic-qnt-replay"
    ) {
      if (!/\brun\s*\(/.test(witnessText)) {
        issues.push(
          `${obligation.id} parity witness ${witness.ownerPath} does not call quint-connect run().`,
        );
      }
      if (!/\bstateCheck\s*\(/.test(witnessText)) {
        issues.push(
          `${obligation.id} parity witness ${witness.ownerPath} does not define a stateCheck().`,
        );
      }
      if (
        typeof witness.qntSpecPath === "string" &&
        typeof witness.stepAction === "string"
      ) {
        const runTargets = extractRunTargets(
          rootPath,
          witness.ownerPath,
          witnessText,
        );
        const hasDeclaredRunTarget = runTargets.some(
          (target) =>
            target.specPath === witness.qntSpecPath &&
            target.step === witness.stepAction &&
            target.hasStateCheck,
        );
        if (!hasDeclaredRunTarget) {
          issues.push(
            `${obligation.id} parity witness ${witness.ownerPath} does not run ${witness.qntSpecPath} with step ${witness.stepAction} and stateCheck.`,
          );
        }
      }
    }
    if (witness.qntSpecPath !== undefined) {
      const qntPath = path.join(rootPath, witness.qntSpecPath);
      if (!fs.existsSync(qntPath)) {
        issues.push(
          `${obligation.id} parity QNT spec ${witness.qntSpecPath} does not exist.`,
        );
      } else {
        const qntText = fs.readFileSync(qntPath, "utf8");
        if (
          /\bqReplayIndex\b/.test(qntText) &&
          witness.kind !== "deterministic-qnt-replay"
        ) {
          issues.push(
            `${obligation.id} parity QNT spec ${witness.qntSpecPath} uses qReplayIndex, so the witness kind must be deterministic-qnt-replay with deterministicReplayRationale.`,
          );
        }
        if (witness.stepAction !== undefined) {
          const stepPattern = new RegExp(
            `\\baction\\s+${escapeRegExp(witness.stepAction)}\\b`,
          );
          if (!stepPattern.test(qntText)) {
            issues.push(
              `${obligation.id} parity QNT spec ${witness.qntSpecPath} has no action ${witness.stepAction}.`,
            );
          }
        }
      }
    }
  }

  return issues;
}

function validateRuntimeTestWitnessProfiles(
  obligation,
  profileIds,
  profilesById,
) {
  const issues = [];
  const runtimeTestWitnesses = (obligation.parityWitnesses ?? []).filter(
    (witness) => witness.kind === "runtime-test",
  );
  if (runtimeTestWitnesses.length === 0) return issues;
  if (profileIds.length === 0) {
    issues.push(
      `${obligation.id} uses runtime-test witnesses but has no mapped Surface profiles.`,
    );
    return issues;
  }
  for (const profileId of profileIds) {
    const profile = profilesById.get(profileId);
    if (profile === undefined) {
      issues.push(
        `${obligation.id} runtime-test witness cannot verify missing profile ${profileId}.`,
      );
      continue;
    }
    const verificationOwners = Array.isArray(profile.verificationOwners)
      ? profile.verificationOwners
      : [];
    const hasQntProof = verificationOwners.some(
      (owner) => owner.kind === "qnt-proof",
    );
    if (!hasQntProof) {
      issues.push(
        `${obligation.id} runtime-test witness requires ${profileId} to already record profile-level qnt-proof ownership.`,
      );
    }
    const hasRuntimeTestWitness = runtimeTestWitnesses.some((witness) =>
      verificationOwners.some(
        (owner) =>
          owner.kind === "runtime-test" && owner.ownerPath === witness.ownerPath,
      ),
    );
    if (!hasRuntimeTestWitness) {
      issues.push(
        `${obligation.id} has no runtime-test witness that verifies ${profileId}.`,
      );
    }
  }
  for (const witness of runtimeTestWitnesses) {
    const verifiesMappedProfile = profileIds.some((profileId) => {
      const profile = profilesById.get(profileId);
      return (profile?.verificationOwners ?? []).some(
        (owner) =>
          owner.kind === "runtime-test" && owner.ownerPath === witness.ownerPath,
      );
    });
    if (!verifiesMappedProfile) {
      issues.push(
        `${obligation.id} runtime-test witness ${witness.ownerPath} is not a runtime-test verification owner for any mapped profile.`,
      );
    }
  }
  return issues;
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function buildSummary(obligations) {
  const byStatus = Object.fromEntries(
    [...obligationStatuses].map((status) => [status, 0]),
  );
  const byRuntime = Object.fromEntries(
    [...runtimes].map((runtime) => [runtime, 0]),
  );
  for (const obligation of obligations) {
    byStatus[obligation.status] = (byStatus[obligation.status] ?? 0) + 1;
    byRuntime[obligation.runtime] = (byRuntime[obligation.runtime] ?? 0) + 1;
  }
  return {
    total: obligations.length,
    covered: obligations.filter((obligation) =>
      coveredStatuses.has(obligation.status),
    ).length,
    open: obligations.filter(
      (obligation) =>
        !coveredStatuses.has(obligation.status) &&
        !nonSemanticStatuses.has(obligation.status),
    ).length,
    nonSemantic: obligations.filter((obligation) =>
      nonSemanticStatuses.has(obligation.status),
    ).length,
    byRuntime,
    byStatus,
  };
}

function buildBattleFrontierSummary(battleFrontierRows) {
  const bySubject = Object.fromEntries(
    [...battleFrontierSubjects].map((subject) => [subject, 0]),
  );
  const byClassification = Object.fromEntries(
    [...battleFrontierClassifications].map((classification) => [
      classification,
      0,
    ]),
  );
  for (const row of battleFrontierRows) {
    bySubject[row.subject] = (bySubject[row.subject] ?? 0) + 1;
    byClassification[row.classification] =
      (byClassification[row.classification] ?? 0) + 1;
  }
  return {
    total: battleFrontierRows.length,
    bySubject,
    byClassification,
  };
}

function profilesByObligation(profileObligations) {
  const groups = new Map();
  for (const mapping of profileObligations) {
    for (const obligationId of mapping.obligationIds ?? []) {
      const current = groups.get(obligationId) ?? [];
      current.push(mapping.profileId);
      groups.set(obligationId, current);
    }
  }
  return new Map(
    Array.from(groups.entries()).map(([obligationId, profileIds]) => [
      obligationId,
      Array.from(new Set(profileIds)).sort(),
    ]),
  );
}

function qntOwnerRoleMap(qntOwnerRoleRows) {
  return new Map(
    qntOwnerRoleRows
      .filter(
        (row) =>
          isRecord(row) &&
          typeof row.ownerPath === "string" &&
          typeof row.role === "string",
      )
      .map((row) => [row.ownerPath, row.role]),
  );
}

function semanticCoreOwnerPaths(obligation, qntOwnerRolesByPath) {
  return (obligation.qntOwners ?? []).filter(
    (ownerPath) => qntOwnerRolesByPath.get(ownerPath) === "semantic-core",
  );
}

function unitFeatureProfileOwnerRows(
  profileIds,
  profilesById,
  qntOwnerRolesByPath,
  obligationIdsByProfileId,
  obligationIdsByQntOwner,
) {
  return profileIds
    .filter(isUnitFeatureProfileId)
    .map((profileId) => profilesById.get(profileId))
    .filter((profile) => profile !== undefined)
    .map((profile) =>
      stable({
        profileId: profile.id,
        qntOwners: (profile.qntOwners ?? []).map((ownerPath) => {
          const profileObligationIds =
            obligationIdsByProfileId.get(profile.id) ?? [];
          const ownerObligationIds = obligationIdsByQntOwner.get(ownerPath) ?? [];
          return {
            obligationIds: profileObligationIds.filter((obligationId) =>
              ownerObligationIds.includes(obligationId),
            ),
            ownerPath,
            role: qntOwnerRolesByPath.get(ownerPath) ?? "missing-role",
          };
        }),
      }),
    );
}

function profileScopesByQntOwner(unitFeatureProfileOwnerRows) {
  const groups = new Map();
  for (const row of unitFeatureProfileOwnerRows) {
    for (const owner of row.qntOwners ?? []) {
      const current = groups.get(owner.ownerPath) ?? [];
      current.push({
        obligationIds: owner.obligationIds ?? [],
        profileId: row.profileId,
      });
      groups.set(owner.ownerPath, current);
    }
  }
  return groups;
}

function buildGeneratorReadinessBacklog(
  obligations,
  generatorReadiness,
  qntOwnerRolesByPath,
) {
  const readinessByObligationId = new Map(
    generatorReadiness
      .filter(
        (readiness) =>
          isRecord(readiness) && typeof readiness.obligationId === "string",
      )
      .map((readiness) => [readiness.obligationId, readiness]),
  );
  return obligations.flatMap((obligation) => {
    if (!coveredStatuses.has(obligation.status)) return [];
    const semanticCoreOwners = semanticCoreOwnerPaths(
      obligation,
      qntOwnerRolesByPath,
    );
    if (semanticCoreOwners.length === 0) return [];
    const readiness = readinessByObligationId.get(obligation.id);
    const status = readiness?.status ?? "missing";
    if (status !== "missing" && status !== "not-assessed") return [];
    return [
      stable({
        obligationId: obligation.id,
        ownerRoles: semanticCoreOwners.map((ownerPath) => ({
          ownerPath,
          role: qntOwnerRolesByPath.get(ownerPath),
        })),
        status,
      }),
    ];
  });
}

function buildSemanticCoreRunBlockFindings(
  obligations,
  generatorReadiness,
  qntOwnerRolesByPath,
  semanticCoreRunBlocksByPath,
) {
  const readinessByObligationId = new Map(
    generatorReadiness
      .filter(
        (readiness) =>
          isRecord(readiness) && typeof readiness.obligationId === "string",
      )
      .map((readiness) => [readiness.obligationId, readiness]),
  );
  return obligations.flatMap((obligation) => {
    if (!coveredStatuses.has(obligation.status)) return [];
    const owners = semanticCoreOwnerPaths(obligation, qntOwnerRolesByPath)
      .map((ownerPath) => ({
        lines: semanticCoreRunBlocksByPath.get(ownerPath) ?? [],
        ownerPath,
      }))
      .filter((owner) => owner.lines.length > 0);
    if (owners.length === 0) return [];
    return [
      stable({
        blocker: semanticCoreRunBlockBlocker,
        followUpTaskIds:
          readinessByObligationId.get(obligation.id)?.followUpTaskIds ?? [],
        obligationId: obligation.id,
        owners,
        readinessStatus:
          readinessByObligationId.get(obligation.id)?.status ?? "missing",
      }),
    ];
  });
}

function buildMatrix(rootPath) {
  const paths = coveragePaths(rootPath);
  const obligations = readJsonl(rootPath, paths.obligations);
  const battleHoleFrontier = readJsonl(rootPath, paths.battleHoleFrontier);
  const profileObligations = readJsonl(rootPath, paths.profileObligations);
  const qntOwnerRoleRows = readJsonl(rootPath, paths.qntOwnerRoles);
  const generatorReadiness = readJsonl(rootPath, paths.generatorReadiness);
  const kernelIrBoundaries = readJsonl(rootPath, paths.kernelIrBoundaries);
  const profiles = readJsonl(rootPath, paths.unitProfiles);
  const profileIdsByObligation = profilesByObligation(profileObligations);
  const obligationIdsByProfileId = new Map(
    profileObligations
      .filter(
        (mapping) =>
          isRecord(mapping) && typeof mapping.profileId === "string",
      )
      .map((mapping) => [mapping.profileId, mapping.obligationIds ?? []]),
  );
  const profilesById = new Map(
    profiles
      .filter((profile) => isRecord(profile) && typeof profile.id === "string")
      .map((profile) => [profile.id, profile]),
  );
  const qntOwnerRolesByPath = qntOwnerRoleMap(qntOwnerRoleRows);
  const semanticCoreRunBlocksByPath = scanSemanticCoreRunBlocks(
    rootPath,
    qntOwnerRoleRows,
  );
  const obligationIdsByQntOwner = new Map();
  for (const obligation of obligations) {
    if (!coveredStatuses.has(obligation.status)) continue;
    for (const ownerPath of obligation.qntOwners ?? []) {
      const current = obligationIdsByQntOwner.get(ownerPath) ?? [];
      current.push(obligation.id);
      obligationIdsByQntOwner.set(ownerPath, current);
    }
  }
  const unitFeatureProfileOwnerEvidence = unitFeatureProfileOwnerRows(
    profileIdsByObligation.get(unitFeatureProcedureProfileObligationId) ?? [],
    profilesById,
    qntOwnerRolesByPath,
    obligationIdsByProfileId,
    obligationIdsByQntOwner,
  );
  const unitFeatureProfileScopesByQntOwner = profileScopesByQntOwner(
    unitFeatureProfileOwnerEvidence,
  );
  return {
    summary: buildSummary(obligations),
    derivedFields: {
      "obligations[].profiles":
        "Derived from profileObligations by obligation id, except BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS unit-feature profiles are reported under unitFeatureProfileOwnerRows so the broad obligation does not claim profile-scoped QNT ownership.",
      "qntOwnerRoles[].obligationIds":
        "Derived from obligations[].qntOwners for covered obligations; qnt-owner-roles.jsonl rows classify ownerPath only.",
      "qntOwnerRoles[].profileScopes":
        "Report projection derived from profile-obligations.jsonl, obligations[].qntOwners, and plans/unit-profile-coverage/profiles.jsonl qntOwners for unit-feature profiles mapped to BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS.",
    },
    battleHoleFrontierSummary: buildBattleFrontierSummary(battleHoleFrontier),
    obligations: obligations.map((obligation) =>
      stable({
        ...obligation,
        profiles:
          obligation.id === unitFeatureProcedureProfileObligationId
            ? []
            : profileIdsByObligation.get(obligation.id) ?? [],
      }),
    ),
    battleHoleFrontier: battleHoleFrontier.map((row) => stable(row)),
    profileObligations: profileObligations.map((mapping) => stable(mapping)),
    qntOwnerRoles: qntOwnerRoleRows.map((row) => {
      const obligationIds = (
        obligationIdsByQntOwner.get(row.ownerPath) ?? []
      ).sort();
      const profileScopes = (
        unitFeatureProfileScopesByQntOwner.get(row.ownerPath) ?? []
      ).sort((left, right) => left.profileId.localeCompare(right.profileId));
      return stable({
        ...row,
        obligationIds,
        ...(profileScopes.length > 0 ? { profileScopes } : {}),
      });
    }),
    unitFeatureProfileOwnerRows: unitFeatureProfileOwnerEvidence,
    generatorReadiness: generatorReadiness.map((readiness) =>
      stable(readiness),
    ),
    generatorReadinessBacklog: buildGeneratorReadinessBacklog(
      obligations,
      generatorReadiness,
      qntOwnerRolesByPath,
    ),
    semanticCoreRunBlockFindings: buildSemanticCoreRunBlockFindings(
      obligations,
      generatorReadiness,
      qntOwnerRolesByPath,
      semanticCoreRunBlocksByPath,
    ),
    kernelIrBoundaries: kernelIrBoundaries.map((boundary) =>
      stable(boundary),
    ),
    profileIdsSeenFromUnitProfileCoverage: profiles
      .map((profile) => profile.id)
      .sort(),
  };
}

function renderReport(matrix, issues) {
  const lines = [];
  lines.push("# Rules Kernel Coverage Report");
  lines.push("");
  lines.push(
    "Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `battle-hole-frontier.jsonl`, `profile-obligations.jsonl`, `qnt-owner-roles.jsonl`, `generator-readiness.jsonl`, `kernel-ir-boundaries.jsonl`, and `KERNEL-COVERAGE` source markers.",
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total obligations: ${matrix.summary.total}`);
  lines.push(`- Covered obligations: ${matrix.summary.covered}`);
  lines.push(`- Open transitional obligations: ${matrix.summary.open}`);
  lines.push(
    `- Boundary or unsupported obligations: ${matrix.summary.nonSemantic}`,
  );
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  for (const [status, count] of Object.entries(matrix.summary.byStatus)) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push("");
  lines.push("| Runtime | Count |");
  lines.push("| --- | ---: |");
  for (const [runtime, count] of Object.entries(matrix.summary.byRuntime)) {
    lines.push(`| ${runtime} | ${count} |`);
  }
  lines.push("");
  lines.push("## Obligations");
  lines.push("");
  lines.push("| Obligation | Runtime | Status | Profiles |");
  lines.push("| --- | --- | --- | --- |");
  for (const obligation of matrix.obligations) {
    const profiles = renderObligationProfiles(obligation);
    lines.push(
      `| \`${obligation.id}\` | ${obligation.runtime} | ${obligation.status} | ${profiles} |`,
    );
  }
  lines.push("");
  lines.push("## Battle Hole Frontier");
  lines.push("");
  lines.push(
    `- Total classified rows: ${matrix.battleHoleFrontierSummary.total}`,
  );
  lines.push("");
  lines.push("| Subject | Count |");
  lines.push("| --- | ---: |");
  for (const [subject, count] of Object.entries(
    matrix.battleHoleFrontierSummary.bySubject,
  )) {
    lines.push(`| ${subject} | ${count} |`);
  }
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("| --- | ---: |");
  for (const [classification, count] of Object.entries(
    matrix.battleHoleFrontierSummary.byClassification,
  )) {
    lines.push(`| ${classification} | ${count} |`);
  }
  lines.push("");
  if (matrix.battleHoleFrontier.length === 0) {
    lines.push("No BattleHole or BattleFill frontier rows recorded yet.");
  } else {
    lines.push(
      "| Subject | Id | Kind | Classification | Coverage | Follow-up |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const row of matrix.battleHoleFrontier) {
      const kind = row.holeKind ?? row.fillKind ?? "";
      const coverage =
        (row.coveredByObligationIds ?? [])
          .map((obligationId) => `\`${obligationId}\``)
          .join(", ") || "_none_";
      const followUp =
        (row.followUpTaskIds ?? [])
          .map((taskId) => `\`${taskId}\``)
          .join(", ") || "_none_";
      lines.push(
        `| ${row.subject} | \`${row.id}\` | \`${kind}\` | ${row.classification} | ${coverage} | ${followUp} |`,
      );
    }
  }
  lines.push("");
  lines.push("## QNT Owner Roles");
  lines.push("");
  if (matrix.qntOwnerRoles.length === 0) {
    lines.push("No QNT owner roles recorded yet.");
  } else {
    lines.push("| Owner | Role | Obligations / profile-scoped rows |");
    lines.push("| --- | --- | --- |");
    for (const row of matrix.qntOwnerRoles) {
      lines.push(
        `| \`${row.ownerPath}\` | ${row.role} | ${renderQntOwnerRoleScopes(row)} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Unit Feature Profile QNT Owners");
  lines.push("");
  lines.push(
    "Rows here are derived from `plans/unit-profile-coverage/profiles.jsonl` for profiles mapped to `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`. They report profile-scoped QNT owner evidence so the broad procedure obligation does not credit unrelated unit-feature profiles.",
  );
  lines.push("");
  if ((matrix.unitFeatureProfileOwnerRows ?? []).length === 0) {
    lines.push("No unit-feature profile QNT owners recorded.");
  } else {
    lines.push("| Profile | QNT owners |");
    lines.push("| --- | --- |");
    for (const row of matrix.unitFeatureProfileOwnerRows) {
      const owners =
        (row.qntOwners ?? [])
          .map(
            (owner) =>
              `\`${owner.ownerPath}\` (${owner.role}; ${renderList(owner.obligationIds ?? [])})`,
          )
          .join("<br>") || "_none_";
      lines.push(`| \`${row.profileId}\` | ${owners} |`);
    }
  }
  lines.push("");
  lines.push("## Generator Readiness");
  lines.push("");
  if (matrix.generatorReadiness.length === 0) {
    lines.push("No generator-readiness rows recorded yet.");
  } else {
    lines.push("| Obligation | Status | Subset | Blockers | Follow-up |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const readiness of matrix.generatorReadiness) {
      lines.push(
        `| \`${readiness.obligationId}\` | ${readiness.status} | ${(readiness.generatorSubset ?? []).map((entry) => `\`${entry}\``).join(", ")} | ${(readiness.blockedBy ?? []).map((entry) => `\`${entry}\``).join(", ")} | ${(readiness.followUpTaskIds ?? []).map((entry) => `\`${entry}\``).join(", ")} |`,
      );
    }
  }
  lines.push("");
  lines.push("### Generator Readiness Backlog");
  lines.push("");
  lines.push(
    "Rows here are derived from covered obligations with semantic-core QNT owners whose generator-readiness row is either omitted or still `not-assessed`.",
  );
  lines.push("");
  if (matrix.generatorReadinessBacklog.length === 0) {
    lines.push("No missing or not-assessed generator-readiness rows.");
  } else {
    lines.push("| Obligation | Status | Semantic-core owners | Owner roles |");
    lines.push("| --- | --- | --- | --- |");
    for (const backlogRow of matrix.generatorReadinessBacklog) {
      const owners = backlogRow.ownerRoles
        .map((ownerRole) => `\`${ownerRole.ownerPath}\``)
        .join(", ");
      const ownerRoles = backlogRow.ownerRoles
        .map(
          (ownerRole) =>
            `\`${ownerRole.ownerPath}\`: ${ownerRole.role ?? "_missing_"}`,
        )
        .join("<br>");
      lines.push(
        `| \`${backlogRow.obligationId}\` | ${backlogRow.status} | ${owners} | ${ownerRoles} |`,
      );
    }
  }
  lines.push("");
  lines.push("### Semantic-Core Run Block Findings");
  lines.push("");
  lines.push(
    `Rows here are derived from semantic-core QNT owners that still contain Quint \`run\` blocks. Assessed readiness rows must split those tests out or classify the generator blocker as \`${semanticCoreRunBlockBlocker}\`.`,
  );
  lines.push("");
  if (matrix.semanticCoreRunBlockFindings.length === 0) {
    lines.push("No semantic-core QNT owners contain run blocks.");
  } else {
    lines.push(
      "| Obligation | Readiness status | Blocker | Follow-up | Semantic-core run blocks |",
    );
    lines.push("| --- | --- | --- | --- | --- |");
    for (const finding of matrix.semanticCoreRunBlockFindings) {
      const owners = finding.owners
        .map(
          (owner) =>
            `\`${owner.ownerPath}\`: lines ${owner.lines.map((line) => `\`${line}\``).join(", ")}`,
        )
        .join("<br>");
      const followUp =
        (finding.followUpTaskIds ?? [])
          .map((taskId) => `\`${taskId}\``)
          .join(", ") || "_none_";
      lines.push(
        `| \`${finding.obligationId}\` | ${finding.readinessStatus} | \`${finding.blocker}\` | ${followUp} | ${owners} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Kernel IR Boundaries");
  lines.push("");
  if (matrix.kernelIrBoundaries.length === 0) {
    lines.push("No kernel-IR boundary rows recorded yet.");
  } else {
    lines.push("| Boundary | Obligations | Runtime Paths | Summary |");
    lines.push("| --- | --- | --- | --- |");
    for (const boundary of matrix.kernelIrBoundaries) {
      const obligations =
        (boundary.obligationIds ?? [])
          .map((obligationId) => `\`${obligationId}\``)
          .join(", ") || "_none_";
      const runtimePaths =
        (boundary.runtimeBoundaryPaths ?? [])
          .map((ownerPath) => `\`${ownerPath}\``)
          .join(", ") || "_none_";
      lines.push(
        `| ${boundary.boundary} | ${obligations} | ${runtimePaths} | ${boundary.summary} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Open Work");
  lines.push("");
  const open = matrix.obligations.filter(
    (obligation) =>
      !coveredStatuses.has(obligation.status) &&
      !nonSemanticStatuses.has(obligation.status),
  );
  if (open.length === 0) {
    lines.push("No open transitional obligations.");
  } else {
    for (const obligation of open) {
      lines.push(
        `- \`${obligation.id}\` (${obligation.status}; follow-up: ${renderObligationFollowUp(obligation)}): ${obligation.title}`,
      );
    }
  }
  lines.push("");
  lines.push("## Checker Issues");
  lines.push("");
  if (issues.length === 0) {
    lines.push("No checker issues.");
  } else {
    for (const issue of issues) lines.push(`- ${issue}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderObligationFollowUp(obligation) {
  if (!Object.prototype.hasOwnProperty.call(obligation, "followUpTaskIds")) {
    return "_plan-update-required_";
  }
  if (!Array.isArray(obligation.followUpTaskIds)) {
    return "_invalid-follow-up-task-ids_";
  }
  if (obligation.followUpTaskIds.length === 0) {
    return "_invalid-empty-follow-up-task-ids_";
  }
  return obligation.followUpTaskIds.map((taskId) => `\`${taskId}\``).join(", ");
}

function renderObligationProfiles(obligation) {
  if (obligation.id === unitFeatureProcedureProfileObligationId) {
    return "_unit-feature profile-scoped owner rows below_";
  }
  if ((obligation.profiles ?? []).length > 0) {
    return obligation.profiles.map((profile) => `\`${profile}\``).join(", ");
  }
  if (coveredStatuses.has(obligation.status))
    return "_direct reducer entrypoint_";
  if (obligation.status === "needs-surface-evidence") {
    return "_surface join pending_";
  }
  if (nonSemanticStatuses.has(obligation.status)) {
    return "_outside reducer semantics_";
  }
  return "_profile mapping pending_";
}

function renderQntOwnerRoleScopes(row) {
  const profileScopedObligationIds = new Set(
    (row.profileScopes ?? []).flatMap((scope) => scope.obligationIds ?? []),
  );
  const scopes = [];
  const obligationIds = (row.obligationIds ?? []).filter(
    (obligationId) =>
      !(
        obligationId === unitFeatureProcedureProfileObligationId &&
        profileScopedObligationIds.has(obligationId)
      ),
  );
  if (obligationIds.length > 0) {
    scopes.push(
      obligationIds.map((obligationId) => `\`${obligationId}\``).join(", "),
    );
  }
  if ((row.profileScopes ?? []).length > 0) {
    scopes.push(
      `profile-scoped: ${(row.profileScopes ?? [])
        .map(
          (scope) =>
            `\`${scope.profileId}\` (${renderList(scope.obligationIds ?? [])})`,
        )
        .join(", ")}`,
    );
  }
  return scopes.length > 0 ? scopes.join("<br>") : "_none_";
}

function renderList(values) {
  if (values.length === 0) return "_none_";
  return values.map((value) => `\`${value}\``).join(", ");
}

function buildKernelCoverage({ root: rootPath }) {
  const paths = coveragePaths(rootPath);
  const obligations = readJsonl(rootPath, paths.obligations);
  const battleHoleFrontier = readJsonl(rootPath, paths.battleHoleFrontier);
  const profileObligations = readJsonl(rootPath, paths.profileObligations);
  const qntOwnerRoleRows = readJsonl(rootPath, paths.qntOwnerRoles);
  const generatorReadiness = readJsonl(rootPath, paths.generatorReadiness);
  const kernelIrBoundaries = readJsonl(rootPath, paths.kernelIrBoundaries);
  const profiles = readJsonl(rootPath, paths.unitProfiles);
  const expectedBattleFrontier = extractBattleFrontierSource(rootPath);
  const scanned = scanClaimFiles(rootPath);
  const markerIndex = buildMarkerIndex(scanned.markers);
  const knownRalphTaskIds = readKnownRalphTaskIds(rootPath);
  const issues = [];
  issues.push(...witnessKindCatalogIssues());
  issues.push(...generatorReadinessBlockerCatalogIssues());
  issues.push(...rulesKernelProfileKindClassificationIssues());
  const obligationIds = new Set();
  const obligationsById = new Map();
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  for (const [index, obligation] of obligations.entries()) {
    issues.push(
      ...validateObligationShape(obligation).map(
        (issue) => `obligations.jsonl:${index + 1}: ${issue}`,
      ),
    );
    if (obligationIds.has(obligation.id)) {
      issues.push(
        `obligations.jsonl:${index + 1}: duplicate obligation id ${obligation.id}.`,
      );
    }
    obligationIds.add(obligation.id);
    obligationsById.set(obligation.id, obligation);
  }

  for (const marker of scanned.markers) {
    if (!markerKinds.has(marker.markerKind)) {
      issues.push(
        `${marker.ownerPath}:${marker.line}: unknown KERNEL-COVERAGE marker kind ${marker.markerKind}.`,
      );
    }
    for (const obligationId of marker.obligationIds) {
      if (!obligationIds.has(obligationId)) {
        issues.push(
          `${marker.ownerPath}:${marker.line}: marker references unknown obligation ${obligationId}.`,
        );
      }
    }
  }

  const mappedProfileIds = new Set();
  for (const [index, mapping] of profileObligations.entries()) {
    issues.push(
      ...validateProfileMapping(
        mapping,
        index,
        obligationIds,
        profilesById,
        knownRalphTaskIds,
      ),
    );
    if (isRecord(mapping) && typeof mapping.profileId === "string") {
      if (mappedProfileIds.has(mapping.profileId)) {
        issues.push(
          `profile-obligations row ${index + 1}: duplicate profile mapping for ${mapping.profileId}.`,
        );
      }
      mappedProfileIds.add(mapping.profileId);
    }
  }
  issues.push(
    ...validateUnitFeatureProfileOwnerJoins(
      profileObligations,
      profilesById,
      obligationsById,
    ),
  );

  const seenBattleHoleFamilies = new Set();
  const seenBattleFillKinds = new Set();
  for (const [index, row] of battleHoleFrontier.entries()) {
    issues.push(
      ...validateBattleFrontierRow(
        row,
        index,
        obligationIds,
        obligationsById,
        expectedBattleFrontier,
      ),
    );
    if (isRecord(row) && typeof row.id === "string") {
      if (row.subject === "battle-hole-family") {
        if (seenBattleHoleFamilies.has(row.id)) {
          issues.push(
            `battle-hole-frontier row ${index + 1}: duplicate BattleHole family ${row.id}.`,
          );
        }
        seenBattleHoleFamilies.add(row.id);
      }
      if (row.subject === "battle-fill-kind") {
        if (seenBattleFillKinds.has(row.id)) {
          issues.push(
            `battle-hole-frontier row ${index + 1}: duplicate BattleFill kind ${row.id}.`,
          );
        }
        seenBattleFillKinds.add(row.id);
      }
    }
  }
  for (const expectedFamily of expectedBattleFrontier.holeFamilies.keys()) {
    if (!seenBattleHoleFamilies.has(expectedFamily)) {
      issues.push(
        `battle-hole-frontier is missing BattleHole family ${expectedFamily}.`,
      );
    }
  }
  for (const expectedFillKind of expectedBattleFrontier.fillKinds) {
    if (!seenBattleFillKinds.has(expectedFillKind)) {
      issues.push(
        `battle-hole-frontier is missing BattleFill kind ${expectedFillKind}.`,
      );
    }
  }

  const expectedQntOwnerPaths = qntOwnerPaths(obligations);
  const qntOwnerRolesByPath = new Map();
  for (const [index, row] of qntOwnerRoleRows.entries()) {
    if (isRecord(row) && typeof row.ownerPath === "string") {
      if (qntOwnerRolesByPath.has(row.ownerPath)) {
        issues.push(
          `qnt-owner-roles row ${index + 1}: duplicate QNT owner role for ${row.ownerPath}.`,
        );
      }
      qntOwnerRolesByPath.set(row.ownerPath, row.role);
    }
    issues.push(
      ...validateQntOwnerRole(row, index, rootPath, expectedQntOwnerPaths),
    );
  }
  for (const ownerPath of expectedQntOwnerPaths) {
    if (!qntOwnerRolesByPath.has(ownerPath)) {
      issues.push(`qnt-owner-roles is missing QNT owner ${ownerPath}.`);
    }
  }
  const semanticCoreRunBlocksByPath = scanSemanticCoreRunBlocks(
    rootPath,
    qntOwnerRoleRows,
  );

  const derivedProfilesByObligation = profilesByObligation(profileObligations);
  const readinessObligationIds = new Set();
  for (const [index, readiness] of generatorReadiness.entries()) {
    if (isRecord(readiness) && typeof readiness.obligationId === "string") {
      if (readinessObligationIds.has(readiness.obligationId)) {
        issues.push(
          `generator-readiness row ${index + 1}: duplicate readiness row for ${readiness.obligationId}.`,
        );
      }
      readinessObligationIds.add(readiness.obligationId);
    }
    issues.push(
      ...validateGeneratorReadiness(
        readiness,
        index,
        rootPath,
        obligationsById,
        qntOwnerRolesByPath,
        semanticCoreRunBlocksByPath,
        knownRalphTaskIds,
      ),
    );
  }
  issues.push(
    ...generatorReadinessDenominatorGaps(
      obligations,
      qntOwnerRolesByPath,
      readinessObligationIds,
    ),
  );

  const seenKernelIrBoundaries = new Set();
  for (const [index, boundary] of kernelIrBoundaries.entries()) {
    if (isRecord(boundary) && typeof boundary.boundary === "string") {
      if (seenKernelIrBoundaries.has(boundary.boundary)) {
        issues.push(
          `kernel-ir-boundaries row ${index + 1}: duplicate kernel IR boundary ${boundary.boundary}.`,
        );
      }
      seenKernelIrBoundaries.add(boundary.boundary);
    }
    issues.push(
      ...validateKernelIrBoundary(boundary, index, rootPath, obligationIds),
    );
  }
  for (const boundary of kernelIrBoundaryKinds) {
    if (!seenKernelIrBoundaries.has(boundary)) {
      issues.push(`kernel-ir-boundaries is missing boundary ${boundary}.`);
    }
  }

  for (const obligation of obligations) {
    if (Object.prototype.hasOwnProperty.call(obligation, "profiles")) {
      const derived = derivedProfilesByObligation.get(obligation.id) ?? [];
      issues.push(
        `${obligation.id}.profiles is derived from profile-obligations.jsonl; remove the field from obligations.jsonl. Derived profiles: ${derived.join(", ") || "_none_"}.`,
      );
    }
    if (coveredStatuses.has(obligation.status)) {
      issues.push(
        ...validateCoveredEvidence(rootPath, obligation, markerIndex),
        ...validateRuntimeTestWitnessProfiles(
          obligation,
          derivedProfilesByObligation.get(obligation.id) ?? [],
          profilesById,
        ),
      );
    }
  }

  const matrix = buildMatrix(rootPath);
  return {
    issues,
    matrix,
    report: renderReport(matrix, issues),
  };
}

function main() {
  const { runSelfTest } = require("./rules-kernel-coverage-self-test.cjs");
  if (selfTest) {
    runSelfTest();
    console.log("Rules kernel coverage self-test OK.");
    return;
  }

  const paths = coveragePaths(root);
  const result = buildKernelCoverage({ root });
  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.error(`rules-kernel-coverage: ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  const outputIssues = [
    ...compareOrWrite(
      root,
      write,
      paths.matrix,
      `${JSON.stringify(result.matrix, null, 2)}\n`,
    ),
    ...compareOrWrite(root, write, paths.report, result.report),
  ];
  if (outputIssues.length > 0) {
    for (const issue of outputIssues) {
      console.error(`rules-kernel-coverage: ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Rules kernel coverage OK: ${result.matrix.summary.total} obligations.`,
  );
}

module.exports = {
  buildKernelCoverage,
  renderReport,
};

if (require.main === module) main();
