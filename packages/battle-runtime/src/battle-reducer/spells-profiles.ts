// Spell profile predicates and projections (Cluster O). Mechanical extraction
// from battle-reducer.ts. Aggregates: per-procedure `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// equality helpers, and resource-availability helpers.
//
// O is a leaf cluster within the spells subsystem: it depends on Q
// (spell-effects), domain constants/types from `../battle-reducer.ts`, and
// surface types only. Consumers are K (discovery), P (holes/fills), L
// (resolve), and F (turn).

import { Either, Match, Schema } from "effect";
import {
  AbilityModifier,
  attackBonus,
  movementDeltaFeet,
  movementFeet,
  spellSlotLevel,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import type { CombatantId } from "../identity.ts";
import { activeMarkedDamageRiderEffect } from "./damage-helpers.ts";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  Attachment,
  ActivationPhase,
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  EffectAtom,
  Skill,
  SkillFilter,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { CreatureType } from "@dnd/shared/game-facts";
import {
  BATTLE_D20_ROLL_MODIFIER_KINDS,
  COLOR_SPRAY_FAILED_SAVE_CONDITION,
  ENTANGLE_FAILED_SAVE_CONDITION,
  SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
  damageSpellSource,
  type BattleActiveEffectExpiration,
  type BattleAttackKindForRedirect,
  type BattleCreatureState,
  type BattleD20RollModifierDelta,
  type BattleD20RollModifierKind,
  type BattleTurnResources,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  type CreatureTypeProtectionSpellInvocation,
  type DamageReductionSpellInvocation,
  type DamageSpellSource,
  type HealingSpellActionCost,
  type HealingSpellTargeting,
  type PreparedDamageSpellSource,
  type RollModifierSpellEffect,
  type RollModifierSpellInvocation,
  type RollModifierSpellTargeting,
  type SaveGateFailureEffect,
  type ScalarBuffSpellEffect,
  type ScalarBuffSpellTargeting,
  type SpellActivationPhase,
  type SpellAttackHitEffect,
  type SpellAttackKind,
  type SpellFailedSaveAttackRollEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellPostDamageRider,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS,
  CHROMATIC_ORB_DAMAGE_TYPES,
  CHROMATIC_ORB_LEAP_RANGE_FEET,
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
  SHIELD_MAGIC_MISSILE_SPELL_ID,
} from "./domain-constants.ts";

export function supportedSpellActs(
  actor: BattleCreatureState,
): readonly SupportedSpellInvocation[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const spellcasting = actor.origin.spellcasting;
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }
  const characterLevel = actor.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );

  return [
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSlotSpellProfile(spell, spellcasting.spellSlots),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSpellAttackProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedChainedSpellAttackDamageProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedAttackBurstSaveDamageProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateDamageProfile(spell, spellcasting.spellSlots),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateConditionProfile(spell, spellcasting.spellSlots),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateAttackRollAdvantageProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedScalarBuffSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedRollModifierSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedCreatureTypeProtectionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedWeaponDamageRiderSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedMarkedDamageRiderSpellProfile(
        actor,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedPersistentSpellProfile(actor.combatantId, spell),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedHealingSpellProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedShieldReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripHeldLightSpellProfile(spell),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripHeldLightHurlSpellProfile(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSpellAttackProfile(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSaveGateDamageProfile(spell, characterLevel),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripRollModifierSpellProfile(actor.combatantId, spell),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripDamageReductionSpellProfile(actor.combatantId, spell),
    ),
  ];
}

export function supportedCantripHeldLightSpellProfile(
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );
  if (
    lightOperation === undefined ||
    lightOperation.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 20 ||
    lightOperation.effect.dimAdditionalFeet !== 20
  ) {
    return [];
  }
  const duration = spell.mechanics.duration;
  if (duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  return Either.isLeft(durationTicks)
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "heldLight",
          spell,
          actionCost: "bonusAction",
          light: {
            brightRadiusFeet: movementFeet(
              lightOperation.effect.brightRadiusFeet,
            ),
            dimAdditionalFeet: movementFeet(
              lightOperation.effect.dimAdditionalFeet,
            ),
          },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

export function supportedCantripHeldLightHurlSpellProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const hurlOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.effect.kind === "attack_roll",
  );
  if (
    hurlOperation === undefined ||
    hurlOperation.effect.kind !== "attack_roll" ||
    hurlOperation.effect.attackKind !== "ranged_spell_attack" ||
    hurlOperation.effect.onHit.length !== 1 ||
    hurlOperation.effect.onMiss.length !== 1 ||
    hurlOperation.effect.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageEffect = hurlOperation.effect.onHit[0];
  if (
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "fire" ||
    damageEffect.amount === undefined
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
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "heldLightHurl",
      spell,
      targeting: { kind: "singleCombatant" },
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(60),
      attackKind: hurlOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
    },
  ];
}

