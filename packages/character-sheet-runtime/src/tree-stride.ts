// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.tree-stride-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.tree-stride-travel
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTreeStrideInvocation,
  type CharacterSheetTreeStrideResult,
  type CharacterSheetTreeStrideTransitInput,
  type CharacterSheetTreeStrideTransitResult,
} from "./sheet-types.ts";

const TREE_STRIDE_SPELL_ID = "tree_stride" as const;
const TREE_STRIDE_SPELL_LEVEL = spellSlotLevel(5);
const TREE_STRIDE_ENTRY_MOVEMENT_COST_FEET = 5;
const TREE_STRIDE_DESTINATION_MOVEMENT_COST_FEET = 5;
const TREE_STRIDE_DESTINATION_SEARCH_RADIUS_FEET = 500;

export function castTreeStride(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetTreeStrideResult, CharacterSheetIssue> {
  const spell = treeStrideSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Tree Stride requires prepared class Spell Access.",
    );
  }

  const invocation = treeStrideInvocationFromSpell(spell.right);
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: TREE_STRIDE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
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

function treeStrideSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, TREE_STRIDE_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Tree Stride requires a Spell record.");
  }
  return Either.right(unit.right);
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
