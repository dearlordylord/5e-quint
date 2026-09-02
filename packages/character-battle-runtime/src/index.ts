// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS CHARACTER.LIFECYCLE.LAYER_PROJECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import {
  combatantKnockedOutUnconscious,
  admitResourceFeature,
  combatantHasActiveDruidWildShape,
  classFeatureSpellFreeCastProfileForResource,
  characterBattleResourceIsPointPool,
  characterBattleResourceForUnit,
  characterBattleResourceMaxPointsForExecutionFacts,
  characterBattleResourceMaxUsesForExecutionFacts,
  characterBattleResourceSupportedForUnit,
  resourceFeatureExecutionFacts,
  type BattleCreatureState,
  type BattleStateInitIssue,
  type BattleRuntimeSession,
  type CombatantId,
  type CharacterBattleResourceOwnership,
  type CharacterBattleResourceState,
  type CharacterBattleResourceExecutionFacts,
  type CharacterBattlePointPoolResourceState,
  type ResourceFeatureAdmission,
  type CharacterBattleClassLevels,
  type CharacterBattleRuntimeContext,
  battleStateInitIssueMessage,
} from "@dnd/battle-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  rebuildCharacterSheet,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
  replaceCharacterSheetSpellSlotSourceState,
  replaceOrdinarySpellSlotExpenditure,
  type CharacterPactSlotExpenditure,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetPactSlotState,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetResourceState,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  type Condition,
  type Hp,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Result, Match } from "effect";

import {
  CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE,
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import {
  type BattleCreatureInitIssue,
  battleCreatureInitIssueMessage,
} from "./battle-character-build-projection.ts";
import {
  characterSheetBattleHandoffCombatantMissing,
  characterSheetBattleHandoffIssuesFromStateInit,
  characterSheetBattleHandoffIssue,
  characterSheetBattleHandoffIssueFromIssue,
  type CharacterSheetBattleHandoffValidationCheck,
  type CharacterSheetBattleHandoffIssue,
} from "./battle-handoff-issue.ts";
import {
  enterBattleRuntimeRoute,
  projectCharacterSheetToBattleRoute,
  recordCharacterBattleHandoffFactsRoute,
  type CharacterBattleRouteEvent,
} from "./character-battle-route.ts";
import { settleCompanionFromBattle } from "./companion-handoff.ts";
import {
  characterBattleInitProjectionFromInit,
  hasMixedSpellAndPactSlotState,
  mixedSpellAndPactSlotStateMessage,
  rejectBuildHitPointBattleInitRoute,
  rejectCharacterBattleInitProjectionRoute,
  unsupportedStableRecoveryBattleBoundary,
  type CharacterBattleInitProjection,
  type CharacterBattleInitProjectionIssue,
} from "./character-sheet-battle-init.ts";

function characterBattleHandoffValidationIssue(
  check: CharacterSheetBattleHandoffValidationCheck,
  message: string,
): Result.Result<never, CharacterSheetBattleHandoffIssue> {
  return characterSheetBattleHandoffIssue(
    { handoffReason: "validation", check },
    message,
  );
}

export type CharacterBattleRuntimeIssue =
  | BattleCreatureInitIssue
  | BattleStateInitIssue;

export function characterBattleRuntimeIssueMessage(
  issue: CharacterBattleRuntimeIssue,
): string {
  return issue.tag === "battleCreatureInitIssues"
    ? battleCreatureInitIssueMessage(issue)
    : issue.tag === "battleCreatureInitIssue" ||
        issue.tag === "characterBattleSpellAccessProjectionIssue"
      ? issue.message
      : battleStateInitIssueMessage(issue);
}

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-sorcery-points-to-spell-slot
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
export {
  battleCreatureInitFromCharacterBuild,
  characterBattleInitiativeScore,
  characterBattleResourceInitsFromBuild,
  type CharacterBattleInitiativeProficiencyChoice,
  type CharacterBuildCreatureInput,
  type CharacterSheetBattleInit,
  type CharacterSheetBattleInitInput,
} from "./battle-creature-init.ts";
export {
  battleCreatureInitIssue,
  characterBattleInitIssueFactFields,
  characterBattleInitIssueReasonFromFact,
  battleCreatureInitIssueFromLeaves,
  battleCreatureInitIssuesFromMessages,
  battleCreatureInitIssueLeaves,
  battleCreatureInitIssueMessage,
  battleCreatureInitIssues,
  characterArmorClassState,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleLoadoutFromBuild,
  characterOffHandAttackActionOption,
  characterSpellcasting,
  getRequiredUnit,
  type BattleCreatureInitIssue,
  type BattleCreatureInitIssueLeaf,
  type BattleCreatureInitLeafIssue,
  type CharacterBattleInitIssueFact,
  type CharacterBattleInitIssueReason,
  type CharacterBattleSpellAccessProjectionIssue,
  type CharacterBattleRuntimeIssueMessage,
} from "./battle-character-build-projection.ts";
export {
  characterBattleSupportProjection,
  characterBattleWeaponMasterySelections,
  type CharacterBattleSupportProjection,
  type BattleSupportProfileIssue,
} from "./battle-support-profiles.ts";
export type {
  CharacterSheetBattleHandoffFact,
  CharacterSheetBattleHandoffIssue,
  CharacterSheetBattleHandoffValidationCheck,
} from "./battle-handoff-issue.ts";
export {
  admitCharacterSheetCompanionToBattle,
  composeBattleCompanionRoster,
  type CharacterSheetCompanionBattleAdmissionInput,
  type BattleCompanionRosterComposition,
  type BattleCompanionRosterIssue,
  type BattleCompanionRosterOwner,
  type BattleCompanionRosterRequest,
} from "./companion-handoff.ts";
export {
  CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS,
  CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS,
  CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS,
  CHARACTER_SESSION_SHEET_DERIVED_BATTLE_ACTS_ROUTE_ACTIONS,
  CHARACTER_BATTLE_ROUTE_COMPOSITION_FACTS,
  CHARACTER_BATTLE_ROUTE_FILLS,
  CHARACTER_BATTLE_ROUTE_HANDOFF_FACTS,
  CHARACTER_BATTLE_ROUTE_HOLES,
  CHARACTER_BATTLE_ROUTE_OWNERS,
  CHARACTER_BATTLE_ROUTE_SUBJECTS,
  appendCharacterBattleFeatureResourceHandoffRoute,
  characterBattleSettlementRouteStep,
  characterBattleEncounterCompositionRoute,
  characterBattleEncounterCompositionRouteStep,
  characterBattleInitProjectionRouteAfter,
  characterBattleInitProjectionRouteStep,
  characterSessionSheetDerivedBattleActsRouteStep,
  composeBattleEncounterRoute,
  enterBattleRuntimeRoute,
  initialCharacterBattleFeatureResourceHandoffRoute,
  initialCharacterBattleEncounterCompositionRoute,
  initialCharacterBattleInitProjectionRoute,
  initialCharacterBattleSettlementRoute,
  initialCharacterSessionSheetDerivedBattleActsRoute,
  projectCharacterSheetToBattleRoute,
  recordCharacterBattleHandoffFactsRoute,
  rejectCharacterBattleHandoffRoute,
  settleBattleToCharacterSheetRoute,
  type CharacterBattleEncounterCompositionRouteAction,
  type CharacterBattleInitProjectionRouteAction,
  type CharacterBattleRouteCompositionFact,
  type CharacterBattleRouteEvent,
  type CharacterBattleRouteFill,
  type CharacterBattleRouteHandoffFact,
  type CharacterBattleRouteHole,
  type CharacterBattleRouteOwner,
  type CharacterBattleRouteSubject,
  type CharacterBattleFeatureResourceRouteObservation,
  type CharacterBattleSettlementRouteAction,
  type CharacterSessionSheetDerivedBattleActsRouteAction,
} from "./character-battle-route.ts";
export { type CharacterBattleOriginFeatSelectedReferenceProjection } from "./origin-feat-selected-reference-projection.ts";

export {
  composeBattleRoster,
  type BattleRosterAdmission,
  type BattleRosterCharacterCombatant,
  type BattleRosterCharacterSource,
  type BattleRosterComposition,
  type BattleRosterEntries,
  type BattleRosterEntry,
  type BattleRosterIssue,
  type BattleRosterStatBlockCombatant,
  type BattleRosterStatBlockSource,
} from "./battle-roster-composition.ts";
export {
  characterSheetBattleInit,
  characterSheetBattleInitWithRoute,
  type CharacterBattleInitProjection,
  type CharacterBattleInitProjectionIssue,
} from "./character-sheet-battle-init.ts";

type CharacterBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState,
): combatant is CharacterBattleCreatureState {
  return combatant.origin.kind === "character";
}

