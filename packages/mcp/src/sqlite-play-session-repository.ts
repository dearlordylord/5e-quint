import { DatabaseSync } from "node:sqlite";

import { Either } from "effect";

import { decodePlaySessionId } from "./play-session.ts";
import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";
import {
  closedRepositoryIssue,
  decodeStoredPlaySessionRecord,
  invalidStoredRecordIssue,
  unreadableRepositoryIssue,
  type PlaySessionRepository,
  type PlaySessionRepositoryIssue,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import { runRateAdmission, runSave } from "./sqlite-play-session-actions.ts";
import { preparePlaySessionSchema } from "./sqlite-play-session-schema.ts";

export function openSqlitePlaySessionRepository(
  databasePath: string,
): Either.Either<PlaySessionRepository, PlaySessionRepositoryIssue> {
  try {
    return Either.right(createSqlitePlaySessionRepository(databasePath));
  } catch (cause) {
    return Either.left(unreadableRepositoryIssue(cause));
  }
}

function createSqlitePlaySessionRepository(
  databasePath: string,
): PlaySessionRepository {
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA busy_timeout = 5000");
  preparePlaySessionSchema(database);
  database.exec(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      play_session_id TEXT PRIMARY KEY,
      format_version INTEGER NOT NULL,
      dice_seed TEXT NOT NULL,
      dice_group_semantic_profile TEXT NOT NULL,
      prng_sequence_profile TEXT NOT NULL,
      state_schema_version INTEGER NOT NULL,
      revision INTEGER NOT NULL,
      operations_json TEXT NOT NULL,
      tenure_kind TEXT NOT NULL CHECK (tenure_kind IN ('guest', 'saved')),
      guest_access_grant_digest TEXT,
      principal_id TEXT,
      last_activity_at_ms INTEGER NOT NULL,
      CHECK (
        (tenure_kind = 'guest' AND guest_access_grant_digest IS NOT NULL AND principal_id IS NULL)
        OR
        (tenure_kind = 'saved' AND guest_access_grant_digest IS NULL AND principal_id IS NOT NULL)
      )
    ) STRICT
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS play_session_request_limits (
      access_key_digest TEXT PRIMARY KEY,
      window_started_at_ms INTEGER NOT NULL,
      request_count INTEGER NOT NULL CHECK (request_count > 0)
    ) STRICT
  `);
  const insert = database.prepare(`
    INSERT OR IGNORE INTO play_sessions (
      play_session_id,
      format_version,
      dice_seed,
      dice_group_semantic_profile,
      prng_sequence_profile,
      state_schema_version,
      revision,
      operations_json,
      tenure_kind,
      guest_access_grant_digest,
      principal_id,
      last_activity_at_ms
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE (
      ? = 'guest' AND (
        SELECT COUNT(*) FROM play_sessions WHERE tenure_kind = 'guest'
      ) < ?
    ) OR (
      ? = 'saved' AND (
        SELECT COUNT(*) FROM play_sessions
        WHERE tenure_kind = 'saved' AND principal_id = ?
      ) < ?
    )
  `);
  const select = database.prepare(`
    SELECT format_version, dice_seed, dice_group_semantic_profile,
      prng_sequence_profile, state_schema_version, revision, operations_json,
      tenure_kind, guest_access_grant_digest, principal_id, last_activity_at_ms
    FROM play_sessions
    WHERE play_session_id = ?
  `);
  const commit = database.prepare(`
    UPDATE play_sessions
    SET revision = revision + 1,
      operations_json = ?,
      tenure_kind = ?,
      guest_access_grant_digest = ?,
      principal_id = ?,
      last_activity_at_ms = ?
    WHERE play_session_id = ? AND revision = ?
  `);
  const save = database.prepare(`
    UPDATE play_sessions
    SET revision = revision + 1,
      tenure_kind = 'saved',
      guest_access_grant_digest = NULL,
      principal_id = ?,
      last_activity_at_ms = ?
    WHERE play_session_id = ? AND revision = ? AND tenure_kind = 'guest'
      AND (
        SELECT COUNT(*) FROM play_sessions
        WHERE tenure_kind = 'saved' AND principal_id = ?
      ) < ?
  `);
  const listSaved = database.prepare(`
    SELECT play_session_id, format_version, dice_seed,
      dice_group_semantic_profile, prng_sequence_profile, state_schema_version, revision,
      operations_json, tenure_kind, guest_access_grant_digest, principal_id,
      last_activity_at_ms
    FROM play_sessions
    WHERE tenure_kind = 'saved' AND principal_id = ?
    ORDER BY last_activity_at_ms DESC, play_session_id ASC
  `);
  const deleteRevision = database.prepare(`
    DELETE FROM play_sessions WHERE play_session_id = ? AND revision = ?
  `);
  const guestCount = database.prepare(`
    SELECT COUNT(*) AS count FROM play_sessions WHERE tenure_kind = 'guest'
  `);
  const pruneGuest = database.prepare(`
    DELETE FROM play_sessions WHERE play_session_id IN (
      SELECT play_session_id FROM play_sessions
      WHERE tenure_kind = 'guest' AND last_activity_at_ms <= ?
      ORDER BY last_activity_at_ms ASC, play_session_id ASC
      LIMIT ?
    )
  `);
  const pruneExpired = database.prepare(`
    DELETE FROM play_sessions
    WHERE (
      tenure_kind = 'guest' AND last_activity_at_ms <= ?
    ) OR (
      tenure_kind = 'saved' AND last_activity_at_ms <= ?
    )
  `);
  const selectRateLimit = database.prepare(`
    SELECT window_started_at_ms, request_count
    FROM play_session_request_limits
    WHERE access_key_digest = ?
  `);
  const insertRateLimit = database.prepare(`
    INSERT INTO play_session_request_limits (
      access_key_digest, window_started_at_ms, request_count
    ) VALUES (?, ?, 1)
  `);
  const updateRateLimit = database.prepare(`
    UPDATE play_session_request_limits
    SET window_started_at_ms = ?, request_count = ?
    WHERE access_key_digest = ?
  `);
  const pruneRateLimits = database.prepare(`
    DELETE FROM play_session_request_limits WHERE window_started_at_ms <= ?
  `);
  let closed = false;

  return {
    create(record, limits) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const result = insert.run(
          record.playSessionId,
          record.formatVersion,
          record.diceReplay.seed.join(""),
          record.diceReplay.randomSource.diceGroupSemanticProfile,
          record.diceReplay.randomSource.prngSequenceProfile,
          record.diceReplay.randomSource.stateSchemaVersion,
          record.revision,
          JSON.stringify(record.operations),
          record.tenure.tag,
          record.tenure.tag === "guest"
            ? record.tenure.guestAccessGrantDigest
            : null,
          record.tenure.tag === "saved" ? record.tenure.principalId : null,
          record.tenure.lastActivityAtMs,
          record.tenure.tag,
          limits.maximumGuestSessions,
          record.tenure.tag,
          record.tenure.tag === "saved" ? record.tenure.principalId : null,
          limits.maximumSavedSessionsPerPrincipal,
        );
        if (result.changes === 1) return Either.right({ tag: "created" });
        return Either.right(
          select.get(record.playSessionId) === undefined
            ? { tag: "playSessionLimitExceeded" }
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
        const decoded = decodeStoredPlaySessionRecord(row, playSessionId);
        return Either.map(decoded, (record) => ({ tag: "found", record }));
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    commit(record, change) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const result = commit.run(
          JSON.stringify(
            change.operation === undefined
              ? record.operations
              : [...record.operations, change.operation],
          ),
          change.tenure.tag,
          change.tenure.tag === "guest"
            ? change.tenure.guestAccessGrantDigest
            : null,
          change.tenure.tag === "saved" ? change.tenure.principalId : null,
          change.tenure.lastActivityAtMs,
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
    save(record, tenure, maximumSavedSessionsPerPrincipal) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        return runSave({
          save,
          select,
          listSaved,
          record,
          tenure,
          maximumSavedSessionsPerPrincipal,
        });
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    listSaved(principalId) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const records: RecoverablePlaySessionRecord[] = [];
        const issues: string[] = [];
        for (const row of listSaved.all(principalId)) {
          const decodedId = decodePlaySessionId(row.play_session_id);
          if (Either.isLeft(decodedId)) {
            issues.push(decodedId.left);
            continue;
          }
          const decoded = decodeStoredPlaySessionRecord(row, decodedId.right);
          if (Either.isLeft(decoded)) {
            issues.push(decoded.left.message);
            continue;
          }
          records.push(decoded.right);
        }
        if (issues.length > 0) {
          return Either.left(invalidStoredRecordIssue(issues.join("\n")));
        }
        return Either.right(records);
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    delete(playSessionId, revision) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        return Either.right(
          deleteRevision.run(playSessionId, revision).changes === 1,
        );
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    pruneGuestPressure(nowMs, maximumGuestSessions) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        const row = guestCount.get();
        const count =
          row !== undefined && typeof row.count === "number" ? row.count : 0;
        const excess = count - maximumGuestSessions;
        if (excess > 0) {
          pruneGuest.run(nowMs - GUEST_PRESSURE_PROTECTION_MS, excess);
        }
        return Either.right(undefined);
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    pruneExpired(nowMs) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        pruneExpired.run(
          nowMs - GUEST_INACTIVITY_RETENTION_MS,
          nowMs - SAVED_INACTIVITY_RETENTION_MS,
        );
        return Either.right(undefined);
      } catch (cause) {
        return Either.left(unreadableRepositoryIssue(cause));
      }
    },
    admitRequest(accessKeyDigest, nowMs, maximumRequestsPerWindow) {
      if (closed) return Either.left(closedRepositoryIssue());
      try {
        database.exec("BEGIN IMMEDIATE");
        return runRateAdmission({
          database,
          statements: {
            select: selectRateLimit,
            insert: insertRateLimit,
            update: updateRateLimit,
            prune: pruneRateLimits,
          },
          accessKeyDigest,
          nowMs,
          maximumRequestsPerWindow,
        });
      } catch (cause) {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have committed or failed to begin.
        }
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
