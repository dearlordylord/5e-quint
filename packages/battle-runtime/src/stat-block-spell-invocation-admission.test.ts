// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import { statBlockSpellInvocationAdmissionPlan } from "./stat-block-spell-invocation-admission-plan.ts";
import { statBlockSpellcastingGroupOrdinal } from "./identity.ts";
import { unitId } from "@dnd/shared/game-facts";
import { admitStatBlockSpellInvocations } from "./stat-block-spell-invocation-admission.ts";
import { PositiveInteger } from "@dnd/shared/types";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { restoreAuthoredStatBlockExecutionAdmission } from "./index.ts";
import { restoreStatBlockExecutionAdmission } from "./stat-block-execution.ts";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  admittedStatBlockSource,
  statBlockCreatureInit,
  statBlockRecord,
  unitLibrary,
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
    const presentation = started.success.context.statBlocks.get(casterId);
    expect(presentation?.spellPresentationSources).toHaveLength(1);
    expect(presentation?.spellPresentationSources[0]?.invocation.spell.id).toBe(
      "magic_missile",
    );

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
    )(JSON.parse(JSON.stringify(encoded)));
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded))
      throw new Error("Expected valid execution snapshot");
    const restoreInput = {
      state: started.success.state,
      actorId: casterId,
      statBlock: casterRecord(),
      unitCatalog: unitLibrary,
      snapshot: decoded.success,
    };
    expect(
      Result.isFailure(
        restoreStatBlockExecutionAdmission(
          started.success.state.battleId,
          casterId,
          admittedStatBlockSource(casterRecord()),
          decoded.success,
        ),
      ),
    ).toBe(true);
    const restored = restoreAuthoredStatBlockExecutionAdmission(restoreInput);
    expect(Result.isSuccess(restored)).toBe(true);
    if (Result.isSuccess(restored))
      expect(
        statBlockSpellProcedureInvocations(restored.success.execution),
      ).toEqual(invocations);
    const changedMechanics = Schema.decodeUnknownResult(
      StatBlockExecutionSnapshotSchema,
    )(
      Schema.encodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...decoded.success,
        procedureBindings: decoded.success.procedureBindings.map((binding) =>
          binding.procedure.kind !== "spellcasting"
            ? binding
            : {
                ...binding,
                procedure: {
                  ...binding.procedure,
                  groups: binding.procedure.groups.map((group) => ({
                    ...group,
                    invocations: group.invocations.map((candidate) =>
                      candidate.dispatch.kind !== "executable"
                        ? candidate
                        : {
                            ...candidate,
                            dispatch: {
                              ...candidate.dispatch,
                              executions: candidate.dispatch.executions.map(
                                (execution) => ({
                                  ...execution,
                                  spellRuleFacts: {
                                    ...execution.spellRuleFacts,
                                    components: {
                                      ...execution.spellRuleFacts.components,
                                      verbal:
                                        !execution.spellRuleFacts.components
                                          .verbal,
                                    },
                                  },
                                }),
                              ),
                            },
                          },
                    ),
                  })),
                },
              },
        ),
      }),
    );
    expect(Result.isSuccess(changedMechanics)).toBe(true);
    if (Result.isFailure(changedMechanics))
      throw new Error("Expected structurally valid altered mechanics");
    const changedRestore = restoreAuthoredStatBlockExecutionAdmission({
      ...restoreInput,
      snapshot: changedMechanics.success,
    });
    expect(Result.isFailure(changedRestore)).toBe(true);
    if (Result.isFailure(changedRestore))
      expect(changedRestore.failure).toMatchObject({
        reason: "procedureBindingsMismatch",
      });
    const missingDefinitionEntry = syntheticSpellcastingProcedureEntry({
      unrestrictedSpellId: "synthetic_missing_definition",
      restrictedSpellId: "cure_wounds",
    });
    const missingDefinitionRecord = {
      ...casterRecord(),
      statBlock: {
        ...casterRecord().statBlock,
        actions: [missingDefinitionEntry] as const,
      },
    };
    expect(
      Result.isFailure(
        restoreAuthoredStatBlockExecutionAdmission({
          ...restoreInput,
          statBlock: missingDefinitionRecord,
        }),
      ),
    ).toBe(true);
    expect(binding.procedure.groups[0].invocations[1]?.dispatch).toEqual({
      kind: "unsupported",
      reason: "unsupportedRestriction",
    });
    expect(binding.procedure.groups[1]?.invocations[0].dispatch).toEqual({
      kind: "unsupported",
      reason: "missingDefinition",
    });
  });
  it.each([
    ["ray_of_frost", "missingCasterAttackBonus"],
    ["hold_person", "missingCasterSaveDc"],
    ["magic_missile", "executable"],
  ] as const)(
    "reports exact absent caster facts for %s",
    (spellId, expected) => {
      const record = casterRecord();
      const entry = syntheticSpellcastingProcedureEntry({
        unrestrictedSpellId: spellId,
      });
      const {
        spellSaveDc: _dc,
        spellAttackBonus: _attack,
        ...procedure
      } = entry.procedure;
      const casterId = combatantId("synthetic-missing-caster-facts");
      const started = startBattle({
        battleId: battleId("missing-caster-facts"),
        combatants: [
          statBlockCreatureInit({
            combatantId: casterId,
            statBlock: {
              ...record,
              statBlock: {
                ...record.statBlock,
                actions: [{ ...entry, procedure }],
              },
            },
            initiative: 20,
          }),
        ],
      });
      expect(Result.isSuccess(started)).toBe(true);
      if (Result.isFailure(started)) throw new Error("Expected admitted actor");
      const actor = started.success.state.combatants.get(casterId);
      if (actor?.origin.kind !== "statBlock")
        throw new Error("Expected Stat Block actor");
      const binding = actor.origin.execution.procedureBindings.find(
        (candidate) => candidate.procedure.kind === "spellcasting",
      );
      if (binding?.procedure.kind !== "spellcasting")
        throw new Error("Expected spellcasting binding");
      const dispatch = binding.procedure.groups[0].invocations[0].dispatch;
      if (expected === "executable") expect(dispatch.kind).toBe("executable");
      else expect(dispatch).toEqual({ kind: "unsupported", reason: expected });
    },
  );
  it.each(["produce_flame", "hunters_mark"] as const)(
    "rejects %s without a Stat Block continuation owner",
    (spellId) => {
      const record = casterRecord();
      const entry = syntheticSpellcastingProcedureEntry({
        unrestrictedSpellId: spellId,
      });
      const casterId = combatantId("synthetic-missing-continuation");
      const started = startBattle({
        battleId: battleId("missing-continuation-owner"),
        combatants: [
          statBlockCreatureInit({
            combatantId: casterId,
            statBlock: {
              ...record,
              statBlock: { ...record.statBlock, actions: [entry] },
            },
            initiative: 20,
          }),
        ],
      });
      if (Result.isFailure(started))
        throw new Error("Expected admitted parent actor.");
      const actor = started.success.state.combatants.get(casterId);
      if (actor?.origin.kind !== "statBlock")
        throw new Error("Expected Stat Block actor.");
      const binding = actor.origin.execution.procedureBindings.find(
        (candidate) => candidate.procedure.kind === "spellcasting",
      );
      if (binding?.procedure.kind !== "spellcasting")
        throw new Error("Expected spellcasting binding.");
      expect(binding.procedure.groups[0].invocations[0].dispatch).toEqual({
        kind: "unsupported",
        reason: "missingChildProcedureOwner",
      });
    },
  );
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
    const admitted = admitStatBlockSpellInvocations(
      { ...actor, origin: actor.origin },
      started.success.state,
      [],
    );
    expect(admitted).toEqual(Result.fail("admissionPlanMismatch"));
    expect(actor.origin.execution).toBe(execution);
  });
});

