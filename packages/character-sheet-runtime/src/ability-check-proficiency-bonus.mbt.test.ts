// KERNEL-COVERAGE: parity-witness SHEET.ABILITY_CHECK.PROFICIENCY_BONUS
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { Skill } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  characterSheetAbilityCheckProficiencyBonus,
  type CharacterSheetAbilityCheckProficiencyBonus,
  type CharacterSheetAbilityCheckOtherProficiencyBonusState,
} from "./index.ts";

const abilityCheckProficiencyBonusScenarios = [
  "init",
  "jack-of-all-trades-level-two",
  "jack-of-all-trades-rounded-down",
  "skill-proficiency",
  "expertise",
  "other-proficiency-bonus-applies",
  "missing-bard-level-two",
] as const;
type AbilityCheckProficiencyBonusScenario =
  (typeof abilityCheckProficiencyBonusScenarios)[number];
const abilityCheckProficiencyBonusReplayStepCount =
  abilityCheckProficiencyBonusScenarios.length - 1;

type AbilityCheckProficiencyBonusProjection = {
  readonly lastResult: AbilityCheckProficiencyBonusScenario;
  readonly projectionTag: CharacterSheetAbilityCheckProficiencyBonus["tag"];
  readonly sourceUnitId: string;
  readonly skill: Skill | "none";
  readonly bonus: number;
  readonly replayIndex: number;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Ability Check Proficiency Bonus Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const driverSchema = {
  init: {},
  doProjectJackOfAllTradesLevelTwo: {},
  doProjectJackOfAllTradesRoundedDown: {},
  doProjectSkillProficiency: {},
  doProjectExpertise: {},
  doRejectOtherProficiencyBonus: {},
  doRejectMissingBardLevelTwo: {},
  step: {},
} as const;

function createAbilityCheckProficiencyBonusDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectJackOfAllTradesLevelTwo: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "jack-of-all-trades-level-two",
          build: bardAbilityCheckBuild({ totalLevel: 2 }),
          replayIndex: 1,
        });
      },
      doProjectJackOfAllTradesRoundedDown: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "jack-of-all-trades-rounded-down",
          build: bardAbilityCheckBuild({ totalLevel: 5 }),
          replayIndex: 2,
        });
      },
      doProjectSkillProficiency: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "skill-proficiency",
          build: bardAbilityCheckBuild({
            totalLevel: 5,
            proficiencyChoices: [{ kind: "skill", skill: "performance" }],
          }),
          replayIndex: 3,
        });
      },
      doProjectExpertise: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "expertise",
          build: bardAbilityCheckBuild({
            totalLevel: 5,
            proficiencyChoices: [
              { kind: "skill_expertise", skill: "performance" },
            ],
          }),
          replayIndex: 4,
        });
      },
      doRejectOtherProficiencyBonus: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "other-proficiency-bonus-applies",
          build: bardAbilityCheckBuild({ totalLevel: 5 }),
          otherProficiencyBonus:
            CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
          replayIndex: 5,
        });
      },
      doRejectMissingBardLevelTwo: () => {
        projection = projectAbilityCheckProficiencyBonus({
          lastResult: "missing-bard-level-two",
          build: bardAbilityCheckBuild({ totalLevel: 1 }),
          replayIndex: 6,
        });
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const abilityCheckProficiencyBonusStateCheck = stateCheck(
  normalizeAbilityCheckProficiencyBonusQuintState,
  compareAbilityCheckProficiencyBonusState,
);

describe("Character Sheet Ability Check Proficiency Bonus deterministic QNT replay", () => {
  it("replays skill proficiency, Expertise, Jack of All Trades, and exclusion projections", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-ability-check-proficiency-bonus.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAbilityCheckProficiencyBonusDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: abilityCheckProficiencyBonusReplayStepCount,
      stateCheck: abilityCheckProficiencyBonusStateCheck,
    });
  }, 120_000);
});

function initialProjection(): AbilityCheckProficiencyBonusProjection {
  return {
    lastResult: "init",
    projectionTag: "none",
    sourceUnitId: "none",
    skill: "none",
    bonus: 0,
    replayIndex: 0,
  };
}

function projectAbilityCheckProficiencyBonus(input: {
  readonly lastResult: Exclude<AbilityCheckProficiencyBonusScenario, "init">;
  readonly build: CharacterBuild;
  readonly otherProficiencyBonus?: CharacterSheetAbilityCheckOtherProficiencyBonusState;
  readonly replayIndex: number;
}): AbilityCheckProficiencyBonusProjection {
  const skill = "performance";
  const result = requireRight(
    characterSheetAbilityCheckProficiencyBonus({
      build: input.build,
      unitLibrary,
      skill,
      otherProficiencyBonus:
        input.otherProficiencyBonus ??
        CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
    }),
  );

  return {
    lastResult: input.lastResult,
    projectionTag: result.tag,
    sourceUnitId:
      result.tag === "jackOfAllTrades" ? result.sourceUnitId : "none",
    skill: result.tag === "none" ? skill : result.skill,
    bonus: result.bonus,
    replayIndex: input.replayIndex,
  };
}

function bardAbilityCheckBuild(input: {
  readonly totalLevel: 1 | 2 | 5;
  readonly proficiencyChoices?: CharacterBuild["proficiencyChoices"];
}): CharacterBuild {
  return {
    ...baseBuild({
      startingClass: "class_bard",
      advancements: Array.from(
        { length: input.totalLevel - 1 },
        () => "class_bard",
      ),
    }),
    proficiencyChoices: input.proficiencyChoices ?? [],
  };
}

function baseBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
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
        con: 13,
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

function normalizeAbilityCheckProficiencyBonusQuintState(
  raw: unknown,
): AbilityCheckProficiencyBonusProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: scenarioField(state["qLastResult"]),
    projectionTag: projectionTagField(state["qProjectionTag"]),
    sourceUnitId: stringField(state["qSourceUnitId"], "qSourceUnitId"),
    skill: skillField(state["qSkill"]),
    bonus: numberFromQuintInt(state["qBonus"], "qBonus"),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareAbilityCheckProficiencyBonusState(
  runtime: AbilityCheckProficiencyBonusProjection,
  quint: AbilityCheckProficiencyBonusProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): AbilityCheckProficiencyBonusScenario {
  if (typeof raw === "string" && isAbilityCheckProficiencyBonusScenario(raw)) {
    return raw;
  }
  throw new Error(
    `Unknown Ability Check Proficiency Bonus scenario ${String(raw)}.`,
  );
}

function isAbilityCheckProficiencyBonusScenario(
  raw: string,
): raw is AbilityCheckProficiencyBonusScenario {
  return abilityCheckProficiencyBonusScenarios.some(
    (scenario) => scenario === raw,
  );
}

function projectionTagField(
  raw: unknown,
): CharacterSheetAbilityCheckProficiencyBonus["tag"] {
  if (
    raw === "none" ||
    raw === "skillProficiency" ||
    raw === "expertise" ||
    raw === "jackOfAllTrades"
  ) {
    return raw;
  }
  throw new Error(
    `Unknown Ability Check proficiency projection tag ${String(raw)}.`,
  );
}

function skillField(raw: unknown): Skill | "none" {
  if (raw === "none" || raw === "performance") return raw;
  throw new Error(`Unknown Ability Check skill ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Ability Check Proficiency Bonus state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Expected string field ${field}.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function requireRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isRight(result)) return result.right;
  const left = result.left;
  if (
    left !== null &&
    typeof left === "object" &&
    "message" in left &&
    typeof left.message === "string"
  ) {
    throw new Error(left.message);
  }
  throw new Error(JSON.stringify(left));
}
