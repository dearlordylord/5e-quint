import { movementFeet } from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  battleResolutionHolesForTest,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  spellSlotInvocationRef,
} from "./battle-runtime.test-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  savingThrowOutcomeFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { resolveBattleConcentrationDamage } from "./battle-reducer/damage-apply.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { describe, expect, it } from "vitest";
import {
  resolveBattleSubject,
  resolveBattleInterrupt,
  endTurn,
} from "./index.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import {
  longCastingActorId,
  longCastingReactorId,
  longCastingBattle,
  resolved,
  castingAction,
  advance,
} from "./long-casting-lifecycle.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";

describe("long spellcasting through catalog admission and public battle execution", () => {
  it("spends ten Magic actions before effects, then completes without another action", () => {
    let state = longCastingBattle().state;
    for (let turn = 1; turn <= 10; turn += 1) {
      state = advance(state);
      expect(state.currentTurnResources.actionTakenThisTurn).toBe(true);
      expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(0);
      if (turn < 10)
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
    }
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({
      effectKind: "castingSpell",
      progress: { kind: "readyToComplete" },
    });
    const completion = discoverBattleActCandidates(state).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (completion === undefined)
      throw new Error("Expected final target/effect procedure.");
    const roll = requireHole(completion.initialHoles, "rolledDice");
    state = resolved(
      resolveBattleSubject({
        state,
        subject: completion.subject,
        fills: [damageRollFillWithGroups(roll, [[3, 4]])],
      }),
    );
    expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(11);
    expect(state.combatants.get(longCastingActorId)?.concentration).toBeNull();
  });

  it("rejects repeated progress atomically and fails after a skipped required Magic action", () => {
    let state = longCastingBattle().state;
    const first = castingAction(state);
    state = advance(state);
    const before = snapshotBattle(state);
    const repeated = resolveBattleSubject({
      state,
      subject: first.subject,
      fills: [],
    });
    expect(repeated.tag).toBe("invalid");
    expect(repeated.snapshot).toEqual(before);
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ progress: { remainingTurns: 9 } });
    state = resolved(endTurn({ state, actorId: longCastingActorId }));
    state = resolved(endTurn({ state, actorId: longCastingActorId }));
    expect(state.combatants.get(longCastingActorId)?.concentration).toBeNull();
    expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(0);
    expect(castingAction(state).subject).toMatchObject({
      command: "startSpellCasting",
    });
  });

  it("loses pending progress through voluntary concentration ending", () => {
    let state = advance(longCastingBattle().state);
    state = resolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: longCastingActorId,
          command: "endConcentration",
        },
        fills: [],
      }),
    );
    expect(state.combatants.get(longCastingActorId)?.concentration).toBeNull();
    expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(0);
    state = resolved(endTurn({ state, actorId: longCastingActorId }));
    expect(castingAction(state).subject).toMatchObject({
      command: "startSpellCasting",
    });
  });

  it("keeps progress on a successful damage save and drops it on failure", () => {
    const casting = advance(longCastingBattle().state);
    expect(
      resolveBattleConcentrationDamage({
        state: casting,
        combatantId: longCastingActorId,
        damageAmount: 1,
        savingThrowSucceeded: true,
      }),
    ).toBe(casting);
    const failed = resolveBattleConcentrationDamage({
      state: casting,
      combatantId: longCastingActorId,
      damageAmount: 1,
      savingThrowSucceeded: false,
    });
    expect(failed.combatants.get(longCastingActorId)?.concentration).toBeNull();
    expect(failed.combatants.get(longCastingActorId)?.tempHp).toBe(0);
    expect(
      casting.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ effectKind: "castingSpell" });
  });

  it.each(["each", "shared"] as const)(
    "pays one selected %s limited use only after successful completion",
    (ownership) => {
      let state = longCastingBattle({ ownership }).state;
      const actor = state.combatants.get(longCastingActorId);
      if (actor?.origin.kind !== "statBlock")
        throw new Error("Expected stat-block actor.");
      const initialPools = actor.origin.execution.resourcePools;
      for (let turn = 1; turn <= 10; turn += 1) {
        state = advance(state);
        const current = state.combatants.get(longCastingActorId);
        if (current?.origin.kind !== "statBlock")
          throw new Error("Expected stat-block actor.");
        expect(current.origin.execution.resourcePools).toEqual(initialPools);
        if (turn < 10)
          state = resolved(endTurn({ state, actorId: longCastingActorId }));
      }
      const completion = discoverBattleActCandidates(state).find(
        (act) => act.subject.tag === "actionSpell",
      );
      if (completion === undefined)
        throw new Error("Expected final effect procedure.");
      const rejected = resolveBattleSubject({
        state,
        subject: completion.subject,
        fills: [],
      });
      expect(rejected.tag).toBe("needsHoles");
      expect(
        state.combatants.get(longCastingActorId)?.concentration,
      ).toMatchObject({ progress: { kind: "readyToComplete" } });
      const hole = requireHole(completion.initialHoles, "rolledDice");
      state = resolved(
        resolveBattleSubject({
          state,
          subject: completion.subject,
          fills: [damageRollFillWithGroups(hole, [[3, 4]])],
        }),
      );
      const completed = state.combatants.get(longCastingActorId);
      if (completed?.origin.kind !== "statBlock")
        throw new Error("Expected stat-block actor.");
      const changed = completed.origin.execution.resourcePools.filter(
        (pool, index) =>
          JSON.stringify(pool) !== JSON.stringify(initialPools[index]),
      );
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({ kind: "daily", usesRemaining: 1 });
      expect(completed.tempHp).toBe(11);
      expect(completed.concentration).toBeNull();
    },
  );

  it.each(["start", "continue"] as const)(
    "Counterspell cancels %s without paying a limited use",
    (step) => {
      const session = longCastingBattle({
        ownership: "each",
        counterspell: true,
      });
      let state = session.state;
      const actor = state.combatants.get(longCastingActorId);
      if (actor?.origin.kind !== "statBlock")
        throw new Error("Expected stat-block actor.");
      const pools = actor.origin.execution.resourcePools;
      if (step === "continue") {
        const start = castingAction(state);
        state = resolved(
          resolveBattleSubject({
            state,
            subject: start.subject,
            fills: [
              {
                kind: "targetSpatialFacts",
                holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
                spatialFacts: [],
              },
            ],
          }),
        );
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
        state = resolved(endTurn({ state, actorId: longCastingReactorId }));
      }
      const act = castingAction(state);
      const interrupted = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "targetSpatialFacts",
            holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
            spatialFacts: [
              {
                kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
                reactorId: longCastingReactorId,
                casterId: longCastingActorId,
                sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                  battleRuntimeSessionForTest({
                    state,
                    context: session.context,
                  }),
                  longCastingReactorId,
                  spellSlotInvocationRef(
                    "counterspell",
                    3,
                    "spellCastInterruptionReaction",
                  ),
                ),
                rangeFeet: movementFeet(60),
              },
            ],
          },
        ],
      });
      if (interrupted.tag !== "needsHoles")
        throw new Error("Expected casting interruption checkpoint.");
      const choice = battleFrontierInterruptDecisionForState(
        interrupted.state,
      )?.choices.find(
        (candidate) =>
          candidate.kind === "nestedProcedure" &&
          candidate.subject.command === "castTriggeredReactionSpell" &&
          candidate.subject.reactorId === longCastingReactorId,
      );
      if (
        choice?.kind !== "nestedProcedure" ||
        choice.subject.command !== "castTriggeredReactionSpell"
      )
        throw new Error("Expected Counterspell reaction choice.");
      const save = requireHole(choice.initialHoles, "savingThrowOutcome");
      state = resolved(
        resolveBattleInterrupt({
          state: interrupted.state,
          fill: interruptDecisionFill(
            requireHole(
              battleResolutionHolesForTest(interrupted),
              "interruptDecision",
            ),
            {
              kind: "resolve",
              responderId: longCastingReactorId,
              choice: {
                kind: "castTriggeredReactionSpell",
                procedureRef: choice.subject.procedureRef,
                fills: [
                  savingThrowOutcomeFill(save, [
                    {
                      targetId: longCastingActorId,
                      succeeded: false,
                      withoutRoll: true,
                    },
                  ]),
                ],
              },
            },
          ),
        }),
      );
      const failed = state.combatants.get(longCastingActorId);
      if (failed?.origin.kind !== "statBlock")
        throw new Error("Expected stat-block actor.");
      expect(failed.origin.execution.resourcePools).toEqual(pools);
      expect(failed.concentration).toBeNull();
      expect(failed.tempHp).toBe(0);
      expect(state.currentTurnResources.actionTakenThisTurn).toBe(true);
    },
  );

  it("retains casting concentration for a long concentration-duration spell and transitions on completion", () => {
    let state = longCastingBattle({
      ownership: "each",
      baseSpellId: "shield_of_faith",
    }).state;
    for (let turn = 1; turn <= 10; turn += 1) {
      state = advance(state);
      expect(
        state.combatants.get(longCastingActorId)?.concentration,
      ).toMatchObject({ effectKind: "castingSpell" });
      expect(state.combatants.get(longCastingActorId)?.activeEffects).toEqual(
        [],
      );
      if (turn < 10)
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
    }
    const completion = discoverBattleActCandidates(state).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (completion === undefined)
      throw new Error("Expected concentration spell completion.");
    const target = requireHole(completion.initialHoles, "targetChoice");
    state = resolved(
      resolveBattleSubject({
        state,
        subject: completion.subject,
        fills: [
          spellTargetFill(
            target,
            "synthetic_slow_vitality",
            longCastingActorId,
            longCastingActorId,
          ),
        ],
      }),
    );
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ effectKind: "spellEffect" });
    expect(state.combatants.get(longCastingActorId)?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellArmorClassBonus" }),
      ]),
    );
  });

  it("opens the last Magic-action checkpoint once and suppresses a duplicate final-target checkpoint", () => {
    const session = longCastingBattle({
      ownership: "each",
      counterspell: true,
    });
    let state = session.state;
    const sourceProcedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      longCastingReactorId,
      spellSlotInvocationRef(
        "counterspell",
        3,
        "spellCastInterruptionReaction",
      ),
    );
    const reactionFill = {
      kind: "targetSpatialFacts" as const,
      holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spatialFacts: [
        {
          kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" as const,
          reactorId: longCastingReactorId,
          casterId: longCastingActorId,
          sourceProcedureRef,
          rangeFeet: movementFeet(60),
        },
      ],
    };
    for (let turn = 1; turn <= 10; turn += 1) {
      const act = castingAction(state);
      const outcome = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          turn === 10 ? reactionFill : { ...reactionFill, spatialFacts: [] },
        ],
      });
      if (turn < 10) {
        state = resolved(outcome);
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
        state = resolved(endTurn({ state, actorId: longCastingReactorId }));
      } else {
        if (outcome.tag !== "needsHoles")
          throw new Error("Expected final Magic-action casting checkpoint.");
        expect(
          outcome.state.combatants.get(longCastingActorId)?.concentration,
        ).toMatchObject({
          effectKind: "castingSpell",
          progress: { kind: "readyToComplete" },
        });
        state = resolved(
          resolveBattleInterrupt({
            state: outcome.state,
            fill: interruptDecisionFill(
              requireHole(
                battleResolutionHolesForTest(outcome),
                "interruptDecision",
              ),
              { kind: "decline", responderId: longCastingReactorId },
            ),
          }),
        );
      }
    }
    const completion = discoverBattleActCandidates(state).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (completion === undefined)
      throw new Error("Expected final target/effect act.");
    const roll = requireHole(completion.initialHoles, "rolledDice");
    state = resolved(
      resolveBattleSubject({
        state,
        subject: completion.subject,
        fills: [damageRollFillWithGroups(roll, [[3, 4]]), reactionFill],
      }),
    );
    expect(state.interruptStack).toEqual([]);
    expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(11);
    expect(state.combatants.get(longCastingReactorId)?.reactionAvailable).toBe(
      true,
    );
  });

  it("replaces prior spell-effect concentration at the start of a fixed-duration long cast, before its reaction checkpoint", () => {
    const session = longCastingBattle({
      ownership: "each",
      counterspell: true,
      immediateConcentrationSibling: true,
    });
    let state = session.state;
    const immediate = discoverBattleActCandidates(state).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (immediate === undefined)
      throw new Error("Expected synthetic immediate concentration sibling.");
    const target = requireHole(immediate.initialHoles, "targetChoice");
    state = resolved(
      resolveBattleSubject({
        state,
        subject: immediate.subject,
        fills: [
          spellTargetFill(
            target,
            "synthetic_slow_vitality_sibling",
            longCastingActorId,
            longCastingActorId,
          ),
          {
            kind: "targetSpatialFacts",
            holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
            spatialFacts: [],
          },
        ],
      }),
    );
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ effectKind: "spellEffect" });
    state = resolved(endTurn({ state, actorId: longCastingActorId }));
    state = resolved(endTurn({ state, actorId: longCastingReactorId }));
    const prior = state.combatants.get(longCastingActorId);
    if (prior?.origin.kind !== "statBlock")
      throw new Error("Expected stat-block actor.");
    const pools = prior.origin.execution.resourcePools;
    const start = castingAction(state);
    const interrupted = resolveBattleSubject({
      state,
      subject: start.subject,
      fills: [
        {
          kind: "targetSpatialFacts",
          holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
          spatialFacts: [
            {
              kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
              reactorId: longCastingReactorId,
              casterId: longCastingActorId,
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                session,
                longCastingReactorId,
                spellSlotInvocationRef(
                  "counterspell",
                  3,
                  "spellCastInterruptionReaction",
                ),
              ),
              rangeFeet: movementFeet(60),
            },
          ],
        },
      ],
    });
    if (interrupted.tag !== "needsHoles")
      throw new Error("Expected long casting start checkpoint.");
    const declaring = interrupted.state.combatants.get(longCastingActorId);
    if (declaring?.origin.kind !== "statBlock")
      throw new Error("Expected stat-block actor.");
    expect(declaring.concentration).toMatchObject({
      effectKind: "castingSpell",
      progress: { remainingTurns: 9 },
    });
    expect(declaring.activeEffects).toEqual([]);
    expect(declaring.origin.execution.resourcePools).toEqual(pools);
    expect(declaring.tempHp).toBe(0);
  });

  it("uses Magic actions for long casting in the Bonus Actions Spellcasting section", () => {
    let state = longCastingBattle({ bonusSection: true }).state;
    for (let turn = 1; turn <= 10; turn += 1) {
      state = advance(state);
      expect(state.currentTurnResources.actionTakenThisTurn).toBe(true);
      expect(state.currentTurnResources.currentHasBonusAction).toBe(true);
      if (turn < 10)
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
    }
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ progress: { kind: "readyToComplete" } });
    const completion = discoverBattleActCandidates(state).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (completion === undefined) throw new Error("Expected Magic completion");
    const roll = requireHole(completion.initialHoles, "rolledDice");
    state = resolved(
      resolveBattleSubject({
        state,
        subject: completion.subject,
        fills: [damageRollFillWithGroups(roll, [[3, 4]])],
      }),
    );
    expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(11);
    expect(state.currentTurnResources.currentHasBonusAction).toBe(true);
    expect(state.combatants.get(longCastingActorId)?.concentration).toBeNull();
  });

  it("retains hour metadata and requires all 600 actual battle turns", () => {
    let state = longCastingBattle({
      time: { kind: "hours", amount: 1, ritual: false },
    }).state;
    for (let turn = 1; turn <= 600; turn += 1) {
      state = advance(state);
      expect(state.combatants.get(longCastingActorId)?.tempHp).toBe(0);
      if (turn < 600)
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
    }
    expect(
      state.combatants.get(longCastingActorId)?.concentration,
    ).toMatchObject({ progress: { kind: "readyToComplete" } });
  });
});
