// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.telepathic-bond-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.telepathic-bond-communication
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetTelepathicBondInvocation,
  type CharacterSheetTelepathicBondResult,
  type CharacterSheetTelepathicBondTarget,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const TELEPATHIC_BOND_SPELL_ID = "telepathic_bond" as const;
const TELEPATHIC_BOND_SPELL_LEVEL = spellSlotLevel(5);
const TELEPATHIC_BOND_TARGET_LIMIT = PositiveInteger(8);
const TELEPATHIC_BOND_RANGE_FEET = 30;

export function castTelepathicBond(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly targets: readonly CharacterSheetTelepathicBondTarget[];
}): Either.Either<CharacterSheetTelepathicBondResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(TELEPATHIC_BOND_SPELL_ID),
    spellLevel: TELEPATHIC_BOND_SPELL_LEVEL,
    spellName: "Telepathic Bond",
    invocation: (spell) => {
      const targetIssue = telepathicBondTargetIssue(input.targets);
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return telepathicBondInvocationFromSpell({
        spell: spell,
        targets: input.targets,
      });
    },
  });
}

function telepathicBondTargetIssue(
  targets: readonly CharacterSheetTelepathicBondTarget[],
): string | null {
  if (targets.length === 0) {
    return "Telepathic Bond requires at least one target.";
  }
  if (targets.length > TELEPATHIC_BOND_TARGET_LIMIT) {
    return "Telepathic Bond supports up to eight willing targets.";
  }
  const targetIds = new Set(targets.map((target) => target.targetId));
  if (targetIds.size !== targets.length) {
    return "Telepathic Bond requires unique target ids.";
  }
  return null;
}

function telepathicBondInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly targets: readonly CharacterSheetTelepathicBondTarget[];
}): Either.Either<CharacterSheetTelepathicBondInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== TELEPATHIC_BOND_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.castingTime.ritual !== true ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true
  ) {
    return characterSheetIssue(
      "Telepathic Bond requires the supported level-5 Divination target-link profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Telepathic Bond requires a supported duration.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "telepathic_bond_targets" &&
      phase.attachment.value.kind === "target" &&
      isSupportedTelepathicBondSelection(phase.attachment.value.selection) &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Telepathic Bond requires the supported willing-creature link profile.",
    );
  }

  return Either.right({
    tag: "telepathicBond",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: TELEPATHIC_BOND_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    ritualAvailable: true,
    rangeFeet: TELEPATHIC_BOND_RANGE_FEET,
    targetLimit: TELEPATHIC_BOND_TARGET_LIMIT,
    duration: duration.right,
    targets: input.targets,
    communication: {
      answerOwner: "session",
      sharedLanguageRequired: false,
      distanceLimit: "any_distance_same_plane",
      otherPlanesExcluded: true,
    },
  });
}

function isSupportedTelepathicBondSelection(selection: {
  readonly mode: string;
  readonly count?: unknown;
  readonly disposition?: unknown;
  readonly targetKinds?: readonly unknown[];
}): boolean {
  return (
    selection.mode === "choose_up_to" &&
    selection.count === TELEPATHIC_BOND_TARGET_LIMIT &&
    selection.disposition === "willing" &&
    selection.targetKinds?.length === 1 &&
    selection.targetKinds[0] === "creature"
  );
}
