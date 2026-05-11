// Spell holes, fills, target validators, damage application, and effect
// application (Cluster P). Mechanical extraction from battle-reducer.ts.
//
// P depends on Q (spell-effects), N (damage-helpers), M (damage-apply), and
// the spell-condition-effects helper module. It is consumed by L (resolve)
// and a few stragglers in M and T (cycle #15) which round-trip back through
// `../battle-reducer.ts`.

import { Match } from "effect";
import {
  type Round as RoundType,
} from "@dnd/shared/types";
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
  Skill,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { spellId } from "../identity.ts";
import { type SpellInvocationRef } from "../battle-subjects.ts";
import { spellEffectInvocationRef } from "../battle-subjects.ts";
import type { SupportedUnitFeatureProfile } from "../unit-feature-support.ts";
import {
  scalarBuffTemporaryHitPointsAmount,
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
  applyTemporaryHitPoints,
  breakBattleConcentrationAfterDamage,
  markMarkedDamageRiderTransferAvailable,
} from "./damage-apply.ts";
import {
  attackRollMissToHitReplacementHolePayload,
  signedModifier,
} from "./statblock-attacks.ts";
import {
  battleCreatureType,
  hasDodgeBenefit,
} from "./attack-roll.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  conditionsAfterApplyingSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  isPreparedDamageSpellSource,
  KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS,
  KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS,
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleAttackDamageDisposition,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleHoleId,
  type BattleSpellAttackRollHole,
  type BattleSpellDamageRollHole,
  type BattleSpellDamageTypeChoiceHole,
  type BattleSpellHealingRollHole,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSkillChoiceHole,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationHole,
  type BattleSpellTargetListHole,
  type BattleSpellTargetListSpatialFact,
  type BattleSavingThrowRollModeProjection,
  type BattleState,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  type SaveDamageResult,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellMarkedDamageRider,
  type SpellPostDamageRider,
  type SpellPostDamageRiderExpiration,
  type SpellTargeting,
  type SupportedSpellInvocation,
  type SupportedDamageSpellInvocation,
  type TargetListSpellInvocation,
} from "../battle-reducer.ts";

export function spellTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: `${invocation.spell.name} target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellTargetAllocationHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:target-allocation:${invocation.spell.id}`);
}

export function spellTargetAllocationHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
): BattleSpellTargetAllocationHole {
  const holeKey = `battle:spell:target-allocation:${invocation.spell.id}`;
  return {
    kind: "spellTargetAllocation",
    holeId: spellTargetAllocationHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} target allocation`,
    spell: invocation,
    allocationCount: invocation.targeting.repeatedEffectCount,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellTargetListHoleId(
  invocation: TargetListSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:target-list:${invocation.spell.id}`);
}

