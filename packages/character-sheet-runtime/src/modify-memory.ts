// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.modify-memory-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.modify-memory-edit-contract
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
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
  type CharacterSheetModifyMemoryInvocation,
  type CharacterSheetModifyMemoryMemoryEdit,
  type CharacterSheetModifyMemoryOutcome,
  type CharacterSheetModifyMemoryResult,
  type CharacterSheetModifyMemoryTarget,
} from "./sheet-types.ts";

const MODIFY_MEMORY_SPELL_ID = "modify_memory" as const;
const MODIFY_MEMORY_SPELL_LEVEL = spellSlotLevel(5);
const MODIFY_MEMORY_RANGE_FEET = 30;
const MODIFY_MEMORY_DURATION_MINUTES = 1;

export function castModifyMemory(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetModifyMemoryTarget;
  readonly memoryEdit: CharacterSheetModifyMemoryMemoryEdit;
}): Either.Either<CharacterSheetModifyMemoryResult, CharacterSheetIssue> {
  const spell = modifyMemorySpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Modify Memory requires prepared class Spell Access.",
    );
  }

  const targetIssue = modifyMemoryTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const memoryEditIssue = modifyMemoryEditIssue(input.memoryEdit);
  if (memoryEditIssue !== null) return characterSheetIssue(memoryEditIssue);

  const invocation = modifyMemoryInvocationFromSpell({
    spell: spell.right,
    target: input.target,
    memoryEdit: input.memoryEdit,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: MODIFY_MEMORY_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function modifyMemorySpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(
    unitLibrary,
    authoredUnitId(MODIFY_MEMORY_SPELL_ID),
  );
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Modify Memory requires a Spell record.");
  }
  return Either.right(unit.right);
}

function modifyMemoryTargetIssue(
  target: CharacterSheetModifyMemoryTarget,
): string | null {
  if (target.visibleByCaster !== true || target.withinRangeFeet !== 30) {
    return "Modify Memory targets must be visible creatures within 30 feet.";
  }
  if (
    target.savingThrowOutcome.tag !== "succeeded" &&
    target.savingThrowOutcome.tag !== "failed"
  ) {
    return "Modify Memory requires a Wisdom Saving Throw outcome.";
  }
  return null;
}

function modifyMemoryEditIssue(
  memoryEdit: CharacterSheetModifyMemoryMemoryEdit,
): string | null {
  if (memoryEdit.eventAgeHoursMax !== 24) {
    return "Modify Memory level-5 support requires an event within the last 24 hours.";
  }
  if (memoryEdit.eventDurationMinutesMax !== 10) {
    return "Modify Memory support requires an event lasting no more than 10 minutes.";
  }
  if (memoryEdit.spokenDescription.trim().length === 0) {
    return "Modify Memory requires a spoken memory description.";
  }
  if (
    memoryEdit.behaviorConsequenceOwner !== "table" ||
    memoryEdit.nonsensicalMemoryAdjudicationOwner !== "table"
  ) {
    return "Modify Memory behavior and nonsensical-memory consequences must be table-owned.";
  }
  return null;
}

function modifyMemoryInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetModifyMemoryTarget;
  readonly memoryEdit: CharacterSheetModifyMemoryMemoryEdit;
}): Either.Either<CharacterSheetModifyMemoryInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "enchantment" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== MODIFY_MEMORY_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== MODIFY_MEMORY_DURATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Modify Memory requires the supported level-5 Enchantment memory-edit profile.",
    );
  }

  if (!spell.mechanics.duration.earlyEnd?.some(isTargetTakesDamageEnd)) {
    return characterSheetIssue(
      "Modify Memory requires the target-damage early-ending profile.",
    );
  }

  const saveGatePhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "save_gate" &&
      phase.ability === "wis" &&
      phase.dc.kind === "caster_spell_save_dc" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "modify_memory_target" &&
      phase.attachment.value.kind === "target" &&
      phase.attachment.value.selection.mode === "one" &&
      phase.onSuccess.kind === "none" &&
      appliesModifyMemoryConditions(phase.onFail),
  );
  if (saveGatePhase === undefined) {
    return characterSheetIssue(
      "Modify Memory requires the supported Wisdom save Charmed/Incapacitated profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Modify Memory requires a supported duration.");
  }

  return Either.right({
    tag: "modify_memory",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: MODIFY_MEMORY_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: MODIFY_MEMORY_RANGE_FEET,
    components: ["v", "s"],
    concentration: {
      upTo: duration.right,
      earlyEnd: ["target_takes_damage", "targeted_by_another_spell"],
      noMemoryModifiedOnEarlyEnd: true,
    },
    target: input.target,
    memoryEdit: input.memoryEdit,
    savingThrow: {
      ability: "wis",
      dc: "caster_spell_save_dc",
      advantageIfFightingCaster: true,
    },
    charmState: {
      conditions: ["charmed", "incapacitated"],
      unawareOfSurroundings: true,
      canHearCaster: true,
    },
    outcome: modifyMemoryOutcome({
      target: input.target,
      memoryEdit: input.memoryEdit,
    }),
  });
}

function isTargetTakesDamageEnd(trigger: { readonly kind: string }): boolean {
  return trigger.kind === "target_takes_damage";
}

function appliesModifyMemoryConditions(effect: {
  readonly kind: string;
  readonly condition?: unknown;
  readonly effects?: readonly unknown[];
}): boolean {
  if (effect.kind === "apply_condition") {
    const conditions = Array.isArray(effect.condition)
      ? effect.condition
      : [effect.condition];
    return (
      conditions.includes("charmed") && conditions.includes("incapacitated")
    );
  }
  if (effect.kind !== "composite") return false;
  return (
    effect.effects?.some(
      (entry) =>
        isEffectAtom(entry) &&
        entry.kind === "apply_condition" &&
        entry.condition === "charmed",
    ) === true &&
    effect.effects?.some(
      (entry) =>
        isEffectAtom(entry) &&
        entry.kind === "apply_condition" &&
        entry.condition === "incapacitated",
    ) === true
  );
}

function isEffectAtom(value: unknown): value is {
  readonly kind: string;
  readonly condition?: unknown;
} {
  return value !== null && typeof value === "object" && "kind" in value;
}

function modifyMemoryOutcome(input: {
  readonly target: CharacterSheetModifyMemoryTarget;
  readonly memoryEdit: CharacterSheetModifyMemoryMemoryEdit;
}): CharacterSheetModifyMemoryOutcome {
  if (input.target.savingThrowOutcome.tag === "succeeded") {
    return {
      tag: "savingThrowSucceeded",
      affected: false,
    };
  }
  if (input.target.understandsCasterLanguage === false) {
    return {
      tag: "targetCannotUnderstandLanguage",
      affected: true,
      conditionsDuringSpell: ["charmed", "incapacitated"],
      memoryAltered: false,
      reason: "target_cannot_understand_spoken_description",
    };
  }
  if (input.memoryEdit.descriptionCompleteBeforeSpellEnd === false) {
    return {
      tag: "descriptionIncomplete",
      affected: true,
      conditionsDuringSpell: ["charmed", "incapacitated"],
      memoryAltered: false,
      reason: "spell_ended_before_description_complete",
    };
  }
  return {
    tag: "memoryModified",
    affected: true,
    conditionsDuringSpell: ["charmed", "incapacitated"],
    memoryAltered: true,
    takesHold: "when_spell_ends",
    restoredBySpells: ["remove_curse", "greater_restoration"],
    behaviorConsequenceOwner: input.memoryEdit.behaviorConsequenceOwner,
    nonsensicalMemoryAdjudicationOwner:
      input.memoryEdit.nonsensicalMemoryAdjudicationOwner,
  };
}
