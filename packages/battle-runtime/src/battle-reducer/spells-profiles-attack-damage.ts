// Spell attack damage profile projections extracted from spells-profiles.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

import {
  attackBonus,
  movementDeltaFeet,
  movementFeet,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  isFixedDistancePointRange,
  type Attachment,
  type DamageType,
  type TargetSelection,
} from "@dnd/surface/surface/types";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";
import { Match } from "effect";
import {
  cantripSpellAccessForCastingSource,
  isCantripSpellAccess,
} from "../procedure-execution/spell-invocation-vocabulary.ts";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type BattleAttackKindForRedirect,
  type CantripSpellAttackSequenceTargeting,
  type DamageSpellSource,
  type PreparedDamageSpellSource,
  type PreparedSpellAttackSequenceTargeting,
  type SpellActivationPhase,
  type SpellAttackDamageTargeting,
  type SpellAttackHitEffect,
  type SpellAttackKind,
  type SpellObjectHitEffect,
  type SpellPostDamageRider,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleSpellcastingExecutionState } from "../character-battle-resource-execution.ts";
import {
  CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS,
  CHROMATIC_ORB_DAMAGE_TYPES,
  CHROMATIC_ORB_LEAP_RANGE_FEET,
  ELDRITCH_BLAST_BEAM_COUNT_TIERS,
  multiRaySpellAttackRayCount,
  type MultiBeamSpellAttackBeamCount,
  type MultiRaySpellAttackRayCount,
} from "./domain-constants.ts";
import {
  sameDiceExpr,
  sameStringSet,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  targetSelectionFromAttachment,
} from "./spells-execution-facts.ts";

export type SpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
>;
export type SpellAttackSequenceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackSequence" }
>;
export type AttackBurstSaveDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "attackBurstSaveDamage" }
>;

const SORCEROUS_BURST_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "psychic",
  "thunder",
] as const satisfies readonly DamageType[];
const SCORCHING_RAY_DAMAGE_TYPE = "fire" as const satisfies DamageType;
const SCORCHING_RAY_RANGE_FEET = 120;
const SCORCHING_RAY_ATTACK_KIND = "ranged_spell_attack" as const;
const SCORCHING_RAY_BASE_LEVEL = 2;
const SCORCHING_RAY_BASE_RAY_COUNT = 3;
const SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE = 1;
type ScorchingRayCountProgression = {
  readonly kind: "linear";
  readonly base: typeof SCORCHING_RAY_BASE_RAY_COUNT;
  readonly baseLevel: typeof SCORCHING_RAY_BASE_LEVEL;
  readonly perSlotAboveBase: typeof SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE;
};

export function supportedSpellAttackKind(
  attackKind: string,
): attackKind is SpellAttackKind {
  return (
    attackKind === "melee_spell_attack" || attackKind === "ranged_spell_attack"
  );
}

export function spellAttackKindForRedirect(
  attackKind: SpellAttackKind,
): BattleAttackKindForRedirect {
  return Match.value(attackKind).pipe(
    Match.when("melee_spell_attack", () => "melee" as const),
    Match.when("ranged_spell_attack", () => "ranged" as const),
    Match.exhaustive,
  );
}

