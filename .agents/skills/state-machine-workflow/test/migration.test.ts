import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { Definition, Facts, Instance, Operation } from "../scripts/schema.ts";
import { TaskMachineStore } from "../scripts/store.ts";
import { migrateStore } from "../scripts/migration.ts";

mkdirSync(resolve(".local"), { recursive: true });
const root = mkdtempSync(resolve(".local/task-machine-migration-"));
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const definition = {
  id: "migration-fixture", version: "1", initial: "waiting",
  facts: { workload: "workload-1", build: "build-1", attempt: "attempt-1" },
  states: {
    waiting: { on: { CHECK: { target: "checked", requires: { workload: { fact: "workload" }, verdict: "pass" } } } },
    checked: { on: { ACCEPT: { target: "done", requires: { workload: { fact: "workload" }, verdict: "pass" } } } },
    done: { final: true },
  },
} satisfies Definition;
const Inspection = z.object({ ...Instance.shape, facts: Facts, operations: Operation.array(), definition: Definition, runtimeCompatible: z.boolean(), blocked: z.boolean() });

function rows(path: string) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    return {
      instances: database.prepare("SELECT * FROM instances ORDER BY id").all(),
      definitions: database.prepare("SELECT * FROM definitions ORDER BY hash").all(),
      operations: database.prepare("SELECT * FROM operations ORDER BY instance_id,id").all(),
    };
  } finally { database.close(); }
}

function fixture(name: string) {
  const directory = join(root, name);
  const runtime = join(directory, "runtime");
  mkdirSync(runtime, { recursive: true });
  for (const file of ["schema.ts", "machine.ts", "store.ts", "cli.ts"]) copyFileSync(resolve("scripts", file), join(runtime, file));
  const schema = join(runtime, "schema.ts");
  writeFileSync(schema, readFileSync(schema, "utf8") + "\n// Alternative source fingerprint, identical definition semantics.\n");
  const source = join(directory, "source.sqlite");
  const destination = join(directory, "destination.sqlite");
  let index = 0;
  const json = (value: unknown) => {
    const path = join(directory, `input-${index++}.json`);
    writeFileSync(path, JSON.stringify(value));
    return path;
  };
  const command = (...args: string[]) => {
    const child = spawnSync(process.execPath, ["--import", "tsx", join(runtime, "cli.ts"), source, ...args], { encoding: "utf8" });
    assert.ifError(child.error);
    assert.equal(child.status, 0, `${name}: ${child.stderr}`);
    return Inspection.parse(JSON.parse(child.stdout));
  };
  command("init", json(definition), "selected", "Preserve the selected objective");
  command("init", json(definition), "sibling", "Preserve the unselected objective");
  command("send", "selected", "0", json({ type: "CHECK", facts: { workload: "workload-1", verdict: "pass", evidence: "fixture-evidence" } }));
  command("reserve", "selected", "1", "resolved-operation", json({ kind: "local-fixture", payload: [1, "two"] }));
  const artifact = join(directory, "receipt.txt");
  writeFileSync(artifact, "Local fixture receipt; no provider call occurred.\n");
  command("resolve", "selected", "2", "resolved-operation", json({ outcome: "not-sent", providerReference: "local-fixture", artifact, sha256: sha256(readFileSync(artifact)) }));
  command("reserve", "selected", "3", "unknown-operation", json({ kind: "unresolved-fixture", id: "preserve-me" }));
  const before = command("stop", "selected", "4");
  const database = new DatabaseSync(source, { readOnly: true });
  const stored = z.object({ runtime: z.string() }).parse(database.prepare("SELECT runtime FROM definitions WHERE hash=?").get(before.definition_hash));
  database.close();
  const plan = { sourceRuntime: stored.runtime, sourceDefinitionHash: before.definition_hash, sourceRevision: before.revision, reason: "Rebind unchanged control semantics to the installed public runtime" };
  return { directory, source, destination, before, plan, command, json };
}

test("migration preserves a stopped noninitial instance, facts, all operations and unrelated instances without changing source bytes", async () => {
  const f = fixture("preservation");
  const sourceBytes = readFileSync(f.source);
  const original = rows(f.source);
  await migrateStore({ source: f.source, destination: f.destination, instance: "selected", plan: f.plan });
  assert.deepEqual(readFileSync(f.source), sourceBytes);
  assert.deepEqual(rows(f.source), original);
  const target = new TaskMachineStore(f.destination);
  try {
    const migrated = target.inspect("selected");
    assert.equal(migrated.runtimeCompatible, true);
    assert.equal(migrated.state, f.before.state);
    assert.equal(migrated.objective, f.before.objective);
    assert.equal(migrated.stopped, 1);
    assert.equal(migrated.revision, f.before.revision + 1);
    assert.notEqual(migrated.definition_hash, f.before.definition_hash);
    assert.deepEqual(migrated.definition, f.before.definition);
    assert.deepEqual(migrated.facts, f.before.facts);
    assert.deepEqual(migrated.operations, f.before.operations);
    const copied = rows(f.destination);
    const selected = original.instances.find(row => row.id === "selected");
    const copiedSelected = copied.instances.find(row => row.id === "selected");
    assert.ok(selected);
    assert.ok(copiedSelected);
    assert.deepEqual({ ...copiedSelected }, {
      ...selected, definition_hash: migrated.definition_hash, revision: migrated.revision,
    });
    assert.deepEqual(copied.instances.filter(row => row.id !== "selected"), original.instances.filter(row => row.id !== "selected"));
    assert.deepEqual(copied.operations, original.operations);
    for (const row of original.definitions) assert.ok(copied.definitions.some(copy => JSON.stringify(copy) === JSON.stringify(row)));
    const lineage = target.db.prepare("SELECT instance_id,source_runtime,source_definition_hash,target_definition_hash,source_revision,target_revision,reason FROM runtime_migrations").all();
    assert.deepEqual(lineage.map(row => ({ ...row })), [{
      instance_id: "selected", source_runtime: f.plan.sourceRuntime,
      source_definition_hash: f.before.definition_hash, target_definition_hash: migrated.definition_hash,
      source_revision: f.before.revision, target_revision: migrated.revision, reason: f.plan.reason,
    }]);
    assert.throws(() => target.send("selected", migrated.revision, { type: "ACCEPT", facts: { workload: "workload-1", verdict: "pass" } }), /stopped/);
    const resumed = target.setStopped("selected", migrated.revision, false);
    assert.equal(resumed.blocked, true);
    assert.throws(() => target.send("selected", resumed.revision, { type: "ACCEPT", facts: { workload: "workload-1", verdict: "pass" } }), /Unresolved operation/);
    assert.deepEqual(target.inspect("selected"), resumed);
  } finally { target.close(); }
  assert.deepEqual(readFileSync(f.source), sourceBytes);
});

