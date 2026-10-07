import { Match } from "effect";
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