export function battleCreatureInitFromCharacterBuildWithRoute(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): Result.Result<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  const init = battleCreatureInitFromCharacterBuild(input);
  if (Result.isFailure(init)) {
    return Result.fail({
      ...init.failure,
      routeEvents: characterBuildInitIssueRoute(init.failure),
    });
  }
  return characterBattleInitProjectionFromInit(init.success, [
    projectCharacterSheetToBattleRoute({
      subject: "sheetToBattleInit",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "sheetToBattleInit",
      facts: ["buildHitPointMaximumInput"],
      owner: "characterBattleBuildProjection",
    }),
    enterBattleRuntimeRoute({
      subject: "sheetToBattleInit",
      owner: "characterBattleInitProjection",
    }),
  ]);
}

function characterBuildInitIssueRoute(
  issue: BattleCreatureInitIssue,
): readonly CharacterBattleRouteEvent[] {
  return issue.message ===
    CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE
    ? rejectBuildHitPointBattleInitRoute()
    : rejectCharacterBattleInitProjectionRoute();
}

export function settleCharacterSheetFromBattle(input: {
  readonly sheet: CharacterSheet;
  /**
   * The nominal battle session carries the only valid state/context pairing.
   * Settlement is also used when removing a character from an active roster,
   * so the session is not required to be in a separate terminal state.
   */
  readonly battleSession: BattleRuntimeSession;
  readonly combatantId: CombatantId;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Result.Result<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const state = input.battleSession.state;
  const combatant = state.combatants.get(input.combatantId);
  if (combatant === undefined) {
    return characterSheetBattleHandoffCombatantMissing(input.combatantId);
  }
  if (!isCharacterBattleCreatureState(combatant)) {
    return characterBattleHandoffValidationIssue(
      "combatantNotCharacter",
      "Battle handoff combatant is not a character.",
    );
  }
  const runtimeContext = input.battleSession.context.characters.get(
    combatant.combatantId,
  );
  if (runtimeContext === undefined) {
    return characterBattleHandoffValidationIssue(
      "runtimeContextMissing",
      "Battle handoff character has no authored runtime ownership context.",
    );
  }
  const settledCharacter = settleBattleCombatantIntoCharacterSheet({
    ...input,
    combatant,
    runtimeContext,
  });
  if (Result.isFailure(settledCharacter)) return settledCharacter;
  return settleCompanionFromBattle({
    sheet: settledCharacter.success,
    state,
    ownerCombatantId: combatant.combatantId,
    unitLibrary: input.unitLibrary,
    ...(runtimeContext.retainedCompanionSelection === undefined
      ? {}
      : {
          retainedCompanionSelection: runtimeContext.retainedCompanionSelection,
        }),
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
}

function validateBattleCombatantForCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<Hp, CharacterSheetBattleHandoffIssue> {
  if (input.combatant.origin.characterId !== input.sheet.characterId) {
    return characterBattleHandoffValidationIssue(
      "characterIdentityMismatch",
      "Battle handoff character identity does not match Character Sheet.",
    );
  }
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(hitPointMaximum)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(hitPointMaximum.failure),
    );
  }
  if (input.combatant.maxHp !== hitPointMaximum.success) {
    return characterBattleHandoffValidationIssue(
      "maximumHitPointMismatch",
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > hitPointMaximum.success) {
    return characterBattleHandoffValidationIssue(
      "currentHitPointsExceedMaximum",
      "Battle handoff current HP exceeds Character Sheet maximum HP.",
    );
  }
  if (hasMixedSpellAndPactSlotState(input.sheet)) {
    return characterBattleHandoffValidationIssue(
      "mixedSpellAndPactSlotState",
      mixedSpellAndPactSlotStateMessage,
    );
  }
  if (combatantHasActiveDruidWildShape(input.combatant)) {
    return characterBattleHandoffValidationIssue(
      "activeDruidWildShape",
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
    );
  }
  if (combatantHasActiveBattleLocalState(input.combatant)) {
    return characterBattleHandoffValidationIssue(
      "activeBattleLocalState",
      "Battle handoff while active battle effects or Concentration are present is blocked; end or resolve battle-local effects before Character Sheet handoff.",
    );
  }
  return Result.succeed(hitPointMaximum.success);
}

function settleBattleCombatantIntoCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): Result.Result<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const validatedHitPointMaximum = validateBattleCombatantForCharacterSheet({
    sheet: input.sheet,
    combatant: input.combatant,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(validatedHitPointMaximum)) {
    return Result.fail(validatedHitPointMaximum.failure);
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Result.isFailure(zeroHpLifecycle)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(zeroHpLifecycle.failure),
    );
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Result.isFailure(knockedOut)) {
    const [firstIssue] = characterSheetBattleHandoffIssuesFromStateInit(
      knockedOut.failure,
    );
    return Result.fail(firstIssue);
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Result.isFailure(resourceExpenditures)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(resourceExpenditures.failure),
    );
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);
  const druidWildShapeKnownForms = characterSheetDruidWildShapeKnownForms(
    input.sheet,
  );
  const spellSlotState = characterSheetSpellSlotSourceStateFromBattle(input);
  if (Result.isFailure(spellSlotState)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(spellSlotState.failure),
    );
  }
  const pactSlotExpenditure =
    pactSlots === undefined
      ? Result.succeed(undefined)
      : characterSheetPactSlotExpenditureFromBattle(input, pactSlots);
  if (Result.isFailure(pactSlotExpenditure)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(pactSlotExpenditure.failure),
    );
  }

  const sheet = rebuildCharacterSheet({
    characterId: input.sheet.characterId,
    build: input.sheet.build,
    hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
    currentHp: input.combatant.hp,
    tempHp: input.combatant.tempHp,
    conditions: characterSheetConditionsFromBattle(input.combatant),
    unitLibrary: input.unitLibrary,
    ...(knockedOut.success === null
      ? {}
      : {
          positiveHpUnconscious:
            characterSheetPositiveHpUnconsciousFromBattle(),
        }),
    ...(input.combatant.hp === 0 && zeroHpLifecycle !== undefined
      ? { zeroHpLifecycle: zeroHpLifecycle.success }
      : {}),
    ...(pactSlotExpenditure.success === undefined
      ? {}
      : { pactSlots: pactSlotExpenditure.success }),
    ...(bookOfShadowsPresence === undefined ? {} : { bookOfShadowsPresence }),
    ...(druidWildShapeKnownForms === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            druidWildShapeKnownForms.statBlockIds,
        }),
    spentHitDice: input.sheet.spentHitDice,
    restFeatureUses: input.sheet.restFeatureUses,
    resourceExpenditures: resourceExpenditures.success,
    companion: input.sheet.companion,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  if (Result.isFailure(sheet)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(sheet.failure),
    );
  }
  if (spellSlotState.success === undefined)
    return Result.succeed(sheet.success);
  const replaced = replaceCharacterSheetSpellSlotSourceState({
    sheet: sheet.success,
    unitLibrary: input.unitLibrary,
    spellSlotState: spellSlotState.success,
  });
  return Result.isFailure(replaced)
    ? Result.fail(characterSheetBattleHandoffIssueFromIssue(replaced.failure))
    : Result.succeed(replaced.success);
}

function characterSheetSpellSlotSourceStateFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
}): Result.Result<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetBattleHandoffIssue
> {
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Result.succeed(undefined);
  }
  const sheetSpellSlots = characterSheetSpellSlots(input.sheet);
  const sheetSlotState = characterSheetSpellSlotSourceState(input.sheet);
  if (
    characterSheetPactSlots(input.sheet) !== undefined &&
    (sheetSpellSlots === undefined || sheetSpellSlots.length === 0)
  ) {
    return Result.succeed(undefined);
  }
  if (sheetSpellSlots === undefined || sheetSlotState === undefined) {
    return battleSpellcasting.spellSlots.length === 0
      ? Result.succeed(undefined)
      : characterBattleHandoffValidationIssue(
          "spellSlotStateMissing",
          "Battle handoff Spell Slot state requires Character Sheet Spell Slot or Pact Slot state.",
        );
  }

  const battleLevels = new Set<number>();
  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (battleLevels.has(battleSlot.spellLevel)) {
      return characterBattleHandoffValidationIssue(
        "duplicateBattleSpellSlotLevel",
        "Battle handoff Spell Slot state must not duplicate spell levels.",
      );
    }
    battleLevels.add(battleSlot.spellLevel);
    if (battleSlot.expended > battleSlot.count) {
      return characterBattleHandoffValidationIssue(
        "battleSpellSlotExpenditureExceedsCount",
        "Battle handoff Spell Slot expenditure must not exceed its count.",
      );
    }
  }

  let ordinarySpellSlotExpenditures =
    sheetSlotState.ordinarySpellSlotExpenditures;
  let createdSpellSlots = sheetSlotState.createdSpellSlots;
  for (const sheetSlot of sheetSpellSlots) {
    const battleSlot = battleSpellcasting.spellSlots.find(
      (candidate) => candidate.spellLevel === sheetSlot.spellLevel,
    );
    if (battleSlot === undefined || battleSlot.count !== sheetSlot.count) {
      return characterBattleHandoffValidationIssue(
        "battleSpellSlotCapacityMismatch",
        "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      );
    }
    if (battleSlot.expended < sheetSlot.expended) {
      return characterBattleHandoffValidationIssue(
        "battleSpellSlotExpenditureRegressed",
        "Battle handoff Spell Slot expenditure cannot be lower than the pre-battle Character Sheet expenditure.",
      );
    }
    const delta = resourceCount(battleSlot.expended - sheetSlot.expended);
    if (delta === 0) continue;

    const sourceSpend = spellSlotSourceSpendForBattleDelta({
      spellLevel: sheetSlot.spellLevel,
      delta,
      totalCount: sheetSlot.count,
      ordinarySpellSlotExpenditures,
      createdSpellSlots,
    });
    if (Result.isFailure(sourceSpend)) return Result.fail(sourceSpend.failure);
    ordinarySpellSlotExpenditures =
      sourceSpend.success.ordinarySpellSlotExpenditures;
    createdSpellSlots = sourceSpend.success.createdSpellSlots;
  }

  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (
      !sheetSpellSlots.some(
        (sheetSlot) => sheetSlot.spellLevel === battleSlot.spellLevel,
      )
    ) {
      return characterBattleHandoffValidationIssue(
        "battleSpellSlotLevelMismatch",
        "Battle handoff Spell Slot state must match Character Sheet Spell Slot levels.",
      );
    }
  }

  return Result.succeed({
    ordinarySpellSlotExpenditures,
    createdSpellSlots,
  });
}

function spellSlotSourceSpendForBattleDelta(input: {
  readonly spellLevel: SpellSlotLevel;
  readonly delta: ResourceCount;
  readonly totalCount: ResourceCount;
  readonly ordinarySpellSlotExpenditures: CharacterSheetSpellSlotSourceState["ordinarySpellSlotExpenditures"];
  readonly createdSpellSlots: CharacterSheetSpellSlotSourceState["createdSpellSlots"];
}): Result.Result<
  CharacterSheetSpellSlotSourceState,
  CharacterSheetBattleHandoffIssue
> {
  const ordinaryExpenditure = input.ordinarySpellSlotExpenditures.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdSlot = input.createdSpellSlots.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdCount = createdSlot?.count ?? resourceCount(0);
  const ordinaryCount = resourceCount(input.totalCount - createdCount);
  const ordinaryExpended = ordinaryExpenditure?.expended ?? resourceCount(0);
  const createdExpended = createdSlot?.expended ?? resourceCount(0);
  const ordinaryAvailable = ordinaryCount - ordinaryExpended;
  const createdAvailable = createdCount - createdExpended;
  const minimumCreatedSpend = Math.max(0, input.delta - ordinaryAvailable);
  const maximumCreatedSpend = Math.min(input.delta, createdAvailable);
  if (minimumCreatedSpend > maximumCreatedSpend) {
    return characterBattleHandoffValidationIssue(
      "battleSpellSlotExpenditureExceedsAvailable",
      "Battle handoff Spell Slot expenditure exceeds available Character Sheet Spell Slots.",
    );
  }
  if (minimumCreatedSpend < maximumCreatedSpend) {
    return characterSheetBattleHandoffIssue(
      {
        handoffReason: "spellSlotSourceAmbiguous",
        spellLevel: input.spellLevel,
      },
      `Battle handoff Spell Slot expenditure is source-ambiguous for level ${input.spellLevel}.`,
    );
  }
  const createdSpend = resourceCount(minimumCreatedSpend);
  const ordinarySpend = resourceCount(input.delta - createdSpend);
  return Result.succeed({
    ordinarySpellSlotExpenditures:
      ordinarySpend === 0
        ? input.ordinarySpellSlotExpenditures
        : replaceOrdinarySpellSlotExpenditure({
            expenditures: input.ordinarySpellSlotExpenditures,
            spellLevel: input.spellLevel,
            expended: resourceCount(ordinaryExpended + ordinarySpend),
          }),
    createdSpellSlots:
      createdSpend === 0
        ? input.createdSpellSlots
        : input.createdSpellSlots.map((slot) =>
            slot.spellLevel === input.spellLevel
              ? {
                  ...slot,
                  expended: resourceCount(slot.expended + createdSpend),
                }
              : slot,
          ),
  });
}

function characterResourceExpendituresFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): Result.Result<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetBattleHandoffIssue
> {
  const sheetResources = characterSheetResources(
    input.sheet,
    input.unitLibrary,
  );
  if (Result.isFailure(sheetResources)) {
    return Result.fail(
      characterSheetBattleHandoffIssueFromIssue(sheetResources.failure),
    );
  }
  const origin = input.combatant.origin;
  const ownedBattleResources = characterBattleResourcesWithOwnership({
    resources: origin.resources,
    ownership: input.runtimeContext.resourceOwnership,
  });
  if (Result.isFailure(ownedBattleResources)) {
    return Result.fail(ownedBattleResources.failure);
  }
  const battleResources = ownedBattleResources.success;
  const classOwnership = validateCharacterBattleResourceClassOwnership({
    resources: battleResources,
    classLevels: origin.classLevels,
  });
  if (Result.isFailure(classOwnership)) {
    return Result.fail(classOwnership.failure);
  }
  const wildShapeResource =
    druidWildShapeBattleResourceProjection(battleResources);
  if (Result.isFailure(wildShapeResource)) {
    return Result.fail(wildShapeResource.failure);
  }
  const { battleUseCountResourceUnitIds, battlePointPoolResourceUnitIds } =
    characterBattleResourceUnitIds({
      resources: battleResources,
      wildShapeResource: wildShapeResource.success,
    });
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      retainedCharacterSheetResourceExpenditure(
        expenditure,
        battleUseCountResourceUnitIds,
        battlePointPoolResourceUnitIds,
      ),
  );
  const druidWildShapeExpenditure = druidWildShapeResourceExpenditureFromBattle(
    {
      combatant: input.combatant,
      sheetResources: sheetResources.success,
      wildShapeResource: wildShapeResource.success,
    },
  );
  if (Result.isFailure(druidWildShapeExpenditure)) {
    return Result.fail(druidWildShapeExpenditure.failure);
  }
  const battleExpenditures = characterSheetResourceExpendituresByKindFromBattle(
    {
      resources: battleResources,
      classLevels: input.combatant.origin.classLevels,
      sheetResources: sheetResources.success,
    },
  );
  if (Result.isFailure(battleExpenditures)) {
    return Result.fail(battleExpenditures.failure);
  }
  return Result.succeed([
    ...nextExpenditures,
    ...battleExpenditures.success.freeCastExpenditures,
    ...battleExpenditures.success.useCountExpenditures,
    ...battleExpenditures.success.pointPoolExpenditures,
    ...characterSheetResourceExpenditureArray(
      druidWildShapeExpenditure.success,
    ),
  ]);
}

type CharacterSheetBattleResourceExpenditure = Extract<
  CharacterSheetResourceExpenditure,
  {
    readonly tag:
      | "spellAccessFreeCast"
      | "useCountResource"
      | "pointPoolResource";
  }
>;

type CharacterSheetBattleFreeCastExpenditure = Extract<
  CharacterSheetBattleResourceExpenditure,
  { readonly tag: "spellAccessFreeCast" }
>;

type CharacterSheetBattleUseCountExpenditure = Extract<
  CharacterSheetBattleResourceExpenditure,
  { readonly tag: "useCountResource" }
>;

type CharacterSheetBattlePointPoolExpenditure = Extract<
  CharacterSheetBattleResourceExpenditure,
  { readonly tag: "pointPoolResource" }
>;

