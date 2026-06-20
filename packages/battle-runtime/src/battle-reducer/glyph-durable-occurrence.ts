// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-durable-occurrence
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE
//
// Glyph of Warding durable occurrence boundary.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Glyph of Warding":
//     one-hour creation, Touch range, permanent until dispelled or triggered,
//     surface or closeable-object inscription, maximum 10-foot diameter,
//     Wisdom (Perception) against spell save DC to notice, caster-defined
//     trigger/refinement/exclusion, and movement invalidation more than
//     10 feet from the cast location ending the spell without triggering.
//   - UBIQUITOUS_LANGUAGE.md: Spell Effect, Ability Check, and table-owned
//     spatial facts.

import { CREATURE_TYPES } from "@dnd/shared/game-facts";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type {
  GlyphWardingMechanics,
  GlyphWardingOccurrence,
  GlyphWardingTrigger,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  GlyphDurableOccurrenceActiveEffect,
  GlyphDurableOccurrenceAnchor,
} from "../battle-reducer.ts";
import type {
  BattleAreaId,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "./spells-effective-level.ts";
import { sameStringSet } from "./spells-profile-shared.ts";

const GLYPH_OF_WARDING_BASE_LEVEL = 3;
const GLYPH_OF_WARDING_CASTING_HOURS = 1;
const GLYPH_MAX_COVERED_DIAMETER_FEET = 10;
const GLYPH_MOVEMENT_INVALIDATION_MORE_THAN_FEET = 10;
const GLYPH_SURFACE_COMMON_EVENTS = [
  "touching_glyph",
  "stepping_on_glyph",
  "removing_covering_object",
  "approaching_within_caster_set_distance",
] as const;
const GLYPH_CLOSEABLE_OBJECT_COMMON_EVENTS = [
  "opening_object",
  "seeing_glyph",
] as const;

export type GlyphDurableOccurrenceProfile = {
  readonly kind: "glyphDurableOccurrenceProfile";
  readonly minimumSpellLevel: BattleSpellEffectLevel;
  readonly creationBoundary: {
    readonly kind: "completedOneHourInscription";
    readonly castingHours: 1;
  };
  readonly maxCoveredDiameterFeet: MovementFeet;
  readonly notice: GlyphDurableOccurrenceActiveEffect["notice"];
  readonly trigger: GlyphDurableOccurrenceActiveEffect["trigger"];
  readonly movementInvalidation: GlyphDurableOccurrenceActiveEffect["movementInvalidation"];
};

export type CompletedGlyphInscriptionWitness = {
  readonly kind: "completedGlyphInscription";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly anchor: GlyphDurableOccurrenceAnchor;
  readonly coveredAreaId: BattleAreaId;
  readonly castLocationId: BattleTablePositionId;
};

export type GlyphTriggerOccurrenceWitness = {
  readonly kind: "tableWitnessedGlyphTriggerOccurrence";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
};

export type GlyphMovementInvalidationWitness = {
  readonly kind: "tableWitnessedGlyphMovementInvalidation";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly movedSubject: "inscribed_surface_or_object";
  readonly castLocationId: BattleTablePositionId;
  readonly distanceFrom: "cast_location";
  readonly distanceFeet: MovementFeet;
};

export type GlyphDurableOccurrenceEndWitness =
  | GlyphTriggerOccurrenceWitness
  | GlyphMovementInvalidationWitness;

export type GlyphDurableOccurrenceEffectFromCompletedInscriptionResult =
  | {
      readonly tag: "created";
      readonly effect: GlyphDurableOccurrenceActiveEffect;
    }
  | {
      readonly tag: "sourceSpellLevelBelowMinimum";
      readonly sourceSpellLevel: BattleSpellEffectLevel;
      readonly minimumSpellLevel: BattleSpellEffectLevel;
    };

export type AddGlyphDurableOccurrenceResult =
  | {
      readonly tag: "added";
      readonly state: BattleState;
      readonly effect: GlyphDurableOccurrenceActiveEffect;
    }
  | {
      readonly tag: "sourceCombatantNotFound";
      readonly state: BattleState;
      readonly sourceCombatantId: CombatantId;
    }
  | {
      readonly tag: "duplicateOccurrence";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    };

export type EndGlyphDurableOccurrenceResult =
  | {
      readonly tag: "ended";
      readonly state: BattleState;
      readonly effect: GlyphDurableOccurrenceActiveEffect;
      readonly reason: "triggered" | "movementInvalidation";
    }
  | {
      readonly tag: "notFound";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    }
  | {
      readonly tag: "ambiguousOccurrence";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    }
  | {
      readonly tag: "invalidWitness";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
      readonly reason: "castLocationMismatch" | "movementNotBeyondThreshold";
    };
type GlyphEndWitnessValidationFailure =
  | "castLocationMismatch"
  | "movementNotBeyondThreshold";

export function glyphDurableOccurrenceProfileForSpell(
  spell: SpellRecord,
): GlyphDurableOccurrenceProfile | null {
  if (
    spell.kind !== "spell" ||
    spell.mechanics.family !== "glyph_warding" ||
    !glyphWardingMechanicsSupportsDurableOccurrence(spell.mechanics)
  ) {
    return null;
  }
  const minimumSpellLevel = parseBattleSpellEffectLevel(spell.mechanics.level);
  return minimumSpellLevel === null
    ? null
    : {
        kind: "glyphDurableOccurrenceProfile",
        minimumSpellLevel,
        creationBoundary: {
          kind: "completedOneHourInscription",
          castingHours: GLYPH_OF_WARDING_CASTING_HOURS,
        },
        maxCoveredDiameterFeet: movementFeet(
          spell.mechanics.occurrence.coverage.maxDiameterFeet,
        ),
        notice: {
          ability: "wis",
          skill: "perception",
          dc: { kind: "caster_spell_save_dc" },
          owner: "table_witnessed_glyph_notice",
        },
        trigger: {
          occurrence: "table_witnessed_trigger_occurrence",
          activationFilter: "creature_type",
          nonTriggerExclusion: "password_or_other_condition",
          onTriggered: "spell_ends",
        },
        movementInvalidation: {
          movedSubject: "inscribed_surface_or_object",
          distanceFrom: "cast_location",
          moreThanFeet: movementFeet(
            spell.mechanics.occurrence.movementInvalidation.moreThanFeet,
          ),
          outcome: "glyph_breaks_spell_ends_without_triggering",
        },
      };
}

export function glyphDurableOccurrenceEffectFromCompletedInscription(input: {
  readonly profile: GlyphDurableOccurrenceProfile;
  readonly witness: CompletedGlyphInscriptionWitness;
}): GlyphDurableOccurrenceEffectFromCompletedInscriptionResult {
  if (
    Number(input.witness.sourceSpellLevel) <
    Number(input.profile.minimumSpellLevel)
  ) {
    return {
      tag: "sourceSpellLevelBelowMinimum",
      sourceSpellLevel: input.witness.sourceSpellLevel,
      minimumSpellLevel: input.profile.minimumSpellLevel,
    };
  }
  return {
    tag: "created",
    effect: {
      kind: "glyphDurableOccurrence",
      sourceSpellId: input.witness.sourceSpellId,
      sourceCombatantId: input.witness.sourceCombatantId,
      sourceEffectId: input.witness.sourceEffectId,
      sourceSpellLevel: input.witness.sourceSpellLevel,
      anchor: input.witness.anchor,
      coveredAreaId: input.witness.coveredAreaId,
      castLocationId: input.witness.castLocationId,
      maxCoveredDiameterFeet: input.profile.maxCoveredDiameterFeet,
      notice: input.profile.notice,
      trigger: input.profile.trigger,
      movementInvalidation: input.profile.movementInvalidation,
      expiresAt: { kind: "untilDispelled" },
    },
  };
}

export function addGlyphDurableOccurrence(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
}): AddGlyphDurableOccurrenceResult {
  if (glyphOccurrenceRefs(input.state, input.effect.sourceEffectId).length > 0) {
    return {
      tag: "duplicateOccurrence",
      state: input.state,
      sourceEffectId: input.effect.sourceEffectId,
    };
  }
  const sourceCombatant = input.state.combatants.get(
    input.effect.sourceCombatantId,
  );
  if (sourceCombatant === undefined) {
    return {
      tag: "sourceCombatantNotFound",
      state: input.state,
      sourceCombatantId: input.effect.sourceCombatantId,
    };
  }
  return {
    tag: "added",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.effect.sourceCombatantId,
        {
          ...sourceCombatant,
          activeEffects: [...sourceCombatant.activeEffects, input.effect],
        },
      ),
    },
    effect: input.effect,
  };
}

