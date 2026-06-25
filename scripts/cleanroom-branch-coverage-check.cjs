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
const reducerRouteInventoryPath = path.join(
  coverageRoot,
  "reducer-route-inventory.json",
);
const reportPath = path.join(coverageRoot, "REPORT.md");
const scaffoldTasksRoot = path.join(root, "plans/cleanroom-scaffolds/tasks");
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
const scaffoldLaneOrder = [
  "creation",
  "sheet",
  "handoff",
  "battle",
  "rules-core",
];
const baseScaffoldAssignments = [
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
const reducerRouteTags = new Set([
  "reducer-routed",
  "component-first",
  "substrate-first",
  "catalog-after-substrate",
  "replay-refresh-only",
  "source-qnt-corpus-blocker",
]);

const levelDenominatorBranchScopeTags = new Set([
  "in-denominator",
  "out-of-denominator",
  "source-qnt-corpus-blocker",
]);

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
  for (const field of [
    "expectedProjectionSha256",
    "observedProjectionSha256",
  ]) {
    if (
      typeof stateCheck[field] !== "string" ||
      !sha256Pattern.test(stateCheck[field])
    ) {
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
    throw new Error(
      `${driverPath}: branch-scope driverPath must start with packages/<package>/`,
    );
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

function reducerDiagnosticBatch(routeInventory) {
  if (
    !isRecord(routeInventory) ||
    !Array.isArray(routeInventory.diagnosticBatches)
  ) {
    return undefined;
  }
  return (
    routeInventory.diagnosticBatches.find(
      (batch) => batch.batchId === routeInventory.activeDiagnosticBatchId,
    ) ?? routeInventory.diagnosticBatches[0]
  );
}

function reducerDiagnosticAssignment(routeInventory) {
  const batch = reducerDiagnosticBatch(routeInventory);
  if (batch === undefined) return undefined;
  const queue = (batch.entries ?? []).map((entry) =>
    cleanroomDriverPath(entry.driverPath),
  );
  return {
    assignmentId: batch.assignmentId,
    customLanes: [
      {
        laneId: "battle",
        queue,
      },
    ],
  };
}

function scaffoldAssignmentsFor(routeInventory) {
  const reducerAssignment = reducerDiagnosticAssignment(routeInventory);
  return [
    ...(reducerAssignment === undefined ? [] : [reducerAssignment]),
    ...baseScaffoldAssignments,
  ];
}

function renderActiveWorkTemplate(scopeRows, routeInventory) {
  const queues = cleanroomQueueByLane(scopeRows);
  const activeWork = {
    schemaVersion: 1,
    assignments: scaffoldAssignmentsFor(routeInventory).map((assignment) => ({
      assignmentId: assignment.assignmentId,
      lanes:
        assignment.customLanes ??
        assignment.lanes.map((laneId) => ({
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
  ]
    .join("\n")
    .replace(/\n+$/, "\n\n");
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

function renderReducerDiagnosticQueueSection(routeInventory) {
  const batch = reducerDiagnosticBatch(routeInventory);
  if (batch === undefined) {
    return [
      "## Reducer-Spine Diagnostic Queue",
      "",
      "No reducer-spine diagnostic batch is configured.",
      "",
      "",
    ].join("\n");
  }
  return [
    "## Reducer-Spine Diagnostic Queue",
    "",
    "This queue is generated from `plans/cleanroom-branch-coverage/reducer-route-inventory.json`.",
    "It is a focused battle diagnostic assignment, not a replacement for the full level-1/2 queue.",
    "",
    `- Assignment: \`${batch.assignmentId}\``,
    `- Batch: \`${batch.batchId}\``,
    "",
    "| Order | Driver | Route | Acceptance condition |",
    "| --- | --- | --- | --- |",
    ...batch.entries.map(
      (entry) =>
        `| ${entry.order} | \`${cleanroomDriverPath(entry.driverPath)}\` | ${entry.route} | ${md(entry.acceptanceCondition)} |`,
    ),
    "",
    "",
  ].join("\n");
}

function replaceTopLevelSection(markdown, heading, replacement) {
  const start = markdown.indexOf(`## ${heading}\n`);
  if (start === -1) {
    throw new Error(
      `${repoPath(root, levelScopeSnapshotPath)} is missing section ${heading}.`,
    );
  }
  const next = markdown.indexOf("\n## ", start + 1);
  const end = next === -1 ? markdown.length : next + 1;
  return `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`;
}

function renderLevelScopeSnapshot(scopeRows, routeInventory) {
  const current = renderCurrentQueueSection(scopeRows);
  const reducerDiagnostic = renderReducerDiagnosticQueueSection(routeInventory);
  const future = renderFutureQueueSection(scopeRows);
  const existing = fs.readFileSync(levelScopeSnapshotPath, "utf8");
  return replaceTopLevelSection(
    replaceTopLevelSection(
      replaceTopLevelSection(
        existing,
        "Current Branch-Inventory-Ready Queue",
        current,
      ),
      "Reducer-Spine Diagnostic Queue",
      reducerDiagnostic,
    ),
    "Future Level 1-2 Queue",
    future,
  );
}

function renderScaffoldQueueArtifacts(scopeRows, routeInventory) {
  if (
    !fs.existsSync(activeWorkTemplatePath) ||
    !fs.existsSync(levelScopeSnapshotPath)
  ) {
    return [];
  }
  return [
    {
      path: activeWorkTemplatePath,
      text: renderActiveWorkTemplate(scopeRows, routeInventory),
    },
    {
      path: levelScopeSnapshotPath,
      text: renderLevelScopeSnapshot(scopeRows, routeInventory),
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
    if (
      typeof scope.reviewedBy !== "string" ||
      scope.reviewedBy.trim() === ""
    ) {
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
      issues.push(
        `${context}: observable-from-step replay requires stepAction.`,
      );
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
  issues.push(
    ...validateReplay(row.defaultReplay, `${context}: defaultReplay`),
  );
  if (
    row.defaultReplay?.tag === "transit-only" &&
    row.defaultScope?.tag !== "out-of-scope"
  ) {
    issues.push(
      `${context}: transit-only defaultReplay requires out-of-scope defaultScope.`,
    );
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
      issues.push(
        ...validateScope(decision.scope, `${decisionContext}: scope`),
      );
      issues.push(
        ...validateReplay(decision.replay, `${decisionContext}: replay`),
      );
      if (
        decision.replay?.tag === "transit-only" &&
        decision.scope?.tag !== "out-of-scope"
      ) {
        issues.push(
          `${decisionContext}: transit-only replay requires out-of-scope scope.`,
        );
      }
    }
  }
  return { row, issues };
}

function validateDerivability(value, context) {
  const issues = [];
  if (!isRecord(value)) {
    return [`${context}: derivability must be an object.`];
  }
  for (const field of ["qntFacts", "rawDomainFacts", "blockers"]) {
    if (!Array.isArray(value[field])) {
      issues.push(`${context}: derivability.${field} must be an array.`);
    }
  }
  return issues;
}

function componentBridgePathForConnector(connectorPath) {
  return path.join(
    "packages/battle-runtime/src",
    path.basename(connectorPath).replace(/\.qnt$/, ".test.ts"),
  );
}

function hasExecutableComponentConnectorEvidence(assignment) {
  if (
    !isRecord(assignment) ||
    assignment.route !== "component-first" ||
    typeof assignment.driverPath !== "string" ||
    assignment.driverPath.trim() === "" ||
    typeof assignment.componentConnectorPath !== "string" ||
    assignment.componentConnectorPath.trim() === "" ||
    !Array.isArray(assignment.componentOwners) ||
    assignment.componentOwners.length === 0 ||
    assignment.componentOwners.some(
      (owner) => typeof owner !== "string" || owner.trim() === "",
    )
  ) {
    return false;
  }
  const connectorPath = path.join(root, assignment.componentConnectorPath);
  const bridgePath = path.join(
    root,
    componentBridgePathForConnector(assignment.componentConnectorPath),
  );
  if (!fs.existsSync(connectorPath) || !fs.existsSync(bridgePath)) {
    return false;
  }
  const connectorText = fs.readFileSync(connectorPath, "utf8");
  const bridgeText = fs.readFileSync(bridgePath, "utf8");
  return (
    /\bvar\s+qComponentRoute\s*:\s*List\[RuleCoreComponentRouteEvent\]/.test(
      connectorText,
    ) &&
    /\bqComponentRoute'\s*=/.test(connectorText) &&
    /\bruleCoreComponentRoute\s*\(/.test(connectorText) &&
    /\bwithRuleCoreComponentRoute\s*\(/.test(bridgeText) &&
    /\bdecodeRuleCoreComponentRoute\s*\(/.test(bridgeText) &&
    /\bcomponentRoute\b/.test(bridgeText) &&
    assignment.componentOwners.every(
      (owner) => connectorText.includes(owner) && bridgeText.includes(`"${owner}"`),
    )
  );
}

function defaultRouteConnectorPath(driverPath) {
  if (typeof driverPath !== "string" || !driverPath.endsWith(".mbt.qnt")) {
    return undefined;
  }
  return driverPath.replace(/\.mbt\.qnt$/, ".route.mbt.qnt");
}

function repoFileExists(repoRelativePath) {
  return (
    typeof repoRelativePath === "string" &&
    repoRelativePath.trim() !== "" &&
    fs.existsSync(path.join(root, repoRelativePath))
  );
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function collectRouteConnectorPaths(row) {
  if (!isRecord(row)) return [];
  const found = new Set();
  if (nonEmptyString(row.routeConnectorPath)) {
    found.add(row.routeConnectorPath);
  }
  if (Array.isArray(row.routeConnectorPaths)) {
    for (const routeConnectorPath of row.routeConnectorPaths) {
      if (nonEmptyString(routeConnectorPath)) {
        found.add(routeConnectorPath);
      }
    }
  }
  return Array.from(found).sort();
}

function hasExplicitSourceBlocker(row) {
  return (
    isRecord(row?.derivability) &&
    Array.isArray(row.derivability.blockers) &&
    row.derivability.blockers.some(
      (blocker) => typeof blocker === "string" && blocker.trim() !== "",
    )
  );
}

function hasComponentConnectorAtPath(repoRelativePath) {
  if (!repoFileExists(repoRelativePath)) return false;
  const text = fs.readFileSync(path.join(root, repoRelativePath), "utf8");
  return (
    /\bvar\s+qComponentRoute\s*:\s*List\[RuleCoreComponentRouteEvent\]/.test(
      text,
    ) &&
    /\bqComponentRoute'\s*=/.test(text) &&
    /\bruleCoreComponentRoute\s*\(/.test(text)
  );
}

function routeRowHasPackageGateEvidence(row) {
  if (!isRecord(row) || typeof row.route !== "string") return false;
  if (hasExplicitSourceBlocker(row)) return true;
  if (row.route === "source-qnt-corpus-blocker") {
    return false;
  }
  if (row.route === "component-first") {
    const connectorPath =
      typeof row.componentConnectorPath === "string" &&
      row.componentConnectorPath.trim() !== ""
        ? row.componentConnectorPath
        : row.driverPath;
    return (
      hasExecutableComponentConnectorEvidence(row) ||
      hasComponentConnectorAtPath(connectorPath)
    );
  }
  if (row.route === "reducer-routed") {
    const connectorPaths = collectRouteConnectorPaths(row);
    return connectorPaths.length > 0
      ? connectorPaths.some(repoFileExists)
      : repoFileExists(defaultRouteConnectorPath(row.driverPath));
  }
  if (collectRouteConnectorPaths(row).some(repoFileExists)) return true;
  if (repoFileExists(row.componentConnectorPath)) return true;
  return false;
}

function validateFreshCleanroomPackageGate(denominator, context, issues) {
  const gate = denominator.freshCleanroomPackageGate;
  if (!isRecord(gate)) {
    issues.push(`${context}: freshCleanroomPackageGate must be an object.`);
    return;
  }
  for (const field of ["gateId", "acceptanceSlice"]) {
    if (field === "gateId") {
      if (typeof gate[field] !== "string" || gate[field].trim() === "") {
        issues.push(`${context}: freshCleanroomPackageGate.gateId must be a non-empty string.`);
      }
      continue;
    }
    if (
      !Array.isArray(gate[field]) ||
      gate[field].length === 0 ||
      gate[field].some((item) => typeof item !== "string" || item.trim() === "")
    ) {
      issues.push(`${context}: freshCleanroomPackageGate.${field} must be a non-empty string array.`);
    }
  }
  const requiredCopiedInputs = [
    "cleanroom-input/MANIFEST.md",
    "cleanroom-input/raw/srd-5.2.1/**",
    "cleanroom-input/qnt/**",
    "cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md",
    "cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md",
    "cleanroom-input/branch-coverage/source-branch-inventory.json",
    "cleanroom-input/branch-coverage/reducer-route-inventory.json",
    "cleanroom-input/guidance/**",
  ];
  if (!Array.isArray(gate.copiedInputs)) {
    issues.push(`${context}: freshCleanroomPackageGate.copiedInputs must be an array.`);
  } else {
    for (const required of requiredCopiedInputs) {
      if (!gate.copiedInputs.includes(required)) {
        issues.push(
          `${context}: freshCleanroomPackageGate.copiedInputs must include ${required}.`,
        );
      }
    }
  }
  if (!Array.isArray(gate.routeClassEvidence)) {
    issues.push(`${context}: freshCleanroomPackageGate.routeClassEvidence must be an array.`);
  } else {
    const coveredRoutes = new Set();
    for (const [index, entry] of gate.routeClassEvidence.entries()) {
      const entryContext = `${context}: freshCleanroomPackageGate.routeClassEvidence[${index}]`;
      if (!isRecord(entry)) {
        issues.push(`${entryContext}: entry must be an object.`);
        continue;
      }
      if (!reducerRouteTags.has(entry.route)) {
        issues.push(
          `${entryContext}: route must be one of ${Array.from(reducerRouteTags).join(", ")}.`,
        );
      } else {
        coveredRoutes.add(entry.route);
      }
      if (
        !Array.isArray(entry.acceptedEvidence) ||
        entry.acceptedEvidence.length === 0 ||
        entry.acceptedEvidence.some(
          (item) => typeof item !== "string" || item.trim() === "",
        )
      ) {
        issues.push(`${entryContext}: acceptedEvidence must be a non-empty string array.`);
      }
    }
    for (const route of reducerRouteTags) {
      if (!coveredRoutes.has(route)) {
        issues.push(
          `${context}: freshCleanroomPackageGate.routeClassEvidence is missing ${route}.`,
        );
      }
    }
  }
  if (!Array.isArray(denominator.driverRouteAssignments)) return;
  for (const [index, assignment] of denominator.driverRouteAssignments.entries()) {
    if (!routeRowHasPackageGateEvidence(assignment)) {
      issues.push(
        `${context}: driverRouteAssignments[${index}] ${assignment.driverPath ?? "<unknown>"} lacks fresh cleanroom package evidence.`,
      );
    }
  }
  if (!Array.isArray(denominator.branchDecisionClasses)) return;
  for (const [index, decision] of denominator.branchDecisionClasses.entries()) {
    if (!routeRowHasPackageGateEvidence(decision)) {
      issues.push(
        `${context}: branchDecisionClasses[${index}] ${decision.driverPath ?? "<unknown>"}#${decision.branchAction ?? "<unknown>"} lacks fresh cleanroom package evidence.`,
      );
    }
  }
}

function routeRowsForReplay(routeInventory) {
  if (!isRecord(routeInventory) || !Array.isArray(routeInventory.levelDenominators)) {
    return { branchRows: [], driverRows: [] };
  }
  return routeInventory.levelDenominators.reduce(
    (acc, denominator) => {
      if (!isRecord(denominator)) return acc;
      if (Array.isArray(denominator.branchDecisionClasses)) {
        acc.branchRows.push(...denominator.branchDecisionClasses.filter(isRecord));
      }
      if (Array.isArray(denominator.driverRouteAssignments)) {
        acc.driverRows.push(...denominator.driverRouteAssignments.filter(isRecord));
      }
      return acc;
    },
    { branchRows: [], driverRows: [] },
  );
}

function routeRowForReplay(routeInventory, run) {
  const { branchRows, driverRows } = routeRowsForReplay(routeInventory);
  return (
    branchRows.find(
      (row) =>
        row.driverPath === run.driverPath &&
        row.branchFamily === run.branchFamily &&
        row.branchAction === run.branchAction,
    ) ??
    driverRows.find((row) => row.driverPath === run.driverPath)
  );
}

function expectedReplayStateCheck(routeRow) {
  if (!isRecord(routeRow)) return undefined;
  if (routeRow.route === "component-first") {
    return {
      projection: "qComponentRoute",
      comparator: "component-route-event-list",
    };
  }
  if (routeRow.route === "reducer-routed") {
    return { projection: "qRoute", comparator: "route-event-list" };
  }
  if (
    typeof routeRow.componentConnectorPath === "string" &&
    routeRow.componentConnectorPath.trim() !== ""
  ) {
    return {
      projection: "qComponentRoute",
      comparator: "component-route-event-list",
    };
  }
  if (
    collectRouteConnectorPaths(routeRow).length > 0
  ) {
    return { projection: "qRoute", comparator: "route-event-list" };
  }
  return undefined;
}

function validateRouteReplayProjection(run, routeInventory, context, issues) {
  const expectedStateCheck = expectedReplayStateCheck(
    routeRowForReplay(routeInventory, run),
  );
  if (expectedStateCheck === undefined) return;
  if (run.stateCheck?.projection !== expectedStateCheck.projection) {
    issues.push(
      `${context}: ${run.driverPath} route evidence requires stateCheck.projection ${expectedStateCheck.projection}.`,
    );
  }
  if (run.stateCheck?.comparator !== expectedStateCheck.comparator) {
    issues.push(
      `${context}: ${run.driverPath} route evidence requires stateCheck.comparator ${expectedStateCheck.comparator}.`,
    );
  }
}

function validateLevelDenominator(denominator, context, inventory) {
  const issues = [];
  if (!isRecord(denominator)) {
    return [`${context}: denominator must be an object.`];
  }
  if (
    typeof denominator.denominatorId !== "string" ||
    denominator.denominatorId.trim() === ""
  ) {
    issues.push(`${context}: denominatorId must be a non-empty string.`);
  }
  if (!isRecord(denominator.sourceBranchInventory)) {
    issues.push(`${context}: sourceBranchInventory must be an object.`);
  } else if (inventory !== undefined) {
    const uniqueDrivers = new Set(
      inventory.branchObligations.map((obligation) => obligation.driverPath),
    );
    const expectedCounts = new Map([
      ["driverFiles", uniqueDrivers.size],
      ["branchObligations", inventory.branchObligations.length],
      [
        "currentInScopeBranchObligations",
        inventory.branchObligations.filter(
          (obligation) => obligation.scope.tag === "in-scope",
        ).length,
      ],
      [
        "currentOutOfScopeBranchObligations",
        inventory.branchObligations.filter(
          (obligation) => obligation.scope.tag === "out-of-scope",
        ).length,
      ],
      ["sampledInputs", inventory.sampledInputs.length],
    ]);
    for (const [field, expected] of expectedCounts.entries()) {
      if (denominator.sourceBranchInventory[field] !== expected) {
        issues.push(
          `${context}: sourceBranchInventory.${field} must be ${expected}.`,
        );
      }
    }
    const baselineWitnessDriverPaths = Array.isArray(
      denominator.baselineWitnessDriverPaths,
    )
      ? denominator.baselineWitnessDriverPaths
      : undefined;
    const alreadyReducerRoutedDriverPaths = Array.isArray(
      denominator.alreadyReducerRoutedDriverPaths,
    )
      ? denominator.alreadyReducerRoutedDriverPaths
      : undefined;
    if (baselineWitnessDriverPaths === undefined) {
      issues.push(`${context}: baselineWitnessDriverPaths must be an array.`);
    } else {
      if (
        denominator.sourceBranchInventory.baselineWitnessDriverFiles !==
        baselineWitnessDriverPaths.length
      ) {
        issues.push(
          `${context}: sourceBranchInventory.baselineWitnessDriverFiles must match baselineWitnessDriverPaths length.`,
        );
      }
      for (const driverPath of baselineWitnessDriverPaths) {
        if (!uniqueDrivers.has(driverPath)) {
          issues.push(
            `${context}: baselineWitnessDriverPaths contains unknown driver ${driverPath}.`,
          );
        }
      }
    }
    if (alreadyReducerRoutedDriverPaths === undefined) {
      issues.push(
        `${context}: alreadyReducerRoutedDriverPaths must be an array.`,
      );
    } else {
      if (
        denominator.sourceBranchInventory.alreadyReducerRoutedDriverFiles !==
        alreadyReducerRoutedDriverPaths.length
      ) {
        issues.push(
          `${context}: sourceBranchInventory.alreadyReducerRoutedDriverFiles must match alreadyReducerRoutedDriverPaths length.`,
        );
      }
      for (const driverPath of alreadyReducerRoutedDriverPaths) {
        if (!uniqueDrivers.has(driverPath)) {
          issues.push(
            `${context}: alreadyReducerRoutedDriverPaths contains unknown driver ${driverPath}.`,
          );
        }
      }
    }
    if (
      baselineWitnessDriverPaths !== undefined &&
      alreadyReducerRoutedDriverPaths !== undefined
    ) {
      const nonBaselineRemaining =
        uniqueDrivers.size -
        baselineWitnessDriverPaths.length -
        alreadyReducerRoutedDriverPaths.length;
      if (
        denominator.sourceBranchInventory.currentNonBaselineRemainingDriverFiles !==
        nonBaselineRemaining
      ) {
        issues.push(
          `${context}: sourceBranchInventory.currentNonBaselineRemainingDriverFiles must be ${nonBaselineRemaining}.`,
        );
      }
      const componentConnectedDrivers = new Set(
        Array.isArray(denominator.driverRouteAssignments)
          ? denominator.driverRouteAssignments
              .filter(
                (assignment) =>
                  hasExecutableComponentConnectorEvidence(assignment),
              )
              .map((assignment) => assignment.driverPath)
          : [],
      );
      const driversWithoutRouteOrComponentConnector =
        nonBaselineRemaining - componentConnectedDrivers.size;
      if (
        denominator.sourceBranchInventory
          .currentDriverFilesWithoutRouteOrComponentConnector !==
        driversWithoutRouteOrComponentConnector
      ) {
        issues.push(
          `${context}: sourceBranchInventory.currentDriverFilesWithoutRouteOrComponentConnector must be ${driversWithoutRouteOrComponentConnector}.`,
        );
      }
    }
  }
  if (!Array.isArray(denominator.driverRouteAssignments)) {
    issues.push(`${context}: driverRouteAssignments must be an array.`);
  } else if (inventory !== undefined) {
    const inventoryDrivers = new Set(
      inventory.branchObligations.map((obligation) => obligation.driverPath),
    );
    const assignedDrivers = new Set();
    for (const [
      index,
      assignment,
    ] of denominator.driverRouteAssignments.entries()) {
      const assignmentContext = `${context}: driverRouteAssignments[${index}]`;
      if (!isRecord(assignment)) {
        issues.push(`${assignmentContext}: assignment must be an object.`);
        continue;
      }
      if (
        typeof assignment.driverPath !== "string" ||
        assignment.driverPath.trim() === ""
      ) {
        issues.push(
          `${assignmentContext}: driverPath must be a non-empty string.`,
        );
      } else {
        if (!inventoryDrivers.has(assignment.driverPath)) {
          issues.push(
            `${assignmentContext}: driverPath is not in source inventory.`,
          );
        }
        if (assignedDrivers.has(assignment.driverPath)) {
          issues.push(
            `${assignmentContext}: duplicate driverPath ${assignment.driverPath}.`,
          );
        }
        assignedDrivers.add(assignment.driverPath);
      }
      if (!reducerRouteTags.has(assignment.route)) {
        issues.push(
          `${assignmentContext}: route must be one of ${Array.from(reducerRouteTags).join(", ")}.`,
        );
      }
      for (const field of ["routeTaskId", "subjectFamily"]) {
        if (
          typeof assignment[field] !== "string" ||
          assignment[field].trim() === ""
        ) {
          issues.push(
            `${assignmentContext}: ${field} must be a non-empty string.`,
          );
        }
      }
      issues.push(
        ...validateDerivability(assignment.derivability, assignmentContext),
      );
    }
    for (const driverPath of inventoryDrivers) {
      if (!assignedDrivers.has(driverPath)) {
        issues.push(
          `${context}: missing driverRouteAssignment for ${driverPath}.`,
        );
      }
    }
  }
  if (!Array.isArray(denominator.branchDecisionClasses)) {
    issues.push(`${context}: branchDecisionClasses must be an array.`);
  } else if (inventory !== undefined) {
    const outOfScopeBranches = new Set(
      inventory.branchObligations
        .filter((obligation) => obligation.scope.tag === "out-of-scope")
        .map(
          (obligation) =>
            `${obligation.driverPath}#${obligation.branchFamily}:${obligation.branchAction}`,
        ),
    );
    const classifiedBranches = new Set();
    for (const [
      index,
      decision,
    ] of denominator.branchDecisionClasses.entries()) {
      const decisionContext = `${context}: branchDecisionClasses[${index}]`;
      if (!isRecord(decision)) {
        issues.push(`${decisionContext}: branch decision must be an object.`);
        continue;
      }
      for (const field of ["driverPath", "branchFamily", "branchAction"]) {
        if (
          typeof decision[field] !== "string" ||
          decision[field].trim() === ""
        ) {
          issues.push(
            `${decisionContext}: ${field} must be a non-empty string.`,
          );
        }
      }
      const key = `${decision.driverPath}#${decision.branchFamily}:${decision.branchAction}`;
      if (!outOfScopeBranches.has(key)) {
        issues.push(
          `${decisionContext}: branch decision does not match a current out-of-scope branch.`,
        );
      }
      if (classifiedBranches.has(key)) {
        issues.push(`${decisionContext}: duplicate branch decision ${key}.`);
      }
      classifiedBranches.add(key);
      if (
        !levelDenominatorBranchScopeTags.has(decision.levelDenominatorScope)
      ) {
        issues.push(
          `${decisionContext}: levelDenominatorScope must be one of ${Array.from(levelDenominatorBranchScopeTags).join(", ")}.`,
        );
      }
      if (!reducerRouteTags.has(decision.route)) {
        issues.push(
          `${decisionContext}: route must be one of ${Array.from(reducerRouteTags).join(", ")}.`,
        );
      }
      if (
        typeof decision.routeTaskId !== "string" ||
        decision.routeTaskId.trim() === ""
      ) {
        issues.push(
          `${decisionContext}: routeTaskId must be a non-empty string.`,
        );
      }
      issues.push(
        ...validateDerivability(decision.derivability, decisionContext),
      );
    }
    for (const branchKey of outOfScopeBranches) {
      if (!classifiedBranches.has(branchKey)) {
        issues.push(
          `${context}: missing branchDecisionClass for ${branchKey}.`,
        );
      }
    }
    const branchDecisionCounts = new Map(
      Array.from(levelDenominatorBranchScopeTags).map((scope) => [scope, 0]),
    );
    for (const decision of denominator.branchDecisionClasses) {
      if (levelDenominatorBranchScopeTags.has(decision.levelDenominatorScope)) {
        branchDecisionCounts.set(
          decision.levelDenominatorScope,
          branchDecisionCounts.get(decision.levelDenominatorScope) + 1,
        );
      }
    }
    const expectedScopeCountFields = new Map([
      ["currentOutOfScopeBranchDecisionsInLevelDenominator", "in-denominator"],
      [
        "currentOutOfScopeBranchDecisionsOutsideLevelDenominator",
        "out-of-denominator",
      ],
      [
        "currentOutOfScopeBranchDecisionSourceBlockers",
        "source-qnt-corpus-blocker",
      ],
    ]);
    if (isRecord(denominator.sourceBranchInventory)) {
      for (const [field, scope] of expectedScopeCountFields.entries()) {
        const expected = branchDecisionCounts.get(scope);
        if (denominator.sourceBranchInventory[field] !== expected) {
          issues.push(
            `${context}: sourceBranchInventory.${field} must be ${expected}.`,
          );
        }
      }
    }
  }
  validateFreshCleanroomPackageGate(denominator, context, issues);
  return issues;
}

function validateReducerRouteInventory(routeInventory, scopeRows, inventory) {
  const issues = [];
  if (routeInventory === undefined) return issues;
  const context = repoPath(root, reducerRouteInventoryPath);
  const scopedDrivers = new Set(scopeRows.map((row) => row.driverPath));
  if (!isRecord(routeInventory)) {
    return [`${context}: route inventory must be an object.`];
  }
  if (routeInventory.schemaVersion !== 1) {
    issues.push(`${context}: schemaVersion must be 1.`);
  }
  if (
    !Array.isArray(routeInventory.routeTags) ||
    routeInventory.routeTags.length !== reducerRouteTags.size ||
    routeInventory.routeTags.some((tag) => !reducerRouteTags.has(tag))
  ) {
    issues.push(
      `${context}: routeTags must match ${Array.from(reducerRouteTags).join(", ")}.`,
    );
  }
  if (
    typeof routeInventory.activeDiagnosticBatchId !== "string" ||
    routeInventory.activeDiagnosticBatchId.trim() === ""
  ) {
    issues.push(
      `${context}: activeDiagnosticBatchId must be a non-empty string.`,
    );
  }
  if (!Array.isArray(routeInventory.diagnosticBatches)) {
    issues.push(`${context}: diagnosticBatches must be an array.`);
    return issues;
  }
  const batchIds = new Set();
  for (const [
    batchIndex,
    batch,
  ] of routeInventory.diagnosticBatches.entries()) {
    const batchContext = `${context}: diagnosticBatches[${batchIndex}]`;
    if (!isRecord(batch)) {
      issues.push(`${batchContext}: batch must be an object.`);
      continue;
    }
    for (const field of ["batchId", "assignmentId"]) {
      if (typeof batch[field] !== "string" || batch[field].trim() === "") {
        issues.push(`${batchContext}: ${field} must be a non-empty string.`);
      }
    }
    if (typeof batch.batchId === "string") {
      if (batchIds.has(batch.batchId)) {
        issues.push(`${batchContext}: duplicate batchId ${batch.batchId}.`);
      }
      batchIds.add(batch.batchId);
    }
    if (!Array.isArray(batch.entries) || batch.entries.length === 0) {
      issues.push(`${batchContext}: entries must be a non-empty array.`);
      continue;
    }
    const seenOrders = new Set();
    const seenDrivers = new Set();
    for (const [entryIndex, entry] of batch.entries.entries()) {
      const entryContext = `${batchContext}: entries[${entryIndex}]`;
      if (!isRecord(entry)) {
        issues.push(`${entryContext}: entry must be an object.`);
        continue;
      }
      if (!Number.isInteger(entry.order) || entry.order < 1) {
        issues.push(`${entryContext}: order must be a positive integer.`);
      } else if (entry.order !== entryIndex + 1) {
        issues.push(`${entryContext}: order must match entry position.`);
      } else if (seenOrders.has(entry.order)) {
        issues.push(`${entryContext}: duplicate order ${entry.order}.`);
      } else {
        seenOrders.add(entry.order);
      }
      if (
        typeof entry.driverPath !== "string" ||
        entry.driverPath.trim() === ""
      ) {
        issues.push(`${entryContext}: driverPath must be a non-empty string.`);
      } else {
        if (!scopedDrivers.has(entry.driverPath)) {
          issues.push(
            `${entryContext}: driverPath is not in branch-scope.jsonl.`,
          );
        }
        if (seenDrivers.has(entry.driverPath)) {
          issues.push(
            `${entryContext}: duplicate driverPath ${entry.driverPath}.`,
          );
        }
        seenDrivers.add(entry.driverPath);
      }
      if (!reducerRouteTags.has(entry.route)) {
        issues.push(
          `${entryContext}: route must be one of ${Array.from(reducerRouteTags).join(", ")}.`,
        );
      }
      for (const field of ["subjectFamily", "acceptanceCondition"]) {
        if (typeof entry[field] !== "string" || entry[field].trim() === "") {
          issues.push(`${entryContext}: ${field} must be a non-empty string.`);
        }
      }
      issues.push(...validateDerivability(entry.derivability, entryContext));
    }
  }
  if (
    typeof routeInventory.activeDiagnosticBatchId === "string" &&
    !batchIds.has(routeInventory.activeDiagnosticBatchId)
  ) {
    issues.push(
      `${context}: activeDiagnosticBatchId ${routeInventory.activeDiagnosticBatchId} is not a diagnostic batch.`,
    );
  }
  if (routeInventory.levelDenominators !== undefined) {
    if (!Array.isArray(routeInventory.levelDenominators)) {
      issues.push(`${context}: levelDenominators must be an array.`);
    } else {
      for (const [
        denominatorIndex,
        denominator,
      ] of routeInventory.levelDenominators.entries()) {
        issues.push(
          ...validateLevelDenominator(
            denominator,
            `${context}: levelDenominators[${denominatorIndex}]`,
            inventory,
          ),
        );
      }
    }
  }
  return issues;
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
  const routeInventory = options.routeInventory;
  const issues = [];
  if (!isRecord(evidence)) {
    return {
      issues: ["target replay evidence must be an object."],
      covered: [],
    };
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
    const expectedPickNames =
      sampledInputsByObligation.get(obligationId) ?? new Set();
    if (expectedPickNames.size > 0 && !Array.isArray(run.sampledInputs)) {
      issues.push(
        `${context}: sampledInputs array is required for sampled QNT inputs.`,
      );
    } else if (Array.isArray(run.sampledInputs)) {
      const observedPickNames = new Set();
      for (const [inputIndex, input] of run.sampledInputs.entries()) {
        const inputContext = `${context}: sampledInputs[${inputIndex}]`;
        if (!isRecord(input)) {
          issues.push(`${inputContext}: sampled input must be an object.`);
          continue;
        }
        if (
          typeof input.pickName !== "string" ||
          input.pickName.trim() === ""
        ) {
          issues.push(`${inputContext}: pickName must be a non-empty string.`);
        } else {
          if (observedPickNames.has(input.pickName)) {
            issues.push(
              `${inputContext}: duplicate sampled input ${input.pickName}.`,
            );
          }
          observedPickNames.add(input.pickName);
          if (!expectedPickNames.has(input.pickName)) {
            issues.push(
              `${inputContext}: unknown sampled input ${input.pickName}.`,
            );
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
      validateRouteReplayProjection(run, routeInventory, context, issues);
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
      throw new Error(
        `expected fixture inventory to pass: ${issues.join("; ")}`,
      );
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
    const routeInventory = {
      schemaVersion: 1,
      activeDiagnosticBatchId: "fixture-route",
      routeTags: Array.from(reducerRouteTags),
      diagnosticBatches: [
        {
          batchId: "fixture-route",
          assignmentId: "fixture-assignment",
          entries: [
            {
              order: 1,
              driverPath: "packages/fixture/fixture.mbt.qnt",
              route: "reducer-routed",
              subjectFamily: "fixture subject",
              acceptanceCondition: "fixture acceptance",
              derivability: {
                qntFacts: [],
                rawDomainFacts: [],
                blockers: [],
              },
            },
          ],
        },
      ],
    };
    const routeIssues = validateReducerRouteInventory(routeInventory, [
      { driverPath: "packages/fixture/fixture.mbt.qnt" },
    ]);
    if (routeIssues.length > 0) {
      throw new Error(
        `expected route inventory to pass: ${JSON.stringify(routeIssues)}`,
      );
    }
    const badRouteTags = stable(routeInventory);
    badRouteTags.routeTags = ["reducer-routed"];
    const badRouteTagsIssues = validateReducerRouteInventory(badRouteTags, [
      { driverPath: "packages/fixture/fixture.mbt.qnt" },
    ]);
    if (
      !badRouteTagsIssues.some((issue) =>
        issue.includes("routeTags must match"),
      )
    ) {
      throw new Error(
        `expected routeTags mismatch to fail, got ${JSON.stringify(badRouteTagsIssues)}`,
      );
    }
    const badRouteOrder = stable(routeInventory);
    badRouteOrder.diagnosticBatches[0].entries[0].order = 2;
    const badRouteOrderIssues = validateReducerRouteInventory(badRouteOrder, [
      { driverPath: "packages/fixture/fixture.mbt.qnt" },
    ]);
    if (
      !badRouteOrderIssues.some((issue) =>
        issue.includes("order must match entry position"),
      )
    ) {
      throw new Error(
        `expected route order mismatch to fail, got ${JSON.stringify(badRouteOrderIssues)}`,
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
    const routeProjectionInventory = {
      levelDenominators: [
        {
          driverRouteAssignments: [
            {
              driverPath: "packages/fixture/fixture.mbt.qnt",
              route: "reducer-routed",
            },
          ],
          branchDecisionClasses: [],
        },
      ],
    };
    const routeProjectionEvidence = stable(targetEvidence);
    for (const run of routeProjectionEvidence.runs) {
      run.stateCheck.projection = "qRoute";
      run.stateCheck.comparator = "route-event-list";
    }
    const routeProjectionResult = validateTargetReplayEvidence(
      routeProjectionEvidence,
      inventory,
      inventorySha,
      { routeInventory: routeProjectionInventory },
    );
    if (routeProjectionResult.issues.length > 0) {
      throw new Error(
        `expected route projection evidence to pass: ${routeProjectionResult.issues.join("; ")}`,
      );
    }
    const badRouteProjectionEvidence = stable(routeProjectionEvidence);
    badRouteProjectionEvidence.runs[0].stateCheck.projection = "driver-local";
    const badRouteProjectionResult = validateTargetReplayEvidence(
      badRouteProjectionEvidence,
      inventory,
      inventorySha,
      { routeInventory: routeProjectionInventory },
    );
    if (
      !badRouteProjectionResult.issues.some((issue) =>
        issue.includes("requires stateCheck.projection qRoute"),
      )
    ) {
      throw new Error(
        `expected driver-local route projection to fail, got ${JSON.stringify(badRouteProjectionResult.issues)}`,
      );
    }
    const badRouteComparatorEvidence = stable(routeProjectionEvidence);
    badRouteComparatorEvidence.runs[0].stateCheck.comparator =
      "component-route-event-list";
    const badRouteComparatorResult = validateTargetReplayEvidence(
      badRouteComparatorEvidence,
      inventory,
      inventorySha,
      { routeInventory: routeProjectionInventory },
    );
    if (
      !badRouteComparatorResult.issues.some((issue) =>
        issue.includes("requires stateCheck.comparator route-event-list"),
      )
    ) {
      throw new Error(
        `expected component comparator on reducer route evidence to fail, got ${JSON.stringify(badRouteComparatorResult.issues)}`,
      );
    }
    const componentProjectionInventory = {
      levelDenominators: [
        {
          driverRouteAssignments: [
            {
              driverPath: "packages/fixture/fixture.mbt.qnt",
              route: "component-first",
            },
          ],
          branchDecisionClasses: [],
        },
      ],
    };
    const componentProjectionEvidence = stable(targetEvidence);
    for (const run of componentProjectionEvidence.runs) {
      run.stateCheck.projection = "qComponentRoute";
      run.stateCheck.comparator = "component-route-event-list";
    }
    const componentProjectionResult = validateTargetReplayEvidence(
      componentProjectionEvidence,
      inventory,
      inventorySha,
      { routeInventory: componentProjectionInventory },
    );
    if (componentProjectionResult.issues.length > 0) {
      throw new Error(
        `expected component route projection evidence to pass: ${componentProjectionResult.issues.join("; ")}`,
      );
    }
    const badComponentComparatorEvidence = stable(componentProjectionEvidence);
    badComponentComparatorEvidence.runs[0].stateCheck.comparator =
      "route-event-list";
    const badComponentComparatorResult = validateTargetReplayEvidence(
      badComponentComparatorEvidence,
      inventory,
      inventorySha,
      { routeInventory: componentProjectionInventory },
    );
    if (
      !badComponentComparatorResult.issues.some((issue) =>
        issue.includes(
          "requires stateCheck.comparator component-route-event-list",
        ),
      )
    ) {
      throw new Error(
        `expected reducer comparator on component route evidence to fail, got ${JSON.stringify(badComponentComparatorResult.issues)}`,
      );
    }
    const pluralOnlyRouteConnectorRow = {
      driverPath: "packages/fixture/fixture.mbt.qnt",
      route: "catalog-after-substrate",
      routeConnectorPaths: [
        "packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt",
      ],
      derivability: {
        qntFacts: ["fixture prose intentionally omits the route connector path."],
        rawDomainFacts: [],
        blockers: [],
      },
    };
    if (!routeRowHasPackageGateEvidence(pluralOnlyRouteConnectorRow)) {
      throw new Error(
        "expected plural routeConnectorPaths to satisfy package gate evidence",
      );
    }
    const pluralRouteProjectionInventory = {
      levelDenominators: [
        {
          driverRouteAssignments: [pluralOnlyRouteConnectorRow],
          branchDecisionClasses: [],
        },
      ],
    };
    const pluralRouteProjectionResult = validateTargetReplayEvidence(
      routeProjectionEvidence,
      inventory,
      inventorySha,
      { routeInventory: pluralRouteProjectionInventory },
    );
    if (pluralRouteProjectionResult.issues.length > 0) {
      throw new Error(
        `expected plural routeConnectorPaths replay evidence to pass: ${pluralRouteProjectionResult.issues.join("; ")}`,
      );
    }
    const cleanroomPathRouteInventory = {
      levelDenominators: [
        {
          driverRouteAssignments: [
            {
              driverPath: "packages/fixture/fixture.mbt.qnt",
              route: "catalog-after-substrate",
              derivability: {
                qntFacts: [
                  "cleanroom-input/qnt/fixture/fixture.route.mbt.qnt exposes qRoute.",
                ],
              },
            },
          ],
          branchDecisionClasses: [],
        },
      ],
    };
    const cleanroomPathProjectionResult = validateTargetReplayEvidence(
      routeProjectionEvidence,
      inventory,
      inventorySha,
      { routeInventory: cleanroomPathRouteInventory },
    );
    if (cleanroomPathProjectionResult.issues.length > 0) {
      throw new Error(
        `expected cleanroom-input route derivability evidence to pass: ${cleanroomPathProjectionResult.issues.join("; ")}`,
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
        issue.includes(
          "expectedProjectionSha256 and observedProjectionSha256 must match",
        ),
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
    if (
      transitResult.issues.length > 0 ||
      transitResult.inventory === undefined
    ) {
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
  const reducerRouteInventory = fs.existsSync(reducerRouteInventoryPath)
    ? readJson(reducerRouteInventoryPath)
    : undefined;
  const routeIssues = validateReducerRouteInventory(
    reducerRouteInventory,
    scopeRows,
    inventory,
  );
  if (routeIssues.length > 0) {
    console.error("cleanroom reducer route inventory FAILED:");
    for (const issue of routeIssues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  const inventoryText = stableStringify(inventory);
  const inventorySha = sha256Text(inventoryText);
  let targetEvidenceSummary;
  if (targetReplayEvidencePath !== undefined) {
    const targetEvidence = readJson(path.resolve(targetReplayEvidencePath));
    targetEvidenceSummary = validateTargetReplayEvidence(
      targetEvidence,
      inventory,
      inventorySha,
      { routeInventory: reducerRouteInventory },
    );
    if (targetEvidenceSummary.issues.length > 0) {
      console.error("cleanroom branch coverage target evidence FAILED:");
      for (const issue of targetEvidenceSummary.issues)
        console.error(`  - ${issue}`);
      process.exit(1);
    }
  }

  const report = renderReport({ inventory, targetEvidenceSummary });
  const scaffoldArtifacts = renderScaffoldQueueArtifacts(
    scopeRows,
    reducerRouteInventory,
  );
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
