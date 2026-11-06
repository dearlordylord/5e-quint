import { describe, expect, test } from "vitest";
import { Schema } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  progressionOptionId,
} from "@dnd/character-creation-runtime";
import {
  DEFAULT_MAX_FILL_PASSES,
  manifestFixtureOptionIds,
  requireAcceptedBatch,
  supportedFillForHole,
  testProgression,
} from "@dnd/character-creation-runtime/test-support";
import { createMcpPlaySessionRoot, handleToolCall } from "./server.ts";
import { characterIdFromDraftId } from "./session-store.ts";

const CreationFrontierSchema = Schema.Struct({
  holes: Schema.Array(Schema.Struct({ holeId: Schema.String })),
});

type EquipmentPackageChoice = "option_a" | "option_b";

function equipmentFixtureOptions(
  source: Parameters<typeof manifestFixtureOptionIds>[0],
  packageChoice: EquipmentPackageChoice,
) {
  return source.choiceKey === "class_equipment_choice"
    ? [creationChoiceOptionId(packageChoice)]
    : source.choiceKey === "equipment_purchase"
      ? [
          creationChoiceOptionId(
            packageChoice === "option_b" ? "equipment_shield" : "weapon_dagger",
          ),
        ]
      : manifestFixtureOptionIds(source);
}

function expectedEquipment(packageChoice: EquipmentPackageChoice) {
  const shield = "shield:equipment_shield";
  const armor = "armor:armor_chain_shirt";
  return {
    startingEquipmentCurrencyRemainderCp:
      packageChoice === "option_a" ? 5500 : 15000,
    owned: expect.arrayContaining([
      { kind: "catalogItem", itemId: shield, quantity: 1 },
      ...(packageChoice === "option_a"
        ? [
            { kind: "catalogItem", itemId: armor, quantity: 1 },
            { kind: "authoredStartingItem", itemName: "Mace", quantity: 1 },
            {
              kind: "authoredStartingItem",
              itemName: "Holy Symbol",
              quantity: 1,
            },
            {
              kind: "authoredStartingItem",
              itemName: "Priest's Pack",
              quantity: 1,
            },
          ]
        : []),
    ]),
    loadout: {
      shield,
      ...(packageChoice === "option_a" ? { armor } : {}),
    },
  };
}

function replayClericEquipment(packageChoice: "option_a" | "option_b") {
  const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (catalog.tag !== "ok") throw new Error("Expected the SRD catalog.");
  const unitLibrary = catalog.catalog;
  const root = createMcpPlaySessionRoot();
  const draftId = characterDraftId(`draft:cleric-equipment-${packageChoice}`);
  const characterId = characterIdFromDraftId(draftId);
  const call = (name: string, args: unknown): unknown => {
    const result = handleToolCall(root, name, args);
    expect(result.isError).not.toBe(true);
    const text = result.content[0]?.text;
    if (text === undefined) throw new Error("Expected a tool response.");
    return JSON.parse(text);
  };
  let draft = createCharacterDraft({ draftId, unitLibrary });
  call("create_character_draft", { draftId });
  const progressionOption = progressionOptionId(
    testProgression(unitLibrary, unitId("class_cleric"), 5),
  );
  for (let pass = 0; pass < DEFAULT_MAX_FILL_PASSES; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    const frontier = Schema.decodeUnknownSync(CreationFrontierSchema)(
      call("get_character_creation_choices", { draftId }),
    );
    expect(frontier.holes.map(({ holeId }) => holeId)).toEqual(
      holes.map(({ holeId }) => holeId),
    );
    if (holes.length === 0) break;
    const fills = holes.map((hole) =>
      supportedFillForHole({
        hole,
        progressionOption,
        standardArrayAssignment: {
          str: 14,
          dex: 12,
          con: 13,
          int: 8,
          wis: 15,
          cha: 10,
        },
        fixtureOptionIds: (source) =>
          equipmentFixtureOptions(source, packageChoice),
      }),
    );
    const result = call("apply_character_creation_choices", {
      draftId,
      expectedRevision: draft.revision,
      fills,
    });
    expect(result).toMatchObject({ result: { tag: "accepted" } });
    draft = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills,
      }),
    );
  }
  expect(discoverCreationHoles({ draft, unitLibrary })).toEqual([]);
  const finalized = call("finalize_character", { draftId });
  expect(finalized).toMatchObject({ finalization: { tag: "ready" } });
  expect(finalized).toMatchObject({
    build: { equipment: expectedEquipment(packageChoice) },
  });
  const queried = call("query_character_session", {
    characterId,
    query: { kind: "armorClass" },
  });
  expect(queried).toMatchObject({
    query: {
      projection: { armorClass: packageChoice === "option_a" ? 16 : 13 },
    },
  });
  const started = call("start_battle", {
    battleId: `battle:cleric-equipment-${packageChoice}`,
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        ammunitionStocks: [],
        characterId,
        combatantId: "cleric",
        initiative: 18,
      },
      {
        kind: "statBlock",
        ammunitionStocks: [],
        statBlockId: "stat_block_rat",
        combatantId: "rat",
        initiative: 7,
        admissionSource: { kind: "encounterParticipant" },
      },
    ],
  });
  expect(started).toMatchObject({
    envelope: {
      checkpoint: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: "cleric",
            armorClass: packageChoice === "option_a" ? 16 : 13,
          }),
        ]),
      },
    },
  });
  return { finalized, queried, started };
}

describe("starting-package equipment through public creation and Battle", () => {
  test("retains the level-5 Cleric package and replays its trained AC", () => {
    expect(replayClericEquipment("option_a")).toEqual(
      replayClericEquipment("option_a"),
    );
  });
  test("also retains a supported shield-only purchase", () => {
    replayClericEquipment("option_b");
  });
});
