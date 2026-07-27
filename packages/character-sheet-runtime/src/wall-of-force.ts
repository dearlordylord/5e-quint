// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.wall-of-force-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.wall-of-force-barrier-contract
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { OngoingEffect, SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetWallOfForceInvocation,
  type CharacterSheetWallOfForcePlacement,
  type CharacterSheetWallOfForceResult,
  type CharacterSheetWallOfForceShape,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const WALL_OF_FORCE_SPELL_ID = "wall_of_force" as const;
const WALL_OF_FORCE_SPELL_LEVEL = spellSlotLevel(5);
const WALL_OF_FORCE_RANGE_FEET = 120;
const WALL_OF_FORCE_DURATION_MINUTES = 10;
const WALL_OF_FORCE_FLAT_PANEL_COUNT = 10;
const WALL_OF_FORCE_PANEL_SIZE_FEET = 10;
const WALL_OF_FORCE_THICKNESS_INCHES = 0.25;
const WALL_OF_FORCE_PUSH_FEET = 5;
const WALL_OF_FORCE_MAX_RADIUS_FEET = 10;

export function castWallOfForce(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly placement: CharacterSheetWallOfForcePlacement;
  readonly shape: CharacterSheetWallOfForceShape;
}): Either.Either<CharacterSheetWallOfForceResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(WALL_OF_FORCE_SPELL_ID),
    spellLevel: WALL_OF_FORCE_SPELL_LEVEL,
    spellName: "Wall of Force",
    invocation: (spell) => {
      const shapeIssue = wallOfForceShapeIssue(input.shape);
      if (shapeIssue !== null) return characterSheetIssue(shapeIssue);
      return wallOfForceInvocationFromSpell({
        spell: spell,
        placement: input.placement,
        shape: input.shape,
      });
    },
  });
}

function wallOfForceShapeIssue(
  shape: CharacterSheetWallOfForceShape,
): string | null {
  if (shape.kind === "flatPanels") {
    if (shape.panelCount !== WALL_OF_FORCE_FLAT_PANEL_COUNT) {
      return "Wall of Force flat surface requires ten panels.";
    }
    if (
      shape.panelWidthFeet !== WALL_OF_FORCE_PANEL_SIZE_FEET ||
      shape.panelHeightFeet !== WALL_OF_FORCE_PANEL_SIZE_FEET ||
      shape.thicknessInches !== WALL_OF_FORCE_THICKNESS_INCHES
    ) {
      return "Wall of Force flat surface requires 10-foot panels and 1/4-inch thickness.";
    }
    return null;
  }
  if (shape.radiusFeet <= 0) {
    return "Wall of Force globe or dome radius must be positive.";
  }
  if (shape.radiusFeet > WALL_OF_FORCE_MAX_RADIUS_FEET) {
    return "Wall of Force globe or dome radius must be at most 10 feet.";
  }
  if (shape.thicknessInches !== WALL_OF_FORCE_THICKNESS_INCHES) {
    return "Wall of Force globe or dome requires 1/4-inch thickness.";
  }
  return null;
}

function wallOfForceInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly placement: CharacterSheetWallOfForcePlacement;
  readonly shape: CharacterSheetWallOfForceShape;
}): Either.Either<CharacterSheetWallOfForceInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "evocation" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== WALL_OF_FORCE_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== WALL_OF_FORCE_DURATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== "a shard of glass"
  ) {
    return characterSheetIssue(
      "Wall of Force requires the supported level-5 force barrier profile.",
    );
  }
  if (!hasSupportedInitialBarrierPhase(spell)) {
    return characterSheetIssue(
      "Wall of Force requires the supported barrier creation profile.",
    );
  }
  if (!hasRequiredBarrierOperations(spell)) {
    return characterSheetIssue(
      "Wall of Force requires the supported barrier operation profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Wall of Force requires a supported duration.");
  }

  return Either.right({
    tag: "wallOfForce",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: WALL_OF_FORCE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: WALL_OF_FORCE_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    placement: input.placement,
    shape: input.shape,
    barrier: {
      invisible: true,
      physicalPassage: "blocked",
      effectBlockingOwner: "table",
      containmentAndSideChoiceOwner: "table",
      geometryOwner: "table",
      initialCreaturePush: {
        trigger: "wall_cuts_through_creature_space",
        distanceFeet: WALL_OF_FORCE_PUSH_FEET,
        sideChoiceOwner: "caster_and_table",
      },
      damageImmunity: "all_damage",
      cannotBeDispelledBy: "dispel_magic",
      destroyedBy: "disintegrate",
      disintegrateHarmsInside: false,
      etherealTravel: "blocked",
    },
  });
}

