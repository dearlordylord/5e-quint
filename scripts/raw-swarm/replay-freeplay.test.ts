import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";

import { decodePlaySessionId } from "../../packages/mcp/src/play-session.ts";
import { createDndMcpProtocolServer } from "../../packages/mcp/src/protocol-server.ts";
import { replayMcpExchanges } from "./replay-freeplay.ts";
import { parsePlayerTranscript, type McpTranscriptStep } from "./transcript.ts";

const recordedPlaySessionId = decodePlaySessionId(
  "play-session:00000000-0000-4000-8000-000000000000",
);
if (recordedPlaySessionId._tag === "Left") {
  throw new Error(recordedPlaySessionId.left);
}

describe("RAW swarm MCP replay", () => {
  test("replays create_play_session and a routed stateful call", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer(undefined, undefined, {
      playSessionIdFactory: () => recordedPlaySessionId.right,
    });
    const client = new Client({
      name: "raw-swarm-transcript-probe",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      const read = await client.callTool({
        name: "read_battle_state",
        arguments: { playSessionId: recordedPlaySessionId.right },
      });
      const steps: McpTranscriptStep[] = [
        toolCall(1, 1, "create_play_session", {}),
        toolResult(2, 1, created),
        toolCall(3, 2, "read_battle_state", {
          playSessionId: recordedPlaySessionId.right,
        }),
        toolResult(4, 2, read),
      ];
      const parsed = parsePlayerTranscript([
        {
          type: "header",
          scenarioId: "replay-probe",
          gitSha: "0".repeat(40),
          startedAt: "2026-08-22T00:00:00.000Z",
        },
        ...steps,
      ]);
      if (parsed.tag === "invalid") throw new Error(parsed.message);
      await expect(replayMcpExchanges(parsed.value.exchanges)).resolves.toBe(2);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});

function toolCall(
  seq: number,
  id: number,
  name: string,
  args: Readonly<Record<string, unknown>>,
): McpTranscriptStep {
  return {
    seq,
    direction: "client->server",
    message: {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    },
  };
}

function toolResult(
  seq: number,
  id: number,
  result: unknown,
): McpTranscriptStep {
  return {
    seq,
    direction: "server->client",
    message: { jsonrpc: "2.0", id, result },
  };
}
