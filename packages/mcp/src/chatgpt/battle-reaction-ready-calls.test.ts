import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  combatantId,
  settleBattleRuntimeTransaction,
} from "@dnd/battle-runtime";
import {
  battleId,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  goblinScimitarHitReactionSetup,
  wizardSpellcasting,
  spellRecord,
  fighterId,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  reactionModifierUnitRef,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { createDndMcpProtocolServer } from "../protocol-server.ts";
import { BattleResolutionOutputSchema } from "../battle-tool-output.ts";
import { PlaySessionIdSchema } from "../play-session.ts";
import { ChatGptBattleGuidanceSchema } from "./battle-guidance-schema.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";

const ResponseSchema = Schema.Struct({
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});
const HandleSchema = Schema.Struct({ playSessionId: PlaySessionIdSchema });

async function pendingShield(includeSecondResponder = false) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    toolSurface: "chatgpt",
    requestIdentity: { tag: "localProcess" },
  });
  const client = new Client({
    name: "synthetic-reaction-calls",
    version: "0.1.0",
  });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  const created = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  const { playSessionId } = Schema.decodeUnknownSync(HandleSchema)(
    created.structuredContent,
  );
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-ready-call-battle"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        initiative: 10,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("shield")],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        }),
      }),
      ...(includeSecondResponder
        ? [
            characterSeed({
              combatantId: combatantId("synthetic-second-responder"),
              displayName: "Synthetic second responder",
              initiative: 5,
              classLevels: [{ className: "bard", level: 3 }],
              resources: [
                cuttingWordsResource({ unit: cuttingWordsAttackOnlyUnit() }),
              ],
              characterUnitRefs: [
                {
                  ...reactionModifierUnitRef(cuttingWordsAttackOnlyUnit().id),
                  unit: cuttingWordsAttackOnlyUnit(),
                },
              ],
            }),
          ]
        : []),
    ],
  });
  const setup = goblinScimitarHitReactionSetup(session.state);
  const installed = await host.playSessions.run(
    playSessionId,
    { tag: "localProcess" },
    (root) => {
      expect(
        Result.isSuccess(root.sessionStore.storeActiveBattle(session)),
      ).toBe(true);
      const outer = settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: setup.subject,
          fills: setup.prefixFills,
        },
      });
      expect(outer.tag).toBe("needsHoles");
      expect(
        Result.isSuccess(
          root.sessionStore.storeBattleTransactionResult(session, outer),
        ),
      ).toBe(true);
    },
  );
  expect(Result.isSuccess(installed)).toBe(true);
  async function snapshot() {
    const result = await host.playSessions.run(
      playSessionId,
      { tag: "localProcess" },
      (root) => root.sessionStore.snapshot(),
    );
    if (Result.isFailure(result)) throw new Error("Expected saved session.");
    return result.success.value;
  }
  async function reactor() {
    const result = await host.playSessions.run(
      playSessionId,
      { tag: "localProcess" },
      (root) =>
        root.sessionStore.battleSession?.state.combatants.get(fighterId),
    );
    if (Result.isFailure(result) || result.success.value === undefined)
      throw new Error("Expected responder.");
    return result.success.value;
  }
  async function read() {
    const result = await client.callTool({
      name: "read_battle_state",
      arguments: { playSessionId },
    });
    const guidance = Schema.decodeUnknownSync(ResponseSchema)(
      result.structuredContent,
    ).chatGptBattleOperations;
    if (guidance.kind !== "reactionDecision")
      throw new Error("Expected pending Reaction guidance.");
    return guidance;
  }
  return {
    client,
    host,
    playSessionId,
    snapshot,
    reactor,
    read,
    close: () => Promise.allSettled([client.close(), host.server.close()]),
  };
}

