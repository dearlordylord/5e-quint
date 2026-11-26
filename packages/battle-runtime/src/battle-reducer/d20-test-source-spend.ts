// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// What a D20 Test source that costs something (Heroic Inspiration, a use of a
// failed saving throw reroll, a Bardic Inspiration die, a use of a failed
// ability check boost) shares: where its cost stands for one roll, and the
// record of the rolls that took it while the subject they belong to can
// replay. A replay after a reaction window resolves the subject's rolls again
// from the state after a spend, so the roll that took its source can take it
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
 * - "available": it can pay, or this roll took the source before a replay;
 * - "spentOnAnotherRoll": another roll of the same subject spent what it had,
 *   so a decline made before that spend still stands;
 * - "unavailable": it has nothing to decide about.
 */
export const D20_TEST_SPEND_AVAILABILITIES = [
  "available",
  "spentOnAnotherRoll",
  "unavailable",
] as const;
/** One of {@link D20_TEST_SPEND_AVAILABILITIES}. */
export type D20TestSpendAvailability =
  (typeof D20_TEST_SPEND_AVAILABILITIES)[number];

/**
 * Where a roll's spend is remembered while its resolution can replay: the
 * subject the roll belongs to, or nowhere for a roll whose resolution takes
 * one step (a Glyph of Warding release the table witnesses).
 */
export type D20TestSpendScope =
  | { readonly kind: "subject"; readonly subject: BattleSubject }
  | { readonly kind: "oneStep" };

/** The replay record each costed source keeps the rolls that took it in. */
export type D20TestSpendRecord = keyof Pick<
  BattleAcceptedSubjectReplayEvidence,
  | "acceptedHeroicInspirationRerolls"
  | "acceptedFailedSavingThrowRerolls"
  | "acceptedBardicInspirationDice"
  | "acceptedFailedAbilityCheckResourceBoosts"
>;

/** What one record keeps for each roll that took its source: the roll, and what the source needs on a replay. */
export type D20TestSpendRecordEntry<Record extends D20TestSpendRecord> =
  NonNullable<BattleAcceptedSubjectReplayEvidence[Record]>[number];

function sameD20TestRoll(
  left: BattleD20TestRollKey,
  right: BattleD20TestRollKey,
): boolean {
  return left.rollerId === right.rollerId && left.holeId === right.holeId;
}

function takenRolls<Record extends D20TestSpendRecord>(
  state: BattleState,
  scope: D20TestSpendScope,
  record: Record,
): readonly D20TestSpendRecordEntry<Record>[] {
  return Match.value(scope).pipe(
    Match.when(
      { kind: "subject" },
      ({ subject }): readonly D20TestSpendRecordEntry<Record>[] =>
        subjectContinuationPhaseFor(state, subject)[record] ?? [],
    ),
    Match.when({ kind: "oneStep" }, () => []),
    Match.exhaustive,
  );
}

/** The record an earlier pass of the subject kept for this roll taking its source, if it did. */
export function d20TestSourceTakeOnRoll<
  Record extends D20TestSpendRecord,
>(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly record: Record;
  readonly roll: BattleD20TestRollKey;
}): D20TestSpendRecordEntry<Record> | undefined {
  return takenRolls(input.state, input.scope, input.record).find((taken) =>
    sameD20TestRoll(taken, input.roll),
  );
}

/** Whether an earlier pass of the subject recorded this roll as taking its source. */
export function d20TestSourceTakenOnRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly record: D20TestSpendRecord;
  readonly roll: BattleD20TestRollKey;
}): boolean {
  return d20TestSourceTakeOnRoll(input) !== undefined;
}

/** Where a roller's cost stands for a roll it cannot pay for: {@link D20_TEST_SPEND_AVAILABILITIES} but "available". */
export type D20TestSpendUnavailability = Exclude<
  D20TestSpendAvailability,
  "available"
>;

/**
 * Whether a roll that took its source paid the source's cost, for each
 * record. Every source pays when its roll takes it, but the failed ability
 * check boost, which pays only when the check then succeeds.
 */
const D20_TEST_SPEND_RECORD_ENTRY_PAID: {
  readonly [Record in D20TestSpendRecord]: (
    entry: D20TestSpendRecordEntry<Record>,
  ) => boolean;
} = {
  acceptedHeroicInspirationRerolls: () => true,
  acceptedFailedSavingThrowRerolls: () => true,
  acceptedBardicInspirationDice: () => true,
  acceptedFailedAbilityCheckResourceBoosts: (entry) => entry.useSpent,
};

