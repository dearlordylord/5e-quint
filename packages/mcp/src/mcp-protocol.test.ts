import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { describe, expect, test } from "vitest";

import {
  verifyAgentConversationScenarios,
  verifyBaselineVertical,
  verifyLevelFiveWizardFireballBattleHandoff,
  verifyLevelFourWizardVertical,
  verifyLevelSixRogueSteadyAimBattleHandoff,
  verifyLevelThreeWizardVertical,
  verifyToolContract,
  verifyWidthVertical,
  verifyWizardIceKnifeBattleHandoff,
  createProtocolRangerFreeCastCharacter,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createMcpApplicationServices } from "./composition-root.ts";
import { contentToolDefinitions } from "./content-tools.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
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

  test("routes Character Sheet resource operations through the MCP protocol", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "character-resource-protocol-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const tools = (await client.listTools()).tools;
      const operationTool = tools.find(
        (tool) => tool.name === "apply_character_session_operation",
      );
      expect(operationTool?.outputSchema).toBeDefined();
      if (operationTool?.outputSchema === undefined) {
        throw new Error(
          "apply_character_session_operation omitted its output schema.",
        );
      }
      const validateOperationOutput = new AjvJsonSchemaValidator().getValidator(
        operationTool.outputSchema as JsonSchemaType,
      );

      const ranger = await createProtocolRangerFreeCastCharacter(client);
      const playSessionId = ranger.playSessionId;
      const secondPlaySessionId = await createPlaySession(client);
      const monk = await createProtocolCharacter(client, {
        playSessionId,
        classUnitId: "class_monk",
        level: 2,
        draftId: "draft:protocol-monk-resource",
      });
      const sorcerer = await createProtocolCharacter(client, {
        playSessionId,
        classUnitId: "class_sorcerer",
        level: 3,
        draftId: "draft:protocol-sorcerer-resource",
      });

      const spellAccessResult = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: ranger.characterId,
          operation: {
            kind: "spendSpellAccessFreeCast",
            sourceUnitId: "ranger_favored_enemy",
            spellId: ranger.spellAccessSpellId,
          },
        },
      });
      expect(validateOperationOutput(spellAccessResult).valid).toBe(true);
      expect(spellAccessResult).toMatchObject({
        playSessionId,
        operation: {
          name: "apply_character_session_operation",
          result: {
            result: {
              tag: "spellAccessFreeCastSpent",
              sourceUnitId: "ranger_favored_enemy",
              spellId: ranger.spellAccessSpellId,
            },
          },
        },
        projection: {
          characterIds: expect.arrayContaining([ranger.characterId]),
        },
        nextOperations: expect.arrayContaining([
          "list_characters",
          "inspect_character_session",
        ]),
      });

      const inspected = await callStructuredTool(client, {
        name: "inspect_character_session",
        arguments: {
          playSessionId,
          characterId: ranger.characterId,
        },
      });
      expect(inspected).toMatchObject({
        playSessionId,
        operation: {
          result: {
            detail: {
              sheetProjection: {
                resources: [
                  expect.objectContaining({
                    tag: "spellAccessFreeCast",
                    sourceUnitId: "ranger_favored_enemy",
                    spellId: ranger.spellAccessSpellId,
                    expended: 1,
                  }),
                ],
              },
            },
          },
        },
      });

      const secondSessionCharacters = await callStructuredTool(client, {
        name: "list_characters",
        arguments: { playSessionId: secondPlaySessionId },
      });
      expect(
        arrayField(operationResult(secondSessionCharacters), "characters"),
      ).toEqual([]);

      const monkResult = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: monk.characterId,
          operation: {
            kind: "useMonkUncannyMetabolismWhenRollingInitiative",
            martialArtsRoll: 4,
          },
        },
      });
      expect(validateOperationOutput(monkResult).valid).toBe(true);
      expect(monkResult).toMatchObject({
        playSessionId,
        operation: {
          result: {
            result: {
              tag: "monkUncannyMetabolismUsed",
              martialArtsRoll: 4,
            },
          },
        },
      });

      const pointsToSlotResult = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: sorcerer.characterId,
          operation: {
            kind: "convertFontOfMagicSorceryPointsToSpellSlot",
            spellLevel: 1,
          },
        },
      });
      expect(validateOperationOutput(pointsToSlotResult).valid).toBe(true);
      expect(pointsToSlotResult).toMatchObject({
        playSessionId,
        operation: {
          result: {
            result: {
              tag: "fontOfMagicSorceryPointsConvertedToSpellSlot",
              spellLevel: 1,
            },
          },
        },
      });

      const slotToPointsResult = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: sorcerer.characterId,
          operation: {
            kind: "convertFontOfMagicSpellSlotToSorceryPoints",
            spellLevel: 1,
            spellSlotSource: "ordinary",
          },
        },
      });
      expect(validateOperationOutput(slotToPointsResult).valid).toBe(true);
      expect(slotToPointsResult).toMatchObject({
        playSessionId,
        operation: {
          result: {
            result: {
              tag: "fontOfMagicSpellSlotConvertedToSorceryPoints",
              spellLevel: 1,
            },
          },
        },
      });

      const secondSpellAccessSpend = await callStructuredTool(client, {
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: ranger.characterId,
          operation: {
            kind: "spendSpellAccessFreeCast",
            sourceUnitId: "ranger_favored_enemy",
            spellId: ranger.spellAccessSpellId,
          },
        },
      });
      expect(validateOperationOutput(secondSpellAccessSpend).valid).toBe(true);

      const rejected = await client.callTool({
        name: "apply_character_session_operation",
        arguments: {
          playSessionId,
          characterId: ranger.characterId,
          operation: {
            kind: "spendSpellAccessFreeCast",
            sourceUnitId: "ranger_favored_enemy",
            spellId: ranger.spellAccessSpellId,
          },
        },
      });
      expect(rejected.structuredContent).toBeDefined();
      if (!isJsonObject(rejected.structuredContent)) {
        throw new Error("Expected a typed rejected operation envelope.");
      }
      expect(rejected.isError).toBe(true);
      expect(validateOperationOutput(rejected.structuredContent).valid).toBe(
        true,
      );
      expect(rejected.structuredContent).toMatchObject({
        playSessionId,
        operation: {
          result: {
            details: {
              code: "CHARACTER_SESSION_OPERATION_INVALID",
              operationKind: "spendSpellAccessFreeCast",
              message: "Spell Access free cast is exhausted.",
            },
          },
        },
      });
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 60_000);

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
});

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
      activeBattle: null,
    },
  });
  if (typeof created.playSessionId !== "string") {
    throw new Error("create_play_session did not return a string handle.");
  }
  return created.playSessionId;
}