export function isProduceFlameOngoingEffectSpell(
  spell: SpellRecord,
): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "ongoing_effect" }
  >;
} {
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  return (
    spell.name === "Produce Flame" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-M-P#Produce Flame" &&
    spell.mechanics.family === "ongoing_effect" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "bonus_action" &&
    spell.mechanics.range.kind === "self" &&
    spell.mechanics.attachment.kind === "self" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "minute" &&
    spell.mechanics.duration.value.amount === 10 &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell"
  );
}

export function supportedPreparedShieldReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "triggered_reaction") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const acDeltas = effects.flatMap((effect) =>
    effect.kind === "modify_ac" ? [effect.delta] : [],
  );
  const acDelta = acDeltas[0];
  const negatedSpellIds = effects.flatMap((effect) =>
    effect.kind === "negate_named_effect" &&
    effect.scope === "damage_only" &&
    typeof effect.spellId === "string"
      ? [effect.spellId]
      : [],
  );
  const namedSpellTriggerIds =
    spell.mechanics.castingTime.kind === "reaction"
      ? reactionTriggerNamedSpellIds(spell.mechanics.castingTime)
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    !reactionTriggerIncludesHitByAttackRoll(spell.mechanics.castingTime) ||
    !sameStringSet(namedSpellTriggerIds, [SHIELD_MAGIC_MISSILE_SPELL_ID]) ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "round" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 2 ||
    acDeltas.length !== 1 ||
    acDelta?.kind !== "fixed_dice" ||
    acDelta.sign !== "+" ||
    acDelta.dice !== 5 ||
    acDelta.dieSize !== 1 ||
    !sameStringSet(negatedSpellIds, namedSpellTriggerIds)
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "shieldReaction",
            spell,
            armorClassBonus: acDelta.dice,
            negatedSpellIds,
          },
        ],
  );
}

export function reactionTriggerIncludesHitByAttackRoll(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): boolean {
  const trigger = castingTime.trigger;
  return trigger.kind === "hit_by_attack_roll"
    ? true
    : trigger.kind === "any_of" &&
        trigger.triggers.some(
          (candidate) => candidate.kind === "hit_by_attack_roll",
        );
}

export function reactionTriggerNamedSpellIds(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): readonly string[] {
  return reactionTriggerNamedSpellIdsFromTrigger(castingTime.trigger);
}

export type ReactionTrigger = Extract<
  SpellRecord["mechanics"]["castingTime"],
  { kind: "reaction" }
>["trigger"];

export function reactionTriggerNamedSpellIdsFromTrigger(
  trigger: ReactionTrigger,
): readonly string[] {
  return Match.value(trigger).pipe(
    Match.when({ kind: "hit_by_attack_roll" }, () => []),
    Match.when({ kind: "takes_damage_from_creature" }, () => []),
    Match.when({ kind: "targeted_by_named_spell" }, (namedSpell) => [
      namedSpell.spellId,
    ]),
    Match.when({ kind: "creature_casts_spell" }, () => []),
    Match.when({ kind: "spell_save_outcome" }, () => []),
    Match.when({ kind: "any_of" }, (anyOf) =>
      anyOf.triggers.flatMap(reactionTriggerNamedSpellIdsFromTrigger),
    ),
    Match.exhaustive,
  );
}

export function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value)) &&
    right.every((value) => left.includes(value))
  );
}

export function sameDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    (left.flat ?? 0) === (right.flat ?? 0)
  );
}

