// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS CHARACTER.LIFECYCLE.LAYER_PROJECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import {
  combatantKnockedOutUnconscious,
  combatantHasActiveDruidWildShape,
  classFeatureSpellFreeCastProfileForResource,
  characterBattleResourceIsPointPool,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  KNOCKED_OUT_UNCONSCIOUS,
  parseSupportedUnitFeatureProfile,
  battleCreatureInitFromStatBlock,
  startBattle,
  type BattleCreatureInit,
  type BattleId,
  type BattleCreatureState,
  type BattleStateInitIssue,
  type BattleState,
  type BattleRuntimeContext,
  type BattleRuntimeSession,
  type CharacterBattleResourceOwnership,
  type CharacterBattleResourceState,
  type CharacterBattleClassLevels,
  type CharacterBattleRuntimeContext,
  type CharacterZeroHpLifecycleInit,
  type StatBlockBattleInitInput,
  battleStateInitIssueMessage,
} from "@dnd/battle-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetTempHp,
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
  type CharacterSheetSpellSlotState,
  type CharacterSheetStableRecovery,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  type Condition,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";

import {
  CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE,
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import { type BattleCreatureInitIssue } from "./battle-character-build-projection.ts";
import { characterBattleOriginFeatSelectedReferenceProjection } from "./origin-feat-selected-reference-projection.ts";
import {
  characterSheetBattleHandoffIssue,
  type CharacterSheetBattleHandoffIssue,
} from "./battle-handoff-issue.ts";
import {
  characterBattleEncounterCompositionRoute,
  enterBattleRuntimeRoute,
  projectCharacterSheetToBattleRoute,
  recordCharacterBattleHandoffFactsRoute,
  rejectCharacterBattleHandoffRoute,
  type CharacterBattleRouteEvent,
} from "./character-battle-route.ts";
import { settleCompanionFromBattle } from "./companion-handoff.ts";

export function characterBattleRuntimeIssueMessage(
  issue: BattleCreatureInitIssue | BattleStateInitIssue,
): string {
  return issue.tag === "battleCreatureInitIssue"
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
  startBattleFromCharacterBuildAndStatBlock,
  type CharacterBattleInitiativeProficiencyChoice,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
export {
  battleCreatureInitIssue,
  characterArmorClassState,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleLoadoutFromBuild,
  characterOffHandAttackActionOption,
  characterSpellcasting,
  getRequiredUnit,
  type BattleCreatureInitIssue,
  type CharacterBattleSpellAccessProjectionIssue,
} from "./battle-character-build-projection.ts";
export {
  characterBattleSupportProjection,
  characterBattleWeaponMasterySelections,
  type CharacterBattleSupportProjection,
  type BattleSupportProfileIssue,
} from "./battle-support-profiles.ts";
export type { CharacterSheetBattleHandoffIssue } from "./battle-handoff-issue.ts";
export {
  admitCharacterSheetCompanionToBattle,
  type CharacterSheetCompanionBattleAdmissionInput,
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

export type CharacterSheetBattleInitInput = Omit<
  CharacterBuildCreatureInput,
  | "build"
  | "characterId"
  | "hitPointMaximum"
  | "currentHp"
  | "tempHp"
  | "conditions"
  | "positiveHpUnconscious"
  | "zeroHpLifecycle"
  | "spellSlots"
  | "bookOfShadowsPresence"
  | "resourceExpenditures"
  | "druidWildShapeAvailableForms"
> & {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type CharacterBattleInitProjection = {
  readonly init: BattleCreatureInit;
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export type CharacterBattleInitProjectionIssue = {
  readonly issue: BattleCreatureInitIssue;
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export type CharacterBattleRuntimeEntry = {
  readonly session: BattleRuntimeSession;
  readonly initProjectionRouteEvents: readonly CharacterBattleRouteEvent[];
  readonly encounterCompositionRouteEvents: readonly CharacterBattleRouteEvent[];
};

export type CharacterBattleRuntimeEntryIssue = {
  readonly issue: BattleCreatureInitIssue | BattleStateInitIssue;
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

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

export function characterSheetBattleInit(input: CharacterSheetBattleInitInput) {
  const projection = characterSheetBattleInitWithRoute(input);
  return Result.isFailure(projection)
    ? Result.fail(projection.failure.issue)
    : Result.succeed(projection.success.init);
}

export function characterSheetBattleInitWithRoute(
  input: CharacterSheetBattleInitInput,
): Result.Result<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  const { sheet, unitLibrary, statBlockCatalog, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return Result.fail({
      issue: {
        tag: "battleCreatureInitIssue",
        message: stableRecoveryIssue,
      },
      routeEvents: rejectStableRecoveryBattleInitRoute(),
    });
  }
  if (hasMixedSpellAndPactSlotState(sheet)) {
    return Result.fail({
      issue: {
        tag: "battleCreatureInitIssue",
        message: mixedSpellAndPactSlotStateMessage,
      },
      routeEvents: rejectMixedSpellAndPactSlotBattleInitRoute(),
    });
  }
  const selectedReference =
    characterBattleOriginFeatSelectedReferenceProjection({
      build: sheet.build,
      unitLibrary,
    });
  if (Result.isFailure(selectedReference)) {
    return Result.fail({
      issue: selectedReference.failure,
      routeEvents: rejectCharacterBattleInitProjectionRoute(),
    });
  }
  const druidWildShapeAvailableForms =
    battleDruidWildShapeAvailableFormsFromSheet({
      sheet,
      statBlockCatalog,
    });
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet,
    unitLibrary,
  });
  if (Result.isFailure(hitPointMaximum)) {
    return Result.fail({
      issue: {
        tag: "battleCreatureInitIssue",
        message: hitPointMaximum.failure.message,
      },
      routeEvents: rejectBuildHitPointBattleInitRoute(),
    });
  }
  const init = battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    hitPointMaximum: hitPointMaximum.success,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
    ...(druidWildShapeAvailableForms === undefined
      ? {}
      : { druidWildShapeAvailableForms }),
  });
  return Result.isFailure(init)
    ? Result.fail({
        issue: init.failure,
        routeEvents: rejectCharacterBattleInitProjectionRoute(),
      })
    : Result.succeed({
        init: init.success,
        routeEvents: acceptedCharacterSheetBattleInitRoute({ sheet }),
      });
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
  return Result.isFailure(init)
    ? Result.fail({
        issue: init.failure,
        routeEvents: characterBuildInitIssueRoute(init.failure),
      })
    : Result.succeed({
        init: init.success,
        routeEvents: [
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
        ],
      });
}

function characterBuildInitIssueRoute(
  issue: BattleCreatureInitIssue,
): readonly CharacterBattleRouteEvent[] {
  return issue.message ===
    CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE
    ? rejectBuildHitPointBattleInitRoute()
    : rejectCharacterBattleInitProjectionRoute();
}

export function startBattleFromCharacterSheetAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterSheetBattleInitInput;
  readonly statBlockBattleInput: StatBlockBattleInitInput;
}): Result.Result<
  CharacterBattleRuntimeEntry,
  CharacterBattleRuntimeEntryIssue
