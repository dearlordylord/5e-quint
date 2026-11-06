import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect, Result, Schema } from "effect";
import { expect, test } from "vitest";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import {
  DICE_RANDOM_SOURCE,
  generatedDiceSeed,
} from "./dice-sampling-service.ts";
import {
  EpochMillisecondsSchema,
  PrincipalIdSchema,
} from "./play-session-access.ts";
import { PlaySessionCommandArchive } from "./play-session-command-archive.ts";
import {
  encodePlaySessionContinuation,
  decodePlaySessionContinuation,
} from "./play-session-continuation-codec.ts";
import {
  RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
  type PlaySessionRepositoryCommit,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import { generatedPlaySessionId, decodePlaySessionId } from "./play-session.ts";
import { openSqlitePlaySessionRepository } from "./sqlite-play-session-repository.ts";

function value<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const tenure = {
  tag: "saved" as const,
  principalId: Schema.decodeUnknownSync(PrincipalIdSchema)(
    "principal:synthetic-storage-boundary",
  ),
  lastActivityAtMs: Schema.decodeUnknownSync(EpochMillisecondsSchema)(1000),
};

test("atomically replaces one canonical snapshot, preserves archive bytes, and resumes the actual random stream", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dnd-continuation-storage-"));
  const path = join(directory, "sessions.sqlite");
  const seed = generatedDiceSeed();
  const root = createMcpPlaySessionRoot(undefined, undefined, seed);
  const archive =
    '[\n {"admissionVersion":2,"name":"source-only-command","operatorMetadata":{"release":"synthetic-source"}} \n]  ';
  const initial: RecoverablePlaySessionRecord = {
    playSessionId: generatedPlaySessionId(),
    formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
    diceReplay: { seed, randomSource: DICE_RANDOM_SOURCE },
    revision: 0,
    operations: value(PlaySessionCommandArchive.parse(archive)),
    tenure,
    continuation: value(encodePlaySessionContinuation(root)),
  };
  const repository = value(openSqlitePlaySessionRepository(path, root));
  const database = new DatabaseSync(path);
  try {
    expect(
      value(
        repository.create(initial, {
          maximumGuestSessions: 10,
          maximumSavedSessionsPerPrincipal: 10,
        }),
      ),
    ).toEqual({ tag: "created" });
    await Effect.runPromise(
      root.diceSampling.sample([{ dice: 2, dieSize: 20 }]),
    );
    const next = value(encodePlaySessionContinuation(root));
    const change: PlaySessionRepositoryCommit = {
      continuation: next,
      tenure,
      operation: {
        name: "roll_dice" as const,
        args: { groups: [{ dice: 2, dieSize: 20 }] },
      },
    };
    expect(value(repository.commit(initial, change))).toEqual({
      tag: "committed",
    });
    expect(value(repository.commit(initial, change))).toEqual({
      tag: "revisionConflict",
    });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM play_sessions").get(),
    ).toEqual({ count: 1 });
    const stored = value(repository.load(initial.playSessionId));
    if (stored.tag !== "found") throw new Error("Expected a retained session.");
    const close = archive.lastIndexOf("]");
    expect(stored.record.operations.json).toBe(
      archive.slice(0, close) +
        "," +
        JSON.stringify(change.operation) +
        archive.slice(close),
    );
    expect(stored.record.operations.length).toBe(2);
    expect(stored.record.continuation).toEqual(next);
    const restored = value(
      decodePlaySessionContinuation(root, seed, stored.record.continuation),
    );
    expect(
      await Effect.runPromise(
        restored.diceSampling.sample([{ dice: 3, dieSize: 6 }]),
      ),
    ).toEqual(
      await Effect.runPromise(
        root.diceSampling.sample([{ dice: 3, dieSize: 6 }]),
      ),
    );
    database
      .prepare(
        "UPDATE play_sessions SET format_version = 4 WHERE play_session_id = ?",
      )
      .run(initial.playSessionId);
    expect(repository.load(initial.playSessionId)).toMatchObject({
      _tag: "Failure",
      failure: { reason: "invalidStoredRecord" },
    });
  } finally {
    database.close();
    repository.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed archives without interpreting command names or admission metadata", () => {
  expect(Result.isFailure(PlaySessionCommandArchive.parse("["))).toBe(true);
  expect(
    Result.isFailure(PlaySessionCommandArchive.parse('{"not":"an array"}')),
  ).toBe(true);
  expect(Result.isFailure(PlaySessionCommandArchive.parse("[null]"))).toBe(
    true,
  );
  expect(
    value(
      PlaySessionCommandArchive.parse(
        '[{"admissionVersion":999,"name":"unknown-source-operation","args":{}}]',
      ),
    ).length,
  ).toBe(1);
});

test("validates every stored continuation before open without changing unready storage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dnd-storage-readiness-"));
  const path = join(directory, "sessions.sqlite");
  const seed = generatedDiceSeed();
  const root = createMcpPlaySessionRoot(undefined, undefined, seed);
  const continuation = value(encodePlaySessionContinuation(root));
  const repository = value(openSqlitePlaySessionRepository(path, root));
  try {
    let last = generatedPlaySessionId();
    for (let index = 1; index <= 101; index++) {
      last = value(
        decodePlaySessionId(
          `play-session:00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        ),
      );
      const record: RecoverablePlaySessionRecord = {
        playSessionId: last,
        formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
        diceReplay: { seed, randomSource: DICE_RANDOM_SOURCE },
        revision: 0,
        operations: PlaySessionCommandArchive.empty(),
        tenure,
        continuation,
      };
      expect(
        value(
          repository.create(record, {
            maximumGuestSessions: 200,
            maximumSavedSessionsPerPrincipal: 200,
          }),
        ),
      ).toEqual({ tag: "created" });
    }
    repository.close();
    const database = new DatabaseSync(path);
    database.exec("PRAGMA journal_mode = DELETE");
    database
      .prepare(
        "UPDATE play_sessions SET continuation_json = ? WHERE play_session_id = ?",
      )
      .run('{"root":0,"nodes":[]}', last);
    database.close();
    expect(openSqlitePlaySessionRepository(path, root)).toMatchObject({
      _tag: "Failure",
      failure: { reason: "invalidStoredRecord" },
    });
    const inspected = new DatabaseSync(path, { readOnly: true });
    expect(
      inspected.prepare("SELECT COUNT(*) AS count FROM play_sessions").get(),
    ).toEqual({ count: 101 });
    expect(inspected.prepare("PRAGMA journal_mode").get()).toEqual({
      journal_mode: "delete",
    });
    expect(
      inspected
        .prepare(
          "SELECT continuation_json FROM play_sessions WHERE play_session_id = ?",
        )
        .get(last),
    ).toEqual({ continuation_json: '{"root":0,"nodes":[]}' });
    inspected.close();
    const repair = new DatabaseSync(path);
    repair
      .prepare(
        "UPDATE play_sessions SET continuation_json = ? WHERE play_session_id = ?",
      )
      .run(JSON.stringify(continuation), last);
    repair
      .prepare(
        "UPDATE play_sessions SET play_session_id = '' WHERE play_session_id = ?",
      )
      .run(last);
    repair.close();
    expect(openSqlitePlaySessionRepository(path, root)).toMatchObject({
      _tag: "Failure",
      failure: { reason: "invalidStoredRecord" },
    });
  } finally {
    repository.close();
    await rm(directory, { recursive: true, force: true });
  }
});
