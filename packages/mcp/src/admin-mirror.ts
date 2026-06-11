import { snapshotBattle } from "@dnd/battle-runtime";
import { Effect, Either, Schema } from "effect";

import { characterListRows } from "./character-session-rows.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  AdminMirrorProjectionEnvelopeSchema,
  adminMirrorSequence,
  type AdminMirrorProjectionEnvelope,
  type AdminMirrorPublisherInstanceId,
  type AdminMirrorSequence,
  type AdminMirrorSessionId,
  type AdminMirrorSessionSummary,
  type AdminSessionProjection,
} from "./admin-mirror-contract.ts";
import type { McpSessionSnapshot } from "./session-store.ts";

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
      Effect.tryPromise({
        catch: () => undefined,
        try: async () => {
          if (active) {
            pending = envelope;
            return;
          }
          active = true;
          await drain(envelope);
        },
      }).pipe(Effect.catchAll(() => Effect.void)),
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
}): AdminMirrorPublication {
  let sequence = 0;
  return {
    tag: "enabled",
    mirrorSessionId: input.mirrorSessionId,
    publisher: input.publisher,
    publisherInstanceId: input.publisherInstanceId,
    nextSequence: () => adminMirrorSequence(sequence++),
  };
}

function adminProjection(
  root: McpCompositionRoot,
): Either.Either<AdminSessionProjection, string> {
  const characters = characterListRows(root);
  if (Either.isLeft(characters)) return Either.left(characters.left);
  return Either.right({
    battle:
      root.sessionStore.battleState === null
        ? null
        : snapshotBattle(root.sessionStore.battleState),
    characters: characters.right,
    session: adminMirrorSessionSummary(root.sessionStore.snapshot()),
  });
}

function adminMirrorSessionSummary(
  snapshot: McpSessionSnapshot,
): AdminMirrorSessionSummary {
  return {
    activeBattle: snapshot.activeBattle,
    draftIds: snapshot.draftIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    transientBattleFills: snapshot.transientBattleFills,
  };
}

function publishAdminProjection(root: McpCompositionRoot): Effect.Effect<void> {
  const publication = root.adminMirrorPublication;
  if (publication.tag === "disabled") return Effect.void;
  const projection = adminProjection(root);
  if (Either.isLeft(projection)) return Effect.void;
  return publication.publisher.publish({
    mirrorSessionId: publication.mirrorSessionId,
    projection: projection.right,
    publisherInstanceId: publication.publisherInstanceId,
    sequence: publication.nextSequence(),
    sourceProcessId: process.pid,
  });
}

export function publishAdminProjectionBestEffort(
  root: McpCompositionRoot,
): void {
  Effect.runFork(publishAdminProjection(root));
}
