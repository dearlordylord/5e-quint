// Support, defensive, and rider spell profile projections extracted from spells-profiles.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object spell.invocation-magic-weapon-enhancement spell.invocation-dragons-breath-initial spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE

import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
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
import { isEffectAtom } from "@dnd/surface/surface/types";
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
  type BlurAttackRollDefenseSpellInvocation,
  type SeeInvisibleObserverSightSpellInvocation,
  type MirrorImageHitInterceptionSpellInvocation,
  type BattleActiveEffectExpiration,
  type BattleCreatureState,
  type BattleSpecialSpeedKind,
  type BattleState,
  type BattleD20RollModifierDelta,
  type BattleD20RollModifierKind,
  type AbilityCheckRollModeSpellEffect,
  type AfterHitDamageAndIlluminationSpellInvocation,
  type AfterHitTimedDamageAndSaveSpellInvocation,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  type CreatureSizeChangeSpellInvocation,
  type ConditionRemovalProtectionSpellInvocation,
  type CreatureTypeProtectionSpellInvocation,
  type DamageReductionSpellInvocation,
  type DragonsBreathInitialSpellInvocation,
  type D20RollModifierSpellEffect,
  type JumpMovementReplacementSpellInvocation,
  type HealingSpellActionCost,
  type LevitatedCreatureSpellInvocation,
  MAGIC_WEAPON_ENHANCEMENT_BONUSES,
  type MagicWeaponEnhancementBonus,
  type MarkedDamageRiderCastAbilityCheckBehavior,
  type MarkedDamageRiderRetargetTiming,
  type RollModifierSpellTargeting,
  type ScalarBuffSpellEffect,
  type ScalarBuffSpellTargeting,
  type SelfTransformationModeKind,
  type SelfTransformationModeSpellInvocation,
  type SpellCreatedHeldObjectActiveEffect,
  type SelfTeleportSpellInvocation,
  type SupportedSpellInvocation,
  type ThaumaturgyBoomingVoiceSpellInvocation,
  type WardingBondSpellInvocation,
} from "../battle-reducer.ts";
import {
  characterResourceIsClassFeatureFreeCastForSpell,
  characterResourceIsFavoredEnemyFreeCast,
  resourceHasUsesRemaining,
  type CharacterBattleSpellcastingState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { activeMarkedDamageRiderEffect } from "./damage-helpers.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  HUNTERS_MARK_FINDING_SKILLS,
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_INITIAL_DUPLICATES,
  MIRROR_IMAGE_UNAFFECTED_BY,
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
  SELF_TRANSFORMATION_MODE_KINDS,
  THAUMATURGY_BOOMING_VOICE_DURATION_TICKS,
  THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL,
  WARDING_BOND_ARMOR_CLASS_BONUS,
  WARDING_BOND_CAST_RANGE_FEET,
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "./domain-constants.ts";
import {
  LEVITATE_ALTITUDE_CONTROL_FEET,
  LEVITATE_INITIAL_RISE_FEET,
} from "./levitate-creature.ts";
import { supportedDamageAmountExpr } from "./spells-profiles-save-gates.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "./spells-profile-shared.ts";
import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./spells-active-effects.ts";
export * from "./spells-profiles-healing.ts";
export * from "./spells-profiles-repeated-damage.ts";

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
type SpellActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
type DirectActivationPhase = Extract<
  SpellActivationPhase,
  { readonly kind: "direct" }
>;
type CastTimeEffectModeChoice = NonNullable<DirectActivationPhase["mode"]>;
type CastTimeEffectModeOption = CastTimeEffectModeChoice["options"][number];

function isD20RollModifierSpellProjection(
  projection: RollModifierSpellProjection,
): projection is D20RollModifierSpellProjection {
  return projection.effect.kind === "d20RollModifier";
}

export function supportedPreparedExpeditiousRetreatDashSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const activeEffect = expeditiousRetreatDashActiveEffect(actorId, spell);
  if (activeEffect === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "expeditiousRetreatDash",
            spell,
            actionCost: "bonusAction",
            activeEffect,
          },
        ],
  );
}

export function supportedPreparedJumpMovementReplacementSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = jumpMovementReplacementSpellProjection(actorId, spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const maxTargets = jumpMovementReplacementTargetCount(
      spell,
      slot.spellLevel,
    );
    return maxTargets === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "jumpMovementReplacement",
            spell,
            actionCost: "bonusAction",
            targeting: {
              kind: "targetList",
              minTargets: 1,
              maxTargets,
            },
            ...projection,
          },
        ];
  });
}

export function supportedPreparedDragonsBreathInitialSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const projection = dragonsBreathInitialSpellProjection(
      actorId,
      spell,
      slot.spellLevel,
    );
    return projection === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "dragonsBreathInitial",
            spell,
            actionCost: "bonusAction",
            targeting: {
              kind: "targetList",
              minTargets: 1,
              maxTargets: 1,
            },
            ...projection,
          },
        ];
  });
}

export function supportedPreparedWardingBondSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = wardingBondSpellProjection(actorId, spell);
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
            procedure: "wardingBond",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

export function supportedPreparedSelfTeleportSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = selfTeleportSpellProjection(spell);
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
            procedure: "selfTeleport",
            spell,
            actionCost: "bonusAction",
            ...projection,
          },
        ],
  );
}

export function supportedPreparedFeatherFallMitigationSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = featherFallMitigationSpellProjection(actorId, spell);
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
            procedure: "featherFallMitigation",
            spell,
            targeting: {
              kind: "targetList",
              minTargets: 1,
              maxTargets: 5,
            },
            ...projection,
          },
        ],
  );
}

function featherFallMitigationSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "featherFallMitigation" }
  >,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !==
      "self_or_visible_creature_falls" ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const stateFilter =
    selection !== null &&
    "stateFilter" in selection &&
    Array.isArray(selection.stateFilter)
      ? selection.stateFilter
      : [];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    selection?.mode !== "choose_up_to" ||
    selection.count !== 5 ||
    !sameStringSet(stateFilter, ["falling"]) ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "feather_fall_mitigation" ||
    effect.descentRateCapFeetPerRound !== 60 ||
    effect.landingOutcome !== "no_fall_damage_and_end_for_target"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(spell.mechanics.range.feet),
        activeEffect: {
          kind: "featherFallMitigation",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function wardingBondSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  WardingBondSpellInvocation,
  "activeEffect" | "rangeFeet" | "connectionRangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "caster_target_bond" ||
    spell.mechanics.attachment.range.kind !== "within_feet" ||
    spell.mechanics.attachment.range.feet !==
      Number(WARDING_BOND_CONNECTION_RANGE_FEET) ||
    spell.mechanics.attachment.target.kind !== "hole" ||
    spell.mechanics.attachment.target.value.kind !== "target" ||
    spell.mechanics.attachment.target.value.selection.mode !== "one" ||
    !("disposition" in spell.mechanics.attachment.target.value.selection) ||
    spell.mechanics.attachment.target.value.selection.disposition !==
      "willing" ||
    !sameStringSet(
      spell.mechanics.attachment.target.value.selection.targetKinds ?? [],
      ["creature"],
    ) ||
    !wardingBondMaterialComponentIsSupported(spell) ||
    !wardingBondEarlyEndsAreSupported(spell.mechanics.duration.earlyEnd) ||
    !wardingBondOperationsAreSupported(spell.mechanics.operations)
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: WARDING_BOND_CAST_RANGE_FEET,
        connectionRangeFeet: WARDING_BOND_CONNECTION_RANGE_FEET,
        activeEffect: {
          kind: "wardingBond",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function wardingBondMaterialComponentIsSupported(spell: SpellRecord): boolean {
  if (!("components" in spell.mechanics)) {
    return false;
  }
  const material = spell.mechanics.components.m;
  return (
    typeof material === "object" &&
    material !== null &&
    material.kind === "paired_worn_items" &&
    material.itemKind === "ring" &&
    material.material === "platinum" &&
    material.minimumValueGpEach === 50 &&
    material.requiredFor === "spell_duration" &&
    sameStringSet(material.wornBy, ["caster", "target"])
  );
}

function wardingBondEarlyEndsAreSupported(
  earlyEnds: readonly { readonly kind: string }[] | undefined,
): boolean {
  return (
    Array.isArray(earlyEnds) &&
    earlyEnds.length === 3 &&
    earlyEnds.some((earlyEnd) => earlyEnd.kind === "caster_drops_to_0_hp") &&
    earlyEnds.some(
      (earlyEnd) => earlyEnd.kind === "attached_bond_exceeds_range",
    ) &&
    earlyEnds.some(
      (earlyEnd) => earlyEnd.kind === "spell_cast_again_on_connected_creature",
    )
  );
}

function wardingBondOperationsAreSupported(
  operations: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"],
): boolean {
  return (
    operations.length === 4 &&
    operations.some(wardingBondArmorClassOperationIsSupported) &&
    operations.some(wardingBondSavingThrowOperationIsSupported) &&
    operations.some(wardingBondResistanceOperationIsSupported) &&
    operations.some(wardingBondDamageShareOperationIsSupported)
  );
}

function wardingBondOperationHasAttachedBondWithinRangePredicate(
  operation: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return operation.predicate?.kind === "attached_bond_within_range";
}

function wardingBondArmorClassOperationIsSupported(
  operation: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === WARDING_BOND_ARMOR_CLASS_BONUS &&
    effect.delta.dieSize === 1
  );
}

function wardingBondSavingThrowOperationIsSupported(
  operation: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "modify_roll_numeric" &&
    sameStringSet(effect.on, ["saving_throw"]) &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === WARDING_BOND_SAVING_THROW_BONUS &&
    effect.delta.dieSize === 1
  );
}

function wardingBondResistanceOperationIsSupported(
  operation: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "grant_resistance" &&
    typeof effect.damageType === "object" &&
    effect.damageType !== null &&
    effect.damageType.kind === "all_damage_types"
  );
}

function wardingBondDamageShareOperationIsSupported(
  operation: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    operation.trigger.kind === "on_attached_damaged" &&
    operation.effect.kind === "share_damage_to_caster" &&
    operation.effect.amount === "same_as_attached_damage_taken"
  );
}

function jumpMovementReplacementSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  JumpMovementReplacementSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    selection?.mode !== "choose_up_to" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "jump_movement_replacement" ||
    effect.frequency !== "once_on_each_target_turn" ||
    effect.maxJumpDistanceFeet !== 30 ||
    effect.movementCostFeet !== 10
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "jumpMovementReplacement",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          movementCostFeet: movementFeet(effect.movementCostFeet),
          maxJumpDistanceFeet: movementFeet(effect.maxJumpDistanceFeet),
          usedThisTurn: false,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function dragonsBreathInitialSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): Pick<
  DragonsBreathInitialSpellInvocation,
  "activeEffect" | "damageTypeChoices" | "rangeFeet"
> | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const operation = mechanics.operations[0];
  const selection =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target"
      ? mechanics.attachment.value.selection
      : null;
  const effect = operation?.effect;
  const attachment = effect?.kind === "save_gate" ? effect.attachment : null;
  const damage = effect?.kind === "save_gate" ? effect.onFail : null;
  const damageType = damage?.kind === "damage" ? damage.damageType : null;
  const damageTypeChoice =
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value.kind === "choice"
      ? damageType.value
      : null;
  if (
    mechanics.level !== 2 ||
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "touch" ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 1 ||
    selection?.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    mechanics.operations.length !== 1 ||
    operation === undefined ||
    operation.trigger.kind !== "on_attached_spends_action" ||
    operation.trigger.cost.kind !== "standard_action" ||
    operation.trigger.cost.action !== "magic" ||
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    attachment?.kind !== "area" ||
    !("origin" in attachment) ||
    attachment.origin.kind !== "on_attached_creature" ||
    !("shape" in attachment) ||
    attachment.shape.kind !== "cone" ||
    attachment.shape.lengthFeet !== 15 ||
    effect.onSuccess.kind !== "half_damage" ||
    damage?.kind !== "damage" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.base.dice !== 3 ||
    damage.amount.base.dieSize !== 6 ||
    damage.amount.perLevel.dice !== 1 ||
    damage.amount.startingAtLevel !== 2 ||
    damageTypeChoice === null
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        damageTypeChoices: damageTypeChoice.options,
        activeEffect: {
          kind: "dragonsBreath",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          originalSlotLevel: slotLevel,
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.right,
          },
        },
      };
}

