import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

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
  decodeClassFeatureRecordSync,
  decodeClassRecordSync,
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
  readonly preparedSpells: readonly string[];
  readonly cantrips?: readonly string[];
}) => ({
  ...(input.cantrips === undefined
    ? {}
    : {
        cantripAccess: {
          changeOn: { count: 1, kind: "class_level" },
          choose: input.cantrips.length,
          kind: "known_cantrips_from_class_spell_list",
          spellIds: input.cantrips,
        },
      }),
  kind: "list_prepared_spellcasting_creation",
  preparedAccess: {
    changeOn: {
      kind: input.preparedChangeOn,
      replacementCount: input.preparedReplacementCount,
    },
    choose: input.preparedCount,
    kind: "prepared_from_class_spell_list",
    spells: input.preparedSpells.map((spellId) => ({
      spellId,
      spellLevel: 1,
    })),
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
          spellcastingAbility: "cha",
          cantripAccess: {
            choose: 2,
            kind: "known_cantrips_from_class_spell_list",
            spellIds: ["eldritch_blast", "minor_illusion"],
            changeOn: { count: 1, kind: "class_level" },
          },
          preparedAccess: {
            choose: 2,
            kind: "prepared_from_class_spell_list",
            spells: [
              { spellId: "charm_person", spellLevel: 1 },
              { spellId: "hellish_rebuke", spellLevel: 1 },
            ],
            changeOn: { kind: "class_level", replacementCount: 1 },
          },
          pactSlotProjection: {
            count: 1,
            kind: "pact_slots",
            resetCadence: { kind: "short_or_long_rest" },
            spellLevel: 1,
          },
          spellcastingFocus: "arcane_focus",
        },
      },
    });
  });

  test("decodes and reads authored SRDINV12 class container records without closing Spell Access rows", () => {
    const cases = [
      { input: classBardInput, className: "bard", hitPointDie: 8 },
      { input: classClericInput, className: "cleric", hitPointDie: 8 },
      { input: classDruidInput, className: "druid", hitPointDie: 8 },
      { input: classMonkInput, className: "monk", hitPointDie: 8 },
      { input: classPaladinInput, className: "paladin", hitPointDie: 10 },
      { input: classRangerInput, className: "ranger", hitPointDie: 10 },
      { input: classRogueInput, className: "rogue", hitPointDie: 8 },
      { input: classSorcererInput, className: "sorcerer", hitPointDie: 6 },
    ] as const;

    for (const entry of cases) {
      const classRecord = decodeClassRecordSync(entry.input);
      const result = readClassCreationFacts(decodeUnitRecordSync(entry.input));

      expect("spellcasting" in classRecord).toBe(false);
      expect(classRecord.className).toBe(entry.className);
      expect(result).toMatchObject({
        tag: "readable",
        value: {
          className: entry.className,
          hitPointDie: entry.hitPointDie,
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
          family: "suborder_choice",
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
          family: "suborder_choice",
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
            uniqueSelections: true,
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
