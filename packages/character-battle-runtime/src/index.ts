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
  battleInitializationIssueFactFields,
  type BattleCreatureInit,
  type BattleId,
  type BattleCreatureState,
  type BattleStateInitIssue,
  type BattleStatBlockInitializationIssue,
  type BattleInitializationIssueFacts,
  type BattleRuntimeSession,
  type CombatantId,
  type CharacterBattleResourceOwnership,
  type CharacterBattleResourceState,
  type CharacterBattleClassLevels,
  type CharacterBattleRuntimeContext,
  type CharacterZeroHpLifecycleInit,
  type AuthoredStatBlockBattleInitInput,
  battleStateInitIssueMessage,
} from "@dnd/battle-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximum,
  characterSheetHitPointMaximumProjectionWithIssues,
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
  type CharacterSheetHitPointMaximumProjectionIssue,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  type Condition,
  type Hp,
  type ReadonlyNonEmptyArray,
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
import type { CharacterBuildProjectionIssue } from "@dnd/character-creation-runtime";
import { Either, Match, Option } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";

import {
  CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE,
  battleCreatureInitFromCharacterBuild,
  type CharacterBattleCreatureInitResult,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import {
  type BattleCreatureInitIssue,
  battleCreatureInitIssue,
  battleCreatureInitIssueMessage,
  battleCreatureInitIssuesFromCharacterBuildProjection,
  battleCreatureInitIssueLeaves,
  characterBattleInitIssueFactFields,
  type CharacterBattleInitIssueFact,
  type CharacterBattleSpellAccessProjectionIssue,
} from "./battle-character-build-projection.ts";
import { characterBattleOriginFeatSelectedReferenceProjection } from "./origin-feat-selected-reference-projection.ts";
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
  rejectCharacterBattleHandoffRoute,
  type CharacterBattleRouteEvent,
} from "./character-battle-route.ts";
import { settleCompanionFromBattle } from "./companion-handoff.ts";

function characterBattleHandoffValidationIssue(
  check: CharacterSheetBattleHandoffValidationCheck,
  message: string,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return characterSheetBattleHandoffIssue(
    { handoffReason: "validation", check },
    message,
  );
}

export function characterBattleRuntimeIssueMessage(
  issue: BattleCreatureInitIssue | BattleStateInitIssue,
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
  readonly init: BattleRosterCharacterCombatant;
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export type CharacterBattleInitProjectionIssue = BattleCreatureInitIssue & {
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export type BattleRosterCharacterCombatant = Omit<
  BattleCreatureInit,
  "creatureInit"
> & {
  readonly creatureInit: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >;
};

export type BattleRosterStatBlockCombatant = Omit<
  BattleCreatureInit,
  "creatureInit"
> & {
  readonly creatureInit: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "statBlock" }
  >;
};

export type BattleRosterCharacterSource =
  | {
      readonly kind: "available";
      readonly input: CharacterSheetBattleInitInput;
    }
  | {
      readonly kind: "missing";
      readonly characterId: CharacterSheet["characterId"];
      readonly combatantId: CharacterSheetBattleInitInput["combatantId"];
    }
  | {
      readonly kind: "inBattle";
      readonly characterId: CharacterSheet["characterId"];
      readonly combatantId: CharacterSheetBattleInitInput["combatantId"];
      readonly battleId: BattleId;
    };

export type BattleRosterStatBlockSource =
  | {
      readonly kind: "available";
      readonly input: AuthoredStatBlockBattleInitInput;
    }
  | {
      readonly kind: "missing";
      readonly statBlockId: StatBlockRecord["id"];
      readonly combatantId: AuthoredStatBlockBattleInitInput["combatantId"];
    };

export type BattleRosterEntry =
  | {
      readonly kind: "characterSheet";
      readonly source: BattleRosterCharacterSource;
    }
  | {
      readonly kind: "statBlock";
      readonly source: BattleRosterStatBlockSource;
    };

export type BattleRosterEntries = readonly [
  BattleRosterEntry,
  ...BattleRosterEntry[],
];

type BattleRosterStatBlockProjectionFact = {
  [K in BattleInitializationIssueFacts["kind"]]: Omit<
    Extract<BattleInitializationIssueFacts, { readonly kind: K }>,
    "kind"
  > & { readonly reason: K };
}[BattleInitializationIssueFacts["kind"]];

type BattleRosterCharacterProjectionIssue = {
  readonly kind: "characterSheetProjection";
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issueTag: "battleCreatureInitIssue";
  readonly message: string;
} & CharacterBattleInitIssueFact;

type BattleRosterStatBlockProjectionIssue = {
  readonly kind: "statBlockProjection";
  readonly index: number;
  readonly combatantId: BattleCreatureInit["combatantId"];
  readonly issueTag: "battleStateInitIssue";
  readonly message: string;
} & BattleRosterStatBlockProjectionFact;

export type BattleRosterAdmission =
  | {
      readonly index: number;
      readonly kind: "characterSheet";
      readonly combatant: BattleRosterCharacterCombatant;
      readonly routeEvents: readonly CharacterBattleRouteEvent[];
    }
  | {
      readonly index: number;
      readonly kind: "statBlock";
      readonly combatant: BattleRosterStatBlockCombatant;
      readonly routeEvents: readonly [];
    };

export type BattleRosterIssue =
  | {
      readonly kind: "duplicateCombatantId";
      readonly index: number;
      readonly combatantId: BattleCreatureInit["combatantId"];
      readonly firstIndex: number;
    }
  | {
      readonly kind: "duplicateCharacterId";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly firstIndex: number;
    }
  | {
      readonly kind: "characterSheetSourceUnavailable";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly reason: "missing";
    }
  | {
      readonly kind: "characterSheetSourceUnavailable";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly reason: "inBattle";
      readonly battleId: BattleId;
    }
  | {
      readonly kind: "statBlockSourceUnavailable";
      readonly index: number;
      readonly statBlockId: StatBlockRecord["id"];
      readonly combatantId: BattleCreatureInit["combatantId"];
    }
  | BattleRosterCharacterProjectionIssue
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause:
        | "missingSourceUnit"
        | "unsupportedSourceUnit"
        | "missingSpellListSource";
      readonly message: string;
    }
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause: "invalidSpellSelection";
      readonly issueIndex: number;
      readonly message: string;
    }
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly issueIndex: number;
      readonly cause: "invalidBuildSpellAccess";
      readonly message: string;
    }
  | BattleRosterStatBlockProjectionIssue;

