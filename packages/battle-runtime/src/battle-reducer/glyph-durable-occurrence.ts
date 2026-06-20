// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE
//
// Glyph of Warding durable occurrence boundary.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Glyph of Warding":
//     one-hour creation, Touch range, permanent until dispelled or triggered,
//     surface or closeable-object inscription, maximum 10-foot diameter,
//     Wisdom (Perception) against spell save DC to notice, caster-defined
//     trigger/refinement/exclusion, and movement invalidation more than
//     10 feet from the cast location ending the spell without triggering; the
//     explosive rune branch erupts in a 20-foot-radius Sphere, uses Dexterity
//     Saving Throws, deals caster-chosen Acid/Cold/Fire/Lightning/Thunder
//     damage, halves damage on successful saves, and scales by Spell Slot
//     level.
//   - UBIQUITOUS_LANGUAGE.md: Spell Effect, Ability Check, Saving Throw,
//     Damage Type, Area of Effect, and table-owned spatial facts.

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import { CREATURE_TYPES } from "@dnd/shared/game-facts";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type {
  DamageType,
  DiceExpr,
  GlyphWardingExplosiveRuneBranch,
  GlyphWardingMechanics,
  GlyphWardingOccurrence,
  GlyphWardingTrigger,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type {
  BattleActiveEffect,
  BattleAttackDamageDispositionHole,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleGlyphExplosiveRuneDamageRollHole,
  BattleGlyphExplosiveRuneSavingThrowOutcomeHole,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleSpellDamageReductionRollHole,
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
import {
  applyBattleHitPointDamage,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  addDamageAmountForType,
  applyAvailableSpellDamageReduction,
  availableSpellDamageReduction,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollForTarget,
  spellDamageReductionRollHole,
} from "./damage-helpers.ts";
import { spellSaveDcForCaster } from "./attack-resolution.ts";
import {
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { sameStringSet } from "./spells-profile-shared.ts";
import {
  d20TestNaturalOneRerollOutcomeDecisionRequired,
  d20TestNaturalOneRerollOutcomeIssue,
  effectiveD20TestNaturalOneRerollSavingThrowOutcomes,
} from "./d20-test-natural-one-reroll.ts";

const GLYPH_OF_WARDING_BASE_LEVEL = 3;
const GLYPH_OF_WARDING_CASTING_HOURS = 1;
const GLYPH_MAX_COVERED_DIAMETER_FEET = 10;
const GLYPH_MOVEMENT_INVALIDATION_MORE_THAN_FEET = 10;
const GLYPH_EXPLOSIVE_RUNE_RADIUS_FEET = 20;
const GLYPH_EXPLOSIVE_RUNE_BASE_DAMAGE_DICE = 5;
const GLYPH_EXPLOSIVE_RUNE_DAMAGE_DIE_SIZE = 8;
const GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;
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
type GlyphExplosiveRuneDamageType =
  (typeof GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES)[number];
type GlyphDurableOccurrenceExplosiveRuneRelease = Extract<
  GlyphDurableOccurrenceActiveEffect["release"],
  { readonly kind: "explosiveRune" }
>;
type GlyphExplosiveRuneConcentrationSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;
type GlyphExplosiveRuneDamageDispositionFill = Extract<
  BattleFill,
  { readonly kind: "attackDamageDisposition" }
>;
type GlyphExplosiveRuneHideousLaughterRepeatSaveFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type GlyphExplosiveRuneSavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type GlyphExplosiveRuneSpellDamageReductionRollFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;
type GlyphExplosiveRuneSavingThrowOutcomes = Extract<
  GlyphExplosiveRuneSavingThrowOutcomeFill["value"],
  { readonly outcomes: readonly unknown[] }
>["outcomes"];
type GlyphExplosiveRuneDamageResolutionHole =
  | BattleGlyphExplosiveRuneDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleConcentrationSavingThrowHole
  | BattleAttackDamageDispositionHole
  | BattleHideousLaughterRepeatSavingThrowOutcomeHole;
type GlyphExplosiveRuneReleaseHole =
  | BattleGlyphExplosiveRuneSavingThrowOutcomeHole
  | GlyphExplosiveRuneDamageResolutionHole;

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
  readonly release: GlyphExplosiveRuneReleaseProfile;
};

export type GlyphExplosiveRuneReleaseProfile = {
  readonly kind: "glyphExplosiveRuneReleaseProfile";
  readonly area: {
    readonly kind: "sphere";
    readonly radiusFeet: MovementFeet;
    readonly origin: "glyph";
    readonly membership: "table_witnessed_area_membership";
  };
  readonly save: {
    readonly ability: "dex";
    readonly dc: GlyphWardingExplosiveRuneBranch["save"]["dc"];
    readonly successDamage: "half";
  };
  readonly damage: {
    readonly damageTypes: typeof GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES;
    readonly dice: {
      readonly baseDice: typeof GLYPH_EXPLOSIVE_RUNE_BASE_DAMAGE_DICE;
      readonly dieSize: typeof GLYPH_EXPLOSIVE_RUNE_DAMAGE_DIE_SIZE;
      readonly perSlotAboveBaseDice: 1;
      readonly baseLevel: typeof GLYPH_OF_WARDING_BASE_LEVEL;
    };
  };
};

export type GlyphExplosiveRuneDamageRollHole =
  BattleGlyphExplosiveRuneDamageRollHole;

export type CompletedGlyphInscriptionWitness = {
  readonly kind: "completedGlyphInscription";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly release: GlyphDurableOccurrenceExplosiveRuneRelease;
  readonly anchor: GlyphDurableOccurrenceAnchor;
  readonly coveredAreaId: BattleAreaId;
  readonly castLocationId: BattleTablePositionId;
};

export type GlyphTriggerOccurrenceWitness = {
  readonly kind: "tableWitnessedGlyphTriggerOccurrence";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
};

export type GlyphExplosiveRuneAreaMembership =
  | {
      readonly kind: "noCreaturesInArea";
      readonly affectedTargetIds: readonly [];
    }
  | {
      readonly kind: "creaturesInArea";
      readonly affectedTargetIds: readonly [CombatantId, ...CombatantId[]];
      readonly savingThrowOutcomes: readonly GlyphExplosiveRuneSavingThrowOutcomeFill[];
      readonly damageRoll?: Extract<BattleFill, { readonly kind: "rolledDice" }>;
      readonly spellDamageReductionRolls: readonly GlyphExplosiveRuneSpellDamageReductionRollFill[];
      readonly concentrationSavingThrows: readonly GlyphExplosiveRuneConcentrationSavingThrowFill[];
      readonly damageDispositions: readonly GlyphExplosiveRuneDamageDispositionFill[];
      readonly hideousLaughterDamageRepeatSaves: readonly GlyphExplosiveRuneHideousLaughterRepeatSaveFill[];
    };

export type GlyphExplosiveRuneReleaseWitness = {
  readonly kind: "tableWitnessedGlyphExplosiveRuneRelease";
  readonly triggerOccurrence: GlyphTriggerOccurrenceWitness;
  readonly coveredAreaId: BattleAreaId;
  readonly areaMembership: GlyphExplosiveRuneAreaMembership;
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
    }
  | {
      readonly tag: "unsupportedExplosiveRuneDamageType";
      readonly damageType: DamageType;
      readonly supportedDamageTypes: typeof GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES;
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
      readonly reason:
        | "castLocationMismatch"
        | "movementNotBeyondThreshold"
        | "releaseRequired";
    };
type GlyphEndWitnessValidationFailure =
  | "castLocationMismatch"
  | "movementNotBeyondThreshold"
  | "releaseRequired";

export type ReleaseGlyphExplosiveRuneResult =
  | {
      readonly tag: "released";
      readonly state: BattleState;
      readonly effect: GlyphDurableOccurrenceActiveEffect;
      readonly affectedTargetIds: readonly CombatantId[];
      readonly damageRollTotal: number;
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
      readonly reason: GlyphExplosiveRuneReleaseWitnessValidationFailure;
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
      readonly holes: readonly GlyphExplosiveRuneReleaseHole[];
    };

type GlyphExplosiveRuneReleaseWitnessValidationFailure =
  | "coveredAreaMismatch"
  | "duplicateAffectedTarget"
  | "affectedTargetNotFound"
  | "spellSaveDcUnavailable"
  | "storedReleaseDamageTypeUnsupported"
  | "savingThrowOutcomeMismatch"
  | "damageRollMismatch"
  | "spellDamageReductionMismatch"
  | "concentrationSavingThrowMismatch"
  | "damageDispositionMismatch"
  | "hideousLaughterDamageRepeatSaveMismatch";
type GlyphExplosiveRuneDamageLifecycle = {
  readonly damageRollTotal: number;
  readonly damageByTypeByTargetId: ReadonlyMap<
    CombatantId,
    ReadonlyMap<DamageType, number>
  >;
  readonly damageAmountByTargetId: ReadonlyMap<CombatantId, number>;
  readonly spellDamageReductionRollsByTargetId: ReadonlyMap<
    CombatantId,
    GlyphExplosiveRuneSpellDamageReductionRollFill
  >;
  readonly concentrationSavingThrowHoles: readonly BattleConcentrationSavingThrowHole[];
  readonly damageDispositionHoles: readonly BattleAttackDamageDispositionHole[];
  readonly hideousLaughterDamageRepeatSaveHoles: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
};
type GlyphExplosiveRuneDamageLifecycleCheck =
  | {
      readonly tag: "ok";
      readonly lifecycle: GlyphExplosiveRuneDamageLifecycle;
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly GlyphExplosiveRuneDamageResolutionHole[];
    }
  | {
      readonly tag: "invalid";
      readonly reason: GlyphExplosiveRuneReleaseWitnessValidationFailure;
    };
type GlyphExplosiveRuneSavingThrowCheck =
  | {
      readonly tag: "ok";
      readonly outcomes: GlyphExplosiveRuneSavingThrowOutcomes;
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleGlyphExplosiveRuneSavingThrowOutcomeHole[];
    }
  | {
      readonly tag: "invalid";
      readonly reason: GlyphExplosiveRuneReleaseWitnessValidationFailure;
    };

export function glyphDurableOccurrenceProfileForSpell(
  spell: SpellRecord,
): GlyphDurableOccurrenceProfile | null {
  const release = glyphExplosiveRuneReleaseProfileForSpell(spell);
  if (
    release === null ||
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
        release,
      };
}

export function glyphExplosiveRuneReleaseProfileForSpell(
  spell: SpellRecord,
): GlyphExplosiveRuneReleaseProfile | null {
  if (
    spell.kind !== "spell" ||
    spell.mechanics.family !== "glyph_warding" ||
    !glyphWardingMechanicsSupportsDurableOccurrence(spell.mechanics) ||
    !glyphWardingExplosiveRuneSupported(spell.mechanics.release.explosiveRune)
  ) {
    return null;
  }
  return {
    kind: "glyphExplosiveRuneReleaseProfile",
    area: {
      kind: "sphere",
      radiusFeet: movementFeet(
        spell.mechanics.release.explosiveRune.area.radiusFeet,
      ),
      origin: "glyph",
      membership: "table_witnessed_area_membership",
    },
    save: {
      ability: "dex",
      dc: spell.mechanics.release.explosiveRune.save.dc,
      successDamage: "half",
    },
    damage: {
      damageTypes: GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES,
      dice: {
        baseDice: GLYPH_EXPLOSIVE_RUNE_BASE_DAMAGE_DICE,
        dieSize: GLYPH_EXPLOSIVE_RUNE_DAMAGE_DIE_SIZE,
        perSlotAboveBaseDice: 1,
        baseLevel: GLYPH_OF_WARDING_BASE_LEVEL,
      },
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
  if (
    !glyphExplosiveRuneDamageTypeSupported(
      input.witness.release.damageType,
      input.profile.release,
    )
  ) {
    return {
      tag: "unsupportedExplosiveRuneDamageType",
      damageType: input.witness.release.damageType,
      supportedDamageTypes: input.profile.release.damage.damageTypes,
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
      release: input.witness.release,
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

export function glyphExplosiveRuneDamageRollHole(input: {
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
}): GlyphExplosiveRuneDamageRollHole {
  const expr = glyphExplosiveRuneDamageExpr(input.profile, input.effect);
  const protocolId = glyphExplosiveRuneDamageRollProtocolId(
    input.effect.sourceEffectId,
    expr,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Glyph explosive rune damage (${expr.dice}d${expr.dieSize})`,
    glyphExplosiveRune: {
      sourceCombatantId: input.effect.sourceCombatantId,
      sourceSpellId: input.effect.sourceSpellId,
      sourceEffectId: input.effect.sourceEffectId,
      damage: { expr },
    },
  };
}

export function glyphExplosiveRuneSavingThrowOutcomeHole(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly targetIds: readonly [CombatantId, ...CombatantId[]];
}): BattleGlyphExplosiveRuneSavingThrowOutcomeHole | null {
  const spellSaveDc = spellSaveDcForCaster(
    input.state,
    input.effect.sourceCombatantId,
  );
  if (spellSaveDc === null) {
    return null;
  }
  const protocolId = glyphExplosiveRuneSavingThrowOutcomeProtocolId(
    input.effect.sourceEffectId,
  );
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Glyph explosive rune Dexterity Saving Throw outcomes",
    glyphExplosiveRune: {
      sourceCombatantId: input.effect.sourceCombatantId,
      sourceSpellId: input.effect.sourceSpellId,
      sourceEffectId: input.effect.sourceEffectId,
      radiusFeet: GLYPH_EXPLOSIVE_RUNE_RADIUS_FEET,
    },
    ability: "dex",
    dc: { kind: "fixed", dc: spellSaveDc },
    targetIds: input.targetIds,
    targetRollModes: savingThrowRollModeProjections(input.state, "dex"),
    targetFlatBonuses: savingThrowFlatBonusProjections(input.state),
  };
}

export function releaseGlyphExplosiveRune(input: {
  readonly state: BattleState;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
}): ReleaseGlyphExplosiveRuneResult {
  const sourceEffectId = glyphExplosiveRuneReleaseSourceEffectId(input.witness);
  const refs = glyphOccurrenceRefs(input.state, sourceEffectId);
  if (refs.length === 0) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  if (refs.length > 1) {
    return {
      tag: "ambiguousOccurrence",
      state: input.state,
      sourceEffectId,
    };
  }
  const [ref] = refs;
  if (ref === undefined) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  const validation = glyphExplosiveRuneReleaseWitnessValidation({
    state: input.state,
    profile: input.profile,
    effect: ref.effect,
    witness: input.witness,
  });
  if (validation !== null) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: validation,
    };
  }
  const savingThrow = glyphExplosiveRuneSavingThrowCheck({
    state: input.state,
    effect: ref.effect,
    witness: input.witness,
  });
  if (savingThrow.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: savingThrow.reason,
    };
  }
  if (savingThrow.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: input.state,
      sourceEffectId,
      holes: savingThrow.holes,
    };
  }
  const lifecycle = glyphExplosiveRuneDamageLifecycleCheck({
    state: input.state,
    profile: input.profile,
    effect: ref.effect,
    witness: input.witness,
    savingThrowOutcomes: savingThrow.outcomes,
  });
  if (lifecycle.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: lifecycle.reason,
    };
  }
  if (lifecycle.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: input.state,
      sourceEffectId,
      holes: lifecycle.holes,
    };
  }
  const stateWithoutOccurrence = battleStateWithoutGlyphOccurrence(
    input.state,
    ref.effect.sourceEffectId,
  );
  const applied = applyGlyphExplosiveRuneDamage({
    state: stateWithoutOccurrence,
    effect: ref.effect,
    witness: input.witness,
    lifecycle: lifecycle.lifecycle,
  });
  if (applied.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: applied.reason,
    };
  }
  return {
    tag: "released",
    state: applied.state,
    effect: ref.effect,
    affectedTargetIds: affectedGlyphExplosiveRuneTargetIds(input.witness),
    damageRollTotal: applied.damageRollTotal,
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

function glyphWardingExplosiveRuneSupported(
  explosiveRune: GlyphWardingExplosiveRuneBranch,
): boolean {
  return (
    explosiveRune.kind === "explosive_rune" &&
    explosiveRune.area.kind === "sphere" &&
    explosiveRune.area.radiusFeet === GLYPH_EXPLOSIVE_RUNE_RADIUS_FEET &&
    explosiveRune.area.origin === "glyph" &&
    explosiveRune.save.ability === "dex" &&
    explosiveRune.save.dc.kind === "caster_spell_save_dc" &&
    explosiveRune.save.onSuccess.kind === "half_damage" &&
    explosiveRune.damage.damageType.kind === "hole" &&
    explosiveRune.damage.damageType.value.kind === "choice" &&
    sameStringSet(
      explosiveRune.damage.damageType.value.options,
      GLYPH_EXPLOSIVE_RUNE_DAMAGE_TYPES,
    ) &&
    explosiveRune.damage.amount.kind === "linear_per_level" &&
    explosiveRune.damage.amount.axis === "slot" &&
    explosiveRune.damage.amount.base.dice ===
      GLYPH_EXPLOSIVE_RUNE_BASE_DAMAGE_DICE &&
    explosiveRune.damage.amount.base.dieSize ===
      GLYPH_EXPLOSIVE_RUNE_DAMAGE_DIE_SIZE &&
    explosiveRune.damage.amount.perLevel.dice === 1 &&
    explosiveRune.damage.amount.startingAtLevel === GLYPH_OF_WARDING_BASE_LEVEL
  );
}

function glyphExplosiveRuneDamageTypeSupported(
  damageType: DamageType,
  profile: GlyphExplosiveRuneReleaseProfile,
): damageType is GlyphExplosiveRuneDamageType {
  return profile.damage.damageTypes.some(
    (candidate) => candidate === damageType,
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

function glyphExplosiveRuneReleaseWitnessValidation(input: {
  readonly state: BattleState;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
}): GlyphExplosiveRuneReleaseWitnessValidationFailure | null {
  if (input.witness.coveredAreaId !== input.effect.coveredAreaId) {
    return "coveredAreaMismatch";
  }
  if (
    !glyphExplosiveRuneDamageTypeSupported(
      input.effect.release.damageType,
      input.profile,
    )
  ) {
    return "storedReleaseDamageTypeUnsupported";
  }
  const affectedTargetIds = affectedGlyphExplosiveRuneTargetIds(input.witness);
  if (new Set(affectedTargetIds).size !== affectedTargetIds.length) {
    return "duplicateAffectedTarget";
  }
  if (
    affectedTargetIds.some(
      (targetId) => !input.state.combatants.has(targetId),
    )
  ) {
    return "affectedTargetNotFound";
  }
  if (input.witness.areaMembership.kind === "noCreaturesInArea") {
    return null;
  }
  const damageRollHole = glyphExplosiveRuneDamageRollHole({
    profile: input.profile,
    effect: input.effect,
  });
  const damageRoll = input.witness.areaMembership.damageRoll;
  if (damageRoll === undefined) {
    return null;
  }
  if (damageRoll.holeId !== damageRollHole.holeId) {
    return "damageRollMismatch";
  }
  return validateRolledDiceForDiceExpr(
    damageRoll.value,
    glyphExplosiveRuneDamageExpr(input.profile, input.effect),
  ) === null
    ? null
    : "damageRollMismatch";
}

function affectedGlyphExplosiveRuneTargetIds(
  witness: GlyphExplosiveRuneReleaseWitness,
): readonly CombatantId[] {
  return witness.areaMembership.affectedTargetIds;
}

function glyphExplosiveRuneReleaseSourceEffectId(
  witness: GlyphExplosiveRuneReleaseWitness,
): BattleSpellEffectOccurrenceId {
  return witness.triggerOccurrence.sourceEffectId;
}

function glyphExplosiveRuneSavingThrowCheck(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
}): GlyphExplosiveRuneSavingThrowCheck {
  const areaMembership = input.witness.areaMembership;
  if (areaMembership.kind === "noCreaturesInArea") {
    return { tag: "ok", outcomes: [] };
  }
  const saveHole = glyphExplosiveRuneSavingThrowOutcomeHole({
    state: input.state,
    effect: input.effect,
    targetIds: areaMembership.affectedTargetIds,
  });
  if (saveHole === null) {
    return { tag: "invalid", reason: "spellSaveDcUnavailable" };
  }
  if (
    hasUnexpectedOrDuplicateFills(areaMembership.savingThrowOutcomes, [saveHole])
  ) {
    return { tag: "invalid", reason: "savingThrowOutcomeMismatch" };
  }
  const matchingFills = fillsMatchingHoleIds(
    areaMembership.savingThrowOutcomes,
    [saveHole],
  );
  if (matchingFills.length === 0) {
    return { tag: "needsHoles", holes: [saveHole] };
  }
  if (matchingFills.length !== 1) {
    return { tag: "invalid", reason: "savingThrowOutcomeMismatch" };
  }
  const [fill] = matchingFills;
  if (
    fill === undefined ||
    !savingThrowOutcomesExactlyMatchTargets(
      fill.value.outcomes,
      areaMembership.affectedTargetIds,
    )
  ) {
    return { tag: "invalid", reason: "savingThrowOutcomeMismatch" };
  }
  if (
    glyphExplosiveRuneSavingThrowOutcomeD20Issue({
      state: input.state,
      hole: saveHole,
      outcomes: fill.value.outcomes,
    })
  ) {
    return { tag: "invalid", reason: "savingThrowOutcomeMismatch" };
  }
  return {
    tag: "ok",
    outcomes: effectiveD20TestNaturalOneRerollSavingThrowOutcomes(fill.value)
      .outcomes,
  };
}

function glyphExplosiveRuneSavingThrowOutcomeD20Issue(input: {
  readonly state: BattleState;
  readonly hole: BattleGlyphExplosiveRuneSavingThrowOutcomeHole;
  readonly outcomes: GlyphExplosiveRuneSavingThrowOutcomes;
}): boolean {
  return input.outcomes.some((outcome) => {
    const target = input.state.combatants.get(outcome.targetId);
    const rollMode = input.hole.targetRollModes.find(
      (projection) => projection.targetId === outcome.targetId,
    )?.rollMode;
    const originalNaturalD20 =
      outcome.naturalD20 === undefined ? undefined : Number(outcome.naturalD20);
    if (
      d20TestNaturalOneRerollOutcomeDecisionRequired({
        actor: target,
        rollMode,
        rolledD20s: outcome.rolledD20s,
        originalNaturalD20,
        decision: outcome.d20TestNaturalOneReroll,
        withoutRoll: outcome.withoutRoll,
      })
    ) {
      return true;
    }
    return (
      d20TestNaturalOneRerollOutcomeIssue({
        actor: target,
        rollMode,
        rolledD20s: outcome.rolledD20s,
        originalNaturalD20,
        decision: outcome.d20TestNaturalOneReroll,
        withoutRoll: outcome.withoutRoll,
        succeeded: outcome.succeeded,
      }) !== null
    );
  });
}

function savingThrowOutcomesExactlyMatchTargets(
  outcomes: GlyphExplosiveRuneSavingThrowOutcomes,
  targetIds: readonly CombatantId[],
): boolean {
  const outcomeTargetIds = outcomes.map((outcome) => outcome.targetId);
  return (
    outcomeTargetIds.length === targetIds.length &&
    new Set(outcomeTargetIds).size === outcomeTargetIds.length &&
    targetIds.every((targetId) => outcomeTargetIds.includes(targetId))
  );
}

function glyphExplosiveRuneDamageLifecycleCheck(input: {
  readonly state: BattleState;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
  readonly savingThrowOutcomes: GlyphExplosiveRuneSavingThrowOutcomes;
}): GlyphExplosiveRuneDamageLifecycleCheck {
  const areaMembership = input.witness.areaMembership;
  if (areaMembership.kind === "noCreaturesInArea") {
    return {
      tag: "ok",
      lifecycle: {
        damageRollTotal: 0,
        damageByTypeByTargetId: new Map(),
        damageAmountByTargetId: new Map(),
        spellDamageReductionRollsByTargetId: new Map(),
        concentrationSavingThrowHoles: [],
        damageDispositionHoles: [],
        hideousLaughterDamageRepeatSaveHoles: [],
      },
    };
  }
  const damageRollHole = glyphExplosiveRuneDamageRollHole({
    profile: input.profile,
    effect: input.effect,
  });
  if (areaMembership.damageRoll === undefined) {
    return { tag: "needsHoles", holes: [damageRollHole] };
  }
  const damageRollTotal = rolledDiceTotal(areaMembership.damageRoll.value);
  const damageByTypeByTargetId = glyphExplosiveRuneDamageByTypeByTargetId({
    state: input.state,
    effect: input.effect,
    witness: input.witness,
    damageRollTotal,
    savingThrowOutcomes: input.savingThrowOutcomes,
  });
  const spellDamageReductionHoles = glyphExplosiveRuneSpellDamageReductionHoles(
    {
      state: input.state,
      damageByTypeByTargetId,
    },
  );
  if (
    hasUnexpectedOrDuplicateFills(
      areaMembership.spellDamageReductionRolls,
      spellDamageReductionHoles,
    )
  ) {
    return { tag: "invalid", reason: "spellDamageReductionMismatch" };
  }
  const missingSpellDamageReductionHoles = spellDamageReductionHoles.filter(
    (hole) =>
      !areaMembership.spellDamageReductionRolls.some(
        (fill) => fill.holeId === hole.holeId,
      ),
  );
  if (missingSpellDamageReductionHoles.length > 0) {
    return { tag: "needsHoles", holes: missingSpellDamageReductionHoles };
  }
  const damageAmountByTargetId = new Map<CombatantId, number>();
  const damageLifecycleTargetByTargetId = new Map<
    CombatantId,
    BattleCreatureState
  >();
  const spellDamageReductionRollsByTargetId = new Map<
    CombatantId,
    GlyphExplosiveRuneSpellDamageReductionRollFill
  >();
  for (const [targetId, damageByType] of damageByTypeByTargetId) {
    const target = input.state.combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const spellDamageReductionRoll = spellDamageReductionRollForTarget(
      areaMembership.spellDamageReductionRolls,
      target,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return { tag: "invalid", reason: "spellDamageReductionMismatch" };
    }
    if (spellReduction.tag === "needsHoles") {
      return { tag: "invalid", reason: "spellDamageReductionMismatch" };
    }
    if (spellDamageReductionRoll !== undefined) {
      spellDamageReductionRollsByTargetId.set(
        targetId,
        spellDamageReductionRoll,
      );
    }
    damageLifecycleTargetByTargetId.set(targetId, spellReduction.target);
    damageAmountByTargetId.set(
      targetId,
      damageAmountByTypeAfterTargetAdjustments(
        spellReduction.target,
        spellReduction.damageByType,
      ),
    );
  }
  const concentrationSavingThrowHoles =
    areaMembership.affectedTargetIds.flatMap((targetId) => {
      const target = damageLifecycleTargetByTargetId.get(targetId);
      const damageAmount = damageAmountByTargetId.get(targetId);
      return target === undefined || damageAmount === undefined
        ? []
        : [
            ...damageLifecycleConcentrationSavingThrowHoles({
              state: input.state,
              target,
              damageAmount,
            }),
          ];
    });
  const invalidConcentrationCheck =
    areaMembership.affectedTargetIds
      .map((targetId) => {
        const target = damageLifecycleTargetByTargetId.get(targetId);
        const damageAmount = damageAmountByTargetId.get(targetId);
        if (target === undefined || damageAmount === undefined) {
          return { tag: "ok" as const, holes: [] };
        }
        const holes = damageLifecycleConcentrationSavingThrowHoles({
          state: input.state,
          target,
          damageAmount,
        });
        return damageLifecycleConcentrationSavingThrowFillCheck({
          state: input.state,
          target,
          damageAmount,
          fills: fillsMatchingHoleIds(
            areaMembership.concentrationSavingThrows,
            holes,
          ),
        });
      })
      .find((check) => check.tag === "invalid");
  if (invalidConcentrationCheck?.tag === "invalid") {
    return { tag: "invalid", reason: "concentrationSavingThrowMismatch" };
  }
  if (
    hasUnexpectedOrDuplicateFills(
      areaMembership.concentrationSavingThrows,
      concentrationSavingThrowHoles,
    )
  ) {
    return { tag: "invalid", reason: "concentrationSavingThrowMismatch" };
  }

  const damageDispositionHoles =
    areaMembership.affectedTargetIds.flatMap((targetId) => {
      const target = damageLifecycleTargetByTargetId.get(targetId);
      const damageAmount = damageAmountByTargetId.get(targetId);
      const hole =
        target === undefined || damageAmount === undefined
          ? null
          : zeroHitPointReplacementDispositionHole({
              damageSourceId: input.effect.sourceCombatantId,
              target,
              damageAmount,
            });
      return hole === null ? [] : [hole];
    });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: areaMembership.damageDispositions,
  });
  if (
    hasUnexpectedOrDuplicateFills(
      areaMembership.damageDispositions,
      damageDispositionHoles,
    ) ||
    damageDispositionValidation !== null
  ) {
    return { tag: "invalid", reason: "damageDispositionMismatch" };
  }

  const hideousLaughterDamageRepeatSaveHoles =
    areaMembership.affectedTargetIds.flatMap((targetId) => {
      const target = damageLifecycleTargetByTargetId.get(targetId);
      const damageAmount = damageAmountByTargetId.get(targetId);
      return target === undefined || damageAmount === undefined
        ? []
        : [
            ...damageLifecycleHideousLaughterDamageRepeatSaveHoles({
              state: input.state,
              target,
              damageAmount,
            }),
          ];
    });
  const invalidHideousLaughterRepeatSaveCheck =
    areaMembership.affectedTargetIds
      .map((targetId) => {
        const target = damageLifecycleTargetByTargetId.get(targetId);
        const damageAmount = damageAmountByTargetId.get(targetId);
        if (target === undefined || damageAmount === undefined) {
          return { tag: "ok" as const, holes: [] };
        }
        const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
          state: input.state,
          target,
          damageAmount,
        });
        return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
          state: input.state,
          target,
          damageAmount,
          fills: fillsMatchingHoleIds(
            areaMembership.hideousLaughterDamageRepeatSaves,
            holes,
          ),
        });
      })
      .find((check) => check.tag === "invalid");
  if (invalidHideousLaughterRepeatSaveCheck?.tag === "invalid") {
    return {
      tag: "invalid",
      reason: "hideousLaughterDamageRepeatSaveMismatch",
    };
  }
  if (
    hasUnexpectedOrDuplicateFills(
      areaMembership.hideousLaughterDamageRepeatSaves,
      hideousLaughterDamageRepeatSaveHoles,
    )
  ) {
    return {
      tag: "invalid",
      reason: "hideousLaughterDamageRepeatSaveMismatch",
    };
  }

  const missingHoles: GlyphExplosiveRuneDamageResolutionHole[] = [
    ...concentrationSavingThrowHoles.filter(
      (hole) =>
        !areaMembership.concentrationSavingThrows.some(
          (fill) => fill.holeId === hole.holeId,
        ),
    ),
    ...damageDispositionHoles.filter(
      (hole) =>
        damageDispositionFillFor(
          areaMembership.damageDispositions,
          hole,
        ) === undefined,
    ),
    ...hideousLaughterDamageRepeatSaveHoles.filter(
      (hole) =>
        !areaMembership.hideousLaughterDamageRepeatSaves.some(
          (fill) => fill.holeId === hole.holeId,
        ),
    ),
  ];
  if (missingHoles.length > 0) {
    return { tag: "needsHoles", holes: missingHoles };
  }
  return {
    tag: "ok",
    lifecycle: {
      damageRollTotal,
      damageByTypeByTargetId,
      damageAmountByTargetId,
      spellDamageReductionRollsByTargetId,
      concentrationSavingThrowHoles,
      damageDispositionHoles,
      hideousLaughterDamageRepeatSaveHoles,
    },
  };
}

function glyphExplosiveRuneDamageByTypeByTargetId(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
  readonly damageRollTotal: number;
  readonly savingThrowOutcomes: GlyphExplosiveRuneSavingThrowOutcomes;
}): ReadonlyMap<CombatantId, ReadonlyMap<DamageType, number>> {
  if (input.witness.areaMembership.kind === "noCreaturesInArea") {
    return new Map();
  }
  return new Map(
    input.witness.areaMembership.affectedTargetIds.flatMap((targetId) => {
      const target = input.state.combatants.get(targetId);
      const savingThrowOutcome = input.savingThrowOutcomes.find(
        (outcome) => outcome.targetId === targetId,
      );
      if (target === undefined || savingThrowOutcome === undefined) {
        return [];
      }
      const saveDamageResult = savingThrowOutcome.succeeded ? "half" : "full";
      const damageByType = addDamageAmountForType(
        new Map(),
        input.effect.release.damageType,
        applySaveDamageResult(input.damageRollTotal, saveDamageResult),
      );
      return [[targetId, damageByType]];
    }),
  );
}

function glyphExplosiveRuneSpellDamageReductionHoles(input: {
  readonly state: BattleState;
  readonly damageByTypeByTargetId: ReadonlyMap<
    CombatantId,
    ReadonlyMap<DamageType, number>
  >;
}): readonly BattleSpellDamageReductionRollHole[] {
  return [...input.damageByTypeByTargetId].flatMap(
    ([targetId, damageByType]) => {
      const target = input.state.combatants.get(targetId);
      if (target === undefined) {
        return [];
      }
      const reduction = availableSpellDamageReduction(target, damageByType);
      return reduction === null ? [] : [spellDamageReductionRollHole(reduction)];
    },
  );
}

function hasUnexpectedOrDuplicateFills(
  fills: readonly { readonly holeId: unknown }[],
  holes: readonly { readonly holeId: unknown }[],
): boolean {
  const holeIds = new Set(holes.map((hole) => String(hole.holeId)));
  const seen = new Set<string>();
  return fills.some((fill) => {
    const fillHoleId = String(fill.holeId);
    if (!holeIds.has(fillHoleId) || seen.has(fillHoleId)) {
      return true;
    }
    seen.add(fillHoleId);
    return false;
  });
}

function concentrationSavingThrowFillForDamagedTarget(
  fills: readonly GlyphExplosiveRuneConcentrationSavingThrowFill[],
  holes: readonly BattleConcentrationSavingThrowHole[],
  targetId: CombatantId,
): GlyphExplosiveRuneConcentrationSavingThrowFill | undefined {
  return fills.find((fill) => {
    const hole = holes.find((candidate) => candidate.holeId === fill.holeId);
    return hole?.combatantId === targetId;
  });
}

function applyGlyphExplosiveRuneDamage(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
  readonly lifecycle: GlyphExplosiveRuneDamageLifecycle;
}):
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly damageRollTotal: number;
    }
  | {
      readonly tag: "invalid";
      readonly reason: Extract<
        GlyphExplosiveRuneReleaseWitnessValidationFailure,
        "spellDamageReductionMismatch"
      >;
    } {
  const areaMembership = input.witness.areaMembership;
  if (areaMembership.kind === "noCreaturesInArea") {
    return {
      tag: "ok",
      state: input.state,
      damageRollTotal: input.lifecycle.damageRollTotal,
    };
  }
  let state = input.state;
  for (const targetId of areaMembership.affectedTargetIds) {
    const target = state.combatants.get(targetId);
    const damageByType = input.lifecycle.damageByTypeByTargetId.get(targetId);
    if (target === undefined || damageByType === undefined) {
      continue;
    }
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      input.lifecycle.spellDamageReductionRollsByTargetId.get(targetId),
    );
    if (spellReduction.tag !== "ok") {
      return { tag: "invalid", reason: "spellDamageReductionMismatch" };
    }
    const damageAmount = damageAmountByTypeAfterTargetAdjustments(
      spellReduction.target,
      spellReduction.damageByType,
    );
    if (damageAmount <= 0) {
      state = stateWithCombatant(state, targetId, spellReduction.target);
      continue;
    }
    const concentrationHoles = damageLifecycleConcentrationSavingThrowHoles({
      state,
      target: spellReduction.target,
      damageAmount,
    });
    const concentrationFills = fillsMatchingHoleIds(
      areaMembership.concentrationSavingThrows,
      concentrationHoles,
    );
    const hideousLaughterRepeatSaveHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state,
        target: spellReduction.target,
        damageAmount,
      });
    const hideousLaughterRepeatSaveFills = fillsMatchingHoleIds(
      areaMembership.hideousLaughterDamageRepeatSaves,
      hideousLaughterRepeatSaveHoles,
    );
    state = applyBattleHitPointDamage({
      state,
      target: spellReduction.target,
      damageAmount,
      deathFailuresAtZeroHp: 1,
      damageDisposition: damageDispositionForTarget(
        input.lifecycle.damageDispositionHoles,
        areaMembership.damageDispositions,
        targetId,
      ),
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: concentrationSavingThrowFillForDamagedTarget(
        concentrationFills,
        concentrationHoles,
        targetId,
      ),
      wardingBondDamageShareConcentrationSavingThrows: concentrationFills,
      hideousLaughterDamageRepeatSaves: hideousLaughterRepeatSaveFills,
    });
  }
  return { tag: "ok", state, damageRollTotal: input.lifecycle.damageRollTotal };
}

function stateWithCombatant(
  state: BattleState,
  combatantId: CombatantId,
  combatant: BattleCreatureState,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, combatant),
  };
}

function glyphExplosiveRuneDamageExpr(
  profile: GlyphExplosiveRuneReleaseProfile,
  effect: GlyphDurableOccurrenceActiveEffect,
): DiceExpr {
  return {
    dice:
      profile.damage.dice.baseDice +
      Math.max(
        0,
        Number(effect.sourceSpellLevel) -
          Number(profile.damage.dice.baseLevel),
      ) *
        profile.damage.dice.perSlotAboveBaseDice,
    dieSize: profile.damage.dice.dieSize,
  };
}

function glyphExplosiveRuneDamageRollProtocolId(
  sourceEffectId: BattleSpellEffectOccurrenceId,
  expr: DiceExpr,
): string {
  return `battle:glyph-explosive-rune:damage:${sourceEffectId}:${expr.dice}d${expr.dieSize}`;
}

function glyphExplosiveRuneSavingThrowOutcomeProtocolId(
  sourceEffectId: BattleSpellEffectOccurrenceId,
): string {
  return `battle:glyph-explosive-rune:saving-throw-outcome:${sourceEffectId}`;
}

function glyphEndWitnessValidation(
  effect: GlyphDurableOccurrenceActiveEffect,
  witness: GlyphDurableOccurrenceEndWitness,
): GlyphEndWitnessValidationFailure | null {
  if (witness.kind === "tableWitnessedGlyphTriggerOccurrence") {
    return effect.release.kind === "explosiveRune" ? "releaseRequired" : null;
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