export function supportedPreparedHealingSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const actionCost = healingSpellActionCost(spell.mechanics.castingTime);
  const targeting =
    phase?.kind === "direct" && phase.attachment.kind === "hole"
      ? healingSpellTargeting(phase.attachment.value)
      : null;
  const rangeFeet = healingSpellRangeFeet(spell.mechanics.range);
  if (
    actionCost === null ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    targeting === null ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "heal_hp"
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const healingExpr = supportedHealingAmountExpr(
      effect.amount,
      spell.mechanics.level,
      slot.spellLevel,
      spellcastingAbilityModifier,
    );
    return healingExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "directHitPointRestoration",
            spell,
            actionCost,
            targeting,
            healing: { expr: healingExpr },
            rangeFeet,
          },
        ];
  });
}

export function healingSpellTargeting(
  attachment: Attachment,
): HealingSpellTargeting | null {
  if (attachment.kind === "target") {
    const targetBounds = healingSpellTargetBounds(attachment.selection);
    return targetBounds === null
      ? null
      : {
          kind: "targetList",
          minTargets: 1,
          maxTargets: targetBounds.maxTargets,
        };
  }

  if (attachment.kind === "area") {
    const targetBounds =
      attachment.selection === undefined
        ? null
        : healingSpellTargetBounds(attachment.selection);
    if (
      targetBounds === null ||
      attachment.origin.kind !== "point_within_range" ||
      attachment.shape.kind !== "sphere"
    ) {
      return null;
    }
    return {
      kind: "pointOriginSphereTargetList",
      minTargets: 1,
      maxTargets: targetBounds.maxTargets,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: movementFeet(attachment.shape.radiusFeet),
      },
    };
  }

  return null;
}

export function healingSpellActionCost(
  castingTime: SpellRecord["mechanics"]["castingTime"],
): HealingSpellActionCost | null {
  return Match.value(castingTime).pipe(
    Match.when({ kind: "action" }, () => "magicAction" as const),
    Match.when({ kind: "bonus_action" }, () => "bonusAction" as const),
    Match.orElse(() => null),
  );
}

export function healingSpellTargetBounds(
  selection: TargetSelection,
): { readonly maxTargets: number } | null {
  if (selection.mode === "one") {
    return { maxTargets: 1 };
  }
  if (
    selection.mode === "choose_up_to" &&
    typeof selection.count === "number" &&
    selection.count >= 1
  ) {
    return { maxTargets: selection.count };
  }
  return null;
}

export function healingSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) => movementFeet(point.feet)),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
}

export function supportedPreparedSlotSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1
  ) {
    return [];
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "damage" || typeof effect.damageType !== "string") {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({ amount: effect.amount });
  if (damageExpr == null || typeof effect.damageType !== "string") {
    return [];
  }
  const damageType = effect.damageType;
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  const repeatedEffectCountForSlotLevel = supportedRepeatedEffectCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  if (repeatedEffectCountForSlotLevel === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "repeatedDamageAllocation",
        spell,
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: repeatedEffectCountForSlotLevel(slot.spellLevel),
        },
        damage: {
          expr: damageExpr,
          damageType,
        },
        rangeFeet,
      },
    ];
  });
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
    effect === undefined
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
      kind: "attackerTypeScopedAttackRollAgainstSelf",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      mode: "disadvantage",
      attackerCreatureTypes: [...PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES],
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
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
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
            expiresAt: {
              kind: "concentration",
              combatantId: actor.combatantId,
            },
          },
        ],
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
    Match.when({ kind: "point" }, (point) => movementFeet(point.feet)),
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

export function scalarBuffSpellTargetCount(
  selection: TargetSelection,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): number | null {
  if (selection.mode === "one") {
    return 1;
  }
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const baseLevel = count.baseLevel ?? spellLevel;
  return (
    count.base +
    Math.max(0, Number(slotLevel) - baseLevel) * count.perSlotAboveBase
  );
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

export function supportedPreparedPersistentSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  if (spell.mechanics.duration.kind !== "timed") {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const requiredDurationTicks = elapsedTimeTicksFromHours(8);
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right) ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return [];
  }

  return [
    {
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: spellSlotLevel(1) },
      procedure: "persistentArmorEffect",
      spell,
      rangeFeet: movementFeet(5),
      activeEffect: {
        kind: "spellBaseArmorClass",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        base: operation.effect.formula.base,
        ability: "dex",
        durationTicks: durationTicks.right,
        earlyEnds: [{ kind: "targetDonsArmor" }],
      },
    },
  ];
}

export function supportedCantripSpellAttackProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return supportedSpellAttackDamageProfile({
    spell,
    access: { tag: "classCantrip" },
    resource: { tag: "none" },
    spellcastingAbilityModifier,
    proficiencyBonus,
    characterLevel,
  });
}

export function supportedPreparedSpellAttackProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSpellAttackDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      spellcastingAbilityModifier,
      proficiencyBonus,
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedChainedSpellAttackDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  if (!isCanonicalSrdChromaticOrbSpellDefinition(spell)) {
    return [];
  }
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    range.kind !== "point" ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
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
    leapTargeting === null ||
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
    !isCanonicalChromaticOrbContinuationLimitSet(continuation.limits) ||
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
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "chainedSpellAttackDamage",
        spell,
        targeting,
        damage: { expr: damageExpr },
        damageTypeChoices: CHROMATIC_ORB_DAMAGE_TYPES,
        rangeFeet: movementFeet(range.feet),
        leapRangeFeet: CHROMATIC_ORB_LEAP_RANGE_FEET,
        attackKind: phase.attackKind,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function isCanonicalSrdChromaticOrbSpellDefinition(
  spell: SpellRecord,
): boolean {
  return (
    spell.name === "Chromatic Orb" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-A-D#Chromatic Orb"
  );
}

export function isCanonicalChromaticOrbContinuationLimitSet(
  limits: readonly { readonly kind: string }[],
): boolean {
  return (
    limits.length === CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS.length &&
    CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS.every((requiredKind) =>
      limits.some((limit) => limit.kind === requiredKind),
    )
  );
}

export function supportedPreparedAttackBurstSaveDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedAttackBurstSaveDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      spellcastingAbilityModifier,
      proficiencyBonus,
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedAttackBurstSaveDamageProfile(
  input: {
    readonly spell: SpellRecord;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel: SpellSlotLevel;
  } & PreparedDamageSpellSource,
): readonly SupportedSpellInvocation[] {
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
    spell.name !== "Ice Knife" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Ice Knife" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 2 ||
    attackPhase?.kind !== "attack_roll" ||
    burstPhase?.kind !== "save_gate" ||
    !supportedSpellAttackKind(attackPhase.attackKind) ||
    targeting === null ||
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
    readonly spell: SpellRecord;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : null;
  if (
    (input.access.tag === "classCantrip"
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    targeting === null ||
    phase.onHit.length < 1 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const [damageEffect, ...postDamageEffects] = phase.onHit;
  if (
    damageEffect?.kind !== "damage" ||
    typeof damageEffect.damageType !== "string"
  ) {
    return [];
  }
  const postDamageRiders = supportedSpellPostDamageRiders(
    spell,
    phase,
    postDamageEffects,
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
  if (damageExpr == null || typeof damageEffect.damageType !== "string") {
    return [];
  }

  const attackDamageInvocation = {
    procedure: "spellAttackDamage" as const,
    spell,
    targeting,
    damage: {
      expr: damageExpr,
      damageType: damageEffect.damageType,
    },
    rangeFeet,
    attackKind: phase.attackKind,
    attackBonus: attackBonus(
      Number(input.spellcastingAbilityModifier) +
        Number(input.proficiencyBonus),
    ),
    postDamageRiders,
  };

  return [{ ...damageSpellSource(input), ...attackDamageInvocation }];
}

export function spellAttackDamageTargeting(
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "singleCombatant" }> | null {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    attachment.value.selection.mode !== "one"
  ) {
    return null;
  }
  const targetKinds = attachment.value.selection.targetKinds;
  if (targetKinds !== undefined && !sameStringSet(targetKinds, ["creature"])) {
    return null;
  }
  return { kind: "singleCombatant" };
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

export function supportedCantripSaveGateDamageProfile(
  spell: SpellRecord,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return supportedSaveGateDamageProfile({
    spell,
    access: { tag: "classCantrip" },
    resource: { tag: "none" },
    characterLevel,
  });
}

export function supportedPreparedSaveGateDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSaveGateDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedSaveGateConditionProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const conditionSpell = supportedSaveGateConditionSpell(spell);
  if (conditionSpell === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "saveGatedCondition",
        spell,
        ability: conditionSpell.phase.ability,
        dc: conditionSpell.phase.dc,
        targeting: conditionSpell.targeting(slot.spellLevel),
        targetCreatureTypes: conditionSpell.targetCreatureTypes,
        effect: conditionSpell.effect,
        rangeFeet: conditionSpell.rangeFeet,
      },
    ];
  });
}

