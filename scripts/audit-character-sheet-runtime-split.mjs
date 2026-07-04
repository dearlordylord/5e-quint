#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const indexPath = "packages/character-sheet-runtime/src/index.ts";
const indexFile = path.join(repoRoot, indexPath);
const baseRef = process.argv[2] ?? null;

const EXPECTED_EXPORTS = [
  "CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE",
  "CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS",
  "CHARACTER_SHEET_LONG_REST_BASE_TICKS",
  "CHARACTER_SHEET_LONG_REST_WAIT_TICKS",
  "CHARACTER_SHEET_NO_HEROIC_INSPIRATION",
  "CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS",
  "CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES",
  "CHARACTER_SHEET_SHORT_REST_TICKS",
  "CharacterPactSlotExpenditure",
  "CharacterSheet",
  "CharacterSheetAbilityCheckAbility",
  "CharacterSheetAbilityCheckAbilityInput",
  "CharacterSheetAbilityCheckAbilitySubstitution",
  "CharacterSheetAbilityCheckOtherProficiencyBonusState",
  "CharacterSheetAbilityCheckProficiencyBonus",
  "CharacterSheetAbilityCheckProficiencyBonusInput",
  "CharacterSheetArcaneRecoverySlotRefund",
  "CharacterSheetArmorClassBaseChoice",
  "CharacterSheetArmorClassStateInput",
  "CharacterSheetBookOfShadowsPresence",
  "CharacterSheetBookOfShadowsRitualInvocation",
  "CharacterSheetClassFeaturePreparedSpellAccess",
  "CharacterSheetCompanion",
  "CharacterSheetCompanionCreatureTypeOverride",
  "CharacterSheetCompanionFormSelection",
  "CharacterSheetCondition",
  "CharacterSheetCreatedSpellSlotState",
  "CharacterSheetDeadDeathSaves",
  "CharacterSheetDruidCircleLand",
  "CharacterSheetDruidCircleLandPreparedSpellAccess",
  "CharacterSheetDruidWildShapeKnownFormReplacement",
  "CharacterSheetDruidWildShapeKnownForms",
  "CharacterSheetElapsedTimeResult",
  "CharacterSheetFontOfMagicSlotToSorceryPointsInput",
  "CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput",
  "CharacterSheetFontOfMagicSpellSlotSource",
  "CharacterSheetHitDieSpend",
  "CharacterSheetHitDieState",
  "CharacterSheetHitPoints",
  "CharacterSheetHitPointsInput",
  "CharacterSheetHeroicInspiration",
  "CharacterSheetId",
  "CharacterSheetInput",
  "CharacterSheetIssue",
  "CharacterSheetJumpDistanceAbility",
  "CharacterSheetJumpDistanceAbilityInput",
  "CharacterSheetJumpDistanceAbilitySubstitution",
  "CharacterSheetLayOnHandsInput",
  "CharacterSheetLayOnHandsResult",
  "CharacterSheetLinkedSpeedGrant",
  "CharacterSheetLongRestCalendarGate",
  "CharacterSheetLongRestCompletion",
  "CharacterSheetLongRestCompletionInput",
  "CharacterSheetLongRestInput",
  "CharacterSheetLongRestInterruption",
  "CharacterSheetLongRestInterruptionInput",
  "CharacterSheetLongRestInterruptionOutcome",
  "CharacterSheetLongRestStart",
  "CharacterSheetLongRestStartInput",
  "CharacterSheetLongRestStartTiming",
  "CharacterSheetMagicalCunningInput",
  "CharacterSheetMonkUncannyMetabolismInitiativeInput",
  "CharacterSheetMonkUncannyMetabolismUseState",
  "CharacterSheetMonksFocusSaveDc",
  "CharacterSheetPactSlotState",
  "CharacterSheetPendingDeathSaves",
  "CharacterSheetPointPoolResourceUnitId",
  "CharacterSheetPositiveHpUnconscious",
  "CharacterSheetRetainedCompanionCreationInput",
  "CharacterSheetRetainedCompanionCreationSource",
  "CharacterSheetRetainedCompanionCurrentHitPoints",
  "CharacterSheetRetainedCompanionHitPoints",
  "CharacterSheetRetainedCompanionId",
  "CharacterSheetRetainedCompanionManifestation",
  "CharacterSheetRetainedCompanionProtocol",
  "CharacterSheetRetainedCompanionProtocolFacts",
  "CharacterSheetRetainedCompanionProtocolTag",
  "CharacterSheetRetainedCompanionResolvedFormProof",
  "CharacterSheetRetainedCompanionState",
  "CharacterSheetResourceExpenditure",
  "CharacterSheetResourceState",
  "CharacterSheetRestActivityInterruption",
  "CharacterSheetRestFeatureUse",
  "CharacterSheetShortRestCompletion",
  "CharacterSheetShortRestCompletionInput",
  "CharacterSheetShortRestInput",
  "CharacterSheetShortRestInterruption",
  "CharacterSheetShortRestInterruptionInput",
  "CharacterSheetShortRestInterruptionOutcome",
  "CharacterSheetShortRestStart",
  "CharacterSheetShortRestStartInput",
  "CharacterSheetSpellInvocation",
  "CharacterSheetSpellInvocationInput",
  "CharacterSheetSpellInvocationKind",
  "CharacterSheetSpellRestBenefitInput",
  "CharacterSheetSpellRestBenefitRecipient",
  "CharacterSheetSpellRestBenefitRecipientEligibility",
  "CharacterSheetSpellRestBenefitResult",
  "CharacterSheetSpellSlotSourceState",
  "CharacterSheetSpellSlotState",
  "CharacterSheetSpellbookRitualAccess",
  "CharacterSheetSpellbookRitualAccessInput",
  "CharacterSheetSpellbookRitualInvocation",
  "CharacterSheetSpentHitDiePool",
  "CharacterSheetStableRecovery",
  "CharacterSheetTimePassedInput",
  "CharacterSheetUseCountResourceUnitId",
  "CharacterSheetWeaponMasteryReselection",
  "CharacterSheetZeroHpLifecycle",
  "CharacterSheetZeroHpLifecycleInput",
  "CharacterSpellSlotExpenditure",
  "applyCharacterSheetSpellRestBenefit",
  "applyLayOnHands",
  "characterBuildHasSpellbookSpell",
  "characterSheetAbilityCheckAbility",
  "characterSheetAbilityCheckProficiencyBonus",
  "characterSheetArmorClass",
  "characterSheetArmorClassState",
  "characterSheetClassFeaturePreparedSpellAccessesForBuild",
  "characterSheetCompanion",
  "characterSheetCurrentHp",
  "characterSheetDruidCircleLandPreparedSpellAccess",
  "characterSheetDruidWildShapeKnownForms",
  "characterSheetHitDice",
  "characterSheetHitPointMaximum",
  "characterSheetHitPoints",
  "characterSheetHitPointsCurrentHp",
  "characterSheetNormalHitPointMaximum",
  "characterSheetId",
  "characterSheetIssue",
  "characterSheetJumpDistanceAbility",
  "characterSheetLinkedSpeedGrants",
  "characterSheetLongRestCalendarGate",
  "characterSheetMonkUncannyMetabolismUseState",
  "characterSheetMonksFocusSaveDc",
  "characterSheetPactSlots",
  "characterSheetProficiencyBonusForCharacterLevel",
  "characterSheetResources",
  "parseCharacterSheetRetainedCompanionId",
  "characterSheetSpellInvocation",
  "characterSheetSpellSlotSourceState",
  "characterSheetSpellSlots",
  "characterSheetSpellbookRitualAccess",
  "characterSheetSpellbookRitualAccessesForBuild",
  "characterSheetTempHp",
  "completeLongRest",
  "completeMagicalCunningRite",
  "completeShortRest",
  "convertFontOfMagicSorceryPointsToSpellSlot",
  "convertFontOfMagicSpellSlotToSorceryPoints",
  "createFreshCharacterSheet",
  "createRetainedFamiliarLikeCompanion",
  "finishLongRest",
  "finishShortRest",
  "interruptLongRest",
  "interruptShortRest",
  "isCharacterSheetPointPoolResourceUnitId",
  "isCharacterSheetUseCountResourceUnitId",
  "parseCharacterSheet",
  "replaceOrdinarySpellSlotExpenditure",
  "replaceCharacterSheetSpellSlotSourceState",
  "replaceCharacterSheetCompanion",
  "retainedCompanionProtocolFacts",
  "startLongRest",
  "startShortRest",
  "timePassed",
  "useMonkUncannyMetabolismWhenRollingInitiative",
];
const EXPECTED_MOVED_FUNCTIONS = [
  {
    name: "characterBuildHasSpellbookSpell",
    hash: "d186715002a84e6c",
  },
  {
    name: "timePassed",
    hash: "6aa391ed5b26d5bc",
  },
];
const EXPECTED_EXPORT_RECONCILIATION_REASONS = [
  {
    name: "characterSheetNormalHitPointMaximum",
    reason:
      "Character Sheet owns HP maximum projections from build facts and mutable maximum-reduction state; exposing the normal maximum keeps callers from storing derived capacity beside the sheet source facts.",
  },
  {
    name: "replaceOrdinarySpellSlotExpenditure",
    reason:
      "Character Sheet owns ordinary Spell Slot expenditure state; battle handoff settlement reuses this canonical updater instead of duplicating the replacement/sort convention in character-battle-runtime.",
  },
];