type ProtocolCharacterSpec = {
  readonly playSessionId: string;
  readonly classUnitId: "class_monk" | "class_sorcerer";
  readonly level: number;
  readonly draftId: string;
};

type ProtocolCharacter = {
  readonly characterId: string;
};

async function createProtocolCharacter(
  client: Client,
  spec: ProtocolCharacterSpec,
): Promise<ProtocolCharacter> {
  const created = await callStructuredTool(client, {
    name: "create_character_draft",
    arguments: { playSessionId: spec.playSessionId, draftId: spec.draftId },
  });
  const initialHoles = arrayField(operationResult(created), "holes");
  const progressionOption = firstOptionId(
    initialHoles,
    "cc:draft:draft.progression.initial",
    (optionId) =>
      optionId.includes(spec.classUnitId) &&
      (spec.level === 1
        ? !optionId.includes("level_")
        : optionId.includes(`level_${spec.level}`)) &&
      (spec.classUnitId === "class_monk"
        ? optionId.startsWith("10:class_monk")
        : true),
  );
  const baseFilled = await callStructuredTool(client, {
    name: "fill_creation_holes",
    arguments: {
      playSessionId: spec.playSessionId,
      draftId: spec.draftId,
      expectedRevision: 0,
      fills: [
        {
          kind: "choice",
          holeId: "cc:draft:draft.progression.initial",
          optionIds: [progressionOption],
        },
        {
          kind: "choice",
          holeId: "cc:draft:draft.background",
          optionIds: ["background_soldier"],
        },
        {
          kind: "choice",
          holeId: "cc:draft:draft.species",
          optionIds: ["species_orc"],
        },
        {
          kind: "abilityScores",
          holeId: "cc:draft:draft.abilityScoreGeneration",
          method: "standardArray",
          value: { str: 15, dex: 14, con: 13, int: 10, wis: 8, cha: 12 },
        },
        {
          kind: "choice",
          holeId: "cc:draft:draft.languages",
          optionIds: ["Dwarvish", "Goblin"],
        },
        {
          kind: "choice",
          holeId: "cc:draft:draft.alignment",
          optionIds: ["lawful_good"],
        },
      ],
    },
  });
  let revision = draftRevision(baseFilled);
  const selectedCreationOptions: Array<{
    readonly holeId: string;
    readonly optionIds: readonly string[];
  }> = [];
  const selectedWizardSpellbookIds = new Set<string>();

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const discovered = await callStructuredTool(client, {
      name: "discover_creation_holes",
      arguments: {
        playSessionId: spec.playSessionId,
        draftId: spec.draftId,
      },
    });
    const holes = arrayField(operationResult(discovered), "holes");
    if (holes.length === 0) break;
    const hole = holes[0];
    if (!isJsonObject(hole)) throw new Error("Expected a creation hole.");
    const fill = protocolCreationFill(hole, selectedWizardSpellbookIds);
    if (fill.kind === "choice") {
      selectedCreationOptions.push({
        holeId: fill.holeId,
        optionIds: fill.optionIds,
      });
      if (fill.holeId.includes("wizard_spellbook_choices")) {
        for (const optionId of fill.optionIds) {
          selectedWizardSpellbookIds.add(optionId);
        }
      }
    }
    const filled = await callStructuredTool(client, {
      name: "fill_creation_holes",
      arguments: {
        playSessionId: spec.playSessionId,
        draftId: spec.draftId,
        expectedRevision: revision,
        fills: [fill],
      },
    });
    const fillResult = objectField(operationResult(filled), "result");
    if (fillResult.tag !== "accepted") {
      throw new Error(
        `Expected accepted ${spec.classUnitId} fill: ${JSON.stringify(operationResult(filled))}`,
      );
    }
    revision = draftRevision(filled);
  }

  const finalized = await callStructuredTool(client, {
    name: "finalize_character",
    arguments: { playSessionId: spec.playSessionId, draftId: spec.draftId },
  });
  const finalization = objectField(operationResult(finalized), "finalization");
  if (finalization.tag !== "ready") {
    throw new Error(
      `Expected ${spec.classUnitId} finalization: ${JSON.stringify(operationResult(finalized))}`,
    );
  }
  const finalizedSession = objectField(operationResult(finalized), "session");
  const characterIds = arrayField(finalizedSession, "characterIds");
  const characterId = characterIds[characterIds.length - 1];
  if (typeof characterId !== "string") {
    throw new Error(
      `Expected a finalized character id: ${JSON.stringify({ result: operationResult(finalized), selectedCreationOptions })}`,
    );
  }
  const listed = await callStructuredTool(client, {
    name: "list_characters",
    arguments: { playSessionId: spec.playSessionId },
  });
  const characters = arrayField(operationResult(listed), "characters");
  const character = characters.find(
    (candidate) =>
      isJsonObject(candidate) && candidate.characterId === characterId,
  );
  if (!isJsonObject(character)) {
    throw new Error(`Expected finalized character ${characterId}.`);
  }
  return { characterId };
}

