// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B4-CLASS-FEATURE-IDENTITY-BATCH-1 bard_jack_of_all_trades cleric_life_domain_spells druid_circle_of_the_land_spells
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 bard_jack_of_all_trades doProjectBardJackOfAllTrades
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 cleric_life_domain_spells doProjectClericLifeDomainSpells
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 druid_circle_of_the_land_spells doProjectDruidCircleLandSpells
import * as path from "node:path";

import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetId,
  createFreshCharacterSheet,
} from "./index.ts";

const TASK_ID = "B4-CLASS-FEATURE-IDENTITY-BATCH-1";
const BARD_JACK_OF_ALL_TRADES_UNIT_ID = "bard_jack_of_all_trades";
const CLERIC_LIFE_DOMAIN_SPELLS_UNIT_ID = "cleric_life_domain_spells";
const DRUID_CIRCLE_LAND_SPELLS_UNIT_ID = "druid_circle_of_the_land_spells";
const CLERIC_LIFE_DOMAIN_LEVEL_3_EXPECTED_SPELL_ID = "aid";
const DRUID_CIRCLE_LAND_TEMPERATE_EXPECTED_SPELL_ID = "misty_step";
const DRUID_WILD_SHAPE_KNOWN_FORM_STAT_BLOCK_IDS = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
] as const;

const classFeatureSelectedIdentityResults = [
  "init",
  "bard-jack-of-all-trades",
  "cleric-life-domain-spells",
  "druid-circle-land-spells",
] as const;
type ClassFeatureSelectedIdentityResult =
  (typeof classFeatureSelectedIdentityResults)[number];
type ClassFeatureSelectedIdentityUnitId =
  | typeof BARD_JACK_OF_ALL_TRADES_UNIT_ID
  | typeof CLERIC_LIFE_DOMAIN_SPELLS_UNIT_ID
  | typeof DRUID_CIRCLE_LAND_SPELLS_UNIT_ID;
