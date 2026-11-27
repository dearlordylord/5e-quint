// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bardic-inspiration-failed-d20-test
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// A Bardic Inspiration die on a failed D20 Test. SRD 5.2.1 classes.md, Bard,
// Bardic Inspiration: "Once within the next hour when the creature fails a
// D20 Test, the creature can roll the Bardic Inspiration die and add the
// number rolled to the d20, potentially turning the failure into a success. A
// Bardic Inspiration die is expended when it's rolled." The added-die folds
// (d20-test-added-dice.ts) offer it while the test stands failed and the
// roller holds a die, and expend the die when it is rolled.

import type { DamageDieSize } from "@dnd/shared/types";
import { Brand } from "effect";

import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  type BattleBardicInspirationDieOption,
  type BattleCreatureState,
  type BattleD20TestRollKey,
  type BattleState,
} from "../battle-state-execution.ts";
import {
  d20TestAddedDieDecisionIssue,
  type D20TestAddedDieMessages,
  type D20TestAddedDieSourceForRoll,
} from "./d20-test-added-die.ts";
import {
  battleStateWithD20TestSourceTaken,
  d20TestSourceTakeOnRoll,
  d20TestSpendUnavailability,
  type D20TestSpendRecord,
  type D20TestSpendScope,
} from "./d20-test-source-spend.ts";

const BARDIC_INSPIRATION_DIE_SPEND_RECORD =
  "acceptedBardicInspirationDice" as const satisfies D20TestSpendRecord;

export const BARDIC_INSPIRATION_DIE_MESSAGES = {
  unavailable:
    "Bardic Inspiration on a failed D20 Test needs a roller who holds a Bardic Inspiration die.",
  notFailed:
    "Bardic Inspiration decides only on a D20 Test that stands failed.",
  dieRoll:
    "Bardic Inspiration roll must be a face of the die the roller holds.",
} as const satisfies D20TestAddedDieMessages;

/** The size of the Bardic Inspiration die the creature holds, if it holds one. */
function heldBardicInspirationDieSize(
  actor: BattleCreatureState | undefined,
): DamageDieSize | undefined {
  return actor?.activeEffects.find(
    (effect) => effect.kind === "bardicInspirationDie",
  )?.dieSize;
}

/**
 * The roller's Bardic Inspiration die for this roll: the die it holds, or on
 * a replay of the roll that expended it, the die it expended.
 */
export function bardicInspirationDieForRoll(
  state: BattleState,
  scope: D20TestSpendScope,
  roll: BattleD20TestRollKey,
): D20TestAddedDieSourceForRoll {
  const spend = {
    state,
    scope,
    record: BARDIC_INSPIRATION_DIE_SPEND_RECORD,
    roll,
  };
  const dieSize =
    d20TestSourceTakeOnRoll(spend)?.dieSize ??
    heldBardicInspirationDieSize(state.combatants.get(roll.rollerId));
  return dieSize === undefined
    ? { availability: d20TestSpendUnavailability(spend) }
    : { availability: "available", dieSize };
}

/** The option a D20 Test hole is asked again with for this roller's die. */
export function bardicInspirationDieOption(
  die: Extract<
    D20TestAddedDieSourceForRoll,
    { readonly availability: "available" }
  >,
  roll: BattleD20TestRollKey,
): BattleBardicInspirationDieOption {
  return {
    effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
    label: "Bardic Inspiration die",
    rollerId: roll.rollerId,
    dieSize: die.dieSize,
  };
}

/** The issue with a Bardic Inspiration decision on a D20 Test as it stands, if any. */
export function bardicInspirationDieDecisionIssue(input: {
  readonly die: D20TestAddedDieSourceForRoll;
  readonly standsFailed: boolean;
  readonly decision:
    | { readonly kind: "decline" }
    | { readonly kind: "addDie"; readonly dieRoll: number };
}): string | null {
  return d20TestAddedDieDecisionIssue({
    source: input.die,
    standsFailed: input.standsFailed,
    decision: input.decision,
    messages: BARDIC_INSPIRATION_DIE_MESSAGES,
  });
}

/**
 * Whether an admitted roll expends its roller's Bardic Inspiration die. Only
 * {@link bardicInspirationDieUseForRoll} makes one, so the spend follows a
 * checked decision.
 */
export type BardicInspirationDieUse = Brand.Branded<
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly scope: D20TestSpendScope;
      readonly roll: BattleD20TestRollKey;
    },
  "BardicInspirationDieUse"
>;
const BardicInspirationDieUse = Brand.nominal<BardicInspirationDieUse>();

/** A roll that doesn't expend a Bardic Inspiration die. */
export const NO_BARDIC_INSPIRATION_DIE_USE: BardicInspirationDieUse =
  BardicInspirationDieUse({ spends: false });

/**
 * The Bardic Inspiration use of a roll whose added-die decisions were
 * checked: the die is expended when it was rolled, unless an earlier pass of
 * the subject already expended it on this roll.
 */
export function bardicInspirationDieUseForRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
  readonly added: boolean;
}): BardicInspirationDieUse {
  return input.added &&
    d20TestSourceTakeOnRoll({
      ...input,
      record: BARDIC_INSPIRATION_DIE_SPEND_RECORD,
    }) === undefined
    ? BardicInspirationDieUse({
        spends: true,
        scope: input.scope,
        roll: input.roll,
      })
    : NO_BARDIC_INSPIRATION_DIE_USE;
}

/**
 * Expends the roller's Bardic Inspiration die for an admitted roll that
 * rolled it, and records the roll and the die for the rest of the subject.
 * On a replay of the subject the same roll finds it already expended and
 * changes nothing.
 */
export function battleStateAfterBardicInspirationDie(
  state: BattleState,
  use: BardicInspirationDieUse,
): BattleState {
  if (
    !use.spends ||
    d20TestSourceTakeOnRoll({
      state,
      scope: use.scope,
      record: BARDIC_INSPIRATION_DIE_SPEND_RECORD,
      roll: use.roll,
    }) !== undefined
  )
    return state;
  const actor = state.combatants.get(use.roll.rollerId);
  const dieSize = heldBardicInspirationDieSize(actor);
  /* v8 ignore next -- @preserve -- A validated Bardic Inspiration roll belongs to a roller who holds the die. */
  if (actor === undefined || dieSize === undefined) return state;
  const expended: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(use.roll.rollerId, {
      ...actor,
      activeEffects: actor.activeEffects.filter(
        (effect) => effect.kind !== "bardicInspirationDie",
      ),
    }),
  };
  return battleStateWithD20TestSourceTaken({
    state: expended,
    scope: use.scope,
    record: BARDIC_INSPIRATION_DIE_SPEND_RECORD,
    taken: { ...use.roll, dieSize },
  });
}
