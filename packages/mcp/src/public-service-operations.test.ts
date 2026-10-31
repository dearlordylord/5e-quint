import { describe, expect, test } from "vitest";
import { Result, Schema } from "effect";

import {
  battleId,
  characterSeed,
  fighterAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "./battle-tool-output.ts";
import {
  CHATGPT_EXECUTION_TOOLS,
  chatGptExecutionToolDefinitions,
} from "./chatgpt/tool-surface.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import { buildAdvertisedToolDefinitions } from "./protocol-server.ts";

import {
  publicMcpHttpMethod,
  publicMcpOutcome,
  publicMcpToolName,
} from "./public-service-operations.ts";

describe("public MCP operational projection", () => {
  test("retains every advertised tool name from both surfaces without reading arguments", async () => {
    const names = new Set([
      ...buildAdvertisedToolDefinitions().map(({ name }) => name),
      ...buildAdvertisedToolDefinitions(
        chatGptExecutionToolDefinitions,
        "hosted",
        "chatgpt",
      ).map(({ name }) => name),
    ]);
    for (const name of names) {
      await expect(
        publicMcpToolName(
          new Request("https://oracle.example.test/mcp", {
            method: "POST",
            body: JSON.stringify({
              method: "tools/call",
              params: { name, arguments: { private: "never-log-this" } },
            }),
          }),
        ),
      ).resolves.toBe(name);
    }
  });

  test("omits arbitrary tool names", async () => {
    await expect(
      publicMcpToolName(
        new Request("https://oracle.example.test/mcp", {
          method: "POST",
          body: JSON.stringify({
            method: "tools/call",
            params: { name: "private-session-name" },
          }),
        }),
      ),
    ).resolves.toBeUndefined();
  });

  test("bounds attacker-controlled HTTP methods", () => {
    expect(publicMcpHttpMethod("GET")).toBe("GET");
    expect(publicMcpHttpMethod("POST")).toBe("POST");
    expect(publicMcpHttpMethod("SYNTHETIC-UNBOUNDED-METHOD")).toBe("OTHER");
  });

  test("projects typed limit diagnostics without retaining result content", async () => {
    await expect(
      publicMcpOutcome(
        Response.json({
          result: {
            isError: true,
            structuredContent: {
              details: {
                code: "PLAY_SESSION_LIMIT_EXCEEDED",
                reason: "requestRateExceeded",
                privateContent: "must-not-be-projected",
              },
            },
          },
        }),
      ),
    ).resolves.toEqual({
      outcome: "limited",
      diagnostic: {
        code: "PLAY_SESSION_LIMIT_EXCEEDED",
        reason: "requestRateExceeded",
      },
    });
    await expect(
      publicMcpOutcome(
        Response.json({
          result: {
            isError: false,
            structuredContent: {
              code: "USER_AUTHORED_VALUE",
              reason: "privateReason",
              nested: { isError: true },
            },
          },
        }),
      ),
    ).resolves.toEqual({ outcome: "accepted" });
  });

  test("recognizes direct and Play Session error payloads without exposing prose", async () => {
    const failure = errorContent("private failure message", {
      code: "INVALID_ARGUMENTS",
      reason: "private-unbounded-reason",
      playSessionId: "private-session-id",
      arguments: { private: "private-arguments" },
    });
    const payload = jsonContentPayload(failure);
    for (const result of [
      failure,
      {
        isError: true,
        structuredContent: {
          tag: "playSessionAvailable",
          playSessionId: "private-session-id",
          operation: { name: "attack", result: payload },
        },
      },
      {
        isError: true,
        structuredContent: {
          tag: "playSessionAvailable",
          operation: {
            name: "attack",
            result: { result: payload, battleEnvelope: {} },
          },
        },
      },
    ]) {
      const outcome = await publicMcpOutcome(Response.json({ result }));
      expect(outcome).toEqual({
        outcome: "rejected",
        diagnostic: { code: "INVALID_ARGUMENTS", reason: "unspecified" },
      });
      expect(JSON.stringify(outcome)).not.toContain("private");
    }
  });

  test("uses structured content exclusively and never scans multiple text blocks", async () => {
    const failure = errorContent("private-message", {
      code: "INVALID_ARGUMENTS",
    });
    for (const result of [
      { ...failure, structuredContent: { private: "unrecognized" } },
      { ...failure, content: [...failure.content, ...failure.content] },
      { isError: true, content: [{ type: "text", text: "private-non-json" }] },
    ]) {
      await expect(
        publicMcpOutcome(Response.json({ result })),
      ).resolves.toEqual({
        outcome: "rejected",
        diagnostic: { code: "TOOL_REJECTED", reason: "unspecified" },
      });
    }
  });

  test("observes a real invalid Battle fill even when MCP isError is absent", async () => {
    const { pending, invalid } = battleRejectionResults();
    expect("isError" in invalid && invalid.isError).not.toBe(true);
    const payload = jsonContentPayload(invalid);
    const decoded = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      payload,
    );
    expect(decoded.result.tag).toBe("invalid");
    for (const structuredContent of [
      payload,
      {
        tag: "playSessionAvailable",
        operation: { name: "provide_battle_input", result: payload },
      },
    ]) {
      await expect(
        publicMcpOutcome(Response.json({ result: { structuredContent } })),
      ).resolves.toEqual({
        outcome: "rejected",
        diagnostic: { code: "TOOL_REJECTED", reason: "invalidFill" },
      });
    }
    await expect(
      publicMcpOutcome(
        Response.json({
          result: { structuredContent: jsonContentPayload(pending) },
        }),
      ),
    ).resolves.toEqual({ outcome: "accepted" });
  });

  test("keeps a real resolved Battle result accepted", async () => {
    const { root } = operationalBattle();
    const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
      ),
    );
    if (discovery.envelope?.frontier.kind !== "acts")
      throw new Error("Expected Battle Acts.");
    const act = discovery.envelope.frontier.acts.find(
      ({ subject }) => subject.tag === "action" && subject.action === "dodge",
    );
    if (act === undefined) throw new Error("Expected the Dodge Act.");
    const resolved = CHATGPT_EXECUTION_TOOLS.dodge.handle(root, {
      subject: act.subject,
    });
    const payload = jsonContentPayload(resolved);
    expect(
      Schema.decodeUnknownSync(BattleResolutionOutputSchema)(payload).result
        .tag,
    ).toBe("resolved");
    await expect(
      publicMcpOutcome(
        Response.json({ result: { ...resolved, structuredContent: payload } }),
      ),
    ).resolves.toEqual({ outcome: "accepted" });
  });

  test("does not interpret arbitrary successful result lookalikes as Battle failures", async () => {
    for (const structuredContent of [
      { result: { tag: "invalid", reason: "invalidFill" } },
      {
        tag: "playSessionAvailable",
        operation: {
          name: "query_character_session",
          result: {
            result: { tag: "invalid", reason: "invalidFill" },
            envelope: {},
            session: {},
          },
        },
      },
      { private: { details: { code: "INVALID_ARGUMENTS" } } },
    ]) {
      await expect(
        publicMcpOutcome(Response.json({ result: { structuredContent } })),
      ).resolves.toEqual({ outcome: "accepted" });
    }
  });
});

function battleRejectionResults() {
  const { root, session } = operationalBattle();
  const subject = fighterAttackSubject(session.state);
  const pending = CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject });
  const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
    jsonContentPayload(pending),
  );
  if (selected.envelope.frontier.kind !== "holes")
    throw new Error("Expected attack target request.");
  const target = selected.envelope.frontier.holes.find(
    (hole) => hole.kind === "targetChoice",
  );
  if (target?.kind !== "targetChoice")
    throw new Error("Expected attack target choice.");
  const invalid = CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
    fill: { kind: target.kind, holeId: target.holeId, value: goblinId },
  });
  return { pending, invalid };
}

function operationalBattle() {
  const root = createMcpPlaySessionRoot();
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-operational-rejection"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const stored = root.sessionStore.storeActiveBattle(session);
  if (Result.isFailure(stored)) throw new Error("Expected owned Battle.");
  return { root, session };
}
