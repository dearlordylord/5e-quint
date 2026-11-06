import { Result } from "effect";
import { createMcpApplicationServices } from "../../../packages/mcp/src/composition-root.ts";
import { decodePlaySessionId } from "../../../packages/mcp/src/play-session.ts";
import { decodeStoredPlaySessionRecord } from "../../../packages/mcp/src/play-session-repository.ts";
import { rootFromRecord } from "../../../packages/mcp/src/recoverable-play-session-support.ts";
import { retainPlaySessionContinuation } from "../../../packages/mcp/src/play-session-continuation.ts";
import { encodeContinuationGraph } from "../../../packages/mcp/src/continuation-graph.ts";

export function materializeStoredRow(row: unknown, id: unknown) {
  const playSessionId = decodePlaySessionId(id);
  if (Result.isFailure(playSessionId)) return issue(playSessionId.failure);
  const record = decodeStoredPlaySessionRecord(row, playSessionId.success);
  if (Result.isFailure(record)) return issue(record.failure.message);
  const services = createMcpApplicationServices();
  const root = rootFromRecord(services, record.success);
  if (Result.isFailure(root)) return issue(root.failure.message);
  const retained = retainPlaySessionContinuation(root.success);
  if (Result.isFailure(retained)) return issue(retained.failure);
  const graph = encodeContinuationGraph(root.success, retained.success);
  if (Result.isFailure(graph)) return issue(graph.failure);
  return { tag: "materialized" as const, graph: graph.success };
}

function issue(message: string) {
  return { tag: "issue" as const, message };
}
