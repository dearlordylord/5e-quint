import { characterSheetId } from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import { armorClassBuild } from "../../character-sheet-runtime/src/test-support.test-support.ts";
import { generatedDiceSeed } from "./dice-sampling-service.ts";
import { availableCharacterSession } from "./session-store.ts";
import { retainPlaySessionContinuation } from "./play-session-continuation.ts";
import {
  encodePlaySessionContinuation,
  decodePlaySessionContinuation,
} from "./play-session-continuation-codec.ts";
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  retainBattleRuntimeContinuation,
  combatantId,
  restoreBattleRuntimeContinuation,
} from "@dnd/battle-runtime";
import {
  battleExecutionScopeCursor,
  battleExecutionScopeOrdinal,
} from "../../battle-runtime/src/identity.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import {
  decodeContinuationGraph,
  encodeContinuationGraph,
} from "./continuation-graph.ts";
import { parseContinuationDescriptors } from "./continuation-type-descriptor.ts";
import { handleToolCall } from "./server.ts";

function value<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}

describe("continuation storage integrity", () => {
  test("keeps contextual Character Sheet HP validation when the primitive codec admits zero", () => {
    const seed = generatedDiceSeed();
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const sheet = value(
      availableCharacterSession({
        characterId: characterSheetId("character:synthetic-restored-sheet"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(1),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary: root.unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      }),
    );
    root.sessionStore.characters.set(sheet);
    value(
      decodePlaySessionContinuation(
        root,
        seed,
        value(encodePlaySessionContinuation(root)),
      ),
    );
    const retained = value(retainPlaySessionContinuation(root));
    const malformed = value(
      encodeContinuationGraph(root, {
        ...retained,
        characters: [
          {
            ...sheet,
            hitPoints: { tag: "positive", currentHp: Hp(0), tempHp: Hp(0) },
          },
        ],
      }),
    );
    expect(decodePlaySessionContinuation(root, seed, malformed)).toMatchObject({
      _tag: "Failure",
      failure: expect.stringContaining("requires positive current HP"),
    });
  });

  test("rejects Character Session occupancy that contradicts the retained Battle", () => {
    const seed = generatedDiceSeed();
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const sheet = value(
      availableCharacterSession({
        characterId: characterSheetId("character:synthetic-restored-owner"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(1),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary: root.unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      }),
    );
    root.sessionStore.characters.set(sheet);
    const started = handleToolCall(root, "start_battle", {
      battleId: "synthetic-restored-owner",
      initiativeMode: "initialSetup",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "characterSession",
          characterId: sheet.characterId,
          combatantId: "synthetic-character",
          initiative: 20,
          ammunitionStocks: [],
        },
      ],
    });
    expect("isError" in started && started.isError).not.toBe(true);
    const retained = value(retainPlaySessionContinuation(root));
    for (const malformed of [
      { ...retained, characters: [sheet] },
      { ...retained, battle: { tag: "none" } },
    ]) {
      const graph = value(encodeContinuationGraph(root, malformed));
      expect(decodePlaySessionContinuation(root, seed, graph)).toMatchObject({
        _tag: "Failure",
        failure: expect.stringContaining("ownership is contradictory"),
      });
    }
  });

  test("rejects unrecognized descriptor fields and nested refinements", () => {
    expect(() =>
      parseContinuationDescriptors([
        { kind: "string", ignoredConstraint: true },
      ]),
    ).toThrow();
    expect(() =>
      parseContinuationDescriptors([
        {
          kind: "object",
          fields: {
            value: { type: 0, optional: false, ignoredConstraint: true },
          },
        },
      ]),
    ).toThrow();
    expect(() =>
      parseContinuationDescriptors([
        {
          kind: "refined",
          type: { kind: "refined", type: { kind: "string" }, refinement: 0 },
          refinement: 0,
        },
      ]),
    ).toThrow();
  });

  test("rejects duplicate Map keys, Set entries, and unreachable data", () => {
    const services = createMcpPlaySessionRoot();
    expect(
      Result.isFailure(
        decodeContinuationGraph(services, {
          root: 0,
          nodes: [
            {
              kind: "map",
              entries: [
                [1, 2],
                [1, 2],
              ],
            },
            { kind: "scalar", value: "key" },
            { kind: "scalar", value: 1 },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        decodeContinuationGraph(services, {
          root: 0,
          nodes: [
            { kind: "set", items: [1, 1] },
            { kind: "scalar", value: "entry" },
          ],
        }),
      ),
    ).toBe(true);
    const graph = value(encodeContinuationGraph(services, { value: 1 }));
    expect(
      Result.isFailure(
        decodeContinuationGraph(services, {
          ...graph,
          nodes: [...graph.nodes, { kind: "undefined" }],
        }),
      ),
    ).toBe(true);
  });

  test("rejects regressed allocation cursors and contradictory active ownership", () => {
    const seed = generatedDiceSeed();
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const started = handleToolCall(root, "start_battle", {
      battleId: "synthetic-continuation-integrity",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: ["first", "second"].map((combatantId, index) => ({
        kind: "statBlock",
        statBlockId: "stat_block_goblin_warrior",
        combatantId,
        initiative: 20 - index,
        ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
        admissionSource: { kind: "encounterParticipant" },
      })),
    });
    expect("isError" in started && started.isError).not.toBe(true);
    for (const operation of [
      { kind: "removeCombatant", combatantId: "second" },
      {
        kind: "addCombatant",
        combatant: {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "second",
          initiative: 19,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      },
    ]) {
      const result = handleToolCall(root, "battle_lifecycle", { operation });
      expect("isError" in result && result.isError).not.toBe(true);
    }
    const session = root.sessionStore.battleSession;
    if (session === null) throw new Error("Expected an active Battle.");
    const retained = value(retainBattleRuntimeContinuation(session, null));
    const copied = value(
      decodePlaySessionContinuation(
        root,
        seed,
        value(encodePlaySessionContinuation(root)),
      ),
    );
    const previousScope = session.state.combatants.get(combatantId("second"))
      ?.origin.execution.scopeRef;
    for (const resumed of [root, copied]) {
      for (const operation of [
        { kind: "removeCombatant", combatantId: "second" },
        {
          kind: "addCombatant",
          combatant: {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second",
            initiative: 19,
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            admissionSource: { kind: "encounterParticipant" },
          },
        },
      ]) {
        const result = handleToolCall(resumed, "battle_lifecycle", {
          operation,
        });
        expect("isError" in result && result.isError).not.toBe(true);
      }
    }
    const nextScope = copied.sessionStore.battleSession?.state.combatants.get(
      combatantId("second"),
    )?.origin.execution.scopeRef;
    expect(nextScope).toBeDefined();
    expect(nextScope).not.toBe(previousScope);
    expect(handleToolCall(copied, "read_battle_state", {})).toEqual(
      handleToolCall(root, "read_battle_state", {}),
    );

    const invalid = {
      ...retained,
      sessions: retained.sessions.map((entry) => ({
        ...entry,
        state: {
          ...entry.state,
          executionScopeCursors: new Map(
            [...entry.state.executionScopeCursors].map(([id, allocation]) => [
              id,
              {
                ...allocation,
                nextScopeOrdinal: battleExecutionScopeCursor(
                  battleExecutionScopeOrdinal(1),
                ),
              },
            ]),
          ),
        },
      })),
    };
    expect(
      Result.isFailure(
        restoreBattleRuntimeContinuation(
          invalid,
          root.battleStatBlockExecutionCatalog,
        ),
      ),
    ).toBe(true);
    const absent = {
      ...retained,
      sessions: retained.sessions.map((entry) => ({
        ...entry,
        state: { ...entry.state, executionScopeCursors: new Map() },
      })),
    };
    expect(
      Result.isFailure(
        restoreBattleRuntimeContinuation(
          absent,
          root.battleStatBlockExecutionCatalog,
        ),
      ),
    ).toBe(true);
  });
});
