// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.seeming-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.seeming-illusion-perception
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
  type CharacterSheetSeemingInvocation,
  type CharacterSheetSeemingResult,
  type CharacterSheetSeemingTarget,
  type CharacterSheetSeemingTargetOutcome,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const SEEMING_SPELL_ID = "seeming" as const;
const SEEMING_SPELL_LEVEL = spellSlotLevel(5);
const SEEMING_RANGE_FEET = 30;

export function castSeeming(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly targets: readonly CharacterSheetSeemingTarget[];
}): Either.Either<CharacterSheetSeemingResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(SEEMING_SPELL_ID),
    spellLevel: SEEMING_SPELL_LEVEL,
    spellName: "Seeming",
    invocation: (spell) => {
      const targetIssue = seemingTargetIssue(input.targets);
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return seemingInvocationFromSpell({
        spell: spell,
        targets: input.targets,
      });
    },
  });
}

function seemingTargetIssue(
  targets: readonly CharacterSheetSeemingTarget[],
): string | null {
  const targetIds = new Set(targets.map((target) => target.targetId));
  if (targetIds.size !== targets.length) {
    return "Seeming requires unique target ids.";
  }

  for (const target of targets) {
    /* v8 ignore start -- @preserve -- These branches reject malformed visibility, appearance, or save facts outside the narrowed Seeming target contract. */
    if (target.visibleByCaster !== true || target.withinRangeFeet !== 30) {
      return "Seeming targets must be visible creatures within 30 feet.";
    }
    if (target.appearance.sameBasicArrangementOfLimbs !== true) {
      return "Seeming target appearances must keep the same basic arrangement of limbs.";
    }
    if (
      target.appearance.heightChangeFeet < -1 ||
      target.appearance.heightChangeFeet > 1
    ) {
      return "Seeming target appearances can change apparent height by no more than 1 foot.";
    }
    if (
      target.willingness === "unwilling" &&
      target.savingThrowOutcome.tag !== "succeeded" &&
      target.savingThrowOutcome.tag !== "failed"
    ) {
      return "Seeming unwilling targets require a Charisma Saving Throw outcome.";
    }
    /* v8 ignore stop -- @preserve */
  }

  return null;
}

function seemingInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly targets: readonly CharacterSheetSeemingTarget[];
}): Either.Either<CharacterSheetSeemingInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Seeming support profile required by this projector. */
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SEEMING_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false ||
    spell.mechanics.school !== "illusion"
  ) {
    return characterSheetIssue(
      "Seeming requires the supported level-5 Illusion visible-creature profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const saveGatePhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "save_gate" &&
      phase.ability === "cha" &&
      phase.dc.kind === "caster_spell_save_dc" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "seeming_targets" &&
      phase.attachment.value.kind === "target" &&
      isSupportedSeemingSelection(phase.attachment.value.selection) &&
      phase.onFail.kind === "create_illusion" &&
      phase.onFail.channels.length === 1 &&
      phase.onFail.channels[0] === "visual" &&
      phase.onSuccess.kind === "none" &&
      "saveAppliesIf" in phase &&
      phase.saveAppliesIf === "unwilling_target",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Seeming spell facts but no supported unwilling-target save phase. */
  if (saveGatePhase === undefined) {
    return characterSheetIssue(
      "Seeming requires the supported unwilling-target Charisma save profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored Seeming duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Seeming requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

  return Either.right({
    tag: "seeming",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: SEEMING_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    rangeFeet: SEEMING_RANGE_FEET,
    duration: duration.right,
    targets: input.targets,
    savingThrow: {
      tag: "unwillingTargetsOnly",
      ability: "cha",
      dc: "caster_spell_save_dc",
    },
    illusion: {
      channels: ["visual"] as const,
      sameOrDifferentAppearancesAllowed: true,
      changesBodiesAndEquipment: true,
      maxHeightChangeFeet: 1,
      sameBasicArrangementOfLimbsRequired: true,
      physicalInspection: {
        failsToHoldUp: true,
        objectsPassThroughAddedAppearance: true,
      },
      studyReveal: {
        action: "study",
        ability: "int",
        skill: "investigation",
        dc: "caster_spell_save_dc",
        success: "aware_target_is_disguised",
      },
      targetAppearanceRenderingOwner: "table",
      ongoingPerceptionAdjudicationOwner: "table",
    },
    outcomes: input.targets.map(seemingTargetOutcome),
  });
}

function seemingTargetOutcome(
  target: CharacterSheetSeemingTarget,
): CharacterSheetSeemingTargetOutcome {
  if (target.willingness === "willing") {
    return {
      tag: "targetDisguised",
      targetId: target.targetId,
      saveRequired: false,
      appearance: target.appearance,
    };
  }
  if (target.savingThrowOutcome.tag === "succeeded") {
    return {
      tag: "unwillingSaveSucceeded",
      targetId: target.targetId,
      saveRequired: true,
      affected: false,
    };
  }
  return {
    tag: "unwillingSaveFailed",
    targetId: target.targetId,
    saveRequired: true,
    appearance: target.appearance,
  };
}

function isSupportedSeemingSelection(selection: {
  readonly mode: string;
  readonly targetKinds?: readonly unknown[];
}): boolean {
  return (
    selection.mode === "any_number" &&
    selection.targetKinds?.length === 1 &&
    selection.targetKinds[0] === "creature"
  );
}
