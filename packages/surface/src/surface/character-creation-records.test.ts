import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import backgroundAcolyteInput from "../../content/background_acolyte.json";
import backgroundCriminalInput from "../../content/background_criminal.json";
import backgroundSageInput from "../../content/background_sage.json";
import backgroundSoldierInput from "../../content/background_soldier.json";
import classBardInput from "../../content/class_bard.json";
import classClericInput from "../../content/class_cleric.json";
import classDruidInput from "../../content/class_druid.json";
import classFighterInput from "../../content/class_fighter.json";
import classMonkInput from "../../content/class_monk.json";
import classPaladinInput from "../../content/class_paladin.json";
import classRangerInput from "../../content/class_ranger.json";
import classRogueInput from "../../content/class_rogue.json";
import classSorcererInput from "../../content/class_sorcerer.json";
import classWarlockInput from "../../content/class_warlock.json";
import classWizardInput from "../../content/class_wizard.json";
import featMagicInitiateClericInput from "../../content/feat_magic_initiate_cleric.json";
import featMagicInitiateDruidInput from "../../content/feat_magic_initiate_druid.json";
import featMagicInitiateWizardInput from "../../content/feat_magic_initiate_wizard.json";
import fighterTacticalMindInput from "../../content/fighter_tactical_mind.json";
import rogueCunningActionInput from "../../content/rogue_cunning_action.json";
import speciesDragonbornInput from "../../content/species_dragonborn.json";
import speciesDwarfInput from "../../content/species_dwarf.json";
import speciesElfInput from "../../content/species_elf.json";
import speciesGnomeInput from "../../content/species_gnome.json";
import speciesHalflingInput from "../../content/species_halfling.json";
import speciesHumanInput from "../../content/species_human.json";
import speciesGoliathInput from "../../content/species_goliath.json";
import speciesOrcInput from "../../content/species_orc.json";
import speciesTieflingInput from "../../content/species_tiefling.json";
import wizardRitualAdeptInput from "../../content/wizard_ritual_adept.json";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readOrcSpeciesCreationFacts,
  readSpeciesCreationFacts,
} from "./character-creation-readers.ts";
import {
  decodeBackgroundRecordSync,
  decodeClassFeatureRecordSync,
  decodeClassRecordSync,
  decodeFeatRecordSync,
  decodeSpeciesRecordSync,
  decodeUnitRecordEither,
  decodeUnitRecordSync,
  EffectAtomSchema,
} from "./schema.ts";

const classRecordWithSpellcasting = (
  className: string,
  spellcasting: unknown,
) => ({
  ...classWarlockInput,
  className,
  id: `class_${className}`,
  name: className,
  spellcasting,
});

const nonSpellcastingClassRecord = (className: string, input: object) => {
  const { spellcasting: _spellcasting, ...base } = classWarlockInput;
  return {
    ...base,
    className,
    id: `class_${className}`,
    name: className,
    ...input,
  };
};

const listPreparedSpellcasting = (input: {
  readonly className: string;
  readonly spellcastingAbility: "cha" | "wis";
  readonly spellcastingFocus:
    | "arcane_focus"
    | "druidic_focus"
    | "holy_symbol"
    | "musical_instrument";
  readonly preparedChangeOn: "class_level" | "long_rest";
  readonly preparedReplacementCount: 1 | "any";
  readonly preparedCount: number;
  readonly preparedSpells: readonly (
    | string
    | { readonly spellId: string; readonly spellLevel: number }
  )[];
  readonly cantrips?: readonly string[];
  readonly cantripChoose?: number;
}) => ({
  ...(input.cantrips === undefined
    ? {}
    : {
        cantripAccess: {
          changeOn: { count: 1, kind: "class_level" },
          choose: input.cantripChoose ?? input.cantrips.length,
          kind: "known_cantrips_from_class_spell_list",
          spellIds: input.cantrips,
        },
      }),
  kind: "list_prepared_spellcasting_creation",
  featureLevel: 1,
  preparedAccess: {
    changeOn: {
      kind: input.preparedChangeOn,
      replacementCount: input.preparedReplacementCount,
    },
    choose: input.preparedCount,
    kind: "prepared_from_class_spell_list",
    spells: input.preparedSpells.map((spell) =>
      typeof spell === "string" ? { spellId: spell, spellLevel: 1 } : spell,
    ),
  },
  spellSlotProjection: {
    kind: "leveled_spell_slots",
    resetCadence: { kind: "long_rest" },
    slots: [{ count: 2, spellLevel: 1 }],
  },
  spellcastingAbility: input.spellcastingAbility,
  spellcastingFocus: input.spellcastingFocus,
});

