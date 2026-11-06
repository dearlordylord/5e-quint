import { Result } from "effect";
import { createMcpApplicationServices } from "../../../packages/mcp/src/composition-root.ts";
import { decodePlaySessionId } from "../../../packages/mcp/src/play-session.ts";
import { decodeStoredPlaySessionRecord } from "../../../packages/mcp/src/play-session-repository.ts";
import { decodePlaySessionContinuation } from "../../../packages/mcp/src/play-session-continuation-codec.ts";

export function validateConvertedRow(row: unknown, id: unknown) {
  const playSessionId = decodePlaySessionId(id);
  if (Result.isFailure(playSessionId)) return issue(playSessionId.failure);
  const record = decodeStoredPlaySessionRecord(row, playSessionId.success);
  if (Result.isFailure(record)) return issue(record.failure.message);
  const restored = decodePlaySessionContinuation(
    createMcpApplicationServices(),
    record.success.diceReplay.seed,
    record.success.continuation,
  );
  return Result.isFailure(restored)
    ? issue(restored.failure)
    : { tag: "validated" as const };
}

function issue(message: string) {
  return { tag: "issue" as const, message };
}