function draftRevision(payload: Readonly<Record<string, unknown>>): number {
  const result = operationResult(payload);
  const storedDraft = objectField(result, "storedDraft");
  const revision = storedDraft.revision;
  if (typeof revision !== "number") {
    throw new Error("Expected the returned draft revision.");
  }
  return revision;
}

function firstOptionId(
  holes: readonly unknown[],
  holeId: string,
  predicate: (optionId: string) => boolean,
): string {
  const hole = holes.find(
    (candidate) => isJsonObject(candidate) && candidate.holeId === holeId,
  );
  if (!isJsonObject(hole)) throw new Error(`Expected creation hole ${holeId}.`);
  const options = arrayField(hole, "options");
  const option = options.find(
    (candidate) =>
      isJsonObject(candidate) &&
      typeof candidate.optionId === "string" &&
      predicate(candidate.optionId),
  );
  if (!isJsonObject(option) || typeof option.optionId !== "string") {
    throw new Error(`Expected a matching option in ${holeId}.`);
  }
  return option.optionId;
}

function protocolCreationFill(
  hole: Readonly<Record<string, unknown>>,
  selectedWizardSpellbookIds: ReadonlySet<string>,
) {
  const holeId = hole.holeId;
  if (typeof holeId !== "string") throw new Error("Creation hole lacks id.");
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores" as const,
      holeId,
      method: "standardArray" as const,
      value: { str: 15, dex: 14, con: 13, int: 10, wis: 8, cha: 12 },
    };
  }
  if (hole.kind !== "choice") {
    throw new Error(`Unsupported creation hole: ${String(hole.kind)}`);
  }
  const cardinality = objectField(hole, "cardinality");
  const minimum =
    cardinality.tag === "exactly" ? cardinality.count : cardinality.min;
  if (typeof minimum !== "number") {
    throw new Error(`Creation hole ${holeId} lacks cardinality.`);
  }
  const options = arrayField(hole, "options").flatMap((candidate) => {
    if (!isJsonObject(candidate) || typeof candidate.optionId !== "string") {
      return [];
    }
    return [candidate.optionId];
  });
  const availableOptions = holeId.includes("wizard_spellbook_choices")
    ? options.filter(
        (optionId) =>
          optionId !== "burning_hands" &&
          !selectedWizardSpellbookIds.has(optionId),
      )
    : holeId.includes("wizard_prepared_spell_choices")
      ? options.filter((optionId) => selectedWizardSpellbookIds.has(optionId))
      : options;
  const stableChoices = holeId.includes("class_skill_proficiency_choice")
    ? ["perception", "survival"]
    : holeId.includes("class_tool_proficiency_choice") &&
        holeId.includes("class_monk")
      ? ["tool:tool_lute"]
      : holeId.includes("fighter_weapon_mastery")
        ? ["weapon_longsword", "weapon_spear", "weapon_flail"]
        : holeId.includes("fighter_fighting_style")
          ? ["defense"]
          : holeId.includes("class_monk") &&
              holeId.endsWith("class_equipment_choice")
            ? ["option_b"]
            : holeId.endsWith("class_equipment_choice")
              ? ["option_c"]
              : [];
  const preferred =
    stableChoices.length > 0
      ? stableChoices.filter((optionId) => availableOptions.includes(optionId))
      : [];
  const selected = [
    ...preferred,
    ...availableOptions.filter((id) => !preferred.includes(id)),
  ].slice(0, minimum);
  if (selected.length !== minimum) {
    throw new Error(`Creation hole ${holeId} lacks enough options.`);
  }
  return { kind: "choice" as const, holeId, optionIds: selected };
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
