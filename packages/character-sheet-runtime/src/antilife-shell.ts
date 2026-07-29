// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.antilife-shell-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.antilife-shell-barrier-contract
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES,
  ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetAntilifeShellBarrierPlacement,
  type CharacterSheetAntilifeShellInvocation,
  type CharacterSheetAntilifeShellResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const ANTILIFE_SHELL_SPELL_ID = "antilife_shell" as const;
const ANTILIFE_SHELL_SPELL_LEVEL = spellSlotLevel(5);
const ANTILIFE_SHELL_DURATION_HOURS = 1;
const ANTILIFE_SHELL_RADIUS_FEET = 10;

export function castAntilifeShell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly placement: CharacterSheetAntilifeShellBarrierPlacement;
}): Either.Either<CharacterSheetAntilifeShellResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(ANTILIFE_SHELL_SPELL_ID),
    spellLevel: ANTILIFE_SHELL_SPELL_LEVEL,
    spellName: "Antilife Shell",
    invocation: (spell) => {
      return antilifeShellInvocationFromSpell({
        spell: spell,
        placement: input.placement,
      });
    },
  });
}

function antilifeShellInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly placement: CharacterSheetAntilifeShellBarrierPlacement;
}): Either.Either<CharacterSheetAntilifeShellInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- The catalog record failed the exact authored level-5 Antilife Shell support profile required by this projector. */
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
  /* v8 ignore stop */

  /* v8 ignore start -- The catalog record has Antilife Shell facts but no supported self-originating Emanation. */
  if (!hasSupportedAntilifeShellAttachment(spell)) {
    return characterSheetIssue(
      "Antilife Shell requires the supported self-originating Emanation profile.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- The catalog record has Antilife Shell facts but no supported passage-prevention operation. */
  if (!hasSupportedAntilifeShellOperation(spell)) {
    return characterSheetIssue(
      "Antilife Shell requires the supported creature passage prevention profile.",
    );
  }
  /* v8 ignore stop */

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- The authored Antilife Shell duration is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Antilife Shell requires a supported duration.");
  }
  /* v8 ignore stop */

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
  /* v8 ignore next -- Unsupported authored Antilife Shell data: admission requires ongoing-effect mechanics before attachment projection. */
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
  /* v8 ignore next -- Unsupported authored Antilife Shell data: admission requires ongoing-effect mechanics before operation projection. */
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
