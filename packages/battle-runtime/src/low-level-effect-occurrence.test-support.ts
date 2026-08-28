import { NonNegativeInteger } from "@dnd/shared/types";

import { battleStateWithAllocatedEffectOccurrencesForTest } from "./battle-runtime.test-support.ts";
import { type EffectOccurrenceSourceKind } from "./effect-occurrence-source-vocabulary.ts";
import type { BattleSourcedEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import {
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  battleStatBlockProcedureExecutionRef,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  BattleStatBlockProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import type { BattleState } from "./index.ts";
import { admittedStatBlockExecutionState } from "./stat-block-execution-state.ts";

type SupportedLowLevelEffectOccurrenceTemplate = Extract<
  BattleSourcedEffectOccurrenceTemplate,
  { readonly kind: EffectOccurrenceSourceKind }
>;

export type LowLevelEffectOccurrenceTemplate =
  SupportedLowLevelEffectOccurrenceTemplate extends infer Effect
    ? Effect extends SupportedLowLevelEffectOccurrenceTemplate
      ? Omit<Effect, "sourceProcedureRef" | "sourceCombatantId">
      : never
    : never;

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
  readonly effect: LowLevelEffectOccurrenceTemplate;
}): {
  readonly state: BattleState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
} {
  const source = input.state.combatants.get(input.sourceCombatantId);
  if (source === undefined) {
    throw new Error(
      `Expected low-level effect source ${input.sourceCombatantId}.`,
    );
  }
  const procedureOrdinal =
    source.origin.kind === "character"
      ? Number(source.origin.execution.nextProcedureOrdinal)
      : source.origin.execution.procedureBindings.length;
  const sourceProcedureRef: BattleProcedureExecutionRef =
    source.origin.kind === "character"
      ? battleProcedureExecutionRef(
          source.origin.execution.scopeRef,
          NonNegativeInteger(procedureOrdinal),
        )
      : battleStatBlockProcedureExecutionRef(
          source.origin.execution.scopeRef,
          NonNegativeInteger(procedureOrdinal),
        );
  const stateWithAllocatedSourceProcedure: BattleState =
    source.origin.kind === "character"
      ? {
          ...input.state,
          combatants: new Map(input.state.combatants).set(
            input.sourceCombatantId,
            {
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
            },
          ),
        }
      : input.state;
  const effect: SupportedLowLevelEffectOccurrenceTemplate = {
    ...input.effect,
    sourceProcedureRef,
    sourceCombatantId: input.sourceCombatantId,
  };
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
  const allocatedSource = allocation.state.combatants.get(
    input.sourceCombatantId,
  );
  if (allocatedSource === undefined) {
    throw new Error("Expected allocated low-level effect source.");
  }
  const binding = {
    procedureRef: sourceProcedureRef,
    procedure: {
      kind: "effectOccurrenceSource" as const,
      effectRef: occurrence.effect.effectRef,
      effectKind: effect.kind,
    },
  };
  return {
    state: {
      ...allocation.state,
      combatants: new Map(allocation.state.combatants).set(
        input.sourceCombatantId,
        {
          ...allocatedSource,
          origin:
            allocatedSource.origin.kind === "character"
              ? {
                  ...allocatedSource.origin,
                  execution: {
                    ...allocatedSource.origin.execution,
                    procedureBindings: [
                      ...allocatedSource.origin.execution.procedureBindings,
                      binding,
                    ],
                  },
                }
              : {
                  ...allocatedSource.origin,
                  execution: admittedStatBlockExecutionState({
                    ...allocatedSource.origin.execution,
                    procedureBindings: [
                      ...allocatedSource.origin.execution.procedureBindings,
                      {
                        ...binding,
                        procedureRef:
                          BattleStatBlockProcedureExecutionRef.make(
                            sourceProcedureRef,
                          ),
                        resourcePoolRefs: [],
                      },
                    ],
                  }),
                },
        },
      ),
    },
    sourceProcedureRef,
    effectRef: occurrence.effect.effectRef,
  };
}
