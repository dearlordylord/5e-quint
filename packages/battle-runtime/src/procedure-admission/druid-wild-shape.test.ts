import { unitId } from "@dnd/shared/game-facts";
import { NonNegativeInteger, classLevel } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  ClassFeatureRecord,
  UnitRecord,
  UseCountResource,
} from "@dnd/surface/surface/types";
import { Result } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { parseCharacterBattleClassLevels } from "../character-class-level.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "../identity.ts";
import { parseSupportedUnitFeatureProfile } from "../unit-feature-support.ts";
import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  admitDruidWildShapeProcedure,
  bindDruidWildShapeProcedure,
} from "./druid-wild-shape.ts";

const resourcePoolRef = battleResourcePoolExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("wild-shape-admission-test"),
    combatantId("synthetic-wild-shape-owner"),
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);

const ROOT_NODE = { kind: "singleton", role: "recordMechanics" } as const;
const RESOURCE_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "singleton", role: "resource" }],
} as const;
const RESET_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "occurrence", role: "generalFact", ordinal: 1 }],
} as const;
const BONUS_ACTION_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "singleton", role: "bonusAction" }],
} as const;
const DURATION_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "occurrence", role: "generalFact", ordinal: 2 }],
} as const;
const TRANSFORM_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "occurrence", role: "effect", ordinal: 1 }],
} as const;
const REVERSION_PATH = {
  family: "unit",
  nodes: [
    ROOT_NODE,
    { kind: "occurrence", role: "effect", ordinal: 1 },
    { kind: "occurrence", role: "generalFact", ordinal: 1 },
  ],
} as const;
const TEMPORARY_HIT_POINTS_PATH = {
  family: "unit",
  nodes: [ROOT_NODE, { kind: "occurrence", role: "effect", ordinal: 2 }],
} as const;

