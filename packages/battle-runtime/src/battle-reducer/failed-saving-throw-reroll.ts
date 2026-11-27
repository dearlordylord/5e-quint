// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.failed-saving-throw-reroll
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// A reroll of a saving throw that stands failed, with a bonus on the new roll.
// SRD 5.2.1 classes.md, Fighter, Indomitable: "If you fail a saving throw, you
// can reroll it with a bonus equal to your Fighter level. You must use the new
// roll, and you can't use this feature again until you finish a Long Rest."
// The saving throw reroll fold (d20-test-outcome-rerolls.ts) offers it while
// the roll stands failed, takes it in the order the roller chooses among the
// other reroll sources (ASSUMPTIONS.md A55), and spends one use when the
// reroll is taken.

import { Brand } from "effect";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resource-execution.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import {
  FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  type BattleCreatureState,
  type BattleD20TestRoll,
  type BattleD20TestRollKey,
  type BattleFailedSavingThrowRerollDecision,
  type BattleFailedSavingThrowRerollOption,
  type BattleSavingThrowRerollHoleOptions,
  type BattleState,
} from "../battle-state-execution.ts";
import type { BattleResourcePoolExecutionRef } from "../identity.ts";
import {
  d20TestOutcomeReplacementIssue,
  type D20TestRollRerollMessages,
} from "./d20-test-roll-reroll.ts";
import {
  battleStateWithD20TestRerollPaid,
  d20TestRerollPaidOnRoll,
  d20TestRerollSpendAvailability,
  d20TestRerollSpendGate,
  type D20TestRerollSpendAvailability,
  type D20TestRerollSpendRecord,
  type D20TestRerollSpendScope,
} from "./d20-test-reroll-spend.ts";

const FAILED_SAVING_THROW_REROLL_SPEND_RECORD =
  "acceptedFailedSavingThrowRerolls" satisfies D20TestRerollSpendRecord;

export const FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE =
  "Failed saving throw reroll needs a roller with a use of the feature left.";
export const FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE =
  "Failed saving throw reroll decides only on a saving throw that stands failed.";
const FAILED_SAVING_THROW_REROLL_MESSAGES = {
  replacement:
    "Failed saving throw replacement roll is outside the d20 protocol.",
  mode: "Failed saving throw replacement roll mode does not match the saving throw it rerolls.",
  dieSelectionRequired:
    "Failed saving throw reroll under Advantage or Disadvantage must name the rolled die it replaces.",
  dieSelection: "Failed saving throw reroll must name a rolled die.",
  projection:
    "Failed saving throw rolled-die replacement does not match the projected saving throw.",
  modifier:
    "Failed saving throw replacement roll must keep the saving throw's modifiers; only the d20 changes.",
} as const satisfies D20TestRollRerollMessages;
/** The message for a replacement under the wrong roll mode. */
export const FAILED_SAVING_THROW_REROLL_MODE_MESSAGE =
  FAILED_SAVING_THROW_REROLL_MESSAGES.mode;

type FailedSavingThrowRerollExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "failedSavingThrowReroll" }
>;

/** The roller's failed saving throw reroll features, in binding order. */
function rollerFailedSavingThrowRerolls(
  actor: BattleCreatureState | undefined,
): readonly FailedSavingThrowRerollExecution[] {
  if (actor?.origin.kind !== "character") return [];
  return characterUnitProcedureBindings(actor.origin.execution).flatMap(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "failedSavingThrowReroll"
        ? [procedure.execution]
        : [],
  );
}

function resourcePoolHasUseLeft(
  actor: BattleCreatureState | undefined,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): boolean {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.resources.some(
      (resource) =>
        resource.resourcePoolRef === resourcePoolRef &&
        resourceHasUsesRemaining(resource),
    )
  );
}

/** The roller's feature that can pay for a reroll now, if any. */
function payableFailedSavingThrowReroll(
  actor: BattleCreatureState | undefined,
): FailedSavingThrowRerollExecution | undefined {
  return rollerFailedSavingThrowRerolls(actor).find((execution) =>
    resourcePoolHasUseLeft(actor, execution.savingThrow.spends.resourcePoolRef),
  );
}

/** Where the roller's failed saving throw reroll stands for this roll. */
export function failedSavingThrowRerollAvailabilityForRoll(
  state: BattleState,
  scope: D20TestRerollSpendScope,
  roll: BattleD20TestRollKey,
): D20TestRerollSpendAvailability {
  return d20TestRerollSpendAvailability({
    state,
    scope,
    record: FAILED_SAVING_THROW_REROLL_SPEND_RECORD,
    roll,
    rollerCanPay:
      payableFailedSavingThrowReroll(state.combatants.get(roll.rollerId)) !==
      undefined,
  });
}

/**
 * The option a saving throw hole is asked again with for this roller: the
 * feature it can pay for, or, on a replay of the roll that paid, the feature
 * it paid with.
 */
export function failedSavingThrowRerollOption(
  actor: BattleCreatureState | undefined,
  roll: BattleD20TestRollKey,
): BattleFailedSavingThrowRerollOption | undefined {
  const execution =
    payableFailedSavingThrowReroll(actor) ??
    rollerFailedSavingThrowRerolls(actor)[0];
  if (execution === undefined) return undefined;
  return {
    effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
    label: "Failed saving throw reroll",
    rollerId: roll.rollerId,
    bonus: execution.savingThrow.reroll.bonus.level,
  };
}