function sourceFileFor(source, file) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
}

function hasExportModifier(node) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

function extractExportNames(source, file) {
  const sourceFile = sourceFileFor(source, file);
  const names = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        names.push(specifier.name.text);
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      hasExportModifier(statement) &&
      statement.name !== undefined
    ) {
      names.push(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.push(declaration.name.text);
        }
      }
    }
  }
  return names.sort();
}

function exportedFunctionImplementations(source, file) {
  const sourceFile = sourceFileFor(source, file);
  const implementations = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.body !== undefined &&
      statement.name !== undefined &&
      hasExportModifier(statement)
    ) {
      const text = source.slice(statement.getStart(sourceFile), statement.end);
      const normalized = text
        .replace(/^export\s+/, "")
        .replace(/\s+/g, " ")
        .trim();
      implementations.push({
        name: statement.name.text,
        file: path.relative(repoRoot, file),
        hash: createHash("sha256")
          .update(normalized)
          .digest("hex")
          .slice(0, 16),
      });
    }
  }

  return implementations;
}

function implementationsByName(implementations) {
  const groups = new Map();
  for (const implementation of implementations) {
    const group = groups.get(implementation.name) ?? [];
    group.push(implementation);
    groups.set(implementation.name, group);
  }
  return groups;
}

function inspectBarrel(source, file) {
  const sourceFile = sourceFileFor(source, file);
  const invalidStatements = [];
  const reexports = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      for (const specifier of statement.exportClause.elements) {
        reexports.push({
          exported: specifier.name.text,
          imported: specifier.propertyName?.text ?? specifier.name.text,
          module: statement.moduleSpecifier.text,
        });
      }
      continue;
    }

    invalidStatements.push({
      line:
        sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1,
      kind: ts.SyntaxKind[statement.kind],
    });
  }

  return { invalidStatements, reexports };
}

