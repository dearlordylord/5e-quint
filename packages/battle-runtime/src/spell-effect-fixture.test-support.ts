import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { endTurn } from "./battle-execution-composition.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import {
  discoverBattleActs,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleProcedureExecutionRef,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { findHole, requireResolved } from "./battle-runtime.test-support.ts";
import { knownWillingSpellTargetFill } from "./unit-profile-admission-spell-fill.test-support.ts";

export function castFlyAndAdvanceToCasterTurnForTest(input: {
  readonly session: BattleRuntimeSession;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
}): {
  readonly state: BattleState;
  readonly procedureRef: BattleProcedureExecutionRef;
} {
  const expectedInvocation = spellSlotInvocationRef("fly", 3, "scalarBuff");
  const act = discoverBattleActs(input.session).find((candidate) => {
    const invocation = battleActSpellPresentation(candidate)?.invocation;
    return (
      candidate.subject.actorId === input.casterId &&
      candidate.subject.tag === "actionSpell" &&
      invocation?.tag === "spellSlot" &&
      invocation.spellId === expectedInvocation.spellId &&
      invocation.procedure === expectedInvocation.procedure &&
      invocation.slotLevel === 3
    );
  });
  if (act?.subject.tag !== "actionSpell") {
    throw new Error("Expected the caster's admitted level-3 Fly procedure.");
  }
  const target = findHole(act.initialHoles, "targetChoice");
  const cast = requireResolved(
    resolveBattleSubject({
      state: input.session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          "fly",
          input.casterId,
          input.targetId,
        ),
      ],
    }),
  );
  return {
    state: advanceToActorNextTurnForTest(cast.state, input.casterId),
    procedureRef: act.subject.procedureRef,
  };
}

export function advanceToActorNextTurnForTest(
  initialState: BattleState,
  actorId: CombatantId,
): BattleState {
  let state = initialState;
  let turnsAdvanced = 0;
  do {
    const turn = requireResolved(
      endTurn({ state, actorId: currentActorId(state) }),
    );
    state = turn.state;
    turnsAdvanced += 1;
    if (turnsAdvanced > state.combatants.size) {
      throw new Error(`Expected initiative to return to actor ${actorId}.`);
    }
  } while (currentActorId(state) !== actorId);
  return state;
}