/**
 * Whether the reroll is offered on the roll as it stands: the saving throw
 * stands failed and the roller can pay.
 */
export function failedSavingThrowRerollOffered(input: {
  readonly availability: D20TestRerollSpendAvailability;
  readonly succeeded: boolean;
}): boolean {
  return input.availability === "available" && !input.succeeded;
}

/**
 * The issue with a failed saving throw reroll decision on a rolled saving
 * throw as it stands, if any. It rerolls the saving throw ("you can reroll
 * it"): the single d20, or under Advantage or Disadvantage one chosen die
 * (playing-the-game.md, "Interactions with Rerolls"). Its replacement states
 * the table's ruling with the bonus.
 */
export function failedSavingThrowRerollOutcomeIssue(input: {
  readonly availability: D20TestRerollSpendAvailability;
  /** The roll as it stands: the original roll, or another source's reroll of it. */
  readonly roll: {
    readonly succeeded: boolean;
    readonly d20TestRoll: BattleD20TestRoll;
  };
  readonly decision: BattleFailedSavingThrowRerollDecision;
}): string | null {
  const decision = input.decision;
  // Only a save that stands failed is offered the reroll, so any decision on
  // a save that stands succeeded, a decline too, answers no offer.
  if (input.roll.succeeded)
    return FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE;
  const gate = d20TestRerollSpendGate({
    availability: input.availability,
    decision,
    unavailableMessage: FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE,
  });
  if (gate.tag === "finished") return gate.issue;
  return decision.kind === "decline"
    ? null
    : d20TestOutcomeReplacementIssue({
        originalD20TestRoll: input.roll.d20TestRoll,
        replacement: decision,
        messages: FAILED_SAVING_THROW_REROLL_MESSAGES,
        rerollableFace: anyD20Face,
      });
}

function anyD20Face(): boolean {
  return true;
}

/**
 * Whether an admitted roll spends a use of its roller's failed saving throw
 * reroll. Only {@link failedSavingThrowRerollUseForRoll} makes one, so the
 * spend follows a checked decision.
 */
export type FailedSavingThrowRerollUse = Brand.Branded<
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly scope: D20TestRerollSpendScope;
      readonly roll: BattleD20TestRollKey;
    },
  "FailedSavingThrowRerollUse"
>;
const FailedSavingThrowRerollUse = Brand.nominal<FailedSavingThrowRerollUse>();

/** A roll that doesn't spend a failed saving throw reroll. */
export const NO_FAILED_SAVING_THROW_REROLL_USE: FailedSavingThrowRerollUse =
  FailedSavingThrowRerollUse({ spends: false });

/**
 * The failed saving throw reroll use of a roll whose reroll decisions were
 * checked: it spends when the feature rerolled the roll and an earlier pass
 * of the subject hasn't already paid for this roll.
 */
export function failedSavingThrowRerollUseForRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestRerollSpendScope;
  readonly roll: BattleD20TestRollKey;
  readonly rerolled: boolean;
}): FailedSavingThrowRerollUse {
  return input.rerolled &&
    !d20TestRerollPaidOnRoll({
      ...input,
      record: FAILED_SAVING_THROW_REROLL_SPEND_RECORD,
    })
    ? FailedSavingThrowRerollUse({
        spends: true,
        scope: input.scope,
        roll: input.roll,
      })
    : NO_FAILED_SAVING_THROW_REROLL_USE;
}

/**
 * Spends one use of the roller's failed saving throw reroll for an admitted
 * roll that took it, and records the roll for the rest of the subject. On a
 * replay of the subject the same roll finds it already paid and changes
 * nothing.
 */
export function battleStateAfterFailedSavingThrowReroll(
  state: BattleState,
  use: FailedSavingThrowRerollUse,
): BattleState {
  if (
    !use.spends ||
    d20TestRerollPaidOnRoll({
      state,
      scope: use.scope,
      record: FAILED_SAVING_THROW_REROLL_SPEND_RECORD,
      roll: use.roll,
    })
  )
    return state;
  const actor = state.combatants.get(use.roll.rollerId);
  const execution = payableFailedSavingThrowReroll(actor);
  /* v8 ignore next -- @preserve -- A validated failed saving throw reroll belongs to a character who could pay for it. */
  if (actor?.origin.kind !== "character" || execution === undefined)
    return state;
  const resourcePoolRef = execution.savingThrow.spends.resourcePoolRef;
  const spent: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(use.roll.rollerId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((resource) =>
          resource.resourcePoolRef === resourcePoolRef &&
          resourceHasUsesRemaining(resource)
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  };
  return battleStateWithD20TestRerollPaid({
    state: spent,
    scope: use.scope,
    record: FAILED_SAVING_THROW_REROLL_SPEND_RECORD,
    roll: use.roll,
  });
}

/** The saving throw hole, asked again with the failed saving throw reroll option. */
export function savingThrowHoleWithFailedSavingThrowRerollOption<
  T extends BattleSavingThrowRerollHoleOptions,
>(
  hole: T,
  option: BattleFailedSavingThrowRerollOption,
): T & {
  readonly failedSavingThrowRerolls: readonly [
    BattleFailedSavingThrowRerollOption,
  ];
} {
  return { ...hole, failedSavingThrowRerolls: [option] };
}
