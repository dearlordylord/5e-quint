// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.geas-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.geas-command-compliance
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetGeasCommand,
  type CharacterSheetGeasInvocation,
  type CharacterSheetGeasOutcome,
  type CharacterSheetGeasResult,
  type CharacterSheetGeasTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";
import { hasWisdomSaveGatePhase } from "./spell-profile-shape.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
}): Result.Result<CharacterSheetGeasResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(GEAS_SPELL_ID),
    spellLevel: GEAS_SPELL_LEVEL,
    spellName: "Geas",
    invocation: (spell) => {
      const commandIssue = geasCommandIssue(input.command);
      /* v8 ignore next -- @preserve -- Malformed Geas request: command facts are parsed by the narrowed request contract before invocation projection. */
      if (commandIssue !== null) return characterSheetIssue(commandIssue);
      const targetIssue = geasTargetIssue(input.target);
      /* v8 ignore next -- @preserve -- Malformed Geas request: target facts are parsed by the narrowed request contract before invocation projection. */
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return geasInvocationFromSpell({
        spell: spell,
        target: input.target,
        command: input.command,
      });
    },
  });
}

function geasCommandIssue(command: CharacterSheetGeasCommand): string | null {
  /* v8 ignore start -- @preserve -- These branches reject an empty or non-table-owned command outside the narrowed Geas request contract. */
  if (command.commandText.trim().length === 0) {
    return "Geas requires a nonempty command.";
  }
  if (command.adjudicationOwner !== "table") {
    return "Geas command compliance must be table-owned session evidence.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function geasTargetIssue(target: CharacterSheetGeasTarget): string | null {
  /* v8 ignore start -- @preserve -- These branches reject malformed visibility or save facts outside the narrowed Geas target contract. */
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
  /* v8 ignore stop -- @preserve */
  return null;
}

function geasInvocationFromSpell(input: {
  readonly spell: CharacterSheetSpellSource;
  readonly target: CharacterSheetGeasTarget;
  readonly command: CharacterSheetGeasCommand;
}): Result.Result<CharacterSheetGeasInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Geas support profile required by this projector. */
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
    spell.mechanics.components.material.kind !== "absent"
  ) {
    return characterSheetIssue(
      "Geas requires the supported level-5 Enchantment command profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const hasSaveGatePhase = hasWisdomSaveGatePhase(
    spell,
    "geas_target",
    (phase, attachment) =>
      attachment.value.kind === "target" &&
      attachment.value.selection.mode === "one" &&
      phase.onFail.kind === "apply_condition" &&
      phase.onFail.condition === "charmed" &&
      phase.onSuccess.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Geas spell facts but no supported Wisdom save/Charmed phase. */
  if (!hasSaveGatePhase) {
    return characterSheetIssue(
      "Geas requires the supported Wisdom save Charmed profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const duration = timeSpanDuration({
    unit: "day",
    amount: GEAS_DURATION_DAYS,
  });
  /* v8 ignore start -- @preserve -- The fixed thirty-day Geas duration is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue("Geas requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "geas",
    spellId: spell.unitId,
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
      duration: duration.success,
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
