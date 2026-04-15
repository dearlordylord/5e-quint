// CLI entry: load an authored spell JSON, trace it, emit mermaid.
//
// Usage:
//   tsx src/run.ts content/bless.json
//   tsx src/run.ts content/bless.json --out content/bless.trace.md
//
// The tracer is an interpreter over the authored ADT; it does NOT call
// the real combat runtime. Output is a dependency graph of the surface
// atoms the spell relies on, rendered as mermaid for human review.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

import type { SpellRecord } from "./surface/types.ts";
import { traceSpell } from "./interpreter/tracer.ts";
import { renderTraceDocument } from "./interpreter/mermaid.ts";

function main(): void {
  const args = argv.slice(2);
  if (args.length === 0) {
    stdout.write("usage: tsx src/run.ts <spell.json> [--out <file.md>]\n");
    exit(64);
  }

  const spellPathArg = args[0];
  if (spellPathArg === undefined) {
    stdout.write("missing spell path\n");
    exit(64);
  }
  const spellPath = resolve(spellPathArg);
  const raw = readFileSync(spellPath, "utf8");
  const spell = JSON.parse(raw) as SpellRecord;

  const trace = traceSpell(spell);
  const doc = renderTraceDocument(trace);

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
