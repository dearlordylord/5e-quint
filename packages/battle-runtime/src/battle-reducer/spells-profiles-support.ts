// Support, defensive, and rider spell profile projections extracted from spells-profiles.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import {
  attackBonus,
  movementDeltaFeet,
  movementFeet,
  spellSlotLevel,
  type AbilityModifier,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type {
  Ability,
  Attachment,
  DamageType,
  DcSource,
  DiceExpr,
  EffectAtom,
  OngoingEffect,
  Skill,
  SkillFilter,
  SpellRecord,
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { Either, Match, Schema } from "effect";
import {
  BATTLE_D20_ROLL_MODIFIER_KINDS,
  BATTLE_SPECIAL_SPEED_KINDS,
  type MirrorImageHitInterceptionSpellInvocation,
  type BattleActiveEffectExpiration,
  type BattleCreatureState,
  type BattleSpecialSpeedKind,
  type BattleD20RollModifierDelta,
  type BattleD20RollModifierKind,
  type AbilityCheckRollModeSpellEffect,
  type AfterHitDamageAndIlluminationSpellInvocation,
  type AfterHitTimedDamageAndSaveSpellInvocation,
  type D20RollModifierSpellEffect,
  type HealingSpellActionCost,
  type RollModifierSpellTargeting,
  type ScalarBuffSpellEffect,
  type ScalarBuffSpellTargeting,
  type SpellCreatedHeldObjectActiveEffect,
  type SupportedSpellInvocation,
  type ThaumaturgyBoomingVoiceSpellInvocation,
} from "../battle-reducer.ts";
import {
  characterResourceIsClassFeatureFreeCastForSpell,
  resourceHasUsesRemaining,
  type CharacterBattleSpellcastingState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_INITIAL_DUPLICATES,
  MIRROR_IMAGE_UNAFFECTED_BY,
  THAUMATURGY_BOOMING_VOICE_DURATION_TICKS,
  THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL,
} from "./domain-constants.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
  supportedDamageAmountExpr,
} from "./spells-profile-shared.ts";
import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./spells-active-effects.ts";

const SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET = movementFeet(5);

type D20RollModifierSpellProjection = {
  readonly effect: D20RollModifierSpellEffect;
  readonly rangeFeet: MovementFeet;
  readonly saveGate: {
    readonly ability: Ability;
    readonly dc: DcSource;
  } | null;
  readonly skillChoices: readonly Skill[] | null;
  readonly abilityChoices: null;
  readonly targeting: RollModifierSpellTargeting;
};
type AbilityCheckRollModeSpellProjection = {
  readonly effect: AbilityCheckRollModeSpellEffect;
  readonly rangeFeet: MovementFeet;
  readonly saveGate: null;
  readonly skillChoices: null;
  readonly abilityChoices: readonly Ability[];
  readonly abilityChoiceApplication: "single" | "perTarget";
  readonly targeting: RollModifierSpellTargeting;
};
type RollModifierSpellProjection =
  | D20RollModifierSpellProjection
  | AbilityCheckRollModeSpellProjection;
export function isD20RollModifierSpellProjection(
  projection: RollModifierSpellProjection,
): projection is D20RollModifierSpellProjection {
  return projection.effect.kind === "d20RollModifier";
}

export function supportedPreparedMirrorImageHitInterceptionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = mirrorImageHitInterceptionSpellProjection(actorId, spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "mirrorImageHitInterception",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

function mirrorImageHitInterceptionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<MirrorImageHitInterceptionSpellInvocation, "activeEffect"> | null {
  if (
    spell.mechanics.family !== "passive_hit_intercept" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    !spell.mechanics.components.v ||
    !spell.mechanics.components.s ||
    spell.mechanics.components.m !== false ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.duplicatePool.count !== MIRROR_IMAGE_INITIAL_DUPLICATES ||
    spell.mechanics.duplicatePool.dicePerRemainingDuplicate !== 1 ||
    spell.mechanics.duplicatePool.dieSize !== MIRROR_IMAGE_DUPLICATE_DIE_SIZE ||
    spell.mechanics.duplicatePool.successAtLeast !==
      MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST ||
    spell.mechanics.duplicatePool.onHit !==
      "duplicate_hit_instead_and_destroyed" ||
    spell.mechanics.duplicatePool.onFailure !== "caster_hit_normally" ||
    !spell.mechanics.duplicatePool.ignoresOtherDamageAndEffects ||
    spell.mechanics.duplicatePool.endsWhen !== "all_duplicates_destroyed" ||
    !sameStringSet(
      spell.mechanics.duplicatePool.unaffectedBy,
      MIRROR_IMAGE_UNAFFECTED_BY,
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        activeEffect: {
          kind: "mirrorImageDuplicates",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          remainingDuplicates: MIRROR_IMAGE_INITIAL_DUPLICATES,
          expiresAt: {
            kind: "duration",
            durationTicks: durationTicks.right,
          },
        },
      };
}

export function sameCreatureTypeSet(
  left: readonly CreatureType[],
  right: readonly CreatureType[],
): boolean {
  const leftTypes = new Set(left);
  const rightTypes = new Set(right);
  return (
    leftTypes.size === left.length &&
    rightTypes.size === right.length &&
    leftTypes.size === rightTypes.size &&
    left.every((type) => rightTypes.has(type))
  );
}

type OngoingEffectSpellMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectInitialEffect = NonNullable<
  Extract<
    NonNullable<OngoingEffectSpellMechanics["initialPhase"]>,
    { readonly kind: "direct" }
  >["effects"]
>[number];
type SpellCreatedHeldObjectEffect = Extract<
  OngoingEffectInitialEffect,
  { readonly kind: "spell_created_held_object" }
>;
type SpellCreatedHeldObjectAttackOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "attack_roll" }
    >;
  };
type SpellCreatedHeldObjectLightOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "emit_light" }
    >;
  };

export function supportedPreparedSpellCreatedHeldObjectProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const activeEffect = spellCreatedHeldObjectActiveEffectProjection({
      actorId,
      spell,
      slotLevel: slot.spellLevel,
      spellcastingAbilityModifier,
      proficiencyBonus,
    });
    return activeEffect === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "spellCreatedHeldObject",
            spell,
            actionCost: "bonusAction",
            activeEffect,
          },
        ];
  });
}

export function supportedSpellCreatedHeldObjectActiveEffectProfile(
  actor: BattleCreatureState,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  const effects = actor.activeEffects.filter(
    (effect): effect is SpellCreatedHeldObjectActiveEffect =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.sourceCombatantId === actor.combatantId &&
      effect.sourceSpellId === spell.id,
  );
  return effects.flatMap((effect): readonly SupportedSpellInvocation[] => {
    if (effect.objectState.kind === "held") {
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "spellCreatedHeldObjectAttack",
          spell,
          targeting: { kind: "singleCombatant" },
          damage: effect.attack.damage,
          rangeFeet: SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET,
          attackKind: effect.attack.attackKind,
          attackBonus: effect.attack.attackBonus,
          activeEffect: { ...effect, objectState: { kind: "held" } },
        },
      ];
    }
    return [
      {
        access: {
          tag: "spellEffect",
          sourceCombatantId: effect.sourceCombatantId,
        },
        resource: { tag: "none" },
        procedure: "spellCreatedHeldObjectReEvoke",
        spell,
        actionCost: "bonusAction",
        activeEffect: { ...effect, objectState: { kind: "notHeld" } },
      },
    ];
  });
}

function spellCreatedHeldObjectActiveEffectProjection(input: {
  readonly actorId: CombatantId;
  readonly spell: SpellRecord;
  readonly slotLevel: SpellSlotLevel;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}):
  | (SpellCreatedHeldObjectActiveEffect & {
      readonly objectState: { readonly kind: "held" };
    })
  | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const initialPhase = mechanics.initialPhase;
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "self" ||
    mechanics.attachment.kind !== "self" ||
    mechanics.duration.kind !== "concentration" ||
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    initialPhase.effects === undefined
  ) {
    return null;
  }
  const heldObjectEffects = initialPhase.effects.filter(
    (effect) => effect.kind === "spell_created_held_object",
  );
  const lightOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectLightOperation =>
      operation.trigger.kind === "passive" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "emit_light",
  );
  const attackOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectAttackOperation =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "attack_roll",
  );
  const heldObject = heldObjectEffects[0];
  const lightOperation = lightOperations[0];
  const attackOperation = attackOperations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  if (
    initialPhase.effects.length !== 1 ||
    heldObjectEffects.length !== 1 ||
    mechanics.operations.length !== 2 ||
    lightOperations.length !== 1 ||
    attackOperations.length !== 1 ||
    heldObject?.kind !== "spell_created_held_object" ||
    !spellCreatedHeldObjectLifecycleIsSupported(heldObject) ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet === undefined ||
    lightOperation.effect.dimAdditionalFeet === undefined ||
    attackOperation === undefined ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  const damageEffect = attackOperation.effect.onHit[0];
  const missEffect = attackOperation.effect.onMiss[0];
  if (
    attackOperation.effect.attackKind !== "melee_spell_attack" ||
    attackOperation.effect.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.amount === undefined ||
    !Schema.is(DamageTypeSchema)(damageEffect.damageType) ||
    attackOperation.effect.onMiss.length !== 1 ||
    missEffect?.kind !== "none"
  ) {
    return null;
  }
  const damageExpr = spellCreatedHeldObjectDamageExpr(
    damageEffect.amount,
    mechanics.level,
    input.slotLevel,
    input.spellcastingAbilityModifier,
  );
  if (damageExpr === null) {
    return null;
  }
  return {
    kind: "spellCreatedHeldObject",
    sourceSpellId: spell.id,
    sourceCombatantId: input.actorId,
    objectState: { kind: "held" },
    light: {
      brightRadiusFeet: movementFeet(lightOperation.effect.brightRadiusFeet),
      dimAdditionalFeet: movementFeet(lightOperation.effect.dimAdditionalFeet),
    },
    attack: {
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      attackKind: attackOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: durationTicks.right,
    },
  };
}

