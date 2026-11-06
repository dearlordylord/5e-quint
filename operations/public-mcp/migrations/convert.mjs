import { DatabaseSync, backup } from "node:sqlite";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  statSync,
  writeSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const bytes = (path) => (existsSync(path) ? statSync(path).size : 0);
const footprint = (path) =>
  Object.fromEntries(
    ["", "-wal", "-shm", "-journal"].map((suffix) => [
      suffix || "main",
      bytes(path + suffix),
    ]),
  );

/** Offline operation. The adapter must have drained and stopped ALL writers. */
async function convertDatabase({
  databasePath,
  backupPath,
  reportPath,
  kitDirectory,
  sourceRelease,
  targetRelease,
}) {
  let database;
  let report;
  let reserved = false;
  const measurements = { before: footprint(databasePath) };
  const observeTransactionFootprint = () => {
    const observed = footprint(databasePath);
    measurements.inTransactionObservedMax = Object.fromEntries(
      Object.entries(observed).map(([name, size]) => [
        name,
        Math.max(measurements.inTransactionObservedMax?.[name] ?? 0, size),
      ]),
    );
  };
  try {
    const kit = resolve(kitDirectory);
    const manifest = JSON.parse(
      readFileSync(resolve(kit, "prepared.json"), "utf8"),
    );
    if (
      manifest.sourceRelease !== sourceRelease ||
      manifest.targetRelease !== targetRelease ||
      manifest.targetFormat !== 5
    ) {
      return {
        tag: "refused",
        message:
          "Prepared kit does not match the explicit source and target releases.",
      };
    }
    for (const name of ["source-exporter.mjs", "target-validator.mjs"]) {
      if (sha256(resolve(kit, name)) !== manifest.bundles[name])
        return {
          tag: "refused",
          message: `Prepared bundle hash mismatch: ${name}`,
        };
    }
    if (!existsSync(databasePath))
      return { tag: "refused", message: "Source database is absent." };
    if (existsSync(backupPath) || existsSync(reportPath))
      return {
        tag: "refused",
        message: "Backup and private report paths must both be absent.",
      };
    if (
      process.env.DND_ADMIN_MIRROR_URL !== undefined ||
      process.env.DND_ADMIN_MIRROR_SESSION_ID !== undefined
    ) {
      return {
        tag: "refused",
        message: "Admin publication must be disabled in the offline process.",
      };
    }
    report = openSync(reportPath, "wx", 0o600);
    // Reserve the destination exclusively; SQLite's backup must never overwrite evidence.
    const backupReservation = openSync(backupPath, "wx", 0o600);
    closeSync(backupReservation);
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA busy_timeout = 0; BEGIN IMMEDIATE");
    reserved = true;
    const source = new DatabaseSync(databasePath, { readOnly: true });
    try {
      await backup(source, backupPath);
    } finally {
      source.close();
    }
    const snapshot = new DatabaseSync(backupPath, { readOnly: true });
    let failures = 0;
    let converted = 0;
    let snapshotBytes = 0;
    let historyBytes = 0;
    try {
      const columns = snapshot
        .prepare("PRAGMA table_info(play_sessions)")
        .all();
      if (columns.some((column) => column.name === "continuation_json"))
        throw new Error(
          "Source already contains continuation_json; investigate the actual source release.",
        );
      const exporter = await import(
        pathToFileURL(resolve(kit, "source-exporter.mjs")).href
      );
      const validator = await import(
        pathToFileURL(resolve(kit, "target-validator.mjs")).href
      );
      database.exec(
        "ALTER TABLE play_sessions ADD COLUMN continuation_json TEXT NOT NULL DEFAULT ''",
      );
      const update = database.prepare(
        "UPDATE play_sessions SET continuation_json = ?, format_version = 5 WHERE play_session_id = ?",
      );
      const page = snapshot.prepare(
        "SELECT * FROM play_sessions WHERE play_session_id > ? ORDER BY play_session_id LIMIT 16",
      );
      const firstPage = snapshot.prepare(
        "SELECT * FROM play_sessions ORDER BY play_session_id LIMIT 16",
      );
      let cursor;
      while (true) {
        const rows = cursor === undefined ? firstPage.all() : page.all(cursor);
        if (rows.length === 0) break;
        for (const row of rows) {
          cursor = row.play_session_id;
          historyBytes += Buffer.byteLength(row.operations_json);
          try {
            const materialized = exporter.materializeStoredRow(
              row,
              row.play_session_id,
            );
            if (materialized.tag !== "materialized")
              throw new Error(materialized.message);
            const continuation = JSON.stringify(materialized.graph);
            const validated = validator.validateConvertedRow(
              { ...row, format_version: 5, continuation_json: continuation },
              row.play_session_id,
            );
            if (validated.tag !== "validated")
              throw new Error(validated.message);
            update.run(continuation, row.play_session_id);
            snapshotBytes += Buffer.byteLength(continuation);
            converted += 1;
          } catch (cause) {
            failures += 1;
            // One bounded private record per failure; never copy history or snapshots into the report.
            writeSync(
              report,
              JSON.stringify({
                playSessionId: String(row.play_session_id).slice(0, 256),
                issue: String(cause).slice(0, 2048),
              }) + "\n",
            );
          } finally {
            observeTransactionFootprint();
          }
        }
      }
    } finally {
      snapshot.close();
    }
    observeTransactionFootprint();
    if (failures !== 0) {
      database.exec("ROLLBACK");
      reserved = false;
      return {
        tag: "investigationRequired",
        failures,
        converted: 0,
        measurements: {
          ...measurements,
          after: footprint(databasePath),
          backup: footprint(backupPath),
          reportBytes: bytes(reportPath),
          snapshotBytes,
          historyBytes,
        },
      };
    }
    database.exec("COMMIT");
    reserved = false;
    return {
      tag: "converted",
      converted,
      measurements: {
        ...measurements,
        after: footprint(databasePath),
        backup: footprint(backupPath),
        reportBytes: bytes(reportPath),
        snapshotBytes,
        historyBytes,
        bundleBytes: Object.fromEntries(
          Object.keys(manifest.bundles).map((name) => [
            name,
            bytes(resolve(kit, name)),
          ]),
        ),
      },
    };
  } catch (cause) {
    if (reserved) {
      try {
        observeTransactionFootprint();
      } finally {
        database.exec("ROLLBACK");
      }
    }
    const message = String(cause).slice(0, 2048);
    if (report !== undefined)
      writeSync(report, JSON.stringify({ issue: message }) + "\n");
    return {
      tag: "refused",
      message,
      measurements: {
        ...measurements,
        after: footprint(databasePath),
        backup: footprint(backupPath),
        reportBytes: bytes(reportPath),
      },
    };
  } finally {
    database?.close();
    if (report !== undefined) closeSync(report);
  }
}

export async function convertPlaySessionDatabase(options) {
  const result = await convertDatabase(options);
  return {
    ...result,
    measurements: {
      ...result.measurements,
      afterClose: footprint(options.databasePath),
      backup: footprint(options.backupPath),
      reportBytes: bytes(options.reportPath),
    },
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [
    databasePath,
    backupPath,
    reportPath,
    kitDirectory,
    sourceRelease,
    targetRelease,
  ] = process.argv.slice(2);
  if (!targetRelease || process.argv.length !== 8) {
    console.error(
      "usage: node convert.mjs DATABASE ABSENT_BACKUP ABSENT_REPORT PREPARED_KIT SOURCE_RELEASE TARGET_RELEASE",
    );
    process.exitCode = 64;
  } else {
    const result = await convertPlaySessionDatabase({
      databasePath,
      backupPath,
      reportPath,
      kitDirectory,
      sourceRelease,
      targetRelease,
    });
    console.log(JSON.stringify(result));
    if (result.tag !== "converted") process.exitCode = 1;
  }
}
