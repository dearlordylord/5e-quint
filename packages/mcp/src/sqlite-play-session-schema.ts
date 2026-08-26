import { DatabaseSync } from "node:sqlite";

import { Match, Schema } from "effect";

const RETIRED_UNOWNED_PLAY_SESSION_COLUMNS = [
  "play_session_id",
  "format_version",
  "random_seed",
  "revision",
  "operations_json",
] as const;

const RETIRED_EFFECT_RANDOM_PLAY_SESSION_COLUMNS = [
  ...RETIRED_UNOWNED_PLAY_SESSION_COLUMNS,
  "tenure_kind",
  "guest_access_grant_digest",
  "principal_id",
  "last_activity_at_ms",
] as const;

const OWNED_PLAY_SESSION_COLUMNS = [
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
] as const;

export function preparePlaySessionSchema(database: DatabaseSync): void {
  const rows = database.prepare("PRAGMA table_info(play_sessions)").all();
  const decoded = Schema.decodeUnknownSync(
    Schema.Array(Schema.Struct({ name: Schema.String })),
  )(rows);
  const columns = decoded.map((row) => row.name);
  if (
    columns.length === 0 ||
    columnsEqual(columns, OWNED_PLAY_SESSION_COLUMNS)
  ) {
    return;
  }
  const retiredTableName = columnsEqual(
    columns,
    RETIRED_UNOWNED_PLAY_SESSION_COLUMNS,
  )
    ? "retired_unowned_play_sessions_v1"
    : columnsEqual(columns, RETIRED_EFFECT_RANDOM_PLAY_SESSION_COLUMNS)
      ? "retired_effect_random_play_sessions_v2"
      : null;
  if (retiredTableName === null) {
    throw new Error("The Play Session database schema is not supported.");
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    Match.value(retiredTableName).pipe(
      Match.when("retired_unowned_play_sessions_v1", () =>
        database.exec(
          "ALTER TABLE play_sessions RENAME TO retired_unowned_play_sessions_v1",
        ),
      ),
      Match.when("retired_effect_random_play_sessions_v2", () =>
        database.exec(
          "ALTER TABLE play_sessions RENAME TO retired_effect_random_play_sessions_v2",
        ),
      ),
      Match.exhaustive,
    );
    database.exec("COMMIT");
  } catch (cause) {
    database.exec("ROLLBACK");
    throw cause;
  }
}

function columnsEqual(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((column, index) => column === expected[index])
  );
}
