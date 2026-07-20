import { Match } from "effect";
import type { DcSource, DiceExpr } from "@dnd/surface/surface/types";
import type { BattleActiveEffectExpiration } from "./active-effect/types.ts";
import type {
  AbilityD20TestRollModeSaveGateSpellProcedureExecution,
  AfterHitDamageAndIlluminationSpellProcedureExecution,
  AfterHitDamageSpellProcedureExecution,
  AfterHitSaveGatedConditionSpellProcedureExecution,
  AfterHitTimedDamageAndSaveSpellProcedureExecution,
  AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution,
  ChainedSpellAttackDamageSpellProcedureExecution,
  ChosenDamageResistanceSpellProcedureExecution,
  CloudkillAreaHazardSpellProcedureExecution,
  CommandSpellProcedureExecution,
  ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution,
  ConditionRemovalProtectionSpellProcedureExecution,
  DamageReductionSpellProcedureExecution,
  DancingLightsCombinedCastSpellProcedureExecution,
  DancingLightsRepositionSpellProcedureExecution,
  DancingLightsSeparateCastSpellProcedureExecution,
  DirectHitPointRestorationSpellProcedureExecution,
  DragonsBreathInitialSpellProcedureExecution,
  HypnoticPatternSpellProcedureExecution,
  InsectPlagueAreaHazardSpellProcedureExecution,
} from "./character-execution.ts";
import { samePrimitiveSet } from "./mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameDcSource(left: DcSource, right: DcSource): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      caster_spell_save_dc: () => right.kind === "caster_spell_save_dc",
      fixed: (value) => right.kind === "fixed" && value.dc === right.dc,
      weapon_attack_dc: (value) =>
        right.kind === "weapon_attack_dc" && value.base === right.base,
      innate_dc: (value) =>
        right.kind === "innate_dc" &&
        value.base === right.base &&
        value.ability === right.ability,
    }),
  );
}

export function sameDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat &&
    left.spellcastingMod === right.spellcastingMod &&
    left.abilityModifier === right.abilityModifier
  );
}

export function sameExpiration(
  left: BattleActiveEffectExpiration,
  right: BattleActiveEffectExpiration,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      startOfTurn: (value) =>
        right.kind === "startOfTurn" &&
        value.combatantId === right.combatantId,
      endOfTurn: (value) =>
        right.kind === "endOfTurn" &&
        value.combatantId === right.combatantId &&
        value.round === right.round,
      concentration: (value) =>
        right.kind === "concentration" &&
        value.combatantId === right.combatantId &&
        value.durationTicks === right.durationTicks,
      duration: (value) =>
        right.kind === "duration" &&
        value.durationTicks === right.durationTicks,
      untilDispelled: () => right.kind === "untilDispelled",
    }),
  );
}

type FailedSaveConditionEffect =
  AfterHitSaveGatedConditionSpellProcedureExecution["effect"];
type ConditionEscape = Exclude<FailedSaveConditionEffect["escape"], null>;
type ConditionRepeatSave = Exclude<FailedSaveConditionEffect["repeatSave"], null>;

function sameConditionEscape(
  left: ConditionEscape | null,
  right: ConditionEscape | null,
): boolean {
  if (left === null || right === null) return left === right;
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      abilityCheck: (value) =>
        right.kind === "abilityCheck" &&
        value.ability === right.ability &&
        value.skill === right.skill &&
        value.allowedActor === right.allowedActor &&
        value.successEnds === right.successEnds,
      targetDamagedByCasterOrAlly: () =>
        right.kind === "targetDamagedByCasterOrAlly",
    }),
  );
}

function sameConditionRepeatSave(
  left: ConditionRepeatSave | null,
  right: ConditionRepeatSave | null,
): boolean {
  if (left === null || right === null) return left === right;
  if ("kind" in left || "kind" in right) {
    return (
      "kind" in left &&
      "kind" in right &&
      left.successThreshold === right.successThreshold &&
      left.failureThreshold === right.failureThreshold &&
      left.save.ability === right.save.ability &&
      sameDcSource(left.save.dc, right.save.dc) &&
      samePrimitiveSet(
        left.savingThrowDisadvantageAbilities,
        right.savingThrowDisadvantageAbilities,
      )
    );
  }
  return left.ability === right.ability && sameDcSource(left.dc, right.dc);
}

