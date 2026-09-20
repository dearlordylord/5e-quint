import { Result } from "effect";

import {
  renderStatBlockTraceDocument,
  renderTraceDocument,
} from "./interpreter/mermaid.ts";
import {
  traceStatBlock,
  traceUnit,
  type TraceFinalizationIssues,
} from "./interpreter/tracer.ts";
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
  const rendered = renderRecordTrace(parsed);
  if (Result.isFailure(rendered)) {
    dependencies.writeStdout(formatTraceIssues(rendered.failure));
    return 64;
  }
  const document = rendered.success;
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

function renderRecordTrace(
  raw: unknown,
): Result.Result<string, TraceFinalizationIssues> {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "kind" in raw &&
    raw.kind === "statBlock"
  ) {
    const statBlock = decodeStatBlockRecordSync(raw);
    const trace = traceStatBlock(statBlock);
    return Result.isFailure(trace)
      ? Result.fail(trace.failure)
      : Result.succeed(renderStatBlockTraceDocument(trace.success, statBlock));
  }

  const unit = decodeUnitRecordSync(raw);
  const trace = traceUnit(unit);
  return Result.isFailure(trace)
    ? Result.fail(trace.failure)
    : Result.succeed(renderTraceDocument(trace.success, unit));
}

function formatTraceIssues(issues: TraceFinalizationIssues): string {
  return `trace validation failed:\n${issues
    .map((issue) => JSON.stringify(issue))
    .join("\n")}\n`;
}
