import {
  sameBattleSubject,
  type BattleFill,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Match } from "effect";

import type { PendingBattleFillSession } from "./session-store-types.ts";

type NeedsHolesBattleRuntimeResult = Extract<
  BattleRuntimeResolutionResult,
  { readonly tag: "needsHoles" }
>;
type BattleHolesFrontier = Extract<
  NeedsHolesBattleRuntimeResult["envelope"]["frontier"],
  { readonly kind: "holes" }
>;

/**
 * Retain only the replay source, selected subject, and accepted fills.  The
 * executable frontier is always re-read from the runtime envelope after a
 * recovery or retry; storing holes here would create a second frontier owner.
 */
export function pendingTransactionForResult({
  result,
  filledSubject,
  previous,
  fills,
  replaySession,
}: {
  readonly result: BattleRuntimeResolutionResult;
  readonly filledSubject: BattleSubject;
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
}): PendingBattleFillSession | null {
  return Match.value(result).pipe(
    Match.when({ tag: "resolved" }, (resolved) =>
      resolved.envelope.frontier.kind === "interruptDecision"
        ? interruptDecisionPendingTransaction(resolved.session, filledSubject)
        : null,
    ),
    Match.when({ tag: "needsHoles" }, (needsHoles) =>
      needsHolesPendingTransaction({
        result: needsHoles,
        filledSubject,
        previous,
        fills,
        replaySession,
      }),
    ),
    Match.when({ tag: "invalid" }, () => null),
    Match.exhaustive,
  );
}

function needsHolesPendingTransaction(input: {
  readonly result: NeedsHolesBattleRuntimeResult;
  readonly filledSubject: BattleSubject;
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
}): PendingBattleFillSession {
  return Match.value(input.result.envelope.frontier).pipe(
    Match.when({ kind: "interruptDecision" }, () =>
      interruptDecisionPendingTransaction(
        input.result.session,
        input.filledSubject,
      ),
    ),
    Match.when({ kind: "holes" }, (frontier) =>
      holesPendingTransaction({ ...input, frontier }),
    ),
    Match.exhaustive,
  );
}

function interruptDecisionPendingTransaction(
  session: BattleRuntimeSession,
  subject: BattleSubject,
): PendingBattleFillSession {
  return { baseSession: session, subject, fills: [] };
}

function holesPendingTransaction(input: {
  readonly result: NeedsHolesBattleRuntimeResult;
  readonly frontier: BattleHolesFrontier;
  readonly filledSubject: BattleSubject;
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
}): PendingBattleFillSession {
  if (input.frontier.continuation.kind === "runtimeOwnedInterrupt") {
    return runtimeOwnedInterruptPendingTransaction(input);
  }
  if (
    input.previous !== null &&
    sameBattleSubject(input.previous.subject, input.filledSubject)
  ) {
    return {
      baseSession: input.previous.baseSession,
      subject: input.frontier.subject,
      fills: input.fills,
    };
  }
  return {
    baseSession:
      input.previous === null ? input.result.session : input.replaySession,
    subject: input.frontier.subject,
    fills: input.fills,
  };
}

function runtimeOwnedInterruptPendingTransaction(input: {
  readonly result: NeedsHolesBattleRuntimeResult;
  readonly frontier: BattleHolesFrontier;
  readonly filledSubject: BattleSubject;
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
}): PendingBattleFillSession {
  if (
    input.previous !== null &&
    input.fills.at(-1)?.kind !== "interruptDecision" &&
    sameBattleSubject(input.previous.subject, input.filledSubject) &&
    sameBattleSubject(input.previous.subject, input.frontier.subject)
  ) {
    return {
      baseSession: input.previous.baseSession,
      subject: input.frontier.subject,
      fills: input.fills,
    };
  }
  // The returned session already contains the accepted interrupt response.
  // Reset the replay source at this durable boundary; replaying the nested
  // interrupt fill as an ordinary subject fill would resurrect the old
  // decision frontier on the next request or after recovery.
  return {
    baseSession: input.result.session,
    subject: input.frontier.subject,
    fills: [],
  };
}
