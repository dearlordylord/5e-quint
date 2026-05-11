// Spell hole construction, fill validation, and damage application extracted from spells-holes-fills.ts.

import { Match } from "effect";
import {
  holeId,
  holeInstanceKey,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type {
  Ability,
  DamageType,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type { SupportedUnitFeatureProfile } from "../unit-feature-support.ts";
import {
  scalarBuffTemporaryHitPointsExpression,
  spellBurstDamageExpression,
  spellDamageComponents,
  spellDamageExpression,
  spellHealingExpression,
} from "./spell-effects.ts";
import {
  addDamageAmountForType,
  applyAvailableSpellDamageReduction,
  damageAmountAfterTargetAdjustments,
  damageAmountByTypeAfterTargetAdjustments,
} from "./damage-helpers.ts";
import {
  applyHpDamage,
  breakBattleConcentrationAfterDamage,
  markMarkedDamageRiderTransferAvailable,
} from "./damage-apply.ts";
import {
  attackRollMissToHitReplacementHolePayload,
  signedModifier,
} from "./statblock-attacks.ts";
import { hasDodgeBenefit } from "./attack-roll.ts";
import { spellTargetHasNonSpatialPrerequisites } from "./spells-targeting.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  type BattleAttackDamageDisposition,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleHoleId,
  type BattleSavingThrowRollModeProjection,
  type BattleSpellAttackRollHole,
  type BattleSpellDamageRollHole,
  type BattleSpellDamageTypeChoiceHole,
  type BattleSpellHealingRollHole,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSkillChoiceHole,
  type BattleSpellTargetAllocation,
  type BattleState,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  type SaveDamageResult,
  type SpellMarkedDamageRider,
  type SpellTargeting,
  type SupportedDamageSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";

export function spellAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "heldLightHurl"
        | "spellAttackDamage";
    }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${invocation.spell.name} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function spellDamageTypeChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "chainedSpellAttackDamage"
        | "damageReduction"
        | "spellHostedWeaponAttack";
    }
  >,
): BattleSpellDamageTypeChoiceHole {
  const protocolId =
    invocation.procedure === "spellHostedWeaponAttack"
      ? `battle:spell:damage-type:${invocation.spell.id}:${invocation.componentWeapon.itemId}`
      : `battle:spell:damage-type:${invocation.spell.id}`;
  return {
    kind: "damageTypeChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} damage type`,
    spell: invocation,
    choices: invocation.damageTypeChoices,
  };
}

export function chainedSpellTargetHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >;
  readonly stepIndex: number;
  readonly targeted: readonly CombatantId[];
}): BattleTargetChoiceHole {
  const protocolId = chainedSpellTargetProtocolId(
    input.invocation,
    input.stepIndex,
  );
  const targeted = new Set(input.targeted);
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label:
      input.stepIndex === 0
        ? `${input.invocation.spell.name} target`
        : `${input.invocation.spell.name} leap target ${input.stepIndex}`,
    requiresTableSpatialFact: true,
    choices: [...input.state.combatants.keys()].filter(
      (targetId) =>
        !targeted.has(targetId) &&
        spellTargetHasNonSpatialPrerequisites(
          input.state,
          input.actorId,
          targetId,
          input.invocation,
        ),
    ),
  };
}

export function chainedSpellAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  const protocolId = chainedSpellAttackRollProtocolId(invocation, stepIndex);
  return {
    kind: "attackRoll",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} spell attack roll ${stepIndex + 1}`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
    ...attackRollMissToHitReplacementHolePayload(state, attackerId),
  };
}

export function chainedSpellDamageRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  step: { readonly stepIndex: number; readonly critical: boolean },
): BattleSpellDamageRollHole {
  const protocolId = chainedSpellDamageRollProtocolId(
    invocation,
    step.stepIndex,
    step.critical,
  );
  const expr = chainedSpellDamageExpression(
    invocation,
    damageType,
    step.critical,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} damage ${step.stepIndex + 1} (${expr})`,
    spell: invocation,
    critical: step.critical,
  };
}

export function chainedSpellTargetHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellTargetProtocolId(invocation, stepIndex));
}

export function chainedSpellAttackRollHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): BattleHoleId {
  return holeId(chainedSpellAttackRollProtocolId(invocation, stepIndex));
}

export function chainedSpellDamageRollHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  critical: boolean,
): BattleHoleId {
  return holeId(
    chainedSpellDamageRollProtocolId(invocation, stepIndex, critical),
  );
}

