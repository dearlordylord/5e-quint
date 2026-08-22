import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { describe, expect, test } from "vitest";
import { Either } from "effect";
import { characterId } from "@dnd/battle-runtime";
import {
  MONK_MONKS_FOCUS_UNIT_ID,
  characterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp, resourceCount } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  armorClassBuild,
  prayerOfHealingClericBuild,
} from "../../character-sheet-runtime/src/test-support.test-support.ts";

import {
  acceptancePlaySessionId,
  verifyAgentConversationScenarios,
  verifyBaselineVertical,
  verifyLevelFiveWizardFireballBattleHandoff,
  verifyLevelFourWizardVertical,
  verifyLevelNineRangerExpertiseSheetScenario,
  verifyLevelSixRogueSteadyAimBattleHandoff,
  verifyLevelThreeWizardVertical,
  verifyToolContract,
  verifyWidthVertical,
  verifyWizardIceKnifeBattleHandoff,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createMcpApplicationServices } from "./composition-root.ts";
import { availableCharacterSession } from "./session-store.ts";
import { adminProjection } from "./admin-mirror.ts";
import { contentToolDefinitions } from "./content-tools.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { decodePlaySessionId } from "./play-session.ts";
import {
  PLAY_SESSION_OPERATION_NAMES,
  PLAY_SESSION_OUTPUT_SCHEMA_BYTE_BUDGET,
} from "./play-session-tool-contract.ts";

const FULL_ACCEPTANCE_TEST_TIMEOUT_MS = 90_000;

