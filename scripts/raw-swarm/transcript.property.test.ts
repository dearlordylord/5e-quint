import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";

import {
  canonicalJson,
  currentGitRevision,
  isMcpTranscriptStep,
  mcpToolExchanges,
  parsePlayerTranscript,
  sha256Canonical,
  type McpTranscriptStep,
} from "./transcript.ts";

describe("RAW swarm transcript canonicalization", () => {
  test("reads a SHA only for a clean worktree", () => {
    const cleanRead = vi.fn((args: readonly string[]) =>
      args[0] === "status" ? "" : "a".repeat(40),
    );
    expect(currentGitRevision({ read: cleanRead })).toEqual({
      tag: "clean",
      sha: "a".repeat(40),
    });
    expect(cleanRead).toHaveBeenCalledTimes(2);

    const dirtyRead = vi.fn(() => " M changed.ts");
    expect(currentGitRevision({ read: dirtyRead })).toEqual({ tag: "dirty" });
    expect(dirtyRead).toHaveBeenCalledTimes(1);
  });

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

  test("keeps numeric and string JSON-RPC ids distinct", () => {
    const call = (seq: number, id: number | string, name: string) => ({
      seq,
      direction: "client->server" as const,
      message: {
        id,
        method: "tools/call",
        params: { name, arguments: {} },
      },
    });
    const parsed = mcpToolExchanges([
      call(1, 1, "numeric"),
      call(2, "1", "string"),
      {
        seq: 3,
        direction: "server->client",
        message: { id: "1", result: "string response" },
      },
      {
        seq: 4,
        direction: "server->client",
        message: { id: 1, result: "numeric response" },
      },
    ]);

    expect(parsed).toMatchObject({
      tag: "valid",
      exchanges: [
        { tool: "string", response: "string response" },
        { tool: "numeric", response: "numeric response" },
      ],
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

  test("requires a first player header and strictly increasing MCP records", () => {
    const call = {
      seq: 1,
      direction: "client->server" as const,
      message: {
        id: 1,
        method: "tools/call",
        params: { name: "example", arguments: {} },
      },
    };
    const header = {
      type: "header",
      scenarioId: "probe",
      gitSha: "0".repeat(40),
      startedAt: "2026-08-11T00:00:00.000Z",
    };

    expect(parsePlayerTranscript([call])).toMatchObject({ tag: "invalid" });
    expect(parsePlayerTranscript([{ ...header, unexpected: true }])).toEqual({
      tag: "invalid",
      message: "Player transcript requires one first header",
    });
    expect(
      parsePlayerTranscript([{ ...header, scenarioId: "" }]),
    ).toMatchObject({ tag: "invalid" });
    expect(
      parsePlayerTranscript([{ ...header, gitSha: "not-a-sha" }]),
    ).toMatchObject({ tag: "invalid" });
    expect(
      parsePlayerTranscript([{ ...header, startedAt: "not-a-time" }]),
    ).toMatchObject({ tag: "invalid" });
    expect(parsePlayerTranscript([header, call, { ...call, seq: 1 }])).toEqual({
      tag: "invalid",
      message: "Transcript seq 1 must be a positive integer greater than 1",
    });
    expect(parsePlayerTranscript([header, { ...call, seq: 2 }, call])).toEqual({
      tag: "invalid",
      message: "Transcript seq 1 must be a positive integer greater than 2",
    });
  });

  test("rejects contradictory and incomplete JSON-RPC responses", () => {
    const call: McpTranscriptStep = {
      seq: 1,
      direction: "client->server",
      message: {
        id: 4,
        method: "tools/call",
        params: { name: "example", arguments: {} },
      },
    };
    const response = (message: Readonly<Record<string, unknown>>) =>
      mcpToolExchanges([
        call,
        { seq: 2, direction: "server->client", message: { id: 4, ...message } },
      ]);

    expect(
      response({ result: {}, error: { code: -1, message: "bad" } }),
    ).toEqual({
      tag: "invalid",
      message:
        "JSON-RPC response at seq 2 requires exactly one of result or error",
    });
    expect(response({})).toEqual({
      tag: "invalid",
      message:
        "JSON-RPC response at seq 2 requires exactly one of result or error",
    });
    expect(response({ error: { code: "bad", message: 7 } })).toEqual({
      tag: "invalid",
      message:
        "JSON-RPC error at seq 2 requires integer code and string message",
    });
  });
});
