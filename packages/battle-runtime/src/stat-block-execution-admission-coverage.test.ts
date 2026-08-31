import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";

import { battleId, combatantId } from "./index.ts";
import {
  authoredProcedureOrdinal,
  monsterMultiattackStatBlock,
  monsterResourceStatBlock,
  projectedStatBlockRuntimeSource,
} from "./battle-runtime.test-support.ts";
import { admitStatBlockResourceGraph } from "./stat-block-execution-state.ts";
import {
  admitBattleStatBlockCombatantSource,
  battleStatBlockCombatantSource,
} from "./stat-block-combatant-admission.ts";
import { battleExecutionScopeOrdinal } from "./identity.ts";
import { Schema } from "effect";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";

type RuntimeSource = ReturnType<typeof projectedStatBlockRuntimeSource>;
type RuntimeProcedure = RuntimeSource["procedures"][number];
type RuntimeMultiattackProcedure = Extract<
  RuntimeProcedure,
  { readonly kind: "multiattack" }
>;
type RuntimeDispatch = RuntimeMultiattackProcedure["dispatches"][number];

function executionFor(source: RuntimeSource, id: string) {
  const actorId = combatantId(`stat-block-execution-${id}`);
  const admitted = battleStatBlockCombatantSource(source);
  if (Result.isFailure(admitted)) {
    throw new Error(
      `Expected Stat Block source admission: ${JSON.stringify(admitted.failure)}`,
    );
  }
  const combatant = admitBattleStatBlockCombatantSource({
    battleId: battleId(`stat-block-execution-${id}`),
    combatantId: actorId,
    source: admitted.success,
    startingScopeOrdinal: battleExecutionScopeOrdinal(0),
  });
  if (Result.isFailure(combatant)) {
    throw new Error(
      `Expected Stat Block direct admission: ${JSON.stringify(combatant.failure)}`,
    );
  }
  return combatant.success.origin.execution;
}

function multiattackProcedure(
  source: RuntimeSource,
): RuntimeMultiattackProcedure {
  const procedure = source.procedures.find(
    (candidate): candidate is RuntimeMultiattackProcedure =>
      candidate.kind === "multiattack",
  );
  if (procedure === undefined) {
    throw new Error("Expected the synthetic Multiattack fixture.");
  }
  return procedure;
}

function withMultiattackDispatches(
  source: RuntimeSource,
  dispatches: RuntimeMultiattackProcedure["dispatches"],
): RuntimeSource {
  const multiattack = multiattackProcedure(source);
  return {
    ...source,
    procedures: source.procedures.map((procedure) =>
      procedure === multiattack ? { ...procedure, dispatches } : procedure,
    ),
  };
}

function dispatches(
  first: RuntimeDispatch,
  ...remaining: RuntimeDispatch[]
): RuntimeMultiattackProcedure["dispatches"] {
  return [first, ...remaining];
}

function withoutLegendaryActionUses(source: RuntimeSource): RuntimeSource {
  const { legendaryActionUses: _omitted, ...sourceWithoutUses } = source;
  return sourceWithoutUses;
}

function multiattackBindings(execution: ReturnType<typeof executionFor>) {
  return execution.procedureBindings.filter(
    (binding) => binding.procedure.kind === "multiattack",
  );
}

