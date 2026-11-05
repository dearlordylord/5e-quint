import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Effect, Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  characterSeed,
  fighterAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";
import {
  createDndMcpProtocolServer,
  buildCanonicalToolDefinitions,
} from "./protocol-server.ts";
import {
  createDiceSamplingService,
  decodeDiceSeed,
} from "./dice-sampling-service.ts";
import { rollDice } from "./dice-tools.ts";
import { PlaySessionIdSchema } from "./play-session.ts";
import { RollDiceOutputSchema } from "./dice-tool-output.ts";
import { handleToolCall } from "./server.ts";
import { UnresolvedInputSourceSchema } from "./unresolved-input-source.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";

const EnvelopeSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
  operation: Schema.Struct({ result: Schema.JsonObject }),
  unresolvedInputs: Schema.Array(
    Schema.Struct({
      source: UnresolvedInputSourceSchema,
      inputs: Schema.Array(Schema.JsonObject),
    }),
  ),
  nextOperations: Schema.Array(Schema.String),
});

describe("operation-owned dice results", () => {
  for (const toolSurface of ["regular", "chatgpt"] as const) {
    test(`${toolSurface} preserves faces and the result shape across a pending attack`, async () => {
      const seed = decodeDiceSeed([
        "12345678",
        "9abcdef0",
        "13579bdf",
        "2468ace0",
      ]);
      if (Result.isFailure(seed)) throw new Error("Expected test seed");
      const reference = createDiceSamplingService(seed.success);
      const host = createDndMcpProtocolServer(undefined, undefined, {
        toolSurface,
        playSessionDiceSeedFactory: () => seed.success,
      });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const client = new Client({
        name: "dice-result-ownership",
        version: "1",
      });
      try {
        await host.server.connect(serverTransport);
        await client.connect(clientTransport);
        const created = await client.callTool({
          name: "create_play_session",
          arguments: {},
        });
        const { playSessionId } = Schema.decodeUnknownSync(EnvelopeSchema)(
          created.structuredContent,
        );
        const definition = buildCanonicalToolDefinitions(
          undefined,
          "localProcess",
          toolSurface,
        ).find((tool) => tool.name === "roll_dice");
        if (definition?.outputSchema === undefined)
          throw new Error("Expected dice output schema");
        const validate = createDraft2020JsonSchemaValidator().getValidator(
          requireJsonSchema(definition.outputSchema, "dice operation output"),
        );
        const draw = async () => {
          const groups = [{ dice: 2, dieSize: 20 }];
          const response = await client.callTool({
            name: "roll_dice",
            arguments: { playSessionId, groups },
          });
          expect(response.isError).not.toBe(true);
          expect(validate(response.structuredContent).valid).toBe(true);
          const envelope = Schema.decodeUnknownSync(EnvelopeSchema)(
            response.structuredContent,
          );
          const faces = Schema.decodeUnknownSync(RollDiceOutputSchema)(
            envelope.operation.result,
          );
          expect(faces).toEqual(
            rollDice(Effect.runSync(reference.sample(groups))),
          );
          expect(Object.keys(envelope.operation.result)).toEqual(["groups"]);
          expect(JSON.stringify(response.structuredContent)).not.toContain(
            "procedureBindings",
          );
          return { response, envelope };
        };
        await draw();
        const session = startBattleSessionRight({
          battleId: battleId("synthetic-dice-ownership"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({ initiative: 10 }),
          ],
        });
        const subject = fighterAttackSubject(session.state);
        const target = attackInitialTargetHole(session.state, subject);
        const roll = attackRollHoleAfterTarget(
          session.state,
          target,
          subject,
          goblinId,
        );
        const prepared = await host.playSessions.run(
          playSessionId,
          { tag: "localProcess" },
          (root) => {
            expect(
              Result.isSuccess(root.sessionStore.storeActiveBattle(session)),
            ).toBe(true);
            const selected = handleToolCall(root, "fill_battle_hole", {
              subject,
              fill: targetFill(target, goblinId),
            });
            expect("isError" in selected && selected.isError).toBe(false);
            return root.sessionStore.getPendingBattleTransaction();
          },
        );
        expect(Result.isSuccess(prepared)).toBe(true);
        const beforeRead = await host.playSessions.run(
          playSessionId,
          { tag: "localProcess" },
          (root) => root.sessionStore.getPendingBattleTransaction(),
        );
        const pending = await draw();
        expect(pending.envelope.unresolvedInputs).toMatchObject([
          {
            source: { kind: "pendingBattle" },
            inputs: [{ kind: "attackRoll" }],
          },
        ]);
        expect(pending.envelope.nextOperations).toContain(
          toolSurface === "chatgpt"
            ? "provide_battle_input"
            : "fill_battle_hole",
        );
        const resumed = await client.callTool({
          name: "read_play_session",
          arguments: { playSessionId },
        });
        expect(
          JSON.stringify(pending.response.structuredContent).length,
        ).toBeLessThan(JSON.stringify(resumed.structuredContent).length);
        const resumedEnvelope = Schema.decodeUnknownSync(EnvelopeSchema)(
          resumed.structuredContent,
        );
        const afterRead = await host.playSessions.run(
          playSessionId,
          { tag: "localProcess" },
          (root) => root.sessionStore.getPendingBattleTransaction(),
        );
        expect(afterRead).toEqual(beforeRead);
        const invalid = await client.callTool({
          name: "roll_dice",
          arguments: { playSessionId, groups: [] },
        });
        expect(invalid.isError).toBe(true);
        expect(invalid.structuredContent).toMatchObject({
          operation: {
            result: {
              details: { battleEnvelope: { frontier: { kind: "holes" } } },
            },
          },
        });
        const completed = await client.callTool({
          name:
            toolSurface === "chatgpt"
              ? "provide_battle_input"
              : "fill_battle_hole",
          arguments: {
            playSessionId,
            ...(toolSurface === "regular" ? { subject } : {}),
            fill: attackRollFill(roll, { naturalD20: 1, total: 5 }),
          },
        });
        expect(completed.isError).not.toBe(true);
        const finalDraw = await draw();
        expect(finalDraw.envelope.unresolvedInputs).toEqual([]);
        const completeEnvelope = Schema.decodeUnknownSync(Schema.JsonObject)(
          pending.response.structuredContent,
        );
        const completeOperation = Schema.decodeUnknownSync(Schema.JsonObject)(
          completeEnvelope.operation,
        );
        expect(
          validate({ ...completeEnvelope, operation: completeOperation }).valid,
        ).toBe(true);
        expect(
          validate({
            ...completeEnvelope,
            operation: {
              ...completeOperation,
              result: {
                result: pending.envelope.operation.result,
                battleEnvelope: resumedEnvelope.operation.result.battleEnvelope,
              },
            },
          }).valid,
        ).toBe(false);
      } finally {
        await client.close();
        await host.server.close();
      }
    });
  }
});
