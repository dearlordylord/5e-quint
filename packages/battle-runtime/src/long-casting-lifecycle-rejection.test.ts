// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import {
  battleAreaId,
  statBlockSpellInvocationProcedureRef,
} from "./identity.ts";
import { battleStateWithAllocatedEffectForTest } from "./battle-effect-occurrence-allocation.test-support.ts";
import {
  longCastingBattle,
  longCastingActorId,
  resolved,
  advance,
} from "./long-casting-lifecycle.test-support.ts";
import { endTurn } from "./index.ts";
import { resolveLongCastingCommand } from "./battle-reducer/long-casting-lifecycle.ts";
import { discoverLongCastingSpellActs } from "./battle-reducer/long-casting-discovery.ts";
import { supportedSpellActs } from "./battle-reducer/supported-spell-acts.ts";
import { spendSpellCastAction } from "./battle-reducer/spellcasting-action-cost.ts";
import { spendStatBlockSpellcastingPool } from "./stat-block-execution-state.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";

type CastingInput = Parameters<typeof resolveLongCastingCommand>[0];
function fixture(options: Parameters<typeof longCastingBattle>[0] = {}) {
  const state = longCastingBattle(options).state;
  const actor = state.combatants.get(longCastingActorId);
  if (actor === undefined || actor.positiveHpUnconscious !== null)
    throw new Error("Expected initialized conscious caster.");
  const invocation = supportedSpellActs(state, actor)[0];
  if (
    invocation === undefined ||
    invocation.spellRuleFacts.castingSource.tag !== "statBlock"
  )
    throw new Error("Expected admitted Stat Block child procedure.");
  const input: CastingInput = {
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: longCastingActorId,
      command: "startSpellCasting",
      procedureRef: invocation.sourceProcedureRef,
      invocationRef: invocation.spellRuleFacts.castingSource.invocationRef,
    },
    fills: [],
  };
  return { state, actor, invocation, input };
}
function expectAtomicRejection(input: CastingInput, expectedMessage: string) {
  const snapshot = snapshotBattle(input.state);
  const outcome = resolveLongCastingCommand(input);
  expect(outcome).toMatchObject({ tag: "invalid", message: expectedMessage });
  expect(outcome.snapshot).toEqual(snapshot);
}
const unrelatedFacts: BattleFill = {
  kind: "targetSpatialFacts",
  holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
  spatialFacts: [
    {
      kind: "grappleTargetWithinReach",
      grapplerId: longCastingActorId,
      targetId: longCastingActorId,
    },
  ],
};

