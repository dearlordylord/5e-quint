import { movementFeet } from "@dnd/shared/types";
import { expect, it } from "vitest";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { creatureSpellProcedure } from "./creature-spell-procedure.ts";
import { resolveBattleSubject, resolveBattleInterrupt } from "./index.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  battleResolutionHolesForTest,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  spellSlotInvocationRef,
} from "./battle-runtime.test-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellTargetFill,
  damageTypeChoiceFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  longCastingBattle,
  longCastingActorId,
  longCastingReactorId,
  resolved,
} from "./long-casting-lifecycle.test-support.ts";

it.each(["each", "shared"] as const)(
  "Counterspell wastes the Stat Block Bonus Action and charges its selected %s limited use",
  (ownership) => {
    const session = longCastingBattle({
      time: { kind: "action" },
      ownership,
      bonusSection: true,
      counterspell: true,
      baseSpellId: "resistance",
    });
    const state = session.state;
    const actor = state.combatants.get(longCastingActorId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const pools = actor.origin.execution.resourcePools;
    const act = discoverBattleActCandidates(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" ||
        candidate.subject.tag === "bonusActionSpell",
    );
    if (act === undefined) throw new Error("Expected selected spell cast");
    if (act.subject.tag !== "bonusActionSpell")
      throw new Error("Expected Bonus Action cast");
    const invocation = creatureSpellProcedure(actor, act.subject.procedureRef);
    if (invocation?.resource.tag !== "statBlockLimited")
      throw new Error("Expected selected limited resource");
    const selectedPoolRef = invocation.resource.resourcePoolRef;
    const interrupted = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          "synthetic_slow_vitality",
          longCastingActorId,
          longCastingActorId,
        ),
        damageTypeChoiceFill(
          requireHole(act.initialHoles, "damageTypeChoice"),
          "fire",
        ),
        {
          kind: "targetSpatialFacts",
          holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
          spatialFacts: [
            {
              kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
              reactorId: longCastingReactorId,
              casterId: longCastingActorId,
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                battleRuntimeSessionForTest(session),
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
    expect(
      interrupted.tag,
      interrupted.tag === "invalid" ? interrupted.message : interrupted.tag,
    ).toBe("needsHoles");
    if (interrupted.tag !== "needsHoles")
      throw new Error("Expected interrupt checkpoint");
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
      throw new Error("Expected Counterspell choice");
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const failed = resolved(
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
    const failedActor = failed.combatants.get(longCastingActorId);
    if (failedActor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    expect(failed.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(failed.currentTurnResources.actionTakenThisTurn).toBe(false);
    // RAW monsters.md Limited Usage counts using the stat-block part;
    // spells.md Counterspell exempts Spell Slots, not limited-use quotas.
    expect(failedActor.origin.execution.resourcePools).toEqual(
      pools.map((pool) =>
        pool.resourcePoolRef === selectedPoolRef && pool.kind === "daily"
          ? { ...pool, usesRemaining: Number(pool.usesRemaining) - 1 }
          : pool,
      ),
    );
    expect(failedActor.tempHp).toBe(0);
  },
);
