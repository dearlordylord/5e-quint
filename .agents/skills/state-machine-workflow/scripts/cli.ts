import { readFileSync } from "node:fs";
import { TaskMachineStore } from "./store.ts";

const help = `Usage: node /path/to/state-machine-workflow/run.mjs machine DATABASE COMMAND ...
init DEFINITION.json INSTANCE OBJECTIVE
inspect INSTANCE
send INSTANCE REVISION EVENT.json
stop|resume INSTANCE REVISION
reserve INSTANCE REVISION OPERATION REQUEST.json
resolve INSTANCE REVISION OPERATION RECEIPT.json
graph INSTANCE

All mutations require an explicit instance. Revision comes from inspect.
reserve records an unknown outcome BEFORE any separately authorized external call.
resolve checks artifact bytes, not provider authority or the truth of a receipt.
No command executes external operations. graph emits Mermaid text, not HTML.`;

function required(value: string | undefined): string {
  if (value === undefined || !value.length) throw new Error(help);
  return value;
}
function json(path: string | undefined): unknown { return JSON.parse(readFileSync(required(path), "utf8")); }

let store: TaskMachineStore | undefined;
try {
  const [database, command, ...args] = process.argv.slice(2);
  if (database === "--help" || !database) { process.stdout.write(help + "\n"); }
  else {
    const counts: Record<string, number> = { init: 3, inspect: 1, send: 3, stop: 2, resume: 2, reserve: 4, resolve: 4, graph: 1 };
    if (!command || !Object.hasOwn(counts, command) || args.length !== counts[command]) throw new Error(help);
    store = new TaskMachineStore(database, command === "init");
    const instance = required(command === "init" ? args[1] : args[0]);
    const revision = Number(args[1]);
    let output: unknown;
    switch (command) {
      case "init": output = store.init(instance, required(args[2]), json(args[0])); break;
      case "inspect": output = store.inspect(instance); break;
      case "send": output = store.send(instance, revision, json(args[2])); break;
      case "stop": output = store.setStopped(instance, revision, true); break;
      case "resume": output = store.setStopped(instance, revision, false); break;
      case "reserve": output = store.reserve(instance, revision, required(args[2]), json(args[3])); break;
      case "resolve": output = store.resolve(instance, revision, required(args[2]), json(args[3])); break;
      case "graph": output = store.graph(instance); break;
      default: throw new Error(help);
    }
    process.stdout.write(typeof output === "string" ? output + "\n" : JSON.stringify(output, null, 2) + "\n");
  }
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error instanceof Error ? error.message : "Command failed" }) + "\n");
  process.exitCode = 1;
} finally { store?.close(); }
