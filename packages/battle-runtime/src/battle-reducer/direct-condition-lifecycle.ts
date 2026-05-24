// Direct spell-owned condition lifecycle composite transition.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE

import { resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  applySpellSlotExpenditure,
  spellSlotExpenditureAccepted,
  spellSlotExpenditureRequired,
  spellSlotExpenditureResultState,
} from "@dnd/shared-algebras/spell-slot-expenditure-algebra";
import { Match } from "effect";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
  conditionsAfterExpiringSpellConditionEffects,
} from "./spell-condition-effects-helpers.ts";

const byTag = Match.discriminator("tag");

const DIRECT_CONDITION_EARLY_END_TRIGGERS = [
  "attackRoll",
  "damage",
  "spellCast",
] as const;
export type DirectConditionEarlyEndTrigger =
  (typeof DIRECT_CONDITION_EARLY_END_TRIGGERS)[number];

export const DIRECT_CONDITION_MINIMUM_SLOT_LEVEL = 2;
export const DIRECT_CONDITION_MAXIMUM_SLOT_LEVEL = 9;
export const DIRECT_CONDITION_DURATION_TICKS = 10;

export type DirectConditionTarget =
  | { readonly tag: "absent" }
  | { readonly tag: "nonSpellSource" }
  | { readonly tag: "spellOnly"; readonly durationTicks: number }
  | { readonly tag: "spellAndNonSpell"; readonly durationTicks: number };

export type DirectConditionLifecycleSlotLedger = {
  readonly slotLevel: number;
  readonly slotsRemaining: number;
};

export type DirectConditionLifecycleState = {
  readonly actionAvailable: boolean;
  readonly slotLedger: DirectConditionLifecycleSlotLedger;
  readonly slotSpellCastThisTurn: boolean;
  readonly targetCondition: DirectConditionTarget;
};

type DirectConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directCondition" }
>;

type TargetActionEndedSpellConditionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "targetActionEndedSpellCondition" }
>;

export function directConditionRequestedSlotLevelAccepted(
  slotLevel: number,
): boolean {
  return (
    Number.isInteger(slotLevel) &&
    slotLevel >= DIRECT_CONDITION_MINIMUM_SLOT_LEVEL &&
    slotLevel <= DIRECT_CONDITION_MAXIMUM_SLOT_LEVEL
  );
}

export function directConditionRemainsProjected(
  state: DirectConditionLifecycleState,
): boolean {
  return state.targetCondition.tag !== "absent";
}

export function directConditionCasterConcentrating(
  state: DirectConditionLifecycleState,
): boolean {
  return directConditionTargetHasSpellSource(state.targetCondition);
}

export function directConditionTargetHasSpellSource(
  target: DirectConditionTarget,
): boolean {
  return target.tag === "spellOnly" || target.tag === "spellAndNonSpell";
}

export function directConditionDuration(
  target: DirectConditionTarget,
): number {
  return Match.value(target).pipe(
    byTag("absent", () => 0),
    byTag("nonSpellSource", () => 0),
    byTag("spellOnly", ({ durationTicks }) => durationTicks),
    byTag("spellAndNonSpell", ({ durationTicks }) => durationTicks),
    Match.exhaustive,
  );
}

