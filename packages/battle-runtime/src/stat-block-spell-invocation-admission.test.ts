import { statBlockCreatureWithAdmittedSpellInvocations } from "./stat-block-spell-invocation-admission.ts";
import { PositiveInteger } from "@dnd/shared/types";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { restoreStatBlockExecutionAdmission } from "./stat-block-execution.ts";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  admittedStatBlockSource,
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
    const encoded = Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
      actor.origin.execution,
    );
    const source = invocation.spellRuleFacts.castingSource;
    if (source.tag !== "statBlock")
      throw new Error("Expected Stat Block caster source");
    const wrongCoordinates: unknown = JSON.parse(
      JSON.stringify(encoded).replace(
        JSON.stringify(source.invocationRef),
        JSON.stringify({ ...source.invocationRef, groupOrdinal: 999 }),
      ),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(
          wrongCoordinates,
        ),
      ),
    ).toBe(true);
    const decoded = Schema.decodeUnknownResult(
      StatBlockExecutionSnapshotSchema,
    )(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded))
      throw new Error("Expected valid execution snapshot");
    const restored = restoreStatBlockExecutionAdmission(
      started.success.state.battleId,
      casterId,
      admittedStatBlockSource(casterRecord()),
      decoded.success,
    );
    expect(Result.isSuccess(restored)).toBe(true);
    if (Result.isSuccess(restored))
      expect(
        statBlockSpellProcedureInvocations(restored.success.execution),
      ).toEqual(invocations);
    expect(binding.procedure.groups[0].invocations[1]?.dispatch).toEqual({
      kind: "unsupported",
      reason: "unsupportedRestriction",
    });
    expect(binding.procedure.groups[1]?.invocations[0].dispatch).toEqual({
      kind: "unsupported",
      reason: "missingDefinition",
    });
  });
  it("rejects a mismatched transient plan before replacing actor execution", () => {
    const casterId = combatantId("synthetic-plan-mismatch");
    const started = startBattle({
      battleId: battleId("stat-block-plan-mismatch"),
      combatants: [
        statBlockCreatureInit({
          combatantId: casterId,
          statBlock: casterRecord(),
          initiative: 20,
        }),
      ],
    });
    if (Result.isFailure(started)) throw new Error("Expected admitted caster");
    const actor = started.success.state.combatants.get(casterId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const execution = actor.origin.execution;
    const admitted = statBlockCreatureWithAdmittedSpellInvocations(
      { ...actor, origin: actor.origin },
      started.success.state,
      [],
    );
    expect(admitted).toEqual(Result.fail("admissionPlanMismatch"));
    expect(actor.origin.execution).toBe(execution);
  });
});
