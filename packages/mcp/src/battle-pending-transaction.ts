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
  const interruptContinuation = {
    isInterruptDecision,
    previous,
    resultSubject: result.subject,
    filledSubject,
  };
  if (continuesPreviousInterruptTransaction(interruptContinuation)) {
    return {
      baseSession: interruptContinuation.previous.baseSession,
      subject: result.subject,
      fills: interruptContinuation.previous.fills,
      holes,
    };
  }
  const transactionHistory = Match.value(isInterruptDecision).pipe(
    Match.when(true, () => ({ baseSession: result.session, fills: [] })),
    Match.when(false, () => ({ baseSession: replaySession, fills })),
    Match.exhaustive,
  );
  return {
    baseSession: transactionHistory.baseSession,
    subject: result.subject,
    fills: transactionHistory.fills,
    holes,
  };
}

function continuesPreviousInterruptTransaction(input: {
  readonly isInterruptDecision: boolean;
  readonly previous: PendingBattleFillSession | null;
  readonly resultSubject: BattleFillSession["subject"];
  readonly filledSubject: BattleFillSession["subject"];
}): input is typeof input & {
  readonly previous: PendingBattleFillSession;
} {
  return (
    input.isInterruptDecision &&
    input.previous !== null &&
    sameBattleSubject(input.resultSubject, input.filledSubject)
  );
}
