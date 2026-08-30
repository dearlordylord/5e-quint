// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
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
//     Damage Type, Area of Effect, Concentration, and table-owned spatial facts.

import { optionalProperty } from "../optional-property.ts";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
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
  GlyphWardingSpellGlyphBranch,
  GlyphWardingTrigger,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Result, Match } from "effect";
import {
  DURABLE_GLYPH_BASE_SPELL_LEVEL,
  GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS,
  GLYPH_STORED_SPELL_TARGET_SHAPES,
  type GlyphStoredSpellReleaseProfile,
  type GlyphStoredSpellReleaseWitness,
  type GlyphStoredSpellSingleCreatureRetargetingWitness,
  type GlyphTriggerOccurrenceWitness,
} from "../glyph-durable-occurrence-execution-types.ts";
export type {
  GlyphStoredSpellAreaCenteringWitness,
  GlyphStoredSpellHostilePlacementWitness,
  GlyphStoredSpellReleaseProfile,
  GlyphStoredSpellReleaseTargetingWitness,
  GlyphStoredSpellReleaseWitness,
  GlyphStoredSpellSingleCreatureRetargetingWitness,
  GlyphTriggerOccurrenceWitness,
} from "../glyph-durable-occurrence-execution-types.ts";
import {
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
  type GlyphStoredConcentrationSingleCreatureActiveEffectInvocation,
  type GlyphStoredConcentrationSelfTransformationInvocation,
} from "../glyph-stored-spell-invocation.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleGlyphExplosiveRuneDamageRollHole,
  BattleGlyphExplosiveRuneSavingThrowOutcomeHole,
  BattleHole,
  BattleResolutionCheckpointBoundary,
  BattleSaveGatedConditionRepeatSavingThrowOutcomeHole,
  BattleSpellDamageReductionRollHole,
  BattleSpellTargetListSpatialFact,
  BattleState,
  GlyphDurableOccurrenceActiveEffect,
  GlyphDurableOccurrenceAnchor,
  GlyphStoredSpellInvocation,
  GlyphStoredSpellInvocationCandidate,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import type { BattleEffectOccurrenceIdentity } from "../active-effect/types.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../effect-execution-ref.ts";
import { isTargetListSpellInvocation } from "./spells-invocation-guards.ts";
import {
  resolveStoredGlyphSpellProcedure,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import type { StoredGlyphSpellReleasePlan } from "./spell-procedure-profiles/resolution-contract.ts";
import {
  bindStoredSpellProcedureExecutionFacts,
  characterStoredExecutionProcedureRef,
} from "../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../character-execution.ts";
import { glyphStoredSpellRelease } from "../procedure-execution/glyph-stored-spell.ts";
import type {
  BattleAreaId,
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "./spells-effective-level.ts";
import {
  applyBattleHitPointDamage,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import {
  battleDamageTargets,
  type BattleDamageTarget,
} from "./damage-target-projection.ts";
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
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import {
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { sameStringSet } from "./spells-execution-facts.ts";
import { spellTargetHole, spellTargetListHole } from "./spells-holes-fills.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  d20TestNaturalOneRerollOutcomeDecisionRequired,
  d20TestNaturalOneRerollOutcomeIssue,
  effectiveD20TestNaturalOneRerollSavingThrowOutcomes,
} from "./d20-test-natural-one-reroll.ts";

const DURABLE_GLYPH_INSCRIPTION_HOURS = 1;
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
type GlyphStoredSpellHostilePlacementSubject =
  (typeof GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS)[number];
type GlyphStoredSpellRuntimeHostilePlacementSubject = Extract<
  GlyphStoredSpellHostilePlacementSubject,
  "harmful_objects" | "traps"
>;
type GlyphStoredSpellTargetShape =
  (typeof GLYPH_STORED_SPELL_TARGET_SHAPES)[number];
type GlyphDurableOccurrenceStoredSpellRelease = Extract<
  GlyphDurableOccurrenceActiveEffect["release"],
  { readonly kind: "spellGlyph" }
>;
type GlyphStoredSpellProcedure =
  GlyphDurableOccurrenceStoredSpellRelease["storedProcedure"];
type GlyphStoredSpellProcedureCandidate =
  SpellProcedureExecution<GlyphStoredSpellInvocationCandidate>;
type GlyphStoredSpellFacts =
  | GlyphStoredSpellInvocation
  | GlyphStoredSpellProcedure;
type GlyphStoredSpellCandidateFacts =
  | GlyphStoredSpellInvocationCandidate
  | GlyphStoredSpellProcedureCandidate
  | GlyphStoredSpellFacts;
type GlyphDurableOccurrenceStoredSpellReleaseCandidate = {
  readonly kind: "spellGlyph";
  readonly storedInvocation: GlyphStoredSpellInvocationCandidate;
};
type GlyphDurableOccurrenceCompletedInscriptionRelease =
  | Extract<
      GlyphDurableOccurrenceActiveEffect["release"],
      { readonly kind: "explosiveRune" }
    >
  | GlyphDurableOccurrenceStoredSpellReleaseCandidate;
type GlyphStoredSpellOccurrenceActiveEffect =
  StoredGlyphDurableOccurrenceEffect & {
    readonly release: GlyphDurableOccurrenceStoredSpellRelease;
  };
type GlyphExplosiveRuneConcentrationSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;

function glyphStoredSpellTargetShapeForExecutionKind(
  executionKind: GlyphDurableOccurrenceStoredSpellRelease["executionKind"],
): GlyphStoredSpellTargetShape {
  return Match.value(executionKind).pipe(
    Match.when("areaOngoing", () => "area" as const),
    Match.when("areaControl", () => "area" as const),
    Match.when("persistentAreaSaveCondition", () => "area" as const),
    Match.when("ordinaryArea", () => "area" as const),
    Match.when("saveGatedCondition", () => "singleCreature" as const),
    Match.when("fullDurationSaveGatedDamage", () => "singleCreature" as const),
    Match.when("ordinaryTriggeringCreature", () => "singleCreature" as const),
    Match.when("singleCreatureActiveEffect", () => "singleCreature" as const),
    Match.when("selfTransformation", () => "singleCreature" as const),
    Match.exhaustive,
  );
}
type GlyphExplosiveRuneDamageDispositionFill = Extract<
  BattleFill,
  { readonly kind: "attackDamageDisposition" }
>;
type GlyphExplosiveRuneSaveGatedConditionWithRepeatRepeatSaveFill = Extract<
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
  | BattleSaveGatedConditionRepeatSavingThrowOutcomeHole;
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
  readonly release: {
    readonly explosiveRune: GlyphExplosiveRuneReleaseProfile;
    readonly spellGlyph: GlyphStoredSpellReleaseProfile;
  };
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
      readonly baseLevel: typeof DURABLE_GLYPH_BASE_SPELL_LEVEL;
    };
  };
};

export type GlyphExplosiveRuneDamageRollHole =
  BattleGlyphExplosiveRuneDamageRollHole;

export type CompletedGlyphInscriptionWitness = {
  readonly kind: "completedGlyphInscription";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly release: GlyphDurableOccurrenceCompletedInscriptionRelease;
  readonly anchor: GlyphDurableOccurrenceAnchor;
  readonly coveredAreaId: BattleAreaId;
  readonly castLocationId: BattleTablePositionId;
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
      readonly damageRoll?: Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >;
      readonly spellDamageReductionRolls: readonly GlyphExplosiveRuneSpellDamageReductionRollFill[];
      readonly concentrationSavingThrows: readonly GlyphExplosiveRuneConcentrationSavingThrowFill[];
      readonly damageDispositions: readonly GlyphExplosiveRuneDamageDispositionFill[];
      readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly GlyphExplosiveRuneSaveGatedConditionWithRepeatRepeatSaveFill[];
    };

export type GlyphExplosiveRuneReleaseWitness = {
  readonly kind: "tableWitnessedGlyphExplosiveRuneRelease";
  readonly triggerOccurrence: GlyphTriggerOccurrenceWitness;
  readonly coveredAreaId: BattleAreaId;
  readonly areaMembership: GlyphExplosiveRuneAreaMembership;
};

export type GlyphMovementInvalidationWitness = {
  readonly kind: "tableWitnessedGlyphMovementInvalidation";
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly movedSubject: "inscribed_surface_or_object";
  readonly castLocationId: BattleTablePositionId;
  readonly distanceFrom: "cast_location";
  readonly distanceFeet: MovementFeet;
};

