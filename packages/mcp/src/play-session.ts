import { randomUUID } from "node:crypto";

import { Result, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import type { DiceToolName, RollDiceRequest } from "./dice-tool-input.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import {
  generatedGuestAccessGrant,
  currentEpochMilliseconds,
  guestAccessGrantDigest,
  guestAccessGrantMatchesDigest,
  playSessionIsExpired,
  projectPlaySessionTenure,
  type GuestAccessGrant,
  type GuestAccessGrantFactory,
  type EpochMilliseconds,
  type PlaySessionCaller,
  type PlaySessionTenureProjection,
  type PrincipalId,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";

export const PLAY_SESSION_RESTORATION_GUIDANCE =
  "Create a new Play Session, then rebuild the desired state from model-visible or user-provided facts. The unavailable handle cannot be restored.";

export const PlaySessionIdSchema = Schema.String.pipe(
  Schema.pattern(
    /^play-session:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  ),
  Schema.brand("PlaySessionId"),
).annotate({
  description:
    "Play Session handle returned by create_play_session; use it together with the returned guest access grant unless authenticated.",
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

type PlaySessionCreationBase = {
  readonly playSessionId: PlaySessionId;
  readonly projection: McpSessionSnapshot;
};

export type PlaySessionCreation = PlaySessionCreationBase &
  (
    | {
        readonly tenure: Extract<PlaySessionTenureProjection, { tag: "guest" }>;
        readonly access: {
          readonly tag: "guest";
          readonly guestAccessGrant: GuestAccessGrant;
        };
      }
    | {
        readonly tenure: Extract<PlaySessionTenureProjection, { tag: "saved" }>;
        readonly access: { readonly tag: "authenticated" };
      }
  );

export type PlaySessionCreationFailure = {
  readonly tag: "playSessionCreationFailed";
  readonly reason:
    | "playSessionIdCollision"
    | "storageUnavailable"
    | "savedSessionQuotaExceeded"
    | "guestCapacityExceeded";
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

export type PlaySessionLimitFailure = {
  readonly tag: "playSessionLimitFailure";
  readonly message: string;
} & (
  | {
      readonly reason: "requestRateExceeded";
      readonly retryAfterSeconds: number;
    }
  | {
      readonly reason:
        | "retainedCommandQuotaExceeded"
        | "savedSessionQuotaExceeded"
        | "guestCapacityExceeded";
    }
);

export type PlaySessionAccessFailure =
  | PlaySessionUnavailable
  | PlaySessionStorageFailure
  | PlaySessionLimitFailure;

export type PlaySessionRunResult<A> = {
  readonly value: A;
  readonly tenure: PlaySessionTenureProjection;
};

export type SavedPlaySessionSummary = {
  readonly playSessionId: PlaySessionId;
  readonly tenure: Extract<PlaySessionTenureProjection, { tag: "saved" }>;
};

export type PlaySessionCommand =
  | {
      readonly name: CharacterToolName | BattleToolName;
      readonly args: Readonly<Record<string, unknown>>;
    }
  | {
      readonly name: DiceToolName;
      readonly args: RollDiceRequest;
    };

export type PlaySessionCommandRetention<A> = {
  readonly commandFor: (result: A) => PlaySessionCommand;
  readonly retain: (result: A) => boolean;
  readonly succeeded?: (result: A) => boolean;
};

export type PlaySessionRegistry<
  AccessFailure extends PlaySessionAccessFailure = PlaySessionUnavailable,
> = {
  create(
    caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
  ): Result.Result<PlaySessionCreation, PlaySessionCreationFailure>;
  run<A>(
    playSessionId: PlaySessionId,
    caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>,
    operation: (root: McpPlaySessionRoot) => A | Promise<A>,
    commandRetention?: PlaySessionCommandRetention<A>,
  ): Promise<Result.Result<PlaySessionRunResult<A>, AccessFailure>>;
  save(
    playSessionId: PlaySessionId,
    guestAccessGrant: GuestAccessGrant,
    principalId: PrincipalId,
  ): Promise<Result.Result<PlaySessionTenureProjection, AccessFailure>>;
  listSaved(
    principalId: PrincipalId,
  ): Result.Result<readonly SavedPlaySessionSummary[], AccessFailure>;
  deleteSaved(
    playSessionId: PlaySessionId,
    principalId: PrincipalId,
  ): Promise<
    Result.Result<{ readonly tag: "playSessionDeleted" }, AccessFailure>
  >;
};

export type PlaySessionIdFactory = () => PlaySessionId;

type LivePlaySession = {
  readonly root: McpPlaySessionRoot;
  tenure: StoredPlaySessionTenure;
  tail: Promise<void>;
};

const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;

export function createPlaySessionRegistry(input: {
  readonly createRoot: (playSessionId: PlaySessionId) => McpPlaySessionRoot;
  readonly playSessionIdFactory?: PlaySessionIdFactory;
  readonly guestAccessGrantFactory?: GuestAccessGrantFactory;
  readonly now?: () => EpochMilliseconds;
}): PlaySessionRegistry {
  const liveSessions = new Map<PlaySessionId, LivePlaySession>();
  const playSessionIdFactory =
    input.playSessionIdFactory ?? generatedPlaySessionId;
  const guestAccessGrantFactory =
    input.guestAccessGrantFactory ?? generatedGuestAccessGrant;
  const now = input.now ?? currentEpochMilliseconds;

  return {
    create(caller) {
      return Result.map(
        availablePlaySessionId(playSessionIdFactory, liveSessions),
        (playSessionId) => {
          const root = input.createRoot(playSessionId);
          if (caller.tag === "anonymous") {
            const guestAccessGrant = guestAccessGrantFactory();
            const tenure = {
              tag: "guest",
              guestAccessGrantDigest: guestAccessGrantDigest(guestAccessGrant),
              lastActivityAtMs: now(),
            } as const;
            liveSessions.set(playSessionId, {
              root,
              tenure,
              tail: Promise.resolve(),
            });
            return {
              playSessionId,
              projection: root.sessionStore.snapshot(),
              tenure: projectPlaySessionTenure(tenure),
              access: { tag: "guest", guestAccessGrant },
            };
          }
          const tenure = {
            tag: "saved",
            principalId: caller.principalId,
            lastActivityAtMs: now(),
          } as const;
          liveSessions.set(playSessionId, {
            root,
            tenure,
            tail: Promise.resolve(),
          });
          return {
            playSessionId,
            projection: root.sessionStore.snapshot(),
            tenure: projectPlaySessionTenure(tenure),
            access: { tag: "authenticated" },
          };
        },
      );
    },
    async run(playSessionId, caller, operation, commandRetention) {
      const session = liveSessions.get(playSessionId);
      if (session === undefined) return Result.fail(PLAY_SESSION_UNAVAILABLE);
      const result = session.tail.then(async () => {
        const expired = playSessionIsExpired(session.tenure, now());
        if (expired || !callerAuthorizes(caller, session.tenure)) {
          if (expired) liveSessions.delete(playSessionId);
          return Result.fail(PLAY_SESSION_UNAVAILABLE);
        }
        const value = await operation(session.root);
        const succeeded = commandRetention?.succeeded?.(value) ?? true;
        if (!succeeded) {
          return Result.succeed({
            value,
            tenure: projectPlaySessionTenure(session.tenure),
          });
        }
        session.tenure = {
          ...session.tenure,
          lastActivityAtMs: now(),
        };
        return Result.succeed({
          value,
          tenure: projectPlaySessionTenure(session.tenure),
        });
      });
      session.tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    async save(playSessionId, guestAccessGrant, principalId) {
      const session = liveSessions.get(playSessionId);
      if (session === undefined) return Result.fail(PLAY_SESSION_UNAVAILABLE);
      const result = session.tail.then(() => {
        const expired = playSessionIsExpired(session.tenure, now());
        if (
          expired ||
          !callerAuthorizes({ tag: "guest", guestAccessGrant }, session.tenure)
        ) {
          if (expired) liveSessions.delete(playSessionId);
          return Result.fail(PLAY_SESSION_UNAVAILABLE);
        }
        session.tenure = {
          tag: "saved",
          principalId,
          lastActivityAtMs: now(),
        };
        return Result.succeed(projectPlaySessionTenure(session.tenure));
      });
      session.tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    listSaved(principalId) {
      for (const [playSessionId, session] of liveSessions) {
        if (playSessionIsExpired(session.tenure, now())) {
          liveSessions.delete(playSessionId);
        }
      }
      return Result.succeed(
        Array.from(liveSessions.entries()).flatMap(
          ([playSessionId, session]) =>
            session.tenure.tag === "saved" &&
            session.tenure.principalId === principalId
              ? [
                  {
                    playSessionId,
                    tenure: projectPlaySessionTenure(session.tenure),
                  },
                ]
              : [],
        ),
      );
    },
    async deleteSaved(playSessionId, principalId) {
      const session = liveSessions.get(playSessionId);
      if (session === undefined) return Result.fail(PLAY_SESSION_UNAVAILABLE);
      const result = session.tail.then(() => {
        const expired = playSessionIsExpired(session.tenure, now());
        if (
          liveSessions.get(playSessionId) !== session ||
          session.tenure.tag !== "saved" ||
          expired ||
          session.tenure.principalId !== principalId
        ) {
          if (expired) liveSessions.delete(playSessionId);
          return Result.fail(PLAY_SESSION_UNAVAILABLE);
        }
        liveSessions.delete(playSessionId);
        return Result.succeed({ tag: "playSessionDeleted" } as const);
      });
      session.tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}

function callerAuthorizes(
  caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>,
  tenure: StoredPlaySessionTenure,
): boolean {
  return caller.tag === "guest"
    ? tenure.tag === "guest" &&
        guestAccessGrantMatchesDigest(
          caller.guestAccessGrant,
          tenure.guestAccessGrantDigest,
        )
    : tenure.tag === "saved" && caller.principalId === tenure.principalId;
}

function availablePlaySessionId(
  playSessionIdFactory: PlaySessionIdFactory,
  liveSessions: ReadonlyMap<PlaySessionId, LivePlaySession>,
): Result.Result<PlaySessionId, PlaySessionCreationFailure> {
  for (let attempt = 0; attempt < MAX_PLAY_SESSION_ID_ATTEMPTS; attempt += 1) {
    const playSessionId = playSessionIdFactory();
    if (!liveSessions.has(playSessionId)) return Result.succeed(playSessionId);
  }
  return Result.fail({
    tag: "playSessionCreationFailed",
    reason: "playSessionIdCollision",
    message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
  });
}

export function decodePlaySessionId(
  input: unknown,
): Result.Result<PlaySessionId, string> {
  return Result.mapError(
    Schema.decodeUnknownResult(PlaySessionIdSchema)(input),
    (issue) => issue.message,
  );
}

export function generatedPlaySessionId(): PlaySessionId {
  for (;;) {
    const generated = Schema.decodeUnknownResult(PlaySessionIdSchema)(
      `play-session:${randomUUID()}`,
    );
    if (Result.isSuccess(generated)) return generated.success;
  }
}
