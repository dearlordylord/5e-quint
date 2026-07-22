import { Match } from "effect";

import type { SpellProcedureExecutionByProcedure } from "./character-execution.ts";
import { sameMultisetBy, samePrimitiveSet } from "./mechanical-equality.ts";
import {
  sameActiveEffectSource,
  sameSpellDamageFacts,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameDcSource,
  sameDiceExpr,
  sameExpiration,
  sameFailedSaveConditionEffect,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

type MagicalDarknessPointOriginExecution =
  SpellProcedureExecutionByProcedure["magicalDarknessPointOrigin"];
type MagicWeaponEnhancementExecution =
  SpellProcedureExecutionByProcedure["magicWeaponEnhancement"];
type MakeStableExecution = SpellProcedureExecutionByProcedure["makeStable"];
type OngoingSpellEndExecution =
  SpellProcedureExecutionByProcedure["ongoingSpellEnd"];
type MarkedDamageRiderExecution =
  SpellProcedureExecutionByProcedure["markedDamageRider"];
type MarkedDamageRiderCastExecution = Extract<
  MarkedDamageRiderExecution,
  { readonly action: "cast" }
>;
type MarkedDamageRiderTransferExecution = Extract<
  MarkedDamageRiderExecution,
  { readonly action: "transfer" }
>;
type MarkedDamage = MarkedDamageRiderCastExecution["damage"];
type MirrorImageHitInterceptionExecution =
  SpellProcedureExecutionByProcedure["mirrorImageHitInterception"];
type MoonbeamExecution = SpellProcedureExecutionByProcedure["moonbeam"];
type ObjectContactDamageExecution =
  SpellProcedureExecutionByProcedure["objectContactDamage"];
type ObjectContactDamageRepeatExecution =
  SpellProcedureExecutionByProcedure["objectContactDamageRepeat"];
type ObjectLightExecution = SpellProcedureExecutionByProcedure["objectLight"];
type PersistentArmorEffectExecution =
  SpellProcedureExecutionByProcedure["persistentArmorEffect"];
type RepeatedDamageAllocationExecution =
  SpellProcedureExecutionByProcedure["repeatedDamageAllocation"];
type RollModifierExecution = SpellProcedureExecutionByProcedure["rollModifier"];
type SanctuaryTargetingInterdictionExecution =
  SpellProcedureExecutionByProcedure["sanctuaryTargetingInterdiction"];
type SaveGatedAttackRollAdvantageExecution =
  SpellProcedureExecutionByProcedure["saveGatedAttackRollAdvantage"];
type SaveGatedConditionExecution =
  SpellProcedureExecutionByProcedure["saveGatedCondition"];
type ScalarBuffExecution = SpellProcedureExecutionByProcedure["scalarBuff"];
type ScalarBuffActiveEffect = Extract<
  ScalarBuffExecution["effect"],
  { readonly kind: "activeEffect" }
>["activeEffect"];
type SelfTransformationModeExecution =
  SpellProcedureExecutionByProcedure["selfTransformationMode"];
type SleetStormAreaHazardExecution =
  SpellProcedureExecutionByProcedure["sleetStormAreaHazard"];
type SlowActivePenaltiesExecution =
  SpellProcedureExecutionByProcedure["slowActivePenalties"];
type SpellAttackDamageExecution =
  SpellProcedureExecutionByProcedure["spellAttackDamage"];
type SpellAttackSequenceExecution =
  SpellProcedureExecutionByProcedure["spellAttackSequence"];
type SpikeGrowthMovementHazardExecution =
  SpellProcedureExecutionByProcedure["spikeGrowthMovementHazard"];
type SpiritualWeaponAttackProxyExecution =
  SpellProcedureExecutionByProcedure["spiritualWeaponAttackProxy"];
type WebRestraintHazardExecution =
  SpellProcedureExecutionByProcedure["webRestraintHazard"];
type WeaponAttackOverrideExecution =
  SpellProcedureExecutionByProcedure["weaponAttackOverride"];
type WeaponDamageRiderExecution =
  SpellProcedureExecutionByProcedure["weaponDamageRider"];
type ObjectContactDamage = ObjectContactDamageExecution["damage"];

function sameMoonbeamDc(
  left: MoonbeamExecution["dc"],
  right: MoonbeamExecution["dc"],
): boolean {
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

function sameMoonbeamDamage(
  left: MoonbeamExecution["damage"],
  right: MoonbeamExecution["damage"],
): boolean {
  return (
    left.damageType === right.damageType &&
    left.expr.dice === right.expr.dice &&
    left.expr.dieSize === right.expr.dieSize &&
    left.expr.flat === right.expr.flat &&
    left.expr.spellcastingMod === right.expr.spellcastingMod &&
    left.expr.abilityModifier === right.expr.abilityModifier
  );
}

function sameObjectContactDamage(
  left: ObjectContactDamage,
  right: ObjectContactDamage,
): boolean {
  return (
    left.damageType === right.damageType &&
    left.expr.dice === right.expr.dice &&
    left.expr.dieSize === right.expr.dieSize &&
    left.expr.flat === right.expr.flat &&
    left.expr.spellcastingMod === right.expr.spellcastingMod &&
    left.expr.abilityModifier === right.expr.abilityModifier
  );
}

function sameObjectLightExpiration(
  left: ObjectLightExecution["expiresAt"],
  right: ObjectLightExecution["expiresAt"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      startOfTurn: (value) =>
        right.kind === "startOfTurn" && value.combatantId === right.combatantId,
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

function sameObjectLightTargeting(
  left: ObjectLightExecution["targeting"],
  right: ObjectLightExecution["targeting"],
): boolean {
  return (
    left.kind === right.kind &&
    Match.value(left.object).pipe(
      Match.discriminatorsExhaustive("kind")({
        lightCantripObject: (value) =>
          right.object.kind === "lightCantripObject" &&
          value.maxSize === right.object.maxSize,
        touchedObject: () => right.object.kind === "touchedObject",
      }),
    )
  );
}

function sameRepeatedDamageAllocationDamage(
  left: RepeatedDamageAllocationExecution["damage"],
  right: RepeatedDamageAllocationExecution["damage"],
): boolean {
  return (
    left.damageType === right.damageType &&
    left.expr.dice === right.expr.dice &&
    left.expr.dieSize === right.expr.dieSize &&
    left.expr.flat === right.expr.flat &&
    left.expr.spellcastingMod === right.expr.spellcastingMod &&
    left.expr.abilityModifier === right.expr.abilityModifier
  );
}

function sameRollModifierDelta(
  left: Extract<
    RollModifierExecution["effect"],
    { readonly kind: "d20RollModifier" }
  >["delta"],
  right: Extract<
    RollModifierExecution["effect"],
    { readonly kind: "d20RollModifier" }
  >["delta"],
): boolean {
  if ("kind" in left) {
    return (
      "kind" in right &&
      left.kind === right.kind &&
      left.sign === right.sign &&
      left.amount === right.amount
    );
  }
  return (
    !("kind" in right) &&
    left.sign === right.sign &&
    left.dice === right.dice &&
    left.dieSize === right.dieSize
  );
}

function sameRollModifierEffect(
  left: RollModifierExecution["effect"],
  right: RollModifierExecution["effect"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      d20RollModifier: (value) =>
        right.kind === "d20RollModifier" &&
        value.sourceCombatantId === right.sourceCombatantId &&
        samePrimitiveSet(value.on, right.on) &&
        sameRollModifierDelta(value.delta, right.delta) &&
        value.skill === right.skill &&
        sameExpiration(value.expiresAt, right.expiresAt),
      abilityCheckRollMode: (value) =>
        right.kind === "abilityCheckRollMode" &&
        value.sourceCombatantId === right.sourceCombatantId &&
        value.mode === right.mode &&
        sameExpiration(value.expiresAt, right.expiresAt),
    }),
  );
}

function sameRollModifierSaveGate(
  left: RollModifierExecution["saveGate"],
  right: RollModifierExecution["saveGate"],
): boolean {
  return left === null || right === null
    ? left === right
    : left.ability === right.ability && sameDcSource(left.dc, right.dc);
}

function sameRollModifierTargeting(
  left: RollModifierExecution["targeting"],
  right: RollModifierExecution["targeting"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      targetList: (value) =>
        right.kind === "targetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets &&
        value.requiredTargetDisposition === right.requiredTargetDisposition,
      selfAndChosenLegalTargets: (value) =>
        right.kind === "selfAndChosenLegalTargets" &&
        value.minTargets === right.minTargets,
    }),
  );
}