export function chainedSpellTargetProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-target:${invocation.spell.id}:${stepIndex}`;
}

export function chainedSpellAttackRollProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
): string {
  return `battle:spell:chained-attack-roll:${invocation.spell.id}:${stepIndex}`;
}

export function chainedSpellDamageRollProtocolId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  stepIndex: number,
  critical: boolean,
): string {
  return `battle:spell:chained-damage:${invocation.spell.id}:${stepIndex}:${critical ? "critical" : "normal"}`;
}

export function chainedSpellDamageExpression(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  critical: boolean,
): string {
  const dice = invocation.damage.expr.dice * (critical ? 2 : 1);
  return `${dice}d${invocation.damage.expr.dieSize}${signedModifier(invocation.damage.expr.flat ?? 0)}-${damageType}`;
}

export function chainedSpellLeapTargetIsLegal(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  previousTargetId: CombatantId | undefined,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  return (
    previousTargetId !== undefined &&
    previousTargetId !== targetId &&
    facts.some(
      (fact) =>
        fact.kind === "spellLeapTargetWithinRange" &&
        fact.previousTargetId === previousTargetId &&
        fact.targetId === targetId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.leapRangeFeet,
    )
  );
}

export function spellDamageTypes(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLightHurl" | "spellAttackDamage" }
  >,
): readonly DamageType[] {
  return [invocation.damage.damageType];
}

export function spellDamageHole(
  invocation: SupportedDamageSpellInvocation,
  critical = false,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): BattleSpellDamageRollHole {
  const expr = spellDamageExpression(
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(`battle:spell:damage-result:${invocation.spell.id}:${expr}`),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} damage (${expr})`,
    spell: invocation,
    critical,
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
  };
}

export function spellBurstDamageHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): BattleSpellDamageRollHole {
  const expr = spellBurstDamageExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:burst-damage-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:burst-damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} burst damage (${expr})`,
    spell: invocation,
    critical: false,
  };
}

export function spellHealingRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
): BattleSpellHealingRollHole {
  const expr = spellHealingExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} healing (${expr})`,
    spell: invocation,
  };
}

export function spellScalarBuffRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): BattleSpellHealingRollHole {
  const expr = scalarBuffTemporaryHitPointsExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:scalar-buff-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:scalar-buff-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} Temporary Hit Points (${expr})`,
    spell: invocation,
  };
}

export function spellRollModifierSkillChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:skill-choice:${invocation.spell.id}`);
}

export function spellRollModifierSkillChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
): BattleSpellSkillChoiceHole {
  return {
    kind: "skillChoice",
    holeId: spellRollModifierSkillChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:skill-choice:${invocation.spell.id}`,
    ),
    label: `${invocation.spell.name} skill`,
    spell: invocation,
    choices: invocation.skillChoices ?? [],
  };
}

export function scalarBuffInitialHoles(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): readonly BattleHole[] {
  return invocation.effect.kind === "temporaryHitPoints"
    ? [spellScalarBuffRollHole(invocation)]
    : [];
}

export function spellSavingThrowOutcomeHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:saving-throw-outcome:${invocation.spell.id}`);
}

export function spellSavingThrowOutcomeHole(
  state: BattleState,
  _actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "afterHitSaveGatedCondition"
        | "rollModifier"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedAttackRollAdvantage";
    }
  >,
): BattleSpellSavingThrowOutcomeHole {
  const holeKey = `battle:spell:saving-throw-outcome:${invocation.spell.id}`;
  return {
    kind: "savingThrowOutcome",
    holeId: spellSavingThrowOutcomeHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: (() => {
      if (invocation.procedure === "rollModifier") {
        return `${invocation.spell.name} Saving Throw outcomes`;
      }
      const targeting = spellSavingThrowTargeting(invocation);
      return targeting.kind === "singleCombatant"
        ? `${invocation.spell.name} Saving Throw outcome`
        : `${invocation.spell.name} ${spellAreaTargetingLabel(targeting)} Saving Throw outcomes`;
    })(),
    spell: invocation,
    ability:
      invocation.procedure === "attackBurstSaveDamage"
        ? invocation.burst.ability
        : invocation.procedure === "rollModifier"
          ? (invocation.saveGate?.ability ?? "cha")
          : invocation.ability,
    dc:
      invocation.procedure === "attackBurstSaveDamage"
        ? invocation.burst.dc
        : invocation.procedure === "rollModifier"
          ? (invocation.saveGate?.dc ?? { kind: "caster_spell_save_dc" })
          : invocation.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      invocation.procedure === "attackBurstSaveDamage"
        ? invocation.burst.ability
        : invocation.procedure === "rollModifier"
          ? (invocation.saveGate?.ability ?? "cha")
          : invocation.ability,
    ),
  };
}

export function spellSavingThrowAbility(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "afterHitSaveGatedCondition"
        | "rollModifier"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedAttackRollAdvantage";
    }
  >,
): Ability {
  if (invocation.procedure === "attackBurstSaveDamage") {
    return invocation.burst.ability;
  }
  if (invocation.procedure === "rollModifier") {
    return invocation.saveGate?.ability ?? "cha";
  }
  return invocation.ability;
}