export type SaveGateConditionSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: (slotLevel: SpellSlotLevel) => SpellTargeting;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
  readonly effect: SpellFailedSaveConditionEffect;
  readonly rangeFeet: MovementFeet;
};

export function supportedSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  return (
    animalFriendshipSaveGateConditionSpell(spell) ??
    colorSpraySaveGateConditionSpell(spell) ??
    entangleSaveGateConditionSpell(spell)
  );
}

export function supportedPreparedSaveGateAttackRollAdvantageProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const attackRollAdvantageSpell = faerieFireSaveGateAttackRollAdvantageSpell(
    actorId,
    spell,
  );
  if (attackRollAdvantageSpell === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "saveGatedAttackRollAdvantage",
        spell,
        ability: attackRollAdvantageSpell.phase.ability,
        dc: attackRollAdvantageSpell.phase.dc,
        targeting: attackRollAdvantageSpell.targeting,
        effect: attackRollAdvantageSpell.effect,
        rangeFeet: attackRollAdvantageSpell.rangeFeet,
      },
    ];
  });
}

export type SaveGateAttackRollAdvantageSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly effect: SpellFailedSaveAttackRollEffect;
  readonly rangeFeet: MovementFeet;
};

export function faerieFireSaveGateAttackRollAdvantageSpell(
  actorId: CombatantId,
  spell: SpellRecord,
): SaveGateAttackRollAdvantageSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  if (
    spell.name !== "Faerie Fire" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Faerie Fire" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "cube" ||
    phase.attachment.value.shape.sideFeet !==
      SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET ||
    failedEffect?.kind !== "modify_roll_advantage" ||
    failedEffect.mode !== "advantage" ||
    !sameStringSet(failedEffect.on, ["attack_roll"])
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(phase.attachment.value.shape.sideFeet),
    },
    effect: {
      kind: "visibleAttackRollAgainstSelf",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      mode: "advantage",
      expiresAt: { kind: "concentration", combatantId: actorId },
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function animalFriendshipSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.name !== "Animal Friendship" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-A-D#Animal Friendship" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 24 ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_damaged_by_caster_or_ally" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.count === undefined ||
    targetSelection.typeFilter?.length !== 1 ||
    targetSelection.typeFilter[0] !== "beast" ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== "charmed"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel): SpellTargeting => {
      const targetCount = scalarBuffSpellTargetCount(
        targetSelection,
        spell.mechanics.level,
        slotLevel,
      );
      return {
        kind: "targetList",
        minTargets: 1,
        maxTargets: targetCount ?? 1,
      };
    },
    targetCreatureTypes: ["beast"],
    effect: {
      condition: "charmed",
      expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      escape: { kind: "targetDamagedByCasterOrAlly" },
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function colorSpraySaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "round" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.attachment.shape.kind !== "cone" ||
    phase.attachment.shape.lengthFeet !==
      SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== COLOR_SPRAY_FAILED_SAVE_CONDITION
  ) {
    return null;
  }
  const coneShape = phase.attachment.shape;

  return {
    phase,
    targeting: () => ({
      kind: "selfOriginCone",
      lengthFeet: movementFeet(coneShape.lengthFeet),
    }),
    targetCreatureTypes: null,
    effect: {
      condition: COLOR_SPRAY_FAILED_SAVE_CONDITION,
      expiresAt: "endOfCasterNextTurn",
      escape: null,
    },
    rangeFeet: movementFeet(0),
  };
}

