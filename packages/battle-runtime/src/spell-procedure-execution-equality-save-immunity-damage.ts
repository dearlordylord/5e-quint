import { Match } from "effect";

import type {
  SpellFailedSavePostDamageRider,
  SpellPostSaveAreaEffect,
  SpellSavingThrowRollModeRule,
} from "./battle-reducer.ts";
import type {
  SaveGatedConditionImmunitySpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
} from "./character-execution.ts";
import {
  sameMultisetBy,
  samePrimitiveSet,
  sameSetByKey,
} from "./mechanical-equality.ts";
import {
  sameDcSource,
  sameExpiration,
  sameFailedSaveConditionEffect,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameActiveEffectSource,
  sameSpellDamageFacts,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

type SaveGatedDamageSpellProcedureExecution =
  SpellProcedureExecutionByProcedure["saveGatedDamage"];

function sameSpellInvocationCastingTime(
  left: SaveGatedDamageSpellProcedureExecution["castingTime"],
  right: SaveGatedDamageSpellProcedureExecution["castingTime"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      action: () => right.kind === "action",
      reaction: () => right.kind === "reaction",
    }),
  );
}

function sameSavingThrowRollModeRule(
  left: SpellSavingThrowRollModeRule | null,
  right: SpellSavingThrowRollModeRule | null,
): boolean {
  if (left === null || right === null) return left === right;
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      hostileTarget: (value) =>
        right.kind === "hostileTarget" && value.mode === right.mode,
      creatureType: (value) =>
        right.kind === "creatureType" &&
        value.creatureType === right.creatureType &&
        value.mode === right.mode,
    }),
  );
}

function sameFailedSavePostDamageRider(
  left: SpellFailedSavePostDamageRider,
  right: SpellFailedSavePostDamageRider,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      nextAttackRollByTarget: (value) =>
        right.kind === "nextAttackRollByTarget" &&
        value.mode === right.mode &&
        value.expiresAt === right.expiresAt,
      forcedReactionMovement: (value) =>
        right.kind === "forcedReactionMovement" &&
        value.direction === right.direction &&
        value.route === right.route &&
        value.distance === right.distance &&
        value.cost === right.cost,
    }),
  );
}

function samePostSaveAreaEffect(
  left: SpellPostSaveAreaEffect | undefined,
  right: SpellPostSaveAreaEffect | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      fireballObjectIgnition: () => right.kind === "fireballObjectIgnition",
      shatterObjectDamage: () => right.kind === "shatterObjectDamage",
      thunderwave: (value) =>
        right.kind === "thunderwave" &&
        value.creaturePush.distanceFeet === right.creaturePush.distanceFeet &&
        value.creaturePush.originDirection ===
          right.creaturePush.originDirection &&
        value.unsecuredObjectPush.distanceFeet ===
          right.unsecuredObjectPush.distanceFeet &&
        value.unsecuredObjectPush.originDirection ===
          right.unsecuredObjectPush.originDirection &&
        value.unsecuredObjectPush.objectLocation ===
          right.unsecuredObjectPush.objectLocation &&
        value.audibleBoom.sound === right.audibleBoom.sound &&
        value.audibleBoom.audibleRadiusFeet ===
          right.audibleBoom.audibleRadiusFeet,
    }),
  );
}

export function sameSaveGatedConditionImmunityExecution(
  left: SaveGatedConditionImmunitySpellProcedureExecution,
  right: SaveGatedConditionImmunitySpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    samePrimitiveSet(left.targetCreatureTypes, right.targetCreatureTypes) &&
    sameSetByKey(
      left.activeEffects,
      right.activeEffects,
      (effect) => effect.condition,
      (leftEffect, rightEffect) =>
        leftEffect.kind === rightEffect.kind &&
        leftEffect.condition === rightEffect.condition &&
        sameActiveEffectSource(leftEffect, rightEffect) &&
        sameExpiration(leftEffect.expiresAt, rightEffect.expiresAt),
    )
  );
}

export function sameSaveGatedDamageExecution(
  left: SaveGatedDamageSpellProcedureExecution,
  right: SaveGatedDamageSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    sameSpellInvocationCastingTime(left.castingTime, right.castingTime) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    sameMultisetBy(
      left.additionalDamageComponents,
      right.additionalDamageComponents,
      sameSpellDamageFacts,
    ) &&
    left.successDamage === right.successDamage &&
    left.rangeFeet === right.rangeFeet &&
    sameSetByKey(
      left.failedSavePostDamageRiders,
      right.failedSavePostDamageRiders,
      (rider) => rider.kind,
      sameFailedSavePostDamageRider,
    ) &&
    sameMultisetBy(
      left.failedSaveConditionEffects,
      right.failedSaveConditionEffects,
      sameFailedSaveConditionEffect,
    ) &&
    (left.failedSaveAbilityChoices === null ||
    right.failedSaveAbilityChoices === null
      ? left.failedSaveAbilityChoices === right.failedSaveAbilityChoices
      : samePrimitiveSet(
          left.failedSaveAbilityChoices,
          right.failedSaveAbilityChoices,
        )) &&
    sameSavingThrowRollModeRule(
      left.saveRollModeRule,
      right.saveRollModeRule,
    ) &&
    samePostSaveAreaEffect(left.postSaveAreaEffect, right.postSaveAreaEffect)
  );
}