function battleRosterIssueList(
  issue: BattleRosterIssue,
): ReadonlyNonEmptyArray<BattleRosterIssue> {
  return [issue];
}

export type BattleRosterComposition =
  | {
      readonly tag: "admitted";
      readonly admissions: ReadonlyNonEmptyArray<BattleRosterAdmission>;
    }
  | {
      readonly tag: "rejected";
      readonly admissions: readonly BattleRosterAdmission[];
      readonly issues: ReadonlyNonEmptyArray<BattleRosterIssue>;
    };

function characterBattleInitProjectionFromInit(
  init: CharacterBattleCreatureInitResult,
  routeEvents: readonly CharacterBattleRouteEvent[],
): Either.Either<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  return Either.right({ init, routeEvents });
}

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

function characterBattleInitIssueWithoutRouteEvents(
  issue: CharacterBattleInitProjectionIssue,
): BattleCreatureInitIssue {
  const { routeEvents: _routeEvents, ...routeFreeIssue } = issue;
  return routeFreeIssue;
}

export function characterSheetBattleInit(input: CharacterSheetBattleInitInput) {
  const projection = characterSheetBattleInitWithRoute(input);
  return Either.isLeft(projection)
    ? Either.left(characterBattleInitIssueWithoutRouteEvents(projection.left))
    : Either.right(projection.right.init);
}

export function characterSheetBattleInitWithRoute(
  input: CharacterSheetBattleInitInput,
): Either.Either<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  const { sheet, unitLibrary, statBlockCatalog, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return Either.left({
      tag: "battleCreatureInitIssue",
      message: stableRecoveryIssue,
      ...characterBattleInitIssueFactFields({
        kind: "characterBuildProjection",
        phase: "derivedState",
      }),
      routeEvents: rejectStableRecoveryBattleInitRoute(),
    });
  }
  if (hasMixedSpellAndPactSlotState(sheet)) {
    return Either.left({
      tag: "battleCreatureInitIssue",
      message: mixedSpellAndPactSlotStateMessage,
      ...characterBattleInitIssueFactFields({
        kind: "characterBuildProjection",
        phase: "spellcasting",
      }),
      routeEvents: rejectMixedSpellAndPactSlotBattleInitRoute(),
    });
  }
  const selectedReference =
    characterBattleOriginFeatSelectedReferenceProjection({
      build: sheet.build,
      unitLibrary,
    });
  if (Either.isLeft(selectedReference)) {
    return Either.left({
      ...selectedReference.left,
      routeEvents: rejectCharacterBattleInitProjectionRoute(),
    });
  }
  const druidWildShapeAvailableForms =
    battleDruidWildShapeAvailableFormsFromSheet({
      sheet,
      statBlockCatalog,
    });
  const hitPointMaximum = characterSheetHitPointMaximumProjectionWithIssues({
    sheet,
    unitLibrary,
  });
  if (Either.isLeft(hitPointMaximum)) {
    const issue = characterBattleHitPointMaximumIssue(hitPointMaximum.left);
    return Either.left({
      ...issue,
      routeEvents: rejectBuildHitPointBattleInitRoute(),
    });
  }
  const init = battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    hitPointMaximum: hitPointMaximum.right.effectiveHitPointMaximum,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
    ...(druidWildShapeAvailableForms === undefined
      ? {}
      : { druidWildShapeAvailableForms }),
  });
  if (Either.isLeft(init)) {
    return Either.left({
      ...init.left,
      routeEvents: rejectCharacterBattleInitProjectionRoute(),
    });
  }
  return characterBattleInitProjectionFromInit(
    init.right,
    acceptedCharacterSheetBattleInitRoute({ sheet }),
  );
}

