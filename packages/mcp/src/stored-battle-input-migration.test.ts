import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { characterDraftId } from "@dnd/character-creation-runtime";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
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
import { createMcpApplicationServices } from "./composition-root.ts";
import {
  DICE_RANDOM_SOURCE,
  generatedDiceSeed,
} from "./dice-sampling-service.ts";
import { decodeStoredPlaySessionRecord } from "./play-session-repository.ts";
import { generatedPlaySessionId } from "./play-session.ts";
import { decodePrincipalId } from "./play-session-access.ts";
import { PLAY_SESSION_COMMAND_ADMISSION_VERSION } from "./play-session-command.ts";
import { PlaySessionIdSchema } from "./play-session.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import { rootFromRecord } from "./recoverable-play-session-support.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";
import { migrateStoredBattleInput } from "./stored-battle-input-migration.ts";
import { ChatGptBattleGuidanceSchema } from "./chatgpt/battle-guidance-schema.ts";

function open(path: string) {
  const result = openSqlitePlaySessionRepository(path);
  assert(Result.isSuccess(result));
  return result.success;
}
async function connect(
  repository: ReturnType<typeof open>,
  toolSurface: "regular" | "chatgpt",
) {
  const principal = decodePrincipalId("principal:stored-sphere-migration");
  assert(Result.isSuccess(principal));
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    playSessionRepository: repository,
    toolSurface,
    requestIdentity: { tag: "authenticated", principalId: principal.success },
  });
  const client = new Client({
    name: "stored-sphere-migration",
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
      expect(result.isError, JSON.stringify(result)).not.toBe(true);
      return result.structuredContent;
    },
    async close() {
      await Promise.allSettled([client.close(), host.server.close()]);
    },
  };
}

function isJsonArray(value: Schema.Json): value is Schema.JsonArray {
  return Array.isArray(value);
}

function versionTwoArgs(value: Schema.Json): Schema.Json {
  if (value === null || typeof value !== "object") return value;
  if (isJsonArray(value)) return value.map(versionTwoArgs);
  const object = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, versionTwoArgs(child)]),
  );
  if (object.kind === "pointOriginSphereSaveDamageArea") {
    const anchor = object.originAnchor;
    assert(
      anchor &&
        typeof anchor === "object" &&
        !isJsonArray(anchor) &&
        "combatantId" in anchor,
    );
    delete object.originAnchor;
    object.originAnchorId = anchor.combatantId;
  }
  return object;
}