function spellCreatedHeldObjectLifecycleIsSupported(
  effect: SpellCreatedHeldObjectEffect,
): boolean {
  return (
    effect.heldBy === "caster" &&
    sameStringSet(effect.requirements, ["free_hand"]) &&
    sameStringSet(effect.disappearsWhen, ["caster_lets_go"]) &&
    effect.reEvoke.cost.kind === "bonus_action" &&
    sameStringSet(effect.reEvoke.requirements, ["free_hand"])
  );
}

function spellCreatedHeldObjectDamageExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.dieSize === undefined ||
    amount.base.spellcastingMod !== true ||
    amount.base.abilityModifier !== undefined ||
    amount.perLevel?.dieSize !== amount.base.dieSize
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat:
      (amount.base.flat ?? 0) +
      (amount.perLevel?.flat ?? 0) * slotDelta +
      Number(spellcastingAbilityModifier),
  };
}

export function supportedPreparedAfterHitDamageSpellProfile(
  actor: BattleCreatureState,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = afterHitDamageSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  const freeCastSlotLevel = spellSlotLevel(spell.mechanics.level);
  const freeCastDamageExpr = supportedDamageAmountExpr({
    amount: projection.damageAmount,
    spellLevel: spell.mechanics.level,
    slotLevel: freeCastSlotLevel,
  });
  const freeCastInvocations: readonly SupportedSpellInvocation[] =
    actor.origin.kind !== "character" || freeCastDamageExpr === null
      ? []
      : actor.origin.resources.flatMap(
          (resource): readonly SupportedSpellInvocation[] =>
            characterResourceIsClassFeatureFreeCastForSpell(
              resource,
              spell.id,
            ) && resourceHasUsesRemaining(resource)
              ? [
                  {
                    access: { tag: "prepared" },
                    resource: {
                      tag: "classFeatureFreeCast",
                      resourceUnitId: resource.unit.id,
                    },
                    procedure: "afterHitDamage",
                    spell,
                    actionCost: "bonusAction",
                    damage: {
                      expr: freeCastDamageExpr,
                      damageType: projection.damageType,
                    },
                    conditionalBonusDamage: {
                      targetCreatureTypes:
                        projection.conditionalBonusTargetTypes,
                      expr: projection.conditionalBonusExpr,
                      damageType: projection.conditionalBonusDamageType,
                    },
                  },
                ]
              : [],
        );
  const slotInvocations = spellSlots.flatMap(
    (slot): readonly SupportedSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: projection.damageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "afterHitDamage",
          spell,
          actionCost: "bonusAction",
          damage: {
            expr: damageExpr,
            damageType: projection.damageType,
          },
          conditionalBonusDamage: {
            targetCreatureTypes: projection.conditionalBonusTargetTypes,
            expr: projection.conditionalBonusExpr,
            damageType: projection.conditionalBonusDamageType,
          },
        },
      ];
    },
  );
  return [...freeCastInvocations, ...slotInvocations];
}

export function supportedPreparedAfterHitSaveGatedConditionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = afterHitSaveGatedConditionSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: projection.turnStartDamageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "afterHitSaveGatedCondition",
        spell,
        actionCost: "bonusAction",
        ability: projection.ability,
        dc: projection.dc,
        targeting: { kind: "singleCombatant" },
        effect: {
          kind: "fixed",
          condition: projection.condition,
          expiresAt: "concentration",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            allowedActor: "targetOrCreatureWithinReach",
            successEnds: "spell",
          },
          turnStartDamage: {
            expr: damageExpr,
            damageType: projection.turnStartDamageType,
          },
          repeatSave: null,
        },
      },
    ];
  });
}

export function supportedPreparedAfterHitTimedDamageAndSaveSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = afterHitTimedDamageAndSaveSpellProjection(actorId, spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const immediateDamageExpr = supportedDamageAmountExpr({
      amount: projection.immediateDamageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    const turnStartDamageExpr = supportedDamageAmountExpr({
      amount: projection.turnStartDamageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (immediateDamageExpr === null || turnStartDamageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "afterHitTimedDamageAndSave",
        spell,
        actionCost: "bonusAction",
        immediateDamage: {
          expr: immediateDamageExpr,
          damageType: projection.damageType,
        },
        activeEffect: {
          kind: "spellTurnStartDamageAndSave",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          damage: {
            expr: turnStartDamageExpr,
            damageType: projection.damageType,
          },
          save: {
            ability: projection.saveAbility,
            dc: projection.dc,
            successEnds: "spell",
          },
          expiresAt: projection.expiresAt,
        },
      },
    ];
  });
}

export function supportedPreparedAfterHitDamageAndIlluminationSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = afterHitDamageAndIlluminationSpellProjection(
    actorId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: projection.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "afterHitDamageAndIllumination",
        spell,
        actionCost: "bonusAction",
        damage: {
          expr: damageExpr,
          damageType: projection.damageType,
        },
        activeEffect: {
          kind: "shiningSmiteIllumination",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          expiresAt: projection.expiresAt,
        },
      },
    ];
  });
}

export function afterHitDamageAndIlluminationSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "radiant">;
  readonly expiresAt: AfterHitDamageAndIlluminationSpellInvocation["activeEffect"]["expiresAt"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 3 ||
    !spell.mechanics.operations.every(
      (operation) => operation.trigger.kind === "passive",
    )
  ) {
    return null;
  }

  const initialPhase = spell.mechanics.initialPhase;
  const damage =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const operationEffects = spell.mechanics.operations.map(
    (operation) => operation.effect,
  );
  const light = operationEffects.find((effect) => effect.kind === "emit_light");
  const attackAdvantage = operationEffects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const suppressInvisible = operationEffects.find(
    (effect) => effect.kind === "suppress_condition_benefit",
  );
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.effects?.length !== 1 ||
    damage?.kind !== "damage" ||
    damage.damageType !== "radiant" ||
    damage.amount === undefined ||
    light?.kind !== "emit_light" ||
    light.brightRadiusFeet !== SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET ||
    (light.dimAdditionalFeet ?? 0) !== 0 ||
    attackAdvantage?.kind !== "modify_roll_advantage" ||
    attackAdvantage.mode !== "advantage" ||
    attackAdvantage.affects !== "rolls_against_self" ||
    attackAdvantage.on === undefined ||
    !sameStringSet(attackAdvantage.on, ["attack_roll"]) ||
    suppressInvisible?.kind !== "suppress_condition_benefit" ||
    suppressInvisible.condition !== "invisible" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    damageAmount: damage.amount,
    damageType: "radiant",
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks: durationTicks.right,
    },
  };
}

export function afterHitTimedDamageAndSaveSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): {
  readonly immediateDamageAmount: SurfaceDiceAmount;
  readonly turnStartDamageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "fire">;
  readonly saveAbility: "con";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly expiresAt: AfterHitTimedDamageAndSaveSpellInvocation["activeEffect"]["expiresAt"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const initialPhase = spell.mechanics.initialPhase;
  const immediateDamage =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const operation = spell.mechanics.operations[0];
  const composite =
    operation?.trigger.kind === "on_attached_turn_start" &&
    operation.effect.kind === "composite_ongoing"
      ? operation.effect
      : null;
  const turnStartDamage = composite?.effects.find(
    (effect) => effect.kind === "damage",
  );
  const saveGate = composite?.effects.find(
    (effect) => effect.kind === "save_gate",
  );
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.effects?.length !== 1 ||
    immediateDamage?.kind !== "damage" ||
    immediateDamage.damageType !== "fire" ||
    immediateDamage.amount === undefined ||
    composite === null ||
    composite.effects.length !== 2 ||
    turnStartDamage?.kind !== "damage" ||
    turnStartDamage.damageType !== "fire" ||
    turnStartDamage.amount === undefined ||
    saveGate?.kind !== "save_gate" ||
    saveGate.ability !== "con" ||
    saveGate.dc.kind !== "caster_spell_save_dc" ||
    saveGate.onFail.kind !== "none" ||
    saveGate.onSuccess.kind !== "end_current_effect" ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    immediateDamageAmount: immediateDamage.amount,
    turnStartDamageAmount: turnStartDamage.amount,
    damageType: "fire",
    saveAbility: "con",
    dc: { kind: "caster_spell_save_dc" },
    expiresAt,
  };
}

export function afterHitSaveGatedConditionSpellProjection(spell: SpellRecord): {
  readonly ability: "str";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly condition: "restrained";
  readonly turnStartDamageAmount: SurfaceDiceAmount;
  readonly turnStartDamageType: Extract<DamageType, "piercing">;
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !== "weapon" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const initialPhase = spell.mechanics.initialPhase;
  const operation = spell.mechanics.operations[0];
  if (
    initialPhase?.kind !== "save_gate" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.ability !== "str" ||
    initialPhase.dc.kind !== "caster_spell_save_dc" ||
    initialPhase.onFail.kind !== "apply_condition" ||
    initialPhase.onFail.condition !== "restrained" ||
    initialPhase.onSuccess.kind !== "end_current_effect" ||
    operation?.trigger.kind !== "on_attached_turn_start" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== "piercing" ||
    operation.effect.amount === undefined
  ) {
    return null;
  }
  return {
    ability: "str",
    dc: { kind: "caster_spell_save_dc" },
    condition: "restrained",
    turnStartDamageAmount: operation.effect.amount,
    turnStartDamageType: "piercing",
  };
}