function characterBattleHitPointMaximumIssue(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): BattleCreatureInitIssue {
  if (isCharacterBuildProjectionIssues(issue)) {
    return Either.merge(
      battleCreatureInitIssuesFromCharacterBuildProjection(issue, "hitPoints"),
    );
  }
  return Either.merge(
    battleCreatureInitIssue(issue.message, {
      kind: "characterBuildProjection",
      phase: "hitPoints",
    }),
  );
}

function isCharacterBuildProjectionIssues(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): issue is ReadonlyNonEmptyArray<CharacterBuildProjectionIssue> {
  return Array.isArray(issue);
}

/**
 * Admit an arbitrary mixed-origin initial roster in caller order.  The
 * operation owns identity checks and source/projection admission so callers
 * can inspect every entry before deciding whether to start a battle.
 */
export function composeBattleRoster(
  entries: BattleRosterEntries,
): BattleRosterComposition {
  const combatantOwners = new Map<BattleCreatureInit["combatantId"], number>();
  const characterOwners = new Map<CharacterSheet["characterId"], number>();
  const recordIdentity = (
    entry: BattleRosterEntry,
    index: number,
    issues: BattleRosterIssue[],
  ) => {
    const combatantId = rosterEntryCombatantId(entry);
    const firstCombatantIndex = combatantOwners.get(combatantId);
    const duplicateCombatant = firstCombatantIndex !== undefined;
    if (duplicateCombatant) {
      issues.push({
        kind: "duplicateCombatantId",
        index,
        combatantId,
        firstIndex: firstCombatantIndex,
      });
    } else {
      combatantOwners.set(combatantId, index);
    }

    const characterId = rosterEntryCharacterId(entry);
    const firstCharacterIndex =
      characterId === undefined ? undefined : characterOwners.get(characterId);
    const duplicateCharacter = firstCharacterIndex !== undefined;
    if (duplicateCharacter && characterId !== undefined) {
      issues.push({
        kind: "duplicateCharacterId",
        index,
        characterId,
        firstIndex: firstCharacterIndex,
      });
    } else if (characterId !== undefined) {
      characterOwners.set(characterId, index);
    }
    return { duplicateCombatant, duplicateCharacter };
  };
  const processEntry = (
    entry: BattleRosterEntry,
    index: number,
    issues: BattleRosterIssue[],
    admissions: BattleRosterAdmission[],
  ): void => {
    const { duplicateCombatant, duplicateCharacter } = recordIdentity(
      entry,
      index,
      issues,
    );

    const projection = projectBattleRosterEntry(entry, index);
    if (Either.isLeft(projection)) {
      issues.push(...projection.left);
      return;
    }
    if (duplicateCombatant || duplicateCharacter) return;
    admissions.push(projection.right);
  };

  const [firstEntry, ...restEntries] = entries;
  const firstIdentityIssues: BattleRosterIssue[] = [];
  recordIdentity(firstEntry, 0, firstIdentityIssues);
  const firstProjection = projectBattleRosterEntry(firstEntry, 0);
  if (Either.isLeft(firstProjection)) {
    const [firstIssue, ...restIssues] = firstProjection.left;
    const issues: [BattleRosterIssue, ...BattleRosterIssue[]] = [
      firstIssue,
      ...restIssues,
    ];
    issues.unshift(...firstIdentityIssues);
    const admissions: BattleRosterAdmission[] = [];
    for (const [offset, entry] of restEntries.entries()) {
      processEntry(entry, offset + 1, issues, admissions);
    }
    return { tag: "rejected", admissions, issues };
  }

  const admissions: [BattleRosterAdmission, ...BattleRosterAdmission[]] = [
    firstProjection.right,
  ];
  const issues: BattleRosterIssue[] = [];
  for (const [offset, entry] of restEntries.entries()) {
    processEntry(entry, offset + 1, issues, admissions);
  }
  return isNonEmptyReadonlyArray(issues)
    ? { tag: "rejected", admissions, issues }
    : { tag: "admitted", admissions };
}