export function supportedSpellPostDamageRiders(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
  effects: readonly SpellAttackHitEffect[],
): readonly SpellPostDamageRider[] | null {
  const riders: SpellPostDamageRider[] = [];
  for (const effect of effects) {
    if (effect.kind === "modify_speed") {
      if (effect.unit !== "feet" || effect.delta >= 0) {
        return null;
      }
      riders.push({
        kind: "speedDelta",
        deltaFeet: movementDeltaFeet(effect.delta),
      });
      continue;
    }
    if (
      effect.kind === "apply_condition" &&
      effect.condition === "poisoned" &&
      effect.duration === "end_of_caster_next_turn" &&
      isPoisonedConditionRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "condition",
        condition: effect.condition,
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "deny_opportunity_attack" &&
      isOpportunityAttackPreventionRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "opportunityAttackDenied",
        expiresAt: "startOfTargetNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "modify_roll_advantage" &&
      effect.mode === "advantage" &&
      sameStringSet(effect.on ?? [], ["attack_roll"]) &&
      isNextAttackAdvantageRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "nextAttackRollAgainstTarget",
        mode: "advantage",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "prevent_hit_point_regain" &&
      effect.expiresAt === "end_of_caster_next_turn" &&
      isHitPointRegainPreventionRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "hitPointRegainPrevented",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "emit_dim_light" &&
      effect.radiusFeet === 10 &&
      effect.expiresAt === "end_of_caster_next_turn" &&
      isDimLightEmissionRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "lightEmission",
        emission: {
          kind: "dim",
          radiusFeet: movementFeet(effect.radiusFeet),
        },
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "suppress_condition_benefit" &&
      effect.condition === "invisible" &&
      isInvisibleTargetBenefitDenialRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "invisibleBenefitDenied",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    return null;
  }
  return riders;
}

function supportedSpellAttackMissDamage(
  effect: SpellAttackHitEffect | undefined,
): SpellAttackDamageInvocation["missDamage"] | null {
  if (effect?.kind === "none") {
    return "none";
  }
  if (effect?.kind === "half_initial_damage_only") {
    return "halfInitialOnly";
  }
  return null;
}

function supportedSpellAttackLaterDamage(
  effects: readonly SpellAttackHitEffect[],
): {
  readonly laterDamageEffect:
    | (Extract<SpellAttackHitEffect, { readonly kind: "damage" }> & {
        readonly damageType: DamageType;
      })
    | null;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
} | null {
  const laterDamageEffects = effects.filter(
    (
      effect,
    ): effect is Extract<SpellAttackHitEffect, { readonly kind: "damage" }> & {
      readonly damageType: DamageType;
    } =>
      effect.kind === "damage" &&
      typeof effect.damageType === "string" &&
      effect.timing === "end_of_next_turn",
  );
  if (laterDamageEffects.length > 1) {
    return null;
  }
  const laterDamageEffect = laterDamageEffects[0] ?? null;
  return {
    laterDamageEffect,
    postDamageEffects:
      laterDamageEffect === null
        ? effects
        : effects.filter((effect) => effect !== laterDamageEffect),
  };
}

export function isInvisibleTargetBenefitDenialRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return isDimLightEmissionRiderShape(spell, phase);
}

export function isDimLightEmissionRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isHitPointRegainPreventionRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isPoisonedConditionRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isOpportunityAttackPreventionRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isNextAttackAdvantageRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function supportedPreparedSpellAttackSequenceProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SpellAttackSequenceInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  const countProgression =
    phase?.kind === "attack_roll"
      ? scorchingRayCountProgressionFromAttachment(phase.attachment)
      : null;
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== SCORCHING_RAY_BASE_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    range.kind !== "point" ||
    range.feet !== SCORCHING_RAY_RANGE_FEET ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== SCORCHING_RAY_ATTACK_KIND ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== SCORCHING_RAY_DAMAGE_TYPE ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none" ||
    countProgression === null
  ) {
    return [];
  }
  return spellSlots.flatMap(
    (slot): readonly SpellAttackSequenceInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const targeting = spellAttackSequenceSlotTargeting(
        countProgression,
        slot.spellLevel,
      );
      const damageExpr = supportedDamageAmountExpr({
        amount: damageEffect.amount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (targeting === null || damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: {
            tag: "spellSlot",
            slotLevel: slot.spellLevel,
          },
          procedure: "spellAttackSequence",
          spell,
          targeting,
          damage: {
            expr: damageExpr,
            damageType: SCORCHING_RAY_DAMAGE_TYPE,
          },
          rangeFeet: movementFeet(SCORCHING_RAY_RANGE_FEET),
          attackKind: SCORCHING_RAY_ATTACK_KIND,
          attackBonus: attackBonus(
            Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
          ),
        },
      ];
    },
  );
}

