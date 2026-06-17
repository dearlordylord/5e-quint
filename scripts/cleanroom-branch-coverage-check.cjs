#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const root = process.env.CLEANROOM_BRANCH_COVERAGE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const coverageRoot =
  process.env.CLEANROOM_BRANCH_COVERAGE_DIR ??
  path.join(root, "plans/cleanroom-branch-coverage");
const branchScopePath = path.join(coverageRoot, "branch-scope.jsonl");
const inventoryPath = path.join(coverageRoot, "source-branch-inventory.json");
const reportPath = path.join(coverageRoot, "REPORT.md");
const scaffoldTasksRoot = path.join(
  root,
  "plans/cleanroom-scaffolds/tasks",
);
const activeWorkTemplatePath = path.join(
  scaffoldTasksRoot,
  "ACTIVE_WORK.template.json",
);
const levelScopeSnapshotPath = path.join(
  scaffoldTasksRoot,
  "LEVEL_1_2_SCOPE.snapshot.md",
);
const targetReplayEvidencePath = argValue("--target-replay-evidence");
const passingStateCheckTags = new Set(["state-match", "projection-match"]);
const sha256Pattern = /^[0-9a-f]{64}$/i;
const scaffoldLaneOrder = ["creation", "sheet", "handoff", "battle", "rules-core"];
const scaffoldAssignments = [
  {
    assignmentId: "level-1-2-full",
    lanes: scaffoldLaneOrder,
  },
  {
    assignmentId: "level-1-2-creation",
    lanes: ["creation"],
  },
  {
    assignmentId: "level-1-2-sheet",
    lanes: ["sheet"],
  },
  {
    assignmentId: "level-1-2-handoff",
    lanes: ["handoff"],
  },
  {
    assignmentId: "level-1-2-battle",
    lanes: ["battle"],
  },
  {
    assignmentId: "level-1-2-rules-core",
    lanes: ["rules-core"],
  },
];

