// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-MONK-MARTIAL-ARTS-SCALING monk_martial_arts
// UNIT-IDENTITY-MBT-REPLAY: L1D2-MONK-MARTIAL-ARTS-SCALING monk_martial_arts doProjectMartialArtsD12
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  classLevel,
  DAMAGE_DIE_SIZES,
  type DamageDieSize,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { describe, expect, it } from "vitest";

import { martialArtsAttackProjectionProfileForUnit } from "./index.ts";

const monkMartialArtsSelectedIdentityDriverSchema = {
  init: {},
  doProjectMartialArtsD12: {},
  step: {},
} as const;
type MonkMartialArtsSelectedIdentityAction = Exclude<
  keyof typeof monkMartialArtsSelectedIdentityDriverSchema,
  "init" | "step"
>;
type MonkMartialArtsSelectedIdentityProjection = {
  readonly classLevel: number;
  readonly damageDieSize: DamageDieSize | 0;
  readonly unitBound: boolean;
  readonly lastResult: "init" | "projected" | "invalid";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MonkMartialArtsSelectedIdentityAction[];
  readonly expected: MonkMartialArtsSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-MONK-MARTIAL-ARTS-SCALING";
  readonly unitId: typeof monkMartialArtsUnitId;
  readonly actions: readonly MonkMartialArtsSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const monkMartialArtsUnitId = "monk_martial_arts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Monk Martial Arts selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-MONK-MARTIAL-ARTS-SCALING",
    unitId: "monk_martial_arts",
    actions: ["doProjectMartialArtsD12"],
    sequences: [
      {
        name: "level-17-martial-arts-d12-profile",
        actions: ["doProjectMartialArtsD12"],
        expected: {
          classLevel: 17,
          damageDieSize: 12,
          unitBound: true,
          lastResult: "projected",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const monkMartialArtsSelectedIdentityStateCheck = stateCheck(
  normalizeMonkMartialArtsSelectedIdentityQuintState,
  compareMonkMartialArtsSelectedIdentityState,
);

describe("Monk Martial Arts selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<MonkMartialArtsSelectedIdentityAction>();

      for (const sequence of replay.sequences) {
        const driver = createMonkMartialArtsSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Monk Martial Arts selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Monk Martial Arts selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Monk Martial Arts selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../monk-martial-arts-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMonkMartialArtsSelectedIdentityDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: monkMartialArtsSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createMonkMartialArtsSelectedIdentityDriver() {
  return defineDriver(monkMartialArtsSelectedIdentityDriverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectMartialArtsD12: () => {
        const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
        const profile = martialArtsAttackProjectionProfileForUnit(unit, [
          { className: "monk", level: classLevel(17) },
        ]);
        projection =
          profile === null
            ? { ...projection, lastResult: "invalid" }
            : {
                classLevel: Number(profile.classLevel),
                damageDieSize: profile.martialArts.damageReplacement.dieSize,
                unitBound: profile.unit.id === monkMartialArtsUnitId,
                lastResult: "projected",
              };
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): MonkMartialArtsSelectedIdentityProjection {
  return {
    classLevel: 0,
    damageDieSize: 0,
    unitBound: false,
    lastResult: "init",
  };
}

function normalizeMonkMartialArtsSelectedIdentityQuintState(
  raw: unknown,
): MonkMartialArtsSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    classLevel: numberFromQuintInt(state["qClassLevel"], "qClassLevel"),
    damageDieSize: dieSizeFromQuintInt(
      state["qDamageDieSize"],
      "qDamageDieSize",
    ),
    unitBound: booleanField(state, "qUnitBound"),
    lastResult: resultField(state["qLastResult"]),
  };
}

function compareMonkMartialArtsSelectedIdentityState(
  quint: MonkMartialArtsSelectedIdentityProjection,
  runtime: MonkMartialArtsSelectedIdentityProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function quintStateRecord(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      "Expected Monk Martial Arts selected identity Quint state.",
    );
  }
  return raw as Record<string, unknown>;
}

function booleanField(state: Record<string, unknown>, field: string): boolean {
  const value = state[field];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean Quint field ${field}.`);
  }
  return value;
}

function numberFromQuintInt(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value !== null && typeof value === "object" && "#bigint" in value) {
    return Number((value as { readonly "#bigint": string })["#bigint"]);
  }
  throw new Error(`Expected integer Quint field ${field}.`);
}

function dieSizeFromQuintInt(value: unknown, field: string): DamageDieSize | 0 {
  const dieSize = numberFromQuintInt(value, field);
  if (dieSize === 0 || isDamageDieSize(dieSize)) {
    return dieSize;
  }
  throw new Error(`Expected Monk Martial Arts die-size Quint field ${field}.`);
}

function isDamageDieSize(dieSize: number): dieSize is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((candidate) => candidate === dieSize);
}

function resultField(
  value: unknown,
): MonkMartialArtsSelectedIdentityProjection["lastResult"] {
  if (value === "init" || value === "projected" || value === "invalid") {
    return value;
  }
  throw new Error("Expected Monk Martial Arts selected identity result.");
}