function rosterEntryCombatantId(
  entry: BattleRosterEntry,
): BattleCreatureInit["combatantId"] {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, ({ source }) =>
      characterRosterSourceCombatantId(source),
    ),
    Match.when({ kind: "statBlock" }, ({ source }) =>
      statBlockRosterSourceCombatantId(source),
    ),
    Match.exhaustive,
  );
}

function characterRosterSourceCombatantId(
  source: BattleRosterCharacterSource,
): BattleCreatureInit["combatantId"] {
  return Match.value(source).pipe(
    Match.when({ kind: "available" }, ({ input }) => input.combatantId),
    Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
    Match.when({ kind: "inBattle" }, ({ combatantId }) => combatantId),
    Match.exhaustive,
  );
}

function statBlockRosterSourceCombatantId(
  source: BattleRosterStatBlockSource,
): BattleCreatureInit["combatantId"] {
  return Match.value(source).pipe(
    Match.when({ kind: "available" }, ({ input }) => input.combatantId),
    Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
    Match.exhaustive,
  );
}

function rosterEntryCharacterId(
  entry: BattleRosterEntry,
): CharacterSheet["characterId"] | undefined {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, ({ source }) =>
      Match.value(source).pipe(
        Match.when(
          { kind: "available" },
          ({ input }) => input.sheet.characterId,
        ),
        Match.when({ kind: "missing" }, ({ characterId }) => characterId),
        Match.when({ kind: "inBattle" }, ({ characterId }) => characterId),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "statBlock" }, () => undefined),
    Match.exhaustive,
  );
}

function battleRosterCharacterProjectionIssues(input: {
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issue: BattleCreatureInitIssue;
}): ReadonlyNonEmptyArray<BattleRosterIssue> {
  const [firstIssue, ...restIssues] = battleCreatureInitIssueLeaves(
    input.issue,
  );
  return [
    Match.value(firstIssue).pipe(
      Match.when(
        { tag: "battleCreatureInitIssue" },
        ({ message, ...facts }) => ({
          kind: "characterSheetProjection" as const,
          index: input.index,
          characterId: input.characterId,
          issueTag: "battleCreatureInitIssue" as const,
          ...facts,
          message,
        }),
      ),
      Match.when(
        { tag: "characterBattleSpellAccessProjectionIssue" },
        (spellAccessIssue) =>
          battleRosterCharacterSpellAccessProjectionIssue({
            index: input.index,
            characterId: input.characterId,
            issue: spellAccessIssue,
          }),
      ),
      Match.exhaustive,
    ),
    ...restIssues.map((issue) =>
      Match.value(issue).pipe(
        Match.when(
          { tag: "battleCreatureInitIssue" },
          ({ message, ...facts }) => ({
            kind: "characterSheetProjection" as const,
            index: input.index,
            characterId: input.characterId,
            issueTag: "battleCreatureInitIssue" as const,
            ...facts,
            message,
          }),
        ),
        Match.when(
          { tag: "characterBattleSpellAccessProjectionIssue" },
          (spellAccessIssue) =>
            battleRosterCharacterSpellAccessProjectionIssue({
              index: input.index,
              characterId: input.characterId,
              issue: spellAccessIssue,
            }),
        ),
        Match.exhaustive,
      ),
    ),
  ];
}

