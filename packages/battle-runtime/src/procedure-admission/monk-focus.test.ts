import { unitId } from "@dnd/shared/game-facts";
import { NonNegativeInteger } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { parseCharacterBattleClassLevels } from "../character-class-level.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "../identity.ts";
import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  admitMonkFocusProcedure,
  bindMonkFocusProcedure,
} from "./monk-focus.ts";

const resourcePoolRef = battleResourcePoolExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("synthetic-monk-focus-admission"),
    combatantId("synthetic-focus-owner"),
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);

describe("Monk Focus composite admission", () => {
  test("projects the strict composite once into source-free products and child evidence", () => {
    const unit = unitLibrary.requireUnit("monk_monks_focus");
    const admission = admitMonkFocusProcedure(unit);

    expect(admission).toMatchObject({
      tag: "admitted",
      source: { unitId: unit.id },
      procedure: {
        binding: {
          tag: "required",
          requirements: {
            resource: { kind: "sameSourceUseCountResource" },
            classLevel: {
              kind: "canonicalClassLevel",
              className: "monk",
            },
          },
        },
        resource: {
          kind: "useCount",
          cap: {
            kind: "linearPerClassLevel",
            className: "monk",
            base: 2,
            perLevel: 1,
            startingAtLevel: 2,
          },
          resetCadence: "shortOrLongRest",
        },
        facts: {
          kind: "monkFocusBattleOptions",
          effectSaveDc: {
            kind: "classFeatureAbilitySaveDc",
            base: 8,
            ability: "wis",
            includesProficiencyBonus: true,
          },
          flurryOfBlows: {
            kind: "bonusActionUnarmedStrikeSequence",
            focusPointCost: 1,
            strikeCount: 2,
          },
          patientDefense: {
            kind: "bonusActionDefensiveModes",
            freeAction: "disengage",
            focusPointCost: 1,
            focusActions: ["disengage", "dodge"],
          },
          stepOfTheWind: {
            kind: "bonusActionMobilityModes",
            freeAction: "dash",
            focusPointCost: 1,
            focusActions: ["disengage", "dash"],
            jumpDistanceMultiplier: {
              multiplier: 2,
              expires: "endOfTurn",
            },
          },
        },
      },
    });
    if (admission.tag !== "admitted") {
      throw new Error("Expected admitted Monk Focus mechanics.");
    }
    expect(admission.procedure.evidence.map(evidenceCoordinate)).toEqual([
      "consumed|useCountResource|recordMechanics/resource",
      "consumed|restResetCadence|recordMechanics/generalFact:1",
      "consumed|saveDc|recordMechanics/generalFact:2",
      "unowned|optionIdentity:bonusActionUnarmedStrikeSequence|recordMechanics/generalFact:3",
      "consumed|optionExecution:bonusActionUnarmedStrikeSequence|recordMechanics/effect:1",
      "unowned|optionIdentity:bonusActionDefensiveModes|recordMechanics/generalFact:4",
      "consumed|optionExecution:bonusActionDefensiveModes|recordMechanics/effect:2",
      "unowned|optionIdentity:bonusActionMobilityModes|recordMechanics/generalFact:5",
      "consumed|optionExecution:bonusActionMobilityModes|recordMechanics/effect:3",
    ]);
    expect(admission.procedure).not.toHaveProperty("facts.optionId");
    expect(admission.procedure).not.toHaveProperty("facts.choiceKey");
    expect(admission.procedure).not.toHaveProperty("facts.displayName");
  });

  test("renamed option identity and protocol labels cannot change products", () => {
    const canonical = unitLibrary.requireUnit("monk_monks_focus");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected a resource-container feature.");
    }
    const renamed = decodeUnitRecordSync({
      ...canonical,
      id: "synthetic_centered_reserve",
      name: "Synthetic Centered Reserve",
      provenance: { kind: "synthetic-test", section: "Synthetic/Reserve" },
      mechanics: {
        ...canonical.mechanics,
        optionSet: {
          ...canonical.mechanics.optionSet,
          choiceKey: "synthetic_reserve_procedure",
          initialOptions: canonical.mechanics.optionSet.initialOptions.map(
            (option, index) => ({
              ...option,
              id: `synthetic_reserve_option_${index + 1}`,
              displayName: `Synthetic Reserve Option ${index + 1}`,
            }),
          ),
        },
      },
    });
    const canonicalAdmission = admitMonkFocusProcedure(canonical);
    const renamedAdmission = admitMonkFocusProcedure(renamed);
    expect(canonicalAdmission.tag).toBe("admitted");
    expect(renamedAdmission.tag).toBe("admitted");
    if (
      canonicalAdmission.tag !== "admitted" ||
      renamedAdmission.tag !== "admitted"
    ) {
      return;
    }
    expect(renamedAdmission.procedure).toEqual(canonicalAdmission.procedure);
    expect(renamedAdmission.source.unitId).toBe(renamed.id);
  });

  test("option reordering preserves products and re-associates evidence by execution kind", () => {
    const canonical = unitLibrary.requireUnit("monk_monks_focus");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected a resource-container feature.");
    }
    const reordered = decodeUnitRecordSync({
      ...canonical,
      id: "synthetic_reordered_reserve",
      name: "Synthetic Reordered Reserve",
      provenance: { kind: "synthetic-test", section: "Synthetic/Reordered" },
      mechanics: {
        ...canonical.mechanics,
        optionSet: {
          ...canonical.mechanics.optionSet,
          initialOptions: [...canonical.mechanics.optionSet.initialOptions]
            .reverse()
            .map((option, index) => ({
              ...option,
              id: `synthetic_reordered_option_${index + 1}`,
              displayName: `Synthetic Reordered Option ${index + 1}`,
            })),
        },
      },
    });
    const canonicalAdmission = admitted(canonical);
    const reorderedAdmission = admitted(reordered);
    expect(reorderedAdmission.procedure.facts).toEqual(
      canonicalAdmission.procedure.facts,
    );
    expect(
      reorderedAdmission.procedure.evidence
        .filter(({ branch }) => branch.kind === "optionExecution")
        .map(evidenceCoordinate),
    ).toEqual([
      "consumed|optionExecution:bonusActionMobilityModes|recordMechanics/effect:1",
      "consumed|optionExecution:bonusActionDefensiveModes|recordMechanics/effect:2",
      "consumed|optionExecution:bonusActionUnarmedStrikeSequence|recordMechanics/effect:3",
    ]);
  });

  test("accumulates independent resource, reset, save, timing, and procedure failures", () => {
    const canonical = canonicalMechanics();
    const options = canonical.mechanics.optionSet.initialOptions;
    const mobility = options[2];
    if (mobility === undefined) throw new Error("Expected mobility option.");
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_malformed_reserve",
      mechanics: {
        ...canonical.mechanics,
        resource: { kind: "use_count", cap: { kind: "fixed", uses: 2 } },
        resetCadence: { kind: "long_rest" },
        effectSaveDc: {
          kind: "class_feature_ability_save_dc",
          base: 8,
          ability: "int",
        },
        optionSet: {
          ...canonical.mechanics.optionSet,
          timing: "synthetic_other_timing",
          initialOptions: [
            options[0],
            options[1],
            {
              ...mobility,
              battleExecution: {
                ...mobility.battleExecution,
                jumpDistanceMultiplier: {
                  multiplier: 2,
                  expires: "synthetic_other_expiry",
                },
              },
            },
          ],
        },
      },
    });
    const result = admitMonkFocusProcedure(malformed);
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues.map(({ failedFact }) => failedFact)).toEqual([
      "unsupportedUseCountResource",
      "unsupportedResetCadence",
      "unsupportedSaveDc",
      "unsupportedOptionTiming",
      "unsupportedOptionProcedure",
    ]);
    expect(result.issues.at(-1)?.mechanicsPath).toEqual({
      family: "unit",
      nodes: [
        { kind: "singleton", role: "recordMechanics" },
        { kind: "occurrence", role: "effect", ordinal: 3 },
      ],
    });
  });

  test("rejects missing, duplicate, and extra procedure kinds without positional inference", () => {
    const canonical = canonicalMechanics();
    const [unarmed, defensive] = canonical.mechanics.optionSet.initialOptions;
    if (unarmed === undefined || defensive === undefined) {
      throw new Error("Expected canonical Focus options.");
    }
    const duplicate = {
      ...unarmed,
      id: "synthetic_duplicate_unarmed_sequence",
      displayName: "Synthetic Duplicate Sequence",
    };
    const extra = {
      ...defensive,
      id: "synthetic_unrepresented_option",
      displayName: "Synthetic Unrepresented Option",
      battleExecution: undefined,
    };
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_duplicate_missing_extra_reserve",
      mechanics: {
        ...canonical.mechanics,
        optionSet: {
          ...canonical.mechanics.optionSet,
          initialOptions: [unarmed, defensive, duplicate, extra],
        },
      },
    });
    const result = admitMonkFocusProcedure(malformed);
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(
      result.issues.map(({ failedFact, procedureKind }) =>
        procedureKind === undefined
          ? failedFact
          : `${failedFact}:${procedureKind}`,
      ),
    ).toEqual([
      "unexpectedOptionCount",
      "unsupportedOptionProcedure",
      "duplicateOptionProcedureKind:bonusActionUnarmedStrikeSequence",
      "missingOptionProcedureKind:bonusActionMobilityModes",
    ]);
  });

  test("binds only a same-source resource into ready facts", () => {
    const admittedProcedure = admitted(
      unitLibrary.requireUnit("monk_monks_focus"),
    );
    expect(
      bindMonkFocusProcedure(
        {
          sourceUnitId: admittedProcedure.source.unitId,
          procedure: admittedProcedure.procedure,
        },
        {
          resourcePoolRefsByUnitId: new Map([
            [admittedProcedure.source.unitId, resourcePoolRef],
          ]),
          classLevels: monkClassLevels(),
        },
      ),
    ).toEqual({
      tag: "bound",
      procedure: {
        binding: "ready",
        source: { kind: "resourcePool", resourcePoolRef },
        facts: admittedProcedure.procedure.facts,
      },
    });
  });

  test("reports every missing binding and never emits inert intrinsic facts", () => {
    const admittedProcedure = admitted(
      unitLibrary.requireUnit("monk_monks_focus"),
    );
    const result = bindMonkFocusProcedure(
      {
        sourceUnitId: admittedProcedure.source.unitId,
        procedure: admittedProcedure.procedure,
      },
      {
        resourcePoolRefsByUnitId: new Map([
          [unitId("synthetic_other_reserve"), resourcePoolRef],
        ]),
        classLevels: fighterClassLevels(),
      },
    );
    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "monkFocusProcedureBindingIssue",
          reason: "sameSourceResourceMissing",
          message:
            "Monk Focus binding requires its same-source use-count resource.",
        },
        {
          tag: "monkFocusProcedureBindingIssue",
          reason: "canonicalMonkClassLevelMissing",
          message:
            "Monk Focus binding requires the canonical Monk class level.",
        },
      ],
    });
    expect(result).not.toHaveProperty("procedure");
  });

  test("leaves unrelated resource-container and non-container roots unowned", () => {
    expect(
      admitMonkFocusProcedure(
        unitLibrary.requireUnit("paladin_channel_divinity"),
      ),
    ).toEqual({ tag: "notBattleOwned" });
    expect(
      admitMonkFocusProcedure(unitLibrary.requireUnit("mastery_sap")),
    ).toEqual({ tag: "notBattleOwned" });
  });
});