describe("Druid Wild Shape procedure admission", () => {
  test("projects source-free resource and activation templates with exact child evidence", () => {
    const unit = unitLibrary.requireUnit("druid_wild_shape");
    const admission = admitDruidWildShapeProcedure(unit);

    expect(admission).toMatchObject({
      tag: "admitted",
      source: { unitId: unit.id },
      projection: {
        resource: {
          kind: "useCount",
          cap: {
            kind: "classLevelThresholdTiers",
            className: "druid",
            base: 2,
            tiers: [
              { atLevel: 6, value: 3 },
              { atLevel: 17, value: 4 },
            ],
          },
          resetCadence: {
            kind: "partialShortFullLong",
            shortRestRefill: 1,
            longRestRefillsAll: true,
          },
        },
        procedure: {
          kind: "druidWildShapeKnownForm",
          activation: {
            cost: "bonusAction",
            duration: {
              kind: "halfClassLevelRoundedDownHours",
              className: "druid",
            },
            target: "self",
            form: "knownFormsRoster",
            actionRestriction: "noSpellcasting",
            temporaryHitPoints: { kind: "classLevel", className: "druid" },
          },
          knownFormRoster: {
            creatureType: "beast",
            count: {
              kind: "classLevelTotalChoices",
              className: "druid",
              levels: [
                { atLevel: 2, total: 4 },
                { atLevel: 4, total: 6 },
                { atLevel: 8, total: 8 },
              ],
            },
            maxChallengeRating: {
              kind: "classLevelThresholdTiers",
              className: "druid",
              base: 0.25,
              tiers: [
                { atLevel: 4, value: 0.5 },
                { atLevel: 8, value: 1 },
              ],
            },
            flySpeed: {
              kind: "allowedAtClassLevel",
              className: "druid",
              atLevel: 8,
            },
          },
          binding: {
            tag: "required",
            requirements: {
              resource: { kind: "sameSourceUseCountResource" },
              classLevel: {
                kind: "canonicalClassLevel",
                className: "druid",
                minimumLevel: 2,
              },
            },
          },
        },
        evidence: {
          consumed: [
            {
              mechanicsPath: RESOURCE_PATH,
              consumer: "battleUseCountResource",
            },
            { mechanicsPath: RESET_PATH, consumer: "battleRestRecovery" },
            {
              mechanicsPath: BONUS_ACTION_PATH,
              consumer: "wildShapeActionEconomy",
            },
            { mechanicsPath: DURATION_PATH, consumer: "wildShapeDuration" },
            {
              mechanicsPath: TRANSFORM_PATH,
              consumer: "wildShapeKnownFormRoster",
            },
            {
              mechanicsPath: REVERSION_PATH,
              consumer: "wildShapeReversion",
            },
            {
              mechanicsPath: TEMPORARY_HIT_POINTS_PATH,
              consumer: "wildShapeTemporaryHitPoints",
            },
          ],
          unowned: [],
        },
      },
    });
    expect(admission).not.toHaveProperty("projection.resource.unit");
    expect(admission).not.toHaveProperty("projection.procedure.unit");
    expect(admission).not.toHaveProperty("projection.evidence.recordMechanics");
  });

  test("authored identity changes cannot alter the static products", () => {
    const canonical = unitLibrary.requireUnit("druid_wild_shape");

    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9_]{0,16}$/), (suffix) => {
        const renamed = decodeUnitRecordSync({
          ...canonical,
          id: `synthetic_${suffix}`,
          name: `Synthetic ${suffix}`,
          provenance: { kind: "synthetic-test", section: suffix },
        });
        const canonicalAdmission = admitDruidWildShapeProcedure(canonical);
        const renamedAdmission = admitDruidWildShapeProcedure(renamed);
        expect(canonicalAdmission.tag).toBe("admitted");
        expect(renamedAdmission.tag).toBe("admitted");
        if (
          canonicalAdmission.tag !== "admitted" ||
          renamedAdmission.tag !== "admitted"
        ) {
          return;
        }
        expect(renamedAdmission.projection).toEqual(
          canonicalAdmission.projection,
        );
        expect(renamedAdmission.source).toEqual({ unitId: renamed.id });
      }),
      { numRuns: 30 },
    );
  });

  test("accumulates independently malformed resource, activation, transform, roster, reversion, and temporary-hit-point branches", () => {
    const canonical = canonicalWildShapeUnit();
    const phase = canonical.mechanics.phases[0];
    if (phase?.kind !== "direct" || phase.effects === undefined) {
      throw new Error("Expected the canonical direct Wild Shape phase.");
    }
    const transform = phase.effects[0];
    const temporaryHitPoints = phase.effects[1];
    if (
      transform?.kind !== "transform_target" ||
      transform.newForm.kind !== "known_forms_roster" ||
      temporaryHitPoints?.kind !== "grant_temp_hp" ||
      temporaryHitPoints.amount.kind !== "linear_per_level"
    ) {
      throw new Error("Expected the canonical Wild Shape effects.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_wild_shape_independent_malformed_branches",
      mechanics: {
        ...canonical.mechanics,
        resource: {
          ...canonical.mechanics.resource,
          cap: { ...canonical.mechanics.resource.cap, base: 3 },
        },
        resetCadence: {
          kind: "partial_short_full_long",
          shortRestRefill: 2,
        },
        activationCost: { kind: "action", action: "magic" },
        duration: { kind: "timed", value: { kind: "fixed_rounds", rounds: 1 } },
        phases: [
          {
            ...phase,
            effects: [
              {
                ...transform,
                actionRestriction: "synthetic_spellcasting_allowed",
                newForm: {
                  ...transform.newForm,
                  maxChallengeRating: {
                    ...transform.newForm.maxChallengeRating,
                    base: 0.5,
                  },
                },
                revertTriggers: transform.revertTriggers.filter(
                  (trigger) => trigger.kind !== "death",
                ),
              },
              {
                ...temporaryHitPoints,
                amount: {
                  ...temporaryHitPoints.amount,
                  base: { ...temporaryHitPoints.amount.base, flat: 2 },
                },
              },
            ],
          },
        ],
      },
    });

    expect(admitDruidWildShapeProcedure(malformed)).toEqual({
      tag: "rejected",
      issues: [
        issue("useCountResource", RESOURCE_PATH),
        issue("resetCadence", RESET_PATH),
        issue("activationCost", BONUS_ACTION_PATH),
        issue("duration", DURATION_PATH),
        issue("transformation", TRANSFORM_PATH),
        issue("knownFormRoster", TRANSFORM_PATH),
        issue("reversion", REVERSION_PATH),
        issue("temporaryHitPoints", TEMPORARY_HIT_POINTS_PATH),
      ],
    });
  });

  test("rejects a malformed composite envelope without claiming the root", () => {
    const canonical = canonicalWildShapeUnit();
    const phase = canonical.mechanics.phases[0];
    if (phase?.kind !== "direct" || phase.effects === undefined) {
      throw new Error("Expected the canonical direct Wild Shape phase.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_wild_shape_extra_phase_effect",
      mechanics: {
        ...canonical.mechanics,
        phases: [{ ...phase, effects: [...phase.effects, { kind: "none" }] }],
      },
    });

    expect(admitDruidWildShapeProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [
        {
          failedFact: "activationPhase",
          mechanicsPath: TRANSFORM_PATH,
        },
      ],
    });
  });

  test("leaves unrelated activation and non-activation roots unowned", () => {
    expect(
      admitDruidWildShapeProcedure(unitLibrary.requireUnit("druid_lands_aid")),
    ).toEqual({ tag: "notBattleOwned" });
    expect(
      admitDruidWildShapeProcedure(unitLibrary.requireUnit("mastery_push")),
    ).toEqual({ tag: "notBattleOwned" });
  });

  test("binds the same-source resource and parsed Druid level into the current execution projection", () => {
    const admitted = admittedProjection();
    expect(
      bindDruidWildShapeProcedure(admitted, {
        resourcePoolRefsByUnitId: new Map([
          [admitted.sourceUnitId, resourcePoolRef],
        ]),
        classLevels: classLevelsFor("druid", 8),
      }),
    ).toEqual({
      tag: "bound",
      procedure: {
        binding: "ready",
        source: { kind: "sameSourceResource", resourcePoolRef },
        execution: {
          kind: "druidWildShapeKnownForm",
          classLevel: classLevel(8),
          knownFormRoster: {
            creatureType: "beast",
            count: 8,
            maxChallengeRating: 1,
            flySpeed: "allowed",
          },
        },
      },
    });
  });

  test("matches the existing Wild Shape projection at every available Druid level", () => {
    const canonical = canonicalWildShapeUnit();
    const admitted = admittedProjection();

    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (level) => {
        const classLevels = classLevelsFor("druid", level);
        const previous = parseSupportedUnitFeatureProfile(
          canonical,
          classLevels,
        );
        const bound = bindDruidWildShapeProcedure(admitted, {
          resourcePoolRefsByUnitId: new Map([
            [admitted.sourceUnitId, resourcePoolRef],
          ]),
          classLevels,
        });
        expect(previous?.kind).toBe("druidWildShapeKnownForm");
        expect(bound.tag).toBe("bound");
        if (
          previous?.kind !== "druidWildShapeKnownForm" ||
          bound.tag !== "bound"
        ) {
          return;
        }
        const { unit: _unit, ...previousFacts } = previous;
        expect(bound.procedure.execution).toEqual(previousFacts);
      }),
      { numRuns: 40 },
    );
  });

  test("reports every missing binding and never substitutes another source resource", () => {
    const admitted = admittedProjection();
    expect(
      bindDruidWildShapeProcedure(admitted, {
        resourcePoolRefsByUnitId: new Map([
          [unitId("synthetic_other_wild_shape_resource"), resourcePoolRef],
        ]),
        classLevels: classLevelsFor("monk", 8),
      }),
    ).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "druidWildShapeProcedureBindingIssue",
          reason: "sameSourceResourceMissing",
          message:
            "Wild Shape binding requires its same-source use-count resource.",
        },
        {
          tag: "druidWildShapeProcedureBindingIssue",
          reason: "canonicalClassLevelMissing",
          message:
            "Wild Shape binding requires the canonical Druid class level.",
        },
      ],
    });
  });

  test("keeps a below-acquisition Druid projection explicitly unavailable", () => {
    const admitted = admittedProjection();
    expect(
      bindDruidWildShapeProcedure(admitted, {
        resourcePoolRefsByUnitId: new Map([
          [admitted.sourceUnitId, resourcePoolRef],
        ]),
        classLevels: classLevelsFor("druid", 1),
      }),
    ).toEqual({
      tag: "notAvailable",
      reason: "belowAcquisitionLevel",
      className: "druid",
      minimumLevel: 2,
      actualLevel: classLevel(1),
    });
  });
});

