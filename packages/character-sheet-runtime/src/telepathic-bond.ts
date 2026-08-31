// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.telepathic-bond-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.telepathic-bond-communication
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result } from "effect";

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
}): Result.Result<CharacterSheetTelepathicBondResult, CharacterSheetIssue> {
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
  readonly spell: CharacterSheetSpellSource;
  readonly targets: readonly CharacterSheetTelepathicBondTarget[];
}): Result.Result<CharacterSheetTelepathicBondInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Telepathic Bond support profile required by this projector. */
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
  /* v8 ignore stop -- @preserve */
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored one-hour duration is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue(
      "Telepathic Bond requires a supported duration.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "telepathic_bond_targets" &&
      phase.attachment.value.kind === "target" &&
      isSupportedTelepathicBondSelection(phase.attachment.value.selection) &&
      /* v8 ignore next -- @preserve -- Unsupported authored Telepathic Bond data: the admitted target phase requires exactly one explicit no-op effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Telepathic Bond data: omission of that required effect was rejected by the same profile predicate. */
      (phase.effects ?? [])[0]?.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Telepathic Bond facts but no supported willing-creature link phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Telepathic Bond requires the supported willing-creature link profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "telepathicBond",
    spellId: spell.unitId,
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
    duration: duration.success,
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
