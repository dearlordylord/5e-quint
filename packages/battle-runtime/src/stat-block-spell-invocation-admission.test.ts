import { PositiveInteger } from "@dnd/shared/types";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import {
  combatantId,
  battleProcedureExecutionRefBelongsToCombatant,
  battleProcedureExecutionRefBelongsToScope,
} from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import {
  statBlockSpellProcedureInvocations,
  statBlockSpellProcedure,
} from "./stat-block-spell-invocation-selection.ts";

function casterRecord() {
  const record = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry({
    unrestrictedSpellId: "magic_missile",
    restrictedSpellId: "cure_wounds",
  });
  return {
    ...record,
    statBlock: {
      ...record.statBlock,
      actions: [entry] as const,
      resources: [
        {
          ordinal: Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(
            1,
          ),
          ownership: "each" as const,
          limit: { kind: "daily" as const, uses: PositiveInteger(2) },
        },
      ] as const,
    },
  };
}

describe("Stat Block invocation production admission", () => {
  it("consumes the caller catalog once and retains only executable mechanical facts", () => {
    const casterId = combatantId("synthetic-spellcaster");
    const started = startBattle({
      battleId: battleId("stat-block-invocation-admission"),
      combatants: [
        statBlockCreatureInit({
          combatantId: casterId,
          statBlock: casterRecord(),
          initiative: 20,
        }),
      ],
    });
    expect(Result.isSuccess(started)).toBe(true);
    if (Result.isFailure(started)) throw new Error("Expected admitted caster");
    const actor = started.success.state.combatants.get(casterId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const invocations = statBlockSpellProcedureInvocations(
      actor.origin.execution,
    );
    expect(invocations).toHaveLength(1);
    const invocation = invocations[0];
    if (invocation === undefined)
      throw new Error("Expected executable invocation");
    expect(invocation.access.tag).toBe("statBlockLeveled");
    expect(invocation.resource).toEqual({
      tag: "statBlockAtWill",
      castLevel: 1,
    });
    expect(invocation.spellRuleFacts.castingSource.tag).toBe("statBlock");
    expect(JSON.stringify(invocation)).not.toContain("magic_missile");
    expect(JSON.stringify(actor.origin)).not.toContain(
      "spellInvocationAdmissionPlan",
    );
    expect(
      battleProcedureExecutionRefBelongsToCombatant(
        invocation.sourceProcedureRef,
        casterId,
      ),
    ).toBe(true);
    expect(
      battleProcedureExecutionRefBelongsToScope(
        invocation.sourceProcedureRef,
        actor.origin.execution.scopeRef,
      ),
    ).toBe(true);
    expect(
      statBlockSpellProcedure(
        actor.origin.execution,
        invocation.sourceProcedureRef,
      ),
    ).toEqual(invocation);
    const binding = actor.origin.execution.procedureBindings.find(
      (candidate) => candidate.procedure.kind === "spellcasting",
    );
    if (binding?.procedure.kind !== "spellcasting")
      throw new Error("Expected spellcasting binding");
    expect(binding.procedure.groups[0].invocations[1]?.dispatch).toEqual({
      kind: "unsupported",
      reason: "unsupportedRestriction",
    });
    expect(binding.procedure.groups[1]?.invocations[0].dispatch).toEqual({
      kind: "unsupported",
      reason: "missingDefinition",
    });
  });
});
