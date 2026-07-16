// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.telekinesis-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.telekinesis-force-control
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTelekinesisEffect,
  type CharacterSheetTelekinesisInvocation,
  type CharacterSheetTelekinesisResult,
  type CharacterSheetTelekinesisTarget,
} from "./sheet-types.ts";

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
  const spell = telekinesisSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Telekinesis requires prepared class Spell Access.",
    );
  }

  const targetIssue = telekinesisTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = telekinesisInvocationFromSpell({
    spell: spell.right,
    target: input.target,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: TELEKINESIS_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function telekinesisSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, TELEKINESIS_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Telekinesis requires a Spell record.");
  }
  return Either.right(unit.right);
}

function telekinesisTargetIssue(
  target: CharacterSheetTelekinesisTarget,
): string | null {
  if (target.visibleWithinRange !== true) {
    return "Telekinesis target must be visible within 60 feet.";
  }
  if ("hugeOrSmaller" in target && target.hugeOrSmaller !== true) {
    return "Telekinesis supports Huge or smaller creature and object targets.";
  }
  return null;
}

function telekinesisInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetTelekinesisTarget;
}): Either.Either<CharacterSheetTelekinesisInvocation, CharacterSheetIssue> {
  const spell = input.spell;
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

  if (!hasSupportedTelekinesisOperations(spell)) {
    return characterSheetIssue(
      "Telekinesis requires the supported cast-and-repeat Magic Action control operations.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Telekinesis requires a supported duration.");
  }

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
  if (!isRecord(effect) || effect.kind !== "choose_effect_mode") {
    return false;
  }
  const options = effect.options;
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
