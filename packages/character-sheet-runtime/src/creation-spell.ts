// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.creation-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.creation-object-lifecycle
import {
  timeSpanDuration,
  type SurfaceTimeSpanDurationValue,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetCreationInvocation,
  type CharacterSheetCreationObject,
  type CharacterSheetCreationObjectMaterial,
  type CharacterSheetCreationResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const CREATION_SPELL_ID = "creation" as const;
const CREATION_SPELL_LEVEL = spellSlotLevel(5);
const CREATION_BASE_CUBE_SIDE_FEET = 5;
const CREATION_CUBE_SIDE_FEET_PER_SLOT_ABOVE_BASE = 5;

const CREATION_MATERIAL_DURATIONS = {
  vegetable_matter: { unit: "hour", amount: 24 },
  stone_or_crystal: { unit: "hour", amount: 12 },
  precious_metals: { unit: "hour", amount: 1 },
  gems: { unit: "minute", amount: 10 },
  adamantine_or_mithral: { unit: "minute", amount: 1 },
} as const satisfies Record<
  CharacterSheetCreationObjectMaterial,
  SurfaceTimeSpanDurationValue
>;

const CREATION_MATERIAL_DURATION_ORDER = [
  "adamantine_or_mithral",
  "gems",
  "precious_metals",
  "stone_or_crystal",
  "vegetable_matter",
] as const satisfies readonly CharacterSheetCreationObjectMaterial[];

export function castCreation(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly object: CharacterSheetCreationObject;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetCreationResult, CharacterSheetIssue> {
  const spell = creationSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Creation requires prepared class Spell Access.",
    );
  }

  const castLevel = input.castLevel ?? CREATION_SPELL_LEVEL;
  const objectIssue = creationObjectIssue({
    object: input.object,
    castLevel,
  });
  if (objectIssue !== null) return characterSheetIssue(objectIssue);

  const invocation = creationInvocationFromSpell({
    spell: spell.right,
    object: input.object,
    castLevel,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: castLevel,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function creationSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, CREATION_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Creation requires a Spell record.");
  }
  return Either.right(unit.right);
}

function creationObjectIssue(input: {
  readonly object: CharacterSheetCreationObject;
  readonly castLevel: SpellSlotLevel;
}): string | null {
  if (input.castLevel < CREATION_SPELL_LEVEL) {
    return "Creation requires a level-5 or higher Spell Slot.";
  }
  if (input.object.materials.length === 0) {
    return "Creation requires at least one object material.";
  }
  if (input.object.cubeSideFeet <= 0) {
    return "Creation object cube side must be positive.";
  }
  if (input.object.cubeSideFeet > creationMaxCubeSideFeet(input.castLevel)) {
    return "Creation object must fit inside the slot-scaled Cube.";
  }
  return null;
}

function creationInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly object: CharacterSheetCreationObject;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<CharacterSheetCreationInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== 1 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true
  ) {
    return characterSheetIssue(
      "Creation requires the supported level-5 object-creation profile.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "location" &&
      (phase.effects ?? []).length === 1 &&
      isCreationCreateObjectEffect((phase.effects ?? [])[0]),
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Creation requires the supported location object-creation profile.",
    );
  }

  const objectDuration = shortestCreationObjectDuration(input.object.materials);
  if (Either.isLeft(objectDuration)) return Either.left(objectDuration.left);

  return Either.right({
    tag: "creation",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: input.castLevel,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "minutes", amount: 1 },
    rangeFeet: 30,
    maxCubeSideFeet: creationMaxCubeSideFeet(input.castLevel),
    object: input.object,
    objectDuration: objectDuration.right,
    materialComponentUse: "causes_other_spell_to_fail",
  });
}

function isCreationCreateObjectEffect(effect: unknown): effect is {
  readonly kind: "create_object";
  readonly shape: { readonly kind: "cube"; readonly sideFeet: number };
} {
  return (
    typeof effect === "object" &&
    effect !== null &&
    "kind" in effect &&
    effect.kind === "create_object" &&
    "shape" in effect &&
    typeof effect.shape === "object" &&
    effect.shape !== null &&
    "kind" in effect.shape &&
    effect.shape.kind === "cube" &&
    "sideFeet" in effect.shape &&
    effect.shape.sideFeet === CREATION_BASE_CUBE_SIDE_FEET
  );
}

function creationMaxCubeSideFeet(castLevel: SpellSlotLevel): number {
  return (
    CREATION_BASE_CUBE_SIDE_FEET +
    (castLevel - CREATION_SPELL_LEVEL) *
      CREATION_CUBE_SIDE_FEET_PER_SLOT_ABOVE_BASE
  );
}

function shortestCreationObjectDuration(
  materials: readonly CharacterSheetCreationObjectMaterial[],
): Either.Either<TimeSpanDuration, CharacterSheetIssue> {
  const shortest = CREATION_MATERIAL_DURATION_ORDER.find((material) =>
    materials.some((candidate) => candidate === material),
  );
  const duration = timeSpanDuration(
    CREATION_MATERIAL_DURATIONS[
      shortest ?? CREATION_MATERIAL_DURATION_ORDER[0]
    ],
  );
  return Either.isRight(duration)
    ? Either.right(duration.right)
    : characterSheetIssue("Creation requires a supported object duration.");
}
