import { describe, expect, test, vi } from "vitest";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import type {
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  targetFill,
} from "../battle-runtime.test-support.ts";
import {
  currentInterruptCheckpoint,
  snapshotBattle,
} from "./battle-snapshot.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import {
  InterruptLifecycleExecution,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./interrupt-lifecycle.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";

describe("interrupt lifecycle", () => {
  test("closes an admitted responder checkpoint before resuming its continuation", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const actorId = currentActorId(state);
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "saveFailed",
        targetId: actorId,
        continuation: {
          kind: "resolved",
          subject: { tag: "action", actorId, action: "dodge" },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected the readied-spell interrupt window to open.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    const decisionHole = opened.holes[0];
    if (frame === null || decisionHole.kind !== "interruptDecision") {
      throw new Error("Expected an admitted interrupt decision checkpoint.");
    }
    const responderId = decisionHole.eligibleResponders[0];
    if (responderId === undefined) {
      throw new Error("Expected an admitted interrupt responder.");
    }

    const continuationResumer = vi.fn(
      ({ state: resumedState }): BattleResolutionResult => ({
        tag: "resolved",
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const execution = InterruptLifecycleExecution.fromResolvers(() => {
      throw new Error("Declining must not execute an interrupt subject.");
    }, continuationResumer);

    const outcome = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill: {
        kind: "interruptDecision",
        holeId: decisionHole.holeId,
        value: { kind: "decline", responderId },
      },
      execution,
    });

    expect(outcome.tag).toBe("withInterruptRoute");
    expect(outcome.result.tag).toBe("resolved");
    if (outcome.result.tag === "invalid") {
      throw new Error("Expected the decline to close the checkpoint.");
    }
    expect(currentInterruptCheckpoint(outcome.result.state)).toBeNull();
    expect(continuationResumer).toHaveBeenCalledOnce();
    expect(continuationResumer).toHaveBeenCalledWith(
      expect.objectContaining({
        continuation: expect.objectContaining({ kind: "resolved" }),
        handledInterruptTrigger: "saveFailed",
      }),
    );
  });

  test("spends the Reaction and completes an admitted procedure through active re-entry", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const actorId = currentActorId(state);
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "saveFailed",
        targetId: actorId,
        continuation: {
          kind: "resolved",
          subject: { tag: "action", actorId, action: "dodge" },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected the readied-spell interrupt window to open.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    const decisionHole = opened.holes[0];
    const choice = frame?.choices[0];
    if (
      frame === null ||
      decisionHole.kind !== "interruptDecision" ||
      choice?.kind !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected an admitted readied-spell procedure choice.");
    }
    const [firstHole, ...remainingHoles] = choice.initialHoles;
    if (firstHole?.kind !== "targetChoice") {
      throw new Error("Expected the readied spell to require a target choice.");
    }
    const targetId = firstHole.choices[0];
    if (targetId === undefined) {
      throw new Error("Expected an admitted readied-spell target.");
    }
    const procedureFill = targetFill(firstHole, targetId);
    const continuationResumer = vi.fn(
      ({ state: resumedState }): BattleResolutionResult => ({
        tag: "resolved",
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const subjectResolver = vi.fn((admitted) => {
      return admitted.input.fills.length === 0
        ? {
            tag: "needsHoles" as const,
            state: admitted.input.state,
            subject: admitted.input.subject,
            holes: [firstHole, ...remainingHoles],
            snapshot: snapshotBattle(admitted.input.state),
          }
        : {
            tag: "resolved" as const,
            state: admitted.input.state,
            snapshot: snapshotBattle(admitted.input.state),
          };
    });
    const execution = InterruptLifecycleExecution.fromResolvers(
      subjectResolver,
      continuationResumer,
    );

    const fill = {
      kind: "interruptDecision" as const,
      holeId: decisionHole.holeId,
      value: {
        kind: "resolve" as const,
        responderId: choice.reactorId,
        choice: {
          kind: "releaseReadiedSpell" as const,
          readiedSpellCasterId: choice.readiedSpellCasterId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      },
    };
    const responder = opened.state.combatants.get(choice.reactorId);
    if (responder === undefined || responder.positiveHpUnconscious !== null) {
      throw new Error("Expected a conscious admitted interrupt responder.");
    }
    const ineligibleState: BattleState = {
      ...opened.state,
      combatants: new Map(opened.state.combatants).set(choice.reactorId, {
        ...responder,
        conditions: applyCondition(responder.conditions, "incapacitated"),
      }),
    };
    expect(
      resolveInterruptLifecycleDecision({
        state: ineligibleState,
        fill,
        execution,
      }),
    ).toMatchObject({
      tag: "withoutInterruptRoute",
      result: { tag: "invalid", reason: "staleSubject" },
    });

    const started = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill,
      execution,
    });

    expect(started).toMatchObject({
      tag: "withInterruptRoute",
      result: { tag: "needsHoles" },
    });
    if (started.result.tag !== "needsHoles") {
      throw new Error("Expected the active interrupt procedure to need holes.");
    }
    expect(
      started.result.state.combatants.get(choice.reactorId)?.reactionAvailable,
    ).toBe(false);
    expect(
      currentInterruptCheckpoint(started.result.state)?.activeInterrupt,
    ).toBeDefined();
    expect(
      resolveInterruptLifecycleDecision({
        state: started.result.state,
        fill,
        execution,
      }),
    ).toMatchObject({
      tag: "withoutInterruptRoute",
      result: { tag: "invalid", reason: "staleSubject" },
    });

    const admission = admitBattleResolutionInput({
      state: started.result.state,
      subject: choice.subject,
      fills: [procedureFill],
    });
    if (admission.tag === "staleCharacterProcedure") {
      throw new Error(
        "Expected the active interrupt subject to remain admitted.",
      );
    }
    const completed = resolveActiveInterruptProcedure({
      resolution: admission.input,
      execution,
    });

    expect(completed.tag).toBe("resolved");
    if (completed.tag === "invalid") {
      throw new Error("Expected active interrupt completion.");
    }
    expect(currentInterruptCheckpoint(completed.state)).toBeNull();
    expect(continuationResumer).toHaveBeenCalledOnce();
    expect(subjectResolver).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ fills: [procedureFill] }),
      }),
    );
  });
});
