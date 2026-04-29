import { Either } from "effect";
import { describe, expect, test } from "vitest";

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

const srdProvenance = {
  kind: "srd-5.2.1",
  section: "Character-Creation.md; Classes/Fighter.md; Character-Origins.md",
} as const;

const fighterInput = {
  id: "class_fighter",
  kind: "class",
  name: "Fighter",
  provenance: {
    ...srdProvenance,
    section: "Classes/Fighter.md:3-13,17-20,29-31,56-74",
  },
  description:
    "Minimum SRD Fighter class creation facts for a level-1 character.",
  className: "fighter",
  hitPointDie: 10,
  savingThrowProficiencies: ["str", "con"],
  skillProficiencyChoice: {
    choose: 2,
    options: [
      "acrobatics",
      "animal_handling",
      "athletics",
      "history",
      "insight",
      "intimidation",
      "persuasion",
      "perception",
      "survival",
    ],
  },
  weaponProficiencies: ["simple", "martial"],
  armorTraining: ["light", "medium", "heavy", "shield"],
  startingEquipment: [{ id: "option_c", kind: "coin_grant", coinsGp: 155 }],
  featureGrants: [
    { unitId: "fighter_fighting_style_l1", level: 1 },
    { unitId: "fighter_second_wind", level: 1 },
    { unitId: "fighter_weapon_mastery_l1", level: 1 },
  ],
  weaponMastery: {
    level: 1,
    choose: 3,
    eligibleWeapons: ["simple", "martial"],
  },
} as const;

const soldierInput = {
  id: "background_soldier",
  kind: "background",
  name: "Soldier",
  provenance: {
    ...srdProvenance,
    section: "Character-Origins.md:11-29,57-63",
  },
  description:
    "Minimum SRD Soldier background facts for ability scores, proficiencies, feat, and equipment.",
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
  toolProficiency: {
    kind: "tool_category_choice",
    category: "gaming_set",
    choose: 1,
  },
  startingEquipment: [
    {
      id: "option_a",
      kind: "item_bundle",
      items: [
        { kind: "unit_ref", unitId: "weapon_spear" },
        { kind: "unit_ref", unitId: "weapon_shortbow" },
        { kind: "unit_ref", unitId: "ammunition_arrow", quantity: 20 },
        { kind: "selected_tool_proficiency" },
        { kind: "unit_ref", unitId: "equipment_healers_kit" },
        { kind: "unit_ref", unitId: "equipment_quiver" },
        { kind: "unit_ref", unitId: "equipment_travelers_clothes" },
      ],
      coinsGp: 14,
    },
    { id: "option_b", kind: "coin_grant", coinsGp: 50 },
  ],
} as const;

const orcInput = {
  id: "species_orc",
  kind: "species",
  name: "Orc",
  provenance: {
    ...srdProvenance,
    section: "Character-Creation.md:87-91; Character-Origins.md:245-259",
  },
  description: "Minimum SRD Orc aggregate species facts.",
  species: "orc",
  creatureType: "humanoid",
  size: { kind: "fixed", size: "medium" },
  speed: { walkFeet: 30 },
  traits: {
    adrenalineRush: "orc_adrenaline_rush",
    darkvision: "orc_darkvision",
    relentlessEndurance: "orc_relentless_endurance",
  },
} as const;

describe("character-creation Surface records", () => {
  test("decodes and reads Fighter class creation facts", () => {
    const classRecord = decodeClassRecordSync(fighterInput);
    const unit = decodeUnitRecordSync(fighterInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_fighter",
        className: "fighter",
        hitPointDie: 10,
        skillProficiencyChoice: { choose: 2 },
        weaponMastery: { level: 1, choose: 3 },
      },
    });
  });

  test("decodes and reads Soldier background creation facts", () => {
    const backgroundRecord = decodeBackgroundRecordSync(soldierInput);
    const unit = decodeUnitRecordSync(soldierInput);
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
    const speciesRecord = decodeSpeciesRecordSync(orcInput);
    const unit = decodeUnitRecordSync(orcInput);
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
          ...fighterInput,
          skillProficiencyChoice: {
            ...fighterInput.skillProficiencyChoice,
            options: [],
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...orcInput,
          size: { kind: "fixed", size: "colossal" },
        }),
      ),
    ).toBe(true);
  });

  test("rejects mixed-species Orc trait aggregates at the decode boundary", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...orcInput,
          traits: {
            ...orcInput.traits,
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
          ...fighterInput,
          hitPointDie: -10,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...fighterInput,
          skillProficiencyChoice: {
            ...fighterInput.skillProficiencyChoice,
            choose: 0,
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...soldierInput,
          abilityScoreIncrease: {
            ...soldierInput.abilityScoreIncrease,
            abilities: ["str", "str", "con"],
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...soldierInput,
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