function selfTeleportSpellProjection(
  spell: SpellRecord,
): Pick<SelfTeleportSpellInvocation, "maxDistanceFeet"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "teleport" ||
    effect.destination !== "unoccupied_visible_space" ||
    effect.maxFeet !== 30
  ) {
    return null;
  }
  return { maxDistanceFeet: movementFeet(effect.maxFeet) };
}

function jumpMovementReplacementTargetCount(
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): number | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return null;
  }
  return scalarBuffSpellTargetCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
    slotLevel,
  );
}

function expeditiousRetreatDashActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
):
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "expeditiousRetreatDash" }
    >["activeEffect"]
  | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const initialPhase = mechanics.initialPhase;
  const operation = mechanics.operations[0];
  if (
    mechanics.level !== 1 ||
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "self" ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 10 ||
    mechanics.attachment.kind !== "self" ||
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    initialPhase.effects?.length !== 1 ||
    mechanics.operations.length !== 1 ||
    operation === undefined
  ) {
    return null;
  }
  const initialEffect = initialPhase.effects[0];
  if (
    initialEffect?.kind !== "take_standard_action" ||
    initialEffect.action !== "dash" ||
    initialEffect.cost !== "included_in_effect" ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "grant_alternate_action_cost" ||
    operation.effect.from.kind !== "standard_action" ||
    operation.effect.from.actions.length !== 1 ||
    operation.effect.from.actions[0] !== "dash" ||
    operation.effect.to.kind !== "bonus_action"
  ) {
    return null;
  }
  return {
    kind: "spellDashBonusAction",
    sourceSpellId: spell.id,
    sourceCombatantId: actorId,
    expiresAt: { kind: "concentration", combatantId: actorId },
  };
}

export function supportedPreparedScalarBuffSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = scalarBuffSpellProjection(spell);
  if (projection === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const targeting = scalarBuffSpellTargeting(
      projection.attachment,
      spell.mechanics.level,
      slot.spellLevel,
    );
    const scalarEffect = scalarBuffSpellEffect(
      actorId,
      spell,
      projection.effect,
      projection.duration,
      spell.mechanics.level,
      slot.spellLevel,
    );
    return targeting === null || scalarEffect === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "scalarBuff",
            spell,
            actionCost: projection.actionCost,
            targeting,
            effect: scalarEffect,
            rangeFeet: projection.rangeFeet,
          },
        ];
  });
}

export function supportedPreparedSelfTransformationModeSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SelfTransformationModeSpellInvocation[] {
  const projection = selfTransformationModeSpellProjection({
    actorId,
    spell,
    spellcastingAbilityModifier,
    proficiencyBonus,
  });
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap(
    (slot): readonly SelfTransformationModeSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "selfTransformationMode",
              spell,
              actionCost: "magicAction",
              modeChoices: projection.modeChoices,
              naturalWeaponFacts: projection.naturalWeaponFacts,
              expiresAt: projection.expiresAt,
            },
          ],
  );
}

function selfTransformationModeSpellProjection(input: {
  readonly actorId: CombatantId;
  readonly spell: SpellRecord;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}): Pick<
  SelfTransformationModeSpellInvocation,
  "modeChoices" | "naturalWeaponFacts" | "expiresAt"
> | null {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase === undefined ||
    phase.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects !== undefined ||
    phase.mode?.allowsMidDurationSwitchAs !== "magic_action"
  ) {
    return null;
  }
  const modeProjection = selfTransformationModeOptionsProjection(
    phase.mode.options,
    input.spellcastingAbilityModifier,
    input.proficiencyBonus,
  );
  if (modeProjection === null) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        modeChoices: modeProjection.modeChoices,
        naturalWeaponFacts: modeProjection.naturalWeaponFacts,
        expiresAt: {
          kind: "concentration",
          combatantId: input.actorId,
          durationTicks: durationTicks.right,
        },
      };
}

