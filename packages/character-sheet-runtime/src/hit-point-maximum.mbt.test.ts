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
  readonly outcome: HitPointMaximumScenario;
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
          outcome: "fighter-level-one",
          build: buildFixture({
            startingClass: "class_fighter",
            constitutionScore: 13,
          }),
          replayIndex: 1,
        });
      },
      doProjectFighterLevelTwo: () => {
        projection = projectHitPointMaximum({
          outcome: "fighter-level-two",
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
          outcome: "wizard-fighter-multiclass",
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
          outcome: "minimum-higher-level-gain",
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
          outcome: "sorcerer-draconic-resilience",
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
          outcome: "reduced-effective-maximum",
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
    outcome: "init",
    build: buildFixture({
      startingClass: "class_fighter",
      constitutionScore: 10,
    }),
    replayIndex: 0,
  });
}

function projectHitPointMaximum(input: {
  readonly outcome: HitPointMaximumScenario;
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
      characterId: characterSheetId(`character:hp-maximum:${input.outcome}`),
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
    outcome: input.outcome,
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
  const root: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const state = recordField(root, "qState");
  return {
    outcome: outcomeField(state["outcome"]),
    normalHitPointMaximum: numberFromQuintInt(
      state["normalHitPointMaximum"],
      "qState.normalHitPointMaximum",
    ),
    effectiveHitPointMaximum: numberFromQuintInt(
      state["effectiveHitPointMaximum"],
      "qState.effectiveHitPointMaximum",
    ),
    hitDiceTotal: numberFromQuintInt(
      state["hitDiceTotal"],
      "qState.hitDiceTotal",
    ),
    hitPointMaximumReduction: numberFromQuintInt(
      state["hitPointMaximumReduction"],
      "qState.hitPointMaximumReduction",
    ),
    replayIndex: numberFromQuintInt(state["replayIndex"], "qState.replayIndex"),
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

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

const qntOutcomeByVariant = {
  CharacterSheetHitPointMaximumInit: "init",
  CharacterSheetHitPointMaximumFighterLevelOne: "fighter-level-one",
  CharacterSheetHitPointMaximumFighterLevelTwo: "fighter-level-two",
  CharacterSheetHitPointMaximumWizardFighterMulticlass:
    "wizard-fighter-multiclass",
  CharacterSheetHitPointMaximumMinimumHigherLevelGain:
    "minimum-higher-level-gain",
  CharacterSheetHitPointMaximumSorcererDraconicResilience:
    "sorcerer-draconic-resilience",
  CharacterSheetHitPointMaximumReducedEffectiveMaximum:
    "reduced-effective-maximum",
} as const;

function outcomeField(
  raw: unknown,
): (typeof qntOutcomeByVariant)[keyof typeof qntOutcomeByVariant] {
  const tag = nullaryVariantTag(raw, "qState.outcome");
  const outcome = Object.entries(qntOutcomeByVariant).find(
    ([variant]) => variant === tag,
  )?.[1];
  if (outcome !== undefined) return outcome;
  throw new Error(`Unknown Quint outcome variant ${tag}.`);
}

function nullaryVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const record = Object.fromEntries(Object.entries(raw));
    const tag = record["tag"];
    if (typeof tag === "string") return tag;
  }
  throw new Error(`Expected Quint variant field ${field}.`);
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}