export function endGlyphDurableOccurrence(input: {
  readonly state: BattleState;
  readonly witness: GlyphDurableOccurrenceEndWitness;
}): EndGlyphDurableOccurrenceResult {
  const refs = glyphOccurrenceRefs(input.state, input.witness.sourceEffectId);
  if (refs.length === 0) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  if (refs.length > 1) {
    return {
      tag: "ambiguousOccurrence",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  const [ref] = refs;
  if (ref === undefined) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  const validation = glyphEndWitnessValidation(ref.effect, input.witness);
  if (validation !== null) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
      reason: validation,
    };
  }
  return {
    tag: "ended",
    state: battleStateWithoutGlyphOccurrence(
      input.state,
      ref.effect.sourceEffectId,
    ),
    effect: ref.effect,
    reason:
      input.witness.kind === "tableWitnessedGlyphTriggerOccurrence"
        ? "triggered"
        : "movementInvalidation",
  };
}

function glyphWardingMechanicsSupportsDurableOccurrence(
  mechanics: GlyphWardingMechanics,
): boolean {
  return (
    mechanics.level === GLYPH_OF_WARDING_BASE_LEVEL &&
    mechanics.castingTime.kind === "hours" &&
    mechanics.castingTime.amount === GLYPH_OF_WARDING_CASTING_HOURS &&
    mechanics.castingTime.ritual === false &&
    mechanics.range.kind === "touch" &&
    glyphWardingComponentsSupported(mechanics.components) &&
    glyphWardingDurationSupported(mechanics.duration) &&
    glyphWardingOccurrenceSupported(mechanics.occurrence) &&
    glyphWardingTriggerSupported(mechanics.trigger)
  );
}

