// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.dream-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.dream-communication-nightmare
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  DREAM_MATERIAL_COMPONENTS,
  characterSheetIssue,
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
import { hasSingleDirectSelfNoEffectPhase } from "./spell-profile-shape.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(DREAM_SPELL_ID),
    spellLevel: DREAM_SPELL_LEVEL,
    spellName: "Dream",
    invocation: (spell) => {
      const targetIssue = dreamTargetIssue(input.target);
      /* v8 ignore next -- @preserve -- Malformed Dream request: target facts are parsed by the narrowed request contract before invocation projection. */
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      const modeIssue = dreamModeIssue(input.mode);
      if (modeIssue !== null) return characterSheetIssue(modeIssue);
      return dreamInvocationFromSpell({
        spell: spell,
        casting: input.casting,
        target: input.target,
        messenger: input.messenger,
        mode: input.mode,
      });
    },
  });
}

function dreamTargetIssue(target: CharacterSheetDreamTarget): string | null {
  /* v8 ignore start -- @preserve -- These branches reject malformed target/session facts outside the narrowed Dream request contract. */
  if (target.knownByCaster !== true) {
    return "Dream requires a target creature the caster knows.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed Dream request: its narrowed target contract requires the caster and target to share a plane. */
  if (target.plane !== "same_plane_as_caster") {
    return "Dream requires the target to be on the same plane as the caster.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed Dream request: target sleep state is table-owned evidence at the session boundary. */
  if (target.sleepStateOwner !== "table") {
    return "Dream target sleep state must be table-owned session evidence.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function dreamModeIssue(mode: CharacterSheetDreamMode): string | null {
  if (mode.tag === "conversation") return null;
  /* v8 ignore start -- @preserve -- These branches reject malformed nightmare word-count or save-outcome facts. */
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
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Dream support profile required by this projector. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Missing Dream sand-component evidence is malformed cast-request material input. */
  if (!hasDreamMaterialComponents(input.casting)) {
    return characterSheetIssue(
      "Dream requires the handful-of-sand Material component contract.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The catalog record has Dream spell facts but no supported direct self phase. */
  if (!hasSingleDirectSelfNoEffectPhase(spell)) {
    return characterSheetIssue(
      "Dream requires the supported direct session-profile phase.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The exact eight-hour duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Dream requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

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
