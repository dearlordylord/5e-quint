import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { characterDraftId } from "@dnd/character-creation-runtime";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS } from "../../../scripts/shared-host-test-policy.mjs";
import {
  acceptancePlaySessionId,
  acceptancePlaySessionRoutedArgs,
  createAndFinalizeElfWizardFiveWithCounterspell,
  retainAcceptancePlaySessionAccess,
  statBlockCombatant,
} from "../test-support/mcp-acceptance-scenarios.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "./battle-tool-output.ts";
import { ChatGptBattleGuidanceSchema } from "./chatgpt/battle-guidance-schema.ts";
import { decodePrincipalId } from "./play-session-access.ts";
import { PlaySessionIdSchema } from "./play-session.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import { characterIdFromDraftId } from "./session-store.ts";

const reportedIncompleteArea = {
  originAnchorId: "g1",
  affectedTargetIds: ["g1", "g2", "g3", "g4"],
};
const representativeOutcomes = reportedIncompleteArea.affectedTargetIds.map(
  (targetId) => ({ targetId, succeeded: false, withoutRoll: true }),
);
const BattleReadSchema = Schema.Struct({
  operation: Schema.Struct({ result: BattleSessionOutputSchema }),
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});
const BattleExecutionSchema = Schema.Struct({
  operation: Schema.Struct({ result: BattleResolutionOutputSchema }),
  chatGptBattleOperations: ChatGptBattleGuidanceSchema,
});

function openRepository(path: string) {
  const opened = openSqlitePlaySessionRepository(path);
  if (Result.isFailure(opened)) throw new Error(opened.failure.message);
  return opened.success;
}

async function connect(
  repository: ReturnType<typeof openRepository>,
  toolSurface: "regular" | "chatgpt",
) {
  const principal = decodePrincipalId("principal:fireball-fragment-test");
  if (Result.isFailure(principal)) throw new Error(principal.failure);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    playSessionRepository: repository,
    toolSurface,
    requestIdentity: { tag: "authenticated", principalId: principal.success },
  });
  const client = new Client({
    name: "fireball-fragment-test",
    version: "0.1.0",
  });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    async call(name: string, args: Record<string, unknown>) {
      const result = await client.callTool({
        name,
        arguments: await acceptancePlaySessionRoutedArgs(client, name, args),
      });
      expect(result.isError, `${name}: ${JSON.stringify(result)}`).not.toBe(
        true,
      );
      return result.structuredContent;
    },
    async close() {
      await Promise.allSettled([client.close(), host.server.close()]);
    },
  };
}

function retainedRecord(
  repository: ReturnType<typeof openRepository>,
  playSessionId: typeof PlaySessionIdSchema.Type,
) {
  const loaded = repository.load(playSessionId);
  if (Result.isFailure(loaded)) throw new Error(loaded.failure.message);
  if (loaded.success.tag !== "found")
    throw new Error("Expected saved history.");
  return loaded.success.record;
}