function selfTransformationModeOptionsProjection(
  options: CastTimeEffectModeChoice["options"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): Pick<
  SelfTransformationModeSpellInvocation,
  "modeChoices" | "naturalWeaponFacts"
> | null {
  const naturalWeaponFacts = options.reduce<
    SelfTransformationModeSpellInvocation["naturalWeaponFacts"] | null
  >(
    (projected, option) =>
      projected ??
      selfTransformationNaturalWeaponProjection(
        option.effects,
        spellcastingAbilityModifier,
        proficiencyBonus,
      ),
    null,
  );
  const modeChoices = SELF_TRANSFORMATION_MODE_KINDS.filter((mode) =>
    selfTransformationModeIsSupportedByOptions(mode, options),
  );
  const [firstMode, ...restModes] = modeChoices;
  return naturalWeaponFacts === null ||
    firstMode === undefined ||
    modeChoices.length !== SELF_TRANSFORMATION_MODE_KINDS.length
    ? null
    : {
        modeChoices: [firstMode, ...restModes],
        naturalWeaponFacts,
      };
}

function selfTransformationModeIsSupportedByOptions(
  mode: SelfTransformationModeKind,
  options: CastTimeEffectModeChoice["options"],
): boolean {
  return options.some((option) =>
    Match.value(mode).pipe(
      Match.when("aquaticAdaptation", () =>
        effectsAreAquaticAdaptation(option.effects),
      ),
      Match.when("changeAppearance", () => option.effects === undefined),
      Match.when("naturalWeapons", () =>
        effectsAreNaturalWeapons(option.effects),
      ),
      Match.exhaustive,
    ),
  );
}

function effectsAreAquaticAdaptation(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): boolean {
  return (
    effects?.length === 2 &&
    effects.some((effect) => effect.kind === "water_breathing") &&
    effects.some(
      (effect) =>
        effect.kind === "grant_speed" &&
        effect.speedKind === "swim" &&
        typeof effect.feet !== "number" &&
        effect.feet.kind === "walk_speed",
    )
  );
}

function effectsAreNaturalWeapons(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): boolean {
  return selfTransformationNaturalWeaponsEffect(effects) !== null;
}

function selfTransformationNaturalWeaponProjection(
  effects: CastTimeEffectModeOption["effects"] | undefined,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): SelfTransformationModeSpellInvocation["naturalWeaponFacts"] | null {
  const effect = selfTransformationNaturalWeaponsEffect(effects);
  if (effect === null) {
    return null;
  }
  const damageTypeChoices = uniqueDamageTypeChoices(
    effect.damageType.options.map((option) => option.damageType),
  );
  return damageTypeChoices === null
    ? null
    : {
        damage: {
          dice: 1,
          dieSize: effect.damageDie,
          damageTypeChoices,
        },
        spellcastingAbilityModifier,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      };
}

function selfTransformationNaturalWeaponsEffect(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): Extract<EffectAtom, { readonly kind: "natural_weapons" }> | null {
  if (effects?.length !== 1) {
    return null;
  }
  const effect = effects[0];
  if (
    effect === undefined ||
    effect.kind !== "natural_weapons" ||
    effect.damageDie !== 6 ||
    effect.replacesAbility !== "str" ||
    effect.attackRollAbility !== "spellcasting" ||
    effect.damageRollAbility !== "spellcasting"
  ) {
    return null;
  }
  return effect;
}

function uniqueDamageTypeChoices(
  damageTypes: readonly DamageType[],
): readonly [DamageType, ...DamageType[]] | null {
  const unique: DamageType[] = [];
  for (const damageType of damageTypes) {
    if (!unique.includes(damageType)) {
      unique.push(damageType);
    }
  }
  const [first, ...rest] = unique;
  return first === undefined ? null : [first, ...rest];
}

function scalarBuffSpellProjection(spell: SpellRecord): {
  readonly actionCost: HealingSpellActionCost;
  readonly rangeFeet: MovementFeet;
  readonly attachment: Attachment;
  readonly duration: SpellRecord["mechanics"]["duration"];
  readonly effect: EffectAtom | OngoingEffect;
} | null {
  const actionCost = scalarBuffSpellActionCost(spell.mechanics.castingTime);
  const rangeFeet = scalarBuffSpellRangeFeet(spell.mechanics.range);
  if (actionCost === null || rangeFeet === null) {
    return null;
  }

  if (spell.mechanics.family === "activation") {
    const phase = spell.mechanics.phases[0];
    const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
    return spell.mechanics.phases.length !== 1 ||
      phase?.kind !== "direct" ||
      phase.effects?.length !== 1 ||
      effect === undefined ||
      !isEffectAtom(effect)
      ? null
      : {
          actionCost,
          rangeFeet,
          attachment: phase.attachment,
          duration: spell.mechanics.duration,
          effect,
        };
  }

  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }

  const operation = spell.mechanics.operations[0];
  return spell.mechanics.initialPhase !== undefined ||
    spell.mechanics.operations.length !== 1 ||
    operation === undefined ||
    operation.trigger.kind !== "passive" ||
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined
    ? null
    : {
        actionCost,
        rangeFeet,
        attachment: spell.mechanics.attachment,
        duration: spell.mechanics.duration,
        effect: operation.effect,
      };
}

export function supportedPreparedRollModifierSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.level < 1) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const projection = rollModifierSpellProjection(
      actorId,
      spell,
      slot.spellLevel,
    );
    if (projection === null) {
      return [];
    }
    const base = {
      access: { tag: "prepared" as const },
      resource: { tag: "spellSlot" as const, slotLevel: slot.spellLevel },
      procedure: "rollModifier" as const,
      spell,
      actionCost: "magicAction" as const,
      targeting: projection.targeting,
      rangeFeet: projection.rangeFeet,
      saveGate: projection.saveGate,
    };
    if (isD20RollModifierSpellProjection(projection)) {
      return [
        {
          ...base,
          effect: projection.effect,
          skillChoices: projection.skillChoices,
          abilityChoices: null,
        },
      ];
    }
    return [
      {
        ...base,
        effect: projection.effect,
        skillChoices: null,
        abilityChoices: projection.abilityChoices,
        abilityChoiceApplication: projection.abilityChoiceApplication,
      },
    ];
  });
}

export function supportedPreparedCreatureSizeChangeSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projections = creatureSizeChangeSpellProjection(actorId, spell);
  if (projections.length === 0) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : projections.map((projection) => ({
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          spell,
          actionCost: "magicAction",
          ...projection,
        })),
  );
}

export function supportedPreparedLevitatedCreatureSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = levitatedCreatureSpellProjection(actorId, spell);
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
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

function levitatedCreatureSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Omit<
  LevitatedCreatureSpellInvocation,
  "access" | "resource" | "spell" | "actionCost"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.saveAppliesIf !== "unwilling_creature_target" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.onSuccess.kind !== "none" ||
    phase.onFail.kind !== "levitate_target"
  ) {
    return null;
  }
  const selection = phase.attachment.value.selection;
  const objectFilter =
    "objectFilter" in selection ? selection.objectFilter : undefined;
  const effect = phase.onFail;
  if (
    selection.mode !== "one" ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature", "object"]) ||
    objectFilter?.targetRelation !== "loose" ||
    objectFilter?.maxWeightPounds !== 500 ||
    effect.initialRiseMaxFeet !== 20 ||
    effect.suspension !== "spell_duration" ||
    effect.targetMovement.allowedBy !==
      "push_or_pull_fixed_object_or_surface_within_reach" ||
    effect.targetMovement.movementMode !== "as_if_climbing" ||
    effect.casterAltitudeControl.maxDistanceFeet !== 20 ||
    effect.casterAltitudeControl.direction !== "up_or_down" ||
    effect.casterAltitudeControl.cost !== "magic_action_on_caster_turn" ||
    effect.casterAltitudeControl.targetMustRemainWithinSpellRange !== true ||
    effect.selfAltitudeControl.maxDistanceFeet !== 20 ||
    effect.selfAltitudeControl.direction !== "up_or_down" ||
    effect.selfAltitudeControl.cost !== "part_of_move" ||
    effect.ending !== "float_gently_to_ground_if_aloft"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }
  return {
    procedure: "levitatedCreature",
    ability: "con",
    dc: phase.dc,
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    rangeFeet: movementFeet(60),
    maxInitialRiseFeet: LEVITATE_INITIAL_RISE_FEET,
    activeEffect: {
      kind: "spellLevitatedCreature",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      maxAltitudeChangeFeet: LEVITATE_ALTITUDE_CONTROL_FEET,
      rangeFeet: movementFeet(60),
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.right,
      },
    },
  };
}

function creatureSizeChangeSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly Pick<
  CreatureSizeChangeSpellInvocation,
  | "procedure"
  | "ability"
  | "dc"
  | "targeting"
  | "activeEffect"
  | "rangeFeet"
>[] {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.saveAppliesIf !== "unwilling_creature_target" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return [];
  }
  const targetSelection = phase.attachment.value.selection;
  const objectFilter =
    "objectFilter" in targetSelection ? targetSelection.objectFilter : undefined;
  if (
    targetSelection?.mode !== "one" ||
    targetSelection.targetKinds === undefined ||
    !sameStringSet(targetSelection.targetKinds, ["creature", "object"]) ||
    objectFilter?.visibility !== "caster_can_see" ||
    objectFilter?.targetRelation !== "not_worn_or_carried" ||
    phase.onSuccess.kind !== "none" ||
    phase.onFail.kind !== "choose_effect_mode"
  ) {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return [];
  }
  return phase.onFail.options.flatMap(
    (
      option,
    ): readonly Pick<
      CreatureSizeChangeSpellInvocation,
      | "procedure"
      | "ability"
      | "dc"
      | "targeting"
      | "activeEffect"
      | "rangeFeet"
    >[] => {
      const activeEffect = creatureSizeChangeActiveEffect(
        actorId,
        spell,
        option.effects,
        durationTicks.right,
      );
      if (activeEffect === null) {
        return [];
      }
      return [
        {
          procedure:
            activeEffect.direction === "increase"
              ? "creatureSizeIncrease"
              : "creatureSizeDecrease",
          ability: "con",
          dc: phase.dc,
          targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
          activeEffect,
          rangeFeet: movementFeet(30),
        },
      ];
    },
  );
}

function creatureSizeChangeActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effects: readonly OngoingEffect[],
  durationTicks: ElapsedTimeTicks,
): CreatureSizeChangeSpellInvocation["activeEffect"] | null {
  const size = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_size_category" }
    > => effect.kind === "modify_size_category",
  );
  const abilityCheck = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["ability_check"]),
  );
  const savingThrow = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["saving_throw"]),
  );
  const damage = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_damage_numeric" }
    > => effect.kind === "modify_damage_numeric",
  );
  if (
    effects.length !== 4 ||
    size === undefined ||
    size.steps !== 1 ||
    abilityCheck === undefined ||
    savingThrow === undefined ||
    damage === undefined ||
    abilityCheck.mode !== savingThrow.mode ||
    !Array.isArray(abilityCheck.abilityFilter) ||
    !sameStringSet(abilityCheck.abilityFilter, ["str"]) ||
    abilityCheck.skillFilter !== undefined ||
    !Array.isArray(savingThrow.saveAbilityFilter) ||
    !sameStringSet(savingThrow.saveAbilityFilter, ["str"]) ||
    damage.delta.kind !== "fixed_dice" ||
    damage.delta.dice !== 1 ||
    damage.delta.dieSize !== 4 ||
    damage.damageSourceFilter?.kind !== "attack_hit" ||
    damage.damageSourceFilter.attackRollFilter !== "weapon_or_unarmed_strike"
  ) {
    return null;
  }
  if (
    (size.direction === "increase" &&
      (abilityCheck.mode !== "advantage" ||
        damage.delta.sign !== "+" ||
        damage.minimumDamageTotal !== undefined)) ||
    (size.direction === "decrease" &&
      (abilityCheck.mode !== "disadvantage" ||
        damage.delta.sign !== "-" ||
        damage.minimumDamageTotal !== 1))
  ) {
    return null;
  }
  return {
    kind: "spellCreatureSizeChange",
    sourceSpellId: spell.id,
    sourceCombatantId: actorId,
    direction: size.direction,
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks,
    },
  };
}

export function supportedPreparedCreatureTypeProtectionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = creatureTypeProtectionSpellProjection(actorId, spell);
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
            procedure: "creatureTypeProtection",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

export function supportedPreparedBlurAttackRollDefenseSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = blurAttackRollDefenseSpellProjection(actorId, spell);
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
            procedure: "blurAttackRollDefense",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

export function supportedPreparedSeeInvisibleObserverSightSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = seeInvisibleObserverSightSpellProjection(actorId, spell);
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
            procedure: "seeInvisibleObserverSight",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
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

export function supportedPreparedConditionRemovalProtectionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = conditionRemovalProtectionSpellProjection(actorId, spell);
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
            procedure: "conditionRemovalProtection",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ],
  );
}

function blurAttackRollDefenseSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<BlurAttackRollDefenseSpellInvocation, "activeEffect"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 1 ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    (effect.affects ?? "rolls_against_self") !== "rolls_against_self" ||
    !sameStringSet(effect.on, ["attack_roll"]) ||
    effect.attackerTypeFilter !== undefined ||
    expiresAt?.kind !== "concentration"
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "blurred",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt,
    },
  };
}

function seeInvisibleObserverSightSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<SeeInvisibleObserverSightSpellInvocation, "activeEffect"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const durationTicks = elapsedTimeTicksFromHours(
    spell.mechanics.duration.value.amount,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 1 ||
    effect?.kind !== "see_invisible_and_ethereal" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "seeInvisibleAndEthereal",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt: {
        kind: "duration",
        durationTicks: durationTicks.right,
      },
    },
  };
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

