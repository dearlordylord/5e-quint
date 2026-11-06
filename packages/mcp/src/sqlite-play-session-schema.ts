import { DatabaseSync } from "node:sqlite";

import { Result, Schema } from "effect";
import {
  invalidStoredRecordIssue,
  type PlaySessionRepositoryIssue,
} from "./play-session-repository.ts";

export const OWNED_PLAY_SESSION_COLUMNS = [
  "play_session_id",
  "format_version",
  "dice_seed",
  "dice_group_semantic_profile",
  "prng_sequence_profile",
  "state_schema_version",
  "revision",
  "operations_json",
  "tenure_kind",
  "guest_access_grant_digest",
  "principal_id",
  "last_activity_at_ms",
  "continuation_json",
] as const;

export function validatePlaySessionStorageSchema(
  database: DatabaseSync,
): Result.Result<"absent" | "ready", PlaySessionRepositoryIssue> {
  const rows = database.prepare("PRAGMA table_info(play_sessions)").all();
  const decoded = Schema.decodeUnknownResult(
    Schema.Array(Schema.Struct({ name: Schema.String })),
  )(rows);
  if (Result.isFailure(decoded))
    return Result.fail(invalidStoredRecordIssue(decoded.failure.message));
  const columns = decoded.success.map((row) => row.name);
  if (columns.length === 0) return Result.succeed("absent");
  return columns.length === OWNED_PLAY_SESSION_COLUMNS.length &&
    columns.every(
      (column, index) => column === OWNED_PLAY_SESSION_COLUMNS[index],
    )
    ? Result.succeed("ready")
    : Result.fail(
        invalidStoredRecordIssue(
          "Play Session storage requires deployment conversion before serving.",
        ),
      );
}