function characterSheetResourceExpendituresByKindFromBattle(input: {
  readonly resources: readonly OwnedCharacterBattleResource[];
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  {
    readonly freeCastExpenditures: readonly CharacterSheetBattleFreeCastExpenditure[];
    readonly useCountExpenditures: readonly CharacterSheetBattleUseCountExpenditure[];
    readonly pointPoolExpenditures: readonly CharacterSheetBattlePointPoolExpenditure[];
  },
  CharacterSheetBattleHandoffIssue
> {
  const freeCastExpenditures: CharacterSheetBattleFreeCastExpenditure[] = [];
  const useCountExpenditures: CharacterSheetBattleUseCountExpenditure[] = [];
  const pointPoolExpenditures: CharacterSheetBattlePointPoolExpenditure[] = [];
  for (const resource of input.resources) {
    const expenditure = characterSheetResourceExpenditureFromBattle({
      resource,
      classLevels: input.classLevels,
      sheetResources: input.sheetResources,
    });
    if (Result.isFailure(expenditure)) {
      return Result.fail(expenditure.failure);
    }
    if (expenditure.success === null) continue;
    Match.value(expenditure.success).pipe(
      Match.discriminatorsExhaustive("tag")({
        spellAccessFreeCast: (value) => freeCastExpenditures.push(value),
        useCountResource: (value) => useCountExpenditures.push(value),
        pointPoolResource: (value) => pointPoolExpenditures.push(value),
      }),
    );
  }
  return Result.succeed({
    freeCastExpenditures,
    useCountExpenditures,
    pointPoolExpenditures,
  });
}

function validateCharacterBattleResourceClassOwnership(input: {
  readonly resources: readonly OwnedCharacterBattleResource[];
  readonly classLevels: CharacterBattleClassLevels;
}): Result.Result<void, CharacterSheetBattleHandoffIssue> {
  for (const resource of input.resources) {
    const unit = resource.ownership.unit;
    if (
      resource.tag === "unitResource" &&
      unit.kind === "class_feature" &&
      !input.classLevels.some(
        (classLevel) => classLevel.className === unit.className,
      )
    ) {
      return characterBattleHandoffValidationIssue(
        "classFeatureResourceClassLevelMissing",
        "Class feature battle resources require a matching class level during battle handoff.",
      );
    }
  }
  return Result.succeed(undefined);
}

function characterBattleResourceUnitIds(input: {
  readonly resources: readonly OwnedCharacterBattleResource[];
  readonly wildShapeResource: DruidWildShapeBattleResourceProjection;
}): {
  readonly battleUseCountResourceUnitIds: ReadonlySet<CharacterSheetUseCountResourceUnitId>;
  readonly battlePointPoolResourceUnitIds: ReadonlySet<CharacterSheetPointPoolResourceUnitId>;
} {
  const battleUseCountResourceUnitIds =
    new Set<CharacterSheetUseCountResourceUnitId>();
  const battlePointPoolResourceUnitIds =
    new Set<CharacterSheetPointPoolResourceUnitId>();
  for (const resource of input.resources) {
    const useCountUnitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (useCountUnitId !== null) {
      battleUseCountResourceUnitIds.add(useCountUnitId);
    }
    const pointPoolResource =
      characterBattlePointPoolResourceForSheet(resource);
    if (pointPoolResource !== null) {
      battlePointPoolResourceUnitIds.add(pointPoolResource.ownership.unit.id);
    }
  }
  if (input.wildShapeResource.tag === "present") {
    battleUseCountResourceUnitIds.add(input.wildShapeResource.unitId);
  }
  return {
    battleUseCountResourceUnitIds,
    battlePointPoolResourceUnitIds,
  };
}

function characterSheetResourceExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleResource;
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  CharacterSheetBattleResourceExpenditure | null,
  CharacterSheetBattleHandoffIssue
> {
  const freeCastExpenditure =
    characterSheetSpellAccessFreeCastExpenditureFromBattle(input);
  if (Result.isFailure(freeCastExpenditure)) {
    return Result.fail(freeCastExpenditure.failure);
  }
  if (freeCastExpenditure.success !== null) {
    return Result.succeed(freeCastExpenditure.success);
  }
  if (input.resource.tag === "spellAccessFreeCast") {
    return Result.succeed(null);
  }
  const resource = input.resource;
  const pointPoolExpenditure = characterSheetPointPoolExpenditureFromBattle({
    ...input,
    resource,
  });
  if (Result.isFailure(pointPoolExpenditure)) {
    return Result.fail(pointPoolExpenditure.failure);
  }
  return pointPoolExpenditure.success === null
    ? characterSheetUnitUseCountExpenditureFromBattle({ ...input, resource })
    : Result.succeed(pointPoolExpenditure.success);
}

function characterSheetUnitUseCountExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleUnitResource;
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  Exclude<
    CharacterSheetBattleResourceExpenditure,
    { readonly tag: "pointPoolResource" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  const profile = classFeatureSpellFreeCastProfileForResource(
    input.resource.ownership,
  );
  if (
    profile !== null &&
    !characterBattleResourceIsPointPool(input.resource.state)
  ) {
    return characterSheetClassFeatureFreeCastExpenditureFromBattle({
      ...input,
      spellId: profile.spellId,
    });
  }
  if (ownedResourceIsDruidWildShape(input.resource)) {
    return Result.succeed(null);
  }
  return characterSheetUseCountExpenditureFromBattle(input);
}

function characterSheetClassFeatureFreeCastExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleUnitResource;
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly spellId: UnitRecord["id"];
}): Result.Result<
  Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "spellAccessFreeCast" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  if (!isFixedUseCountBattleResourceState(input.resource.state)) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastCapShapeInvalid",
      "Spell Access free casts must use a fixed battle resource cap during battle handoff.",
    );
  }
  const fixedUses = input.resource.state.resource.cap.uses;
  const sheetCount = sheetFreeCastResourceCapacity({
    sheetResources: input.sheetResources,
    sourceUnitId: input.resource.ownership.unit.id,
    spellId: input.spellId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (fixedUses !== sheetCount.success) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastCapacityMismatch",
      "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended = fixedUses - input.resource.state.usesRemaining;
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastRemainingUsesInvalid",
      "Spell Access free-cast remaining uses exceed the battle resource cap during battle handoff.",
    );
  }
  return Result.succeed(
    expended === 0
      ? null
      : {
          tag: "spellAccessFreeCast",
          sourceUnitId: input.resource.ownership.unit.id,
          spellId: input.spellId,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetUseCountExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleUnitResource;
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "useCountResource" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  const unitId = characterSheetUseCountResourceUnitIdForBattleResource(
    input.resource,
  );
  if (unitId === null) return Result.succeed(null);
  const maxUses = characterBattleResourceMaxUsesForExecutionFacts({
    unit: input.resource.ownership.unit,
    resource: ownedResourceExecutionFacts(input.resource),
    classLevels: input.classLevels,
  });
  if (
    maxUses === undefined ||
    input.resource.state.usesRemaining === undefined
  ) {
    return characterBattleHandoffValidationIssue(
      "classFeatureUseCountRemainingUsesInvalid",
      "Class feature use-count resources must carry finite remaining uses during battle handoff.",
    );
  }
  if (
    !characterBattleResourceExecutionFactsEqual(
      input.resource.state.resource,
      ownedResourceExecutionFacts(input.resource),
    )
  ) {
    return characterBattleHandoffValidationIssue(
      "classFeatureUseCountCapacityMismatch",
      "Class feature use-count battle capacity must match Character Sheet resource capacity.",
    );
  }
  const sheetCount = sheetUseCountResourceCapacity({
    sheetResources: input.sheetResources,
    unitId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (maxUses !== sheetCount.success) {
    return characterBattleHandoffValidationIssue(
      "classFeatureUseCountCapacityMismatch",
      "Class feature use-count battle capacity must match Character Sheet resource capacity.",
    );
  }
  return characterSheetUseCountExpenditureFromRemainingUses({
    unitId,
    maxUses,
    usesRemaining: input.resource.state.usesRemaining,
  });
}

function characterSheetUseCountExpenditureFromRemainingUses(input: {
  readonly unitId: CharacterSheetUseCountResourceUnitId;
  readonly maxUses: ResourceCount;
  readonly usesRemaining: ResourceCount;
}): Result.Result<
  Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "useCountResource" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  const expended = Number(input.maxUses) - Number(input.usesRemaining);
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "classFeatureUseCountRemainingUsesInvalid",
      "Class feature use-count remaining uses exceed the battle resource cap during battle handoff.",
    );
  }
  return Result.succeed(
    expended === 0
      ? null
      : {
          tag: "useCountResource",
          unitId: input.unitId,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetResourceExpenditureArray(
  expenditure: CharacterSheetBattleUseCountExpenditure | undefined,
): readonly CharacterSheetBattleUseCountExpenditure[] {
  return expenditure === undefined ? [] : [expenditure];
}

function characterSheetPointPoolExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleResource;
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "pointPoolResource" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  const pointPoolResource = characterBattlePointPoolResourceForSheet(
    input.resource,
  );
  if (pointPoolResource === null) return Result.succeed(null);
  const resource = pointPoolResource;
  const pointPoolUnitId = resource.ownership.unit.id;
  const maxPoints = characterBattleResourceMaxPointsForExecutionFacts({
    unit: resource.ownership.unit,
    resource: ownedResourceExecutionFacts(resource),
    classLevels: input.classLevels,
  });
  if (maxPoints === undefined) {
    return characterBattleHandoffValidationIssue(
      "pointPoolRemainingPointsInvalid",
      "Class feature point-pool resources must carry finite remaining points during battle handoff.",
    );
  }
  if (
    !characterBattleResourceExecutionFactsEqual(
      resource.state.resource,
      ownedResourceExecutionFacts(resource),
    )
  ) {
    return characterBattleHandoffValidationIssue(
      "pointPoolCapacityMismatch",
      "Class feature point-pool battle capacity must match Character Sheet resource capacity.",
    );
  }
  const sheetCount = sheetPointPoolResourceCapacity({
    sheetResources: input.sheetResources,
    unitId: pointPoolUnitId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (maxPoints !== sheetCount.success) {
    return characterBattleHandoffValidationIssue(
      "pointPoolCapacityMismatch",
      "Class feature point-pool battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended = Number(maxPoints) - Number(resource.state.pointsRemaining);
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "pointPoolRemainingPointsInvalid",
      "Class feature point-pool remaining points exceed the battle resource cap during battle handoff.",
    );
  }
  return expended > 0
    ? Result.succeed({
        tag: "pointPoolResource",
        unitId: pointPoolUnitId,
        expended: resourceCount(expended),
      })
    : Result.succeed(null);
}

function characterSheetSpellAccessFreeCastExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleResource;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Result.Result<
  Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "spellAccessFreeCast" }
  > | null,
  CharacterSheetBattleHandoffIssue
> {
  if (
    input.resource.ownership.purpose.tag !== "spellAccessFreeCast" ||
    characterBattleResourceIsPointPool(input.resource.state)
  ) {
    return Result.succeed(null);
  }
  if (!isFixedUseCountBattleResourceState(input.resource.state)) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastCapShapeInvalid",
      "Spell Access free casts must use a fixed battle resource cap during battle handoff.",
    );
  }
  const spellId = input.resource.ownership.purpose.spellId;
  const sheetCount = sheetFreeCastResourceCapacity({
    sheetResources: input.sheetResources,
    sourceUnitId: input.resource.ownership.unit.id,
    spellId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (input.resource.state.resource.cap.uses !== sheetCount.success) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastCapacityMismatch",
      "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended =
    input.resource.state.resource.cap.uses - input.resource.state.usesRemaining;
  return expended > 0
    ? Result.succeed({
        tag: "spellAccessFreeCast",
        sourceUnitId: input.resource.ownership.unit.id,
        spellId,
        expended: resourceCount(expended),
      })
    : Result.succeed(null);
}

function retainedCharacterSheetResourceExpenditure(
  expenditure: CharacterSheetResourceExpenditure,
  battleUseCountResourceUnitIds: ReadonlySet<CharacterSheetUseCountResourceUnitId>,
  battlePointPoolResourceUnitIds: ReadonlySet<CharacterSheetPointPoolResourceUnitId>,
): boolean {
  return (
    expenditure.tag !== "spellAccessFreeCast" &&
    (expenditure.tag !== "useCountResource" ||
      !isCharacterSheetUseCountResourceUnitId(expenditure.unitId) ||
      !battleUseCountResourceUnitIds.has(expenditure.unitId)) &&
    (expenditure.tag !== "pointPoolResource" ||
      !isCharacterSheetPointPoolResourceUnitId(expenditure.unitId) ||
      !battlePointPoolResourceUnitIds.has(expenditure.unitId))
  );
}

type OwnedCharacterBattleResource =
  | {
      readonly tag: "spellAccessFreeCast";
      readonly state: CharacterBattleResourceState;
      readonly ownership: CharacterBattleResourceOwnership & {
        readonly purpose: Extract<
          CharacterBattleResourceOwnership["purpose"],
          { readonly tag: "spellAccessFreeCast" }
        >;
      };
    }
  | {
      readonly tag: "unitResource";
      readonly state: CharacterBattleResourceState;
      readonly ownership: CharacterBattleResourceOwnership & {
        readonly purpose: Extract<
          CharacterBattleResourceOwnership["purpose"],
          { readonly tag: "unitResource" }
        >;
      };
      readonly resourceAdmission:
        | {
            readonly tag: "admitted";
            readonly procedure: Extract<
              ResourceFeatureAdmission,
              { readonly tag: "admitted" }
            >["procedure"];
          }
        | {
            readonly tag: "battleResource";
            readonly executionFacts: CharacterBattleResourceExecutionFacts;
          };
    };

type OwnedCharacterBattleUnitResource = Extract<
  OwnedCharacterBattleResource,
  { readonly tag: "unitResource" }
>;

type CharacterSheetPointPoolResourceUnit = UnitRecord & {
  readonly id: CharacterSheetPointPoolResourceUnitId;
};

type CharacterSheetSupportedOwnedBattlePointPoolResource = Omit<
  OwnedCharacterBattleUnitResource,
  "state" | "ownership"
> & {
  readonly state: CharacterBattlePointPoolResourceState;
  readonly ownership: Omit<
    OwnedCharacterBattleUnitResource["ownership"],
    "unit"
  > & {
    readonly unit: CharacterSheetPointPoolResourceUnit;
  };
};

function isCharacterSheetPointPoolResourceUnit(
  unit: UnitRecord,
): unit is CharacterSheetPointPoolResourceUnit {
  return isCharacterSheetPointPoolResourceUnitId(unit.id);
}

function characterBattlePointPoolResourceForSheet(
  resource: OwnedCharacterBattleResource,
): CharacterSheetSupportedOwnedBattlePointPoolResource | null {
  if (resource.tag !== "unitResource") return null;
  if (!characterBattleResourceIsPointPool(resource.state)) return null;
  const unit = resource.ownership.unit;
  if (!isCharacterSheetPointPoolResourceUnit(unit)) return null;
  return {
    ...resource,
    state: resource.state,
    ownership: {
      ...resource.ownership,
      unit,
    },
  };
}

function ownedResourceIsDruidWildShape(
  resource: OwnedCharacterBattleUnitResource,
): boolean {
  return Match.value(resource.resourceAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      battleResource: () => false,
      admitted: ({ procedure }) =>
        Match.value(procedure).pipe(
          Match.discriminatorsExhaustive("kind")({
            failedSavingThrowReroll: () => false,
            monkFocus: () => false,
            druidWildShape: () => true,
          }),
        ),
    }),
  );
}

function ownedResourceExecutionFacts(
  resource: OwnedCharacterBattleUnitResource,
): CharacterBattleResourceExecutionFacts {
  return Match.value(resource.resourceAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      admitted: ({ procedure }) => resourceFeatureExecutionFacts(procedure),
      battleResource: ({ executionFacts }) => executionFacts,
    }),
  );
}

