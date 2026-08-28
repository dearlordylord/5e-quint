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
  type SpellInvocationRef,
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
  const act = requireActorAdmittedSpellActForTest({
    session: input.session,
    actorId: input.casterId,
    invocationRef: expectedInvocation,
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

export function requireActorAdmittedSpellActForTest(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly invocationRef: SpellInvocationRef;
}) {
  const act = discoverBattleActs(input.session).find((candidate) => {
    if (
      candidate.subject.actorId !== input.actorId ||
      !("procedureRef" in candidate.subject)
    ) {
      return false;
    }
    const invocation = battleActSpellPresentation(candidate)?.invocation;
    return (
      invocation !== undefined &&
      sameSpellInvocationRef(invocation, input.invocationRef)
    );
  });
  if (act === undefined) {
    throw new Error(
      `Expected actor ${input.actorId}'s admitted invocation ${JSON.stringify(input.invocationRef)}.`,
    );
  }
  return act;
}

function sameSpellInvocationRef(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (
    left.tag !== right.tag ||
    left.spellId !== right.spellId ||
    left.procedure !== right.procedure
  ) {
    return false;
  }
  if (left.tag === "cantrip" && right.tag === "cantrip") {
    return sameSpellInvocationSourceRef(left.source, right.source);
  }
  if (left.tag === "spellEffect" && right.tag === "spellEffect") {
    return left.sourceCombatantId === right.sourceCombatantId;
  }
  if (
    left.tag === "spellAccessFreeCast" &&
    right.tag === "spellAccessFreeCast"
  ) {
    return (
      sameSpellInvocationSourceRef(left.source, right.source) &&
      left.resourcePoolRef === right.resourcePoolRef
    );
  }
  if (left.tag === "armorOfShadows" && right.tag === "armorOfShadows") {
    return true;
  }
  return left.tag === "spellSlot" && right.tag === "spellSlot"
    ? sameSpellInvocationSourceRef(left.source, right.source) &&
        left.slotLevel === right.slotLevel
    : false;
}

function sameSpellInvocationSourceRef(
  left: Extract<SpellInvocationRef, { readonly tag: "cantrip" }>["source"],
  right: Extract<SpellInvocationRef, { readonly tag: "cantrip" }>["source"],
): boolean {
  if (left.tag !== right.tag) return false;
  return left.tag === "classSpellcasting" && right.tag === "classSpellcasting"
    ? true
    : left.tag === "spellAccess" && right.tag === "spellAccess"
      ? left.spellAccessRef === right.spellAccessRef
      : false;
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
