import { PositiveInteger } from "@dnd/shared/types";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  admittedStatBlockSource,
  battleId,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import {
  battleExecutionScopeOrdinal,
  combatantId,
  statBlockSpellcastingGroupOrdinal,
  statBlockSpellcastingInvocationOrdinal,
  type StatBlockSpellInvocationRef,
} from "./identity.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { selectStatBlockSpellInvocation } from "./stat-block-spell-invocation-selection.ts";

function selectionFixture(ownership: "each" | "shared") {
  const base = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  const source = admittedStatBlockSource({
    ...base,
    statBlock: {
      ...base.statBlock,
      actions: [entry],
      resources: [
        {
          ordinal: Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(
            1,
          ),
          ownership,
          limit: { kind: "daily", uses: PositiveInteger(2) },
        },
      ],
    },
  });
  const admission = statBlockExecutionAdmissionCohort(
    battleId("invocation-selection"),
    combatantId("synthetic-caster"),
    [source],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) throw new Error("Expected admitted fixture");
  const binding = admission.execution.procedureBindings.find(
    (candidate) => candidate.procedure.kind === "spellcasting",
  );
  if (binding?.procedure.kind !== "spellcasting")
    throw new Error("Expected spellcasting procedure");
  const ref: StatBlockSpellInvocationRef = {
    procedureRef: binding.procedureRef,
    groupOrdinal: statBlockSpellcastingGroupOrdinal(0),
    invocationOrdinal: statBlockSpellcastingInvocationOrdinal(0),
  };
  return { execution: admission.execution, procedure: binding.procedure, ref };
}

describe("canonical Stat Block spell invocation selection", () => {
  it("selects an at-will invocation without a resource pool", () => {
    const { execution, ref } = selectionFixture("each");
    const result = selectStatBlockSpellInvocation(execution, ref);
    expect(result.kind).toBe("selected");
    if (result.kind !== "selected")
      throw new Error("Expected selected invocation");
    expect(result.value.resource).toEqual({ kind: "atWill" });
    expect(result.value.invocation.kind).toBe("unrestricted");
  });

  it.each(["each", "shared"] as const)(
    "retains %s group pool ownership",
    (ownership) => {
      const { execution, ref, procedure } = selectionFixture(ownership);
      const group = procedure.groups[1];
      if (group?.kind !== "limited") throw new Error("Expected limited group");
      const result = selectStatBlockSpellInvocation(execution, {
        ...ref,
        groupOrdinal: group.groupOrdinal,
      });
      expect(result.kind).toBe("selected");
      if (result.kind !== "selected")
        throw new Error("Expected selected invocation");
      expect(result.value.resource).toEqual({
        kind: "limited",
        ownership,
        resourcePoolRef:
          group.resourceOwnership === "each"
            ? group.invocations[0].resourcePoolRef
            : group.resourcePoolRef,
      });
    },
  );

  it("keeps restricted invocations distinct for child admission", () => {
    const { execution, ref } = selectionFixture("each");
    const result = selectStatBlockSpellInvocation(execution, {
      ...ref,
      invocationOrdinal: statBlockSpellcastingInvocationOrdinal(1),
    });
    expect(result.kind === "selected" && result.value.invocation.kind).toBe(
      "restricted",
    );
  });

  it("returns precise missing group and invocation outcomes", () => {
    const { execution, ref } = selectionFixture("each");
    expect(
      selectStatBlockSpellInvocation(execution, {
        ...ref,
        groupOrdinal: statBlockSpellcastingGroupOrdinal(99),
      }),
    ).toEqual({ kind: "missingGroup" });
    expect(
      selectStatBlockSpellInvocation(execution, {
        ...ref,
        invocationOrdinal: statBlockSpellcastingInvocationOrdinal(99),
      }),
    ).toEqual({ kind: "missingInvocation" });
  });
});
