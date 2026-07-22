// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.scrying-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.scrying-remote-sensor-perception
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
  SCRYING_MATERIAL_COMPONENTS,
  SCRYING_TARGET_CONNECTION_FACTS,
  SCRYING_TARGET_KNOWLEDGE_FACTS,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetScryingCasting,
  type CharacterSheetScryingInvocation,
  type CharacterSheetScryingOutcome,
  type CharacterSheetScryingResult,
  type CharacterSheetScryingTarget,
  type CharacterSheetScryingTargetConnection,
  type CharacterSheetScryingTargetKnowledge,
} from "./sheet-types.ts";

const SCRYING_SPELL_ID = "scrying" as const;
const SCRYING_SPELL_LEVEL = spellSlotLevel(5);
const SCRYING_CASTING_TIME_MINUTES = 10;
const SCRYING_CONCENTRATION_MINUTES = 10;
const SCRYING_SENSOR_TARGET_DISTANCE_FEET = 10;
const SCRYING_RETRY_LOCKOUT_HOURS = 24;

export function castScrying(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly casting: CharacterSheetScryingCasting;
  readonly target: CharacterSheetScryingTarget;
}): Either.Either<CharacterSheetScryingResult, CharacterSheetIssue> {
  const spell = scryingSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue("Scrying requires prepared class Spell Access.");
  }

  const targetIssue = scryingTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = scryingInvocationFromSpell({
    spell: spell.right,
    casting: input.casting,
    target: input.target,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: SCRYING_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

export function scryingSavingThrowModifier(
  target: Extract<CharacterSheetScryingTarget, { readonly tag: "creature" }>,
): number {
  return target.knowledge.saveModifier + target.connection.saveModifier;
}

function scryingSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, authoredUnitId(SCRYING_SPELL_ID));
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Scrying requires a Spell record.");
  }
  return Either.right(unit.right);
}

function scryingTargetIssue(
  target: CharacterSheetScryingTarget,
): string | null {
  if (target.tag === "location") {
    return target.seenByCaster === true
      ? null
      : "Scrying location targeting requires a location the caster has seen.";
  }

  if (target.plane !== "same_plane_as_caster") {
    return "Scrying creature targeting requires the target to be on the same plane as the caster.";
  }
  if (!isSupportedScryingKnowledge(target.knowledge)) {
    return "Scrying creature targeting requires a supported target-knowledge fact.";
  }
  if (!isSupportedScryingConnection(target.connection)) {
    return "Scrying creature targeting requires a supported target-connection fact.";
  }
  if (
    target.savingThrowOutcome.tag !== "succeeded" &&
    target.savingThrowOutcome.tag !== "failed"
  ) {
    return "Scrying creature targeting requires a Wisdom Saving Throw outcome.";
  }
  return null;
}

function scryingInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetScryingCasting;
  readonly target: CharacterSheetScryingTarget;
}): Either.Either<CharacterSheetScryingInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== SCRYING_CASTING_TIME_MINUTES ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== SCRYING_CONCENTRATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    !("materialCostGp" in spell.mechanics.components) ||
    spell.mechanics.components.materialCostGp !==
      SCRYING_MATERIAL_COMPONENTS.focusCostGpMinimum
  ) {
    return characterSheetIssue(
      "Scrying requires the supported self-range level-5 Divination sensor profile.",
    );
  }
  if (!hasScryingMaterialComponents(input.casting)) {
    return characterSheetIssue(
      "Scrying requires the 1,000 GP non-consumed focus material component contract.",
    );
  }
  const saveGatePhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "save_gate" &&
      phase.ability === "wis" &&
      phase.dc.kind === "caster_spell_save_dc" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "scrying_target" &&
      phase.attachment.value.kind === "target" &&
      isSupportedScryingCreatureSelection(phase.attachment.value.selection) &&
      phase.onFail.kind === "create_sensor" &&
      phase.onFail.visibility === "invisible" &&
      phase.onFail.durability === "invulnerable" &&
      phase.onSuccess.kind === "none",
  );
  if (saveGatePhase === undefined) {
    return characterSheetIssue(
      "Scrying requires the supported same-plane creature Wisdom save-gate profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Scrying requires a supported duration.");
  }
  const retryLockoutDuration = timeSpanDuration({
    unit: "hour",
    amount: SCRYING_RETRY_LOCKOUT_HOURS,
  });
  if (Either.isLeft(retryLockoutDuration)) {
    return characterSheetIssue("Scrying requires a supported retry lockout.");
  }

  return Either.right({
    tag: "scrying",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: SCRYING_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "minutes", amount: SCRYING_CASTING_TIME_MINUTES },
    materialComponents: input.casting.materialComponents,
    duration: duration.right,
    concentrationRequired: true,
    target: input.target,
    savingThrow: scryingSavingThrowContract(input.target),
    outcome: scryingOutcome({
      target: input.target,
      retryLockoutDuration: retryLockoutDuration.right,
    }),
  });
}

