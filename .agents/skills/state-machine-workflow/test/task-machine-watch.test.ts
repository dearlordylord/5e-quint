import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { z } from "zod";
import { TaskMachineStore } from "../scripts/store.ts";

test("live display observes committed state changes without advancing the instance", { timeout: 20000 }, async () => {
  mkdirSync(resolve(".local"), { recursive: true });
  const directory = mkdtempSync(resolve(".local/task-machine-watch-"));
  const database = join(directory, "state.sqlite");
  const store = new TaskMachineStore(database, true);
  store.init("watch-task", "Verify live observation", { id: "watch-example", version: "1", initial: "waiting", facts: {}, states: {
    waiting: { on: { FINISH: { target: "done" } } }, done: { final: true },
  } });
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/watch.ts", database, "watch-task"], { stdio: ["ignore", "pipe", "pipe"] });
  const exited = once(child, "close");
  const lines = createInterface({ input: child.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  const Snapshot = z.object({ revision: z.number().int().nonnegative(), state: z.string(), status: z.string() });
  const read = async () => {
    const next = await iterator.next();
    assert.equal(next.done, false);
    return Snapshot.parse(JSON.parse(next.value ?? "null"));
  };
  try {
    assert.deepEqual(await read(), { revision: 0, state: "waiting", status: "Ready" });
    assert.equal(store.inspect("watch-task").revision, 0);
    store.send("watch-task", 0, { type: "FINISH", facts: {} });
    assert.deepEqual(await read(), { revision: 1, state: "done", status: "Final" });
    assert.equal(store.inspect("watch-task").revision, 1);
  } finally {
    child.kill("SIGTERM");
    await exited;
    lines.close();
    store.close();
  }
});
