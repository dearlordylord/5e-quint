import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  canonicalJson,
  isMcpTranscriptStep,
  mcpToolExchanges,
  parseScriptedTranscript,
  sha256Canonical,
  type McpTranscriptStep,
} from "./transcript.ts";

describe("RAW swarm transcript canonicalization", () => {
  test("round-trips JSON values and is idempotent", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const encoded = canonicalJson(value);
        const decoded: unknown = JSON.parse(encoded);

        expect(decoded).toEqual(value);
        expect(canonicalJson(decoded)).toBe(encoded);
      }),
      { numRuns: 200 },
    );
  });

  test("hashes objects independently of insertion order", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.jsonValue()), (record) => {
        const reversed = Object.fromEntries(Object.entries(record).reverse());
        expect(sha256Canonical(reversed)).toBe(sha256Canonical(record));
      }),
      { numRuns: 200 },
    );
  });

  test("pairs recorded MCP calls with their responses", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.jsonValue(), (args, response) => {
        const parsed = mcpToolExchanges([
          {
            seq: 4,
            direction: "client->server",
            message: {
              jsonrpc: "2.0",
              id: 9,
              method: "tools/call",
              params: { name: "example_tool", arguments: args },
            },
          },
          {
            seq: 5,
            direction: "server->client",
            message: { jsonrpc: "2.0", id: 9, result: response },
          },
        ]);

        expect(parsed).toEqual({
          tag: "valid",
          exchanges: [
            {
              seq: 4,
              tool: "example_tool",
              args,
              response,
              responseSha256: sha256Canonical(response),
            },
          ],
        });
      }),
      { numRuns: 200 },
    );
  });

  test("rejects duplicate pending JSON-RPC ids", () => {
    const call = (seq: number, name: string): McpTranscriptStep => ({
      seq,
      direction: "client->server",
      message: {
        id: 7,
        method: "tools/call",
        params: { name, arguments: {} },
      },
    });
    expect(mcpToolExchanges([call(1, "first"), call(2, "second")])).toEqual({
      tag: "invalid",
      message: "Duplicate pending JSON-RPC id 7 at seq 2",
    });
  });

  test("rejects records that claim both parsed and unparsed payloads", () => {
    expect(
      isMcpTranscriptStep({
        seq: 1,
        direction: "client->server",
        message: { jsonrpc: "2.0" },
        unparsed: true,
        raw: "not json",
      }),
    ).toBe(false);
  });

  test("requires a first scripted header and strictly increasing sequence", () => {
    const response = { tag: "resolved" };
    const step = {
      seq: 1,
      tool: "example",
      args: {},
      response,
      responseSha256: sha256Canonical(response),
    };
    const header = {
      type: "header",
      scenarioId: "probe",
      kind: "scripted-probe",
      rawCitations: [],
      gitSha: "0123456789abcdef",
      startedAt: "2026-08-11T00:00:00.000Z",
    };

    expect(parseScriptedTranscript([step])).toMatchObject({ tag: "invalid" });
    expect(
      parseScriptedTranscript([header, step, { ...step, tool: "duplicate" }]),
    ).toEqual({
      tag: "invalid",
      message: "Transcript seq 1 must be a positive integer greater than 1",
    });
    expect(
      parseScriptedTranscript([header, { ...step, seq: 2 }, step]),
    ).toEqual({
      tag: "invalid",
      message: "Transcript seq 1 must be a positive integer greater than 2",
    });
  });
});