function validatePassingStateCheck(stateCheck, context, issues) {
  if (!isRecord(stateCheck) || typeof stateCheck.tag !== "string") {
    issues.push(`${context}: stateCheck must be a tagged record.`);
    return;
  }
  if (!passingStateCheckTags.has(stateCheck.tag)) {
    issues.push(
      `${context}: passing target replay requires stateCheck tag ${Array.from(passingStateCheckTags).join(" or ")}.`,
    );
    return;
  }
  if (
    typeof stateCheck.projection !== "string" ||
    stateCheck.projection.trim() === ""
  ) {
    issues.push(
      `${context}: passing target replay stateCheck requires projection.`,
    );
  }
  if (
    typeof stateCheck.comparator !== "string" ||
    stateCheck.comparator.trim() === ""
  ) {
    issues.push(
      `${context}: passing target replay stateCheck requires comparator.`,
    );
  }
  for (const field of ["expectedProjectionSha256", "observedProjectionSha256"]) {
    if (typeof stateCheck[field] !== "string" || !sha256Pattern.test(stateCheck[field])) {
      issues.push(
        `${context}: passing target replay stateCheck ${field} must be a sha256 hex string.`,
      );
    }
  }
  if (
    typeof stateCheck.expectedProjectionSha256 === "string" &&
    typeof stateCheck.observedProjectionSha256 === "string" &&
    stateCheck.expectedProjectionSha256 !== stateCheck.observedProjectionSha256
  ) {
    issues.push(
      `${context}: passing target replay stateCheck expectedProjectionSha256 and observedProjectionSha256 must match.`,
    );
  }
  if (
    !Array.isArray(stateCheck.checkedTargetStateFields) ||
    stateCheck.checkedTargetStateFields.length === 0 ||
    stateCheck.checkedTargetStateFields.some(
      (field) => typeof field !== "string" || field.trim() === "",
    )
  ) {
    issues.push(
      `${context}: passing target replay stateCheck requires checkedTargetStateFields.`,
    );
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function repoPath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function sha256File(filePath) {
  return sha256Text(fs.readFileSync(filePath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(rootPath, filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, number }) => {
      try {
        return { row: JSON.parse(line), line: number };
      } catch (error) {
        throw new Error(
          `${repoPath(rootPath, filePath)}:${number} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function writeOrCompare(filePath, content, shouldWrite) {
  if (shouldWrite) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return [];
  }
  if (!fs.existsSync(filePath)) {
    return [`${repoPath(root, filePath)} is missing; run with --write.`];
  }
  const current = fs.readFileSync(filePath, "utf8");
  if (current !== content) {
    return [`${repoPath(root, filePath)} is stale; run with --write.`];
  }
  return [];
}

function cleanroomDriverPath(driverPath) {
  const parts = driverPath.split("/");
  if (parts[0] !== "packages" || parts.length < 3) {
    throw new Error(`${driverPath}: branch-scope driverPath must start with packages/<package>/`);
  }
  return path.posix.join("cleanroom-input/qnt", parts[1], ...parts.slice(2));
}

function scaffoldLaneForDriver(driverPath) {
  if (driverPath.startsWith("packages/character-creation-runtime/")) {
    return "creation";
  }
  if (driverPath.startsWith("packages/character-sheet-runtime/")) {
    return "sheet";
  }
  if (driverPath.startsWith("packages/character-battle-runtime/")) {
    return "handoff";
  }
  if (driverPath.startsWith("packages/battle-runtime/rule-core-")) {
    return "rules-core";
  }
  if (driverPath.startsWith("packages/battle-runtime/")) {
    return "battle";
  }
  throw new Error(`${driverPath}: no cleanroom scaffold lane is defined.`);
}

function cleanroomQueueByLane(scopeRows) {
  const queues = new Map(scaffoldLaneOrder.map((lane) => [lane, []]));
  for (const row of scopeRows) {
    const lane = scaffoldLaneForDriver(row.driverPath);
    queues.get(lane).push(cleanroomDriverPath(row.driverPath));
  }
  return queues;
}

function renderActiveWorkTemplate(scopeRows) {
  const queues = cleanroomQueueByLane(scopeRows);
  const activeWork = {
    schemaVersion: 1,
    assignments: scaffoldAssignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      lanes: assignment.lanes.map((laneId) => ({
        laneId,
        queue: queues.get(laneId) ?? [],
      })),
    })),
  };
  return `${JSON.stringify(activeWork, null, 2)}\n`;
}

function numberedList(items) {
  return items.map((item, index) => `${index + 1}. \`${item}\``).join("\n");
}

function renderFutureQueueSection(scopeRows) {
  const queues = cleanroomQueueByLane(scopeRows);
  const laneHeadings = new Map([
    ["creation", "Creation"],
    ["sheet", "Sheet"],
    ["handoff", "Handoff"],
    ["battle", "Battle"],
    ["rules-core", "Rules Core"],
  ]);
  return [
    "## Future Level 1-2 Queue",
    "",
    "This queue is generated from `plans/cleanroom-branch-coverage/branch-scope.jsonl`.",
    "Drivers are ordered by dependency lane, then by branch-scope row order.",
    "",
    ...scaffoldLaneOrder.flatMap((laneId) => [
      `### ${laneHeadings.get(laneId)}`,
      "",
      numberedList(queues.get(laneId) ?? []),
      "",
    ]),
  ].join("\n").replace(/\n+$/, "\n\n");
}

function renderCurrentQueueSection(scopeRows) {
  return [
    "## Current Branch-Inventory-Ready Queue",
    "",
    "This queue is generated from `plans/cleanroom-branch-coverage/branch-scope.jsonl`.",
    "`tasks/ACTIVE_WORK.json` selects which ready drivers are assigned to a run.",
    "",
    numberedList(scopeRows.map((row) => cleanroomDriverPath(row.driverPath))),
    "",
    "",
  ].join("\n");
}

function replaceTopLevelSection(markdown, heading, replacement) {
  const start = markdown.indexOf(`## ${heading}\n`);
  if (start === -1) {
    throw new Error(`${repoPath(root, levelScopeSnapshotPath)} is missing section ${heading}.`);
  }
  const next = markdown.indexOf("\n## ", start + 1);
  const end = next === -1 ? markdown.length : next + 1;
  return `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`;
}

function renderLevelScopeSnapshot(scopeRows) {
  const current = renderCurrentQueueSection(scopeRows);
  const future = renderFutureQueueSection(scopeRows);
  const existing = fs.readFileSync(levelScopeSnapshotPath, "utf8");
  return replaceTopLevelSection(
    replaceTopLevelSection(existing, "Current Branch-Inventory-Ready Queue", current),
    "Future Level 1-2 Queue",
    future,
  );
}

function renderScaffoldQueueArtifacts(scopeRows) {
  if (
    !fs.existsSync(activeWorkTemplatePath) ||
    !fs.existsSync(levelScopeSnapshotPath)
  ) {
    return [];
  }
  return [
    {
      path: activeWorkTemplatePath,
      text: renderActiveWorkTemplate(scopeRows),
    },
    {
      path: levelScopeSnapshotPath,
      text: renderLevelScopeSnapshot(scopeRows),
    },
  ];
}

function quintParse(filePath) {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-branch-coverage-"),
  );
  const outPath = path.join(tmpDir, "parse.json");
  try {
    execFileSync(
      "pnpm",
      ["exec", "quint", "parse", filePath, "--out", outPath],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    return readJson(outPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function actionDefinitions(parsed, branchFamilies) {
  const modules = parsed.modules ?? [];
  const actionModules = modules.filter((module) =>
    (module.declarations ?? []).some(
      (declaration) =>
        declaration.kind === "def" && declaration.qualifier === "action",
    ),
  );
  const module =
    actionModules.find((candidate) => {
      const actionNames = new Set(
        (candidate.declarations ?? [])
          .filter(
            (declaration) =>
              declaration.kind === "def" && declaration.qualifier === "action",
          )
          .map((declaration) => declaration.name),
      );
      return branchFamilies.every((family) => actionNames.has(family));
    }) ?? actionModules.at(-1);
  if (module === undefined) return undefined;
  return new Map(
    (module.declarations ?? [])
      .filter(
        (declaration) =>
          declaration.kind === "def" && declaration.qualifier === "action",
      )
      .map((declaration) => [declaration.name, declaration]),
  );
}

function isActionAny(expr) {
  return (
    isRecord(expr) &&
    expr.kind === "app" &&
    expr.opcode === "actionAny" &&
    Array.isArray(expr.args)
  );
}

function branchLeavesForFamily({
  actionDefs,
  branchFamily,
  context,
  issues,
  stack = [],
}) {
  const definition = actionDefs.get(branchFamily);
  if (definition === undefined) {
    issues.push(`${context}: branch family ${branchFamily} is not an action.`);
    return [];
  }
  if (!isActionAny(definition.expr)) {
    issues.push(
      `${context}: branch family ${branchFamily} must be an any {} action.`,
    );
    return [];
  }
  if (stack.includes(branchFamily)) {
    issues.push(
      `${context}: branch family cycle detected: ${[...stack, branchFamily].join(" -> ")}.`,
    );
    return [];
  }
  return definition.expr.args.flatMap((arg) => {
    if (arg.kind !== "name") {
      issues.push(
        `${context}: ${branchFamily} contains an anonymous branch expression; name it so mbt::actionTaken can report it.`,
      );
      return [];
    }
    const nested = actionDefs.get(arg.name);
    if (nested !== undefined && isActionAny(nested.expr)) {
      return branchLeavesForFamily({
        actionDefs,
        branchFamily: arg.name,
        context,
        issues,
        stack: [...stack, branchFamily],
      }).map((leaf) => ({
        ...leaf,
        branchPath: [branchFamily, ...leaf.branchPath],
      }));
    }
    return [{ branchAction: arg.name, branchPath: [branchFamily, arg.name] }];
  });
}

function collectNondetNames(expr) {
  const found = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!isRecord(value)) return;
    if (
      value.kind === "let" &&
      isRecord(value.opdef) &&
      value.opdef.qualifier === "nondet" &&
      typeof value.opdef.name === "string"
    ) {
      found.add(value.opdef.name);
    }
    for (const entry of Object.values(value)) visit(entry);
  };
  visit(expr);
  return Array.from(found).sort();
}

function validateScope(scope, context) {
  const issues = [];
  if (!isRecord(scope) || typeof scope.tag !== "string") {
    return [`${context}: scope must be a tagged record.`];
  }
  if (scope.tag === "in-scope") return issues;
  if (scope.tag === "out-of-scope") {
    if (typeof scope.reason !== "string" || scope.reason.trim() === "") {
      issues.push(`${context}: out-of-scope scope requires reason.`);
    }
    if (typeof scope.reviewedBy !== "string" || scope.reviewedBy.trim() === "") {
      issues.push(`${context}: out-of-scope scope requires reviewedBy.`);
    }
    return issues;
  }
  return [`${context}: unknown scope tag ${scope.tag}.`];
}

function validateReplay(replay, context) {
  const issues = [];
  if (!isRecord(replay) || typeof replay.tag !== "string") {
    return [`${context}: replay must be a tagged record.`];
  }
  if (replay.tag === "observable-from-step") {
    if (
      typeof replay.stepAction !== "string" ||
      replay.stepAction.trim() === ""
    ) {
      issues.push(`${context}: observable-from-step replay requires stepAction.`);
    }
    return issues;
  }
  if (replay.tag === "deterministic-entrypoint") {
    for (const field of ["entrypoint", "rationale"]) {
      if (typeof replay[field] !== "string" || replay[field].trim() === "") {
        issues.push(`${context}: deterministic-entrypoint requires ${field}.`);
      }
    }
    return issues;
  }
  if (replay.tag === "transit-only") {
    for (const field of ["reason", "reviewedBy"]) {
      if (typeof replay[field] !== "string" || replay[field].trim() === "") {
        issues.push(`${context}: transit-only replay requires ${field}.`);
      }
    }
    return issues;
  }
  if (replay.tag === "source-blocker") {
    for (const field of ["blockerId", "reason", "reviewedBy"]) {
      if (typeof replay[field] !== "string" || replay[field].trim() === "") {
        issues.push(`${context}: source-blocker replay requires ${field}.`);
      }
    }
    return issues;
  }
  return [`${context}: unknown replay tag ${replay.tag}.`];
}

function validateScopeRow(entry, rootPath, scopePath) {
  const issues = [];
  const { row, line } = entry;
  const context = `${repoPath(rootPath, scopePath)}:${line}`;
  if (!isRecord(row)) {
    return { row, issues: [`${context}: row must be an object.`] };
  }
  if (typeof row.driverPath !== "string" || row.driverPath.trim() === "") {
    issues.push(`${context}: driverPath must be a non-empty string.`);
  }
  if (
    !Array.isArray(row.branchFamilies) ||
    row.branchFamilies.length === 0 ||
    row.branchFamilies.some((item) => typeof item !== "string" || item === "")
  ) {
    issues.push(`${context}: branchFamilies must be a non-empty string array.`);
  }
  issues.push(...validateScope(row.defaultScope, `${context}: defaultScope`));
  issues.push(...validateReplay(row.defaultReplay, `${context}: defaultReplay`));
  if (
    row.defaultReplay?.tag === "transit-only" &&
    row.defaultScope?.tag !== "out-of-scope"
  ) {
    issues.push(`${context}: transit-only defaultReplay requires out-of-scope defaultScope.`);
  }
  if (!Array.isArray(row.branchDecisions)) {
    issues.push(`${context}: branchDecisions must be an array.`);
  } else {
    for (const [index, decision] of row.branchDecisions.entries()) {
      const decisionContext = `${context}: branchDecisions[${index}]`;
      if (!isRecord(decision)) {
        issues.push(`${decisionContext}: decision must be an object.`);
        continue;
      }
      if (
        typeof decision.branchAction !== "string" ||
        decision.branchAction.trim() === ""
      ) {
        issues.push(`${decisionContext}: branchAction must be a string.`);
      }
      issues.push(...validateScope(decision.scope, `${decisionContext}: scope`));
      issues.push(
        ...validateReplay(decision.replay, `${decisionContext}: replay`),
      );
      if (
        decision.replay?.tag === "transit-only" &&
        decision.scope?.tag !== "out-of-scope"
      ) {
        issues.push(`${decisionContext}: transit-only replay requires out-of-scope scope.`);
      }
    }
  }
  return { row, issues };
}

function decisionForBranch(row, branchAction) {
  const decision = row.branchDecisions.find(
    (candidate) => candidate.branchAction === branchAction,
  );
  if (decision === undefined) {
    return {
      scope: row.defaultScope,
      replay: row.defaultReplay,
      source: "default",
    };
  }
  return {
    scope: decision.scope,
    replay: decision.replay,
    source: "branch-decision",
  };
}

function buildInventory({ rootPath, scopePath }) {
  const issues = [];
  const scopeEntries = readJsonl(rootPath, scopePath);
  const validatedRows = scopeEntries.map((entry) =>
    validateScopeRow(entry, rootPath, scopePath),
  );
  for (const validated of validatedRows) issues.push(...validated.issues);
  if (issues.length > 0) {
    return { inventory: undefined, issues };
  }

  const seenDrivers = new Set();
  const branchObligations = [];
  const sampledInputs = [];

  for (const { row } of validatedRows) {
    if (seenDrivers.has(row.driverPath)) {
      issues.push(`${row.driverPath}: duplicate branch-scope driver row.`);
      continue;
    }
    seenDrivers.add(row.driverPath);
    const driverAbs = path.join(rootPath, row.driverPath);
    if (!fs.existsSync(driverAbs)) {
      issues.push(`${row.driverPath}: driver file is missing.`);
      continue;
    }
    let parsed;
    try {
      parsed = quintParse(driverAbs);
    } catch (error) {
      issues.push(`${row.driverPath}: quint parse failed: ${error.message}`);
      continue;
    }
    const actionDefs = actionDefinitions(parsed, row.branchFamilies);
    if (actionDefs === undefined) {
      issues.push(`${row.driverPath}: no action definitions found.`);
      continue;
    }
    const qntFileSha256 = sha256File(driverAbs);
    const discovered = [];
    for (const branchFamily of row.branchFamilies) {
      for (const leaf of branchLeavesForFamily({
        actionDefs,
        branchFamily,
        context: row.driverPath,
        issues,
      })) {
        discovered.push({ branchFamily, ...leaf });
      }
    }
    const discoveredActions = new Set(
      discovered.map((leaf) => leaf.branchAction),
    );
    if (discoveredActions.size !== discovered.length) {
      const duplicateActions = discovered
        .map((leaf) => leaf.branchAction)
        .filter(
          (branchAction, index, actions) =>
            actions.indexOf(branchAction) !== index,
        );
      issues.push(
        `${row.driverPath}: branch family discovery produced duplicate branch actions ${Array.from(new Set(duplicateActions)).join(", ")}.`,
      );
    }
    for (const decision of row.branchDecisions) {
      if (!discoveredActions.has(decision.branchAction)) {
        issues.push(
          `${row.driverPath}: branch decision references missing action ${decision.branchAction}.`,
        );
      }
    }
    for (const leaf of discovered) {
      const decision = decisionForBranch(row, leaf.branchAction);
      const obligation = {
        obligationId: `${row.driverPath}#${leaf.branchFamily}:${leaf.branchAction}`,
        driverPath: row.driverPath,
        qntFileSha256,
        branchFamily: leaf.branchFamily,
        branchPath: leaf.branchPath,
        branchAction: leaf.branchAction,
        scope: decision.scope,
        replay: decision.replay,
        decisionSource: decision.source,
      };
      if (
        branchObligations.some(
          (existing) => existing.obligationId === obligation.obligationId,
        )
      ) {
        issues.push(
          `${row.driverPath}: duplicate obligation id ${obligation.obligationId}.`,
        );
      }
      branchObligations.push(obligation);
      const action = actionDefs.get(leaf.branchAction);
      for (const pickName of collectNondetNames(action?.expr)) {
        sampledInputs.push({
          driverPath: row.driverPath,
          qntFileSha256,
          branchFamily: leaf.branchFamily,
          branchAction: leaf.branchAction,
          pickName,
        });
      }
    }
  }

  branchObligations.sort((left, right) =>
    left.obligationId.localeCompare(right.obligationId),
  );
  sampledInputs.sort(
    (left, right) =>
      left.driverPath.localeCompare(right.driverPath) ||
      left.branchFamily.localeCompare(right.branchFamily) ||
      left.branchAction.localeCompare(right.branchAction) ||
      left.pickName.localeCompare(right.pickName),
  );

  const inventory = {
    schemaVersion: 1,
    generatedBy: "scripts/cleanroom-branch-coverage-check.cjs",
    sourceArtifacts: {
      branchScope: repoPath(rootPath, scopePath),
    },
    quintMetadataModel: {
      branchActionSource: "mbt::actionTaken",
      sampledInputSource: "mbt::nondetPicks",
    },
    branchObligations,
    sampledInputs,
  };
  return { inventory, issues };
}

function requiredTargetObligations(inventory) {
  return inventory.branchObligations.filter(
    (obligation) =>
      obligation.scope.tag === "in-scope" &&
      obligation.replay.tag !== "source-blocker",
  );
}

function validateTargetReplayEvidence(
  evidence,
  inventory,
  inventorySha,
  options = {},
) {
  const requireAllObligations = options.requireAllObligations !== false;
  const expectedCleanroomManifestSourceCommitSha =
    options.expectedCleanroomManifestSourceCommitSha;
  const expectedTargetProfileSha256 = options.expectedTargetProfileSha256;
  const issues = [];
  if (!isRecord(evidence)) {
    return { issues: ["target replay evidence must be an object."], covered: [] };
  }
  if (
    !isRecord(evidence.generatedBy) ||
    evidence.generatedBy.tag !== "target-harness"
  ) {
    issues.push(
      "target replay evidence must be generatedBy.tag = target-harness.",
    );
  }
  for (const field of [
    "cleanroomManifestSourceCommitSha",
    "sourceBranchInventorySha256",
    "targetProfile",
    "targetProfileSha256",
  ]) {
    if (typeof evidence[field] !== "string" || evidence[field].trim() === "") {
      issues.push(`target replay evidence requires ${field}.`);
    }
  }
  if (evidence.sourceBranchInventorySha256 !== inventorySha) {
    issues.push("target replay evidence references a stale source inventory.");
  }
  if (
    expectedCleanroomManifestSourceCommitSha !== undefined &&
    evidence.cleanroomManifestSourceCommitSha !==
      expectedCleanroomManifestSourceCommitSha
  ) {
    issues.push(
      `target replay evidence cleanroomManifestSourceCommitSha ${evidence.cleanroomManifestSourceCommitSha} does not match expected ${expectedCleanroomManifestSourceCommitSha}.`,
    );
  }
  if (
    expectedTargetProfileSha256 !== undefined &&
    evidence.targetProfileSha256 !== expectedTargetProfileSha256
  ) {
    issues.push(
      `target replay evidence targetProfileSha256 ${evidence.targetProfileSha256} does not match expected ${expectedTargetProfileSha256}.`,
    );
  }
  if (!Array.isArray(evidence.runs)) {
    issues.push("target replay evidence requires runs array.");
    return { issues, covered: [] };
  }

  const obligationsById = new Map();
  for (const obligation of inventory.branchObligations) {
    if (obligationsById.has(obligation.obligationId)) {
      issues.push(
        `source inventory has duplicate obligation id ${obligation.obligationId}.`,
      );
    }
    obligationsById.set(obligation.obligationId, obligation);
  }
  const covered = new Set();
  const sampledInputsByObligation = new Map();
  for (const input of inventory.sampledInputs ?? []) {
    const obligationId = `${input.driverPath}#${input.branchFamily}:${input.branchAction}`;
    if (!sampledInputsByObligation.has(obligationId)) {
      sampledInputsByObligation.set(obligationId, new Set());
    }
    sampledInputsByObligation.get(obligationId).add(input.pickName);
  }
  const traceIdsByObligation = new Set();
  for (const [index, run] of evidence.runs.entries()) {
    const context = `target replay evidence runs[${index}]`;
    const issueCountBeforeRun = issues.length;
    if (!isRecord(run)) {
      issues.push(`${context}: run must be an object.`);
      continue;
    }
    if (run.evidenceKind !== "target-qnt-mbt-replay") {
      issues.push(
        `${context}: evidenceKind must be target-qnt-mbt-replay; diagnostic tests do not close MBT branches.`,
      );
    }
    for (const field of [
      "driverPath",
      "qntFileSha256",
      "branchFamily",
      "branchAction",
      "observedActionTaken",
      "harnessTestPath",
      "traceId",
    ]) {
      if (typeof run[field] !== "string" || run[field].trim() === "") {
        issues.push(`${context}: ${field} must be a non-empty string.`);
      }
    }
    const obligationId = `${run.driverPath}#${run.branchFamily}:${run.branchAction}`;
    const obligation = obligationsById.get(obligationId);
    if (obligation === undefined) {
      issues.push(`${context}: unknown source obligation ${obligationId}.`);
      continue;
    }
    if (run.qntFileSha256 !== obligation.qntFileSha256) {
      issues.push(`${context}: QNT file hash does not match source inventory.`);
    }
    if (run.observedActionTaken !== run.branchAction) {
      issues.push(
        `${context}: observedActionTaken ${run.observedActionTaken} does not match branchAction ${run.branchAction}.`,
      );
    }
    const traceKey = `${obligationId}\u0000${run.traceId}`;
    if (traceIdsByObligation.has(traceKey)) {
      issues.push(
        `${context}: duplicate traceId ${run.traceId} for source obligation ${obligationId}.`,
      );
    }
    traceIdsByObligation.add(traceKey);
    const expectedPickNames = sampledInputsByObligation.get(obligationId) ?? new Set();
    if (expectedPickNames.size > 0 && !Array.isArray(run.sampledInputs)) {
      issues.push(`${context}: sampledInputs array is required for sampled QNT inputs.`);
    } else if (Array.isArray(run.sampledInputs)) {
      const observedPickNames = new Set();
      for (const [inputIndex, input] of run.sampledInputs.entries()) {
        const inputContext = `${context}: sampledInputs[${inputIndex}]`;
        if (!isRecord(input)) {
          issues.push(`${inputContext}: sampled input must be an object.`);
          continue;
        }
        if (typeof input.pickName !== "string" || input.pickName.trim() === "") {
          issues.push(`${inputContext}: pickName must be a non-empty string.`);
        } else {
          if (observedPickNames.has(input.pickName)) {
            issues.push(`${inputContext}: duplicate sampled input ${input.pickName}.`);
          }
          observedPickNames.add(input.pickName);
          if (!expectedPickNames.has(input.pickName)) {
            issues.push(`${inputContext}: unknown sampled input ${input.pickName}.`);
          }
        }
        if (!Object.prototype.hasOwnProperty.call(input, "value")) {
          issues.push(`${inputContext}: value must be recorded.`);
        }
      }
      for (const pickName of expectedPickNames) {
        if (!observedPickNames.has(pickName)) {
          issues.push(`${context}: missing sampled input ${pickName}.`);
        }
      }
    }
    if (!isRecord(run.stateCheck) || typeof run.stateCheck.tag !== "string") {
      issues.push(`${context}: stateCheck must be a tagged record.`);
    }
    if (!isRecord(run.result) || typeof run.result.tag !== "string") {
      issues.push(`${context}: result must be a tagged record.`);
    }
    if (run.result?.tag === "pass") {
      validatePassingStateCheck(run.stateCheck, context, issues);
    }
    if (run.result?.tag === "pass" && issues.length === issueCountBeforeRun) {
      covered.add(obligationId);
    } else if (run.result?.tag !== "pass" && run.result?.tag !== "fail") {
      issues.push(`${context}: result tag must be pass or fail.`);
    }
  }
  if (requireAllObligations) {
    for (const obligation of requiredTargetObligations(inventory)) {
      if (!covered.has(obligation.obligationId)) {
        issues.push(
          `${obligation.obligationId}: missing passing target replay evidence.`,
        );
      }
    }
  }
  return { issues, covered: Array.from(covered).sort() };
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function code(value) {
  return `\`${md(value)}\``;
}

function renderReport({ inventory, targetEvidenceSummary }) {
  const inScope = inventory.branchObligations.filter(
    (obligation) => obligation.scope.tag === "in-scope",
  );
  const outOfScope = inventory.branchObligations.filter(
    (obligation) => obligation.scope.tag === "out-of-scope",
  );
  const sourceBlocked = inventory.branchObligations.filter(
    (obligation) => obligation.replay.tag === "source-blocker",
  );
  const transitOnly = inventory.branchObligations.filter(
    (obligation) => obligation.replay.tag === "transit-only",
  );
  const targetStatus =
    targetEvidenceSummary === undefined
      ? "not supplied"
      : targetEvidenceSummary.issues.length === 0
        ? "pass"
        : "blocked";
  return `${[
    "# Cleanroom Branch Coverage",
    "",
    "Generated by `scripts/cleanroom-branch-coverage-check.cjs`.",
    "",
    "## Summary",
    "",
    `- Scoped source inventory status: pass`,
    `- Scope mode: curated branch-scope rows only`,
    `- Target replay evidence status: ${targetStatus}`,
    `- Branch obligations: ${inventory.branchObligations.length}`,
    `- In-scope obligations: ${inScope.length}`,
    `- Out-of-scope obligations: ${outOfScope.length}`,
    `- Transit-only obligations: ${transitOnly.length}`,
    `- Source-blocked obligations: ${sourceBlocked.length}`,
    `- Sampled inputs: ${inventory.sampledInputs.length}`,
    "",
    "## Branch Obligations",
    "",
    "| Obligation | Scope | Replay | QNT sha256 |",
    "| --- | --- | --- | --- |",
    ...inventory.branchObligations.map(
      (obligation) =>
        `| ${code(obligation.obligationId)} | ${md(obligation.scope.tag)} | ${md(obligation.replay.tag)} | ${code(obligation.qntFileSha256)} |`,
    ),
    "",
    "## Sampled Inputs",
    "",
    "| Driver | Branch | Pick |",
    "| --- | --- | --- |",
    ...(inventory.sampledInputs.length === 0
      ? ["| _none_ | _none_ | _none_ |"]
      : inventory.sampledInputs.map(
          (input) =>
            `| ${code(input.driverPath)} | ${code(input.branchAction)} | ${code(input.pickName)} |`,
        )),
    "",
    "## Target Evidence",
    "",
    ...(targetEvidenceSummary === undefined
      ? [
          "No target replay evidence was supplied. Source readiness can still be checked, but target acceptance requires harness-generated replay evidence.",
        ]
      : [
          `Target evidence issues: ${targetEvidenceSummary.issues.length}`,
          "",
          "| Covered obligation |",
          "| --- |",
          ...(targetEvidenceSummary.covered.length === 0
            ? ["| _none_ |"]
            : targetEvidenceSummary.covered.map(
                (obligationId) => `| ${code(obligationId)} |`,
              )),
        ]),
    "",
  ].join("\n")}`;
}

function runSelfTest() {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-branch-coverage-"),
  );
  try {
    const fixtureDir = path.join(fixtureRoot, "packages/fixture");
    const fixtureCoverage = path.join(
      fixtureRoot,
      "plans/cleanroom-branch-coverage",
    );
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.mkdirSync(fixtureCoverage, { recursive: true });
    const qntPath = path.join(fixtureDir, "fixture.mbt.qnt");
    fs.writeFileSync(
      qntPath,
      [
        "module fixtureMbt {",
        "  var value: int",
        "  action init = all { value' = 0 }",
        "  action doOne = all { value' = 1 }",
        "  action doSample = {",
        "    nondet roll = Set(1, 2).oneOf()",
        "    all { value' = roll }",
        "  }",
        "  action stepNested = any { doSample }",
        "  action step = any { doOne, stepNested }",
        "}",
        "",
      ].join("\n"),
    );
    const scopePath = path.join(fixtureCoverage, "branch-scope.jsonl");
    fs.writeFileSync(
      scopePath,
      `${JSON.stringify({
        driverPath: "packages/fixture/fixture.mbt.qnt",
        branchFamilies: ["step"],
        defaultScope: { tag: "in-scope" },
        defaultReplay: { tag: "observable-from-step", stepAction: "step" },
        branchDecisions: [],
      })}\n`,
    );
    const { inventory, issues } = buildInventory({
      rootPath: fixtureRoot,
      scopePath,
    });
    if (issues.length > 0 || inventory === undefined) {
      throw new Error(`expected fixture inventory to pass: ${issues.join("; ")}`);
    }
    const obligationIds = inventory.branchObligations.map(
      (obligation) => obligation.obligationId,
    );
    const expected = [
      "packages/fixture/fixture.mbt.qnt#step:doOne",
      "packages/fixture/fixture.mbt.qnt#step:doSample",
    ];
    if (JSON.stringify(obligationIds) !== JSON.stringify(expected)) {
      throw new Error(
        `expected nested branch leaves ${JSON.stringify(expected)}, got ${JSON.stringify(obligationIds)}`,
      );
    }
    if (
      inventory.sampledInputs.length !== 1 ||
      inventory.sampledInputs[0].pickName !== "roll"
    ) {
      throw new Error(
        `expected one sampled input named roll, got ${JSON.stringify(inventory.sampledInputs)}`,
      );
    }
    const inventorySha = sha256Text(stableStringify(inventory));
    const projectionSha = sha256Text("fixture value");
    const targetEvidence = {
      generatedBy: { tag: "target-harness", name: "fixture" },
      cleanroomManifestSourceCommitSha: "fixture-manifest",
      sourceBranchInventorySha256: inventorySha,
      targetProfile: "fixture-target",
      targetProfileSha256: "fixture-target-profile-sha256",
      runs: inventory.branchObligations.map((obligation) => ({
        evidenceKind: "target-qnt-mbt-replay",
        driverPath: obligation.driverPath,
        qntFileSha256: obligation.qntFileSha256,
        branchFamily: obligation.branchFamily,
        branchAction: obligation.branchAction,
        observedActionTaken: obligation.branchAction,
        harnessTestPath: "tests/fixture.rs",
        traceId: `seed=1 action=${obligation.branchAction}`,
        stateCheck: {
          tag: "state-match",
          projection: "fixture value",
          comparator: "fixture-state-projection-v1",
          expectedProjectionSha256: projectionSha,
          observedProjectionSha256: projectionSha,
          checkedTargetStateFields: ["FixtureState.value"],
        },
        result: { tag: "pass" },
        ...(obligation.branchAction === "doSample"
          ? { sampledInputs: [{ pickName: "roll", value: 1 }] }
          : {}),
      })),
    };
    const targetResult = validateTargetReplayEvidence(
      targetEvidence,
      inventory,
      inventorySha,
    );
    if (targetResult.issues.length > 0) {
      throw new Error(
        `expected target evidence to pass: ${targetResult.issues.join("; ")}`,
      );
    }
    const badEvidence = stable(targetEvidence);
    badEvidence.runs[0].observedActionTaken = "wrongAction";
    const badResult = validateTargetReplayEvidence(
      badEvidence,
      inventory,
      inventorySha,
    );
    if (
      !badResult.issues.some((issue) =>
        issue.includes("observedActionTaken wrongAction"),
      )
    ) {
      throw new Error(
        `expected wrong action evidence to fail, got ${JSON.stringify(badResult.issues)}`,
      );
    }
    const diagnosticEvidence = stable(targetEvidence);
    diagnosticEvidence.runs[0].evidenceKind = "target-unit-test";
    const diagnosticResult = validateTargetReplayEvidence(
      diagnosticEvidence,
      inventory,
      inventorySha,
    );
    if (
      !diagnosticResult.issues.some((issue) =>
        issue.includes("diagnostic tests do not close MBT branches"),
      )
    ) {
      throw new Error(
        `expected diagnostic evidence to fail, got ${JSON.stringify(diagnosticResult.issues)}`,
      );
    }
    const badStateCheckEvidence = stable(targetEvidence);
    badStateCheckEvidence.runs[0].stateCheck = { tag: "not-checked" };
    const badStateCheckResult = validateTargetReplayEvidence(
      badStateCheckEvidence,
      inventory,
      inventorySha,
    );
    if (
      !badStateCheckResult.issues.some((issue) =>
        issue.includes("passing target replay requires stateCheck tag"),
      )
    ) {
      throw new Error(
        `expected meaningless stateCheck evidence to fail, got ${JSON.stringify(badStateCheckResult.issues)}`,
      );
    }
    const incompleteStateCheckEvidence = stable(targetEvidence);
    incompleteStateCheckEvidence.runs[0].stateCheck = { tag: "state-match" };
    const incompleteStateCheckResult = validateTargetReplayEvidence(
      incompleteStateCheckEvidence,
      inventory,
      inventorySha,
    );
    if (
      !incompleteStateCheckResult.issues.some((issue) =>
        issue.includes("stateCheck requires projection"),
      )
    ) {
      throw new Error(
        `expected incomplete stateCheck evidence to fail, got ${JSON.stringify(incompleteStateCheckResult.issues)}`,
      );
    }
    const mismatchedProjectionEvidence = stable(targetEvidence);
    mismatchedProjectionEvidence.runs[0].stateCheck.observedProjectionSha256 =
      sha256Text("wrong value");
    const mismatchedProjectionResult = validateTargetReplayEvidence(
      mismatchedProjectionEvidence,
      inventory,
      inventorySha,
    );
    if (
      !mismatchedProjectionResult.issues.some((issue) =>
        issue.includes("expectedProjectionSha256 and observedProjectionSha256 must match"),
      )
    ) {
      throw new Error(
        `expected mismatched projection evidence to fail, got ${JSON.stringify(mismatchedProjectionResult.issues)}`,
      );
    }
    const missingSampledInputEvidence = stable(targetEvidence);
    delete missingSampledInputEvidence.runs.find(
      (run) => run.branchAction === "doSample",
    ).sampledInputs;
    const missingSampledInputResult = validateTargetReplayEvidence(
      missingSampledInputEvidence,
      inventory,
      inventorySha,
    );
    if (
      !missingSampledInputResult.issues.some((issue) =>
        issue.includes("sampledInputs array is required"),
      )
    ) {
      throw new Error(
        `expected missing sampled input evidence to fail, got ${JSON.stringify(missingSampledInputResult.issues)}`,
      );
    }
    const duplicateSampledInputEvidence = stable(targetEvidence);
    duplicateSampledInputEvidence.runs
      .find((run) => run.branchAction === "doSample")
      .sampledInputs.push({ pickName: "roll", value: 2 });
    const duplicateSampledInputResult = validateTargetReplayEvidence(
      duplicateSampledInputEvidence,
      inventory,
      inventorySha,
    );
    if (
      !duplicateSampledInputResult.issues.some((issue) =>
        issue.includes("duplicate sampled input roll"),
      )
    ) {
      throw new Error(
        `expected duplicate sampled input evidence to fail, got ${JSON.stringify(duplicateSampledInputResult.issues)}`,
      );
    }
    const unexpectedSampledInputEvidence = stable(targetEvidence);
    unexpectedSampledInputEvidence.runs.find(
      (run) => run.branchAction === "doOne",
    ).sampledInputs = [{ pickName: "roll", value: 1 }];
    const unexpectedSampledInputResult = validateTargetReplayEvidence(
      unexpectedSampledInputEvidence,
      inventory,
      inventorySha,
    );
    if (
      !unexpectedSampledInputResult.issues.some((issue) =>
        issue.includes("unknown sampled input roll"),
      )
    ) {
      throw new Error(
        `expected unexpected sampled input evidence to fail, got ${JSON.stringify(unexpectedSampledInputResult.issues)}`,
      );
    }
    fs.writeFileSync(
      scopePath,
      `${JSON.stringify({
        driverPath: "packages/fixture/fixture.mbt.qnt",
        branchFamilies: ["step"],
        defaultScope: { tag: "in-scope" },
        defaultReplay: { tag: "observable-from-step", stepAction: "step" },
        branchDecisions: [
          {
            branchAction: "doSample",
            scope: { tag: "in-scope" },
            replay: {
              tag: "transit-only",
              reason: "self-test transit branch",
              reviewedBy: "self-test",
            },
          },
        ],
      })}\n`,
    );
    const badTransitResult = buildInventory({
      rootPath: fixtureRoot,
      scopePath,
    });
    if (
      !badTransitResult.issues.some((issue) =>
        issue.includes("transit-only replay requires out-of-scope scope"),
      )
    ) {
      throw new Error(
        `expected in-scope transit-only branch to fail, got ${JSON.stringify(badTransitResult.issues)}`,
      );
    }
    fs.writeFileSync(
      scopePath,
      `${JSON.stringify({
        driverPath: "packages/fixture/fixture.mbt.qnt",
        branchFamilies: ["step"],
        defaultScope: { tag: "in-scope" },
        defaultReplay: { tag: "observable-from-step", stepAction: "step" },
        branchDecisions: [
          {
            branchAction: "doSample",
            scope: {
              tag: "out-of-scope",
              reason: "self-test out branch",
              reviewedBy: "self-test",
            },
            replay: {
              tag: "transit-only",
              reason: "self-test transit branch",
              reviewedBy: "self-test",
            },
          },
        ],
      })}\n`,
    );
    const transitResult = buildInventory({
      rootPath: fixtureRoot,
      scopePath,
    });
    if (transitResult.issues.length > 0 || transitResult.inventory === undefined) {
      throw new Error(
        `expected out-of-scope transit-only branch to pass, got ${JSON.stringify(transitResult.issues)}`,
      );
    }
    const requiredTransitIds = requiredTargetObligations(
      transitResult.inventory,
    ).map((obligation) => obligation.obligationId);
    if (
      JSON.stringify(requiredTransitIds) !==
      JSON.stringify(["packages/fixture/fixture.mbt.qnt#step:doOne"])
    ) {
      throw new Error(
        `expected transit-only branch to be omitted from required target obligations, got ${JSON.stringify(requiredTransitIds)}`,
      );
    }
    fs.writeFileSync(
      scopePath,
      `${JSON.stringify({
        driverPath: "packages/fixture/fixture.mbt.qnt",
        branchFamilies: ["step"],
        defaultScope: { tag: "in-scope" },
        defaultReplay: { tag: "observable-from-step", stepAction: "step" },
        branchDecisions: [],
      })}\n`,
    );
    fs.writeFileSync(
      qntPath,
      [
        "module fixtureMbt {",
        "  var value: int",
        "  action init = all { value' = 0 }",
        "  action doOne = all { value' = 1 }",
        "  action step = any { doOne, doOne }",
        "}",
        "",
      ].join("\n"),
    );
    const duplicateResult = buildInventory({
      rootPath: fixtureRoot,
      scopePath,
    });
    if (
      !duplicateResult.issues.some((issue) =>
        issue.includes("duplicate branch actions doOne"),
      )
    ) {
      throw new Error(
        `expected duplicate branch action to fail, got ${JSON.stringify(duplicateResult.issues)}`,
      );
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
  console.log("cleanroom branch coverage self-test OK.");
}

function main() {
  if (selfTest) {
    runSelfTest();
    return;
  }
  const { inventory, issues } = buildInventory({
    rootPath: root,
    scopePath: branchScopePath,
  });
  if (issues.length > 0 || inventory === undefined) {
    console.error("cleanroom branch coverage source inventory FAILED:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  const scopeRows = readJsonl(root, branchScopePath).map((entry) => entry.row);

  const inventoryText = stableStringify(inventory);
  const inventorySha = sha256Text(inventoryText);
  let targetEvidenceSummary;
  if (targetReplayEvidencePath !== undefined) {
    const targetEvidence = readJson(path.resolve(targetReplayEvidencePath));
    targetEvidenceSummary = validateTargetReplayEvidence(
      targetEvidence,
      inventory,
      inventorySha,
    );
    if (targetEvidenceSummary.issues.length > 0) {
      console.error("cleanroom branch coverage target evidence FAILED:");
      for (const issue of targetEvidenceSummary.issues)
        console.error(`  - ${issue}`);
      process.exit(1);
    }
  }

  const report = renderReport({ inventory, targetEvidenceSummary });
  const scaffoldArtifacts = renderScaffoldQueueArtifacts(scopeRows);
  const compareIssues = [
    ...writeOrCompare(inventoryPath, inventoryText, write),
    ...writeOrCompare(reportPath, report, write),
    ...scaffoldArtifacts.flatMap((artifact) =>
      writeOrCompare(artifact.path, artifact.text, write),
    ),
  ];
  if (compareIssues.length > 0) {
    console.error("cleanroom branch coverage artifacts are stale:");
    for (const issue of compareIssues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(
    `cleanroom branch coverage passed (${inventory.branchObligations.length} obligations, ${inventory.sampledInputs.length} sampled inputs).`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildInventory,
  requiredTargetObligations,
  sha256Text,
  stableStringify,
  validateTargetReplayEvidence,
};
