// Support, defensive, and rider spell profile projections extracted from spells-profiles.ts.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import {
  movementDeltaFeet,
  movementFeet,
  spellSlotLevel,
  type AbilityModifier,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import { isEffectAtom } from "@dnd/surface/surface/types";
import type {
  Attachment,
  DamageType,
  DiceExpr,
  EffectAtom,
  Skill,
  SkillFilter,
  SpellRecord,
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { Either, Match, Schema } from "effect";
import {
  BATTLE_D20_ROLL_MODIFIER_KINDS,
  type BattleActiveEffectExpiration,
  type BattleCreatureState,
  type BattleD20RollModifierDelta,
  type BattleD20RollModifierKind,
  type AfterHitTimedDamageAndSaveSpellInvocation,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  type CreatureTypeProtectionSpellInvocation,
  type DamageReductionSpellInvocation,
  type JumpMovementReplacementSpellInvocation,
  type HealingSpellActionCost,
  type RollModifierSpellEffect,
  type RollModifierSpellInvocation,
  type RollModifierSpellTargeting,
  type ScalarBuffSpellEffect,
  type ScalarBuffSpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  characterResourceIsFavoredEnemyFreeCast,
  resourceHasUsesRemaining,
  type CharacterBattleSpellcastingState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { activeMarkedDamageRiderEffect } from "./damage-helpers.ts";
import {
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
} from "./domain-constants.ts";
import { supportedDamageAmountExpr } from "./spells-profiles-save-gates.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "./spells-profile-shared.ts";
export * from "./spells-profiles-healing.ts";
export * from "./spells-profiles-repeated-damage.ts";

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
    spell.name !== "Feather Fall" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Feather Fall" ||
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

function jumpMovementReplacementSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  JumpMovementReplacementSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.name !== "Jump" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Jump" ||
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
    spell.name !== "Expeditious Retreat" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !==
      "Spells/Descriptions-E-L#Expeditious Retreat" ||
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
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const actionCost = scalarBuffSpellActionCost(spell.mechanics.castingTime);
  const rangeFeet = scalarBuffSpellRangeFeet(spell.mechanics.range);
  if (
    actionCost === null ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.effects?.length !== 1 ||
    effect === undefined ||
    !isEffectAtom(effect)
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const targeting = scalarBuffSpellTargeting(
      phase.attachment,
      spell.mechanics.level,
      slot.spellLevel,
    );
    const scalarEffect = scalarBuffSpellEffect(
      actorId,
      spell,
      effect,
      spell.mechanics.duration,
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
            actionCost,
            targeting,
            effect: scalarEffect,
            rangeFeet,
          },
        ];
  });
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
    return projection === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "rollModifier",
            spell,
            actionCost: "magicAction",
            ...projection,
          },
        ];
  });
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

export function creatureTypeProtectionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.name !== "Protection from Evil and Good" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !==
      "Spells/Descriptions-M-P#Protection from Evil and Good" ||
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
    spell.name !== "Heroism" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Heroism" ||
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

export function supportedPreparedWeaponDamageRiderSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Divine Favor" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-A-D#Divine Favor" ||
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

export function supportedPreparedAfterHitDamageSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = afterHitDamageSpellProjection(spell);
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
  });
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
          condition: projection.condition,
          expiresAt: "concentration",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            successEnds: "spell",
          },
          turnStartDamage: {
            expr: damageExpr,
            damageType: projection.turnStartDamageType,
          },
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
    spell.name !== "Searing Smite" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-S-Z#Searing Smite" ||
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
    spell.name !== "Ensnaring Strike" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Ensnaring Strike" ||
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
    spell.name !== "Divine Smite" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-A-D#Divine Smite" ||
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
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Hunter's Mark" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-G-P#Hunter's Mark" ||
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "mark" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.operations.length !== 1
  ) {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== "force" ||
    operation.effect.amount === undefined
  ) {
    return [];
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  if (expr === null) {
    return [];
  }
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  const activeMark = activeMarkedDamageRiderEffect(actor, spell.id);
  if (activeMark !== null) {
    // TODO: Allow an ordinary recast while the current mark is still active.
    // RAW permits replacing Concentration by casting the spell again and
    // choosing a new quarry; this branch currently exposes only the slotless
    // Bonus Action transfer after the marked target drops to 0 Hit Points.
    return activeMark.transferAvailable
      ? [
          {
            access: { tag: "prepared" },
            resource: { tag: "none" },
            procedure: "markedDamageRider",
            action: "transfer",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "singleCombatant" },
            damage: { expr, damageType: "force" },
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
  const favoredEnemyExpiresAt = huntersMarkConcentrationExpirationForSlot(
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
            damage: { expr, damageType: "force" },
            rangeFeet,
            expiresAt: favoredEnemyExpiresAt,
          },
        ];
  const slotInvocations = spellSlots.flatMap(
    (slot): readonly SupportedSpellInvocation[] => {
      const expiresAt = huntersMarkConcentrationExpirationForSlot(
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
              damage: { expr, damageType: "force" },
              rangeFeet,
              expiresAt,
            },
          ];
    },
  );
  return [...freeCastInvocations, ...slotInvocations];
}

function huntersMarkConcentrationExpirationForSlot(
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
    !hasSupportedHuntersMarkDurationTiers(spell.mechanics.duration.upTo)
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

function hasSupportedHuntersMarkDurationTiers(
  upTo: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "concentration" }
  >["upTo"],
): boolean {
  const tiers = upTo.upcastTiers ?? [];
  return (
    tiers.length === 2 &&
    tiers[0]?.atSlot === 3 &&
    tiers[0].amount === 8 &&
    tiers[1]?.atSlot === 5 &&
    tiers[1].amount === 24
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
  return projection === null
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "rollModifier",
          spell,
          actionCost: "magicAction",
          ...projection,
        },
      ];
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
    : { kind: "targetList", minTargets: 1, maxTargets: targetCount };
}

export function scalarBuffSpellEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effect: EffectAtom,
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
  return null;
}

export function rollModifierSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): Pick<
  RollModifierSpellInvocation,
  "effect" | "rangeFeet" | "saveGate" | "skillChoices" | "targeting"
> | null {
  if (spell.mechanics.castingTime.kind !== "action") {
    return null;
  }
  const rangeFeet = scalarBuffSpellRangeFeet(spell.mechanics.range);
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (rangeFeet === null || expiresAt === null) {
    return null;
  }

  if (spell.mechanics.family === "ongoing_effect") {
    const operation = spell.mechanics.operations[0];
    if (
      spell.mechanics.operations.length !== 1 ||
      operation?.trigger.kind !== "passive" ||
      operation.effect.kind !== "modify_roll_numeric"
    ) {
      return null;
    }
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
        };
  }

  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
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
      };
}

export function rollModifierSpellTargeting(
  attachment: Attachment,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): RollModifierSpellTargeting | null {
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
    : { kind: "targetList", minTargets: 1, maxTargets: targetCount };
}

export function rollModifierActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>,
  expiresAt: BattleActiveEffectExpiration,
): {
  readonly effect: RollModifierSpellEffect;
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

export function damageReductionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  DamageReductionSpellInvocation,
  "amount" | "damageTypeChoices" | "expiresAt" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.name !== "Resistance" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-Q-R#Resistance" ||
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
  return delta.kind === "fixed_dice" &&
    delta.dieSize === 4 &&
    (delta.sign === "+" || delta.sign === "-")
    ? { dice: delta.dice, dieSize: delta.dieSize, sign: delta.sign }
    : null;
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