describe("character-creation Surface records", () => {
  test("decodes and reads Bard level 4 Ability Score Improvement grant", () => {
    const classRecord = decodeClassRecordSync(classBardInput);
    const unit = decodeUnitRecordSync(classBardInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_bard",
        className: "bard",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "bard_ability_score_improvement_l4" },
        ]),
      },
    });
  });

  test("decodes and reads Cleric level 4 Ability Score Improvement grant", () => {
    const classRecord = decodeClassRecordSync(classClericInput);
    const unit = decodeUnitRecordSync(classClericInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_cleric",
        className: "cleric",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "cleric_ability_score_improvement_l4" },
        ]),
      },
    });
  });

  test("decodes and reads Druid level 4 Ability Score Improvement grant", () => {
    const classRecord = decodeClassRecordSync(classDruidInput);
    const unit = decodeUnitRecordSync(classDruidInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_druid",
        className: "druid",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "druid_ability_score_improvement_l4" },
        ]),
      },
    });
  });

  test("decodes and reads Monk level 4 feature grants", () => {
    const classRecord = decodeClassRecordSync(classMonkInput);
    const unit = decodeUnitRecordSync(classMonkInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_monk",
        className: "monk",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "monk_ability_score_improvement_l4" },
          { level: 4, unitId: "monk_slow_fall" },
        ]),
      },
    });
  });

  test("decodes and reads Ranger level 4 Ability Score Improvement grant", () => {
    const classRecord = decodeClassRecordSync(classRangerInput);
    const unit = decodeUnitRecordSync(classRangerInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_ranger",
        className: "ranger",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "ranger_ability_score_improvement_l4" },
        ]),
      },
    });
  });

  test("decodes and reads Rogue level 4 Ability Score Improvement grant", () => {
    const classRecord = decodeClassRecordSync(classRogueInput);
    const unit = decodeUnitRecordSync(classRogueInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_rogue",
        className: "rogue",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "rogue_ability_score_improvement_l4" },
        ]),
      },
    });
  });

  test("decodes and reads Sorcerer level 4 and 5 feature grants", () => {
    const classRecord = decodeClassRecordSync(classSorcererInput);
    const unit = decodeUnitRecordSync(classSorcererInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_sorcerer",
        className: "sorcerer",
        featureGrants: expect.arrayContaining([
          { level: 4, unitId: "sorcerer_ability_score_improvement_l4" },
          { level: 5, unitId: "sorcerer_sorcerous_restoration" },
        ]),
        spellcasting: expect.objectContaining({
          cantripAccess: expect.objectContaining({
            spellIds: expect.arrayContaining(["fire_bolt"]),
          }),
        }),
      },
    });
  });

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
        primaryAbilities: { abilities: ["str", "dex"], kind: "any_of" },
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
        primaryAbilities: { abilities: ["int"], kind: "all_of" },
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
          { level: 2, unitId: "wizard_scholar" },
          { level: 4, unitId: "wizard_ability_score_improvement_l4" },
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
          featureLevel: 1,
          spellcastingAbility: "int",
          cantripAccess: {
            choose: 3,
            kind: "known_cantrips",
            spellIds: [
              "light",
              "fire_bolt",
              "ray_of_frost",
              "minor_illusion",
              "acid_splash",
              "chill_touch",
              "poison_spray",
              "shocking_grasp",
            ],
          },
          spellbookAccess: {
            choose: 6,
            kind: "spellbook",
            spells: [
              { spellId: "detect_magic", spellLevel: 1 },
              { spellId: "feather_fall", spellLevel: 1 },
              { spellId: "false_life", spellLevel: 1 },
              { spellId: "mage_armor", spellLevel: 1 },
              { spellId: "magic_missile", spellLevel: 1 },
              { spellId: "ray_of_sickness", spellLevel: 1 },
              { spellId: "shield", spellLevel: 1 },
              { spellId: "sleep", spellLevel: 1 },
              { spellId: "thunderwave", spellLevel: 1 },
              { spellId: "burning_hands", spellLevel: 1 },
              { spellId: "chromatic_orb", spellLevel: 1 },
              { spellId: "acid_arrow", spellLevel: 2 },
              { spellId: "continual_flame", spellLevel: 2 },
              { spellId: "darkness", spellLevel: 2 },
              { spellId: "gust_of_wind", spellLevel: 2 },
              { spellId: "mirror_image", spellLevel: 2 },
              { spellId: "misty_step", spellLevel: 2 },
              { spellId: "scorching_ray", spellLevel: 2 },
              { spellId: "shatter", spellLevel: 2 },
            ],
          },
          preparedAccess: {
            choose: 4,
            kind: "prepared_from_spellbook",
            spellIds: [
              "detect_magic",
              "feather_fall",
              "false_life",
              "mage_armor",
              "magic_missile",
              "ray_of_sickness",
              "shield",
              "sleep",
              "thunderwave",
              "burning_hands",
              "chromatic_orb",
              "acid_arrow",
              "continual_flame",
              "darkness",
              "gust_of_wind",
              "mirror_image",
              "misty_step",
              "scorching_ray",
              "shatter",
            ],
          },
          spellSlotProjection: {
            kind: "leveled_spell_slots",
            resetCadence: { kind: "long_rest" },
            slots: [{ count: 2, spellLevel: 1 }],
          },
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 3,
              spellbookSpellCount: 6,
              preparedSpellCount: 4,
              spellSlots: [{ count: 2, spellLevel: 1 }],
            },
            {
              atLevel: 2,
              cantripCount: 3,
              spellbookSpellCount: 8,
              preparedSpellCount: 5,
              spellSlots: [{ count: 3, spellLevel: 1 }],
            },
            {
              atLevel: 3,
              cantripCount: 3,
              spellbookSpellCount: 10,
              preparedSpellCount: 6,
              spellSlots: [
                { count: 4, spellLevel: 1 },
                { count: 2, spellLevel: 2 },
              ],
            },
            {
              atLevel: 4,
              cantripCount: 4,
              spellbookSpellCount: 12,
              preparedSpellCount: 7,
              spellSlots: [
                { count: 4, spellLevel: 1 },
                { count: 3, spellLevel: 2 },
              ],
            },
            {
              atLevel: 5,
              cantripCount: 4,
              spellbookSpellCount: 14,
              preparedSpellCount: 9,
              spellSlots: [
                { count: 4, spellLevel: 1 },
                { count: 3, spellLevel: 2 },
                { count: 2, spellLevel: 3 },
              ],
            },
          ],
          spellcastingFocuses: ["arcane_focus", "spellbook"],
        },
      },
    });
  });

  test("decodes and reads Warlock Pact Magic creation facts", () => {
    const classRecord = decodeClassRecordSync(classWarlockInput);
    const unit = decodeUnitRecordSync(classWarlockInput);
    const result = readClassCreationFacts(unit);

    expect(classRecord.kind).toBe("class");
    expect(result).toMatchObject({
      tag: "readable",
      value: {
        recordId: "class_warlock",
        className: "warlock",
        spellcasting: {
          kind: "pact_magic_spellcasting_creation",
          featureLevel: 1,
          spellcastingAbility: "cha",
          cantripAccess: {
            choose: 2,
            kind: "known_cantrips_from_class_spell_list",
            spellIds: [
              "chill_touch",
              "eldritch_blast",
              "minor_illusion",
              "poison_spray",
              "prestidigitation",
            ],
            changeOn: { count: 1, kind: "class_level" },
          },
          preparedAccess: {
            choose: 2,
            kind: "prepared_from_class_spell_list",
            spells: [
              { spellId: "charm_person", spellLevel: 1 },
              { spellId: "hellish_rebuke", spellLevel: 1 },
              { spellId: "hex", spellLevel: 1 },
              { spellId: "mirror_image", spellLevel: 2 },
              { spellId: "bane", spellLevel: 1 },
              { spellId: "comprehend_languages", spellLevel: 1 },
              { spellId: "detect_magic", spellLevel: 1 },
              { spellId: "expeditious_retreat", spellLevel: 1 },
              { spellId: "protection_from_evil_and_good", spellLevel: 1 },
              { spellId: "unseen_servant", spellLevel: 1 },
              { spellId: "darkness", spellLevel: 2 },
              { spellId: "hold_person", spellLevel: 2 },
              { spellId: "invisibility", spellLevel: 2 },
              { spellId: "misty_step", spellLevel: 2 },
              { spellId: "suggestion", spellLevel: 2 },
            ],
            changeOn: { kind: "class_level", replacementCount: 1 },
          },
          pactSlotProjection: {
            count: 1,
            kind: "pact_slots",
            resetCadence: { kind: "short_or_long_rest" },
            spellLevel: 1,
          },
          pactMagicProgression: expect.arrayContaining([
            {
              atLevel: 1,
              cantripTotal: 2,
              preparedSpellTotal: 2,
              pactSlotCount: 1,
              pactSlotLevel: 1,
            },
            {
              atLevel: 20,
              cantripTotal: 4,
              preparedSpellTotal: 15,
              pactSlotCount: 4,
              pactSlotLevel: 5,
            },
          ]),
          spellcastingFocus: "arcane_focus",
        },
      },
    });
  });

  test("decodes and reads authored SRDINV13 class Spell Access records", () => {
    const cases = [
      {
        input: classBardInput,
        className: "bard",
        hitPointDie: 8,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "bard",
            spellcastingAbility: "cha",
            spellcastingFocus: "musical_instrument",
            preparedChangeOn: "class_level",
            preparedReplacementCount: 1,
            preparedCount: 4,
            preparedSpells: [
              "animal_friendship",
              "charm_person",
              "color_spray",
              "cure_wounds",
              "dissonant_whispers",
              "healing_word",
              "thunderwave",
              { spellId: "aid", spellLevel: 2 },
            ],
            cantrips: ["dancing_lights", "vicious_mockery"],
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 2,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 2,
              preparedSpellCount: 5,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
            {
              atLevel: 3,
              cantripCount: 2,
              preparedSpellCount: 6,
              spellSlots: [
                { spellLevel: 1, count: 4 },
                { spellLevel: 2, count: 2 },
              ],
            },
          ],
        },
      },
      {
        input: classClericInput,
        className: "cleric",
        hitPointDie: 8,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "cleric",
            spellcastingAbility: "wis",
            spellcastingFocus: "holy_symbol",
            preparedChangeOn: "long_rest",
            preparedReplacementCount: "any",
            preparedCount: 4,
            preparedSpells: [
              "bless",
              "cure_wounds",
              "guiding_bolt",
              "shield_of_faith",
              "healing_word",
              "inflict_wounds",
              "sanctuary",
              { spellId: "aid", spellLevel: 2 },
            ],
            cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 3,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 3,
              preparedSpellCount: 5,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
            {
              atLevel: 3,
              cantripCount: 3,
              preparedSpellCount: 6,
              spellSlots: [
                { spellLevel: 1, count: 4 },
                { spellLevel: 2, count: 2 },
              ],
            },
          ],
        },
      },
      {
        input: classDruidInput,
        className: "druid",
        hitPointDie: 8,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "druid",
            spellcastingAbility: "wis",
            spellcastingFocus: "druidic_focus",
            preparedChangeOn: "long_rest",
            preparedReplacementCount: "any",
            preparedCount: 4,
            preparedSpells: [
              "animal_friendship",
              "cure_wounds",
              "entangle",
              "faerie_fire",
              "healing_word",
              "thunderwave",
              { spellId: "aid", spellLevel: 2 },
            ],
            cantrips: [
              "druidcraft",
              "poison_spray",
              "produce_flame",
              "shillelagh",
            ],
            cantripChoose: 2,
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 2,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 2,
              preparedSpellCount: 5,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
            {
              atLevel: 3,
              cantripCount: 2,
              preparedSpellCount: 6,
              spellSlots: [
                { spellLevel: 1, count: 4 },
                { spellLevel: 2, count: 2 },
              ],
            },
          ],
        },
      },
      { input: classMonkInput, className: "monk", hitPointDie: 8 },
      {
        input: classPaladinInput,
        className: "paladin",
        hitPointDie: 10,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "paladin",
            spellcastingAbility: "cha",
            spellcastingFocus: "holy_symbol",
            preparedChangeOn: "long_rest",
            preparedReplacementCount: 1,
            preparedCount: 2,
            preparedSpells: [
              "heroism",
              "searing_smite",
              "bless",
              "command",
              "cure_wounds",
            ],
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 0,
              preparedSpellCount: 2,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 0,
              preparedSpellCount: 3,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 3,
              cantripCount: 0,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
          ],
        },
      },
      {
        input: classRangerInput,
        className: "ranger",
        hitPointDie: 10,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "ranger",
            spellcastingAbility: "wis",
            spellcastingFocus: "druidic_focus",
            preparedChangeOn: "long_rest",
            preparedReplacementCount: 1,
            preparedCount: 2,
            preparedSpells: [
              "animal_friendship",
              "cure_wounds",
              "ensnaring_strike",
              "longstrider",
              "hunters_mark",
            ],
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 0,
              preparedSpellCount: 2,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 0,
              preparedSpellCount: 3,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 3,
              cantripCount: 0,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
          ],
        },
      },
      { input: classRogueInput, className: "rogue", hitPointDie: 8 },
      {
        input: classSorcererInput,
        className: "sorcerer",
        hitPointDie: 6,
        spellcasting: {
          ...listPreparedSpellcasting({
            className: "sorcerer",
            spellcastingAbility: "cha",
            spellcastingFocus: "arcane_focus",
            preparedChangeOn: "class_level",
            preparedReplacementCount: 1,
            preparedCount: 2,
            preparedSpells: [
              "burning_hands",
              "detect_magic",
              "chromatic_orb",
              "false_life",
              "mage_armor",
              "magic_missile",
              "ray_of_sickness",
              "thunderwave",
              { spellId: "alter_self", spellLevel: 2 },
              { spellId: "scorching_ray", spellLevel: 2 },
            ],
            cantrips: [
              "light",
              "prestidigitation",
              "shocking_grasp",
              "sorcerous_burst",
              "fire_bolt",
              "acid_splash",
              "chill_touch",
              "poison_spray",
              "ray_of_frost",
            ],
            cantripChoose: 4,
          }),
          kind: "list_prepared_spellcasting_progression_creation",
          spellcastingProgression: [
            {
              atLevel: 1,
              cantripCount: 4,
              preparedSpellCount: 2,
              spellSlots: [{ spellLevel: 1, count: 2 }],
            },
            {
              atLevel: 2,
              cantripCount: 4,
              preparedSpellCount: 4,
              spellSlots: [{ spellLevel: 1, count: 3 }],
            },
            {
              atLevel: 3,
              cantripCount: 4,
              preparedSpellCount: 6,
              spellSlots: [
                { spellLevel: 1, count: 4 },
                { spellLevel: 2, count: 2 },
              ],
            },
          ],
        },
      },
    ] as const;

    for (const entry of cases) {
      const classRecord = decodeClassRecordSync(entry.input);
      const result = readClassCreationFacts(decodeUnitRecordSync(entry.input));

      expect(classRecord.className).toBe(entry.className);
      expect(result).toMatchObject({
        tag: "readable",
        value: {
          className: entry.className,
          hitPointDie: entry.hitPointDie,
          ...("spellcasting" in entry
            ? { spellcasting: entry.spellcasting }
            : {}),
        },
      });
    }
  });

  test("decodes class-container tool, filtered weapon, and mixed multiclass proficiency source facts", () => {
    const bard = decodeClassRecordSync({
      ...classRecordWithSpellcasting(
        "bard",
        listPreparedSpellcasting({
          className: "bard",
          spellcastingAbility: "cha",
          spellcastingFocus: "musical_instrument",
          preparedChangeOn: "class_level",
          preparedReplacementCount: 1,
          preparedCount: 4,
          preparedSpells: [
            "charm_person",
            "color_spray",
            "dissonant_whispers",
            "healing_word",
          ],
          cantrips: ["dancing_lights", "vicious_mockery"],
        }),
      ),
      toolProficiencies: {
        count: 3,
        kind: "choice",
        options: [{ category: "musical_instrument", kind: "tool_category" }],
      },
    });

    const druid = decodeClassRecordSync({
      ...classRecordWithSpellcasting(
        "druid",
        listPreparedSpellcasting({
          className: "druid",
          spellcastingAbility: "wis",
          spellcastingFocus: "druidic_focus",
          preparedChangeOn: "long_rest",
          preparedReplacementCount: "any",
          preparedCount: 4,
          preparedSpells: [
            "animal_friendship",
            "cure_wounds",
            "faerie_fire",
            "thunderwave",
          ],
          cantrips: ["druidcraft", "produce_flame"],
        }),
      ),
      toolProficiencies: {
        kind: "fixed",
        proficiencies: [{ kind: "tool", toolId: "herbalism_kit" }],
      },
    });

    const monk = decodeClassRecordSync(
      nonSpellcastingClassRecord("monk", {
        primaryAbilities: { abilities: ["dex", "wis"], kind: "all_of" },
        savingThrowProficiencies: ["str", "dex"],
        skillProficiencyChoice: {
          choose: 2,
          options: [
            "acrobatics",
            "athletics",
            "history",
            "insight",
            "religion",
            "stealth",
          ],
        },
        toolProficiencies: {
          count: 1,
          kind: "choice",
          options: [
            { category: "artisan_tool", kind: "tool_category" },
            { category: "musical_instrument", kind: "tool_category" },
          ],
        },
        weaponProficiencies: [
          { category: "simple", kind: "weapon_category" },
          {
            category: "martial",
            kind: "weapon_category_with_properties",
            anyOfProperties: ["light"],
          },
        ],
      }),
    );

    const ranger = decodeClassRecordSync({
      ...classRecordWithSpellcasting(
        "ranger",
        listPreparedSpellcasting({
          className: "ranger",
          spellcastingAbility: "wis",
          spellcastingFocus: "druidic_focus",
          preparedChangeOn: "long_rest",
          preparedReplacementCount: 1,
          preparedCount: 2,
          preparedSpells: ["cure_wounds", "ensnaring_strike"],
        }),
      ),
      multiclassProficiencies: {
        choice: {
          choiceKey: "ranger_multiclass_skill_proficiency",
          count: 1,
          options: [
            { kind: "skill", skill: "animal_handling" },
            { kind: "skill", skill: "athletics" },
            { kind: "skill", skill: "insight" },
            { kind: "skill", skill: "investigation" },
            { kind: "skill", skill: "nature" },
            { kind: "skill", skill: "perception" },
            { kind: "skill", skill: "stealth" },
            { kind: "skill", skill: "survival" },
          ],
        },
        fixed: [
          { category: "martial", kind: "weapon_category" },
          { category: "light", kind: "armor_category" },
          { category: "medium", kind: "armor_category" },
          { category: "shield", kind: "armor_category" },
        ],
        kind: "mixed",
      },
    });

    const rogue = decodeClassRecordSync(
      nonSpellcastingClassRecord("rogue", {
        primaryAbilities: { abilities: ["dex"], kind: "all_of" },
        savingThrowProficiencies: ["dex", "int"],
        skillProficiencyChoice: {
          choose: 4,
          options: [
            "acrobatics",
            "athletics",
            "deception",
            "insight",
            "intimidation",
            "investigation",
            "perception",
            "persuasion",
            "sleight_of_hand",
            "stealth",
          ],
        },
        toolProficiencies: {
          kind: "fixed",
          proficiencies: [{ kind: "tool", toolId: "thieves_tools" }],
        },
        weaponProficiencies: [
          { category: "simple", kind: "weapon_category" },
          {
            category: "martial",
            kind: "weapon_category_with_properties",
            anyOfProperties: ["finesse", "light"],
          },
        ],
      }),
    );

    expect(bard.toolProficiencies).toMatchObject({
      kind: "choice",
      options: [{ category: "musical_instrument", kind: "tool_category" }],
    });
    expect(druid.toolProficiencies).toEqual({
      kind: "fixed",
      proficiencies: [{ kind: "tool", toolId: "herbalism_kit" }],
    });
    expect(monk.weaponProficiencies).toContainEqual({
      category: "martial",
      kind: "weapon_category_with_properties",
      anyOfProperties: ["light"],
    });
    expect(ranger.multiclassProficiencies).toMatchObject({
      choice: { choiceKey: "ranger_multiclass_skill_proficiency" },
      fixed: expect.arrayContaining([
        { category: "martial", kind: "weapon_category" },
      ]),
      kind: "mixed",
    });
    expect(rogue.weaponProficiencies).toContainEqual({
      category: "martial",
      kind: "weapon_category_with_properties",
      anyOfProperties: ["finesse", "light"],
    });
  });

  test("decodes non-Wizard list-prepared spellcasting creation facts", () => {
    const cases = [
      {
        className: "bard",
        spellcastingAbility: "cha",
        spellcastingFocus: "musical_instrument",
        preparedChangeOn: "class_level",
        preparedReplacementCount: 1,
        preparedCount: 4,
        preparedSpells: [
          "charm_person",
          "color_spray",
          "dissonant_whispers",
          "healing_word",
        ],
        cantrips: ["dancing_lights", "vicious_mockery"],
      },
      {
        className: "cleric",
        spellcastingAbility: "wis",
        spellcastingFocus: "holy_symbol",
        preparedChangeOn: "long_rest",
        preparedReplacementCount: "any",
        preparedCount: 4,
        preparedSpells: [
          "bless",
          "cure_wounds",
          "guiding_bolt",
          "shield_of_faith",
        ],
        cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
      },
      {
        className: "druid",
        spellcastingAbility: "wis",
        spellcastingFocus: "druidic_focus",
        preparedChangeOn: "long_rest",
        preparedReplacementCount: "any",
        preparedCount: 4,
        preparedSpells: [
          "animal_friendship",
          "cure_wounds",
          "faerie_fire",
          "thunderwave",
        ],
        cantrips: ["druidcraft", "produce_flame"],
      },
      {
        className: "paladin",
        spellcastingAbility: "cha",
        spellcastingFocus: "holy_symbol",
        preparedChangeOn: "long_rest",
        preparedReplacementCount: 1,
        preparedCount: 2,
        preparedSpells: ["heroism", "searing_smite"],
      },
      {
        className: "ranger",
        spellcastingAbility: "wis",
        spellcastingFocus: "druidic_focus",
        preparedChangeOn: "long_rest",
        preparedReplacementCount: 1,
        preparedCount: 2,
        preparedSpells: ["cure_wounds", "ensnaring_strike"],
      },
      {
        className: "sorcerer",
        spellcastingAbility: "cha",
        spellcastingFocus: "arcane_focus",
        preparedChangeOn: "class_level",
        preparedReplacementCount: 1,
        preparedCount: 2,
        preparedSpells: ["burning_hands", "detect_magic"],
        cantrips: [
          "light",
          "prestidigitation",
          "shocking_grasp",
          "sorcerous_burst",
        ],
      },
    ] as const;

    for (const entry of cases) {
      const spellcasting = listPreparedSpellcasting(entry);
      const result = readClassCreationFacts(
        decodeUnitRecordSync(
          classRecordWithSpellcasting(entry.className, spellcasting),
        ),
      );

      expect(result).toMatchObject({
        tag: "readable",
        value: {
          className: entry.className,
          spellcasting: {
            ...spellcasting,
            preparedAccess: {
              ...spellcasting.preparedAccess,
              changeOn: {
                kind: entry.preparedChangeOn,
                replacementCount: entry.preparedReplacementCount,
              },
            },
            spellcastingAbility: entry.spellcastingAbility,
            spellcastingFocus: entry.spellcastingFocus,
          },
        },
      });
    }
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

  test("decodes level-1 class-feature Surface mechanics widened for SRD inventory blockers", () => {
    const base = {
      acquiredAtLevel: 1,
      kind: "class_feature",
      provenance: { kind: "srd-5.2.1", section: "Classes/Test#Feature" },
    } as const;

    const records = [
      {
        ...base,
        id: "bard_bardic_inspiration_test",
        name: "Bardic Inspiration",
        className: "bard",
        description: "Bardic Inspiration test shape.",
        mechanics: {
          activationCost: { kind: "bonus_action" },
          family: "activation",
          phases: [
            {
              attachment: { kind: "target", selection: { mode: "one" } },
              effects: [
                {
                  die: {
                    axis: "class",
                    base: { dice: 1, dieSize: 6 },
                    kind: "threshold_tiers",
                    tiers: [
                      { atLevel: 5, override: { dieSize: 8 } },
                      { atLevel: 10, override: { dieSize: 10 } },
                      { atLevel: 15, override: { dieSize: 12 } },
                    ],
                  },
                  duration: { amount: 1, unit: "hour" },
                  kind: "grant_die_token",
                  maxHeld: 1,
                  trigger: "failed_d20_test",
                },
              ],
              kind: "direct",
            },
          ],
          range: { kind: "point", feet: 60 },
          resetCadence: { kind: "long_rest" },
          resource: {
            cap: { ability: "cha", kind: "ability_modifier", minimum: 1 },
            kind: "use_count",
          },
        },
      },
      {
        ...base,
        id: "cleric_divine_order_test",
        name: "Divine Order",
        className: "cleric",
        description: "Divine Order test shape.",
        mechanics: {
          choiceKey: "divine_order",
          family: "class_feature_acquisition_choice",
          timing: "class_feature_acquisition",
          options: [
            {
              displayName: "Protector",
              id: "protector",
              mechanics: {
                family: "passive",
                grants: [
                  {
                    kind: "grant_proficiency",
                    proficiency: {
                      kind: "fixed",
                      proficiencies: [
                        { category: "martial", kind: "weapon_category" },
                        { category: "heavy", kind: "armor_category" },
                      ],
                    },
                  },
                ],
              },
            },
            {
              displayName: "Thaumaturge",
              id: "thaumaturge",
              mechanics: {
                family: "passive",
                grants: [
                  {
                    count: 1,
                    kind: "grant_spell_access_choice",
                    mode: "known",
                    spellLevel: 0,
                    spellList: "cleric",
                  },
                  {
                    delta: {
                      ability: "wis",
                      kind: "ability_modifier",
                      minimum: 1,
                      sign: "+",
                    },
                    kind: "modify_roll_numeric",
                    on: ["ability_check"],
                    skillFilter: {
                      kind: "fixed",
                      skills: ["arcana", "religion"],
                    },
                    abilityFilter: ["int"],
                  },
                ],
              },
            },
          ],
        },
      },
      {
        ...base,
        id: "druid_druidic_test",
        name: "Druidic",
        className: "druid",
        description: "Druidic test shape.",
        mechanics: {
          family: "passive",
          grants: [
            { kind: "grant_language", languageId: "druidic" },
            {
              kind: "grant_spell_access",
              mode: "prepared",
              spellId: "speak_with_animals",
            },
            {
              deciphering: { withoutLanguageRequires: "magic" },
              kind: "grant_hidden_language_messages",
              languageId: "druidic",
              message: { kind: "hidden_language_message" },
              spotting: {
                languageKnowers: "automatic",
                others: {
                  ability: "int",
                  dc: 15,
                  skill: "investigation",
                },
              },
            },
          ],
        },
      },
      {
        ...base,
        id: "druid_primal_order_test",
        name: "Primal Order",
        className: "druid",
        description: "Primal Order test shape.",
        mechanics: {
          choiceKey: "primal_order",
          family: "class_feature_acquisition_choice",
          timing: "class_feature_acquisition",
          options: [
            {
              displayName: "Magician",
              id: "magician",
              mechanics: {
                family: "passive",
                grants: [
                  {
                    count: 1,
                    kind: "grant_spell_access_choice",
                    mode: "known",
                    spellLevel: 0,
                    spellList: "druid",
                  },
                  {
                    delta: {
                      ability: "wis",
                      kind: "ability_modifier",
                      minimum: 1,
                      sign: "+",
                    },
                    kind: "modify_roll_numeric",
                    on: ["ability_check"],
                    skillFilter: {
                      kind: "fixed",
                      skills: ["arcana", "nature"],
                    },
                    abilityFilter: ["int"],
                  },
                ],
              },
            },
            {
              displayName: "Warden",
              id: "warden",
              mechanics: {
                family: "passive",
                grants: [
                  {
                    kind: "grant_proficiency",
                    proficiency: {
                      kind: "fixed",
                      proficiencies: [
                        { category: "martial", kind: "weapon_category" },
                        { category: "medium", kind: "armor_category" },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        ...base,
        id: "monk_martial_arts_test",
        name: "Martial Arts",
        className: "monk",
        description: "Martial Arts test shape.",
        mechanics: {
          condition: {
            kind: "all_of",
            predicates: [
              { kind: "unarmed_or_monk_weapons_only" },
              {
                categories: ["light", "medium", "heavy"],
                kind: "not_wearing_armor",
              },
              { kind: "not_wielding_shield" },
            ],
          },
          family: "passive",
          grants: [
            { attack: "unarmed_strike", kind: "grant_bonus_action_attack" },
            {
              die: {
                axis: "class",
                base: { dice: 1, dieSize: 6 },
                kind: "threshold_tiers",
                tiers: [
                  { atLevel: 5, override: { dieSize: 8 } },
                  { atLevel: 11, override: { dieSize: 10 } },
                  { atLevel: 17, override: { dieSize: 12 } },
                ],
              },
              kind: "replace_damage_die",
              scope: "unarmed_or_monk_weapon",
            },
            {
              kind: "substitute_ability_for_rolls",
              on: ["attack_roll", "damage_roll", "unarmed_strike_save_dc"],
              replaces: "str",
              scope: "unarmed_or_monk_weapon",
              use: "dex",
            },
          ],
        },
      },
      {
        ...base,
        id: "ranger_favored_enemy_test",
        name: "Favored Enemy",
        className: "ranger",
        description: "Favored Enemy test shape.",
        mechanics: {
          family: "passive",
          grants: [
            {
              kind: "grant_spell_access",
              mode: "prepared",
              spellId: "hunters_mark",
            },
            {
              count: 2,
              kind: "grant_spell_free_casts",
              resetCadence: "long_rest",
              scaling: {
                axis: "class",
                tiers: [
                  { atLevel: 5, count: 3 },
                  { atLevel: 9, count: 4 },
                  { atLevel: 13, count: 5 },
                  { atLevel: 17, count: 6 },
                ],
              },
              spellId: "hunters_mark",
            },
          ],
        },
      },
      {
        ...base,
        id: "rogue_expertise_test",
        name: "Expertise",
        className: "rogue",
        description: "Expertise test shape.",
        mechanics: {
          family: "passive",
          grants: [
            {
              choiceCount: {
                kind: "class_level_additional_choices",
                initial: 2,
                increases: [{ atLevel: 6, choose: 2 }],
              },
              kind: "grant_expertise",
              skills: { kind: "owned_skill_proficiencies_without_expertise" },
            },
          ],
        },
      },
      {
        ...base,
        id: "rogue_thieves_cant_test",
        name: "Thieves' Cant",
        className: "rogue",
        description: "Thieves' Cant test shape.",
        mechanics: {
          family: "passive",
          grants: [
            { kind: "grant_language", languageId: "thieves_cant" },
            {
              count: 1,
              kind: "grant_language_choice",
              source: "character_creation_language_tables",
            },
          ],
        },
      },
      {
        ...base,
        id: "sorcerer_innate_sorcery_test",
        name: "Innate Sorcery",
        className: "sorcerer",
        description: "Innate Sorcery test shape.",
        mechanics: {
          activationCost: { kind: "bonus_action" },
          duration: {
            kind: "timed",
            value: { amount: 1, unit: "minute" },
          },
          family: "activation",
          phases: [
            {
              attachment: { kind: "self" },
              effects: [
                {
                  delta: { amount: 1, kind: "fixed_number", sign: "+" },
                  kind: "modify_save_dc",
                  spellSourceFilter: { className: "sorcerer" },
                },
                {
                  kind: "modify_roll_advantage",
                  mode: "advantage",
                  on: ["spell_attack_roll"],
                  spellSourceFilter: { className: "sorcerer" },
                },
              ],
              kind: "direct",
            },
          ],
          resetCadence: { kind: "long_rest" },
          resource: { cap: { kind: "fixed", uses: 2 }, kind: "use_count" },
        },
      },
      {
        ...base,
        id: "warlock_eldritch_invocations_test",
        name: "Eldritch Invocations",
        className: "warlock",
        description: "Eldritch Invocations test shape.",
        mechanics: {
          changeOn: { count: 1, kind: "class_level" },
          choiceKey: "eldritch_invocations",
          choiceCount: {
            kind: "class_level_total_choices",
            levels: [
              { atLevel: 1, total: 1 },
              { atLevel: 2, total: 3 },
              { atLevel: 5, total: 5 },
              { atLevel: 7, total: 6 },
              { atLevel: 9, total: 7 },
              { atLevel: 12, total: 8 },
              { atLevel: 15, total: 9 },
              { atLevel: 18, total: 10 },
            ],
          },
          constraints: {
            prerequisiteForKnownOptionLocksReplacement: true,
            prerequisitesRequired: true,
            selectionRepeatability: {
              default: "once",
              kind: "per_option",
              repeatableWhen: {
                kind: "option_description_repeatable_clause",
              },
            },
          },
          family: "feature_choice",
          optionSource: {
            className: "warlock",
            kind: "class_feature_options",
            optionKind: "eldritch_invocation",
          },
          timing: "class_feature_acquisition",
        },
      },
      {
        ...base,
        id: "warlock_pact_magic_feature_test",
        name: "Pact Magic",
        className: "warlock",
        description: "Pact Magic feature projection test shape.",
        mechanics: {
          family: "class_spellcasting_projection",
          source: "class_record_spellcasting",
          spellcastingKind: "pact_magic_spellcasting_creation",
        },
      },
    ];

    for (const record of records) {
      let decoded: ReturnType<typeof decodeClassFeatureRecordSync>;
      try {
        decoded = decodeClassFeatureRecordSync(record);
      } catch (error) {
        throw new Error(`failed to decode ${record.id}: ${String(error)}`);
      }

      expect(decoded).toMatchObject({
        id: record.id,
        kind: "class_feature",
        mechanics: { family: record.mechanics.family },
      });
    }
  });

  test.each([
    {
      input: featMagicInitiateClericInput,
      expected: {
        id: "feat_magic_initiate_cleric",
        name: "Magic Initiate (Cleric)",
        spellList: "cleric",
      },
    },
    {
      input: featMagicInitiateDruidInput,
      expected: {
        id: "feat_magic_initiate_druid",
        name: "Magic Initiate (Druid)",
        spellList: "druid",
      },
    },
    {
      input: featMagicInitiateWizardInput,
      expected: {
        id: "feat_magic_initiate_wizard",
        name: "Magic Initiate (Wizard)",
        spellList: "wizard",
      },
    },
  ])(
    "decodes $expected.name as a Magic Initiate specialization",
    ({ expected, input }) => {
      const featRecord = decodeFeatRecordSync(input);
      const unit = decodeUnitRecordSync(input);

      expect(featRecord).toMatchObject({
        category: "origin",
        id: expected.id,
        kind: "feat",
        mechanics: {
          family: "magic_initiate",
          spellList: expected.spellList,
        },
        name: expected.name,
      });
      expect(unit).toMatchObject({
        id: expected.id,
        kind: "feat",
      });
    },
  );

  test.each([
    {
      input: backgroundAcolyteInput,
      expected: {
        recordId: "background_acolyte",
        abilityScoreIncrease: {
          abilities: ["int", "wis", "cha"],
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
        originFeatId: "feat_magic_initiate_cleric",
        skillProficiencies: ["insight", "religion"],
        toolProficiency: {
          kind: "specific_tool",
          toolId: "calligraphers_supplies",
        },
        startingEquipment: expect.arrayContaining([
          { id: "option_b", kind: "coin_grant", coinsGp: 50 },
        ]),
      },
    },
    {
      input: backgroundCriminalInput,
      expected: {
        recordId: "background_criminal",
        abilityScoreIncrease: {
          abilities: ["dex", "con", "int"],
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
        originFeatId: "alert",
        skillProficiencies: ["sleight_of_hand", "stealth"],
        toolProficiency: { kind: "specific_tool", toolId: "thieves_tools" },
        startingEquipment: expect.arrayContaining([
          { id: "option_b", kind: "coin_grant", coinsGp: 50 },
        ]),
      },
    },
    {
      input: backgroundSageInput,
      expected: {
        recordId: "background_sage",
        abilityScoreIncrease: {
          abilities: ["con", "int", "wis"],
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
        originFeatId: "feat_magic_initiate_wizard",
        skillProficiencies: ["arcana", "history"],
        toolProficiency: {
          kind: "specific_tool",
          toolId: "calligraphers_supplies",
        },
        startingEquipment: expect.arrayContaining([
          { id: "option_b", kind: "coin_grant", coinsGp: 50 },
        ]),
      },
    },
    {
      input: backgroundSoldierInput,
      expected: {
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
        toolProficiency: {
          kind: "tool_category_choice",
          category: "gaming_set",
          choose: 1,
        },
        startingEquipment: expect.arrayContaining([
          { id: "option_b", kind: "coin_grant", coinsGp: 50 },
        ]),
      },
    },
  ])(
    "decodes and reads $expected.recordId background creation facts",
    ({ expected, input }) => {
      const backgroundRecord = decodeBackgroundRecordSync(input);
      const unit = decodeUnitRecordSync(input);
      const result = readBackgroundCreationFacts(unit);

      expect(backgroundRecord.kind).toBe("background");
      expect(result).toMatchObject({
        tag: "readable",
        value: expected,
      });
    },
  );

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

  test("decodes non-Orc species records with retained trait refs", () => {
    const cases = [
      {
        input: speciesDragonbornInput,
        expected: {
          recordId: "species_dragonborn",
          species: "dragonborn",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "medium" },
          speed: { walkFeet: 30 },
          traits: {
            breathWeapon: "species_dragonborn_breath_weapon",
            damageResistance: "species_dragonborn_damage_resistance",
            darkvision: "species_dragonborn_darkvision",
          },
        },
      },
      {
        input: speciesDwarfInput,
        expected: {
          recordId: "species_dwarf",
          species: "dwarf",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "medium" },
          speed: { walkFeet: 30 },
          traits: {
            darkvision: "dwarf_darkvision",
            dwarvenResilience: "dwarf_dwarven_resilience",
          },
        },
      },
      {
        input: speciesElfInput,
        expected: {
          recordId: "species_elf",
          species: "elf",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "medium" },
          speed: { walkFeet: 30 },
          traits: { darkvision: "elf_darkvision" },
        },
      },
      {
        input: speciesGnomeInput,
        expected: {
          recordId: "species_gnome",
          species: "gnome",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "small" },
          speed: { walkFeet: 30 },
          traits: {
            darkvision: "species_gnome_darkvision",
            gnomishCunning: "species_gnome_gnomish_cunning",
            gnomishLineage: "species_gnome_gnomish_lineage",
          },
        },
      },
      {
        input: speciesHalflingInput,
        expected: {
          recordId: "species_halfling",
          species: "halfling",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "small" },
          speed: { walkFeet: 30 },
          traits: {
            brave: "species_halfling_brave",
            halflingNimbleness: "species_halfling_nimbleness",
            luck: "species_halfling_luck",
            naturallyStealthy: "species_halfling_naturally_stealthy",
          },
        },
      },
      {
        input: speciesHumanInput,
        expected: {
          recordId: "species_human",
          species: "human",
          creatureType: "humanoid",
          size: { kind: "choice", options: ["medium", "small"] },
          speed: { walkFeet: 30 },
          traits: {
            resourceful: "species_human_resourceful",
            skillful: "species_human_skillful",
            versatile: "species_human_versatile",
          },
        },
      },
      {
        input: speciesGoliathInput,
        expected: {
          recordId: "species_goliath",
          species: "goliath",
          creatureType: "humanoid",
          size: { kind: "fixed", size: "medium" },
          speed: { walkFeet: 35 },
          traits: { powerfulBuild: "species_goliath_powerful_build" },
        },
      },
      {
        input: speciesTieflingInput,
        expected: {
          recordId: "species_tiefling",
          species: "tiefling",
          creatureType: "humanoid",
          size: { kind: "choice", options: ["medium", "small"] },
          speed: { walkFeet: 30 },
          traits: { darkvision: "species_tiefling_darkvision" },
        },
      },
    ] as const;

    for (const testCase of cases) {
      const speciesRecord = decodeSpeciesRecordSync(testCase.input);
      const unit = decodeUnitRecordSync(testCase.input);
      const result = readSpeciesCreationFacts(unit);

      expect(speciesRecord.kind).toBe("species");
      expect(result, testCase.expected.recordId).toEqual({
        tag: "readable",
        value: testCase.expected,
      });
    }
  });

  test("rejects Dragonborn records with malformed Draconic Ancestry source facts", () => {
    const malformedHoleId = {
      ...speciesDragonbornInput,
      draconicAncestry: {
        ...speciesDragonbornInput.draconicAncestry,
        damageType: {
          ...speciesDragonbornInput.draconicAncestry.damageType,
          holeId: "species_dragonborn_breath_weapon_damage_type",
        },
      },
    };
    const malformedTable = {
      ...speciesDragonbornInput,
      draconicAncestry: {
        ...speciesDragonbornInput.draconicAncestry,
        damageType: {
          ...speciesDragonbornInput.draconicAncestry.damageType,
          options: [
            {
              ...speciesDragonbornInput.draconicAncestry.damageType.options[0],
              damageType: "fire",
            },
            ...speciesDragonbornInput.draconicAncestry.damageType.options.slice(
              1,
            ),
          ],
        },
      },
    };

    expect(() => decodeSpeciesRecordSync(malformedHoleId)).toThrow();
    expect(() => decodeSpeciesRecordSync(malformedTable)).toThrow();
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
          ...classWarlockInput,
          id: "bard_pact_magic_projection",
          kind: "class_feature",
          className: "bard",
          acquiredAtLevel: 1,
          mechanics: {
            family: "class_spellcasting_projection",
            source: "class_record_spellcasting",
            spellcastingKind: "pact_magic_spellcasting_creation",
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(EffectAtomSchema)({
          kind: "grant_spell_access",
          spellId: "thaumaturgy",
          spellList: "cleric",
          spellLevel: 0,
          mode: "known",
          count: 1,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(EffectAtomSchema)({
          kind: "grant_spell_access_choice",
          spellList: "fighter",
          spellLevel: 0,
          mode: "known",
          count: 1,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(EffectAtomSchema)({
          kind: "grant_spell_access_choice",
          spellId: "thaumaturgy",
          spellList: "cleric",
          spellLevel: 0,
          mode: "known",
          count: 1,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWarlockInput,
          id: "bard_eldritch_invocations",
          kind: "class_feature",
          className: "bard",
          acquiredAtLevel: 1,
          mechanics: {
            changeOn: { count: 1, kind: "class_level" },
            choiceKey: "eldritch_invocations",
            choiceCount: {
              kind: "class_level_total_choices",
              levels: [{ atLevel: 1, total: 1 }],
            },
            family: "feature_choice",
            optionSource: {
              className: "warlock",
              kind: "class_feature_options",
              optionKind: "eldritch_invocation",
            },
            timing: "class_feature_acquisition",
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
            preparedAccess: {
              ...classWizardInput.spellcasting.preparedAccess,
              spellIds: [
                "detect_magic",
                "mage_armor",
                "magic_missile",
                "shield",
              ],
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
              choose: 7,
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

    const bardSpellcasting = listPreparedSpellcasting({
      className: "bard",
      spellcastingAbility: "cha",
      spellcastingFocus: "musical_instrument",
      preparedChangeOn: "class_level",
      preparedReplacementCount: 1,
      preparedCount: 4,
      preparedSpells: [
        "charm_person",
        "color_spray",
        "dissonant_whispers",
        "healing_word",
      ],
      cantrips: ["dancing_lights", "vicious_mockery"],
    });

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("cleric", bardSpellcasting),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting(
            "bard",
            listPreparedSpellcasting({
              className: "bard",
              spellcastingAbility: "cha",
              spellcastingFocus: "arcane_focus",
              preparedChangeOn: "class_level",
              preparedReplacementCount: 1,
              preparedCount: 4,
              preparedSpells: [
                "charm_person",
                "color_spray",
                "dissonant_whispers",
                "healing_word",
              ],
              cantrips: ["dancing_lights", "vicious_mockery"],
            }),
          ),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("bard", {
            ...bardSpellcasting,
            preparedAccess: {
              ...bardSpellcasting.preparedAccess,
              spells: [
                { spellId: "charm_person", spellLevel: 1 },
                { spellId: "magic_missile", spellLevel: 1 },
                { spellId: "dissonant_whispers", spellLevel: 1 },
                { spellId: "healing_word", spellLevel: 1 },
              ],
            },
          }),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting(
            "cleric",
            listPreparedSpellcasting({
              className: "cleric",
              spellcastingAbility: "wis",
              spellcastingFocus: "holy_symbol",
              preparedChangeOn: "long_rest",
              preparedReplacementCount: "any",
              preparedCount: 4,
              preparedSpells: [
                "bless",
                "cure_wounds",
                "guiding_bolt",
                "shield_of_faith",
              ],
              cantrips: ["guidance", "dancing_lights", "thaumaturgy"],
            }),
          ),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("cleric", {
            ...listPreparedSpellcasting({
              className: "cleric",
              spellcastingAbility: "wis",
              spellcastingFocus: "holy_symbol",
              preparedChangeOn: "long_rest",
              preparedReplacementCount: 1,
              preparedCount: 4,
              preparedSpells: [
                "bless",
                "cure_wounds",
                "guiding_bolt",
                "shield_of_faith",
              ],
              cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
            }),
          }),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting(
            "bard",
            listPreparedSpellcasting({
              className: "bard",
              spellcastingAbility: "cha",
              spellcastingFocus: "musical_instrument",
              preparedChangeOn: "class_level",
              preparedReplacementCount: 1,
              preparedCount: 2,
              preparedSpells: ["charm_person", "color_spray"],
              cantrips: ["dancing_lights", "vicious_mockery"],
            }),
          ),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("paladin", {
            ...listPreparedSpellcasting({
              className: "paladin",
              spellcastingAbility: "cha",
              spellcastingFocus: "holy_symbol",
              preparedChangeOn: "long_rest",
              preparedReplacementCount: "any",
              preparedCount: 2,
              preparedSpells: ["heroism", "searing_smite"],
            }),
          }),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting(
            "paladin",
            listPreparedSpellcasting({
              className: "paladin",
              spellcastingAbility: "cha",
              spellcastingFocus: "holy_symbol",
              preparedChangeOn: "long_rest",
              preparedReplacementCount: 1,
              preparedCount: 2,
              preparedSpells: ["heroism", "searing_smite"],
              cantrips: ["light"],
            }),
          ),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("bard", {
            ...bardSpellcasting,
            preparedAccess: {
              ...bardSpellcasting.preparedAccess,
              spells: [
                { spellId: "charm_person", spellLevel: 1 },
                { spellId: "charm_person", spellLevel: 1 },
                { spellId: "dissonant_whispers", spellLevel: 1 },
                { spellId: "healing_word", spellLevel: 1 },
              ],
            },
          }),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither(
          classRecordWithSpellcasting("bard", {
            ...bardSpellcasting,
            preparedAccess: {
              ...bardSpellcasting.preparedAccess,
              spells: [
                { spellId: "charm_person", spellLevel: 1 },
                { spellId: "scorching_ray", spellLevel: 2 },
                { spellId: "dissonant_whispers", spellLevel: 1 },
                { spellId: "healing_word", spellLevel: 1 },
              ],
            },
          }),
        ),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classWarlockInput,
          spellcasting: {
            ...classWarlockInput.spellcasting,
            preparedAccess: {
              ...classWarlockInput.spellcasting.preparedAccess,
              spells: [
                { spellId: "charm_person", spellLevel: 1 },
                { spellId: "magic_missile", spellLevel: 1 },
              ],
            },
          },
        }),
      ),
    ).toBe(true);

    const { armorTraining: _armorTraining, ...fighterWithoutArmorTraining } =
      classFighterInput;
    expect(
      Either.isLeft(decodeUnitRecordEither(fighterWithoutArmorTraining)),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          primaryAbilities: {
            abilities: ["str", "str"],
            kind: "any_of",
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...classFighterInput,
          primaryAbilities: {
            abilities: ["str"],
            kind: "any_of",
          },
        }),
      ),
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

  test("rejects mixed-species non-Orc trait aggregates at the decode boundary", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...speciesDwarfInput,
          traits: {
            ...speciesDwarfInput.traits,
            darkvision: "species_tiefling_darkvision",
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...speciesGnomeInput,
          traits: {
            ...speciesGnomeInput.traits,
            gnomishLineage: "species_tiefling_darkvision",
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
