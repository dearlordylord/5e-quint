import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Either } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS as TEST_TIMEOUT } from "../test-timeout.ts";
import {
  acceptancePlaySessionId,
  acceptancePlaySessionRoutedArgs,
  retainAcceptancePlaySessionAccess,
  attackRollFill,
  attackSubjectFromActs,
  attackTargetFill,
  createBaselineCharacterSession,
  rolledDiceFill,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { createDndMcpHttpServer } from "./public-http-server.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("recoverable Play Session protocol", () => {
  test("retains a runtime-assigned Character Draft identity across replay", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-generated-draft-"));
    temporaryDirectories.push(directory);
    const repository = openRepository(join(directory, "play-sessions.sqlite"));
    const connection = await connectClient(repository);

    try {
      const created = await callStructuredTool(connection.client, {
        name: "create_play_session",
        arguments: {},
      });
      const playSessionId = stringField(created, "playSessionId");
      const draftCreated = await callStructuredTool(connection.client, {
        name: "create_character_draft",
        arguments: { playSessionId },
      });
      const draftId = stringField(
        objectField(operationResult(draftCreated), "draft"),
        "draftId",
      );

      const resumed = await callStructuredTool(connection.client, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(resumed).toMatchObject({
        projection: { draftIds: [draftId] },
        restoration: { tag: "retained" },
      });

      const discovered = await callStructuredTool(connection.client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(discovered)).toMatchObject({
        draft: { draftId, revision: 0 },
      });
    } finally {
      await connection.close();
      repository.close();
    }
  });

  test("continues an accepted Character Draft mutation after reconstructing the application store", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-play-session-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const firstConnection = await connectClient(firstRepository);

    const created = await callStructuredTool(firstConnection.client, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    const draftId = "draft:recoverable-character-mutation";
    const draftCreated = await callStructuredTool(firstConnection.client, {
      name: "create_character_draft",
      arguments: { playSessionId, draftId },
    });
    const createdHoles = arrayField(operationResult(draftCreated), "holes");
    const progressionHole = createdHoles.find(
      (hole) =>
        isJsonObject(hole) &&
        hole.holeId === "cc:draft:draft.progression.initial",
    );
    if (!isJsonObject(progressionHole)) {
      throw new Error("Expected the initial Character Progression hole.");
    }
    const progressionOption = arrayField(progressionHole, "options")[0];
    if (!isJsonObject(progressionOption)) {
      throw new Error("Expected a Character Progression option.");
    }

    await callStructuredTool(firstConnection.client, {
      name: "fill_creation_holes",
      arguments: {
        playSessionId,
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: stringField(progressionHole, "holeId"),
            optionIds: [stringField(progressionOption, "optionId")],
          },
        ],
      },
    });
    await firstConnection.close();
    firstRepository.close();

    const recoveredRepository = openRepository(databasePath);
    const recoveredConnection = await connectClient(recoveredRepository);
    try {
      const resumed = await callStructuredTool(recoveredConnection.client, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(resumed).toMatchObject({
        tag: "playSessionAvailable",
        projection: { draftIds: [draftId] },
        restoration: { tag: "retained" },
      });

      const discovered = await callStructuredTool(recoveredConnection.client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(discovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await recoveredConnection.close();
      recoveredRepository.close();
    }
  });

  test("exposes the recoverable Play Session through the public /mcp route", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-public-mcp-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const firstServer = createDndMcpHttpServer({
      playSessionRepository: firstRepository,
    });
    const firstEndpoint = await listen(firstServer);
    const firstClient = await connectHttpClient(firstEndpoint);
    const created = await callStructuredTool(firstClient, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    const draftId = "draft:public-http-recovery";
    const draftCreated = await callStructuredTool(firstClient, {
      name: "create_character_draft",
      arguments: { playSessionId, draftId },
    });
    const progressionHole = arrayField(
      operationResult(draftCreated),
      "holes",
    ).find(
      (hole) =>
        isJsonObject(hole) &&
        hole.holeId === "cc:draft:draft.progression.initial",
    );
    if (!isJsonObject(progressionHole)) {
      throw new Error("Expected the initial Character Progression hole.");
    }
    const progressionOption = arrayField(progressionHole, "options")[0];
    if (!isJsonObject(progressionOption)) {
      throw new Error("Expected a Character Progression option.");
    }
    await callStructuredTool(firstClient, {
      name: "fill_creation_holes",
      arguments: {
        playSessionId,
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: stringField(progressionHole, "holeId"),
            optionIds: [stringField(progressionOption, "optionId")],
          },
        ],
      },
    });
    await firstClient.close();
    await close(firstServer);
    firstRepository.close();

    const recoveredRepository = openRepository(databasePath);
    const recoveredServer = createDndMcpHttpServer({
      playSessionRepository: recoveredRepository,
    });
    const recoveredEndpoint = await listen(recoveredServer);
    const recoveredClient = await connectHttpClient(recoveredEndpoint);
    try {
      const resumed = await callStructuredTool(recoveredClient, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(resumed).toMatchObject({
        tag: "playSessionAvailable",
        projection: { draftIds: [draftId] },
      });
      const discovered = await callStructuredTool(recoveredClient, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(discovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await recoveredClient.close();
      await close(recoveredServer);
      recoveredRepository.close();
    }
  });

  test("settles concurrent mutations as one accepted revision and one stale rejection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-concurrent-mcp-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const secondRepository = openRepository(databasePath);
    const firstConnection = await connectClient(firstRepository);
    const secondConnection = await connectClient(secondRepository);
    try {
      const created = await callStructuredTool(firstConnection.client, {
        name: "create_play_session",
        arguments: {},
      });
      const playSessionId = stringField(created, "playSessionId");
      const draftId = "draft:concurrent-recoverable-mutation";
      const draftCreated = await callStructuredTool(firstConnection.client, {
        name: "create_character_draft",
        arguments: { playSessionId, draftId },
      });
      const progressionHole = arrayField(
        operationResult(draftCreated),
        "holes",
      ).find(
        (hole) =>
          isJsonObject(hole) &&
          hole.holeId === "cc:draft:draft.progression.initial",
      );
      if (!isJsonObject(progressionHole)) {
        throw new Error("Expected the initial Character Progression hole.");
      }
      const options = arrayField(progressionHole, "options").slice(0, 2);
      if (!isJsonObject(options[0]) || !isJsonObject(options[1])) {
        throw new Error("Expected two Character Progression options.");
      }
      const operation = (optionId: string) => ({
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 0,
          fills: [
            {
              kind: "choice",
              holeId: stringField(progressionHole, "holeId"),
              optionIds: [optionId],
            },
          ],
        },
      });

      const results = await Promise.all([
        callStructuredTool(
          firstConnection.client,
          operation(stringField(options[0], "optionId")),
        ),
        callStructuredTool(
          secondConnection.client,
          operation(stringField(options[1], "optionId")),
        ),
      ]);
      expect(
        results
          .map((result) =>
            stringField(objectField(operationResult(result), "result"), "tag"),
          )
          .sort(),
      ).toEqual(["accepted", "rejected"]);

      const recovered = await callStructuredTool(firstConnection.client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(recovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await Promise.all([firstConnection.close(), secondConnection.close()]);
      firstRepository.close();
      secondRepository.close();
    }
  });

  test("returns a typed storage failure without treating it as session absence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-storage-failure-"));
    temporaryDirectories.push(directory);
    const repository = openRepository(join(directory, "play-sessions.sqlite"));
    const connection = await connectClient(repository);
    const created = await callStructuredTool(connection.client, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    repository.close();
    try {
      const failed = await callToolWithAccess(connection.client, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(failed.isError).toBe(true);
      expect(failed.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Play Session storage is unavailable.",
              details: {
                code: "PLAY_SESSION_STORAGE_FAILURE",
                reason: "closed",
              },
            },
            null,
            2,
          ),
        },
      ]);
      expect(failed.structuredContent).toBeUndefined();
    } finally {
      await connection.close();
    }
  });

  test(
    "continues a finalized Character Session mutation across recovery",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "dnd-character-session-"));
      temporaryDirectories.push(directory);
      const databasePath = join(directory, "play-sessions.sqlite");
      const firstRepository = openRepository(databasePath);
      const firstServer = createDndMcpHttpServer({
        playSessionRepository: firstRepository,
      });
      const firstClient = await connectHttpClient(await listen(firstServer));
      const playSessionId = await acceptancePlaySessionId(firstClient);
      const baseline = await createBaselineCharacterSession(firstClient);
      await firstClient.close();
      await close(firstServer);
      firstRepository.close();

      const mutationRepository = openRepository(databasePath);
      const mutationServer = createDndMcpHttpServer({
        playSessionRepository: mutationRepository,
      });
      const mutationClient = await connectHttpClient(
        await listen(mutationServer),
      );
      const listed = await callStructuredTool(mutationClient, {
        name: "list_characters",
        arguments: { playSessionId },
      });
      expect(operationResult(listed)).toMatchObject({
        characters: [
          {
            characterId: baseline.characterId,
            status: "available",
            hitPoints: { current: 12, maximum: 12 },
          },
        ],
      });
      await callStructuredTool(mutationClient, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: baseline.characterId,
          operation: {
            kind: "advanceClassLevel",
            levelGain: {
              tag: "classLevelGain",
              classUnitId: "class_fighter",
              hitPointRule: { tag: "fixedHigherLevelGain" },
            },
          },
        },
      });
      await mutationClient.close();
      await close(mutationServer);
      mutationRepository.close();

      const readRepository = openRepository(databasePath);
      const readServer = createDndMcpHttpServer({
        playSessionRepository: readRepository,
      });
      const readClient = await connectHttpClient(await listen(readServer));
      try {
        const inspected = await callStructuredTool(readClient, {
          name: "inspect_character_session",
          arguments: {
            playSessionId,
            characterId: baseline.characterId,
          },
        });
        expect(operationResult(inspected)).toMatchObject({
          detail: {
            tag: "available",
            characterId: baseline.characterId,
            build: {
              progression: {
                startingClass: "class_fighter",
                advancements: [{ classUnitId: "class_fighter" }],
              },
            },
          },
        });
      } finally {
        await readClient.close();
        await close(readServer);
        readRepository.close();
      }
    },
    TEST_TIMEOUT,
  );

  test("rejects a stored command that cannot reconstruct application state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-invalid-session-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const initialRepository = openRepository(databasePath);
    const initialConnection = await connectClient(initialRepository);
    const created = await callStructuredTool(initialConnection.client, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    await initialConnection.close();
    initialRepository.close();

    const database = new DatabaseSync(databasePath);
    database
      .prepare(
        "UPDATE play_sessions SET revision = 1, operations_json = ? WHERE play_session_id = ?",
      )
      .run(
        JSON.stringify([{ name: "discover_creation_holes", args: {} }]),
        playSessionId,
      );
    database.close();

    const recoveredRepository = openRepository(databasePath);
    const recoveredConnection = await connectClient(recoveredRepository);
    try {
      const failed = await callToolWithAccess(recoveredConnection.client, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(failed.isError).toBe(true);
      if (!Array.isArray(failed.content) || !isJsonObject(failed.content[0])) {
        throw new Error("Expected a typed stored-record failure response.");
      }
      expect(failed.content[0].type).toBe("text");
      expect(failed.content[0].text).toEqual(
        expect.stringContaining('"reason": "invalidStoredRecord"'),
      );
      expect(failed.structuredContent).toBeUndefined();
    } finally {
      await recoveredConnection.close();
      recoveredRepository.close();
    }
  });

  test(
    "recovers direct and initial-setup Battle entry with one atomic setup finalization",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "dnd-battle-entry-"));
      temporaryDirectories.push(directory);
      const databasePath = join(directory, "play-sessions.sqlite");
      const initialRepository = openRepository(databasePath);
      const initialServer = createDndMcpHttpServer({
        playSessionRepository: initialRepository,
      });
      const endpoint = await listen(initialServer);
      const directClient = await connectHttpClient(endpoint);
      const setupClient = await connectHttpClient(endpoint);
      const directPlaySessionId = await acceptancePlaySessionId(directClient);
      const setupPlaySessionId = await acceptancePlaySessionId(setupClient);
      const directCharacter =
        await createBaselineCharacterSession(directClient);
      const setupCharacter = await createBaselineCharacterSession(setupClient);
      await callStructuredTool(directClient, {
        name: "start_battle",
        arguments: battleEntryArguments(
          directPlaySessionId,
          directCharacter.characterId,
          "direct",
        ),
      });
      await callStructuredTool(setupClient, {
        name: "start_battle",
        arguments: battleEntryArguments(
          setupPlaySessionId,
          setupCharacter.characterId,
          "initialSetup",
        ),
      });
      await Promise.all([directClient.close(), setupClient.close()]);
      await close(initialServer);
      initialRepository.close();

      const recoveredRepository = openRepository(databasePath);
      const recoveredServer = createDndMcpHttpServer({
        playSessionRepository: recoveredRepository,
      });
      const recoveredEndpoint = await listen(recoveredServer);
      const directReadClient = await connectHttpClient(recoveredEndpoint);
      const firstSetupClient = await connectHttpClient(recoveredEndpoint);
      const secondSetupClient = await connectHttpClient(recoveredEndpoint);
      try {
        const directBattle = await callStructuredTool(directReadClient, {
          name: "read_battle_state",
          arguments: { playSessionId: directPlaySessionId },
        });
        expect(operationResult(directBattle)).toMatchObject({
          battleState: {
            tag: "activeBattle",
            battleId: "battle:recoverable-direct-entry",
          },
          snapshot: { battleId: "battle:recoverable-direct-entry" },
        });

        const recoveredSetup = await callStructuredTool(firstSetupClient, {
          name: "read_battle_state",
          arguments: { playSessionId: setupPlaySessionId },
        });
        expect(operationResult(recoveredSetup)).toMatchObject({
          battleState: {
            tag: "initialInitiativeSetup",
            battleId: "battle:recoverable-initial-setup-entry",
          },
          snapshot: null,
        });

        const finalize = (client: Client) =>
          callToolWithAccess(client, {
            name: "battle_lifecycle",
            arguments: {
              playSessionId: setupPlaySessionId,
              operation: { kind: "finalizeInitialInitiativeSetup" },
            },
          });
        const finalized = await Promise.all([
          finalize(firstSetupClient),
          finalize(secondSetupClient),
        ]);
        expect(
          finalized.filter((result) => result.isError !== true),
        ).toHaveLength(1);
        expect(
          finalized.filter((result) => result.isError === true),
        ).toHaveLength(1);
        const rejectedFinalization = finalized.find(
          (result) => result.isError === true,
        );
        if (!isJsonObject(rejectedFinalization?.structuredContent)) {
          throw new Error("Expected a typed concurrent setup rejection.");
        }
        expect(rejectedFinalization.structuredContent).toMatchObject({
          operation: {
            result: {
              details: {
                code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
              },
            },
          },
          projection: { battleState: { tag: "activeBattle" } },
        });

        const activeSetupBattle = await callStructuredTool(firstSetupClient, {
          name: "read_battle_state",
          arguments: { playSessionId: setupPlaySessionId },
        });
        expect(operationResult(activeSetupBattle)).toMatchObject({
          battleState: {
            tag: "activeBattle",
            battleId: "battle:recoverable-initial-setup-entry",
          },
          snapshot: { battleId: "battle:recoverable-initial-setup-entry" },
        });
      } finally {
        await Promise.all([
          directReadClient.close(),
          firstSetupClient.close(),
          secondSetupClient.close(),
        ]);
        await close(recoveredServer);
        recoveredRepository.close();
      }
    },
    TEST_TIMEOUT,
  );

  test(
    "recovers an active Act through Runtime Holes and atomic closeout",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "dnd-battle-act-"));
      temporaryDirectories.push(directory);
      const databasePath = join(directory, "play-sessions.sqlite");
      const initialRepository = openRepository(databasePath);
      const initialServer = createDndMcpHttpServer({
        playSessionRepository: initialRepository,
      });
      const initialClient = await connectHttpClient(
        await listen(initialServer),
      );
      const playSessionId = await acceptancePlaySessionId(initialClient);
      const baseline = await createBaselineCharacterSession(initialClient);
      await callStructuredTool(initialClient, {
        name: "start_battle",
        arguments: battleEntryArguments(
          playSessionId,
          baseline.characterId,
          "direct",
        ),
      });
      const discovered = await callStructuredTool(initialClient, {
        name: "discover_battle_acts",
        arguments: { playSessionId },
      });
      const subject = attackSubjectFromActs(
        operationResult(discovered),
        "fighter-direct-entry",
        "Longsword",
      );
      await callStructuredTool(initialClient, {
        name: "fill_battle_hole",
        arguments: {
          playSessionId,
          subject,
          fill: attackTargetFill(subject, "goblin-direct-entry"),
        },
      });
      await initialClient.close();
      await close(initialServer);
      initialRepository.close();

      const resolutionRepository = openRepository(databasePath);
      const resolutionServer = createDndMcpHttpServer({
        playSessionRepository: resolutionRepository,
      });
      const resolutionEndpoint = await listen(resolutionServer);
      const firstResolutionClient = await connectHttpClient(resolutionEndpoint);
      const secondResolutionClient =
        await connectHttpClient(resolutionEndpoint);
      const fillAttackRoll = (client: Client) =>
        callToolWithAccess(client, {
          name: "fill_battle_hole",
          arguments: {
            playSessionId,
            subject,
            fill: attackRollFill(16, 14),
          },
        });
      const competingAttackRolls = await Promise.all([
        fillAttackRoll(firstResolutionClient),
        fillAttackRoll(secondResolutionClient),
      ]);
      const attackRollResults = competingAttackRolls.map((result) => {
        if (!isJsonObject(result.structuredContent)) {
          throw new Error("Expected a typed concurrent Battle fill result.");
        }
        return objectField(operationResult(result.structuredContent), "result");
      });
      expect(attackRollResults.map((result) => result.tag).sort()).toEqual([
        "invalid",
        "needsHoles",
      ]);
      expect(
        attackRollResults.find((result) => result.tag === "invalid"),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
      });

      const rolled = await callStructuredTool(firstResolutionClient, {
        name: "roll_dice",
        arguments: {
          playSessionId,
          requestId: "00000000-0000-4000-8000-000000000201",
          groups: [{ dice: 1, dieSize: 8 }],
        },
      });
      const rolledGroups = arrayField(operationResult(rolled), "groups");
      const rolledGroup = rolledGroups[0];
      if (!isJsonObject(rolledGroup)) {
        throw new Error("Expected the server-correlated damage roll.");
      }
      const damageResults = arrayField(rolledGroup, "results");
      const damageFilled = await callStructuredTool(firstResolutionClient, {
        name: "fill_battle_hole",
        arguments: {
          playSessionId,
          subject,
          fill: rolledDiceFill("battle:attack:damage-result:1d8+3-slashing", [
            damageResults.map(numberValue),
          ]),
        },
      });
      const damageResult = objectField(operationResult(damageFilled), "result");
      if (damageResult.tag === "needsHoles") {
        expect(arrayField(damageResult, "holes")).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: "attackDamageDisposition",
              holeId: "battle:attack:damage-disposition",
            }),
          ]),
        );
      }
      const resolved =
        damageResult.tag === "needsHoles"
          ? await callStructuredTool(firstResolutionClient, {
              name: "fill_battle_hole",
              arguments: {
                playSessionId,
                subject,
                fill: {
                  kind: "attackDamageDisposition",
                  holeId: "battle:attack:damage-disposition",
                  value: { kind: "ordinaryDamage" },
                },
              },
            })
          : damageFilled;
      expect(operationResult(resolved)).toMatchObject({
        result: { tag: "resolved" },
      });
      await Promise.all([
        firstResolutionClient.close(),
        secondResolutionClient.close(),
      ]);
      await close(resolutionServer);
      resolutionRepository.close();

      const closeoutRepository = openRepository(databasePath);
      const closeoutServer = createDndMcpHttpServer({
        playSessionRepository: closeoutRepository,
      });
      const closeoutClient = await connectHttpClient(
        await listen(closeoutServer),
      );
      const recoveredBattle = await callStructuredTool(closeoutClient, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      const snapshot = objectField(
        operationResult(recoveredBattle),
        "snapshot",
      );
      const goblin = arrayField(snapshot, "combatants").find(
        (combatant) =>
          isJsonObject(combatant) &&
          combatant.combatantId === "goblin-direct-entry",
      );
      if (!isJsonObject(goblin)) {
        throw new Error("Expected the recovered Goblin Warrior combatant.");
      }
      expect(goblin.hp).toBeLessThan(7);
      const ended = await callStructuredTool(closeoutClient, {
        name: "end_battle",
        arguments: { playSessionId },
      });
      expect(operationResult(ended)).toMatchObject({
        endedBattleId: "battle:recoverable-direct-entry",
        session: { battleState: { tag: "none" } },
      });
      await closeoutClient.close();
      await close(closeoutServer);
      closeoutRepository.close();

      const finalRepository = openRepository(databasePath);
      const finalServer = createDndMcpHttpServer({
        playSessionRepository: finalRepository,
      });
      const finalClient = await connectHttpClient(await listen(finalServer));
      try {
        const listed = await callStructuredTool(finalClient, {
          name: "list_characters",
          arguments: { playSessionId },
        });
        expect(operationResult(listed)).toMatchObject({
          characters: [
            { characterId: baseline.characterId, status: "available" },
          ],
        });
        expect(listed).toMatchObject({
          projection: { battleState: { tag: "none" } },
        });
      } finally {
        await finalClient.close();
        await close(finalServer);
        finalRepository.close();
      }
    },
    TEST_TIMEOUT,
  );
});

