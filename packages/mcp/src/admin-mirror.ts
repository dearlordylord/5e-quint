import { Effect, Result, Schema } from "effect";

import { characterListRows } from "./character-session-rows.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { battlePresentationEnvelopeForSession } from "./battle-tool-payloads.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  AdminMirrorProjectionEnvelopeSchema,
  adminMirrorSequence,
  type AdminMirrorProjectionEnvelope,
  type AdminMirrorPublisherInstanceId,
  type AdminMirrorSequence,
  type AdminMirrorSessionId,
  type AdminSessionProjection,
} from "./admin-mirror-contract.ts";

export type AdminMirrorPublisher = {
  readonly publish: (
    envelope: AdminMirrorProjectionEnvelope,
  ) => Effect.Effect<void>;
};

const DEFAULT_HTTP_PUBLISH_TIMEOUT_MS = 1_000;

export type AdminMirrorPublication =
  | {
      readonly tag: "disabled";
      readonly publisher: AdminMirrorPublisher;
    }
  | {
      readonly tag: "enabled";
      readonly mirrorSessionId: AdminMirrorSessionId;
      readonly publisherInstanceId: AdminMirrorPublisherInstanceId;
      readonly nextSequence: () => AdminMirrorSequence;
      readonly publisher: AdminMirrorPublisher;
    };

const noopAdminMirrorPublisher: AdminMirrorPublisher = {
  publish: () => Effect.void,
};

export function createHttpAdminMirrorPublisher(input: {
  readonly endpoint: URL;
  readonly timeoutMs?: number;
}): AdminMirrorPublisher {
  const publishUrl = new URL("/admin-projections", input.endpoint);
  const timeoutMs = input.timeoutMs ?? DEFAULT_HTTP_PUBLISH_TIMEOUT_MS;
  let active = false;
  let pending: AdminMirrorProjectionEnvelope | null = null;

  async function post(envelope: AdminMirrorProjectionEnvelope): Promise<void> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);
    try {
      await fetch(publishUrl, {
        body: JSON.stringify(
          Schema.encodeSync(AdminMirrorProjectionEnvelopeSchema)(envelope),
        ),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: abortController.signal,
      });
    } catch {
      // Best-effort demo mirror publishing must never affect MCP tool results.
    } finally {
      clearTimeout(timeout);
    }
  }

  async function drain(first: AdminMirrorProjectionEnvelope): Promise<void> {
    let next: AdminMirrorProjectionEnvelope | null = first;
    while (next !== null) {
      const current = next;
      next = null;
      await post(current);
      next = pending;
      pending = null;
    }
    active = false;
  }

  return {
    publish: (envelope) =>
      Effect.promise(async () => {
        if (active) {
          pending = envelope;
          return;
        }
        active = true;
        await drain(envelope);
      }),
  };
}

export function disabledAdminMirrorPublication(): AdminMirrorPublication {
  return {
    tag: "disabled",
    publisher: noopAdminMirrorPublisher,
  };
}

export function enabledAdminMirrorPublication(input: {
  readonly mirrorSessionId: AdminMirrorSessionId;
  readonly publisherInstanceId: AdminMirrorPublisherInstanceId;
  readonly publisher: AdminMirrorPublisher;
}): Extract<AdminMirrorPublication, { readonly tag: "enabled" }> {
  let sequence = 0;
  return {
    tag: "enabled",
    mirrorSessionId: input.mirrorSessionId,
    publisher: input.publisher,
    publisherInstanceId: input.publisherInstanceId,
    nextSequence: () => adminMirrorSequence(sequence++),
  };
}

export function adminProjection(
  root: McpPlaySessionRoot,
): Result.Result<
  AdminSessionProjection,
  string | import("@dnd/battle-runtime").BattlePresentationIssues
> {
  const characters = characterListRows(root);
  if (Result.isFailure(characters)) return Result.fail(characters.failure);
  const battleState = root.sessionStore.battleState;
  const snapshot = root.sessionStore.snapshot();
  const sessionSummary = {
    draftIds: snapshot.draftIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
  };
  const presentedBattle =
    battleState.tag !== "activeBattle"
      ? Result.succeed(null)
      : battlePresentationEnvelopeForSession(root, battleState.session);
  if (Result.isFailure(presentedBattle)) {
    return Result.fail(presentedBattle.failure);
  }
  const projectedBattleState = battleStateSnapshot(
    root.sessionStore.battleState,
  );
  if (projectedBattleState.tag === "activeBattle") {
    if (presentedBattle.success === null) {
      return Result.fail("Active Battle projection is missing its envelope.");
    }
    return Result.succeed({
      battle: presentedBattle.success,
      characters: characters.success,
      session: { ...sessionSummary, battleState: projectedBattleState },
    });
  }
  if (projectedBattleState.tag === "none") {
    return Result.succeed({
      battle: null,
      characters: characters.success,
      session: { ...sessionSummary, battleState: projectedBattleState },
    });
  }
  return Result.succeed({
    battle: null,
    characters: characters.success,
    session: { ...sessionSummary, battleState: projectedBattleState },
  });
}

function publishAdminProjection(root: McpPlaySessionRoot): Effect.Effect<void> {
  const publication = root.adminMirrorPublication;
  if (publication.tag === "disabled") return Effect.void;
  const projection = adminProjection(root);
  if (Result.isFailure(projection)) return Effect.void;
  return publication.publisher.publish({
    mirrorSessionId: publication.mirrorSessionId,
    projection: projection.success,
    publisherInstanceId: publication.publisherInstanceId,
    sequence: publication.nextSequence(),
    sourceProcessId: process.pid,
  });
}

export function publishAdminProjectionBestEffort(
  root: McpPlaySessionRoot,
): void {
  Effect.runFork(publishAdminProjection(root));
}