type ClassFeatureSelectedIdentityProjection = {
  readonly lastResult: ClassFeatureSelectedIdentityResult;
  readonly featureUnitId: ClassFeatureSelectedIdentityUnitId | "none";
  readonly spellcastingSourceUnitId: UnitRecord["id"] | "none";
  readonly expectedSpellPresent: boolean;
  readonly spellCount: number;
  readonly abilityCheckBonus: number;
  readonly land: "temperate" | "none";
  readonly accepted: boolean;
};
type ClassFeatureSelectedIdentityDriverAction = Exclude<
  keyof typeof classFeatureSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ClassFeatureSelectedIdentityDriverAction[];
  readonly expected: ClassFeatureSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: typeof TASK_ID;
  readonly unitId: ClassFeatureSelectedIdentityUnitId;
  readonly actions: readonly ClassFeatureSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const classFeatureSelectedIdentityDriverSchema = {
  init: {},
  doProjectBardJackOfAllTrades: {},
  doProjectClericLifeDomainSpells: {},
  doProjectDruidCircleLandSpells: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet class-feature selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "bard_jack_of_all_trades",
    actions: ["doProjectBardJackOfAllTrades"],
    sequences: [
      {
        name: "selected-bard-jack-of-all-trades-projects-half-proficiency",
        actions: ["doProjectBardJackOfAllTrades"],
        expected: bardJackOfAllTradesProjection(),
      },
    ],
  },
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "cleric_life_domain_spells",
    actions: ["doProjectClericLifeDomainSpells"],
    sequences: [
      {
        name: "selected-cleric-life-domain-spells-project-prepared-access",
        actions: ["doProjectClericLifeDomainSpells"],
        expected: clericLifeDomainSpellsProjection(),
      },
    ],
  },
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "druid_circle_of_the_land_spells",
    actions: ["doProjectDruidCircleLandSpells"],
    sequences: [
      {
        name: "selected-druid-circle-land-spells-project-selected-land-access",
        actions: ["doProjectDruidCircleLandSpells"],
        expected: druidCircleLandSpellsProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const classFeatureSelectedIdentityStateCheck = stateCheck(
  normalizeClassFeatureSelectedIdentityQuintState,
  compareClassFeatureSelectedIdentityState,
);

describe("Character Sheet class-feature selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ClassFeatureSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createClassFeatureSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet class-feature selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet class-feature selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet class-feature selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-class-feature-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createClassFeatureSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: classFeatureSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createClassFeatureSelectedIdentityDriver() {
  return defineDriver(classFeatureSelectedIdentityDriverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectBardJackOfAllTrades: () => {
        projection = bardJackOfAllTradesProjection();
      },
      doProjectClericLifeDomainSpells: () => {
        projection = clericLifeDomainSpellsProjection();
      },
      doProjectDruidCircleLandSpells: () => {
        projection = druidCircleLandSpellsProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): ClassFeatureSelectedIdentityProjection {
  return {
    lastResult: "init",
    featureUnitId: "none",
    spellcastingSourceUnitId: "none",
    expectedSpellPresent: false,
    spellCount: 0,
    abilityCheckBonus: 0,
    land: "none",
    accepted: false,
  };
}

function bardJackOfAllTradesProjection(): ClassFeatureSelectedIdentityProjection {
  const result = requireRight(
    characterSheetAbilityCheckProficiencyBonus({
      build: classBuild({ startingClass: "class_bard", totalLevel: 2 }),
      unitLibrary,
      skill: "performance",
      otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
    }),
  );
  if (result.tag !== "jackOfAllTrades") {
    throw new Error("Expected Jack of All Trades ability check projection.");
  }
  return {
    lastResult: "bard-jack-of-all-trades",
    featureUnitId: expectedClassFeatureUnitId(
      result.sourceUnitId,
      BARD_JACK_OF_ALL_TRADES_UNIT_ID,
    ),
    spellcastingSourceUnitId: "none",
    expectedSpellPresent: false,
    spellCount: 0,
    abilityCheckBonus: result.bonus,
    land: "none",
    accepted: true,
  };
}

function clericLifeDomainSpellsProjection(): ClassFeatureSelectedIdentityProjection {
  const access = requiredPreparedSpellAccess(
    classBuild({
      startingClass: "class_cleric",
      totalLevel: 3,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: "class_cleric",
          unitId: "subclass_cleric_life_domain",
        },
      ],
    }),
    CLERIC_LIFE_DOMAIN_SPELLS_UNIT_ID,
  );
  return {
    lastResult: "cleric-life-domain-spells",
    featureUnitId: expectedClassFeatureUnitId(
      access.sourceUnitId,
      CLERIC_LIFE_DOMAIN_SPELLS_UNIT_ID,
    ),
    spellcastingSourceUnitId: "none",
    expectedSpellPresent: access.spellIds.includes(
      CLERIC_LIFE_DOMAIN_LEVEL_3_EXPECTED_SPELL_ID,
    ),
    spellCount: access.spellIds.length,
    abilityCheckBonus: 0,
    land: "none",
    accepted: true,
  };
}

function druidCircleLandSpellsProjection(): ClassFeatureSelectedIdentityProjection {
  const sheet = requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:b4-druid-circle-land"),
      build: druidCircleLandBuild(),
      maximumHp: Hp(18),
      currentHp: Hp(18),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds:
        DRUID_WILD_SHAPE_KNOWN_FORM_STAT_BLOCK_IDS,
      druidCircleLand: { land: "temperate" },
    }),
  );
  const access = requireDefined(
    requireRight(
      characterSheetDruidCircleLandPreparedSpellAccess({
        sheet,
        unitLibrary,
      }),
    ),
    "Expected Circle of the Land prepared Spell Access.",
  );
  return {
    lastResult: "druid-circle-land-spells",
    featureUnitId: expectedClassFeatureUnitId(
      access.sourceUnitId,
      DRUID_CIRCLE_LAND_SPELLS_UNIT_ID,
    ),
    spellcastingSourceUnitId: access.spellcastingSourceUnitId,
    expectedSpellPresent: access.spellIds.includes(
      DRUID_CIRCLE_LAND_TEMPERATE_EXPECTED_SPELL_ID,
    ),
    spellCount: access.spellIds.length,
    abilityCheckBonus: 0,
    land: expectedTemperateLand(access.land),
    accepted: true,
  };
}

