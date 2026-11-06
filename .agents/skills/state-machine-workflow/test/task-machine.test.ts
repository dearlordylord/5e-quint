import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { Definition, Facts, Instance, Operation } from "../scripts/schema.ts";

mkdirSync(resolve(".local"), { recursive: true });
const root = mkdtempSync(resolve(".local/task-machine-forward-"));
const cli = resolve("scripts/cli.ts");
const Inspection = z.object({
  ...Instance.shape,
  facts: Facts,
  definition: Definition,
  runtimeCompatible: z.boolean(),
  operations: Operation.array(),
  blocked: z.boolean(),
});
const bindings = { workload: { fact: "workload" }, build: { fact: "build" }, attempt: { fact: "attempt" } };
const definition = {
  id: "forward-loop", version: "1", initial: "measure",
  facts: { workload: "workload-1", build: "build-1", attempt: "attempt-1" },
  states: {
    measure: { on: {
      CHECK_PASS: { target: "checked", requires: { ...bindings, verdict: "pass" } },
      CHECK_FAIL: { target: "failed", requires: { ...bindings, verdict: "fail" } },
    } },
    failed: { on: { REPAIR: { target: "measure" } } },
    checked: { on: { ACCEPT: { target: "accepted", requires: { ...bindings, verdict: "pass" } } } },
    accepted: { on: { GROW: { target: "growth", requires: bindings }, FINISH: { target: "done", requires: bindings } } },
    growth: { on: { NEXT: { target: "measure" } } },
    done: { final: true },
  },
} satisfies Definition;

function fixture(name: string) {
  const directory = join(root, name);
  mkdirSync(directory);
  const database = join(directory, "state.sqlite");
  let serial = 0;
  function json(value: unknown) {
    const path = join(directory, `input-${serial++}.json`);
    writeFileSync(path, JSON.stringify(value));
    return path;
  }
  function command(args: readonly string[], entry = cli) {
    const child = spawnSync(process.execPath, ["--import", "tsx", entry, database, ...args], { encoding: "utf8" });
    assert.ifError(child.error);
    return child;
  }
  function succeeded(args: readonly string[], entry = cli) {
    const result = command(args, entry);
    assert.equal(result.status, 0, `${args[0]} failed in ${directory}: ${result.stderr}`);
    return Inspection.parse(JSON.parse(result.stdout));
  }
  function refused(args: readonly string[], message: RegExp, entry = cli) {
    const result = command(args, entry);
    assert.equal(result.status, 1, `Expected refusal in ${directory}: ${result.stdout}`);
    assert.match(result.stderr, message);
    return result;
  }
  function inspect() { return succeeded(["inspect", "instance-1"]); }
  function send(type: string, facts: Record<string, string>, revision = inspect().revision) {
    return succeeded(["send", "instance-1", String(revision), json({ type, facts })]);
  }
  const initial = succeeded(["init", json(definition), "instance-1", "Exercise guarded loop in independent CLI processes"]);
  return { directory, database, json, command, succeeded, refused, inspect, send, initial };
}

