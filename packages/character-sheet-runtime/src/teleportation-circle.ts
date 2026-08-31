// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.teleportation-circle-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.teleportation-circle-travel
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result, Option } from "effect";

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
}): Result.Result<
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
  readonly spell: CharacterSheetSpellSource;
  readonly destination: CharacterSheetTeleportationCircleDestination;
  readonly casting: CharacterSheetTeleportationCircleCasting;
}): Result.Result<
  CharacterSheetTeleportationCircleInvocation,
  CharacterSheetIssue
> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Teleportation Circle support profile required by this projector. */
  if (!hasTeleportationCircleSpellProfile(spell)) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported level-5 travel-circle profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored one-round duration is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue(
      "Teleportation Circle requires a supported duration.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    isTeleportationCirclePortalPhase,
  );
  /* v8 ignore start -- @preserve -- The catalog record has Teleportation Circle spell facts but no supported portal phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported 5-foot-radius portal profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The catalog record omits the exact permanent-circle repetition cadence. */
  if (!hasTeleportationCirclePermanentCadence(spell)) {
    return characterSheetIssue(
      "Teleportation Circle requires the supported permanent-circle cadence.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "teleportationCircle",
    spellId: spell.unitId,
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
    duration: duration.success,
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

type TeleportationCircleActivationSource = CharacterSheetSpellSource & {
  readonly mechanics: Extract<
    CharacterSheetSpellSource["mechanics"],
    { readonly family: "activation" }
  >;
};
type TeleportationCircleSpellSource = TeleportationCircleActivationSource & {
  readonly mechanics: TeleportationCircleActivationSource["mechanics"] & {
    readonly duration: Extract<
      Extract<
        CharacterSheetSpellSource["mechanics"],
        { readonly family: "activation" }
      >["duration"],
      { readonly kind: "timed" }
    >;
  };
};

function hasTeleportationCircleSpellProfile(
  spell: CharacterSheetSpellSource,
): spell is TeleportationCircleSpellSource {
  if (!hasTeleportationCircleActivationProfile(spell)) return false;
  return (
    hasTeleportationCircleTimingProfile(spell) &&
    hasTeleportationCircleMaterialProfile(spell)
  );
}

function hasTeleportationCircleActivationProfile(
  spell: CharacterSheetSpellSource,
): spell is TeleportationCircleActivationSource {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 5 &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === 10
  );
}

function hasTeleportationCircleTimingProfile(
  spell: TeleportationCircleActivationSource,
): boolean {
  return (
    spell.mechanics.castingTime.kind === "minutes" &&
    spell.mechanics.castingTime.amount === 1 &&
    spell.mechanics.duration.kind === "timed"
  );
}

function hasTeleportationCircleMaterialProfile(
  spell: CharacterSheetSpellSource,
): boolean {
  const components = spell.mechanics.components;
  return (
    components.v === true &&
    components.s === false &&
    components.material.kind === "present" &&
    Option.isSome(components.material.costGp) &&
    components.material.costGp.value === 50 &&
    components.material.consumed === true
  );
}

type TeleportationCirclePhase =
  TeleportationCircleSpellSource["mechanics"]["phases"][number];

function isTeleportationCirclePortalPhase(
  phase: TeleportationCirclePhase,
): boolean {
  if (phase.kind !== "direct" || phase.attachment.kind !== "area") return false;
  const attachment = phase.attachment;
  return (
    attachment.origin.kind === "point_within_range" &&
    attachment.shape.kind === "circle" &&
    attachment.shape.radiusFeet === 5 &&
    hasSingleNoEffect(phase.effects)
  );
}

function hasSingleNoEffect(
  effects: Extract<
    TeleportationCirclePhase,
    { readonly kind: "direct" }
  >["effects"],
): boolean {
  return (effects ?? []).length === 1 && (effects ?? [])[0]?.kind === "none";
}

function hasTeleportationCirclePermanentCadence(
  spell: TeleportationCircleSpellSource,
): boolean {
  const permanentAfter = spell.mechanics.duration.permanentAfter;
  return (
    permanentAfter?.kind === "repeated_casts" &&
    permanentAfter.cadence === "daily" &&
    permanentAfter.count === 365 &&
    permanentAfter.target === "same_target"
  );
}

export const completedTeleportationCircleCasting = {
  tag: "completedTeleportationCircleCasting",
  materialComponents: TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetTeleportationCircleCasting;