> {
  const characterInit = characterSheetBattleInitWithRoute(input.character);
  if (Result.isFailure(characterInit)) {
    return Result.fail({
      issue: characterInit.failure.issue,
      routeEvents: characterInit.failure.routeEvents,
    });
  }
  const statBlockInit = battleCreatureInitFromStatBlock(
    input.statBlockBattleInput,
  );
  if (Result.isFailure(statBlockInit)) {
    return Result.fail({
      issue: statBlockInit.failure,
      routeEvents: characterInit.success.routeEvents,
    });
  }
  const session = startBattle({
    battleId: input.battleId,
    combatants: [characterInit.success.init, statBlockInit.success],
  });
  if (Result.isFailure(session)) {
    return Result.fail({
      issue: session.failure,
      routeEvents: characterInit.success.routeEvents,
    });
  }
  return Result.succeed({
    session: session.success,
    initProjectionRouteEvents: characterInit.success.routeEvents,
    encounterCompositionRouteEvents: characterBattleEncounterCompositionRoute(),
  });
}

function acceptedCharacterSheetBattleInitRoute(input: {
  readonly sheet: CharacterSheet;
}): readonly CharacterBattleRouteEvent[] {
  const baseRoute = hasPurePactSlotState(input.sheet)
    ? [
        projectCharacterSheetToBattleRoute({
          subject: "handoffResourceProjection",
          owner: "characterBattleResourceProjection",
        }),
        recordCharacterBattleHandoffFactsRoute({
          subject: "handoffResourceProjection",
          facts: ["sourceExactPactSlotDelta"],
          owner: "characterBattleResourceProjection",
        }),
        enterBattleRuntimeRoute({
          subject: "handoffResourceProjection",
          owner: "characterBattleInitProjection",
        }),
      ]
    : [
        projectCharacterSheetToBattleRoute({
          subject: "sheetToBattleInit",
          owner: "characterBattleSheet",
        }),
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
      ];
  return [...baseRoute, ...selectedReferenceBattleInitRouteEvents()];
}