export type GlyphDurableOccurrenceEndWitness =
  | GlyphTriggerOccurrenceWitness
  | GlyphMovementInvalidationWitness;

export type GlyphDurableOccurrenceTemplate = Omit<
  GlyphDurableOccurrenceActiveEffect,
  "effectRef"
> & { readonly effectRef?: never };
export type StoredGlyphDurableOccurrenceEffect =
  GlyphDurableOccurrenceActiveEffect & BattleEffectOccurrenceIdentity;

export type GlyphDurableOccurrenceEffectFromCompletedInscriptionResult =
  | {
      readonly tag: "created";
      readonly effect: GlyphDurableOccurrenceTemplate;
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
    }
  | {
      readonly tag: "storedSpellLevelAboveGlyphSlot";
      readonly storedSpellLevel: BattleSpellEffectLevel;
      readonly sourceSpellLevel: BattleSpellEffectLevel;
    }
  | {
      readonly tag: "storedSpellTargetShapeUnsupported";
      readonly storedInvocation: GlyphStoredSpellInvocationCandidate;
    }
  | {
      readonly tag: "storedSpellProcedureUnsupported";
      readonly storedInvocation: GlyphStoredSpellInvocationCandidate;
    }
  | {
      readonly tag: "storedSpellConcentrationFullDurationUnsupported";
      readonly storedInvocation: GlyphStoredSpellInvocationCandidate;
    };
type GlyphDurableOccurrenceReleaseValidationResult =
  | {
      readonly tag: "valid";
      readonly release: GlyphDurableOccurrenceActiveEffect["release"];
    }
  | Exclude<
      GlyphDurableOccurrenceEffectFromCompletedInscriptionResult,
      {
        readonly tag: "created" | "sourceSpellLevelBelowMinimum";
      }
    >;

export type AddGlyphDurableOccurrenceResult =
  | {
      readonly tag: "added";
      readonly state: BattleState;
      readonly effect: StoredGlyphDurableOccurrenceEffect;
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
        | "sourceEffectMismatch"
        | "castLocationMismatch"
        | "movementNotBeyondThreshold"
        | "releaseRequired";
    };
type GlyphEndWitnessValidationFailure =
  | "sourceEffectMismatch"
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
  | "sourceEffectMismatch"
  | "releaseBranchMismatch"
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
  | "saveGatedConditionWithRepeatDamageRepeatSaveMismatch";
type GlyphExplosiveRuneDamageLifecycle = {
  readonly damageRollTotal: number;
  readonly damageTargets: readonly {
    readonly targetId: CombatantId;
    readonly damageByType: ReadonlyMap<DamageType, number>;
    readonly spellDamageReductionRoll:
      | GlyphExplosiveRuneSpellDamageReductionRollFill
      | undefined;
  }[];
  readonly concentrationSavingThrowHoles: readonly BattleConcentrationSavingThrowHole[];
  readonly damageDispositionHoles: readonly BattleAttackDamageDispositionHole[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaveHoles: readonly BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[];
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

export type ReleaseGlyphStoredSpellResult =
  | {
      readonly tag: "released";
      readonly state: BattleState;
      readonly effect: GlyphDurableOccurrenceActiveEffect;
      readonly triggeringCreatureId: CombatantId;
      readonly storedProcedure: GlyphDurableOccurrenceStoredSpellRelease["storedProcedure"];
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
      readonly reason: GlyphStoredSpellReleaseWitnessValidationFailure;
      readonly message?: string;
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
      readonly holes: readonly BattleHole[];
      readonly checkpointBoundary?: BattleResolutionCheckpointBoundary;
    };

type GlyphStoredSpellReleaseWitnessValidationFailure =
  | "sourceEffectMismatch"
  | "storedReleaseBranchMismatch"
  | "triggeringCreatureNotFound"
  | "storedSpellTargetShapeMismatch"
  | "storedSpellProcedureUnsupported"
  | "storedSpellConcentrationFullDurationUnsupported"
  | "triggerCreatureTargetMismatch"
  | "areaCenterMismatch"
  | "hostilePlacementRequired"
  | "hostilePlacementNotApplicable"
  | "hostilePlacementSubjectMismatch"
  | "hostilePlacementTargetMismatch"
  | "hostilePlacementAreaMismatch"
  | "hostilePlacementPositionMismatch"
  | "hostilePlacementReachMismatch"
  | "storedSpellResolutionInvalid";

type GlyphWardingAdmissionSource = {
  readonly kind: "spell";
  readonly mechanics: SpellMechanics;
};

export function glyphDurableOccurrenceProfileForSpell(
  spell: GlyphWardingAdmissionSource,
): GlyphDurableOccurrenceProfile | null {
  const explosiveRune = glyphExplosiveRuneReleaseProfileForSpell(spell);
  const spellGlyph = glyphStoredSpellReleaseProfileForSpell(spell);
  if (
    explosiveRune === null ||
    spellGlyph === null ||
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
          castingHours: DURABLE_GLYPH_INSCRIPTION_HOURS,
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
        release: { explosiveRune, spellGlyph },
      };
}

export function glyphExplosiveRuneReleaseProfileForSpell(
  spell: GlyphWardingAdmissionSource,
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
        baseLevel: DURABLE_GLYPH_BASE_SPELL_LEVEL,
      },
    },
  };
}

export function glyphStoredSpellReleaseProfileForSpell(
  spell: GlyphWardingAdmissionSource,
): GlyphStoredSpellReleaseProfile | null {
  if (
    spell.kind !== "spell" ||
    spell.mechanics.family !== "glyph_warding" ||
    !glyphWardingMechanicsSupportsDurableOccurrence(spell.mechanics) ||
    !glyphWardingSpellGlyphSupported(spell.mechanics.release.spellGlyph)
  ) {
    return null;
  }
  return {
    kind: "glyphStoredSpellReleaseProfile",
    storage: {
      spellAccess: "prepared_spell",
      castAsPartOfCreatingGlyph: true,
      immediateEffect: "none",
      baseMaxStoredSpellLevel: DURABLE_GLYPH_BASE_SPELL_LEVEL,
      upcastMaxStoredSpellLevel: "same_as_cast_slot_level",
      targetShapes: GLYPH_STORED_SPELL_TARGET_SHAPES,
    },
    release: {
      when: "glyph_triggered",
      retargeting: {
        singleCreatureSpellTarget: "triggering_creature",
        areaSpellOrigin: "centered_on_triggering_creature",
      },
      hostilePlacement: {
        appliesTo: GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS,
        placement: "as_close_as_possible_to_triggering_creature",
        attackTarget: "triggering_creature",
      },
      concentration: {
        ifStoredSpellRequiresConcentration: "lasts_full_duration",
        owner: "duration",
      },
    },
  };
}

