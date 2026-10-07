// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELLCASTING-LIMITED-GROUP-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spellcasting.limited-group
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_LIMITED_GROUP
import { describe, expect, test } from "vitest";
import { Result, Schema } from "effect";
import { PositiveInteger } from "@dnd/shared/types";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import {
  admittedStatBlockSource,
  battleId,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { battleExecutionScopeOrdinal, combatantId } from "./identity.ts";
import {
  statBlockExecutionAdmissionCohort,
  statBlockExecutionSnapshot,
  restoreStatBlockExecutionAdmission,
} from "./stat-block-execution.ts";
import {
  spendStatBlockSpellcastingPool,
  statBlockSpellcastingGroupPoolRefs,
} from "./stat-block-execution-state.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";

function executionFor(ownership: "each" | "shared") {
  const source = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  if (entry.procedure.kind !== "spellcasting")
    throw new Error("Expected synthetic spellcasting.");
  const record = {
    ...source,
    id: statBlockId("stat_block_synthetic_limited_caster"),
    name: "Synthetic Limited Caster",
    provenance: {
      kind: "synthetic-test" as const,
      section: "stat-block-spellcasting-limited-group.test.ts",
    },
    statBlock: {
      ...source.statBlock,
      actions: [
        {
          ...entry,
          resourceRefs: { kind: "none" as const },
          procedure: {
            ...entry.procedure,
            groups: [
              {
                kind: "limited" as const,
                resourceRefs: {
                  kind: "some" as const,
                  ordinals: [
                    Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(
                      1,
                    ),
                  ] as const,
                },
                spells: [
                  { spellId: unitId("synthetic_pool_spell_a") },
                  { spellId: unitId("synthetic_pool_spell_b") },
                ] as const,
              },
            ] as const,
          },
        },
      ] as const,
      resources: [
        {
          ordinal: Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(
            1,
          ),
          ownership,
          limit: { kind: "daily" as const, uses: PositiveInteger(1) },
        },
      ] as const,
    },
  };
  const sourceFacts = admittedStatBlockSource(record);
  const admission = statBlockExecutionAdmissionCohort(
    battleId("limited-group-test"),
    combatantId("synthetic-caster"),
    [sourceFacts],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) throw new Error("Expected admission.");
  const binding = admission.execution.procedureBindings.find(
    (binding) => binding.procedure.kind === "spellcasting",
  );
  if (binding?.procedure.kind !== "spellcasting")
    throw new Error("Expected spellcasting binding.");
  return { admission, sourceFacts, group: binding.procedure.groups[0] };
}

test("restoration preserves each ownership, depleted selected pool, and unselected availability", () => {
  const { admission, sourceFacts, group } = executionFor("each");
  if (group.kind !== "limited" || group.resourceOwnership !== "each")
    throw new Error("Expected each ownership.");
  const spent = spendStatBlockSpellcastingPool(
    admission.execution,
    group.invocations[0].resourcePoolRef,
  );
  if (Result.isFailure(spent)) throw new Error("Expected available resource.");
  const snapshot = statBlockExecutionSnapshot(spent.success);
  const restored = restoreStatBlockExecutionAdmission(
    battleId("limited-group-test"),
    combatantId("synthetic-caster"),
    sourceFacts,
    snapshot,
  );
  expect(Result.isSuccess(restored)).toBe(true);
  if (Result.isFailure(restored)) return;
  expect(statBlockExecutionSnapshot(restored.success.execution)).toEqual(
    snapshot,
  );
});

test("snapshot boundary rejects aliased each invocation pools", () => {
  const { admission, group } = executionFor("each");
  if (group.kind !== "limited" || group.resourceOwnership !== "each")
    throw new Error("Expected each ownership.");
  const snapshot = statBlockExecutionSnapshot(admission.execution);
  const malformed = {
    ...snapshot,
    procedureBindings: snapshot.procedureBindings.map((binding) =>
      binding.procedure.kind !== "spellcasting"
        ? binding
        : {
            ...binding,
            procedure: {
              ...binding.procedure,
              groups: binding.procedure.groups.map((candidate) =>
                candidate !== group
                  ? candidate
                  : {
                      ...group,
                      invocations: group.invocations.map((invocation) => ({
                        ...invocation,
                        resourcePoolRef: group.invocations[0].resourcePoolRef,
                      })),
                    },
              ),
            },
          },
    ),
  };
  expect(() =>
    Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)(malformed),
  ).toThrow();
});

describe("limited spellcasting pool ownership", () => {
  test("each invocation spends its own pool and rejected reuse leaves all pools unchanged", () => {
    const { admission, group } = executionFor("each");
    if (group.kind !== "limited" || group.resourceOwnership !== "each")
      throw new Error("Expected each ownership.");
    const [first, second] = group.invocations;
    if (second === undefined) throw new Error("Expected two alternatives.");
    expect(first.resourcePoolRef).not.toBe(second.resourcePoolRef);
    const spent = spendStatBlockSpellcastingPool(
      admission.execution,
      first.resourcePoolRef,
    );
    expect(Result.isSuccess(spent)).toBe(true);
    if (Result.isFailure(spent)) return;
    expect(
      spent.success.resourcePools.find(
        (pool) => pool.resourcePoolRef === second.resourcePoolRef,
      ),
    ).toEqual(
      admission.execution.resourcePools.find(
        (pool) => pool.resourcePoolRef === second.resourcePoolRef,
      ),
    );
    expect(
      Result.isFailure(
        spendStatBlockSpellcastingPool(spent.success, first.resourcePoolRef),
      ),
    ).toBe(true);
    expect(
      Result.isSuccess(
        spendStatBlockSpellcastingPool(spent.success, second.resourcePoolRef),
      ),
    ).toBe(true);
  });

  test("shared alternatives consume the single group pool once", () => {
    const { admission, group } = executionFor("shared");
    if (group.kind !== "limited" || group.resourceOwnership !== "shared")
      throw new Error("Expected shared ownership.");
    expect(statBlockSpellcastingGroupPoolRefs(group)).toEqual([
      group.resourcePoolRef,
    ]);
    const spent = spendStatBlockSpellcastingPool(
      admission.execution,
      group.resourcePoolRef,
    );
    if (Result.isFailure(spent)) throw new Error("Expected available pool.");
    expect(
      Result.isFailure(
        spendStatBlockSpellcastingPool(spent.success, group.resourcePoolRef),
      ),
    ).toBe(true);
    expect(spent.success.resourcePools).toHaveLength(
      admission.execution.resourcePools.length,
    );
  });
});
