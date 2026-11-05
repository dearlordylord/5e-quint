import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { combatantId } from "@dnd/battle-runtime";
import { Result, Schema } from "effect";
import { expect, it } from "vitest";
import {
  magicMissileUnitId,
  spellTargetId,
} from "../../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { PlaySessionIdSchema } from "../play-session.ts";
import { createDndMcpProtocolServer } from "../protocol-server.ts";
import { ChatGptBattleGuidanceSchema } from "./battle-guidance-schema.ts";

const GuidanceResponse = Schema.Struct({
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});
const ResolutionResponse = Schema.Struct({
  operation: Schema.Struct({ result: BattleResolutionOutputSchema }),
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});

it("publishes allocation-ordered damage groups and resolves preserved faces through MCP", async () => {
  const secondTargetId = combatantId("synthetic-second-allocation-target");
  const session = spellBattle({
    preparedSpells: [spellRecord(magicMissileUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    extraTargetIds: [secondTargetId],
    targetHp: 50,
    targetMaxHp: 50,
    extraTargetHp: 50,
    extraTargetMaxHp: 50,
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    toolSurface: "chatgpt",
    requestIdentity: { tag: "localProcess" },
  });
  const client = new Client({
    name: "allocated-dice-contract",
    version: "0.1.0",
  });
  try {
    await host.server.connect(serverTransport);
    await client.connect(clientTransport);
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
    const discovery = await client.callTool({
      name: "read_battle_state",
      arguments: { playSessionId },
    });
    const guidance = Schema.decodeUnknownSync(GuidanceResponse)(
      discovery.structuredContent,
    ).chatGptBattleOperations;
    if (guidance.kind !== "acts") throw new Error("Expected current Acts");
    const act = guidance.acts.find(
      (candidate) =>
        candidate.kind === "ready" && candidate.label.includes("Magic Missile"),
    );
    if (act?.kind !== "ready") throw new Error("Expected allocated spell Act");
    const selected = await client.callTool({
      name: act.readyCalls[0].tool,
      arguments: { playSessionId, ...act.readyCalls[0].arguments },
    });
    const selectedResult = Schema.decodeUnknownSync(ResolutionResponse)(
      selected.structuredContent,
    );
    const frontier = selectedResult.operation.result.envelope.frontier;
    if (frontier.kind !== "holes")
      throw new Error("Expected allocation request");
    const allocation = frontier.holes.find(
      (hole) => hole.kind === "spellTargetAllocation",
    );
    if (!allocation) throw new Error("Expected allocated targets");
    const allocated = await client.callTool({
      name: "provide_battle_input",
      arguments: {
        playSessionId,
        fill: {
          kind: allocation.kind,
          holeId: allocation.holeId,
          value: {
            allocations: [
              { targetId: spellTargetId, count: 2 },
              { targetId: secondTargetId, count: 1 },
            ],
          },
          spatialFacts: [spellTargetId, secondTargetId].map((targetId) => ({
            kind: "spellTarget",
            casterId: allocation.spellTargetSpatialFactRequest.casterId,
            targetId,
            sourceProcedureRef: allocation.sourceProcedureRef,
            distanceFeet: 30,
          })),
        },
      },
    });
    const pending = Schema.decodeUnknownSync(ResolutionResponse)(
      allocated.structuredContent,
    );
    if (pending.chatGptBattleOperations.kind !== "ordinaryContinuation")
      throw new Error("Expected damage continuation");
    expect(pending.operation.result.envelope.frontier).toMatchObject({
      kind: "holes",
      holes: [
        {
          allocatedDamageDice: {
            groups: [
              { targetId: spellTargetId, dice: 2, dieSize: 4 },
              { targetId: secondTargetId, dice: 1, dieSize: 4 },
            ],
          },
        },
      ],
    });
    const damage = pending.chatGptBattleOperations.inputs[0];
    if (!damage) throw new Error("Expected current damage schema");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(damage.fillSchema, "allocated damage fill"),
    );
    const fill = {
      kind: "rolledDice",
      holeId: damage.holeId,
      value: [{ results: [1, 2] }, { results: [2] }],
    };
    const merged = { ...fill, value: [{ results: [1, 2, 2] }] };
    const refused = await client.callTool({
      name: "provide_battle_input",
      arguments: { playSessionId, fill: merged },
    });
    expect(JSON.stringify(refused)).toContain(
      "Repeated spell damage dice groups must match",
    );
    expect(validate(merged).valid).toBe(false);
    expect(
      validate({ ...fill, value: [{ results: [1] }, { results: [2, 2] }] })
        .valid,
    ).toBe(false);
    expect(
      validate({ ...fill, value: [{ results: [1, 5] }, { results: [2] }] })
        .valid,
    ).toBe(false);
    expect(validate(fill).valid).toBe(true);
    for (const extraChoice of [
      {
        attackDamageDieFloorChoice: {
          procedureRef: allocation.sourceProcedureRef,
          selection: "apply",
        },
      },
      {
        attackDamageAbilityModifierChoice: {
          procedureRef: allocation.sourceProcedureRef,
          selection: "apply",
        },
      },
      {
        spellDamageReroll: {
          kind: "reroll",
          effectKind: "damage_dice_reroll",
          dice: [{ original: 1, replacement: 4 }],
        },
      },
    ]) {
      const unsupported = { ...fill, ...extraChoice };
      const rejected = await client.callTool({
        name: "provide_battle_input",
        arguments: { playSessionId, fill: unsupported },
      });
      expect(JSON.stringify(rejected)).toContain(
        "not available for this damage-roll owner",
      );
      const read = await client.callTool({
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      const unchanged = Schema.decodeUnknownSync(
        Schema.Struct({
          operation: Schema.Struct({ result: BattleSessionOutputSchema }),
        }),
      )(read.structuredContent).operation.result;
      expect(unchanged.envelope?.checkpoint).toEqual(
        pending.operation.result.envelope.checkpoint,
      );
      expect(validate(unsupported).valid).toBe(false);
    }
    expect(
      validate({ ...fill, selectedAttackDamageRiderProcedureRefs: [] }).valid,
    ).toBe(true);
    const resolved = await client.callTool({
      name: "provide_battle_input",
      arguments: { playSessionId, fill },
    });
    const completed = Schema.decodeUnknownSync(ResolutionResponse)(
      resolved.structuredContent,
    ).operation.result;
    expect(completed.result.tag).toBe("resolved");
    expect(
      completed.envelope.checkpoint.combatants.find(
        (c) => c.combatantId === spellTargetId,
      )?.hp,
    ).toBe(45);
    expect(
      completed.envelope.checkpoint.combatants.find(
        (c) => c.combatantId === secondTargetId,
      )?.hp,
    ).toBe(47);
  } finally {
    await Promise.allSettled([client.close(), host.server.close()]);
  }
});