test(
  "recovers the reported incomplete Fireball area and dice-only suffix with a representative encounter",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-fireball-fragment-"));
    const databasePath = join(directory, "play-sessions.sqlite");
    try {
      const repository = openRepository(databasePath);
      const creation = await connect(repository, "regular");
      const draftId = "synthetic-fireball-fragment-wizard";
      const playSessionId = await acceptancePlaySessionId(creation.client);
      const retainedId =
        Schema.decodeUnknownSync(PlaySessionIdSchema)(playSessionId);
      try {
        await createAndFinalizeElfWizardFiveWithCounterspell(
          creation.client,
          draftId,
        );
      } finally {
        await creation.close();
      }
      const encounter = await connect(repository, "chatgpt");
      retainAcceptancePlaySessionAccess(encounter.client, { playSessionId });
      const suspended = await (async () => {
        try {
          const started = Schema.decodeUnknownSync(BattleReadSchema)(
            await encounter.call("start_battle", {
              playSessionId,
              battleId: "synthetic-production-fireball-fragment",
              initiativeMode: "direct",
              companionAdmissions: [],
              initialCombatants: [
                {
                  kind: "characterSession",
                  characterId: characterIdFromDraftId(
                    characterDraftId(draftId),
                  ),
                  combatantId: "synthetic-wizard",
                  initiative: 20,
                  ammunitionStocks: [],
                },
                ...Array.from({ length: 8 }, (_, index) =>
                  statBlockCombatant(
                    `g${index + 1}`,
                    "stat_block_goblin_warrior",
                    10 - index,
                    [{ ammunition: "arrow", remaining: 20 }],
                  ),
                ),
              ],
            }),
          );
          const frontier = started.operation.result.envelope?.frontier;
          if (frontier?.kind !== "acts")
            throw new Error("Expected spell Acts.");
          const fireball = frontier.acts.find(
            (act) =>
              act.presentation.kind === "spell" &&
              act.presentation.invocation.spellId === "fireball",
          );
          if (fireball === undefined)
            throw new Error("Expected prepared Fireball.");
          const selected = Schema.decodeUnknownSync(BattleExecutionSchema)(
            await encounter.call("cast_spell", {
              playSessionId,
              subject: fireball.subject,
            }),
          );
          const spellFrontier = selected.operation.result.envelope.frontier;
          if (spellFrontier.kind !== "holes")
            throw new Error("Expected spell input.");
          const saveHole = spellFrontier.holes.find(
            (hole) => hole.kind === "savingThrowOutcome",
          );
          if (saveHole === undefined)
            throw new Error("Expected Saving Throw input.");
          const incompleteFill = {
            kind: "savingThrowOutcome",
            holeId: saveHole.holeId,
            value: {
              area: reportedIncompleteArea,
              outcomes: representativeOutcomes,
            },
          };
          const before = retainedRecord(repository, retainedId);
          const rejected = Schema.decodeUnknownSync(BattleExecutionSchema)(
            await encounter.call("provide_battle_input", {
              playSessionId,
              fill: incompleteFill,
            }),
          );
          expect(rejected.operation.result.result).toMatchObject({
            tag: "invalid",
            reason: "invalidFill",
          });
          expect(rejected.operation.result.envelope.checkpoint).toEqual(
            selected.operation.result.envelope.checkpoint,
          );
          const after = retainedRecord(repository, retainedId);
          expect(after.operations).toHaveLength(before.operations.length + 1);
          expect(after.operations.at(-1)).toEqual({
            toolSurface: "chatgpt",
            name: "provide_battle_input",
            args: { fill: incompleteFill },
          });
          await encounter.call("roll_dice", {
            playSessionId,
            groups: [{ dice: 8, dieSize: 6 }],
          });
          await encounter.call("roll_dice", {
            playSessionId,
            groups: [{ dice: 8, dieSize: 6 }],
          });
          const afterDice = Schema.decodeUnknownSync(BattleReadSchema)(
            await encounter.call("read_battle_state", { playSessionId }),
          );
          expect(afterDice.operation.result.envelope).toEqual(
            rejected.operation.result.envelope,
          );
          expect(
            retainedRecord(repository, retainedId)
              .operations.slice(-3)
              .map((command) => command.name),
          ).toEqual(["provide_battle_input", "roll_dice", "roll_dice"]);
          return { envelope: rejected.operation.result.envelope, saveHole };
        } finally {
          await encounter.close();
          repository.close();
        }
      })();
      const recoveredRepository = openRepository(databasePath);
      const recovered = await connect(recoveredRepository, "chatgpt");
      retainAcceptancePlaySessionAccess(recovered.client, { playSessionId });
      try {
        const read = Schema.decodeUnknownSync(BattleReadSchema)(
          await recovered.call("read_battle_state", { playSessionId }),
        );
        expect(read.operation.result.envelope).toEqual(suspended.envelope);
        const guidance = read.chatGptBattleOperations;
        if (guidance.kind !== "ordinaryContinuation")
          throw new Error("Expected spell continuation.");
        const request = guidance.areaInputs.find(
          (area) => area.holeId === suspended.saveHole.holeId,
        );
        expect(request?.instructions.join(" ")).toContain(
          "objectIgnitionFacts: []",
        );
        expect(suspended.saveHole).toMatchObject({
          areaInput: { kind: "pointOriginSphereSaveDamageArea" },
        });
        const save = Schema.decodeUnknownSync(BattleExecutionSchema)(
          await recovered.call("provide_battle_input", {
            playSessionId,
            fill: {
              kind: "savingThrowOutcome",
              holeId: suspended.saveHole.holeId,
              value: {
                area: {
                  ...reportedIncompleteArea,
                  kind: "pointOriginSphereSaveDamageArea",
                  objectIgnitionFacts: [],
                },
                outcomes: representativeOutcomes,
              },
            },
          }),
        );
        const damageFrontier = save.operation.result.envelope.frontier;
        if (damageFrontier.kind !== "holes")
          throw new Error("Expected damage input.");
        const damage = damageFrontier.holes.find(
          (hole) => hole.kind === "rolledDice",
        );
        if (damage === undefined)
          throw new Error("Expected damage dice input.");
        const resolved = Schema.decodeUnknownSync(BattleExecutionSchema)(
          await recovered.call("provide_battle_input", {
            playSessionId,
            fill: {
              kind: "rolledDice",
              holeId: damage.holeId,
              value: [{ results: [4, 4, 4, 4, 4, 4, 4, 4] }],
            },
          }),
        );
        expect(resolved.operation.result.result.tag).toBe("resolved");
        expect(resolved.chatGptBattleOperations.kind).toBe("acts");
        const combatants =
          resolved.operation.result.envelope.checkpoint.combatants;
        expect(
          combatants
            .filter((combatant) =>
              reportedIncompleteArea.affectedTargetIds.includes(
                combatant.combatantId,
              ),
            )
            .map((combatant) => combatant.hp),
        ).toEqual([0, 0, 0, 0]);
        const unaffectedHitPoints = (
          checkpoint: typeof suspended.envelope.checkpoint,
        ) =>
          checkpoint.combatants
            .filter(
              (combatant) =>
                !reportedIncompleteArea.affectedTargetIds.includes(
                  combatant.combatantId,
                ),
            )
            .map(({ combatantId, hp }) => ({ combatantId, hp }));
        expect(
          unaffectedHitPoints(resolved.operation.result.envelope.checkpoint),
        ).toEqual(unaffectedHitPoints(suspended.envelope.checkpoint));
        const caster = combatants.find(
          (combatant) => combatant.combatantId === "synthetic-wizard",
        );
        if (caster?.origin.kind !== "character")
          throw new Error("Expected caster.");
        expect(
          caster.origin.spellcasting?.spellSlots.find(
            (slot) => slot.spellLevel === 3,
          )?.expended,
        ).toBe(1);
      } finally {
        await recovered.close();
        recoveredRepository.close();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
  SHARED_HOST_TEST_TIMEOUT_MILLISECONDS,
);
