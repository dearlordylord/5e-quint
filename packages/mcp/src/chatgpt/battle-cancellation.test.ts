import { describe, expect, it } from "vitest";
import { Result, Schema } from "effect";
import {
  BattleActionCancelledOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { jsonContentPayload } from "../tool-content.ts";
import {
  battleId,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  fighterAttackSubject,
  attackInitialTargetHole,
  targetFill,
  goblinId,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { handleToolCall } from "../server.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";
import { chatGptBattleGuidance } from "./battle-guidance.ts";

function selectedAttack() {
  const root = createMcpPlaySessionRoot();
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-action-cancellation"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
    true,
  );
  const subject = fighterAttackSubject(session.state);
  CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject });
  return { root, session, subject };
}

function cancellationArguments(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
) {
  const selection = root.sessionStore.getPendingBattleSelection();
  if (selection === null) throw new Error("Expected a pending selection.");
  return { expectedSelectionId: selection.selectionId };
}

describe("Battle action selection cancellation", () => {
  it("rejects a delayed cancellation after the same action is selected again", () => {
    const { root, subject } = selectedAttack();
    const guidance = chatGptBattleGuidance(root);
    if (
      guidance.kind !== "ordinaryContinuation" ||
      guidance.cancellation.kind !== "available"
    )
      throw new Error("Expected cancellable selection.");
    const cancellation = guidance.cancellation.arguments;
    const cancelled = handleToolCall(
      root,
      "cancel_battle_action",
      cancellation,
    );
    expect("isError" in cancelled && cancelled.isError).not.toBe(true);
    CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject });
    const retained = root.sessionStore.getPendingBattleTransaction();
    const delayed = handleToolCall(root, "cancel_battle_action", cancellation);
    expect("isError" in delayed && delayed.isError).toBe(true);
    expect(JSON.stringify(delayed)).toContain("staleSelection");
    expect(root.sessionStore.getPendingBattleTransaction()).toBe(retained);
  });
  it("requires an active Battle and refuses a stale session owner", () => {
    expect(
      JSON.stringify(
        handleToolCall(createMcpPlaySessionRoot(), "cancel_battle_action", {
          expectedSelectionId: "battle-action-selection:1",
        }),
      ),
    ).toContain("NO_ACTIVE_BATTLE");
    const { root } = selectedAttack();
    const other = selectedAttack();
    const before = root.sessionStore.snapshot();
    const stale = root.sessionStore.cancelPendingBattleAction(
      other.session,
      root.sessionStore.getPendingBattleTransaction(),
      cancellationArguments(root).expectedSelectionId,
    );
    expect(Result.isFailure(stale)).toBe(true);
    if (Result.isFailure(stale))
      expect(stale.failure.tag).toBe("battleStateSessionChanged");
    expect(root.sessionStore.snapshot()).toEqual(before);
  });

  it("cancels an unanswered selection without changing the checkpoint or turn", () => {
    const { root, session } = selectedAttack();
    expect(chatGptBattleGuidance(root)).toMatchObject({
      kind: "ordinaryContinuation",
      cancellation: { kind: "available", tool: "cancel_battle_action" },
    });
    const read = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      jsonContentPayload(handleToolCall(root, "read_battle_state", {})),
    );
    if (read.envelope === null || read.actionCancellation.kind !== "available")
      throw new Error(
        "Expected returned cancellation arguments on the regular surface.",
      );
    const cancellation = read.actionCancellation.arguments;
    expect(cancellation).toEqual(cancellationArguments(root));
    const result = handleToolCall(root, "cancel_battle_action", cancellation);
    expect("isError" in result && result.isError).not.toBe(true);
    expect(
      Schema.decodeUnknownSync(BattleActionCancelledOutputSchema)(
        jsonContentPayload(result),
      ),
    ).toEqual({
      tag: "battleActionCancelled",
      cancelledSelectionId: cancellation.expectedSelectionId,
      next: { tool: "read_battle_state" },
    });
    expect(root.sessionStore.battleSession).toBe(session);
    expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
    expect(chatGptBattleGuidance(root).kind).toBe("acts");
    const repeated = handleToolCall(root, "cancel_battle_action", cancellation);
    expect("isError" in repeated && repeated.isError).toBe(true);
  });

  it("keeps an unanswered selection cancellable after a rejected fill", () => {
    const { root, session } = selectedAttack();
    const cancellation = cancellationArguments(root);
    const before = root.sessionStore.snapshot();
    const rejected = CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
      fill: {
        kind: "targetChoice",
        holeId: "synthetic-stale-hole",
        value: goblinId,
      },
    });
    expect("isError" in rejected && rejected.isError).toBe(true);
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(cancellationArguments(root)).toEqual(cancellation);
    const cancelled = handleToolCall(
      root,
      "cancel_battle_action",
      cancellation,
    );
    expect("isError" in cancelled && cancelled.isError).not.toBe(true);
    expect(root.sessionStore.battleSession).toBe(session);
  });

  it("preserves accepted input and refuses to cancel an answered action", () => {
    const { root, session, subject } = selectedAttack();
    const cancellation = cancellationArguments(root);
    const unansweredTransaction =
      root.sessionStore.getPendingBattleTransaction();
    const fill = targetFill(
      attackInitialTargetHole(session.state, subject),
      goblinId,
    );
    CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, { fill });
    const transaction = root.sessionStore.getPendingBattleTransaction();
    const before = root.sessionStore.snapshot();
    const stale = root.sessionStore.cancelPendingBattleAction(
      session,
      unansweredTransaction,
      cancellation.expectedSelectionId,
    );
    expect(Result.isFailure(stale)).toBe(true);
    if (Result.isFailure(stale))
      expect(stale.failure.tag).toBe("battleStateSessionChanged");
    expect(cancellationArguments(root)).toEqual(cancellation);
    const result = handleToolCall(root, "cancel_battle_action", cancellation);
    expect(JSON.stringify(result)).toContain("acceptedInput");
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(root.sessionStore.getPendingBattleTransaction()).toBe(transaction);
  });
});
