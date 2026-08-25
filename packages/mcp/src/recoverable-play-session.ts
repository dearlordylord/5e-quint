import { Either } from "effect";

import {
  disabledAdminMirrorPublication,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import type { McpApplicationServices } from "./composition-root.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionCreation,
  type PlaySessionId,
  type PlaySessionIdFactory,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  DEFAULT_MAX_GUEST_PLAY_SESSIONS,
  DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION,
  DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE,
  currentEpochMilliseconds,
  playSessionIsExpired,
  projectPlaySessionTenure,
  type EpochMilliseconds,
} from "./play-session-access.ts";
import {
  RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
  type PlaySessionRandomSeed,
  type PlaySessionRepository,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import {
  accessFailure,
  admitRequest,
  callerAuthorizes,
  concurrentWriteFailure,
  creationFailure,
  deleteSavedRecord,
  generatedPlaySessionRandomSeed,
  initialTenure,
  publishCurrentProjection,
  rootFromRecord,
  savedTenure,
} from "./recoverable-play-session-support.ts";

export { openSqlitePlaySessionRepository } from "./sqlite-play-session-repository.ts";
export type {
  PlaySessionRepository,
  PlaySessionRepositoryIssue,
} from "./play-session-repository.ts";
export { decodePlaySessionRandomSeed } from "./play-session-repository.ts";

const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;
const MAX_CONCURRENT_COMMIT_ATTEMPTS = 16;

export function createRecoverablePlaySessionRegistry(input: {
  readonly applicationServices: McpApplicationServices;
  readonly repository: PlaySessionRepository;
  readonly playSessionIdFactory: PlaySessionIdFactory;
  readonly randomSeedFactory?: () => PlaySessionRandomSeed;
  readonly now?: () => EpochMilliseconds;
  readonly maximumGuestSessions?: number;
  readonly maximumRetainedCommandsPerSession?: number;
  readonly maximumRequestsPerMinute?: number;
}): PlaySessionRegistry<PlaySessionAccessFailure> {
  const operationTails = new Map<PlaySessionId, Promise<void>>();
  const publications = new Map<PlaySessionId, AdminMirrorPublication>();
  const replayServices: McpApplicationServices = {
    ...input.applicationServices,
    createAdminMirrorPublication: disabledAdminMirrorPublication,
  };
  const now = input.now ?? currentEpochMilliseconds;
  const maximumGuestSessions =
    input.maximumGuestSessions ?? DEFAULT_MAX_GUEST_PLAY_SESSIONS;
  const maximumRetainedCommandsPerSession =
    input.maximumRetainedCommandsPerSession ??
    DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION;
  const maximumRequestsPerMinute =
    input.maximumRequestsPerMinute ?? DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE;

  return {
    create(caller) {
      const creationTime = now();
      const prunedExpired = input.repository.pruneExpired(creationTime);
      if (Either.isLeft(prunedExpired)) {
        return Either.left(creationFailure(prunedExpired.left));
      }
      if (caller.tag === "anonymous") {
        const pruned = input.repository.pruneGuestPressure(
          creationTime,
          maximumGuestSessions - 1,
        );
        if (Either.isLeft(pruned)) {
          return Either.left(creationFailure(pruned.left));
        }
      }
      for (
        let attempt = 0;
        attempt < MAX_PLAY_SESSION_ID_ATTEMPTS;
        attempt += 1
      ) {
        const playSessionId = input.playSessionIdFactory();
        const randomSeed =
          input.randomSeedFactory?.() ?? generatedPlaySessionRandomSeed();
        const creationTenure = initialTenure(caller, creationTime);
        const tenure = creationTenure.tenure;
        const record: RecoverablePlaySessionRecord = {
          playSessionId,
          formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
          randomSeed,
          revision: 0,
          operations: [],
          tenure,
        };
        const created = input.repository.create(record, {
          maximumGuestSessions,
          maximumSavedSessionsPerPrincipal:
            DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
        });
        if (Either.isLeft(created)) {
          return Either.left(creationFailure(created.left));
        }
        if (created.right.tag === "playSessionIdCollision") continue;
        if (created.right.tag === "playSessionLimitExceeded") {
          return Either.left({
            tag: "playSessionCreationFailed",
            reason:
              caller.tag === "anonymous"
                ? "guestCapacityExceeded"
                : "savedSessionQuotaExceeded",
            message: "The Play Session creation limit has been reached.",
          });
        }
        const root = rootFromRecord(replayServices, record);
        if (Either.isLeft(root)) {
          return Either.left(creationFailure(root.left));
        }
        const base = {
          playSessionId,
          projection: root.right.sessionStore.snapshot(),
        };
        const creation: PlaySessionCreation =
          creationTenure.tag === "saved"
            ? {
                ...base,
                tenure: projectPlaySessionTenure(creationTenure.tenure),
                access: { tag: "authenticated" },
              }
            : {
                ...base,
                tenure: projectPlaySessionTenure(creationTenure.tenure),
                access: {
                  tag: "guest",
                  guestAccessGrant: creationTenure.guestAccessGrant,
                },
              };
        return Either.right(creation);
      }
      return Either.left({
        tag: "playSessionCreationFailed",
        reason: "playSessionIdCollision",
        message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
      });
    },
    async run(playSessionId, caller, operation, commandRetention) {
      const prior = operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(async () => {
        let requestRateAdmitted = false;
        for (
          let attempt = 0;
          attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
          attempt += 1
        ) {
          const loaded = input.repository.load(playSessionId);
          if (Either.isLeft(loaded)) {
            return Either.left(accessFailure(loaded.left));
          }
          if (loaded.right.tag === "absent") {
            return Either.left(PLAY_SESSION_UNAVAILABLE);
          }
          if (playSessionIsExpired(loaded.right.record.tenure, now())) {
            const deleted = input.repository.delete(
              playSessionId,
              loaded.right.record.revision,
            );
            if (Either.isLeft(deleted)) {
              return Either.left(accessFailure(deleted.left));
            }
            if (!deleted.right) continue;
            return Either.left(PLAY_SESSION_UNAVAILABLE);
          }
          if (!callerAuthorizes(caller, loaded.right.record.tenure)) {
            return Either.left(PLAY_SESSION_UNAVAILABLE);
          }
          if (!requestRateAdmitted) {
            const admitted = admitRequest(
              input.repository,
              loaded.right.record.tenure,
              now(),
              maximumRequestsPerMinute,
            );
            if (Either.isLeft(admitted)) return Either.left(admitted.left);
            requestRateAdmitted = true;
          }
          const reconstructed = rootFromRecord(
            replayServices,
            loaded.right.record,
          );
          if (Either.isLeft(reconstructed)) {
            return Either.left(accessFailure(reconstructed.left));
          }
          const operationResult = await operation(reconstructed.right);
          const succeeded =
            commandRetention?.succeeded?.(operationResult) ?? true;
          const retainCommand =
            commandRetention?.retain(operationResult) ?? false;
          if (!succeeded) {
            return Either.right({
              value: operationResult,
              tenure: projectPlaySessionTenure(loaded.right.record.tenure),
            });
          }
          if (
            retainCommand &&
            loaded.right.record.operations.length >=
              maximumRetainedCommandsPerSession
          ) {
            return Either.left({
              tag: "playSessionLimitFailure",
              reason: "retainedCommandQuotaExceeded",
              message:
                "This Play Session has reached its retained operation limit.",
            } satisfies PlaySessionAccessFailure);
          }
          const tenure = {
            ...loaded.right.record.tenure,
            lastActivityAtMs: now(),
          };
          const committed = input.repository.commit(loaded.right.record, {
            tenure,
            ...(retainCommand && commandRetention !== undefined
              ? { operation: commandRetention.command }
              : {}),
          });
          if (Either.isLeft(committed)) {
            return Either.left(accessFailure(committed.left));
          }
          if (committed.right.tag === "revisionConflict") continue;
          publishCurrentProjection(
            input.applicationServices,
            publications,
            playSessionId,
            reconstructed.right,
          );
          return Either.right({
            value: operationResult,
            tenure: projectPlaySessionTenure(tenure),
          });
        }
        return Either.left({
          tag: "playSessionStorageFailure",
          reason: "concurrentWriteConflict",
          message:
            "The Play Session changed repeatedly while committing the operation.",
        } satisfies PlaySessionAccessFailure);
      });
      operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
    async save(playSessionId, guestAccessGrant, principalId) {
      const prior = operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(async () => {
        const prunedExpired = input.repository.pruneExpired(now());
        if (Either.isLeft(prunedExpired)) {
          return Either.left(accessFailure(prunedExpired.left));
        }
        const principalTenure = savedTenure(principalId, now());
        const admitted = admitRequest(
          input.repository,
          principalTenure,
          now(),
          maximumRequestsPerMinute,
        );
        if (Either.isLeft(admitted)) return Either.left(admitted.left);
        for (
          let attempt = 0;
          attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
          attempt += 1
        ) {
          const loaded = input.repository.load(playSessionId);
          if (Either.isLeft(loaded)) {
            return Either.left(accessFailure(loaded.left));
          }
          if (
            loaded.right.tag === "absent" ||
            playSessionIsExpired(loaded.right.record.tenure, now()) ||
            !callerAuthorizes(
              { tag: "guest", guestAccessGrant },
              loaded.right.record.tenure,
            )
          ) {
            return Either.left(PLAY_SESSION_UNAVAILABLE);
          }
          const tenure = savedTenure(principalId, now());
          const committed = input.repository.save(
            loaded.right.record,
            tenure,
            DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
          );
          if (Either.isLeft(committed)) {
            return Either.left(accessFailure(committed.left));
          }
          if (committed.right.tag === "savedSessionQuotaExceeded") {
            return Either.left({
              tag: "playSessionLimitFailure",
              reason: "savedSessionQuotaExceeded",
              message: "This account has reached its saved Play Session limit.",
            } satisfies PlaySessionAccessFailure);
          }
          if (committed.right.tag === "revisionConflict") continue;
          return Either.right(projectPlaySessionTenure(tenure));
        }
        return Either.left(concurrentWriteFailure());
      });
      operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
    listSaved(principalId) {
      const admitted = admitRequest(
        input.repository,
        savedTenure(principalId, now()),
        now(),
        maximumRequestsPerMinute,
      );
      if (Either.isLeft(admitted)) return Either.left(admitted.left);
      const prunedExpired = input.repository.pruneExpired(now());
      if (Either.isLeft(prunedExpired)) {
        return Either.left(accessFailure(prunedExpired.left));
      }
      const listed = input.repository.listSaved(principalId);
      if (Either.isLeft(listed)) {
        return Either.left(accessFailure(listed.left));
      }
      return Either.right(
        listed.right.flatMap((record) => {
          if (
            record.tenure.tag !== "saved" ||
            playSessionIsExpired(record.tenure, now())
          ) {
            return [];
          }
          const tenure = projectPlaySessionTenure(record.tenure);
          return tenure.tag === "saved"
            ? [{ playSessionId: record.playSessionId, tenure }]
            : [];
        }),
      );
    },
    async deleteSaved(playSessionId, principalId) {
      const prior = operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() => {
        const admitted = admitRequest(
          input.repository,
          savedTenure(principalId, now()),
          now(),
          maximumRequestsPerMinute,
        );
        if (Either.isLeft(admitted)) return Either.left(admitted.left);
        const prunedExpired = input.repository.pruneExpired(now());
        if (Either.isLeft(prunedExpired)) {
          return Either.left(accessFailure(prunedExpired.left));
        }
        return deleteSavedRecord(input.repository, playSessionId, principalId);
      });
      operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
  };
}