function sameConditionExpiration(
  left: FailedSaveConditionEffect["expiresAt"],
  right: FailedSaveConditionEffect["expiresAt"],
): boolean {
  if (typeof left === "string" || typeof right === "string") {
    return left === right;
  }
  return left.kind === right.kind && left.durationTicks === right.durationTicks;
}

export function sameFailedSaveConditionEffect(
  left: FailedSaveConditionEffect,
  right: FailedSaveConditionEffect,
): boolean {
  if (
    left.kind !== right.kind ||
    !sameConditionExpiration(left.expiresAt, right.expiresAt) ||
    !sameConditionEscape(left.escape, right.escape) ||
    !sameConditionRepeatSave(left.repeatSave, right.repeatSave)
  ) {
    return false;
  }
  if (left.turnStartDamage === null || right.turnStartDamage === null) {
    if (left.turnStartDamage !== right.turnStartDamage) return false;
  } else if (
    !sameDiceExpr(left.turnStartDamage.expr, right.turnStartDamage.expr) ||
    left.turnStartDamage.damageType !== right.turnStartDamage.damageType
  ) {
    return false;
  }
  return left.kind === "fixed"
    ? right.kind === "fixed" && left.condition === right.condition
    : right.kind === "choice" && samePrimitiveSet(left.choices, right.choices);
}

export function sameAbilityD20TestRollModeSaveGateExecution(
  left: AbilityD20TestRollModeSaveGateSpellProcedureExecution,
  right: AbilityD20TestRollModeSaveGateSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.successEffect.sourceCombatantId ===
      right.successEffect.sourceCombatantId &&
    left.successEffect.kind === right.successEffect.kind &&
    left.successEffect.mode === right.successEffect.mode &&
    sameExpiration(left.successEffect.expiresAt, right.successEffect.expiresAt) &&
    left.failedSaveEffect.sourceCombatantId ===
      right.failedSaveEffect.sourceCombatantId &&
    left.failedSaveEffect.kind === right.failedSaveEffect.kind &&
    left.failedSaveEffect.ability === right.failedSaveEffect.ability &&
    left.failedSaveEffect.mode === right.failedSaveEffect.mode &&
    left.failedSaveEffect.save.ability === right.failedSaveEffect.save.ability &&
    sameDcSource(left.failedSaveEffect.save.dc, right.failedSaveEffect.save.dc) &&
    sameExpiration(
      left.failedSaveEffect.expiresAt,
      right.failedSaveEffect.expiresAt,
    ) &&
    left.failedSaveDamagePenaltyEffect.sourceCombatantId ===
      right.failedSaveDamagePenaltyEffect.sourceCombatantId &&
    left.failedSaveDamagePenaltyEffect.kind ===
      right.failedSaveDamagePenaltyEffect.kind &&
    left.failedSaveDamagePenaltyEffect.amount.dice ===
      right.failedSaveDamagePenaltyEffect.amount.dice &&
    left.failedSaveDamagePenaltyEffect.amount.dieSize ===
      right.failedSaveDamagePenaltyEffect.amount.dieSize &&
    sameExpiration(
      left.failedSaveDamagePenaltyEffect.expiresAt,
      right.failedSaveDamagePenaltyEffect.expiresAt,
    )
  );
}

export function sameAfterHitDamageExecution(
  left: AfterHitDamageSpellProcedureExecution,
  right: AfterHitDamageSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameDiceExpr(left.damage.expr, right.damage.expr) &&
    left.damage.damageType === right.damage.damageType &&
    samePrimitiveSet(
      left.conditionalBonusDamage.targetCreatureTypes,
      right.conditionalBonusDamage.targetCreatureTypes,
    ) &&
    sameDiceExpr(
      left.conditionalBonusDamage.expr,
      right.conditionalBonusDamage.expr,
    ) &&
    left.conditionalBonusDamage.damageType ===
      right.conditionalBonusDamage.damageType
  );
}

export function sameAfterHitDamageAndIlluminationExecution(
  left: AfterHitDamageAndIlluminationSpellProcedureExecution,
  right: AfterHitDamageAndIlluminationSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameDiceExpr(left.damage.expr, right.damage.expr) &&
    left.damage.damageType === right.damage.damageType &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameAfterHitSaveGatedConditionExecution(
  left: AfterHitSaveGatedConditionSpellProcedureExecution,
  right: AfterHitSaveGatedConditionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.targeting.kind === right.targeting.kind &&
    sameFailedSaveConditionEffect(left.effect, right.effect)
  );
}