export function resolveDirectConditionCast(
  state: DirectConditionLifecycleState,
  slotLevel: number,
): DirectConditionLifecycleState {
  if (
    !state.actionAvailable ||
    !directConditionRequestedSlotLevelAccepted(slotLevel) ||
    !validSlotLedger(state.slotLedger)
  ) {
    return state;
  }
  const slotState = {
    slotLedger: {
      slotLevel: spellSlotLevel(state.slotLedger.slotLevel),
      slotsRemaining: resourceCount(state.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: state.slotSpellCastThisTurn,
  };
  const slotResult = applySpellSlotExpenditure(
    slotState,
    spellSlotExpenditureRequired(spellSlotLevel(slotLevel)),
  );
  if (!spellSlotExpenditureAccepted(slotResult)) {
    return state;
  }
  const nextSlotState = spellSlotExpenditureResultState(
    slotState,
    slotResult,
  );
  return {
    ...state,
    actionAvailable: false,
    slotLedger: {
      slotLevel: Number(nextSlotState.slotLedger.slotLevel),
      slotsRemaining: Number(nextSlotState.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
    targetCondition: directConditionWithSpellSource(
      state.targetCondition,
      DIRECT_CONDITION_DURATION_TICKS,
    ),
  };
}

export function beginDirectConditionLaterTurn(
  state: DirectConditionLifecycleState,
): DirectConditionLifecycleState {
  return {
    ...state,
    actionAvailable: true,
    slotSpellCastThisTurn: false,
  };
}

export function resolveDirectConditionEarlyEnd(
  state: DirectConditionLifecycleState,
  _trigger: DirectConditionEarlyEndTrigger,
): DirectConditionLifecycleState {
  return {
    ...state,
    targetCondition: directConditionWithoutSpellSource(state.targetCondition),
  };
}

export function resolveDirectConditionConcentrationCleanup(
  state: DirectConditionLifecycleState,
): DirectConditionLifecycleState {
  return {
    ...state,
    targetCondition: directConditionWithoutSpellSource(state.targetCondition),
  };
}

export function tickDirectConditionDuration(
  state: DirectConditionLifecycleState,
): DirectConditionLifecycleState {
  return {
    ...state,
    targetCondition: directConditionWithDurationTick(state.targetCondition),
  };
}

export function applyDirectConditionSpellEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: DirectConditionSpellInvocation,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const replacing = target.activeEffects.filter((effect) =>
      sameDirectConditionSpellEffect(
        effect,
        actorId,
        invocation.spell.id,
        invocation.activeEffect.condition,
      ),
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        ...invocation.activeEffect,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          invocation.activeEffect.condition,
        ),
      },
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

export function battleStateAfterDirectConditionTargetActionEarlyEndForActor(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const targetActionConditionSources = actor.activeEffects
    .filter(
      (effect): effect is TargetActionEndedSpellConditionEffect =>
        effect.kind === "targetActionEndedSpellCondition",
    )
    .reduce<readonly TargetActionEndedSpellConditionEffect[]>(
      (sources, effect) =>
        sources.some((source) =>
          sameTargetActionConditionSource(effect, source),
        )
          ? sources
          : [...sources, effect],
      [],
    );
  return targetActionConditionSources.reduce(
    battleStateAfterTargetActionConditionSourceEarlyEnd,
    state,
  );
}

function validSlotLedger(
  slotLedger: DirectConditionLifecycleSlotLedger,
): boolean {
  return (
    Number.isInteger(slotLedger.slotLevel) &&
    slotLedger.slotLevel >= 1 &&
    slotLedger.slotLevel <= 9 &&
    Number.isInteger(slotLedger.slotsRemaining) &&
    slotLedger.slotsRemaining >= 0
  );
}

function directConditionWithSpellSource(
  target: DirectConditionTarget,
  durationTicks: number,
): DirectConditionTarget {
  return Match.value(target).pipe(
    byTag("absent", () => ({ tag: "spellOnly", durationTicks }) as const),
    byTag(
      "nonSpellSource",
      () => ({ tag: "spellAndNonSpell", durationTicks }) as const,
    ),
    byTag("spellOnly", () => ({ tag: "spellOnly", durationTicks }) as const),
    byTag(
      "spellAndNonSpell",
      () => ({ tag: "spellAndNonSpell", durationTicks }) as const,
    ),
    Match.exhaustive,
  );
}

function directConditionWithoutSpellSource(
  target: DirectConditionTarget,
): DirectConditionTarget {
  return Match.value(target).pipe(
    byTag("absent", () => target),
    byTag("nonSpellSource", () => target),
    byTag("spellOnly", () => ({ tag: "absent" }) as const),
    byTag("spellAndNonSpell", () => ({ tag: "nonSpellSource" }) as const),
    Match.exhaustive,
  );
}

function directConditionWithDurationTick(
  target: DirectConditionTarget,
): DirectConditionTarget {
  return Match.value(target).pipe(
    byTag("absent", () => target),
    byTag("nonSpellSource", () => target),
    byTag("spellOnly", ({ durationTicks }) =>
      durationTicks > 1
        ? ({ tag: "spellOnly", durationTicks: durationTicks - 1 } as const)
        : ({ tag: "absent" } as const),
    ),
    byTag("spellAndNonSpell", ({ durationTicks }) =>
      durationTicks > 1
        ? ({
            tag: "spellAndNonSpell",
            durationTicks: durationTicks - 1,
          } as const)
        : ({ tag: "nonSpellSource" } as const),
    ),
    Match.exhaustive,
  );
}

function sameDirectConditionSpellEffect(
  effect: BattleActiveEffect,
  sourceCombatantId: CombatantId,
  sourceSpellId: DirectConditionSpellInvocation["spell"]["id"],
  condition: DirectConditionSpellInvocation["activeEffect"]["condition"],
): boolean {
  return (
    effect.kind === "targetActionEndedSpellCondition" &&
    effect.sourceSpellId === sourceSpellId &&
    effect.sourceCombatantId === sourceCombatantId &&
    effect.condition === condition
  );
}

function sameTargetActionConditionSource(
  effect: BattleActiveEffect,
  source: TargetActionEndedSpellConditionEffect,
): boolean {
  return (
    effect.kind === "targetActionEndedSpellCondition" &&
    effect.sourceCombatantId === source.sourceCombatantId &&
    effect.sourceSpellId === source.sourceSpellId
  );
}

function battleStateAfterTargetActionConditionSourceEarlyEnd(
  state: BattleState,
  source: TargetActionEndedSpellConditionEffect,
): BattleState {
  const combatants = new Map(
    [...state.combatants].map(([combatantId, combatant]) => {
      const expiringEffects = combatant.activeEffects.filter((effect) =>
        sameTargetActionConditionSource(effect, source),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !sameTargetActionConditionSource(effect, source),
      );
      return [
        combatantId,
        activeEffects.length === combatant.activeEffects.length
          ? combatant
          : battleCreatureWithoutExpiringSpellEffects(
              combatant,
              activeEffects,
              expiringEffects,
            ),
      ] as const;
    }),
  );
  return {
    ...state,
    combatants: combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
      combatants,
      {
        sourceCombatantId: source.sourceCombatantId,
        sourceSpellId: source.sourceSpellId,
      },
    ),
  };
}

function battleCreatureWithoutExpiringSpellEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterExpiringSpellConditionEffects(
          combatant.conditions,
          activeEffects,
          expiringEffects,
        ),
      }
    : { ...combatant, activeEffects };
}