test("migration refuses stale source expectations without publishing a destination or modifying the source", async () => {
  const f = fixture("expectations");
  const sourceBytes = readFileSync(f.source);
  for (const plan of [
    { ...f.plan, sourceRuntime: "0".repeat(64) },
    { ...f.plan, sourceDefinitionHash: "0".repeat(64) },
    { ...f.plan, sourceRevision: f.plan.sourceRevision - 1 },
  ]) {
    await assert.rejects(migrateStore({ source: f.source, destination: f.destination, instance: "selected", plan }));
    assert.equal(existsSync(f.destination), false);
    assert.deepEqual(readFileSync(f.source), sourceBytes);
  }
});

test("migration refuses active sources, existing destinations and equal runtime fingerprints", async () => {
  const f = fixture("active-source");
  const active = f.command("resume", "selected", String(f.before.revision));
  const bytes = readFileSync(f.source);
  await assert.rejects(migrateStore({ source: f.source, destination: f.destination, instance: "selected", plan: { ...f.plan, sourceRevision: active.revision } }));
  assert.equal(existsSync(f.destination), false);
  assert.deepEqual(readFileSync(f.source), bytes);

  const stopped = f.command("stop", "selected", String(active.revision));
  const destinationBytes = Buffer.from("Existing destination must never be replaced.\n");
  writeFileSync(f.destination, destinationBytes);
  const stoppedBytes = readFileSync(f.source);
  await assert.rejects(migrateStore({ source: f.source, destination: f.destination, instance: "selected", plan: { ...f.plan, sourceRevision: stopped.revision } }));
  assert.deepEqual(readFileSync(f.source), stoppedBytes);
  assert.deepEqual(readFileSync(f.destination), destinationBytes);

  const sameSource = join(f.directory, "same-runtime.sqlite");
  const same = new TaskMachineStore(sameSource, true);
  let current;
  try {
    same.init("selected", "Same-runtime fixture", definition);
    current = same.setStopped("selected", 0, true);
  } finally { same.close(); }
  const database = new DatabaseSync(sameSource, { readOnly: true });
  const stored = z.object({ runtime: z.string() }).parse(database.prepare("SELECT runtime FROM definitions WHERE hash=?").get(current.definition_hash));
  database.close();
  const sameBytes = readFileSync(sameSource);
  const sameDestination = join(f.directory, "same-destination.sqlite");
  await assert.rejects(migrateStore({ source: sameSource, destination: sameDestination, instance: "selected", plan: {
    ...f.plan, sourceRuntime: stored.runtime, sourceDefinitionHash: current.definition_hash, sourceRevision: current.revision,
  } }));
  assert.equal(existsSync(sameDestination), false);
  assert.deepEqual(readFileSync(sameSource), sameBytes);
});

test("migration rejects corrupt source envelopes and payloads without changing the source or publishing a copy", async () => {
  for (const corruption of [
    { name: "envelope", sql: "UPDATE definitions SET document='{}'" },
    { name: "facts", sql: "UPDATE instances SET facts='invalid JSON' WHERE id='selected'" },
    { name: "state", sql: "UPDATE instances SET state='ghost' WHERE id='selected'" },
    { name: "request", sql: "UPDATE operations SET request='invalid JSON' WHERE id='unknown-operation'" },
    { name: "receipt", sql: "UPDATE operations SET receipt='invalid JSON' WHERE id='resolved-operation'" },
  ]) {
    const f = fixture(`corrupt-${corruption.name}`);
    const database = new DatabaseSync(f.source);
    database.exec(corruption.sql);
    database.close();
    const bytes = readFileSync(f.source);
    await assert.rejects(migrateStore({ source: f.source, destination: f.destination, instance: "selected", plan: f.plan }), (error: unknown) => error instanceof Error, corruption.name);
    assert.equal(existsSync(f.destination), false, corruption.name);
    assert.deepEqual(readFileSync(f.source), bytes, corruption.name);
  }
});