function selectedReferenceBattleInitRouteEvents(): readonly CharacterBattleRouteEvent[] {
  return [
    projectCharacterSheetToBattleRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "handoffSelectedReference",
      facts: ["selectedReferenceRetention"],
      owner: "characterBattleBuildProjection",
    }),
    projectCharacterSheetToBattleRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleInitProjection",
    }),
    enterBattleRuntimeRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleRuntime",
    }),
  ];
}

function rejectMixedSpellAndPactSlotBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "handoffResourceProjection",
      fill: "resourceDelta",
      holes: ["spellResourceProjection"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function rejectBuildHitPointBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["hitPointProjection"],
      owner: "characterBattleBuildProjection",
    }),
  ];
}

function rejectStableRecoveryBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

function rejectCharacterBattleInitProjectionRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

export function settleCharacterSheetFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly context: BattleRuntimeContext;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Result.Result<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const combatant = input.combatant;
  if (!isCharacterBattleCreatureState(combatant)) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff combatant is not a character.",
    );
  }
  const runtimeContext = input.context.characters.get(combatant.combatantId);
  if (runtimeContext === undefined) {
    return characterSheetBattleHandoffIssue(
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
    state: input.state,
    ownerCombatantId: input.combatant.combatantId,
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

function settleBattleCombatantIntoCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): Result.Result<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (input.combatant.origin.characterId !== input.sheet.characterId) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff character identity does not match Character Sheet.",
    );
  }
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(hitPointMaximum))
    return Result.fail(hitPointMaximum.failure);
  if (input.combatant.maxHp !== hitPointMaximum.success) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > hitPointMaximum.success) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff current HP exceeds Character Sheet maximum HP.",
    );
  }
  if (hasMixedSpellAndPactSlotState(input.sheet)) {
    return characterSheetBattleHandoffIssue(mixedSpellAndPactSlotStateMessage);
  }
  if (combatantHasActiveDruidWildShape(input.combatant)) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
    );
  }
  if (combatantHasActiveBattleLocalState(input.combatant)) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff while active battle effects or Concentration are present is blocked; end or resolve battle-local effects before Character Sheet handoff.",
    );
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Result.isFailure(zeroHpLifecycle)) {
    return Result.fail(zeroHpLifecycle.failure);
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Result.isFailure(knockedOut)) {
    return characterSheetBattleHandoffIssue(
      battleStateInitIssueMessage(knockedOut.failure),
    );
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Result.isFailure(resourceExpenditures)) {
    return Result.fail(resourceExpenditures.failure);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);
  const druidWildShapeKnownForms = characterSheetDruidWildShapeKnownForms(
    input.sheet,
  );
  const spellSlotState = characterSheetSpellSlotSourceStateFromBattle(input);
  if (Result.isFailure(spellSlotState)) {
    return Result.fail(spellSlotState.failure);
  }
  const pactSlotExpenditure =
    pactSlots === undefined
      ? Result.succeed(undefined)
      : characterSheetPactSlotExpenditureFromBattle(input, pactSlots);
  if (Result.isFailure(pactSlotExpenditure)) {
    return Result.fail(pactSlotExpenditure.failure);
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
  if (Result.isFailure(sheet)) return Result.fail(sheet.failure);
  return spellSlotState.success === undefined
    ? Result.succeed(sheet.success)
    : replaceCharacterSheetSpellSlotSourceState({
        sheet: sheet.success,
        unitLibrary: input.unitLibrary,
        spellSlotState: spellSlotState.success,
      });
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
      : characterSheetBattleHandoffIssue(
          "Battle handoff Spell Slot state requires Character Sheet Spell Slot or Pact Slot state.",
        );
  }

  const battleLevels = new Set<number>();
  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (battleLevels.has(battleSlot.spellLevel)) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must not duplicate spell levels.",
      );
    }
    battleLevels.add(battleSlot.spellLevel);
    if (battleSlot.expended > battleSlot.count) {
      return characterSheetBattleHandoffIssue(
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
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      );
    }
    if (battleSlot.expended < sheetSlot.expended) {
      return characterSheetBattleHandoffIssue(
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
      return characterSheetBattleHandoffIssue(
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
    return characterSheetBattleHandoffIssue(
      "Battle handoff Spell Slot expenditure exceeds available Character Sheet Spell Slots.",
    );
  }
  if (minimumCreatedSpend < maximumCreatedSpend) {
    return characterSheetBattleHandoffIssue(
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
    return characterSheetBattleHandoffIssue(sheetResources.failure.message);
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
  const wildShapeResource = druidWildShapeBattleResourceProjection(
    battleResources,
    origin.classLevels,
  );
  if (Result.isFailure(wildShapeResource)) {
    return Result.fail(wildShapeResource.failure);
  }
  const battleUseCountResourceUnitIds =
    new Set<CharacterSheetUseCountResourceUnitId>();
  const battlePointPoolResourceUnitIds =
    new Set<CharacterSheetPointPoolResourceUnitId>();
  for (const resource of battleResources) {
    const unitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (unitId !== null) battleUseCountResourceUnitIds.add(unitId);
    const pointPoolUnitId =
      characterSheetPointPoolResourceUnitIdForBattleResource(resource);
    if (
      pointPoolUnitId !== null &&
      characterBattleResourceIsPointPool(resource.state)
    ) {
      battlePointPoolResourceUnitIds.add(pointPoolUnitId);
    }
  }
  if (wildShapeResource.success.tag === "present") {
    battleUseCountResourceUnitIds.add(wildShapeResource.success.unitId);
  }
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      retainedCharacterSheetResourceExpenditure(
        expenditure,
        battleUseCountResourceUnitIds,
        battlePointPoolResourceUnitIds,
      ),
  );
  const nextFreeCastExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextUseCountExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextPointPoolExpenditures: CharacterSheetResourceExpenditure[] = [];
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
  for (const resource of battleResources) {
    const resourceUnit = resource.ownership.unit;
    const freeCastExpenditure =
      characterSheetSpellAccessFreeCastExpenditureFromBattle({
        resource,
        sheetResources: sheetResources.success,
      });
    if (Result.isFailure(freeCastExpenditure)) {
      return Result.fail(freeCastExpenditure.failure);
    }
    if (freeCastExpenditure.success !== null) {
      nextFreeCastExpenditures.push(freeCastExpenditure.success);
      continue;
    }
    if (
      resourceUnit.kind === "class_feature" &&
      !origin.classLevels.some(
        (classLevel) => classLevel.className === resourceUnit.className,
      )
    ) {
      return characterSheetBattleHandoffIssue(
        "Class feature battle resources require a matching class level during battle handoff.",
      );
    }
    const pointPoolExpenditure = characterSheetPointPoolExpenditureFromBattle({
      resource,
      classLevels: input.combatant.origin.classLevels,
      sheetResources: sheetResources.success,
    });
    if (Result.isFailure(pointPoolExpenditure)) {
      return Result.fail(pointPoolExpenditure.failure);
    }
    if (pointPoolExpenditure.success !== null) {
      nextPointPoolExpenditures.push(pointPoolExpenditure.success);
      continue;
    }
    const profile = classFeatureSpellFreeCastProfileForResource(
      resource.ownership,
    );
    if (
      profile !== null &&
      !characterBattleResourceIsPointPool(resource.state)
    ) {
      if (!isFixedUseCountBattleResourceState(resource.state)) {
        return characterSheetBattleHandoffIssue(
          "Spell Access free casts must use a fixed battle resource cap during battle handoff.",
        );
      }
      const fixedUses = resource.state.resource.cap.uses;
      const sheetCount = sheetFreeCastResourceCapacity({
        sheetResources: sheetResources.success,
        sourceUnitId: resource.ownership.unit.id,
        spellId: profile.spellId,
      });
      if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
      if (resource.state.resource.cap.uses !== sheetCount.success) {
        return characterSheetBattleHandoffIssue(
          "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
        );
      }
      const expended = fixedUses - resource.state.usesRemaining;
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Spell Access free-cast remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextFreeCastExpenditures.push({
          tag: "spellAccessFreeCast",
          sourceUnitId: resource.ownership.unit.id,
          spellId: profile.spellId,
          expended: resourceCount(expended),
        });
      }
      continue;
    }
    if (
      parseSupportedUnitFeatureProfile(
        resource.ownership.unit,
        origin.classLevels,
      )?.kind === "druidWildShapeKnownForm"
    ) {
      continue;
    }
    const useCountUnitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (
      useCountUnitId !== null &&
      !characterBattleResourceIsPointPool(resource.state)
    ) {
      const maxUses = characterBattleResourceMaxUses({
        unit: resourceUnit,
        classLevels: input.combatant.origin.classLevels,
      });
      if (maxUses === undefined || resource.state.usesRemaining === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count resources must carry finite remaining uses during battle handoff.",
        );
      }
      const sheetCount = sheetUseCountResourceCapacity({
        sheetResources: sheetResources.success,
        unitId: useCountUnitId,
      });
      if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
      if (maxUses !== sheetCount.success) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count battle capacity must match Character Sheet resource capacity.",
        );
      }
      const expended = Number(maxUses) - Number(resource.state.usesRemaining);
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextUseCountExpenditures.push({
          tag: "useCountResource",
          unitId: useCountUnitId,
          expended: resourceCount(expended),
        });
      }
    }
  }
  return Result.succeed([
    ...nextExpenditures,
    ...nextFreeCastExpenditures,
    ...nextUseCountExpenditures,
    ...nextPointPoolExpenditures,
    ...(druidWildShapeExpenditure.success === undefined
      ? []
      : [druidWildShapeExpenditure.success]),
  ]);
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
  const pointPoolUnitId =
    characterSheetPointPoolResourceUnitIdForBattleResource(input.resource);
  if (
    pointPoolUnitId === null ||
    !characterBattleResourceIsPointPool(input.resource.state)
  ) {
    return Result.succeed(null);
  }
  const maxPoints = characterBattleResourceMaxPoints({
    unit: input.resource.ownership.unit,
    classLevels: input.classLevels,
  });
  if (maxPoints === undefined) {
    return characterSheetBattleHandoffIssue(
      "Class feature point-pool resources must carry finite remaining points during battle handoff.",
    );
  }
  const sheetCount = sheetPointPoolResourceCapacity({
    sheetResources: input.sheetResources,
    unitId: pointPoolUnitId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (maxPoints !== sheetCount.success) {
    return characterSheetBattleHandoffIssue(
      "Class feature point-pool battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended =
    Number(maxPoints) - Number(input.resource.state.pointsRemaining);
  if (expended < 0) {
    return characterSheetBattleHandoffIssue(
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
    return characterSheetBattleHandoffIssue(
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
    return characterSheetBattleHandoffIssue(
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

type OwnedCharacterBattleResource = {
  readonly state: CharacterBattleResourceState;
  readonly ownership: CharacterBattleResourceOwnership;
};

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

function characterBattleResourcesWithOwnership(input: {
  readonly resources: readonly CharacterBattleResourceState[];
  readonly ownership: readonly CharacterBattleResourceOwnership[];
}): Result.Result<
  readonly OwnedCharacterBattleResource[],
  CharacterSheetBattleHandoffIssue
> {
  if (input.resources.length !== input.ownership.length) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff resource ownership must cover every mechanical resource exactly once.",
    );
  }
  const seenOwnershipRefs = new Set<string>();
  for (const ownership of input.ownership) {
    if (seenOwnershipRefs.has(ownership.resourcePoolRef)) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff resource ownership contains a duplicate resource pool reference.",
      );
    }
    seenOwnershipRefs.add(ownership.resourcePoolRef);
  }
  const ownedResources: OwnedCharacterBattleResource[] = [];
  const seenStateRefs = new Set<string>();
  for (const state of input.resources) {
    if (seenStateRefs.has(state.resourcePoolRef)) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff contains a duplicate mechanical resource pool reference.",
      );
    }
    seenStateRefs.add(state.resourcePoolRef);
    const ownership = input.ownership.find(
      (candidate) => candidate.resourcePoolRef === state.resourcePoolRef,
    );
    if (ownership === undefined) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff mechanical resource has no authored ownership context.",
      );
    }
    ownedResources.push({ state, ownership });
  }
  return Result.succeed(ownedResources);
}