function sameRollModifierChoices(
  left: RollModifierExecution,
  right: RollModifierExecution,
): boolean {
  const sameSkillChoices =
    left.skillChoices === null || right.skillChoices === null
      ? left.skillChoices === right.skillChoices
      : samePrimitiveSet(left.skillChoices, right.skillChoices);
  const sameAbilityChoices =
    left.abilityChoices === null || right.abilityChoices === null
      ? left.abilityChoices === right.abilityChoices
      : samePrimitiveSet(left.abilityChoices, right.abilityChoices);
  const sameAbilityChoiceApplication =
    "abilityChoiceApplication" in left
      ? "abilityChoiceApplication" in right &&
        left.abilityChoiceApplication === right.abilityChoiceApplication
      : !("abilityChoiceApplication" in right);
  return sameSkillChoices && sameAbilityChoices && sameAbilityChoiceApplication;
}

function sameSpellAttackDamagePayload(
  left: SpellAttackDamageExecution["damage"],
  right: SpellAttackDamageExecution["damage"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      fixedSpellAttackDamage: (value) =>
        right.kind === "fixedSpellAttackDamage" &&
        sameDiceExpr(value.expr, right.expr) &&
        value.damageType === right.damageType,
      sorcerousBurstDamageTypeChoice: (value) =>
        right.kind === "sorcerousBurstDamageTypeChoice" &&
        sameDiceExpr(value.expr, right.expr) &&
        samePrimitiveSet(value.damageTypeChoices, right.damageTypeChoices) &&
        value.maxDieAdditionalDiceLimit === right.maxDieAdditionalDiceLimit,
      selectedSorcerousBurstDamage: (value) =>
        right.kind === "selectedSorcerousBurstDamage" &&
        sameDiceExpr(value.expr, right.expr) &&
        value.damageType === right.damageType &&
        value.maxDieAdditionalDiceLimit === right.maxDieAdditionalDiceLimit,
    }),
  );
}

