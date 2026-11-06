import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { convertPlaySessionDatabase } from "../../../operations/public-mcp/migrations/convert.mjs";

const hash = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
function rows(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    return database
      .prepare("SELECT * FROM play_sessions ORDER BY play_session_id")
      .all();
  } finally {
    database.close();
  }
}
function rates(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    return database
      .prepare(
        "SELECT * FROM play_session_request_limits ORDER BY access_key_digest",
      )
      .all();
  } finally {
    database.close();
  }
}
async function copyDatabase(source, target) {
  assert(!existsSync(target), "A fixture backup must not overwrite evidence.");
  const database = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(database, target);
  } finally {
    database.close();
  }
}
async function fixture(directory, release) {
  const manifest = json(join(directory, "fixture.json"));
  assert.equal(manifest.release, release);
  const bundle = join(directory, "mcp-fixture.mjs");
  assert.equal(hash(bundle), manifest.bundleSha256);
  const module = await import(pathToFileURL(bundle).href);
  assert.equal(typeof module.createPendingDamageFixture, "function");
  assert.equal(typeof module.continuePendingDamageFixture, "function");
  return { manifest, module };
}

export async function verifyPlaySessionMigration({
  sourceFixture,
  targetFixture,
  preparedKit,
  outputDirectory,
}) {
  assert(!existsSync(outputDirectory), "Qualification output must be absent.");
  const prepared = json(join(preparedKit, "prepared.json"));
  assert.match(prepared.sourceRelease, /^[0-9a-f]{40}$/u);
  assert.match(prepared.targetRelease, /^[0-9a-f]{40}$/u);
  const source = await fixture(sourceFixture, prepared.sourceRelease);
  const target = await fixture(targetFixture, prepared.targetRelease);
  assert.equal(source.manifest.entrySha256, target.manifest.entrySha256);
  mkdirSync(outputDirectory, { mode: 0o700 });
  const databasePath = join(outputDirectory, "play-sessions.sqlite");
  const controlPath = join(outputDirectory, "source-control.sqlite");
  const rejectedPath = join(outputDirectory, "rejected.sqlite");
  const created = await source.module.createPendingDamageFixture(databasePath);
  assert.equal(created.sessions.length, 2);
  assert.equal(
    new Set(created.sessions.map((session) => session.playSessionId)).size,
    2,
  );
  const before = rows(databasePath);
  const rateBefore = rates(databasePath);
  assert(
    rateBefore.length > 0 && rateBefore.some((row) => row.request_count > 0),
    "Original MCP calls must create concrete request counters.",
  );
  assert.equal(before.length, 2);
  assert(before.every((row) => row.format_version === 4));
  await copyDatabase(databasePath, controlPath);
  await copyDatabase(databasePath, rejectedPath);
  const control = [];
  for (const session of created.sessions)
    control.push(
      await source.module.continuePendingDamageFixture(controlPath, session),
    );
  const conversionOptions = {
    databasePath,
    backupPath: join(outputDirectory, "conversion-backup.sqlite"),
    reportPath: join(outputDirectory, "conversion-report.jsonl"),
    kitDirectory: preparedKit,
    sourceRelease: prepared.sourceRelease,
    targetRelease: prepared.targetRelease,
  };
  const mismatch = await convertPlaySessionDatabase({
    ...conversionOptions,
    sourceRelease: "0".repeat(40),
  });
  assert.equal(mismatch.tag, "refused");
  assert.deepEqual(rows(databasePath), before);
  assert(!existsSync(conversionOptions.backupPath));
  assert(!existsSync(conversionOptions.reportPath));
  const converted = await convertPlaySessionDatabase(conversionOptions);
  assert.equal(converted.tag, "converted", JSON.stringify(converted));
  const after = rows(databasePath);
  assert.equal(after.length, 2);
  assert.equal(converted.converted, 2);
  assert.deepEqual(rows(conversionOptions.backupPath), before);
  assert.deepEqual(rates(databasePath), rateBefore);
  for (let index = 0; index < before.length; index++) {
    const { continuation_json, ...metadata } = after[index];
    assert.deepEqual(metadata, { ...before[index], format_version: 5 });
    assert.equal(typeof continuation_json, "string");
    assert(continuation_json.length > 0);
  }
  for (let index = 0; index < created.sessions.length; index++) {
    const actual = await target.module.continuePendingDamageFixture(
      databasePath,
      created.sessions[index],
    );
    assert.deepEqual(actual, control[index]);
    const archived = rows(databasePath).find(
      (row) => row.play_session_id === created.sessions[index].playSessionId,
    );
    const original = before.find(
      (row) => row.play_session_id === archived.play_session_id,
    );
    assert(original);
    assert(
      archived.operations_json.startsWith(
        original.operations_json.slice(
          0,
          original.operations_json.lastIndexOf("]"),
        ),
      ),
    );
  }
  const rejected = new DatabaseSync(rejectedPath);
  try {
    const sourceRow = before[0];
    const names = Object.keys(sourceRow);
    const values = names.map((name) =>
      name === "play_session_id"
        ? "play-session:ffffffff-ffff-4fff-8fff-ffffffffffff"
        : name === "format_version"
          ? 99
          : sourceRow[name],
    );
    rejected
      .prepare(
        `INSERT INTO play_sessions (${names.map((name) => '"' + name.replaceAll('"', '""') + '"').join(",")}) VALUES (${names.map(() => "?").join(",")})`,
      )
      .run(...values);
  } finally {
    rejected.close();
  }
  const rejectedBefore = rows(rejectedPath);
  const failed = await convertPlaySessionDatabase({
    ...conversionOptions,
    databasePath: rejectedPath,
    backupPath: join(outputDirectory, "rejected-backup.sqlite"),
    reportPath: join(outputDirectory, "rejected-report.jsonl"),
  });
  assert.equal(failed.tag, "investigationRequired", JSON.stringify(failed));
  assert.equal(failed.failures, 1);
  assert(converted.measurements.snapshotBytes > 0);
  assert.equal(
    failed.measurements.snapshotBytes,
    converted.measurements.snapshotBytes,
  );
  assert.deepEqual(rows(rejectedPath), rejectedBefore);
  assert.deepEqual(rates(rejectedPath), rateBefore);
  assert.deepEqual(
    rows(join(outputDirectory, "rejected-backup.sqlite")),
    rejectedBefore,
  );
  const inspection = new DatabaseSync(rejectedPath, { readOnly: true });
  try {
    assert(
      !inspection
        .prepare("PRAGMA table_info(play_sessions)")
        .all()
        .some((column) => column.name === "continuation_json"),
    );
  } finally {
    inspection.close();
  }
  const summary = {
    sourceRelease: prepared.sourceRelease,
    targetRelease: prepared.targetRelease,
    sessions: 2,
    originalMcpStopped: true,
    actualConverter: true,
    allRowsConverted: true,
    originalControlNextRollsAndDamageMatch: true,
    historicalBytesPreserved: true,
    nonSessionRequestCountersPreserved: true,
    corruptLaterRowRolledBackEarlierRowsAndSchema: true,
    snapshotBytes: after.reduce(
      (sum, row) => sum + Buffer.byteLength(row.continuation_json),
      0,
    ),
    historyBytes: before.reduce(
      (sum, row) => sum + Buffer.byteLength(row.operations_json),
      0,
    ),
    conversion: converted,
    rollback: failed,
    fixtureBundleBytes: {
      source: statSync(join(sourceFixture, "mcp-fixture.mjs")).size,
      target: statSync(join(targetFixture, "mcp-fixture.mjs")).size,
    },
  };
  writeFileSync(
    join(outputDirectory, "qualification.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return summary;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { values } = parseArgs({
    options: {
      "source-fixture": { type: "string" },
      "target-fixture": { type: "string" },
      "prepared-kit": { type: "string" },
      "output-directory": { type: "string" },
    },
  });
  for (const name of [
    "source-fixture",
    "target-fixture",
    "prepared-kit",
    "output-directory",
  ])
    assert(values[name], `Missing --${name}.`);
  await verifyPlaySessionMigration({
    sourceFixture: resolve(values["source-fixture"]),
    targetFixture: resolve(values["target-fixture"]),
    preparedKit: resolve(values["prepared-kit"]),
    outputDirectory: resolve(values["output-directory"]),
  });
}