export function spellSavingThrowTargeting(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "afterHitSaveGatedCondition"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedAttackRollAdvantage";
    }
  >,
): SpellTargeting {
  return invocation.procedure === "attackBurstSaveDamage"
    ? invocation.burst.targeting
    : invocation.targeting;
}

export function spellAreaTargetingLabel(
  targeting: Exclude<SpellTargeting, { readonly kind: "singleCombatant" }>,
): string {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () => "point-origin Sphere"),
    Match.when(
      { kind: "pointOriginCubeExcludingCaster" },
      () => "point-origin Cube",
    ),
    Match.when({ kind: "pointOriginCube" }, () => "point-origin Cube"),
    Match.when({ kind: "selfOriginCone" }, () => "self-origin Cone"),
    Match.when(
      { kind: "primaryTargetOriginEmanation" },
      () => "primary-target-origin Emanation",
    ),
    Match.when({ kind: "targetList" }, () => "target-list"),
    Match.exhaustive,
  );
}

export function savingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  if (ability !== "dex") {
    return [];
  }
  return [...state.combatants]
    .filter(([, target]) => hasDodgeBenefit(state, target))
    .map(([targetId]) => ({
      targetId,
      rollMode: "advantage" as const,
    }));
}

export function validateSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SupportedDamageSpellInvocation,
  critical: boolean,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): string | null {
  if (
    fill.holeId !==
    spellDamageHole(invocation, critical, spellMarkedDamageRiders).holeId
  ) {
    return critical
      ? "Critical hit spell damage must use the critical spell damage hole."
      : "Spell damage must use the selected action-time spell act damage hole.";
  }
  if (spellMarkedDamageRiders.length > 0) {
    const components = spellDamageComponents(
      invocation,
      critical,
      spellMarkedDamageRiders,
    );
    if (fill.value.length !== components.length) {
      return "filled spell damage groups do not match current spell damage";
    }
    for (const [index, component] of components.entries()) {
      const group = fill.value[index];
      if (group === undefined) {
        return "filled spell damage groups do not match current spell damage";
      }
      const validation = validateRolledDiceForDiceExpr([group], component.expr);
      if (validation !== null) {
        return validation.reason;
      }
    }
    return null;
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice:
      invocation.procedure === "repeatedDamageAllocation"
        ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
        : invocation.damage.expr.dice *
          ((invocation.procedure === "heldLightHurl" ||
            invocation.procedure === "spellAttackDamage" ||
            invocation.procedure === "attackBurstSaveDamage") &&
          critical
            ? 2
            : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function validateSpellHealingFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
): string | null {
  if (fill.holeId !== spellHealingRollHole(invocation).holeId) {
    return "Spell healing must use the selected spell act healing hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.healing.expr.dice,
    dieSize: invocation.healing.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function validateScalarBuffTemporaryHitPointsFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): string | null {
  if (invocation.effect.kind !== "temporaryHitPoints") {
    return "Scalar buff dice are only valid for Temporary Hit Points effects.";
  }
  if (fill.holeId !== spellScalarBuffRollHole(invocation).holeId) {
    return "Temporary Hit Points must use the selected scalar buff spell hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.effect.amount.expr.dice,
    dieSize: invocation.effect.amount.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function validateSpellBurstDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): string | null {
  if (fill.holeId !== spellBurstDamageHole(invocation).holeId) {
    return "Ice Knife burst damage must use the burst damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.burst.damage.expr.dice,
    dieSize: invocation.burst.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function validatePreparedSlotSpellDamageGroups(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocations: readonly BattleSpellTargetAllocation[],
): string | null {
  if (fill.value.length !== allocations.length) {
    return "Repeated spell damage dice groups must match the target allocation entries.";
  }
  const mismatched = allocations.find(
    (allocation, index) =>
      fill.value[index]?.results.length !== allocation.count,
  );
  return mismatched === undefined
    ? null
    : "Each repeated spell damage dice group must match that target's allocated effect count.";
}

export function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
  saveDamageResult: SaveDamageResult = "full",
  damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  },
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  spellDamageReductionRoll?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const reduction = applyAvailableSpellDamageReduction(
    target,
    spellDamageByTypeForTarget(
      target,
      invocation,
      damageRoll,
      saveDamageResult,
      spellMarkedDamageRiders,
      critical,
    ),
    spellDamageReductionRoll,
  );
  if (reduction.tag !== "ok") {
    return state;
  }
  const damaged = applyHpDamage(
    reduction.target,
    damageAmountByTypeAfterTargetAdjustments(
      reduction.target,
      reduction.damageByType,
    ),
    { deathFailuresAtZeroHp: critical ? 2 : 1, damageDisposition },
  );
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    target.hp,
    damaged.hp,
  );
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentrationAfterDamage({
        state: afterMarkDrop,
        combatantId: targetId,
        priorConcentration: target.concentration,
      })
    : afterMarkDrop;
}

export function applyPreparedSlotSpellDamage(
  state: BattleState,
  targetId: CombatantId,
  damageAmount: number,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
  damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  },
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(target, damageAmount, {
    deathFailuresAtZeroHp: 1,
    damageDisposition,
  });
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    target.hp,
    damaged.hp,
  );
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentrationAfterDamage({
        state: afterMarkDrop,
        combatantId: targetId,
        priorConcentration: target.concentration,
      })
    : afterMarkDrop;
}

export function spellDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  critical = false,
): number {
  return damageAmountByTypeAfterTargetAdjustments(
    target,
    spellDamageByTypeForTarget(
      target,
      invocation,
      damageRoll,
      saveDamageResult,
      spellMarkedDamageRiders,
      critical,
    ),
  );
}

