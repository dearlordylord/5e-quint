import { describe, expect, it } from "vitest";
import {
  applyCondition,
  battleAreaId,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  movementFeet,
  testBattleCreatureStateWithConditions,
  testMovementPath,
} from "../battle-runtime.test-support.ts";
import type {
  BattleAreaDifficultTerrainSource,
  BattleMovementFillValueCommon,
  BattleMovementPath,
} from "../battle-state-execution.ts";
import {
  plainStepMovementActivity,
  priceBattleMovementPath,
} from "./movement-path.ts";

// RAW trace: .references/srd-5.2.1/rules-glossary.md#Difficult Terrain,
// #Crawling, #Prone. A cited spell area's Difficult Terrain must match the path
// that crosses it.

const state = fighterVsGoblinBattle();

function fighter() {
  const mover = state.combatants.get(fighterId);
  if (mover === undefined) throw new Error("Expected the Fighter.");
  return mover;
}

function areaDamageSource(
  damageDistanceFeet: number,
  discriminator = "spike-area",
): BattleAreaDifficultTerrainSource {
  return {
    kind: "areaMovementDistanceDamage",
    effectRef: battleEffectExecutionRefForTest(discriminator),
    sourceCombatantId: goblinId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(discriminator),
    areaId: battleAreaId(discriminator),
    damageDistanceFeet: movementFeet(damageDistanceFeet),
  };
}

const AREA_PATH: BattleMovementPath = testMovementPath(
  { distanceFeet: 5 },
  { distanceFeet: 10, difficultTerrain: "areaDifficultTerrain" },
);

function price(
  path: BattleMovementPath,
  sources?: readonly BattleAreaDifficultTerrainSource[],
) {
  const value: BattleMovementFillValueCommon = {
    speedKind: "walk",
    path,
    provokedOpportunityAttacks: [],
    ...(sources === undefined
      ? {}
      : { areaDifficultTerrain: { kind: "areaDifficultTerrain", sources } }),
  };
  return priceBattleMovementPath(state, fighter(), value);
}

describe("movement path pricing", () => {
  it("prices each segment and keeps the spell-area surcharge apart", () => {
    expect(
      price(
        testMovementPath(
          { distanceFeet: 10, activity: "climbing" },
          { distanceFeet: 5, difficultTerrain: "tableTerrain" },
        ),
      ),
    ).toEqual({
      tag: "ok",
      distanceFeet: 15,
      extraCostFeet: 15,
      spellAreaExtraCostFeet: 0,
    });
  });

  it("refuses a segment in a spell area's Difficult Terrain without the area fact", () => {
    expect(price(AREA_PATH)).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining(
        "requires the areaDifficultTerrain fact",
      ),
    });
  });

  it("refuses an area fact with no source", () => {
    expect(price(AREA_PATH, [])).toMatchObject({
      tag: "invalid",
      message: "Area Difficult Terrain movement fact requires a source.",
    });
  });

  it("refuses an area fact that repeats a source", () => {
    expect(
      price(AREA_PATH, [areaDamageSource(5), areaDamageSource(5)]),
    ).toMatchObject({
      tag: "invalid",
      message: "Area Difficult Terrain movement fact repeats a source.",
    });
  });

  it("refuses a damage distance that isn't a positive whole number", () => {
    expect(price(AREA_PATH, [areaDamageSource(0)])).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("must be a positive integer"),
    });
  });

  it("refuses damage distances that together exceed the area distance", () => {
    expect(
      price(AREA_PATH, [
        areaDamageSource(10, "first-area"),
        areaDamageSource(5, "second-area"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("damage distances cannot exceed"),
    });
  });

  it("makes a Prone mover's plain steps crawling and refuses its other steps", () => {
    const prone = testBattleCreatureStateWithConditions(
      fighter(),
      applyCondition(fighter().conditions, "prone"),
    );
    expect(plainStepMovementActivity(fighter())).toBe("ordinary");
    expect(plainStepMovementActivity(prone)).toBe("crawling");
    expect(
      priceBattleMovementPath(state, prone, {
        speedKind: "walk",
        path: testMovementPath({ distanceFeet: 5 }),
        provokedOpportunityAttacks: [],
      }),
    ).toMatchObject({ tag: "invalid" });
  });
});
