import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { Either, Random, Schema } from "effect";

import {
  disabledAdminMirrorPublication,
  publishAdminProjectionBestEffort,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import {
  createMcpPlaySessionRoot,
  type McpApplicationServices,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
import { BATTLE_TOOL_NAMES } from "./battle-tool-input.ts";
import { CHARACTER_TOOL_NAMES } from "./character-tool-input.ts";
import { DICE_TOOL_NAMES } from "./dice-tool-input.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionCommand,
  type PlaySessionCreation,
  type PlaySessionCreationFailure,
  type PlaySessionId,
  type PlaySessionIdFactory,
  type PlaySessionRegistry,
} from "./play-session.ts";
import { handleToolCall } from "./server.ts";

const RECOVERABLE_PLAY_SESSION_FORMAT_VERSION = 1 as const;
const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;
const MAX_CONCURRENT_COMMIT_ATTEMPTS = 16;

const RecoverableOperationNameSchema = Schema.Literal(
  ...CHARACTER_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
  ...DICE_TOOL_NAMES,
);
const RecoverablePlaySessionOperationSchema = Schema.Struct({
  name: RecoverableOperationNameSchema,
  args: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
const RecoverablePlaySessionOperationsSchema = Schema.Array(
  RecoverablePlaySessionOperationSchema,
);
const RandomSeedSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{64}$/u),
  Schema.brand("PlaySessionRandomSeed"),
);
const StoredPlaySessionRowSchema = Schema.Struct({
  format_version: Schema.Literal(RECOVERABLE_PLAY_SESSION_FORMAT_VERSION),
  random_seed: RandomSeedSchema,
  revision: Schema.NonNegativeInt,
  operations_json: Schema.String,
});

export type PlaySessionRandomSeed = typeof RandomSeedSchema.Type;
type RecoverablePlaySessionRecord = {
  readonly playSessionId: PlaySessionId;
  readonly formatVersion: typeof RECOVERABLE_PLAY_SESSION_FORMAT_VERSION;
  readonly randomSeed: PlaySessionRandomSeed;
  readonly revision: number;
  readonly operations: readonly PlaySessionCommand[];
};

export type PlaySessionRepositoryIssue = {
  readonly tag: "playSessionRepositoryIssue";
  readonly reason: "unreadable" | "invalidStoredRecord" | "closed";
  readonly message: string;
};
type PlaySessionRepositoryCreateResult =
  | { readonly tag: "created" }
  | { readonly tag: "playSessionIdCollision" };
type PlaySessionRepositoryLoadResult =
  | { readonly tag: "found"; readonly record: RecoverablePlaySessionRecord }
  | { readonly tag: "absent" };
type PlaySessionRepositoryAppendResult =
  | { readonly tag: "committed" }
  | { readonly tag: "revisionConflict" };

export type PlaySessionRepository = {
  create(
    record: RecoverablePlaySessionRecord,
  ): Either.Either<
    PlaySessionRepositoryCreateResult,
    PlaySessionRepositoryIssue
  >;
  load(
    playSessionId: PlaySessionId,
  ): Either.Either<PlaySessionRepositoryLoadResult, PlaySessionRepositoryIssue>;
  append(
    record: RecoverablePlaySessionRecord,
    operation: PlaySessionCommand,
  ): Either.Either<
    PlaySessionRepositoryAppendResult,
    PlaySessionRepositoryIssue
  >;
  close(): void;
};

export function openSqlitePlaySessionRepository(
  databasePath: string,
): Either.Either<PlaySessionRepository, PlaySessionRepositoryIssue> {
  try {
    return Either.right(createSqlitePlaySessionRepository(databasePath));
  } catch (cause) {
    return Either.left(unreadableRepositoryIssue(cause));
  }
}

export const decodePlaySessionRandomSeed =
  Schema.decodeUnknownEither(RandomSeedSchema);

function createSqlitePlaySessionRepository(
  databasePath: string,
): PlaySessionRepository {
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      play_session_id TEXT PRIMARY KEY,
      format_version INTEGER NOT NULL,
      random_seed TEXT NOT NULL,
      revision INTEGER NOT NULL,
      operations_json TEXT NOT NULL
    ) STRICT
  `);
  const insert = database.prepare(`
    INSERT OR IGNORE INTO play_sessions (
      play_session_id,
      format_version,
      random_seed,
      revision,
      operations_json
    ) VALUES (?, ?, ?, ?, ?)
  `);
  const select = database.prepare(`
    SELECT format_version, random_seed, revision, operations_json
    FROM play_sessions
    WHERE play_session_id = ?
  `);
  const append = database.prepare(`
    UPDATE play_sessions
    SET revision = revision + 1, operations_json = ?
    WHERE play_session_id = ? AND revision = ?
  `);
  let closed = false;

  return {
    create(record) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const result = insert.run(
          record.playSessionId,
          record.formatVersion,
          record.randomSeed,
          record.revision,
          JSON.stringify(record.operations),
        );
        return Either.right(
          result.changes === 1
            ? { tag: "created" }
            : { tag: "playSessionIdCollision" },
        );
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    load(playSessionId) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const row = select.get(playSessionId);
        if (row === undefined) return Either.right({ tag: "absent" });
        const decodedRow = Schema.decodeUnknownEither(
          StoredPlaySessionRowSchema,
        )(row);
        if (Either.isLeft(decodedRow)) {
          return Either.left({
            tag: "playSessionRepositoryIssue",
            reason: "invalidStoredRecord",
            message: decodedRow.left.message,
          });
        }
        const parsedOperations: unknown = JSON.parse(
          decodedRow.right.operations_json,
        );
        const decodedOperations = Schema.decodeUnknownEither(
          RecoverablePlaySessionOperationsSchema,
        )(parsedOperations);
        if (Either.isLeft(decodedOperations)) {
          return Either.left({
            tag: "playSessionRepositoryIssue",
            reason: "invalidStoredRecord",
            message: decodedOperations.left.message,
          });
        }
        return Either.right({
          tag: "found",
          record: {
            playSessionId,
            formatVersion: decodedRow.right.format_version,
            randomSeed: decodedRow.right.random_seed,
            revision: decodedRow.right.revision,
            operations: decodedOperations.right,
          },
        });
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    append(record, operation) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const result = append.run(
          JSON.stringify([...record.operations, operation]),
          record.playSessionId,
          record.revision,
        );
        return Either.right(
          result.changes === 1
            ? { tag: "committed" }
            : { tag: "revisionConflict" },
        );
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    close() {
      if (closed) return;
      closed = true;
      database.close();
    },
  };
}

export function createRecoverablePlaySessionRegistry(input: {
  readonly applicationServices: McpApplicationServices;
  readonly repository: PlaySessionRepository;
  readonly playSessionIdFactory: PlaySessionIdFactory;
  readonly randomSeedFactory?: () => PlaySessionRandomSeed;
}): PlaySessionRegistry<PlaySessionAccessFailure> {
  const operationTails = new Map<PlaySessionId, Promise<void>>();
  const publications = new Map<PlaySessionId, AdminMirrorPublication>();
  const replayServices: McpApplicationServices = {
    ...input.applicationServices,
    createAdminMirrorPublication: disabledAdminMirrorPublication,
  };

  return {
    create() {
      for (
        let attempt = 0;
        attempt < MAX_PLAY_SESSION_ID_ATTEMPTS;
        attempt += 1
      ) {
        const playSessionId = input.playSessionIdFactory();
        const randomSeed =
          input.randomSeedFactory?.() ?? generatedPlaySessionRandomSeed();
        const record: RecoverablePlaySessionRecord = {
          playSessionId,
          formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
          randomSeed,
          revision: 0,
          operations: [],
        };
        const created = input.repository.create(record);
        if (Either.isLeft(created)) {
          return Either.left(creationFailure(created.left));
        }
        if (created.right.tag === "playSessionIdCollision") continue;
        const root = rootFromRecord(replayServices, record);
        if (Either.isLeft(root)) {
          return Either.left(creationFailure(root.left));
        }
        return Either.right({
          playSessionId,
          projection: root.right.sessionStore.snapshot(),
        } satisfies PlaySessionCreation);
      }
      return Either.left({
        tag: "playSessionCreationFailed",
        reason: "playSessionIdCollision",
        message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
      });
    },
    async run(playSessionId, operation, commandRetention) {
      const prior = operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(async () => {
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
          const reconstructed = rootFromRecord(
            replayServices,
            loaded.right.record,
          );
          if (Either.isLeft(reconstructed)) {
            return Either.left(accessFailure(reconstructed.left));
          }
          const operationResult = await operation(reconstructed.right);
          if (
            commandRetention === undefined ||
            !commandRetention.retain(operationResult)
          ) {
            return Either.right(operationResult);
          }
          const committed = input.repository.append(
            loaded.right.record,
            commandRetention.command,
          );
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
          return Either.right(operationResult);
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
  };
}

function rootFromRecord(
  applicationServices: McpApplicationServices,
  record: RecoverablePlaySessionRecord,
): Either.Either<McpPlaySessionRoot, PlaySessionRepositoryIssue> {
  const root = createMcpPlaySessionRoot(
    applicationServices,
    adminMirrorSessionId(record.playSessionId),
    Random.make(record.randomSeed),
  );
  for (const operation of record.operations) {
    const replayed = handleToolCall(root, operation.name, operation.args);
    if ("isError" in replayed && replayed.isError === true) {
      return Either.left({
        tag: "playSessionRepositoryIssue",
        reason: "invalidStoredRecord",
        message: `Stored Play Session operation ${operation.name} no longer reconstructs successfully.`,
      });
    }
  }
  return Either.right(root);
}

function publishCurrentProjection(
  applicationServices: McpApplicationServices,
  publications: Map<PlaySessionId, AdminMirrorPublication>,
  playSessionId: PlaySessionId,
  root: McpPlaySessionRoot,
): void {
  const publication =
    publications.get(playSessionId) ??
    applicationServices.createAdminMirrorPublication(
      adminMirrorSessionId(playSessionId),
    );
  publications.set(playSessionId, publication);
  publishAdminProjectionBestEffort({
    ...root,
    adminMirrorPublication: publication,
  });
}

function generatedPlaySessionRandomSeed(): PlaySessionRandomSeed {
  const decoded = decodePlaySessionRandomSeed(randomBytes(32).toString("hex"));
  if (Either.isLeft(decoded)) {
    throw new Error("Generated Play Session random seed was invalid.");
  }
  return decoded.right;
}

function creationFailure(
  issue: PlaySessionRepositoryIssue,
): PlaySessionCreationFailure {
  return {
    tag: "playSessionCreationFailed",
    reason: "storageUnavailable",
    message: issue.message,
  };
}

function accessFailure(
  issue: PlaySessionRepositoryIssue,
): PlaySessionAccessFailure {
  return {
    tag: "playSessionStorageFailure",
    reason: issue.reason,
    message: issue.message,
  };
}

function closedRepositoryIssue(): PlaySessionRepositoryIssue {
  return {
    tag: "playSessionRepositoryIssue",
    reason: "closed",
    message: "The Play Session repository is closed.",
  };
}

function unreadableRepositoryIssue(cause: unknown): PlaySessionRepositoryIssue {
  return {
    tag: "playSessionRepositoryIssue",
    reason: "unreadable",
    message: cause instanceof Error ? cause.message : String(cause),
  };
}
