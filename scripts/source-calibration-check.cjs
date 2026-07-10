#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const checkerPath = "scripts/source-calibration-check.cjs";
const scopeArgumentIndex = process.argv.indexOf("--scope");
if (scopeArgumentIndex === -1 || process.argv[scopeArgumentIndex + 1] === undefined) {
  throw new Error("source calibration requires --scope <scope.json>");
}
const scopePath = path.resolve(repoRoot, process.argv[scopeArgumentIndex + 1]);
const scope = JSON.parse(fs.readFileSync(scopePath, "utf8"));
const scopeRelativePath = path.relative(repoRoot, scopePath);
const artifactPath = scope.cleanroom.artifactPath;
const artifactDir = path.dirname(repoFile(artifactPath));
const indexPath = repoFile(artifactPath);
const unitId = scope.unitId;
const profileId = scope.profileId;
const taskId = scope.taskId;
const driverPath = scope.driverPath;
const harnessPath = scope.harnessPath;
const witnessPath = scope.witnessPath;
const rawPath = scope.rawPath;
const rawHeading = scope.rawHeading;
const languagePath = scope.languagePath;
const surfacePath = scope.surfacePath;
const ownerRolesPath = scope.ownerRolesPath;
const obligationsPath = scope.obligationsPath;
const profileObligationsPath = scope.profileObligationsPath;
const ownerApplicability = scope.ownerApplicability;
const semanticObligations = scope.semanticObligations;
const productionEntrypointPath = scope.production.entrypointPath;
const productionEntrypoint = scope.production.entrypoint;
const productionProjectionPath = scope.production.projectionPath;
const productionProjection = scope.production.projection;
const profileResolver = scope.production.profileResolver;
const discoveryObject = scope.discoveryObject;
const verificationCommand = scope.verification.command;
const verificationArgs = scope.verification.args;
const outputMarkers = scope.verification.outputMarkers;
const requiredRawTerms = scope.rawTerms;
const requiredLanguageHeadings = scope.languageHeadings;
const requiredLanguageTerms = scope.languageTerms;
const requiredLanguageGlobalTerms = scope.languageGlobalTerms ?? [];
const surfaceExpectations = scope.surface;
const familyExpectations = scope.familyDecisions;
const qntObservationPrefix = "SOURCE_CALIBRATION_QNT_OBSERVED";

function repoFile(relativePath) {
  return path.join(repoRoot, relativePath);
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(repoFile(relativePath)))
    .digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function contentSha256(index) {
  const { contentSha256: _ignored, ...content } = index;
  return crypto
    .createHash("sha256")
    .update(`${JSON.stringify(stable(content))}\n`)
    .digest("hex");
}

