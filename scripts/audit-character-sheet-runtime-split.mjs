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
  "CharacterSheetArcaneRecoveryRestRouteResult",
  "CharacterSheetArcaneRecoverySlotRefund",
  "CharacterSheetArmorClassBaseChoice",
  "CharacterSheetArmorClassProjection",
  "CharacterSheetArmorClassProjectionRoute",
  "CharacterSheetArmorClassStateInput",
  "CharacterSheetBookOfShadowsPresence",
  "CharacterSheetBookOfShadowsRitualInvocation",
  "CharacterSheetClassFeaturePreparedSpellAccess",
  "CharacterSheetClassFeatureSelectedReferenceProjection",
  "CharacterSheetClassFeatureSelectedReferenceProjectionRoute",
  "CharacterSheetCompanion",
  "CharacterSheetCompanionCreatureTypeOverride",
  "CharacterSheetCompanionFormSelection",
  "CharacterSheetCondition",
  "CharacterSheetConstructionIssue",
  "CharacterSheetConstructionIssueSchema",
  "CharacterSheetConstructionIssuesSchema",
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
  "CharacterSheetHitPointMaximumProjection",
  "CharacterSheetHitPointMaximumProjectionRoute",
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
  "CharacterSheetLayOnHandsRoute",
  "CharacterSheetLayOnHandsRouteResult",
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
  "CharacterSheetRebuildInput",
  "CharacterSheetResourceExpenditure",
  "CharacterSheetResourceState",
  "CharacterSheetRouteEvent",
  "CharacterSheetRouteFact",
  "CharacterSheetRouteFill",
  "CharacterSheetRouteHole",
  "CharacterSheetRouteOwner",
  "CharacterSheetRouteSubject",
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
  "CharacterSheetSpellbookRitualInvocationProjection",
  "CharacterSheetSpellbookRitualInvocationRoute",
  "CharacterSheetSpentHitDiePool",
  "CharacterSheetStableRecovery",
  "CharacterSheetTimePassedInput",
  "CharacterSheetUseCountResourceUnitId",
  "CharacterSheetWeaponMasteryReselection",
  "CharacterSheetWeaponMasteryReselectionAcceptedRoute",
  "CharacterSheetWeaponMasteryReselectionRejectedRoute",
  "CharacterSheetWeaponMasteryReselectionRouteResult",
  "CharacterSheetWeaponMasterySelectedReferenceProjection",
  "CharacterSheetWeaponMasterySelectedReferenceProjectionRoute",
  "CharacterSheetZeroHpLifecycle",
  "CharacterSheetZeroHpLifecycleInput",
  "CharacterSpellSlotExpenditure",
  "FreshCharacterSheet",
  "FreshCharacterSheetProjection",
  "FreshCharacterSheetProjectionSchema",
  "FreshNonSpellcastingCharacterSheet",
  "FreshSpellcastingCharacterSheet",
  "applyCharacterSheetSpellRestBenefit",
  "applyLayOnHands",
  "applyLayOnHandsWithRoute",
  "characterBuildHasSpellbookSpell",
  "characterSheetAbilityCheckAbility",
  "characterSheetAbilityCheckProficiencyBonus",
  "characterSheetAbilityCheckProficiencyBonusProjection",
  "characterSheetArmorClass",
  "characterSheetArmorClassProjection",
  "characterSheetArmorClassState",
  "characterSheetUnarmoredArmorClassBase",
  "characterSheetClassFeaturePreparedSpellAccessesForBuild",
  "characterSheetClassFeatureSelectedReferenceProjection",
  "characterSheetCompanion",
  "characterSheetConstructionIssuesSummary",
  "characterSheetCurrentHp",
  "characterSheetDruidCircleLandPreparedSpellAccess",
  "characterSheetDruidWildShapeKnownForms",
  "characterSheetHitDice",
  "characterSheetHitPointMaximum",
  "characterSheetHitPointMaximumProjection",
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
  "parseCharacterSheetRetainedCompanionCurrentHitPoints",
  "parseCharacterSheetRetainedCompanionId",
  "characterSheetSpellInvocation",
  "characterSheetSpellSlotSourceState",
  "characterSheetSpellSlots",
  "characterSheetSpellbookRitualAccess",
  "characterSheetSpellbookRitualAccessesForBuild",
  "characterSheetSpellbookRitualInvocationProjection",
  "characterSheetWeaponMasterySelectedReferenceProjection",
  "characterSheetTempHp",
  "completeLongRest",
  "completeLongRestArcaneRecoveryResetWithRoute",
  "completeLongRestWeaponMasteryReselectionWithRoute",
  "completeMagicalCunningRite",
  "completeShortRest",
  "completeShortRestArcaneRecoveryWithRoute",
  "convertFontOfMagicSorceryPointsToSpellSlot",
  "convertFontOfMagicSpellSlotToSorceryPoints",
  "createFreshCharacterSheet",
  "createRetainedFamiliarLikeCompanion",
  "finishLongRest",
  "finishShortRest",
  "freshCharacterSheetProjection",
  "interruptLongRest",
  "interruptShortRest",
  "isCharacterSheetPointPoolResourceUnitId",
  "isCharacterSheetUseCountResourceUnitId",
  "isFreshSpellcastingCharacterSheet",
  "parseCharacterSheet",
  "replaceOrdinarySpellSlotExpenditure",
  "replaceCharacterSheetSpellSlotSourceState",
  "replaceCharacterSheetCompanion",
  "rebuildCharacterSheet",
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
    hash: "9dcc9ec27771c3e7",
  },
];
const EXPECTED_EXPORT_RECONCILIATION_REASONS = [
  {
    name: "CharacterSheetRebuildInput",
    reason:
      "Character Sheet owns durable mutable-state reconstruction; exporting its input type requires callers to provide one explicit companion-state variant instead of treating omitted fresh-construction input as durable empty state.",
  },
  {
    name: "parseCharacterSheetRetainedCompanionCurrentHitPoints",
    reason:
      "Character Sheet owns the retained-companion Hit Point boundary; exporting its positive-current-HP parser lets battle handoff callers carry the branded fact without unsafe assertions or duplicated validation.",
  },
  {
    name: "characterSheetNormalHitPointMaximum",
    reason:
      "Character Sheet owns HP maximum projections from build facts and mutable maximum-reduction state; exposing the normal maximum keeps callers from storing derived capacity beside the sheet source facts.",
  },
  {
    name: "characterSheetHitPointMaximumProjection",
    reason:
      "Character Sheet owns effective Hit Point Maximum projection from build-derived normal maximum and sheet-owned maximum reduction; exposing the projection-with-route entrypoint lets route replay observe qRoute without adapter-local route assembly.",
  },
  {
    name: "CharacterSheetHitPointMaximumProjection",
    reason:
      "Character Sheet owns the typed Hit Point Maximum projection result so normal maximum, effective maximum, maximum reduction, and qRoute evidence remain one public projection outcome without adding durable duplicate state.",
  },
  {
    name: "CharacterSheetHitPointMaximumProjectionRoute",
    reason:
      "Character Sheet owns the Hit Point projection and build arithmetic-input fact-recording route shape; exporting it keeps the route event tuple typed at the projection boundary.",
  },
  {
    name: "replaceOrdinarySpellSlotExpenditure",
    reason:
      "Character Sheet owns ordinary Spell Slot expenditure state; battle handoff settlement reuses this canonical updater instead of duplicating the replacement/sort convention in character-battle-runtime.",
  },
  {
    name: "characterSheetAbilityCheckProficiencyBonusProjection",
    reason:
      "Character Sheet owns Ability Check Proficiency Bonus projection from build facts; exposing the projection-with-route entrypoint lets route replay observe the qRoute event without maintaining an adapter-local route projection.",
  },
  {
    name: "characterSheetArmorClassProjection",
    reason:
      "Character Sheet owns Armor Class projection from build, loadout, armor training, ability scores, and Surface Unit mechanics; exposing the projection-with-route entrypoint lets route replay observe selected-reference and Armor Class qRoute events without maintaining an adapter-local route projection.",
  },
  {
    name: "characterSheetUnarmoredArmorClassBase",
    reason:
      "Character Sheet owns Armor Class base projection from build facts and effective Shield use; battle handoff reuses that projection for encounter-time equipment custody without copying class-feature formula logic.",
  },
  {
    name: "CharacterSheetArmorClassProjection",
    reason:
      "Character Sheet owns the typed Armor Class projection-with-route result so derived Armor Class state and qRoute evidence remain explicit without adding duplicated durable sheet state.",
  },
  {
    name: "CharacterSheetArmorClassProjectionRoute",
    reason:
      "Character Sheet owns the Armor Class selected-reference retention and build-projection route shape; exporting it keeps the route event tuple typed at the projection boundary.",
  },
  {
    name: "characterSheetClassFeatureSelectedReferenceProjection",
    reason:
      "Character Sheet owns selected class-feature and subclass reference projection from existing sheet build facts; exposing the projection-with-route entrypoint lets route replay observe selected-reference qRoute events without maintaining an adapter-local route projection.",
  },
  {
    name: "CharacterSheetClassFeatureSelectedReferenceProjection",
    reason:
      "Character Sheet owns the typed class-feature selected-reference projection result so retained reference evidence and qRoute events remain explicit without adding duplicated durable sheet state.",
  },
  {
    name: "CharacterSheetClassFeatureSelectedReferenceProjectionRoute",
    reason:
      "Character Sheet owns the selected-reference retention and selected-reference build-projection route shape; exporting it keeps the route event tuple typed at the projection boundary.",
  },
  {
    name: "completeShortRestArcaneRecoveryWithRoute",
    reason:
      "Character Sheet owns Arcane Recovery Short Rest ordinary Spell Slot refund and Pact Slot rejection routing; exposing the rest-with-route entrypoint lets route replay observe qRoute without duplicating rest reducer state.",
  },
  {
    name: "completeLongRestArcaneRecoveryResetWithRoute",
    reason:
      "Character Sheet owns Long Rest reset for ordinary Spell Slots, Pact Slots, and Arcane Recovery use lockout; exposing the reset-with-route entrypoint lets route replay observe qRoute from the public rest reducer path.",
  },
  {
    name: "CharacterSheetArcaneRecoveryRestRouteResult",
    reason:
      "Character Sheet owns the typed result returned by Arcane Recovery rest-with-route entrypoints so accepted and rejected route projections remain explicit rather than adapter-local.",
  },
  {
    name: "characterSheetSpellbookRitualInvocationProjection",
    reason:
      "Character Sheet owns spellbook Ritual invocation projection from build spellbook Spell Access and Surface ritual facts; exposing the projection-with-route entrypoint lets route replay observe selected-reference qRoute without adapter-local route assembly.",
  },
  {
    name: "CharacterSheetSpellbookRitualInvocationProjection",
    reason:
      "Character Sheet owns the typed spellbook Ritual invocation projection result so accepted no-slot invocation and rejected projection-choice route evidence remain one public outcome without adding durable ritual-casting state.",
  },
  {
    name: "CharacterSheetSpellbookRitualInvocationRoute",
    reason:
      "Character Sheet owns the spellbook Ritual selected-reference retention and spell-resource projection route shape; exporting it keeps the route event tuple typed at the projection boundary.",
  },
  {
    name: "characterSheetWeaponMasterySelectedReferenceProjection",
    reason:
      "Character Sheet owns Weapon Mastery selected-reference projection from CharacterBuild selected class choices and Surface Weapon Mastery profile facts; exposing the projection-with-route entrypoint lets route replay observe selected-reference qRoute without adapter-local route assembly.",
  },
  {
    name: "completeLongRestWeaponMasteryReselectionWithRoute",
    reason:
      "Character Sheet owns Long Rest Weapon Mastery reselection through completeLongRest; exposing the route wrapper lets route replay observe accepted and rejected selected-reference qRoute without duplicating reselection state.",
  },
  {
    name: "CharacterSheetWeaponMasterySelectedReferenceProjection",
    reason:
      "Character Sheet owns the typed Weapon Mastery selected-reference projection so choice count, eligible weapons, selected weapon refs, and qRoute evidence remain derived from build and Surface facts without adding durable sheet state.",
  },
  {
    name: "CharacterSheetWeaponMasterySelectedReferenceProjectionRoute",
    reason:
      "Character Sheet owns the Weapon Mastery selected-reference retention and build-facts projection route shape; exporting it keeps the route event tuple typed at the projection boundary.",
  },
  {
    name: "CharacterSheetWeaponMasteryReselectionRouteResult",
    reason:
      "Character Sheet owns accepted/rejected Long Rest Weapon Mastery reselection route evidence so callers can consume qRoute alongside the typed completion result without storing a parallel reselection ledger.",
  },
  {
    name: "CharacterSheetWeaponMasteryReselectionAcceptedRoute",
    reason:
      "Character Sheet owns the accepted Long Rest Weapon Mastery selected-reference route tuple, including retained selected refs and rest completion evidence.",
  },
  {
    name: "CharacterSheetWeaponMasteryReselectionRejectedRoute",
    reason:
      "Character Sheet owns the rejected Long Rest Weapon Mastery selected-reference route tuple, including the projection-choice hole for invalid reselections.",
  },
  {
    name: "applyLayOnHandsWithRoute",
    reason:
      "Character Sheet owns Lay On Hands pool spend, Hit Point restoration, and Poisoned removal routing; exposing the reducer route result lets replay observe qRoute from the public feature-resource owner path instead of adapter-local route assembly.",
  },
  {
    name: "CharacterSheetLayOnHandsRoute",
    reason:
      "Character Sheet owns the Lay On Hands resource-spend, Hit Point projection, and feature-resource fact-recording route tuple; exporting it keeps the route event sequence typed at the owner boundary.",
  },
  {
    name: "CharacterSheetLayOnHandsRouteResult",
    reason:
      "Character Sheet owns the typed Lay On Hands result returned with qRoute evidence so source, target, and route projection remain one public reducer outcome.",
  },
  {
    name: "CharacterSheetRouteEvent",
    reason:
      "Character Sheet owns its reducer route-event vocabulary; exporting it avoids parallel route event structures in public route projection entrypoints.",
  },
  {
    name: "CharacterSheetRouteSubject",
    reason:
      "Character Sheet owns its route subject vocabulary; exporting it keeps route projections typed at the owner boundary instead of stringly adapter-local.",
  },
  {
    name: "CharacterSheetRouteHole",
    reason:
      "Character Sheet owns its route hole vocabulary; exporting it keeps recovery-choice holes typed in route projection results.",
  },
  {
    name: "CharacterSheetRouteFill",
    reason:
      "Character Sheet owns its route fill vocabulary; exporting it keeps recovery-selection fills typed in route projection results.",
  },
  {
    name: "CharacterSheetRouteOwner",
    reason:
      "Character Sheet owns its route owner vocabulary; exporting it makes Spell Slot, Pact Slot, and Feature Resource ownership explicit in route projection results.",
  },
  {
    name: "CharacterSheetRouteFact",
    reason:
      "Character Sheet owns its route fact vocabulary; exporting it keeps future fact-recording route projections on the same typed surface.",
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
