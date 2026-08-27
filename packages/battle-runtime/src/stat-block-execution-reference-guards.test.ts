import { describe, expect, test } from "vitest";

import {
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
} from "./identity.ts";
import {
  statBlockExecutionAdmissionCohort,
  statBlockMultiattackBindings,
  statBlockMultiattackResourcesAvailable,
  statBlockProcedureBinding,
  statBlockProcedureResourcesAvailable,
  spendStatBlockMultiattackActivationResources,
  spendStatBlockProcedureResources,
  type StatBlockExecutionState,
} from "./stat-block-execution.ts";
import {
  admittedStatBlockSource,
  monsterMultiattackStatBlock,
} from "./battle-runtime.test-support.ts";

const referenceGuardBattleId = battleId(
  "battle-stat-block-execution-reference-guards",
);

function admittedExecution(actorName: string): StatBlockExecutionState {
  const [admission] = statBlockExecutionAdmissionCohort(
    referenceGuardBattleId,
    combatantId(actorName),
    [admittedStatBlockSource(monsterMultiattackStatBlock())],
    battleExecutionScopeOrdinal(0),
  ).admissions;
  if (admission === undefined) {
    throw new Error("Expected a Multiattack Stat Block admission.");
  }
  return admission.execution;
}

function attackProcedureRef(execution: StatBlockExecutionState) {
  const binding = execution.procedureBindings.find(
    ({ procedure }) => procedure.kind === "attack",
  );
  if (binding === undefined) {
    throw new Error("Expected an admitted attack procedure.");
  }
  return binding.procedureRef;
}

function multiattackBinding(execution: StatBlockExecutionState) {
  const binding = statBlockMultiattackBindings(execution)[0];
  if (binding === undefined) {
    throw new Error("Expected an admitted Multiattack procedure.");
  }
  return binding;
}

describe("Stat Block execution stale references", () => {
  test("reports unavailable and preserves execution for a stale procedure reference", () => {
    const currentExecution = admittedExecution("stat-block-reference-current");
    const staleExecution = admittedExecution("stat-block-reference-stale");
    const staleProcedureRef = attackProcedureRef(staleExecution);

    expect(
      statBlockProcedureBinding(currentExecution, staleProcedureRef),
    ).toBeUndefined();
    expect(
      statBlockProcedureResourcesAvailable(currentExecution, staleProcedureRef),
    ).toBe(false);
    expect(
      spendStatBlockProcedureResources(currentExecution, staleProcedureRef),
    ).toBe(currentExecution);
  });

  test("rejects a stale Multiattack dispatch reference and preserves activation state", () => {
    const currentExecution = admittedExecution("multiattack-reference-current");
    const staleExecution = admittedExecution("multiattack-reference-stale");
    const binding = multiattackBinding(currentExecution);
    const staleDispatchProcedureRef = attackProcedureRef(staleExecution);

    expect(
      statBlockProcedureBinding(currentExecution, staleDispatchProcedureRef),
    ).toBeUndefined();
    expect(
      statBlockMultiattackResourcesAvailable(currentExecution, binding, [
        staleDispatchProcedureRef,
      ]),
    ).toBe(false);
    expect(
      spendStatBlockMultiattackActivationResources(
        currentExecution,
        binding,
        staleDispatchProcedureRef,
      ),
    ).toBe(currentExecution);
  });
});
