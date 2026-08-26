import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import { pruneExpiredAuthorizationState } from "./capacity.ts";

describe("saved-session authorization expiry pruning", () => {
  test("compares the ISO instants persisted by Better Auth", () => {
    const database = new DatabaseSync(":memory:");
    const now = new Date("2026-08-26T12:00:00.000Z");
    const expired = "2026-08-26T11:59:59.000Z";
    const future = "2026-08-26T12:00:01.000Z";
    try {
      database.exec(`
        CREATE TABLE "oauthAccessToken" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TEXT NOT NULL,
          "revoked" TEXT
        );
        CREATE TABLE "oauthRefreshToken" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TEXT NOT NULL,
          "revoked" TEXT,
          "rotationReplayExpiresAt" TEXT
        );
        CREATE TABLE "session" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TEXT NOT NULL
        );
        CREATE TABLE "verification" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TEXT NOT NULL
        );
        CREATE TABLE "oauthClientAssertion" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TEXT NOT NULL
        );
      `);
      insertExpiryPair(database, "session", expired, future);
      insertExpiryPair(database, "verification", expired, future);
      insertExpiryPair(database, "oauthClientAssertion", expired, future);
      database
        .prepare(
          `INSERT INTO "oauthAccessToken" ("id", "expiresAt", "revoked")
           VALUES (?, ?, ?)`,
        )
        .run("expired", expired, null);
      database
        .prepare(
          `INSERT INTO "oauthAccessToken" ("id", "expiresAt", "revoked")
           VALUES (?, ?, ?)`,
        )
        .run("future", future, null);
      database
        .prepare(
          `INSERT INTO "oauthAccessToken" ("id", "expiresAt", "revoked")
           VALUES (?, ?, ?)`,
        )
        .run("revoked", future, now.toISOString());
      insertRefreshToken(database, "expired", expired, null, null);
      insertRefreshToken(database, "replay-expired", future, expired, expired);
      insertRefreshToken(database, "future", future, null, null);
      insertRefreshToken(database, "replay-active", future, expired, future);

      pruneExpiredAuthorizationState(database, now);

      expect(ids(database, "oauthAccessToken")).toEqual(["future"]);
      expect(ids(database, "oauthRefreshToken")).toEqual([
        "future",
        "replay-active",
      ]);
      for (const table of ["session", "verification", "oauthClientAssertion"]) {
        expect(ids(database, table), table).toEqual(["future"]);
      }
    } finally {
      database.close();
    }
  });
});

function insertExpiryPair(
  database: DatabaseSync,
  table: string,
  expired: string,
  future: string,
): void {
  const insert = database.prepare(
    `INSERT INTO "${table}" ("id", "expiresAt") VALUES (?, ?)`,
  );
  insert.run("expired", expired);
  insert.run("future", future);
}

function insertRefreshToken(
  database: DatabaseSync,
  id: string,
  expiresAt: string,
  revoked: string | null,
  rotationReplayExpiresAt: string | null,
): void {
  database
    .prepare(
      `INSERT INTO "oauthRefreshToken"
       ("id", "expiresAt", "revoked", "rotationReplayExpiresAt")
       VALUES (?, ?, ?, ?)`,
    )
    .run(id, expiresAt, revoked, rotationReplayExpiresAt);
}

function ids(database: DatabaseSync, table: string): readonly string[] {
  return database
    .prepare(`SELECT "id" FROM "${table}" ORDER BY "id"`)
    .all()
    .map((row) => String(row.id));
}
