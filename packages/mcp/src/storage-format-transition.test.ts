import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import {
  DICE_RANDOM_SOURCE,
  generatedDiceSeed,
} from "./dice-sampling-service.ts";
import {
  EpochMillisecondsSchema,
  GuestAccessGrantDigestSchema,
  PrincipalIdSchema,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";
import { PLAY_SESSION_COMMAND_ADMISSION_VERSION } from "./play-session-command.ts";
import {
  RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
  type RecoverablePlaySessionRecord,
  type PlaySessionRepository,
} from "./play-session-repository.ts";
import { generatedPlaySessionId } from "./play-session.ts";
import { openSqlitePlaySessionRepository } from "./sqlite-play-session-repository.ts";

const now = Schema.decodeUnknownSync(EpochMillisecondsSchema)(1_000);
const principalId = Schema.decodeUnknownSync(PrincipalIdSchema)(
  "principal:format-transition",
);
const saved = { tag: "saved", principalId, lastActivityAtMs: now } as const;
const guest = {
  tag: "guest",
  guestAccessGrantDigest: Schema.decodeUnknownSync(
    GuestAccessGrantDigestSchema,
  )("a".repeat(64)),
  lastActivityAtMs: now,
} as const;
function record(tenure: StoredPlaySessionTenure): RecoverablePlaySessionRecord {
  return {
    playSessionId: generatedPlaySessionId(),
    formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
    diceReplay: { seed: generatedDiceSeed(), randomSource: DICE_RANDOM_SOURCE },
    revision: 0,
    operations: [
      {
        admissionVersion: 2,
        name: "roll_dice",
        args: { groups: [{ dice: 1, dieSize: 20 }] },
      },
    ],
    tenure,
  };
}
async function databaseCase(
  run: (repository: PlaySessionRepository, database: DatabaseSync) => void,
) {
  const directory = await mkdtemp(join(tmpdir(), "dnd-format-transition-"));
  const path = join(directory, "sessions.sqlite");
  const opened = openSqlitePlaySessionRepository(path);
  if (Result.isFailure(opened)) throw new Error(opened.failure.message);
  const database = new DatabaseSync(path);
  try {
    run(opened.success, database);
  } finally {
    database.close();
    opened.success.close();
    await rm(directory, { recursive: true, force: true });
  }
}
function row(database: DatabaseSync, id: string) {
  return database
    .prepare(
      "SELECT format_version, operations_json, dice_seed, principal_id FROM play_sessions WHERE play_session_id = ?",
    )
    .get(id);
}

test("new writes advertise a storage format that blocks rollback to format three", async () => {
  await databaseCase((repository, database) => {
    const initial = record(saved);
    expect(
      repository.create(initial, {
        maximumGuestSessions: 10,
        maximumSavedSessionsPerPrincipal: 10,
      }),
    ).toMatchObject({ success: { tag: "created" } });
    expect(row(database, initial.playSessionId)?.format_version).toBe(4);
    expect(RECOVERABLE_PLAY_SESSION_FORMAT_VERSION).not.toBe(3);
  });
});

test("reads format three and atomically promotes its next committed history", async () => {
  await databaseCase((repository, database) => {
    const initial = record(saved);
    repository.create(initial, {
      maximumGuestSessions: 10,
      maximumSavedSessionsPerPrincipal: 10,
    });
    database
      .prepare(
        "UPDATE play_sessions SET format_version = 3 WHERE play_session_id = ?",
      )
      .run(initial.playSessionId);
    const loaded = repository.load(initial.playSessionId);
    if (Result.isFailure(loaded) || loaded.success.tag !== "found")
      throw new Error("Expected historical record.");
    expect(loaded.success.record).toEqual({ ...initial, formatVersion: 4 });
    expect(row(database, initial.playSessionId)?.format_version).toBe(3);
    const operation = {
      admissionVersion: PLAY_SESSION_COMMAND_ADMISSION_VERSION,
      name: "roll_dice",
      args: { groups: [{ dice: 1, dieSize: 6 }] },
    } as const;
    expect(
      repository.commit(loaded.success.record, { tenure: saved, operation }),
    ).toMatchObject({ success: { tag: "committed" } });
    expect(row(database, initial.playSessionId)).toMatchObject({
      format_version: 4,
      dice_seed: initial.diceReplay.seed.join(""),
      principal_id: principalId,
    });
    expect(
      JSON.parse(String(row(database, initial.playSessionId)?.operations_json)),
    ).toEqual([...initial.operations, operation]);
  });
});

test("saving a format-three guest promotes the normalized history with tenure", async () => {
  await databaseCase((repository, database) => {
    const initial = record(guest);
    repository.create(initial, {
      maximumGuestSessions: 10,
      maximumSavedSessionsPerPrincipal: 10,
    });
    const oldHistory = [
      {
        admissionVersion: 2,
        toolSurface: "chatgpt",
        name: "provide_battle_input",
        args: {
          fill: {
            kind: "savingThrowOutcome",
            holeId: "synthetic-sphere-save",
            value: {
              area: {
                kind: "pointOriginSphereSaveDamageArea",
                originAnchorId: "synthetic-center",
                affectedTargetIds: [],
                objectIgnitionFacts: [],
              },
              outcomes: [],
            },
          },
        },
      },
    ];
    database
      .prepare(
        "UPDATE play_sessions SET format_version = 3, operations_json = ? WHERE play_session_id = ?",
      )
      .run(JSON.stringify(oldHistory), initial.playSessionId);
    const loaded = repository.load(initial.playSessionId);
    if (Result.isFailure(loaded) || loaded.success.tag !== "found")
      throw new Error("Expected historical guest.");
    expect(repository.save(loaded.success.record, saved, 10)).toMatchObject({
      success: { tag: "saved" },
    });
    expect(row(database, initial.playSessionId)).toMatchObject({
      format_version: 4,
      principal_id: principalId,
    });
    const persisted = String(
      row(database, initial.playSessionId)?.operations_json,
    );
    expect(persisted).not.toContain("originAnchorId");
    expect(JSON.parse(persisted)).toMatchObject([
      {
        args: {
          fill: {
            value: {
              area: {
                originAnchor: {
                  kind: "combatant",
                  combatantId: "synthetic-center",
                },
              },
            },
          },
        },
      },
    ]);
    expect(row(database, initial.playSessionId)?.dice_seed).toBe(
      initial.diceReplay.seed.join(""),
    );
  });
});

test("rejects unsupported formats and format-three rows containing new command admission", async () => {
  await databaseCase((repository, database) => {
    const initial = record(saved);
    repository.create(initial, {
      maximumGuestSessions: 10,
      maximumSavedSessionsPerPrincipal: 10,
    });
    database
      .prepare(
        "UPDATE play_sessions SET format_version = 5 WHERE play_session_id = ?",
      )
      .run(initial.playSessionId);
    expect(repository.load(initial.playSessionId)).toMatchObject({
      failure: { reason: "invalidStoredRecord" },
    });
    database
      .prepare(
        "UPDATE play_sessions SET format_version = 3, operations_json = ? WHERE play_session_id = ?",
      )
      .run(
        JSON.stringify([
          {
            ...initial.operations[0],
            admissionVersion: PLAY_SESSION_COMMAND_ADMISSION_VERSION,
          },
        ]),
        initial.playSessionId,
      );
    expect(repository.load(initial.playSessionId)).toMatchObject({
      failure: { reason: "invalidStoredRecord" },
    });
  });
});