export function sameAfterHitTimedDamageAndSaveExecution(
  left: AfterHitTimedDamageAndSaveSpellProcedureExecution,
  right: AfterHitTimedDamageAndSaveSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameDiceExpr(left.immediateDamage.expr, right.immediateDamage.expr) &&
    left.immediateDamage.damageType === right.immediateDamage.damageType &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.source === right.activeEffect.source &&
    sameDiceExpr(left.activeEffect.damage.expr, right.activeEffect.damage.expr) &&
    left.activeEffect.damage.damageType === right.activeEffect.damage.damageType &&
    left.activeEffect.save.ability === right.activeEffect.save.ability &&
    sameDcSource(left.activeEffect.save.dc, right.activeEffect.save.dc) &&
    left.activeEffect.save.successEnds === right.activeEffect.save.successEnds &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameAntimagicFieldOngoingSpellSuppressionExecution(
  left: AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution,
  right: AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.radiusFeet === right.targeting.radiusFeet
  );
}

export function sameChainedSpellAttackDamageExecution(
  left: ChainedSpellAttackDamageSpellProcedureExecution,
  right: ChainedSpellAttackDamageSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    sameDiceExpr(left.damage.expr, right.damage.expr) &&
    samePrimitiveSet(left.damageTypeChoices, right.damageTypeChoices) &&
    left.leapRangeFeet === right.leapRangeFeet &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind
  );
}

export function sameChosenDamageResistanceExecution(
  left: ChosenDamageResistanceSpellProcedureExecution,
  right: ChosenDamageResistanceSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    samePrimitiveSet(left.damageTypeChoices, right.damageTypeChoices) &&
    sameExpiration(left.expiresAt, right.expiresAt) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.targeting.requiredTargetDisposition ===
      right.targeting.requiredTargetDisposition
  );
}

export function sameCloudkillAreaHazardExecution(
  left: CloudkillAreaHazardSpellProcedureExecution,
  right: CloudkillAreaHazardSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.radiusFeet === right.targeting.radiusFeet &&
    sameDiceExpr(left.damage.expr, right.damage.expr) &&
    left.damage.damageType === right.damage.damageType
  );
}

export function sameCommandExecution(
  left: CommandSpellProcedureExecution,
  right: CommandSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets
  );
}

export function sameConditionImmunityAndTurnStartTemporaryHitPointsExecution(
  left: ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution,
  right: ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution,
): boolean {
  const leftImmunity = left.activeEffects[0];
  const rightImmunity = right.activeEffects[0];
  const leftTemporaryHitPoints = left.activeEffects[1];
  const rightTemporaryHitPoints = right.activeEffects[1];

  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    leftImmunity.sourceCombatantId === rightImmunity.sourceCombatantId &&
    leftImmunity.kind === rightImmunity.kind &&
    leftImmunity.condition === rightImmunity.condition &&
    sameExpiration(leftImmunity.expiresAt, rightImmunity.expiresAt) &&
    leftTemporaryHitPoints.sourceCombatantId ===
      rightTemporaryHitPoints.sourceCombatantId &&
    leftTemporaryHitPoints.kind === rightTemporaryHitPoints.kind &&
    leftTemporaryHitPoints.amount === rightTemporaryHitPoints.amount &&
    sameExpiration(
      leftTemporaryHitPoints.expiresAt,
      rightTemporaryHitPoints.expiresAt,
    )
  );
}

export function sameConditionRemovalProtectionExecution(
  left: ConditionRemovalProtectionSpellProcedureExecution,
  right: ConditionRemovalProtectionSpellProcedureExecution,
): boolean {
  const leftConditionSaveRollMode = left.protection.conditionSaveRollMode;
  const rightConditionSaveRollMode = right.protection.conditionSaveRollMode;
  const leftDamageResistance = left.protection.damageResistance;
  const rightDamageResistance = right.protection.damageResistance;

  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    leftConditionSaveRollMode.sourceCombatantId ===
      rightConditionSaveRollMode.sourceCombatantId &&
    leftConditionSaveRollMode.kind === rightConditionSaveRollMode.kind &&
    leftConditionSaveRollMode.condition === rightConditionSaveRollMode.condition &&
    leftConditionSaveRollMode.mode === rightConditionSaveRollMode.mode &&
    sameExpiration(
      leftConditionSaveRollMode.expiresAt,
      rightConditionSaveRollMode.expiresAt,
    ) &&
    leftDamageResistance.sourceCombatantId ===
      rightDamageResistance.sourceCombatantId &&
    leftDamageResistance.kind === rightDamageResistance.kind &&
    leftDamageResistance.damageType === rightDamageResistance.damageType &&
    sameExpiration(
      leftDamageResistance.expiresAt,
      rightDamageResistance.expiresAt,
    )
  );
}