function sameSpellPostDamageRider(
  left: SpellAttackDamageExecution["postDamageRiders"][number],
  right: SpellAttackDamageExecution["postDamageRiders"][number],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      speedDelta: (value) =>
        right.kind === "speedDelta" && value.deltaFeet === right.deltaFeet,
      condition: (value) =>
        right.kind === "condition" &&
        value.condition === right.condition &&
        value.expiresAt === right.expiresAt,
      opportunityAttackDenied: (value) =>
        right.kind === "opportunityAttackDenied" &&
        value.expiresAt === right.expiresAt,
      nextAttackRollAgainstTarget: (value) =>
        right.kind === "nextAttackRollAgainstTarget" &&
        value.mode === right.mode &&
        value.expiresAt === right.expiresAt,
      hitPointRegainPrevented: (value) =>
        right.kind === "hitPointRegainPrevented" &&
        value.expiresAt === right.expiresAt,
      invisibleBenefitDenied: (value) =>
        right.kind === "invisibleBenefitDenied" &&
        value.expiresAt === right.expiresAt,
      lightEmission: (value) =>
        right.kind === "lightEmission" &&
        value.emission.kind === right.emission.kind &&
        value.emission.radiusFeet === right.emission.radiusFeet &&
        value.expiresAt === right.expiresAt,
    }),
  );
}

