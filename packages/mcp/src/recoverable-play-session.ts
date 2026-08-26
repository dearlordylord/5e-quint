import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  type PlaySessionAccessFailure,
  type PlaySessionCommandRetention,
  type PlaySessionId,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  accessFailure,
  admitRequest,
  deleteSavedRecord,
  savedTenure,
} from "./recoverable-play-session-support.ts";
import { createRecoverableSession } from "./recoverable-play-session-creation.ts";
import { runRecoverableOperation } from "./recoverable-play-session-operation.ts";
import { saveRecoverableSession } from "./recoverable-play-session-saving.ts";
import {
  runtimeFrom,
  type RecoverableRegistryInput,
  type RunAttemptContext,
} from "./recoverable-play-session-runtime.ts";
import {
  playSessionIsExpired,
  projectPlaySessionTenure,
  type PlaySessionCaller,
} from "./play-session-access.ts";

export { openSqlitePlaySessionRepository } from "./sqlite-play-session-repository.ts";
export type {
  PlaySessionRepository,
  PlaySessionRepositoryIssue,
} from "./play-session-repository.ts";
export { decodePlaySessionRandomSeed } from "./play-session-repository.ts";

export function createRecoverablePlaySessionRegistry(
  input: RecoverableRegistryInput,
): PlaySessionRegistry<PlaySessionAccessFailure> {
  const runtime = runtimeFrom(input);

  return {
    create(caller) {
      return createRecoverableSession(runtime, caller);
    },
    async run<A>(
      playSessionId: PlaySessionId,
      caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>,
      operation: (root: McpPlaySessionRoot) => A | Promise<A>,
      commandRetention?: PlaySessionCommandRetention<A>,
    ) {
      const context: RunAttemptContext<A> = {
        runtime,
        playSessionId,
        caller,
        operation,
        ...(commandRetention === undefined ? {} : { commandRetention }),
        requestRateAdmitted: false,
      };
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() => runRecoverableOperation(context));
      runtime.operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
    async save(playSessionId, guestAccessGrant, principalId) {
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() =>
        saveRecoverableSession(
          runtime,
          playSessionId,
          guestAccessGrant,
          principalId,
        ),
      );
      runtime.operationTails.set(
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
        runtime.input.repository,
        savedTenure(principalId, runtime.now()),
        runtime.now(),
        runtime.maximumRequestsPerMinute,
      );
      if (Either.isLeft(admitted)) return Either.left(admitted.left);
      const prunedExpired = runtime.input.repository.pruneExpired(
        runtime.now(),
      );
      if (Either.isLeft(prunedExpired)) {
        return Either.left(accessFailure(prunedExpired.left));
      }
      const listed = runtime.input.repository.listSaved(principalId);
      if (Either.isLeft(listed)) {
        return Either.left(accessFailure(listed.left));
      }
      return Either.right(
        listed.right.flatMap((record) => {
          if (
            record.tenure.tag !== "saved" ||
            playSessionIsExpired(record.tenure, runtime.now())
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
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() => {
        const admitted = admitRequest(
          runtime.input.repository,
          savedTenure(principalId, runtime.now()),
          runtime.now(),
          runtime.maximumRequestsPerMinute,
        );
        if (Either.isLeft(admitted)) return Either.left(admitted.left);
        const prunedExpired = runtime.input.repository.pruneExpired(
          runtime.now(),
        );
        if (Either.isLeft(prunedExpired)) {
          return Either.left(accessFailure(prunedExpired.left));
        }
        return deleteSavedRecord(
          runtime.input.repository,
          playSessionId,
          principalId,
        );
      });
      runtime.operationTails.set(
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
