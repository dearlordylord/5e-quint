// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.tree-stride-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.tree-stride-travel
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTreeStrideInvocation,
  type CharacterSheetTreeStrideResult,
  type CharacterSheetTreeStrideTransitInput,
  type CharacterSheetTreeStrideTransitResult,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const TREE_STRIDE_SPELL_ID = "tree_stride" as const;
const TREE_STRIDE_SPELL_LEVEL = spellSlotLevel(5);
const TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET = 5;
const TREE_STRIDE_DESTINATION_MOVEMENT_COST_FEET = 5;
const TREE_STRIDE_DESTINATION_SEARCH_RADIUS_FEET = 500;

export function castTreeStride(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetTreeStrideResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(TREE_STRIDE_SPELL_ID),
    spellLevel: TREE_STRIDE_SPELL_LEVEL,
    spellName: "Tree Stride",
    invocation: (spell) => {
      return treeStrideInvocationFromSpell(spell);
    },
  });
}

export function resolveTreeStrideTransit(
  input: CharacterSheetTreeStrideTransitInput,
): Either.Either<CharacterSheetTreeStrideTransitResult, CharacterSheetIssue> {
  if (input.usedThisTurn) {
    return characterSheetIssue("Tree Stride can be used only once per turn.");
  }
  if (input.movementAvailableFeet < TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET) {
    return characterSheetIssue(
      "Tree Stride requires 5 feet of movement to enter a tree.",
    );
  }
  if (
    input.destinationTree !== undefined &&
    input.destinationTree.treeKind !== input.entryTree.treeKind
  ) {
    return characterSheetIssue(
      "Tree Stride destination must be a tree of the same kind.",
    );
  }
  const canReachDestination =
    input.destinationTree !== undefined &&
    input.movementAvailableFeet >=
      TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET +
        TREE_STRIDE_DESTINATION_MOVEMENT_COST_FEET;
  return Either.right({
    arrivalTree: canReachDestination ? input.destinationTree : input.entryTree,
    movementSpentFeet: canReachDestination
      ? TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET +
        TREE_STRIDE_DESTINATION_MOVEMENT_COST_FEET
      : TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET,
    usedThisTurn: true,
    endsOutsideTree: true,
  });
}

function treeStrideInvocationFromSpell(
  spell: SpellRecord,
): Either.Either<CharacterSheetTreeStrideInvocation, CharacterSheetIssue> {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true
  ) {
    return characterSheetIssue(
      "Tree Stride requires the supported self-range level-5 tree-travel profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Tree Stride requires a supported duration.");
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Tree Stride requires the supported self tree-travel profile.",
    );
  }

  return Either.right({
    tag: "treeStride",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: TREE_STRIDE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    duration: duration.right,
    concentrationRequired: true,
    transport: {
      entryMovementCostFeet: TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET,
      destinationMovementCostFeet: TREE_STRIDE_DESTINATION_MOVEMENT_COST_FEET,
      destinationSearchRadiusFeet: TREE_STRIDE_DESTINATION_SEARCH_RADIUS_FEET,
      usesPerTurn: 1,
      mustEndTurnOutsideTree: true,
      destinationKindRequirement: "same_kind_living_tree_at_least_caster_size",
    },
  });
}
