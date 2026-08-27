import {
  sameBattleSubject,
  type BattleFill,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
} from "@dnd/battle-runtime";

import type { PendingBattleFillSession } from "./session-store-types.ts";

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
  if (result.tag !== "needsHoles") return null;

  const frontier = result.envelope.frontier;
  if (frontier.kind === "interruptDecision") {
    return {
      baseSession: result.session,
      subject: filledSubject,
      fills: [],
    };
  }

  if (frontier.continuation.kind === "runtimeOwnedInterrupt") {
    if (
      previous !== null &&
      sameBattleSubject(previous.subject, filledSubject) &&
      sameBattleSubject(previous.subject, frontier.subject)
    ) {
      return {
        baseSession: previous.baseSession,
        subject: frontier.subject,
        fills,
      };
    }
    return {
      baseSession: result.session,
      subject: frontier.subject,
      fills: [],
    };
  }

  if (previous !== null && sameBattleSubject(previous.subject, filledSubject)) {
    return {
      baseSession: previous.baseSession,
      subject: frontier.subject,
      fills,
    };
  }

  return {
    baseSession: previous === null ? result.session : replaySession,
    subject: frontier.subject,
    fills,
  };
}