function sameSpellAttackLaterDamage(
  left: SpellAttackDamageExecution["laterDamage"],
  right: SpellAttackDamageExecution["laterDamage"],
): boolean {
  return left === null || right === null
    ? left === right
    : sameSpellDamageFacts(left, right);
}

export function sameMagicalDarknessPointOriginExecution(
  left: MagicalDarknessPointOriginExecution,
  right: MagicalDarknessPointOriginExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.dispelledSpellCreatedLightMaxSpellLevel ===
      right.dispelledSpellCreatedLightMaxSpellLevel &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.radiusFeet === right.targeting.radiusFeet
  );
}

export function sameMagicWeaponEnhancementExecution(
  left: MagicWeaponEnhancementExecution,
  right: MagicWeaponEnhancementExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.bonus === right.bonus &&
    left.durationTicks === right.durationTicks
  );
}

export function sameMakeStableExecution(
  left: MakeStableExecution,
  right: MakeStableExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet
  );
}

export function sameOngoingSpellEndExecution(
  left: OngoingSpellEndExecution,
  right: OngoingSpellEndExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet
  );
}

function sameMarkedDamage(left: MarkedDamage, right: MarkedDamage): boolean {
  return (
    left.damageType === right.damageType &&
    left.expr.dice === right.expr.dice &&
    left.expr.dieSize === right.expr.dieSize &&
    left.expr.flat === right.expr.flat
  );
}

function sameMarkedExpiration(
  left: MarkedDamageRiderCastExecution["expiresAt"],
  right: MarkedDamageRiderCastExecution["expiresAt"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      startOfTurn: (value) =>
        right.kind === "startOfTurn" && value.combatantId === right.combatantId,
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

function sameMarkedCastAbilityCheckBehavior(
  left: MarkedDamageRiderCastExecution["abilityCheckBehavior"],
  right: MarkedDamageRiderCastExecution["abilityCheckBehavior"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      none: () => right.kind === "none",
      chosenAbilityDisadvantage: (value) =>
        right.kind === "chosenAbilityDisadvantage" &&
        samePrimitiveSet(value.choices, right.choices),
      findingAdvantage: (value) =>
        right.kind === "findingAdvantage" &&
        value.ability === right.ability &&
        samePrimitiveSet(value.skills, right.skills),
    }),
  );
}

function sameMarkedDamageRiderCastExecution(
  left: MarkedDamageRiderCastExecution,
  right: MarkedDamageRiderCastExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.action === right.action &&
    left.actionCost === right.actionCost &&
    sameMarkedDamage(left.damage, right.damage) &&
    sameMarkedExpiration(left.expiresAt, right.expiresAt) &&
    sameMarkedCastAbilityCheckBehavior(
      left.abilityCheckBehavior,
      right.abilityCheckBehavior,
    ) &&
    left.rangeFeet === right.rangeFeet &&
    left.retargetTiming === right.retargetTiming &&
    left.targeting.kind === right.targeting.kind
  );
}

function sameMarkedDamageRiderTransferExecution(
  left: MarkedDamageRiderTransferExecution,
  right: MarkedDamageRiderTransferExecution,
): boolean {
  return (
    left.action === right.action &&
    left.activeEffectRef === right.activeEffectRef &&
    left.activeEffectSourceProcedureRef === right.activeEffectSourceProcedureRef
  );
}

export function sameMarkedDamageRiderExecution(
  left: MarkedDamageRiderExecution,
  right: MarkedDamageRiderExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("action")({
      cast: (value) =>
        right.action === "cast" &&
        sameMarkedDamageRiderCastExecution(value, right),
      transfer: (value) =>
        right.action === "transfer" &&
        sameMarkedDamageRiderTransferExecution(value, right),
    }),
  );
}

