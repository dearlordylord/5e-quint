// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import { Result, Schema } from "effect";
import { expect, it } from "vitest";
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { restoreAuthoredStatBlockExecutionAdmission } from "./index.ts";
import {
  startBattle,
  battleId,
  combatantId,
  initiativeScore,
} from "./index.ts";
import { srdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import {
  statBlockConcentrationBattle,
  statBlockConcentrationCasterId,
  statBlockConcentrationCasterRecord,
} from "./stat-block-spell-concentration.test-support.ts";

it.each(["medium", "small"] as const)(
  "restores the published Priest's admitted %s size selection",
  (size) => {
    const record = srdStatBlockCatalog
      .listStatBlocks()
      .find((candidate) => candidate.id === "stat_block_priest");
    if (record === undefined) throw new Error("Expected published Priest");
    const actorId = combatantId("published-selected-size-restoration");
    const started = startBattle({
      battleId: battleId("published-selected-size-restoration"),
      combatants: [
        {
          combatantId: actorId,
          statBlock: record,
          unitCatalog: unitLibrary,
          size,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          conditions: [],
        },
      ],
    });
    if (Result.isFailure(started))
      throw new Error("Expected admitted published Priest");
    const actor = started.success.state.combatants.get(actorId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    expect(actor.size).toBe(size);
    const snapshot = Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)(
      JSON.parse(
        JSON.stringify(
          Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
            actor.origin.execution,
          ),
        ),
      ),
    );
    const restored = restoreAuthoredStatBlockExecutionAdmission({
      state: started.success.state,
      actorId,
      statBlock: record,
      unitCatalog: unitLibrary,
      snapshot,
    });
    expect(Result.isSuccess(restored)).toBe(true);
    if (Result.isSuccess(restored))
      expect(restored.success.execution).toEqual(actor.origin.execution);
  },
);

it("rejects a schema-valid higher cast level absent from the authored invocation", () => {
  const session = statBlockConcentrationBattle();
  const actor = session.state.combatants.get(statBlockConcentrationCasterId);
  if (actor?.origin.kind !== "statBlock")
    throw new Error("Expected Stat Block caster");
  const encoded = Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
    actor.origin.execution,
  );
  const original = Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)(
    JSON.parse(JSON.stringify(encoded)),
  );
  const altered = {
    ...original,
    procedureBindings: original.procedureBindings.map((binding) =>
      binding.procedure.kind !== "spellcasting"
        ? binding
        : {
            ...binding,
            procedure: {
              ...binding.procedure,
              groups: binding.procedure.groups.map((group) => ({
                ...group,
                invocations: group.invocations.map((invocation) =>
                  invocation.dispatch.kind !== "executable"
                    ? invocation
                    : {
                        ...invocation,
                        dispatch: {
                          ...invocation.dispatch,
                          executions: invocation.dispatch.executions.map(
                            (execution) => ({
                              ...execution,
                              resource: { ...execution.resource, castLevel: 3 },
                            }),
                          ),
                        },
                      },
                ),
              })),
            },
          },
    ),
  };
  const decoded = Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(
    JSON.parse(
      JSON.stringify(
        Schema.encodeUnknownSync(StatBlockExecutionSnapshotSchema)(altered),
      ),
    ),
  );
  expect(Result.isSuccess(decoded)).toBe(true);
  if (Result.isFailure(decoded))
    throw new Error("Expected schema-valid altered cast level");
  const restored = restoreAuthoredStatBlockExecutionAdmission({
    state: session.state,
    actorId: statBlockConcentrationCasterId,
    statBlock: statBlockConcentrationCasterRecord(),
    unitCatalog: unitLibrary,
    snapshot: decoded.success,
  });
  expect(Result.isFailure(restored)).toBe(true);
  if (Result.isFailure(restored))
    expect(restored.failure).toMatchObject({
      reason: "procedureBindingsMismatch",
    });
});