export function conditionRemovalProtectionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  ConditionRemovalProtectionSpellInvocation,
  "protection" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const composite =
    phase?.kind === "direct" && phase.effects?.[0]?.kind === "composite"
      ? phase.effects[0]
      : null;
  const effects = composite?.effects ?? [];
  const conditionRemoval = effects.find(
    (effect) => effect.kind === "remove_condition",
  );
  const conditionSaveRollMode = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const damageResistance = effects.find(
    (effect) => effect.kind === "grant_resistance",
  );
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    composite === null ||
    effects.length !== 3 ||
    conditionRemoval?.kind !== "remove_condition" ||
    conditionRemoval.condition !== "poisoned" ||
    conditionSaveRollMode?.kind !== "modify_roll_advantage" ||
    (conditionSaveRollMode.affects ?? "self_roll") !== "self_roll" ||
    conditionSaveRollMode.mode !== "advantage" ||
    !sameStringSet(conditionSaveRollMode.on, ["saving_throw"]) ||
    conditionSaveRollMode.conditionFilter === undefined ||
    !sameStringSet(conditionSaveRollMode.conditionFilter, ["poisoned"]) ||
    conditionSaveRollMode.skillFilter !== undefined ||
    conditionSaveRollMode.abilityFilter !== undefined ||
    conditionSaveRollMode.saveAbilityFilter !== undefined ||
    conditionSaveRollMode.saveSourceFilter !== undefined ||
    conditionSaveRollMode.contextRangeFeet !== undefined ||
    conditionSaveRollMode.spellSourceFilter !== undefined ||
    conditionSaveRollMode.attackerTypeFilter !== undefined ||
    conditionSaveRollMode.count !== undefined ||
    conditionSaveRollMode.expiresOn !== undefined ||
    damageResistance?.kind !== "grant_resistance" ||
    damageResistance.damageType !== "poison" ||
    damageResistance.sourceFilter !== undefined ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    protection: {
      conditionSaveRollMode: {
        kind: "conditionSavingThrowRollMode",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: "poisoned",
        mode: "advantage",
        expiresAt,
      },
      damageResistance: {
        kind: "damageResistance",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        damageType: "poison",
        expiresAt,
      },
    },
    rangeFeet: movementFeet(5),
  };
}

export function creatureTypeProtectionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    effects.length !== 1 ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    effect.on.length !== 1 ||
    effect.on[0] !== "attack_roll" ||
    effect.attackerTypeFilter === undefined ||
    !sameCreatureTypeSet(
      effect.attackerTypeFilter,
      PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
    ) ||
    expiresAt === null
  ) {
    return null;
  }

  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    activeEffect: {
      kind: "creatureTypeProtection",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      attackRollMode: "disadvantage",
      protectedAgainstCreatureTypes: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
      ],
      preventedConditions: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
      ],
      preventsPossession: true,
      expiresAt,
    },
    rangeFeet: movementFeet(5),
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

export function supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
): readonly SupportedSpellInvocation[] {
  const projection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellProjection(
      actorId,
      spell,
      spellcastingAbilityModifier,
    );
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const maxTargets = scalarBuffSpellTargetCount(
      projection.targetSelection,
      spell.mechanics.level,
      slot.spellLevel,
    );
    return maxTargets === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
            spell,
            actionCost: "magicAction",
            targeting: {
              kind: "targetList",
              minTargets: 1,
              maxTargets,
            },
            activeEffects: projection.activeEffects,
            rangeFeet: movementFeet(5),
          },
        ];
  });
}

export function conditionImmunityAndTurnStartTemporaryHitPointsSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
): {
  readonly targetSelection: TargetSelection;
  readonly activeEffects: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["activeEffects"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.operations.length !== 2
  ) {
    return null;
  }
  const immunityOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "grant_condition_immunity" &&
      operation.effect.condition === "frightened",
  );
  const temporaryHitPointsOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_attached_turn_start" &&
      operation.effect.kind === "grant_temp_hp",
  );
  if (
    immunityOperation === undefined ||
    temporaryHitPointsOperation === undefined ||
    temporaryHitPointsOperation.effect.kind !== "grant_temp_hp" ||
    !isSpellcastingModifierTemporaryHitPointsAmount(
      temporaryHitPointsOperation.effect.amount,
    )
  ) {
    return null;
  }
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (expiresAt === null) {
    return null;
  }
  return {
    targetSelection: spell.mechanics.attachment.value.selection,
    activeEffects: [
      {
        kind: "conditionImmunity",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: "frightened",
        expiresAt,
      },
      {
        kind: "turnStartTemporaryHitPoints",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        amount: Number(spellcastingAbilityModifier),
        expiresAt,
      },
    ],
  };
}

export function isSpellcastingModifierTemporaryHitPointsAmount(
  amount: SurfaceDiceAmount,
): boolean {
  return (
    amount.kind === "fixed" &&
    amount.expr.dice === 0 &&
    amount.expr.dieSize === 1 &&
    (amount.expr.flat ?? 0) === 0 &&
    amount.expr.spellcastingMod === true
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

export function supportedPreparedWeaponDamageRiderSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.operations.length !== 1
  ) {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== "radiant" ||
    operation.effect.amount === undefined ||
    expiresAt === null
  ) {
    return [];
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  if (expr === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "weaponDamageRider",
            spell,
            actionCost: "bonusAction",
            activeEffect: {
              kind: "spellWeaponDamageRider",
              sourceSpellId: spell.id,
              sourceCombatantId: actorId,
              damage: {
                expr,
                damageType: "radiant",
              },
              expiresAt,
            },
          },
        ],
  );
}

export function supportedPreparedMagicWeaponEnhancementSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = magicWeaponEnhancementProjection(spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const bonus = magicWeaponEnhancementBonusForSlot(
      projection.bonus,
      slot.spellLevel,
    );
    return bonus === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "magicWeaponEnhancement",
            spell,
            actionCost: "bonusAction",
            bonus,
            durationTicks: projection.durationTicks,
          },
        ];
  });
}

type MagicWeaponEnhancementProjection = {
  readonly durationTicks: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "duration" }
  >["durationTicks"];
  readonly bonus: Extract<
    EffectAtom,
    { readonly kind: "grant_magic_weapon_enhancement" }
  >["bonus"];
};

function magicWeaponEnhancementProjection(
  spell: SpellRecord,
): MagicWeaponEnhancementProjection | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    !magicWeaponAttachmentIsSupported(spell.mechanics.attachment) ||
    !magicWeaponDurationEarlyEndIsSupported(spell.mechanics.duration) ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "grant_magic_weapon_enhancement" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    bonus: operation.effect.bonus,
  };
}

