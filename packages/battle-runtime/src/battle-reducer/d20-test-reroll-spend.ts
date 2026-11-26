// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// What a reroll source that costs something (Heroic Inspiration, a use of a
// failed saving throw reroll) shares: where its cost stands for one roll, and
// the record of the rolls that paid it while the subject they belong to can
// replay. A replay after a reaction window resolves the subject's rolls again
// from the state after a spend, so the roll that paid can take its reroll
// again without paying twice.

import { Match } from "effect";

import type {
  BattleAcceptedSubjectReplayEvidence,
  BattleD20TestRollKey,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { subjectContinuationPhaseFor } from "./subject-continuation-phase.ts";

/**
 * Where a roller's cost for a reroll source can stand for one roll:
 * - "available": it can pay, or this roll paid before a replay;
 * - "spentOnAnotherRoll": another roll of the same subject spent what it had,
 *   so a decline made before that spend still stands;
 * - "unavailable": it has nothing to decide about.
 */
export const D20_TEST_REROLL_SPEND_AVAILABILITIES = [
  "available",
  "spentOnAnotherRoll",
  "unavailable",
] as const;
/** One of {@link D20_TEST_REROLL_SPEND_AVAILABILITIES}. */
export type D20TestRerollSpendAvailability =
  (typeof D20_TEST_REROLL_SPEND_AVAILABILITIES)[number];

/**
 * Where a roll's spend is remembered while its resolution can replay: the
 * subject the roll belongs to, or nowhere for a roll whose resolution takes
 * one step (a Glyph of Warding release the table witnesses).
 */
export type D20TestRerollSpendScope =
  | { readonly kind: "subject"; readonly subject: BattleSubject }
  | { readonly kind: "oneStep" };

/** The replay record each costed reroll source keeps its paid rolls in. */
export type D20TestRerollSpendRecord = keyof Pick<
  BattleAcceptedSubjectReplayEvidence,
  "acceptedHeroicInspirationRerolls" | "acceptedFailedSavingThrowRerolls"
>;

function sameD20TestRoll(
  left: BattleD20TestRollKey,
  right: BattleD20TestRollKey,
): boolean {
  return left.rollerId === right.rollerId && left.holeId === right.holeId;
}

function paidRolls(
  state: BattleState,
  scope: D20TestRerollSpendScope,
  record: D20TestRerollSpendRecord,
): readonly BattleD20TestRollKey[] {
  return Match.value(scope).pipe(
    Match.when(
      { kind: "subject" },
      ({ subject }) =>
        subjectContinuationPhaseFor(state, subject)[record] ?? [],
    ),
    Match.when({ kind: "oneStep" }, () => []),
    Match.exhaustive,
  );
}

/** Whether an earlier pass of the subject already paid for this roll's reroll. */
export function d20TestRerollPaidOnRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestRerollSpendScope;
  readonly record: D20TestRerollSpendRecord;
  readonly roll: BattleD20TestRollKey;
}): boolean {
  return paidRolls(input.state, input.scope, input.record).some((paid) =>
    sameD20TestRoll(paid, input.roll),
  );
}

/** Where the roller's cost stands for this roll. */
export function d20TestRerollSpendAvailability(input: {
  readonly state: BattleState;
  readonly scope: D20TestRerollSpendScope;
  readonly record: D20TestRerollSpendRecord;
  readonly roll: BattleD20TestRollKey;
  /** Whether the roller can pay now, in the state as it stands. */
  readonly rollerCanPay: boolean;
}): D20TestRerollSpendAvailability {
  if (d20TestRerollPaidOnRoll(input)) return "available";
  if (input.rollerCanPay) return "available";
  return paidRolls(input.state, input.scope, input.record).some(
    (paid) => paid.rollerId === input.roll.rollerId,
  )
    ? "spentOnAnotherRoll"
    : "unavailable";
}

/** The state with this roll recorded as paid for the rest of its subject. */
export function battleStateWithD20TestRerollPaid(input: {
  readonly state: BattleState;
  readonly scope: D20TestRerollSpendScope;
  readonly record: D20TestRerollSpendRecord;
  readonly roll: BattleD20TestRollKey;
}): BattleState {
  const scope = input.scope;
  if (scope.kind === "oneStep") return input.state;
  const phase = subjectContinuationPhaseFor(input.state, scope.subject);
  return {
    ...input.state,
    subjectResolutionPhase: {
      ...phase,
      [input.record]: [...(phase[input.record] ?? []), input.roll],
    },
  };
}

/**
 * Whether the roller's cost lets it make this decision: a decline needs only
 * that it once had the choice; a reroll needs the cost now.
 */
export function d20TestRerollSpendGate(input: {
  readonly availability: D20TestRerollSpendAvailability;
  readonly decision: {
    readonly kind: "decline" | "reroll" | "rerollRolledDie";
  };
  readonly unavailableMessage: string;
}): D20TestRerollSpendGate {
  return Match.value(input.availability).pipe(
    Match.when(
      "unavailable",
      (): D20TestRerollSpendGate => ({
        tag: "finished",
        issue: input.unavailableMessage,
      }),
    ),
    Match.when(
      "spentOnAnotherRoll",
      (): D20TestRerollSpendGate => ({
        tag: "finished",
        issue:
          input.decision.kind === "decline" ? null : input.unavailableMessage,
      }),
    ),
    Match.when("available", (): D20TestRerollSpendGate => ({ tag: "decide" })),
    Match.exhaustive,
  );
}

/**
 * Whether the decision's own facts decide it (`decide`), or its roller's cost
 * already settles it with this issue, or none.
 */
export type D20TestRerollSpendGate =
  | { readonly tag: "decide" }
  | { readonly tag: "finished"; readonly issue: string | null };
