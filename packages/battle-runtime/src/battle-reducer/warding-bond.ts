// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleSavingThrowFlatBonusProjection,
  BattleState,
  BattleTargetSpatialFact,
  BattleWardingBondSeparationFactsHole,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import {
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SEPARATION_FACTS_HOLE_ID,
  WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "./domain-constants.ts";

export type WardingBondDamageSharingState = {
  readonly sourceHitPoints: number;
  readonly wardHitPoints: number;
  readonly bondPresent: boolean;
  readonly sourceTookSharedDamage: boolean;
};

export type WardingBondDamageSharingFill = {
  readonly incomingDamage: number;
};

export type WardingBondCleanupFills = {
  readonly separatedBeyondSixtyFeet: boolean;
  readonly recastOnConnectedCreature: boolean;
};

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

export function wardingBondDamageSharingInitialState(input: {
  readonly sourceHitPoints: number;
  readonly wardHitPoints: number;
  readonly bondPresent: boolean;
}): WardingBondDamageSharingState {
  const sourceHitPoints = nonnegativeInteger(input.sourceHitPoints);
  return {
    sourceHitPoints,
    wardHitPoints: nonnegativeInteger(input.wardHitPoints),
    bondPresent: input.bondPresent && sourceHitPoints > 0,
    sourceTookSharedDamage: false,
  };
}

export function wardingBondDamageAfterResistance(
  incomingDamage: number,
): number {
  return Math.floor(nonnegativeInteger(incomingDamage) / 2);
}

export function resolveWardingBondSharedDamage(
  state: WardingBondDamageSharingState,
  fill: WardingBondDamageSharingFill,
): WardingBondDamageSharingState {
  const targetDamage = state.bondPresent
    ? wardingBondDamageAfterResistance(fill.incomingDamage)
    : nonnegativeInteger(fill.incomingDamage);
  const sourceSharesDamage =
    state.bondPresent && state.sourceHitPoints > 0 && targetDamage > 0;
  const damaged: WardingBondDamageSharingState = {
    ...state,
    sourceHitPoints: sourceSharesDamage
      ? applyDamageToHitPoints(state.sourceHitPoints, targetDamage)
      : state.sourceHitPoints,
    wardHitPoints: applyDamageToHitPoints(state.wardHitPoints, targetDamage),
    sourceTookSharedDamage: sourceSharesDamage,
  };
  return wardingBondStateAfterCleanup(damaged, {
    separatedBeyondSixtyFeet: false,
    recastOnConnectedCreature: false,
  });
}

export function resolveWardingBondCleanup(
  state: WardingBondDamageSharingState,
  input: WardingBondCleanupFills,
): WardingBondDamageSharingState {
  return wardingBondStateAfterCleanup(
    { ...state, sourceTookSharedDamage: false },
    {
      separatedBeyondSixtyFeet: input.separatedBeyondSixtyFeet,
      recastOnConnectedCreature: input.recastOnConnectedCreature,
    },
  );
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
          sourceSpellId: effect.sourceSpellId,
          bonus: WARDING_BOND_SAVING_THROW_BONUS,
        },
      ];
}

export function wardingBondCastFactsAreSatisfied(input: {
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "wardingBond" }
  >;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.facts.some(
      (fact) =>
        fact.kind === "wardingBondPairedWornPlatinumRings" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.spellId === input.invocation.spell.id,
    ) &&
    input.facts.some(
      (fact) =>
        fact.kind === "wardingBondCreaturesDistance" &&
        fact.casterId === input.casterId &&
        fact.targetId === input.targetId &&
        fact.spellId === input.invocation.spell.id &&
        Number(fact.distanceFeet) <=
          Number(input.invocation.connectionRangeFeet),
    )
  );
}

export function applyWardingBondSpellEffect(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "wardingBond" }
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
  return {
    ...withoutPriorBonds,
    combatants: new Map(withoutPriorBonds.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          ...invocation.activeEffect,
          sourceCombatantId: casterId,
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
  readonly sourceSpellId: WardingBondEffect["sourceSpellId"];
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
      sourceSpellId: spellId(input.sourceSpellId),
      rangeFeet: WARDING_BOND_CONNECTION_RANGE_FEET,
    },
    requiresTableSpatialFact: true,
  };
}

export function wardingBondSeparationFactsAreSatisfied(input: {
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: WardingBondEffect["sourceSpellId"];
  readonly targetId: CombatantId;
  readonly facts: readonly BattleTargetSpatialFact[];
}): boolean {
  return input.facts.some(
    (fact) =>
      fact.kind === "wardingBondCreaturesDistance" &&
      fact.casterId === input.sourceCombatantId &&
      fact.targetId === input.targetId &&
      fact.spellId === input.sourceSpellId &&
      Number(fact.distanceFeet) > Number(WARDING_BOND_CONNECTION_RANGE_FEET),
  );
}

export function battleStateAfterWardingBondSeparation(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: WardingBondEffect["sourceSpellId"];
  readonly targetId: CombatantId;
}): BattleState {
  return battleStateWithoutWardingBondEffects(input.state, (hostId, effect) =>
    hostId === input.targetId &&
    effect.sourceCombatantId === input.sourceCombatantId &&
    effect.sourceSpellId === input.sourceSpellId
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

function wardingBondStateAfterCleanup(
  state: WardingBondDamageSharingState,
  fills: WardingBondCleanupFills,
): WardingBondDamageSharingState {
  return state.bondPresent &&
    (state.sourceHitPoints === 0 ||
      fills.separatedBeyondSixtyFeet ||
      fills.recastOnConnectedCreature)
    ? { ...state, bondPresent: false }
    : state;
}

function applyDamageToHitPoints(hitPoints: number, damage: number): number {
  return nonnegativeInteger(hitPoints - nonnegativeInteger(damage));
}

function nonnegativeInteger(value: number): number {
  return Math.max(0, Math.floor(value));
}