describe("Stat Block execution admission branch coverage", () => {
  test("accumulates duplicate declarations and distinct missing references", () => {
    const source = projectedStatBlockRuntimeSource(monsterResourceStatBlock());
    const resources = source.resources;
    const [firstResource, secondResource] = resources;
    const firstProcedure = source.procedures[0];
    if (
      firstResource === undefined ||
      secondResource === undefined ||
      firstProcedure === undefined ||
      firstProcedure.kind === "spellcasting"
    ) {
      throw new Error("Expected the resource-backed Stat Block graph.");
    }
    const missingThree = Schema.decodeUnknownSync(
      StatBlockProcedureResourceOrdinalSchema,
    )(3);
    const missingFour = Schema.decodeUnknownSync(
      StatBlockProcedureResourceOrdinalSchema,
    )(4);

    const admitted = admitStatBlockResourceGraph({
      ...source,
      resources: [
        firstResource,
        firstResource,
        firstResource,
        secondResource,
        secondResource,
        secondResource,
      ],
      procedures: [
        {
          ...firstProcedure,
          resourceRefs: [
            firstResource.ordinal,
            missingThree,
            missingThree,
            missingFour,
          ],
        },
        ...source.procedures.slice(1),
      ],
    });

    expect(admitted).toEqual(
      Result.fail([
        { kind: "duplicateResourceOrdinal", ordinal: firstResource.ordinal },
        {
          kind: "duplicateResourceOrdinal",
          ordinal: secondResource.ordinal,
        },
        { kind: "missingResourceDeclaration", ordinal: missingThree },
        { kind: "missingResourceDeclaration", ordinal: missingFour },
      ]),
    );
  });

  test("omits Legendary Action procedures when their optional uses are absent", () => {
    const source = projectedStatBlockRuntimeSource(monsterResourceStatBlock());
    expect(source.legendaryActionUses).toBeDefined();
    expect(
      source.procedures.some(
        (procedure) =>
          procedure.kind === "attack" &&
          procedure.section === "legendaryActions",
      ),
    ).toBe(true);

    const execution = executionFor(
      withoutLegendaryActionUses(source),
      "omitted-legendary-action-uses",
    );

    expect(
      execution.procedureBindings.filter(
        (binding) =>
          binding.procedure.kind === "attack" &&
          binding.procedure.section === "legendaryActions",
      ),
    ).toEqual([]);
    expect(
      execution.resourcePools.filter(
        (resourcePool) => resourcePool.kind === "legendaryActions",
      ),
    ).toEqual([]);
  });

  test("omits a Multiattack with an unknown first dispatch ordinal", () => {
    const source = projectedStatBlockRuntimeSource(
      monsterMultiattackStatBlock(),
    );
    const multiattack = multiattackProcedure(source);
    const firstDispatch = multiattack.dispatches[0];
    if (firstDispatch === undefined) {
      throw new Error("Expected the first Multiattack dispatch.");
    }

    const execution = executionFor(
      withMultiattackDispatches(
        source,
        dispatches({
          ...firstDispatch,
          procedureOrdinal: authoredProcedureOrdinal(999),
        }),
      ),
      "unknown-first-multiattack-ordinal",
    );

    expect(multiattackBindings(execution)).toEqual([]);
  });

  test("omits a Multiattack with an unknown later dispatch ordinal", () => {
    const source = projectedStatBlockRuntimeSource(
      monsterMultiattackStatBlock(),
    );
    const multiattack = multiattackProcedure(source);
    const [firstDispatch, secondDispatch] = multiattack.dispatches;
    if (firstDispatch === undefined || secondDispatch === undefined) {
      throw new Error("Expected both synthetic Multiattack dispatches.");
    }

    const execution = executionFor(
      withMultiattackDispatches(
        source,
        dispatches(firstDispatch, {
          ...secondDispatch,
          procedureOrdinal: authoredProcedureOrdinal(999),
        }),
      ),
      "unknown-later-multiattack-ordinal",
    );

    expect(multiattackBindings(execution)).toEqual([]);
  });

  test("preserves absent optional spellcasting metadata through execution admission", () => {
    const base = monsterResourceStatBlock();
    const actions = base.statBlock.actions;
    if (actions === undefined) {
      throw new Error("Expected the resource-backed Stat Block actions.");
    }
    const spellcasting = syntheticSpellcastingProcedureEntry();
    if (spellcasting.procedure.kind !== "spellcasting") {
      throw new Error("Expected the synthetic Spellcasting procedure.");
    }
    const spellcastingWithoutOptionalMetadata = {
      kind: "executable",
      procedureOrdinal: spellcasting.procedureOrdinal,
      procedure: {
        kind: "spellcasting",
        name: spellcasting.procedure.name,
        ability: spellcasting.procedure.ability,
        groups: spellcasting.procedure.groups,
      },
      resourceRefs: { kind: "none" },
    } as const satisfies StatBlockProcedureEntry;
    const record = {
      ...base,
      statBlock: {
        ...base.statBlock,
        actions: [...actions, spellcastingWithoutOptionalMetadata],
      },
    } satisfies StatBlockRecord;

    const execution = executionFor(
      projectedStatBlockRuntimeSource(record),
      "spellcasting-without-optional-metadata",
    );
    const binding = execution.procedureBindings.find(
      (candidate) => candidate.procedure.kind === "spellcasting",
    );
    if (binding?.procedure.kind !== "spellcasting") {
      throw new Error("Expected the admitted Spellcasting binding.");
    }

    expect(binding.procedure).toMatchObject({
      kind: "spellcasting",
      ability: "int",
    });
    expect("spellSaveDc" in binding.procedure).toBe(false);
    expect("spellAttackBonus" in binding.procedure).toBe(false);
    expect("components" in binding.procedure).toBe(false);
  });
});
