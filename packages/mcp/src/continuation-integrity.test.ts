import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  retainBattleRuntimeContinuation,
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
    const root = createMcpPlaySessionRoot();
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
