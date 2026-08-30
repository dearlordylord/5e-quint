import {
  battlePendingTransactionEnvelopeForSession,
  currentBattleCheckpointFrontierEnvelope,
  presentBattleCheckpointFrontierEnvelope,
  type BattleCheckpointFrontierEnvelope,
  type BattlePendingTransactionView,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattlePresentationIssues,
  type BattlePresentedCheckpointFrontierEnvelope,
} from "@dnd/battle-runtime";
import { Result } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import {
  mcpSessionSummary,
  type McpActiveSessionSnapshot,
  type McpSessionSummary,
} from "./session-snapshot-output.ts";
import type { BattleResolutionResultPayload } from "./battle-tool-output.ts";
import { errorContent } from "./tool-content.ts";

type BattleSessionPayload =
  | {
      readonly envelope: null;
      readonly session: Omit<McpSessionSummary, "battleState"> & {
        readonly battleState: Extract<
          McpSessionSummary["battleState"],
          { readonly tag: "none" }
        >;
      };
    }
  | {
      readonly envelope: null;
      readonly session: Omit<McpSessionSummary, "battleState"> & {
        readonly battleState: Extract<
          McpSessionSummary["battleState"],
          { readonly tag: "initialInitiativeSetup" }
        >;
      };
    }
  | {
      readonly envelope: BattlePresentedCheckpointFrontierEnvelope;
      readonly session: McpActiveSessionSnapshot;
    };

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
  pendingFills: Pick<BattlePendingTransactionView, "subject">,
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
): Result.Result<BattleSessionPayload, BattlePresentationIssues> {
  const snapshot = root.sessionStore.snapshot();
  const sessionSummary = mcpSessionSummary(snapshot);
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (session === null) {
    if (battleState.tag !== "none") {
      throw new Error(
        "Empty battle presentation requires an owned empty state.",
      );
    }
    return Result.succeed({
      envelope: null,
      session: { ...sessionSummary, battleState },
    });
  }
  if (battleState.tag !== "activeBattle") {
    throw new Error(
      "Active battle presentation requires an owned active state.",
    );
  }
  return Result.map(
    battlePresentationEnvelopeForSession(root, session),
    (envelope) => ({
      envelope,
      session: { ...sessionSummary, battleState },
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
  return Result.map(presentation, (envelope) => {
    const battleState = battleStateSnapshot(root.sessionStore.battleState);
    if (battleState.tag !== "activeBattle") {
      throw new Error("Battle resolution requires an active battle state.");
    }
    const session = {
      ...root.sessionStore.snapshot(),
      battleState,
    };
    if (result.tag === "resolved") {
      return {
        result: battleResolutionResultPayload(result),
        envelope,
        session,
      };
    }
    if (result.tag === "needsHoles") {
      return {
        result: battleResolutionResultPayload(result),
        envelope,
        session,
      };
    }
    return {
      result: battleResolutionResultPayload(result),
      envelope,
      session,
    };
  });
}

/** Build the presented envelope for a stored session and any accepted fills. */
export function battlePresentationEnvelopeForSession(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): Result.Result<
  BattlePresentedCheckpointFrontierEnvelope,
  BattlePresentationIssues
> {
  const source = battleEnvelopeSourceForSession(root, session);
  return presentBattleCheckpointFrontierEnvelope(
    source.session,
    source.envelope,
  );
}

/** Read the mechanics envelope before a consumer performs a presentation join. */
export function battleMechanicsEnvelopeForSession(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): BattleCheckpointFrontierEnvelope {
  return battleEnvelopeSourceForSession(root, session).envelope;
}

function battleEnvelopeSourceForSession(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): {
  readonly session: BattleRuntimeSession;
  readonly envelope: BattleCheckpointFrontierEnvelope;
} {
  // The battle state and its checkpoint/frontier are runtime-owned. A pending
  // transaction is only an opaque continuation token, so presentation reads
  // the canonical envelope from the stored session rather than replaying a
  // second copy of the continuation in MCP.
  const ownedSession =
    root.sessionStore.battleState.tag === "activeBattle"
      ? root.sessionStore.battleState.session
      : session;
  const pending = root.sessionStore.getPendingBattleTransaction();
  if (pending !== null) {
    const projected = battlePendingTransactionEnvelopeForSession(
      pending,
      ownedSession,
    );
    if (projected.tag === "valid") {
      return { session: ownedSession, envelope: projected.envelope };
    }
  }
  return {
    session: ownedSession,
    envelope: currentBattleCheckpointFrontierEnvelope(ownedSession),
  };
}

export function battlePresentationIssueContent(
  issues: BattlePresentationIssues,
) {
  return errorContent("Battle presentation context is incomplete.", {
    code: "BATTLE_PRESENTATION_INCOMPLETE",
    issues,
  });
}

export function battleResolutionResultPayload(
  result: Extract<BattleRuntimeResolutionResult, { readonly tag: "resolved" }>,
): Extract<BattleResolutionResultPayload, { readonly tag: "resolved" }>;
export function battleResolutionResultPayload(
  result: Extract<
    BattleRuntimeResolutionResult,
    { readonly tag: "needsHoles" }
  >,
): Extract<BattleResolutionResultPayload, { readonly tag: "needsHoles" }>;
export function battleResolutionResultPayload(
  result: Extract<BattleRuntimeResolutionResult, { readonly tag: "invalid" }>,
): Extract<BattleResolutionResultPayload, { readonly tag: "invalid" }>;
export function battleResolutionResultPayload(
  result: BattleRuntimeResolutionResult,
): BattleResolutionResultPayload {
  if (result.tag === "resolved") {
    return {
      tag: "resolved",
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
    return { tag: "needsHoles" };
  }
  return {
    tag: "invalid",
    reason: result.reason,
    message: result.message,
  };
}