describe("copying published Reaction calls through MCP", () => {
  it("returns a separate decline for every responder without fabricating modifier rolls", async () => {
    const session = await pendingShield(true);
    try {
      const guidance = await session.read();
      expect(
        guidance.choices.some(
          (choice) => choice.selection.kind === "reactionModifier",
        ),
      ).toBe(true);
      const declines = guidance.readyCalls.filter(
        (call) => call.tool === "decline_reaction",
      );
      expect(
        declines.map((call) => call.arguments.fill.value.responderId).sort(),
      ).toEqual([fighterId, "synthetic-second-responder"].sort());
      expect(
        guidance.readyCalls.some((call) => call.tool === "reduce_attack_roll"),
      ).toBe(false);
      const second = declines.find(
        (call) =>
          call.arguments.fill.value.responderId ===
          "synthetic-second-responder",
      );
      if (second === undefined)
        throw new Error("Expected the second responder's decline.");
      const accepted = await session.client.callTool({
        name: second.tool,
        arguments: {
          ...second.arguments,
          playSessionId: session.playSessionId,
        },
      });
      expect(accepted.isError, JSON.stringify(accepted)).not.toBe(true);
      const retained = await session.read();
      expect(
        retained.readyCalls
          .filter((call) => call.tool === "decline_reaction")
          .map((call) => call.arguments.fill.value.responderId),
      ).toEqual([fighterId]);
    } finally {
      await session.close();
    }
  });
  for (const tool of ["decline_reaction", "cast_spell"] as const) {
    it(`executes the returned ${tool} call unchanged after adding the session handle`, async () => {
      const session = await pendingShield();
      try {
        const guidance = await session.read();
        const selected = guidance.readyCalls.find((call) => call.tool === tool);
        if (selected === undefined)
          throw new Error(`Expected returned ${tool} call.`);
        const advertised = (await session.client.listTools()).tools.find(
          (entry) => entry.name === selected.tool,
        );
        const validate = createDraft2020JsonSchemaValidator().getValidator(
          requireJsonSchema(
            advertised?.inputSchema,
            "advertised Reaction tool",
          ),
        );
        const args = {
          ...selected.arguments,
          playSessionId: session.playSessionId,
        };
        expect(validate(args).valid).toBe(true);
        const before = await session.snapshot();
        const malformed = await session.client.callTool({
          name: selected.tool,
          arguments: {
            ...args,
            subject: { tag: "action", action: "dodge", actorId: fighterId },
          },
        });
        expect(malformed.isError).toBe(true);
        expect(await session.snapshot()).toEqual(before);
        expect(await session.read()).toEqual(guidance);
        const beforeReactor = await session.reactor();
        const accepted = await session.client.callTool({
          name: selected.tool,
          arguments: args,
        });
        expect(accepted.isError, JSON.stringify(accepted)).not.toBe(true);
        const afterReactor = await session.reactor();
        expect(
          afterReactor.activeEffects.length -
            beforeReactor.activeEffects.length,
        ).toBe(tool === "decline_reaction" ? 0 : 1);
        expect(afterReactor.reactionAvailable).toBe(
          tool === "decline_reaction",
        );
        if (
          beforeReactor.origin.kind !== "character" ||
          afterReactor.origin.kind !== "character"
        )
          throw new Error("Expected character spell slots.");
        expect(beforeReactor.origin.spellcasting?.spellSlots[0]?.expended).toBe(
          0,
        );
        expect(afterReactor.origin.spellcasting?.spellSlots[0]?.expended).toBe(
          tool === "decline_reaction" ? 0 : 1,
        );
        expect(accepted.structuredContent).toMatchObject({
          chatGptBattleOperations: { kind: "ordinaryContinuation" },
        });
        const continued = await session.snapshot();
        const stale = await session.client.callTool({
          name: selected.tool,
          arguments: args,
        });
        expect(stale.isError).toBe(true);
        expect(await session.snapshot()).toEqual(continued);
        const fresh = await session.client.callTool({
          name: "read_battle_state",
          arguments: { playSessionId: session.playSessionId },
        });
        expect(fresh.structuredContent).toMatchObject({
          chatGptBattleOperations: { kind: "ordinaryContinuation" },
        });
        const continuation = Schema.decodeUnknownSync(
          Schema.Struct({
            operation: Schema.Struct({ result: BattleResolutionOutputSchema }),
          }),
        )(accepted.structuredContent).operation.result;
        if (continuation.envelope.frontier.kind !== "holes")
          throw new Error("Expected ordinary damage input.");
        const damage = continuation.envelope.frontier.holes.find(
          (hole) => hole.kind === "rolledDice",
        );
        if (damage === undefined)
          throw new Error("Expected an attack damage roll.");
        const completed = await session.client.callTool({
          name: "provide_battle_input",
          arguments: {
            playSessionId: session.playSessionId,
            fill: {
              kind: "rolledDice",
              holeId: damage.holeId,
              value: [{ results: [3] }],
            },
          },
        });
        expect(completed.isError, JSON.stringify(completed)).not.toBe(true);
        expect(completed.structuredContent).toMatchObject({
          chatGptBattleOperations: { kind: "acts" },
        });
        expect((await session.reactor()).hp).toBe(beforeReactor.hp - 5);
      } finally {
        await session.close();
      }
    });
  }
});