function canonicalWildShapeUnit() {
  const unit = unitLibrary.requireUnit("druid_wild_shape");
  if (!isCanonicalWildShapeFixture(unit)) {
    throw new Error("Expected canonical Wild Shape activation mechanics.");
  }
  return unit;
}

type CanonicalWildShapeFixture = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> & {
  readonly className: "druid";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  > & {
    readonly resource: UseCountResource & {
      readonly cap: Extract<
        UseCountResource["cap"],
        { readonly kind: "threshold_tiers" }
      >;
    };
  };
};

function isCanonicalWildShapeFixture(
  unit: UnitRecord,
): unit is CanonicalWildShapeFixture {
  return (
    unit.kind === "class_feature" &&
    unit.className === "druid" &&
    unit.mechanics.family === "activation" &&
    unit.mechanics.resource?.kind === "use_count" &&
    unit.mechanics.resource.cap.kind === "threshold_tiers"
  );
}

function admittedProjection() {
  const admission = admitDruidWildShapeProcedure(canonicalWildShapeUnit());
  if (admission.tag !== "admitted") {
    throw new Error("Expected admitted Wild Shape procedure.");
  }
  return {
    sourceUnitId: admission.source.unitId,
    projection: admission.projection,
  };
}

function classLevelsFor(className: "druid" | "monk", level: number) {
  const parsed = parseCharacterBattleClassLevels([{ className, level }]);
  if (Result.isFailure(parsed)) {
    throw new Error(parsed.failure.messages.join("; "));
  }
  return parsed.success;
}

function issue(failedFact: string, mechanicsPath: unknown) {
  return {
    tag: "druidWildShapeProcedureAdmissionIssue",
    failedFact,
    mechanicsPath,
    message: `Unsupported Wild Shape mechanics fact: ${failedFact}.`,
  };
}
