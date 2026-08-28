import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  requireResolved,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import type { BattleRuntimeSession, CombatantId } from "./index.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";

export function castRayOfEnfeeblementWithFailedSave(input: {
  readonly session: BattleRuntimeSession;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
}) {
  const targetBeforeCast = input.session.state.combatants.get(input.targetId);
  if (targetBeforeCast === undefined) {
    throw new Error("Expected the Ray of Enfeeblement target.");
  }
  const targetCursorBeforeCast = targetBeforeCast.nextEffectOrdinal;
  const act = spellAct({
    session: input.session,
    spellId: rayOfEnfeeblementUnitId,
    slotLevel: 2,
  });
  if (act.subject.actorId !== input.casterId) {
    throw new Error("Expected the selected Ray of Enfeeblement caster.");
  }
  const targetFill = spellTargetListFill(
    requireHole(act.initialHoles, "spellTargetList"),
    input.casterId,
    rayOfEnfeeblementUnitId,
    [input.targetId],
  );
  const needsSave = resolveBattleSubject({
    state: input.session.state,
    subject: act.subject,
    fills: [targetFill],
  });
  if (needsSave.tag !== "needsHoles") {
    throw new Error("Expected Ray of Enfeeblement Saving Throw selection.");
  }
  const saveFill = savingThrowOutcomeFill(
    requireResultHole(needsSave, "savingThrowOutcome"),
    [{ targetId: input.targetId, succeeded: false }],
  );
  const cast = requireResolved(
    resolveBattleSubject({
      state: needsSave.state,
      subject: needsSave.subject,
      fills: [targetFill, saveFill],
    }),
  );
  const targetAfterCast = cast.state.combatants.get(input.targetId);
  const casterAfterCast = cast.state.combatants.get(input.casterId);
  if (targetAfterCast === undefined || casterAfterCast === undefined) {
    throw new Error("Expected the resolved Ray of Enfeeblement combatants.");
  }
  const damagePenaltyEffect = targetAfterCast.activeEffects.find(
    (effect) =>
      effect.kind === "sourceDamageRollPenalty" &&
      effect.sourceProcedureRef === act.subject.procedureRef &&
      effect.sourceCombatantId === input.casterId,
  );
  const abilityPenaltyEffect = targetAfterCast.activeEffects.find(
    (effect) =>
      effect.kind === "abilityD20TestRollModeEndTurnSave" &&
      effect.sourceProcedureRef === act.subject.procedureRef &&
      effect.sourceCombatantId === input.casterId,
  );
  if (
    damagePenaltyEffect?.kind !== "sourceDamageRollPenalty" ||
    abilityPenaltyEffect?.kind !== "abilityD20TestRollModeEndTurnSave"
  ) {
    throw new Error("Expected the production Ray of Enfeeblement composite.");
  }
  if (
    Number(targetAfterCast.nextEffectOrdinal) !==
    Number(targetCursorBeforeCast) + 2
  ) {
    throw new Error(
      "Expected Ray of Enfeeblement to allocate both target effects.",
    );
  }
  if (
    casterAfterCast.concentration?.sourceProcedureRef !==
    act.subject.procedureRef
  ) {
    throw new Error("Expected Ray of Enfeeblement concentration.");
  }

  return {
    session: battleRuntimeSessionForTest({
      ...input.session,
      state: cast.state,
    }),
    procedureRef: act.subject.procedureRef,
    damagePenaltyEffect,
    abilityPenaltyEffect,
    targetCursorBeforeCast,
    targetCursorAfterCast: targetAfterCast.nextEffectOrdinal,
  };
}
