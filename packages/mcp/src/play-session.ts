import { randomUUID } from "node:crypto";

import { Either, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
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

export type PlaySessionCreation = {
  readonly playSessionId: PlaySessionId;
  readonly projection: McpSessionSnapshot;
};

export type PlaySessionCreationFailure = {
  readonly tag: "playSessionCreationFailed";
  readonly reason: "playSessionIdCollision" | "storageUnavailable";
  readonly message: string;
};

export type PlaySessionStorageFailure = {
  readonly tag: "playSessionStorageFailure";
  readonly reason:
    | "unreadable"
    | "invalidStoredRecord"
    | "closed"
    | "concurrentWriteConflict";
  readonly message: string;
};

export type PlaySessionAccessFailure =
  | PlaySessionUnavailable
  | PlaySessionStorageFailure;

export type PlaySessionCommand = {
  readonly name: CharacterToolName | BattleToolName | DiceToolName;
  readonly args: Readonly<Record<string, unknown>>;
};

export type PlaySessionCommandRetention<A> = {
  readonly command: PlaySessionCommand;
  readonly retain: (result: A) => boolean;
};

export type PlaySessionRegistry<
  AccessFailure extends PlaySessionAccessFailure = PlaySessionUnavailable,
> = {
  create(): Either.Either<PlaySessionCreation, PlaySessionCreationFailure>;
  run<A>(
    playSessionId: PlaySessionId,
    operation: (root: McpPlaySessionRoot) => A | Promise<A>,
    commandRetention?: PlaySessionCommandRetention<A>,
  ): Promise<Either.Either<A, AccessFailure>>;
};

export type PlaySessionIdFactory = () => PlaySessionId;

type LivePlaySession = {
  readonly root: McpPlaySessionRoot;
  tail: Promise<void>;
};

const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;

export function createPlaySessionRegistry(input: {
  readonly createRoot: (playSessionId: PlaySessionId) => McpPlaySessionRoot;
  readonly playSessionIdFactory?: PlaySessionIdFactory;
}): PlaySessionRegistry {
  const liveSessions = new Map<PlaySessionId, LivePlaySession>();
  const playSessionIdFactory =
    input.playSessionIdFactory ?? generatedPlaySessionId;

  return {
    create() {
      return Either.map(
        availablePlaySessionId(playSessionIdFactory, liveSessions),
        (playSessionId) => {
          const root = input.createRoot(playSessionId);
          liveSessions.set(playSessionId, { root, tail: Promise.resolve() });
          return {
            playSessionId,
            projection: root.sessionStore.snapshot(),
          };
        },
      );
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

function availablePlaySessionId(
  playSessionIdFactory: PlaySessionIdFactory,
  liveSessions: ReadonlyMap<PlaySessionId, LivePlaySession>,
): Either.Either<PlaySessionId, PlaySessionCreationFailure> {
  for (let attempt = 0; attempt < MAX_PLAY_SESSION_ID_ATTEMPTS; attempt += 1) {
    const playSessionId = playSessionIdFactory();
    if (!liveSessions.has(playSessionId)) return Either.right(playSessionId);
  }
  return Either.left({
    tag: "playSessionCreationFailed",
    reason: "playSessionIdCollision",
    message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
  });
}

export function decodePlaySessionId(
  input: unknown,
): Either.Either<PlaySessionId, string> {
  return Either.mapLeft(
    Schema.decodeUnknownEither(PlaySessionIdSchema)(input),
    (issue) => issue.message,
  );
}

export function generatedPlaySessionId(): PlaySessionId {
  for (;;) {
    const generated = Schema.decodeUnknownEither(PlaySessionIdSchema)(
      `play-session:${randomUUID()}`,
    );
    if (Either.isRight(generated)) return generated.right;
  }
}