export function spellDamageByTypeForTarget(
  _target: BattleCreatureState,
  invocation: SupportedDamageSpellInvocation,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  critical = false,
): ReadonlyMap<DamageType, number> {
  if (spellMarkedDamageRiders.length > 0) {
    const components = spellDamageComponents(
      invocation,
      critical,
      spellMarkedDamageRiders,
    );
    const damageByType = damageRoll.value.reduce<
      ReadonlyMap<DamageType, number>
    >((totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      );
      const unadjusted = diceTotal + component.flat;
      return addDamageAmountForType(totals, component.damageType, unadjusted);
    }, new Map());
    return damageByType;
  }
  const diceTotal = damageRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.procedure === "repeatedDamageAllocation"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  const saveAdjustedDamage = applySaveDamageResult(
    diceTotal + flat,
    saveDamageResult,
  );
  return addDamageAmountForType(
    new Map(),
    invocation.damage.damageType,
    saveAdjustedDamage,
  );
}

export function spellBurstDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult,
): number {
  const diceTotal = damageRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat = invocation.burst.damage.expr.flat ?? 0;
  return damageAmountAfterTargetAdjustments(
    target,
    applySaveDamageResult(diceTotal + flat, saveDamageResult),
    invocation.burst.damage.damageType,
  );
}

export function repeatedDamageAllocationSpellDamageAmount(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocationIndex: number,
  repeatedEffectCount: number,
): number {
  if (spellDamageNegatedForTarget(target, invocation.spell.id)) {
    return 0;
  }
  const group = damageRoll.value[allocationIndex];
  const diceTotal =
    group?.results.reduce(
      (groupTotal, dieResult) => groupTotal + Number(dieResult),
      0,
    ) ?? 0;
  const flat = (invocation.damage.expr.flat ?? 0) * repeatedEffectCount;
  return damageAmountAfterTargetAdjustments(
    target,
    diceTotal + flat,
    invocation.damage.damageType,
  );
}

export function spellDamageNegatedForTarget(
  target: BattleCreatureState,
  spellId: SpellRecord["id"],
): boolean {
  return target.activeEffects.some(
    (effect) =>
      effect.kind === "spellArmorClassBonus" &&
      effect.negatedSpellIds.includes(spellId),
  );
}

export function saveGateDamageResultForOutcome(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
  savingThrowSucceeded: boolean,
): SaveDamageResult {
  const target = state.combatants.get(targetId);
  const baseResult: SaveDamageResult = savingThrowSucceeded
    ? invocation.successDamage
    : "full";
  const replacement = saveDamageReplacementForInvocation(target, invocation);
  if (replacement === null) {
    return baseResult;
  }
  return savingThrowSucceeded ? replacement.onSuccess : replacement.onFail;
}

export function saveDamageReplacementForInvocation(
  target: BattleCreatureState | undefined,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "saveDamageReplacement" }
> | null {
  if (
    target?.origin.kind !== "character" ||
    invocation.successDamage !== "half" ||
    isIncapacitated(target.conditions)
  ) {
    return null;
  }
  return (
    [...target.origin.saveDamageReplacementProfiles.values()].find(
      (profile) =>
        profile.ability === invocation.ability &&
        profile.requiredSuccessDamage === "half" &&
        profile.suppressedByCondition === "incapacitated",
    ) ?? null
  );
}

export function applySaveDamageResult(
  amount: number,
  saveDamageResult: SaveDamageResult,
): number {
  return Match.value(saveDamageResult).pipe(
    Match.when("none", () => 0),
    Match.when("half", () => Math.floor(amount / 2)),
    Match.when("full", () => amount),
    Match.exhaustive,
  );
}
