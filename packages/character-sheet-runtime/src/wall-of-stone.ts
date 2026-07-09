// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.wall-of-stone-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.wall-of-stone-object-barrier-contract
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetWallOfStoneInvocation,
  type CharacterSheetWallOfStonePlacement,
  type CharacterSheetWallOfStoneResult,
  type CharacterSheetWallOfStoneShape,
} from "./sheet-types.ts";

const WALL_OF_STONE_SPELL_ID = "wall_of_stone" as const;
const WALL_OF_STONE_SPELL_LEVEL = spellSlotLevel(5);
const WALL_OF_STONE_RANGE_FEET = 120;
const WALL_OF_STONE_DURATION_MINUTES = 10;
const WALL_OF_STONE_PANEL_COUNT = 10;
const WALL_OF_STONE_PANEL_WIDTH_FEET = 10;
const WALL_OF_STONE_STANDARD_PANEL_HEIGHT_FEET = 10;
const WALL_OF_STONE_THIN_PANEL_HEIGHT_FEET = 20;
const WALL_OF_STONE_STANDARD_THICKNESS_INCHES = 6;
const WALL_OF_STONE_THIN_THICKNESS_INCHES = 3;
const WALL_OF_STONE_PUSH_FEET = 5;
const WALL_OF_STONE_PANEL_AC = 15;
const WALL_OF_STONE_HP_PER_INCH = 30;
const WALL_OF_STONE_DAMAGE_IMMUNITIES = ["poison", "psychic"] as const;

export function castWallOfStone(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly placement: CharacterSheetWallOfStonePlacement;
  readonly shape: CharacterSheetWallOfStoneShape;
}): Either.Either<CharacterSheetWallOfStoneResult, CharacterSheetIssue> {
  const spell = wallOfStoneSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedWallOfStoneAccess(input.sheet)) {
    return characterSheetIssue(
      "Wall of Stone requires prepared class Spell Access.",
    );
  }

  const shapeIssue = wallOfStoneShapeIssue(input.shape);
  if (shapeIssue !== null) return characterSheetIssue(shapeIssue);

  const invocation = wallOfStoneInvocationFromSpell({
    spell: spell.right,
    placement: input.placement,
    shape: input.shape,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: WALL_OF_STONE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function wallOfStoneSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, WALL_OF_STONE_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Wall of Stone requires a Spell record.");
  }
  return Either.right(unit.right);
}

function hasPreparedWallOfStoneAccess(sheet: CharacterSheet): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some((spellId) => spellId === WALL_OF_STONE_SPELL_ID),
    ) ?? false
  );
}

function wallOfStoneShapeIssue(
  shape: CharacterSheetWallOfStoneShape,
): string | null {
  if (shape.panelCount !== WALL_OF_STONE_PANEL_COUNT) {
    return "Wall of Stone requires ten panels.";
  }
  if (
    shape.panelWidthFeet !== WALL_OF_STONE_PANEL_WIDTH_FEET ||
    shape.panelContiguity !== "table_witnessed"
  ) {
    return "Wall of Stone requires contiguous 10-foot-wide panels.";
  }
  const standardPanels =
    shape.panelHeightFeet === WALL_OF_STONE_STANDARD_PANEL_HEIGHT_FEET &&
    shape.thicknessInches === WALL_OF_STONE_STANDARD_THICKNESS_INCHES;
  const thinPanels =
    shape.panelHeightFeet === WALL_OF_STONE_THIN_PANEL_HEIGHT_FEET &&
    shape.thicknessInches === WALL_OF_STONE_THIN_THICKNESS_INCHES;
  if (!standardPanels && !thinPanels) {
    return "Wall of Stone panels must be either 10-by-10 feet and 6 inches thick or 10-by-20 feet and 3 inches thick.";
  }
  return null;
}

function wallOfStoneInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly placement: CharacterSheetWallOfStonePlacement;
  readonly shape: CharacterSheetWallOfStoneShape;
}): Either.Either<CharacterSheetWallOfStoneInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.id !== WALL_OF_STONE_SPELL_ID ||
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "evocation" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== WALL_OF_STONE_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== WALL_OF_STONE_DURATION_MINUTES ||
    spell.mechanics.duration.permanentIfMaintainedFull !== true ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== "a cube of granite"
  ) {
    return characterSheetIssue(
      "Wall of Stone requires the supported level-5 stone wall profile.",
    );
  }
  if (!hasSupportedWallOfStonePhase(spell)) {
    return characterSheetIssue(
      "Wall of Stone requires the supported created wall object profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Wall of Stone requires a supported duration.");
  }

  return Either.right({
    tag: "wallOfStone",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: WALL_OF_STONE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: WALL_OF_STONE_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    permanentIfMaintainedFullDuration: true,
    placement: input.placement,
    shape: input.shape,
    wall: {
      material: "nonmagical_solid_stone",
      anyShapeDesiredOwner: "table",
      initialCreaturePush: {
        trigger: "wall_cuts_through_creature_space",
        distanceFeet: WALL_OF_STONE_PUSH_FEET,
        sideChoiceOwner: "caster_and_table",
      },
      enclosureEscape: {
        savingThrowAbility: "dex",
        onSuccess: "may_use_reaction_move_up_to_speed",
        owner: "table",
      },
      durability: {
        ac: WALL_OF_STONE_PANEL_AC,
        hitPointsPerInchOfThickness: WALL_OF_STONE_HP_PER_INCH,
        damageImmunities: [...WALL_OF_STONE_DAMAGE_IMMUNITIES],
        panelDamageOwner: "table_object_state",
        connectedPanelCollapseOwner: "dm_table",
      },
      permanence: {
        ifConcentrationMaintainedFullDuration: true,
        cannotBeDispelled: true,
      },
      disappearsWhenSpellEndsBeforePermanence: true,
    },
  });
}

function hasSupportedWallOfStonePhase(spell: SpellRecord): boolean {
  if (spell.mechanics.family !== "activation") return false;
  return spell.mechanics.phases.some((phase) => {
    if (
      phase.kind !== "direct" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "area" ||
      phase.attachment.value.origin.kind !== "point_within_range" ||
      !isSupportedWallOfStoneLine(phase.attachment.value.shape)
    ) {
      return false;
    }
    return (phase.effects ?? []).some(
      (effect) =>
        isRecord(effect) &&
        effect.kind === "composite" &&
        Array.isArray(effect.effects) &&
        hasCreateStoneWallEffect(effect.effects) &&
        hasWallPushEffect(effect.effects),
    );
  });
}

function hasCreateStoneWallEffect(effects: readonly unknown[]): boolean {
  return effects.some(
    (effect) =>
      isRecord(effect) &&
      effect.kind === "create_object" &&
      effect.maxSize === "gargantuan" &&
      isSupportedWallOfStoneLine(effect.shape) &&
      isSupportedWallDurability(effect.durability),
  );
}

function hasWallPushEffect(effects: readonly unknown[]): boolean {
  return effects.some(
    (effect) =>
      isRecord(effect) &&
      effect.kind === "force_move" &&
      effect.movementKind === "push" &&
      effect.distanceFeet === WALL_OF_STONE_PUSH_FEET,
  );
}

function isSupportedWallOfStoneLine(shape: unknown): boolean {
  return (
    isRecord(shape) &&
    shape.kind === "line" &&
    shape.lengthFeet ===
      WALL_OF_STONE_PANEL_COUNT * WALL_OF_STONE_PANEL_WIDTH_FEET &&
    shape.widthFeet === WALL_OF_STONE_PANEL_WIDTH_FEET
  );
}

function isSupportedWallDurability(durability: unknown): boolean {
  return (
    isRecord(durability) &&
    durability.acValue === WALL_OF_STONE_PANEL_AC &&
    durability.hpPerSection === WALL_OF_STONE_HP_PER_INCH &&
    Array.isArray(durability.damageImmunities) &&
    sameStringSet(
      durability.damageImmunities.filter(
        (damageType): damageType is string => typeof damageType === "string",
      ),
      WALL_OF_STONE_DAMAGE_IMMUNITIES,
    )
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
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