test("task CLI preserves failed checks, binds evidence identities and reuses its definition across fresh processes", () => {
  const f = fixture("guard-and-loop");
  const first = { workload: "workload-1", build: "build-1", attempt: "attempt-1" };
  const failed = f.send("CHECK_FAIL", { ...first, verdict: "fail" });
  assert.equal(failed.state, "failed");
  for (const type of ["ACCEPT", "GROW"]) {
    f.refused(["send", "instance-1", String(failed.revision), f.json({ type, facts: { ...first, verdict: "pass", taskClosed: "true" } })], /not allowed/);
    assert.deepEqual(f.inspect(), failed);
  }
  f.send("REPAIR", {});
  const repaired = f.inspect();
  for (const facts of [
    { ...first, verdict: "pass", workload: "wrong-workload" },
    { ...first, verdict: "pass", build: "wrong-build" },
    { ...first, verdict: "pass", attempt: "wrong-attempt" },
    { ...first, verdict: "fail" },
  ]) {
    f.refused(["send", "instance-1", String(repaired.revision), f.json({ type: "CHECK_PASS", facts })], /requirements/);
    assert.deepEqual(f.inspect(), repaired);
  }
  assert.equal(f.send("CHECK_PASS", { ...first, verdict: "pass" }).state, "checked");
  assert.equal(f.send("ACCEPT", { ...first, verdict: "pass" }).state, "accepted");
  assert.equal(f.send("GROW", first).state, "growth");
  const second = { workload: "workload-2", build: "build-2", attempt: "attempt-2" };
  const next = f.send("NEXT", second);
  assert.equal(next.state, "measure");
  assert.equal(next.definition_hash, f.initial.definition_hash);
  assert.deepEqual(next.definition, f.initial.definition);
  assert.equal(f.inspect().facts.workload, "workload-2");
  f.refused(["send", "instance-1", String(next.revision), f.json({ type: "CHECK_PASS", facts: { ...first, verdict: "pass" } })], /requirements/);
  f.send("CHECK_PASS", { ...second, verdict: "pass" });
  f.send("ACCEPT", { ...second, verdict: "pass" });
  const final = f.send("FINISH", second);
  assert.equal(final.state, "done");
  f.refused(["send", "instance-1", String(final.revision), f.json({ type: "FINISH", facts: second })], /not allowed/);
  f.refused(["reserve", "instance-1", String(final.revision), "after-final", f.json({})], /Final instance/);
  assert.deepEqual(f.inspect(), final);
});

test("task CLI retains unknown operations through stop and restart, verifies receipt bytes and requires explicit resume", () => {
  const f = fixture("operation-stop");
  const reserved = f.succeeded(["reserve", "instance-1", "0", "operation-1", f.json({ purpose: "local fixture, no dispatch" })]);
  assert.equal(reserved.blocked, true);
  assert.equal(reserved.operations[0]?.status, "unknown");
  const pass = f.json({ type: "CHECK_PASS", facts: { workload: "workload-1", build: "build-1", attempt: "attempt-1", verdict: "pass" } });
  f.refused(["send", "instance-1", "1", pass], /Unresolved operation/);
  f.refused(["reserve", "instance-1", "1", "operation-2", f.json({})], /Unresolved operation/);
  const stopped = f.succeeded(["stop", "instance-1", "1"]);
  assert.equal(stopped.stopped, 1);
  assert.deepEqual(f.inspect().operations, reserved.operations);
  f.refused(["send", "instance-1", "2", pass], /stopped/);
  const artifact = join(f.directory, "receipt.txt");
  writeFileSync(artifact, "Authoritative local fixture: operation was not sent.\n");
  const receipt = { outcome: "not-sent", providerReference: "fixture-only", artifact, sha256: createHash("sha256").update(readFileSync(artifact)).digest("hex") };
  f.refused(["resolve", "instance-1", "2", "operation-1", f.json({ ...receipt, sha256: "0".repeat(64) })], /hash mismatch/);
  assert.deepEqual(f.inspect(), stopped);
  const resolved = f.succeeded(["resolve", "instance-1", "2", "operation-1", f.json(receipt)]);
  assert.equal(resolved.operations[0]?.status, "resolved");
  assert.equal(resolved.stopped, 1);
  assert.equal(resolved.blocked, true);
  f.refused(["send", "instance-1", "3", pass], /stopped/);
  const resumed = f.succeeded(["resume", "instance-1", "3"]);
  assert.equal(resumed.blocked, false);
  assert.equal(f.succeeded(["send", "instance-1", "4", pass]).state, "checked");
  const current = f.inspect();
  f.refused(["resolve", "instance-1", String(current.revision), "operation-1", f.json(receipt)], /already resolved/);
  f.refused(["reserve", "instance-1", String(current.revision), "operation-1", f.json({})], /UNIQUE constraint/);
  assert.deepEqual(f.inspect(), current);
});

test("task CLI rejects a stale writer when two fresh processes use the same revision", async () => {
  const f = fixture("writer-race");
  const writer = (command: string) => new Promise<{ status: number | null; stderr: string }>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", cli, f.database, command, "instance-1", "0"], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (status) => resolvePromise({ status, stderr }));
  });
  const results = await Promise.all([writer("stop"), writer("resume")]);
  assert.equal(results.filter(result => result.status === 0).length, 1);
  assert.equal(results.filter(result => result.status === 1 && /Revision conflict/.test(result.stderr)).length, 1);
  assert.equal(f.inspect().revision, 1);
  f.refused(["resume", "instance-1", "0"], /Revision conflict/);
  assert.equal(f.inspect().revision, 1);
});