export function entangleSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "str" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "cube" ||
    phase.attachment.value.shape.sideFeet !==
      SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== ENTANGLE_FAILED_SAVE_CONDITION
  ) {
    return null;
  }
  const cubeShape = phase.attachment.value.shape;

    return {
      phase,
      targeting: () => ({
        kind: "pointOriginCubeExcludingCaster",
        sideFeet: movementFeet(cubeShape.sideFeet),
      }),
      targetCreatureTypes: null,
      effect: {
        condition: ENTANGLE_FAILED_SAVE_CONDITION,
        expiresAt: "concentration",
        escape: { kind: "abilityCheck", ability: "str", skill: "athletics" },
      },
      rangeFeet: movementFeet(spell.mechanics.range.feet),
    };
  }

export function supportedSaveGateDamageProfile(
  input: {
    readonly spell: SpellRecord;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targeting =
    phase?.kind === "save_gate" ? saveGateTargeting(phase.attachment) : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : targeting === null
        ? null
        : areaSaveGateSpellRangeFeet(spell.mechanics.range, targeting);
  const failedSaveEffects =
    phase?.kind === "save_gate"
      ? supportedSaveGateFailedSaveEffects(spell, phase, phase.onFail)
      : null;
  if (
    (input.access.tag === "classCantrip"
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    targeting === null ||
    (phase.onSuccess.kind !== "none" &&
      phase.onSuccess.kind !== "half_damage") ||
    failedSaveEffects === null ||
    typeof failedSaveEffects.damage.damageType !== "string"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: failedSaveEffects.damage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (damageExpr == null) {
    return [];
  }

  const saveGatedInvocation = {
    procedure: "saveGatedDamage" as const,
    spell,
    ability: phase.ability,
    dc: phase.dc,
    targeting,
    damage: {
      expr: damageExpr,
      damageType: failedSaveEffects.damage.damageType,
    },
    successDamage: (phase.onSuccess.kind === "half_damage"
      ? "half"
      : "none") as "half" | "none",
    rangeFeet,
    failedSavePostDamageRiders: failedSaveEffects.postDamageRiders,
  };

  return [{ ...damageSpellSource(input), ...saveGatedInvocation }];
}

export function saveGateTargeting(attachment: Attachment): SpellTargeting | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "target" &&
    value.selection.mode === "one" &&
    (value.selection.targetKinds === undefined ||
      sameStringSet(value.selection.targetKinds, ["creature"]))
  ) {
    return { kind: "singleCombatant" };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
  ) {
    return {
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  return null;
}

export function areaSaveGateSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  targeting: Exclude<SpellTargeting, { readonly kind: "singleCombatant" }>,
): MovementFeet | null {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "pointOriginCubeExcludingCaster" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "pointOriginCube" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "selfOriginCone" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "primaryTargetOriginEmanation" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "targetList" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.exhaustive,
  );
}

export function singleTargetSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) => movementFeet(point.feet)),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
}

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
  spell: SpellRecord,
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
      isRayOfSicknessPoisonedRiderShape(spell, phase)
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
      isShockingGraspOpportunityAttackRiderShape(spell, phase)
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
      isGuidingBoltNextAttackRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "nextAttackRollAgainstTarget",
        mode: "advantage",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    return null;
  }
  return riders;
}

export function isRayOfSicknessPoisonedRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.name === "Ray of Sickness" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-Q-R#Ray of Sickness" &&
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isShockingGraspOpportunityAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.name === "Shocking Grasp" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Shocking Grasp" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isGuidingBoltNextAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.name === "Guiding Bolt" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-E-L#Guiding Bolt" &&
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function supportedSaveGateFailedSaveEffects(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): {
  readonly damage: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>;
  readonly postDamageRiders: readonly SpellFailedSavePostDamageRider[];
} | null {
  if (effect.kind === "damage") {
    return { damage: effect, postDamageRiders: [] };
  }
  if (effect.kind !== "composite") {
    return null;
  }
  const [damage, ...riders] = effect.effects;
  if (damage?.kind !== "damage") {
    return null;
  }
  const postDamageRiders = supportedFailedSavePostDamageRiders(
    spell,
    phase,
    riders,
  );
  return postDamageRiders === null ? null : { damage, postDamageRiders };
}

