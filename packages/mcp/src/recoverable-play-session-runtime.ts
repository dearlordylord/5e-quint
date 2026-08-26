import { Either } from "effect";

import {
  disabledAdminMirrorPublication,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import type {
  McpApplicationServices,
  McpPlaySessionRoot,
} from "./composition-root.ts";
import {
  DEFAULT_MAX_GUEST_PLAY_SESSIONS,
  DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION,
  DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE,
  currentEpochMilliseconds,
  type EpochMilliseconds,
  type GuestAccessGrantFactory,
  type PlaySessionCaller,
  type PlaySessionTenureProjection,
} from "./play-session-access.ts";
import {
  type PlaySessionAccessFailure,
  type PlaySessionCommandRetention,
  type PlaySessionCreation,
  type PlaySessionCreationFailure,
  type PlaySessionId,
  type PlaySessionIdFactory,
  type PlaySessionRunResult,
} from "./play-session.ts";
import type {
  PlaySessionRandomSeed,
  PlaySessionRepository,
  RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";

export const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;
export const MAX_CONCURRENT_COMMIT_ATTEMPTS = 16;

export type RecoverableRegistryInput = {
  readonly applicationServices: McpApplicationServices;
  readonly repository: PlaySessionRepository;
  readonly playSessionIdFactory: PlaySessionIdFactory;
  readonly guestAccessGrantFactory?: GuestAccessGrantFactory;
  readonly randomSeedFactory?: () => PlaySessionRandomSeed;
  readonly now?: () => EpochMilliseconds;
  readonly maximumGuestSessions?: number;
  readonly maximumRetainedCommandsPerSession?: number;
  readonly maximumRequestsPerMinute?: number;
};

export type RecoverableRegistryRuntime = {
  readonly input: RecoverableRegistryInput;
  readonly replayServices: McpApplicationServices;
  readonly now: () => EpochMilliseconds;
  readonly maximumGuestSessions: number;
  readonly maximumRetainedCommandsPerSession: number;
  readonly maximumRequestsPerMinute: number;
  readonly operationTails: Map<PlaySessionId, Promise<void>>;
  readonly publications: Map<PlaySessionId, AdminMirrorPublication>;
};

export type CreationAttempt =
  | { readonly tag: "collision" }
  | { readonly tag: "failure"; readonly failure: PlaySessionCreationFailure }
  | { readonly tag: "created"; readonly creation: PlaySessionCreation };

export type RunLoadAttempt =
  | { readonly tag: "retry" }
  | { readonly tag: "failure"; readonly failure: PlaySessionAccessFailure }
  | {
      readonly tag: "ready";
      readonly record: RecoverablePlaySessionRecord;
    };

export type RunAttemptContext<A> = {
  readonly runtime: RecoverableRegistryRuntime;
  readonly playSessionId: PlaySessionId;
  readonly caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>;
  readonly operation: (root: McpPlaySessionRoot) => A | Promise<A>;
  readonly commandRetention?: PlaySessionCommandRetention<A>;
  requestRateAdmitted: boolean;
};

export type RunAttemptResult<A> =
  | { readonly tag: "retry" }
  | {
      readonly tag: "result";
      readonly result: Either.Either<
        PlaySessionRunResult<A>,
        PlaySessionAccessFailure
      >;
    };

export type SaveAttemptResult =
  | { readonly tag: "retry" }
  | {
      readonly tag: "result";
      readonly result: Either.Either<
        PlaySessionTenureProjection,
        PlaySessionAccessFailure
      >;
    };

export function runtimeFrom(
  input: RecoverableRegistryInput,
): RecoverableRegistryRuntime {
  return {
    input,
    replayServices: {
      ...input.applicationServices,
      createAdminMirrorPublication: disabledAdminMirrorPublication,
    },
    now: input.now ?? currentEpochMilliseconds,
    maximumGuestSessions:
      input.maximumGuestSessions ?? DEFAULT_MAX_GUEST_PLAY_SESSIONS,
    maximumRetainedCommandsPerSession:
      input.maximumRetainedCommandsPerSession ??
      DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION,
    maximumRequestsPerMinute:
      input.maximumRequestsPerMinute ??
      DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE,
    operationTails: new Map(),
    publications: new Map(),
  };
}