function duplicates(names) {
  const seen = new Set();
  const repeated = new Set();
  for (const name of names) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return [...repeated].sort();
}

function diffLists(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((name) => !actualSet.has(name)),
    added: actual.filter((name) => !expectedSet.has(name)),
  };
}

function invalidExportReconciliationReasons(reasons, expectedExports) {
  const expectedSet = new Set(expectedExports);
  return reasons.filter(
    (entry) =>
      !expectedSet.has(entry.name) ||
      typeof entry.reason !== "string" ||
      entry.reason.trim() === "",
  );
}

function readBaseIndex(ref) {
  return execFileSync("git", ["show", `${ref}:${indexPath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function resolveRelativeModule(moduleSpecifier) {
  if (!moduleSpecifier.startsWith("./")) {
    return null;
  }
  const resolved = path.resolve(path.dirname(indexFile), moduleSpecifier);
  return resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
}

function moduleExportNames(moduleFile) {
  return new Set(
    extractExportNames(readFileSync(moduleFile, "utf8"), moduleFile),
  );
}

const currentSource = readFileSync(indexFile, "utf8");
const currentBarrel = inspectBarrel(currentSource, indexFile);
const currentExports = currentBarrel.reexports
  .map((entry) => entry.exported)
  .sort();

const expectedExports =
  baseRef === null
    ? [...EXPECTED_EXPORTS].sort()
    : extractExportNames(readBaseIndex(baseRef), `${baseRef}:${indexPath}`);
const invalidReconciliationReasons = invalidExportReconciliationReasons(
  EXPECTED_EXPORT_RECONCILIATION_REASONS,
  expectedExports,
);
const checkedInExpectedDiff =
  baseRef === null
    ? { missing: [], added: [] }
    : diffLists([...EXPECTED_EXPORTS].sort(), expectedExports);

const currentDiff = diffLists(expectedExports, currentExports);
const duplicateCurrentExports = duplicates(currentExports);
const unresolvedModules = [];
const missingModuleExports = [];
const moduleExportCache = new Map();
const reexportedModuleFiles = new Set();

for (const reexport of currentBarrel.reexports) {
  const moduleFile = resolveRelativeModule(reexport.module);
  if (moduleFile === null || !existsSync(moduleFile)) {
    unresolvedModules.push(reexport);
    continue;
  }
  reexportedModuleFiles.add(moduleFile);
  const moduleNames =
    moduleExportCache.get(moduleFile) ??
    moduleExportCache
      .set(moduleFile, moduleExportNames(moduleFile))
      .get(moduleFile);
  if (!moduleNames.has(reexport.imported)) {
    missingModuleExports.push(reexport);
  }
}

const expectedMovedFunctions =
  baseRef === null
    ? EXPECTED_MOVED_FUNCTIONS
    : exportedFunctionImplementations(readBaseIndex(baseRef), indexFile);
const currentFunctionImplementations = [...reexportedModuleFiles].flatMap(
  (file) => exportedFunctionImplementations(readFileSync(file, "utf8"), file),
);
const currentFunctionsByName = implementationsByName(
  currentFunctionImplementations,
);
const missingMovedFunctions = [];
const changedMovedFunctions = [];

for (const expected of expectedMovedFunctions) {
  const current = currentFunctionsByName.get(expected.name) ?? [];
  if (current.length === 0) {
    missingMovedFunctions.push(expected);
    continue;
  }
  if (
    !current.some((implementation) => implementation.hash === expected.hash)
  ) {
    changedMovedFunctions.push({
      expected,
      current,
    });
  }
}

const report = {
  indexPath,
  baseRef,
  expectedExports: expectedExports.length,
  currentExports: currentExports.length,
  barrelOnly: currentBarrel.invalidStatements.length === 0,
  invalidStatements: currentBarrel.invalidStatements,
  duplicateCurrentExports,
  surfaceDiff: currentDiff,
  reconciledExportOwnership: EXPECTED_EXPORT_RECONCILIATION_REASONS,
  invalidReconciliationReasons,
  checkedInExpectedDiff,
  moduleResolution: {
    unresolvedModules,
    missingModuleExports,
  },
  movedFunctionImplementations: {
    expected: expectedMovedFunctions.length,
    missing: missingMovedFunctions,
    changed: changedMovedFunctions,
  },
};

console.log(JSON.stringify(report, null, 2));

const failed =
  currentBarrel.invalidStatements.length > 0 ||
  duplicateCurrentExports.length > 0 ||
  currentDiff.missing.length > 0 ||
  currentDiff.added.length > 0 ||
  invalidReconciliationReasons.length > 0 ||
  checkedInExpectedDiff.missing.length > 0 ||
  checkedInExpectedDiff.added.length > 0 ||
  unresolvedModules.length > 0 ||
  missingModuleExports.length > 0 ||
  missingMovedFunctions.length > 0 ||
  changedMovedFunctions.length > 0;

process.exitCode = failed ? 1 : 0;
