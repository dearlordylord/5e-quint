import {
  battleSubjectPresentation,
  sameBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Match } from "effect";

import type {
  BattleFillSession,
  PendingBattleFillSession,
} from "./session-store-types.ts";

export function pendingTransactionForResult({
  result,
  filledSubject,
  previous,
  fills,
  replaySession,
  isInterruptDecision,
}: {
  readonly result: BattleRuntimeResolutionResult;
  readonly filledSubject: BattleFillSession["subject"];
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
  readonly isInterruptDecision: boolean;
}): PendingBattleFillSession | null {
  if (result.tag !== "needsHoles") return null;
  const resultPresentation = battleSubjectPresentation(
    result.session,
    result.subject,
  );
  if (resultPresentation === undefined) return null;
  const firstHole = result.holes[0];
  if (firstHole === undefined) return null;
  const holes: readonly [BattleHole, ...BattleHole[]] = [
    firstHole,
    ...result.holes.slice(1),
  ];
  const transactionHistory = Match.value(isInterruptDecision).pipe(
    Match.when(true, () => ({ baseSession: result.session, fills: [] })),
    Match.when(false, () =>
      ordinaryContinuationHistory({
        filledSubject,
        previous,
        replaySession,
        result,
        fills,
      }),
    ),
    Match.exhaustive,
  );
  return {
    baseSession: transactionHistory.baseSession,
    subject: result.subject,
    fills: transactionHistory.fills,
    holes,
  };
}

function ordinaryContinuationHistory({
  filledSubject,
  previous,
  replaySession,
  result,
  fills,
}: {
  readonly filledSubject: BattleFillSession["subject"];
  readonly previous: PendingBattleFillSession | null;
  readonly replaySession: BattleRuntimeSession;
  readonly result: Extract<
    BattleRuntimeResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly fills: readonly BattleFill[];
}): {
  readonly baseSession: BattleRuntimeSession;
  readonly fills: readonly BattleFill[];
} {
  if (
    previous !== null &&
    !sameBattleSubject(previous.subject, filledSubject)
  ) {
    return { baseSession: replaySession, fills };
  }

  const resultInterruptDepth = result.session.state.interruptStack.length;
  const previousInterruptDepth =
    previous?.baseSession.state.interruptStack.length;

  // An interrupt opening or closure changes the durable replay segment. The
  // resulting runtime session is the new checkpoint and the caller must not
  // carry ordinary fills across that boundary.
  if (previous === null) {
    return {
      baseSession: result.session,
      fills: resultInterruptDepth > 0 ? [] : fills,
    };
  }

  if (resultInterruptDepth !== previousInterruptDepth) {
    return { baseSession: result.session, fills: [] };
  }

  return {
    baseSession: previous.baseSession,
    fills,
  };
}
