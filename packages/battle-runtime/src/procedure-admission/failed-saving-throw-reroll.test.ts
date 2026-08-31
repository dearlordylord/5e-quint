import { unitId } from "@dnd/shared/game-facts";
import { classLevel, NonNegativeInteger } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Result } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "../identity.ts";
import { parseCharacterBattleClassLevels } from "../character-class-level.ts";
import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  admitFailedSavingThrowRerollProcedure,
  bindFailedSavingThrowRerollProcedure,
} from "./failed-saving-throw-reroll.ts";

const ROOT_MECHANICS_EVIDENCE = {
  family: "unit",
  nodes: [{ kind: "singleton", role: "recordMechanics" }],
} as const;

const resourcePoolRef = battleResourcePoolExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("failed-saving-throw-reroll-test"),
    combatantId("synthetic-indomitable-owner"),
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);

describe("atomic failed Saving Throw reroll admission", () => {
  test("projects the complete strict root into source-free procedure and resource products", () => {
    const unit = unitLibrary.requireUnit("fighter_indomitable");

    expect(admitFailedSavingThrowRerollProcedure(unit)).toEqual({
      tag: "admitted",
      source: { unitId: unit.id },
      procedure: {
        binding: {
          tag: "required",
          requirements: {
            resource: { kind: "sameSourceUseCountResource" },
            classLevel: {
              kind: "canonicalClassLevel",
              className: "fighter",
            },
          },
        },
        facts: {
          kind: "failedSavingThrowReroll",
          savingThrow: {
            trigger: "failedSavingThrow",
            reroll: {
              use: "newRoll",
              bonus: { kind: "classLevel", className: "fighter" },
            },
          },
        },
        resource: {
          kind: "useCount",
          cap: {
            kind: "classLevelThresholdTiers",
            className: "fighter",
            base: 1,
            tiers: [
              { atLevel: 13, value: 2 },
              { atLevel: 17, value: 3 },
            ],
          },
          resetCadence: "longRest",
        },
        evidence: {
          consumed: [ROOT_MECHANICS_EVIDENCE],
          unowned: [],
        },
      },
    });
  });

  test("synthetic authored identity cannot change source-free admitted products", () => {
    const canonical = unitLibrary.requireUnit("fighter_indomitable");

    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9_]{0,16}$/), (suffix) => {
        const renamed = decodeUnitRecordSync({
          ...canonical,
          id: `synthetic_${suffix}`,
          name: `Synthetic ${suffix}`,
          provenance: { kind: "synthetic-test", section: suffix },
        });
        const canonicalAdmission =
          admitFailedSavingThrowRerollProcedure(canonical);
        const renamedAdmission = admitFailedSavingThrowRerollProcedure(renamed);

        expect(canonicalAdmission.tag).toBe("admitted");
        expect(renamedAdmission.tag).toBe("admitted");
        if (
          canonicalAdmission.tag !== "admitted" ||
          renamedAdmission.tag !== "admitted"
        ) {
          return;
        }
        expect(renamedAdmission.procedure).toEqual(
          canonicalAdmission.procedure,
        );
        expect(renamedAdmission.source).toEqual({ unitId: renamed.id });
      }),
      { numRuns: 30 },
    );
  });

  test.each([
    ["mandatory new roll", { reroll: { mustUseNewRoll: false } }],
    [
      "Fighter-level bonus",
      { reroll: { bonus: { kind: "class_level", className: "monk" } } },
    ],
    [
      "use-count thresholds",
      {
        resource: {
          kind: "use_count",
          cap: {
            kind: "threshold_tiers",
            axis: "class",
            base: 1,
            tiers: [
              { atLevel: 12, value: 2 },
              { atLevel: 17, value: 3 },
            ],
          },
        },
      },
    ],
    ["Long Rest reset", { resetCadence: { kind: "short_or_long_rest" } }],
  ] as const)("rejects a same-family near miss in %s", (_label, patch) => {
    const canonical = unitLibrary.requireUnit("fighter_indomitable");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "failed_saving_throw_reroll"
    ) {
      throw new Error("Expected failed Saving Throw reroll mechanics.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_indomitable_near_miss",
      mechanics: { ...canonical.mechanics, ...patch },
    });

    expect(admitFailedSavingThrowRerollProcedure(malformed)).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "failedSavingThrowRerollProcedureAdmissionIssue",
          mechanicsPath: ROOT_MECHANICS_EVIDENCE,
          message:
            "The represented atomic failed Saving Throw reroll root is not completely supported by Battle.",
        },
      ],
    });
  });

  test("leaves unrelated roots unowned", () => {
    expect(
      admitFailedSavingThrowRerollProcedure(
        unitLibrary.requireUnit("fighter_tactical_master"),
      ),
    ).toEqual({ tag: "notBattleOwned" });
    expect(
      admitFailedSavingThrowRerollProcedure(
        unitLibrary.requireUnit("mastery_push"),
      ),
    ).toEqual({ tag: "notBattleOwned" });
  });

  test("binds the same-source resource and canonical Fighter level into ready execution", () => {
    const admitted = admittedProcedure();

    expect(
      bindFailedSavingThrowRerollProcedure(admitted, {
        resourcePoolRefsByUnitId: new Map([
          [admitted.sourceUnitId, resourcePoolRef],
        ]),
        classLevels: classLevelsFor("fighter", 13),
      }),
    ).toEqual({
      tag: "bound",
      procedure: {
        binding: "ready",
        execution: {
          kind: "failedSavingThrowReroll",
          savingThrow: {
            trigger: "failedSavingThrow",
            reroll: {
              use: "newRoll",
              bonus: {
                kind: "classLevel",
                className: "fighter",
                level: classLevel(13),
              },
            },
            spends: { resourcePoolRef, amount: 1 },
          },
        },
      },
    });
  });

  test("reports all missing binding requirements and exposes no ready execution", () => {
    const result = bindFailedSavingThrowRerollProcedure(admittedProcedure(), {
      resourcePoolRefsByUnitId: new Map(),
      classLevels: classLevelsFor("monk", 13),
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "failedSavingThrowRerollProcedureBindingIssue",
          reason: "sameSourceResourceMissing",
          message:
            "Failed Saving Throw reroll binding requires its same-source use-count resource.",
        },
        {
          tag: "failedSavingThrowRerollProcedureBindingIssue",
          reason: "canonicalClassLevelMissing",
          message:
            "Failed Saving Throw reroll binding requires the canonical Fighter class level.",
        },
      ],
    });
    expect(result).not.toHaveProperty("procedure.execution");
  });

  test("does not substitute a different source's resource pool", () => {
    const admitted = admittedProcedure();
    const result = bindFailedSavingThrowRerollProcedure(admitted, {
      resourcePoolRefsByUnitId: new Map([
        [unitId("synthetic_other_resource"), resourcePoolRef],
      ]),
      classLevels: classLevelsFor("fighter", 13),
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [{ reason: "sameSourceResourceMissing" }],
    });
    expect(result).not.toHaveProperty("procedure.execution");
  });
});

function admittedProcedure() {
  const admission = admitFailedSavingThrowRerollProcedure(
    unitLibrary.requireUnit("fighter_indomitable"),
  );
  if (admission.tag !== "admitted") {
    throw new Error("Expected admitted failed Saving Throw reroll procedure.");
  }
  return {
    sourceUnitId: admission.source.unitId,
    procedure: admission.procedure,
  };
}

function classLevelsFor(className: "fighter" | "monk", level: number) {
  const result = parseCharacterBattleClassLevels([{ className, level }]);
  if (Result.isFailure(result)) {
    throw new Error(result.failure.messages.join("; "));
  }
  return result.success;
}
