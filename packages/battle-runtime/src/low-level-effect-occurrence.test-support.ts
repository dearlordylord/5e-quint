import { NonNegativeInteger } from "@dnd/shared/types";

import { battleStateWithAllocatedEffectOccurrencesForTest } from "./battle-runtime.test-support.ts";
import type { BattleActiveEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import {
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import type { BattleState } from "./index.ts";

/**
 * Allocates a source-owned procedure identity and one canonical effect
 * occurrence for tests that deliberately begin below procedure admission.
 *
 * The procedure identity is intentionally not bound to executable authored
 * content: callers must not cite this boundary as admitted execution history.
 */
export function battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly ownerId: CombatantId;
  readonly effect: (
    sourceProcedureRef: BattleProcedureExecutionRef,
  ) => BattleActiveEffectOccurrenceTemplate;
}): {
  readonly state: BattleState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
} {
  const source = input.state.combatants.get(input.sourceCombatantId);
  if (source === undefined || source.origin.kind !== "character") {
    throw new Error(
      `Expected low-level effect source ${input.sourceCombatantId} to be a character.`,
    );
  }
  const procedureOrdinal = Number(source.origin.execution.nextProcedureOrdinal);
  const sourceProcedureRef = battleProcedureExecutionRef(
    source.origin.execution.scopeRef,
    NonNegativeInteger(procedureOrdinal),
  );
  const stateWithAllocatedSourceProcedure = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.sourceCombatantId, {
      ...source,
      origin: {
        ...source.origin,
        execution: {
          ...source.origin.execution,
          nextProcedureOrdinal: battleProcedureExecutionCursor(
            procedureOrdinal + 1,
          ),
        },
      },
    }),
  };
  const effect = input.effect(sourceProcedureRef);
  if (
    !("sourceProcedureRef" in effect) ||
    effect.sourceProcedureRef !== sourceProcedureRef ||
    !("sourceCombatantId" in effect) ||
    effect.sourceCombatantId !== input.sourceCombatantId
  ) {
    throw new Error(
      "Low-level effect occurrence must retain its allocated source identity.",
    );
  }
  const allocation = battleStateWithAllocatedEffectOccurrencesForTest({
    state: stateWithAllocatedSourceProcedure,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: input.ownerId,
        effect,
      },
    ],
  });
  const occurrence = allocation.occurrences[0];
  if (occurrence === undefined || occurrence.kind !== "activeEffect") {
    throw new Error(
      "Expected one canonical low-level active-effect occurrence.",
    );
  }
  return {
    state: allocation.state,
    sourceProcedureRef,
    effectRef: occurrence.effect.effectRef,
  };
}