export function sameDamageReductionExecution(
  left: DamageReductionSpellProcedureExecution,
  right: DamageReductionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.amount.dice === right.amount.dice &&
    left.amount.dieSize === right.amount.dieSize &&
    samePrimitiveSet(left.damageTypeChoices, right.damageTypeChoices) &&
    sameExpiration(left.expiresAt, right.expiresAt) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.targeting.requiredTargetDisposition ===
      right.targeting.requiredTargetDisposition
  );
}

export function sameDancingLightsCombinedCastExecution(
  left: DancingLightsCombinedCastSpellProcedureExecution,
  right: DancingLightsCombinedCastSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.form === right.form &&
    left.dimRadiusFeet === right.dimRadiusFeet &&
    left.rangeFeet === right.rangeFeet &&
    left.maxMoveFeet === right.maxMoveFeet &&
    left.spacingFeet === right.spacingFeet &&
    sameExpiration(left.expiresAt, right.expiresAt)
  );
}

export function sameDancingLightsRepositionExecution(
  left: DancingLightsRepositionSpellProcedureExecution,
  right: DancingLightsRepositionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffectRef === right.activeEffectRef &&
    left.sourceDancingLightsProcedureRef ===
      right.sourceDancingLightsProcedureRef &&
    left.maxMoveFeet === right.maxMoveFeet &&
    left.rangeFeet === right.rangeFeet &&
    left.spacingFeet === right.spacingFeet
  );
}

export function sameDancingLightsSeparateCastExecution(
  left: DancingLightsSeparateCastSpellProcedureExecution,
  right: DancingLightsSeparateCastSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.form === right.form &&
    left.dimRadiusFeet === right.dimRadiusFeet &&
    left.rangeFeet === right.rangeFeet &&
    left.maxMoveFeet === right.maxMoveFeet &&
    left.spacingFeet === right.spacingFeet &&
    sameExpiration(left.expiresAt, right.expiresAt)
  );
}

function sameDirectHitPointRestorationTargeting(
  left: DirectHitPointRestorationSpellProcedureExecution["targeting"],
  right: DirectHitPointRestorationSpellProcedureExecution["targeting"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      targetList: (value) =>
        right.kind === "targetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets,
      pointOriginSphereTargetList: (value) =>
        right.kind === "pointOriginSphereTargetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets &&
        value.area.kind === right.area.kind &&
        value.area.radiusFeet === right.area.radiusFeet,
    }),
  );
}

export function sameDirectHitPointRestorationExecution(
  left: DirectHitPointRestorationSpellProcedureExecution,
  right: DirectHitPointRestorationSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameDiceExpr(left.healing.expr, right.healing.expr) &&
    left.rangeFeet === right.rangeFeet &&
    sameDirectHitPointRestorationTargeting(left.targeting, right.targeting)
  );
}

export function sameDragonsBreathInitialExecution(
  left: DragonsBreathInitialSpellProcedureExecution,
  right: DragonsBreathInitialSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    samePrimitiveSet(left.damageTypeChoices, right.damageTypeChoices) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.originalSlotLevel ===
      right.activeEffect.originalSlotLevel &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameHypnoticPatternExecution(
  left: HypnoticPatternSpellProcedureExecution,
  right: HypnoticPatternSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.sideFeet === right.targeting.sideFeet
  );
}

export function sameInsectPlagueAreaHazardExecution(
  left: InsectPlagueAreaHazardSpellProcedureExecution,
  right: InsectPlagueAreaHazardSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.radiusFeet === right.targeting.radiusFeet &&
    sameDiceExpr(left.damage.expr, right.damage.expr) &&
    left.damage.damageType === right.damage.damageType
  );
}
