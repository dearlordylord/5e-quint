import { Either } from "effect";
import { describe, expect, test } from "vitest";

import backgroundSoldierInput from "../../content/background_soldier.json";
import classFighterInput from "../../content/class_fighter.json";
import speciesOrcInput from "../../content/species_orc.json";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readOrcSpeciesCreationFacts,
} from "./character-creation-readers.ts";
import {
  decodeBackgroundRecordSync,
  decodeClassRecordSync,
  decodeSpeciesRecordSync,
  decodeUnitRecordEither,
  decodeUnitRecordSync,
} from "./schema.ts";

describe("character-creation Surface records", () => {
  test("decodes and reads Fighter class creation facts", () => {
    const classRecord = decodeClassRecordSync(classFighterInput);
    const unit = decodeUnitRecordSync(classFighterInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_fighter",
        className: "fighter",
        hitPointDie: 10,
        skillProficiencyChoice: { choose: 2 },
        featureGrants: expect.arrayContaining([
          { level: 1, unitId: "fighter_weapon_mastery_l1" },
        ]),
      },
    });
  });

  test("decodes and reads Soldier background creation facts", () => {
    const backgroundRecord = decodeBackgroundRecordSync(backgroundSoldierInput);
    const unit = decodeUnitRecordSync(backgroundSoldierInput);
    const result = readBackgroundCreationFacts(unit);

    expect(backgroundRecord.kind).toBe("background");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "background_soldier",
        abilityScoreIncrease: {
          abilities: ["str", "dex", "con"],
          methods: [
            {
              kind: "two_scores",
              primaryIncrease: 2,
              secondaryIncrease: 1,
              maxScore: 20,
            },
            {
              kind: "three_scores",
              eachIncrease: 1,
              maxScore: 20,
            },
          ],
        },
        originFeatId: "feat_savage_attacker",
        skillProficiencies: ["athletics", "intimidation"],
        toolProficiency: { kind: "tool_category_choice" },
      },
    });
  });

  test("decodes and reads Orc as one aggregate species record", () => {
    const speciesRecord = decodeSpeciesRecordSync(speciesOrcInput);
    const unit = decodeUnitRecordSync(speciesOrcInput);
    const result = readOrcSpeciesCreationFacts(unit);

    expect(speciesRecord.kind).toBe("species");
    expect(result).toEqual({
      tag: "readable",
      value: {
        recordId: "species_orc",
        species: "orc",
        creatureType: "humanoid",
        size: { kind: "fixed", size: "medium" },
        speed: { walkFeet: 30 },
        traits: {
          adrenalineRush: "orc_adrenaline_rush",
          darkvision: "orc_darkvision",
          relentlessEndurance: "orc_relentless_endurance",
        },
      },
    });
  });

  test("rejects malformed character creation records at the decode boundary", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          skillProficiencyChoice: {
            ...classFighterInput.skillProficiencyChoice,
            options: [],
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...speciesOrcInput,
          size: { kind: "fixed", size: "colossal" },
        }),
      ),
    ).toBe(true);
  });

  test("rejects mixed-species Orc trait aggregates at the decode boundary", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...speciesOrcInput,
          traits: {
            ...speciesOrcInput.traits,
            darkvision: "species_human_resourceful",
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects impossible character creation numbers at the decode boundary", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          hitPointDie: -10,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          skillProficiencyChoice: {
            ...classFighterInput.skillProficiencyChoice,
            choose: 0,
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...backgroundSoldierInput,
          abilityScoreIncrease: {
            ...backgroundSoldierInput.abilityScoreIncrease,
            abilities: ["str", "str", "con"],
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...backgroundSoldierInput,
          startingEquipment: [
            {
              id: "option_b",
              kind: "coin_grant",
              coinsGp: -1,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
