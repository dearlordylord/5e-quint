import { Match, Option } from "effect";
import { isStatBlockSpellCastProcedureExecution } from "./stat-block-spell-invocation-dispatch.ts";
import type { BattleExecutableSpellInvocation } from "./battle-state-execution.ts";
import { statBlockSpellInvocationProcedureRef } from "./identity.ts";
import type {
  BattleResourcePoolExecutionRef,
  StatBlockSpellInvocationRef,
} from "./identity.ts";
import type {
  StatBlockExecutionState,
  StatBlockSpellcastingInvocationOutcome,
  StatBlockSpellcastingProcedure,
} from "./stat-block-execution-state.ts";

export type SelectedStatBlockSpellInvocationResource =
  | { readonly kind: "atWill" }
  | {
      readonly kind: "limited";
      readonly ownership: "each" | "shared";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };

export type SelectedStatBlockSpellInvocation = {
  readonly ref: StatBlockSpellInvocationRef;
  readonly procedure: StatBlockSpellcastingProcedure;
  readonly invocation: StatBlockSpellcastingInvocationOutcome;
  readonly resource: SelectedStatBlockSpellInvocationResource;
};

export type StatBlockSpellInvocationSelection =
  | {
      readonly kind: "selected";
      readonly value: SelectedStatBlockSpellInvocation;
    }
  | { readonly kind: "missingProcedure" }
  | { readonly kind: "procedureIsNotSpellcasting" }
  | { readonly kind: "missingGroup" }
  | { readonly kind: "missingInvocation" };

/** Resolve canonical coordinates against their owning procedure and group. */
export function selectStatBlockSpellInvocation(
  execution: StatBlockExecutionState,
  ref: StatBlockSpellInvocationRef,
): StatBlockSpellInvocationSelection {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === ref.procedureRef,
  );
  if (binding === undefined) return { kind: "missingProcedure" };
  if (binding.procedure.kind !== "spellcasting") {
    return { kind: "procedureIsNotSpellcasting" };
  }
  const procedure = binding.procedure;
  const group = procedure.groups.find(
    (candidate) => candidate.groupOrdinal === ref.groupOrdinal,
  );
  if (group === undefined) return { kind: "missingGroup" };
  return Match.value(group).pipe(
    Match.when(
      { kind: "at_will" },
      (narrowed): StatBlockSpellInvocationSelection => {
        const invocation = narrowed.invocations.find(
          (candidate) => candidate.invocationOrdinal === ref.invocationOrdinal,
        );
        return invocation === undefined
          ? { kind: "missingInvocation" }
          : {
              kind: "selected",
              value: {
                ref,
                procedure,
                invocation,
                resource: { kind: "atWill" },
              },
            };
      },
    ),
    Match.when(
      { kind: "limited", resourceOwnership: "each" },
      (narrowed): StatBlockSpellInvocationSelection => {
        const invocation = narrowed.invocations.find(
          (candidate) => candidate.invocationOrdinal === ref.invocationOrdinal,
        );
        return invocation === undefined
          ? { kind: "missingInvocation" }
          : {
              kind: "selected",
              value: {
                ref,
                procedure,
                invocation,
                resource: {
                  kind: "limited",
                  ownership: "each",
                  resourcePoolRef: invocation.resourcePoolRef,
                },
              },
            };
      },
    ),
    Match.when(
      { kind: "limited", resourceOwnership: "shared" },
      (narrowed): StatBlockSpellInvocationSelection => {
        const invocation = narrowed.invocations.find(
          (candidate) => candidate.invocationOrdinal === ref.invocationOrdinal,
        );
        return invocation === undefined
          ? { kind: "missingInvocation" }
          : {
              kind: "selected",
              value: {
                ref,
                procedure,
                invocation,
                resource: {
                  kind: "limited",
                  ownership: "shared",
                  resourcePoolRef: narrowed.resourcePoolRef,
                },
              },
            };
      },
    ),
    Match.exhaustive,
  );
}

export function statBlockSpellProcedureInvocations(
  execution: StatBlockExecutionState,
): readonly BattleExecutableSpellInvocation[] {
  return execution.procedureBindings.flatMap((binding) => {
    if (binding.procedure.kind !== "spellcasting") return [];
    return binding.procedure.groups.flatMap((group) =>
      group.invocations.flatMap((invocation) => {
        if (invocation.dispatch.kind !== "executable") return [];
        const ref = {
          procedureRef: binding.procedureRef,
          groupOrdinal: group.groupOrdinal,
          invocationOrdinal: invocation.invocationOrdinal,
        };
        return invocation.dispatch.executions.map((facts) => ({
          ...facts,
          sourceProcedureRef: statBlockSpellInvocationProcedureRef(
            ref,
            facts.procedure,
          ),
        }));
      }),
    );
  });
}

export function statBlockSpellProcedure(
  execution: StatBlockExecutionState,
  procedureRef: import("./identity.ts").BattleProcedureExecutionRef,
): BattleExecutableSpellInvocation | undefined {
  return statBlockSpellProcedureInvocations(execution).find(
    (invocation) => invocation.sourceProcedureRef === procedureRef,
  );
}

/** Persisted child facts must retain their owning invocation and pool. */
export function statBlockSpellDispatchBindingsAreValid(
  bindings: readonly import("./stat-block-execution-state.ts").StatBlockProcedureBindingSnapshot[],
): boolean {
  return bindings.every((binding) => {
    if (binding.procedure.kind !== "spellcasting") return true;
    const procedure = binding.procedure;
    return procedure.groups.every((group) =>
      group.invocations.every((invocation) => {
        if (invocation.dispatch.kind === "unsupported") return true;
        const expected = {
          procedureRef: binding.procedureRef,
          groupOrdinal: group.groupOrdinal,
          invocationOrdinal: invocation.invocationOrdinal,
        };
        const sameRef = (ref: StatBlockSpellInvocationRef) =>
          ref.procedureRef === expected.procedureRef &&
          ref.groupOrdinal === expected.groupOrdinal &&
          ref.invocationOrdinal === expected.invocationOrdinal;
        const procedures = invocation.dispatch.executions.map(
          (execution) => execution.procedure,
        );
        if (new Set(procedures).size !== procedures.length) return false;
        return (
          invocation.kind === "unrestricted" &&
          invocation.dispatch.executions.every((execution) => {
            if (
              !isStatBlockSpellCastProcedureExecution(execution) ||
              !sameRef(execution.access.invocationRef) ||
              !sameRef(execution.spellRuleFacts.castingSource.invocationRef)
            )
              return false;
            const source = execution.spellRuleFacts.castingSource;
            if (
              source.actionCost !==
                (procedure.section === "actions"
                  ? "magicAction"
                  : "bonusAction") ||
              Option.getOrUndefined(source.spellSaveDc) !==
                procedure.spellSaveDc ||
              Option.getOrUndefined(source.spellAttackBonus) !==
                procedure.spellAttackBonus
            )
              return false;
            if (group.kind === "at_will")
              return execution.resource.tag === "statBlockAtWill";
            const poolRef =
              group.resourceOwnership === "shared"
                ? group.resourcePoolRef
                : group.invocations.find(
                    (candidate) =>
                      candidate.invocationOrdinal ===
                      invocation.invocationOrdinal,
                  )?.resourcePoolRef;
            return (
              execution.resource.tag === "statBlockLimited" &&
              execution.resource.resourcePoolRef === poolRef
            );
          })
        );
      }),
    );
  });
}
