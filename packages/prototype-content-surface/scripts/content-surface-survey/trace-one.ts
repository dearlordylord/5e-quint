import { traceUnit } from "../../src/interpreter/tracer.ts";
import type { UnitRecord } from "../../src/surface/types.ts";
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) { console.error("usage: trace-one.ts <json>"); process.exit(1); }
const unit = JSON.parse(readFileSync(path, "utf8")) as UnitRecord;
const trace = traceUnit(unit);
const kinds = Array.from(new Set(trace.nodes.map((n) => n.atomKind))).sort();
console.log("atomKinds:", kinds);
console.log("node count:", trace.nodes.length);
console.log("edge count:", trace.edges.length);
for (const n of trace.nodes) {
  console.log("  -", n.id, "|", n.atomKind, "|", n.label.replace(/\n/g, " / "));
}
console.log("\nedges:");
for (const e of trace.edges) {
  console.log("  -", e.from, "->", e.to, "(", e.relation, ")");
}
