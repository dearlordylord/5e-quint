// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.dream-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.dream-communication-nightmare
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  DREAM_MATERIAL_COMPONENTS,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetDreamCasting,
  type CharacterSheetDreamInvocation,
  type CharacterSheetDreamMessenger,
  type CharacterSheetDreamMode,
  type CharacterSheetDreamOutcome,
  type CharacterSheetDreamResult,
  type CharacterSheetDreamTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const DREAM_SPELL_ID = "dream" as const;
const DREAM_SPELL_LEVEL = spellSlotLevel(5);
const DREAM_CASTING_TIME_MINUTES = 1;
const DREAM_DURATION_HOURS = 8;
const DREAM_NIGHTMARE_MAX_MESSAGE_WORDS = 10;

export function castDream(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly casting: CharacterSheetDreamCasting;
  readonly target: CharacterSheetDreamTarget;
  readonly messenger: CharacterSheetDreamMessenger;
  readonly mode: CharacterSheetDreamMode;
}): Either.Either<CharacterSheetDreamResult, CharacterSheetIssue> {
  const spell = dreamSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue("Dream requires prepared class Spell Access.");
  }

  const targetIssue = dreamTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const modeIssue = dreamModeIssue(input.mode);
  if (modeIssue !== null) return characterSheetIssue(modeIssue);

  const invocation = dreamInvocationFromSpell({
    spell: spell.right,
    casting: input.casting,
    target: input.target,
    messenger: input.messenger,
    mode: input.mode,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: DREAM_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function dreamSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, DREAM_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Dream requires a Spell record.");
  }
  return Either.right(unit.right);
}

function dreamTargetIssue(target: CharacterSheetDreamTarget): string | null {
  if (target.knownByCaster !== true) {
    return "Dream requires a target creature the caster knows.";
  }
  if (target.plane !== "same_plane_as_caster") {
    return "Dream requires the target to be on the same plane as the caster.";
  }
  if (target.sleepStateOwner !== "table") {
    return "Dream target sleep state must be table-owned session evidence.";
  }
  return null;
}

function dreamModeIssue(mode: CharacterSheetDreamMode): string | null {
  if (mode.tag === "conversation") return null;
  if (
    !Number.isInteger(mode.messageWordCount) ||
    mode.messageWordCount < 1 ||
    mode.messageWordCount > DREAM_NIGHTMARE_MAX_MESSAGE_WORDS
  ) {
    return "Dream nightmare message must be one to ten words.";
  }
  if (
    mode.savingThrowOutcome.tag !== "succeeded" &&
    mode.savingThrowOutcome.tag !== "failed"
  ) {
    return "Dream nightmare requires a Wisdom Saving Throw outcome.";
  }
  return null;
}

function dreamInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetDreamCasting;
  readonly target: CharacterSheetDreamTarget;
  readonly messenger: CharacterSheetDreamMessenger;
  readonly mode: CharacterSheetDreamMode;
}): Either.Either<CharacterSheetDreamInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "unlimited" ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== DREAM_CASTING_TIME_MINUTES ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== DREAM_DURATION_HOURS ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== "a handful of sand"
  ) {
    return characterSheetIssue(
      "Dream requires the supported level-5 Illusion session profile.",
    );
  }
  if (!hasDreamMaterialComponents(input.casting)) {
    return characterSheetIssue(
      "Dream requires the handful-of-sand Material component contract.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Dream requires the supported direct session-profile phase.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.value);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Dream requires a supported duration.");
  }

  return Either.right({
    tag: "dream",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: DREAM_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: {
      kind: "minutes",
      amount: DREAM_CASTING_TIME_MINUTES,
    },
    range: "special",
    duration: duration.right,
    materialComponents: input.casting.materialComponents,
    target: input.target,
    messenger: input.messenger,
    trance: {
      messengerCondition: "incapacitated",
      messengerSpeedFeet: 0,
      messengerCanEndAnyTime: true,
    },
    targetSleepContract: {
      targetMustBeSamePlaneCreatureKnownByCaster: true,
      sleepStateOwner: "table",
      awakeAtCastOptions: ["end_spell", "wait_for_sleep"],
    },
    messengerAppearance: {
      owner: "table",
    },
    mode: input.mode,
    savingThrow: dreamSavingThrow(input.mode),
    outcome: dreamOutcome(input.mode),
  });
}

function dreamSavingThrow(
  mode: CharacterSheetDreamMode,
): CharacterSheetDreamInvocation["savingThrow"] {
  if (mode.tag === "conversation") {
    return { tag: "notRequiredForConversation" };
  }
  return {
    tag: "requiredForNightmare",
    ability: "wis",
    dc: "caster_spell_save_dc",
    maxMessageWords: DREAM_NIGHTMARE_MAX_MESSAGE_WORDS,
  };
}

function dreamOutcome(
  mode: CharacterSheetDreamMode,
): CharacterSheetDreamOutcome {
  if (mode.tag === "conversation") {
    return {
      tag: "conversation",
      targetRecall: "perfect_on_waking",
      dreamContentsOwner: "table",
      dreamDeliveryOwner: "table",
    };
  }
  if (mode.savingThrowOutcome.tag === "succeeded") {
    return {
      tag: "nightmareSaveSucceeded",
      restBenefitDenied: false,
      damage: null,
    };
  }
  return {
    tag: "nightmareSaveFailed",
    restBenefitDenied: {
      timing: "target_rest",
      stateMutationOwner: "table",
    },
    damage: {
      diceCount: 3,
      dieSize: 6,
      damageType: "psychic",
      timing: "when_target_wakes",
      applicationOwner: "table",
    },
  };
}

function hasDreamMaterialComponents(
  casting: CharacterSheetDreamCasting,
): boolean {
  return casting.materialComponents.sand === DREAM_MATERIAL_COMPONENTS.sand;
}

export const completedDreamCasting = {
  tag: "completedDreamCasting",
  materialComponents: DREAM_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetDreamCasting;