export function sameMirrorImageHitInterceptionExecution(
  left: MirrorImageHitInterceptionExecution,
  right: MirrorImageHitInterceptionExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.remainingDuplicates ===
      right.activeEffect.remainingDuplicates &&
    left.activeEffect.expiresAt.kind === right.activeEffect.expiresAt.kind &&
    left.activeEffect.expiresAt.durationTicks ===
      right.activeEffect.expiresAt.durationTicks
  );
}

export function sameMoonbeamExecution(
  left: MoonbeamExecution,
  right: MoonbeamExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameMoonbeamDamage(left.damage, right.damage) &&
    sameMoonbeamDc(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.repositionMaxMoveFeet === right.repositionMaxMoveFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.radiusFeet === right.targeting.radiusFeet &&
    left.targeting.heightFeet === right.targeting.heightFeet
  );
}

export function sameObjectContactDamageExecution(
  left: ObjectContactDamageExecution,
  right: ObjectContactDamageExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameObjectContactDamage(left.damage, right.damage) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind
  );
}

export function sameObjectContactDamageRepeatExecution(
  left: ObjectContactDamageRepeatExecution,
  right: ObjectContactDamageRepeatExecution,
): boolean {
  return (
    left.activeEffectRef === right.activeEffectRef &&
    left.activeEffectSourceProcedureRef === right.activeEffectSourceProcedureRef
  );
}

export function sameObjectLightExecution(
  left: ObjectLightExecution,
  right: ObjectLightExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameObjectLightExpiration(left.expiresAt, right.expiresAt) &&
    left.light.kind === right.light.kind &&
    left.light.brightRadiusFeet === right.light.brightRadiusFeet &&
    left.light.dimAdditionalFeet === right.light.dimAdditionalFeet &&
    sameObjectLightTargeting(left.targeting, right.targeting)
  );
}

export function samePersistentArmorEffectExecution(
  left: PersistentArmorEffectExecution,
  right: PersistentArmorEffectExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.rangeFeet === right.rangeFeet &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.base === right.activeEffect.base &&
    left.activeEffect.ability === right.activeEffect.ability &&
    left.activeEffect.earlyEnds[0].kind ===
      right.activeEffect.earlyEnds[0].kind &&
    left.activeEffect.expiresAt.durationTicks ===
      right.activeEffect.expiresAt.durationTicks
  );
}

export function sameRepeatedDamageAllocationExecution(
  left: RepeatedDamageAllocationExecution,
  right: RepeatedDamageAllocationExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    sameRepeatedDamageAllocationDamage(left.damage, right.damage) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.repeatedEffectCount === right.targeting.repeatedEffectCount
  );
}

export function sameRollModifierExecution(
  left: RollModifierExecution,
  right: RollModifierExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameRollModifierEffect(left.effect, right.effect) &&
    left.rangeFeet === right.rangeFeet &&
    sameRollModifierSaveGate(left.saveGate, right.saveGate) &&
    sameRollModifierTargeting(left.targeting, right.targeting) &&
    sameRollModifierChoices(left, right)
  );
}

