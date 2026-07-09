// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.dominate-person-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.dominate-person-command-control
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetDominatePersonInvocation,
  type CharacterSheetDominatePersonOutcome,
  type CharacterSheetDominatePersonResult,
  type CharacterSheetDominatePersonTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const DOMINATE_PERSON_SPELL_ID = "dominate_person" as const;
const DOMINATE_PERSON_SPELL_LEVEL = spellSlotLevel(5);
const DOMINATE_PERSON_RANGE_FEET = 60;
const DOMINATE_PERSON_DURATION_MINUTES = 1;

export function castDominatePerson(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetDominatePersonTarget;
}): Either.Either<CharacterSheetDominatePersonResult, CharacterSheetIssue> {
  const spell = dominatePersonSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedDominatePersonAccess(input.sheet)) {
    return characterSheetIssue(
      "Dominate Person requires prepared class Spell Access.",
    );
  }

  const targetIssue = dominatePersonTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = dominatePersonInvocationFromSpell({
    spell: spell.right,
    target: input.target,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: DOMINATE_PERSON_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function dominatePersonSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, DOMINATE_PERSON_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Dominate Person requires a Spell record.");
  }
  return Either.right(unit.right);
}

function hasPreparedDominatePersonAccess(sheet: CharacterSheet): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some(
        (spellId) => spellId === DOMINATE_PERSON_SPELL_ID,
      ),
    ) ?? false
  );
}

function dominatePersonTargetIssue(
  target: CharacterSheetDominatePersonTarget,
): string | null {
  if (target.visibleByCaster !== true || target.withinRangeFeet !== 60) {
    return "Dominate Person targets must be visible Humanoids within 60 feet.";
  }
  if (target.creatureType !== "humanoid") {
    return "Dominate Person requires a Humanoid target.";
  }
  if (
    target.savingThrowOutcome.tag !== "succeeded" &&
    target.savingThrowOutcome.tag !== "failed"
  ) {
    return "Dominate Person requires a Wisdom Saving Throw outcome.";
  }
  return null;
}

function dominatePersonInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetDominatePersonTarget;
}): Either.Either<CharacterSheetDominatePersonInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.id !== DOMINATE_PERSON_SPELL_ID ||
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "enchantment" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== DOMINATE_PERSON_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== DOMINATE_PERSON_DURATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Dominate Person requires the supported level-5 Enchantment mental-control profile.",
    );
  }

  const saveGatePhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "save_gate" &&
      phase.ability === "wis" &&
      phase.dc.kind === "caster_spell_save_dc" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "dominate_person_target" &&
      phase.attachment.value.kind === "target" &&
      isDominatePersonTargetSelection(phase.attachment.value.selection) &&
      phase.onFail.kind === "apply_condition" &&
      phase.onFail.condition === "charmed" &&
      phase.onSuccess.kind === "none" &&
      hasDamageTriggeredEndingRepeatSave(phase.repeatSaves),
  );
  if (saveGatePhase === undefined) {
    return characterSheetIssue(
      "Dominate Person requires the supported Wisdom save Charmed control profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Dominate Person requires a supported duration.");
  }

  return Either.right({
    tag: "dominate_person",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: DOMINATE_PERSON_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: DOMINATE_PERSON_RANGE_FEET,
    components: ["v", "s"],
    target: input.target,
    savingThrow: {
      ability: "wis",
      dc: "caster_spell_save_dc",
      advantageIfCasterOrAlliesAreFightingTarget:
        input.target.fightingCasterOrAllies,
    },
    outcome: dominatePersonOutcome({
      target: input.target,
      duration: duration.right,
    }),
  });
}

function isDominatePersonTargetSelection(selection: unknown): boolean {
  if (selection === null || typeof selection !== "object") return false;
  if (!("mode" in selection) || selection.mode !== "one") return false;
  const targetKinds =
    "targetKinds" in selection ? selection.targetKinds : undefined;
  const typeFilter =
    "typeFilter" in selection ? selection.typeFilter : undefined;
  return (
    Array.isArray(targetKinds) &&
    targetKinds.length === 1 &&
    targetKinds[0] === "creature" &&
    Array.isArray(typeFilter) &&
    typeFilter.length === 1 &&
    typeFilter[0] === "humanoid"
  );
}

function hasDamageTriggeredEndingRepeatSave(repeatSaves: unknown): boolean {
  if (!Array.isArray(repeatSaves)) return false;
  return repeatSaves.some(
    (repeatSave) =>
      repeatSave !== null &&
      typeof repeatSave === "object" &&
      "cadence" in repeatSave &&
      repeatSave.cadence === "on_target_takes_damage" &&
      "onSuccess" in repeatSave &&
      repeatSave.onSuccess === "ends_on_target",
  );
}

function dominatePersonOutcome(input: {
  readonly target: CharacterSheetDominatePersonTarget;
  readonly duration: TimeSpanDuration;
}): CharacterSheetDominatePersonOutcome {
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
    concentrationRequired: true,
    telepathicCommandLink: {
      actionCost: "none",
      commandTransmissionOwner: "character-sheet-session",
      obedienceAdjudicationOwner: "table",
    },
    repeatSave: {
      trigger: "target_takes_damage",
      ability: "wis",
      dc: "caster_spell_save_dc",
      onSuccess: "ends_on_target",
      observationOwner: "table-session",
    },
  };
}