function glyphWardingComponentsSupported(
  components: GlyphWardingMechanics["components"],
): boolean {
  return (
    components.v === true &&
    components.s === true &&
    typeof components.m === "string" &&
    "materialCostGp" in components &&
    components.materialCostGp === 200 &&
    "materialConsumed" in components &&
    components.materialConsumed === true
  );
}

function glyphWardingDurationSupported(
  duration: GlyphWardingMechanics["duration"],
): boolean {
  return (
    duration.kind === "permanent" &&
    duration.endsOn !== undefined &&
    sameStringSet(duration.endsOn, ["dispel"])
  );
}

function glyphWardingOccurrenceSupported(
  occurrence: GlyphWardingOccurrence,
): boolean {
  return (
    occurrence.kind === "durable_glyph_occurrence" &&
    occurrence.inscriptionAnchor.chooser === "caster" &&
    occurrence.inscriptionAnchor.surface.kind === "surface" &&
    occurrence.inscriptionAnchor.surface.inscriptionSite === "on_surface" &&
    occurrence.inscriptionAnchor.closeableObject.kind ===
      "closeable_object" &&
    occurrence.inscriptionAnchor.closeableObject.inscriptionSite ===
      "within_object" &&
    occurrence.inscriptionAnchor.closeableObject.concealmentMethod ===
      "object_can_be_closed" &&
    occurrence.coverage.maxDiameterFeet ===
      GLYPH_MAX_COVERED_DIAMETER_FEET &&
    occurrence.coverage.placement.kind ===
      "table_witnessed_covered_area_on_inscribed_anchor" &&
    occurrence.coverage.placement.constraint === "within_max_diameter" &&
    occurrence.castLocation.kind === "table_witnessed_cast_location" &&
    occurrence.movementInvalidation.movedSubject ===
      "inscribed_surface_or_object" &&
    occurrence.movementInvalidation.distanceFrom === "cast_location" &&
    occurrence.movementInvalidation.moreThanFeet ===
      GLYPH_MOVEMENT_INVALIDATION_MORE_THAN_FEET &&
    occurrence.movementInvalidation.outcome ===
      "glyph_breaks_spell_ends_without_triggering" &&
    occurrence.concealment.visibility === "nearly_imperceptible" &&
    occurrence.concealment.notice.kind === "wisdom_perception_check" &&
    occurrence.concealment.notice.ability === "wis" &&
    occurrence.concealment.notice.skill === "perception" &&
    occurrence.concealment.notice.dc.kind === "caster_spell_save_dc" &&
    occurrence.concealment.notice.owner === "table_witnessed_glyph_notice"
  );
}

