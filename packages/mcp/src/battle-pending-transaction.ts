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
}: {
  readonly result: BattleRuntimeResolutionResult;
  readonly filledSubject: BattleFillSession["subject"];
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
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
  const transactionHistory = Match.value(result.checkpointBoundary.kind).pipe(
    Match.when("durableInterruptCheckpoint", () => ({
      kind: "durableInterruptCheckpoint" as const,
      baseSession: result.session,
      fills: [],
    })),
    Match.when("durableContinuationCheckpoint", () => ({
      kind: "durableContinuationCheckpoint" as const,
      baseSession: result.session,
      fills: [],
    })),
    Match.when("ordinaryReplay", () =>
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
  readonly kind: "ordinaryReplay";
  readonly baseSession: BattleRuntimeSession;
  readonly fills: readonly BattleFill[];
} {
  if (
    previous !== null &&
    !sameBattleSubject(previous.subject, filledSubject)
  ) {
    return { kind: "ordinaryReplay", baseSession: replaySession, fills };
  }

  if (previous === null) {
    return { kind: "ordinaryReplay", baseSession: result.session, fills };
  }

  return {
    kind: "ordinaryReplay",
    baseSession: previous.baseSession,
    fills,
  };
}
