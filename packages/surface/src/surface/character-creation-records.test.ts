import { Either } from "effect";
import { describe, expect, test } from "vitest";

import backgroundSoldierInput from "../../content/background_soldier.json";
import classFighterInput from "../../content/class_fighter.json";
import classWizardInput from "../../content/class_wizard.json";
import fighterTacticalMindInput from "../../content/fighter_tactical_mind.json";
import rogueCunningActionInput from "../../content/rogue_cunning_action.json";
import speciesOrcInput from "../../content/species_orc.json";
import wizardRitualAdeptInput from "../../content/wizard_ritual_adept.json";
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
          { level: 1, unitId: "fighter_weapon_mastery" },
          { level: 2, unitId: "fighter_action_surge" },
          { level: 2, unitId: "fighter_tactical_mind" },
        ]),
      },
    });
  });

  test("decodes and reads Wizard spellcasting creation facts", () => {
    const classRecord = decodeClassRecordSync(classWizardInput);
    const unit = decodeUnitRecordSync(classWizardInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_wizard",
        className: "wizard",
        hitPointDie: 6,
        armorTraining: [],
        savingThrowProficiencies: ["int", "wis"],
        skillProficiencyChoice: {
          choose: 2,
          options: [
            "arcana",
            "history",
            "insight",
            "investigation",
            "medicine",
            "nature",
            "religion",
          ],
        },
        featureGrants: [
          { level: 1, unitId: "wizard_ritual_adept" },
          { level: 1, unitId: "wizard_arcane_recovery" },
        ],
        startingEquipment: expect.arrayContaining([
          {
            coinsGp: 5,
            id: "option_a",
            items: [
              { itemName: "Dagger", kind: "draft_owned_item", quantity: 2 },
              {
                itemName: "Arcane Focus (Quarterstaff)",
                kind: "draft_owned_item",
              },
              { itemName: "Robe", kind: "draft_owned_item" },
              { itemName: "Spellbook", kind: "draft_owned_item" },
              { itemName: "Scholar's Pack", kind: "draft_owned_item" },
            ],
            kind: "item_bundle",
          },
          {
            coinsGp: 55,
            id: "option_b",
            kind: "coin_grant",
          },
        ]),
        spellcasting: {
          kind: "wizard_spellcasting_creation",
          spellcastingAbility: "int",
          cantripAccess: {
            choose: 3,
            kind: "known_cantrips",
            spellIds: ["light", "fire_bolt", "ray_of_frost"],
          },
          spellbookAccess: {
            choose: 6,
            kind: "spellbook",
            spells: [
              { spellId: "detect_magic", spellLevel: 1 },
              { spellId: "mage_armor", spellLevel: 1 },
              { spellId: "magic_missile", spellLevel: 1 },
              { spellId: "shield", spellLevel: 1 },
              { spellId: "sleep", spellLevel: 1 },
              { spellId: "thunderwave", spellLevel: 1 },
            ],
          },
          preparedAccess: {
            choose: 4,
            kind: "prepared_from_spellbook",
            spellIds: ["detect_magic", "mage_armor", "magic_missile", "sleep"],
          },
          spellSlotProjection: {
            kind: "leveled_spell_slots",
            resetCadence: { kind: "long_rest" },
            slots: [{ count: 2, spellLevel: 1 }],
          },
          spellcastingFocuses: ["arcane_focus", "spellbook"],
        },
      },
    });
  });

  test("decodes Rogue Cunning Action as alternate Bonus Action cost facts", () => {
    const unit = decodeUnitRecordSync(rogueCunningActionInput);

    expect(unit).toMatchObject({
      id: "rogue_cunning_action",
      kind: "class_feature",
      className: "rogue",
      acquiredAtLevel: 2,
      mechanics: {
        family: "alternate_action_cost",
        from: {
          kind: "standard_action",
          actions: ["dash", "disengage", "hide"],
        },
        to: {
          kind: "bonus_action",
        },
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

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWizardInput,
          spellcasting: {
            ...classWizardInput.spellcasting,
            preparedAccess: {
              ...classWizardInput.spellcasting.preparedAccess,
              spellIds: ["magic_missile", "shield"],
            },
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWizardInput,
          spellcasting: {
            ...classWizardInput.spellcasting,
            spellbookAccess: {
              ...classWizardInput.spellcasting.spellbookAccess,
              spells: [
                ...classWizardInput.spellcasting.spellbookAccess.spells,
                { spellId: "scorching_ray", spellLevel: 2 },
              ],
            },
            preparedAccess: {
              ...classWizardInput.spellcasting.preparedAccess,
              spellIds: ["scorching_ray"],
            },
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWizardInput,
          spellcasting: {
            ...classWizardInput.spellcasting,
            cantripAccess: {
              ...classWizardInput.spellcasting.cantripAccess,
              spellIds: ["light", "light", "ray_of_frost"],
            },
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWizardInput,
          spellcasting: {
            ...classWizardInput.spellcasting,
            preparedAccess: {
              ...classWizardInput.spellcasting.preparedAccess,
              choose: 5,
            },
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          spellcasting: classWizardInput.spellcasting,
        }),
      ),
    ).toBe(true);

    const { spellcasting: _spellcasting, ...wizardWithoutSpellcasting } =
      classWizardInput;
    expect(
      Either.isLeft(decodeUnitRecordEither(wizardWithoutSpellcasting)),
    ).toBe(true);

    const { armorTraining: _armorTraining, ...fighterWithoutArmorTraining } =
      classFighterInput;
    expect(
      Either.isLeft(decodeUnitRecordEither(fighterWithoutArmorTraining)),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...fighterTacticalMindInput,
          className: "wizard",
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...wizardRitualAdeptInput,
          className: "fighter",
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
