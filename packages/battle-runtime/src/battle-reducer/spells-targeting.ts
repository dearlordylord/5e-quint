// Spell target holes and target legality validation extracted from spells-holes-fills.ts.

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CombatantId } from "../identity.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS,
  KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS,
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  type BattleHoleId,
  type BattleCommandOptionChoiceHole,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationHole,
  type BattleSpellTargetListHole,
  type BattleSpellTargetListSpatialFact,
  type BattleState,
  type BattleObjectTargetChoiceHole,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  type SupportedSpellInvocation,
  type TargetListSpellInvocation,
} from "../battle-reducer.ts";
import { COMMAND_OPTIONS } from "./domain-constants.ts";
import type { BattleObjectId } from "../identity.ts";

type SingleCreatureOrObjectSpellAttackDamageInvocation =
  Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectTarget" }
  > extends infer ObjectFact
    ? {
        readonly procedure: "spellAttackBeamSequence" | "spellAttackDamage";
        readonly spell: { readonly id: string; readonly name: string };
        readonly rangeFeet: ObjectFact extends {
          readonly rangeFeet: infer RangeFeet;
        }
          ? RangeFeet
          : never;
      }
    : never;

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

export function spellBeamTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): BattleTargetChoiceHole {
  const holeKey = spellBeamTargetHoleKey(invocation, beamIndex);
  return {
    kind: "targetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} beam ${beamIndex + 1} target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellBeamTargetHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): BattleHoleId {
  return holeId(spellBeamTargetHoleKey(invocation, beamIndex));
}

function spellBeamTargetHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): string {
  return `battle:spell:beam-target:${invocation.spell.id}:${beamIndex}`;
}

export function spellObjectTargetHole(
  invocation: SingleCreatureOrObjectSpellAttackDamageInvocation,
): BattleObjectTargetChoiceHole {
  const holeKey = `battle:spell:object-target:${invocation.spell.id}`;
  return {
    kind: "objectTargetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} object target`,
    requiresTableSpatialFact: true,
  };
}

export function spellBeamObjectTargetHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): BattleObjectTargetChoiceHole {
  const holeKey = spellBeamObjectTargetHoleKey(invocation, beamIndex);
  return {
    kind: "objectTargetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} beam ${beamIndex + 1} object target`,
    requiresTableSpatialFact: true,
  };
}

export function spellBeamObjectTargetHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): BattleHoleId {
  return holeId(spellBeamObjectTargetHoleKey(invocation, beamIndex));
}

function spellBeamObjectTargetHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
): string {
  return `battle:spell:beam-object-target:${invocation.spell.id}:${beamIndex}`;
}

export function spellObjectTargetHoleId(
  invocation: SingleCreatureOrObjectSpellAttackDamageInvocation,
): BattleHoleId {
  return holeId(`battle:spell:object-target:${invocation.spell.id}`);
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

export function commandOptionChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
): BattleCommandOptionChoiceHole {
  const holeKey = `battle:spell:command-option:${invocation.spell.id}`;
  return {
    kind: "commandOptionChoice",
    holeId: commandOptionChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} command option`,
    spell: invocation,
    choices: COMMAND_OPTIONS,
  };
}

export function commandOptionChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:command-option:${invocation.spell.id}`);
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
  if (invocation.procedure === "featherFallMitigation") {
    return (
      fact.kind === "featherFallTargetFallingWithinRange" &&
      fact.casterId === actorId &&
      fact.targetId === targetId &&
      fact.spellId === invocation.spell.id &&
      fact.rangeFeet === invocation.rangeFeet
    );
  }
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

export function spellObjectTargetFact(
  facts: readonly Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectTarget" }
  >[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: SingleCreatureOrObjectSpellAttackDamageInvocation,
): Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectTarget" }
> | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet,
    ) ?? null
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
    if (
      invocation.procedure === "jumpMovementReplacement" &&
      !facts.some(
        (fact) =>
          fact.kind === "spellTargetKnownWilling" &&
          fact.casterId === actorId &&
          fact.targetId === targetId &&
          fact.spellId === invocation.spell.id,
      )
    ) {
      return "Jump targets must be known willing combatants.";
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
