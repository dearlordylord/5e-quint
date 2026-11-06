import assert from "node:assert/strict";
import {
  characterDraftId,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "@dnd/character-creation-runtime/test-support";
import { StatBlockId, unitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { handleApplicationToolCall, handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";
import {
  CreationDraftOutputSchema,
  FinalizeCharacterOutputSchema,
} from "./character-tool-output.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";

const knownForms = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
];
function readyDraft(classId: "class_druid" | "class_fighter", level: number) {
  const root = createMcpPlaySessionRoot();
  const draft = completeSupportedProgressionDraft({
    draftId: `draft:initialization-${classId}-${level}`,
    unitLibrary: root.unitLibrary,
    progression: testProgression(root.unitLibrary, unitId(classId), level),
  });
  root.sessionStore.drafts.set(draft.draftId, draft);
  const discover = () =>
    Schema.decodeUnknownSync(CreationDraftOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "get_character_creation_choices", {
          draftId: draft.draftId,
        }),
      ),
    );
  return { root, draft, discover };
}

describe("Character Sheet initialization through character finalization", () => {
  test("discovers and resolves Circle Spells initialization on the same complete draft", () => {
    const { root, draft, discover } = readyDraft("class_druid", 3);
    const discovered = discover();
    expect(discovered.holes).toEqual([]);
    expect(discovered.finalization.tag).toBe("ready");
    const input = discovered.finalizationInput;
    assert(input?.phase === "initializationRequired");
    expect(input.requiredArguments).toEqual([
      "druidCircleLand",
      "druidWildShapeKnownFormStatBlockIds",
    ]);
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(input.argumentsSchema, "finalization arguments"),
    );
    const listedForms = knownForms.flatMap((query) =>
      Schema.decodeUnknownSync(
        Schema.Struct({
          statBlocks: Schema.Array(Schema.Struct({ statBlockId: StatBlockId })),
        }),
      )(
        jsonContentPayload(
          handleApplicationToolCall(root, "list_stat_blocks", { query }),
        ),
      ).statBlocks.map(({ statBlockId }) => statBlockId),
    );
    expect(listedForms).toEqual(knownForms);
    const args = {
      draftId: draft.draftId,
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownFormStatBlockIds: listedForms,
    };
    expect(validate(args).valid).toBe(true);
    expect(validate({ draftId: draft.draftId }).valid).toBe(false);
    expect(
      validate({ ...args, druidCircleLand: { land: "synthetic-land" } }).valid,
    ).toBe(false);
    expect(
      validate({
        ...args,
        druidWildShapeKnownFormStatBlockIds: knownForms.slice(1),
      }).valid,
    ).toBe(false);
    expect(
      validate({
        ...args,
        druidWildShapeKnownFormStatBlockIds: [
          ...knownForms.slice(1),
          knownForms[1],
        ],
      }).valid,
    ).toBe(false);
    expect(
      handleToolCall(root, "finalize_character", { draftId: draft.draftId }),
    ).toMatchObject({ isError: true });
    expect(discover().finalizationInput).toEqual(input);
    expect(root.sessionStore.drafts.get(draft.draftId)).toBe(draft);
    const finalized = Schema.decodeUnknownSync(FinalizeCharacterOutputSchema)(
      jsonContentPayload(handleToolCall(root, "finalize_character", args)),
    );
    expect(finalized.finalization.tag).toBe("ready");
    expect(root.sessionStore.drafts.has(draft.draftId)).toBe(false);
    const characterId = characterIdFromDraftId(draft.draftId);
    const character = root.sessionStore.characters.get(characterId);
    assert(character?.tag === "available");
    expect(character.druidCircleLand).toEqual({ land: "temperate" });
    expect(character.druidWildShapeKnownForms?.statBlockIds).toEqual(
      knownForms,
    );
    expect(
      handleToolCall(root, "start_battle", {
        battleId: "battle:initialized-druid",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: [
          {
            kind: "characterSession",
            characterId,
            combatantId: "druid",
            ammunitionStocks: [],
            initiative: 20,
          },
        ],
      }),
    ).not.toHaveProperty("isError", true);
  });

  test("a level-two Druid needs known forms but no Circle Spells land", () => {
    const { discover } = readyDraft("class_druid", 2);
    const input = discover().finalizationInput;
    assert(input?.phase === "initializationRequired");
    expect(input.requiredArguments).toEqual([
      "druidWildShapeKnownFormStatBlockIds",
    ]);
    expect(input.instructions.join(" ")).toContain(
      "Challenge Rating at most 0.25",
    );
  });

  test("a complete Fighter has no Druid initialization obligation", () => {
    const { root, draft, discover } = readyDraft("class_fighter", 1);
    const input = discover().finalizationInput;
    assert(input?.phase === "ready");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(input.argumentsSchema, "finalization arguments"),
    );
    expect(validate({ draftId: draft.draftId }).valid).toBe(true);
    expect(
      validate({
        draftId: draft.draftId,
        druidCircleLand: { land: "temperate" },
      }).valid,
    ).toBe(false);
    expect(
      finalizeCharacterDraft({
        draft,
        unitLibrary: root.unitLibrary,
        supportProfile: root.characterCreationSupportProfile,
      }).tag,
    ).toBe("ready");
    expect(
      handleToolCall(root, "finalize_character", {
        draftId: characterDraftId(draft.draftId),
      }),
    ).not.toHaveProperty("isError", true);
  });
});