type FixedUseCountBattleResourceState = CharacterBattleResourceState & {
  readonly resource: {
    readonly kind: "use_count";
    readonly cap: { readonly kind: "fixed"; readonly uses: ResourceCount };
  };
  readonly usesRemaining: ResourceCount;
};

function isFixedUseCountBattleResourceState(
  state: CharacterBattleResourceState,
): state is FixedUseCountBattleResourceState {
  return (
    state.resource.kind === "use_count" &&
    state.resource.cap.kind === "fixed" &&
    "usesRemaining" in state
  );
}

type CharacterBattleResourceCap =
  CharacterBattleResourceState["resource"]["cap"];

function characterBattleResourceExecutionFactsEqual(
  left: CharacterBattleResourceState["resource"],
  right: CharacterBattleResourceState["resource"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      use_count: (resource) =>
        right.kind === "use_count" &&
        characterBattleResourceCapsEqual(resource.cap, right.cap),
      point_pool: (resource) =>
        right.kind === "point_pool" &&
        resource.poolId === right.poolId &&
        characterBattleResourceCapsEqual(resource.cap, right.cap),
    }),
  );
}

function characterBattleResourceCapsEqual(
  left: CharacterBattleResourceCap,
  right: CharacterBattleResourceCap,
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "fixed" },
      (cap) => right.kind === "fixed" && cap.uses === right.uses,
    ),
    Match.when(
      { kind: "proficiency_bonus" },
      () => right.kind === "proficiency_bonus",
    ),
    Match.when(
      { kind: "linear_per_level" },
      (cap) =>
        right.kind === "linear_per_level" &&
        cap.axis === right.axis &&
        cap.base === right.base &&
        cap.perLevel === right.perLevel &&
        cap.startingAtLevel === right.startingAtLevel,
    ),
    Match.when(
      { kind: "threshold_tiers" },
      (cap) =>
        right.kind === "threshold_tiers" &&
        cap.axis === right.axis &&
        cap.base === right.base &&
        cap.tiers.length === right.tiers.length &&
        cap.tiers.every(
          (tier, index) =>
            tier.atLevel === right.tiers[index]?.atLevel &&
            tier.value === right.tiers[index]?.value,
        ),
    ),
    Match.when(
      { kind: "ability_modifier" },
      (cap) =>
        right.kind === "ability_modifier" &&
        cap.ability === right.ability &&
        cap.minimum === right.minimum,
    ),
    Match.when({ kind: "unlimited" }, () => right.kind === "unlimited"),
    Match.exhaustive,
  );
}

