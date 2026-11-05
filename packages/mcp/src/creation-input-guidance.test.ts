import {
  creationHoleId,
  creationChoiceOptionId,
  exactChoiceCardinality,
  boundedChoiceCardinality,
} from "@dnd/character-creation-runtime";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";
import {
  CreationDraftOutputSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
} from "./character-tool-output.ts";
import {
  creationInputGuidance,
  decodeFillCreationHolesArgs,
} from "./character-creation-fill-tool-input.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";

describe("creation input guidance", () => {
  test("empty option sets distinguish optional and impossible choices", () => {
    const holeId = creationHoleId("cc:draft:draft.languages");
    const optional = boundedChoiceCardinality({ min: 0, max: 1 });
    const required = exactChoiceCardinality(1);
    if (optional === undefined || required === undefined)
      throw new Error("Expected canonical cardinalities");
    for (const [cardinality, valid] of [
      [optional, true],
      [required, false],
    ] as const) {
      const guidance = creationInputGuidance([
        {
          kind: "choice",
          holeId,
          source: { tag: "draft", path: "draft.languages" },
          cardinality,
          options: [],
        },
      ])[0];
      if (guidance === undefined)
        throw new Error("Expected empty-options contract");
      const validate = createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(guidance.fillSchema, "empty-options fill"),
      );
      expect(validate({ kind: "choice", holeId, optionIds: [] }).valid).toBe(
        valid,
      );
    }
  });
  test("multi-choice guidance rejects repeated options at a legal count", () => {
    const holeId = creationHoleId("cc:draft:draft.languages");
    const cardinality = exactChoiceCardinality(2);
    if (cardinality === undefined)
      throw new Error("Expected two-choice cardinality");
    const guidance = creationInputGuidance([
      {
        kind: "choice",
        holeId,
        source: { tag: "draft", path: "draft.languages" },
        cardinality,
        options: [
          {
            optionId: creationChoiceOptionId("synthetic-first"),
            label: "Synthetic First",
          },
          {
            optionId: creationChoiceOptionId("synthetic-second"),
            label: "Synthetic Second",
          },
        ],
      },
    ])[0];
    if (guidance === undefined)
      throw new Error("Expected multi-choice contract");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(guidance.fillSchema, "multi-choice fill"),
    );
    expect(
      validate({
        kind: "choice",
        holeId,
        optionIds: ["synthetic-first", "synthetic-second"],
      }).valid,
    ).toBe(true);
    expect(
      validate({
        kind: "choice",
        holeId,
        optionIds: ["synthetic-first", "synthetic-first"],
      }).valid,
    ).toBe(false);
  });
  test("current choices publish complete decoder-compatible fill contracts on every continuation", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "synthetic-guidance-draft";
    const created = Schema.decodeUnknownSync(CreationDraftOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "create_character_draft", { draftId }),
      ),
    );
    const discovered = Schema.decodeUnknownSync(CreationDraftOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "get_character_creation_choices", { draftId }),
      ),
    );
    expect(discovered.creationInputs).toEqual(created.creationInputs);
    for (const hole of created.holes) {
      const guidance = created.creationInputs.find(
        (input) => input.holeId === hole.holeId,
      );
      expect(guidance).toBeDefined();
      if (guidance === undefined)
        throw new Error("Expected current input contract");
      const validate = createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(guidance.fillSchema, "creation fill"),
      );
      const fill =
        hole.kind === "choice"
          ? {
              kind: hole.kind,
              holeId: hole.holeId,
              optionIds: hole.options
                .slice(
                  0,
                  hole.cardinality.tag === "exactly"
                    ? hole.cardinality.count
                    : hole.cardinality.min,
                )
                .map((option) => option.optionId),
            }
          : {
              kind: hole.kind,
              holeId: hole.holeId,
              method: "standardArray",
              value: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
            };
      expect(validate(fill).valid).toBe(true);
      if (hole.kind === "choice") {
        const firstOption = hole.options[0];
        if (firstOption !== undefined) {
          expect(
            validate({
              ...fill,
              optionIds: Array.from(
                {
                  length:
                    (hole.cardinality.tag === "exactly"
                      ? hole.cardinality.count
                      : hole.cardinality.max) + 1,
                },
                () => firstOption.optionId,
              ),
            }).valid,
          ).toBe(false);
        }
        expect(
          validate({ ...fill, optionIds: ["synthetic-unavailable-option"] })
            .valid,
        ).toBe(false);
      } else {
        expect(
          validate({ ...fill, method: "synthetic-unavailable-method" }).valid,
        ).toBe(false);
      }

      expect(validate({ ...fill, kind: undefined }).valid).toBe(false);
      expect(
        validate({ ...fill, holeId: "cc:draft:draft.syntheticWrongHole" })
          .valid,
      ).toBe(false);
      expect(
        Result.isSuccess(
          decodeFillCreationHolesArgs(
            { draftId, expectedRevision: 0, fills: [fill] },
            "apply_character_creation_choices",
          ),
        ),
      ).toBe(true);
    }
    const progression = created.holes.find((hole) => hole.kind === "choice");
    if (progression?.kind !== "choice" || progression.options[0] === undefined)
      throw new Error("Expected initial progression choice");
    const applied = Schema.decodeUnknownSync(FillCreationHolesOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "apply_character_creation_choices", {
          draftId,
          expectedRevision: 0,
          fills: [
            {
              kind: progression.kind,
              holeId: progression.holeId,
              optionIds: [progression.options[0].optionId],
            },
          ],
        }),
      ),
    );
    expect(applied.result.tag).toBe("accepted");
    expect(applied.creationInputs).not.toEqual(created.creationInputs);
    expect(applied.creationInputs.map((input) => input.holeId)).toEqual(
      applied.result.holes.map((hole) => hole.holeId),
    );
    const rejected = Schema.decodeUnknownSync(FillCreationHolesOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "apply_character_creation_choices", {
          draftId,
          expectedRevision: 999,
          fills: [],
        }),
      ),
    );
    expect(rejected.result.tag).toBe("rejected");
    expect(rejected.creationInputs).toEqual(applied.creationInputs);
    const finalized = Schema.decodeUnknownSync(FinalizeCharacterOutputSchema)(
      jsonContentPayload(
        handleToolCall(root, "finalize_character", { draftId }),
      ),
    );
    expect(finalized.creationInputs).toEqual(applied.creationInputs);
  });
});
