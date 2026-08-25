import { DatabaseSync } from "node:sqlite";

import { Schema } from "effect";

const UNOWNED_PLAY_SESSION_COLUMNS = [
  "play_session_id",
  "format_version",
  "random_seed",
  "revision",
  "operations_json",
] as const;

const OWNED_PLAY_SESSION_COLUMNS = [
  ...UNOWNED_PLAY_SESSION_COLUMNS,
  "tenure_kind",
  "guest_access_grant_digest",
  "principal_id",
  "last_activity_at_ms",
] as const;

export function retireUnownedPlaySessionSchema(database: DatabaseSync): void {
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
  if (!columnsEqual(columns, UNOWNED_PLAY_SESSION_COLUMNS)) {
    throw new Error("The Play Session database schema is not supported.");
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(`
      ALTER TABLE play_sessions
      RENAME TO retired_unowned_play_sessions_v1
    `);
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