export function glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection(input: {
  readonly profile: GlyphDurableOccurrenceProfile;
  readonly witness: CompletedGlyphInscriptionWitness;
  readonly projectStoredInvocation: (
    invocation: GlyphStoredSpellInvocationCandidate,
  ) => SpellProcedureExecution | undefined;
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
  const releaseValidation =
    glyphDurableOccurrenceReleaseFromCompletedInscription({
      profile: input.profile,
      release: input.witness.release,
      sourceSpellLevel: input.witness.sourceSpellLevel,
      projectStoredInvocation: input.projectStoredInvocation,
    });
  if (releaseValidation.tag !== "valid") {
    return releaseValidation;
  }
  return {
    tag: "created",
    effect: {
      kind: "glyphDurableOccurrence",
      sourceProcedureRef: input.witness.sourceProcedureRef,
      sourceCombatantId: input.witness.sourceCombatantId,
      sourceEffectId: input.witness.sourceEffectId,
      sourceSpellLevel: input.witness.sourceSpellLevel,
      release: releaseValidation.release,
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
  readonly effect: StoredGlyphDurableOccurrenceEffect;
}): GlyphExplosiveRuneDamageRollHole {
  const expr = glyphExplosiveRuneDamageExpr(input.profile, input.effect);
  const protocolId = glyphExplosiveRuneDamageRollProtocolId(
    input.effect.effectRef,
    expr,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Glyph explosive rune damage (${expr.dice}d${expr.dieSize})`,
    glyphExplosiveRune: {
      sourceCombatantId: input.effect.sourceCombatantId,
      sourceProcedureRef: input.effect.sourceProcedureRef,
      effectRef: input.effect.effectRef,
      damage: { expr },
    },
  };
}

export function glyphExplosiveRuneSavingThrowOutcomeHole(input: {
  readonly state: BattleState;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
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
    input.effect.effectRef,
  );
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Glyph explosive rune Dexterity Saving Throw outcomes",
    glyphExplosiveRune: {
      sourceCombatantId: input.effect.sourceCombatantId,
      sourceProcedureRef: input.effect.sourceProcedureRef,
      effectRef: input.effect.effectRef,
      radiusFeet: GLYPH_EXPLOSIVE_RUNE_RADIUS_FEET,
    },
    ability: "dex",
    dc: { kind: "fixed", dc: spellSaveDc },
    targetIds: input.targetIds,
    targetRollModes: savingThrowRollModeProjections(input.state, "dex"),
    targetFlatBonuses: savingThrowFlatBonusProjections(input.state, "dex"),
  };
}

export function releaseGlyphExplosiveRune(input: {
  readonly state: BattleState;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
}): ReleaseGlyphExplosiveRuneResult {
  const sourceEffectId = glyphExplosiveRuneReleaseSourceEffectId(input.witness);
  const refs = glyphOccurrenceRefs(
    input.state,
    input.witness.triggerOccurrence.effectRef,
  );
  if (refs.length === 0) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore start -- @preserve -- Invalid runtime state: addGlyphDurableOccurrence enforces source-effect uniqueness, so an admitted BattleState cannot contain multiple matching Glyph occurrences. */
  if (refs.length > 1) {
    return {
      tag: "ambiguousOccurrence",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- refs has exactly one element after the zero- and multi-occurrence returns above, so typed array destructuring cannot produce undefined here. */
  const [ref] = refs;
  if (ref === undefined) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  const validation = glyphExplosiveRuneReleaseWitnessValidation({
    state: input.state,
    profile: input.profile,
    effect: ref.effect,
    witness: input.witness,
  });
  /* v8 ignore start -- @preserve -- Malformed release witness: trigger discovery binds the occurrence, branch, target geometry, and source identities that this defensive validator rejects. */
  if (validation !== null) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: validation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const savingThrow = glyphExplosiveRuneSavingThrowCheck({
    state: input.state,
    effect: ref.effect,
    witness: input.witness,
  });
  /* v8 ignore start -- @preserve -- Malformed saving-throw witness: the discovered Glyph holes fix target membership, outcome cardinality, and relationship facts before this release is called. */
  if (savingThrow.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: savingThrow.reason,
    };
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed damage-lifecycle witness: discovered reduction, concentration, and repeat-save holes are the only fills forwarded to this private check. */
  if (lifecycle.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: lifecycle.reason,
    };
  }
  /* v8 ignore stop -- @preserve */
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
    ref.effect.effectRef,
  );
  const applied = applyGlyphExplosiveRuneDamage({
    state: stateWithoutOccurrence,
    effect: ref.effect,
    witness: input.witness,
    lifecycle: lifecycle.lifecycle,
  });
  /* v8 ignore start -- @preserve -- Malformed release witness: validation above proves the explosive-rune target and damage facts consumed by the private apply step. */
  if (applied.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: applied.reason,
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "released",
    state: applied.state,
    effect: ref.effect,
    affectedTargetIds: affectedGlyphExplosiveRuneTargetIds(input.witness),
    damageRollTotal: applied.damageRollTotal,
  };
}

export function releaseGlyphStoredSpell(input: {
  readonly state: BattleState;
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly witness: GlyphStoredSpellReleaseWitness;
  readonly executionRegistry: SpellProcedureExecutionRegistry;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
}): ReleaseGlyphStoredSpellResult {
  const sourceEffectId = input.witness.triggerOccurrence.sourceEffectId;
  const refs = glyphOccurrenceRefs(
    input.state,
    input.witness.triggerOccurrence.effectRef,
  );
  if (refs.length === 0) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore start -- @preserve -- Invalid runtime state: addGlyphDurableOccurrence enforces source-effect uniqueness, so an admitted BattleState cannot contain multiple matching Glyph occurrences. */
  if (refs.length > 1) {
    return {
      tag: "ambiguousOccurrence",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- refs has exactly one element after the zero- and multi-occurrence returns above, so typed array destructuring cannot produce undefined here. */
  const [ref] = refs;
  if (ref === undefined) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  const validation = glyphStoredSpellReleaseWitnessValidation({
    state: input.state,
    profile: input.profile,
    effect: ref.effect,
    witness: input.witness,
  });
  /* v8 ignore start -- @preserve -- Malformed stored-spell witness: release discovery binds the occurrence, stored branch, triggering creature, and source identities rejected here. */
  if (validation !== null) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: validation,
    };
  }
  if (!isGlyphStoredSpellOccurrence(ref.effect)) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: "storedReleaseBranchMismatch",
    };
  }
  /* v8 ignore stop -- @preserve */
  const resolved = resolveStoredSpellGlyphRelease({
    state: input.state,
    profile: input.profile,
    effect: ref.effect,
    witness: input.witness,
    executionRegistry: input.executionRegistry,
    ...optionalProperty(
      "handledInterruptTrigger",
      input.handledInterruptTrigger,
    ),
  });
  if (resolved.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: resolved.state,
      sourceEffectId,
      holes: resolved.holes,
      ...optionalProperty("checkpointBoundary", resolved.checkpointBoundary),
    };
  }
  if (resolved.tag === "invalid") {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId,
      reason: "storedSpellResolutionInvalid",
      message: resolved.message,
    };
  }
  const concentrationProjected = stateWithGlyphStoredConcentrationFullDuration({
    beforeRelease: input.state,
    afterRelease: resolved.state,
    sourceCombatantId: ref.effect.sourceCombatantId,
    sourceProcedureRef: glyphStoredSpellProcedureRef(input.state, ref.effect),
    storedProcedure: ref.effect.release.storedProcedure,
  });
  const state = battleStateWithoutGlyphOccurrence(
    concentrationProjected,
    ref.effect.effectRef,
  );
  return {
    tag: "released",
    state,
    effect: ref.effect,
    triggeringCreatureId: input.witness.triggeringCreatureId,
    storedProcedure: ref.effect.release.storedProcedure,
  };
}

export function addGlyphDurableOccurrence(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceTemplate;
}): AddGlyphDurableOccurrenceResult {
  if (
    glyphOccurrenceRefsForSourceEffectId(
      input.state,
      input.effect.sourceEffectId,
    ).length > 0
  ) {
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
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: sourceCombatant,
  });
  const effect: StoredGlyphDurableOccurrenceEffect = {
    ...input.effect,
    effectRef: allocation.effectRef,
  };
  return {
    tag: "added",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.effect.sourceCombatantId,
        {
          ...allocation.owner,
          activeEffects: [...allocation.owner.activeEffects, effect],
        },
      ),
    },
    effect,
  };
}

export function endGlyphDurableOccurrence(input: {
  readonly state: BattleState;
  readonly witness: GlyphDurableOccurrenceEndWitness;
}): EndGlyphDurableOccurrenceResult {
  const refs = glyphOccurrenceRefs(input.state, input.witness.effectRef);
  if (refs.length === 0) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  /* v8 ignore start -- @preserve -- Invalid runtime state: addGlyphDurableOccurrence enforces source-effect uniqueness, so an admitted BattleState cannot contain multiple matching Glyph occurrences. */
  if (refs.length > 1) {
    return {
      tag: "ambiguousOccurrence",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- refs has exactly one element after the zero- and multi-occurrence returns above, so typed array destructuring cannot produce undefined here. */
  const [ref] = refs;
  if (ref === undefined) {
    return {
      tag: "notFound",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
    };
  }
  /* v8 ignore stop -- @preserve */
  const validation = glyphEndWitnessValidation(ref.effect, input.witness);
  /* v8 ignore start -- @preserve -- Malformed end witness: trigger discovery binds the occurrence identity and end-reason-specific movement or trigger facts checked here. */
  if (validation !== null) {
    return {
      tag: "invalidWitness",
      state: input.state,
      sourceEffectId: input.witness.sourceEffectId,
      reason: validation,
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ended",
    state: battleStateWithoutGlyphOccurrence(input.state, ref.effect.effectRef),
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
    mechanics.level === DURABLE_GLYPH_BASE_SPELL_LEVEL &&
    mechanics.castingTime.kind === "hours" &&
    mechanics.castingTime.amount === DURABLE_GLYPH_INSCRIPTION_HOURS &&
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
    occurrence.inscriptionAnchor.closeableObject.kind === "closeable_object" &&
    occurrence.inscriptionAnchor.closeableObject.inscriptionSite ===
      "within_object" &&
    occurrence.inscriptionAnchor.closeableObject.concealmentMethod ===
      "object_can_be_closed" &&
    occurrence.coverage.maxDiameterFeet === GLYPH_MAX_COVERED_DIAMETER_FEET &&
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
    explosiveRune.damage.amount.startingAtLevel ===
      DURABLE_GLYPH_BASE_SPELL_LEVEL
  );
}

function glyphWardingSpellGlyphSupported(
  spellGlyph: GlyphWardingSpellGlyphBranch,
): boolean {
  return (
    spellGlyph.kind === "spell_glyph" &&
    spellGlyph.storage.spellAccess === "prepared_spell" &&
    spellGlyph.storage.castAsPartOfCreatingGlyph === true &&
    spellGlyph.storage.immediateEffect === "none" &&
    spellGlyph.storage.maxStoredSpellLevel.baseMaxLevel ===
      DURABLE_GLYPH_BASE_SPELL_LEVEL &&
    spellGlyph.storage.maxStoredSpellLevel.upcastMaxLevel ===
      "same_as_cast_slot_level" &&
    spellGlyph.storage.targetShape.length === 2 &&
    spellGlyph.storage.targetShape[0]?.kind === "single_creature_target" &&
    spellGlyph.storage.targetShape[1]?.kind === "area_target" &&
    spellGlyph.release.when === "glyph_triggered" &&
    spellGlyph.release.retargeting.singleCreatureSpellTarget ===
      "triggering_creature" &&
    spellGlyph.release.retargeting.areaSpellOrigin ===
      "centered_on_triggering_creature" &&
    sameStringSet(
      spellGlyph.release.hostilePlacement.appliesTo,
      GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS,
    ) &&
    spellGlyph.release.hostilePlacement.placement ===
      "as_close_as_possible_to_triggering_creature" &&
    spellGlyph.release.hostilePlacement.attackTarget ===
      "triggering_creature" &&
    spellGlyph.release.concentration.ifStoredSpellRequiresConcentration ===
      "lasts_full_duration"
  );
}

function glyphDurableOccurrenceReleaseFromCompletedInscription(input: {
  readonly profile: GlyphDurableOccurrenceProfile;
  readonly release: GlyphDurableOccurrenceCompletedInscriptionRelease;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly projectStoredInvocation: (
    invocation: GlyphStoredSpellInvocationCandidate,
  ) => SpellProcedureExecution | undefined;
}): GlyphDurableOccurrenceReleaseValidationResult {
  if (input.release.kind === "explosiveRune") {
    return glyphExplosiveRuneDamageTypeSupported(
      input.release.damageType,
      input.profile.release.explosiveRune,
    )
      ? { tag: "valid", release: input.release }
      : {
          tag: "unsupportedExplosiveRuneDamageType",
          damageType: input.release.damageType,
          supportedDamageTypes:
            input.profile.release.explosiveRune.damage.damageTypes,
        };
  }
  const storedSpell = glyphStoredSpellInvocationValidation({
    profile: input.profile.release.spellGlyph,
    release: input.release,
    sourceSpellLevel: input.sourceSpellLevel,
  });
  if (storedSpell.tag !== "valid") return storedSpell;
  const projected = input.projectStoredInvocation(storedSpell.storedInvocation);
  const storedRelease =
    projected === undefined ? null : glyphStoredSpellRelease(projected);
  if (storedRelease === null) {
    return {
      tag:
        projected !== undefined &&
        "spellRuleFacts" in projected &&
        projected.spellRuleFacts.duration.kind === "concentration"
          ? "storedSpellConcentrationFullDurationUnsupported"
          : "storedSpellProcedureUnsupported",
      storedInvocation: storedSpell.storedInvocation,
    };
  }
  const targetShape = glyphStoredSpellTargetShapeForExecutionKind(
    storedRelease.executionKind,
  );
  return input.profile.release.spellGlyph.storage.targetShapes.includes(
    targetShape,
  )
    ? { tag: "valid", release: storedRelease }
    : {
        tag: "storedSpellTargetShapeUnsupported",
        storedInvocation: storedSpell.storedInvocation,
      };
}

type GlyphStoredSpellInvocationValidationResult =
  | {
      readonly tag: "valid";
      readonly storedInvocation: GlyphStoredSpellInvocationCandidate;
    }
  | Exclude<
      GlyphDurableOccurrenceReleaseValidationResult,
      {
        readonly tag: "valid" | "unsupportedExplosiveRuneDamageType";
      }
    >;

/* v8 ignore start -- @preserve -- Malformed stored-invocation validator: Glyph inscription admission fixes spell level, storage support, procedure support, and target shape; admitted storage projection remains measured. */
function glyphStoredSpellInvocationValidation(input: {
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly release: GlyphDurableOccurrenceStoredSpellReleaseCandidate;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
}): GlyphStoredSpellInvocationValidationResult {
  const storedInvocation = input.release.storedInvocation;
  const storedSpellLevel = parseBattleSpellEffectLevel(
    storedInvocation.spell.mechanics.level,
  );
  const storedSlotLevel = parseBattleSpellEffectLevel(
    Number(storedInvocation.resource.slotLevel),
  );
  if (
    storedSpellLevel === null ||
    storedSlotLevel === null ||
    Number(storedSpellLevel) > Number(input.sourceSpellLevel) ||
    Number(storedSlotLevel) > Number(input.sourceSpellLevel)
  ) {
    return {
      tag: "storedSpellLevelAboveGlyphSlot",
      storedSpellLevel: storedSpellLevel ?? input.sourceSpellLevel,
      sourceSpellLevel: input.sourceSpellLevel,
    };
  }
  return { tag: "valid", storedInvocation };
}
/* v8 ignore stop -- @preserve */

function glyphStoredSpellInvocationRequiresFullDurationOwner(
  invocation: GlyphStoredSpellCandidateFacts,
): boolean {
  return (
    ("spellRuleFacts" in invocation
      ? invocation.spellRuleFacts.duration.kind
      : "spell" in invocation
        ? invocation.spell.mechanics.duration.kind
        : null) === "concentration"
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

function glyphStoredSpellInvocationHasExactlyOneTargetListTarget(
  invocation: GlyphStoredSpellCandidateFacts,
): boolean {
  return (
    "targeting" in invocation &&
    invocation.targeting.kind === "targetList" &&
    invocation.targeting.minTargets === 1 &&
    invocation.targeting.maxTargets === 1
  );
}

function glyphStoredSpellInvocationTargetsSingleCreature(
  invocation: GlyphStoredSpellCandidateFacts,
): boolean {
  if (!("targeting" in invocation)) {
    return false;
  }
  return glyphStoredSpellInvocationHasExactlyOneTargetListTarget(invocation);
}

function isGlyphStoredSingleCreatureActiveEffectSpellInvocation(
  invocation: GlyphStoredSpellCandidateFacts,
): invocation is
  | GlyphStoredConcentrationSingleCreatureActiveEffectInvocation
  | SpellProcedureExecution<GlyphStoredConcentrationSingleCreatureActiveEffectInvocation> {
  return (
    GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES.some(
      (procedure) => procedure === invocation.procedure,
    ) &&
    glyphStoredSpellInvocationRequiresFullDurationOwner(invocation) &&
    glyphStoredSpellInvocationTargetsSingleCreature(invocation)
  );
}

function isGlyphStoredSelfTransformationModeSpellInvocation(
  invocation: GlyphStoredSpellCandidateFacts,
): invocation is
  | GlyphStoredConcentrationSelfTransformationInvocation
  | SpellProcedureExecution<GlyphStoredConcentrationSelfTransformationInvocation> {
  return (
    GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES.some(
      (procedure) => procedure === invocation.procedure,
    ) && glyphStoredSpellInvocationRequiresFullDurationOwner(invocation)
  );
}

function glyphStoredSpellInvocationHostilePlacementSubject(
  invocation: GlyphStoredSpellFacts,
): GlyphStoredSpellRuntimeHostilePlacementSubject | null {
  if (invocation.procedure === "persistentAreaSaveCondition") {
    return "traps";
  }
  if (invocation.procedure === "spatialMeleeSpellAttackProxy") {
    return "harmful_objects";
  }
  return null;
}

function isGlyphStoredSpatialMeleeSpellAttackProxyInvocation(
  invocation: GlyphStoredSpellFacts,
): invocation is Extract<
  GlyphStoredSpellFacts,
  { readonly procedure: "spatialMeleeSpellAttackProxy" }
> {
  return invocation.procedure === "spatialMeleeSpellAttackProxy";
}

function glyphReleaseWitnessMatchesStoredOccurrence(
  effect: GlyphDurableOccurrenceActiveEffect,
  witness: GlyphTriggerOccurrenceWitness,
): boolean {
  return witness.sourceEffectId === effect.sourceEffectId;
}

function glyphStoredSpellOccurrenceReleaseValidation(
  effect: GlyphDurableOccurrenceActiveEffect,
  witness: GlyphTriggerOccurrenceWitness,
): Result.Result<
  GlyphStoredSpellOccurrenceActiveEffect,
  GlyphStoredSpellReleaseWitnessValidationFailure
> {
  if (!glyphReleaseWitnessMatchesStoredOccurrence(effect, witness)) {
    return Result.fail("sourceEffectMismatch");
  }
  return isGlyphStoredSpellOccurrence(effect)
    ? Result.succeed(effect)
    : Result.fail("storedReleaseBranchMismatch");
}

type GlyphExplosiveRuneOccurrenceActiveEffect =
  StoredGlyphDurableOccurrenceEffect & {
    readonly release: Extract<
      GlyphDurableOccurrenceActiveEffect["release"],
      { readonly kind: "explosiveRune" }
    >;
  };

function isGlyphExplosiveRuneOccurrence(
  effect: StoredGlyphDurableOccurrenceEffect,
): effect is GlyphExplosiveRuneOccurrenceActiveEffect {
  return effect.release.kind === "explosiveRune";
}

function glyphExplosiveRuneOccurrenceReleaseValidation(
  effect: StoredGlyphDurableOccurrenceEffect,
  witness: GlyphTriggerOccurrenceWitness,
): Result.Result<
  GlyphExplosiveRuneOccurrenceActiveEffect,
  GlyphExplosiveRuneReleaseWitnessValidationFailure
> {
  if (!glyphReleaseWitnessMatchesStoredOccurrence(effect, witness)) {
    return Result.fail("sourceEffectMismatch");
  }
  return isGlyphExplosiveRuneOccurrence(effect)
    ? Result.succeed(effect)
    : Result.fail("releaseBranchMismatch");
}

/* v8 ignore start -- @preserve -- Malformed release-witness validator: Glyph release discovery binds occurrence branch, creature, target shape, placement, procedure, and area origin before execution. */
function glyphStoredSpellReleaseWitnessValidation(input: {
  readonly state: BattleState;
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphStoredSpellReleaseWitness;
}): GlyphStoredSpellReleaseWitnessValidationFailure | null {
  const occurrenceReleaseValidation =
    glyphStoredSpellOccurrenceReleaseValidation(
      input.effect,
      input.witness.triggerOccurrence,
    );
  if (Result.isFailure(occurrenceReleaseValidation)) {
    return occurrenceReleaseValidation.failure;
  }
  const effect = occurrenceReleaseValidation.success;
  if (!input.state.combatants.has(input.witness.triggeringCreatureId)) {
    return "triggeringCreatureNotFound";
  }
  const targetShape = glyphStoredSpellTargetShapeForExecutionKind(
    effect.release.executionKind,
  );
  if (
    targetShape === "singleCreature" &&
    input.witness.targeting.kind !== "storedSpellTargetsTriggeringCreature"
  ) {
    return "storedSpellTargetShapeMismatch";
  }
  if (
    targetShape === "area" &&
    input.witness.targeting.kind !==
      "storedSpellAreaCenteredOnTriggeringCreature"
  ) {
    return "storedSpellTargetShapeMismatch";
  }
  const procedureRef = glyphStoredSpellProcedureRef(input.state, effect);
  if (procedureRef === undefined) {
    return "storedSpellResolutionInvalid";
  }
  const hostilePlacementValidation = glyphStoredSpellHostilePlacementValidation(
    {
      profile: input.profile,
      invocation: effect.release.storedProcedure,
      sourceProcedureRef: procedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      witness: input.witness,
    },
  );
  if (hostilePlacementValidation !== null) {
    return hostilePlacementValidation;
  }
  if (input.witness.targeting.kind === "storedSpellTargetsTriggeringCreature") {
    return input.witness.targeting.targetId ===
      input.witness.triggeringCreatureId
      ? null
      : "triggerCreatureTargetMismatch";
  }
  if (
    input.witness.targeting.originAnchorId !==
    input.witness.triggeringCreatureId
  ) {
    return "areaCenterMismatch";
  }
  const areaSave = input.witness.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && "area" in fill.value,
  );
  if (
    areaSave !== undefined &&
    "area" in areaSave.value &&
    "originAnchorId" in areaSave.value.area &&
    areaSave.value.area.originAnchorId !== input.witness.triggeringCreatureId
  ) {
    return "areaCenterMismatch";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function isGlyphStoredSpellOccurrence(
  effect: GlyphDurableOccurrenceActiveEffect,
): effect is GlyphStoredSpellOccurrenceActiveEffect {
  return effect.release.kind === "spellGlyph";
}

/* v8 ignore start -- @preserve -- Malformed placement-witness validator: the stored procedure determines whether hostile placement applies and fixes its subject, target, area, and reachable position facts. */
function glyphStoredSpellHostilePlacementValidation(input: {
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly invocation: GlyphStoredSpellProcedure;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly witness: GlyphStoredSpellReleaseWitness;
}): GlyphStoredSpellReleaseWitnessValidationFailure | null {
  const expectedSubject = glyphStoredSpellInvocationHostilePlacementSubject(
    input.invocation,
  );
  const hostilePlacement = input.witness.hostilePlacement;
  if (expectedSubject === null) {
    return hostilePlacement.kind === "storedSpellHostilePlacementNotApplicable"
      ? null
      : "hostilePlacementNotApplicable";
  }
  if (hostilePlacement.kind !== "storedSpellHostilePlacement") {
    return "hostilePlacementRequired";
  }
  if (
    hostilePlacement.subject !== expectedSubject ||
    !input.profile.release.hostilePlacement.appliesTo.includes(
      hostilePlacement.subject,
    )
  ) {
    return "hostilePlacementSubjectMismatch";
  }
  if (hostilePlacement.attackTargetId !== input.witness.triggeringCreatureId) {
    return "hostilePlacementTargetMismatch";
  }
  if (hostilePlacement.subject === "harmful_objects") {
    if (
      !isGlyphStoredSpatialMeleeSpellAttackProxyInvocation(input.invocation)
    ) {
      return "hostilePlacementSubjectMismatch";
    }
    const invocation = input.invocation;
    if (
      input.witness.targeting.kind !== "storedSpellTargetsTriggeringCreature"
    ) {
      return "storedSpellTargetShapeMismatch";
    }
    const forcePosition = input.witness.fills.find(
      (
        fill,
      ): fill is Extract<
        BattleFill,
        { readonly kind: "spatialMeleeSpellAttackProxyPosition" }
      > => fill.kind === "spatialMeleeSpellAttackProxyPosition",
    );
    if (forcePosition === undefined) {
      return null;
    }
    if (forcePosition.value.positionId !== hostilePlacement.positionId) {
      return "hostilePlacementPositionMismatch";
    }
    const targetWithinPlacedForceReach =
      input.witness.targeting.targetSpatialFacts.some(
        (fact) =>
          fact.kind === "spatialMeleeSpellAttackProxyTargetWithinReach" &&
          fact.casterId === input.sourceCombatantId &&
          fact.targetId === input.witness.triggeringCreatureId &&
          fact.sourceProcedureRef === input.sourceProcedureRef &&
          fact.forcePositionId === hostilePlacement.positionId &&
          fact.reachFeet === invocation.forceReachFeet,
      );
    return targetWithinPlacedForceReach
      ? null
      : "hostilePlacementReachMismatch";
  }
  const areaSave = input.witness.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" &&
      "area" in fill.value &&
      "areaId" in fill.value.area,
  );
  if (
    areaSave !== undefined &&
    "area" in areaSave.value &&
    "areaId" in areaSave.value.area &&
    areaSave.value.area.areaId !== hostilePlacement.areaId
  ) {
    return "hostilePlacementAreaMismatch";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function resolveStoredSpellGlyphRelease(input: {
  readonly state: BattleState;
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly effect: GlyphStoredSpellOccurrenceActiveEffect;
  readonly witness: GlyphStoredSpellReleaseWitness;
  readonly executionRegistry: SpellProcedureExecutionRegistry;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
}): BattleResolutionResult {
  const procedureRef = glyphStoredSpellProcedureRef(input.state, input.effect);
  if (procedureRef === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The stored spell procedure is no longer bound to its source character.",
    );
  }
  const invocation = bindStoredSpellProcedureExecutionFacts(
    input.effect.release.storedProcedure,
    procedureRef,
  );
  const subject = {
    tag: "actionSpell" as const,
    actorId: input.effect.sourceCombatantId,
    procedureRef,
    mode: { tag: "cast" as const },
  };
  const fills = glyphStoredSpellReleaseFills(input);
  const fillSet = spellFillSet(
    fills,
    invocation,
    procedureRef,
    input.effect.sourceCombatantId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  const release = storedGlyphSpellReleasePlan(
    input.effect.release,
    procedureRef,
    input.witness.triggeringCreatureId,
  );
  return resolveStoredGlyphSpellProcedure(input.executionRegistry, {
    input: {
      state: input.state,
      subject,
      fills,
      ...optionalProperty(
        "handledInterruptTrigger",
        input.handledInterruptTrigger,
      ),
    },
    actorId: input.effect.sourceCombatantId,
    fillSet,
    release,
    replay: { profile: input.profile, witness: input.witness },
  });
}

function storedGlyphSpellReleasePlan(
  release: GlyphDurableOccurrenceStoredSpellRelease,
  procedureRef: BattleProcedureExecutionRef,
  triggeringCreatureId: CombatantId,
): StoredGlyphSpellReleasePlan {
  return Match.value(release).pipe(
    Match.when({ executionKind: "areaOngoing" }, (stored) => ({
      kind: "areaOngoing" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      anchorId: triggeringCreatureId,
    })),
    Match.when({ executionKind: "areaControl" }, (stored) => ({
      kind: "areaControl" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      anchorId: triggeringCreatureId,
    })),
    Match.when({ executionKind: "persistentAreaSaveCondition" }, (stored) => ({
      kind: "persistentAreaSaveCondition" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
    })),
    Match.when({ executionKind: "saveGatedCondition" }, (stored) => ({
      kind: "saveGatedCondition" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
    })),
    Match.when({ executionKind: "fullDurationSaveGatedDamage" }, (stored) => ({
      kind: "fullDurationSaveGatedDamage" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
    })),
    Match.when({ executionKind: "ordinaryArea" }, (stored) => ({
      kind: "ordinaryArea" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      anchorId: triggeringCreatureId,
    })),
    Match.when({ executionKind: "singleCreatureActiveEffect" }, (stored) => ({
      kind: "singleCreatureActiveEffect" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      targetId: triggeringCreatureId,
    })),
    Match.when({ executionKind: "selfTransformation" }, (stored) => ({
      kind: "selfTransformation" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      targetId: triggeringCreatureId,
    })),
    Match.when({ executionKind: "ordinaryTriggeringCreature" }, (stored) => ({
      kind: "ordinaryTriggeringCreature" as const,
      invocation: bindStoredSpellProcedureExecutionFacts(
        stored.storedProcedure,
        procedureRef,
      ),
      targetId: triggeringCreatureId,
    })),
    Match.exhaustive,
  );
}

function glyphStoredSpellProcedureRef(
  state: BattleState,
  effect: GlyphDurableOccurrenceActiveEffect,
) {
  if (effect.release.kind !== "spellGlyph") {
    return undefined;
  }
  const source = state.combatants.get(effect.sourceCombatantId);
  return source?.origin.kind === "character"
    ? characterStoredExecutionProcedureRef(
        source.origin.execution,
        effect.release.storedProcedure,
      )
    : undefined;
}

function glyphStoredSpellReleaseFills(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphStoredSpellReleaseWitness;
}): readonly BattleFill[] {
  if (!isGlyphStoredSpellOccurrence(input.effect)) {
    return input.witness.fills;
  }
  const procedureRef = glyphStoredSpellProcedureRef(input.state, input.effect);
  if (procedureRef === undefined) {
    return input.witness.fills;
  }
  const executableInvocation = bindStoredSpellProcedureExecutionFacts(
    input.effect.release.storedProcedure,
    procedureRef,
  );
  if (input.witness.targeting.kind === "storedSpellTargetsTriggeringCreature") {
    if (
      isGlyphStoredSelfTransformationModeSpellInvocation(
        input.effect.release.storedProcedure,
      )
    ) {
      return input.witness.fills;
    }
    if (
      glyphStoredSingleCreatureActiveEffectUsesTargetChoiceFill(
        input.effect.release.storedProcedure,
      )
    ) {
      return [
        {
          kind: "targetChoice",
          holeId: spellTargetHole(
            input.state,
            input.effect.sourceCombatantId,
            executableInvocation,
          ).holeId,
          value: input.witness.targeting.targetId,
          spatialFacts: input.witness.targeting.targetSpatialFacts,
        },
        ...input.witness.fills,
      ];
    }
    if (
      isTargetListSpellInvocation(input.effect.release.storedProcedure) &&
      input.effect.release.storedProcedure.targeting.kind === "targetList"
    ) {
      const targetListInvocation = bindStoredSpellProcedureExecutionFacts(
        input.effect.release.storedProcedure,
        procedureRef,
      );
      return [
        {
          kind: "spellTargetList",
          holeId: spellTargetListHole(
            input.state,
            input.effect.sourceCombatantId,
            targetListInvocation,
          ).holeId,
          value: { targetIds: [input.witness.targeting.targetId] },
          spatialFacts: glyphStoredSpellTargetListSpatialFacts({
            state: input.state,
            effect: input.effect,
            targeting: input.witness.targeting,
          }),
        },
        ...input.witness.fills,
      ];
    }
    const targetInvocation = bindStoredSpellProcedureExecutionFacts(
      input.effect.release.storedProcedure,
      procedureRef,
    );
    return [
      {
        kind: "targetChoice",
        holeId: spellTargetHole(
          input.state,
          input.effect.sourceCombatantId,
          targetInvocation,
        ).holeId,
        value: input.witness.targeting.targetId,
        spatialFacts: input.witness.targeting.targetSpatialFacts,
      },
      ...input.witness.fills,
    ];
  }
  return input.witness.fills;
}

function glyphStoredSingleCreatureActiveEffectUsesTargetChoiceFill(
  invocation: GlyphStoredSpellProcedure,
): boolean {
  return (
    isGlyphStoredSingleCreatureActiveEffectSpellInvocation(invocation) &&
    invocation.procedure !== "directCondition"
  );
}

function glyphStoredSpellTargetListSpatialFacts(input: {
  readonly state: BattleState;
  readonly effect: GlyphStoredSpellOccurrenceActiveEffect;
  readonly targeting: GlyphStoredSpellSingleCreatureRetargetingWitness;
}): readonly BattleSpellTargetListSpatialFact[] {
  const procedureRef = glyphStoredSpellProcedureRef(input.state, input.effect);
  return input.targeting.targetSpatialFacts.filter(
    (fact): fact is BattleSpellTargetListSpatialFact =>
      fact.kind === "spellTarget" &&
      fact.casterId === input.effect.sourceCombatantId &&
      fact.targetId === input.targeting.targetId &&
      fact.sourceProcedureRef === procedureRef,
  );
}

type GlyphStoredSpellFullDurationTicks = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "duration" }
>["durationTicks"];
type GlyphStoredSpellFullDurationEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "spellCondition"
      | "spellConditionRepeatSave"
      | "spellConditionEndTurnSave"
      | "spellConcentrationDuration"
      | "spatialMeleeSpellAttackProxy"
      | "persistentAreaTrait"
      | "magicalDarknessPointOrigin"
      | "persistentAreaSaveDamage"
      | "areaMovementDistanceDamage"
      | "persistentAreaSaveConditionEscape"
      | "directionalPersistentArea"
      | "saveGatedAreaControl"
      | "speedDelta"
      | "speedRatio"
      | "specialSpeedGrant"
      | "spellArmorClassBonus"
      | "spellArmorClassFloor"
      | "hitPointMaximumIncrease"
      | "d20RollModifier"
      | "abilityCheckRollMode"
      | "spellCreatureSizeChange"
      | "controlledVerticalSuspension"
      | "targetActionEndedSpellCondition"
      | "creatureTypeProtection"
      | "savingThrowRollMode"
      | "spellGrantedActionResource"
      | "spellEndTargetState"
      | "conditionImmunity"
      | "turnStartTemporaryHitPoints"
      | "selfTransformation";
  }
>;

function stateWithGlyphStoredConcentrationFullDuration(input: {
  readonly beforeRelease: BattleState;
  readonly afterRelease: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef | undefined;
  readonly storedProcedure: GlyphStoredSpellProcedure;
}): BattleState {
  const fullDurationTicks = glyphStoredSpellFullDurationTicks(
    input.storedProcedure,
  );
  if (fullDurationTicks === null) {
    return input.afterRelease;
  }
  const beforeReleaseActiveEffects = new Set(
    [...input.beforeRelease.combatants.values()].flatMap(
      (combatant) => combatant.activeEffects,
    ),
  );
  let stateChanged = false;
  const combatants = new Map(
    [...input.afterRelease.combatants].map(([combatantId, combatant]) => {
      let combatantChanged = false;
      const activeEffects = combatant.activeEffects.map((effect) => {
        const fullDurationEffect = glyphStoredConcentrationFullDurationEffect({
          effect,
          beforeReleaseActiveEffects,
          fullDurationTicks,
          sourceCombatantId: input.sourceCombatantId,
          sourceProcedureRef: input.sourceProcedureRef,
        });
        if (fullDurationEffect !== effect) {
          combatantChanged = true;
          stateChanged = true;
        }
        return fullDurationEffect;
      });
      return [
        combatantId,
        combatantChanged ? { ...combatant, activeEffects } : combatant,
      ] as const;
    }),
  );
  return stateChanged
    ? { ...input.afterRelease, combatants }
    : input.afterRelease;
}

function glyphStoredConcentrationFullDurationEffect(input: {
  readonly effect: BattleActiveEffect;
  readonly beforeReleaseActiveEffects: ReadonlySet<BattleActiveEffect>;
  readonly fullDurationTicks: GlyphStoredSpellFullDurationTicks;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef | undefined;
}): BattleActiveEffect {
  if (
    !glyphStoredSpellFullDurationEffectSupportsExpiration(input.effect) ||
    input.beforeReleaseActiveEffects.has(input.effect) ||
    input.effect.expiresAt.kind !== "concentration" ||
    input.effect.sourceCombatantId !== input.sourceCombatantId ||
    input.sourceProcedureRef === undefined ||
    input.effect.sourceProcedureRef !== input.sourceProcedureRef
  ) {
    return input.effect;
  }
  if (input.effect.kind === "persistentAreaSaveDamage") {
    return {
      ...input.effect,
      expiresAt: {
        kind: "duration",
        durationTicks: input.fullDurationTicks,
      },
    };
  }
  return {
    ...input.effect,
    expiresAt: { kind: "duration", durationTicks: input.fullDurationTicks },
  };
}

function glyphStoredSpellFullDurationEffectSupportsExpiration(
  effect: BattleActiveEffect,
): effect is GlyphStoredSpellFullDurationEffect {
  return (
    effect.kind === "spellCondition" ||
    effect.kind === "spellConditionRepeatSave" ||
    effect.kind === "spellConditionEndTurnSave" ||
    effect.kind === "spellConcentrationDuration" ||
    effect.kind === "spatialMeleeSpellAttackProxy" ||
    effect.kind === "persistentAreaTrait" ||
    effect.kind === "magicalDarknessPointOrigin" ||
    effect.kind === "persistentAreaSaveDamage" ||
    effect.kind === "areaMovementDistanceDamage" ||
    effect.kind === "persistentAreaSaveConditionEscape" ||
    effect.kind === "directionalPersistentArea" ||
    effect.kind === "saveGatedAreaControl" ||
    effect.kind === "speedDelta" ||
    effect.kind === "speedRatio" ||
    effect.kind === "specialSpeedGrant" ||
    effect.kind === "spellArmorClassBonus" ||
    effect.kind === "spellArmorClassFloor" ||
    effect.kind === "hitPointMaximumIncrease" ||
    effect.kind === "d20RollModifier" ||
    effect.kind === "abilityCheckRollMode" ||
    effect.kind === "spellCreatureSizeChange" ||
    effect.kind === "controlledVerticalSuspension" ||
    effect.kind === "targetActionEndedSpellCondition" ||
    effect.kind === "creatureTypeProtection" ||
    effect.kind === "savingThrowRollMode" ||
    effect.kind === "spellGrantedActionResource" ||
    effect.kind === "spellEndTargetState" ||
    effect.kind === "conditionImmunity" ||
    effect.kind === "turnStartTemporaryHitPoints" ||
    effect.kind === "selfTransformation"
  );
}

function glyphStoredSpellFullDurationTicks(
  procedure: GlyphStoredSpellProcedure,
): GlyphStoredSpellFullDurationTicks | null {
  const duration = procedure.spellRuleFacts.duration;
  if (duration.kind !== "concentration") {
    return null;
  }
  const ticks = elapsedTimeTicksFromTimeSpanDuration(duration.upTo);
  return Result.isSuccess(ticks) ? ticks.success : null;
}

function glyphOccurrenceRefs(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
): readonly {
  readonly combatantId: CombatantId;
  readonly combatant: BattleCreatureState;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
}[] {
  return [...state.combatants].flatMap(([combatantId, combatant]) =>
    combatant.activeEffects.flatMap((effect) =>
      isGlyphDurableOccurrence(effect) && effect.effectRef === effectRef
        ? [{ combatantId, combatant, effect }]
        : [],
    ),
  );
}

function glyphOccurrenceRefsForSourceEffectId(
  state: BattleState,
  sourceEffectId: BattleSpellEffectOccurrenceId,
): readonly {
  readonly combatantId: CombatantId;
  readonly combatant: BattleCreatureState;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
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
  effectRef: BattleEffectExecutionRef,
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        combatantWithoutGlyphOccurrence(combatant, effectRef),
      ]),
    ),
  };
}

function combatantWithoutGlyphOccurrence(
  combatant: BattleCreatureState,
  effectRef: BattleEffectExecutionRef,
): BattleCreatureState {
  const activeEffects = combatant.activeEffects.filter(
    (effect) =>
      !isGlyphDurableOccurrence(effect) || effect.effectRef !== effectRef,
  );
  return activeEffects.length === combatant.activeEffects.length
    ? combatant
    : { ...combatant, activeEffects };
}

/* v8 ignore start -- @preserve -- Malformed explosive-rune witness validator: trigger discovery fixes occurrence identity, covered area, affected targets, and save/damage lifecycle facts before release. */
function glyphExplosiveRuneReleaseWitnessValidation(input: {
  readonly state: BattleState;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
}): GlyphExplosiveRuneReleaseWitnessValidationFailure | null {
  const occurrenceReleaseValidation =
    glyphExplosiveRuneOccurrenceReleaseValidation(
      input.effect,
      input.witness.triggerOccurrence,
    );
  if (Result.isFailure(occurrenceReleaseValidation)) {
    return occurrenceReleaseValidation.failure;
  }
  const effect = occurrenceReleaseValidation.success;
  if (input.witness.coveredAreaId !== effect.coveredAreaId) {
    return "coveredAreaMismatch";
  }
  if (
    !glyphExplosiveRuneDamageTypeSupported(
      effect.release.damageType,
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
    affectedTargetIds.some((targetId) => !input.state.combatants.has(targetId))
  ) {
    return "affectedTargetNotFound";
  }
  if (input.witness.areaMembership.kind === "noCreaturesInArea") {
    return null;
  }
  const damageRollHole = glyphExplosiveRuneDamageRollHole({
    profile: input.profile,
    effect,
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
    glyphExplosiveRuneDamageExpr(input.profile, effect),
  ) === null
    ? null
    : "damageRollMismatch";
}
/* v8 ignore stop -- @preserve */

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
  readonly effect: StoredGlyphDurableOccurrenceEffect;
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
    hasUnexpectedOrDuplicateFills(areaMembership.savingThrowOutcomes, [
      saveHole,
    ])
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
    fill.relationshipFacts !== undefined ||
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
  readonly effect: StoredGlyphDurableOccurrenceEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
  readonly savingThrowOutcomes: GlyphExplosiveRuneSavingThrowOutcomes;
}): GlyphExplosiveRuneDamageLifecycleCheck {
  const areaMembership = input.witness.areaMembership;
  if (areaMembership.kind === "noCreaturesInArea") {
    return {
      tag: "ok",
      lifecycle: {
        damageRollTotal: 0,
        damageTargets: [],
        concentrationSavingThrowHoles: [],
        damageDispositionHoles: [],
        saveGatedConditionWithRepeatDamageRepeatSaveHoles: [],
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
  const damageTargets = glyphExplosiveRuneDamageTargets({
    state: input.state,
    effect: input.effect,
    witness: input.witness,
    damageRollTotal,
    savingThrowOutcomes: input.savingThrowOutcomes,
  });
  const spellDamageReductionHoles = glyphExplosiveRuneSpellDamageReductionHoles(
    {
      damageTargets,
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
  const damageLifecycleTargets: Array<
    BattleDamageTarget<{
      readonly damageByType: ReadonlyMap<DamageType, number>;
      readonly damageAmount: number;
      readonly spellDamageReductionRoll:
        | GlyphExplosiveRuneSpellDamageReductionRollFill
        | undefined;
    }>
  > = [];
  for (const { target, damage: damageByType } of damageTargets) {
    const spellDamageReductionRoll = spellDamageReductionRollForTarget(
      areaMembership.spellDamageReductionRolls,
      target,
      damageByType,
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
    damageLifecycleTargets.push({
      target: spellReduction.target,
      damage: {
        damageByType,
        damageAmount: damageAmountByTypeAfterTargetAdjustments(
          input.state,
          spellReduction.target,
          spellReduction.damageByType,
        ),
        spellDamageReductionRoll,
      },
    });
  }
  const concentrationSavingThrowHoles = damageLifecycleTargets.flatMap(
    ({ target, damage }) =>
      damageLifecycleConcentrationSavingThrowHoles({
        state: input.state,
        target,
        damageAmount: damage.damageAmount,
      }),
  );
  const invalidConcentrationCheck = damageLifecycleTargets
    .map(({ target, damage }) => {
      const holes = damageLifecycleConcentrationSavingThrowHoles({
        state: input.state,
        target,
        damageAmount: damage.damageAmount,
      });
      return damageLifecycleConcentrationSavingThrowFillCheck({
        state: input.state,
        target,
        damageAmount: damage.damageAmount,
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

  const damageDispositionHoles = damageLifecycleTargets.flatMap(
    ({ target, damage }) => {
      const hole = zeroHitPointReplacementDispositionHole({
        damageSourceId: input.effect.sourceCombatantId,
        target,
        damageAmount: damage.damageAmount,
      });
      return hole === null ? [] : [hole];
    },
  );
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

  const saveGatedConditionWithRepeatDamageRepeatSaveHoles =
    damageLifecycleTargets.flatMap(({ target, damage }) =>
      damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
        state: input.state,
        target,
        damageAmount: damage.damageAmount,
      }),
    );
  const invalidSaveGatedConditionWithRepeatRepeatSaveCheck =
    damageLifecycleTargets
      .map(({ target, damage }) => {
        const holes =
          damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
            state: input.state,
            target,
            damageAmount: damage.damageAmount,
          });
        return damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck(
          {
            state: input.state,
            target,
            damageAmount: damage.damageAmount,
            fills: fillsMatchingHoleIds(
              areaMembership.saveGatedConditionWithRepeatDamageRepeatSaves,
              holes,
            ),
          },
        );
      })
      .find((check) => check.tag === "invalid");
  if (invalidSaveGatedConditionWithRepeatRepeatSaveCheck?.tag === "invalid") {
    return {
      tag: "invalid",
      reason: "saveGatedConditionWithRepeatDamageRepeatSaveMismatch",
    };
  }
  if (
    hasUnexpectedOrDuplicateFills(
      areaMembership.saveGatedConditionWithRepeatDamageRepeatSaves,
      saveGatedConditionWithRepeatDamageRepeatSaveHoles,
    )
  ) {
    return {
      tag: "invalid",
      reason: "saveGatedConditionWithRepeatDamageRepeatSaveMismatch",
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
        damageDispositionFillFor(areaMembership.damageDispositions, hole) ===
        undefined,
    ),
    ...saveGatedConditionWithRepeatDamageRepeatSaveHoles.filter(
      (hole) =>
        !areaMembership.saveGatedConditionWithRepeatDamageRepeatSaves.some(
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
      damageTargets: damageLifecycleTargets.map(({ target, damage }) => ({
        targetId: target.combatantId,
        damageByType: damage.damageByType,
        spellDamageReductionRoll: damage.spellDamageReductionRoll,
      })),
      concentrationSavingThrowHoles,
      damageDispositionHoles,
      saveGatedConditionWithRepeatDamageRepeatSaveHoles,
    },
  };
}

function glyphExplosiveRuneDamageTargets(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceActiveEffect;
  readonly witness: GlyphExplosiveRuneReleaseWitness;
  readonly damageRollTotal: number;
  readonly savingThrowOutcomes: GlyphExplosiveRuneSavingThrowOutcomes;
}): readonly BattleDamageTarget<ReadonlyMap<DamageType, number>>[] {
  if (input.witness.areaMembership.kind === "noCreaturesInArea") {
    return [];
  }
  if (input.effect.release.kind !== "explosiveRune") {
    return [];
  }
  const release = input.effect.release;
  return battleDamageTargets({
    state: input.state,
    targetIds: input.witness.areaMembership.affectedTargetIds,
    damageForTarget: (target) =>
      input.savingThrowOutcomes.find(
        (outcome) => outcome.targetId === target.combatantId,
      ),
  }).flatMap(({ target, damage: savingThrowOutcome }) => {
    if (savingThrowOutcome === undefined) return [];
    const saveDamageResult = savingThrowOutcome.succeeded ? "half" : "full";
    const damageByType = addDamageAmountForType(
      new Map(),
      release.damageType,
      applySaveDamageResult(input.damageRollTotal, saveDamageResult),
    );
    return [{ target, damage: damageByType }];
  });
}

function glyphExplosiveRuneSpellDamageReductionHoles(input: {
  readonly damageTargets: readonly BattleDamageTarget<
    ReadonlyMap<DamageType, number>
  >[];
}): readonly BattleSpellDamageReductionRollHole[] {
  return input.damageTargets.flatMap(({ target, damage }) => {
    const reduction = availableSpellDamageReduction(target, damage);
    return reduction === null ? [] : [spellDamageReductionRollHole(reduction)];
  });
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
  for (const damageTarget of input.lifecycle.damageTargets) {
    const { targetId, damageByType, spellDamageReductionRoll } = damageTarget;
    const target = state.combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      spellDamageReductionRoll,
    );
    if (spellReduction.tag !== "ok") {
      return { tag: "invalid", reason: "spellDamageReductionMismatch" };
    }
    const damageAmount = damageAmountByTypeAfterTargetAdjustments(
      state,
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
    const saveGatedConditionWithRepeatRepeatSaveHoles =
      damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
        state,
        target: spellReduction.target,
        damageAmount,
      });
    const saveGatedConditionWithRepeatRepeatSaveFills = fillsMatchingHoleIds(
      areaMembership.saveGatedConditionWithRepeatDamageRepeatSaves,
      saveGatedConditionWithRepeatRepeatSaveHoles,
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
      linkedDefenseResistanceDamageShareConcentrationSavingThrows:
        concentrationFills,
      saveGatedConditionWithRepeatDamageRepeatSaves:
        saveGatedConditionWithRepeatRepeatSaveFills,
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
        Number(effect.sourceSpellLevel) - Number(profile.damage.dice.baseLevel),
      ) *
        profile.damage.dice.perSlotAboveBaseDice,
    dieSize: profile.damage.dice.dieSize,
  };
}

function glyphExplosiveRuneDamageRollProtocolId(
  effectRef: BattleEffectExecutionRef,
  expr: DiceExpr,
): string {
  return `battle:glyph-explosive-rune:damage:${effectRef}:${expr.dice}d${expr.dieSize}`;
}

function glyphExplosiveRuneSavingThrowOutcomeProtocolId(
  effectRef: BattleEffectExecutionRef,
): string {
  return `battle:glyph-explosive-rune:saving-throw-outcome:${effectRef}`;
}

function glyphEndWitnessValidation(
  effect: GlyphDurableOccurrenceActiveEffect,
  witness: GlyphDurableOccurrenceEndWitness,
): GlyphEndWitnessValidationFailure | null {
  if (witness.sourceEffectId !== effect.sourceEffectId) {
    return "sourceEffectMismatch";
  }
  if (witness.kind === "tableWitnessedGlyphTriggerOccurrence") {
    return "releaseRequired";
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
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "glyphDurableOccurrence" }
> {
  return effect.kind === "glyphDurableOccurrence";
}
