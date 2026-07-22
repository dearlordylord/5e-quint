// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.geas-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.geas-command-compliance
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
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
  type CharacterSheetGeasCommand,
  type CharacterSheetGeasInvocation,
  type CharacterSheetGeasOutcome,
  type CharacterSheetGeasResult,
  type CharacterSheetGeasTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const GEAS_SPELL_ID = "geas" as const;
const GEAS_SPELL_LEVEL = spellSlotLevel(5);
const GEAS_CASTING_TIME_MINUTES = 1;
const GEAS_RANGE_FEET = 60;
const GEAS_DURATION_DAYS = 30;

export function castGeas(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetGeasTarget;
  readonly command: CharacterSheetGeasCommand;
}): Either.Either<CharacterSheetGeasResult, CharacterSheetIssue> {
  const spell = geasSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue("Geas requires prepared class Spell Access.");
  }

  const commandIssue = geasCommandIssue(input.command);
  if (commandIssue !== null) return characterSheetIssue(commandIssue);

  const targetIssue = geasTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = geasInvocationFromSpell({
    spell: spell.right,
    target: input.target,
    command: input.command,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: GEAS_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function geasSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, authoredUnitId(GEAS_SPELL_ID));
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Geas requires a Spell record.");
  }
  return Either.right(unit.right);
}

function geasCommandIssue(command: CharacterSheetGeasCommand): string | null {
  if (command.commandText.trim().length === 0) {
    return "Geas requires a nonempty command.";
  }
  if (command.adjudicationOwner !== "table") {
    return "Geas command compliance must be table-owned session evidence.";
  }
  return null;
}

function geasTargetIssue(target: CharacterSheetGeasTarget): string | null {
  if (target.visibleByCaster !== true || target.withinRangeFeet !== 60) {
    return "Geas targets must be visible creatures within 60 feet.";
  }
  if (
    target.understandsCommand === true &&
    target.savingThrowOutcome.tag !== "succeeded" &&
    target.savingThrowOutcome.tag !== "failed"
  ) {
    return "Geas requires a Wisdom Saving Throw outcome when the target can understand the command.";
  }
  return null;
}

function geasInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetGeasTarget;
  readonly command: CharacterSheetGeasCommand;
}): Either.Either<CharacterSheetGeasInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "enchantment" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== GEAS_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== GEAS_CASTING_TIME_MINUTES ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "day" ||
    spell.mechanics.duration.value.amount !== GEAS_DURATION_DAYS ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== false ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Geas requires the supported level-5 Enchantment command profile.",
    );
  }

  const saveGatePhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "save_gate" &&
      phase.ability === "wis" &&
      phase.dc.kind === "caster_spell_save_dc" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "geas_target" &&
      phase.attachment.value.kind === "target" &&
      phase.attachment.value.selection.mode === "one" &&
      phase.onFail.kind === "apply_condition" &&
      phase.onFail.condition === "charmed" &&
      phase.onSuccess.kind === "none",
  );
  if (saveGatePhase === undefined) {
    return characterSheetIssue(
      "Geas requires the supported Wisdom save Charmed profile.",
    );
  }

  const duration = timeSpanDuration({
    unit: "day",
    amount: GEAS_DURATION_DAYS,
  });
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Geas requires a supported duration.");
  }

  return Either.right({
    tag: "geas",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: GEAS_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: {
      kind: "minutes",
      amount: GEAS_CASTING_TIME_MINUTES,
    },
    rangeFeet: GEAS_RANGE_FEET,
    components: ["v"],
    target: input.target,
    command: input.command,
    savingThrow: {
      ability: "wis",
      dc: "caster_spell_save_dc",
      automaticSuccessIfTargetCannotUnderstandCommand: true,
    },
    outcome: geasOutcome({
      target: input.target,
      command: input.command,
      duration: duration.right,
    }),
  });
}

function geasOutcome(input: {
  readonly target: CharacterSheetGeasTarget;
  readonly command: CharacterSheetGeasCommand;
  readonly duration: TimeSpanDuration;
}): CharacterSheetGeasOutcome {
  if (input.command.tag === "suicidalCommand") {
    return {
      tag: "spellEndedBySuicidalCommand",
      affected: false,
      endReason: "suicidal_command",
      adjudicationOwner: "table",
    };
  }
  if (input.target.understandsCommand === false) {
    return {
      tag: "targetCannotUnderstandCommand",
      affected: false,
      automaticSuccess: true,
    };
  }
  if (input.target.savingThrowOutcome.tag === "succeeded") {
    return {
      tag: "savingThrowSucceeded",
      affected: false,
    };
  }
  return {
    tag: "savingThrowFailed",
    affected: true,
    condition: "charmed",
    duration: input.duration,
    commandCompliance: {
      commandContentOwner: "table",
      counterCommandAdjudicationOwner: "table",
    },
    damage: {
      diceCount: 5,
      dieSize: 10,
      damageType: "psychic",
      trigger: "acts_directly_counter_to_command",
      maxFrequency: "once_per_day",
      applicationOwner: "table",
    },
    endedBySpells: ["remove_curse", "greater_restoration", "wish"],
  };
}