function mutateEncodedSnapshot(
  encoded: unknown,
  mutate: (node: object) => void,
): unknown {
  const snapshot: unknown = JSON.parse(JSON.stringify(encoded));
  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null) return;
    mutate(value);
    for (const child of Object.values(value)) visit(child);
  };
  visit(snapshot);
  return snapshot;
}

it.each(["actionCost", "spellSaveDc", "spellAttackBonus"] as const)(
  "rejects a persisted child whose %s contradicts its owning procedure",
  (field) => {
    const casterId = combatantId("synthetic-header-corruption");
    const started = startBattle({
      battleId: battleId("header-corruption"),
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
    let changed = 0;
    const forged = mutateEncodedSnapshot(
      Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
        actor.origin.execution,
      ),
      (node) => {
        if (
          field === "actionCost" &&
          Reflect.get(node, field) === "magicAction" &&
          (Reflect.get(node, "tag") === "statBlock" ||
            Reflect.has(node, "spellRuleFacts"))
        ) {
          Reflect.set(node, field, "bonusAction");
          changed += 1;
        } else if (
          field !== "actionCost" &&
          Reflect.get(node, "tag") === "statBlock"
        ) {
          const value = Reflect.get(node, field);
          if (typeof value === "number") {
            Reflect.set(node, field, value + 1);
            changed += 1;
          }
        }
      },
    );
    expect(changed).toBe(field === "actionCost" ? 2 : 1);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(forged),
      ),
    ).toBe(true);
  },
);