export function afterHitDamageSpellProjection(spell: SpellRecord): {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: DamageType;
  readonly conditionalBonusTargetTypes: readonly CreatureType[];
  readonly conditionalBonusExpr: DiceExpr;
  readonly conditionalBonusDamageType: DamageType;
} | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const baseDamage = effects[0];
  const conditionalBonus = effects[1];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    effects.length !== 2 ||
    baseDamage?.kind !== "damage" ||
    baseDamage.damageType !== "radiant" ||
    conditionalBonus?.kind !== "conditional_bonus_damage" ||
    conditionalBonus.damageType !== "radiant" ||
    conditionalBonus.when?.kind !== "target_creature_type" ||
    !sameCreatureTypeSet(conditionalBonus.when.types, ["fiend", "undead"]) ||
    conditionalBonus.amount.kind !== "fixed" ||
    conditionalBonus.amount.expr.dice !== 1 ||
    conditionalBonus.amount.expr.dieSize !== 8 ||
    (conditionalBonus.amount.expr.flat ?? 0) !== 0
  ) {
    return null;
  }
  return {
    damageAmount: baseDamage.amount,
    damageType: "radiant",
    conditionalBonusTargetTypes: conditionalBonus.when.types,
    conditionalBonusExpr: conditionalBonus.amount.expr,
    conditionalBonusDamageType: "radiant",
  };
}

export function thaumaturgyBoomingVoiceProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  ThaumaturgyBoomingVoiceSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const effect = operation?.effect;
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const skillFilter =
    effect?.kind === "modify_roll_advantage"
      ? rollModifierSkillFilter(effect.skillFilter)
      : null;
  const abilityFilter =
    effect?.kind === "modify_roll_advantage" ? effect.abilityFilter : undefined;
  if (
    Either.isLeft(durationTicks) ||
    Number(durationTicks.right) !==
      Number(THAUMATURGY_BOOMING_VOICE_DURATION_TICKS) ||
    operation?.trigger.kind !== "passive" ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "advantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    !Array.isArray(abilityFilter) ||
    !sameStringSet(abilityFilter, ["cha"]) ||
    skillFilter?.kind !== "fixed" ||
    skillFilter.skill !== THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "thaumaturgyBoomingVoice",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt: {
        kind: "duration",
        durationTicks: durationTicks.right,
      },
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function scalarBuffSpellActionCost(
  castingTime: SpellRecord["mechanics"]["castingTime"],
): HealingSpellActionCost | null {
  return Match.value(castingTime).pipe(
    Match.when({ kind: "action" }, () => "magicAction" as const),
    Match.when({ kind: "bonus_action" }, () => "bonusAction" as const),
    Match.orElse(() => null),
  );
}

export function scalarBuffSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "self" }, () => movementFeet(0)),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.when({ kind: "point" }, (point) =>
      typeof point.feet === "number" ? movementFeet(point.feet) : null,
    ),
    Match.orElse(() => null),
  );
}

export function scalarBuffSpellTargeting(
  attachment: Attachment,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): ScalarBuffSpellTargeting | null {
  if (attachment.kind === "self") {
    return { kind: "self" };
  }
  if (attachment.kind !== "hole" || attachment.value.kind !== "target") {
    return null;
  }
  const targetCount = scalarBuffSpellTargetCount(
    attachment.value.selection,
    spellLevel,
    slotLevel,
  );
  return targetCount === null
    ? null
    : {
        kind: "targetList",
        minTargets: 1,
        maxTargets: targetCount,
        requiredTargetDisposition: scalarBuffRequiredTargetDisposition(
          attachment.value.selection,
        ),
      };
}

function scalarBuffRequiredTargetDisposition(
  selection: TargetSelection,
): Extract<
  ScalarBuffSpellTargeting,
  { readonly kind: "targetList" }
>["requiredTargetDisposition"] {
  return "disposition" in selection && selection.disposition === "willing"
    ? "willing"
    : "unrestricted";
}