function readJsonl(relativePath) {
  return fs
    .readFileSync(repoFile(relativePath), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

function qntActions(relativePath) {
  const source = fs.readFileSync(repoFile(relativePath), "utf8");
  const step = source.match(/action\s+step\s*=\s*any\s*\{([\s\S]*?)\n\s*\}/);
  if (!step) return [];
  return Array.from(
    step[1].matchAll(/\b(do[A-Z][A-Za-z0-9_]*)\s*,?/g),
    (match) => match[1],
  );
}

function qntDeterministicReplayActions(relativePath, selectedStepActions = []) {
  const source = fs.readFileSync(repoFile(relativePath), "utf8");
  const selectedStepActionSet = new Set(selectedStepActions);
  return Object.fromEntries(
    Array.from(
      source.matchAll(
        /action\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*any\s*\{\s*([A-Za-z][A-Za-z0-9_]*)\s*,/g,
      ),
      (match) => [match[1], match[2]],
    ).filter(([stepAction]) => selectedStepActionSet.size === 0 || selectedStepActionSet.has(stepAction)),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function typeScriptScopedActions() {
  const source = fs.readFileSync(repoFile(harnessPath), "utf8");
  const identityReplayMarker = ["UNIT-IDENTITY", "REPLAY"].join("-");
  const marker = source.match(
    new RegExp(
      `^// ${identityReplayMarker}: ${escapeRegExp(taskId)} ${escapeRegExp(unitId)} (.+)$`,
      "m",
    ),
  );
  const unitBlock = source.match(
    new RegExp(
      `unitId:\\s*"${escapeRegExp(unitId)}"([\\s\\S]*?)(?=\\n\\s*\\},\\n\\s*\\{\\n\\s*taskId:|\\n\\s*\\],\\n\\s*as const)`,
    ),
  );
  const discoveryBlock = source.match(
    new RegExp(
      `const ${escapeRegExp(discoveryObject)}\\s*=\\s*\\{([\\s\\S]*?)\\n\\} as const satisfies`,
    ),
  );
  const qntStepBlock = source.match(/qntStepActions:\s*\[([\s\S]*?)\]/);
  const specFileName = source.match(
    /specFile:\s*mbtSpecPath\(\s*import\.meta\.dirname,\s*"([^"]+)"\s*,?\s*\)/,
  )?.[1];
  const markerActions = marker ? marker[1].trim().split(/\s+/) : [];
  const unitActions = unitBlock
    ? Array.from(
        unitBlock[1].matchAll(/"(do[A-Z][A-Za-z0-9_]*)"/g),
        (match) => match[1],
      )
    : [];
  const discoveryActions = discoveryBlock
    ? Array.from(
        discoveryBlock[1].matchAll(/\b(do[A-Z][A-Za-z0-9_]*)\s*:/g),
        (match) => match[1],
      )
    : [];
  const qntStepActions = qntStepBlock
    ? Array.from(
        qntStepBlock[1].matchAll(
          /stepAction:\s*"([A-Za-z][A-Za-z0-9_]*)"\s*,\s*observedAction:\s*"([A-Za-z][A-Za-z0-9_]*)"/g,
        ),
        (match) => ({ stepAction: match[1], observedAction: match[2] }),
      )
    : [];
  return {
    source,
    specFileName,
    markerActions,
    unitActions: Array.from(new Set(unitActions)),
    discoveryActions: Array.from(new Set(discoveryActions)),
    qntStepActions: Array.from(new Set(qntStepActions)),
  };
}

function selectedActionsFromHarness(actions = typeScriptScopedActions()) {
  return Array.from(
    new Set(actions.qntStepActions.map((entry) => entry.observedAction)),
  );
}

function harnessDeclaredDriverPath(actions = typeScriptScopedActions()) {
  if (actions.specFileName === undefined) return undefined;
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(harnessPath), "..", actions.specFileName),
  );
}

function jsonSha256(value) {
  return crypto
    .createHash("sha256")
    .update(`${JSON.stringify(stable(value))}\n`)
    .digest("hex");
}

function deterministicVerificationReceipt(evidence) {
  if (evidence === undefined) return undefined;
  const {
    stdoutSha256: _stdout,
    stderrSha256: _stderr,
    combinedOutputSha256: _combined,
    ...receipt
  } = evidence;
  return receipt;
}

function verificationReceiptSha256(evidence) {
  return jsonSha256(deterministicVerificationReceipt(evidence));
}

function runVerification() {
  const result = spawnSync("pnpm", verificationArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combinedOutput = `${stdout}${stderr}`;
  const ts = typeScriptScopedActions();
  const observedPairs = Array.from(
    combinedOutput.matchAll(
      new RegExp(`${qntObservationPrefix}:([A-Za-z0-9_]+):([A-Za-z0-9_]+)`, "g"),
    ),
    (match) => ({ stepAction: match[1], observedAction: match[2] }),
  );
  const deterministicStepOrder = new Map(
    ts.qntStepActions.map((entry, index) => [entry.stepAction, index]),
  );
  const branchObservations = Array.from(
    new Map(
      observedPairs
        .filter((observation) => deterministicStepOrder.has(observation.stepAction))
        .map((observation) => [JSON.stringify(observation), observation]),
    ).values(),
  ).sort(
    (left, right) =>
      (deterministicStepOrder.get(left.stepAction) ?? Number.MAX_SAFE_INTEGER) -
      (deterministicStepOrder.get(right.stepAction) ?? Number.MAX_SAFE_INTEGER),
  );
  return {
    schema: "source-calibration-verification.v1",
    generatedBy: "scripts/source-calibration-check.cjs",
    command: verificationCommand,
    exitCode: result.status ?? 1,
    qntFileSha256: sha256File(driverPath),
    harnessSha256: sha256File(harnessPath),
    observationMode: "deterministic-qnt-step-action",
    branchActions: branchObservations.map((observation) => observation.observedAction),
    branchObservations,
    branchObservationEvidenceSha256: jsonSha256({ branchObservations }),
    outputMarkers,
    outputEvidenceSha256: jsonSha256({ outputMarkers }),
    result:
      result.status === 0 &&
      JSON.stringify(branchObservations) === JSON.stringify(ts.qntStepActions) &&
      outputMarkers.every((marker) => combinedOutput.includes(marker))
        ? "passed"
        : "failed",
  };
}

function successfulVerificationFixture() {
  return {
    schema: "source-calibration-verification.v1",
    generatedBy: "scripts/source-calibration-check.cjs",
    command: verificationCommand,
    exitCode: 0,
    qntFileSha256: sha256File(driverPath),
    harnessSha256: sha256File(harnessPath),
    branchActions: selectedActionsFromHarness(),
    branchObservations: typeScriptScopedActions().qntStepActions,
    branchObservationEvidenceSha256: jsonSha256({
      branchObservations: typeScriptScopedActions().qntStepActions,
    }),
    observationMode: "deterministic-qnt-step-action",
    outputMarkers,
    outputEvidenceSha256: jsonSha256({ outputMarkers }),
    result: "passed",
  };
}

function surfaceFacts() {
  const raw = fs.readFileSync(repoFile(rawPath), "utf8");
  const language = fs.readFileSync(repoFile(languagePath), "utf8");
  const surface = JSON.parse(fs.readFileSync(repoFile(surfacePath), "utf8"));
  const rawHeadingPattern = new RegExp(`^## ${escapeRegExp(rawHeading)}$`, "m");
  const rawHeadingStart = raw.indexOf(`## ${rawHeading}`);
  const nextHeading = raw.indexOf("\n## ", rawHeadingStart + rawHeading.length + 3);
  const rawSection = rawHeadingStart === -1
    ? ""
    : raw.slice(rawHeadingStart, nextHeading === -1 ? raw.length : nextHeading);
  const languageHeadings = new Set(
    Array.from(language.matchAll(/^## (.+)$/gm), (match) => match[1]),
  );
  const spellcastingStart = language.indexOf("## Spellcasting");
  const spellcastingNextHeading = language.indexOf("\n## ", spellcastingStart + "## Spellcasting".length);
  const languageSpellcastingSection = spellcastingStart === -1
    ? ""
    : language.slice(
        spellcastingStart,
        spellcastingNextHeading === -1 ? language.length : spellcastingNextHeading,
      );
  const phases = surface.mechanics?.phases ?? [];
  const attackPhase = phases.find((phase) => phase.kind === "attack_roll");
  const savePhase = phases.find((phase) => phase.kind === "save_gate");
  return {
    raw,
    language,
    rawHeading: rawHeadingPattern.test(raw),
    rawSection,
    languageHeadings,
    languageSpellcastingSection,
    surface,
    attackPhase,
    savePhase,
    isAction: surface.mechanics?.castingTime?.kind === surfaceExpectations.castingTimeKind,
    isInstantaneous: surface.mechanics?.duration?.kind === surfaceExpectations.durationKind,
  };
}

function valueAtPath(root, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], root);
}

function sourceMetadata() {
  const qntOwnerRoles = new Map(
    readJsonl(ownerRolesPath).map((row) => [row.ownerPath, row.role]),
  );
  const obligations = new Map(
    readJsonl(obligationsPath).map((row) => [row.id, row]),
  );
  const profileObligations = new Map(
    readJsonl(profileObligationsPath).map((row) => [row.profileId, row.obligationIds]),
  );
  return { qntOwnerRoles, obligations, profileObligations };
}

function registeredFocusedParityWitness(obligation) {
  return obligation.parityWitnesses?.find(
    (witness) =>
      witness.kind === "focused-mbt" &&
      witness.stepAction === "step" &&
      typeof witness.ownerPath === "string" &&
      typeof witness.qntSpecPath === "string",
  );
}

function buildIndex(verificationEvidence) {
  const { qntOwnerRoles, obligations, profileObligations } = sourceMetadata();
  const ownersByObligation = new Map();
  const parityWitnessesByObligation = new Map();
  const runtimeOwnerPaths = new Set();
  const parityWitnessSourcePaths = new Set();
  for (const id of semanticObligations) {
    const obligation = obligations.get(id);
    if (!obligation) throw new Error(`Missing registered obligation ${id}.`);
    const unclassifiedOwners = obligation.qntOwners.filter(
      (ownerPath) => ownerApplicability[ownerPath] === undefined,
    );
    if (unclassifiedOwners.length > 0) {
      throw new Error(
        `Missing scoped QNT owner classification for ${id}: ${unclassifiedOwners.join(", ")}.`,
      );
    }
    ownersByObligation.set(
      id,
      obligation.qntOwners.map((ownerPath) => ({
        path: ownerPath,
        role: qntOwnerRoles.get(ownerPath),
        applicability: ownerApplicability[ownerPath],
        sha256: sha256File(ownerPath),
      })),
    );
    for (const ownerPath of obligation.runtimeOwners) runtimeOwnerPaths.add(ownerPath);
    const parityWitness = registeredFocusedParityWitness(obligation);
    if (parityWitness === undefined) {
      throw new Error(`Missing registered focused parity witness for ${id}.`);
    }
    parityWitnessesByObligation.set(id, parityWitness);
    parityWitnessSourcePaths.add(parityWitness.ownerPath);
    parityWitnessSourcePaths.add(parityWitness.qntSpecPath);
  }
  const ts = typeScriptScopedActions();
  const selectedActions = selectedActionsFromHarness(ts);
  const qntActionNames = qntActions(driverPath);
  const deterministicReplayActions = qntDeterministicReplayActions(
    driverPath,
    ts.qntStepActions.map((entry) => entry.stepAction),
  );
  const branchCalibrations = selectedActions.map((branchAction) => ({
    branchId: `${driverPath}#step:${branchAction}`,
    driverPath,
    qntFileSha256: sha256File(driverPath),
    branchFamily: "step",
    branchAction,
    qntReplay: {
      stepAction: ts.qntStepActions.find(
        (entry) => entry.observedAction === branchAction,
      )?.stepAction,
      actionTaken: branchAction,
      observationMode: "deterministic-qnt-step-action",
    },
    calibratedObligationIds: [...semanticObligations],
    productionTypeScript: {
      harnessPath,
      harnessEntrypoint: `${discoveryObject}.${branchAction}`,
      productionEntrypointPath,
      productionEntrypoint,
      productionEntrypointSha256: sha256File(productionEntrypointPath),
      productionProjectionPath,
      productionProjection,
      productionProjectionSha256: sha256File(productionProjectionPath),
      productionDispatchEvidence: {
        mode: "registered-production-dispatch-chain",
        harnessDiscovery: "discoverBattleActs",
        resolverSubject: "resolveBattleSubject",
        profileResolver,
        entrypoint: productionEntrypoint,
        projection: productionProjection,
      },
    },
    verificationEvidenceSha256: verificationReceiptSha256(verificationEvidence),
  }));
  const obligationCalibrations = semanticObligations.map((id) => {
    const obligation = obligations.get(id);
    return {
      obligationId: id,
      profileId,
      qntOwners: ownersByObligation.get(id),
      productionTypeScriptOwners: obligation.runtimeOwners,
      productionTypeScriptOwnerEvidence: obligation.runtimeOwners.map((ownerPath) => ({
        path: ownerPath,
        sha256: sha256File(ownerPath),
      })),
      parityWitness: parityWitnessesByObligation.get(id),
      calibrationResult: "exact-current-executable",
    };
  });
  const index = {
    schema: "source-calibration-index.v1",
    generatedBy: "scripts/source-calibration-check.cjs",
    scope: {
      unitId,
      profileId,
      surfaceRecordPath: surfacePath,
      rawAnchor: `${rawPath}#${rawHeading}`,
      ubiquitousLanguageAnchors: requiredLanguageHeadings.map(
        (heading) => `${languagePath}#${heading}`,
      ),
      ubiquitousLanguageTerms: [...requiredLanguageTerms],
      ubiquitousLanguageGlobalTerms: [...requiredLanguageGlobalTerms],
    },
    sourceHashes: {
      [rawPath]: sha256File(rawPath),
      [languagePath]: sha256File(languagePath),
      [surfacePath]: sha256File(surfacePath),
      [driverPath]: sha256File(driverPath),
      [harnessPath]: sha256File(harnessPath),
      [witnessPath]: sha256File(witnessPath),
      [ownerRolesPath]: sha256File(ownerRolesPath),
      [obligationsPath]: sha256File(obligationsPath),
      [profileObligationsPath]: sha256File(profileObligationsPath),
      [checkerPath]: sha256File(checkerPath),
      [scopeRelativePath]: sha256File(scopeRelativePath),
      ...Object.fromEntries(
        [
          ...runtimeOwnerPaths,
          ...parityWitnessSourcePaths,
          productionEntrypointPath,
          productionProjectionPath,
        ].map((sourcePath) => [sourcePath, sha256File(sourcePath)]),
      ),
    },
    supportedProfileObligationIds: profileObligations.get(profileId),
    qntBranchDiscovery: {
      driverPath,
      branchFamily: "step",
      discoveredActions: qntActionNames,
      selectedActions,
      deterministicReplayActions,
    },
    typescriptBranchDiscovery: {
      harnessPath,
      markerActions: ts.markerActions,
      executableUnitActions: ts.unitActions,
      executableDiscoveryActions: ts.discoveryActions,
      qntStepActions: ts.qntStepActions,
    },
    verificationEvidence,
    obligationCalibrations,
    branchCalibrations,
    obligationFamilyDecisions: Object.entries(familyExpectations).map(
      ([family, decision]) => ({
        family,
        applicability: decision.applicability,
        obligationIds: decision.obligationIds,
        basis: decision.basis,
      }),
    ),
    sourceOnlyProjection: {
      scope: { unitId, profileId },
      raw: {
        path: rawPath,
        anchor: `${rawPath}#${rawHeading}`,
        sha256: sha256File(rawPath),
      },
      ubiquitousLanguage: {
        path: languagePath,
        headings: requiredLanguageHeadings.map(
          (heading) => `${languagePath}#${heading}`,
        ),
        sha256: sha256File(languagePath),
      },
      qnt: {
        driverPath,
        selectedActions,
        owners: Array.from(
          new Set(
            semanticObligations.flatMap(
              (id) => obligations.get(id)?.qntOwners ?? [],
            ),
          ),
        ),
      },
    },
    cleanroomBoundary: {
      sourceOnly: true,
      excludedFromCleanroomInput: true,
      excludedPaths: Array.from(
        new Set([
          harnessPath,
          witnessPath,
          productionEntrypointPath,
          productionProjectionPath,
          ...runtimeOwnerPaths,
          ...[...parityWitnessSourcePaths].filter((sourcePath) => /\.tsx?$/.test(sourcePath)),
        ]),
      ),
      artifactPath,
    },
  };
  index.contentSha256 = contentSha256(index);
  return index;
}

function issue(issues, message) {
  issues.push(`source-calibration: ${message}`);
}

function validateIndex(index, options = {}) {
  const issues = [];
  if (!index || index.schema !== "source-calibration-index.v1") {
    issue(issues, "index has the wrong schema.");
    return issues;
  }
  if (index.contentSha256 !== contentSha256(index)) {
    issue(issues, "contentSha256 is stale.");
  }
  if (index.scope?.unitId !== unitId) issue(issues, "artifact scope unit does not match the declared scope.");
  if (index.scope?.profileId !== profileId) issue(issues, "artifact scope profile does not match the declared scope.");
  const facts = surfaceFacts();
  if (!facts.rawHeading) issue(issues, `RAW anchor #${rawHeading} is missing.`);
  for (const term of requiredRawTerms) {
    if (!facts.rawSection.includes(term)) {
      issue(issues, `RAW scope anchor is missing required text: ${term}`);
    }
  }
  for (const heading of requiredLanguageHeadings) {
    if (!facts.languageHeadings.has(heading)) {
      issue(issues, `ubiquitous-language anchor #${heading} is missing.`);
    }
  }
  for (const term of requiredLanguageTerms) {
    if (!facts.languageSpellcastingSection.includes(term)) {
      issue(issues, `ubiquitous-language Spellcasting anchor is missing required term: ${term}`);
    }
  }
  for (const term of requiredLanguageGlobalTerms) {
    if (!facts.language.includes(term)) issue(issues, `ubiquitous-language anchor is missing required term: ${term}`);
  }
  if (index.scope?.rawAnchor !== `${rawPath}#${rawHeading}`) {
    issue(issues, "scope RAW anchor is not the verified declared anchor.");
  }
  if (
    JSON.stringify(index.scope?.ubiquitousLanguageAnchors ?? []) !==
    JSON.stringify(requiredLanguageHeadings.map((heading) => `${languagePath}#${heading}`))
  ) {
    issue(issues, "scope ubiquitous-language anchors are not the verified headings.");
  }
  if (JSON.stringify(index.scope?.ubiquitousLanguageTerms ?? []) !== JSON.stringify(requiredLanguageTerms)) {
    issue(issues, "scope ubiquitous-language terms are not the verified spellcasting terms.");
  }
  if (JSON.stringify(index.scope?.ubiquitousLanguageGlobalTerms ?? []) !== JSON.stringify(requiredLanguageGlobalTerms)) {
    issue(issues, "scope ubiquitous-language global terms are stale.");
  }
  const surfaceChecks = {
    "surface.mechanics.level": surfaceExpectations.level,
    "surface.mechanics.castingTime.kind": surfaceExpectations.castingTimeKind,
    "surface.mechanics.duration.kind": surfaceExpectations.durationKind,
    "attackPhase.attackKind": surfaceExpectations.attackKind,
    "attackPhase.onHit.0.amount.expr.dice": surfaceExpectations.attackDamageDice,
    "attackPhase.onHit.0.amount.expr.dieSize": surfaceExpectations.attackDamageDieSize,
    "attackPhase.onHit.0.damageType": surfaceExpectations.attackDamageType,
    "savePhase.ability": surfaceExpectations.saveAbility,
    "savePhase.attachment.value.shape.radiusFeet": surfaceExpectations.saveRadiusFeet,
    "savePhase.onFail.amount.base.dice": surfaceExpectations.saveBaseDice,
    "savePhase.onFail.amount.base.dieSize": surfaceExpectations.saveBaseDieSize,
    "savePhase.onFail.damageType": surfaceExpectations.saveDamageType,
    "savePhase.onFail.amount.perLevel.dice": surfaceExpectations.savePerLevelDice,
    "savePhase.onFail.amount.perLevel.dieSize": surfaceExpectations.savePerLevelDieSize,
    "savePhase.onFail.amount.startingAtLevel": surfaceExpectations.saveStartingAtLevel,
  };
  for (const [fieldPath, expected] of Object.entries(surfaceChecks)) {
    const actual = valueAtPath({ ...facts, surface: facts.surface }, fieldPath);
    if (actual !== expected) issue(issues, `Surface scope fact ${fieldPath} is not ${JSON.stringify(expected)}.`);
  }
  if (!facts.isAction || !facts.isInstantaneous) {
    issue(issues, "Surface duration/casting-time facts do not prove non-reaction, non-concentration applicability.");
  }
  for (const [sourcePath, expected] of Object.entries(index.sourceHashes ?? {})) {
    if (!fs.existsSync(repoFile(sourcePath))) issue(issues, `source ${sourcePath} is missing.`);
    else if (sha256File(sourcePath) !== expected) issue(issues, `source ${sourcePath} hash is stale.`);
  }
  const expectedVerification = options.currentVerification;
  const evidence = index.verificationEvidence;
  const evidenceHash = evidence === undefined ? "" : jsonSha256(evidence);
  const evidenceHarness = typeScriptScopedActions();
  const expectedBranchObservations = evidenceHarness.qntStepActions;
  if (!evidence || evidence.schema !== "source-calibration-verification.v1") {
    issue(issues, "verification evidence is missing or has the wrong schema.");
  } else {
    if (evidence.generatedBy !== "scripts/source-calibration-check.cjs") issue(issues, "verification evidence must be generated by the calibration checker.");
    if (evidence.command !== verificationCommand) issue(issues, "verification evidence command is not the scoped focused test.");
    if (evidence.result !== "passed" || evidence.exitCode !== 0) issue(issues, "verification evidence does not record a passing executable run.");
    if (evidence.qntFileSha256 !== sha256File(driverPath)) issue(issues, "verification evidence QNT hash is stale.");
    if (evidence.harnessSha256 !== sha256File(harnessPath)) issue(issues, "verification evidence TypeScript harness hash is stale.");
    if (evidence.observationMode !== "deterministic-qnt-step-action") issue(issues, "verification evidence does not use deterministic QNT step-action observation.");
    if (JSON.stringify(evidence.branchActions ?? []) !== JSON.stringify(selectedActionsFromHarness(evidenceHarness))) issue(issues, "verification evidence does not cover every scoped branch action.");
    if (JSON.stringify(evidence.branchObservations ?? []) !== JSON.stringify(expectedBranchObservations)) issue(issues, "verification evidence does not retain both actual deterministic branch observations.");
    if (evidence.branchObservationEvidenceSha256 !== jsonSha256({ branchObservations: evidence.branchObservations })) issue(issues, "verification evidence branch observation hash is stale.");
    if (evidence.outputEvidenceSha256 !== jsonSha256({ outputMarkers: evidence.outputMarkers })) issue(issues, "verification evidence output marker hash is stale.");
  }
  if (!evidenceHarness.source.includes("qntActionObservation") || !evidenceHarness.source.includes(qntObservationPrefix)) {
    issue(issues, "scoped harness has no executable branch observation emitter.");
  }
  if (expectedVerification !== undefined) {
    if (evidence === undefined || jsonSha256(expectedVerification) !== jsonSha256(evidence)) issue(issues, "checked-in verification evidence does not match the current executable run.");
    if (expectedVerification.result !== "passed") issue(issues, "the scoped focused verification command failed.");
  }
  const familyRows = index.obligationFamilyDecisions;
  const seenFamilies = new Set();
  if (!Array.isArray(familyRows)) {
    issue(issues, "obligationFamilyDecisions must be an array.");
  } else {
    for (const row of familyRows) {
      if (seenFamilies.has(row.family)) issue(issues, `duplicate obligation family decision ${row.family}.`);
      seenFamilies.add(row.family);
      const expected = familyExpectations[row.family];
      if (expected === undefined) issue(issues, `unknown obligation family ${row.family}.`);
      else {
        if (row.applicability !== expected.applicability) issue(issues, `obligation family ${row.family} has the wrong RAW-derived applicability.`);
        if (JSON.stringify(row.obligationIds ?? []) !== JSON.stringify(expected.obligationIds)) issue(issues, `obligation family ${row.family} has the wrong obligation join.`);
        if (row.basis !== expected.basis) issue(issues, `obligation family ${row.family} has the wrong source/QNT basis.`);
      }
    }
    for (const family of Object.keys(familyExpectations)) if (!seenFamilies.has(family)) issue(issues, `obligation family ${family} is unclassified.`);
  }
  const { obligations: registeredObligationsForFamilies } = sourceMetadata();
  const registeredQntOwners = new Set(
    semanticObligations.flatMap((id) => registeredObligationsForFamilies.get(id)?.qntOwners ?? []),
  );
  for (const [family, decision] of Object.entries(familyExpectations)) {
    const rawOk = (decision.rawTerms ?? []).every((term) => facts.rawSection.includes(term));
    const forbiddenOk = (decision.forbiddenRawTerms ?? []).every((term) => !facts.rawSection.includes(term));
    const surfaceOk = (decision.surfaceChecks ?? []).every(
      (check) => valueAtPath({ ...facts, surface: facts.surface }, check.path) === check.equals,
    );
    const qntBasisOk = (decision.basisQntOwnerPaths ?? []).every((ownerPath) => registeredQntOwners.has(ownerPath));
    if (!rawOk || !forbiddenOk || !surfaceOk || !qntBasisOk) {
      issue(issues, `obligation family ${family} basis is not joined to the verified source/QNT shape.`);
    }
  }
  const ts = typeScriptScopedActions();
  const harnessDriverPath = harnessDeclaredDriverPath(ts);
  const qntDiscovered = harnessDriverPath === undefined ? [] : qntActions(harnessDriverPath);
  const qntReplayActions = harnessDriverPath === undefined
    ? {}
    : qntDeterministicReplayActions(
        harnessDriverPath,
        ts.qntStepActions.map((entry) => entry.stepAction),
      );
  const tsObservedActions = ts.qntStepActions.map(
    (entry) => entry.observedAction,
  );
  const selectedQnt = index.qntBranchDiscovery?.selectedActions ?? [];
  if (harnessDriverPath === undefined || harnessDriverPath !== driverPath) {
    issue(issues, "scoped harness and calibration source must declare the same QNT driver.");
  }
  if (index.qntBranchDiscovery?.driverPath !== harnessDriverPath) {
    issue(issues, "QNT driver does not match the executable harness declaration.");
  }
  const selectedActions = selectedActionsFromHarness(ts);
  if (JSON.stringify([...selectedQnt].sort()) !== JSON.stringify([...selectedActions].sort())) {
    issue(issues, "selected QNT actions must exactly match the scoped harness actions.");
  }
  if (index.qntBranchDiscovery?.discoveredActions?.join("|") !== qntDiscovered.join("|")) {
    issue(issues, "QNT branch discovery is stale or incomplete.");
  }
  if (
    JSON.stringify(index.qntBranchDiscovery?.deterministicReplayActions ?? {}) !==
    JSON.stringify(qntReplayActions)
  ) {
    issue(issues, "deterministic QNT replay entrypoint discovery is stale or incomplete.");
  }
  for (const entry of ts.qntStepActions) {
    if (!qntDiscovered.includes(entry.observedAction)) {
      issue(issues, `deterministic QNT step ${entry.stepAction} observes an action that is not a discovered QNT step action.`);
    }
    if (qntReplayActions[entry.stepAction] !== entry.observedAction) {
      issue(issues, `deterministic QNT step ${entry.stepAction} does not observe ${entry.observedAction}.`);
    }
  }
  const expectedTs = new Set(selectedActions);
  if (JSON.stringify(index.typescriptBranchDiscovery?.qntStepActions ?? []) !== JSON.stringify(ts.qntStepActions)) {
    issue(issues, "deterministic QNT step-action discovery is stale or incomplete.");
  }
  for (const [label, actions] of [
    ["marker", ts.markerActions],
    ["executable unit", ts.unitActions],
    ["executable discovery", ts.discoveryActions],
    ["deterministic QNT step", tsObservedActions],
  ]) {
    const scopedActions = actions.filter((action) => expectedTs.has(action));
    if (JSON.stringify([...new Set(scopedActions)].sort()) !== JSON.stringify([...expectedTs].sort())) {
      issue(issues, `TypeScript ${label} action discovery does not cover both direct actions.`);
    }
  }
  const obligationRows = index.obligationCalibrations;
  const branchRows = index.branchCalibrations;
  if (!Array.isArray(obligationRows)) issue(issues, "obligationCalibrations must be an array.");
  if (!Array.isArray(branchRows)) issue(issues, "branchCalibrations must be an array.");
  const { qntOwnerRoles, obligations, profileObligations } = sourceMetadata();
  const registeredRuntimeOwnerPaths = new Set(
    semanticObligations.flatMap((id) => obligations.get(id)?.runtimeOwners ?? []),
  );
  const registeredParityWitnessSourcePaths = new Set(
    semanticObligations.flatMap((id) => {
      const witness = registeredFocusedParityWitness(obligations.get(id));
      return witness === undefined ? [] : [witness.ownerPath, witness.qntSpecPath];
    }),
  );
  const requiredSourcePaths = new Set([
    rawPath,
    languagePath,
    surfacePath,
    driverPath,
    harnessPath,
    witnessPath,
    ownerRolesPath,
    obligationsPath,
    profileObligationsPath,
    checkerPath,
    scopeRelativePath,
    productionEntrypointPath,
    productionProjectionPath,
    ...registeredRuntimeOwnerPaths,
    ...[...registeredParityWitnessSourcePaths].filter((sourcePath) => /\.tsx?$/.test(sourcePath)),
  ]);
  for (const sourcePath of requiredSourcePaths) {
    if (!(sourcePath in (index.sourceHashes ?? {}))) issue(issues, `source hash is missing for ${sourcePath}.`);
  }
  const expectedExcludedPaths = new Set([
    harnessPath,
    witnessPath,
    productionEntrypointPath,
    productionProjectionPath,
    ...registeredRuntimeOwnerPaths,
    ...[...registeredParityWitnessSourcePaths].filter((sourcePath) => /\.tsx?$/.test(sourcePath)),
  ]);
  if (JSON.stringify([...(index.cleanroomBoundary?.excludedPaths ?? [])].sort()) !== JSON.stringify([...expectedExcludedPaths].sort())) {
    issue(issues, "cleanroom boundary does not exclude every TypeScript calibration path.");
  }
  const sourceOnlyProjection = index.sourceOnlyProjection;
  const sourceOnlyProjectionText = JSON.stringify(sourceOnlyProjection ?? {});
  if (/\.(?:ts|tsx)\b/.test(sourceOnlyProjectionText) || /productionTypeScript|harnessPath|ownerEvidence/.test(sourceOnlyProjectionText)) {
    issue(issues, "source-only projection contains TypeScript calibration data.");
  }
  const expectedQntOwners = new Set(
    semanticObligations.flatMap((id) => obligations.get(id)?.qntOwners ?? []),
  );
  if (sourceOnlyProjection?.scope?.unitId !== unitId || sourceOnlyProjection?.scope?.profileId !== profileId || sourceOnlyProjection?.qnt?.driverPath !== driverPath) {
    issue(issues, "source-only projection does not match the declared source scope.");
  }
  if (JSON.stringify([...(sourceOnlyProjection?.qnt?.selectedActions ?? [])].sort()) !== JSON.stringify([...selectedActionsFromHarness()].sort())) {
    issue(issues, "source-only projection selected actions are stale.");
  }
  if (JSON.stringify([...(sourceOnlyProjection?.qnt?.owners ?? [])].sort()) !== JSON.stringify([...expectedQntOwners].sort())) {
    issue(issues, "source-only projection QNT owner closure is incomplete.");
  }
  if (sourceOnlyProjection?.raw?.path !== rawPath || sourceOnlyProjection?.raw?.sha256 !== sha256File(rawPath) || sourceOnlyProjection?.raw?.anchor !== `${rawPath}#${rawHeading}`) {
    issue(issues, "source-only projection RAW evidence is stale.");
  }
  const registeredProfileObligationIds = profileObligations.get(profileId) ?? [];
  if (
    JSON.stringify([...(index.supportedProfileObligationIds ?? [])].sort()) !==
    JSON.stringify([...registeredProfileObligationIds].sort())
  ) {
    issue(issues, "supported-profile obligation join is stale.");
  }
  if (
    JSON.stringify([...registeredProfileObligationIds].sort()) !==
    JSON.stringify([...semanticObligations].sort())
  ) {
    issue(issues, "selected semantic obligations do not match the supported-profile registry.");
  }
  const obligationIds = new Set();
  for (const [rowIndex, row] of (obligationRows ?? []).entries()) {
    if (obligationIds.has(row.obligationId)) issue(issues, `duplicate obligation claim ${row.obligationId}.`);
    obligationIds.add(row.obligationId);
    if (!semanticObligations.includes(row.obligationId)) issue(issues, `unknown obligation ${row.obligationId}.`);
    if (row.profileId !== profileId) issue(issues, `obligation ${row.obligationId} has the wrong supported profile join.`);
    if (row.calibrationResult !== "exact-current-executable") issue(issues, `obligation ${row.obligationId} has an invalid calibration result.`);
    if (!Array.isArray(row.qntOwners) || row.qntOwners.length === 0) issue(issues, `obligation ${row.obligationId} has no QNT owner.`);
    if (!Array.isArray(row.productionTypeScriptOwners) || row.productionTypeScriptOwners.length === 0) issue(issues, `obligation ${row.obligationId} has no production TypeScript owner.`);
    const registered = obligations.get(row.obligationId);
    const registeredOwners = registered?.qntOwners ?? [];
    const rowOwnerPaths = (row.qntOwners ?? []).map((owner) => owner.path);
    for (const ownerPath of registeredOwners) {
      if (!rowOwnerPaths.includes(ownerPath)) issue(issues, `obligation ${row.obligationId} is missing registered QNT owner ${ownerPath}.`);
    }
    for (const ownerPath of rowOwnerPaths) {
      if (!registeredOwners.includes(ownerPath)) issue(issues, `obligation ${row.obligationId} contains unregistered QNT owner ${ownerPath}.`);
    }
    if (JSON.stringify([...rowOwnerPaths].sort()) !== JSON.stringify([...registeredOwners].sort())) {
      issue(issues, `obligation ${row.obligationId} QNT owner closure is incomplete.`);
    }
    if (JSON.stringify(row.productionTypeScriptOwners ?? []) !== JSON.stringify(registered?.runtimeOwners ?? [])) {
      issue(issues, `obligation ${row.obligationId} production TypeScript owners do not match the registered owner set.`);
    }
    const registeredWitness = registeredFocusedParityWitness(registered);
    if (
      registeredWitness === undefined ||
      JSON.stringify(stable(row.parityWitness)) !== JSON.stringify(stable(registeredWitness))
    ) {
      issue(issues, `obligation ${row.obligationId} parity witness is not a registered focused witness.`);
    }
    if (row.parityWitness?.kind !== "focused-mbt") {
      issue(issues, `obligation ${row.obligationId} parity witness is not focused MBT.`);
    }
    if (row.parityWitness?.stepAction !== "step") {
      issue(issues, `obligation ${row.obligationId} parity witness is not connected to the QNT step action.`);
    }
    if (!fs.existsSync(repoFile(row.parityWitness?.ownerPath ?? ""))) {
      issue(issues, `obligation ${row.obligationId} parity witness owner is missing.`);
    }
    if (!fs.existsSync(repoFile(row.parityWitness?.qntSpecPath ?? ""))) {
      issue(issues, `obligation ${row.obligationId} parity witness QNT spec is missing.`);
    }
    if (
      typeof row.parityWitness?.ownerPath === "string" &&
      typeof row.parityWitness?.qntSpecPath === "string" &&
      fs.existsSync(repoFile(row.parityWitness.ownerPath)) &&
      !fs.readFileSync(repoFile(row.parityWitness.ownerPath), "utf8").includes(
        path.posix.basename(row.parityWitness.qntSpecPath),
      )
    ) {
      issue(issues, `obligation ${row.obligationId} parity witness does not reference its QNT spec.`);
    }
    if (
      typeof row.parityWitness?.qntSpecPath === "string" &&
      fs.existsSync(repoFile(row.parityWitness.qntSpecPath)) &&
      !/action\s+step\s*=/.test(fs.readFileSync(repoFile(row.parityWitness.qntSpecPath), "utf8"))
    ) {
      issue(issues, `obligation ${row.obligationId} parity witness QNT spec has no step action.`);
    }
    const ownerEvidence = row.productionTypeScriptOwnerEvidence;
    if (!Array.isArray(ownerEvidence)) {
      issue(issues, `obligation ${row.obligationId} has no production TypeScript source evidence.`);
    } else {
      if (JSON.stringify(ownerEvidence.map((entry) => entry.path).sort()) !== JSON.stringify([...(registered?.runtimeOwners ?? [])].sort())) {
        issue(issues, `obligation ${row.obligationId} production TypeScript source evidence does not match registered owners.`);
      }
      for (const entry of ownerEvidence) {
        if (!fs.existsSync(repoFile(entry.path))) issue(issues, `obligation ${row.obligationId} production TypeScript owner ${entry.path} is missing.`);
        else if (sha256File(entry.path) !== entry.sha256) issue(issues, `obligation ${row.obligationId} production TypeScript owner ${entry.path} hash is stale.`);
      }
    }
    for (const owner of row.qntOwners ?? []) {
      if (!fs.existsSync(repoFile(owner.path))) issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} is missing.`);
      else if (sha256File(owner.path) !== owner.sha256) issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} hash is stale.`);
      const role = qntOwnerRoles.get(owner.path);
      if (typeof role !== "string" || role.trim() === "") issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} has no registered owner role.`);
      if (typeof owner.role !== "string" || owner.role.trim() === "") issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} has no owner role.`);
      else if (role !== owner.role) issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} has a stale role.`);
      if (owner.applicability !== ownerApplicability[owner.path]) issue(issues, `obligation ${row.obligationId} QNT owner ${owner.path} has an unclassified applicability.`);
    }
    if (rowIndex >= semanticObligations.length) issue(issues, "unexpected obligation row.");
  }
  if (
    JSON.stringify([...obligationIds].sort()) !==
    JSON.stringify([...semanticObligations].sort())
  ) {
    issue(issues, "obligation calibrations must cover exactly the selected semantic obligations.");
  }
  const branchIds = new Set();
  const branchActions = new Set();
  for (const row of branchRows ?? []) {
    if (branchIds.has(row.branchId)) issue(issues, `duplicate branch claim ${row.branchId}.`);
    branchIds.add(row.branchId);
    if (row.driverPath !== driverPath) issue(issues, `branch ${row.branchAction} is not attached to the scoped driver.`);
    if (row.branchFamily !== "step" || row.branchId !== `${driverPath}#step:${row.branchAction}`) issue(issues, `branch ${row.branchAction} has a stale QNT branch identity.`);
    if (row.qntFileSha256 !== sha256File(driverPath)) issue(issues, `branch ${row.branchAction} has a stale QNT hash.`);
    if (!selectedActions.includes(row.branchAction)) issue(issues, `unknown or unselected branch action ${row.branchAction}.`);
    if (!qntDiscovered.includes(row.branchAction)) issue(issues, `branch ${row.branchAction} is not a discovered QNT step action.`);
    branchActions.add(row.branchAction);
    if (!Array.isArray(row.calibratedObligationIds) || row.calibratedObligationIds.some((id) => !obligationIds.has(id))) issue(issues, `branch ${row.branchAction} has an unknown or missing obligation join.`);
    if (JSON.stringify([...(row.calibratedObligationIds ?? [])].sort()) !== JSON.stringify([...semanticObligations].sort())) issue(issues, `branch ${row.branchAction} does not join every selected obligation exactly once.`);
    const tsEntry = row.productionTypeScript;
    if (row.qntReplay?.actionTaken !== row.branchAction || row.qntReplay?.observationMode !== "deterministic-qnt-step-action" || qntReplayActions[row.qntReplay?.stepAction] !== row.branchAction) issue(issues, `branch ${row.branchAction} has no deterministic QNT actionTaken observation.`);
    if (tsEntry?.harnessPath !== harnessPath || tsEntry?.harnessEntrypoint !== `${discoveryObject}.${row.branchAction}` || !ts.discoveryActions.includes(row.branchAction)) issue(issues, `branch ${row.branchAction} lacks an executable TypeScript action claim.`);
    if (tsEntry?.productionEntrypointPath !== productionEntrypointPath || !fs.existsSync(repoFile(tsEntry?.productionEntrypointPath ?? ""))) issue(issues, `branch ${row.branchAction} production entrypoint path is missing or not production-owned.`);
    if (tsEntry?.productionProjectionPath !== productionProjectionPath || !fs.existsSync(repoFile(tsEntry?.productionProjectionPath ?? ""))) issue(issues, `branch ${row.branchAction} production projection path is missing or not production-owned.`);
    const productionEntrypointSource = fs.existsSync(repoFile(productionEntrypointPath)) ? fs.readFileSync(repoFile(productionEntrypointPath), "utf8") : "";
    const productionProjectionSource = fs.existsSync(repoFile(productionProjectionPath)) ? fs.readFileSync(repoFile(productionProjectionPath), "utf8") : "";
    if (tsEntry?.productionEntrypoint !== productionEntrypoint || !new RegExp(`export function ${escapeRegExp(productionEntrypoint)}\\s*\\(`).test(productionEntrypointSource)) issue(issues, `branch ${row.branchAction} does not name the exported production resolver.`);
    if (tsEntry?.productionProjection !== productionProjection || !new RegExp(`export const ${escapeRegExp(productionProjection)}\\s*:`).test(productionProjectionSource)) issue(issues, `branch ${row.branchAction} does not name the exported production profile projection.`);
    const expectedDispatchEvidence = {
      mode: "registered-production-dispatch-chain",
      harnessDiscovery: "discoverBattleActs",
      resolverSubject: "resolveBattleSubject",
      profileResolver,
      entrypoint: productionEntrypoint,
      projection: productionProjection,
    };
    if (JSON.stringify(tsEntry?.productionDispatchEvidence ?? {}) !== JSON.stringify(expectedDispatchEvidence)) issue(issues, `branch ${row.branchAction} has incomplete production dispatch evidence.`);
    if (!ts.source.includes(expectedDispatchEvidence.harnessDiscovery) || !ts.source.includes(expectedDispatchEvidence.resolverSubject)) issue(issues, `branch ${row.branchAction} harness does not exercise the registered battle dispatch chain.`);
    if (!new RegExp(`function ${escapeRegExp(profileResolver)}\\s*\\([\\s\\S]*?${escapeRegExp(productionEntrypoint)}\\s*\\(`).test(productionProjectionSource) || !new RegExp(`resolve:\\s*${escapeRegExp(profileResolver)}\\b`).test(productionProjectionSource)) issue(issues, `branch ${row.branchAction} production profile does not dispatch to its resolver.`);
    if (tsEntry?.productionEntrypointSha256 !== sha256File(productionEntrypointPath)) issue(issues, `branch ${row.branchAction} production resolver source hash is stale.`);
    if (tsEntry?.productionProjectionSha256 !== sha256File(productionProjectionPath)) issue(issues, `branch ${row.branchAction} production projection source hash is stale.`);
    if (typeof tsEntry?.productionEntrypoint !== "string" || tsEntry.productionEntrypoint.startsWith("adapter")) issue(issues, `branch ${row.branchAction} has an adapter-only production projection.`);
    if (typeof tsEntry?.productionProjection !== "string") issue(issues, `branch ${row.branchAction} has no production projection.`);
    if (row.verificationEvidenceSha256 !== evidenceHash) issue(issues, `branch ${row.branchAction} has stale or missing executable verification evidence.`);
    if (!evidence?.branchActions?.includes(row.branchAction)) issue(issues, `branch ${row.branchAction} is not covered by executable verification evidence.`);
  }
  for (const action of selectedActions) if (!branchActions.has(action)) issue(issues, `selected sibling action ${action} is unobserved.`);
  if (branchRows?.length !== selectedActions.length) issue(issues, "branch calibrations must be one row per selected action.");
  if (index.cleanroomBoundary?.sourceOnly !== true || index.cleanroomBoundary?.excludedFromCleanroomInput !== true) issue(issues, "calibration must remain source-only and excluded from cleanroom input.");
  if (index.cleanroomBoundary?.artifactPath?.includes("cleanroom-input")) issue(issues, "calibration artifact cannot be placed in cleanroom input.");
  if (options.requireNoFixtureIssues && issues.length > 0) return issues;
  return issues;
}