it("rejects a limited child transplanted onto a sibling invocation's pool", () => {
  const record = casterRecord();
  const entry = record.statBlock.actions[0];
  const atWill = entry.procedure.groups[0];
  const limited = entry.procedure.groups[1];
  if (atWill?.kind !== "at_will" || limited?.kind !== "limited")
    throw new Error("Expected canonical groups");
  const casterId = combatantId("synthetic-pool-corruption");
  const started = startBattle({
    battleId: battleId("pool-corruption"),
    combatants: [
      statBlockCreatureInit({
        combatantId: casterId,
        statBlock: {
          ...record,
          statBlock: {
            ...record.statBlock,
            actions: [
              {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  groups: [
                    atWill,
                    {
                      ...limited,
                      spells: [
                        { spellId: unitId("magic_missile") },
                        { spellId: unitId("false_life") },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
        initiative: 20,
      }),
    ],
  });
  if (Result.isFailure(started)) throw new Error("Expected admitted caster");
  const actor = started.success.state.combatants.get(casterId);
  if (actor?.origin.kind !== "statBlock")
    throw new Error("Expected Stat Block actor");
  const resources = statBlockSpellProcedureInvocations(actor.origin.execution)
    .map((invocation) => invocation.resource)
    .filter((resource) => resource.tag === "statBlockLimited");
  const first = resources[0],
    sibling = resources[1];
  if (first === undefined || sibling === undefined)
    throw new Error("Expected two independently owned pools");
  expect(first.resourcePoolRef).not.toBe(sibling.resourcePoolRef);
  let changed = 0;
  const forged = mutateEncodedSnapshot(
    Schema.encodeSync(StatBlockExecutionSnapshotSchema)(actor.origin.execution),
    (node) => {
      if (
        Reflect.get(node, "tag") === "statBlockLimited" &&
        Reflect.get(node, "resourcePoolRef") === first.resourcePoolRef
      ) {
        Reflect.set(node, "resourcePoolRef", sibling.resourcePoolRef);
        changed += 1;
      }
    },
  );
  expect(changed).toBe(1);
  expect(
    Result.isFailure(
      Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(forged),
    ),
  ).toBe(true);
});

it.each(["coordinate", "continuation"] as const)(
  "rejects a catalog plan with a mismatched %s atomically",
  (mismatch) => {
    const record = casterRecord();
    const casterId = combatantId("synthetic-corrupted-plan");
    const started = startBattle({
      battleId: battleId("corrupted-plan"),
      combatants: [
        statBlockCreatureInit({
          combatantId: casterId,
          statBlock: record,
          initiative: 20,
        }),
      ],
    });
    if (Result.isFailure(started)) throw new Error("Expected admitted caster");
    const actor = started.success.state.combatants.get(casterId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const plan = statBlockSpellInvocationAdmissionPlan(record, unitLibrary);
    const restricted = plan.find(
      (candidate) =>
        candidate.definitionJoin.kind === "joined" &&
        candidate.definitionJoin.value.continuation.kind === "restricted",
    );
    if (restricted === undefined)
      throw new Error("Expected restricted authored alternative");
    const forged = plan.map((candidate, index) =>
      index !== 0
        ? candidate
        : mismatch === "coordinate"
          ? {
              ...candidate,
              groupOrdinal: statBlockSpellcastingGroupOrdinal(999),
            }
          : { ...candidate, definitionJoin: restricted.definitionJoin },
    );
    const before = actor.origin.execution;
    expect(
      admitStatBlockSpellInvocations(
        { ...actor, origin: actor.origin },
        started.success.state,
        forged,
      ),
    ).toEqual(Result.fail("admissionPlanMismatch"));
    expect(actor.origin.execution).toBe(before);
  },
);
