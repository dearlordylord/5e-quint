// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import type {
  BattleExecutableSpellInvocation,
  BattleActiveEffect,
  BattleCreatureState,
  BattleSavingThrowFlatBonusProjection,
  BattleState,
  BattleTargetSpatialFact,
  BattleLinkedEffectSeparationFactsHole,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../effect-execution-ref.ts";
import type { CombatantId } from "../identity.ts";
import {
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SEPARATION_FACTS_HOLE_ID,
  WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "./domain-constants.ts";

export type LinkedDefenseResistanceDamageShareEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "linkedDefenseResistanceDamageShare" }
>;

export function isLinkedDefenseResistanceDamageShareEffect(
  effect: BattleActiveEffect,
): effect is LinkedDefenseResistanceDamageShareEffect {
  return effect.kind === "linkedDefenseResistanceDamageShare";
}

export function combatantHasLinkedDefenseResistanceDamageShareResistance(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(
    isLinkedDefenseResistanceDamageShareEffect,
  );
}

export function linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget(
  target: BattleCreatureState,
): readonly BattleSavingThrowFlatBonusProjection[] {
  const effect = target.activeEffects.find(
    isLinkedDefenseResistanceDamageShareEffect,
  );
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

export function linkedDefenseResistanceDamageShareCastFactsAreSatisfied(input: {
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "linkedDefenseResistanceDamageShare" }
    >
  >;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.facts.some(
      (fact) =>
        fact.kind === "linkedEffectPairedWornComponents" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.sourceProcedureRef === input.invocation.sourceProcedureRef,
    ) &&
    input.facts.some(
      (fact) =>
        fact.kind === "linkedEffectCreaturesDistance" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.sourceProcedureRef === input.invocation.sourceProcedureRef &&
        Number(fact.distanceFeet) <=
          Number(input.invocation.connectionRangeFeet),
    )
  );
}

export function applyLinkedDefenseResistanceDamageShareSpellEffect(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "linkedDefenseResistanceDamageShare" }
    >
  >,
): BattleState {
  const withoutPriorBonds =
    battleStateWithoutLinkedDefenseResistanceDamageShareConnectedToCombatants(
      state,
      [casterId, targetId],
    );
  const target = withoutPriorBonds.combatants.get(targetId);
  if (target === undefined) {
    return withoutPriorBonds;
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: target,
  });
  const allocatedTarget = allocation.owner;
  return {
    ...withoutPriorBonds,
    combatants: new Map(withoutPriorBonds.combatants).set(targetId, {
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

export function battleStateWithoutLinkedDefenseResistanceDamageShareConnectedToCombatants(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): BattleState {
  const connectedIds = new Set(combatantIds);
  return battleStateWithoutLinkedDefenseResistanceDamageShareEffects(
    state,
    (hostId, effect) =>
      linkedDefenseResistanceDamageShareEffectIsConnectedToAny(
        effect,
        hostId,
        connectedIds,
      ),
  );
}

export function battleStateAfterLinkedDefenseResistanceDamageShareCasterZeroHitPoints(
  state: BattleState,
): BattleState {
  return battleStateWithoutLinkedDefenseResistanceDamageShareEffects(
    state,
    (_hostId, effect) => {
      const caster = state.combatants.get(effect.sourceCombatantId);
      return caster !== undefined && Number(caster.hp) === 0;
    },
  );
}

export function linkedDefenseResistanceDamageShareSeparationFactsHole(input: {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: LinkedDefenseResistanceDamageShareEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
}): BattleLinkedEffectSeparationFactsHole {
  return {
    kind: "targetSpatialFacts",
    holeId: WARDING_BOND_SEPARATION_FACTS_HOLE_ID,
    holeInstanceKey: WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE,
    label: "Linked-effect separation facts",
    linkedEffectSeparation: {
      sourceCombatantId: input.sourceCombatantId,
      targetId: input.targetId,
      sourceProcedureRef: input.sourceProcedureRef,
      rangeFeet: WARDING_BOND_CONNECTION_RANGE_FEET,
    },
    requiresTableSpatialFact: true,
  };
}

export function linkedDefenseResistanceDamageShareSeparationFactsAreSatisfied(input: {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: LinkedDefenseResistanceDamageShareEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return input.facts.some(
    (fact) =>
      fact.kind === "linkedEffectCreaturesDistance" &&
      fact.casterId === input.sourceCombatantId &&
      fact.targetId === input.targetId &&
      fact.sourceProcedureRef === input.sourceProcedureRef &&
      Number(fact.distanceFeet) > Number(WARDING_BOND_CONNECTION_RANGE_FEET),
  );
}

export function battleStateAfterLinkedDefenseResistanceDamageShareSeparation(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: LinkedDefenseResistanceDamageShareEffect["sourceProcedureRef"];
  readonly targetId: CombatantId;
}): BattleState {
  return battleStateWithoutLinkedDefenseResistanceDamageShareEffects(
    input.state,
    (hostId, effect) =>
      hostId === input.targetId &&
      effect.sourceCombatantId === input.sourceCombatantId &&
      effect.sourceProcedureRef === input.sourceProcedureRef,
  );
}

function battleStateWithoutLinkedDefenseResistanceDamageShareEffects(
  state: BattleState,
  remove: (
    hostId: CombatantId,
    effect: LinkedDefenseResistanceDamageShareEffect,
  ) => boolean,
): BattleState {
  let changed = false;
  const combatants = new Map(state.combatants);
  for (const [hostId, combatant] of state.combatants) {
    const activeEffects = combatant.activeEffects.filter((effect) => {
      if (
        !isLinkedDefenseResistanceDamageShareEffect(effect) ||
        !remove(hostId, effect)
      ) {
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

function linkedDefenseResistanceDamageShareEffectIsConnectedToAny(
  effect: LinkedDefenseResistanceDamageShareEffect,
  hostId: CombatantId,
  combatantIds: ReadonlySet<CombatantId>,
): boolean {
  return combatantIds.has(hostId) || combatantIds.has(effect.sourceCombatantId);
}