export function supportedPreparedChainedSpellAttackDamageProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    !isFixedDistancePointRange(range) ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const rangeFeet = movementFeet(range.feet);
  const phase = spell.mechanics.phases[0];
  const continuation = phase?.kind === "attack_roll" ? phase.continue : null;
  const leapPhase =
    continuation?.kind === "repeat" ? continuation.next[0] : undefined;
  const hitDamage = phase?.kind === "attack_roll" ? phase.onHit[0] : undefined;
  const leapHitDamage =
    leapPhase?.kind === "attack_roll" ? leapPhase.onHit[0] : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const leapTargeting =
    leapPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(leapPhase.attachment)
      : null;
  if (
    phase?.kind !== "attack_roll" ||
    leapPhase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    !supportedSpellAttackKind(leapPhase.attackKind) ||
    phase.attackKind !== leapPhase.attackKind ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    leapTargeting === null ||
    leapTargeting.kind !== "singleCombatant" ||
    phase.onHit.length !== 1 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none" ||
    leapPhase.onHit.length !== 1 ||
    leapPhase.onMiss.length !== 1 ||
    leapPhase.onMiss[0]?.kind !== "none" ||
    continuation?.kind !== "repeat" ||
    continuation.when.kind !== "damage_roll_has_duplicate_faces" ||
    continuation.when.minimumMultiplicity !== 2 ||
    continuation.next.length !== 1 ||
    !isBouncingAttackContinuationLimitSetShape(continuation.limits) ||
    hitDamage?.kind !== "damage" ||
    leapHitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "object" ||
    hitDamage.damageType.kind !== "hole" ||
    typeof hitDamage.damageType.value !== "object" ||
    hitDamage.damageType.value.kind !== "choice" ||
    !sameStringSet(hitDamage.damageType.value.options, [
      ...CHROMATIC_ORB_DAMAGE_TYPES,
    ]) ||
    typeof leapHitDamage.damageType !== "object" ||
    leapHitDamage.damageType.kind !== "same_choice_as" ||
    leapHitDamage.damageType.holeId !== hitDamage.damageType.holeId
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: hitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    const leapDamageExpr = supportedDamageAmountExpr({
      amount: leapHitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (
      damageExpr === null ||
      leapDamageExpr === null ||
      !sameDiceExpr(damageExpr, leapDamageExpr)
    ) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: {
          tag: "spellSlot",
          slotLevel: slot.spellLevel,
        },
        procedure: "chainedSpellAttackDamage",
        spell,
        targeting,
        damage: { expr: damageExpr },
        damageTypeChoices: CHROMATIC_ORB_DAMAGE_TYPES,
        rangeFeet,
        leapRangeFeet: CHROMATIC_ORB_LEAP_RANGE_FEET,
        attackKind: phase.attackKind,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function isBouncingAttackContinuationLimitSetShape(
  limits: readonly { readonly kind: string }[],
): boolean {
  return (
    limits.length === CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS.length &&
    CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS.every((requiredKind) =>
      limits.some((limit) => limit.kind === requiredKind),
    )
  );
}

export function supportedPreparedAttackBurstSaveDamageProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly AttackBurstSaveDamageInvocation[] {
  return spellSlots.flatMap(
    (slot): readonly AttackBurstSaveDamageInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return supportedAttackBurstSaveDamageProfile({
        spell,
        access: { tag: "prepared" },
        resource: {
          tag: "spellSlot",
          slotLevel: slot.spellLevel,
        },
        spellcastingAbilityModifier,
        proficiencyBonus,
        slotLevel: slot.spellLevel,
      });
    },
  );
}

export function supportedAttackBurstSaveDamageProfile(
  input: {
    readonly spell: BattleSpellAdmissionSource;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel: SpellSlotLevel;
  } & PreparedDamageSpellSource,
): readonly AttackBurstSaveDamageInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const [attackPhase, burstPhase] = spell.mechanics.phases;
  const targeting =
    attackPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(attackPhase.attachment)
      : null;
  const burstTargeting =
    burstPhase?.kind === "save_gate"
      ? primaryTargetOriginEmanationTargeting(burstPhase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : null;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 2 ||
    attackPhase?.kind !== "attack_roll" ||
    burstPhase?.kind !== "save_gate" ||
    !supportedSpellAttackKind(attackPhase.attackKind) ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    burstTargeting === null ||
    attackPhase.onHit.length !== 1 ||
    attackPhase.onMiss.length !== 1 ||
    attackPhase.onMiss[0]?.kind !== "none" ||
    burstPhase.ability !== "dex" ||
    burstPhase.dc.kind !== "caster_spell_save_dc" ||
    burstPhase.onSuccess.kind !== "none" ||
    burstPhase.onFail.kind !== "damage" ||
    typeof burstPhase.onFail.damageType !== "string"
  ) {
    return [];
  }
  const hitDamage = attackPhase.onHit[0];
  if (
    hitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "string"
  ) {
    return [];
  }
  const hitDamageExpr = supportedDamageAmountExpr({
    amount: hitDamage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  const burstDamageExpr = supportedDamageAmountExpr({
    amount: burstPhase.onFail.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  if (hitDamageExpr === null || burstDamageExpr === null) {
    return [];
  }

  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "attackBurstSaveDamage",
      spell,
      targeting,
      attackKind: attackPhase.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
      damage: {
        expr: hitDamageExpr,
        damageType: hitDamage.damageType,
      },
      burst: {
        ability: burstPhase.ability,
        dc: burstPhase.dc,
        targeting: burstTargeting,
        damage: {
          expr: burstDamageExpr,
          damageType: burstPhase.onFail.damageType,
        },
        successDamage: "none",
      },
      rangeFeet,
    },
  ];
}

export function supportedSpellAttackDamageProfile(
  input: {
    readonly spell: BattleSpellAdmissionSource;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SpellAttackDamageInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const rangeFeet = singleSpellAttackDamageRangeFeet(
    targeting,
    spell.mechanics.range,
  );
  if (
    (isCantripSpellAccess(input.access)
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    targeting === null ||
    phase.onHit.length < 1 ||
    phase.onMiss.length !== 1
  ) {
    return [];
  }
  const [damageEffect, ...postDamageEffects] = phase.onHit;
  if (damageEffect?.kind !== "damage") {
    return [];
  }
  const missDamage = supportedSpellAttackMissDamage(phase.onMiss[0]);
  if (missDamage === null) {
    return [];
  }
  const laterDamageProjection =
    supportedSpellAttackLaterDamage(postDamageEffects);
  if (laterDamageProjection === null) {
    return [];
  }
  const fixedDamageType =
    typeof damageEffect.damageType === "string"
      ? damageEffect.damageType
      : null;
  if (
    laterDamageProjection.laterDamageEffect !== null &&
    (fixedDamageType === null ||
      laterDamageProjection.laterDamageEffect.damageType !== fixedDamageType)
  ) {
    return [];
  }
  const sorcerousBurstProjection = supportedSorcerousBurstProjection(
    spell,
    damageEffect,
    input.spellcastingAbilityModifier,
  );
  const damageTypeProjection =
    sorcerousBurstProjection !== null
      ? { kind: "choice" as const, projection: sorcerousBurstProjection }
      : fixedDamageType !== null
        ? { kind: "fixed" as const, damageType: fixedDamageType }
        : null;
  if (damageTypeProjection === null) {
    return [];
  }
  const objectHitProjection = supportedSpellObjectHitEffect({
    spell,
    phase,
    targeting,
    damageEffect,
    postDamageEffects: laterDamageProjection.postDamageEffects,
  });
  const postDamageRiders = supportedSpellPostDamageRiders(
    spell,
    phase,
    objectHitProjection.postDamageEffects,
  );
  if (postDamageRiders === null) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (damageExpr == null) {
    return [];
  }
  const laterDamageExpr =
    laterDamageProjection.laterDamageEffect === null
      ? null
      : supportedDamageAmountExpr({
          amount: laterDamageProjection.laterDamageEffect.amount,
          spellLevel: spell.mechanics.level,
          slotLevel: input.slotLevel,
          characterLevel: input.characterLevel,
        });
  if (
    laterDamageProjection.laterDamageEffect !== null &&
    laterDamageExpr === null
  ) {
    return [];
  }
  const damage =
    damageTypeProjection.kind === "fixed"
      ? {
          kind: "fixedSpellAttackDamage" as const,
          expr: damageExpr,
          damageType: damageTypeProjection.damageType,
        }
      : {
          kind: "spellAttackDamageTypeChoice" as const,
          expr: damageExpr,
          damageTypeChoices: damageTypeProjection.projection.damageTypes,
          maxDieAdditionalDiceLimit:
            damageTypeProjection.projection.maxAdditionalDice,
        };
  const attackDamageInvocation = {
    procedure: "spellAttackDamage" as const,
    spell,
    targeting,
    damage,
    rangeFeet,
    attackKind: phase.attackKind,
    attackBonus: attackBonus(
      Number(input.spellcastingAbilityModifier) +
        Number(input.proficiencyBonus),
    ),
    missDamage,
    laterDamage:
      laterDamageExpr === null || fixedDamageType === null
        ? null
        : {
            expr: laterDamageExpr,
            damageType: fixedDamageType,
          },
    postDamageRiders,
    objectHitEffect: objectHitProjection.objectHitEffect,
  };

  if (isCantripSpellAccess(input.access) && input.resource.tag === "none") {
    return [
      {
        access: input.access,
        resource: { tag: "none" },
        ...attackDamageInvocation,
      } satisfies SpellAttackDamageInvocation,
    ];
  }
  if (input.access.tag !== "prepared" || input.resource.tag !== "spellSlot") {
    return [];
  }
  return [
    {
      access: { tag: "prepared" },
      resource: input.resource,
      ...attackDamageInvocation,
    } satisfies SpellAttackDamageInvocation,
  ];
}

function supportedSorcerousBurstProjection(
  spell: BattleSpellAdmissionSource,
  damageEffect: SpellAttackHitEffect,
  spellcastingAbilityModifier: AbilityModifier,
): {
  readonly damageTypes: readonly [DamageType, ...DamageType[]];
  readonly maxAdditionalDice: number;
} | null {
  if (
    damageEffect.kind !== "damage" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    typeof damageEffect.damageType !== "object" ||
    damageEffect.damageType.kind !== "hole" ||
    typeof damageEffect.damageType.value !== "object" ||
    damageEffect.damageType.value.kind !== "choice" ||
    !sameStringSet(damageEffect.damageType.value.options, [
      ...SORCEROUS_BURST_DAMAGE_TYPES,
    ]) ||
    damageEffect.amount.kind !== "threshold_tiers_exploding_max_die" ||
    damageEffect.amount.axis !== "character" ||
    damageEffect.amount.baseDice !== 1 ||
    damageEffect.amount.dieSize !== 8 ||
    damageEffect.amount.maxAdditionalDice !== "spellcasting_ability_modifier"
  ) {
    return null;
  }
  return {
    damageTypes: SORCEROUS_BURST_DAMAGE_TYPES,
    maxAdditionalDice: Math.max(0, Number(spellcastingAbilityModifier)),
  };
}

export function supportedCantripSpellAttackSequenceProfile(
  spell: BattleSpellAdmissionSource,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SpellAttackSequenceInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackSequenceTargeting(phase.attachment, characterLevel)
      : null;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== "ranged_spell_attack" ||
    targeting === null ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "force" ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  if (damageExpr === null) {
    return [];
  }
  return [
    {
      access: cantripSpellAccessForCastingSource(spell.castingSource),
      resource: { tag: "none" },
      procedure: "spellAttackSequence",
      spell,
      targeting,
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(spell.mechanics.range.feet),
      attackKind: phase.attackKind,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
    },
  ];
}

function spellAttackSequenceTargeting(
  attachment: Attachment,
  characterLevel: number,
): CantripSpellAttackSequenceTargeting | null {
  const selection = creatureOrObjectTargetSelectionFromAttachment(attachment);
  if (selection === null) {
    return null;
  }
  const beamCount = eldritchBlastBeamCount(selection, characterLevel);
  return beamCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "characterLevel",
        attackCount: beamCount,
      };
}

function spellAttackSequenceSlotTargeting(
  countProgression: ScorchingRayCountProgression,
  slotLevel: SpellSlotLevel,
): PreparedSpellAttackSequenceTargeting | null {
  const attackCount = scorchingRayAttackCount(countProgression, slotLevel);
  return attackCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "spellSlotLevel",
        attackCount,
      };
}

function creatureOrObjectTargetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  const selection = targetSelectionFromAttachment(attachment);
  return selection !== null &&
    sameStringSet(selection.targetKinds ?? [], ["creature", "object"])
    ? selection
    : null;
}

function scorchingRayCountProgressionFromAttachment(
  attachment: Attachment,
): ScorchingRayCountProgression | null {
  const selection = creatureOrObjectTargetSelectionFromAttachment(attachment);
  return selection !== null && scorchingRaySelectionIsCanonical(selection)
    ? selection.count
    : null;
}

function scorchingRaySelectionIsCanonical(
  selection: TargetSelection,
): selection is TargetSelection & {
  readonly mode: "choose_up_to";
  readonly repeatsAllowed: true;
  readonly count: ScorchingRayCountProgression;
} {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return false;
  }
  const count = selection.count;
  return (
    typeof count === "object" &&
    count.kind === "linear" &&
    count.base === SCORCHING_RAY_BASE_RAY_COUNT &&
    count.baseLevel === SCORCHING_RAY_BASE_LEVEL &&
    count.perSlotAboveBase === SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE
  );
}

function scorchingRayAttackCount(
  countProgression: ScorchingRayCountProgression,
  slotLevel: SpellSlotLevel,
): MultiRaySpellAttackRayCount | null {
  const slotOffset = Number(slotLevel) - countProgression.baseLevel;
  if (slotOffset < 0) {
    return null;
  }
  return multiRaySpellAttackRayCount(
    countProgression.base + slotOffset * countProgression.perSlotAboveBase,
  );
}

function eldritchBlastBeamCount(
  selection: TargetSelection,
  characterLevel: number,
): MultiBeamSpellAttackBeamCount | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count !== "object" ||
    count.kind !== "threshold_tiers" ||
    count.axis !== "character"
  ) {
    return null;
  }
  if (
    count.base !== 1 ||
    count.tiers.length !== ELDRITCH_BLAST_BEAM_COUNT_TIERS.length ||
    !count.tiers.every((tier, index) => {
      const expected = ELDRITCH_BLAST_BEAM_COUNT_TIERS[index];
      return (
        expected !== undefined &&
        tier.atLevel === expected.atLevel &&
        tier.value === expected.value
      );
    })
  ) {
    return null;
  }
  return ELDRITCH_BLAST_BEAM_COUNT_TIERS.reduce<MultiBeamSpellAttackBeamCount>(
    (current, tier) => (characterLevel >= tier.atLevel ? tier.value : current),
    count.base,
  );
}

