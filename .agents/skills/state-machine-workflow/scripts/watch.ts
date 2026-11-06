import { TaskMachineStore } from "./store.ts";

const [database, instance, option] = process.argv.slice(2);
const usage = "Usage: node /path/to/state-machine-workflow/run.mjs watch DATABASE INSTANCE [--once]";
let store: TaskMachineStore | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let last = "";
function close(): void {
  if (timer) clearInterval(timer);
  store?.close();
  store = undefined;
}
function update(): void {
  try {
    if (!store || !instance) throw new Error(usage);
    const value = store.inspect(instance);
    const pending = value.operations.filter(operation => operation.status === "unknown").map(operation => operation.id);
    const status = !value.runtimeCompatible ? "Incompatible runtime" : value.stopped ? "Stopped" : pending.length ? "Unresolved operation" : value.definition.states[value.state]?.final ? "Final" : "Ready";
    const snapshot = { instance: value.id, revision: value.revision, state: value.state, status, pending,
      transitions: Object.entries(value.transitions).map(([event, edge]) => ({ event, target: edge.target, requirements: edge.requires ?? {} })) };
    const serialized = JSON.stringify(snapshot);
    if (process.stdout.isTTY) {
      const transitions = snapshot.transitions.map(edge => `  ${edge.event} -> ${edge.target} (requirements apply)`).join("\n");
      process.stdout.write(`\x1b[2J\x1b[HTask: ${JSON.stringify(value.id)}\nState: ${value.state}\nStatus: ${status}\nRevision: ${value.revision}\nUnresolved: ${pending.map(id => JSON.stringify(id)).join(", ") || "none"}\nChecked: ${new Date().toISOString()}\n\nDefined transitions:\n${transitions || "  none"}\n\nRead-only display; refreshes every second. Ctrl-C exits.\n`);
    } else if (serialized !== last) process.stdout.write(serialized + "\n");
    last = serialized;
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error instanceof Error ? error.message : "State inspection failed" }) + "\n");
    process.exitCode = 1;
    close();
  }
}
try {
  if (!database || !instance || option !== undefined && option !== "--once" || process.argv.length > 5) throw new Error(usage);
  store = new TaskMachineStore(database);
  update();
  if (store && option !== "--once") {
    timer = setInterval(update, 1000);
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } else close();
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error instanceof Error ? error.message : "Display failed" }) + "\n");
  process.exitCode = 1;
  close();
}
