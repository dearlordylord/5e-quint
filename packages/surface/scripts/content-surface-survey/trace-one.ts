import { readFileSync } from "node:fs";

import { traceAtomKinds, traceUnit } from "../../src/interpreter/tracer.ts";
import { decodeUnitRecordSync } from "../../src/surface/schema.ts";

const path = process.argv[2];
if (!path) {
  console.error("usage: trace-one.ts <json>");
  process.exit(1);
}
const unit = decodeUnitRecordSync(JSON.parse(readFileSync(path, "utf8")));
const trace = traceUnit(unit);
console.log("atomKinds:", traceAtomKinds(trace));
console.log("node count:", trace.nodes.length);
console.log("edge count:", trace.edges.length);
for (const n of trace.nodes) {
  console.log("  -", n.id, "|", n.atomKind, "|", n.label.replace(/\n/g, " / "));
}
console.log("\nedges:");
for (const e of trace.edges) {
  console.log("  -", e.from, "->", e.to, "(", e.relation, ")");
}