function requiredPreparedSpellAccess(
  build: CharacterBuild,
  sourceUnitId: ClassFeatureSelectedIdentityUnitId,
): ReturnType<
  typeof characterSheetClassFeaturePreparedSpellAccessesForBuild
>[number] {
  const access = characterSheetClassFeaturePreparedSpellAccessesForBuild({
    build,
    unitLibrary,
  }).find((candidate) => candidate.sourceUnitId === sourceUnitId);
  if (access !== undefined) return access;
  throw new Error(`Expected prepared Spell Access from ${sourceUnitId}.`);
}

function expectedClassFeatureUnitId(
  actual: UnitRecord["id"],
  expected: ClassFeatureSelectedIdentityUnitId,
): ClassFeatureSelectedIdentityUnitId {
  if (actual === expected) return expected;
  throw new Error(`Expected class-feature Unit ${expected}, received ${actual}.`);
}

function expectedTemperateLand(actual: string): "temperate" {
  if (actual === "temperate") return actual;
  throw new Error(`Expected Circle of the Land choice temperate, got ${actual}.`);
}

function druidCircleLandBuild(): CharacterBuild {
  return {
    ...classBuild({
      startingClass: "class_druid",
      totalLevel: 3,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: "class_druid",
          unitId: "subclass_druid_circle_of_the_land",
        },
      ],
    }),
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "druid_druidic",
        language: "Druidic",
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_druid",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 4 }],
        },
      },
    },
  };
}

function classBuild(input: {
  readonly startingClass: UnitRecord["id"];
  readonly totalLevel: 2 | 3;
  readonly features?: CharacterBuild["features"];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: Array.from({ length: input.totalLevel - 1 }, () => ({
        classUnitId: classUnitId(input.startingClass),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
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
    features: input.features ?? [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function normalizeClassFeatureSelectedIdentityQuintState(
  raw: unknown,
): ClassFeatureSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: resultField(state["qLastResult"]),
    featureUnitId: featureUnitIdField(state["qFeatureUnitId"]),
    spellcastingSourceUnitId: stringField(
      state["qSpellcastingSourceUnitId"],
      "qSpellcastingSourceUnitId",
    ),
    expectedSpellPresent: booleanField(
      state["qExpectedSpellPresent"],
      "qExpectedSpellPresent",
    ),
    spellCount: numberFromQuintInt(state["qSpellCount"], "qSpellCount"),
    abilityCheckBonus: numberFromQuintInt(
      state["qAbilityCheckBonus"],
      "qAbilityCheckBonus",
    ),
    land: landField(state["qLand"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
  };
}

function compareClassFeatureSelectedIdentityState(
  runtime: ClassFeatureSelectedIdentityProjection,
  quint: ClassFeatureSelectedIdentityProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function resultField(raw: unknown): ClassFeatureSelectedIdentityResult {
  if (
    raw === "init" ||
    raw === "bard-jack-of-all-trades" ||
    raw === "cleric-life-domain-spells" ||
    raw === "druid-circle-land-spells"
  ) {
    return raw;
  }
  throw new Error(`Unknown class-feature selected identity result ${String(raw)}.`);
}

function featureUnitIdField(
  raw: unknown,
): ClassFeatureSelectedIdentityProjection["featureUnitId"] {
  if (
    raw === "none" ||
    raw === BARD_JACK_OF_ALL_TRADES_UNIT_ID ||
    raw === CLERIC_LIFE_DOMAIN_SPELLS_UNIT_ID ||
    raw === DRUID_CIRCLE_LAND_SPELLS_UNIT_ID
  ) {
    return raw;
  }
  throw new Error(
    `Unknown class-feature selected identity Unit id ${String(raw)}.`,
  );
}

function landField(raw: unknown): "temperate" | "none" {
  if (raw === "temperate" || raw === "none") return raw;
  throw new Error(`Unknown Circle of the Land choice ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint class-feature selected identity state.");
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

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected boolean field ${field}.`);
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

function requireDefined<T>(value: T, message: string): NonNullable<T> {
  if (value !== undefined && value !== null) return value;
  throw new Error(message);
}
