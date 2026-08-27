import {
  battlePresentedCheckpointFrontierEnvelope,
  currentBattleCheckpointFrontierEnvelope,
  presentBattleCheckpointFrontierEnvelope,
  resolveBattleRuntimeSubject,
  type BattleCheckpointFrontierEnvelope,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleSnapshotPresentationIssues,
  type BattlePresentedCheckpointFrontierEnvelope,
} from "@dnd/battle-runtime";
import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { PendingBattleFillSession } from "./session-store.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import {
  mcpSessionSummary,
  type McpActiveSessionSnapshot,
  type McpSessionSummary,
} from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

type BattlePayloadPresentationIssues = BattleSnapshotPresentationIssues;

type BattleSessionPayload =
  | { readonly envelope: null; readonly session: McpSessionSummary }
  | { readonly envelope: null; readonly session: McpActiveSessionSnapshot }
  | {
      readonly envelope: BattlePresentedCheckpointFrontierEnvelope;
      readonly session: McpActiveSessionSnapshot;
    };

export type ActiveBattlePresentationProjection =
  BattlePresentedCheckpointFrontierEnvelope;

export function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

export function noStoredBattleContent() {
  return errorContent("No battle session has been started.", {
    code: "NO_BATTLE_SESSION",
  });
}

export function pendingBattleFillsContent(
  pendingFills: Pick<PendingBattleFillSession, "subject">,
  message: string,
) {
  return errorContent(message, {
    code: "BATTLE_FILLS_PENDING",
    pendingSubject: pendingFills.subject,
  });
}

export function battleSessionPayload(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession | null,
): Either.Either<BattleSessionPayload, BattleSnapshotPresentationIssues> {
  const snapshot = root.sessionStore.snapshot();
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (session === null) {
    if (battleState.tag !== "none") {
      throw new Error(
        "Empty battle presentation requires an owned empty state.",
      );
    }
    return Either.right({
      envelope: null,
      session: snapshot,
    });
  }
  if (battleState.tag !== "activeBattle") {
    throw new Error(
      "Active battle presentation requires an owned active state.",
    );
  }
  return Either.map(
    battlePresentationEnvelopeForSession(root, session),
    (envelope) => ({
      envelope,
      session: { ...snapshot, battleState },
    }),
  );
}

export function initialInitiativeSetupPayload(root: McpPlaySessionRoot) {
  const session = root.sessionStore.snapshot();
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (battleState.tag !== "initialInitiativeSetup") {
    throw new Error("Initial Initiative payload requires owned setup state.");
  }
  return {
    envelope: null,
    session: { ...session, battleState },
  };
}

export function initialInitiativeSetupStartPayload(root: McpPlaySessionRoot) {
  const session = root.sessionStore.snapshot();
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (battleState.tag !== "initialInitiativeSetup") {
    throw new Error("Initial Initiative payload requires owned setup state.");
  }
  return {
    envelope: null,
    session: { ...mcpSessionSummary(session), battleState },
  };
}

export function battleResolutionPayload(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
) {
  const presentation = presentBattleCheckpointFrontierEnvelope(
    result.session,
    result.envelope,
  );
  return Either.map(presentation, (envelope) => {
    const battleState = battleStateSnapshot(root.sessionStore.battleState);
    if (battleState.tag !== "activeBattle") {
      throw new Error("Battle resolution requires an active battle state.");
    }
    const session = root.sessionStore.snapshot();
    return {
      result: battleResolutionResultPayload(result),
      envelope,
      session: {
        ...session,
        battleState,
      },
    };
  });
}

/** Build the presented envelope for a stored session and any accepted fills. */
export function battlePresentationEnvelopeForSession(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): Either.Either<
  BattlePresentedCheckpointFrontierEnvelope,
  BattleSnapshotPresentationIssues
> {
  const pending = root.sessionStore.pendingBattleFills;
  if (pending === null) {
    return battlePresentedCheckpointFrontierEnvelope(session);
  }
  const current = currentBattleCheckpointFrontierEnvelope(session);
  if (current.frontier.kind === "interruptDecision") {
    return presentBattleCheckpointFrontierEnvelope(session, current);
  }
  const replay = resolveBattleRuntimeSubject({
    session: pending.baseSession,
    subject: pending.subject,
    fills: pending.fills,
    statBlockCatalog: root.statBlockCatalog,
  });
  return presentBattleCheckpointFrontierEnvelope(
    replay.session,
    replay.envelope,
  );
}

/** Read the mechanics envelope before a consumer performs a presentation join. */
export function battleMechanicsEnvelopeForSession(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): BattleCheckpointFrontierEnvelope {
  const pending = root.sessionStore.pendingBattleFills;
  if (pending === null) return currentBattleCheckpointFrontierEnvelope(session);
  const current = currentBattleCheckpointFrontierEnvelope(session);
  if (current.frontier.kind === "interruptDecision") return current;
  return resolveBattleRuntimeSubject({
    session: pending.baseSession,
    subject: pending.subject,
    fills: pending.fills,
    statBlockCatalog: root.statBlockCatalog,
  }).envelope;
}

export function battlePresentationProjection(
  session: BattleRuntimeSession,
): Either.Either<
  ActiveBattlePresentationProjection,
  BattleSnapshotPresentationIssues
> {
  return battlePresentedCheckpointFrontierEnvelope(session);
}

export function battleSnapshotPresentationIssueContent(
  issues: BattlePayloadPresentationIssues,
) {
  return errorContent("Battle presentation context is incomplete.", {
    code: "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE",
    issues,
  });
}

export function battleResolutionResultPayload(
  result: BattleRuntimeResolutionResult,
) {
  if (result.tag === "resolved") {
    return {
      tag: result.tag,
      ...(result.objectDamages === undefined
        ? {}
        : { objectDamages: result.objectDamages }),
      ...(result.objectIgnitions === undefined
        ? {}
        : { objectIgnitions: result.objectIgnitions }),
      ...(result.droppedObjects === undefined
        ? {}
        : { droppedObjects: result.droppedObjects }),
      ...(result.shovePushes === undefined
        ? {}
        : { shovePushes: result.shovePushes }),
    };
  }
  if (result.tag === "needsHoles") {
    return { tag: result.tag };
  }
  return {
    tag: result.tag,
    reason: result.reason,
    message: result.message,
  };
}