function battleRosterCharacterSpellAccessProjectionIssue(input: {
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issue: CharacterBattleSpellAccessProjectionIssue;
}): Extract<BattleRosterIssue, { kind: "characterSheetProjection" }> {
  return Match.value(input.issue).pipe(
    Match.when(
      { cause: "invalidBuildSpellAccess" },
      ({ issueIndex, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        issueIndex,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "missingSourceUnit" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "unsupportedSourceUnit" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "missingSpellListSource" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "invalidSpellSelection" },
      ({ accessIndex, featUnitId, cause, issueIndex, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        issueIndex,
        message,
      }),
    ),
    Match.exhaustive,
  );
}

function battleRosterStatBlockProjectionIssue(input: {
  readonly index: number;
  readonly combatantId: BattleCreatureInit["combatantId"];
  readonly issue: BattleStatBlockInitializationIssue;
  readonly issueIndex: number;
}): Extract<BattleRosterIssue, { kind: "statBlockProjection" }> {
  const { message, ...fields } = input.issue;
  return {
    kind: "statBlockProjection" as const,
    index: input.index,
    combatantId: input.combatantId,
    issueTag: "battleStateInitIssue" as const,
    ...battleInitializationIssueFactFields(
      "kind" in fields
        ? fields
        : {
            kind: "runtimeAdmissionInvalid" as const,
            combatantId: input.combatantId,
            origin: "statBlock" as const,
            issueIndex: input.issueIndex,
          },
    ),
    message,
  };
}

function battleRosterStatBlockProjectionIssues(input: {
  readonly index: number;
  readonly combatantId: BattleCreatureInit["combatantId"];
  readonly issue: BattleStatBlockInitializationIssue;
}): ReadonlyNonEmptyArray<BattleRosterIssue> {
  return [
    battleRosterStatBlockProjectionIssue({
      index: input.index,
      combatantId: input.combatantId,
      issue: input.issue,
      issueIndex: 0,
    }),
  ];
}

function projectBattleRosterEntry(
  entry: BattleRosterEntry,
  index: number,
): Either.Either<
  BattleRosterAdmission,
  ReadonlyNonEmptyArray<BattleRosterIssue>
> {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, (matched) => {
      return Match.value(matched.source).pipe(
        Match.when({ kind: "missing" }, (source) =>
          Either.left(
            battleRosterIssueList({
              kind: "characterSheetSourceUnavailable" as const,
              index,
              characterId: source.characterId,
              reason: "missing" as const,
            }),
          ),
        ),
        Match.when({ kind: "inBattle" }, (source) =>
          Either.left(
            battleRosterIssueList({
              kind: "characterSheetSourceUnavailable" as const,
              index,
              characterId: source.characterId,
              reason: "inBattle" as const,
              battleId: source.battleId,
            }),
          ),
        ),
        Match.when({ kind: "available" }, (source) => {
          const projection = characterSheetBattleInitWithRoute(source.input);
          if (Either.isLeft(projection)) {
            return Either.left(
              battleRosterCharacterProjectionIssues({
                index,
                characterId: source.input.sheet.characterId,
                issue: characterBattleInitIssueWithoutRouteEvents(
                  projection.left,
                ),
              }),
            );
          }
          return Either.right({
            kind: "characterSheet" as const,
            index,
            combatant: projection.right.init,
            routeEvents: projection.right.routeEvents,
          });
        }),
        Match.exhaustive,
      );
    }),
    Match.when({ kind: "statBlock" }, (matched) => {
      return Match.value(matched.source).pipe(
        Match.when({ kind: "missing" }, (source) =>
          Either.left(
            battleRosterIssueList({
              kind: "statBlockSourceUnavailable" as const,
              index,
              statBlockId: source.statBlockId,
              combatantId: source.combatantId,
            }),
          ),
        ),
        Match.when({ kind: "available" }, (source) => {
          const projection = battleCreatureInitFromStatBlock(source.input);
          if (Either.isLeft(projection)) {
            return Either.left(
              battleRosterStatBlockProjectionIssues({
                index,
                combatantId: source.input.combatantId,
                issue: projection.left,
              }),
            );
          }
          return Either.right({
            kind: "statBlock" as const,
            index,
            combatant: projection.right,
            routeEvents: [] as const,
          });
        }),
        Match.exhaustive,
      );
    }),
    Match.exhaustive,
  );
}