export function supportedFailedSavePostDamageRiders(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
): readonly SpellFailedSavePostDamageRider[] | null {
  const riders: SpellFailedSavePostDamageRider[] = [];
  for (const effect of effects) {
    if (
      effect.kind !== "modify_roll_advantage" ||
      effect.mode !== "disadvantage" ||
      !sameStringSet(effect.on ?? [], ["attack_roll"]) ||
      effect.count !== 1 ||
      effect.expiresOn?.kind !== "end_of_next_turn" ||
      (effect.affects ?? "self_roll") !== "self_roll" ||
      !isViciousMockeryNextAttackRiderShape(spell, phase)
    ) {
      return null;
    }
    riders.push({
      kind: "nextAttackRollByTarget",
      mode: "disadvantage",
      expiresAt: "endOfTargetNextTurn",
    });
  }
  return riders;
}

export function isViciousMockeryNextAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    spell.name === "Vicious Mockery" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Vicious Mockery" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.ability === "wis" &&
    phase.onSuccess.kind === "none"
  );
}

export function supportedRepeatedEffectCount(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const { base, perSlotAboveBase } = count;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    base + Math.max(0, Number(slotLevel) - baseLevel) * perSlotAboveBase;
}

export function supportedDamageAmountExpr(input: {
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel?: number | undefined;
  readonly slotLevel?: SpellSlotLevel | undefined;
  readonly characterLevel?: number | undefined;
}): DiceExpr | null {
  const { amount } = input;
  if (amount.kind === "fixed") {
    return amount.expr;
  }
  if (
    amount.kind === "threshold_tiers" &&
    amount.axis === "character" &&
    input.characterLevel !== undefined
  ) {
    return amount.tiers.reduce(
      (expr, tier) =>
        input.characterLevel !== undefined &&
        input.characterLevel >= tier.atLevel
          ? diceExprWithDelta(expr, tier.override)
          : expr,
      amount.base,
    );
  }
  if (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    input.spellLevel !== undefined &&
    input.slotLevel !== undefined &&
    amount.startingAtLevel === input.spellLevel &&
    amount.base.dieSize !== undefined
  ) {
    const slotDelta = Math.max(
      0,
      Number(input.slotLevel) - amount.startingAtLevel,
    );
    return {
      dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
      dieSize: amount.base.dieSize,
      ...(amount.base.flat === undefined ? {} : { flat: amount.base.flat }),
    };
  }
  return null;
}

export function diceExprWithDelta(
  base: DiceExpr,
  delta: {
    readonly dice?: number | undefined;
    readonly dieSize?: number | undefined;
    readonly flat?: number | undefined;
  },
): DiceExpr {
  return {
    dice: delta.dice ?? base.dice,
    dieSize: delta.dieSize ?? base.dieSize,
    ...((delta.flat ?? base.flat) === undefined
      ? {}
      : { flat: delta.flat ?? base.flat }),
  };
}

export function supportedHealingAmountExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.spellcastingMod !== true ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
}

export function spellHasAvailableSpend(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  const resource = invocation.resource;
  if (resource.tag === "none") {
    return true;
  }
  return (
    actor.origin.spellcasting?.spellSlots.some(
      (slot) =>
        slot.spellLevel === resource.slotLevel && slot.expended < slot.count,
    ) === true
  );
}

export function spellActTurnResourceAvailable(
  resources: BattleTurnResources,
  invocation: SupportedSpellInvocation,
): boolean {
  if (
    invocation.resource.tag !== "none" &&
    resources.spellSlotExpendedThisTurn
  ) {
    return false;
  }
  if ("actionCost" in invocation && invocation.actionCost === "bonusAction") {
    return resources.currentHasBonusAction;
  }
  if (invocation.resource.tag === "none") {
    return canSpendAction(resources, "magic");
  }
  return canSpendAction(resources, "magic");
}

export function markSpellSlotExpendedThisTurn(
  resources: BattleTurnResources,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  return resources.spellSlotExpendedThisTurn
    ? Either.left("spell slot already expended this turn" as const)
    : Either.right({ ...resources, spellSlotExpendedThisTurn: true });
}
