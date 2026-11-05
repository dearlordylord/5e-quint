import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { fireballUnitId } from "../../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  battleId,
  characterSeed,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { createDndMcpProtocolServer } from "../protocol-server.ts";
import { PlaySessionIdSchema } from "../play-session.ts";
import { ChatGptBattleGuidanceSchema } from "./battle-guidance-schema.ts";
import type { BattleRuntimeSession } from "@dnd/battle-runtime";

const ResponseSchema = Schema.Struct({
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});
async function withBattle(
  session: BattleRuntimeSession,
  run: (fixture: {
    client: Client;
    playSessionId: typeof PlaySessionIdSchema.Type;
    read: () => Promise<typeof ChatGptBattleGuidanceSchema.Type>;
    snapshot: () => Promise<unknown>;
    createOther: () => Promise<typeof PlaySessionIdSchema.Type>;
  }) => Promise<void>,
) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    toolSurface: "chatgpt",
    requestIdentity: { tag: "localProcess" },
  });
  const client = new Client({ name: "act-key-protocol", version: "0.1.0" });
  try {
    await host.server.connect(serverTransport);
    await client.connect(clientTransport);
    async function createOther() {
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      const { playSessionId } = Schema.decodeUnknownSync(
        Schema.Struct({ playSessionId: PlaySessionIdSchema }),
      )(created.structuredContent);
      const installed = await host.playSessions.run(
        playSessionId,
        { tag: "localProcess" },
        (root) => root.sessionStore.storeActiveBattle(session),
      );
      expect(Result.isSuccess(installed)).toBe(true);
      return playSessionId;
    }
    const playSessionId = await createOther();
    await run({
      client,
      playSessionId,
      createOther,
      async read() {
        const result = await client.callTool({
          name: "read_battle_state",
          arguments: { playSessionId },
        });
        return Schema.decodeUnknownSync(ResponseSchema)(
          result.structuredContent,
        ).chatGptBattleOperations;
      },
      async snapshot() {
        const result = await host.playSessions.run(
          playSessionId,
          { tag: "localProcess" },
          (root) => root.sessionStore.snapshot(),
        );
        if (Result.isFailure(result)) throw new Error("Expected owned session");
        return result.success.value;
      },
    });
  } finally {
    await Promise.allSettled([client.close(), host.server.close()]);
  }
}
function wizardBattle() {
  return spellBattle({
    preparedSpells: [spellRecord(fireballUnitId)],
    casterClassLevels: [{ className: "wizard", level: 5 }],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}
describe("Opaque Act selection through MCP", () => {
  it("copies a short Fireball key, rejects public subjects and foreign keys, and rejects the old key after cancellation", async () => {
    await withBattle(
      wizardBattle(),
      async ({ client, playSessionId, read, snapshot, createOther }) => {
        const guidance = await read();
        if (guidance.kind !== "acts") throw new Error("Expected Acts");
        const offered = guidance.acts.find(
          (act) => act.kind === "ready" && act.label.includes("Fireball"),
        );
        if (offered?.kind !== "ready") throw new Error("Expected Fireball");
        const call = offered.readyCalls.find(
          (call) => call.tool === "cast_spell",
        );
        if (!call) throw new Error("Expected cast_spell");
        expect(call.arguments.actKey).toMatch(/^act:[0-9a-f]{32}$/u);
        expect(JSON.stringify(call.arguments)).not.toContain("procedureRef");
        const before = await snapshot();
        for (const invalid of [
          {
            subject: {
              tag: "actionSpell",
              actorId: "synthetic-caster",
              procedureRef: "invented",
              mode: { tag: "cast" },
            },
          },
          { ...call.arguments, subject: {} },
          { actKey: "act:" + "0".repeat(32) },
        ]) {
          const rejected = await client.callTool({
            name: "cast_spell",
            arguments: { playSessionId, ...invalid },
          });
          expect(JSON.stringify(rejected)).toMatch(
            /INVALID_ARGUMENTS|BATTLE_ACT_KEY_NOT_AVAILABLE/u,
          );
          expect(await snapshot()).toEqual(before);
        }
        const foreignId = await createOther();
        const foreign = await client.callTool({
          name: "cast_spell",
          arguments: { playSessionId: foreignId, ...call.arguments },
        });
        expect(JSON.stringify(foreign)).toContain(
          "BATTLE_ACT_KEY_NOT_AVAILABLE",
        );
        const wrongTool = await client.callTool({
          name: "dash",
          arguments: { playSessionId, ...call.arguments },
        });
        expect(JSON.stringify(wrongTool)).toContain(
          "CHATGPT_TOOL_OPERATION_MISMATCH",
        );
        expect(await snapshot()).toEqual(before);
        const selected = await client.callTool({
          name: call.tool,
          arguments: { playSessionId, ...call.arguments },
        });
        const pending = Schema.decodeUnknownSync(ResponseSchema)(
          selected.structuredContent,
        ).chatGptBattleOperations;
        if (
          pending.kind !== "ordinaryContinuation" ||
          pending.cancellation.kind !== "available"
        )
          throw new Error("Expected cancellable Fireball inputs");
        expect(JSON.stringify(selected)).toContain("savingThrowOutcome");
        const cancelled = await client.callTool({
          name: pending.cancellation.tool,
          arguments: { playSessionId, ...pending.cancellation.arguments },
        });
        expect(cancelled.isError).not.toBe(true);
        expect(await snapshot()).toEqual(before);
        const stale = await client.callTool({
          name: call.tool,
          arguments: { playSessionId, ...call.arguments },
        });
        expect(JSON.stringify(stale)).toContain("BATTLE_ACT_KEY_NOT_AVAILABLE");
        const rediscovered = await read();
        if (rediscovered.kind !== "acts")
          throw new Error("Expected restored Acts");
        const next = rediscovered.acts.find(
          (act) => act.kind === "ready" && act.label.includes("Fireball"),
        );
        if (next?.kind !== "ready")
          throw new Error("Expected current Fireball");
        expect(next.readyCalls[0].arguments.actKey).not.toBe(
          call.arguments.actKey,
        );
        const resumed = await client.callTool({
          name: next.readyCalls[0].tool,
          arguments: { playSessionId, ...next.readyCalls[0].arguments },
        });
        expect(JSON.stringify(resumed)).toContain("savingThrowOutcome");
      },
    );
  });
  it("distinguishes a goblin's melee and ranged keys by canonical summaries", async () => {
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-ready-goblin"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
      ],
    });
    await withBattle(session, async ({ client, playSessionId, read }) => {
      const guidance = await read();
      if (guidance.kind !== "acts") throw new Error("Expected Acts");
      const keys = new Set<string>();
      for (const weapon of ["Scimitar", "Shortbow"]) {
        const act = guidance.acts.find(
          (act) => act.kind === "ready" && act.summary.includes(weapon),
        );
        if (act?.kind !== "ready") throw new Error(`Expected ${weapon}`);
        expect(act.label).toBe("Attack");
        keys.add(act.readyCalls[0].arguments.actKey);
      }
      expect(keys.size).toBe(2);
      const bow = guidance.acts.find(
        (act) => act.kind === "ready" && act.summary.includes("Shortbow"),
      );
      if (bow?.kind !== "ready") throw new Error("Expected bow");
      const result = await client.callTool({
        name: "attack",
        arguments: { playSessionId, ...bow.readyCalls[0].arguments },
      });
      expect(JSON.stringify(result)).toContain("needsHoles");
    });
  });
});
