import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { z } from "zod";
import { Definition, Event, Facts, Instance, Operation, Receipt } from "./schema.ts";
import { advance, graph, validateDefinition } from "./machine.ts";

export const digest = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");
const runtime = () => {
  const packageFile = createRequire(import.meta.url).resolve("xstate/package.json");
  z.object({ version: z.literal("5.33.3") }).parse(JSON.parse(readFileSync(packageFile, "utf8")));
  return digest(["schema.ts", "machine.ts", "store.ts", "cli.ts"].map(name => readFileSync(new URL(name, import.meta.url), "utf8")).join("\n"));
};
const DefinitionRow = z.object({ document: z.string(), runtime: z.string() });

/** One local authority for a task definition, its instance and operation receipts. */
export class TaskMachineStore {
  readonly db: DatabaseSync;
  constructor(path: string, create = false) {
    if (!create && !existsSync(path)) throw new Error("Store does not exist; use init explicitly");
    if (create) mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;");
    if (create) this.db.exec(`
      CREATE TABLE IF NOT EXISTS definitions (hash TEXT PRIMARY KEY, document TEXT NOT NULL, runtime TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS instances (id TEXT PRIMARY KEY, objective TEXT NOT NULL, definition_hash TEXT NOT NULL REFERENCES definitions(hash), revision INTEGER NOT NULL, state TEXT NOT NULL, facts TEXT NOT NULL, stopped INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS operations (id TEXT NOT NULL, instance_id TEXT NOT NULL REFERENCES instances(id), request TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('unknown','resolved')), receipt TEXT, PRIMARY KEY(instance_id,id));
    `);
  }
  close(): void { this.db.close(); }
  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const value = action(); this.db.exec("COMMIT"); return value; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  private instance(id: string): Instance {
    const instance = Instance.parse(this.db.prepare("SELECT * FROM instances WHERE id=?").get(id));
    Facts.parse(JSON.parse(instance.facts));
    return instance;
  }
  private definition(instance: Instance, enforceRuntime = true): Definition {
    const row = DefinitionRow.parse(this.db.prepare("SELECT document,runtime FROM definitions WHERE hash=?").get(instance.definition_hash));
    if (digest(row.document) !== instance.definition_hash) throw new Error("Definition integrity mismatch");
    if (enforceRuntime && row.runtime !== runtime()) throw new Error("Runtime definition mismatch; explicit migration is required");
    const envelope = z.object({ engine: z.literal("xstate@5.33.3"), runtime: z.string(), definition: Definition }).parse(JSON.parse(row.document));
    if (envelope.runtime !== row.runtime) throw new Error("Runtime binding mismatch");
    validateDefinition(envelope.definition);
    if (!Object.hasOwn(envelope.definition.states, instance.state)) throw new Error("Persisted state is absent from its definition");
    return envelope.definition;
  }
  private operations(id: string): readonly Operation[] {
    return Operation.array().parse(this.db.prepare("SELECT * FROM operations WHERE instance_id=? ORDER BY rowid").all(id));
  }
  inspect(id: string) {
    return this.transaction(() => this.readInstance(id));
  }
  private readInstance(id: string) {
    const instance = this.instance(id);
    const definition = this.definition(instance, false);
    const operations = this.operations(id);
    const row = DefinitionRow.parse(this.db.prepare("SELECT document,runtime FROM definitions WHERE hash=?").get(instance.definition_hash));
    return { ...instance, facts: Facts.parse(JSON.parse(instance.facts)), definition,
      runtimeCompatible: row.runtime === runtime(), operations,
      transitions: definition.states[instance.state]?.on ?? {},
      blocked: instance.stopped === 1 || operations.some(operation => operation.status === "unknown"),
    };
  }
  init(id: string, objective: string, input: unknown) {
    if (!id.trim() || !objective.trim()) throw new Error("Instance ID and objective are required");
    const definition = Definition.parse(input);
    validateDefinition(definition);
    const implementation = runtime();
    const document = JSON.stringify({ engine: "xstate@5.33.3", runtime: implementation, definition });
    const hash = digest(document);
    this.transaction(() => {
      this.db.prepare("INSERT OR IGNORE INTO definitions VALUES (?,?,?)").run(hash, document, implementation);
      this.db.prepare("INSERT INTO instances VALUES (?,?,?,?,?,?,?)").run(id, objective, hash, 0, definition.initial, JSON.stringify(definition.facts), 0);
    });
    return this.inspect(id);
  }
  private mutate(id: string, revision: number, action: (instance: Instance, definition: Definition) => void) {
    this.transaction(() => {
      const instance = this.instance(id);
      if (!Number.isSafeInteger(revision) || revision < 0 || instance.revision !== revision || revision === Number.MAX_SAFE_INTEGER) throw new Error("Revision conflict");
      const definition = this.definition(instance);
      action(instance, definition);
      this.db.prepare("UPDATE instances SET revision=revision+1 WHERE id=?").run(id);
    });
    return this.inspect(id);
  }
  private requireReady(instance: Instance): void {
    if (instance.stopped) throw new Error("Instance is stopped");
    if (this.operations(instance.id).some(operation => operation.status === "unknown")) throw new Error("Unresolved operation blocks advancement");
  }
  send(id: string, revision: number, input: unknown) {
    const event = Event.parse(input);
    return this.mutate(id, revision, (instance, definition) => {
      this.requireReady(instance);
      const facts = Facts.parse(JSON.parse(instance.facts));
      const state = advance(definition, instance.state, facts, event);
      this.db.prepare("UPDATE instances SET state=?,facts=? WHERE id=?").run(state, JSON.stringify({ ...facts, ...event.facts }), id);
    });
  }
  setStopped(id: string, revision: number, stopped: boolean) {
    return this.mutate(id, revision, () => { this.db.prepare("UPDATE instances SET stopped=? WHERE id=?").run(stopped ? 1 : 0, id); });
  }
  reserve(id: string, revision: number, operation: string, input: unknown) {
    if (!operation.trim()) throw new Error("Operation ID is required");
    const request = JSON.stringify(z.json().parse(input));
    return this.mutate(id, revision, (instance, definition) => {
      this.requireReady(instance);
      if (definition.states[instance.state]?.final) throw new Error("Final instance cannot reserve work");
      this.db.prepare("INSERT INTO operations VALUES (?,?,?,'unknown',NULL)").run(operation, id, request);
    });
  }
  resolve(id: string, revision: number, operation: string, input: unknown) {
    const receipt = Receipt.parse(input);
    if (digest(readFileSync(receipt.artifact)) !== receipt.sha256) throw new Error("Receipt artifact hash mismatch");
    return this.mutate(id, revision, () => {
      const row = Operation.parse(this.db.prepare("SELECT * FROM operations WHERE instance_id=? AND id=?").get(id, operation));
      if (row.status !== "unknown") throw new Error("Operation is already resolved");
      this.db.prepare("UPDATE operations SET status='resolved',receipt=? WHERE instance_id=? AND id=?").run(JSON.stringify(receipt), id, operation);
    });
  }
  graph(id: string): string {
    return this.transaction(() => {
      const instance = this.instance(id);
      return `%% Instance: ${JSON.stringify(instance.id)}; stopped=${instance.stopped === 1}; unresolved=${this.operations(id).filter(operation => operation.status === "unknown").length}\n${graph(this.definition(instance, false), instance.state)}`;
    });
  }
}
