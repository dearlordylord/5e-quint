// KERNEL-COVERAGE: parity-witness SHEET.HIT_POINTS.MAXIMUM_DERIVATION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  characterBuildHitPoints,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetHitPointMaximum,
  characterSheetId,
  createFreshCharacterSheet,
} from "./index.ts";

const hitPointMaximumScenarios = [
  "init",
  "fighter-level-one",
  "fighter-level-two",
  "wizard-fighter-multiclass",
  "minimum-higher-level-gain",
  "sorcerer-draconic-resilience",
  "reduced-effective-maximum",
] as const;
type HitPointMaximumScenario = (typeof hitPointMaximumScenarios)[number];
const hitPointMaximumReplayStepCount = hitPointMaximumScenarios.length - 1;

type HitPointMaximumProjection = {
  readonly lastResult: HitPointMaximumScenario;
  readonly normalHitPointMaximum: number;
  readonly effectiveHitPointMaximum: number;
  readonly hitDiceTotal: number;
  readonly hitPointMaximumReduction: number;
  readonly replayIndex: number;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet Hit Point maximum Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const driverSchema = {
  init: {},
  doProjectFighterLevelOne: {},
  doProjectFighterLevelTwo: {},
  doProjectWizardFighterMulticlass: {},
  doProjectMinimumHigherLevelGain: {},
  doProjectSorcererDraconicResilience: {},
  doProjectReducedEffectiveMaximum: {},
  step: {},
} as const;

function createHitPointMaximumDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectFighterLevelOne: () => {
        projection = projectHitPointMaximum({
          lastResult: "fighter-level-one",
          build: buildFixture({
            startingClass: "class_fighter",
            constitutionScore: 13,
          }),
          replayIndex: 1,
        });
      },
      doProjectFighterLevelTwo: () => {
        projection = projectHitPointMaximum({
          lastResult: "fighter-level-two",
          build: buildFixture({
            startingClass: "class_fighter",
            constitutionScore: 13,
            advancements: ["class_fighter"],
          }),
          replayIndex: 2,
        });
      },
      doProjectWizardFighterMulticlass: () => {
        projection = projectHitPointMaximum({
          lastResult: "wizard-fighter-multiclass",
          build: buildFixture({
            startingClass: "class_wizard",
            constitutionScore: 13,
            advancements: ["class_fighter"],
          }),
          replayIndex: 3,
        });
      },
      doProjectMinimumHigherLevelGain: () => {
        projection = projectHitPointMaximum({
          lastResult: "minimum-higher-level-gain",
          build: buildFixture({
            startingClass: "class_wizard",
            constitutionScore: 2,
            advancements: ["class_wizard"],
          }),
          replayIndex: 4,
        });
      },
      doProjectSorcererDraconicResilience: () => {
        projection = projectHitPointMaximum({
          lastResult: "sorcerer-draconic-resilience",
          build: {
            ...buildFixture({
              startingClass: "class_sorcerer",
              constitutionScore: 13,
              advancements: ["class_sorcerer", "class_sorcerer"],
            }),
            features: [
              {
                kind: "selectedClassChoice",
                selectedFromUnitId: "class_sorcerer",
                unitId: "subclass_sorcerer_draconic_sorcery",
              },
            ],
          },
          replayIndex: 5,
        });
      },
      doProjectReducedEffectiveMaximum: () => {
        projection = projectHitPointMaximum({
          lastResult: "reduced-effective-maximum",
          build: buildFixture({
            startingClass: "class_fighter",
            constitutionScore: 13,
            advancements: ["class_fighter"],
          }),
          hitPointMaximumReduction: 3,
          replayIndex: 6,
        });
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const hitPointMaximumStateCheck = stateCheck(
  normalizeHitPointMaximumQuintState,
  compareHitPointMaximumState,
);

describe("Character Sheet Hit Point maximum deterministic QNT replay", () => {
  it("derives normal and effective Hit Point Maximum from class, level, Constitution, and reductions", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-hit-point-maximum.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHitPointMaximumDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: hitPointMaximumReplayStepCount,
      stateCheck: hitPointMaximumStateCheck,
    });
  }, 120_000);
});

function initialProjection(): HitPointMaximumProjection {
  return projectHitPointMaximum({
    lastResult: "init",
    build: buildFixture({
      startingClass: "class_fighter",
      constitutionScore: 10,
    }),
    replayIndex: 0,
  });
}

function projectHitPointMaximum(input: {
  readonly lastResult: HitPointMaximumScenario;
  readonly build: CharacterBuild;
  readonly hitPointMaximumReduction?: number;
  readonly replayIndex: number;
}): HitPointMaximumProjection {
  const hitPoints = requireRight(
    characterBuildHitPoints(input.build, unitLibrary),
  );
  const hitPointMaximumReduction = input.hitPointMaximumReduction ?? 0;
  const sheet = requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(`character:hp-maximum:${input.lastResult}`),
      build: input.build,
      maximumHp: Hp(Number(hitPoints.maximum)),
      currentHp: Hp(Number(hitPoints.maximum) - hitPointMaximumReduction),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(hitPointMaximumReduction),
      conditions: [],
      unitLibrary,
    }),
  );

  return {
    lastResult: input.lastResult,
    normalHitPointMaximum: Number(hitPoints.maximum),
    effectiveHitPointMaximum: Number(characterSheetHitPointMaximum(sheet)),
    hitDiceTotal: hitPoints.hitDice.reduce(
      (total, pool) => total + Number(pool.total),
      0,
    ),
    hitPointMaximumReduction,
    replayIndex: input.replayIndex,
  };
}

function buildFixture(input: {
  readonly startingClass: string;
  readonly constitutionScore: number;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((advancement) => ({
        classUnitId: classUnitId(advancement),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: input.constitutionScore,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function normalizeHitPointMaximumQuintState(
  raw: unknown,
): HitPointMaximumProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Hit Point maximum state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastResult: scenarioField(state["qLastResult"]),
    normalHitPointMaximum: numberFromQuintInt(
      state["qNormalHitPointMaximum"],
      "qNormalHitPointMaximum",
    ),
    effectiveHitPointMaximum: numberFromQuintInt(
      state["qEffectiveHitPointMaximum"],
      "qEffectiveHitPointMaximum",
    ),
    hitDiceTotal: numberFromQuintInt(state["qHitDiceTotal"], "qHitDiceTotal"),
    hitPointMaximumReduction: numberFromQuintInt(
      state["qHitPointMaximumReduction"],
      "qHitPointMaximumReduction",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareHitPointMaximumState(
  runtime: HitPointMaximumProjection,
  quint: HitPointMaximumProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): HitPointMaximumScenario {
  if (typeof raw !== "string") {
    throw new Error(`Unknown Hit Point maximum scenario ${String(raw)}.`);
  }
  const scenario = hitPointMaximumScenarios.find(
    (candidate) => candidate === raw,
  );
  if (scenario !== undefined) return scenario;
  throw new Error(`Unknown Hit Point maximum scenario ${String(raw)}.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
