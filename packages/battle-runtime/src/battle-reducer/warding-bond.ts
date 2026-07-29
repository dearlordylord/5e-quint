// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import type {
  BattleExecutableSpellInvocation,
  BattleActiveEffect,
  BattleCreatureState,
  BattleSavingThrowFlatBonusProjection,
  BattleState,
  BattleTargetSpatialFact,
  BattleWardingBondSeparationFactsHole,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import { allocateBattleActiveEffectRef } from "../active-effect/execution-ref.ts";
import type { CombatantId } from "../identity.ts";
import {
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SEPARATION_FACTS_HOLE_ID,
  WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "./domain-constants.ts";

export type WardingBondEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "wardingBond" }
>;

export function isWardingBondEffect(
  effect: BattleActiveEffect,
): effect is WardingBondEffect {
  return effect.kind === "wardingBond";
}

export function combatantHasWardingBondResistance(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(isWardingBondEffect);
}

export function wardingBondSavingThrowFlatBonusProjectionsForTarget(
  target: BattleCreatureState,
): readonly BattleSavingThrowFlatBonusProjection[] {
  const effect = target.activeEffects.find(isWardingBondEffect);
  return effect === undefined
    ? []
    : [
        {
          targetId: target.combatantId,
          sourceCombatantId: effect.sourceCombatantId,
          sourceProcedureRef: effect.sourceProcedureRef,
          bonus: WARDING_BOND_SAVING_THROW_BONUS,
        },
      ];
}

export function wardingBondCastFactsAreSatisfied(input: {
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "wardingBond" }>
  >;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.facts.some(
      (fact) =>
        fact.kind === "wardingBondPairedWornPlatinumRings" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.sourceProcedureRef === input.invocation.sourceProcedureRef,
    ) &&
    input.facts.some(
      (fact) =>
        fact.kind === "wardingBondCreaturesDistance" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.sourceProcedureRef === input.invocation.sourceProcedureRef &&
        Number(fact.distanceFeet) <=
          Number(input.invocation.connectionRangeFeet),
    )
  );
}

export function applyWardingBondSpellEffect(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "wardingBond" }>
  >,
): BattleState {
  const withoutPriorBonds = battleStateWithoutWardingBondConnectedToCombatants(
    state,
    [casterId, targetId],
  );
  const target = withoutPriorBonds.combatants.get(targetId);
  if (target === undefined) {
    return withoutPriorBonds;
  }
  const allocation = allocateBattleActiveEffectRef({
    state: withoutPriorBonds,
    ownerId: targetId,
  });
  if (allocation.tag === "ownerNotFound") return withoutPriorBonds;
  const allocatedTarget = allocation.owner;
  return {
    ...allocation.state,
    combatants: new Map(allocation.state.combatants).set(targetId, {
      ...allocatedTarget,
      activeEffects: [
        ...allocatedTarget.activeEffects,
        {
          ...invocation.activeEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: casterId,
          effectRef: allocation.effectRef,
        },
      ],
    }),
  };
}

export function battleStateWithoutWardingBondConnectedToCombatants(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): BattleState {
  const connectedIds = new Set(combatantIds);
  return battleStateWithoutWardingBondEffects(state, (hostId, effect) =>
    wardingBondEffectIsConnectedToAny(effect, hostId, connectedIds),
  );
}

export function battleStateAfterWardingBondCasterZeroHitPoints(
  state: BattleState,
): BattleState {
  return battleStateWithoutWardingBondEffects(state, (_hostId, effect) => {
    const caster = state.combatants.get(effect.sourceCombatantId);
    return caster !== undefined && Number(caster.hp) === 0;
  });
}

export function wardingBondSeparationFactsHole(input: {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: WardingBondEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
}): BattleWardingBondSeparationFactsHole {
  return {
    kind: "targetSpatialFacts",
    holeId: WARDING_BOND_SEPARATION_FACTS_HOLE_ID,
    holeInstanceKey: WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE,
    label: "Warding Bond separation facts",
    wardingBondSeparation: {
      sourceCombatantId: input.sourceCombatantId,
      targetId: input.targetId,
      sourceProcedureRef: input.sourceProcedureRef,
      rangeFeet: WARDING_BOND_CONNECTION_RANGE_FEET,
    },
    requiresTableSpatialFact: true,
  };
}

export function wardingBondSeparationFactsAreSatisfied(input: {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: WardingBondEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return input.facts.some(
    (fact) =>
      fact.kind === "wardingBondCreaturesDistance" &&
      fact.casterId === input.sourceCombatantId &&
      fact.targetId === input.targetId &&
      fact.sourceProcedureRef === input.sourceProcedureRef &&
      Number(fact.distanceFeet) > Number(WARDING_BOND_CONNECTION_RANGE_FEET),
  );
}

export function battleStateAfterWardingBondSeparation(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: WardingBondEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
}): BattleState {
  return battleStateWithoutWardingBondEffects(
    input.state,
    (hostId, effect) =>
      hostId === input.targetId &&
      effect.sourceCombatantId === input.sourceCombatantId &&
      effect.sourceProcedureRef === input.sourceProcedureRef,
  );
}

function battleStateWithoutWardingBondEffects(
  state: BattleState,
  remove: (hostId: CombatantId, effect: WardingBondEffect) => boolean,
): BattleState {
  let changed = false;
  const combatants = new Map(state.combatants);
  for (const [hostId, combatant] of state.combatants) {
    const activeEffects = combatant.activeEffects.filter((effect) => {
      if (!isWardingBondEffect(effect) || !remove(hostId, effect)) {
        return true;
      }
      changed = true;
      return false;
    });
    if (activeEffects.length !== combatant.activeEffects.length) {
      combatants.set(hostId, { ...combatant, activeEffects });
    }
  }
  return changed ? { ...state, combatants } : state;
}

function wardingBondEffectIsConnectedToAny(
  effect: WardingBondEffect,
  hostId: CombatantId,
  combatantIds: ReadonlySet<CombatantId>,
): boolean {
  return combatantIds.has(hostId) || combatantIds.has(effect.sourceCombatantId);
}