function glyphWardingTriggerSupported(trigger: GlyphWardingTrigger): boolean {
  return (
    trigger.kind === "caster_defined_glyph_trigger" &&
    trigger.setWhen === "glyph_inscribed" &&
    trigger.triggerOccurrence.kind === "table_witnessed_trigger_occurrence" &&
    sameStringSet(trigger.commonEvents.surface, GLYPH_SURFACE_COMMON_EVENTS) &&
    sameStringSet(
      trigger.commonEvents.closeableObject,
      GLYPH_CLOSEABLE_OBJECT_COMMON_EVENTS,
    ) &&
    trigger.refinement.activationFilter.kind === "creature_type" &&
    trigger.refinement.activationFilter.chooser === "caster" &&
    trigger.refinement.activationFilter.typeChoice.kind === "choice" &&
    sameStringSet(
      trigger.refinement.activationFilter.typeChoice.options,
      CREATURE_TYPES,
    ) &&
    trigger.refinement.nonTriggerExclusion.kind ===
      "password_or_other_condition" &&
    trigger.refinement.nonTriggerExclusion.chooser === "caster" &&
    trigger.onTriggered === "spell_ends"
  );
}

function glyphOccurrenceRefs(
  state: BattleState,
  sourceEffectId: BattleSpellEffectOccurrenceId,
): readonly {
  readonly combatantId: CombatantId;
  readonly combatant: BattleCreatureState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
}[] {
  return [...state.combatants].flatMap(([combatantId, combatant]) =>
    combatant.activeEffects.flatMap((effect) =>
      isGlyphDurableOccurrence(effect) &&
      effect.sourceEffectId === sourceEffectId
        ? [{ combatantId, combatant, effect }]
        : [],
    ),
  );
}

function battleStateWithoutGlyphOccurrence(
  state: BattleState,
  sourceEffectId: BattleSpellEffectOccurrenceId,
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        combatantWithoutGlyphOccurrence(combatant, sourceEffectId),
      ]),
    ),
  };
}

function combatantWithoutGlyphOccurrence(
  combatant: BattleCreatureState,
  sourceEffectId: BattleSpellEffectOccurrenceId,
): BattleCreatureState {
  const activeEffects = combatant.activeEffects.filter(
    (effect) =>
      !isGlyphDurableOccurrence(effect) ||
      effect.sourceEffectId !== sourceEffectId,
  );
  return activeEffects.length === combatant.activeEffects.length
    ? combatant
    : { ...combatant, activeEffects };
}

function glyphEndWitnessValidation(
  effect: GlyphDurableOccurrenceActiveEffect,
  witness: GlyphDurableOccurrenceEndWitness,
): GlyphEndWitnessValidationFailure | null {
  if (witness.kind === "tableWitnessedGlyphTriggerOccurrence") {
    return null;
  }
  if (witness.castLocationId !== effect.castLocationId) {
    return "castLocationMismatch";
  }
  return Number(witness.distanceFeet) >
    Number(effect.movementInvalidation.moreThanFeet)
    ? null
    : "movementNotBeyondThreshold";
}

function isGlyphDurableOccurrence(
  effect: BattleActiveEffect,
): effect is GlyphDurableOccurrenceActiveEffect {
  return effect.kind === "glyphDurableOccurrence";
}