export function battleCreatureInitFromCharacterBuildWithRoute(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): Either.Either<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  const init = battleCreatureInitFromCharacterBuild(input);
  if (Either.isLeft(init)) {
    return Either.left({
      ...init.left,
      routeEvents: characterBuildInitIssueRoute(init.left),
    });
  }
  return characterBattleInitProjectionFromInit(init.right, [
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
  /**
   * The nominal battle session carries the only valid state/context pairing.
   * Settlement is also used when removing a character from an active roster,
   * so the session is not required to be in a separate terminal state.
   */
  readonly battleSession: BattleRuntimeSession;
  readonly combatantId: CombatantId;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
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
  if (Either.isLeft(settledCharacter)) return settledCharacter;
  return settleCompanionFromBattle({
    sheet: settledCharacter.right,
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
}): Either.Either<Hp, CharacterSheetBattleHandoffIssue> {
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
  if (Either.isLeft(hitPointMaximum)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(hitPointMaximum.left),
    );
  }
  if (input.combatant.maxHp !== hitPointMaximum.right) {
    return characterBattleHandoffValidationIssue(
      "maximumHitPointMismatch",
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > hitPointMaximum.right) {
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
  return Either.right(hitPointMaximum.right);
}

function settleBattleCombatantIntoCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const validatedHitPointMaximum = validateBattleCombatantForCharacterSheet({
    sheet: input.sheet,
    combatant: input.combatant,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(validatedHitPointMaximum)) {
    return Either.left(validatedHitPointMaximum.left);
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Either.isLeft(zeroHpLifecycle)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(zeroHpLifecycle.left),
    );
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Either.isLeft(knockedOut)) {
    const [firstIssue] = characterSheetBattleHandoffIssuesFromStateInit(
      knockedOut.left,
    );
    return Either.left(firstIssue);
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(resourceExpenditures.left),
    );
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);
  const druidWildShapeKnownForms = characterSheetDruidWildShapeKnownForms(
    input.sheet,
  );
  const spellSlotState = characterSheetSpellSlotSourceStateFromBattle(input);
  if (Either.isLeft(spellSlotState)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(spellSlotState.left),
    );
  }
  const pactSlotExpenditure =
    pactSlots === undefined
      ? Either.right(undefined)
      : characterSheetPactSlotExpenditureFromBattle(input, pactSlots);
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(pactSlotExpenditure.left),
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
    ...(knockedOut.right === null
      ? {}
      : {
          positiveHpUnconscious:
            characterSheetPositiveHpUnconsciousFromBattle(),
        }),
    ...(input.combatant.hp === 0 && zeroHpLifecycle !== undefined
      ? { zeroHpLifecycle: zeroHpLifecycle.right }
      : {}),
    ...(pactSlotExpenditure.right === undefined
      ? {}
      : { pactSlots: pactSlotExpenditure.right }),
    ...(bookOfShadowsPresence === undefined ? {} : { bookOfShadowsPresence }),
    ...(druidWildShapeKnownForms === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            druidWildShapeKnownForms.statBlockIds,
        }),
    spentHitDice: input.sheet.spentHitDice,
    restFeatureUses: input.sheet.restFeatureUses,
    resourceExpenditures: resourceExpenditures.right,
    companion: input.sheet.companion,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  if (Either.isLeft(sheet)) {
    return Either.left(characterSheetBattleHandoffIssueFromIssue(sheet.left));
  }
  if (spellSlotState.right === undefined) return Either.right(sheet.right);
  const replaced = replaceCharacterSheetSpellSlotSourceState({
    sheet: sheet.right,
    unitLibrary: input.unitLibrary,
    spellSlotState: spellSlotState.right,
  });
  return Either.isLeft(replaced)
    ? Either.left(characterSheetBattleHandoffIssueFromIssue(replaced.left))
    : Either.right(replaced.right);
}

function characterSheetSpellSlotSourceStateFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: CharacterBattleCreatureState;
}): Either.Either<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetBattleHandoffIssue
> {
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Either.right(undefined);
  }
  const sheetSpellSlots = characterSheetSpellSlots(input.sheet);
  const sheetSlotState = characterSheetSpellSlotSourceState(input.sheet);
  if (
    characterSheetPactSlots(input.sheet) !== undefined &&
    (sheetSpellSlots === undefined || sheetSpellSlots.length === 0)
  ) {
    return Either.right(undefined);
  }
  if (sheetSpellSlots === undefined || sheetSlotState === undefined) {
    return battleSpellcasting.spellSlots.length === 0
      ? Either.right(undefined)
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
    if (Either.isLeft(sourceSpend)) return Either.left(sourceSpend.left);
    ordinarySpellSlotExpenditures =
      sourceSpend.right.ordinarySpellSlotExpenditures;
    createdSpellSlots = sourceSpend.right.createdSpellSlots;
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

  return Either.right({
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
}): Either.Either<
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
  return Either.right({
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
}): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetBattleHandoffIssue
> {
  const sheetResources = characterSheetResources(
    input.sheet,
    input.unitLibrary,
  );
  if (Either.isLeft(sheetResources)) {
    return Either.left(
      characterSheetBattleHandoffIssueFromIssue(sheetResources.left),
    );
  }
  const origin = input.combatant.origin;
  const ownedBattleResources = characterBattleResourcesWithOwnership({
    resources: origin.resources,
    ownership: input.runtimeContext.resourceOwnership,
  });
  if (Either.isLeft(ownedBattleResources)) {
    return Either.left(ownedBattleResources.left);
  }
  const battleResources = ownedBattleResources.right;
  const wildShapeResource = druidWildShapeBattleResourceProjection(
    battleResources,
    origin.classLevels,
  );
  if (Either.isLeft(wildShapeResource)) {
    return Either.left(wildShapeResource.left);
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
  if (wildShapeResource.right.tag === "present") {
    battleUseCountResourceUnitIds.add(wildShapeResource.right.unitId);
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
      sheetResources: sheetResources.right,
      wildShapeResource: wildShapeResource.right,
    },
  );
  if (Either.isLeft(druidWildShapeExpenditure)) {
    return Either.left(druidWildShapeExpenditure.left);
  }
  for (const resource of battleResources) {
    const resourceUnit = resource.ownership.unit;
    const freeCastExpenditure =
      characterSheetSpellAccessFreeCastExpenditureFromBattle({
        resource,
        sheetResources: sheetResources.right,
      });
    if (Either.isLeft(freeCastExpenditure)) {
      return Either.left(freeCastExpenditure.left);
    }
    if (freeCastExpenditure.right !== null) {
      nextFreeCastExpenditures.push(freeCastExpenditure.right);
      continue;
    }
    if (
      resourceUnit.kind === "class_feature" &&
      !origin.classLevels.some(
        (classLevel) => classLevel.className === resourceUnit.className,
      )
    ) {
      return characterBattleHandoffValidationIssue(
        "classFeatureResourceClassLevelMissing",
        "Class feature battle resources require a matching class level during battle handoff.",
      );
    }
    const pointPoolExpenditure = characterSheetPointPoolExpenditureFromBattle({
      resource,
      classLevels: input.combatant.origin.classLevels,
      sheetResources: sheetResources.right,
    });
    if (Either.isLeft(pointPoolExpenditure)) {
      return Either.left(pointPoolExpenditure.left);
    }
    if (pointPoolExpenditure.right !== null) {
      nextPointPoolExpenditures.push(pointPoolExpenditure.right);
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
        return characterBattleHandoffValidationIssue(
          "spellAccessFreeCastCapShapeInvalid",
          "Spell Access free casts must use a fixed battle resource cap during battle handoff.",
        );
      }
      const fixedUses = resource.state.resource.cap.uses;
      const sheetCount = sheetFreeCastResourceCapacity({
        sheetResources: sheetResources.right,
        sourceUnitId: resource.ownership.unit.id,
        spellId: profile.spellId,
      });
      if (Either.isLeft(sheetCount)) return Either.left(sheetCount.left);
      if (resource.state.resource.cap.uses !== sheetCount.right) {
        return characterBattleHandoffValidationIssue(
          "spellAccessFreeCastCapacityMismatch",
          "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
        );
      }
      const expended = fixedUses - resource.state.usesRemaining;
      if (expended < 0) {
        return characterBattleHandoffValidationIssue(
          "spellAccessFreeCastRemainingUsesInvalid",
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
        return characterBattleHandoffValidationIssue(
          "classFeatureUseCountRemainingUsesInvalid",
          "Class feature use-count resources must carry finite remaining uses during battle handoff.",
        );
      }
      const sheetCount = sheetUseCountResourceCapacity({
        sheetResources: sheetResources.right,
        unitId: useCountUnitId,
      });
      if (Either.isLeft(sheetCount)) return Either.left(sheetCount.left);
      if (maxUses !== sheetCount.right) {
        return characterBattleHandoffValidationIssue(
          "classFeatureUseCountCapacityMismatch",
          "Class feature use-count battle capacity must match Character Sheet resource capacity.",
        );
      }
      const expended = Number(maxUses) - Number(resource.state.usesRemaining);
      if (expended < 0) {
        return characterBattleHandoffValidationIssue(
          "classFeatureUseCountRemainingUsesInvalid",
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
  return Either.right([
    ...nextExpenditures,
    ...nextFreeCastExpenditures,
    ...nextUseCountExpenditures,
    ...nextPointPoolExpenditures,
    ...(druidWildShapeExpenditure.right === undefined
      ? []
      : [druidWildShapeExpenditure.right]),
  ]);
}

function characterSheetPointPoolExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleResource;
  readonly classLevels: CharacterBattleClassLevels;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Either.Either<
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
    return Either.right(null);
  }
  const maxPoints = characterBattleResourceMaxPoints({
    unit: input.resource.ownership.unit,
    classLevels: input.classLevels,
  });
  if (maxPoints === undefined) {
    return characterBattleHandoffValidationIssue(
      "pointPoolRemainingPointsInvalid",
      "Class feature point-pool resources must carry finite remaining points during battle handoff.",
    );
  }
  const sheetCount = sheetPointPoolResourceCapacity({
    sheetResources: input.sheetResources,
    unitId: pointPoolUnitId,
  });
  if (Either.isLeft(sheetCount)) return Either.left(sheetCount.left);
  if (maxPoints !== sheetCount.right) {
    return characterBattleHandoffValidationIssue(
      "pointPoolCapacityMismatch",
      "Class feature point-pool battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended =
    Number(maxPoints) - Number(input.resource.state.pointsRemaining);
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "pointPoolRemainingPointsInvalid",
      "Class feature point-pool remaining points exceed the battle resource cap during battle handoff.",
    );
  }
  return expended > 0
    ? Either.right({
        tag: "pointPoolResource",
        unitId: pointPoolUnitId,
        expended: resourceCount(expended),
      })
    : Either.right(null);
}

function characterSheetSpellAccessFreeCastExpenditureFromBattle(input: {
  readonly resource: OwnedCharacterBattleResource;
  readonly sheetResources: readonly CharacterSheetResourceState[];
}): Either.Either<
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
    return Either.right(null);
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
  if (Either.isLeft(sheetCount)) return Either.left(sheetCount.left);
  if (input.resource.state.resource.cap.uses !== sheetCount.right) {
    return characterBattleHandoffValidationIssue(
      "spellAccessFreeCastCapacityMismatch",
      "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended =
    input.resource.state.resource.cap.uses - input.resource.state.usesRemaining;
  return expended > 0
    ? Either.right({
        tag: "spellAccessFreeCast",
        sourceUnitId: input.resource.ownership.unit.id,
        spellId,
        expended: resourceCount(expended),
      })
    : Either.right(null);
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
}): Either.Either<
  readonly OwnedCharacterBattleResource[],
  CharacterSheetBattleHandoffIssue
> {
  if (input.resources.length !== input.ownership.length) {
    return characterBattleHandoffValidationIssue(
      "resourceOwnershipLengthMismatch",
      "Battle handoff resource ownership must cover every mechanical resource exactly once.",
    );
  }
  const seenOwnershipRefs = new Set<string>();
  for (const ownership of input.ownership) {
    if (seenOwnershipRefs.has(ownership.resourcePoolRef)) {
      return characterBattleHandoffValidationIssue(
        "duplicateResourceOwnership",
        "Battle handoff resource ownership contains a duplicate resource pool reference.",
      );
    }
    seenOwnershipRefs.add(ownership.resourcePoolRef);
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
    ownedResources.push({ state, ownership });
  }
  return Either.right(ownedResources);
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
}): Either.Either<ResourceCount, CharacterSheetBattleHandoffIssue> {
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
    : Either.right(resource.count);
}

function sheetUseCountResourceCapacity(input: {
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly unitId: CharacterSheetUseCountResourceUnitId;
}): Either.Either<ResourceCount, CharacterSheetBattleHandoffIssue> {
  const resource = input.sheetResources.find(
    (candidate) =>
      candidate.tag === "useCountResource" && candidate.unitId === input.unitId,
  );
  return resource === undefined
    ? characterBattleHandoffValidationIssue(
        "useCountCapacityMissing",
        "Class feature use-count battle resource requires matching Character Sheet resource capacity.",
      )
    : Either.right(resource.count);
}

function sheetFreeCastResourceCapacity(input: {
  readonly sheetResources: readonly CharacterSheetResourceState[];
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellId: UnitRecord["id"];
}): Either.Either<ResourceCount, CharacterSheetBattleHandoffIssue> {
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
    : Either.right(resource.count);
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
): Either.Either<
  DruidWildShapeBattleResourceProjection,
  CharacterSheetBattleHandoffIssue
> {
  const resources = battleResources.filter(
    (resource) =>
      parseSupportedUnitFeatureProfile(resource.ownership.unit, classLevels)
        ?.kind === "druidWildShapeKnownForm",
  );
  if (resources.length > 1) {
    return characterBattleHandoffValidationIssue(
      "wildShapeResourceDuplicate",
      "Battle handoff supports exactly one Druid Wild Shape resource.",
    );
  }
  const resource = resources[0];
  if (resource === undefined) return Either.right({ tag: "absent" });
  const unitId = resource.ownership.unit.id;
  if (!isCharacterSheetUseCountResourceUnitId(unitId)) {
    return characterBattleHandoffValidationIssue(
      "wildShapeResourceTypeInvalid",
      "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
    );
  }
  return Either.right({ tag: "present", resource, unitId });
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
}): Either.Either<
  CharacterSheetResourceExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.wildShapeResource.tag === "absent") return Either.right(undefined);
  const { resource, unitId } = input.wildShapeResource;
  if (!("usesRemaining" in resource.state)) {
    return characterBattleHandoffValidationIssue(
      "wildShapeRemainingUsesMissing",
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
  if (Either.isLeft(sheetCount)) return Either.left(sheetCount.left);
  if (maxUses === undefined || maxUses !== sheetCount.right) {
    return characterBattleHandoffValidationIssue(
      "wildShapeCapacityMismatch",
      "Druid Wild Shape battle capacity must match Character Sheet resource capacity.",
    );
  }
  const expended = Number(maxUses) - Number(resource.state.usesRemaining);
  if (expended < 0) {
    return characterBattleHandoffValidationIssue(
      "wildShapeRemainingUsesInvalid",
      "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
    );
  }
  return Either.right(
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
): Either.Either<
  CharacterPactSlotExpenditure,
  CharacterSheetBattleHandoffIssue
> {
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Either.right({ expended: pactSlots.expended });
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
  return Either.right({ expended: battleSlot.expended });
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
}): Either.Either<
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
    return Either.right({ tag: "dead", deathSaves: lifecycle.deathSaves });
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
    return Either.right({
      tag: "stable",
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
    });
  }
  return Either.right({ tag: "unstable", deathSaves: lifecycle.deathSaves });
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
