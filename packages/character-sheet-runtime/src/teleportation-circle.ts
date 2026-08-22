// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.teleportation-circle-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.teleportation-circle-travel
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTeleportationCircleCasting,
  type CharacterSheetTeleportationCircleDestination,
  type CharacterSheetTeleportationCircleInvocation,
  type CharacterSheetTeleportationCircleResult,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(TELEPORTATION_CIRCLE_SPELL_ID),
    spellLevel: TELEPORTATION_CIRCLE_SPELL_LEVEL,
    spellName: "Teleportation Circle",
    invocation: (spell) => {
      return teleportationCircleInvocationFromSpell({
        spell: spell,
        destination: input.destination,
        casting: input.casting,
      });
    },
  });
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
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Teleportation Circle support profile required by this projector. */
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
  /* v8 ignore stop -- @preserve */
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored one-round duration is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Teleportation Circle requires a supported duration.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "area" &&
      phase.attachment.origin.kind === "point_within_range" &&
      phase.attachment.shape.kind === "circle" &&
      phase.attachment.shape.radiusFeet === 5 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Teleportation Circle data: the admitted portal phase requires exactly one explicit no-op effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Teleportation Circle data: omission of that required effect was rejected by the same profile predicate. */
      (phase.effects ?? [])[0]?.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Teleportation Circle spell facts but no supported portal phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported 5-foot-radius portal profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The catalog record omits the exact permanent-circle repetition cadence. */
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
  /* v8 ignore stop -- @preserve */

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
