// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.attack-control
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  battleAmmunitionStock,
  battleCreatureInitFromStatBlock,
  battleId,
  combatantId,
  initiativeScore,
  startBattle,
} from "./index.ts";
import {
  authoredProcedureOrdinal,
  monsterMultiattackStatBlock,
  monsterResourceStatBlock,
  projectedStatBlockRuntimeSource,
} from "./battle-runtime.test-support.ts";

type RuntimeSource = ReturnType<typeof projectedStatBlockRuntimeSource>;
type RuntimeProcedure = RuntimeSource["procedures"][number];
type RuntimeMultiattackProcedure = Extract<
  RuntimeProcedure,
  { readonly kind: "multiattack" }
>;
type RuntimeDispatch = RuntimeMultiattackProcedure["dispatches"][number];

function executionFor(source: RuntimeSource, id: string) {
  const actorId = combatantId(`stat-block-execution-${id}`);
  const initialized = battleCreatureInitFromStatBlock({
    combatantId: actorId,
    statBlock: source,
    initiative: initiativeScore(10),
    ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (Either.isLeft(initialized)) {
    throw new Error(
      `Expected Stat Block initialization: ${JSON.stringify(initialized.left)}`,
    );
  }

  const started = startBattle({
    battleId: battleId(`stat-block-execution-${id}`),
    combatants: [initialized.right],
  });
  if (Either.isLeft(started)) {
    throw new Error(
      `Expected Stat Block battle start: ${JSON.stringify(started.left)}`,
    );
  }

  const combatant = started.right.state.combatants.get(actorId);
  if (combatant?.origin.kind !== "statBlock") {
    throw new Error("Expected the Stat Block combatant admission.");
  }
  return combatant.origin.execution;
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
});