function magicWeaponAttachmentIsSupported(attachment: Attachment): boolean {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "object" &&
    attachment.value.count === 1 &&
    attachment.value.filter?.objectKind === "weapon" &&
    attachment.value.filter.magicality === "nonmagical"
  );
}

function magicWeaponDurationEarlyEndIsSupported(
  duration: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "timed" }
  >,
): boolean {
  const earlyEnd = duration.earlyEnd ?? [];
  return earlyEnd.length === 1 && earlyEnd[0]?.kind === "caster_recasts_spell";
}

function magicWeaponEnhancementBonusForSlot(
  bonus: MagicWeaponEnhancementProjection["bonus"],
  slotLevel: SpellSlotLevel,
): MagicWeaponEnhancementBonus | null {
  if (
    bonus.kind !== "threshold_tiers" ||
    bonus.axis !== "slot" ||
    bonus.sign !== "+"
  ) {
    return null;
  }
  const base = magicWeaponEnhancementBonusFromNumber(bonus.base);
  if (base === null) {
    return null;
  }
  return bonus.tiers.reduce<MagicWeaponEnhancementBonus | null>(
    (current, tier) => {
      if (current === null) {
        return null;
      }
      if (Number(slotLevel) < tier.atLevel) {
        return current;
      }
      return magicWeaponEnhancementBonusFromNumber(tier.value);
    },
    base,
  );
}

function magicWeaponEnhancementBonusFromNumber(
  value: number,
): MagicWeaponEnhancementBonus | null {
  return isMagicWeaponEnhancementBonus(value) ? value : null;
}

function isMagicWeaponEnhancementBonus(
  value: number,
): value is MagicWeaponEnhancementBonus {
  return MAGIC_WEAPON_ENHANCEMENT_BONUSES.some((bonus) => bonus === value);
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

export function supportedPreparedMarkedDamageRiderSpellProfile(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = markedDamageRiderSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  const { abilityCheckBehavior, damageType, expr, rangeFeet, retargetTiming } =
    projection;
  const activeMark = activeMarkedDamageRiderEffect(actor, spell.id);
  if (activeMark !== null) {
    // TODO: Allow an ordinary recast while the current mark is still active.
    // RAW permits replacing Concentration by casting the spell again and
    // choosing a new quarry; this branch currently exposes only the slotless
    // Bonus Action transfer after the marked target drops to 0 Hit Points.
    return markedDamageRiderTransferIsDiscoverable(activeMark, state)
      ? [
          {
            access: { tag: "prepared" },
            resource: { tag: "none" },
            procedure: "markedDamageRider",
            action: "transfer",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "singleCombatant" },
            damage: { expr, damageType },
            rangeFeet,
            activeEffect: activeMark,
          },
        ]
      : [];
  }
  const favoredEnemyResource =
    actor.origin.kind === "character"
      ? actor.origin.resources.find(
          (resource) =>
            characterResourceIsFavoredEnemyFreeCast(resource) &&
            resourceHasUsesRemaining(resource),
        )
      : undefined;
  const favoredEnemyExpiresAt = markedDamageRiderConcentrationExpirationForSlot(
    actor.combatantId,
    spell,
    spellSlotLevel(1),
  );
  const freeCastInvocations: readonly SupportedSpellInvocation[] =
    favoredEnemyResource === undefined || favoredEnemyExpiresAt === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: {
              tag: "classFeatureFreeCast",
              resourceUnitId: favoredEnemyResource.unit.id,
            },
            procedure: "markedDamageRider",
            action: "cast",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "singleCombatant" },
            damage: { expr, damageType },
            abilityCheckBehavior,
            retargetTiming,
            rangeFeet,
            expiresAt: favoredEnemyExpiresAt,
          },
        ];
  const slotInvocations = spellSlots.flatMap(
    (slot): readonly SupportedSpellInvocation[] => {
      const expiresAt = markedDamageRiderConcentrationExpirationForSlot(
        actor.combatantId,
        spell,
        slot.spellLevel,
      );
      return Number(slot.spellLevel) < spell.mechanics.level ||
        expiresAt === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "markedDamageRider",
              action: "cast",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "singleCombatant" },
              damage: { expr, damageType },
              abilityCheckBehavior,
              retargetTiming,
              rangeFeet,
              expiresAt,
            },
          ];
    },
  );
  return [...freeCastInvocations, ...slotInvocations];
}

function markedDamageRiderTransferIsDiscoverable(
  activeMark: Extract<
    BattleCreatureState["activeEffects"][number],
    { readonly kind: "spellMarkedDamageRider" }
  >,
  state: BattleState | undefined,
): boolean {
  if (activeMark.transfer.kind === "available") {
    return true;
  }
  if (activeMark.transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    state !== undefined &&
    (currentActorId(state) !== activeMark.transfer.droppedOnTurn.actorId ||
      state.initiative.round !== activeMark.transfer.droppedOnTurn.round)
  );
}

function markedDamageRiderSpellProjection(spell: SpellRecord): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "mark" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.duration.kind !== "concentration"
  ) {
    return null;
  }

  if (spell.mechanics.operations.length === 1) {
    return markedDamageRiderDamageProjection(
      spell,
      "force",
      {
        kind: "findingAdvantage",
        ability: "wis",
        skills: HUNTERS_MARK_FINDING_SKILLS,
      },
      "sameTurn",
    );
  }

  if (spell.mechanics.operations.length === 2) {
    const passive = spell.mechanics.operations[1];
    const abilityChoices = hexAbilityChoices(passive?.effect);
    return abilityChoices === null
      ? null
      : markedDamageRiderDamageProjection(
          spell,
          "necrotic",
          { kind: "chosenAbilityDisadvantage", choices: abilityChoices },
          "laterTurn",
        );
  }

  return null;
}