type ResourceContainerUnit = Extract<
  AuthoredUnitSource,
  { readonly kind: "class_feature" }
> & {
  readonly mechanics: Extract<
    Extract<
      AuthoredUnitSource,
      { readonly kind: "class_feature" }
    >["mechanics"],
    { readonly family: "resource_container" }
  >;
};

function canonicalMechanics(): ResourceContainerUnit {
  const unit = unitLibrary.requireUnit("monk_monks_focus");
  if (!isResourceContainerUnit(unit)) {
    throw new Error("Expected canonical resource-container mechanics.");
  }
  return unit;
}

function admitted(unit: AuthoredUnitSource) {
  const admission = admitMonkFocusProcedure(unit);
  if (admission.tag !== "admitted") {
    throw new Error("Expected admitted Monk Focus mechanics.");
  }
  return { source: admission.source, procedure: admission.procedure };
}

function isResourceContainerUnit(
  unit: AuthoredUnitSource,
): unit is ResourceContainerUnit {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "resource_container"
  );
}

function monkClassLevels() {
  const result = parseCharacterBattleClassLevels([
    { className: "monk", level: 10 },
  ]);
  if (Result.isFailure(result)) throw new Error(result.failure.messages.join());
  return result.success;
}

function fighterClassLevels() {
  const result = parseCharacterBattleClassLevels([
    { className: "fighter", level: 10 },
  ]);
  if (Result.isFailure(result)) throw new Error(result.failure.messages.join());
  return result.success;
}

function evidenceCoordinate(
  evidence: ReturnType<typeof admitted>["procedure"]["evidence"][number],
): string {
  const branch =
    "procedureKind" in evidence.branch
      ? `${evidence.branch.kind}:${evidence.branch.procedureKind}`
      : evidence.branch.kind;
  const path = evidence.mechanicsPath.nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
  return `${evidence.disposition}|${branch}|${path}`;
}
