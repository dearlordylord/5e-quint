import {
  combatantKnockedOutUnconscious,
  classFeatureSpellFreeCastProfileForResource,
  KNOCKED_OUT_UNCONSCIOUS,
  type BattleCreatureState,
  type CharacterZeroHpLifecycleInit,
} from "@dnd/battle-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetPactSlots,
  characterSheetSpellSlots,
  characterSheetTempHp,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetIssue,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetStableRecovery,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { CONDITIONS, resourceCount, type Condition } from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { isSupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";

import {
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import { battleCreatureInitIssue } from "./battle-character-build-projection.ts";

export {
  battleCreatureInitFromCharacterBuild,
  characterBattleResourceInitsFromBuild,
  startBattleFromCharacterBuildAndStatBlock,
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
} from "./battle-character-build-projection.ts";
export {
  characterBattleWeaponMasterySelections,
  characterUnitRefsWithBattleSupportProfiles,
  type BattleSupportProfileIssue,
} from "./battle-support-profiles.ts";

export type CharacterSheetBattleInitInput = Omit<
  CharacterBuildCreatureInput,
  | "build"
  | "characterId"
  | "currentHp"
  | "tempHp"
  | "conditions"
  | "positiveHpUnconscious"
  | "zeroHpLifecycle"
  | "spellSlots"
  | "bookOfShadowsPresence"
> & {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
};

export type CharacterSheetBattleHandoffIssue =
  | {
      readonly tag: "characterSheetBattleHandoffIssue";
      readonly message: string;
    }
  | CharacterSheetIssue;

export function characterSheetBattleInit(input: CharacterSheetBattleInitInput) {
  const { sheet, unitLibrary, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return battleCreatureInitIssue(stableRecoveryIssue);
  }
  return battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
  });
}

export function applyBattleHandoffToCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (input.combatant.origin.kind !== "character") {
    return characterSheetBattleHandoffIssue(
      "Battle handoff combatant is not a character.",
    );
  }
  if (input.combatant.origin.characterId !== input.sheet.characterId) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff character identity does not match Character Sheet.",
    );
  }
  if (input.combatant.maxHp !== input.sheet.maximumHp) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > input.sheet.maximumHp) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff current HP exceeds Character Sheet maximum HP.",
    );
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Either.isLeft(zeroHpLifecycle)) {
    return Either.left(zeroHpLifecycle.left);
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Either.isLeft(knockedOut)) {
    return characterSheetBattleHandoffIssue(knockedOut.left.message);
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);

  return createFreshCharacterSheet({
    characterId: input.sheet.characterId,
    build: input.sheet.build,
    maximumHp: input.sheet.maximumHp,
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
    ...(input.combatant.origin.spellcasting === undefined
      ? {}
      : { spellSlots: input.combatant.origin.spellcasting.spellSlots }),
    ...(pactSlots === undefined ? {} : { pactSlots }),
    ...(bookOfShadowsPresence === undefined ? {} : { bookOfShadowsPresence }),
    spentHitDice: input.sheet.spentHitDice,
    restFeatureUses: input.sheet.restFeatureUses,
    resourceExpenditures: resourceExpenditures.right,
  });
}

function characterResourceExpendituresFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetBattleHandoffIssue
> {
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      !isSupportedClassFeatureSpellFreeCastResourceTag(expenditure.tag),
  );
  if (input.combatant.origin.kind !== "character") {
    return Either.right(nextExpenditures);
  }
  const nextFreeCastExpenditures: CharacterSheetResourceExpenditure[] = [];
  for (const resource of input.combatant.origin.resources ?? []) {
    const profile = classFeatureSpellFreeCastProfileForResource(resource);
    if (profile === null) {
      continue;
    }
    if (resource.resource.cap.kind !== "fixed") {
      return characterSheetBattleHandoffIssue(
        "Class feature spell free casts must use a fixed battle resource cap during battle handoff.",
      );
    }
    if (resource.usesRemaining === undefined) {
      return characterSheetBattleHandoffIssue(
        "Class feature spell free casts must carry remaining uses during battle handoff.",
      );
    }
    const expended = resource.resource.cap.uses - resource.usesRemaining;
    if (expended < 0) {
      return characterSheetBattleHandoffIssue(
        "Class feature spell free-cast remaining uses exceed the battle resource cap during battle handoff.",
      );
    }
    if (expended > 0) {
      nextFreeCastExpenditures.push({
        tag: profile.resourceTag,
        expended: resourceCount(expended),
      });
    }
  }
  return Either.right([...nextExpenditures, ...nextFreeCastExpenditures]);
}

function characterSheetInitialConditions(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["conditions"] {
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

function withDefinedCharacterBattleSheetState(
  sheet: CharacterSheet,
): Partial<
  Pick<
    CharacterBuildCreatureInput,
    | "conditions"
    | "positiveHpUnconscious"
    | "zeroHpLifecycle"
    | "spellSlots"
    | "bookOfShadowsPresence"
    | "resourceExpenditures"
  >
> {
  const conditions = characterSheetInitialConditions(sheet);
  const positiveHpUnconscious = characterSheetPositiveHpUnconscious(sheet);
  const zeroHpLifecycle = characterSheetZeroHpLifecycle(sheet);
  const spellSlots = characterSheetSpellSlots(sheet);
  return {
    ...(conditions === undefined ? {} : { conditions }),
    ...(positiveHpUnconscious === undefined ? {} : { positiveHpUnconscious }),
    ...(zeroHpLifecycle === undefined ? {} : { zeroHpLifecycle }),
    ...(spellSlots === undefined ? {} : { spellSlots }),
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
    resourceExpenditures: sheet.resourceExpenditures,
  };
}

function bookOfShadowsPresenceFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): CharacterSheetBookOfShadowsPresence | undefined {
  if (input.combatant.origin.kind !== "character") {
    return input.sheet.bookOfShadowsPresence;
  }
  return (
    input.combatant.origin.spellcasting?.bookOfShadowsSpellAccesses[0]
      ?.bookPresence ?? input.sheet.bookOfShadowsPresence
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
    return characterSheetBattleHandoffIssue(
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
      return characterSheetBattleHandoffIssue(stableRecoveryIssue);
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

function characterSheetBattleHandoffIssue(
  message: string,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return Either.left({
    tag: "characterSheetBattleHandoffIssue",
    message,
  });
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
