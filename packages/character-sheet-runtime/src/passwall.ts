// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passwall-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.passwall-spatial-passage
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
  type CharacterSheetPasswallDimensions,
  type CharacterSheetPasswallInvocation,
  type CharacterSheetPasswallResult,
  type CharacterSheetPasswallSurface,
} from "./sheet-types.ts";

const PASSWALL_SPELL_ID = "passwall" as const;
const PASSWALL_SPELL_LEVEL = spellSlotLevel(5);
const PASSWALL_RANGE_FEET = 30;
const PASSWALL_MAX_WIDTH_FEET = 5;
const PASSWALL_MAX_HEIGHT_FEET = 8;
const PASSWALL_MAX_DEPTH_FEET = 20;

export function castPasswall(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly surface: CharacterSheetPasswallSurface;
  readonly dimensions: CharacterSheetPasswallDimensions;
}): Either.Either<CharacterSheetPasswallResult, CharacterSheetIssue> {
  const spell = passwallSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedPasswallAccess(input.sheet)) {
    return characterSheetIssue("Passwall requires prepared class Spell Access.");
  }

  const dimensionIssue = passwallDimensionIssue(input.dimensions);
  if (dimensionIssue !== null) return characterSheetIssue(dimensionIssue);

  const invocation = passwallInvocationFromSpell({
    spell: spell.right,
    surface: input.surface,
    dimensions: input.dimensions,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: PASSWALL_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function passwallSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, PASSWALL_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Passwall requires a Spell record.");
  }
  return Either.right(unit.right);
}

function hasPreparedPasswallAccess(sheet: CharacterSheet): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some((spellId) => spellId === PASSWALL_SPELL_ID),
    ) ?? false
  );
}

function passwallDimensionIssue(
  dimensions: CharacterSheetPasswallDimensions,
): string | null {
  if (
    dimensions.widthFeet <= 0 ||
    dimensions.heightFeet <= 0 ||
    dimensions.depthFeet <= 0
  ) {
    return "Passwall dimensions must be positive.";
  }
  if (dimensions.widthFeet > PASSWALL_MAX_WIDTH_FEET) {
    return "Passwall width must be at most 5 feet.";
  }
  if (dimensions.heightFeet > PASSWALL_MAX_HEIGHT_FEET) {
    return "Passwall height must be at most 8 feet.";
  }
  if (dimensions.depthFeet > PASSWALL_MAX_DEPTH_FEET) {
    return "Passwall depth must be at most 20 feet.";
  }
  return null;
}

function passwallInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly surface: CharacterSheetPasswallSurface;
  readonly dimensions: CharacterSheetPasswallDimensions;
}): Either.Either<CharacterSheetPasswallInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.id !== PASSWALL_SPELL_ID ||
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== PASSWALL_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true
  ) {
    return characterSheetIssue(
      "Passwall requires the supported level-5 surface-passage profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Passwall requires a supported duration.");
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "location" &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Passwall requires the supported visible surface location profile.",
    );
  }

  return Either.right({
    tag: "passwall",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: PASSWALL_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    rangeFeet: PASSWALL_RANGE_FEET,
    duration: duration.right,
    surface: input.surface,
    dimensions: input.dimensions,
    passage: {
      createsNoStructuralInstability: true,
      ejectionWhenOpeningDisappears: "nearest_unoccupied_space_to_cast_surface",
    },
  });
}