function battleEntryArguments(
  playSessionId: string,
  characterId: string,
  initiativeMode: "direct" | "initialSetup",
): Record<string, unknown> {
  const suffix =
    initiativeMode === "direct" ? "direct-entry" : "initial-setup-entry";
  return {
    playSessionId,
    battleId: `battle:recoverable-${suffix}`,
    initiativeMode,
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId,
        combatantId: `fighter-${suffix}`,
        initiative: 18,
        ammunitionStocks: [],
      },
      {
        kind: "statBlock",
        statBlockId: "stat_block_goblin_warrior",
        combatantId: `goblin-${suffix}`,
        initiative: 7,
        ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
        admissionSource: { kind: "encounterParticipant" },
      },
    ],
  };
}

function numberValue(value: unknown): number {
  if (typeof value !== "number") throw new Error("Expected a rolled number.");
  return value;
}

async function listen(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<URL> {
  const endpoint = await server.listen();
  if (Either.isLeft(endpoint)) throw new Error(endpoint.left.message);
  return endpoint.right;
}

async function close(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<void> {
  const closed = await server.close();
  if (Either.isLeft(closed)) throw new Error(closed.left.message);
}

async function connectHttpClient(endpoint: URL): Promise<Client> {
  const client = new Client({
    name: "recoverable-http-client",
    version: "0.1.0",
  });
  const transport = new StreamableHTTPClientTransport(endpoint);
  // SDK 1.29's transport declarations do not satisfy exactOptionalPropertyTypes,
  // although StreamableHTTPClientTransport explicitly implements Transport.
  await client.connect(transport as Transport);
  return client;
}

async function connectClient(
  playSessionRepository: ReturnType<typeof openRepository>,
) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    playSessionRepository,
  });
  const client = new Client({
    name: "recoverable-play-session-client",
    version: "0.1.0",
  });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await Promise.allSettled([client.close(), host.server.close()]);
    },
  };
}

