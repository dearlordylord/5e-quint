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

function replayStartingEquipment(input: {
  readonly classUnitId: ReturnType<typeof unitId>;
  readonly packageChoice: EquipmentPackageChoice;
  readonly expectedArmorClass: number;
  readonly equipmentLoadout?: { readonly armor: string };
  readonly expectedEquipment: {
    readonly startingEquipmentCurrencyRemainderCp: number;
    readonly owned: ReturnType<typeof expect.arrayContaining>;
    readonly loadout: {
      readonly armor?: string;
      readonly shield?: string;
    };
  };
}) {
  const { classUnitId, packageChoice } = input;
  const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (catalog.tag !== "ok") throw new Error("Expected the SRD catalog.");
  const unitLibrary = catalog.catalog;
  const root = createMcpPlaySessionRoot();
  const draftId = characterDraftId(
    `draft:${classUnitId}-equipment-${packageChoice}`,
  );
  const characterId = characterIdFromDraftId(draftId);
  const call = (name: string, args: unknown): unknown => {
    const result = handleToolCall(root, name, args);
    expect(result).not.toHaveProperty("isError", true);
    const text = result.content[0]?.text;
    if (text === undefined) throw new Error("Expected a tool response.");
    return JSON.parse(text);
  };
  let draft = createCharacterDraft({ draftId, unitLibrary });
  call("create_character_draft", { draftId });
  const progressionOption = progressionOptionId(
    testProgression(unitLibrary, classUnitId, 5),
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
          classUnitId === "class_cleric"
            ? equipmentFixtureOptions(source, packageChoice)
            : source.choiceKey === "class_equipment_choice"
              ? [creationChoiceOptionId(packageChoice)]
              : manifestFixtureOptionIds(source),
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
    build: { equipment: input.expectedEquipment },
  });
  call("apply_character_session_operation", {
    characterId,
    operation: {
      kind: "setEquipmentLoadout",
      loadout: input.equipmentLoadout ?? input.expectedEquipment.loadout,
    },
  });
  const queried = call("query_character_session", {
    characterId,
    query: { kind: "armorClass" },
  });
  expect(queried).toMatchObject({
    query: {
      projection: { armorClass: input.expectedArmorClass },
    },
  });
  const started = call("start_battle", {
    battleId: `battle:${classUnitId}-equipment-${packageChoice}`,
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        ammunitionStocks: [],
        characterId,
        combatantId: "character",
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
            combatantId: "character",
            armorClass: input.expectedArmorClass,
          }),
        ]),
      },
    },
  });
  return { finalized, queried, started };
}

describe("starting-package equipment through public creation and Battle", () => {
  test("retains the level-5 Cleric package and replays its trained AC", () => {
    expect(
      replayStartingEquipment({
        classUnitId: unitId("class_cleric"),
        packageChoice: "option_a",
        expectedArmorClass: 16,
        expectedEquipment: expectedEquipment("option_a"),
      }),
    ).toEqual(
      replayStartingEquipment({
        classUnitId: unitId("class_cleric"),
        packageChoice: "option_a",
        expectedArmorClass: 16,
        expectedEquipment: expectedEquipment("option_a"),
      }),
    );
  });
  test("also retains a supported shield-only purchase", () => {
    replayStartingEquipment({
      classUnitId: unitId("class_cleric"),
      packageChoice: "option_b",
      expectedArmorClass: 13,
      expectedEquipment: expectedEquipment("option_b"),
    });
  });
});

const armorPackages = [
  {
    classUnitId: unitId("class_fighter"),
    packageChoice: "option_a",
    armorItemId: "armor:armor_chain_mail",
    expectedArmorClass: 16,
    expectedCurrency: 5200,
  },
  {
    classUnitId: unitId("class_fighter"),
    packageChoice: "option_b",
    armorItemId: "armor:armor_studded_leather_armor",
    expectedArmorClass: 13,
    expectedCurrency: 5900,
  },
  {
    classUnitId: unitId("class_rogue"),
    packageChoice: "option_a",
    armorItemId: "armor:armor_leather",
    expectedArmorClass: 12,
    expectedCurrency: 5600,
  },
] as const;

for (const scenario of armorPackages) {
  test(`${scenario.classUnitId} ${scenario.packageChoice} owns and equips its starting armor in Battle`, () => {
    replayStartingEquipment({
      ...scenario,
      equipmentLoadout: { armor: scenario.armorItemId },
      expectedEquipment: {
        startingEquipmentCurrencyRemainderCp: scenario.expectedCurrency,
        owned: expect.arrayContaining([
          { kind: "catalogItem", itemId: scenario.armorItemId, quantity: 1 },
        ]),
        loadout: {},
      },
    });
  });
}
