// CLI entry: load authored content JSON, trace it, emit mermaid.
//
// Usage:
//   tsx src/run.ts content/<record>.json
//   tsx src/run.ts content/<record>.json --out content/<record>.trace.md

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

import {
  decodeStatBlockRecordSync,
  decodeUnitRecordSync,
} from "./surface/schema.ts";
import { traceStatBlock, traceUnit } from "./interpreter/tracer.ts";
import {
  renderStatBlockTraceDocument,
  renderTraceDocument,
} from "./interpreter/mermaid.ts";

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
  const parsed = JSON.parse(raw) as { readonly kind?: unknown };
  const doc =
    parsed.kind === "statBlock"
      ? (() => {
          const statBlock = decodeStatBlockRecordSync(parsed);
          return renderStatBlockTraceDocument(
            traceStatBlock(statBlock),
            statBlock,
          );
        })()
      : (() => {
          const unit = decodeUnitRecordSync(parsed);
          return renderTraceDocument(traceUnit(unit), unit);
        })();

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
