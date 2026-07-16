import { battleId, characterId, combatantId } from "@dnd/battle-runtime";
import { DieRollResult } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import { ListCharactersOutputSchema } from "./character-tool-output.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import {
  CharacterToolSessionSnapshotSchema,
  characterToolSessionSnapshot,
  McpSessionSnapshotSchema,
} from "./session-snapshot-output.ts";

describe("MCP session wire projections", () => {
  test("keeps battle fill definitions out of the character-tool schema", () => {
    expect(
      mcpOutputJsonSchema(CharacterToolSessionSnapshotSchema).properties,
    ).not.toHaveProperty("transientBattleFills");
    expect(
      mcpOutputJsonSchema(McpSessionSnapshotSchema).properties,
    ).toHaveProperty("transientBattleFills");
  });

  test("derives the character-tool projection from the canonical snapshot", () => {
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
        session: characterToolSessionSnapshot(snapshot),
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