function characterSheetPointPoolResourceUnitIdForBattleResource(
  resource: OwnedCharacterBattleResource,
): CharacterSheetPointPoolResourceUnitId | null {
  return characterBattleResourceIsPointPool(resource.state) &&
    isCharacterSheetPointPoolResourceUnitId(resource.ownership.unit.id)
    ? resource.ownership.unit.id
    : null;
}

function characterSheetUseCountResourceUnitIdForBattleResource(
  resource: OwnedCharacterBattleResource,
): CharacterSheetUseCountResourceUnitId | null {
  return resource.state.resource.kind === "use_count" &&
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
    ? characterSheetBattleHandoffIssue(
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
    ? characterSheetBattleHandoffIssue(
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
    ? characterSheetBattleHandoffIssue(
        "Spell Access free-cast battle resource requires matching Character Sheet resource capacity.",
      )
    : Result.succeed(resource.count);
}

type DruidWildShapeBattleResourceProjection =
  | { readonly tag: "absent" }
  | {
      readonly tag: "present";
      readonly resource: OwnedCharacterBattleResource;
      readonly unitId: CharacterSheetUseCountResourceUnitId;
    };

function druidWildShapeBattleResourceProjection(
  battleResources: readonly OwnedCharacterBattleResource[],
  classLevels: CharacterBattleClassLevels,
): Result.Result<
  DruidWildShapeBattleResourceProjection,
  CharacterSheetBattleHandoffIssue
> {
  const resources = battleResources.filter(
    (resource) =>
      parseSupportedUnitFeatureProfile(resource.ownership.unit, classLevels)
        ?.kind === "druidWildShapeKnownForm",
  );
  if (resources.length > 1) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff supports exactly one Druid Wild Shape resource.",
    );
  }
  const resource = resources[0];
  if (resource === undefined) return Result.succeed({ tag: "absent" });
  const unitId = resource.ownership.unit.id;
  if (!isCharacterSheetUseCountResourceUnitId(unitId)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
    );
  }
  return Result.succeed({ tag: "present", resource, unitId });
}