export function spellTargetListHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: TargetListSpellInvocation,
): BattleSpellTargetListHole {
  const holeKey = `battle:spell:target-list:${invocation.spell.id}`;
  return {
    kind: "spellTargetList",
    holeId: spellTargetListHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} targets`,
    spell: invocation,
    minTargets: invocation.targeting.minTargets,
    maxTargets: invocation.targeting.maxTargets,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  if (
    !spellTargetHasNonSpatialPrerequisites(state, actorId, targetId, invocation)
  ) {
    return false;
  }
  return facts.some((fact) =>
    spellTargetSpatialFactMatches(fact, actorId, targetId, invocation),
  );
}

export function spellTargetSpatialFactMatches(
  fact: BattleTargetSpatialFact,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
): boolean {
  if (fact.kind !== "spellTarget") {
    return false;
  }
  if (
    fact.casterId !== actorId ||
    fact.targetId !== targetId ||
    fact.spellId !== invocation.spell.id
  ) {
    return false;
  }
  return !(
    invocation.procedure === "directHitPointRestoration" &&
    invocation.targeting.kind === "pointOriginSphereTargetList"
  );
}

export function spellTargetHasNonSpatialPrerequisites(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
): boolean {
  const target = state.combatants.get(targetId);
  if (
    spellInvocationRequiresKnownWillingTarget(invocation) &&
    !spellTargetIsKnownWilling(actorId, targetId)
  ) {
    return false;
  }
  if (
    invocation.procedure === "persistentArmorEffect" &&
    target?.armorClass.base.kind === "armor"
  ) {
    return false;
  }
  if (
    invocation.procedure === "markedDamageRider" &&
    invocation.action === "transfer" &&
    targetId === invocation.activeEffect.targetCombatantId
  ) {
    return false;
  }
  const targetCreatureType =
    target === undefined ? null : battleCreatureType(target);
  if (
    invocation.procedure === "saveGatedCondition" &&
    invocation.targetCreatureTypes !== null &&
    (targetCreatureType === null ||
      !invocation.targetCreatureTypes.includes(targetCreatureType))
  ) {
    return false;
  }
  return target !== undefined;
}

export function validateSpellTargetAllocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  allocations: readonly BattleSpellTargetAllocation[],
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  if (allocations.length === 0) {
    return "Spell target allocation must include at least one target.";
  }
  const seen = new Set<CombatantId>();
  for (const allocation of allocations) {
    if (!Number.isInteger(allocation.count) || allocation.count <= 0) {
      return "Spell target allocation entries must assign a positive integer count.";
    }
    if (seen.has(allocation.targetId)) {
      return "Spell target allocation must combine repeated effects for the same target into one entry.";
    }
    seen.add(allocation.targetId);
    if (
      !spellTargetIsLegal(
        state,
        actorId,
        allocation.targetId,
        invocation,
        facts,
      )
    ) {
      return "Spell target allocation entries must be combatants within the selected spell's supported range.";
    }
  }
  const allocatedCount = allocations.reduce(
    (total, allocation) => total + allocation.count,
    0,
  );
  if (allocatedCount !== invocation.targeting.repeatedEffectCount) {
    return `${invocation.spell.name} target allocation must assign exactly ${invocation.targeting.repeatedEffectCount} repeated effects.`;
  }
  return null;
}

export function validateSpellTargetList(
  state: BattleState,
  actorId: CombatantId,
  invocation: TargetListSpellInvocation,
  targetIds: readonly CombatantId[],
  facts: readonly BattleSpellTargetListSpatialFact[],
): string | null {
  if (targetIds.length < invocation.targeting.minTargets) {
    return `${invocation.spell.name} must target at least ${invocation.targeting.minTargets} creature.`;
  }
  if (targetIds.length > invocation.targeting.maxTargets) {
    return `${invocation.spell.name} can target at most ${invocation.targeting.maxTargets} creatures.`;
  }
  const seen = new Set<CombatantId>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) {
      return "Spell target list must not repeat a target.";
    }
    seen.add(targetId);
    if (
      invocation.targeting.kind !== "pointOriginSphereTargetList" &&
      !spellTargetIsLegal(state, actorId, targetId, invocation, facts)
    ) {
      return "Spell targets must be combatants within the selected spell's supported range.";
    }
  }
  if (
    invocation.procedure === "directHitPointRestoration" &&
    invocation.targeting.kind === "pointOriginSphereTargetList"
  ) {
    return validatePointOriginSphereSpellTargetList(
      state,
      actorId,
      invocation,
      targetIds,
      facts,
    );
  }
  return null;
}

export function validatePointOriginSphereSpellTargetList(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
  targetIds: readonly CombatantId[],
  facts: readonly BattleSpellTargetListSpatialFact[],
): string | null {
  if (invocation.targeting.kind !== "pointOriginSphereTargetList") {
    return "Area healing targets must use a point-origin Sphere target list.";
  }
  const expectedRadiusFeet = invocation.targeting.area.radiusFeet;
  const matchingAreaFacts = facts.filter(
    (fact) =>
      fact.kind === "spellTargetsInPointOriginSphere" &&
      fact.casterId === actorId &&
      fact.spellId === invocation.spell.id &&
      fact.areaId.length > 0 &&
      fact.radiusFeet === expectedRadiusFeet &&
      sameCombatantIdSet(fact.targetIds, targetIds),
  );
  if (matchingAreaFacts.length !== 1) {
    return "Area healing targets must share one selected point-origin Sphere.";
  }
  for (const targetId of targetIds) {
    if (
      !spellTargetHasNonSpatialPrerequisites(
        state,
        actorId,
        targetId,
        invocation,
      )
    ) {
      return "Spell targets must be combatants within the selected spell's supported range.";
    }
  }
  return null;
}

export function sameCombatantIdSet(
  left: readonly CombatantId[],
  right: readonly CombatantId[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  if (leftIds.size !== left.length || rightIds.size !== right.length) {
    return false;
  }
  return left.every((id) => rightIds.has(id));
}

export function spellInvocationRequiresKnownWillingTarget(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "persistentArmorEffect" ||
    invocation.procedure ===
      "conditionImmunityAndTurnStartTemporaryHitPoints" ||
    (invocation.procedure === "damageReduction" &&
      KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS.includes(
        invocation.spell.id,
      )) ||
    (invocation.procedure === "rollModifier" &&
      KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS.includes(
        invocation.spell.id,
      ))
  );
}

export function spellTargetIsKnownWilling(
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return actorId === targetId;
}

export function supportedSpellInvocationRef(
  invocation: SupportedSpellInvocation,
): SpellInvocationRef {
  return Match.value(invocation).pipe(
    Match.when({ procedure: "heldLight" }, (cantrip) => ({
      tag: "cantrip" as const,
      spellId: spellId(cantrip.spell.id),
      procedure: "heldLight" as const,
    })),
    Match.when({ procedure: "damageReduction" }, (cantrip) => ({
      tag: "cantrip" as const,
      spellId: spellId(cantrip.spell.id),
      procedure: "damageReduction" as const,
    })),
    Match.when({ procedure: "repeatedDamageAllocation" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "repeatedDamageAllocation" as const,
    })),
    Match.when({ procedure: "attackBurstSaveDamage" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "attackBurstSaveDamage" as const,
    })),
    Match.when({ procedure: "chainedSpellAttackDamage" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "chainedSpellAttackDamage" as const,
    })),
    Match.when({ procedure: "heldLightHurl" }, damageSpellInvocationRef),
    Match.when({ procedure: "spellAttackDamage" }, damageSpellInvocationRef),
    Match.when({ procedure: "saveGatedDamage" }, damageSpellInvocationRef),
    Match.when({ procedure: "saveGatedCondition" }, (conditionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(conditionSpell.spell.id),
      slotLevel: conditionSpell.resource.slotLevel,
      procedure: "saveGatedCondition" as const,
    })),
    Match.when(
      { procedure: "saveGatedAttackRollAdvantage" },
      (attackRollAdvantageSpell) => ({
        tag: "spellSlot" as const,
        spellId: spellId(attackRollAdvantageSpell.spell.id),
        slotLevel: attackRollAdvantageSpell.resource.slotLevel,
        procedure: "saveGatedAttackRollAdvantage" as const,
      }),
    ),
    Match.when({ procedure: "scalarBuff" }, (buffSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(buffSpell.spell.id),
      slotLevel: buffSpell.resource.slotLevel,
      procedure: "scalarBuff" as const,
    })),
    Match.when({ procedure: "rollModifier" }, (modifierSpell) =>
      modifierSpell.resource.tag === "none"
        ? {
            tag: "cantrip" as const,
            spellId: spellId(modifierSpell.spell.id),
            procedure: "rollModifier" as const,
          }
        : {
            tag: "spellSlot" as const,
            spellId: spellId(modifierSpell.spell.id),
            slotLevel: modifierSpell.resource.slotLevel,
            procedure: "rollModifier" as const,
          },
    ),
    Match.when({ procedure: "creatureTypeProtection" }, (protectionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(protectionSpell.spell.id),
      slotLevel: protectionSpell.resource.slotLevel,
      procedure: "creatureTypeProtection" as const,
    })),
    Match.when(
      { procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" },
      (heroism) => ({
        tag: "spellSlot" as const,
        spellId: spellId(heroism.spell.id),
        slotLevel: heroism.resource.slotLevel,
        procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" as const,
      }),
    ),
    Match.when({ procedure: "weaponDamageRider" }, (riderSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(riderSpell.spell.id),
      slotLevel: riderSpell.resource.slotLevel,
      procedure: "weaponDamageRider" as const,
    })),
    Match.when({ procedure: "markedDamageRider" }, (riderSpell) =>
      riderSpell.action === "transfer"
        ? spellEffectInvocationRef(
            riderSpell.spell.id,
            riderSpell.activeEffect.sourceCombatantId,
            "markedDamageRiderTransfer",
          )
        : {
            tag: "spellSlot" as const,
            spellId: spellId(riderSpell.spell.id),
            slotLevel: riderSpell.resource.slotLevel,
            procedure: "markedDamageRider" as const,
          },
    ),
    Match.when({ procedure: "persistentArmorEffect" }, (persistent) => ({
      tag: "spellSlot" as const,
      spellId: spellId(persistent.spell.id),
      slotLevel: persistent.resource.slotLevel,
      procedure: "persistentArmorEffect" as const,
    })),
    Match.when({ procedure: "shieldReaction" }, (reactionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(reactionSpell.spell.id),
      slotLevel: reactionSpell.resource.slotLevel,
      procedure: "shieldReaction" as const,
    })),
    Match.when({ procedure: "directHitPointRestoration" }, (healing) => ({
      tag: "spellSlot" as const,
      spellId: spellId(healing.spell.id),
      slotLevel: healing.resource.slotLevel,
      procedure: "directHitPointRestoration" as const,
    })),
    Match.exhaustive,
  );
}

export function damageSpellInvocationRef(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "heldLightHurl"
        | "spellAttackDamage"
        | "saveGatedDamage";
    }
  >,
): SpellInvocationRef {
  if (
    invocation.procedure !== "heldLightHurl" &&
    isPreparedDamageSpellSource(invocation)
  ) {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: invocation.procedure,
    };
  }
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: invocation.procedure,
  };
}

export function sameSpellInvocationRef(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (
    left.tag !== right.tag ||
    left.spellId !== right.spellId ||
    left.procedure !== right.procedure
  ) {
    return false;
  }
  if (left.tag === "cantrip" && right.tag === "cantrip") {
    return true;
  }
  if (left.tag === "spellEffect" && right.tag === "spellEffect") {
    return left.sourceCombatantId === right.sourceCombatantId;
  }
  return left.tag === "spellSlot" && right.tag === "spellSlot"
    ? left.slotLevel === right.slotLevel
    : false;
}

export function supportedSpellInvocationMatchesRef(
  invocation: SupportedSpellInvocation,
  ref: SpellInvocationRef,
): boolean {
  return sameSpellInvocationRef(supportedSpellInvocationRef(invocation), ref);
}

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
    { readonly procedure: "chainedSpellAttackDamage" | "damageReduction" }
  >,
): BattleSpellDamageTypeChoiceHole {
  const protocolId = `battle:spell:damage-type:${invocation.spell.id}`;
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

export function applySpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  if (invocation.postDamageRiders.length === 0) {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const activeEffects = invocation.postDamageRiders.reduce(
    (effects, rider): readonly BattleActiveEffect[] => {
      const replacedEffects = effects.filter((effect) =>
        spellPostDamageRiderReplacesActiveEffect(
          rider,
          effect,
          invocation.spell.id,
          actorId,
        ),
      );
      return [
        ...effects.filter((effect) => !replacedEffects.includes(effect)),
        spellPostDamageRiderActiveEffect({
          state,
          actorId,
          target,
          spellId: invocation.spell.id,
          rider,
        }),
      ];
    },
    target.activeEffects,
  );

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function battleCreatureWithSpellActiveEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterApplyingSpellConditionEffects(
          combatant.conditions,
          activeEffects,
        ),
      }
    : { ...combatant, activeEffects };
}

export function applyFailedSaveSpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
): BattleState {
  if (invocation.failedSavePostDamageRiders.length === 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const activeEffects = invocation.failedSavePostDamageRiders.reduce(
      (effects, rider): readonly BattleActiveEffect[] => [
        ...effects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "nextAttackRollBySelf",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          mode: rider.mode,
          expiresAt: activeEffectExpirationForPostDamageRider(
            state,
            actorId,
            target.combatantId,
            rider.expiresAt,
          ),
        },
      ],
      target.activeEffects,
    );
    combatants.set(targetId, { ...target, activeEffects });
  }
  return { ...state, combatants };
}

export function applyFailedSaveSpellConditionEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId &&
        effect.condition === invocation.effect.condition,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "spellCondition" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        condition: invocation.effect.condition,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          invocation.effect.condition,
        ),
        escape: invocation.effect.escape,
        expiresAt: activeEffectExpirationForPostDamageRider(
          state,
          actorId,
          target.combatantId,
          invocation.effect.expiresAt,
        ),
      },
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
  }
  return { ...state, combatants };
}

export function applyFailedSaveAttackRollAdvantageEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const nextEffect = {
      ...invocation.effect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "visibleAttackRollAgainstSelf" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    combatants.set(targetId, { ...target, activeEffects });
  }
  return { ...state, combatants };
}

export function activeEffectKindForSpellPostDamageRider(
  rider: SpellPostDamageRider,
): BattleActiveEffect["kind"] {
  return Match.value(rider).pipe(
    Match.when({ kind: "speedDelta" }, () => "speedDelta" as const),
    Match.when({ kind: "condition" }, () => "spellCondition" as const),
    Match.when(
      { kind: "opportunityAttackDenied" },
      () => "opportunityAttackDenied" as const,
    ),
    Match.when(
      { kind: "nextAttackRollAgainstTarget" },
      () => "nextAttackRollAgainstSelf" as const,
    ),
    Match.exhaustive,
  );
}

export function spellPostDamageRiderReplacesActiveEffect(
  rider: SpellPostDamageRider,
  effect: BattleActiveEffect,
  spellId: SpellRecord["id"],
  actorId: CombatantId,
): boolean {
  if (
    effect.kind !== activeEffectKindForSpellPostDamageRider(rider) ||
    effect.sourceSpellId !== spellId
  ) {
    return false;
  }
  return rider.kind === "speedDelta" || effect.sourceCombatantId === actorId;
}

export function spellPostDamageRiderExpiration(
  rider: SpellPostDamageRider,
): SpellPostDamageRiderExpiration | undefined {
  return "expiresAt" in rider ? rider.expiresAt : undefined;
}

export function spellPostDamageRiderActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly target: BattleCreatureState;
  readonly spellId: SpellRecord["id"];
  readonly rider: SpellPostDamageRider;
}): BattleActiveEffect {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    input.state,
    input.actorId,
    input.target.combatantId,
    spellPostDamageRiderExpiration(input.rider),
  );
  return Match.value(input.rider).pipe(
    Match.when({ kind: "speedDelta" }, (rider) => ({
      kind: "speedDelta" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      deltaFeet: rider.deltaFeet,
      expiresAt,
    })),
    Match.when({ kind: "condition" }, (rider) => ({
      kind: "spellCondition" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      condition: rider.condition,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        input.target,
        rider.condition,
      ),
      escape: null,
      expiresAt,
    })),
    Match.when({ kind: "opportunityAttackDenied" }, () => ({
      kind: "opportunityAttackDenied" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "nextAttackRollAgainstTarget" }, (rider) => ({
      kind: "nextAttackRollAgainstSelf" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      mode: rider.mode,
      expiresAt,
    })),
    Match.exhaustive,
  );
}

export function activeEffectExpirationForPostDamageRider(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  expiresAt:
    | SpellPostDamageRiderExpiration
    | SpellFailedSavePostDamageRider["expiresAt"]
    | SpellFailedSaveConditionEffect["expiresAt"]
    | undefined,
): BattleActiveEffectExpiration {
  if (typeof expiresAt === "object" && expiresAt.kind === "duration") {
    return expiresAt;
  }
  if (expiresAt === undefined) {
    return { kind: "startOfTurn", combatantId: casterId };
  }
  if (expiresAt === "startOfTargetNextTurn") {
    return { kind: "startOfTurn", combatantId: targetId };
  }
  if (expiresAt === "endOfCasterNextTurn") {
    return endOfNextTurnExpiration(state, casterId);
  }
  if (expiresAt === "concentration") {
    return { kind: "concentration", combatantId: casterId };
  }
  return endOfNextTurnExpiration(state, targetId);
}

export function endOfNextTurnExpiration(
  state: BattleState,
  combatantId: CombatantId,
): Extract<BattleActiveEffectExpiration, { readonly kind: "endOfTurn" }> {
  const stillToAct = state.initiative.stillToAct.some(
    (entry) => entry.creature === combatantId,
  );
  const round =
    currentActorId(state) === combatantId || !stillToAct
      ? ((state.initiative.round + 1) as RoundType)
      : state.initiative.round;
  return {
    kind: "endOfTurn",
    combatantId,
    round,
  };
}


export function applyPersistentSpellActiveEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "persistentArmorEffect" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || target.armorClass.base.kind === "armor") {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

export function applyHeldLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLight" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
    }),
  };
}

export function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    {
      kind: "spellMarkedDamageRider" as const,
      sourceSpellId: invocation.spell.id,
      sourceCombatantId: actorId,
      targetCombatantId: targetId,
      transferAvailable: false,
      damage: invocation.damage,
      expiresAt: existingExpiresAt,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects,
    }),
  };
}

export function applyScalarBuffSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
  temporaryHitPointsRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined,
): BattleState {
  const scalarEffect = invocation.effect;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextTarget =
      scalarEffect.kind === "temporaryHitPoints"
        ? temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            )
        : battleCreatureWithSpellActiveEffects(target, [
            ...target.activeEffects.filter(
              (effect) =>
                !(
                  effect.kind === scalarEffect.activeEffect.kind &&
                  effect.sourceSpellId === invocation.spell.id
                ),
            ),
            {
              ...scalarEffect.activeEffect,
              sourceCombatantId: actorId,
            },
          ]);
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
  }, state);
}

export function applyRollModifierSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
  skill: Skill | null,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.effect,
      sourceCombatantId: actorId,
      skill,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === invocation.spell.id
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyCreatureTypeProtectionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "attackerTypeScopedAttackRollAgainstSelf" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        nextEffect,
      ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyDamageReductionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "damageReduction" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellDamageReduction" &&
          effect.sourceSpellId === invocation.spell.id
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = invocation.activeEffects.map((effect) => ({
      ...effect,
      sourceCombatantId: actorId,
    }));
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceSpellId === invocation.spell.id
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

export function applyShieldReactionSpellActiveEffect(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      activeEffects: [
        ...reactor.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "spellArmorClassBonus" &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        {
          kind: "spellArmorClassBonus",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: reactorId,
          bonus: invocation.armorClassBonus,
          negatedSpellIds: invocation.negatedSpellIds,
          expiresAt: {
            kind: "startOfTurn",
            combatantId: reactorId,
          },
        },
      ],
    }),
  };
}