function markedDamageRiderDamageProjection(
  spell: SpellRecord,
  damageType: DamageType,
  abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior,
  retargetTiming: MarkedDamageRiderRetargetTiming,
): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  const mechanics = spell.mechanics;
  if (
    mechanics.family !== "ongoing_effect" ||
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number"
  ) {
    return null;
  }
  const operation = mechanics.operations[0];
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== damageType ||
    operation.effect.amount === undefined
  ) {
    return null;
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  return expr === null
    ? null
    : {
        abilityCheckBehavior,
        damageType,
        expr,
        rangeFeet: movementFeet(mechanics.range.feet),
        retargetTiming,
      };
}

function hexAbilityChoices(effect: unknown): readonly Ability[] | null {
  const candidate =
    typeof effect === "object" && effect !== null
      ? (effect as Partial<
          Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>
        >)
      : null;
  const abilityFilter = candidate?.abilityFilter as unknown;
  if (
    candidate?.kind !== "modify_roll_advantage" ||
    candidate.mode !== "disadvantage" ||
    (candidate.affects ?? "self_roll") !== "self_roll" ||
    candidate.on === undefined ||
    !sameStringSet(candidate.on, ["ability_check"]) ||
    abilityFilter === undefined ||
    Array.isArray(abilityFilter) ||
    typeof abilityFilter !== "object" ||
    abilityFilter === null
  ) {
    return null;
  }
  const filter = abilityFilter as {
    readonly kind?: unknown;
    readonly value?: {
      readonly kind?: unknown;
      readonly options?: readonly Ability[];
    };
  };
  if (filter.kind !== "hole" || filter.value?.kind !== "choice") {
    return null;
  }
  const options = filter.value.options;
  if (options === undefined) {
    return null;
  }
  return sameStringSet(options, ["str", "dex", "con", "int", "wis", "cha"])
    ? options
    : null;
}

function markedDamageRiderConcentrationExpirationForSlot(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
> | null {
  if (
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    !hasSupportedMarkedDamageRiderDurationTiers(spell.mechanics.duration.upTo)
  ) {
    return null;
  }
  const upTo = spell.mechanics.duration.upTo;
  const amount =
    upTo.upcastTiers?.reduce(
      (currentAmount, tier) =>
        Number(slotLevel) >= tier.atSlot ? tier.amount : currentAmount,
      upTo.amount,
    ) ?? upTo.amount;
  const ticks = elapsedTimeTicksFromTimeSpanDuration({
    unit: upTo.unit,
    amount,
  });
  return Either.isLeft(ticks)
    ? null
    : {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: ticks.right,
      };
}

function hasSupportedMarkedDamageRiderDurationTiers(
  upTo: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "concentration" }
  >["upTo"],
): boolean {
  const tiers = upTo.upcastTiers ?? [];
  return (
    durationTiersEqual(tiers, [
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ]) ||
    durationTiersEqual(tiers, [
      { atSlot: 2, amount: 4 },
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ])
  );
}

function durationTiersEqual(
  tiers: readonly { readonly atSlot: number; readonly amount: number }[],
  expected: readonly { readonly atSlot: number; readonly amount: number }[],
): boolean {
  return (
    tiers.length === expected.length &&
    tiers.every(
      (tier, index) =>
        tier.atSlot === expected[index]?.atSlot &&
        tier.amount === expected[index]?.amount,
    )
  );
}

export function supportedCantripRollModifierSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.level !== 0) {
    return [];
  }
  const projection = rollModifierSpellProjection(
    actorId,
    spell,
    spellSlotLevel(0),
  );
  if (projection === null) {
    return [];
  }
  const base = {
    access: { tag: "classCantrip" as const },
    resource: { tag: "none" as const },
    procedure: "rollModifier" as const,
    spell,
    actionCost: "magicAction" as const,
    targeting: projection.targeting,
    rangeFeet: projection.rangeFeet,
    saveGate: projection.saveGate,
  };
  if (isD20RollModifierSpellProjection(projection)) {
    return [
      {
        ...base,
        effect: projection.effect,
        skillChoices: projection.skillChoices,
        abilityChoices: null,
      },
    ];
  }
  return [
    {
      ...base,
      effect: projection.effect,
      skillChoices: null,
      abilityChoices: projection.abilityChoices,
      abilityChoiceApplication: projection.abilityChoiceApplication,
    },
  ];
}

export function supportedCantripThaumaturgyBoomingVoiceSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly ThaumaturgyBoomingVoiceSpellInvocation[] {
  const projection = thaumaturgyBoomingVoiceProjection(actorId, spell);
  return projection === null
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "thaumaturgyBoomingVoice",
          spell,
          actionCost: "magicAction",
          ...projection,
        },
      ];
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

export function supportedCantripDamageReductionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  const projection = damageReductionSpellProjection(actorId, spell);
  return projection === null
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "damageReduction",
          spell,
          actionCost: "magicAction",
          ...projection,
        },
      ];
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
    isBattleSpecialSpeedKind(effect.speedKind)
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

function isBattleSpecialSpeedKind(
  speedKind: Extract<EffectAtom, { readonly kind: "grant_speed" }>["speedKind"],
): speedKind is BattleSpecialSpeedKind {
  return BATTLE_SPECIAL_SPEED_KINDS.some((kind) => kind === speedKind);
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

export function damageReductionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  DamageReductionSpellInvocation,
  "amount" | "damageTypeChoices" | "expiresAt" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const effect = operation?.effect;
  const damageType =
    effect?.kind === "reduce_damage_taken" ? effect.damageType : undefined;
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    effect?.kind !== "reduce_damage_taken" ||
    effect.amount.kind !== "fixed" ||
    effect.amount.expr.dice !== 1 ||
    effect.amount.expr.dieSize !== 4 ||
    (effect.amount.expr.flat ?? 0) !== 0 ||
    typeof damageType !== "object" ||
    damageType?.kind !== "hole" ||
    expiresAt === null
  ) {
    return null;
  }
  const choiceValue = damageType.value;
  if (typeof choiceValue !== "object" || choiceValue.kind !== "choice") {
    return null;
  }
  const choices = choiceValue.options.filter((option): option is DamageType =>
    Schema.is(DamageTypeSchema)(option),
  );
  if (choices.length !== choiceValue.options.length) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    damageTypeChoices: choices,
    amount: { dice: 1, dieSize: 4 },
    expiresAt,
    rangeFeet: movementFeet(5),
  };
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
