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

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  AbilityModifier,
  attackBonus,
  movementFeet,
  spellSlotLevel,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import {
  type BattleCreatureState,
  type BattleTurnResources,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { SHIELD_MAGIC_MISSILE_SPELL_ID } from "./domain-constants.ts";

import {
  supportedCantripSaveGateDamageProfile,
  supportedDamageAmountExpr,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedCommandProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedPreparedGreaseGroundHazardProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./spells-profiles-save-gates.ts";
import { sameStringSet } from "./spells-profile-shared.ts";
import {
  supportedCantripSpellAttackProfile,
  supportedCantripSpellHostedWeaponAttackProfile,
  supportedPreparedAttackBurstSaveDamageProfile,
  supportedPreparedChainedSpellAttackDamageProfile,
  supportedPreparedSpellAttackProfile,
} from "./spells-profiles-attack-damage.ts";
export * from "./spells-profiles-attack-damage.ts";
import {
  supportedCantripDamageReductionSpellProfile,
  supportedCantripRollModifierSpellProfile,
  supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile,
  supportedPreparedAfterHitDamageSpellProfile,
  supportedPreparedAfterHitSaveGatedConditionSpellProfile,
  supportedPreparedAfterHitTimedDamageAndSaveSpellProfile,
  supportedPreparedCreatureTypeProtectionSpellProfile,
  supportedPreparedExpeditiousRetreatDashSpellProfile,
  supportedPreparedFeatherFallMitigationSpellProfile,
  supportedPreparedJumpMovementReplacementSpellProfile,
  supportedPreparedHealingSpellProfile,
  supportedPreparedMarkedDamageRiderSpellProfile,
  supportedPreparedRollModifierSpellProfile,
  supportedPreparedScalarBuffSpellProfile,
  supportedPreparedSlotSpellProfile,
  supportedPreparedWeaponDamageRiderSpellProfile,
} from "./spells-profiles-support.ts";
export * from "./spells-profiles-support.ts";
export {
  animalFriendshipSaveGateConditionSpell,
  areaSaveGateSpellRangeFeet,
  charmPersonSaveGateConditionSpell,
  colorSpraySaveGateConditionSpell,
  diceExprWithDelta,
  entangleSaveGateConditionSpell,
  faerieFireSaveGateAttackRollAdvantageSpell,
  isGuidingBoltNextAttackRiderShape,
  isRayOfSicknessPoisonedRiderShape,
  isShockingGraspOpportunityAttackRiderShape,
  isViciousMockeryNextAttackRiderShape,
  saveGateTargeting,
  singleTargetSpellRangeFeet,
  spellAttackKindForRedirect,
  supportedCantripSaveGateDamageProfile,
  supportedDamageAmountExpr,
  supportedFailedSavePostDamageRiders,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedCommandProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedPreparedGreaseGroundHazardProfile,
  supportedPreparedSleepTargetAdmissionProfile,
  supportedRepeatedEffectCount,
  supportedSaveGateConditionSpell,
  supportedSaveGateDamageProfile,
  supportedSaveGateFailedSaveEffects,
  supportedSpellAttackKind,
  supportedSpellPostDamageRiders,
} from "./spells-profiles-save-gates.ts";
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
      supportedPreparedSleepTargetAdmissionProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedGreaseGroundHazardProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedCommandProfile(spell, spellcasting.spellSlots),
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
      supportedPreparedAfterHitDamageSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitSaveGatedConditionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitTimedDamageAndSaveSpellProfile(
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
      supportedPreparedExpeditiousRetreatDashSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedJumpMovementReplacementSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedFeatherFallMitigationSpellProfile(
        actor.combatantId,
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
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedHellishRebukeReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripHeldLightSpellProfile(spell),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripObjectLightSpellProfile(spell),
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
      supportedCantripSpellHostedWeaponAttackProfile(
        actor,
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

export function supportedCantripObjectLightSpellProfile(
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (!isLightObjectSpell(spell)) {
    return [];
  }
  const lightPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.value.kind === "object" &&
      phase.attachment.value.count === 1 &&
      phase.attachment.value.filter?.heldOrWorn === "forbidden" &&
      phase.effects?.some((effect) => effect.kind === "emit_light"),
  );
  const lightEffects =
    lightPhase === undefined || !("effects" in lightPhase)
      ? undefined
      : lightPhase.effects;
  const lightEffect = lightEffects?.find(
    (effect) => effect.kind === "emit_light",
  );
  if (
    lightEffect === undefined ||
    lightEffect.kind !== "emit_light" ||
    lightEffect.brightRadiusFeet !== 20 ||
    lightEffect.dimAdditionalFeet !== 20
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
          procedure: "objectLight",
          spell,
          actionCost: "magicAction",
          targeting: { kind: "singleObject" },
          light: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(lightEffect.brightRadiusFeet),
            dimAdditionalFeet: movementFeet(lightEffect.dimAdditionalFeet),
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
      targeting: { kind: "singleCreatureOrObject" },
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

export function isLightObjectSpell(
  spell: SpellRecord,
): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "activation" }
  >;
} {
  return (
    spell.name === "Light" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-L-P#Light" &&
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "hour" &&
    spell.mechanics.duration.value.amount === 1
  );
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

export function supportedPreparedHellishRebukeReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Hellish Rebuke" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Hellish Rebuke" ||
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "takes_damage_from_creature" ||
    !spell.mechanics.castingTime.trigger.requiresVisibleCreature ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "damage" ||
    phase.onFail.damageType !== "fire"
  ) {
    return [];
  }
  const failedDamage = phase.onFail;
  const rangeFeet = spell.mechanics.range.feet;

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: failedDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    return damageExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "saveGatedDamage" as const,
            spell,
            ability: phase.ability,
            dc: phase.dc,
            targeting: { kind: "singleCombatant" as const },
            damage: {
              expr: damageExpr,
              damageType: "fire",
            },
            successDamage: "half" as const,
            rangeFeet: movementFeet(rangeFeet),
            failedSavePostDamageRiders: [],
          },
        ];
  });
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
    Match.when({ kind: "self_or_visible_creature_falls" }, () => []),
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
