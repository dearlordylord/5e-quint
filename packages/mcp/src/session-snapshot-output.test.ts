import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  characterId,
  combatantId,
} from "@dnd/battle-runtime";
import { DieRollResult, NonNegativeInteger } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Either, Schema } from "effect";
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
          tag: "runtimeCommand",
          actorId: combatantId("combatant:projection-test"),
          command: "endTurn",
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

  test("rejects authored attack presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:presentation-correlation");
    const scopeRef = battleAttackExecutionScopeRef(
      battleId("battle:presentation-correlation"),
      actorId,
      battleExecutionScopeOrdinal(0),
    );
    const subjectProcedureRef = battleAttackProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(0),
    );
    const presentationProcedureRef = battleAttackProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(1),
    );

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(McpSessionSnapshotSchema)({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          activeBattle: null,
          transientBattleFills: {
            subject: {
              tag: "action",
              action: "attack",
              actorId,
              procedureRef: subjectProcedureRef,
              attackAbility: "dex",
              attackDamageType: "force",
            },
            presentation: {
              kind: "attack",
              procedureRef: presentationProcedureRef,
              name: "Synthetic Arc",
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects authored unit presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:spell-presentation-kind");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:spell-presentation-kind"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(McpSessionSnapshotSchema)({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          activeBattle: null,
          transientBattleFills: {
            subject: {
              tag: "actionSpell",
              actorId,
              procedureRef,
              mode: { tag: "cast" },
            },
            presentation: {
              kind: "unit",
              procedureRef,
              unitId: "synthetic_spell_mismatched_unit",
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects authored spell presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:unit-presentation-kind");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:unit-presentation-kind"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(McpSessionSnapshotSchema)({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          activeBattle: null,
          transientBattleFills: {
            subject: {
              tag: "unitFeature",
              actorId,
              procedureRef,
            },
            presentation: {
              kind: "spell",
              procedureRef,
              invocation: {
                tag: "cantrip",
                spellId: "synthetic_unit_mismatched_spell",
                procedure: "spellAttackDamage",
              },
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });
});