export function scalarBuffSpellEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effect: EffectAtom | OngoingEffect,
  duration: SpellRecord["mechanics"]["duration"],
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): ScalarBuffSpellEffect | null {
  if (effect.kind === "grant_temp_hp" && duration.kind === "instantaneous") {
    const expr = supportedTemporaryHitPointsAmountExpr(
      effect.amount,
      spellLevel,
      slotLevel,
    );
    return expr === null
      ? null
      : { kind: "temporaryHitPoints", amount: { expr } };
  }
  const expiresAt = scalarBuffActiveEffectExpiration(actorId, duration);
  if (expiresAt === null) {
    return null;
  }
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet !== "number" &&
    effect.feet.kind === "walk_speed" &&
    isEqualToSpeedGrantKind(effect.speedKind) &&
    effect.hover === undefined
  ) {
    const speedGrantExpiresAt = scalarBuffSpecialSpeedGrantExpiration(
      actorId,
      duration,
    );
    return speedGrantExpiresAt === null
      ? null
      : {
          kind: "activeEffect",
          activeEffect: {
            kind: "specialSpeedGrant",
            sourceSpellId: spell.id,
            sourceCombatantId: actorId,
            speedKind: effect.speedKind,
            speed: { kind: "equalToSpeed" },
            hover: false,
            expiresAt: speedGrantExpiresAt,
          },
        };
  }
  if (
    effect.kind === "grant_speed" &&
    typeof effect.feet === "number" &&
    effect.speedKind === "fly" &&
    effect.hover === true
  ) {
    const speedGrantExpiresAt = scalarBuffSpecialSpeedGrantExpiration(
      actorId,
      duration,
    );
    return speedGrantExpiresAt === null
      ? null
      : {
          kind: "activeEffect",
          activeEffect: {
            kind: "specialSpeedGrant",
            sourceSpellId: spell.id,
            sourceCombatantId: actorId,
            speedKind: effect.speedKind,
            speed: {
              kind: "fixed",
              speedFeet: movementFeet(effect.feet),
            },
            hover: true,
            expiresAt: speedGrantExpiresAt,
          },
        };
  }
  if (effect.kind === "modify_speed" && effect.unit === "feet") {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "speedDelta",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        deltaFeet: movementDeltaFeet(effect.delta),
        expiresAt,
      },
    };
  }
  if (
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dieSize === 1
  ) {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassBonus",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        bonus: effect.delta.dice,
        negatedSpellIds: [],
        expiresAt,
      },
    };
  }
  if (
    effect.kind === "modify_ac_set_floor" &&
    Number.isInteger(effect.const) &&
    effect.const > 0
  ) {
    return {
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassFloor",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        floor: armorClass(effect.const),
        expiresAt,
      },
    };
  }
  if (effect.kind === "modify_max_hp" && effect.direction === "increase") {
    const amount = supportedHitPointMaximumIncreaseAmount(
      effect.delta,
      spellLevel,
      slotLevel,
    );
    return amount === null
      ? null
      : {
          kind: "hitPointMaximumIncrease",
          activeEffect: {
            kind: "hitPointMaximumIncrease",
            sourceSpellId: spell.id,
            sourceCombatantId: actorId,
            amount,
            expiresAt,
          },
        };
  }
  return null;
}

function isEqualToSpeedGrantKind(
  speedKind: Extract<EffectAtom, { readonly kind: "grant_speed" }>["speedKind"],
): speedKind is Exclude<BattleSpecialSpeedKind, "fly"> {
  return BATTLE_SPECIAL_SPEED_KINDS.some(
    (kind) => kind !== "fly" && kind === speedKind,
  );
}

function scalarBuffSpecialSpeedGrantExpiration(
  actorId: CombatantId,
  duration: SpellRecord["mechanics"]["duration"],
): BattleActiveEffectExpiration | null {
  if (duration.kind !== "concentration") {
    return scalarBuffActiveEffectExpiration(actorId, duration);
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.upTo);
  return Either.isLeft(durationTicks)
    ? null
    : {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.right,
      };
}

export function rollModifierSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): RollModifierSpellProjection | null {
  if (spell.mechanics.castingTime.kind !== "action") {
    return null;
  }
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (expiresAt === null) {
    return null;
  }

  if (spell.mechanics.family === "ongoing_effect") {
    const rangeFeet = rollModifierSpellRangeFeet(
      spell.mechanics.range,
      spell.mechanics.attachment,
    );
    const operation = spell.mechanics.operations[0];
    if (
      rangeFeet === null ||
      spell.mechanics.operations.length !== 1 ||
      operation?.trigger.kind !== "passive"
    ) {
      return null;
    }
    if (operation.effect.kind === "modify_roll_numeric") {
      const targeting = rollModifierSpellTargeting(
        spell.mechanics.attachment,
        spell.mechanics.level,
        slotLevel,
      );
      const modifier = rollModifierActiveEffect(
        actorId,
        spell,
        operation.effect,
        expiresAt,
      );
      return targeting === null || modifier === null
        ? null
        : {
            targeting,
            effect: modifier.effect,
            rangeFeet,
            saveGate: null,
            skillChoices: modifier.skillChoices,
            abilityChoices: null,
          };
    }
    if (operation.effect.kind === "modify_roll_advantage") {
      const targeting = rollModifierSpellTargeting(
        spell.mechanics.attachment,
        spell.mechanics.level,
        slotLevel,
      );
      const modifier = rollModifierAbilityCheckRollModeEffect(
        actorId,
        spell,
        operation.effect,
        expiresAt,
      );
      return modifier === null || targeting === null
        ? null
        : {
            targeting,
            effect: modifier.effect,
            rangeFeet,
            saveGate: null,
            skillChoices: null,
            abilityChoices: modifier.abilityChoices,
            abilityChoiceApplication: modifier.abilityChoiceApplication,
          };
    }
    return null;
  }

  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const rangeFeet = scalarBuffSpellRangeFeet(spell.mechanics.range);
  if (
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.onFail.kind !== "modify_roll_numeric" ||
    phase.onSuccess.kind !== "none"
  ) {
    return null;
  }
  const targeting = rollModifierSpellTargeting(
    phase.attachment,
    spell.mechanics.level,
    slotLevel,
  );
  const modifier = rollModifierActiveEffect(
    actorId,
    spell,
    phase.onFail,
    expiresAt,
  );
  return targeting === null || modifier === null
    ? null
    : {
        targeting,
        effect: modifier.effect,
        rangeFeet,
        saveGate: { ability: phase.ability, dc: phase.dc },
        skillChoices: modifier.skillChoices,
        abilityChoices: null,
      };
}