function supportedSpellObjectHitEffect(input: {
  readonly spell: BattleSpellAdmissionSource;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly targeting: SpellAttackDamageTargeting;
  readonly damageEffect: SpellAttackHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
}): {
  readonly objectHitEffect: SpellObjectHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
} {
  if (
    input.targeting.kind === "singleCreatureOrObject" &&
    isFireDamageObjectIgnitionShape(input)
  ) {
    return {
      objectHitEffect: { kind: "igniteFlammableUnattended" },
      postDamageEffects: [],
    };
  }
  return {
    objectHitEffect: { kind: "none" },
    postDamageEffects: input.postDamageEffects,
  };
}

function isFireDamageObjectIgnitionShape(input: {
  readonly spell: BattleSpellAdmissionSource;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly damageEffect: SpellAttackHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
}): boolean {
  return (
    input.spell.mechanics.level === 0 &&
    input.spell.mechanics.duration.kind === "instantaneous" &&
    input.phase.attackKind === "ranged_spell_attack" &&
    input.damageEffect.kind === "damage" &&
    input.damageEffect.damageType === "fire" &&
    input.postDamageEffects.length === 1 &&
    input.postDamageEffects[0]?.kind === "ignite_objects" &&
    input.postDamageEffects[0].filter.material === "flammable" &&
    input.postDamageEffects[0].filter.targetRelation === "not_worn_or_carried"
  );
}

export function spellAttackDamageTargeting(
  attachment: Attachment,
): SpellAttackDamageTargeting | null {
  const selection = targetSelectionFromAttachment(attachment);
  if (selection === null || selection.mode !== "one") {
    return null;
  }
  const targetKinds = selection.targetKinds;
  if (targetKinds === undefined || sameStringSet(targetKinds, ["creature"])) {
    return { kind: "singleCombatant" };
  }
  if (sameStringSet(targetKinds, ["creature", "object"])) {
    return { kind: "singleCreatureOrObject" };
  }
  return null;
}

export function singleSpellAttackDamageRangeFeet(
  targeting: SpellAttackDamageTargeting | null,
  range: BattleSpellAdmissionSource["mechanics"]["range"],
): ReturnType<typeof singleTargetSpellRangeFeet> {
  if (targeting === null) {
    return null;
  }
  return singleTargetSpellRangeFeet(range);
}

export function primaryTargetOriginEmanationTargeting(
  attachment: Attachment,
): Extract<
  SpellTargeting,
  { readonly kind: "primaryTargetOriginEmanation" }
> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "area" &&
    value.origin.kind === "on_primary_target" &&
    value.shape.kind === "emanation" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "primaryTargetOriginEmanation",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}
