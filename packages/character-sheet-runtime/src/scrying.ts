// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.scrying-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.scrying-remote-sensor-perception
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result, Option } from "effect";

import {
  SCRYING_MATERIAL_COMPONENTS,
  SCRYING_TARGET_CONNECTION_FACTS,
  SCRYING_TARGET_KNOWLEDGE_FACTS,
  characterSheetIssue,
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
import { hasWisdomSaveGatePhase } from "./spell-profile-shape.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
}): Result.Result<CharacterSheetScryingResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(SCRYING_SPELL_ID),
    spellLevel: SCRYING_SPELL_LEVEL,
    spellName: "Scrying",
    invocation: (spell) => {
      const targetIssue = scryingTargetIssue(input.target);
      /* v8 ignore next -- @preserve -- Malformed Scrying request: target facts are parsed by the narrowed request contract before invocation projection. */
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return scryingInvocationFromSpell({
        spell: spell,
        casting: input.casting,
        target: input.target,
      });
    },
  });
}

export function scryingSavingThrowModifier(
  target: Extract<CharacterSheetScryingTarget, { readonly tag: "creature" }>,
): number {
  return target.knowledge.saveModifier + target.connection.saveModifier;
}

function scryingTargetIssue(
  target: CharacterSheetScryingTarget,
): string | null {
  if (target.tag === "location") {
    /* v8 ignore start -- @preserve -- Malformed Scrying request: the narrowed location-target contract requires a location the caster has seen. */
    if (target.seenByCaster === true) return null;
    return "Scrying location targeting requires a location the caster has seen.";
    /* v8 ignore stop -- @preserve */
  }

  /* v8 ignore start -- @preserve -- These branches reject malformed creature target facts outside the narrowed Scrying request contract. */
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
  /* v8 ignore stop -- @preserve */
  return null;
}

function scryingInvocationFromSpell(input: {
  readonly spell: CharacterSheetSpellSource;
  readonly casting: CharacterSheetScryingCasting;
  readonly target: CharacterSheetScryingTarget;
}): Result.Result<CharacterSheetScryingInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Scrying support profile required by this projector. */
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
    spell.mechanics.components.material.kind !== "present" ||
    Option.isNone(spell.mechanics.components.material.costGp) ||
    spell.mechanics.components.material.costGp.value !==
      SCRYING_MATERIAL_COMPONENTS.focusCostGpMinimum
  ) {
    return characterSheetIssue(
      "Scrying requires the supported self-range level-5 Divination sensor profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Missing or underpriced Scrying focus facts are malformed cast-request material input. */
  if (!hasScryingMaterialComponents(input.casting)) {
    return characterSheetIssue(
      "Scrying requires the 1,000 GP non-consumed focus material component contract.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const hasSaveGatePhase = hasWisdomSaveGatePhase(
    spell,
    "scrying_target",
    (phase, attachment) =>
      attachment.value.kind === "target" &&
      isSupportedScryingCreatureSelection(attachment.value.selection) &&
      phase.onFail.kind === "create_sensor" &&
      phase.onFail.visibility === "invisible" &&
      phase.onFail.durability === "invulnerable" &&
      phase.onSuccess.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Scrying spell facts but no supported Wisdom save-gate sensor phase. */
  if (!hasSaveGatePhase) {
    return characterSheetIssue(
      "Scrying requires the supported same-plane creature Wisdom save-gate profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- @preserve -- The exact ten-minute duration admitted above is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue("Scrying requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */
  const retryLockoutDuration = timeSpanDuration({
    unit: "hour",
    amount: SCRYING_RETRY_LOCKOUT_HOURS,
  });
  /* v8 ignore start -- @preserve -- The fixed one-day retry lockout is always accepted by the elapsed-time parser. */
  if (Result.isFailure(retryLockoutDuration)) {
    return characterSheetIssue("Scrying requires a supported retry lockout.");
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "scrying",
    spellId: spell.unitId,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: SCRYING_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "minutes", amount: SCRYING_CASTING_TIME_MINUTES },
    materialComponents: input.casting.materialComponents,
    duration: duration.success,
    concentrationRequired: true,
    target: input.target,
    savingThrow: scryingSavingThrowContract(input.target),
    outcome: scryingOutcome({
      target: input.target,
      retryLockoutDuration: retryLockoutDuration.success,
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