function hasSupportedInitialBarrierPhase(spell: SpellRecord): boolean {
  if (spell.mechanics.family !== "ongoing_effect") return false;
  const phase = spell.mechanics.initialPhase;
  if (
    phase === undefined ||
    phase.kind !== "direct" ||
    !("attachment" in phase) ||
    !("effects" in phase)
  ) {
    return false;
  }
  return (
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    hasSupportedShapeChoice(phase.attachment.value.shape) &&
    phase.effects.some(
      (effect) =>
        effect.kind === "composite" &&
        effect.effects.some(
          (child) =>
            child.kind === "create_object" &&
            child.maxSize === "gargantuan" &&
            hasSupportedShapeChoice(child.shape),
        ) &&
        effect.effects.some(
          (child) =>
            child.kind === "force_move" &&
            child.movementKind === "push" &&
            child.distanceFeet === WALL_OF_FORCE_PUSH_FEET,
        ),
    )
  );
}

function hasSupportedShapeChoice(shape: unknown): boolean {
  if (!isRecord(shape) || shape.kind !== "choice") return false;
  const options = shape.options;
  if (!Array.isArray(options)) return false;
  const flatPanels = options.some(
    (option) =>
      isRecord(option) &&
      option.kind === "wall_volume" &&
      option.maxLengthFeet ===
        WALL_OF_FORCE_FLAT_PANEL_COUNT * WALL_OF_FORCE_PANEL_SIZE_FEET &&
      option.maxHeightFeet === WALL_OF_FORCE_PANEL_SIZE_FEET &&
      typeof option.thicknessFeet === "number" &&
      option.thicknessFeet > 0,
  );
  const globeOrDome = options.some(
    (option) =>
      isRecord(option) &&
      option.kind === "sphere" &&
      option.radiusFeet === WALL_OF_FORCE_MAX_RADIUS_FEET,
  );
  return flatPanels && globeOrDome;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasRequiredBarrierOperations(spell: SpellRecord): boolean {
  if (spell.mechanics.family !== "ongoing_effect") return false;
  const effects = spell.mechanics.operations.map(
    (operation) => operation.effect,
  );
  return (
    hasEffect(
      effects,
      (effect) =>
        effect.kind === "block_travel" && effect.scope === "physical_passage",
    ) &&
    hasEffect(
      effects,
      (effect) => effect.kind === "object_immune_to_all_damage",
    ) &&
    hasEffect(
      effects,
      (effect) =>
        effect.kind === "cannot_be_dispelled_by_spell" &&
        // authored-id-dispatch-allow: rule-named-cross-record-reference-boundary
        effect.spellId === "dispel_magic",
    ) &&
    hasEffect(
      effects,
      (effect) =>
        effect.kind === "object_destroyed_by_spell" &&
        // authored-id-dispatch-allow: rule-named-cross-record-reference-boundary
        effect.spellId === "disintegrate",
    ) &&
    hasEffect(effects, (effect) => effect.kind === "block_ethereal_travel")
  );
}

function hasEffect(
  effects: readonly OngoingEffect[],
  predicate: (effect: OngoingEffect) => boolean,
): boolean {
  return effects.some(predicate);
}
