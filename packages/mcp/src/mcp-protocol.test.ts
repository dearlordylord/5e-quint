import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { describe, expect, test } from "vitest";
import { Either } from "effect";
import { decodeDiceSeed, type DiceSeed } from "./dice-sampling-service.ts";
import { battleRuntimeSessionForTest } from "@dnd/battle-runtime/test-support";
import { characterId, combatantId } from "@dnd/battle-runtime";
import {
  MONK_MONKS_FOCUS_UNIT_ID,
  characterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp, resourceCount } from "@dnd/shared/types";
import {
  elapsedTimeTicks,
  ELAPSED_TIME_TICKS_PER_HOUR,
} from "@dnd/shared/elapsed-time";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import {
  armorClassBuild,
  bardJackOfAllTradesBuild,
  druidCircleLandBuild,
  prayerOfHealingClericBuild,
  weaponMasteryBuild,
  wizardBuild,
} from "../../character-sheet-runtime/src/test-support.test-support.ts";

import {
  acceptancePlaySessionId,
  acceptancePlaySessionRoutedArgs,
  retainAcceptancePlaySessionAccess,
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
import { decodeGuestAccessGrant } from "./play-session-access.ts";
import { requireJsonSchema } from "../test-support/json-schema.ts";
import { CHARACTER_SESSION_QUERY_KIND_VALUES } from "./character-session-query-tool-input.ts";
import { createMcpApplicationServices } from "./composition-root.ts";
import { availableCharacterSession } from "./session-store.ts";
import { adminProjection } from "./admin-mirror.ts";

const guestAccessGrantByPlaySessionId = new Map<string, string>();
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
      const hiddenCall = await callRawTool(client, {
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

  test("battle-initial-initiative-setup-protocol", async () => {
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
        ajvJsonSchema(startBattleTool.outputSchema),
      );
      const validateLifecycleOutput = new AjvJsonSchemaValidator().getValidator(
        ajvJsonSchema(battleLifecycleTool.outputSchema),
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
          companionAdmissions: [],
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

      const endBeforeFinalize = await callRawTool(client, {
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

      const activeLifecycle = await callRawTool(client, {
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
          companionAdmissions: [],
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

      const invalidWitness = await callRawTool(client, {
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

      const repeatedSwap = await callRawTool(client, {
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
      const noBattleLifecycle = await callRawTool(client, {
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

      const noBattleSuccessEnvelope = {
        ...noBattleLifecycle.structuredContent,
        operation: {
          name: "battle_lifecycle",
          result: {
            battleState: { tag: "none" },
            snapshot: null,
            availableActs: [],
            admittedSpellPresentations: [],
            presentedInterruptChoices: [],
            session: objectField(
              noBattleLifecycle.structuredContent,
              "projection",
            ),
          },
        },
      };
      expect(validateLifecycleOutput(noBattleSuccessEnvelope).valid).toBe(
        false,
      );
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

        const malformedRead = await callRawTool(client, {
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
          ajvJsonSchema(listCharactersDefinition.outputSchema),
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

        const absentResult = await callRawTool(client, {
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

  test("gives each fresh Play Session its own deterministic DRDice stream", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const diceSeeds: DiceSeed[] = [
      requireDiceSeed(["00000001", "00000002", "00000003", "00000004"]),
      requireDiceSeed(["00000005", "00000006", "00000007", "00000008"]),
    ];
    const { server } = createDndMcpProtocolServer(
      createMcpApplicationServices(),
      undefined,
      {
        playSessionDiceSeedFactory: () => {
          const seed = diceSeeds.shift();
          if (seed === undefined) {
            throw new Error("Unexpected Play Session construction.");
          }
          return seed;
        },
      },
    );
    const client = new Client({
      name: "play-session-random-protocol-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const first = await createPlaySession(client);
      const second = await createPlaySession(client);

      const firstRoll = await callStructuredTool(client, {
        name: "roll_dice",
        arguments: {
          playSessionId: first,
          requestId: "00000000-0000-4000-8000-000000000101",
          groups: [{ dice: 1, dieSize: 6 }],
        },
      });
      const secondRoll = await callStructuredTool(client, {
        name: "roll_dice",
        arguments: {
          playSessionId: second,
          requestId: "00000000-0000-4000-8000-000000000102",
          groups: [{ dice: 1, dieSize: 6 }],
        },
      });
      const firstRollAgain = await callStructuredTool(client, {
        name: "roll_dice",
        arguments: {
          playSessionId: first,
          requestId: "00000000-0000-4000-8000-000000000103",
          groups: [{ dice: 1, dieSize: 6 }],
        },
      });
      const secondRollAgain = await callStructuredTool(client, {
        name: "roll_dice",
        arguments: {
          playSessionId: second,
          requestId: "00000000-0000-4000-8000-000000000104",
          groups: [{ dice: 1, dieSize: 6 }],
        },
      });

      expect(operationResult(firstRoll)).toMatchObject({
        disposition: "sampled",
      });
      expect(operationResult(secondRoll)).toMatchObject({
        disposition: "sampled",
      });
      expect(operationResult(firstRollAgain)).toMatchObject({
        disposition: "sampled",
      });
      expect(operationResult(secondRollAgain)).toMatchObject({
        disposition: "sampled",
      });
      expect(operationResult(firstRoll).groups).not.toEqual(
        operationResult(secondRoll).groups,
      );

      const firstCharacters = await callStructuredTool(client, {
        name: "list_characters",
        arguments: { playSessionId: first },
      });
      const secondCharacters = await callStructuredTool(client, {
        name: "list_characters",
        arguments: { playSessionId: second },
      });
      expect(operationResult(firstCharacters).characters).toEqual([]);
      expect(operationResult(secondCharacters).characters).toEqual([]);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  test("character-class-level-advancement-protocol", async () => {
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
        ajvJsonSchema(applyOperationTool.outputSchema),
      );

      const accepted = await callRawTool(client, {
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
      expect(accepted.isError, JSON.stringify(accepted)).not.toBe(true);
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

      const rejected = await callRawTool(client, {
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

  test("character-resource-operation-protocol", async () => {
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
      const playSessionId = await createPlaySession(client);
      const secondPlaySessionId = await createPlaySession(client);
      const retainedGrant = guestAccessGrantByPlaySessionId.get(playSessionId);
      if (retainedGrant === undefined) {
        throw new Error("Expected retained Guest Play Session access.");
      }
      retainAcceptancePlaySessionAccess(client, {
        playSessionId,
        guestAccessGrant: retainedGrant,
      });
      const decoded = decodePlaySessionId(playSessionId);
      if (decoded._tag === "Left") throw new Error(decoded.left);
      await host.playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
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
          if (Either.isLeft(monk)) throw new Error(monk.left.message);
          root.sessionStore.characters.set(monk.right);
        },
      );
      const operationTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (operationTool?.outputSchema === undefined) {
        throw new Error("Expected resource operation output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        ajvJsonSchema(operationTool.outputSchema),
      );
      const rawDiceRaw = await callRawTool(client, {
        name: "roll_dice",
        arguments: {
          playSessionId,
          requestId: "00000000-0000-4000-8000-000000000105",
          groups: [{ dice: 1, dieSize: 20 }],
        },
      });
      if (rawDiceRaw.isError === true) {
        throw new Error(`roll_dice failed: ${JSON.stringify(rawDiceRaw)}`);
      }
      if (!isJsonObject(rawDiceRaw.structuredContent)) {
        throw new Error("Expected typed roll_dice result.");
      }
      const rawDice = operationResult(rawDiceRaw.structuredContent);
      expect(rawDice.requestId).toBe("00000000-0000-4000-8000-000000000105");
      expect(rawDice.randomSource).toMatchObject({
        diceGroupSemanticProfile:
          "dice-groups-v1/ordered-atomic-rejection-5-blocks-x-5-attempts",
        stateSchemaVersion: 1,
      });
      expect(arrayField(rawDice, "groups")[0]).toMatchObject({
        dieSize: 20,
      });
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

      for (let spend = 0; spend < 3; spend += 1) {
        const result = await callRawTool(client, {
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
          expect(result.isError, JSON.stringify(result)).not.toBe(true);
        }
      }
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("character-font-of-magic-protocol", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer();
    const client = new Client({
      name: "character-font-of-magic-protocol-client",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const playSessionId = await createPlaySession(client);
      await installFontOfMagicSession(host, playSessionId);
      const applyTool = (await client.listTools()).tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      if (applyTool?.outputSchema === undefined) {
        throw new Error("Expected Font of Magic operation output schema.");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        requireJsonSchema(applyTool.outputSchema, "Font of Magic outputSchema"),
      );
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
            characterId: "character:font-sorcerer",
            operation,
          },
        });
        expect(validateOutput(converted).valid).toBe(true);
        expect(operationResult(converted).result).toMatchObject({
          tag:
            operation.kind === "convertFontOfMagicSorceryPointsToSpellSlot"
              ? "fontOfMagicSorceryPointsConvertedToSpellSlot"
              : "fontOfMagicSpellSlotConvertedToSorceryPoints",
        });
      }
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  }, 30_000);

  test("character-row-coverage-druid-known-form", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-druid-known-form",
      async ({ client, playSessionId, validateApply }) => {
        const replaced = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-druid",
            operation: {
              kind: "replaceDruidWildShapeKnownForm",
              replacement: {
                replaceStatBlockId: "stat_block_rat",
                selectedStatBlockId: "stat_block_cat",
              },
            },
          },
        });
        expect(validateApply(replaced).valid).toBe(true);
        expect(operationResult(replaced)).toMatchObject({
          detail: { tag: "available", characterId: "character:row-druid" },
        });
      },
    );
  }, 60_000);

  test("character-row-coverage-companion-retention", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-companion-retention",
      async ({ client, playSessionId, validateApply }) => {
        const retained = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-companion-wizard",
            operation: {
              kind: "retainOneAtATimeCompanion",
              companionId: "row-coverage-familiar",
              source: { tag: "ritualSpell", spellId: "find_familiar" },
              selectedForm: { tag: "normalNamedForm", formId: "cat" },
              creatureTypeOverrideChoiceId: "fey",
            },
          },
        });
        expect(validateApply(retained).valid).toBe(true);
        expect(operationResult(retained)).toMatchObject({
          character: {
            companion: {
              companion: { companionId: "row-coverage-familiar" },
            },
          },
        });
      },
    );
  }, 60_000);

  test("character-row-coverage-rest-lifecycle", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-rest-lifecycle",
      async ({ client, playSessionId, validateApply }) => {
        const shortRest = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-rest-fighter",
            operation: {
              kind: "completeShortRest",
              restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
            },
          },
        });
        expect(validateApply(shortRest).valid).toBe(true);
        expect(operationResult(shortRest)).toMatchObject({
          result: {
            tag: "shortRestCompleted",
            restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
          },
        });

        const longRest = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-rest-fighter",
            operation: {
              kind: "completeLongRest",
              timing: { tag: "noPriorLongRest" },
              restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 8,
            },
          },
        });
        expect(validateApply(longRest).valid).toBe(true);
        expect(operationResult(longRest)).toMatchObject({
          result: {
            tag: "longRestCompleted",
            restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 8,
          },
        });

        const interruptedLongRest = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-interrupted-rest-fighter",
            operation: {
              kind: "interruptLongRest",
              timing: { tag: "noPriorLongRest" },
              interruptionSegments: [
                {
                  cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
                  interruption: "takeDamage",
                  spendHitDice: [{ classUnitId: "class_fighter", roll: 4 }],
                },
              ],
              completion: {
                cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 10,
              },
            },
          },
        });
        expect(validateApply(interruptedLongRest).valid).toBe(true);
        expect(operationResult(interruptedLongRest)).toMatchObject({
          result: { tag: "longRestCompleted" },
        });
      },
    );
  }, 60_000);

  test("character-row-coverage-calendar-time", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-calendar-time",
      async ({ client, playSessionId, validateApply }) => {
        const calendarResolved = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-calendar-fighter",
            operation: {
              kind: "passCalendarTime",
              duration: { kind: "timeSpan", unit: "hour", amount: 1 },
              fills: [],
            },
          },
        });
        expect(validateApply(calendarResolved).valid).toBe(true);
        expect(operationResult(calendarResolved)).toMatchObject({
          result: {
            tag: "resolved",
            elapsedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
          },
        });

        const calendarNeedsRoll = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-stable-fighter",
            operation: {
              kind: "passCalendarTime",
              duration: { kind: "timeSpan", unit: "hour", amount: 1 },
              fills: [],
            },
          },
        });
        expect(validateApply(calendarNeedsRoll).valid).toBe(true);
        const stableResult = operationResult(calendarNeedsRoll);
        expect(stableResult).toMatchObject({
          result: { tag: "needsHoles", holes: expect.any(Array) },
        });
        const stableRollHole = arrayField(
          objectField(stableResult, "result"),
          "holes",
        ).find(
          (hole): hole is Readonly<Record<string, unknown>> =>
            isJsonObject(hole) && hole.kind === "rolledDice",
        );
        if (!stableRollHole || typeof stableRollHole.holeId !== "string") {
          throw new Error("Expected a Stable recovery rolled-dice hole.");
        }

        const calendarFilled = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-stable-fighter",
            operation: {
              kind: "passCalendarTime",
              duration: { kind: "timeSpan", unit: "hour", amount: 1 },
              fills: [
                {
                  kind: "rolledDice",
                  holeId: stableRollHole.holeId,
                  value: [{ results: [2] }],
                },
              ],
            },
          },
        });
        expect(validateApply(calendarFilled).valid).toBe(true);
        expect(operationResult(calendarFilled)).toMatchObject({
          result: { tag: "resolved" },
        });
      },
    );
  }, 60_000);

  test("character-row-coverage-ritual-query", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-ritual-query",
      async ({ client, playSessionId, validateQuery }) => {
        const ritualAccess = await callStructuredTool(client, {
          name: "query_character_session",
          arguments: {
            playSessionId,
            characterId: "character:row-ritual-wizard",
            query: { kind: "spellbookRitualAccesses" },
          },
        });
        expect(validateQuery(ritualAccess).valid).toBe(true);
        const ritualAccessResult = operationResult(ritualAccess);
        const ritualAccessQuery = objectField(ritualAccessResult, "query");
        expect(ritualAccessQuery.kind).toBe("spellbookRitualAccesses");
        expect(arrayField(ritualAccessQuery, "projection")).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              tag: "spellbookRitual",
              spell: expect.objectContaining({ id: "detect_magic" }),
            }),
          ]),
        );

        const ritualInvocation = await callStructuredTool(client, {
          name: "query_character_session",
          arguments: {
            playSessionId,
            characterId: "character:row-ritual-wizard",
            query: {
              kind: "spellInvocation",
              spellId: "detect_magic",
              invocation: { kind: "ritual" },
            },
          },
        });
        expect(validateQuery(ritualInvocation).valid).toBe(true);
        expect(operationResult(ritualInvocation)).toMatchObject({
          query: {
            projection: {
              tag: "accepted",
              invocation: {
                tag: "spellbookRitual",
                spellId: "detect_magic",
              },
            },
          },
        });
      },
    );
  }, 60_000);

  test("character-sheet-derived-queries-protocol", async () => {
    await withCharacterRowCoverage(
      "character-sheet-derived-queries-protocol",
      async ({ client, host, playSessionId, validateQuery }) => {
        await installDerivedQueryCoverageSessions(host, playSessionId);
        const observedQueryKinds = new Set<string>();
        const query = async (
          characterId: string,
          input: Readonly<Record<string, unknown>>,
        ): Promise<Readonly<Record<string, unknown>>> => {
          const response = await callStructuredTool(client, {
            name: "query_character_session",
            arguments: {
              playSessionId,
              characterId,
              query: input,
            },
          });
          expect(validateQuery(response).valid).toBe(true);
          const result = operationResult(response);
          const projectedQuery = objectField(result, "query");
          if (typeof projectedQuery.kind !== "string") {
            throw new Error("Expected a returned Character Sheet query kind.");
          }
          observedQueryKinds.add(projectedQuery.kind);
          expect(projectedQuery.kind).toBe(input.kind);
          return projectedQuery;
        };

        const ability = await query("character:row-derived-barbarian", {
          kind: "abilityCheckAbility",
          skill: "stealth",
          defaultAbility: "dex",
          activeFeatureUnitIds: ["barbarian_rage"],
        });
        expect(ability).toMatchObject({
          kind: "abilityCheckAbility",
          projection: {
            defaultAbility: "dex",
            optionalSubstitutions: [
              {
                ability: "str",
                sourceUnitId: "barbarian_primal_knowledge",
                requiredActiveFeatureUnitId: "barbarian_rage",
              },
            ],
          },
        });

        const proficiency = await query("character:row-derived-bard", {
          kind: "abilityCheckProficiencyBonus",
          skill: "performance",
          otherProficiencyBonus: { tag: "noOtherProficiencyBonus" },
        });
        expect(proficiency).toMatchObject({
          kind: "abilityCheckProficiencyBonus",
          projection: {
            proficiencyBonus: {
              tag: "jackOfAllTrades",
              sourceUnitId: "bard_jack_of_all_trades",
              skill: "performance",
              bonus: 1,
            },
          },
        });

        const jump = await query("character:row-derived-rogue", {
          kind: "jumpDistanceAbility",
          defaultAbility: "str",
        });
        expect(jump).toMatchObject({
          kind: "jumpDistanceAbility",
          projection: {
            defaultAbility: "str",
            optionalSubstitutions: [
              {
                ability: "dex",
                replaces: "str",
                sourceUnitId: "rogue_second_story_work",
              },
            ],
          },
        });

        const linkedSpeed = await query("character:row-derived-rogue", {
          kind: "linkedSpeedGrants",
        });
        expect(arrayField(linkedSpeed, "projection")).toEqual([
          {
            sourceUnitId: "rogue_second_story_work",
            speedKind: "climb",
            feet: { kind: "walk_speed" },
          },
        ]);

        const armorClass = await query("character:row-derived-armor", {
          kind: "armorClass",
          baseChoice: {
            kind: "class_feature",
            unitId: "barbarian_unarmored_defense",
          },
        });
        expect(armorClass).toMatchObject({
          kind: "armorClass",
          projection: {
            armorClass: 13,
            state: {
              base: {
                source: "unarmored_defense",
                sourceUnitId: "barbarian_unarmored_defense",
              },
            },
          },
        });

        const spellAccess = await query("character:row-derived-cleric", {
          kind: "spellAccess",
        });
        expect(arrayField(spellAccess, "projection")).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              source: "classFeature",
              sourceUnitId: "cleric_life_domain_spells",
              spellId: "bless",
            }),
          ]),
        );

        const knownForms = await query("character:row-druid", {
          kind: "knownForms",
        });
        expect(knownForms).toMatchObject({
          kind: "knownForms",
          projection: {
            statBlockIds: [
              "stat_block_rat",
              "stat_block_riding_horse",
              "stat_block_spider",
              "stat_block_wolf",
            ],
          },
        });

        const weaponMastery = await query("character:row-derived-mastery", {
          kind: "weaponMasterySelections",
          featureUnitId: "paladin_weapon_mastery",
        });
        expect(weaponMastery).toMatchObject({
          kind: "weaponMasterySelections",
          projection: {
            featureUnitId: "paladin_weapon_mastery",
            selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
            choiceCount: 2,
          },
        });

        const ritualAccesses = await query("character:row-ritual-wizard", {
          kind: "spellbookRitualAccesses",
        });
        expect(arrayField(ritualAccesses, "projection")).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              tag: "spellbookRitual",
              spell: expect.objectContaining({ id: "detect_magic" }),
            }),
          ]),
        );

        const ritualAccess = await query("character:row-ritual-wizard", {
          kind: "spellbookRitualAccess",
          spellId: "detect_magic",
        });
        expect(ritualAccess).toMatchObject({
          kind: "spellbookRitualAccess",
          projection: {
            tag: "spellbookRitual",
            spell: { id: "detect_magic" },
          },
        });

        const invocation = await query("character:row-ritual-wizard", {
          kind: "spellInvocation",
          spellId: "detect_magic",
          invocation: { kind: "ritual" },
        });
        expect(invocation).toMatchObject({
          kind: "spellInvocation",
          projection: {
            tag: "accepted",
            invocation: {
              tag: "spellbookRitual",
              spellId: "detect_magic",
            },
          },
        });

        expect([...observedQueryKinds].sort()).toEqual(
          [...CHARACTER_SESSION_QUERY_KIND_VALUES].sort(),
        );
      },
    );
  }, 60_000);

  test("character-row-coverage-spell-rest-benefit", async () => {
    await withCharacterRowCoverage(
      "character-row-coverage-spell-rest-benefit",
      async ({ client, playSessionId, validateApply }) => {
        const spellRestBenefit = await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-healing-cleric",
            operation: {
              kind: "applySpellRestBenefit",
              spellId: "prayer_of_healing",
              castLevel: 2,
              recipients: [
                {
                  characterId: "character:row-healing-target",
                  eligibility: { remainedWithinRangeForEntireCasting: true },
                  healingRolls: [4, 4],
                },
              ],
            },
          },
        });
        expect(validateApply(spellRestBenefit).valid).toBe(true);
        expect(operationResult(spellRestBenefit)).toMatchObject({
          result: { tag: "spellRestBenefitApplied" },
        });
      },
    );
  }, 60_000);

  test("battle-row-coverage-mixed-companion-roster", async () => {
    await withCharacterRowCoverage(
      "battle-row-coverage-mixed-companion-roster",
      async ({ client, playSessionId }) => {
        await callStructuredTool(client, {
          name: "apply_character_session_operation",
          arguments: {
            playSessionId,
            characterId: "character:row-companion-wizard",
            operation: {
              kind: "retainOneAtATimeCompanion",
              companionId: "row-coverage-familiar",
              source: { tag: "ritualSpell", spellId: "find_familiar" },
              selectedForm: { tag: "normalNamedForm", formId: "cat" },
              creatureTypeOverrideChoiceId: "fey",
            },
          },
        });
        const mixedRoster = await callStructuredTool(client, {
          name: "start_battle",
          arguments: {
            playSessionId,
            battleId: "battle:row-coverage-mixed-companion",
            initiativeMode: "direct",
            initialCombatants: [
              {
                kind: "characterSession",
                ammunitionStocks: [],
                characterId: "character:row-companion-wizard",
                combatantId: "row-companion-owner",
                initiative: 12,
              },
              {
                kind: "statBlock",
                ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
                statBlockId: "stat_block_goblin_warrior",
                combatantId: "row-companion-goblin",
                initiative: 8,
                admissionSource: { kind: "encounterParticipant" },
              },
            ],
            companionAdmissions: [
              {
                ownerCharacterId: "character:row-companion-wizard",
                ammunitionStocks: [],
                companionCombatantId: "row-coverage-familiar",
                initiative: 18,
              },
            ],
          },
        });
        expect(operationResult(mixedRoster)).toMatchObject({
          snapshot: {
            companions: [
              expect.objectContaining({
                companionId: "row-coverage-familiar",
                ownerId: "row-companion-owner",
              }),
            ],
            turnOrder: [
              "row-coverage-familiar",
              "row-companion-owner",
              "row-companion-goblin",
            ],
          },
        });
        const mixedRosterEnded = await callStructuredTool(client, {
          name: "end_battle",
          arguments: { playSessionId },
        });
        expect(operationResult(mixedRosterEnded)).toMatchObject({
          endedBattleId: "battle:row-coverage-mixed-companion",
          session: { battleState: { tag: "none" } },
        });
      },
    );
  }, 60_000);

  test("battle-act-protocol", async () => {
    await withCharacterRowCoverage(
      "battle-row-coverage-interrupt-resolution",
      async ({ client, playSessionId }) => {
        const shieldBattle = await callStructuredTool(client, {
          name: "start_battle",
          arguments: {
            playSessionId,
            battleId: "battle:row-coverage-interrupt",
            initiativeMode: "direct",
            companionAdmissions: [],
            initialCombatants: [
              {
                kind: "statBlock",
                ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
                statBlockId: "stat_block_goblin_warrior",
                combatantId: "row-shield-goblin",
                initiative: 20,
                admissionSource: { kind: "encounterParticipant" },
              },
              {
                kind: "characterSession",
                ammunitionStocks: [],
                characterId: "character:row-shield-wizard",
                combatantId: "row-shield-wizard",
                initiative: 10,
              },
            ],
          },
        });
        expect(operationResult(shieldBattle)).toMatchObject({
          snapshot: { currentActorId: "row-shield-goblin" },
        });
        const discoveredShieldBattle = operationResult(
          await callStructuredTool(client, {
            name: "discover_battle_acts",
            arguments: { playSessionId },
          }),
        );
        const goblinAttack = jsonObjectArrayAt(
          discoveredShieldBattle,
          "availableActs",
        ).find((act) => {
          const subject = act.subject;
          return (
            act.summary === "Take the Attack action with Scimitar." &&
            isJsonObject(subject) &&
            subject.tag === "action" &&
            subject.action === "attack" &&
            subject.actorId === "row-shield-goblin" &&
            subject.statBlockDamageNotation === undefined
          );
        });
        if (!goblinAttack || !isJsonObject(goblinAttack.subject)) {
          throw new Error("Expected a returned goblin Scimitar Attack act.");
        }
        const attackSubject = goblinAttack.subject;
        const targetHole = jsonObjectArrayAt(goblinAttack, "initialHoles").find(
          (hole) => hole.kind === "targetChoice",
        );
        if (
          !targetHole ||
          typeof targetHole.holeId !== "string" ||
          typeof attackSubject.actorId !== "string" ||
          typeof attackSubject.procedureRef !== "string"
        ) {
          throw new Error("Expected an execution-bound Attack target hole.");
        }
        const targetSelection = {
          procedureRef: attackSubject.procedureRef,
          ...(typeof attackSubject.attackAbility === "string"
            ? { attackAbility: attackSubject.attackAbility }
            : {}),
          ...(typeof attackSubject.attackDamageType === "string"
            ? { attackDamageType: attackSubject.attackDamageType }
            : {}),
        };
        await callStructuredTool(client, {
          name: "fill_battle_hole",
          arguments: {
            playSessionId,
            subject: attackSubject,
            fill: {
              kind: "targetChoice",
              holeId: targetHole.holeId,
              value: "row-shield-wizard",
              spatialFacts: [
                {
                  kind: "attackTargetDistance",
                  actorId: attackSubject.actorId,
                  targetId: "row-shield-wizard",
                  distanceFeet: 5,
                  ...targetSelection,
                },
              ],
            },
          },
        });
        const pendingTurn = await callRawTool(client, {
          name: "end_turn",
          arguments: { playSessionId, actorId: "row-shield-goblin" },
        });
        expect(pendingTurn.isError).toBe(true);
        if (!isJsonObject(pendingTurn.structuredContent)) {
          throw new Error("Expected typed pending-turn restoration output.");
        }
        expect(operationResult(pendingTurn.structuredContent)).toMatchObject({
          details: { code: "BATTLE_FILLS_PENDING" },
        });
        expect(pendingTurn.structuredContent).toMatchObject({
          restoration: { tag: "retained" },
          unresolvedInputs: [
            {
              sourcePath: "$.projection.pendingBattleHoles",
              inputs: [expect.objectContaining({ kind: "attackRoll" })],
            },
          ],
          nextOperations: ["fill_battle_hole", "read_battle_state"],
        });
        const resumed = await callStructuredTool(client, {
          name: "read_play_session",
          arguments: { playSessionId },
        });
        expect(objectField(resumed, "projection")).toMatchObject({
          pendingBattleHoles: [expect.objectContaining({ kind: "attackRoll" })],
        });
        expect(resumed).toMatchObject({
          unresolvedInputs: [
            {
              sourcePath: "$.projection.pendingBattleHoles",
              inputs: [expect.objectContaining({ kind: "attackRoll" })],
            },
          ],
          nextOperations: ["fill_battle_hole", "read_battle_state"],
        });
        const resumedBattleState = await callStructuredTool(client, {
          name: "read_battle_state",
          arguments: { playSessionId },
        });
        expect(
          objectField(
            objectField(operationResult(resumedBattleState), "session"),
            "transientBattleFills",
          ),
        ).toMatchObject({
          holes: [expect.objectContaining({ kind: "attackRoll" })],
        });
        const stillPending = operationResult(
          await callStructuredTool(client, {
            name: "discover_battle_acts",
            arguments: { playSessionId },
          }),
        );
        expect(stillPending).toMatchObject({
          snapshot: { currentActorId: "row-shield-goblin" },
        });
        const attackRollHole = jsonObjectArrayAt(
          objectField(
            objectField(stillPending, "session"),
            "transientBattleFills",
          ),
          "holes",
        ).find((hole) => hole.kind === "attackRoll");
        if (!attackRollHole || typeof attackRollHole.holeId !== "string") {
          throw new Error("Expected a returned Attack roll hole.");
        }
        const afterAttackRoll = await callStructuredTool(client, {
          name: "fill_battle_hole",
          arguments: {
            playSessionId,
            subject: attackSubject,
            fill: {
              kind: "attackRoll",
              holeId: attackRollHole.holeId,
              value: {
                total: 14,
                naturalD20: 10,
                ...(typeof attackRollHole.rollMode === "string"
                  ? { rollMode: attackRollHole.rollMode }
                  : {}),
              },
            },
          },
        });
        const afterAttackRollResult = operationResult(afterAttackRoll);
        const interruptHole = jsonObjectArrayAt(
          objectField(afterAttackRollResult, "result"),
          "holes",
        ).find((hole) => hole.kind === "interruptDecision");
        const interruptChoices = jsonObjectArrayAt(
          afterAttackRollResult,
          "presentedInterruptChoices",
        );
        const shieldChoice = interruptChoices.find((presented) => {
          const choice = presented.choice;
          const presentation = presented.presentation;
          return (
            isJsonObject(choice) &&
            choice.kind === "castTriggeredReactionSpell" &&
            choice.reactorId === "row-shield-wizard" &&
            isJsonObject(presentation) &&
            presentation.kind === "spell" &&
            isJsonObject(presentation.invocation) &&
            presentation.invocation.spellId === "shield"
          );
        });
        if (
          !interruptHole ||
          typeof interruptHole.holeId !== "string" ||
          !shieldChoice ||
          !isJsonObject(shieldChoice.choice) ||
          !isJsonObject(shieldChoice.choice.subject) ||
          typeof shieldChoice.choice.subject.procedureRef !== "string"
        ) {
          throw new Error("Expected a returned Shield interrupt choice.");
        }
        const resolvedInterrupt = await callStructuredTool(client, {
          name: "fill_battle_hole",
          arguments: {
            playSessionId,
            subject: attackSubject,
            fill: {
              kind: "interruptDecision",
              holeId: interruptHole.holeId,
              value: {
                kind: "resolve",
                responderId: "row-shield-wizard",
                choice: {
                  kind: "castTriggeredReactionSpell",
                  procedureRef: shieldChoice.choice.subject.procedureRef,
                  fills: [],
                },
              },
            },
          },
        });
        expect(operationResult(resolvedInterrupt)).toMatchObject({
          result: { tag: "resolved" },
        });
        const endedTurn = await callStructuredTool(client, {
          name: "end_turn",
          arguments: {
            playSessionId,
            actorId: "row-shield-goblin",
          },
        });
        expect(operationResult(endedTurn)).toMatchObject({
          snapshot: { currentActorId: "row-shield-wizard" },
        });
        expect(endedTurn).toMatchObject({
          restoration: { tag: "retained" },
          nextOperations: expect.arrayContaining(["fill_battle_hole"]),
        });
      },
    );
  }, 60_000);

  test(
    "battle-act-resolution-protocol",
    async () => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const { server } = createDndMcpProtocolServer();
      const client = new Client({
        name: "battle-act-resolution-protocol-client",
        version: "0.1.0",
      });
      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        await verifyWidthVertical(client);
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    FULL_ACCEPTANCE_TEST_TIMEOUT_MS,
  );

  test("battle-roundtrip-protocol", async () => {
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
        ajvJsonSchema(startBattleTool.outputSchema),
      );
      const validateEndOutput = new AjvJsonSchemaValidator().getValidator(
        ajvJsonSchema(endBattleTool.outputSchema),
      );
      const playSessionId = await createPlaySession(client);
      const decoded = decodePlaySessionId(playSessionId);
      if (Either.isLeft(decoded)) throw new Error(decoded.left);
      const installed = await playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
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
        },
      );
      if (Either.isLeft(installed))
        throw new Error(installed.left.restoration.guidance);
      const started = await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:protocol-gh324-round-trip",
          initiativeMode: "direct",
          companionAdmissions: [],
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
      const rejectedStart = await callRawTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:protocol-gh324-second",
          initiativeMode: "direct",
          companionAdmissions: [],
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
      const rejectedEnd = await callRawTool(client, {
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

  test("battle-roster-lifecycle-protocol", async () => {
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
      const installed = await host.playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
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
        },
      );
      if (Either.isLeft(installed))
        throw new Error(installed.left.restoration.guidance);

      await callStructuredTool(client, {
        name: "start_battle",
        arguments: {
          playSessionId,
          battleId: "battle:lifecycle-protocol",
          initiativeMode: "direct",
          companionAdmissions: [],
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
        ajvJsonSchema(lifecycleTool.outputSchema),
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
      const battleAfterStatBlockAdd = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      expect(operationResult(battleAfterStatBlockAdd)).toMatchObject({
        snapshot: {
          combatants: expect.arrayContaining([
            expect.objectContaining({ combatantId: "lifecycle-skeleton" }),
          ]),
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
      const battleAfterStatBlockRemoval = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      expect(operationResult(battleAfterStatBlockRemoval)).toMatchObject({
        snapshot: {
          combatants: expect.not.arrayContaining([
            expect.objectContaining({ combatantId: "lifecycle-skeleton" }),
          ]),
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

      const conflict = await callRawTool(client, {
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

      const adjustedBattle = await host.playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
          const battle = root.sessionStore.battleSession;
          if (battle === null) {
            throw new Error("Expected an active battle before settlement.");
          }
          const characterCombatant = battle.state.combatants.get(
            combatantId("lifecycle-first"),
          );
          if (characterCombatant?.origin.kind !== "character") {
            throw new Error("Expected a Battle-owned Character combatant.");
          }
          return root.sessionStore.storeActiveBattle(
            battleRuntimeSessionForTest({
              state: {
                ...battle.state,
                combatants: new Map(battle.state.combatants).set(
                  characterCombatant.combatantId,
                  {
                    ...characterCombatant,
                    hp: Hp(7),
                    positiveHpUnconscious: null,
                  },
                ),
              },
              context: battle.context,
            }),
          );
        },
      );
      if (Either.isLeft(adjustedBattle)) {
        throw new Error("Expected canonical Battle HP adjustment to commit.");
      }
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
      expect(settled).toMatchObject({
        operation: {
          result: {
            detail: {
              sheetProjection: {
                currentHp: 7,
              },
            },
          },
        },
      });
      expect(JSON.stringify(settled)).toContain('"tag":"available"');

      const removedLastGoblin = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "removeCombatant",
            combatantId: "lifecycle-goblin",
          },
        },
      });
      expect(validateOutput(removedLastGoblin).valid).toBe(true);
      expect(operationResult(removedLastGoblin)).toMatchObject({
        result: {
          tag: "combatantRemoved",
          combatantId: "lifecycle-goblin",
        },
      });
      const rejectedLastRemoval = await callRawTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "removeCombatant",
            combatantId: "lifecycle-second",
          },
        },
      });
      expect(rejectedLastRemoval.isError).toBe(true);
      if (!isJsonObject(rejectedLastRemoval.structuredContent)) {
        throw new Error("Expected typed last-combatant removal failure.");
      }
      expect(validateOutput(rejectedLastRemoval.structuredContent).valid).toBe(
        true,
      );
      expect(rejectedLastRemoval.structuredContent).toMatchObject({
        operation: {
          result: {
            details: {
              code: "BATTLE_COMBATANT_REMOVAL_FAILED",
              combatantId: "lifecycle-second",
              message: expect.stringContaining("every combatant"),
            },
          },
        },
      });
      const restoredGoblin = await callStructuredTool(client, {
        name: "battle_lifecycle",
        arguments: {
          playSessionId,
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "lifecycle-goblin",
              initiative: 8,
              admissionSource: { kind: "encounterParticipant" },
            },
          },
        },
      });
      expect(operationResult(restoredGoblin)).toMatchObject({
        result: {
          tag: "combatantAdded",
          combatantId: "lifecycle-goblin",
        },
      });

      const battleBeforeFailure = await callStructuredTool(client, {
        name: "read_battle_state",
        arguments: { playSessionId },
      });
      const captureDeepProjection = () =>
        host.playSessions.run(
          decoded.right,
          guestCaller(playSessionId),
          (root) => {
            const projection = adminProjection(root);
            if (Either.isLeft(projection)) {
              throw new Error(
                `Expected a complete Play Session projection: ${projection.left}`,
              );
            }
            return structuredClone({
              projection: projection.right,
              sessionSnapshot: root.sessionStore.snapshot(),
              drafts: Array.from(root.sessionStore.drafts.entries()),
              characterSessions: Array.from(
                root.sessionStore.characters.entries(),
              ),
              battleState: root.sessionStore.battleState,
              battleSession: root.sessionStore.battleSession,
              transientBattleFills: root.sessionStore.pendingBattleFills,
            });
          },
        );
      const deepBeforeFailure = await captureDeepProjection();
      if (Either.isLeft(deepBeforeFailure)) {
        throw new Error(deepBeforeFailure.left.restoration.guidance);
      }
      await host.playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
          root.sessionStore.characters.setAll = () =>
            Either.left({
              tag: "unknownCharacterSession",
              characterId: characterId("character:injected"),
            });
        },
      );
      const rejected = await callRawTool(client, {
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
      expect(deepAfterFailure.right.value).toEqual(
        deepBeforeFailure.right.value,
      );
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

      const result = await callRawTool(client, {
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
        tenure: null,
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
    "character-creation-protocol",
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
        await verifyLevelThreeWizardVertical(client);
        await verifyLevelFourWizardVertical(client);
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    FULL_ACCEPTANCE_TEST_TIMEOUT_MS,
  );

  test("create-level-five-wizard-fireball-and-battle-handoff", async () => {
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

  test("create-level-six-rogue-expertise-and-steady-aim-battle-handoff", async () => {
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

  test("character-healing-lay-on-hands-protocol", async () => {
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
        ajvJsonSchema(applyTool.outputSchema),
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
        ajvJsonSchema(applyTool.outputSchema),
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
      await host.playSessions.run(
        decoded.right,
        guestCaller(playSessionId),
        (root) => {
          root.sessionStore.characters.setAll = () =>
            Either.left({
              tag: "unknownCharacterSession",
              characterId: characterId("character:injected"),
            });
        },
      );
      const rejected = await callRawTool(client, {
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
      expect(withoutTenure(sourceAfter)).toEqual(withoutTenure(sourceBefore));
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
      const rejected = await callRawTool(client, {
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

type OutputSchemaValidator = (value: unknown) => { readonly valid: boolean };

async function withCharacterRowCoverage(
  clientName: string,
  run: (context: {
    readonly host: ReturnType<typeof createDndMcpProtocolServer>;
    readonly client: Client;
    readonly playSessionId: string;
    readonly validateApply: OutputSchemaValidator;
    readonly validateQuery: OutputSchemaValidator;
  }) => Promise<void>,
): Promise<void> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer();
  const client = new Client({ name: clientName, version: "0.1.0" });
  try {
    await host.server.connect(serverTransport);
    await client.connect(clientTransport);
    const playSessionId = await createPlaySession(client);
    await installCharacterRowCoverageSessions(host, playSessionId);
    const tools = await client.listTools();
    const applyTool = tools.tools.find(
      (tool) => tool.name === "apply_character_session_operation",
    );
    const queryTool = tools.tools.find(
      (tool) => tool.name === "query_character_session",
    );
    if (
      applyTool?.outputSchema === undefined ||
      queryTool?.outputSchema === undefined
    ) {
      throw new Error("Expected Character Session operation schemas.");
    }
    const validateApply = new AjvJsonSchemaValidator().getValidator(
      requireJsonSchema(applyTool.outputSchema, "apply operation outputSchema"),
    );
    const validateQuery = new AjvJsonSchemaValidator().getValidator(
      requireJsonSchema(queryTool.outputSchema, "query operation outputSchema"),
    );
    await run({
      host,
      client,
      playSessionId,
      validateApply,
      validateQuery,
    });
  } finally {
    await Promise.allSettled([client.close(), host.server.close()]);
  }
}

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
  const result = await host.playSessions.run(
    decoded.right,
    guestCaller(playSessionId),
    (root) => {
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
    },
  );
  if (Either.isLeft(result)) throw new Error("Expected a live Play Session.");
}

async function installFontOfMagicSession(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: string,
) {
  const decoded = decodePlaySessionId(playSessionId);
  if (decoded._tag === "Left") throw new Error(decoded.left);
  const result = await host.playSessions.run(
    decoded.right,
    guestCaller(playSessionId),
    (root) => {
      const sorcerer = availableCharacterSession({
        characterId: characterId("character:font-sorcerer"),
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
      if (Either.isLeft(sorcerer)) throw new Error(sorcerer.left.message);
      root.sessionStore.characters.set(sorcerer.right);
    },
  );
  if (Either.isLeft(result)) throw new Error("Expected a live Play Session.");
}

async function installCharacterRowCoverageSessions(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: string,
) {
  const decoded = decodePlaySessionId(playSessionId);
  if (decoded._tag === "Left") throw new Error(decoded.left);
  const result = await host.playSessions.run(
    decoded.right,
    guestCaller(playSessionId),
    (root) => {
      const wizardBase = wizardBuild({ wizardAdvancements: 0 });
      const companionWizardBuild = {
        ...wizardBase,
        spellcasting: {
          ...wizardBase.spellcasting!,
          sources: [
            {
              ...wizardBase.spellcasting!.sources[0]!,
              spellbook: [unitId("find_familiar")],
              preparedSpells: [unitId("find_familiar")],
            },
          ] as const,
        },
      };
      const ritualWizardBuild = {
        ...wizardBase,
        spellcasting: {
          ...wizardBase.spellcasting!,
          sources: [
            {
              ...wizardBase.spellcasting!.sources[0]!,
              spellbook: [unitId("detect_magic")],
              preparedSpells: [unitId("detect_magic")],
            },
          ] as const,
        },
      };
      const shieldWizardBuild = {
        ...wizardBase,
        spellcasting: {
          ...wizardBase.spellcasting!,
          sources: [
            {
              ...wizardBase.spellcasting!.sources[0]!,
              spellbook: [unitId("shield")],
              preparedSpells: [unitId("shield")],
            },
          ] as const,
        },
      };
      const stableFighterBuild = armorClassBuild({
        startingClass: "class_fighter",
      });
      const sessions = [
        {
          characterId: "character:row-druid",
          build: druidCircleLandBuild({ druidLevel: 2 }),
          druidWildShapeKnownFormStatBlockIds: [
            statBlockId("stat_block_rat"),
            statBlockId("stat_block_riding_horse"),
            statBlockId("stat_block_spider"),
            statBlockId("stat_block_wolf"),
          ],
          currentHp: Hp(10),
        },
        {
          characterId: "character:row-companion-wizard",
          build: companionWizardBuild,
          currentHp: Hp(7),
        },
        {
          characterId: "character:row-ritual-wizard",
          build: ritualWizardBuild,
          currentHp: Hp(7),
        },
        {
          characterId: "character:row-shield-wizard",
          build: shieldWizardBuild,
          currentHp: Hp(7),
        },
        {
          characterId: "character:row-rest-fighter",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(10),
        },
        {
          characterId: "character:row-interrupted-rest-fighter",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(10),
        },
        {
          characterId: "character:row-calendar-fighter",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(10),
        },
        {
          characterId: "character:row-stable-fighter",
          build: stableFighterBuild,
          currentHp: Hp(0),
          zeroHpLifecycle: {
            tag: "stable" as const,
            recovery: {
              kind: "regains1HpAfter1d4Hours" as const,
              elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
            },
          },
        },
        {
          characterId: "character:row-healing-cleric",
          build: prayerOfHealingClericBuild(),
          currentHp: Hp(10),
        },
        {
          characterId: "character:row-healing-target",
          build: armorClassBuild({ startingClass: "class_fighter" }),
          currentHp: Hp(1),
        },
      ];
      for (const input of sessions) {
        const session = availableCharacterSession({
          characterId: characterId(input.characterId),
          build: input.build,
          currentHp: input.currentHp,
          tempHp: Hp(0),
          hitPointMaximumReduction: Hp(0),
          conditions: [],
          companion: { tag: "none" },
          unitLibrary: root.unitLibrary,
          ...(input.druidWildShapeKnownFormStatBlockIds === undefined
            ? {}
            : {
                druidWildShapeKnownFormStatBlockIds:
                  input.druidWildShapeKnownFormStatBlockIds,
              }),
          ...(input.zeroHpLifecycle === undefined
            ? {}
            : { zeroHpLifecycle: input.zeroHpLifecycle }),
        });
        if (Either.isLeft(session)) throw new Error(session.left.message);
        root.sessionStore.characters.set(session.right);
      }
    },
  );
  if (Either.isLeft(result)) throw new Error("Expected a live Play Session.");
}

async function installDerivedQueryCoverageSessions(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: string,
) {
  const decoded = decodePlaySessionId(playSessionId);
  if (decoded._tag === "Left") throw new Error(decoded.left);
  const derivedRogueBuild = {
    ...armorClassBuild({
      startingClass: "class_rogue",
      advancements: ["class_rogue", "class_rogue"],
    }),
    features: [
      {
        kind: "selectedClassChoice" as const,
        selectedFromUnitId: unitId("class_rogue"),
        unitId: unitId("subclass_rogue_thief"),
      },
    ],
  };
  const derivedSpellAccessBuild = {
    ...prayerOfHealingClericBuild(),
    features: [
      {
        kind: "selectedClassChoice" as const,
        selectedFromUnitId: unitId("class_cleric"),
        unitId: unitId("subclass_cleric_life_domain"),
      },
    ],
  };
  const result = await host.playSessions.run(
    decoded.right,
    guestCaller(playSessionId),
    (root) => {
      const sessions = [
        {
          characterId: "character:row-derived-barbarian",
          build: armorClassBuild({
            startingClass: "class_barbarian",
            advancements: ["class_barbarian", "class_barbarian"],
          }),
        },
        {
          characterId: "character:row-derived-bard",
          build: bardJackOfAllTradesBuild({ totalLevel: 2 }),
        },
        {
          characterId: "character:row-derived-rogue",
          build: derivedRogueBuild,
        },
        {
          characterId: "character:row-derived-armor",
          build: armorClassBuild({
            startingClass: "class_barbarian",
            advancements: ["class_monk"],
          }),
        },
        {
          characterId: "character:row-derived-cleric",
          build: derivedSpellAccessBuild,
        },
        {
          characterId: "character:row-derived-mastery",
          build: weaponMasteryBuild({
            startingClass: "class_paladin",
            featureUnitId: "paladin_weapon_mastery",
            selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
          }),
        },
      ];
      for (const input of sessions) {
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
      }
    },
  );
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
  const result = await host.playSessions.run(
    decoded.right,
    guestCaller(playSessionId),
    (root) => {
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
    },
  );
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
  if (!isJsonObject(created.operation)) {
    throw new Error("create_play_session omitted its operation.");
  }
  const result = created.operation.result;
  if (!isJsonObject(result) || !isJsonObject(result.access)) {
    throw new Error("create_play_session omitted its access result.");
  }
  const grant = result.access.guestAccessGrant;
  if (typeof grant !== "string") {
    throw new Error("create_play_session omitted its guest access grant.");
  }
  guestAccessGrantByPlaySessionId.set(created.playSessionId, grant);
  return created.playSessionId;
}

function guestCaller(playSessionId: string) {
  const grant = guestAccessGrantByPlaySessionId.get(playSessionId);
  const decoded = decodeGuestAccessGrant(grant);
  if (Either.isLeft(decoded)) {
    throw new Error("Expected the retained Guest Play Session access grant.");
  }
  return { tag: "guest" as const, guestAccessGrant: decoded.right };
}

async function callStructuredTool(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
): Promise<Readonly<Record<string, unknown>>> {
  const result = await callRawTool(client, input);
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toBeDefined();
  if (!isJsonObject(result.structuredContent)) {
    throw new Error(`${input.name} did not return an object payload.`);
  }
  return result.structuredContent;
}

async function callRawTool(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
) {
  const playSessionId = input.arguments.playSessionId;
  const guestAccessGrant =
    typeof playSessionId === "string"
      ? guestAccessGrantByPlaySessionId.get(playSessionId)
      : undefined;
  const argumentsWithAccess =
    guestAccessGrant === undefined
      ? await acceptancePlaySessionRoutedArgs(
          client,
          input.name,
          input.arguments,
        )
      : { ...input.arguments, guestAccessGrant };
  return client.callTool({
    ...input,
    arguments: argumentsWithAccess,
  });
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withoutTenure(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "tenure"),
  );
}

function ajvJsonSchema(schema: unknown): JsonSchemaType {
  if (!isJsonObject(schema)) {
    throw new Error("Expected an MCP JSON Schema object.");
  }
  // The MCP client has already protocol-decoded this object as a JSON Schema;
  // the assertion only bridges the SDK's readonly tool type to AJV's mutable alias.
  return schema as JsonSchemaType;
}

function requireDiceSeed(input: readonly [string, string, string, string]) {
  const decoded = decodeDiceSeed(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
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

function jsonObjectArrayAt(
  value: Readonly<Record<string, unknown>>,
  field: string,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
  return arrayField(value, field).map((entry, index) => {
    if (!isJsonObject(entry)) {
      throw new Error(`${field}.${index} must be an object.`);
    }
    return entry;
  });
}
