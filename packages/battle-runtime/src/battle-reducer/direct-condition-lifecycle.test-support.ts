// Standalone direct-condition state machine used by the focused MBT parity driver.

import {
  applySpellSlotExpenditure,
  spellSlotExpenditureAccepted,
  spellSlotExpenditureRequired,
  spellSlotExpenditureResultState,
} from "@dnd/shared-algebras/spell-slot-expenditure-algebra";
import { resourceCount, spellSlotLevel } from "@dnd/shared/types";
import { Match } from "effect";

const byTag = Match.discriminator("tag");

const DIRECT_CONDITION_MINIMUM_SLOT_LEVEL = 2;
const DIRECT_CONDITION_MAXIMUM_SLOT_LEVEL = 9;
const DIRECT_CONDITION_DURATION_TICKS = 10;

export type DirectConditionTarget =
  | { readonly tag: "absent" }
  | { readonly tag: "nonSpellSource" }
  | { readonly tag: "spellOnly"; readonly durationTicks: number }
  | { readonly tag: "spellAndNonSpell"; readonly durationTicks: number };

export type DirectConditionLifecycleState = {
  readonly actionAvailable: boolean;
  readonly slotLedger: {
    readonly slotLevel: number;
    readonly slotsRemaining: number;
  };
  readonly slotSpellCastThisTurn: boolean;
  readonly targetCondition: DirectConditionTarget;
};

function directConditionRequestedSlotLevelAccepted(slotLevel: number): boolean {
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
  if (!spellSlotExpenditureAccepted(slotResult)) return state;
  const nextSlotState = spellSlotExpenditureResultState(slotState, slotResult);
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
  _trigger: "attackRoll" | "damage" | "spellCast",
): DirectConditionLifecycleState {
  void _trigger;
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

function validSlotLedger(
  slotLedger: DirectConditionLifecycleState["slotLedger"],
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
