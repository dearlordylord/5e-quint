import { expect, test } from "vitest";
import { Schema } from "effect";
import { combatantId } from "@dnd/battle-runtime";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  characterBuildUnitRefs,
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  GNOMISH_LINEAGE_CHOICE_KEY,
  GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
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

test("a finalized Forest Gnome Wizard retains Gnomish Cunning and enters Battle through MCP", () => {
  const classUnitId = unitId("class_wizard");
  const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (catalog.tag !== "ok") throw new Error("Expected the SRD catalog.");
  const unitLibrary = catalog.catalog;
  const root = createMcpPlaySessionRoot();
  const draftId = characterDraftId("draft:gnome-wizard-admission");
  const characterId = characterIdFromDraftId(draftId);
  const call = (name: string, args: unknown): unknown => {
    const result = handleToolCall(root, name, args);
    expect(result, `${name}: ${JSON.stringify(result)}`).not.toHaveProperty(
      "isError",
      true,
    );
    const text = result.content[0]?.text;
    if (text === undefined) throw new Error("Expected a tool response.");
    return JSON.parse(text);
  };
  let draft = createCharacterDraft({ draftId, unitLibrary });
  call("create_character_draft", { draftId });
  const progressionOption = progressionOptionId(
    testProgression(unitLibrary, classUnitId, 1),
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
        speciesOptionId: creationChoiceOptionId("species_gnome"),
        backgroundOptionId: creationChoiceOptionId("background_sage"),
        standardArrayAssignment: {
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 12,
          cha: 10,
        },
        fixtureOptionIds: (source) =>
          source.choiceKey === GNOMISH_LINEAGE_CHOICE_KEY
            ? [creationChoiceOptionId("forest_gnome")]
            : source.choiceKey ===
                GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY
              ? [creationChoiceOptionId("int")]
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
  const sheet = root.sessionStore.characters.get(characterId);
  if (sheet?.tag !== "available") throw new Error("Expected finalized sheet.");
  expect(sheet.build.speciesChoiceFacts?.gnomishLineage).toMatchObject({
    lineageId: "forest_gnome",
    spellcastingAbility: "int",
  });
  expect(characterBuildUnitRefs(sheet.build, unitLibrary)).toContainEqual({
    unitId: "species_gnome_gnomish_cunning",
  });
  const queried = call("query_character_session", {
    characterId,
    query: { kind: "armorClass" },
  });
  expect(queried).toMatchObject({
    query: {
      projection: { armorClass: 12 },
    },
  });
  const started = call("start_battle", {
    battleId: "battle:gnome-wizard-admission",
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
            armorClass: 12,
          }),
        ]),
      },
    },
  });
  expect(
    root.sessionStore.battleSession?.state.combatants.get(
      combatantId("character"),
    )?.origin,
  ).toMatchObject({
    kind: "character",
    execution: {
      procedureBindings: expect.arrayContaining([
        expect.objectContaining({
          procedure: expect.objectContaining({
            kind: "unitSupportProfile",
            execution: {
              kind: "passiveSavingThrowRollMode",
              savingThrow: {
                mode: "advantage",
                scope: {
                  kind: "savingThrowAbilities",
                  abilities: ["int", "wis", "cha"],
                },
              },
            },
          }),
        }),
      ]),
    },
  });
});