function characterBattleResourcesWithOwnership(input: {
  readonly resources: readonly CharacterBattleResourceState[];
  readonly ownership: readonly CharacterBattleResourceOwnership[];
}): Result.Result<
  readonly OwnedCharacterBattleResource[],
  CharacterSheetBattleHandoffIssue
> {
  if (input.resources.length !== input.ownership.length) {
    return characterBattleHandoffValidationIssue(
      "resourceOwnershipLengthMismatch",
      "Battle handoff resource ownership must cover every mechanical resource exactly once.",
    );
  }
  const uniqueOwnership = validateUniqueCharacterBattleResourceOwnership(
    input.ownership,
  );
  if (Result.isFailure(uniqueOwnership)) {
    return Result.fail(uniqueOwnership.failure);
  }
  const ownedResources: OwnedCharacterBattleResource[] = [];
  const seenStateRefs = new Set<string>();
  for (const state of input.resources) {
    if (seenStateRefs.has(state.resourcePoolRef)) {
      return characterBattleHandoffValidationIssue(
        "duplicateMechanicalResourcePool",
        "Battle handoff contains a duplicate mechanical resource pool reference.",
      );
    }
    seenStateRefs.add(state.resourcePoolRef);
    const ownership = input.ownership.find(
      (candidate) => candidate.resourcePoolRef === state.resourcePoolRef,
    );
    if (ownership === undefined) {
      return characterBattleHandoffValidationIssue(
        "mechanicalResourceOwnershipMissing",
        "Battle handoff mechanical resource has no authored ownership context.",
      );
    }
    if (ownership.purpose.tag === "spellAccessFreeCast") {
      ownedResources.push({
        tag: "spellAccessFreeCast",
        state,
        ownership: { ...ownership, purpose: ownership.purpose },
      });
      continue;
    }
    const ownedResource = characterBattleOwnedUnitResource({
      state,
      ownership: { ...ownership, purpose: ownership.purpose },
    });
    if (Result.isFailure(ownedResource)) {
      return Result.fail(ownedResource.failure);
    }
    ownedResources.push(ownedResource.success);
  }
  return Result.succeed(ownedResources);
}

function validateUniqueCharacterBattleResourceOwnership(
  ownershipEntries: readonly CharacterBattleResourceOwnership[],
): Result.Result<void, CharacterSheetBattleHandoffIssue> {
  const seenOwnershipRefs = new Set<string>();
  for (const ownership of ownershipEntries) {
    if (seenOwnershipRefs.has(ownership.resourcePoolRef)) {
      return characterBattleHandoffValidationIssue(
        "duplicateResourceOwnership",
        "Battle handoff resource ownership contains a duplicate resource pool reference.",
      );
    }
    seenOwnershipRefs.add(ownership.resourcePoolRef);
  }
  return Result.succeed(undefined);
}

function characterBattleOwnedUnitResource(input: {
  readonly state: CharacterBattleResourceState;
  readonly ownership: Extract<
    OwnedCharacterBattleResource,
    { readonly tag: "unitResource" }
  >["ownership"];
}): Result.Result<
  Extract<OwnedCharacterBattleResource, { readonly tag: "unitResource" }>,
  CharacterSheetBattleHandoffIssue
> {
  const unsupported = () =>
    characterBattleHandoffValidationIssue(
      "battleResourceUnitUnsupported",
      "Battle handoff unit resources must reference supported resource Units.",
    );
  return Match.value(admitResourceFeature(input.ownership.unit)).pipe(
    Match.discriminatorsExhaustive("tag")({
      rejected: unsupported,
      admitted: (admission) =>
        Result.succeed({
          tag: "unitResource" as const,
          ...input,
          resourceAdmission: {
            tag: "admitted" as const,
            procedure: admission.procedure,
          },
        }),
      notBattleOwned: () =>
        characterBattleResourceSupportedForUnit(input.ownership.unit)
          ? Result.succeed({
              tag: "unitResource" as const,
              ...input,
              resourceAdmission: {
                tag: "battleResource" as const,
                executionFacts: characterBattleResourceForUnit(
                  input.ownership.unit,
                ),
              },
            })
          : unsupported(),
    }),
  );
}

function characterSheetUseCountResourceUnitIdForBattleResource(
  resource: OwnedCharacterBattleResource,
): CharacterSheetUseCountResourceUnitId | null {
  return resource.tag === "unitResource" &&
    resource.state.resource.kind === "use_count" &&
    isCharacterSheetUseCountResourceUnitId(resource.ownership.unit.id)
    ? resource.ownership.unit.id
    : null;
}

function sheetPointPoolResourceCapacity(input: {
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly unitId: CharacterSheetPointPoolResourceUnitId;
}): Result.Result<ResourceCount, CharacterSheetBattleHandoffIssue> {
  const resource = input.sheetResources.find(
    (candidate) =>
      candidate.tag === "pointPoolResource" &&
      candidate.unitId === input.unitId,
  );
  return resource === undefined
    ? characterBattleHandoffValidationIssue(
        "pointPoolCapacityMissing",
        "Class feature point-pool battle resource requires matching Character Sheet resource capacity.",
      )
    : Result.succeed(resource.count);
}

function sheetUseCountResourceCapacity(input: {
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly unitId: CharacterSheetUseCountResourceUnitId;
}): Result.Result<ResourceCount, CharacterSheetBattleHandoffIssue> {
  const resource = input.sheetResources.find(
    (candidate) =>
      candidate.tag === "useCountResource" && candidate.unitId === input.unitId,
  );
  return resource === undefined
    ? characterBattleHandoffValidationIssue(
        "useCountCapacityMissing",
        "Class feature use-count battle resource requires matching Character Sheet resource capacity.",
      )
    : Result.succeed(resource.count);
}

function sheetFreeCastResourceCapacity(input: {
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellId: UnitRecord["id"];
}): Result.Result<ResourceCount, CharacterSheetBattleHandoffIssue> {
  const resource = input.sheetResources.find(
    (candidate) =>
      candidate.tag === "spellAccessFreeCast" &&
      candidate.sourceUnitId === input.sourceUnitId &&
      candidate.spellId === input.spellId,
  );
  return resource === undefined
    ? characterBattleHandoffValidationIssue(
        "freeCastCapacityMissing",
        "Spell Access free-cast battle resource requires matching Character Sheet resource capacity.",
      )
    : Result.succeed(resource.count);
}

