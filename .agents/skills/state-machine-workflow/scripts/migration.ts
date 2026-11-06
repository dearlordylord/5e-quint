import { DatabaseSync, backup } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, linkSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import assert from "node:assert/strict";
import { z } from "zod";
import { Definition, Facts, Instance, Operation, Receipt } from "./schema.ts";
import { validateDefinition } from "./machine.ts";
import { TaskMachineStore, digest } from "./store.ts";

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const MigrationPlan = z.strictObject({
  sourceRuntime: Hash,
  sourceDefinitionHash: Hash,
  sourceRevision: z.number().int().nonnegative(),
  reason: z.string().trim().min(1),
});
export type MigrationPlan = z.infer<typeof MigrationPlan>;
const DefinitionRow = z.object({ hash: Hash, document: z.string(), runtime: Hash });
const Envelope = z.strictObject({ engine: z.literal("xstate@5.33.3"), runtime: Hash, definition: Definition });

function readSource(db: DatabaseSync, id: string) {
  const instance = Instance.parse(db.prepare("SELECT * FROM instances WHERE id=?").get(id));
  Facts.parse(JSON.parse(instance.facts));
  const row = DefinitionRow.parse(db.prepare("SELECT * FROM definitions WHERE hash=?").get(instance.definition_hash));
  if (digest(row.document) !== row.hash) throw new Error("Source definition integrity mismatch");
  const envelope = Envelope.parse(JSON.parse(row.document));
  if (envelope.runtime !== row.runtime) throw new Error("Source runtime binding mismatch");
  validateDefinition(envelope.definition);
  if (!Object.hasOwn(envelope.definition.states, instance.state)) throw new Error("Source state is absent from its definition");
  const operations = Operation.array().parse(db.prepare("SELECT * FROM operations WHERE instance_id=? ORDER BY rowid").all(id));
  for (const operation of operations) {
    z.json().parse(JSON.parse(operation.request));
    if (operation.status === "unknown") {
      if (operation.receipt !== null) throw new Error("Unknown source operation cannot carry a resolved receipt");
    } else {
      if (operation.receipt === null) throw new Error("Resolved source operation has no receipt");
      Receipt.parse(JSON.parse(operation.receipt));
    }
  }
  return { instance, row, definition: envelope.definition, operations };
}

function targetDefinition(source: ReturnType<typeof readSource>) {
  const scratch = new TaskMachineStore(":memory:", true);
  try {
    const instance = scratch.init(source.instance.id, source.instance.objective, source.definition);
    const row = DefinitionRow.parse(scratch.db.prepare("SELECT * FROM definitions WHERE hash=?").get(instance.definition_hash));
    assert.deepEqual(Envelope.parse(JSON.parse(row.document)).definition, source.definition);
    return row;
  } finally { scratch.close(); }
}

/** Read identities for a migration plan; this is not a semantic-compatibility verdict. */
export function describeMigration(sourcePath: string, instance: string) {
  const db = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    db.exec("BEGIN");
    const source = readSource(db, instance);
    const target = targetDefinition(source);
    db.exec("COMMIT");
    return { instance, state: source.instance.state, stopped: source.instance.stopped === 1,
      sourceRuntime: source.row.runtime, sourceDefinitionHash: source.row.hash, sourceRevision: source.instance.revision,
      targetRuntime: target.runtime, targetDefinitionHash: target.hash,
      unresolvedOperations: source.operations.filter(operation => operation.status === "unknown").map(operation => operation.id),
    };
  } finally { db.close(); }
}

/** Rebind an explicitly reviewed, unchanged machine to this runtime in a new store. */
export async function migrateStore(options: { source: string; destination: string; instance: string; plan: unknown }) {
  const plan = MigrationPlan.parse(options.plan);
  const sourcePath = resolve(options.source);
  const destination = resolve(options.destination);
  if (sourcePath === destination || existsSync(destination)) throw new Error("Migration destination must be a new file");
  if (!existsSync(sourcePath)) throw new Error("Source store does not exist");
  const sourceDb = new DatabaseSync(sourcePath);
  let temporary: string | undefined;
  try {
    sourceDb.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
    const source = readSource(sourceDb, options.instance);
    if (source.instance.stopped !== 1) throw new Error("Stop the source instance before migration");
    if (source.row.runtime !== plan.sourceRuntime || source.row.hash !== plan.sourceDefinitionHash || source.instance.revision !== plan.sourceRevision) throw new Error("Migration source does not match the reviewed plan");
    if (source.instance.revision === Number.MAX_SAFE_INTEGER) throw new Error("Source revision is exhausted");
    const target = targetDefinition(source);
    if (target.runtime === source.row.runtime) throw new Error("Source runtime is already compatible");
    mkdirSync(dirname(destination), { recursive: true });
    temporary = mkdtempSync(join(dirname(destination), ".migration-"));
    const copiedPath = join(temporary, "state.sqlite");
    // A separate reader permits backup while the source connection excludes writers.
    const reader = new DatabaseSync(sourcePath, { readOnly: true });
    try { await backup(reader, copiedPath); } finally { reader.close(); }
    const copied = new DatabaseSync(copiedPath);
    try {
      copied.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; BEGIN IMMEDIATE");
      assert.deepEqual(readSource(copied, options.instance), source, "Copied source differs from the reviewed snapshot");
      if (copied.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Source has broken references");
      copied.prepare("INSERT OR IGNORE INTO definitions (hash,document,runtime) VALUES (?,?,?)").run(target.hash, target.document, target.runtime);
      copied.prepare("UPDATE instances SET definition_hash=?,revision=revision+1 WHERE id=? AND revision=?").run(target.hash, options.instance, source.instance.revision);
      copied.exec("CREATE TABLE IF NOT EXISTS runtime_migrations (id TEXT PRIMARY KEY, instance_id TEXT NOT NULL REFERENCES instances(id), source_runtime TEXT NOT NULL, target_runtime TEXT NOT NULL, source_definition_hash TEXT NOT NULL, target_definition_hash TEXT NOT NULL, source_revision INTEGER NOT NULL, target_revision INTEGER NOT NULL, reason TEXT NOT NULL)");
      copied.prepare("INSERT INTO runtime_migrations VALUES (?,?,?,?,?,?,?,?,?)").run(randomUUID(), options.instance, source.row.runtime, target.runtime, source.row.hash, target.hash, source.instance.revision, source.instance.revision + 1, plan.reason);
      const after = readSource(copied, options.instance);
      assert.deepEqual(after.instance, { ...source.instance, definition_hash: target.hash, revision: source.instance.revision + 1 });
      assert.deepEqual(after.definition, source.definition);
      assert.deepEqual(after.operations, source.operations);
      copied.exec("COMMIT");
    } finally { copied.close(); }
    const validated = new TaskMachineStore(copiedPath);
    try {
      const value = validated.inspect(options.instance);
      if (!value.runtimeCompatible) throw new Error("Migrated runtime is incompatible");
    } finally { validated.close(); }
    assert.deepEqual(readSource(sourceDb, options.instance), source, "Source changed during migration");
    // Hard-link publication refuses an existing destination without a replacement window.
    linkSync(copiedPath, destination);
    sourceDb.exec("COMMIT");
    return { source: sourcePath, destination, instance: options.instance, sourceRevision: source.instance.revision,
      revision: source.instance.revision + 1, sourceDefinitionHash: source.row.hash, definitionHash: target.hash,
      state: source.instance.state, stopped: true, unresolvedOperations: source.operations.filter(operation => operation.status === "unknown").map(operation => operation.id),
    };
  } finally {
    sourceDb.close();
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}