describe("MCP protocol server", () => {
  test("retains no mutable session root outside the Play Session registry", () => {
    const host = createDndMcpProtocolServer();

    expect(host).not.toHaveProperty("root");
    expect(host.applicationServices).not.toHaveProperty("sessionStore");
    expect(host.applicationServices).not.toHaveProperty(
      "adminMirrorPublication",
    );
  });

  test("rejects calls outside the advertised tool definitions", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer(
      createMcpApplicationServices(),
      [contentToolDefinitions[0]],
    );
    const client = new Client({ name: "scoped-client", version: "0.1.0" });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(
        ["create_play_session", "read_play_session", "describe_mcp_workflow"],
      );
      const hiddenCall = await client.callTool({
        name: "create_character_draft",
        arguments: {},
      });
      expect(hiddenCall.isError).toBe(true);
      expect(hiddenCall.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            {
              error:
                "Tool is not advertised by this MCP server: create_character_draft",
            },
            null,
            2,
          ),
        },
      ]);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  test("routes initial Initiative setup modes, swaps, finalization, and invalid transitions through MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "initial-initiative-protocol-client",
      version: "0.1.0",
    });

    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);

      const advertisedTools = (await client.listTools()).tools;
      const startBattleTool = advertisedTools.find(
        (tool) => tool.name === "start_battle",
      );
      const battleLifecycleTool = advertisedTools.find(
        (tool) => tool.name === "battle_lifecycle",
      );
      if (
        startBattleTool?.outputSchema === undefined ||
        battleLifecycleTool?.outputSchema === undefined
      ) {
        throw new Error(
          "Expected start_battle and battle_lifecycle output schemas.",
        );
      }
      const validateStartOutput = new AjvJsonSchemaValidator().getValidator(
        startBattleTool.outputSchema as JsonSchemaType,
      );
      const validateLifecycleOutput = new AjvJsonSchemaValidator().getValidator(
        battleLifecycleTool.outputSchema as JsonSchemaType,
      );

      const modeSession = await createPlaySession(client);
      await installInitiativeSession(host, modeSession, {
        characterId: "character:initiative-advantage",
        build: armorClassBuild({
          startingClass: "class_fighter",
          advancements: ["class_fighter", "class_fighter"],
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: unitId("subclass_fighter_champion"),
              unitId: unitId("fighter_remarkable_athlete"),
            },
          ],
        }),
      });

      const started = await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId: modeSession,
          battleId: "battle:initiative-modes",
          initiativeMode: "initialSetup",
          initialCombatants: [
            {
              kind: "characterSession",
              characterId: "character:initiative-advantage",
              combatantId: "initiative-advantage-source",
              // Caller supplies the final Initiative fact; MCP does not
              // derive it from a raw face or an ability modifier.
              initiative: 10,
              ammunitionStocks: [],
            },
            {
              kind: "statBlock",
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "initiative-normal-foe",
              initiative: 8,
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        },
      });
      expect(validateStartOutput(started).valid).toBe(true);
      const startedResult = operationResult(started);
      expect(startedResult).toMatchObject({
        snapshot: null,
        battleState: {
          tag: "initialInitiativeSetup",
          battleId: "battle:initiative-modes",
          combatants: [
            {
              combatantId: "initiative-advantage-source",
              initiative: 10,
              rollMode: "advantage",
            },
            {
              combatantId: "initiative-normal-foe",
              initiative: 8,
              rollMode: "normal",
            },
          ],
        },
      });
      expect(started.projection).toMatchObject({
        battleState: { tag: "initialInitiativeSetup" },
      });
      expect(started.projection).not.toHaveProperty("activeBattle");

      const endBeforeFinalize = await client.callTool({
        name: "end_battle",
        arguments: { playSessionId: modeSession },
      });
      expect(endBeforeFinalize.isError).toBe(true);
      expect(endBeforeFinalize.structuredContent).toMatchObject({
        projection: { battleState: { tag: "initialInitiativeSetup" } },
      });

      const finalized = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId: modeSession,
          operation: { kind: "finalizeInitialInitiativeSetup" },
        },
      });
      expect(validateLifecycleOutput(finalized).valid).toBe(true);
      expect(operationResult(finalized)).toMatchObject({
        battleState: {
          tag: "activeBattle",
          battleId: "battle:initiative-modes",
        },
        snapshot: {
          battleId: "battle:initiative-modes",
        },
      });
      expect(finalized.projection).toMatchObject({
        battleState: {
          tag: "activeBattle",
          battleId: "battle:initiative-modes",
        },
      });
      expect(finalized.projection).not.toHaveProperty("initialInitiativeSetup");

      const activeLifecycle = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId: modeSession,
          operation: { kind: "finalizeInitialInitiativeSetup" },
        },
      });
      expect(activeLifecycle.isError).toBe(true);
      if (!isJsonObject(activeLifecycle.structuredContent)) {
        throw new Error("Expected typed active-lifecycle rejection.");
      }
      expect(
        validateLifecycleOutput(activeLifecycle.structuredContent).valid,
      ).toBe(true);
      expect(activeLifecycle.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
            },
          },
        },
        projection: {
          battleState: { tag: "activeBattle" },
        },
      });

      const swapSession = await createPlaySession(client);
      await installInitiativeSession(host, swapSession, {
        characterId: "character:initiative-swap",
        build: {
          ...armorClassBuild({ startingClass: "class_fighter" }),
          background: unitId("background_criminal"),
        },
      });

      const swapStart = await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId: swapSession,
          battleId: "battle:initiative-swap",
          initiativeMode: "initialSetup",
          initialCombatants: [
            {
              kind: "characterSession",
              characterId: "character:initiative-swap",
              combatantId: "initiative-swap-source",
              initiative: 10,
              ammunitionStocks: [],
            },
            {
              kind: "statBlock",
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "initiative-swap-ally",
              initiative: 8,
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        },
      });
      expect(operationResult(swapStart).battleState).toMatchObject({
        tag: "initialInitiativeSetup",
        combatants: [
          { combatantId: "initiative-swap-source", initiative: 10 },
          { combatantId: "initiative-swap-ally", initiative: 8 },
        ],
      });

      const invalidWitness = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId: swapSession,
          operation: {
            kind: "applyInitiativeSwap",
            sourceId: "initiative-swap-source",
            candidateId: "initiative-swap-ally",
            candidateWitness: { tag: "notAlly" },
          },
        },
      });
      expect(invalidWitness.isError).toBe(true);
      if (!isJsonObject(invalidWitness.structuredContent)) {
        throw new Error("Expected typed invalid-swap rejection.");
      }
      expect(
        validateLifecycleOutput(invalidWitness.structuredContent).valid,
      ).toBe(true);
      expect(invalidWitness.structuredContent).toMatchObject({
        operation: {
          result: {
            details: { code: "INITIAL_INITIATIVE_SWAP_REJECTED" },
          },
        },
        projection: {
          battleState: {
            tag: "initialInitiativeSetup",
            combatants: [
              { combatantId: "initiative-swap-source", initiative: 10 },
              { combatantId: "initiative-swap-ally", initiative: 8 },
            ],
          },
        },
      });

      const swapped = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId: swapSession,
          operation: {
            kind: "applyInitiativeSwap",
            sourceId: "initiative-swap-source",
            candidateId: "initiative-swap-ally",
            candidateWitness: { tag: "willingAlly" },
          },
        },
      });
      expect(validateLifecycleOutput(swapped).valid).toBe(true);
      expect(operationResult(swapped).battleState).toMatchObject({
        tag: "initialInitiativeSetup",
        combatants: [
          { combatantId: "initiative-swap-ally", initiative: 10 },
          { combatantId: "initiative-swap-source", initiative: 8 },
        ],
      });
      expect(swapped.projection).toMatchObject({
        battleState: { tag: "initialInitiativeSetup" },
      });

      const repeatedSwap = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId: swapSession,
          operation: {
            kind: "applyInitiativeSwap",
            sourceId: "initiative-swap-source",
            candidateId: "initiative-swap-ally",
            candidateWitness: { tag: "willingAlly" },
          },
        },
      });
      expect(repeatedSwap.isError).toBe(true);
      if (!isJsonObject(repeatedSwap.structuredContent)) {
        throw new Error("Expected typed repeated-swap rejection.");
      }
      expect(
        validateLifecycleOutput(repeatedSwap.structuredContent).valid,
      ).toBe(true);
      expect(repeatedSwap.structuredContent).toMatchObject({
        operation: {
          result: {
            details: { code: "INITIAL_INITIATIVE_SWAP_REJECTED" },
          },
        },
        projection: {
          battleState: { tag: "initialInitiativeSetup" },
        },
      });

      const swapFinalized = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId: swapSession,
          operation: { kind: "finalizeInitialInitiativeSetup" },
        },
      });
      expect(operationResult(swapFinalized).battleState).toMatchObject({
        tag: "activeBattle",
        battleId: "battle:initiative-swap",
      });

      const noBattleSession = await createPlaySession(client);
      const noBattleLifecycle = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId: noBattleSession,
          operation: { kind: "finalizeInitialInitiativeSetup" },
        },
      });
      expect(noBattleLifecycle.isError).toBe(true);
      if (!isJsonObject(noBattleLifecycle.structuredContent)) {
        throw new Error("Expected typed no-battle lifecycle rejection.");
      }
      expect(
        validateLifecycleOutput(noBattleLifecycle.structuredContent).valid,
      ).toBe(true);
      expect(noBattleLifecycle.structuredContent).toMatchObject({
        operation: {
          result: { details: { code: "BATTLE_LIFECYCLE_NOT_OPEN" } },
        },
        projection: { battleState: { tag: "none" } },
      });
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test(
    "creates, resumes, and independently mutates isolated Play Sessions",
    async () => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const { server } = createDndMcpProtocolServer();
      const client = new Client({
        name: "play-session-protocol-client",
        version: "0.1.0",
      });

      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);

        const first = await createPlaySession(client);
        const second = await createPlaySession(client);
        expect(first).not.toBe(second);

        const firstMutation = await callStructuredTool(client, {
          name: "create_character_draft",
          arguments: {
            playSessionId: first,
            draftId: "draft:first-isolated-session",
          },
        });
        expect(firstMutation).toMatchObject({
          tag: "playSessionAvailable",
          playSessionId: first,
          operation: {
            name: "create_character_draft",
            result: {
              draft: { draftId: "draft:first-isolated-session" },
            },
          },
          projection: { draftIds: ["draft:first-isolated-session"] },
          restoration: { tag: "retained" },
        });
        expect(Array.isArray(firstMutation.unresolvedInputs)).toBe(true);
        expect(firstMutation.unresolvedInputs).not.toEqual([]);
        expect(firstMutation.nextOperations).toContain("fill_creation_holes");

        const secondMutation = await callStructuredTool(client, {
          name: "create_character_draft",
          arguments: {
            playSessionId: second,
            draftId: "draft:second-isolated-session",
          },
        });
        expect(secondMutation.projection).toMatchObject({
          draftIds: ["draft:second-isolated-session"],
        });

        const resumedFirst = await callStructuredTool(client, {
          name: "read_play_session",
          arguments: { playSessionId: first },
        });
        expect(resumedFirst).toMatchObject({
          tag: "playSessionAvailable",
          operation: {
            name: "read_play_session",
            result: { tag: "playSessionResumed", playSessionId: first },
          },
          projection: { draftIds: ["draft:first-isolated-session"] },
          nextOperations: ["discover_creation_holes"],
        });
        expect(resumedFirst.nextOperations).not.toContain("finalize_character");

        const malformedRead = await client.callTool({
          name: "read_play_session",
          arguments: { playSessionId: first, bogus: true },
        });
        expect(malformedRead.isError).toBe(true);
        expect(malformedRead.content).toEqual([
          {
            type: "text",
            text: expect.stringContaining(
              "read_play_session expects valid arguments.",
            ),
          },
        ]);

        const listedCharacters = await callStructuredTool(client, {
          name: "list_characters",
          arguments: { playSessionId: first },
        });
        const listedTools = (await client.listTools()).tools;
        const listCharactersDefinition = listedTools.find(
          (tool) => tool.name === "list_characters",
        );
        expect(listCharactersDefinition?.outputSchema).toBeDefined();
        if (listCharactersDefinition?.outputSchema === undefined) {
          throw new Error("list_characters omitted its output schema.");
        }
        const validateOutput = new AjvJsonSchemaValidator().getValidator(
          listCharactersDefinition.outputSchema as JsonSchemaType,
        );
        const listedOperation = listedCharacters.operation;
        if (!isJsonObject(listedOperation)) {
          throw new Error("Expected a typed list_characters operation.");
        }
        const listedResult = listedOperation.result;
        if (!isJsonObject(listedResult)) {
          throw new Error("Expected a typed list_characters result.");
        }
        const malformedOutput = {
          ...listedCharacters,
          operation: {
            ...listedOperation,
            result: { ...listedResult, characters: "not-a-character-list" },
          },
        };
        expect(validateOutput(malformedOutput).valid).toBe(false);
        expect(
          validateOutput({
            ...listedCharacters,
            operation: {
              ...listedOperation,
              name: "create_play_session",
            },
          }).valid,
        ).toBe(false);
        expect(
          validateOutput({
            ...listedCharacters,
            nextOperations: ["not_an_mcp_operation"],
          }).valid,
        ).toBe(false);

        const absentResult = await client.callTool({
          name: "list_characters",
          arguments: {
            playSessionId: "play-session:00000000-0000-4000-8000-000000000000",
          },
        });
        if (!isJsonObject(absentResult.structuredContent)) {
          throw new Error("Expected unavailable structured content.");
        }
        expect(
          validateOutput({
            ...absentResult.structuredContent,
            nextOperations: ["list_characters"],
          }).valid,
        ).toBe(false);

        const playSessionOperations = new Set<string>(
          PLAY_SESSION_OPERATION_NAMES,
        );
        for (const tool of listedTools) {
          if (!playSessionOperations.has(tool.name)) continue;
          expect(
            JSON.stringify(tool.outputSchema).length,
            tool.name,
          ).toBeLessThan(PLAY_SESSION_OUTPUT_SCHEMA_BYTE_BUDGET);
        }
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    FULL_ACCEPTANCE_TEST_TIMEOUT_MS,
  );

  test("routes finalized character-session mutations through the Play Session protocol", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "character-session-operation-protocol-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      await verifyBaselineVertical(client);

      const playSessionId = await acceptancePlaySessionId(client);
      const characterId = characterIdFromDraftId(
        characterDraftId("draft:stdio-accepted-orc-soldier-fighter"),
      );
      const applyOperationTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (applyOperationTool?.outputSchema === undefined) {
        throw new Error(
          "apply_character_session_operation omitted its output schema.",
        );
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        applyOperationTool.outputSchema as JsonSchemaType,
      );

      const accepted = await client.callTool({
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId,
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
      expect(accepted.isError).not.toBe(true);
      expect(accepted.structuredContent).toBeDefined();
      if (!isJsonObject(accepted.structuredContent)) {
        throw new Error("Accepted operation omitted structured content.");
      }
      expect(validateOutput(accepted.structuredContent).valid).toBe(true);
      expect(accepted.structuredContent).toMatchObject({
        tag: "playSessionAvailable",
        playSessionId,
        operation: {
          name: "apply_character_session_operation",
          result: {
            detail: { tag: "available", characterId },
          },
        },
        projection: { characterIds: [characterId] },
        restoration: { tag: "retained" },
      });
      expect(accepted.structuredContent.nextOperations).toEqual(
        expect.arrayContaining([
          "list_characters",
          "inspect_character_session",
          "start_battle",
        ]),
      );

      const rejected = await client.callTool({
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId,
          operation: {
            kind: "replaceDruidWildShapeKnownForm",
            replacement: {
              replaceStatBlockId: "stat_block_rat",
              selectedStatBlockId: "stat_block_cat",
            },
          },
        },
      });
      expect(rejected.isError).toBe(true);
      expect(rejected.structuredContent).toBeDefined();
      if (!isJsonObject(rejected.structuredContent)) {
        throw new Error("Rejected operation omitted structured content.");
      }
      expect(validateOutput(rejected.structuredContent).valid).toBe(true);
      expect(rejected.structuredContent).toMatchObject({
        tag: "playSessionAvailable",
        playSessionId,
        operation: {
          name: "apply_character_session_operation",
          result: {
            details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
          },
        },
        projection: { characterIds: [characterId] },
        restoration: { tag: "retained" },
      });
      expect(rejected.structuredContent.nextOperations).toEqual(
        expect.arrayContaining([
          "list_characters",
          "inspect_character_session",
          "start_battle",
        ]),
      );
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 90_000);

  test("routes a Character Sheet resource operation through the real MCP client", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "character-resource-protocol-client",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await acceptancePlaySessionId(client);
      const secondPlaySessionId = await createPlaySession(client);
      const decoded = decodePlaySessionId(playSessionId);
      if (decoded._tag === "Left") throw new Error(decoded.left);
      await host.playSessions.run(decoded.right, (root) => {
        const monk = availableCharacterSession({
          characterId: characterId("character:resource-monk"),
          build: armorClassBuild({
            startingClass: "class_monk",
            advancements: ["class_monk"],
          }),
          currentHp: Hp(1),
          tempHp: Hp(0),
          hitPointMaximumReduction: Hp(0),
          conditions: [],
          companion: { tag: "none" },
          resourceExpenditures: [
            {
              tag: "useCountResource",
              unitId: MONK_MONKS_FOCUS_UNIT_ID,
              expended: resourceCount(2),
            },
          ],
          unitLibrary: root.unitLibrary,
        });
        const sorcerer = availableCharacterSession({
          characterId: characterId("character:resource-sorcerer"),
          build: {
            ...armorClassBuild({
              startingClass: "class_sorcerer",
              advancements: ["class_sorcerer", "class_sorcerer"],
            }),
            spellcasting: {
              sources: [
                {
                  sourceUnitId: unitId("class_sorcerer"),
                  spellcastingAbility: "cha" as const,
                  cantrips: [],
                  spellbook: [],
                  preparedSpells: [],
                  spellcastingFocuses: ["arcane_focus"] as const,
                },
              ],
              slotPools: {
                spellcasting: {
                  kind: "spellcasting" as const,
                  slots: [{ spellLevel: 1, count: 3 }],
                },
              },
            },
          },
          currentHp: Hp(1),
          tempHp: Hp(0),
          hitPointMaximumReduction: Hp(0),
          conditions: [],
          companion: { tag: "none" },
          unitLibrary: root.unitLibrary,
        });
        for (const session of [monk, sorcerer]) {
          if (Either.isLeft(session)) throw new Error(session.left.message);
          root.sessionStore.characters.set(session.right);
        }
      });
      const operationTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (operationTool?.outputSchema === undefined) {
        throw new Error("Expected resource operation output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        operationTool.outputSchema as JsonSchemaType,
      );
      await verifyLevelNineRangerExpertiseSheetScenario(client);
      const rangerCharacterId = characterIdFromDraftId(
        characterDraftId("draft:stdio-level-nine-orc-soldier-ranger-expertise"),
      );
      const applied = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: "character:resource-monk",
          operation: {
            kind: "useMonkUncannyMetabolismWhenRollingInitiative",
            martialArtsRoll: 4,
          },
        },
      });
      expect(validateOutput(applied).valid).toBe(true);
      expect(applied).toMatchObject({
        nextOperations: expect.arrayContaining([
          "list_characters",
          "inspect_character_session",
        ]),
        operation: {
          result: {
            result: { tag: "monkUncannyMetabolismUsed", martialArtsRoll: 4 },
          },
        },
      });
      const inspected = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: "character:resource-monk" },
      });
      expect(inspected).toMatchObject({
        operation: {
          result: { detail: { sheetProjection: { currentHp: 7 } } },
        },
      });
      const isolated = await callStructuredTool(client, {
        name: "list_characters",
        arguments: { playSessionId: secondPlaySessionId },
      });
      expect(operationResult(isolated).characters).toEqual([]);

      for (const operation of [
        { kind: "convertFontOfMagicSorceryPointsToSpellSlot", spellLevel: 1 },
        {
          kind: "convertFontOfMagicSpellSlotToSorceryPoints",
          spellLevel: 1,
          spellSlotSource: "ordinary",
        },
      ]) {
        const converted = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:resource-sorcerer",
            operation,
          },
        });
        expect(validateOutput(converted).valid).toBe(true);
      }
      for (let spend = 0; spend < 3; spend += 1) {
        const result = await client.callTool({
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: rangerCharacterId,
            operation: {
              kind: "spendSpellAccessFreeCast",
              sourceUnitId: "ranger_favored_enemy",
              spellId: "hunters_mark",
            },
          },
        });
        expect(result.structuredContent).toBeDefined();
        if (!isJsonObject(result.structuredContent))
          throw new Error("Expected typed resource result.");
        expect(validateOutput(result.structuredContent).valid).toBe(true);
        if (spend === 2) {
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            operation: {
              result: {
                details: {
                  operationKind: "spendSpellAccessFreeCast",
                  message: "Spell Access free cast is exhausted.",
                },
              },
            },
          });
        } else {
          expect(result.isError).not.toBe(true);
        }
      }
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("round-trips a mixed character and Stat Block roster through MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { playSessions, server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "battle-round-trip-protocol-client",
      version: "0.1.0",
    });
    const firstCharacterId = characterId("character:protocol-gh324-first");
    const secondCharacterId = characterId("character:protocol-gh324-second");
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const advertisedTools = (await client.listTools()).tools;
      const startBattleTool = advertisedTools.find(
        (tool) => tool.name === "start_battle",
      );
      const endBattleTool = advertisedTools.find(
        (tool) => tool.name === "end_battle",
      );
      if (
        startBattleTool?.outputSchema === undefined ||
        endBattleTool?.outputSchema === undefined
      ) {
        throw new Error("Expected start_battle and end_battle output schemas.");
      }
      const validateStartOutput = new AjvJsonSchemaValidator().getValidator(
        startBattleTool.outputSchema as JsonSchemaType,
      );
      const validateEndOutput = new AjvJsonSchemaValidator().getValidator(
        endBattleTool.outputSchema as JsonSchemaType,
      );
      const playSessionId = await createPlaySession(client);
      const decoded = decodePlaySessionId(playSessionId);
      if (Either.isLeft(decoded)) throw new Error(decoded.left);
      const installed = await playSessions.run(decoded.right, (root) => {
        for (const id of [firstCharacterId, secondCharacterId]) {
          const session = availableCharacterSession({
            characterId: id,
            build: armorClassBuild({
              startingClass: "class_fighter",
              armor: "armor_chain_mail",
              shield: true,
              weapon: "weapon_longsword",
            }),
            currentHp: Hp(10),
            tempHp: Hp(0),
            hitPointMaximumReduction: Hp(0),
            conditions: [],
            companion: { tag: "none" },
            unitLibrary: root.unitLibrary,
          });
          if (Either.isLeft(session)) throw new Error(session.left.message);
          root.sessionStore.characters.set(session.right);
        }
      });
      if (Either.isLeft(installed))
        throw new Error(installed.left.restoration.guidance);
      const started = await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:protocol-gh324-round-trip",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: firstCharacterId,
              combatantId: "protocol-first",
              initiative: 18,
            },
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: secondCharacterId,
              combatantId: "protocol-second",
              initiative: 12,
            },
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "protocol-goblin",
              initiative: 7,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        },
      });
      expect(validateStartOutput(started).valid).toBe(true);
      expect(operationResult(started)).toMatchObject({
        snapshot: {
          turnOrder: ["protocol-first", "protocol-second", "protocol-goblin"],
        },
      });
      expect(started.projection).toMatchObject({
        characterIds: [firstCharacterId, secondCharacterId],
        battleState: {
          tag: "activeBattle",
          battleId: "battle:protocol-gh324-round-trip",
          currentActorId: "protocol-first",
        },
      });
      const rejectedStart = await client.callTool({
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:protocol-gh324-second",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: firstCharacterId,
              combatantId: "protocol-second-start",
              initiative: 10,
            },
          ],
        },
      });
      expect(rejectedStart.isError).toBe(true);
      if (!isJsonObject(rejectedStart.structuredContent)) {
        throw new Error("Expected typed active-battle start rejection.");
      }
      expect(validateStartOutput(rejectedStart.structuredContent).valid).toBe(
        true,
      );
      expect(rejectedStart.structuredContent).toMatchObject({
        operation: {
          result: {
            error: "A battle session is already active.",
            details: {
              code: "BATTLE_SESSION_ALREADY_ACTIVE",
              battleId: "battle:protocol-gh324-round-trip",
            },
          },
        },
      });
      const read = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      expect(operationResult(read)).toMatchObject({
        snapshot: {
          turnOrder: ["protocol-first", "protocol-second", "protocol-goblin"],
        },
      });
      const inBattle = operationResult(
        await callStructuredTool(client, {
          name: "list_characters",
          arguments: { playSessionId },
        }),
      );
      expect(inBattle.characters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            characterId: firstCharacterId,
            status: "inBattle",
            battleId: "battle:protocol-gh324-round-trip",
          }),
          expect.objectContaining({
            characterId: secondCharacterId,
            status: "inBattle",
            battleId: "battle:protocol-gh324-round-trip",
          }),
        ]),
      );
      const ended = await callStructuredTool(client, {
        name: "end_battle",
        arguments: { playSessionId },
      });
      expect(validateEndOutput(ended).valid).toBe(true);
      expect(operationResult(ended)).toMatchObject({
        endedBattleId: "battle:protocol-gh324-round-trip",
        characters: expect.arrayContaining([
          expect.objectContaining({ characterId: firstCharacterId }),
          expect.objectContaining({ characterId: secondCharacterId }),
        ]),
        session: { battleState: { tag: "none" } },
      });
      expect(ended.projection).toMatchObject({
        battleState: { tag: "none" },
      });
      const available = operationResult(
        await callStructuredTool(client, {
          name: "list_characters",
          arguments: { playSessionId },
        }),
      );
      expect(available.characters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            characterId: firstCharacterId,
            status: "available",
          }),
          expect.objectContaining({
            characterId: secondCharacterId,
            status: "available",
          }),
        ]),
      );
      const rejectedEnd = await client.callTool({
        name: "end_battle",
        arguments: { playSessionId },
      });
      expect(rejectedEnd.isError).toBe(true);
      if (!isJsonObject(rejectedEnd.structuredContent)) {
        throw new Error("Expected typed end_battle recovery.");
      }
      expect(validateEndOutput(rejectedEnd.structuredContent).valid).toBe(true);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("adds and removes Battle combatants through the unified atomic lifecycle surface", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "battle-lifecycle-protocol-client",
      version: "0.1.0",
    });
    const firstCharacterId = characterId("character:lifecycle-first");
    const secondCharacterId = characterId("character:lifecycle-second");

    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      const decoded = decodePlaySessionId(playSessionId);
      if (Either.isLeft(decoded)) throw new Error(decoded.left);
      const installed = await host.playSessions.run(decoded.right, (root) => {
        for (const character of [firstCharacterId, secondCharacterId]) {
          const session = availableCharacterSession({
            characterId: character,
            build: armorClassBuild({
              startingClass: "class_fighter",
              armor: "armor_chain_mail",
              shield: true,
              weapon: "weapon_longsword",
            }),
            currentHp: Hp(10),
            tempHp: Hp(0),
            hitPointMaximumReduction: Hp(0),
            conditions: [],
            companion: { tag: "none" },
            unitLibrary: root.unitLibrary,
          });
          if (Either.isLeft(session)) throw new Error(session.left.message);
          root.sessionStore.characters.set(session.right);
        }
      });
      if (Either.isLeft(installed))
        throw new Error(installed.left.restoration.guidance);

      await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:lifecycle-protocol",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: firstCharacterId,
              combatantId: "lifecycle-first",
              initiative: 18,
            },
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "lifecycle-goblin",
              initiative: 8,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        },
      });

      const lifecycleTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "battle_lifecycle",
      );
      if (lifecycleTool?.outputSchema === undefined) {
        throw new Error("Expected Battle lifecycle output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        lifecycleTool.outputSchema as JsonSchemaType,
      );

      const addedStatBlock = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_skeleton",
              combatantId: "lifecycle-skeleton",
              initiative: 4,
              admissionSource: { kind: "encounterParticipant" },
            },
          },
        },
      });
      expect(validateOutput(addedStatBlock).valid).toBe(true);
      expect(operationResult(addedStatBlock)).toMatchObject({
        result: {
          tag: "combatantAdded",
          combatantId: "lifecycle-skeleton",
        },
      });

      const removedStatBlock = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "removeCombatant",
            combatantId: "lifecycle-skeleton",
          },
        },
      });
      expect(validateOutput(removedStatBlock).valid).toBe(true);
      expect(operationResult(removedStatBlock)).toMatchObject({
        result: {
          tag: "combatantRemoved",
          combatantId: "lifecycle-skeleton",
          removedCombatantIds: ["lifecycle-skeleton"],
        },
      });

      const added = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: secondCharacterId,
              combatantId: "lifecycle-second",
              initiative: 5,
            },
          },
        },
      });
      expect(validateOutput(added).valid).toBe(true);
      expect(operationResult(added)).toMatchObject({
        result: {
          tag: "combatantAdded",
          combatantId: "lifecycle-second",
        },
      });
      const occupied = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: secondCharacterId },
      });
      expect(JSON.stringify(occupied)).toContain('"tag":"inBattle"');
      expect(occupied.nextOperations).toContain("battle_lifecycle");

      const conflict = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: secondCharacterId,
              combatantId: "lifecycle-second-again",
              initiative: 4,
            },
          },
        },
      });
      expect(conflict.isError).toBe(true);
      if (!isJsonObject(conflict.structuredContent)) {
        throw new Error("Expected typed Battle occupancy conflict.");
      }
      expect(validateOutput(conflict.structuredContent).valid).toBe(true);
      expect(conflict.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              code: "CHARACTER_ALREADY_IN_BATTLE",
              recovery: { tag: "battleAndCharacterSessionsUnchanged" },
            },
          },
        },
      });

      const removed = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "removeCombatant",
            combatantId: "lifecycle-first",
          },
        },
      });
      expect(validateOutput(removed).valid).toBe(true);
      expect(operationResult(removed)).toMatchObject({
        result: {
          tag: "combatantRemoved",
          combatantId: "lifecycle-first",
          removedCombatantIds: ["lifecycle-first"],
        },
      });
      const settled = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: firstCharacterId },
      });
      expect(JSON.stringify(settled)).toContain('"tag":"available"');

      const battleBeforeFailure = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      const captureDeepProjection = () =>
        host.playSessions.run(decoded.right, (root) => {
          const projection = adminProjection(root);
          if (Either.isLeft(projection)) {
            throw new Error(
              `Expected a complete Play Session projection: ${projection.left}`,
            );
          }
          return {
            projection: projection.right,
            sessionSnapshot: root.sessionStore.snapshot(),
            characterSessions: Array.from(
              root.sessionStore.characters.entries(),
            ),
            battleState: root.sessionStore.battleState,
            battleSession: root.sessionStore.battleSession,
            transientBattleFills: root.sessionStore.pendingBattleFills,
          };
        });
      const deepBeforeFailure = await captureDeepProjection();
      if (Either.isLeft(deepBeforeFailure)) {
        throw new Error(deepBeforeFailure.left.restoration.guidance);
      }
      await host.playSessions.run(decoded.right, (root) => {
        root.sessionStore.characters.setAll = () =>
          Either.left({
            tag: "unknownCharacterSession",
            characterId: characterId("character:injected"),
          });
      });
      const rejected = await client.callTool({
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "removeCombatant",
            combatantId: "lifecycle-second",
          },
        },
      });
      expect(rejected.isError).toBe(true);
      if (!isJsonObject(rejected.structuredContent)) {
        throw new Error("Expected typed Battle lifecycle recovery.");
      }
      expect(validateOutput(rejected.structuredContent).valid).toBe(true);
      expect(rejected.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              code: "CHARACTER_SESSION_COMMIT_INVALID",
              recovery: { tag: "battleAndCharacterSessionsUnchanged" },
            },
          },
        },
      });
      const deepAfterFailure = await captureDeepProjection();
      if (Either.isLeft(deepAfterFailure)) {
        throw new Error(deepAfterFailure.left.restoration.guidance);
      }
      expect(deepAfterFailure.right).toEqual(deepBeforeFailure.right);
      const battleAfterFailure = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      expect(operationResult(battleAfterFailure).snapshot).toEqual(
        operationResult(battleBeforeFailure).snapshot,
      );
      const stillOccupied = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: secondCharacterId },
      });
      expect(JSON.stringify(stillOccupied)).toContain('"tag":"inBattle"');
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("returns one typed restoration result for a handle absent from the process", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "unavailable-play-session-client",
      version: "0.1.0",
    });
    const absentHandle = "play-session:00000000-0000-4000-8000-000000000000";

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.callTool({
        name: "list_characters",
        arguments: { playSessionId: absentHandle },
      });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toEqual({
        tag: "playSessionUnavailable",
        playSessionId: absentHandle,
        operation: {
          name: "list_characters",
          result: {
            tag: "playSessionUnavailable",
            restoration: {
              tag: "newSessionRequired",
              guidance:
                "Create a new Play Session, then rebuild the desired state from model-visible or user-provided facts. The unavailable handle cannot be restored.",
            },
          },
        },
        projection: null,
        unresolvedInputs: [],
        nextOperations: ["create_play_session"],
        restoration: {
          tag: "newSessionRequired",
          guidance:
            "Create a new Play Session, then rebuild the desired state from model-visible or user-provided facts. The unavailable handle cannot be restored.",
        },
      });
      expect(JSON.stringify(result.structuredContent)).not.toMatch(
        /expired|restart|evict|deleted/i,
      );
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  test("returns the current creation frontier after ambiguous and stale fills", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "creation-restoration-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      const draftId = "draft:protocol-current-frontier";
      const created = await callStructuredTool(client, {
        name: "create_character_draft",
        arguments: { playSessionId, draftId },
      });
      const creationResult = operationResult(created);
      const holes = arrayField(creationResult, "holes");
      const progressionHole = holes.find(
        (hole) =>
          isJsonObject(hole) &&
          hole.holeId === "cc:draft:draft.progression.initial",
      );
      if (!isJsonObject(progressionHole)) {
        throw new Error("Expected the current progression hole.");
      }
      const options = arrayField(progressionHole, "options");
      const optionIds = options.slice(0, 2).map((option) => {
        if (!isJsonObject(option) || typeof option.optionId !== "string") {
          throw new Error("Expected current progression option ids.");
        }
        return option.optionId;
      });
      expect(optionIds).toHaveLength(2);
      const progressionOptionId = optionIds[0];
      if (progressionOptionId === undefined) {
        throw new Error("Expected a current progression option id.");
      }

      const ambiguous = await callStructuredTool(client, {
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 0,
          fills: [
            {
              kind: "choice",
              holeId: progressionHole.holeId,
              optionIds,
            },
          ],
        },
      });
      expect(ambiguous).toMatchObject({
        operation: {
          result: {
            result: {
              tag: "rejected",
              issues: [{ tag: "illegalFill", code: "tooManyChoices" }],
            },
            storedDraft: { revision: 0 },
          },
        },
        restoration: { tag: "retained" },
      });
      expect(ambiguous.unresolvedInputs).not.toEqual([]);
      expect(ambiguous.nextOperations).toEqual(
        expect.arrayContaining([
          "fill_creation_holes",
          "discover_creation_holes",
        ]),
      );

      const progressed = await callStructuredTool(client, {
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 0,
          fills: [
            {
              kind: "choice",
              holeId: progressionHole.holeId,
              optionIds: [progressionOptionId],
            },
          ],
        },
      });
      expect(progressed).toMatchObject({
        operation: { result: { storedDraft: { revision: 1 } } },
      });
      const discovered = await callStructuredTool(client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      const currentHoles = arrayField(operationResult(discovered), "holes");
      const currentSingleChoiceHole = currentHoles.find((hole) => {
        if (!isJsonObject(hole) || hole.kind !== "choice") return false;
        if (!isJsonObject(hole.cardinality)) return false;
        return (
          hole.cardinality.tag === "exactly" && hole.cardinality.count === 1
        );
      });
      if (!isJsonObject(currentSingleChoiceHole)) {
        throw new Error("Expected a current single-choice creation hole.");
      }
      const currentOptions = arrayField(currentSingleChoiceHole, "options");
      const currentOption = currentOptions[0];
      if (
        !isJsonObject(currentOption) ||
        typeof currentOption.optionId !== "string"
      ) {
        throw new Error("Expected a current single-choice option id.");
      }
      const currentFill = {
        kind: "choice",
        holeId: currentSingleChoiceHole.holeId,
        optionIds: [currentOption.optionId],
      };
      const stale = await callStructuredTool(client, {
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 0,
          fills: [currentFill],
        },
      });
      expect(stale).toMatchObject({
        operation: {
          result: {
            result: {
              tag: "rejected",
              issues: [{ tag: "illegalBatch", code: "staleRevision" }],
            },
            storedDraft: { revision: 1 },
          },
        },
        restoration: { tag: "retained" },
      });
      expect(stale.unresolvedInputs).not.toEqual([]);
      const staleFillResult = objectField(operationResult(stale), "result");
      expect(arrayField(staleFillResult, "holes")).toEqual(currentHoles);
      const retried = await callStructuredTool(client, {
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 1,
          fills: [currentFill],
        },
      });
      expect(retried).toMatchObject({
        operation: {
          result: {
            result: { tag: "accepted" },
            storedDraft: { revision: 2 },
          },
        },
      });
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  test("keeps the LLM drivability scenarios documented", () => {
    verifyAgentConversationScenarios();
  });

  test(
    "runs the full acceptance client over in-memory MCP",
    async () => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const { server } = createDndMcpProtocolServer();
      const client = new Client({
        name: "dnd-in-memory-acceptance-client",
        version: "0.1.0",
      });

      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);

        await verifyToolContract(client);
        await verifyBaselineVertical(client);
        await verifyWidthVertical(client);
        await verifyLevelThreeWizardVertical(client);
        await verifyLevelFourWizardVertical(client);
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    FULL_ACCEPTANCE_TEST_TIMEOUT_MS,
  );

  test("runs the level 5 Wizard Fireball acceptance client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-five-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelFiveWizardFireballBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("runs the level 6 Rogue Steady Aim acceptance client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-six-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelSixRogueSteadyAimBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("runs the Wizard Ice Knife battle handoff client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-ice-knife-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyWizardIceKnifeBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("routes Lay On Hands through the real MCP client and returns its envelope", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "lay-on-hands-client",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      const applyTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (applyTool?.outputSchema === undefined) {
        throw new Error("Expected healing operation output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        applyTool.outputSchema as JsonSchemaType,
      );
      await installHealingSessions(host, playSessionId, {
        source: {
          characterId: "character:lay-source",
          build: armorClassBuild({ startingClass: "class_paladin" }),
          currentHp: Hp(10),
        },
        target: {
          characterId: "character:lay-target",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(1),
        },
      });
      const applied = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: "character:lay-source",
          operation: {
            kind: "applyLayOnHands",
            targetCharacterId: "character:lay-target",
            restoreHp: 3,
            removePoisoned: false,
          },
        },
      });
      expect(validateOutput(applied).valid).toBe(true);
      expect(applied).toMatchObject({
        operation: { result: { result: { tag: "layOnHandsApplied" } } },
        nextOperations: expect.arrayContaining([
          "apply_character_session_operation",
        ]),
      });
      const detail = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: "character:lay-target" },
      });
      expect(JSON.stringify(detail)).toContain('"currentHp":4');
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("returns atomic recovery when a routed spell-rest batch commit fails", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "spell-rest-benefit-client",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      const applyTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (applyTool?.outputSchema === undefined) {
        throw new Error("Expected healing operation output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        applyTool.outputSchema as JsonSchemaType,
      );
      await installHealingSessions(host, playSessionId, {
        source: {
          characterId: "character:rest-source",
          build: prayerOfHealingClericBuild(),
          currentHp: Hp(10),
        },
        target: {
          characterId: "character:rest-target",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(1),
        },
      });
      const decoded = decodePlaySessionId(playSessionId);
      if (decoded._tag === "Left") throw new Error(decoded.left);
      const sourceBefore = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: "character:rest-source" },
      });
      await host.playSessions.run(decoded.right, (root) => {
        root.sessionStore.characters.setAll = () =>
          Either.left({
            tag: "unknownCharacterSession",
            characterId: characterId("character:injected"),
          });
      });
      const rejected = await client.callTool({
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: "character:rest-source",
          operation: {
            kind: "applySpellRestBenefit",
            spellId: "prayer_of_healing",
            castLevel: 2,
            recipients: [
              {
                characterId: "character:rest-target",
                eligibility: { remainedWithinRangeForEntireCasting: true },
                healingRolls: [4, 4],
              },
            ],
          },
        },
      });
      expect(rejected.isError).toBe(true);
      if (!isJsonObject(rejected.structuredContent)) {
        throw new Error("Expected typed healing recovery content.");
      }
      expect(validateOutput(rejected.structuredContent).valid).toBe(true);
      expect(rejected.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              code: "CHARACTER_SESSION_COMMIT_INVALID",
              recovery: { tag: "characterSessionsUnchanged" },
            },
          },
        },
      });
      const sourceAfter = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: "character:rest-source" },
      });
      const target = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: { playSessionId, characterId: "character:rest-target" },
      });
      expect(sourceAfter).toEqual(sourceBefore);
      expect(sourceAfter).toMatchObject({
        operation: {
          result: {
            detail: {
              sheetProjection: {
                spellSlots: expect.arrayContaining([
                  { spellLevel: 2, count: 2, expended: 0 },
                ]),
              },
            },
          },
        },
      });
      expect(JSON.stringify(target)).toContain('"currentHp":1');
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("routes unknown healing sources through operation-aware recovery", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "healing-source-guard-client",
      version: "0.1.0",
    });
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      const rejected = await client.callTool({
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: "character:missing-source",
          operation: {
            kind: "applyLayOnHands",
            targetCharacterId: "character:missing-source",
            restoreHp: 1,
            removePoisoned: false,
          },
        },
      });
      expect(rejected.isError).toBe(true);
      expect(rejected.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              operationKind: "applyLayOnHands",
              code: "UNKNOWN_CHARACTER_SESSION",
              recovery: {
                tag: "characterSessionsUnchanged",
                affectedCharacterIds: ["character:missing-source"],
              },
            },
          },
        },
      });
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});

