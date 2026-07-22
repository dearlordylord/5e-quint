// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.antilife-shell-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.antilife-shell-barrier-contract
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES,
  ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetAntilifeShellBarrierPlacement,
  type CharacterSheetAntilifeShellInvocation,
  type CharacterSheetAntilifeShellResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const ANTILIFE_SHELL_SPELL_ID = "antilife_shell" as const;
const ANTILIFE_SHELL_SPELL_LEVEL = spellSlotLevel(5);
const ANTILIFE_SHELL_DURATION_HOURS = 1;
const ANTILIFE_SHELL_RADIUS_FEET = 10;

export function castAntilifeShell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly placement: CharacterSheetAntilifeShellBarrierPlacement;
}): Either.Either<CharacterSheetAntilifeShellResult, CharacterSheetIssue> {
  const spell = antilifeShellSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Antilife Shell requires prepared class Spell Access.",
    );
  }

  const invocation = antilifeShellInvocationFromSpell({
    spell: spell.right,
    placement: input.placement,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: ANTILIFE_SHELL_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function antilifeShellSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(
    unitLibrary,
    authoredUnitId(ANTILIFE_SHELL_SPELL_ID),
  );
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Antilife Shell requires a Spell record.");
  }
  return Either.right(unit.right);
}

function antilifeShellInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly placement: CharacterSheetAntilifeShellBarrierPlacement;
}): Either.Either<CharacterSheetAntilifeShellInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "abjuration" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== ANTILIFE_SHELL_DURATION_HOURS ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Antilife Shell requires the supported level-5 creature barrier profile.",
    );
  }

  if (!hasSupportedAntilifeShellAttachment(spell)) {
    return characterSheetIssue(
      "Antilife Shell requires the supported self-originating Emanation profile.",
    );
  }
  if (!hasSupportedAntilifeShellOperation(spell)) {
    return characterSheetIssue(
      "Antilife Shell requires the supported creature passage prevention profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Antilife Shell requires a supported duration.");
  }

  return Either.right({
    tag: "antilifeShell",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: ANTILIFE_SHELL_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    range: { kind: "self" },
    duration: duration.right,
    concentrationRequired: true,
    placement: input.placement,
    barrier: {
      origin: "caster",
      shape: {
        kind: "emanation",
        radiusFeet: ANTILIFE_SHELL_RADIUS_FEET,
        movesWithCaster: true,
      },
      prevents: ["creature_passage", "creature_reach_through"],
      exceptCreatureTypes: [...ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES],
      allowedThroughBarrier: [
        ...ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES,
      ],
      crossingMembershipOwner: "table",
      forcedPassageByCasterMovement: {
        endsSpell: true,
        owner: "table",
      },
    },
  });
}

function hasSupportedAntilifeShellAttachment(spell: SpellRecord): boolean {
  if (spell.mechanics.family !== "ongoing_effect") return false;
  const attachment = spell.mechanics.attachment;
  return (
    attachment.kind === "area" &&
    attachment.origin.kind === "self" &&
    attachment.shape.kind === "emanation" &&
    attachment.shape.radiusFeet === ANTILIFE_SHELL_RADIUS_FEET
  );
}

function hasSupportedAntilifeShellOperation(spell: SpellRecord): boolean {
  if (spell.mechanics.family !== "ongoing_effect") return false;
  return spell.mechanics.operations.some((operation) => {
    const effect = operation.effect;
    return (
      operation.trigger.kind === "passive" &&
      effect.kind === "prevent_creature_passage" &&
      sameStringSet(
        effect.exceptCreatureTypes,
        ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES,
      ) &&
      sameStringSet(
        effect.allowsThroughBarrier,
        ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES,
      )
    );
  });
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    right.every((value) => left.some((candidate) => candidate === value))
  );
}
