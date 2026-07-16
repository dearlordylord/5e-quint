import { battleId, characterId, combatantId } from "@dnd/battle-runtime";
import { DieRollResult } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { ListCharactersOutputSchema } from "./character-tool-output.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import {
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
  mcpSessionSummary,
} from "./session-snapshot-output.ts";

const SESSION_SUMMARY_OUTPUT_SCHEMAS = [
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
  EndBattleOutputSchema,
] as const satisfies ReadonlyArray<Schema.Schema.AnyNoContext>;

const SESSION_SNAPSHOT_OUTPUT_SCHEMAS = [
  BattleSessionOutputSchema,
  BattleResolutionOutputSchema,
] as const satisfies ReadonlyArray<Schema.Schema.AnyNoContext>;

function outputJsonSchema(schema: Schema.Schema.AnyNoContext) {
  return mcpOutputJsonSchema(schema);
}

describe("MCP session wire projections", () => {
  test("keeps battle fill definitions out of the session summary schema", () => {
    expect(
      mcpOutputJsonSchema(McpSessionSummarySchema).properties,
    ).not.toHaveProperty("transientBattleFills");
    expect(
      mcpOutputJsonSchema(McpSessionSnapshotSchema).properties,
    ).toHaveProperty("transientBattleFills");
  });

  test("uses the summary only where the result does not report battle fill progression", () => {
    for (const schema of SESSION_SUMMARY_OUTPUT_SCHEMAS) {
      expect(outputJsonSchema(schema)).toMatchObject({
        properties: {
          session: {
            properties: expect.not.objectContaining({
              transientBattleFills: expect.anything(),
            }),
          },
        },
      });
    }

    for (const schema of SESSION_SNAPSHOT_OUTPUT_SCHEMAS) {
      expect(outputJsonSchema(schema)).toMatchObject({
        properties: {
          session: {
            properties: expect.objectContaining({
              transientBattleFills: expect.anything(),
            }),
          },
        },
      });
    }
  });

  test("derives the session summary from the canonical snapshot", () => {
    const snapshot = {
      draftIds: [],
      characterIds: [characterId("character:projection-test")],
      selectedStatBlockId: null,
      activeBattle: {
        battleId: battleId("battle-projection-test"),
        currentActorId: combatantId("combatant:projection-test"),
      },
      transientBattleFills: {
        subject: {
          tag: "action",
          actorId: combatantId("combatant:projection-test"),
          action: "attack",
          attackName: "Synthetic Strike",
        },
        fills: [
          {
            kind: "attackRoll",
            holeId: holeId("battle:projection-test:attack-roll"),
            value: { total: 12, naturalD20: DieRollResult(10) },
          },
        ],
      },
    } satisfies McpSessionSnapshot;

    expect(
      schemaJsonContent(ListCharactersOutputSchema, {
        characters: [],
        session: mcpSessionSummary(snapshot),
      }).structuredContent,
    ).toEqual({
      characters: [],
      session: {
        draftIds: [],
        characterIds: ["character:projection-test"],
        selectedStatBlockId: null,
        activeBattle: {
          battleId: "battle-projection-test",
          currentActorId: "combatant:projection-test",
        },
      },
    });
  });
});