export function rollModifierSpellTargeting(
  attachment: Attachment,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): RollModifierSpellTargeting | null {
  if (
    attachment.kind === "area" &&
    attachment.origin.kind === "self" &&
    attachment.shape.kind === "emanation" &&
    typeof attachment.shape.radiusFeet === "number"
  ) {
    return { kind: "selfAndChosenLegalTargets", minTargets: 1 };
  }
  if (attachment.kind !== "hole" || attachment.value.kind !== "target") {
    return null;
  }
  if (attachment.value.selection.mode === "any_number") {
    return { kind: "targetList", minTargets: 1, maxTargets: "allLegalTargets" };
  }
  const targetCount = scalarBuffSpellTargetCount(
    attachment.value.selection,
    spellLevel,
    slotLevel,
  );
  return targetCount === null
    ? null
    : { kind: "targetList", minTargets: 1, maxTargets: targetCount };
}

export function rollModifierActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>,
  expiresAt: BattleActiveEffectExpiration,
): {
  readonly effect: D20RollModifierSpellEffect;
  readonly skillChoices: readonly Skill[] | null;
} | null {
  const delta = rollModifierDelta(effect.delta);
  if (delta === null || !rollModifierKindsAreSupported(effect.on)) {
    return null;
  }
  const skillFilter = rollModifierSkillFilter(effect.skillFilter);
  if (skillFilter === null) {
    return null;
  }
  return {
    effect: {
      kind: "d20RollModifier",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      on: effect.on,
      delta,
      skill: skillFilter.kind === "fixed" ? skillFilter.skill : null,
      expiresAt,
    },
    skillChoices: skillFilter.kind === "choice" ? skillFilter.options : null,
  };
}

export function rollModifierAbilityCheckRollModeEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
  expiresAt: BattleActiveEffectExpiration,
): {
  readonly effect: AbilityCheckRollModeSpellEffect;
  readonly abilityChoices: readonly Ability[];
  readonly abilityChoiceApplication: "single" | "perTarget";
} | null {
  const abilityFilter = rollModifierAbilityChoiceFilter(effect.abilityFilter);
  if (
    (effect.affects ?? "self_roll") !== "self_roll" ||
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    effect.skillFilter !== undefined ||
    effect.conditionFilter !== undefined ||
    effect.saveAbilityFilter !== undefined ||
    effect.saveSourceFilter !== undefined ||
    effect.contextRangeFeet !== undefined ||
    effect.spellSourceFilter !== undefined ||
    effect.attackerTypeFilter !== undefined ||
    effect.count !== undefined ||
    effect.expiresOn !== undefined ||
    abilityFilter === null
  ) {
    return null;
  }
  return {
    effect: {
      kind: "abilityCheckRollMode",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      mode: effect.mode,
      expiresAt,
    },
    abilityChoices: abilityFilter.value.options,
    abilityChoiceApplication:
      abilityFilter.kind === "per_target_hole" ? "perTarget" : "single",
  };
}

type RollModifierPerTargetAbilityChoiceFilter = {
  readonly kind: "per_target_hole";
  readonly value: {
    readonly kind: "choice";
    readonly options: readonly Ability[];
  };
};
type RollModifierAbilityChoiceFilter =
  | Extract<
      NonNullable<
        Extract<
          EffectAtom,
          { readonly kind: "modify_roll_advantage" }
        >["abilityFilter"]
      >,
      { readonly kind: "hole" }
    >
  | RollModifierPerTargetAbilityChoiceFilter;