describe("admitted long-casting command rejection boundaries", () => {
  it("rejects a caster who became incapacitated after discovery", () => {
    const { state, actor, input } = fixture();
    const changed: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(longCastingActorId, {
        ...actor,
        conditions: applyCondition(actor.conditions, "incapacitated"),
      }),
    };
    expectAtomicRejection(
      { ...input, state: changed },
      "The caster cannot take the required Magic action.",
    );
  });
  it("rejects an actor outside their turn", () => {
    const { state, input } = fixture({ counterspell: true });
    const changed = resolved(endTurn({ state, actorId: longCastingActorId }));
    expectAtomicRejection(
      { ...input, state: changed },
      "The caster cannot take the required Magic action.",
    );
  });
  it("rejects an invocation whose child procedure is no longer admitted", () => {
    const { input } = fixture();
    expectAtomicRejection(
      {
        ...input,
        subject: {
          ...input.subject,
          procedureRef: statBlockSpellInvocationProcedureRef(
            input.subject.invocationRef,
            "damageReduction",
          ),
        },
      },
      "The selected long spell invocation is unavailable.",
    );
  });
  it("rejects a selected limited invocation after its pool becomes exhausted", () => {
    const { state, actor, invocation, input } = fixture({ ownership: "each" });
    if (
      actor.origin.kind !== "statBlock" ||
      invocation.resource.tag !== "statBlockLimited"
    )
      throw new Error("Expected limited Stat Block resource owner.");
    const first = spendStatBlockSpellcastingPool(
      actor.origin.execution,
      invocation.resource.resourcePoolRef,
    );
    if (Result.isFailure(first)) throw new Error(first.failure);
    const second = spendStatBlockSpellcastingPool(
      first.success,
      invocation.resource.resourcePoolRef,
    );
    if (Result.isFailure(second)) throw new Error(second.failure);
    const changed: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(longCastingActorId, {
        ...actor,
        origin: { ...actor.origin, execution: second.success },
      }),
    };
    expectAtomicRejection(
      { ...input, state: changed },
      "The selected long spell invocation is unavailable.",
    );
    expect(changed.combatants.get(longCastingActorId)?.tempHp).toBe(0);
  });
  it("rejects casting inside a canonical allocated magic-suppression area", () => {
    const { state, input } = fixture();
    const changed = battleStateWithAllocatedEffectForTest({
      state,
      ownerId: longCastingActorId,
      effect: {
        kind: "magicSuppressionEmanation",
        sourceCombatantId: longCastingActorId,
        sourceProcedureRef: input.subject.procedureRef,
        areaId: battleAreaId("synthetic-casting-suppression"),
        auraMembership: {
          kind: "magicSuppressionEmanationMembership",
          originIncluded: true,
          nonOriginCombatantIds: [],
        },
        suppressedOngoingSpellEffects: [],
        expiresAt: {
          kind: "concentration",
          combatantId: longCastingActorId,
          durationTicks: elapsedTimeTicks(600),
        },
      },
    });
    expectAtomicRejection(
      { ...input, state: changed },
      "Magic suppression prevents casting this spell.",
    );
  });
  it("rejects multiple fills and unrelated spatial facts without spending", () => {
    const { input } = fixture();
    expectAtomicRejection(
      {
        ...input,
        fills: [unrelatedFacts, unrelatedFacts],
      },
      "Casting progress accepts only one spell-cast Reaction facts fill.",
    );
    expectAtomicRejection(
      { ...input, fills: [unrelatedFacts] },
      "Casting progress accepts only spell-cast Reaction facts.",
    );
  });
  it("requests counterspell facts before starting or paying", () => {
    const { input } = fixture({ counterspell: true, ownership: "each" });
    const outcome = resolveLongCastingCommand(input);
    expect(outcome.tag).toBe("needsHoles");
    if (outcome.tag !== "needsHoles")
      throw new Error("Expected Reaction facts frontier.");
    expect(outcome.state).toBe(input.state);
    expect(outcome.snapshot).toEqual(snapshotBattle(input.state));
    expect(
      input.state.combatants.get(longCastingActorId)?.concentration,
    ).toBeNull();
  });
  it("rejects an immediate invocation submitted to the long-casting command", () => {
    const { input } = fixture({ time: { kind: "action" } });
    expectAtomicRejection(
      input,
      "The selected spell does not require multiple turns of casting.",
    );
  });
  it("rejects continuation without an existing pending cast", () => {
    const { input } = fixture();
    expectAtomicRejection(
      {
        ...input,
        subject: { ...input.subject, command: "continueSpellCasting" },
      },
      "Casting cannot advance twice on one turn or after a missed Magic action.",
    );
  });
  it("rejects an unavailable Magic action and omits its discovery candidate", () => {
    const { state, input, invocation } = fixture();
    const spent = spendSpellCastAction(
      state.currentTurnResources,
      "magicAction",
    );
    if (Result.isFailure(spent)) throw new Error(spent.failure);
    const changed = { ...state, currentTurnResources: spent.success };
    expectAtomicRejection(
      { ...input, state: changed },
      "Magic action is no longer available for the current actor.",
    );
    expect(
      discoverLongCastingSpellActs({
        state: changed,
        actorId: longCastingActorId,
        invocation,
      }),
    ).toEqual([]);
  });
  it("does not offer another progress step in the same round even with a Magic action available", () => {
    const { state, invocation } = fixture();
    const started = advance(state);
    const anotherAction = {
      ...started,
      currentTurnResources: state.currentTurnResources,
    };
    expect(
      discoverLongCastingSpellActs({
        state: anotherAction,
        actorId: longCastingActorId,
        invocation,
      }),
    ).toEqual([]);
  });
});
