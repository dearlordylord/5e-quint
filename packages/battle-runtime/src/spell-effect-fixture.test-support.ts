import { endTurn } from "./battle-execution-composition.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import {
  discoverBattleActs,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleProcedureExecutionRef,
  type AvailableBattleAct,
  type BattleActPresentation,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SpellInvocationRef,
} from "./index.ts";
import {
  findHole,
  requireResolved,
  spellInvocationRefsEqualForTest,
} from "./battle-runtime.test-support.ts";
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
  const act = requireActorAdmittedSpellActForTest({
    session: input.session,
    actorId: input.casterId,
    subjectTag: "actionSpell",
    invocationRef: expectedInvocation,
  });
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

type AdmittedSpellActSubject = Extract<
  BattleSubject,
  {
    readonly tag:
      | "actionSpell"
      | "bonusActionSpell"
      | "bonusActionDashSpell"
      | "spawnedCompanionTouchSpellProxy";
  }
>;
type AdmittedSpellActTag = AdmittedSpellActSubject["tag"];

type AdmittedSpellAct<TTag extends AdmittedSpellActTag> = AvailableBattleAct & {
  readonly subject: Extract<AdmittedSpellActSubject, { readonly tag: TTag }>;
  readonly presentation: Extract<
    BattleActPresentation,
    { readonly kind: "spell" }
  >;
};

export function requireActorAdmittedSpellActForTest<
  const TTag extends AdmittedSpellActTag,
>(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly subjectTag: TTag;
  readonly invocationRef: SpellInvocationRef;
}): AdmittedSpellAct<TTag> {
  const act = discoverBattleActs(input.session).find(
    (candidate): candidate is AdmittedSpellAct<TTag> =>
      candidate.subject.actorId === input.actorId &&
      candidate.subject.tag === input.subjectTag &&
      candidate.presentation.kind === "spell" &&
      spellInvocationRefsEqualForTest(
        candidate.presentation.invocation,
        input.invocationRef,
      ),
  );
  if (act === undefined) {
    throw new Error(
      `Expected actor ${input.actorId}'s admitted invocation ${JSON.stringify(input.invocationRef)}.`,
    );
  }
  return act;
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
