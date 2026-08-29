import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { battleToolNames } from "./battle-tool-input.ts";
import { CharacterSessionQueryOutputSchema } from "./character-session-query-tool-output.ts";
import { characterToolNames } from "./character-tool-input.ts";
import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import {
  McpSessionSummarySchema,
  type McpSessionSummary,
} from "./session-snapshot-output.ts";
import { handleToolCall } from "./server.ts";
import {
  handleCreatePlaySession,
  nextOperationsFrom,
  unresolvedInputsFrom,
} from "./play-session-protocol.ts";
import {
  createPlaySessionRegistry,
  decodePlaySessionId,
} from "./play-session.ts";
import { jsonContentPayload } from "./tool-content.ts";

describe("Play Session operation projection", () => {
  test("returns a typed issue when a success payload drifts from its operation schema", () => {
    expect(
      unresolvedInputsFrom(characterToolNames.createCharacterDraft, {}),
    ).toMatchObject({
      _tag: "Left",
      left: { tag: "operationProjectionDecodeIssue" },
    });
  });

  test("keeps Play Session collision details out of the public creation error", () => {
    const decoded = decodePlaySessionId(
      "play-session:00000000-0000-4000-8000-000000000000",
    );
    if (Result.isFailure(decoded)) throw new Error(decoded.failure);
    const applicationServices = createMcpApplicationServices();
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          applicationServices,
          adminMirrorSessionId(playSessionId),
        ),
      playSessionIdFactory: () => decoded.success,
    });

    expect(Result.isSuccess(registry.create({ tag: "anonymous" }))).toBe(true);
    const publicFailure = handleCreatePlaySession(registry, undefined);

    expect(publicFailure.isError).toBe(true);
    expect(jsonContentPayload(publicFailure)).toEqual({
      error: "Unable to create a Play Session.",
      details: { code: "PLAY_SESSION_CREATION_FAILED" },
    });
    expect(JSON.stringify(publicFailure)).not.toContain("collision");
  });

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
    const decoded = Schema.decodeUnknownResult(
      CharacterSessionQueryOutputSchema,
    )(queryOutput);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;

    const unresolved = unresolvedInputsFrom(
      characterToolNames.queryCharacterSession,
      decoded.success,
    );
    expect(Result.isSuccess(unresolved)).toBe(true);
    if (Result.isFailure(unresolved)) return;
    expect(unresolved.success).toEqual([]);
    const nextOperations = nextOperationsFrom(
      characterToolNames.queryCharacterSession,
      session,
      unresolved.success,
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
    expect(Result.isSuccess(unresolved)).toBe(true);
    if (Result.isFailure(unresolved)) return;
    expect(unresolved.success.length).toBeGreaterThan(0);
    expect(unresolved.success[0]?.sourcePath).toBe("$.holes");
    expect(
      nextOperationsFrom(
        characterToolNames.createCharacterDraft,
        sessionSummary(root),
        unresolved.success,
        false,
      ),
    ).toContain(characterToolNames.fillCreationHoles);
  });

  test("preserves Battle-hole guidance from a typed battle presentation", () => {
    const root = createMcpPlaySessionRoot();
    const started = handleToolCall(root, battleToolNames.startBattle, {
      battleId: "battle:protocol-projection-battle",
      initiativeMode: "direct",
      companionAdmissions: [],
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
    expect(Result.isSuccess(unresolved)).toBe(true);
    if (Result.isFailure(unresolved)) return;
    expect(unresolved.success.length).toBeGreaterThan(0);
    expect(unresolved.success[0]?.sourcePath).toMatch(
      /^\$\.envelope\.frontier\.acts\[\d+\]\.initialHoles$/u,
    );
    expect(
      nextOperationsFrom(
        battleToolNames.startBattle,
        sessionSummary(root),
        unresolved.success,
        false,
      ),
    ).toContain(battleToolNames.fillBattleHole);
  });
});

function activeBattleSummary(): McpSessionSummary | undefined {
  const decoded = Schema.decodeUnknownResult(McpSessionSummarySchema)({
    draftIds: [],
    characterIds: ["character:ritual-wizard"],
    selectedStatBlockId: null,
    battleState: {
      tag: "activeBattle",
      battleId: "battle:unrelated",
      currentActorId: "unrelated-actor",
    },
  });
  expect(Result.isSuccess(decoded)).toBe(true);
  return Result.isSuccess(decoded) ? decoded.success : undefined;
}

function sessionSummary(root: ReturnType<typeof createMcpPlaySessionRoot>) {
  const snapshot = root.sessionStore.snapshot();
  const decoded = Schema.decodeUnknownResult(McpSessionSummarySchema)({
    draftIds: snapshot.draftIds,
    characterIds: snapshot.characterIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    battleState: snapshot.battleState,
  });
  if (Result.isFailure(decoded)) {
    throw new Error(decoded.failure.message);
  }
  return decoded.success;
}
