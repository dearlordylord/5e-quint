// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleSanctuaryInterdictionOutcome,
  BattleSanctuaryInterdictionOutcomeHole,
  BattleState,
  SanctuaryTargetingInterdictionSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import { battleStateAfterDirectConditionTargetActionEarlyEndForActor } from "./direct-condition-lifecycle.ts";

export type SanctuaryTargetingInterdictionCheck =
  | { readonly tag: "notWarded" }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleSanctuaryInterdictionOutcomeHole;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "saveSucceeded" }
  | { readonly tag: "lost" }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleSanctuaryInterdictionOutcome,
          { readonly saveSucceeded: true }
        >["outcome"],
        { readonly kind: "newTarget" }
      >["spatialFacts"];
    };

export function sanctuaryTargetingInterdictionCheck(input: {
  readonly state: BattleState;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly fills: readonly BattleFill[];
}): SanctuaryTargetingInterdictionCheck {
  const warded = input.state.combatants.get(input.wardedCombatantId);
  const effect = warded?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "sanctuaryWard" }
    > => candidate.kind === "sanctuaryWard",
  );
  if (warded === undefined || effect === undefined) {
    return { tag: "notWarded" };
  }
  const hole = sanctuaryTargetingInterdictionOutcomeHole({
    state: input.state,
    triggeringCombatantId: input.triggeringCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    effect,
  });
  const matchingFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "sanctuaryInterdictionOutcome" }
    > =>
      fill.kind === "sanctuaryInterdictionOutcome" &&
      fill.holeId === hole.holeId,
  );
  if (matchingFills.length === 0) {
    return { tag: "needsHoles", hole };
  }
  if (matchingFills.length > 1) {
    return {
      tag: "invalid",
      message: "Sanctuary targeting interdiction was filled twice.",
    };
  }
  const value = matchingFills[0]!.value;
  if (value.saveSucceeded) {
    return { tag: "saveSucceeded" };
  }
  if (value.outcome.kind === "loseAttackOrSpell") {
    return { tag: "lost" };
  }
  if (value.outcome.targetId === input.wardedCombatantId) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must differ from the warded target.",
    };
  }
  if (!input.state.combatants.has(value.outcome.targetId)) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must be a combatant in this battle.",
    };
  }
  return {
    tag: "newTarget",
    targetId: value.outcome.targetId,
    spatialFacts: value.outcome.spatialFacts,
  };
}

function sanctuaryTargetingInterdictionOutcomeHole(input: {
  readonly state: BattleState;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "sanctuaryWard" }
  >;
}): BattleSanctuaryInterdictionOutcomeHole {
  const holeKey = [
    "battle",
    "sanctuary-interdiction",
    input.effect.sourceSpellId,
    input.effect.sourceCombatantId,
    input.wardedCombatantId,
    input.triggeringCombatantId,
    input.triggeringTargetEventId,
  ].join(":");
  return {
    kind: "sanctuaryInterdictionOutcome",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: "Sanctuary Wisdom save and targeting outcome",
    sourceSpellId: input.effect.sourceSpellId,
    sourceCombatantId: input.effect.sourceCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringCombatantId: input.triggeringCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    ability: input.effect.save.ability,
    dc: input.effect.save.dc,
    choices: [...input.state.combatants.keys()].filter(
      (id) => id !== input.wardedCombatantId,
    ),
  };
}

export function battleStateAfterTargetActionEarlyEndForActor(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const sanctuaryActiveEffects = actor.activeEffects.filter(
    (effect) => effect.kind !== "sanctuaryWard",
  );
  const sanctuaryEnded =
    sanctuaryActiveEffects.length === actor.activeEffects.length
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            actorId,
            battleCreatureWithSpellActiveEffects(actor, sanctuaryActiveEffects),
          ),
        };
  return battleStateAfterDirectConditionTargetActionEarlyEndForActor(
    sanctuaryEnded,
    actorId,
  );
}

export function combatantWithSanctuaryWard(
  target: BattleCreatureState,
  invocation: SanctuaryTargetingInterdictionSpellInvocation,
): BattleCreatureState {
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "sanctuaryWard" &&
      effect.sourceSpellId === invocation.activeEffect.sourceSpellId,
  );
  return battleCreatureWithSpellActiveEffects(target, [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ]);
}
