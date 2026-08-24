import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { battleToolNames } from "./battle-tool-input.ts";
import { CharacterSessionQueryOutputSchema } from "./character-session-query-tool-output.ts";
import { characterToolNames } from "./character-tool-input.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import {
  McpSessionSummarySchema,
  type McpSessionSummary,
} from "./session-snapshot-output.ts";
import { handleToolCall } from "./server.ts";
import {
  nextOperationsFrom,
  unresolvedInputsFrom,
} from "./play-session-protocol.ts";

describe("Play Session operation projection", () => {
  test("does not treat Character Session qRoute metadata as Battle holes", () => {
    const session = activeBattleSummary();
    if (session === undefined) return;

    const queryOutput = {
      characterId: "character:ritual-wizard",
      query: {
        kind: "spellInvocation" as const,
        projection: {
          tag: "rejected" as const,
          issue: {
            tag: "characterSheetIssue" as const,
            message: "The ritual projection was rejected.",
          },
          qRoute: [
            {
              kind: "retainCharacterSheetSelectedReferences" as const,
              subject: "selectedReferenceProjection" as const,
              owner: "selectedReference" as const,
            },
            {
              kind: "resolveCharacterSheetSubject" as const,
              subject: "spellResource" as const,
              fill: "projectionSelection" as const,
              holes: ["projectionChoice" as const],
              owner: "selectedReference" as const,
            },
          ],
        },
      },
      session,
    };
    const decoded = Schema.decodeUnknownEither(
      CharacterSessionQueryOutputSchema,
    )(queryOutput);
    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isLeft(decoded)) return;

    const unresolved = unresolvedInputsFrom(
      characterToolNames.queryCharacterSession,
      decoded.right,
    );
    expect(unresolved).toEqual([]);
    const nextOperations = nextOperationsFrom(
      characterToolNames.queryCharacterSession,
      session,
      unresolved,
      false,
    );
    expect(nextOperations).not.toContain(battleToolNames.fillBattleHole);
    expect(nextOperations).toContain(battleToolNames.discoverBattleActs);
  });

  test("preserves creation-hole guidance from a typed creation result", () => {
    const root = createMcpPlaySessionRoot();
    const created = handleToolCall(
      root,
      characterToolNames.createCharacterDraft,
      {
        draftId: "draft:protocol-projection-creation",
      },
    );
    if (!("structuredContent" in created)) {
      throw new Error("Expected a typed creation result.");
    }

    const unresolved = unresolvedInputsFrom(
      characterToolNames.createCharacterDraft,
      created.structuredContent,
    );
    expect(unresolved.length).toBeGreaterThan(0);
    expect(unresolved[0]?.sourcePath).toBe("$.holes");
    expect(
      nextOperationsFrom(
        characterToolNames.createCharacterDraft,
        sessionSummary(root),
        unresolved,
        false,
      ),
    ).toContain(characterToolNames.fillCreationHoles);
  });

  test("preserves Battle-hole guidance from a typed battle presentation", () => {
    const root = createMcpPlaySessionRoot();
    const started = handleToolCall(root, battleToolNames.startBattle, {
      battleId: "battle:protocol-projection-battle",
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "projection-goblin",
          initiative: 20,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_skeleton",
          combatantId: "projection-skeleton",
          initiative: 10,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    });
    if (!("structuredContent" in started)) {
      throw new Error("Expected a typed Battle start result.");
    }

    const unresolved = unresolvedInputsFrom(
      battleToolNames.startBattle,
      started.structuredContent,
    );
    expect(unresolved.length).toBeGreaterThan(0);
    expect(unresolved[0]?.sourcePath).toMatch(
      /^\$\.availableActs\[\d+\]\.initialHoles$/u,
    );
    expect(
      nextOperationsFrom(
        battleToolNames.startBattle,
        sessionSummary(root),
        unresolved,
        false,
      ),
    ).toContain(battleToolNames.fillBattleHole);
  });
});

function activeBattleSummary(): McpSessionSummary | undefined {
  const decoded = Schema.decodeUnknownEither(McpSessionSummarySchema)({
    draftIds: [],
    characterIds: ["character:ritual-wizard"],
    selectedStatBlockId: null,
    battleState: {
      tag: "activeBattle",
      battleId: "battle:unrelated",
      currentActorId: "unrelated-actor",
    },
  });
  expect(Either.isRight(decoded)).toBe(true);
  return Either.isRight(decoded) ? decoded.right : undefined;
}

function sessionSummary(root: ReturnType<typeof createMcpPlaySessionRoot>) {
  const snapshot = root.sessionStore.snapshot();
  const decoded = Schema.decodeUnknownEither(McpSessionSummarySchema)({
    draftIds: snapshot.draftIds,
    characterIds: snapshot.characterIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    battleState: snapshot.battleState,
  });
  if (Either.isLeft(decoded)) {
    throw new Error(decoded.left.message);
  }
  return decoded.right;
}