function expectIssue(index, text) {
  const issues = validateIndex(index);
  if (!issues.some((entry) => entry.includes(text))) {
    throw new Error(`self-test expected an issue containing ${JSON.stringify(text)}.`);
  }
}

function selfTest() {
  const index = buildIndex(successfulVerificationFixture());
  if (validateIndex(index).length !== 0) throw new Error(JSON.stringify(validateIndex(index), null, 2));
  const missingSibling = structuredClone(index);
  missingSibling.branchCalibrations.pop();
  missingSibling.contentSha256 = contentSha256(missingSibling);
  expectIssue(missingSibling, "unobserved");

  const wrongDriver = structuredClone(index);
  wrongDriver.qntBranchDiscovery.driverPath =
    "packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt";
  wrongDriver.contentSha256 = contentSha256(wrongDriver);
  expectIssue(wrongDriver, "QNT driver does not match the executable harness declaration");

  const missingOwner = structuredClone(index);
  missingOwner.obligationCalibrations[0].productionTypeScriptOwners = [];
  missingOwner.contentSha256 = contentSha256(missingOwner);
  expectIssue(missingOwner, "no production TypeScript owner");

  const invalidCalibrationResult = structuredClone(index);
  invalidCalibrationResult.obligationCalibrations[0].calibrationResult = "passed";
  invalidCalibrationResult.contentSha256 = contentSha256(invalidCalibrationResult);
  expectIssue(invalidCalibrationResult, "invalid calibration result");

  const missingOwnerRole = structuredClone(index);
  delete missingOwnerRole.obligationCalibrations[0].qntOwners[0].role;
  missingOwnerRole.contentSha256 = contentSha256(missingOwnerRole);
  expectIssue(missingOwnerRole, "has no owner role");

  const missingParityWitness = structuredClone(index);
  delete missingParityWitness.obligationCalibrations[0].parityWitness;
  missingParityWitness.contentSha256 = contentSha256(missingParityWitness);
  expectIssue(missingParityWitness, "parity witness is not a registered focused witness");

  const missingQntOwner = structuredClone(index);
  missingQntOwner.obligationCalibrations[1].qntOwners =
    missingQntOwner.obligationCalibrations[1].qntOwners.filter(
      (owner) => !owner.path.includes("unit-feature-save-damage-core.qnt"),
    );
  missingQntOwner.contentSha256 = contentSha256(missingQntOwner);
  expectIssue(missingQntOwner, "missing registered QNT owner");

  const partialBranchJoin = structuredClone(index);
  partialBranchJoin.branchCalibrations[0].calibratedObligationIds = [
    semanticObligations[0],
  ];
  partialBranchJoin.contentSha256 = contentSha256(partialBranchJoin);
  expectIssue(partialBranchJoin, "does not join every selected obligation");

  const staleProfileJoin = structuredClone(index);
  staleProfileJoin.supportedProfileObligationIds = [];
  staleProfileJoin.contentSha256 = contentSha256(staleProfileJoin);
  expectIssue(staleProfileJoin, "supported-profile obligation join is stale");

  const wrongRowProfile = structuredClone(index);
  wrongRowProfile.obligationCalibrations[0].profileId = "wrong-profile";
  wrongRowProfile.contentSha256 = contentSha256(wrongRowProfile);
  expectIssue(wrongRowProfile, "wrong supported profile join");

  const malformedParityWitness = structuredClone(index);
  malformedParityWitness.obligationCalibrations[0].parityWitness.kind = "runtime-test";
  malformedParityWitness.contentSha256 = contentSha256(malformedParityWitness);
  expectIssue(malformedParityWitness, "parity witness is not focused MBT");

  const missingDeterministicStep = structuredClone(index);
  missingDeterministicStep.typescriptBranchDiscovery.qntStepActions.pop();
  missingDeterministicStep.contentSha256 = contentSha256(missingDeterministicStep);
  expectIssue(missingDeterministicStep, "deterministic QNT step");

  const staleHash = structuredClone(index);
  staleHash.branchCalibrations[0].qntFileSha256 = "0".repeat(64);
  staleHash.contentSha256 = contentSha256(staleHash);
  expectIssue(staleHash, "stale QNT hash");

  const undiscoveredBranchAction = structuredClone(index);
  undiscoveredBranchAction.branchCalibrations[0].branchAction = "doResolveUnregisteredBranch";
  undiscoveredBranchAction.contentSha256 = contentSha256(undiscoveredBranchAction);
  expectIssue(undiscoveredBranchAction, "not a discovered QNT step action");

  const duplicate = structuredClone(index);
  duplicate.branchCalibrations.push(structuredClone(duplicate.branchCalibrations[0]));
  duplicate.contentSha256 = contentSha256(duplicate);
  expectIssue(duplicate, "duplicate branch claim");

  const adapterOnly = structuredClone(index);
  adapterOnly.branchCalibrations[0].productionTypeScript.productionEntrypoint = "adapterOnlyProjection";
  adapterOnly.contentSha256 = contentSha256(adapterOnly);
  expectIssue(adapterOnly, "adapter-only");

  const driverOnly = structuredClone(index);
  driverOnly.branchCalibrations[0].productionTypeScript.harnessEntrypoint = "driverLevelOnly";
  driverOnly.contentSha256 = contentSha256(driverOnly);
  expectIssue(driverOnly, "executable TypeScript action claim");

  const contaminatedProjection = structuredClone(index);
  contaminatedProjection.sourceOnlyProjection.productionTypeScriptOwners = [harnessPath];
  contaminatedProjection.contentSha256 = contentSha256(contaminatedProjection);
  expectIssue(contaminatedProjection, "source-only projection contains TypeScript calibration data");
  console.log("source calibration self-test passed (18 negative fixtures).");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const currentVerification = runVerification();
  if (currentVerification.result !== "passed") {
    console.error(JSON.stringify(currentVerification, null, 2));
    process.exitCode = 1;
    return;
  }
  const index = buildIndex(currentVerification);
  if (process.argv.includes("--write")) {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }
  const checked = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
    : index;
  const issues = validateIndex(checked, { currentVerification });
  if (issues.length > 0) {
    console.error(issues.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(`source calibration passed (${checked.obligationCalibrations.length} obligations, ${checked.branchCalibrations.length} scoped actions).`);
}

main();
