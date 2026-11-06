import { describe, expect, test } from "vitest";
import { Effect, Result } from "effect";
import {
  discoverBattleActs,
  settleBattleRuntimeTransaction,
} from "@dnd/battle-runtime";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { decodeDiceSeed } from "./dice-sampling-service.ts";
import { handleToolCall } from "./server.ts";
import {
  encodePlaySessionContinuation,
  decodePlaySessionContinuation,
  parseContinuationGraph,
} from "./play-session-continuation-codec.ts";

const seedResult = decodeDiceSeed([
  "12345678",
  "87654321",
  "11223344",
  "55667788",
]);
if (Result.isFailure(seedResult)) throw new Error(seedResult.failure.message);
const seed = seedResult.success;

function value<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}

describe("canonical Play Session continuation codec", () => {
  test("resumes the actual random stream without replaying a command", async () => {
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    await Effect.runPromise(
      root.diceSampling.sample([{ dice: 2, dieSize: 20 }]),
    );
    const graph = value(encodePlaySessionContinuation(root));
    const restored = value(
      decodePlaySessionContinuation(
        root,
        seed,
        value(parseContinuationGraph(JSON.parse(JSON.stringify(graph)))),
      ),
    );
    expect(
      await Effect.runPromise(
        restored.diceSampling.sample([{ dice: 3, dieSize: 6 }]),
      ),
    ).toEqual(
      await Effect.runPromise(
        root.diceSampling.sample([{ dice: 3, dieSize: 6 }]),
      ),
    );
  });

  test("retains an unanswered Battle selection and its cancellation identity", () => {
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const started = handleToolCall(root, "start_battle", {
      battleId: "synthetic-continuation-codec",
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
    const session = root.sessionStore.battleSession;
    if (session === null) throw new Error("Expected an active Battle.");
    const act = discoverBattleActs(session)[0];
    if (act === undefined) throw new Error("Expected a Battle act.");
    const pending = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: { kind: "ordinarySubject", subject: act.subject, fills: [] },
      statBlockCatalog: root.battleStatBlockExecutionCatalog,
    });
    expect(pending.tag).toBe("needsHoles");
    value(root.sessionStore.storeBattleTransactionResult(session, pending));
    const selection = root.sessionStore.getPendingBattleSelection();
    if (selection === null) throw new Error("Expected a pending selection.");
    const before = handleToolCall(root, "read_battle_state", {});
    const graph = value(encodePlaySessionContinuation(root));
    const restored = value(
      decodePlaySessionContinuation(
        root,
        seed,
        value(parseContinuationGraph(JSON.parse(JSON.stringify(graph)))),
      ),
    );
    expect(handleToolCall(restored, "read_battle_state", {})).toEqual(before);
    expect(restored.sessionStore.getPendingBattleSelection()?.selectionId).toBe(
      selection.selectionId,
    );
    const cancelled = handleToolCall(restored, "cancel_battle_action", {
      expectedSelectionId: selection.selectionId,
    });
    expect("isError" in cancelled && cancelled.isError).not.toBe(true);
  });

  test("rejects malformed canonical state and absent graph references", () => {
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const graph = value(encodePlaySessionContinuation(root));
    expect(
      Result.isFailure(
        parseContinuationGraph({ ...graph, unrecognized: true }),
      ),
    ).toBe(true);
    const malformed = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.kind === "bigint" ? { ...node, value: "-1" } : node,
      ),
    };
    expect(
      Result.isFailure(decodePlaySessionContinuation(root, seed, malformed)),
    ).toBe(true);
    expect(
      Result.isFailure(
        decodePlaySessionContinuation(root, seed, {
          ...graph,
          root: graph.nodes.length,
        }),
      ),
    ).toBe(true);
  });
});