function d20TestSpendRecordEntryPaid<Record extends D20TestSpendRecord>(
  record: Record,
  entry: D20TestSpendRecordEntry<Record>,
): boolean {
  const paid: (entry: D20TestSpendRecordEntry<Record>) => boolean =
    D20_TEST_SPEND_RECORD_ENTRY_PAID[record];
  return paid(entry);
}

/**
 * Where the roller's cost stands for a roll that has nothing recorded and
 * that it cannot pay for now: spent on another roll of the subject, or never
 * there.
 */
export function d20TestSpendUnavailability<
  Record extends D20TestSpendRecord,
>(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly record: Record;
  readonly roll: BattleD20TestRollKey;
}): D20TestSpendUnavailability {
  return takenRolls(input.state, input.scope, input.record).some(
    (taken) =>
      taken.rollerId === input.roll.rollerId &&
      d20TestSpendRecordEntryPaid(input.record, taken),
  )
    ? "spentOnAnotherRoll"
    : "unavailable";
}

/** Where the roller's cost stands for this roll. */
export function d20TestSpendAvailability<
  Record extends D20TestSpendRecord,
>(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly record: Record;
  readonly roll: BattleD20TestRollKey;
  /** Whether the roller can pay now, in the state as it stands. */
  readonly rollerCanPay: boolean;
}): D20TestSpendAvailability {
  if (d20TestSourceTakenOnRoll(input)) return "available";
  if (input.rollerCanPay) return "available";
  return d20TestSpendUnavailability(input);
}

/** The state with this roll recorded as taking its source for the rest of its subject. */
export function battleStateWithD20TestSourceTaken<
  Record extends D20TestSpendRecord,
>(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly record: Record;
  /** The roll, and what the source needs on a replay. */
  readonly taken: D20TestSpendRecordEntry<Record>;
}): BattleState {
  const scope = input.scope;
  if (scope.kind === "oneStep") return input.state;
  const phase = subjectContinuationPhaseFor(input.state, scope.subject);
  const taken: readonly D20TestSpendRecordEntry<Record>[] =
    phase[input.record] ?? [];
  return {
    ...input.state,
    subjectResolutionPhase: {
      ...phase,
      [input.record]: [...taken, input.taken],
    },
  };
}

/** The kinds of decision a roller makes on a costed D20 Test source. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for D20TestDecisionKind.
const D20_TEST_DECISION_KINDS = [
  "decline",
  "reroll",
  "rerollRolledDie",
  "addDie",
] as const;
/** One of {@link D20_TEST_DECISION_KINDS}. */
export type D20TestDecisionKind = (typeof D20_TEST_DECISION_KINDS)[number];

/**
 * Whether the roller's cost lets it make this decision: a decline needs only
 * that it once had the choice; any other decision needs the cost now.
 */
export function d20TestSpendGate(input: {
  readonly availability: D20TestSpendAvailability;
  readonly decision: { readonly kind: D20TestDecisionKind };
  readonly unavailableMessage: string;
}): D20TestSpendGate {
  const availability = input.availability;
  return availability === "available"
    ? { tag: "decide" }
    : {
        tag: "finished",
        issue: d20TestUnavailableDecisionIssue({ ...input, availability }),
      };
}

/**
 * The issue with a decision on a source the roller cannot pay for: a decline
 * stands when another roll of the subject spent what it had, since the
 * roller once had the choice; anything else is refused.
 */
export function d20TestUnavailableDecisionIssue(input: {
  readonly availability: D20TestSpendUnavailability;
  readonly decision: { readonly kind: D20TestDecisionKind };
  readonly unavailableMessage: string;
}): string | null {
  return Match.value(input.availability).pipe(
    Match.when("unavailable", () => input.unavailableMessage),
    Match.when("spentOnAnotherRoll", () =>
      input.decision.kind === "decline" ? null : input.unavailableMessage,
    ),
    Match.exhaustive,
  );
}

/**
 * Whether the decision's own facts decide it (`decide`), or its roller's cost
 * already settles it with this issue, or none.
 */
export type D20TestSpendGate =
  | { readonly tag: "decide" }
  | { readonly tag: "finished"; readonly issue: string | null };