function battleDruidWildShapeAvailableFormsFromSheet(input: {
  readonly sheet: CharacterSheet;
  readonly statBlockCatalog: StatBlockCatalog;
}): readonly StatBlockRecord[] | undefined {
  const knownForms = characterSheetDruidWildShapeKnownForms(input.sheet);
  if (knownForms === undefined) return undefined;
  const forms: StatBlockRecord[] = [];
  for (const statBlockId of knownForms.statBlockIds) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isSome(statBlock)) {
      forms.push(statBlock.value);
    }
  }
  return forms;
}

function druidWildShapeResourceExpenditureFromBattle(input: {
  readonly combatant: CharacterBattleCreatureState;
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly wildShapeResource: DruidWildShapeBattleResourceProjection;
}): Result.Result<
  CharacterSheetResourceExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.wildShapeResource.tag === "absent")
    return Result.succeed(undefined);
  const { resource, unitId } = input.wildShapeResource;
  if (!("usesRemaining" in resource.state)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must carry remaining uses during battle handoff.",
    );
  }
  const maxUses = characterBattleResourceMaxUses({
    unit: resource.ownership.unit,
    classLevels: input.combatant.origin.classLevels,
  });
  const sheetCount = sheetUseCountResourceCapacity({
    sheetResources: input.sheetResources,
    unitId,
  });
  if (Result.isFailure(sheetCount)) return Result.fail(sheetCount.failure);
  if (maxUses === undefined || maxUses !== sheetCount.success) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended = Number(maxUses) - Number(resource.state.usesRemaining);
  if (expended < 0) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
    );
  }
  return Result.succeed(
    expended === 0
      ? undefined
      : {
          tag: "useCountResource",
          unitId,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetInitialConditions(
  sheet: CharacterSheet,
): NonNullable<CharacterBuildCreatureInput["conditions"]> {
  return [
    ...sheet.conditions,
    ...(sheet.hitPoints.tag === "knockedOut" ? (["unconscious"] as const) : []),
  ];
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

function withDefinedCharacterBattleSheetState(
  sheet: CharacterSheet,
): Pick<CharacterBuildCreatureInput, "resourceExpenditures"> &
  Partial<
    Pick<
      CharacterBuildCreatureInput,
      | "conditions"
      | "positiveHpUnconscious"
      | "zeroHpLifecycle"
      | "spellSlots"
      | "bookOfShadowsPresence"
    >
  > {
  const conditions = characterSheetInitialConditions(sheet);
  const positiveHpUnconscious = characterSheetPositiveHpUnconscious(sheet);
  const zeroHpLifecycle = characterSheetZeroHpLifecycle(sheet);
  const spellSlots = characterSheetBattleSpellSlots(sheet);
  return {
    conditions,
    ...(positiveHpUnconscious === undefined ? {} : { positiveHpUnconscious }),
    ...(zeroHpLifecycle === undefined ? {} : { zeroHpLifecycle }),
    ...(spellSlots === undefined ? {} : { spellSlots }),
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
    resourceExpenditures: sheet.resourceExpenditures,
  };
}

function characterSheetBattleSpellSlots(
  sheet: CharacterSheet,
): readonly CharacterSheetSpellSlotState[] | undefined {
  const spellSlots = characterSheetSpellSlots(sheet);
  const pactSlots = characterSheetPactSlots(sheet);
  if (
    pactSlots !== undefined &&
    (spellSlots === undefined || spellSlots.length === 0)
  ) {
    return [
      {
        spellLevel: pactSlots.slotLevel,
        count: pactSlots.count,
        expended: pactSlots.expended,
      },
    ];
  }
  return spellSlots;
}

const mixedSpellAndPactSlotStateMessage =
  "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.";

function hasMixedSpellAndPactSlotState(sheet: CharacterSheet): boolean {
  const spellSlots = characterSheetSpellSlots(sheet);
  return (
    characterSheetPactSlots(sheet) !== undefined &&
    spellSlots !== undefined &&
    spellSlots.length > 0
  );
}

function hasPurePactSlotState(sheet: CharacterSheet): boolean {
  const spellSlots = characterSheetSpellSlots(sheet);
  return (
    characterSheetPactSlots(sheet) !== undefined &&
    (spellSlots === undefined || spellSlots.length === 0)
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
    return characterSheetBattleHandoffIssue(
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
    return characterSheetBattleHandoffIssue(
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

function characterSheetPositiveHpUnconscious(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["positiveHpUnconscious"] {
  return sheet.hitPoints.tag === "knockedOut"
    ? KNOCKED_OUT_UNCONSCIOUS
    : undefined;
}

function characterSheetPositiveHpUnconsciousFromBattle(): CharacterSheetPositiveHpUnconscious {
  return CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS;
}

function characterSheetZeroHpLifecycle(
  sheet: CharacterSheet,
): CharacterZeroHpLifecycleInit | undefined {
  if (sheet.hitPoints.tag !== "zero") return undefined;
  const lifecycle = sheet.hitPoints.lifecycle;
  if (lifecycle.tag === "stable") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
        dead: false,
        hpRegained: false,
      },
    };
  }
  if (lifecycle.tag === "dead") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: lifecycle.deathSaves,
        stable: false,
        dead: true,
        hpRegained: false,
      },
    };
  }
  return {
    policy: "usesDeathSavingThrows",
    deathSaves: {
      deathSaves: lifecycle.deathSaves,
      stable: false,
      dead: false,
      hpRegained: false,
    },
  };
}

function characterZeroHpLifecycleFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Result.Result<
  CharacterSheetZeroHpLifecycleInput,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return characterSheetBattleHandoffIssue(
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
      return characterSheetBattleHandoffIssue(stableRecoveryIssue);
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

function unsupportedStableRecoveryBattleBoundary(
  sheet: CharacterSheet,
): string | null {
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return null;
  }
  return freshStableRecovery(sheet.hitPoints.lifecycle.recovery)
    ? null
    : "Battle handoff cannot preserve in-progress Stable recovery timers.";
}

function freshStableRecovery(recovery: CharacterSheetStableRecovery): boolean {
  return (
    recovery.kind === "regains1HpAfter1d4Hours" &&
    Number(recovery.elapsedBeforeRecoveryRoll) === 0
  );
}