function scryingSavingThrowContract(
  target: CharacterSheetScryingTarget,
): CharacterSheetScryingInvocation["savingThrow"] {
  if (target.tag === "location") {
    return { tag: "notRequiredForSeenLocation" };
  }
  return {
    tag: "requiredForCreatureTarget",
    ability: "wis",
    dc: "caster_spell_save_dc",
    targetAwareness: "feels_uneasy_without_knowing_source",
    knowledge: target.knowledge,
    connection: target.connection,
  };
}

function scryingOutcome(input: {
  readonly target: CharacterSheetScryingTarget;
  readonly retryLockoutDuration: TimeSpanDuration;
}): CharacterSheetScryingOutcome {
  const target = input.target;
  if (target.tag === "location") {
    return {
      tag: "locationSensor",
      sensor: {
        tag: "stationaryAtSeenLocation",
        visibility: "invisible",
        tangibility: "intangible",
        casterPerception: "see_and_hear_as_if_there",
        visibleAppearance: "fist_sized_luminous_orb",
        remoteContentsOwner: "table",
        specialSenseVisibilityOwner: "table",
        mapPlacementOwner: "table",
      },
    };
  }
  if (target.savingThrowOutcome.tag === "succeeded") {
    return {
      tag: "creatureSaveSucceeded",
      targetAffected: false,
      retryLockout: {
        targetId: target.targetId,
        duration: input.retryLockoutDuration,
      },
    };
  }
  return {
    tag: "creatureSaveFailed",
    sensor: {
      tag: "movingWithCreatureTarget",
      visibility: "invisible",
      tangibility: "intangible",
      maxDistanceFromTargetFeet: SCRYING_SENSOR_TARGET_DISTANCE_FEET,
      casterPerception: "see_and_hear_as_if_there",
      visibleAppearance: "fist_sized_luminous_orb",
      remoteContentsOwner: "table",
      specialSenseVisibilityOwner: "table",
      mapPlacementOwner: "table",
    },
  };
}

function isSupportedScryingKnowledge(
  knowledge: CharacterSheetScryingTargetKnowledge,
): boolean {
  return SCRYING_TARGET_KNOWLEDGE_FACTS.some(
    (fact) =>
      fact.tag === knowledge.tag &&
      fact.saveModifier === knowledge.saveModifier,
  );
}

function isSupportedScryingConnection(
  connection: CharacterSheetScryingTargetConnection,
): boolean {
  return SCRYING_TARGET_CONNECTION_FACTS.some(
    (fact) =>
      fact.tag === connection.tag &&
      fact.objectChoice === connection.objectChoice &&
      fact.saveModifier === connection.saveModifier,
  );
}

function hasScryingMaterialComponents(
  casting: CharacterSheetScryingCasting,
): boolean {
  return (
    casting.materialComponents.focusCostGpMinimum ===
      SCRYING_MATERIAL_COMPONENTS.focusCostGpMinimum &&
    casting.materialComponents.consumed ===
      SCRYING_MATERIAL_COMPONENTS.consumed &&
    casting.materialComponents.focusExamples.length ===
      SCRYING_MATERIAL_COMPONENTS.focusExamples.length &&
    casting.materialComponents.focusExamples.every((example) =>
      SCRYING_MATERIAL_COMPONENTS.focusExamples.some(
        (supportedExample) => supportedExample === example,
      ),
    )
  );
}

function isSupportedScryingCreatureSelection(selection: {
  readonly mode: string;
  readonly targetKinds?: readonly unknown[];
}): boolean {
  return (
    selection.mode === "one" &&
    selection.targetKinds?.length === 1 &&
    selection.targetKinds[0] === "creature"
  );
}

export const completedScryingCasting = {
  tag: "completedScryingCasting",
  materialComponents: SCRYING_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetScryingCasting;
