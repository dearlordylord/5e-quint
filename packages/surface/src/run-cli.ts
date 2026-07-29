import {
  renderStatBlockTraceDocument,
  renderTraceDocument,
} from "./interpreter/mermaid.ts";
import { traceStatBlock, traceUnit } from "./interpreter/tracer.ts";
import {
  decodeStatBlockRecordSync,
  decodeUnitRecordSync,
} from "./surface/schema.ts";

export type SurfaceTraceCliDependencies = {
  readonly readFile: (path: string) => string;
  readonly writeFile: (path: string, contents: string) => void;
  readonly resolvePath: (path: string) => string;
  readonly writeStdout: (contents: string) => void;
};

export function runSurfaceTraceCli(
  args: readonly string[],
  dependencies: SurfaceTraceCliDependencies,
): 0 | 64 {
  const unitPathArg = args[0];
  if (unitPathArg === undefined) {
    dependencies.writeStdout(
      "usage: tsx src/run.ts <unit.json> [--out <file.md>]\n",
    );
    return 64;
  }

  const unitPath = dependencies.resolvePath(unitPathArg);
  const parsed: unknown = JSON.parse(dependencies.readFile(unitPath));
  const document = renderRecordTrace(parsed);
  const outIndex = args.indexOf("--out");
  if (outIndex < 0) {
    dependencies.writeStdout(document);
    return 0;
  }

  const outArg = args[outIndex + 1];
  if (outArg === undefined) {
    dependencies.writeStdout("--out flag given without path\n");
    return 64;
  }

  const outPath = dependencies.resolvePath(outArg);
  dependencies.writeFile(outPath, document);
  dependencies.writeStdout(`wrote ${outPath}\n`);
  return 0;
}

function renderRecordTrace(raw: unknown): string {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "kind" in raw &&
    raw.kind === "statBlock"
  ) {
    const statBlock = decodeStatBlockRecordSync(raw);
    return renderStatBlockTraceDocument(traceStatBlock(statBlock), statBlock);
  }

  const unit = decodeUnitRecordSync(raw);
  return renderTraceDocument(traceUnit(unit), unit);
}
