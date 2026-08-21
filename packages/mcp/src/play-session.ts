import { randomUUID } from "node:crypto";

import { Either, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { McpSessionSnapshot } from "./session-store.ts";

export const PLAY_SESSION_RESTORATION_GUIDANCE =
  "Create a new Play Session, then rebuild the desired state from model-visible or user-provided facts. The unavailable handle cannot be restored.";

export const PlaySessionIdSchema = Schema.String.pipe(
  Schema.pattern(
    /^play-session:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  ),
  Schema.brand("PlaySessionId"),
).annotations({
  description:
    "Process-lifetime Play Session handle returned by create_play_session.",
});

export type PlaySessionId = typeof PlaySessionIdSchema.Type;

export type PlaySessionUnavailable = {
  readonly tag: "playSessionUnavailable";
  readonly restoration: {
    readonly tag: "newSessionRequired";
    readonly guidance: typeof PLAY_SESSION_RESTORATION_GUIDANCE;
  };
};

export const PLAY_SESSION_UNAVAILABLE: PlaySessionUnavailable = {
  tag: "playSessionUnavailable",
  restoration: {
    tag: "newSessionRequired",
    guidance: PLAY_SESSION_RESTORATION_GUIDANCE,
  },
};

export type PlaySessionRegistry = {
  create(): {
    readonly playSessionId: PlaySessionId;
    readonly projection: McpSessionSnapshot;
  };
  run<A>(
    playSessionId: PlaySessionId,
    operation: (root: McpPlaySessionRoot) => A | Promise<A>,
  ): Promise<Either.Either<A, PlaySessionUnavailable>>;
};

type LivePlaySession = {
  readonly root: McpPlaySessionRoot;
  tail: Promise<void>;
};

export function createPlaySessionRegistry(input: {
  readonly createRoot: (playSessionId: PlaySessionId) => McpPlaySessionRoot;
}): PlaySessionRegistry {
  const liveSessions = new Map<PlaySessionId, LivePlaySession>();

  return {
    create() {
      let playSessionId = generatedPlaySessionId();
      while (liveSessions.has(playSessionId)) {
        playSessionId = generatedPlaySessionId();
      }
      const root = input.createRoot(playSessionId);
      liveSessions.set(playSessionId, { root, tail: Promise.resolve() });
      return {
        playSessionId,
        projection: root.sessionStore.snapshot(),
      };
    },
    async run(playSessionId, operation) {
      const session = liveSessions.get(playSessionId);
      if (session === undefined) {
        return Either.left(PLAY_SESSION_UNAVAILABLE);
      }

      const result = session.tail.then(() => operation(session.root));
      session.tail = result.then(
        () => undefined,
        () => undefined,
      );
      return Either.right(await result);
    },
  };
}

export function decodePlaySessionId(
  input: unknown,
): Either.Either<PlaySessionId, string> {
  return Either.mapLeft(
    Schema.decodeUnknownEither(PlaySessionIdSchema)(input),
    (issue) => issue.message,
  );
}

function generatedPlaySessionId(): PlaySessionId {
  for (;;) {
    const generated = Schema.decodeUnknownEither(PlaySessionIdSchema)(
      `play-session:${randomUUID()}`,
    );
    if (Either.isRight(generated)) return generated.right;
  }
}
