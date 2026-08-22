// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.telekinesis-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.telekinesis-force-control
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTelekinesisEffect,
  type CharacterSheetTelekinesisInvocation,
  type CharacterSheetTelekinesisResult,
  type CharacterSheetTelekinesisTarget,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const TELEKINESIS_SPELL_ID = "telekinesis" as const;
const TELEKINESIS_SPELL_LEVEL = spellSlotLevel(5);
const TELEKINESIS_RANGE_FEET = 60;
const TELEKINESIS_DURATION_MINUTES = 10;
const TELEKINESIS_MOVE_FEET = 30;
const TELEKINESIS_MODE_IDS = [
  "creature",
  "unattended_object",
  "worn_or_carried_object",
  "fine_object_control",
] as const;

export function castTelekinesis(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetTelekinesisTarget;
}): Either.Either<CharacterSheetTelekinesisResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(TELEKINESIS_SPELL_ID),
    spellLevel: TELEKINESIS_SPELL_LEVEL,
    spellName: "Telekinesis",
    invocation: (spell) => {
      const targetIssue = telekinesisTargetIssue(input.target);
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return telekinesisInvocationFromSpell({
        spell: spell,
        target: input.target,
      });
    },
  });
}

function telekinesisTargetIssue(
  target: CharacterSheetTelekinesisTarget,
): string | null {
  /* v8 ignore start -- @preserve -- These branches reject malformed visibility or size facts outside the narrowed Telekinesis target contract. */
  if (target.visibleWithinRange !== true) {
    return "Telekinesis target must be visible within 60 feet.";
  }
  if ("hugeOrSmaller" in target && target.hugeOrSmaller !== true) {
    return "Telekinesis supports Huge or smaller creature and object targets.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function telekinesisInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetTelekinesisTarget;
}): Either.Either<CharacterSheetTelekinesisInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Telekinesis support profile required by this projector. */
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "transmutation" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== TELEKINESIS_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== TELEKINESIS_DURATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Telekinesis requires the supported level-5 sustained force-control profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- The catalog record has Telekinesis spell facts but omits the cast/repeat control operations. */
  if (!hasSupportedTelekinesisOperations(spell)) {
    return characterSheetIssue(
      "Telekinesis requires the supported cast-and-repeat Magic Action control operations.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- @preserve -- The exact ten-minute duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Telekinesis requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

  return Either.right({
    tag: "telekinesis",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: TELEKINESIS_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: TELEKINESIS_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    target: input.target,
    savingThrow: {
      creatureOrCarrierAbility: "str",
      dc: "caster_spell_save_dc",
    },
    initialExertion: telekinesisEffect(input.target),
    laterTurnControl: {
      action: "magic_action",
      mayChooseNewVisibleTargetWithinRange: true,
      availableModes: [
        "creature",
        "unattended_object",
        "worn_or_carried_object",
        "fine_object_control",
      ],
    },
  });
}

function hasSupportedTelekinesisOperations(spell: SpellRecord): boolean {
  /* v8 ignore next -- @preserve -- Unsupported authored Telekinesis data: admission requires ongoing-effect mechanics before operation projection. */
  if (spell.mechanics.family !== "ongoing_effect") return false;
  const operations = spell.mechanics.operations;
  const starts = operations.some(
    (operation) =>
      operation.trigger.kind === "on_effect_starts" &&
      isTelekinesisModeChoice(operation.effect),
  );
  const repeats = operations.some(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      isTelekinesisModeChoice(operation.effect),
  );
  return starts && repeats;
}

function isTelekinesisModeChoice(effect: unknown): boolean {
  /* v8 ignore start -- @preserve -- Non-record or differently tagged effect entries are unsupported authored Telekinesis operation data. */
  if (!isRecord(effect) || effect.kind !== "choose_effect_mode") {
    return false;
  }
  /* v8 ignore stop -- @preserve */
  const options = effect.options;
  /* v8 ignore next -- @preserve -- Unsupported authored Telekinesis data: the admitted mode choice requires an explicit option list. */
  if (!Array.isArray(options)) return false;
  return TELEKINESIS_MODE_IDS.every((id) =>
    options.some((option) => isRecord(option) && option.id === id),
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}

function telekinesisEffect(
  target: CharacterSheetTelekinesisTarget,
): CharacterSheetTelekinesisEffect {
  if (target.tag === "creature") {
    return target.savingThrowOutcome.tag === "succeeded"
      ? { tag: "creatureSaveSucceeded", affected: false }
      : {
          tag: "creatureSaveFailed",
          forceMoveUpToFeet: TELEKINESIS_MOVE_FEET,
          movementDirection: "any_direction",
          condition: "restrained",
          conditionDuration: "until_end_of_caster_next_turn",
          suspendedIfLifted: true,
          fallsUnlessReapplied: true,
          tablePlacementOwner: "table",
        };
  }
  if (target.tag === "unattendedObject") {
    return {
      tag: "moveUnattendedObject",
      moveUpToFeet: TELEKINESIS_MOVE_FEET,
      tableObjectOwner: "table",
    };
  }
  if (target.tag === "wornOrCarriedObject") {
    return target.carrierSavingThrowOutcome.tag === "succeeded"
      ? { tag: "wornOrCarriedObjectSaveSucceeded", affected: false }
      : {
          tag: "wornOrCarriedObjectSaveFailed",
          pullAway: true,
          moveUpToFeet: TELEKINESIS_MOVE_FEET,
          tableObjectOwner: "table",
        };
  }
  return {
    tag: "fineObjectControl",
    tableObjectOwner: "table",
  };
}
