// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import { Match, Result, Schema } from "effect";
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
  decodeStatBlockRecordSync,
  StatBlockGmSpeedChoiceSchema,
} from "@dnd/surface/surface/schema";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  statBlockConcentrationBattle,
  statBlockConcentrationCasterId,
  statBlockConcentrationCasterRecord,
} from "./stat-block-spell-concentration.test-support.ts";

it.each(["missingActor", "size", "speed", "resourceGraph"] as const)(
  "rejects source-backed restoration when the %s boundary cannot be re-admitted",
  (boundary) => {
    const session = statBlockConcentrationBattle();
    const actor = session.state.combatants.get(statBlockConcentrationCasterId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const snapshot = Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)(
      JSON.parse(
        JSON.stringify(
          Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
            actor.origin.execution,
          ),
        ),
      ),
    );
    const source = statBlockConcentrationCasterRecord();
    const record = Match.value(boundary).pipe(
      Match.when("missingActor", (): StatBlockRecord => source),
      Match.when("size", (): StatBlockRecord => {
        expect(actor.size).not.toBe("gargantuan");
        expect(actor.size).not.toBe("tiny");
        const statBlock = source.statBlock;
        if (statBlock.swarm !== undefined)
          throw new Error("Expected a non-Swarm restoration fixture.");
        return decodeStatBlockRecordSync({
          ...source,
          statBlock: {
            ...statBlock,
            size: { kind: "alternatives", options: ["tiny", "gargantuan"] },
          },
        });
      }),
      Match.when("speed", (): StatBlockRecord => {
        const speed = Schema.decodeUnknownSync(StatBlockGmSpeedChoiceSchema)({
          kind: "gm_choice",
          alternatives: [
            { kind: "climb", feet: { kind: "literal", value: 20 } },
            { kind: "fly", feet: { kind: "literal", value: 20 } },
          ],
        });
        return {
          ...source,
          statBlock: { ...source.statBlock, speeds: [speed] },
        };
      }),
      Match.when("resourceGraph", (): StatBlockRecord => {
        const group = syntheticSpellcastingProcedureEntry().procedure.groups[1];
        if (group?.kind !== "limited")
          throw new Error("Expected limited group");
        const resource = {
          ordinal: group.resourceRefs.ordinals[0],
          ownership: "each" as const,
          limit: { kind: "daily" as const, uses: PositiveInteger(1) },
        };
        return {
          ...source,
          statBlock: {
            ...source.statBlock,
            resources: [resource, resource],
          },
        };
      }),
      Match.exhaustive,
    );
    const restored = restoreAuthoredStatBlockExecutionAdmission({
      state: session.state,
      actorId:
        boundary === "missingActor"
          ? combatantId("synthetic-absent-restoration-actor")
          : statBlockConcentrationCasterId,
      statBlock: record,
      unitCatalog: unitLibrary,
      snapshot,
    });
    expect(Result.isFailure(restored)).toBe(true);
    if (Result.isSuccess(restored))
      throw new Error("Expected rejected restoration");
    if (boundary === "missingActor")
      expect(restored.failure).toBe("missingStatBlockActor");
    if (boundary === "size")
      expect(restored.failure).toMatchObject({
        reason: "invalidSizeSelection",
      });
    if (boundary === "speed")
      expect(restored.failure).toMatchObject({
        reason: "unresolvedGmSpeedChoice",
      });
    if (boundary === "resourceGraph")
      expect(restored.failure).toMatchObject({
        reason: "procedureBindingsMismatch",
      });
    expect(session.state.combatants.get(statBlockConcentrationCasterId)).toBe(
      actor,
    );
  },
);

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