test("task CLI permits read-only inspection but rejects mutation through actually changed runtime source", () => {
  const f = fixture("runtime-change");
  const directory = join(f.directory, "runtime");
  mkdirSync(directory);
  for (const name of ["schema.ts", "machine.ts", "store.ts", "cli.ts"]) copyFileSync(resolve("scripts", name), join(directory, name));
  const changed = join(directory, "machine.ts");
  writeFileSync(changed, readFileSync(changed, "utf8") + "\n// Independently changed runtime fixture.\n");
  const alternate = join(directory, "cli.ts");
  const incompatible = f.succeeded(["inspect", "instance-1"], alternate);
  assert.equal(incompatible.runtimeCompatible, false);
  assert.equal(incompatible.definition_hash, f.initial.definition_hash);
  f.refused(["stop", "instance-1", "0"], /Runtime definition mismatch/, alternate);
  assert.deepEqual(f.inspect(), f.initial);
});

test("task CLI rejects misspelled definition requirements and excess event fields without changing the instance", () => {
  const f = fixture("ingress-typos");
  const invalid = { ...definition, states: {
    measure: { on: { CHECK: { target: "done", require: { verdict: "pass" } } } },
    done: { final: true },
  } };
  f.refused(["init", f.json(invalid), "instance-2", "Typo must not remove the guard"], /require/);
  f.refused(["send", "instance-1", "0", f.json({ type: "CHECK_PASS", facts: {
    workload: "workload-1", build: "build-1", attempt: "attempt-1", verdict: "pass",
  }, fact: { ignored: "must be rejected" } })], /fact/);
  assert.deepEqual(f.inspect(), f.initial);
});

test("task CLI refuses recovery and reservation from corrupt persisted state, stop status or revision", () => {
  for (const corruption of [
    { name: "unknown-state", sql: "UPDATE instances SET state='ghost'", error: /Persisted state is absent/ },
    { name: "invalid-stop", sql: "UPDATE instances SET stopped=2", error: /stopped/ },
    { name: "negative-revision", sql: "UPDATE instances SET revision=-1", error: /revision/ },
    { name: "invalid-facts", sql: "UPDATE instances SET facts='invalid JSON'", error: /JSON|Unexpected token/ },
  ]) {
    const f = fixture(corruption.name);
    const database = new DatabaseSync(f.database);
    try {
      database.exec(corruption.sql);
      const before = database.prepare("SELECT * FROM instances").all();
      f.refused(["inspect", "instance-1"], corruption.error);
      f.refused(["reserve", "instance-1", "0", "must-not-reserve", f.json({})], corruption.error);
      assert.deepEqual(database.prepare("SELECT * FROM instances").all(), before);
      assert.deepEqual(database.prepare("SELECT * FROM operations").all(), []);
    } finally { database.close(); }
  }
});

test("task CLI graph text names the current state and reports stopped and unresolved status without mutation", () => {
  const f = fixture("graph-markers");
  const initial = f.command(["graph", "instance-1"]);
  assert.equal(initial.status, 0, initial.stderr);
  assert.match(initial.stdout, /stateDiagram-v2/);
  assert.match(initial.stdout, /stopped=false; unresolved=0/);
  assert.match(initial.stdout, /class measure active/);
  assert.match(initial.stdout, /measure --> checked: CHECK_PASS \[guarded\]/);
  f.send("CHECK_PASS", { workload: "workload-1", build: "build-1", attempt: "attempt-1", verdict: "pass" });
  f.succeeded(["reserve", "instance-1", "1", "pending-operation", f.json({})]);
  const stopped = f.succeeded(["stop", "instance-1", "2"]);
  const blocked = f.command(["graph", "instance-1"]);
  assert.equal(blocked.status, 0, blocked.stderr);
  assert.match(blocked.stdout, /stopped=true; unresolved=1/);
  assert.match(blocked.stdout, /class checked active/);
  assert.deepEqual(f.inspect(), stopped);
});