test("restores an admitted version-two sphere save and retains the pending damage and dice sequence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dnd-stored-sphere-"));
  const path = join(directory, "sessions.sqlite");
  const repository = open(path);
  try {
    const creation = await connect(repository, "regular");
    const draftId = "synthetic-stored-sphere-wizard";
    const playSessionId = await acceptancePlaySessionId(creation.client);
    const id = Schema.decodeUnknownSync(PlaySessionIdSchema)(playSessionId);
    try {
      await createAndFinalizeElfWizardFiveWithCounterspell(
        creation.client,
        draftId,
      );
    } finally {
      await creation.close();
    }
    const battle = await connect(repository, "chatgpt");
    retainAcceptancePlaySessionAccess(battle.client, { playSessionId });
    try {
      const started = Schema.decodeUnknownSync(
        Schema.Struct({
          operation: Schema.Struct({ result: BattleSessionOutputSchema }),
          chatGptBattleOperations: ChatGptBattleGuidanceSchema,
        }),
      )(
        await battle.call("start_battle", {
          playSessionId,
          battleId: "synthetic-stored-sphere-battle",
          initiativeMode: "direct",
          companionAdmissions: [],
          initialCombatants: [
            {
              kind: "characterSession",
              characterId: characterIdFromDraftId(characterDraftId(draftId)),
              combatantId: "wizard",
              initiative: 20,
              ammunitionStocks: [],
            },
            statBlockCombatant("goblin", "stat_block_goblin_warrior", 10, [
              { ammunition: "arrow", remaining: 20 },
            ]),
          ],
        }),
      );
      const frontier = started.operation.result.envelope?.frontier;
      assert(frontier?.kind === "acts");
      const act = frontier.acts.find(
        (candidate) =>
          candidate.presentation.kind === "spell" &&
          candidate.presentation.invocation.spellId === "fireball",
      );
      assert(act);
      const guidance = started.chatGptBattleOperations;
      assert(guidance.kind === "acts");
      const offered = guidance.acts.find(
        (choice) =>
          choice.kind === "ready" &&
          choice.label === act.label &&
          choice.summary === act.summary,
      );
      assert(offered?.kind === "ready");
      const readyCall = offered.readyCalls.find(
        (call) => call.tool === "cast_spell",
      );
      assert(readyCall);
      const selected = Schema.decodeUnknownSync(
        Schema.Struct({
          operation: Schema.Struct({ result: BattleResolutionOutputSchema }),
        }),
      )(
        await battle.call("cast_spell", {
          playSessionId,
          ...readyCall.arguments,
        }),
      );
      assert(selected.operation.result.envelope.frontier.kind === "holes");
      const save = selected.operation.result.envelope.frontier.holes.find(
        (hole) => hole.kind === "savingThrowOutcome",
      );
      assert(save);
      await battle.call("provide_battle_input", {
        playSessionId,
        fill: {
          kind: save.kind,
          holeId: save.holeId,
          value: {
            area: {
              kind: "pointOriginSphereSaveDamageArea",
              originAnchor: { kind: "combatant", combatantId: "goblin" },
              affectedTargetIds: ["goblin"],
              objectIgnitionFacts: [],
            },
            outcomes: [
              {
                targetId: "goblin",
                succeeded: false,
                d20TestRoll: { tag: "single", naturalD20: 6 },
              },
            ],
          },
        },
      });
      await battle.call("roll_dice", {
        playSessionId,
        groups: [{ dice: 8, dieSize: 6 }],
      });
    } finally {
      await battle.close();
    }
    const pending = repository.load(id);
    assert(Result.isSuccess(pending) && pending.success.tag === "found");
    const resumed = await connect(repository, "chatgpt");
    retainAcceptancePlaySessionAccess(resumed.client, { playSessionId });
    try {
      const read = Schema.decodeUnknownSync(
        Schema.Struct({
          operation: Schema.Struct({ result: BattleSessionOutputSchema }),
        }),
      )(await resumed.call("read_battle_state", { playSessionId }));
      const frontier = read.operation.result.envelope?.frontier;
      assert(frontier?.kind === "holes");
      const damage = frontier.holes.find((hole) => hole.kind === "rolledDice");
      assert(damage);
      await resumed.call("provide_battle_input", {
        playSessionId,
        fill: {
          kind: damage.kind,
          holeId: damage.holeId,
          value: [{ results: [4, 4, 4, 4, 4, 4, 4, 4] }],
        },
      });
    } finally {
      await resumed.close();
    }
    const completed = repository.load(id);
    assert(Result.isSuccess(completed) && completed.success.tag === "found");
    const services = createMcpApplicationServices();
    for (const { stage, record } of [
      { stage: "pending", record: pending.success.record },
      { stage: "resolved", record: completed.success.record },
    ]) {
      expect(
        record.operations.every(
          (operation) =>
            operation.admissionVersion ===
            PLAY_SESSION_COMMAND_ADMISSION_VERSION,
        ),
      ).toBe(true);
      const expectedRoot = rootFromRecord(services, record);
      assert(Result.isSuccess(expectedRoot));
      const history = Schema.decodeUnknownSync(Schema.Array(Schema.JsonObject))(
        record.operations,
      );
      const oldHistory = history.map((operation) => ({
        ...operation,
        admissionVersion: 2,
        args: versionTwoArgs(operation.args),
      }));
      const database = new DatabaseSync(path);
      try {
        database
          .prepare(
            "UPDATE play_sessions SET format_version = 3, operations_json = ?, revision = ? WHERE play_session_id = ?",
          )
          .run(JSON.stringify(oldHistory), record.revision, id);
      } finally {
        database.close();
      }
      const recovered = repository.load(id);
      assert(Result.isSuccess(recovered) && recovered.success.tag === "found");
      const recoveredRoot = rootFromRecord(services, recovered.success.record);
      assert(Result.isSuccess(recoveredRoot));
      expect(recovered.success.record.diceReplay).toEqual(record.diceReplay);
      const actualState = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
        jsonContentPayload(
          handleToolCall(recoveredRoot.success, "read_battle_state", {}),
        ),
      );
      expect(actualState).toEqual(
        jsonContentPayload(
          handleToolCall(expectedRoot.success, "read_battle_state", {}),
        ),
      );
      if (stage === "resolved") {
        expect(
          actualState.envelope?.checkpoint.combatants.find(
            (combatant) => combatant.combatantId === "goblin",
          )?.hp,
        ).toBe(0);
        const caster = actualState.envelope?.checkpoint.combatants.find(
          (combatant) => combatant.combatantId === "wizard",
        );
        assert(caster?.origin.kind === "character");
        expect(caster.origin.spellcasting?.spellSlots).toContainEqual(
          expect.objectContaining({ spellLevel: 3, expended: 1 }),
        );
      } else {
        expect(actualState.envelope?.frontier.kind).toBe("holes");
      }
      expect(
        jsonContentPayload(
          handleToolCall(recoveredRoot.success, "roll_dice", {
            groups: [{ dice: 8, dieSize: 6 }],
          }),
        ),
      ).toEqual(
        jsonContentPayload(
          handleToolCall(expectedRoot.success, "roll_dice", {
            groups: [{ dice: 8, dieSize: 6 }],
          }),
        ),
      );
    }
  } finally {
    repository.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("migrates only historical sphere anchors and rejects contradictory origins", () => {
  const metadata = { kind: "synthetic-unrelated", originAnchorId: "keep" };
  const old = {
    fill: {
      value: {
        area: {
          kind: "pointOriginSphereObjectDamageArea",
          originAnchorId: "synthetic-center",
          affectedTargetIds: [],
          nonmagicalUnattendedObjectDamageFacts: [],
        },
      },
    },
    metadata,
  };
  const result = migrateStoredBattleInput(old);
  expect(result).toMatchObject({
    _tag: "Success",
    success: {
      fill: {
        value: {
          area: {
            originAnchor: {
              kind: "combatant",
              combatantId: "synthetic-center",
            },
          },
        },
      },
      metadata,
    },
  });
  expect(
    Result.isFailure(
      migrateStoredBattleInput({
        kind: "pointOriginSphereSaveDamageArea",
        originAnchorId: "synthetic-center",
        originAnchor: { kind: "tableSelectedPoint" },
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      migrateStoredBattleInput({
        kind: "pointOriginSphereSaveDamageArea",
        originAnchorId: "",
      }),
    ),
  ).toBe(true);
});

test("preserves literal JSON property names without changing the object prototype", () => {
  const input = {
    kind: "pointOriginSphereSaveDamageArea",
    originAnchorId: "synthetic-center",
    ["__proto__"]: { syntheticMarker: true },
  };
  const migrated = migrateStoredBattleInput(input);
  assert(Result.isSuccess(migrated));
  expect(Object.hasOwn(migrated.success, "__proto__")).toBe(true);
  expect(migrated.success["__proto__"]).toEqual({ syntheticMarker: true });
  expect(Object.getPrototypeOf(migrated.success)).toBe(Object.prototype);
});

test.each([
  {
    originAnchorId: "synthetic-center",
    originAnchor: { kind: "tableSelectedPoint" },
  },
  { originAnchorId: 12 },
  { originAnchorId: "" },
])(
  "reports malformed historical origins as invalid stored records: %j",
  (origin) => {
    const decoded = decodeStoredPlaySessionRecord(
      {
        format_version: 3,
        dice_seed: generatedDiceSeed().join(""),
        dice_group_semantic_profile:
          DICE_RANDOM_SOURCE.diceGroupSemanticProfile,
        prng_sequence_profile: DICE_RANDOM_SOURCE.prngSequenceProfile,
        state_schema_version: DICE_RANDOM_SOURCE.stateSchemaVersion,
        revision: 1,
        operations_json: JSON.stringify([
          {
            admissionVersion: 2,
            toolSurface: "chatgpt",
            name: "provide_battle_input",
            args: {
              fill: {
                kind: "savingThrowOutcome",
                value: {
                  area: { kind: "pointOriginSphereSaveDamageArea", ...origin },
                },
              },
            },
          },
        ]),
        tenure_kind: "saved",
        guest_access_grant_digest: null,
        principal_id: "principal:stored-origin-shape",
        last_activity_at_ms: 0,
      },
      generatedPlaySessionId(),
    );
    expect(decoded).toMatchObject({
      _tag: "Failure",
      failure: { reason: "invalidStoredRecord" },
    });
  },
);
