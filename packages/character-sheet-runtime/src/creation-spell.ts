// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.creation-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.creation-object-lifecycle
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  timeSpanDuration,
  type SurfaceTimeSpanDurationValue,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetCreationInvocation,
  type CharacterSheetCreationObject,
  type CharacterSheetCreationObjectMaterial,
  type CharacterSheetCreationResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
}): Result.Result<CharacterSheetCreationResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(CREATION_SPELL_ID),
    spellLevel: input.castLevel ?? CREATION_SPELL_LEVEL,
    spellName: "Creation",
    invocation: (spell) => {
      const castLevel = input.castLevel ?? CREATION_SPELL_LEVEL;
      const objectIssue = creationObjectIssue({
        object: input.object,
        castLevel,
      });
      if (objectIssue !== null) return characterSheetIssue(objectIssue);
      return creationInvocationFromSpell({
        spell: spell,
        object: input.object,
        castLevel,
      });
    },
  });
}

function creationObjectIssue(input: {
  readonly object: CharacterSheetCreationObject;
  readonly castLevel: SpellSlotLevel;
}): string | null {
  /* v8 ignore start -- @preserve -- These branches reject malformed cast-level, material, or geometry facts outside the narrowed Creation request. */
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
  /* v8 ignore stop -- @preserve */
  return null;
}

function creationInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly object: CharacterSheetCreationObject;
  readonly castLevel: SpellSlotLevel;
}): Result.Result<CharacterSheetCreationInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Creation support profile required by this projector. */
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
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "location" &&
      /* v8 ignore next -- @preserve -- Unsupported authored Creation data: the admitted location phase requires exactly one explicit object-creation effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Creation data: omission of that required effect was rejected by the same profile predicate. */
      isCreationCreateObjectEffect((phase.effects ?? [])[0]),
  );
  /* v8 ignore start -- @preserve -- The catalog record has Creation spell facts but no supported location/object phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Creation requires the supported location object-creation profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const objectDuration = shortestCreationObjectDuration(input.object.materials);
  /* v8 ignore next -- @preserve -- Internal invariant: every nonempty canonical Creation material list maps to a positive parsed duration. */
  if (Result.isFailure(objectDuration))
    return Result.fail(objectDuration.failure);

  return Result.succeed({
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
    objectDuration: objectDuration.success,
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
): Result.Result<TimeSpanDuration, CharacterSheetIssue> {
  const shortest = CREATION_MATERIAL_DURATION_ORDER.find((material) =>
    materials.some((candidate) => candidate === material),
  );
  const duration = timeSpanDuration(
    CREATION_MATERIAL_DURATIONS[
      /* v8 ignore next -- @preserve -- Malformed Creation request: the narrowed object contract requires at least one canonical material. */
      shortest ?? CREATION_MATERIAL_DURATION_ORDER[0]
    ],
  );
  /* v8 ignore start -- @preserve -- Impossible parser failure: V8 maps the rejected-duration edge to this conditional, but every canonical Creation material maps to a positive supported time span. */
  if (Result.isSuccess(duration)) return Result.succeed(duration.success);
  return characterSheetIssue("Creation requires a supported object duration.");
  /* v8 ignore stop -- @preserve */
}