function rollModifierAbilityChoiceFilter(
  abilityFilter:
    | Extract<
        EffectAtom,
        { readonly kind: "modify_roll_advantage" }
      >["abilityFilter"]
    | RollModifierPerTargetAbilityChoiceFilter,
): RollModifierAbilityChoiceFilter | null {
  if (abilityFilter === undefined || !("kind" in abilityFilter)) {
    return null;
  }
  if (
    (abilityFilter.kind !== "hole" &&
      abilityFilter.kind !== "per_target_hole") ||
    abilityFilter.value.kind !== "choice" ||
    abilityFilter.value.options.length === 0
  ) {
    return null;
  }
  return abilityFilter;
}

export function rollModifierDelta(
  delta: Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>["delta"],
): BattleD20RollModifierDelta | null {
  if (
    delta.kind === "fixed_number" &&
    Number.isInteger(delta.amount) &&
    delta.amount > 0 &&
    (delta.sign === "+" || delta.sign === "-")
  ) {
    return { kind: "fixedNumber", amount: delta.amount, sign: delta.sign };
  }
  return delta.kind === "fixed_dice" &&
    rollModifierDeltaDieSizeIsSupported(delta.dieSize) &&
    (delta.sign === "+" || delta.sign === "-")
    ? { dice: delta.dice, dieSize: delta.dieSize, sign: delta.sign }
    : null;
}

function rollModifierSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  attachment: Attachment,
): MovementFeet | null {
  if (
    range.kind === "self" &&
    attachment.kind === "area" &&
    attachment.origin.kind === "self" &&
    attachment.shape.kind === "emanation" &&
    typeof attachment.shape.radiusFeet === "number"
  ) {
    return movementFeet(attachment.shape.radiusFeet);
  }
  return scalarBuffSpellRangeFeet(range);
}

function rollModifierDeltaDieSizeIsSupported(
  dieSize: number,
): dieSize is (typeof BATTLE_D20_ROLL_MODIFIER_DIE_SIZES)[number] {
  return BATTLE_D20_ROLL_MODIFIER_DIE_SIZES.includes(
    dieSize as (typeof BATTLE_D20_ROLL_MODIFIER_DIE_SIZES)[number],
  );
}

export function rollModifierKindsAreSupported(
  kinds: readonly string[],
): kinds is readonly BattleD20RollModifierKind[] {
  return kinds.every((kind) =>
    BATTLE_D20_ROLL_MODIFIER_KINDS.includes(kind as BattleD20RollModifierKind),
  );
}

export function rollModifierSkillFilter(
  skillFilter: SkillFilter | undefined,
):
  | { readonly kind: "none" }
  | { readonly kind: "fixed"; readonly skill: Skill }
  | { readonly kind: "choice"; readonly options: readonly Skill[] }
  | null {
  if (skillFilter === undefined) {
    return { kind: "none" };
  }
  if (skillFilter.kind === "fixed" && skillFilter.skills.length === 1) {
    return { kind: "fixed", skill: skillFilter.skills[0] };
  }
  if (skillFilter.kind === "choice") {
    return { kind: "choice", options: skillFilter.options };
  }
  return null;
}

export function scalarBuffActiveEffectExpiration(
  actorId: CombatantId,
  duration: SpellRecord["mechanics"]["duration"],
): BattleActiveEffectExpiration | null {
  if (duration.kind === "concentration") {
    return { kind: "concentration", combatantId: actorId };
  }
  if (duration.kind === "timed") {
    const ticks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
    return Either.isLeft(ticks)
      ? null
      : { kind: "duration", durationTicks: ticks.right };
  }
  return null;
}

export function supportedTemporaryHitPointsAmountExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): DiceExpr | null {
  if (amount.kind === "fixed") {
    return amount.expr;
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel + 1 ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel + 1);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: (amount.base.flat ?? 0) + (amount.perLevel?.flat ?? 0) * slotDelta,
  };
}

function supportedHitPointMaximumIncreaseAmount(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): number | null {
  if (amount.kind === "fixed") {
    return deterministicFlatDiceExprAmount(amount.expr);
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel
  ) {
    return null;
  }
  const base = deterministicFlatDiceExprAmount(amount.base);
  const perLevel = deterministicFlatDiceExprDeltaAmount(amount.perLevel);
  if (base === null || perLevel === null) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return base + perLevel * slotDelta;
}

function deterministicFlatDiceExprAmount(expr: DiceExpr): number | null {
  if (
    expr.dice !== 0 ||
    expr.dieSize !== 1 ||
    expr.spellcastingMod === true ||
    expr.abilityModifier !== undefined
  ) {
    return null;
  }
  return expr.flat ?? 0;
}

function deterministicFlatDiceExprDeltaAmount(
  expr: Extract<
    SurfaceDiceAmount,
    { readonly kind: "linear_per_level" }
  >["perLevel"],
): number | null {
  if ((expr.dice ?? 0) !== 0 || (expr.dieSize ?? 1) !== 1) {
    return null;
  }
  return expr.flat ?? 0;
}