type DruidWildShapeBattleResourceProjection =
  | { readonly tag: "absent" }
  | {
      readonly tag: "present";
      readonly resource: Extract<
        OwnedCharacterBattleResource,
        { readonly tag: "unitResource" }
      >;
      readonly unitId: CharacterSheetUseCountResourceUnitId;
    };

function druidWildShapeBattleResourceProjection(
  battleResources: readonly OwnedCharacterBattleResource[],
): Result.Result<
  DruidWildShapeBattleResourceProjection,
  CharacterSheetBattleHandoffIssue
> {
  const resources = battleResources.filter(
    (
      resource,
    ): resource is Extract<
      OwnedCharacterBattleResource,
      { readonly tag: "unitResource" }
    > =>
      resource.tag === "unitResource" &&
      ownedResourceIsDruidWildShape(resource),
  );
  if (resources.length > 1) {
    return characterBattleHandoffValidationIssue(
      "wildShapeResourceDuplicate",
      "Battle handoff supports exactly one Druid Wild Shape resource.",
    );
  }
  const resource = resources[0];
  if (resource === undefined) return Result.succeed({ tag: "absent" });
  const unitId = resource.ownership.unit.id;
  if (!isCharacterSheetUseCountResourceUnitId(unitId)) {
    return characterBattleHandoffValidationIssue(
      "wildShapeResourceTypeInvalid",
      "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
    );
  }
  return Result.succeed({ tag: "present", resource, unitId });
}

function druidWildShapeResourceExpenditureFromBattle(input: {
  readonly combatant: CharacterBattleCreatureState;
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly wildShapeResource: DruidWildShapeBattleResourceProjection;
}): Result.Result<
  CharacterSheetBattleUseCountExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.wildShapeResource.tag === "absent")
    return Result.succeed(undefined);
  const { resource, unitId } = input.wildShapeResource;
  if (!("usesRemaining" in resource.state)) {
    return characterBattleHandoffValidationIssue(
      "wildShapeRemainingUsesMissing",
      "Druid Wild Shape must carry remaining uses during battle handoff.",
    );
  }
  if (
    !characterBattleResourceExecutionFactsEqual(
      resource.state.resource,
      ownedResourceExecutionFacts(resource),
    )
  ) {
    return characterBattleHandoffValidationIssue(
      "wildShapeCapacityMismatch",
      "Druid Wild Shape battle capacity must match Character Sheet resource capacity.",
    );
  }
  const maxUses = characterBattleResourceMaxUsesForExecutionFacts({
    unit: resource.ownership.unit,
    resource: ownedResourceExecutionFacts(resource),
    classLevels: input.combatant.origin.classLevels,
  });
  const sheetCount = sheetUseCountResourceCapacity({
    sheetResources: input.sheetResources,
    unitId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (maxUses === undefined || maxUses !== sheetCount.success) {
    return characterBattleHandoffValidationIssue(
      "wildShapeCapacityMismatch",
      "Druid Wild Shape battle capacity must match Character Sheet resource capacity.",
    );
  }
  return druidWildShapeExpenditureFromRemainingUses({
    unitId,
    maxUses,
    usesRemaining: resource.state.usesRemaining,
  });
}

function druidWildShapeExpenditureFromRemainingUses(input: {
  readonly unitId: CharacterSheetUseCountResourceUnitId;
  readonly maxUses: ResourceCount;
  readonly usesRemaining: ResourceCount;
}): Result.Result<
  CharacterSheetBattleUseCountExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  const expended = Number(input.maxUses) - Number(input.usesRemaining);
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "wildShapeRemainingUsesInvalid",
      "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
    );
  }
  return Result.succeed(
    expended === 0
      ? undefined
      : {
          tag: "useCountResource",
          unitId: input.unitId,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetConditionsFromBattle(
  combatant: BattleCreatureState,
): CharacterSheet["conditions"] {
  const conditions = combatant.conditions ?? EMPTY_CONDITION_STATE;
  return CONDITIONS.filter(
    (condition): condition is Exclude<Condition, "unconscious"> =>
      condition !== "unconscious" && hasCondition(conditions, condition),
  );
}

function combatantHasActiveBattleLocalState(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.concentration != null ||
    (combatant.activeEffects?.length ?? 0) > 0 ||
    (combatant.activeOngoingFeatureOccurrences?.size ?? 0) > 0
  );
}

function characterSheetPactSlotExpenditureFromBattle(
  input: {
    readonly sheet: CharacterSheet;
    readonly combatant: CharacterBattleCreatureState;
  },
  pactSlots: CharacterSheetPactSlotState,
): Result.Result<
  CharacterPactSlotExpenditure,
  CharacterSheetBattleHandoffIssue
> {
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Result.succeed({ expended: pactSlots.expended });
  }
  if (battleSpellcasting.spellSlots.length !== 1) {
    return characterBattleHandoffValidationIssue(
      "pactSlotCapacityMismatch",
      "Battle handoff Pact Slot state must match Character Sheet Pact Slot capacity.",
    );
  }
  const battleSlot = battleSpellcasting.spellSlots[0];
  if (
    battleSlot === undefined ||
    battleSlot.spellLevel !== pactSlots.slotLevel ||
    battleSlot.count !== pactSlots.count ||
    !Number.isInteger(battleSlot.expended) ||
    battleSlot.expended < pactSlots.expended ||
    battleSlot.expended > pactSlots.count
  ) {
    return characterBattleHandoffValidationIssue(
      "pactSlotCapacityMismatch",
      "Battle handoff Pact Slot state must match Character Sheet Pact Slot capacity.",
    );
  }
  return Result.succeed({ expended: battleSlot.expended });
}

function bookOfShadowsPresenceFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): CharacterSheetBookOfShadowsPresence | undefined {
  return (
    input.runtimeContext.spellcastingPresentationSource
      ?.bookOfShadowsSpellAccesses[0]?.bookPresence ??
    input.sheet.bookOfShadowsPresence
  );
}

function characterSheetPositiveHpUnconsciousFromBattle(): CharacterSheetPositiveHpUnconscious {
  return CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS;
}

function characterZeroHpLifecycleFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Result.Result<
  CharacterSheetZeroHpLifecycleInput,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return characterBattleHandoffValidationIssue(
      "zeroHpLifecycleUnsupported",
      "Battle character has unsupported zero-HP lifecycle.",
    );
  }
  const lifecycle = input.combatant.zeroHpLifecycle.deathSaves;
  if (lifecycle.dead) {
    return Result.succeed({ tag: "dead", deathSaves: lifecycle.deathSaves });
  }
  if (lifecycle.stable) {
    const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(
      input.sheet,
    );
    if (stableRecoveryIssue !== null) {
      return characterBattleHandoffValidationIssue(
        "stableRecoveryUnsupported",
        stableRecoveryIssue,
      );
    }
    return Result.succeed({
      tag: "stable",
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
    });
  }
  return Result.succeed({ tag: "unstable", deathSaves: lifecycle.deathSaves });
}