export function sameSanctuaryTargetingInterdictionExecution(
  left: SanctuaryTargetingInterdictionExecution,
  right: SanctuaryTargetingInterdictionExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    left.activeEffect.save.ability === right.activeEffect.save.ability &&
    sameDcSource(left.activeEffect.save.dc, right.activeEffect.save.dc) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameSleetStormAreaHazardExecution(
  left: SleetStormAreaHazardExecution,
  right: SleetStormAreaHazardExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameSlowActivePenaltiesExecution(
  left: SlowActivePenaltiesExecution,
  right: SlowActivePenaltiesExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    left.actionCost === right.actionCost &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.maxTargets === right.maxTargets &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameSpellAttackDamageExecution(
  left: SpellAttackDamageExecution,
  right: SpellAttackDamageExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    sameSpellAttackDamagePayload(left.damage, right.damage) &&
    sameSpellAttackLaterDamage(left.laterDamage, right.laterDamage) &&
    left.missDamage === right.missDamage &&
    left.objectHitEffect.kind === right.objectHitEffect.kind &&
    sameMultisetBy(
      left.postDamageRiders,
      right.postDamageRiders,
      sameSpellPostDamageRider,
    ) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameSpellAttackSequenceExecution(
  left: SpellAttackSequenceExecution,
  right: SpellAttackSequenceExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.countSource === right.targeting.countSource &&
    left.targeting.attackCount === right.targeting.attackCount
  );
}

export function sameSpikeGrowthMovementHazardExecution(
  left: SpikeGrowthMovementHazardExecution,
  right: SpikeGrowthMovementHazardExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.damagePerFeet === right.damagePerFeet &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameSpiritualWeaponAttackProxyExecution(
  left: SpiritualWeaponAttackProxyExecution,
  right: SpiritualWeaponAttackProxyExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    left.damage.kind === right.damage.kind &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.durationTicks === right.durationTicks &&
    left.forceReachFeet === right.forceReachFeet &&
    left.rangeFeet === right.rangeFeet &&
    left.repeatMoveMaxFeet === right.repeatMoveMaxFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameWeaponAttackOverrideExecution(
  left: WeaponAttackOverrideExecution,
  right: WeaponAttackOverrideExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    left.activeEffect.weaponItemId === right.activeEffect.weaponItemId &&
    left.activeEffect.spellcastingAbilityModifier ===
      right.activeEffect.spellcastingAbilityModifier &&
    left.activeEffect.attackBonus === right.activeEffect.attackBonus &&
    sameDiceExpr(
      left.activeEffect.damage.expr,
      right.activeEffect.damage.expr,
    ) &&
    samePrimitiveSet(
      left.activeEffect.damageTypeChoices,
      right.activeEffect.damageTypeChoices,
    ) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameWeaponDamageRiderExecution(
  left: WeaponDamageRiderExecution,
  right: WeaponDamageRiderExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameSpellDamageFacts(left.activeEffect.damage, right.activeEffect.damage) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameSaveGatedAttackRollAdvantageExecution(
  left: SaveGatedAttackRollAdvantageExecution,
  right: SaveGatedAttackRollAdvantageExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.effect.kind === right.effect.kind &&
    sameActiveEffectSource(left.effect, right.effect) &&
    sameExpiration(left.effect.expiresAt, right.effect.expiresAt)
  );
}

function sameSaveGatedConditionRollModeRule(
  left: SaveGatedConditionExecution["saveRollModeRule"],
  right: SaveGatedConditionExecution["saveRollModeRule"],
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

function sameOptionalCreatureTypeSet(
  left: SaveGatedConditionExecution["targetCreatureTypes"],
  right: SaveGatedConditionExecution["targetCreatureTypes"],
): boolean {
  if (left === null || right === null) return left === right;
  return samePrimitiveSet(left, right);
}

export function sameSaveGatedConditionExecution(
  left: SaveGatedConditionExecution,
  right: SaveGatedConditionExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    sameFailedSaveConditionEffect(left.effect, right.effect) &&
    left.rangeFeet === right.rangeFeet &&
    sameSaveGatedConditionRollModeRule(
      left.saveRollModeRule,
      right.saveRollModeRule,
    ) &&
    sameOptionalCreatureTypeSet(
      left.targetCreatureTypes,
      right.targetCreatureTypes,
    ) &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

function sameScalarBuffTargeting(
  left: ScalarBuffExecution["targeting"],
  right: ScalarBuffExecution["targeting"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      self: () => right.kind === "self",
      targetList: (value) =>
        right.kind === "targetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets &&
        value.requiredTargetDisposition === right.requiredTargetDisposition,
    }),
  );
}

function sameScalarBuffActiveEffect(
  left: ScalarBuffActiveEffect,
  right: ScalarBuffActiveEffect,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      speedDelta: (value) =>
        right.kind === "speedDelta" &&
        sameActiveEffectSource(value, right) &&
        value.deltaFeet === right.deltaFeet &&
        sameExpiration(value.expiresAt, right.expiresAt),
      specialSpeedGrant: (value) =>
        right.kind === "specialSpeedGrant" &&
        sameActiveEffectSource(value, right) &&
        value.speedKind === right.speedKind &&
        value.hover === right.hover &&
        sameExpiration(value.expiresAt, right.expiresAt) &&
        Match.value(value.speed).pipe(
          Match.discriminatorsExhaustive("kind")({
            equalToSpeed: () => right.speed.kind === "equalToSpeed",
            fixed: (speed) =>
              right.speed.kind === "fixed" &&
              speed.speedFeet === right.speed.speedFeet,
          }),
        ),
      spellArmorClassBonus: (value) =>
        right.kind === "spellArmorClassBonus" &&
        sameActiveEffectSource(value, right) &&
        value.bonus === right.bonus &&
        value.negatesRepeatedDamageAllocation ===
          right.negatesRepeatedDamageAllocation &&
        sameExpiration(value.expiresAt, right.expiresAt),
      spellArmorClassFloor: (value) =>
        right.kind === "spellArmorClassFloor" &&
        sameActiveEffectSource(value, right) &&
        value.floor === right.floor &&
        sameExpiration(value.expiresAt, right.expiresAt),
    }),
  );
}

function sameScalarBuffEffect(
  left: ScalarBuffExecution["effect"],
  right: ScalarBuffExecution["effect"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      temporaryHitPoints: (value) =>
        right.kind === "temporaryHitPoints" &&
        sameDiceExpr(value.amount.expr, right.amount.expr),
      activeEffect: (value) =>
        right.kind === "activeEffect" &&
        sameScalarBuffActiveEffect(value.activeEffect, right.activeEffect),
      hitPointMaximumIncrease: (value) =>
        right.kind === "hitPointMaximumIncrease" &&
        value.activeEffect.kind === right.activeEffect.kind &&
        sameActiveEffectSource(value.activeEffect, right.activeEffect) &&
        value.activeEffect.amount === right.activeEffect.amount &&
        sameExpiration(
          value.activeEffect.expiresAt,
          right.activeEffect.expiresAt,
        ),
    }),
  );
}

export function sameScalarBuffExecution(
  left: ScalarBuffExecution,
  right: ScalarBuffExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameScalarBuffEffect(left.effect, right.effect) &&
    left.rangeFeet === right.rangeFeet &&
    sameScalarBuffTargeting(left.targeting, right.targeting)
  );
}

export function sameSelfTransformationModeExecution(
  left: SelfTransformationModeExecution,
  right: SelfTransformationModeExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameExpiration(left.expiresAt, right.expiresAt) &&
    samePrimitiveSet(left.modeChoices, right.modeChoices) &&
    left.naturalWeaponFacts.damage.dice ===
      right.naturalWeaponFacts.damage.dice &&
    left.naturalWeaponFacts.damage.dieSize ===
      right.naturalWeaponFacts.damage.dieSize &&
    samePrimitiveSet(
      left.naturalWeaponFacts.damage.damageTypeChoices,
      right.naturalWeaponFacts.damage.damageTypeChoices,
    ) &&
    left.naturalWeaponFacts.spellcastingAbilityModifier ===
      right.naturalWeaponFacts.spellcastingAbilityModifier &&
    left.naturalWeaponFacts.attackBonus === right.naturalWeaponFacts.attackBonus
  );
}

export function sameWebRestraintHazardExecution(
  left: WebRestraintHazardExecution,
  right: WebRestraintHazardExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}