function openRepository(databasePath: string) {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  return repository.right;
}

async function callStructuredTool(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
): Promise<Readonly<Record<string, unknown>>> {
  const result = await client.callTool({
    ...input,
    arguments: await acceptancePlaySessionRoutedArgs(
      client,
      input.name,
      input.arguments,
    ),
  });
  expect(result.isError).not.toBe(true);
  if (!isJsonObject(result.structuredContent)) {
    throw new Error(`${input.name} did not return an object payload.`);
  }
  if (input.name === "create_play_session") {
    const operation = objectField(result.structuredContent, "operation");
    const creation = objectField(operation, "result");
    const access = objectField(creation, "access");
    retainAcceptancePlaySessionAccess(client, {
      playSessionId: stringField(result.structuredContent, "playSessionId"),
      guestAccessGrant: stringField(access, "guestAccessGrant"),
    });
  }
  return result.structuredContent;
}

async function callToolWithAccess(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
) {
  return client.callTool({
    ...input,
    arguments: await acceptancePlaySessionRoutedArgs(
      client,
      input.name,
      input.arguments,
    ),
  });
}

function operationResult(
  envelope: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (!isJsonObject(envelope.operation)) {
    throw new Error("Expected a Play Session operation.");
  }
  if (!isJsonObject(envelope.operation.result)) {
    throw new Error("Expected a Play Session operation result.");
  }
  return envelope.operation.result;
}

function arrayField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): readonly unknown[] {
  const result = value[field];
  if (!Array.isArray(result)) throw new Error(`Expected ${field} array.`);
  return result;
}

function stringField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const result = value[field];
  if (typeof result !== "string") throw new Error(`Expected ${field} string.`);
  return result;
}

function objectField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const result = value[field];
  if (!isJsonObject(result)) throw new Error(`Expected ${field} object.`);
  return result;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
