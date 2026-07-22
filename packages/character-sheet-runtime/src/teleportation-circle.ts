// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.teleportation-circle-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.teleportation-circle-travel
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTeleportationCircleCasting,
  type CharacterSheetTeleportationCircleDestination,
  type CharacterSheetTeleportationCircleInvocation,
  type CharacterSheetTeleportationCircleResult,
} from "./sheet-types.ts";

const TELEPORTATION_CIRCLE_SPELL_ID = "teleportation_circle" as const;
const TELEPORTATION_CIRCLE_SPELL_LEVEL = spellSlotLevel(5);

export function castTeleportationCircle(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly destination: CharacterSheetTeleportationCircleDestination;
  readonly casting: CharacterSheetTeleportationCircleCasting;
}): Either.Either<
  CharacterSheetTeleportationCircleResult,
  CharacterSheetIssue
> {
  const spell = teleportationCircleSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Teleportation Circle requires prepared class Spell Access.",
    );
  }

  const invocation = teleportationCircleInvocationFromSpell({
    spell: spell.right,
    destination: input.destination,
    casting: input.casting,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: TELEPORTATION_CIRCLE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function teleportationCircleSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(
    unitLibrary,
    authoredUnitId(TELEPORTATION_CIRCLE_SPELL_ID),
  );
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Teleportation Circle requires a Spell record.");
  }
  return Either.right(unit.right);
}

function teleportationCircleInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly destination: CharacterSheetTeleportationCircleDestination;
  readonly casting: CharacterSheetTeleportationCircleCasting;
}): Either.Either<
  CharacterSheetTeleportationCircleInvocation,
  CharacterSheetIssue
> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 10 ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== 1 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== false ||
    !("materialCostGp" in spell.mechanics.components) ||
    spell.mechanics.components.materialCostGp !== 50 ||
    spell.mechanics.components.materialConsumed !== true
  ) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported level-5 travel-circle profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Teleportation Circle requires a supported duration.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "area" &&
      phase.attachment.origin.kind === "point_within_range" &&
      phase.attachment.shape.kind === "circle" &&
      phase.attachment.shape.radiusFeet === 5 &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported 5-foot-radius portal profile.",
    );
  }
  if (
    spell.mechanics.duration.permanentAfter?.kind !== "repeated_casts" ||
    spell.mechanics.duration.permanentAfter.cadence !== "daily" ||
    spell.mechanics.duration.permanentAfter.count !== 365 ||
    spell.mechanics.duration.permanentAfter.target !== "same_target"
  ) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported permanent-circle cadence.",
    );
  }

  return Either.right({
    tag: "teleportationCircle",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: TELEPORTATION_CIRCLE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "minutes", amount: 1 },
    rangeFeet: 10,
    drawnCircleRadiusFeet: 5,
    duration: duration.right,
    materialComponents: input.casting.materialComponents,
    destination: input.destination,
    portal: {
      opensWithinDrawnCircle: true,
      openUntil: "end_of_casters_next_turn",
      entrantArrival: "within_5_feet_or_nearest_unoccupied",
      samePlaneDestinationRequired: true,
    },
    permanentCircleCreation: {
      cadence: "daily",
      requiredCastCount: 365,
      locationRequirement: "same_location",
    },
  });
}

export const completedTeleportationCircleCasting = {
  tag: "completedTeleportationCircleCasting",
  materialComponents: TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetTeleportationCircleCasting;
