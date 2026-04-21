// CLI entry: load an authored unit JSON, trace it, emit mermaid.
//
// Usage:
//   tsx src/run.ts content/<unit>.json
//   tsx src/run.ts content/<unit>.json --out content/<unit>.trace.md

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

import { decodeUnitRecordSync } from "./surface/schema.ts";
import { traceUnit } from "./interpreter/tracer.ts";
import { renderTraceDocument } from "./interpreter/mermaid.ts";

function main(): void {
  const args = argv.slice(2);
  if (args.length === 0) {
    stdout.write("usage: tsx src/run.ts <unit.json> [--out <file.md>]\n");
    exit(64);
  }

  const unitPathArg = args[0];
  if (unitPathArg === undefined) {
    stdout.write("missing unit path\n");
    exit(64);
  }
  const unitPath = resolve(unitPathArg);
  const raw = readFileSync(unitPath, "utf8");
  const unit = decodeUnitRecordSync(JSON.parse(raw));

  const trace = traceUnit(unit);
  const doc = renderTraceDocument(trace, unit);

  const outIdx = args.indexOf("--out");
  if (outIdx >= 0 && args.length > outIdx + 1) {
    const outArg = args[outIdx + 1];
    if (outArg === undefined) {
      stdout.write("--out flag given without path\n");
      exit(64);
    }
    const outPath = resolve(outArg);
    writeFileSync(outPath, doc, "utf8");
    stdout.write(`wrote ${outPath}\n`);
  } else {
    stdout.write(doc);
  }
}

main();