async function installHealingSessions(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: string,
  fixtures: {
    readonly source: {
      readonly characterId: string;
      readonly build: Parameters<typeof availableCharacterSession>[0]["build"];
      readonly currentHp: ReturnType<typeof Hp>;
    };
    readonly target: {
      readonly characterId: string;
      readonly build: Parameters<typeof availableCharacterSession>[0]["build"];
      readonly currentHp: ReturnType<typeof Hp>;
    };
  },
) {
  const decoded = decodePlaySessionId(playSessionId);
  if (decoded._tag === "Left") throw new Error(decoded.left);
  const result = await host.playSessions.run(decoded.right, (root) => {
    for (const fixture of [fixtures.source, fixtures.target]) {
      const session = availableCharacterSession({
        characterId: characterId(fixture.characterId),
        build: fixture.build,
        currentHp: fixture.currentHp,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary: root.unitLibrary,
      });
      if (Either.isLeft(session)) throw new Error(session.left.message);
      root.sessionStore.characters.set(session.right);
    }
  });
  if (Either.isLeft(result)) throw new Error("Expected a live Play Session.");
}

async function installInitiativeSession(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: string,
  input: {
    readonly characterId: string;
    readonly build: Parameters<typeof availableCharacterSession>[0]["build"];
  },
) {
  const decoded = decodePlaySessionId(playSessionId);
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  const result = await host.playSessions.run(decoded.right, (root) => {
    const session = availableCharacterSession({
      characterId: characterId(input.characterId),
      build: input.build,
      currentHp: Hp(1),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      companion: { tag: "none" },
      unitLibrary: root.unitLibrary,
    });
    if (Either.isLeft(session)) throw new Error(session.left.message);
    root.sessionStore.characters.set(session.right);
  });
  if (Either.isLeft(result)) throw new Error("Expected a live Play Session.");
}

async function createPlaySession(client: Client): Promise<string> {
  const created = await callStructuredTool(client, {
    name: "create_play_session",
    arguments: {},
  });
  expect(created).toMatchObject({
    tag: "playSessionAvailable",
    operation: {
      name: "create_play_session",
      result: { tag: "playSessionCreated" },
    },
    projection: {
      draftIds: [],
      characterIds: [],
      selectedStatBlockId: null,
      battleState: { tag: "none" },
    },
  });
  if (typeof created.playSessionId !== "string") {
    throw new Error("create_play_session did not return a string handle.");
  }
  return created.playSessionId;
}

async function callStructuredTool(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
): Promise<Readonly<Record<string, unknown>>> {
  const result = await client.callTool(input);
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toBeDefined();
  if (!isJsonObject(result.structuredContent)) {
    throw new Error(`${input.name} did not return an object payload.`);
  }
  return result.structuredContent;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function objectField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const result = value[field];
  if (!isJsonObject(result)) throw new Error(`Expected ${field} object.`);
  return result;
}
