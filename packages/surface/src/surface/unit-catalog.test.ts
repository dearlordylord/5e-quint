import { existsSync } from "node:fs";

import { Either, Option, Schema } from "effect";
import { describe, expect, test } from "vitest";

import findFamiliarInput from "../../content/find_familiar.json";
import flyInput from "../../content/fly.json";
import hypnoticPatternInput from "../../content/hypnotic_pattern.json";
import magicWeaponInput from "../../content/magic_weapon.json";
import moonbeamInput from "../../content/moonbeam.json";
import phantomSteedInput from "../../content/phantom_steed.json";
import sorcererFontOfMagicInput from "../../content/sorcerer_font_of_magic.json";
import sorcererMetamagicInput from "../../content/sorcerer_metamagic.json";
import {
  ActivationPhaseSchema,
  AudibleEffectSchema,
  ClassFeatureRecordSchema,
  ComponentsSchema,
  decodeUnitRecordEither,
  decodeUnitRecordSync,
  EffectAtomSchema,
  FeatherFallMitigationSchema,
  JumpMovementReplacementSchema,
  OnHitTriggerMechanicsSchema,
  TargetSelectionSchema,
} from "./schema.ts";
import {
  assertSrd521Unit,
  buildUnitCatalog,
  defineSrdUnitCollection,
  srdUnitCollection,
} from "./unit-catalog.ts";
import type { Srd521Unit, SrdUnitCollection } from "./unit-catalog.ts";
import type { WeaponRecord } from "./types.ts";

const task183ClassFeatureUnitIds = [
  "bard_bardic_inspiration",
  "cleric_divine_order",
  "druid_druidic",
  "druid_primal_order",
  "monk_martial_arts",
  "ranger_favored_enemy",
  "rogue_expertise",
  "rogue_thieves_cant",
  "sorcerer_innate_sorcery",
  "warlock_eldritch_invocations",
  "warlock_pact_magic",
] as const;

const task184WeaponMasteryUnitIds = [
  "barbarian_weapon_mastery",
  "paladin_weapon_mastery",
  "ranger_weapon_mastery",
  "rogue_weapon_mastery",
] as const;

const levelThreeSubclassChoiceUnitIds = [
  "subclass_barbarian_path_of_the_berserker",
  "subclass_bard_college_of_lore",
  "subclass_cleric_life_domain",
  "subclass_druid_circle_of_the_land",
  "subclass_fighter_champion",
  "subclass_monk_warrior_of_the_open_hand",
  "subclass_paladin_oath_of_devotion",
  "subclass_ranger_hunter",
  "subclass_rogue_thief",
  "subclass_sorcerer_draconic_sorcery",
  "subclass_warlock_fiend_patron",
  "subclass_wizard_evoker",
] as const;

const levelThreeClassSpecificMechanicMismatches = [
  {
    unitId: "fighter_remarkable_athlete",
    wrongClassName: "rogue",
  },
  {
    unitId: "monk_open_hand_technique",
    wrongClassName: "paladin",
  },
  {
    unitId: "paladin_sacred_weapon",
    wrongClassName: "rogue",
  },
  {
    unitId: "ranger_hunters_prey",
    wrongClassName: "paladin",
  },
  {
    unitId: "rogue_steady_aim",
    wrongClassName: "wizard",
  },
  {
    unitId: "wizard_potent_cantrip",
    wrongClassName: "paladin",
  },
] as const;

const alterSelfNaturalWeaponGrowthDamageType = {
  kind: "choice_table",
  holeId: "alter_self_natural_weapon_growth",
  label: "natural weapon growth",
  options: [
    { id: "claws", displayName: "claws", damageType: "slashing" },
    { id: "fangs", displayName: "fangs", damageType: "piercing" },
    { id: "horns", displayName: "horns", damageType: "piercing" },
    { id: "hooves", displayName: "hooves", damageType: "bludgeoning" },
  ],
} as const;

const requiredFirstVerticalUnitIds = [
  "class_barbarian",
  "class_bard",
  "class_cleric",
  "class_druid",
  "class_fighter",
  "class_monk",
  "class_paladin",
  "class_ranger",
  "class_rogue",
  "class_sorcerer",
  "class_warlock",
  "class_wizard",
  "background_acolyte",
  "background_criminal",
  "background_sage",
  "background_soldier",
  "species_dragonborn",
  "species_dwarf",
  "species_elf",
  "species_gnome",
  "species_halfling",
  "species_human",
  "species_goliath",
  "species_orc",
  "species_tiefling",
  "fighter_fighting_style",
  "fighter_second_wind",
  "fighter_weapon_mastery",
  "fighter_action_surge",
  "fighter_tactical_mind",
  "fighter_improved_critical",
  "barbarian_danger_sense",
  "barbarian_fast_movement",
  "bard_expertise",
  "bard_jack_of_all_trades",
  ...task183ClassFeatureUnitIds,
  ...task184WeaponMasteryUnitIds,
  "paladin_fighting_style",
  "paladin_paladins_smite",
  "ranger_fighting_style",
  ...levelThreeSubclassChoiceUnitIds,
  "rogue_evasion",
  "wizard_ritual_adept",
  "wizard_arcane_recovery",
  "wizard_scholar",
  "wizard_ability_score_improvement_l4",
  "wizard_evocation_savant",
  "feat_ability_score_improvement",
  "feat_archery",
  "feat_boon_of_combat_prowess",
  "defense",
  "feat_great_weapon_fighting",
  "feat_grappler",
  "feat_magic_initiate_cleric",
  "feat_magic_initiate_druid",
  "feat_magic_initiate_wizard",
  "feat_savage_attacker",
  "feat_skilled",
  "feat_two_weapon_fighting",
  "mastery_cleave",
  "mastery_sap",
  "orc_adrenaline_rush",
  "orc_darkvision",
  "orc_relentless_endurance",
  "elf_darkvision",
  "species_dragonborn_breath_weapon",
  "species_dragonborn_damage_resistance",
  "species_dragonborn_darkvision",
  "dwarf_darkvision",
  "dwarf_dwarven_resilience",
  "species_gnome_darkvision",
  "species_gnome_gnomish_cunning",
  "species_gnome_gnomish_lineage",
  "species_halfling_brave",
  "species_halfling_nimbleness",
  "species_halfling_luck",
  "species_halfling_naturally_stealthy",
  "species_human_resourceful",
  "species_human_skillful",
  "species_human_versatile",
  "species_goliath_powerful_build",
  "species_tiefling_darkvision",
  "fire_bolt",
  "fireball",
  "light",
  "animal_messenger",
  "arcanists_magic_aura",
  "augury",
  "ray_of_frost",
  "detect_evil_and_good",
  "detect_magic",
  "detect_poison_and_disease",
  "detect_thoughts",
  "mage_armor",
  "magic_missile",
  "magic_mouth",
  "nondetection",
  "mind_spike",
  "mass_cure_wounds",
  "healing_word",
  "prayer_of_healing",
  "protection_from_poison",
  "shield",
  "shatter",
  "silence",
  "shining_smite",
  "see_invisibility",
  "sleep",
  "spider_climb",
  "suggestion",
  "zone_of_truth",
  "thunderwave",
  "eldritch_blast",
  "minor_illusion",
  "sorcerous_burst",
  "calm_emotions",
  "charm_person",
  "command",
  "dissonant_whispers",
  "darkness",
  "darkvision",
  "enhance_ability",
  "enlarge_reduce",
  "enthrall",
  "find_traps",
  "gust_of_wind",
  "expeditious_retreat",
  "feather_fall",
  "jump",
  "knock",
  "levitate",
  "lightning_bolt",
  "locate_animals_or_plants",
  "locate_object",
  "hellish_rebuke",
  "hold_person",
  "invisibility",
  "rope_trick",
  "armor_chain_mail",
  "armor_chain_shirt",
  "armor_leather",
  "equipment_shield",
  "weapon_dagger",
  "weapon_greataxe",
  "weapon_longsword",
  "weapon_spear",
  "weapon_flail",
  "weapon_shortbow",
] as const;

describe("SRD Unit catalog boundary", () => {
  test("installs first-vertical SRD Units into a real catalog", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      for (const unitId of requiredFirstVerticalUnitIds) {
        expect(result.catalog.requireUnit(unitId).id).toBe(unitId);
      }
    }
  });

  test("keeps Fireball's SRD object-ignition clause in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const fireball = result.catalog.requireUnit("fireball");

      expect(fireball.kind).toBe("spell");
      if (
        fireball.kind !== "spell" ||
        fireball.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Fireball to be an activation spell.");
      }
      expect(fireball.description).toContain(
        "Flammable objects in the area that aren't being worn or carried start burning.",
      );
      expect(fireball.mechanics.phases).toMatchObject([
        {
          kind: "save_gate",
          attachment: {
            value: {
              kind: "area",
              origin: { kind: "point_within_range" },
              shape: { kind: "sphere", radiusFeet: 20 },
            },
          },
          ability: "dex",
          onFail: {
            kind: "damage",
            damageType: "fire",
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              base: { dice: 8, dieSize: 6 },
              perLevel: { dice: 1 },
              startingAtLevel: 3,
            },
          },
          onSuccess: { kind: "half_damage" },
        },
        {
          kind: "direct",
          attachment: {
            value: {
              kind: "area",
              origin: { kind: "point_within_range" },
              shape: { kind: "sphere", radiusFeet: 20 },
            },
          },
          effects: [
            {
              kind: "ignite_objects",
              filter: {
                material: "flammable",
                targetRelation: "not_worn_or_carried",
              },
            },
          ],
        },
      ]);
    }
  });

  test("keeps Silence's coupled sound-area Surface atom in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const silence = result.catalog.requireUnit("silence");

      expect(silence.kind).toBe("spell");
      if (
        silence.kind !== "spell" ||
        silence.mechanics.family !== "ongoing_effect"
      ) {
        throw new Error("Expected Silence to be an ongoing-effect spell.");
      }
      expect(silence.mechanics).toMatchObject({
        level: 2,
        school: "illusion",
        castingTime: { kind: "action", ritual: true },
        range: { kind: "point", feet: 120 },
        components: { v: true, s: true, m: false },
        duration: {
          kind: "concentration",
          upTo: { unit: "minute", amount: 10 },
        },
        attachment: {
          value: {
            kind: "area",
            origin: { kind: "point_within_range" },
            shape: { kind: "sphere", radiusFeet: 20 },
          },
        },
        operations: [
          {
            trigger: { kind: "passive" },
            effect: {
              kind: "area_of_silence",
              soundBoundary: "blocks_creation_and_passage",
              appliesWhen: "entirely_inside_area",
              grantsDamageImmunity: "thunder",
              imposesCondition: "deafened",
              preventsSpellComponent: "verbal",
            },
          },
        ],
      });
    }
  });

  test("keeps Suggestion's table-choice Surface facts in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const suggestion = result.catalog.requireUnit("suggestion");

      expect(suggestion.kind).toBe("spell");
      if (
        suggestion.kind !== "spell" ||
        suggestion.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Suggestion to be an activation spell.");
      }
      expect(suggestion.mechanics).toMatchObject({
        level: 2,
        school: "enchantment",
        castingTime: { kind: "action" },
        range: { kind: "point", feet: 30 },
        components: { v: true, s: false, m: "a drop of honey" },
        duration: {
          kind: "concentration",
          upTo: { unit: "hour", amount: 8 },
          earlyEnd: [{ kind: "target_damaged_by_caster_or_ally" }],
        },
        phases: [
          {
            kind: "save_gate",
            attachment: {
              holeId: "suggestion_target",
              label: "target",
              value: {
                kind: "target",
                selection: {
                  mode: "one",
                  targetKinds: ["creature"],
                },
              },
            },
            ability: "wis",
            dc: { kind: "caster_spell_save_dc" },
            onFail: {
              kind: "apply_condition",
              condition: "charmed",
              duration: "spell_duration",
            },
            onSuccess: { kind: "none" },
          },
        ],
      });
    }
  });

  test("keeps Zone of Truth's truthfulness Surface facts in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const zoneOfTruth = result.catalog.requireUnit("zone_of_truth");

      expect(zoneOfTruth.kind).toBe("spell");
      if (
        zoneOfTruth.kind !== "spell" ||
        zoneOfTruth.mechanics.family !== "ongoing_effect"
      ) {
        throw new Error(
          "Expected Zone of Truth to be an ongoing-effect spell.",
        );
      }
      expect(zoneOfTruth.mechanics).toMatchObject({
        level: 2,
        school: "enchantment",
        castingTime: { kind: "action" },
        range: { kind: "point", feet: 60 },
        components: { v: true, s: true, m: false },
        duration: {
          kind: "timed",
          value: { unit: "minute", amount: 10 },
        },
        attachment: {
          holeId: "zone_of_truth_sphere",
          value: {
            kind: "area",
            origin: { kind: "point_within_range" },
            shape: { kind: "sphere", radiusFeet: 15 },
          },
        },
        operations: [
          {
            trigger: { kind: "on_creature_starts_turn_in_area" },
            effect: {
              kind: "save_gate",
              ability: "cha",
              dc: { kind: "caster_spell_save_dc" },
              onFail: {
                kind: "composite",
                effects: [
                  {
                    kind: "truthfulness_constraint",
                    prohibitedCommunication: "deliberate_lie",
                    appliesWhile: "in_spell_area",
                    targetAwareness: "aware_of_spell",
                    allowedResponse: "evasive_or_silent_truthful",
                  },
                  { kind: "reveal_save_outcome_to_caster" },
                ],
              },
              onSuccess: { kind: "reveal_save_outcome_to_caster" },
            },
            usageLimit: {
              kind: "once_per_turn",
              limitGroup: "zone_of_truth_save_per_turn",
            },
          },
          {
            trigger: { kind: "on_creature_enters_area" },
            usageLimit: {
              kind: "once_per_turn",
              limitGroup: "zone_of_truth_save_per_turn",
            },
          },
        ],
      });
    }
  });

  test("installs Acid Arrow with immediate, later, and miss-only damage authored from SRD", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    const acidArrow = result.catalog.requireUnit("acid_arrow");
    expect(acidArrow).toMatchObject({
      id: "acid_arrow",
      kind: "spell",
      provenance: {
        kind: "srd-5.2.1",
        section: "Spells/Descriptions-A-D#Acid Arrow",
      },
    });
    if (acidArrow.kind !== "spell") return;
    expect(acidArrow.description).toContain(
      "4d4 Acid damage and 2d4 Acid damage at the end of its next turn",
    );
    expect(acidArrow.mechanics).toMatchObject({
      family: "activation",
      level: 2,
      school: "evocation",
      castingTime: { kind: "action" },
      range: { kind: "point", feet: 90 },
      duration: { kind: "instantaneous" },
    });
    if (acidArrow.mechanics.family !== "activation") return;
    const phase = acidArrow.mechanics.phases[0];
    expect(phase).toMatchObject({
      kind: "attack_roll",
      attackKind: "ranged_spell_attack",
      onHit: [
        {
          kind: "damage",
          damageType: "acid",
          amount: {
            kind: "linear_per_level",
            axis: "slot",
            base: { dice: 4, dieSize: 4 },
            perLevel: { dice: 1 },
            startingAtLevel: 2,
          },
        },
        {
          kind: "damage",
          damageType: "acid",
          amount: {
            kind: "linear_per_level",
            axis: "slot",
            base: { dice: 2, dieSize: 4 },
            perLevel: { dice: 1 },
            startingAtLevel: 2,
          },
          timing: "end_of_next_turn",
        },
      ],
      onMiss: [{ kind: "half_initial_damage_only" }],
    });
  });

  test("installs Dragon's Breath with authored SRD spell facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const dragonsBreath = result.catalog.requireUnit("dragons_breath");

    expect(dragonsBreath).toMatchObject({
      id: "dragons_breath",
      kind: "spell",
      provenance: {
        kind: "srd-5.2.1",
        section: "Spells/Descriptions-A-D#Dragon's Breath",
      },
    });
    expect("evidence" in dragonsBreath).toBe(false);
    if (dragonsBreath.kind !== "spell") return;
    expect(dragonsBreath.mechanics).toMatchObject({
      family: "ongoing_effect",
      level: 2,
      school: "transmutation",
      castingTime: { kind: "bonus_action" },
      range: { kind: "touch" },
      duration: { kind: "concentration", upTo: { amount: 1, unit: "minute" } },
      attachment: {
        kind: "hole",
        holeId: "dragons_breath_target",
        value: {
          kind: "target",
          selection: {
            disposition: "willing",
            mode: "one",
            targetKinds: ["creature"],
          },
        },
      },
      operations: [
        {
          trigger: {
            kind: "on_attached_spends_action",
            cost: { kind: "standard_action", action: "magic" },
          },
          effect: {
            kind: "save_gate",
            attachment: {
              kind: "area",
              origin: { kind: "on_attached_creature" },
              shape: { kind: "cone", lengthFeet: 15 },
            },
            ability: "dex",
            dc: { kind: "caster_spell_save_dc" },
            onFail: {
              kind: "damage",
              damageType: {
                kind: "hole",
                holeId: "dragons_breath_damage_type",
                value: {
                  kind: "choice",
                  options: ["acid", "cold", "fire", "lightning", "poison"],
                },
              },
              amount: {
                kind: "linear_per_level",
                axis: "slot",
                base: { dice: 3, dieSize: 6 },
                perLevel: { dice: 1 },
                startingAtLevel: 2,
              },
            },
            onSuccess: { kind: "half_damage" },
          },
        },
      ],
    });
  });

  test("installs Ray of Enfeeblement with authored SRD spell facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const rayOfEnfeeblement = result.catalog.requireUnit("ray_of_enfeeblement");

    expect(rayOfEnfeeblement).toMatchObject({
      id: "ray_of_enfeeblement",
      kind: "spell",
      provenance: {
        kind: "srd-5.2.1",
        section: "Spells/Descriptions-Q-R#Ray of Enfeeblement",
      },
    });
    expect("evidence" in rayOfEnfeeblement).toBe(false);
    if (rayOfEnfeeblement.kind !== "spell") return;
    expect(rayOfEnfeeblement.mechanics).toMatchObject({
      family: "activation",
      level: 2,
      school: "necromancy",
      castingTime: { kind: "action" },
      range: { kind: "point", feet: 60 },
      duration: { kind: "concentration", upTo: { amount: 1, unit: "minute" } },
      phases: [
        {
          kind: "save_gate",
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          attachment: {
            kind: "hole",
            holeId: "ray_of_enfeeblement_target",
            value: {
              kind: "target",
              selection: { mode: "one" },
            },
          },
          onSuccess: {
            kind: "modify_roll_advantage",
            mode: "disadvantage",
            on: ["attack_roll"],
            count: 1,
            expiresOn: { kind: "caster_turn_start" },
          },
          onFail: {
            kind: "composite",
            effects: [
              {
                kind: "modify_roll_advantage",
                mode: "disadvantage",
                on: ["attack_roll", "ability_check", "saving_throw"],
                abilityFilter: ["str"],
              },
              {
                kind: "modify_damage_numeric",
                delta: {
                  kind: "fixed_dice",
                  sign: "-",
                  dice: 1,
                  dieSize: 8,
                },
              },
            ],
          },
          repeatSaves: [
            {
              cadence: "end_of_target_turn",
              onSuccess: "ends_on_target",
            },
          ],
        },
      ],
    });
  });

  test("decodes Alter Self as a self option mode with lossless natural weapon growth facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const alterSelf = result.catalog.requireUnit("alter_self");

    expect(alterSelf.kind).toBe("spell");
    if (alterSelf.kind !== "spell") return;
    expect(alterSelf.mechanics.family).toBe("activation");
    if (alterSelf.mechanics.family !== "activation") return;

    expect(alterSelf.mechanics).toMatchObject({
      level: 2,
      school: "transmutation",
      castingTime: { kind: "action" },
      range: { kind: "self" },
      components: { v: true, s: true, m: false },
      duration: { kind: "concentration", upTo: { unit: "hour", amount: 1 } },
    });

    expect(alterSelf.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: { kind: "self" },
        mode: {
          label: "Choose an alteration",
          allowsMidDurationSwitchAs: "magic_action",
          options: [
            {
              id: "aquatic_adaptation",
              displayName: "Aquatic Adaptation",
              effects: [
                { kind: "water_breathing" },
                {
                  kind: "grant_speed",
                  speedKind: "swim",
                  feet: { kind: "walk_speed" },
                },
              ],
            },
            {
              id: "change_appearance",
              displayName: "Change Appearance",
            },
            {
              id: "natural_weapons",
              displayName: "Natural Weapons",
              effects: [
                {
                  kind: "natural_weapons",
                  damageType: alterSelfNaturalWeaponGrowthDamageType,
                  damageDie: 6,
                  replacesAbility: "str",
                  attackRollAbility: "spellcasting",
                  damageRollAbility: "spellcasting",
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  test("rejects lossy Alter Self Natural Weapons placeholders", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);
    const completeNaturalWeapons = {
      kind: "natural_weapons",
      damageType: alterSelfNaturalWeaponGrowthDamageType,
      damageDie: 6,
      replacesAbility: "str",
      attackRollAbility: "spellcasting",
      damageRollAbility: "spellcasting",
    };

    expect(
      Either.isLeft(
        decode({
          ...completeNaturalWeapons,
          damageType: "slashing",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          ...completeNaturalWeapons,
          damageDie: 8,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          ...completeNaturalWeapons,
          damageType: {
            ...alterSelfNaturalWeaponGrowthDamageType,
            holeId: "natural_weapon_damage_type",
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "natural_weapons",
          damageType: alterSelfNaturalWeaponGrowthDamageType,
          damageDie: 6,
        }),
      ),
    ).toBe(true);
  });

  test("keeps Prayer of Healing's SRD 5.2.1 rest-healing shell in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const prayerOfHealing = result.catalog.requireUnit("prayer_of_healing");

    expect(prayerOfHealing).toMatchObject({
      kind: "spell",
      mechanics: {
        castingTime: { amount: 10, kind: "minutes", ritual: false },
        duration: { kind: "instantaneous" },
        range: { feet: 30, kind: "point" },
        phases: [
          {
            attachment: {
              value: {
                kind: "target",
                selection: {
                  castingRequirement: {
                    kind: "remain_within_spell_range_for_entire_casting",
                  },
                  count: 5,
                  mode: "choose_up_to",
                  targetKinds: ["creature"],
                },
              },
            },
            effects: [
              {
                amount: {
                  base: { dice: 2, dieSize: 8 },
                  kind: "linear_per_level",
                  perLevel: { dice: 1 },
                  startingAtLevel: 2,
                },
                kind: "heal_hp",
              },
              {
                benefit: "short_rest",
                kind: "grant_rest_benefit",
                target: "target_creature",
              },
              {
                kind: "spell_recipient_rest_lockout",
                resetBy: "target_finishes_long_rest",
                target: "target_creature",
              },
            ],
          },
        ],
      },
    });
    expect(prayerOfHealing.description).toContain(
      "gain the benefits of a Short Rest",
    );
  });

  test("keeps Levitate's SRD suspension and altitude-control shell in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const levitate = result.catalog.requireUnit("levitate");

    expect(levitate).toMatchObject({
      kind: "spell",
      mechanics: {
        duration: {
          kind: "concentration",
          upTo: { amount: 10, unit: "minute" },
        },
        level: 2,
        phases: [
          {
            ability: "con",
            attachment: {
              value: {
                kind: "target",
                selection: {
                  mode: "one",
                  objectFilter: {
                    targetRelation: "loose",
                    maxWeightPounds: 500,
                  },
                  targetKinds: ["creature", "object"],
                },
              },
            },
            kind: "save_gate",
            onFail: {
              casterAltitudeControl: {
                cost: "magic_action_on_caster_turn",
                maxDistanceFeet: 20,
                targetMustRemainWithinSpellRange: true,
              },
              ending: "float_gently_to_ground_if_aloft",
              initialRiseMaxFeet: 20,
              kind: "levitate_target",
              selfAltitudeControl: { cost: "part_of_move" },
              suspension: "spell_duration",
              targetMovement: {
                allowedBy: "push_or_pull_fixed_object_or_surface_within_reach",
                movementMode: "as_if_climbing",
              },
            },
            saveAppliesIf: "unwilling_creature_target",
          },
        ],
      },
    });
  });

  test("keeps Shatter's SRD save-damage clause in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const shatter = result.catalog.requireUnit("shatter");

      expect(shatter.kind).toBe("spell");
      if (
        shatter.kind !== "spell" ||
        shatter.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Shatter to be an activation spell.");
      }
      expect(shatter.description).toContain(
        "Each creature in a 10-foot-radius Sphere centered there makes a Constitution saving throw",
      );
      expect(shatter.mechanics.phases).toMatchObject([
        {
          kind: "save_gate",
          attachment: {
            value: {
              kind: "area",
              origin: { kind: "point_within_range" },
              shape: { kind: "sphere", radiusFeet: 10 },
            },
          },
          ability: "con",
          onFail: {
            kind: "damage",
            damageType: "thunder",
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              base: { dice: 3, dieSize: 8 },
              perLevel: { dice: 1 },
              startingAtLevel: 2,
            },
          },
          onSuccess: { kind: "half_damage" },
        },
      ]);
    }
  });

  test("keeps Lightning Bolt's SRD Line save-damage clause in the catalog projection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const lightningBolt = result.catalog.requireUnit("lightning_bolt");

      expect(lightningBolt.kind).toBe("spell");
      if (
        lightningBolt.kind !== "spell" ||
        lightningBolt.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Lightning Bolt to be an activation spell.");
      }
      expect(lightningBolt.description).toContain(
        "100-foot-long, 5-foot-wide Line",
      );
      expect(lightningBolt.mechanics.phases).toMatchObject([
        {
          kind: "save_gate",
          attachment: {
            kind: "area",
            origin: { kind: "self" },
            shape: { kind: "line", lengthFeet: 100, widthFeet: 5 },
          },
          ability: "dex",
          onFail: {
            kind: "damage",
            damageType: "lightning",
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              base: { dice: 8, dieSize: 6 },
              perLevel: { dice: 1 },
              startingAtLevel: 3,
            },
          },
          onSuccess: { kind: "half_damage" },
        },
      ]);
    }
  });

  test("keeps Shining Smite as an after-hit Radiant damage and illumination spell", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const shiningSmite = result.catalog.requireUnit("shining_smite");

      expect(shiningSmite.kind).toBe("spell");
      if (
        shiningSmite.kind !== "spell" ||
        shiningSmite.mechanics.family !== "ongoing_effect"
      ) {
        throw new Error("Expected Shining Smite to be an ongoing spell.");
      }
      expect(shiningSmite.description).toContain(
        "Immediately after hitting a creature with a Melee weapon or an Unarmed Strike",
      );
      expect(shiningSmite.mechanics).toMatchObject({
        level: 2,
        castingTime: {
          kind: "bonus_action",
          trigger: {
            kind: "after_hit_with",
            attack: "melee_weapon_or_unarmed_strike",
          },
        },
        range: { kind: "self" },
        duration: {
          kind: "concentration",
          upTo: { amount: 1, unit: "minute" },
        },
        initialPhase: {
          kind: "direct",
          effects: [
            {
              kind: "damage",
              damageType: "radiant",
              amount: {
                kind: "linear_per_level",
                axis: "slot",
                base: { dice: 2, dieSize: 6 },
                perLevel: { dice: 1, dieSize: 6 },
                startingAtLevel: 2,
              },
            },
          ],
        },
        operations: [
          {
            trigger: { kind: "passive" },
            effect: { kind: "emit_light", brightRadiusFeet: 5 },
          },
          {
            trigger: { kind: "passive" },
            effect: {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "rolls_against_self",
              on: ["attack_roll"],
            },
          },
          {
            trigger: { kind: "passive" },
            effect: {
              kind: "suppress_condition_benefit",
              condition: "invisible",
            },
          },
        ],
      });
    }
  });

  test("keeps See Invisibility as a narrow sight override, not Truesight", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const seeInvisibility = result.catalog.requireUnit("see_invisibility");

      expect(seeInvisibility.kind).toBe("spell");
      if (
        seeInvisibility.kind !== "spell" ||
        seeInvisibility.mechanics.family !== "activation"
      ) {
        throw new Error("Expected See Invisibility to be an activation spell.");
      }
      expect(seeInvisibility.mechanics.phases).toMatchObject([
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [{ kind: "see_invisible_and_ethereal" }],
        },
      ]);
    }
  });

  test("decodes Darkvision as a timed willing-target sense grant", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const darkvision = result.catalog.requireUnit("darkvision");

      expect(darkvision.kind).toBe("spell");
      if (
        darkvision.kind !== "spell" ||
        darkvision.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Darkvision to be an activation spell.");
      }
      expect(darkvision.mechanics.level).toBe(2);
      expect(darkvision.mechanics.school).toBe("transmutation");
      expect(darkvision.mechanics.castingTime).toEqual({ kind: "action" });
      expect(darkvision.mechanics.range).toEqual({ kind: "touch" });
      expect(darkvision.mechanics.components).toEqual({
        v: true,
        s: true,
        m: "a dried carrot",
      });
      expect(darkvision.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "hour", amount: 8 },
      });
      expect(darkvision.mechanics.phases).toMatchObject([
        {
          kind: "direct",
          attachment: {
            kind: "hole",
            holeId: "darkvision_target",
            label: "willing target",
            value: {
              kind: "target",
              selection: {
                mode: "one",
                targetKinds: ["creature"],
                disposition: "willing",
              },
            },
          },
          effects: [
            { kind: "grant_sense", sense: "darkvision", rangeFeet: 150 },
          ],
        },
      ]);
    }
  });

  test("keeps Druid Wild Shape as catalog-only shape-shifting metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const wildShape = result.catalog.requireUnit("druid_wild_shape");

      expect(wildShape.kind).toBe("class_feature");
      if (
        wildShape.kind !== "class_feature" ||
        wildShape.mechanics.family !== "activation"
      ) {
        throw new Error("Expected Wild Shape to be an activation feature.");
      }
      expect(wildShape.className).toBe("druid");
      expect(wildShape.acquiredAtLevel).toBe(2);
      expect(wildShape.mechanics.activationCost).toEqual({
        kind: "bonus_action",
      });
      expect(wildShape.mechanics.resource).toEqual({
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 6, value: 3 },
            { atLevel: 17, value: 4 },
          ],
        },
      });
      expect(wildShape.mechanics.resetCadence).toEqual({
        kind: "partial_short_full_long",
        shortRestRefill: 1,
      });
      expect(wildShape.mechanics.duration).toEqual({
        kind: "timed",
        value: { kind: "half_class_level_rounded_down_hours" },
      });
      expect(wildShape.mechanics.phases).toMatchObject([
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "transform_target",
              actionRestriction: "no_spellcasting",
              newForm: {
                kind: "known_forms_roster",
                creatureType: "beast",
                knownForms: {
                  kind: "class_level_total_choices",
                  levels: [
                    { atLevel: 2, total: 4 },
                    { atLevel: 4, total: 6 },
                    { atLevel: 8, total: 8 },
                  ],
                },
                recommendedFormStatBlockIds: [
                  "stat_block_rat",
                  "stat_block_riding_horse",
                  "stat_block_spider",
                  "stat_block_wolf",
                ],
                knownFormChange: { kind: "long_rest", replacementCount: 1 },
                maxChallengeRating: {
                  kind: "threshold_tiers",
                  axis: "class",
                  base: 0.25,
                  tiers: [
                    { atLevel: 4, value: 0.5 },
                    { atLevel: 8, value: 1 },
                  ],
                },
                flySpeed: { kind: "allowed_at_class_level", atLevel: 8 },
              },
              revertTriggers: [
                { kind: "duration_expires" },
                { kind: "source_used_again" },
                { kind: "condition_active", condition: "incapacitated" },
                { kind: "death" },
                { kind: "dismissed_by_target", action: "bonus_action" },
              ],
            },
            {
              kind: "grant_temp_hp",
              amount: {
                kind: "linear_per_level",
                axis: "class",
                base: { dice: 0, dieSize: 1, flat: 1 },
                perLevel: { flat: 1 },
                startingAtLevel: 1,
              },
            },
          ],
        },
      ]);
    }
  });

  test("keeps Druid Wild Companion as a Find Familiar casting boundary", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const druid = result.catalog.requireUnit("class_druid");
      const wildCompanion = result.catalog.requireUnit("druid_wild_companion");

      expect(druid.kind).toBe("class");
      if (druid.kind !== "class") {
        throw new Error("Expected Druid to be a class record.");
      }
      expect(druid.featureGrants).toEqual(
        expect.arrayContaining([
          { level: 2, unitId: "druid_wild_shape" },
          { level: 2, unitId: "druid_wild_companion" },
        ]),
      );
      expect(druid.spellcasting?.kind).toBe(
        "list_prepared_spellcasting_progression_creation",
      );
      if (
        druid.spellcasting?.kind !==
        "list_prepared_spellcasting_progression_creation"
      ) {
        throw new Error("Expected Druid level-scaled spellcasting facts.");
      }
      expect(druid.spellcasting.spellcastingProgression).toEqual(
        expect.arrayContaining([
          {
            atLevel: 2,
            cantripCount: 2,
            preparedSpellCount: 5,
            spellSlots: [{ spellLevel: 1, count: 3 }],
          },
        ]),
      );

      expect(wildCompanion.kind).toBe("class_feature");
      if (
        wildCompanion.kind !== "class_feature" ||
        wildCompanion.mechanics.family !== "druid_wild_companion_spell_cast"
      ) {
        throw new Error(
          "Expected Wild Companion to be a Druid spell-casting feature.",
        );
      }
      expect(wildCompanion.className).toBe("druid");
      expect(wildCompanion.acquiredAtLevel).toBe(2);
      expect(wildCompanion.mechanics).toEqual({
        family: "druid_wild_companion_spell_cast",
        activationCost: { kind: "standard_action", action: "magic" },
        spellId: "find_familiar",
        spendOptions: [
          { kind: "spell_slot" },
          {
            kind: "one_class_feature_use",
            resourceUnitId: "druid_wild_shape",
          },
        ],
        componentOverride: { material: "not_required" },
        spellModeOverride: {
          kind: "fixed_creature_type_mode_option",
          optionId: "fey",
        },
        familiarDismissal: { kind: "caster_finishes_long_rest" },
      });
    }
  });

  test("keeps first-slice weapon mastery choices on Sap, not Vex", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const selectedWeapons = [
        result.catalog.requireUnit("weapon_longsword"),
        result.catalog.requireUnit("weapon_spear"),
        result.catalog.requireUnit("weapon_flail"),
      ] as readonly WeaponRecord[];

      expect(selectedWeapons.map((weapon) => weapon.mastery)).toEqual([
        "sap",
        "sap",
        "sap",
      ]);
    }
  });

  test("decodes Command as a closed next-turn option surface", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const command = result.catalog.requireUnit("command");
      expect(command.kind).toBe("spell");
      if (command.kind !== "spell") return;
      expect(command.mechanics.family).toBe("activation");
      if (command.mechanics.family !== "activation") return;

      const phase = command.mechanics.phases[0];
      expect(phase?.kind).toBe("save_gate");
      if (phase?.kind !== "save_gate") return;

      expect(phase.onFail).toEqual({
        kind: "command_target_next_turn",
        execution: "target_next_turn",
        options: {
          approach: {
            route: "shortest_direct_to_caster",
            endsTurnWhenWithinFeet: 5,
          },
          drop: { objectSet: "held_objects", afterward: "end_turn" },
          flee: {
            direction: "away_from_caster",
            means: "fastest_available",
            duration: "target_turn",
          },
          grovel: { condition: "prone", afterward: "end_turn" },
          halt: {
            movement: "none",
            action: "none",
            bonusAction: "none",
            duration: "target_turn",
          },
        },
      });
      expect(phase.attachment.kind).toBe("hole");
      if (phase.attachment.kind !== "hole") return;

      expect(phase.attachment.value).toEqual({
        kind: "target",
        selection: {
          mode: "choose_up_to",
          count: {
            kind: "linear",
            base: 1,
            perSlotAboveBase: 1,
            baseLevel: 1,
          },
          targetKinds: ["creature"],
        },
      });
    }
  });

  test("decodes Fog Cloud as a slot-scaled Heavily Obscured fog Sphere", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const fogCloud = result.catalog.requireUnit("fog_cloud");
      expect(fogCloud.kind).toBe("spell");
      if (fogCloud.kind !== "spell") return;
      expect(fogCloud.mechanics.family).toBe("ongoing_effect");
      if (fogCloud.mechanics.family !== "ongoing_effect") return;

      expect(fogCloud.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "hour", amount: 1 },
        earlyEnd: [{ kind: "area_dispersed_by_strong_wind" }],
      });
      expect(fogCloud.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "fog_cloud_point",
        label: "fog origin point",
        value: {
          kind: "area",
          shape: {
            kind: "sphere",
            radiusFeet: {
              kind: "linear_per_level",
              axis: "slot",
              base: 20,
              perLevel: 20,
              startingAtLevel: 1,
            },
          },
          origin: { kind: "point_within_range" },
        },
      });
      expect(fogCloud.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: { kind: "area_is_heavily_obscured" },
        },
      ]);
    }
  });

  test("keeps Web's SRD area hazard shape as executable Surface facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const web = result.catalog.requireUnit("web");

    expect(web.kind).toBe("spell");
    if (web.kind !== "spell") return;
    expect(web.mechanics.family).toBe("ongoing_effect");
    if (web.mechanics.family !== "ongoing_effect") return;

    expect(web.mechanics).toMatchObject({
      level: 2,
      school: "conjuration",
      castingTime: { kind: "action" },
      range: { kind: "point", feet: 60 },
      components: { v: true, s: true, m: "a bit of spiderweb" },
      duration: { kind: "concentration", upTo: { unit: "hour", amount: 1 } },
      attachment: {
        kind: "hole",
        holeId: "web_point",
        label: "spell origin point",
        value: {
          kind: "area",
          shape: { kind: "cube", sideFeet: 20 },
          origin: { kind: "point_within_range" },
        },
      },
    });
    expect(web.mechanics.operations).toEqual([
      {
        trigger: { kind: "passive" },
        effect: { kind: "area_is_difficult_terrain" },
      },
      {
        trigger: { kind: "passive" },
        effect: { kind: "area_is_lightly_obscured" },
      },
      {
        trigger: { kind: "passive" },
        effect: {
          kind: "area_anchor_or_layering_requirement",
          anchor: { kind: "between_solid_masses", count: 2 },
          layering: {
            kind: "across_surface",
            surfaces: ["floor", "wall", "ceiling"],
            flatSurfaceDepthFeet: 5,
          },
          unmetOutcome: {
            kind: "collapse_and_end_effect",
            timing: "start_of_caster_next_turn",
          },
        },
      },
      {
        trigger: { kind: "passive" },
        effect: {
          kind: "area_section_burns_away",
          section: { kind: "cube", sideFeet: 5 },
          exposure: "fire",
          burnsAwayAfter: { unit: "round", amount: 1 },
          creatureStartsTurnInFireDamage: {
            damageType: "fire",
            amount: { kind: "fixed", expr: { dice: 2, dieSize: 4 } },
          },
        },
      },
      {
        trigger: { kind: "on_creature_enters_area" },
        usageLimit: { kind: "once_per_turn" },
        effect: {
          kind: "save_gate",
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          onFail: {
            kind: "apply_condition_while_in_area_or_until_escape",
            condition: "restrained",
          },
          onSuccess: { kind: "none" },
        },
      },
      {
        trigger: { kind: "on_creature_starts_turn_in_area" },
        effect: {
          kind: "save_gate",
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          onFail: {
            kind: "apply_condition_while_in_area_or_until_escape",
            condition: "restrained",
          },
          onSuccess: { kind: "none" },
        },
      },
      {
        trigger: {
          kind: "on_affected_creature_spends_action",
          cost: { kind: "action" },
        },
        predicate: { kind: "has_condition", condition: "restrained" },
        effect: {
          kind: "ability_check_gate",
          ability: "str",
          skill: "athletics",
          dc: { kind: "caster_spell_save_dc" },
          onPass: { kind: "remove_condition", condition: "restrained" },
        },
      },
    ]);
  });

  test("decodes Darkness as a Concentration point-origin magical Darkness Sphere", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const darkness = result.catalog.requireUnit("darkness");
      expect(darkness.kind).toBe("spell");
      if (darkness.kind !== "spell") return;
      expect(darkness.mechanics.family).toBe("ongoing_effect");
      if (darkness.mechanics.family !== "ongoing_effect") return;

      expect(darkness.mechanics.level).toBe(2);
      expect(darkness.mechanics.castingTime).toEqual({ kind: "action" });
      expect(darkness.mechanics.range).toEqual({
        kind: "point",
        feet: 60,
      });
      expect(darkness.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      });
      expect(darkness.mechanics.components).toEqual({
        v: true,
        s: false,
        m: "bat fur and a piece of coal",
      });
      expect(darkness.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "darkness_point",
        label: "spell origin point",
        value: {
          kind: "area",
          shape: { kind: "sphere", radiusFeet: 15 },
          origin: { kind: "point_within_range" },
        },
      });
      expect(darkness.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: { kind: "area_is_magical_darkness" },
        },
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "end_overlapping_spell_created_bright_or_dim_light",
            maxSpellLevel: 2,
          },
        },
      ]);
    }
  });

  test("decodes Moonbeam with lossless Dim Light source fact, shared per-turn save limiter, and conditional shape-shift rider", () => {
    const moonbeam = decodeUnitRecordSync(moonbeamInput);
    expect(moonbeam.kind).toBe("spell");
    if (moonbeam.kind !== "spell") return;
    expect(moonbeam.mechanics.family).toBe("ongoing_effect");
    if (moonbeam.mechanics.family !== "ongoing_effect") return;

    // Dim Light is the source-level illumination fact (not derived area_is_lightly_obscured).
    // Consumers derive Lightly Obscured from it per UBIQUITOUS_LANGUAGE.
    expect(moonbeam.mechanics.operations[0]).toEqual({
      trigger: { kind: "passive" },
      effect: { kind: "area_emits_dim_light" },
    });

    // Movement is only available on later turns.
    // RAW: "you can take a Magic action on later turns to move the Cylinder up to 60 feet."
    expect(moonbeam.mechanics.operations[1]).toMatchObject({
      trigger: {
        kind: "on_caster_spends_action",
        laterTurnsOnly: true,
      },
      effect: { kind: "reposition_attachment", maxMoveFeet: 60 },
    });

    // All four save triggers (appearance + 3 recurring) share one per-turn window per creature.
    // RAW: "A creature makes this save only once per turn" spans all four triggers.
    const saveOps = moonbeam.mechanics.operations.filter(
      (op) => op.usageLimit !== undefined,
    );
    expect(saveOps).toHaveLength(3);
    for (const op of saveOps) {
      expect(op.usageLimit).toEqual({
        kind: "once_per_turn",
        limitGroup: "moonbeam_save_per_turn",
      });
    }

    // Shape-shift rider is gated on the target being shape-shifted.
    // RAW: "if the creature is shape-shifted … it reverts to its true form
    //  and can't shape-shift until it leaves the Cylinder."
    const shapeShiftOnFail = {
      kind: "composite",
      effects: expect.arrayContaining([
        {
          kind: "revert_shape_shift_to_true_form",
          onlyIfTargetIsShapeShifted: true,
        },
        {
          kind: "suppress_shape_shifting_while_in_area",
          onlyIfTargetIsShapeShifted: true,
        },
      ]),
    };

    // Initial save (when the Cylinder appears) participates in the same once-per-turn
    // limiter group so a creature already in the area on cast turn cannot save again
    // via a recurring trigger on the same turn.
    // RAW: "When the Cylinder appears, each creature in it makes a Constitution saving throw"
    // and "A creature makes this save only once per turn."
    expect(moonbeam.mechanics.initialPhase).toMatchObject({
      kind: "save_gate",
      onFail: shapeShiftOnFail,
      usageLimit: {
        kind: "once_per_turn",
        limitGroup: "moonbeam_save_per_turn",
      },
    });

    // All three recurring save triggers (creature-ends-turn-in-area, creature-entry,
    // area-moves-into-creature-space) also carry the shape-shift rider.
    for (const op of saveOps) {
      expect(op.effect).toMatchObject({
        kind: "save_gate",
        onFail: shapeShiftOnFail,
      });
    }
  });

  test("decodes Gust of Wind as a line with push and directional movement cost", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const gustOfWind = result.catalog.requireUnit("gust_of_wind");
      expect(gustOfWind.kind).toBe("spell");
      if (gustOfWind.kind !== "spell") return;
      expect(gustOfWind.mechanics.family).toBe("ongoing_effect");
      if (gustOfWind.mechanics.family !== "ongoing_effect") return;

      expect(gustOfWind.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "gust_of_wind_line",
        label: "gust line",
        value: {
          kind: "area",
          shape: { kind: "line", lengthFeet: 60, widthFeet: 10 },
          origin: { kind: "self" },
        },
      });
      expect(gustOfWind.mechanics.initialPhase).toMatchObject({
        kind: "save_gate",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
        onFail: {
          kind: "force_move",
          movementKind: "push",
          originDirection: "away_from_caster",
          distanceFeet: 15,
        },
        onSuccess: { kind: "none" },
      });
      expect(gustOfWind.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: { kind: "area_has_strong_wind" },
        },
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "area_movement_cost_multiplier",
            multiplier: 2,
            appliesTo: "toward_source",
          },
        },
        {
          trigger: { kind: "on_creature_ends_turn_in_area" },
          effect: expect.objectContaining({
            kind: "save_gate",
            ability: "str",
            onFail: expect.objectContaining({
              kind: "force_move",
              distanceFeet: 15,
            }),
          }),
        },
        {
          trigger: {
            kind: "on_caster_spends_action",
            cost: { kind: "bonus_action" },
          },
          effect: { kind: "reposition_attachment" },
        },
      ]);
    }
  });

  test("decodes Flaming Sphere as a movable fire sphere hazard", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const flamingSphere = result.catalog.requireUnit("flaming_sphere");
      expect(flamingSphere.kind).toBe("spell");
      if (flamingSphere.kind !== "spell") return;
      expect(flamingSphere.mechanics.family).toBe("ongoing_effect");
      if (flamingSphere.mechanics.family !== "ongoing_effect") return;

      expect(flamingSphere.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      });
      expect(flamingSphere.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "flaming_sphere_area",
        label: "sphere area",
        value: {
          kind: "area",
          shape: { kind: "sphere", radiusFeet: 2.5 },
          origin: { kind: "point_within_range" },
        },
      });
      expect(flamingSphere.mechanics.operations).toEqual([
        {
          trigger: {
            kind: "on_creature_ends_turn_within_distance_of_area",
            distanceFeet: 5,
          },
          effect: expect.objectContaining({
            kind: "save_gate",
            ability: "dex",
            dc: { kind: "caster_spell_save_dc" },
            onSuccess: { kind: "half_damage" },
          }),
        },
        {
          trigger: {
            kind: "on_caster_spends_action",
            cost: { kind: "bonus_action" },
          },
          effect: { kind: "reposition_attachment", maxMoveFeet: 30 },
        },
        {
          trigger: { kind: "on_area_moves_into_creature_space" },
          effect: expect.objectContaining({
            kind: "save_gate",
            ability: "dex",
            dc: { kind: "caster_spell_save_dc" },
            onSuccess: { kind: "half_damage" },
          }),
        },
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "ignite_objects",
            filter: {
              material: "flammable",
              targetRelation: "not_worn_or_carried",
            },
          },
        },
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "emit_light",
            brightRadiusFeet: 20,
            dimAdditionalFeet: 20,
          },
        },
      ]);
    }
  });

  test("decodes Spare the Dying as zero-HP not-dead Stable lifecycle application", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const spareTheDying = result.catalog.requireUnit("spare_the_dying");
      expect(spareTheDying.kind).toBe("spell");
      if (spareTheDying.kind !== "spell") return;
      expect(spareTheDying.mechanics.family).toBe("activation");
      if (spareTheDying.mechanics.family !== "activation") return;

      expect(spareTheDying.mechanics.range).toEqual({
        kind: "point",
        feet: {
          kind: "threshold_tiers",
          axis: "character",
          base: 15,
          tiers: [
            { atLevel: 5, value: 30 },
            { atLevel: 11, value: 60 },
            { atLevel: 17, value: 120 },
          ],
        },
      });

      const phase = spareTheDying.mechanics.phases[0];
      expect(phase?.kind).toBe("direct");
      if (phase?.kind !== "direct") return;

      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "spare_the_dying_target",
        label: "target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature"],
            stateFilter: ["zero_hp_not_dead"],
          },
        },
      });
      expect(phase.effects).toEqual([{ kind: "make_stable" }]);
    }
  });

  test("decodes Sanctuary as warded-target targeting interdiction", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const sanctuary = result.catalog.requireUnit("sanctuary");
      expect(sanctuary.kind).toBe("spell");
      if (sanctuary.kind !== "spell") return;
      expect(sanctuary.mechanics.family).toBe("ongoing_effect");
      if (sanctuary.mechanics.family !== "ongoing_effect") return;

      expect(sanctuary.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "minute", amount: 1 },
        earlyEnd: [
          { kind: "target_makes_attack_roll" },
          { kind: "target_casts_spell" },
          { kind: "target_deals_damage" },
        ],
      });
      expect(sanctuary.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "sanctuary_warded_creature",
        label: "warded creature",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature"],
          },
        },
      });
      expect(sanctuary.mechanics.operations).toEqual([
        {
          trigger: {
            kind: "on_attached_targeted",
            targeting: ["attack_roll", "damaging_spell"],
            excludes: "area_of_effect",
          },
          effect: {
            kind: "save_gate",
            ability: "wis",
            dc: { kind: "caster_spell_save_dc" },
            onFail: {
              kind: "choose_new_target_or_lose",
              subject: "triggering_attack_or_spell",
            },
            onSuccess: { kind: "none" },
          },
        },
      ]);
    }
  });

  test("decodes Flame Blade as a spell-created held blade lifecycle", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const flameBlade = result.catalog.requireUnit("flame_blade");
      expect(flameBlade.kind).toBe("spell");
      if (flameBlade.kind !== "spell") return;
      expect(flameBlade.mechanics.family).toBe("ongoing_effect");
      if (flameBlade.mechanics.family !== "ongoing_effect") return;

      expect(flameBlade.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      });
      expect(flameBlade.mechanics.initialPhase).toEqual({
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "spell_created_held_object",
            heldBy: "caster",
            requirements: ["free_hand"],
            disappearsWhen: ["caster_lets_go"],
            reEvoke: {
              cost: { kind: "bonus_action" },
              requirements: ["free_hand"],
            },
          },
        ],
      });
      expect(flameBlade.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          predicate: { kind: "spell_created_held_object_active" },
          effect: {
            kind: "emit_light",
            brightRadiusFeet: 10,
            dimAdditionalFeet: 10,
          },
        },
        {
          trigger: {
            kind: "on_caster_spends_action",
            cost: { kind: "standard_action", action: "magic" },
          },
          predicate: { kind: "spell_created_held_object_active" },
          effect: {
            kind: "attack_roll",
            attackKind: "melee_spell_attack",
            onHit: [
              {
                kind: "damage",
                damageType: "fire",
                amount: {
                  kind: "linear_per_level",
                  axis: "slot",
                  base: {
                    dice: 3,
                    dieSize: 6,
                    spellcastingMod: true,
                  },
                  perLevel: { dice: 1, dieSize: 6 },
                  startingAtLevel: 2,
                },
              },
            ],
            onMiss: [{ kind: "none" }],
          },
        },
      ]);
    }
  });

  test("decodes Heat Metal as object-contact damage with a drop-or-fallback save", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const heatMetal = result.catalog.requireUnit("heat_metal");
      expect(heatMetal.kind).toBe("spell");
      if (heatMetal.kind !== "spell") return;
      expect(heatMetal.mechanics.family).toBe("ongoing_effect");
      if (heatMetal.mechanics.family !== "ongoing_effect") return;

      const metalObjectAttachment = {
        kind: "hole",
        holeId: "heat_metal_object",
        label: "target object",
        value: {
          kind: "object",
          count: 1,
          filter: {
            material: "metal",
            visibility: "caster_can_see",
            manufactured: true,
          },
        },
      };
      const contactDamage = {
        kind: "object_contact_damage",
        contact: {
          kind: "table_witnessed_physical_contact_with_spell_object",
        },
        damageType: "fire",
        amount: {
          kind: "linear_per_level",
          axis: "slot",
          base: { dice: 2, dieSize: 8 },
          perLevel: { dice: 1 },
          startingAtLevel: 3,
        },
        holdingOrWearingSave: {
          appliesIf: {
            kind: "table_witnessed_holding_or_wearing_spell_object",
          },
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          onSuccess: { kind: "none" },
          onFailure: {
            kind: "drop_if_possible_else_disadvantage",
            dropCapabilityWitness: {
              kind: "table_witnessed_drop_capability",
              subject: "damaged_creature",
              object: "spell_object",
            },
            dropResultWitness: {
              kind: "table_witnessed_drop_result",
              subject: "damaged_creature",
              object: "spell_object",
            },
            fallbackWhen: "object_not_dropped",
            fallback: {
              kind: "modify_roll_advantage",
              mode: "disadvantage",
              on: ["attack_roll", "ability_check"],
              expiresOn: { kind: "caster_turn_start" },
            },
          },
        },
      };

      expect(heatMetal.mechanics.attachment).toEqual(metalObjectAttachment);
      expect(heatMetal.mechanics.initialPhase).toEqual({
        kind: "direct",
        attachment: metalObjectAttachment,
        effects: [contactDamage],
      });
      expect(heatMetal.mechanics.operations).toEqual([
        {
          trigger: {
            kind: "on_caster_spends_action",
            cost: { kind: "bonus_action" },
            laterTurnsOnly: true,
          },
          predicate: {
            kind: "table_witnessed_attachment_within_spell_range",
          },
          effect: contactDamage,
        },
      ]);
    }
  });

  test("decodes Spiritual Weapon as one later-turn move-and-attack Bonus Action", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const spiritualWeapon = result.catalog.requireUnit("spiritual_weapon");
      expect(spiritualWeapon.kind).toBe("spell");
      if (spiritualWeapon.kind !== "spell") return;
      expect(spiritualWeapon.mechanics.family).toBe("ongoing_effect");
      if (spiritualWeapon.mechanics.family !== "ongoing_effect") return;

      const forceDamage = {
        kind: "damage",
        damageType: "force",
        amount: {
          kind: "linear_per_level",
          axis: "slot",
          base: { dice: 1, dieSize: 8, spellcastingMod: true },
          perLevel: { dice: 1, dieSize: 8 },
          startingAtLevel: 2,
        },
      };
      const targetWithinForceReach = {
        kind: "within_feet_of_attachment",
        attachmentHoleId: "spiritual_weapon_force",
        feet: 5,
      };
      const forceAttackTarget = {
        kind: "hole",
        holeId: "spiritual_weapon_attack_target",
        label: "creature within 5 feet of the force",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature"],
            relativePosition: targetWithinForceReach,
          },
        },
      };

      expect(spiritualWeapon.mechanics.castingTime).toEqual({
        kind: "bonus_action",
      });
      expect(spiritualWeapon.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      });
      expect(spiritualWeapon.mechanics.range).toEqual({
        kind: "point",
        feet: 60,
      });
      expect(spiritualWeapon.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "spiritual_weapon_force",
        label: "spectral force",
        value: {
          kind: "location",
          description: "space within range",
        },
      });
      expect(spiritualWeapon.mechanics.initialPhase).toEqual({
        kind: "attack_roll",
        attachment: forceAttackTarget,
        attackKind: "melee_spell_attack",
        onHit: [forceDamage],
        onMiss: [{ kind: "none" }],
      });
      expect(spiritualWeapon.mechanics.operations).toEqual([
        {
          trigger: {
            kind: "on_caster_spends_action",
            cost: { kind: "bonus_action" },
            laterTurnsOnly: true,
          },
          effect: {
            kind: "composite_ongoing",
            effects: [
              { kind: "reposition_attachment", maxMoveFeet: 20 },
              {
                kind: "attack_roll",
                attachment: forceAttackTarget,
                attackKind: "melee_spell_attack",
                onHit: [forceDamage],
                onMiss: [{ kind: "none" }],
              },
            ],
          },
        },
      ]);
    }
  });

  test("decodes Shillelagh as a held-weapon attack override", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const shillelagh = result.catalog.requireUnit("shillelagh");
      expect(shillelagh.kind).toBe("spell");
      if (shillelagh.kind !== "spell") return;
      expect(shillelagh.mechanics.family).toBe("ongoing_effect");
      if (shillelagh.mechanics.family !== "ongoing_effect") return;

      expect(shillelagh.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "minute", amount: 1 },
        earlyEnd: [
          { kind: "caster_recasts_spell" },
          { kind: "caster_lets_go_of_attached_weapon" },
        ],
      });
      expect(shillelagh.mechanics.attachment).toEqual({
        kind: "held_weapon",
        heldBy: "caster",
        count: 1,
        weaponIds: ["weapon_club", "weapon_quarterstaff"],
      });
      expect(shillelagh.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "override_attached_weapon_attack",
            replacesAbility: "str",
            attackRollAbility: "spellcasting",
            damageRollAbility: "spellcasting",
            attackScope: "melee_attacks_using_attached_weapon",
            damageDie: {
              kind: "threshold_tiers",
              axis: "character",
              base: { dice: 1, dieSize: 8 },
              tiers: [
                { atLevel: 5, override: { dieSize: 10 } },
                { atLevel: 11, override: { dieSize: 12 } },
                { atLevel: 17, override: { dice: 2, dieSize: 6 } },
              ],
            },
            damageTypeChoice: ["force", "weapon_normal"],
          },
        },
      ]);
    }
  });

  test("decodes creature-or-object spell attack targets for Chill Touch, Fire Bolt, and Sorcerous Burst", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const chillTouch = result.catalog.requireUnit("chill_touch");
      expect(chillTouch.kind).toBe("spell");
      if (chillTouch.kind !== "spell") return;
      expect(chillTouch.mechanics.family).toBe("activation");
      if (chillTouch.mechanics.family !== "activation") return;

      const chillTouchPhase = chillTouch.mechanics.phases[0];
      expect(chillTouchPhase?.kind).toBe("attack_roll");
      if (chillTouchPhase?.kind !== "attack_roll") return;

      expect(chillTouchPhase.attachment).toEqual({
        kind: "hole",
        holeId: "chill_touch_target",
        label: "target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature", "object"],
          },
        },
      });

      const fireBolt = result.catalog.requireUnit("fire_bolt");
      expect(fireBolt.kind).toBe("spell");
      if (fireBolt.kind !== "spell") return;
      expect(fireBolt.mechanics.family).toBe("activation");
      if (fireBolt.mechanics.family !== "activation") return;

      const fireBoltPhase = fireBolt.mechanics.phases[0];
      expect(fireBoltPhase?.kind).toBe("attack_roll");
      if (fireBoltPhase?.kind !== "attack_roll") return;

      expect(fireBoltPhase.attachment).toEqual({
        kind: "hole",
        holeId: "fire_bolt_target",
        label: "fire bolt target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature", "object"],
          },
        },
      });
      expect(fireBoltPhase.onHit).toEqual([
        {
          kind: "damage",
          damageType: "fire",
          amount: {
            kind: "threshold_tiers",
            axis: "character",
            base: { dice: 1, dieSize: 10 },
            tiers: [
              { atLevel: 5, override: { dice: 2 } },
              { atLevel: 11, override: { dice: 3 } },
              { atLevel: 17, override: { dice: 4 } },
            ],
          },
        },
        {
          kind: "ignite_objects",
          filter: {
            material: "flammable",
            targetRelation: "not_worn_or_carried",
          },
        },
      ]);

      const sorcerousBurst = result.catalog.requireUnit("sorcerous_burst");
      expect(sorcerousBurst.kind).toBe("spell");
      if (sorcerousBurst.kind !== "spell") return;
      expect(sorcerousBurst.mechanics.family).toBe("activation");
      if (sorcerousBurst.mechanics.family !== "activation") return;

      const burstPhase = sorcerousBurst.mechanics.phases[0];
      expect(burstPhase?.kind).toBe("attack_roll");
      if (burstPhase?.kind !== "attack_roll") return;

      expect(burstPhase.attachment).toEqual({
        kind: "hole",
        holeId: "sorcerous_burst_target",
        label: "target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature", "object"],
          },
        },
      });
      expect(burstPhase.onHit).toEqual([
        {
          kind: "damage",
          damageType: {
            kind: "hole",
            holeId: "sorcerous_burst_damage_type",
            label: "sorcerous damage type",
            value: {
              kind: "choice",
              label: "sorcerous damage type",
              options: [
                "acid",
                "cold",
                "fire",
                "lightning",
                "poison",
                "psychic",
                "thunder",
              ],
            },
          },
          amount: {
            kind: "threshold_tiers_exploding_max_die",
            axis: "character",
            baseDice: 1,
            dieSize: 8,
            tiers: [
              { atLevel: 5, dice: 2 },
              { atLevel: 11, dice: 3 },
              { atLevel: 17, dice: 4 },
            ],
            maxAdditionalDice: "spellcasting_ability_modifier",
          },
        },
      ]);
    }
  });

  test("decodes Hex as a curse with retargeting, attack-hit damage, and chosen-ability check Disadvantage", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const hex = result.catalog.requireUnit("hex");
      expect(hex.kind).toBe("spell");
      if (hex.kind !== "spell") return;
      expect(hex.mechanics.family).toBe("ongoing_effect");
      if (hex.mechanics.family !== "ongoing_effect") return;

      expect(hex.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: {
          unit: "hour",
          amount: 1,
          upcastTiers: [
            { atSlot: 2, amount: 4 },
            { atSlot: 3, amount: 8 },
            { atSlot: 5, amount: 24 },
          ],
        },
      });
      expect(hex.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "hex_cursed_target",
        label: "cursed target",
        value: {
          kind: "mark",
          selection: {
            mode: "one",
            targetKinds: ["creature"],
          },
          transfer: {
            onEvent: { kind: "target_drops_to_0_hp" },
            availability: { kind: "later_turn_after_trigger" },
            cost: { kind: "bonus_action" },
          },
        },
      });
      expect(hex.mechanics.operations).toEqual([
        {
          trigger: { kind: "on_caster_attack_hit" },
          effect: {
            kind: "damage",
            damageType: "necrotic",
            amount: {
              kind: "fixed",
              expr: { dice: 1, dieSize: 6 },
            },
          },
        },
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "modify_roll_advantage",
            mode: "disadvantage",
            affects: "self_roll",
            on: ["ability_check"],
            abilityFilter: {
              kind: "hole",
              holeId: "hex_cursed_ability",
              label: "cursed ability",
              value: {
                kind: "choice",
                label: "cursed ability",
                options: ["str", "dex", "con", "int", "wis", "cha"],
              },
            },
          },
        },
      ]);
    }
  });

  test("decodes Enhance Ability as chosen-ability Ability Check Advantage with slot-scaled touched targets", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const enhanceAbility = result.catalog.requireUnit("enhance_ability");
      expect(enhanceAbility.kind).toBe("spell");
      if (enhanceAbility.kind !== "spell") return;
      expect(enhanceAbility.mechanics.family).toBe("ongoing_effect");
      if (enhanceAbility.mechanics.family !== "ongoing_effect") return;

      expect(enhanceAbility.mechanics.level).toBe(2);
      expect(enhanceAbility.mechanics.castingTime).toEqual({
        kind: "action",
      });
      expect(enhanceAbility.mechanics.range).toEqual({ kind: "touch" });
      expect(enhanceAbility.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "hour", amount: 1 },
      });
      expect(enhanceAbility.mechanics.attachment).toEqual({
        kind: "hole",
        holeId: "enhance_ability_target",
        label: "target",
        value: {
          kind: "target",
          selection: {
            mode: "choose_up_to",
            count: {
              kind: "linear",
              base: 1,
              perSlotAboveBase: 1,
              baseLevel: 2,
            },
            targetKinds: ["creature"],
          },
        },
      });
      expect(enhanceAbility.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "modify_roll_advantage",
            mode: "advantage",
            affects: "self_roll",
            on: ["ability_check"],
            abilityFilter: {
              kind: "per_target_hole",
              holeId: "enhance_ability_chosen_ability",
              label: "chosen ability",
              value: {
                kind: "choice",
                label: "chosen ability",
                options: ["str", "dex", "int", "wis", "cha"],
              },
            },
          },
        },
      ]);
    }
  });

  test("decodes Warding Bond as a linked caster-target bond with range-gated benefits and damage sharing", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const wardingBond = result.catalog.requireUnit("warding_bond");
      expect(wardingBond.kind).toBe("spell");
      if (wardingBond.kind !== "spell") return;
      expect(wardingBond.mechanics.family).toBe("ongoing_effect");
      if (wardingBond.mechanics.family !== "ongoing_effect") return;

      expect(wardingBond.mechanics.level).toBe(2);
      expect(wardingBond.mechanics.castingTime).toEqual({
        kind: "action",
      });
      expect(wardingBond.mechanics.range).toEqual({ kind: "touch" });
      expect(wardingBond.mechanics.components.m).toEqual({
        kind: "paired_worn_items",
        itemKind: "ring",
        material: "platinum",
        minimumValueGpEach: 50,
        wornBy: ["caster", "target"],
        requiredFor: "spell_duration",
      });
      expect(wardingBond.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "hour", amount: 1 },
        earlyEnd: [
          { kind: "caster_drops_to_0_hp" },
          { kind: "attached_bond_exceeds_range" },
          { kind: "spell_cast_again_on_connected_creature" },
        ],
      });
      expect(wardingBond.mechanics.attachment).toEqual({
        kind: "caster_target_bond",
        target: {
          kind: "hole",
          holeId: "warding_bond_target",
          label: "willing creature",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature"],
              disposition: "willing",
            },
          },
        },
        range: { kind: "within_feet", feet: 60 },
      });
      expect(wardingBond.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          predicate: { kind: "attached_bond_within_range" },
          effect: {
            kind: "modify_ac",
            delta: { kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" },
          },
        },
        {
          trigger: { kind: "passive" },
          predicate: { kind: "attached_bond_within_range" },
          effect: {
            kind: "modify_roll_numeric",
            on: ["saving_throw"],
            delta: { kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" },
          },
        },
        {
          trigger: { kind: "passive" },
          predicate: { kind: "attached_bond_within_range" },
          effect: {
            kind: "grant_resistance",
            damageType: { kind: "all_damage_types" },
          },
        },
        {
          trigger: { kind: "on_attached_damaged" },
          effect: {
            kind: "share_damage_to_caster",
            amount: "same_as_attached_damage_taken",
          },
        },
      ]);
    }
  });

  test("decodes Magic Weapon as an item-attached weapon enhancement", () => {
    const magicWeapon = decodeUnitRecordSync(magicWeaponInput);

    expect(magicWeapon.kind).toBe("spell");
    if (
      magicWeapon.kind !== "spell" ||
      magicWeapon.mechanics.family !== "ongoing_effect"
    ) {
      throw new Error("Expected Magic Weapon to be an ongoing-effect spell.");
    }

    expect(magicWeapon.provenance).toEqual({
      kind: "srd-5.2.1",
      section: "Spells/Descriptions-M-P#Magic Weapon",
    });
    expect(magicWeapon.mechanics.castingTime).toEqual({
      kind: "bonus_action",
    });
    expect(magicWeapon.mechanics.range).toEqual({ kind: "touch" });
    expect(magicWeapon.mechanics.duration).toEqual({
      kind: "timed",
      value: { unit: "hour", amount: 1 },
      earlyEnd: [{ kind: "caster_recasts_spell" }],
    });
    expect(magicWeapon.mechanics.attachment).toEqual({
      kind: "hole",
      holeId: "magic_weapon_object",
      label: "nonmagical weapon",
      value: {
        kind: "object",
        count: 1,
        filter: { objectKind: "weapon", magicality: "nonmagical" },
      },
    });
    expect(magicWeapon.mechanics.operations).toEqual([
      {
        trigger: { kind: "passive" },
        effect: {
          kind: "grant_magic_weapon_enhancement",
          bonus: {
            kind: "threshold_tiers",
            axis: "slot",
            base: 1,
            tiers: [
              { atLevel: 3, value: 2 },
              { atLevel: 6, value: 3 },
            ],
            sign: "+",
          },
        },
      },
    ]);
  });

  test("rejects Magic Weapon enhancement bonuses outside the SRD slot tiers", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);
    const invalidBonuses = [
      { kind: "fixed_number", amount: 1, sign: "+" },
      { kind: "fixed_dice", dice: 1, dieSize: 4, sign: "+" },
      {
        kind: "threshold_tiers",
        axis: "character",
        base: 1,
        tiers: [
          { atLevel: 3, value: 2 },
          { atLevel: 6, value: 3 },
        ],
        sign: "+",
      },
      {
        kind: "threshold_tiers",
        axis: "slot",
        base: 1,
        tiers: [
          { atLevel: 3, value: 2 },
          { atLevel: 5, value: 3 },
        ],
        sign: "+",
      },
      {
        kind: "threshold_tiers",
        axis: "slot",
        base: 1,
        tiers: [
          { atLevel: 3, value: 2 },
          { atLevel: 6, value: 3 },
        ],
        sign: "-",
      },
    ] as const;

    for (const bonus of invalidBonuses) {
      expect(
        Either.isLeft(
          decode({
            kind: "grant_magic_weapon_enhancement",
            bonus,
          }),
        ),
      ).toBe(true);
    }
  });

  test("rejects paired worn material components with duplicated generic material-cost metadata", () => {
    const decode = Schema.decodeUnknownEither(ComponentsSchema);
    const pairedWornRings = {
      kind: "paired_worn_items",
      itemKind: "ring",
      material: "platinum",
      minimumValueGpEach: 50,
      wornBy: ["caster", "target"],
      requiredFor: "spell_duration",
    };

    expect(
      Either.isRight(
        decode({
          v: true,
          s: true,
          m: pairedWornRings,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          v: true,
          s: true,
          m: pairedWornRings,
          materialCostGp: 100,
        }),
      ),
    ).toBe(true);
  });

  test("decodes Enthrall as save-gated Perception penalty over any-number creature targets", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const enthrall = result.catalog.requireUnit("enthrall");
      expect(enthrall.kind).toBe("spell");
      if (enthrall.kind !== "spell") return;
      expect(enthrall.mechanics.family).toBe("activation");
      if (enthrall.mechanics.family !== "activation") return;

      expect(enthrall.mechanics.level).toBe(2);
      expect(enthrall.mechanics.castingTime).toEqual({
        kind: "action",
      });
      expect(enthrall.mechanics.range).toEqual({
        kind: "point",
        feet: 60,
      });
      expect(enthrall.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      });
      expect(enthrall.mechanics.phases).toEqual([
        {
          kind: "save_gate",
          attachment: {
            kind: "hole",
            holeId: "enthrall_targets",
            label: "targets",
            value: {
              kind: "target",
              selection: {
                mode: "any_number",
                targetKinds: ["creature"],
              },
            },
          },
          ability: "wis",
          dc: { kind: "caster_spell_save_dc" },
          onFail: {
            kind: "modify_roll_numeric",
            on: ["ability_check"],
            delta: { kind: "fixed_number", amount: 10, sign: "-" },
            skillFilter: { kind: "fixed", skills: ["perception"] },
          },
          onSuccess: { kind: "none" },
        },
      ]);
    }
  });

  test("decodes Calm Emotions condition branch as Humanoid Sphere condition immunities", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const calmEmotions = result.catalog.requireUnit("calm_emotions");
      expect(calmEmotions.kind).toBe("spell");
      if (calmEmotions.kind !== "spell") return;
      expect(calmEmotions.mechanics.family).toBe("activation");
      if (calmEmotions.mechanics.family !== "activation") return;

      expect(calmEmotions.mechanics.level).toBe(2);
      expect(calmEmotions.mechanics.castingTime).toEqual({ kind: "action" });
      expect(calmEmotions.mechanics.range).toEqual({
        kind: "point",
        feet: 60,
      });
      expect(calmEmotions.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      });
      expect(calmEmotions.mechanics.phases).toEqual([
        {
          kind: "save_gate",
          attachment: {
            kind: "hole",
            holeId: "calm_emotions_sphere",
            label: "spell origin point",
            value: {
              kind: "area",
              shape: { kind: "sphere", radiusFeet: 20 },
              origin: { kind: "point_within_range" },
              selection: {
                mode: "any_number",
                targetKinds: ["creature"],
                typeFilter: ["humanoid"],
              },
            },
          },
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          onFail: {
            kind: "composite",
            effects: [
              {
                kind: "grant_condition_immunity",
                condition: "charmed",
              },
              {
                kind: "grant_condition_immunity",
                condition: "frightened",
              },
            ],
          },
          onSuccess: { kind: "none" },
        },
      ]);
    }
  });

  test("decodes Find Traps as instantaneous trap detection without a target save", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const findTraps = result.catalog.requireUnit("find_traps");
      expect(findTraps.kind).toBe("spell");
      if (findTraps.kind !== "spell") return;
      expect(findTraps.mechanics.family).toBe("activation");
      if (findTraps.mechanics.family !== "activation") return;

      expect(findTraps.mechanics.level).toBe(2);
      expect(findTraps.mechanics.castingTime).toEqual({
        kind: "action",
      });
      expect(findTraps.mechanics.range).toEqual({
        kind: "point",
        feet: 120,
      });
      expect(findTraps.mechanics.duration).toEqual({
        kind: "instantaneous",
      });
      expect(findTraps.mechanics.phases).toEqual([
        {
          kind: "direct",
          attachment: {
            kind: "self",
          },
          effects: [
            {
              kind: "detect",
              property: "traps",
              radiusFeet: 120,
            },
          ],
        },
      ]);
      expect(findTraps.description).toContain(
        "reveals that a trap is present but not its location",
      );
    }
  });

  test("decodes Detect Thoughts as concentration thought detection", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const detectThoughts = result.catalog.requireUnit("detect_thoughts");

    expect(detectThoughts.kind).toBe("spell");
    if (detectThoughts.kind !== "spell") return;
    expect(detectThoughts.mechanics.family).toBe("activation");
    if (detectThoughts.mechanics.family !== "activation") return;

    expect(detectThoughts.mechanics).toMatchObject({
      level: 2,
      school: "divination",
      castingTime: { kind: "action" },
      range: { kind: "self" },
      components: { v: true, s: true, m: "1 Copper Piece" },
      duration: {
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      },
    });
    expect(detectThoughts.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "detect",
            property: "thoughts",
            radiusFeet: 30,
          },
        ],
      },
    ]);
    expect(detectThoughts.description).toContain(
      "the target can take an action to make an Intelligence (Arcana) check",
    );
  });

  test("decodes Animal Messenger as a CR-gated Tiny Beast courier task", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const animalMessenger = result.catalog.requireUnit("animal_messenger");

    expect(animalMessenger.kind).toBe("spell");
    if (animalMessenger.kind !== "spell") return;
    expect(animalMessenger.mechanics.family).toBe("activation");
    if (animalMessenger.mechanics.family !== "activation") return;

    expect(animalMessenger.mechanics).toMatchObject({
      level: 2,
      school: "enchantment",
      castingTime: { kind: "action", ritual: true },
      range: { kind: "point", feet: 30 },
      components: {
        v: true,
        s: true,
        m: "a morsel of food",
      },
      duration: {
        kind: "timed",
        value: {
          unit: "hour",
          amount: 24,
          upcastTiers: [
            { atSlot: 3, amount: 72 },
            { atSlot: 4, amount: 120 },
            { atSlot: 5, amount: 168 },
            { atSlot: 6, amount: 216 },
            { atSlot: 7, amount: 264 },
            { atSlot: 8, amount: 312 },
            { atSlot: 9, amount: 360 },
          ],
        },
      },
    });
    expect(animalMessenger.mechanics.phases).toEqual([
      {
        kind: "save_gate",
        attachment: {
          kind: "hole",
          holeId: "animal_messenger_target",
          label: "target Tiny Beast",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature"],
              typeFilter: ["beast"],
              creatureSizeFilter: {
                kind: "exact",
                creatureSize: "tiny",
              },
            },
          },
        },
        ability: "cha",
        dc: { kind: "caster_spell_save_dc" },
        autoSuccessIfTarget: {
          kind: "challenge_rating_not_equal",
          challengeRating: 0,
        },
        onFail: {
          kind: "assign_courier_task",
          messenger: "target_beast",
          destination: "caster_specified_visited_location",
          recipient: "caster_specified_general_description",
          message: {
            maxWords: 25,
            delivery: "mimic_caster_communication",
          },
          travel: {
            direction: "toward_destination_for_duration",
            groundMilesPer24Hours: 25,
            flyingMilesPer24Hours: 50,
          },
          onArrival: "deliver_to_described_creature",
          onExpiryBeforeArrival:
            "message_lost_and_beast_returns_to_casting_location",
        },
        onSuccess: { kind: "none" },
      },
    ]);
    expect(animalMessenger.description).toContain(
      "message is lost, and the Beast returns to where you cast the spell",
    );
  });

  test("decodes Arcanist's Magic Aura as a magical identity mask", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const magicAura = result.catalog.requireUnit("arcanists_magic_aura");

    expect(magicAura.kind).toBe("spell");
    if (magicAura.kind !== "spell") return;
    expect(magicAura.mechanics.family).toBe("activation");
    if (magicAura.mechanics.family !== "activation") return;

    expect(magicAura.mechanics).toMatchObject({
      level: 2,
      school: "illusion",
      castingTime: { kind: "action" },
      range: { kind: "touch" },
      components: {
        v: true,
        s: true,
        m: "a small square of silk",
      },
      duration: {
        kind: "timed",
        value: { unit: "hour", amount: 24 },
        permanentAfter: {
          kind: "repeated_casts",
          cadence: "daily",
          count: 30,
          target: "same_target",
          endsOn: ["dispel"],
        },
      },
    });
    expect(magicAura.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "arcanists_magic_aura_target",
          label: "willing creature or object",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature", "object"],
              creatureDisposition: "willing",
              objectFilter: {
                targetRelation: "not_worn_or_carried",
              },
            },
          },
        },
        effects: [
          {
            kind: "magical_identity_mask",
            creatureBranch: {
              chosenCreatureType: "other_than_actual_type",
              treatedAsBy: "spells_and_magical_effects",
            },
            objectBranch: {
              auraAppearance: "nonmagical_magical_or_chosen_school",
              observedBy: "spells_and_magical_effects_detecting_magical_auras",
            },
          },
        ],
      },
    ]);
    expect(magicAura.description).toContain(
      "spells and other magical effects treat the target",
    );
  });

  test("decodes Nondetection as a divination targeting and scrying ward", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const nondetection = result.catalog.requireUnit("nondetection");

    expect(nondetection.kind).toBe("spell");
    if (nondetection.kind !== "spell") return;
    expect(nondetection.mechanics.family).toBe("activation");
    if (nondetection.mechanics.family !== "activation") return;

    expect(nondetection.mechanics).toMatchObject({
      level: 3,
      school: "abjuration",
      castingTime: { kind: "action" },
      range: { kind: "touch" },
      components: {
        v: true,
        s: true,
        m: "a pinch of diamond dust worth 25+ GP, which the spell consumes",
        materialCostGp: 25,
        materialConsumed: true,
      },
      duration: {
        kind: "timed",
        value: { unit: "hour", amount: 8 },
      },
    });
    expect(nondetection.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "nondetection_target",
          label: "willing creature, place, or object",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature", "object", "location"],
              creatureDisposition: "willing",
              objectOrLocationMaxDimensionFeet: 10,
            },
          },
        },
        effects: [
          {
            kind: "block_divination_targeting_and_scrying_perception",
          },
        ],
      },
    ]);
    expect(nondetection.description).toContain(
      "can't be targeted by any Divination spell",
    );
  });

  test("decodes Augury as a GM-chosen divination omen table", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const augury = result.catalog.requireUnit("augury");

    expect(augury.kind).toBe("spell");
    if (augury.kind !== "spell") return;
    expect(augury.mechanics.family).toBe("activation");
    if (augury.mechanics.family !== "activation") return;

    expect(augury.mechanics).toMatchObject({
      level: 2,
      school: "divination",
      castingTime: { kind: "minutes", amount: 1, ritual: true },
      range: { kind: "self" },
      components: {
        v: true,
        s: true,
        m: "specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP",
        materialCostGp: 25,
      },
      duration: { kind: "instantaneous" },
    });
    expect(augury.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "divination_omen",
            source: "otherworldly_entity",
            subject: {
              kind: "planned_course_of_action",
              plannedWithinMinutes: 30,
            },
            adjudication: {
              kind: "gm_chosen_omen_table",
              table: {
                good: "weal",
                bad: "woe",
                goodAndBad: "weal_and_woe",
                neitherGoodNorBad: "indifference",
              },
            },
            changedCircumstances: "not_accounted_for",
            repeatCasting: {
              resetBy: "long_rest",
              noAnswerChance: {
                kind: "cumulative_percent_per_cast_after_first",
                percent: 25,
                result: "no_answer",
              },
            },
          },
        ],
      },
    ]);
    expect(augury.description).toContain("cumulative 25 percent chance");
  });

  test("decodes Locate Animals or Plants as ritual nearest-kind location disclosure", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const locate = result.catalog.requireUnit("locate_animals_or_plants");

    expect(locate.kind).toBe("spell");
    if (locate.kind !== "spell") return;
    expect(locate.mechanics.family).toBe("activation");
    if (locate.mechanics.family !== "activation") return;

    expect(locate.mechanics).toMatchObject({
      level: 2,
      school: "divination",
      castingTime: { kind: "action", ritual: true },
      range: { kind: "self" },
      components: {
        v: true,
        s: true,
        m: "fur from a bloodhound",
      },
      duration: { kind: "instantaneous" },
    });
    expect(locate.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "locate_kind",
            subjectKinds: ["beast", "plant_creature", "nonmagical_plant"],
            maxDistanceFeet: 26400,
            match: "closest",
            query: "described_or_named_specific_kind",
            result: "direction_and_distance",
          },
        ],
      },
    ]);
    expect(locate.description).toContain(
      "direction and distance to the closest creature or plant",
    );
  });

  test("decodes Plant Growth as Overgrowth or Enrichment modal casting", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const plantGrowth = result.catalog.requireUnit("plant_growth");

    expect(plantGrowth.kind).toBe("spell");
    if (plantGrowth.kind !== "spell") return;
    expect(plantGrowth.mechanics.family).toBe("modal_activation");
    if (plantGrowth.mechanics.family !== "modal_activation") return;

    expect(plantGrowth.mechanics).toMatchObject({
      level: 3,
      school: "transmutation",
      range: { kind: "point", feet: 150 },
      components: { v: true, s: true, m: false },
      duration: { kind: "instantaneous" },
      mode: {
        label: "Plant Growth casting mode",
        options: [
          {
            id: "overgrowth",
            displayName: "Overgrowth",
            castingTime: { kind: "action" },
            attachment: {
              kind: "area",
              origin: { kind: "point_within_range" },
              shape: { kind: "sphere", radiusFeet: 100 },
              excludedAreas: {
                chooser: "caster",
                count: "one_or_more",
                size: "any",
              },
            },
            effects: [
              {
                kind: "area_movement_cost_multiplier",
                multiplier: 4,
                appliesTo: "any_movement",
              },
            ],
          },
          {
            id: "enrichment",
            displayName: "Enrichment",
            castingTime: { kind: "hours", amount: 8, ritual: false },
            attachment: {
              kind: "area",
              origin: { kind: "point_within_range" },
              shape: { kind: "sphere", radiusFeet: 2640 },
            },
            effects: [
              {
                kind: "plant_enrichment",
                duration: { unit: "day", amount: 365 },
                harvestYieldMultiplier: 2,
                benefitLimit: { kind: "one_application_per_year" },
              },
            ],
          },
        ],
      },
    });
    expect(plantGrowth.description).toContain(
      "4 feet of movement for every 1 foot",
    );
    expect(plantGrowth.description).toContain(
      "yield twice the normal amount of food",
    );
  });

  test("decodes Remove Curse as an authored Spell Definition without runtime curse cleanup admission", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const removeCurse = result.catalog.requireUnit("remove_curse");

    expect(removeCurse.kind).toBe("spell");
    if (removeCurse.kind !== "spell") return;
    expect(removeCurse.mechanics.family).toBe("activation");
    if (removeCurse.mechanics.family !== "activation") return;

    expect(removeCurse.provenance).toEqual({
      kind: "srd-5.2.1",
      section: "Spells/Descriptions-Q-R#Remove Curse",
    });
    expect(removeCurse.mechanics).toMatchObject({
      level: 3,
      school: "abjuration",
      castingTime: { kind: "action" },
      range: { kind: "touch" },
      components: { v: true, s: true, m: false },
      duration: { kind: "instantaneous" },
    });
    expect(removeCurse.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "remove_curse_target",
          label: "creature or object",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature", "object"],
            },
          },
        },
        effects: [{ kind: "none" }],
      },
    ]);
    expect(removeCurse.description).toContain("breaks its owner's Attunement");
  });

  test("decodes Revivify as a death-window revival Spell Definition", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const revivify = result.catalog.requireUnit("revivify");

    expect(revivify.kind).toBe("spell");
    if (revivify.kind !== "spell") return;
    expect(revivify.mechanics.family).toBe("activation");
    if (revivify.mechanics.family !== "activation") return;

    expect(revivify.provenance).toEqual({
      kind: "srd-5.2.1",
      section: "Spells/Descriptions-Q-R#Revivify",
    });
    expect(revivify.mechanics).toMatchObject({
      level: 3,
      school: "necromancy",
      castingTime: { kind: "action" },
      range: { kind: "touch" },
      components: {
        v: true,
        s: true,
        m: "a diamond worth 300+ GP, which the spell consumes",
        materialCostGp: 300,
        materialConsumed: true,
      },
      duration: { kind: "instantaneous" },
    });
    expect(revivify.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "revivify_target",
          label: "dead creature",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature"],
              stateFilter: ["dead"],
            },
          },
        },
        effects: [
          {
            kind: "revive_dead_creature",
            deathWindow: { unit: "minute", amount: 1 },
            hitPoints: 1,
            spiritConsent: "can_refuse",
            excludedDeathCauses: ["old_age"],
            missingBodyParts: "not_restored",
            returningOngoingEffects: {
              conditions: "preserve_if_duration_ongoing",
              magicalContagions: "preserve_if_duration_ongoing",
              curses: "preserve_if_duration_ongoing",
              exhaustion: { kind: "reduce_by", amount: 1 },
              attunement: "ends",
            },
          },
        ],
      },
    ]);
    expect(revivify.description).toContain(
      "conditions, magical contagions, and curses",
    );
  });

  test("decodes Sending as table-owned mental message delivery", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const sending = result.catalog.requireUnit("sending");

    expect(sending.kind).toBe("spell");
    if (sending.kind !== "spell") return;
    expect(sending.mechanics.family).toBe("activation");
    if (sending.mechanics.family !== "activation") return;

    expect(sending.provenance).toEqual({
      kind: "srd-5.2.1",
      section: "Spells/Descriptions-S-Z#Sending",
    });
    expect(sending.mechanics).toMatchObject({
      level: 3,
      school: "divination",
      castingTime: { kind: "action" },
      range: { kind: "unlimited" },
      components: { v: true, s: true, m: "a copper wire" },
      duration: { kind: "instantaneous" },
    });
    expect(sending.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "sending_recipient",
          label: "met or described creature",
          value: {
            kind: "target",
            selection: {
              mode: "one",
              targetKinds: ["creature"],
            },
          },
        },
        effects: [
          {
            kind: "deliver_mental_message",
            recipient: "met_by_caster_or_described_by_someone_who_met_it",
            message: {
              maxWords: 25,
              delivery: "target_hears_in_mind",
              understanding: "meaning_enabled",
            },
            senderRecognition: "if_target_knows_sender",
            response: {
              manner: "like_message",
              timing: "immediate",
            },
            planarDelivery: {
              reach: "any_distance_and_other_planes",
              failureChance: {
                kind: "percent_if_different_plane",
                percent: 5,
                result: "message_does_not_arrive",
                casterKnowsFailure: true,
              },
            },
            recipientBlock: {
              duration: { unit: "hour", amount: 8 },
              retryResult: "caster_learns_blocked_and_spell_fails",
            },
          },
        ],
      },
    ]);
    expect(sending.description).toContain(
      "can answer in a like manner immediately",
    );
    expect(sending.description).toContain("5 percent chance");
  });

  test("rejects Sending mental message block durations other than 8 hours", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);
    const sendingMentalMessageEffect = {
      kind: "deliver_mental_message",
      recipient: "met_by_caster_or_described_by_someone_who_met_it",
      message: {
        maxWords: 25,
        delivery: "target_hears_in_mind",
        understanding: "meaning_enabled",
      },
      senderRecognition: "if_target_knows_sender",
      response: {
        manner: "like_message",
        timing: "immediate",
      },
      planarDelivery: {
        reach: "any_distance_and_other_planes",
        failureChance: {
          kind: "percent_if_different_plane",
          percent: 5,
          result: "message_does_not_arrive",
          casterKnowsFailure: true,
        },
      },
      recipientBlock: {
        duration: { unit: "hour", amount: 8 },
        retryResult: "caster_learns_blocked_and_spell_fails",
      },
    };

    expect(Either.isRight(decode(sendingMentalMessageEffect))).toBe(true);
    for (const duration of [
      { unit: "hour", amount: 1 },
      { unit: "minute", amount: 8 },
      { unit: "day", amount: 1 },
    ] as const) {
      expect(
        Either.isLeft(
          decode({
            ...sendingMentalMessageEffect,
            recipientBlock: {
              ...sendingMentalMessageEffect.recipientBlock,
              duration,
            },
          }),
        ),
      ).toBe(true);
    }
  });

  test("decodes Sleet Storm as an authored Cylinder hazard Spell Definition", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const sleetStorm = result.catalog.requireUnit("sleet_storm");

    expect(sleetStorm.kind).toBe("spell");
    if (sleetStorm.kind !== "spell") return;
    expect(sleetStorm.mechanics.family).toBe("ongoing_effect");
    if (sleetStorm.mechanics.family !== "ongoing_effect") return;

    expect(sleetStorm.provenance).toEqual({
      kind: "srd-5.2.1",
      section: "Spells/Descriptions-S-Z#Sleet Storm",
    });
    expect(sleetStorm.mechanics).toMatchObject({
      level: 3,
      school: "conjuration",
      castingTime: { kind: "action" },
      range: { kind: "point", feet: 150 },
      components: { v: true, s: true, m: "a miniature umbrella" },
      duration: { kind: "concentration", upTo: { unit: "minute", amount: 1 } },
      attachment: {
        kind: "hole",
        holeId: "sleet_storm_cylinder",
        label: "storm cylinder",
        value: {
          kind: "area",
          shape: { kind: "cylinder", radiusFeet: 20, heightFeet: 40 },
          origin: { kind: "point_within_range" },
        },
      },
    });

    const failedSave = {
      kind: "composite",
      effects: [
        { kind: "apply_condition", condition: "prone" },
        { kind: "break_concentration" },
      ],
    } as const;
    const dexteritySave = {
      kind: "save_gate",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      onFail: failedSave,
      onSuccess: { kind: "none" },
    } as const;

    expect(sleetStorm.mechanics.operations).toEqual([
      {
        trigger: { kind: "passive" },
        effect: { kind: "area_is_heavily_obscured" },
      },
      {
        trigger: { kind: "passive" },
        effect: { kind: "douse_exposed_flames" },
      },
      {
        trigger: { kind: "passive" },
        effect: { kind: "area_is_difficult_terrain" },
      },
      {
        trigger: { kind: "on_creature_enters_area" },
        effect: dexteritySave,
        usageLimit: {
          kind: "once_per_turn",
          limitGroup: "sleet_storm_save_per_turn",
        },
      },
      {
        trigger: { kind: "on_creature_starts_turn_in_area" },
        effect: dexteritySave,
        usageLimit: {
          kind: "once_per_turn",
          limitGroup: "sleet_storm_save_per_turn",
        },
      },
    ]);
    expect(sleetStorm.description).toContain("Heavily Obscured");
    expect(sleetStorm.description).toContain("lose Concentration");
  });

  test("rejects contradictory Revivify death target-state filters", () => {
    const decode = Schema.decodeUnknownEither(TargetSelectionSchema);

    expect(
      Either.isRight(
        decode({
          mode: "one",
          targetKinds: ["creature"],
          stateFilter: ["dead"],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "one",
          targetKinds: ["creature"],
          stateFilter: ["dead_within_last_minute"],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "one",
          targetKinds: ["creature"],
          stateFilter: ["dead", "zero_hp_not_dead"],
        }),
      ),
    ).toBe(true);
  });

  test("decodes Locate Object as object location and motion disclosure", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const locate = result.catalog.requireUnit("locate_object");

    expect(locate.kind).toBe("spell");
    if (locate.kind !== "spell") return;
    expect(locate.mechanics.family).toBe("activation");
    if (locate.mechanics.family !== "activation") return;

    expect(locate.mechanics).toMatchObject({
      level: 2,
      school: "divination",
      castingTime: { kind: "action" },
      range: { kind: "self" },
      components: {
        v: true,
        s: true,
        m: "a forked twig",
      },
      duration: {
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      },
    });
    expect(locate.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "object_location_sense",
            searchModes: {
              specificKnownObject: { seenUpCloseWithinFeet: 30 },
              nearestObjectKind: "particular_kind",
            },
            maxDistanceFeet: 1000,
            result: "direction_to_location_and_movement",
            blockedBy: "any_thickness_of_lead_direct_path",
          },
        ],
      },
    ]);
    expect(locate.description).toContain(
      "you know the direction of its movement",
    );
  });

  test("decodes Magic Mouth as an object-anchored spoken-message trigger", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const magicMouth = result.catalog.requireUnit("magic_mouth");

    expect(magicMouth.kind).toBe("spell");
    if (magicMouth.kind !== "spell") return;
    expect(magicMouth.mechanics.family).toBe("anchored_trigger");
    if (magicMouth.mechanics.family !== "anchored_trigger") return;

    expect(magicMouth.mechanics).toMatchObject({
      level: 2,
      school: "illusion",
      castingTime: { kind: "minutes", amount: 1, ritual: true },
      range: { kind: "point", feet: 30 },
      components: {
        v: true,
        s: true,
        m: "jade dust worth 10+ GP, which the spell consumes",
        materialCostGp: 10,
        materialConsumed: true,
      },
      duration: { kind: "permanent", endsOn: ["dispel"] },
    });
    expect(magicMouth.mechanics.anchor).toEqual({
      kind: "object",
      visibility: "caster_can_see",
      wornOrCarried: "not_worn_or_carried_by_another_creature",
    });
    expect(magicMouth.mechanics.events).toEqual([
      {
        kind: "caster_defined_visual_or_audible_condition",
        maxDistanceFeet: 30,
      },
    ]);
    expect(magicMouth.mechanics.filters).toEqual([]);
    expect(magicMouth.mechanics.signals).toEqual([
      {
        kind: "spoken_message",
        voice: "caster_voice",
        volume: "same_as_spoken",
        maxWords: 25,
        maxDeliveryMinutes: 10,
        mouthPlacement: "object_mouth_if_present",
        repetition: "caster_choice_once_or_repeating",
      },
    ]);
    expect(magicMouth.description).toContain(
      "visual or audible conditions within 30 feet",
    );
  });

  test("decodes Rope Trick as a spell-created extradimensional refuge", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const ropeTrick = result.catalog.requireUnit("rope_trick");

    expect(ropeTrick.kind).toBe("spell");
    if (ropeTrick.kind !== "spell") return;
    expect(ropeTrick.mechanics.family).toBe("activation");
    if (ropeTrick.mechanics.family !== "activation") return;

    expect(ropeTrick.mechanics).toMatchObject({
      level: 2,
      school: "transmutation",
      castingTime: { kind: "action" },
      range: { kind: "touch" },
      components: {
        v: true,
        s: true,
        m: "a segment of rope",
      },
      duration: {
        kind: "timed",
        value: { amount: 1, unit: "hour" },
      },
    });
    expect(ropeTrick.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "rope_trick_rope",
          label: "touched rope",
          value: {
            kind: "object",
            count: 1,
          },
        },
        effects: [
          {
            kind: "create_extradimensional_space",
            anchor: {
              kind: "touched_rope",
              topEndMotion: "hovers_until_perpendicular_or_ceiling",
            },
            entry: {
              visibility: "invisible",
              widthFeet: 3,
              heightFeet: 5,
              location: "anchor_upper_end",
            },
            access: {
              kind: "climb_anchor",
              anchorMovement: "can_be_pulled_into_or_dropped_out",
            },
            capacity: {
              creatureCount: 8,
              maxCreatureSize: "medium",
            },
            boundary: {
              attacksSpellsAndEffects: "blocked_bidirectionally",
              occupantPerception: "can_see_out_through_portal",
            },
            onEnd: { kind: "drop_contents_out" },
          },
        ],
      },
    ]);
    expect(ropeTrick.description).toContain(
      "Attacks, spells, and other effects can't pass into or out of the space",
    );
  });

  test("rejects non-RAW Locate Object subject variants", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);

    expect(
      Either.isLeft(
        decode({
          kind: "object_location_sense",
          searchModes: {
            specificKnownObject: { seenUpCloseWithinFeet: 31 },
            nearestObjectKind: "particular_kind",
          },
          maxDistanceFeet: 1000,
          result: "direction_to_location_and_movement",
          blockedBy: "any_thickness_of_lead_direct_path",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "object_location_sense",
          searchModes: {
            specificKnownObject: { seenUpCloseWithinFeet: 30 },
            nearestObjectKind: "any_kind",
          },
          maxDistanceFeet: 1000,
          result: "direction_to_location_and_movement",
          blockedBy: "any_thickness_of_lead_direct_path",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "object_location_sense",
          searchModes: {
            specificKnownObject: { seenUpCloseWithinFeet: 30 },
            nearestObjectKind: "particular_kind",
          },
          maxDistanceFeet: 1000,
          result: "direction_to_location",
          blockedBy: "any_thickness_of_lead_direct_path",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "object_location_sense",
          searchModes: {
            specificKnownObject: { seenUpCloseWithinFeet: 30 },
            nearestObjectKind: "particular_kind",
          },
          maxDistanceFeet: 1000,
          result: "direction_to_location_and_movement",
          blockedBy: "lead",
        }),
      ),
    ).toBe(true);
  });

  test("rejects non-RAW Animal Messenger courier task variants", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);
    const decodePhase = Schema.decodeUnknownEither(ActivationPhaseSchema);
    const courierTask = {
      kind: "assign_courier_task",
      messenger: "target_beast",
      destination: "caster_specified_visited_location",
      recipient: "caster_specified_general_description",
      message: {
        maxWords: 25,
        delivery: "mimic_caster_communication",
      },
      travel: {
        direction: "toward_destination_for_duration",
        groundMilesPer24Hours: 25,
        flyingMilesPer24Hours: 50,
      },
      onArrival: "deliver_to_described_creature",
      onExpiryBeforeArrival:
        "message_lost_and_beast_returns_to_casting_location",
    };
    const tinyBeastTargetAttachment = {
      kind: "target",
      selection: {
        mode: "one",
        targetKinds: ["creature"],
        typeFilter: ["beast"],
        creatureSizeFilter: {
          kind: "exact",
          creatureSize: "tiny",
        },
      },
    };
    const objectTargetAttachment = {
      kind: "target",
      selection: {
        mode: "one",
        targetKinds: ["object"],
      },
    };
    const creatureOrObjectTargetAttachment = {
      kind: "target",
      selection: {
        mode: "one",
        targetKinds: ["creature", "object"],
        objectFilter: {
          material: "metal",
        },
      },
    };

    expect(Either.isRight(decode(courierTask))).toBe(true);
    expect(
      Either.isRight(
        decodePhase({
          kind: "save_gate",
          attachment: tinyBeastTargetAttachment,
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          autoSuccessIfTarget: {
            kind: "challenge_rating_not_equal",
            challengeRating: 0,
          },
          onFail: courierTask,
          onSuccess: { kind: "none" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          ...courierTask,
          message: {
            maxWords: 26,
            delivery: "mimic_caster_communication",
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          ...courierTask,
          travel: {
            direction: "toward_destination_for_duration",
            groundMilesPer24Hours: 30,
            flyingMilesPer24Hours: 50,
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          ...courierTask,
          onExpiryBeforeArrival: "message_lost",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodePhase({
          kind: "save_gate",
          attachment: { kind: "self" },
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          autoSuccessIfTarget: {
            kind: "challenge_rating_not_equal",
            challengeRating: 1,
          },
          onFail: courierTask,
          onSuccess: { kind: "none" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodePhase({
          kind: "save_gate",
          attachment: { kind: "self" },
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          autoSuccessIfTarget: {
            kind: "challenge_rating_not_equal",
            challengeRating: 0,
          },
          onFail: courierTask,
          onSuccess: { kind: "none" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodePhase({
          kind: "save_gate",
          attachment: objectTargetAttachment,
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          autoSuccessIfTarget: {
            kind: "challenge_rating_not_equal",
            challengeRating: 0,
          },
          onFail: courierTask,
          onSuccess: { kind: "none" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodePhase({
          kind: "save_gate",
          attachment: creatureOrObjectTargetAttachment,
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          autoSuccessIfTarget: {
            kind: "challenge_rating_not_equal",
            challengeRating: 0,
          },
          onFail: courierTask,
          onSuccess: { kind: "none" },
        }),
      ),
    ).toBe(true);
  });

  test("decodes Knock as object access release plus Arcane Lock suppression", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;
    const knock = result.catalog.requireUnit("knock");

    expect(knock.kind).toBe("spell");
    if (knock.kind !== "spell") return;
    expect(knock.mechanics.family).toBe("activation");
    if (knock.mechanics.family !== "activation") return;

    expect(knock.mechanics).toMatchObject({
      level: 2,
      school: "transmutation",
      castingTime: { kind: "action" },
      range: { kind: "point", feet: 60 },
      components: { v: true, s: false, m: false },
      duration: { kind: "instantaneous" },
    });

    expect(knock.mechanics.phases).toEqual([
      {
        kind: "direct",
        attachment: {
          kind: "hole",
          holeId: "knock_target_object",
          label: "target object",
          value: {
            kind: "object",
            count: 1,
            filter: { accessPreventionMeans: "mundane_or_magical" },
          },
        },
        effects: [
          { kind: "release_object_access", mundaneLockLimit: 1 },
          {
            kind: "suppress_arcane_lock",
            duration: { unit: "minute", amount: 10 },
            allowsOpenClose: true,
          },
          {
            kind: "audible",
            sound: "loud knock",
            audibleRadiusFeet: 300,
          },
        ],
      },
    ]);
    expect(knock.description).toContain(
      "a loud knock, audible up to 300 feet away",
    );
  });

  test("rejects non-RAW Knock Arcane Lock suppression variants", () => {
    const decode = Schema.decodeUnknownEither(EffectAtomSchema);

    expect(
      Either.isLeft(
        decode({
          kind: "suppress_arcane_lock",
          duration: { unit: "minute", amount: 9 },
          allowsOpenClose: true,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "suppress_arcane_lock",
          duration: { unit: "hour", amount: 10 },
          allowsOpenClose: true,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "suppress_object_access_spell",
          spellId: "arcane_lock",
          duration: { unit: "minute", amount: 10 },
          allowsOpenClose: true,
        }),
      ),
    ).toBe(true);
  });

  test("decodes Enlarge/Reduce as a creature-or-object target with creature-branch size and Strength-mode facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const enlargeReduce = result.catalog.requireUnit("enlarge_reduce");
      expect(enlargeReduce.kind).toBe("spell");
      if (enlargeReduce.kind !== "spell") return;
      expect(enlargeReduce.mechanics.family).toBe("activation");
      if (enlargeReduce.mechanics.family !== "activation") return;

      expect(enlargeReduce.mechanics.level).toBe(2);
      expect(enlargeReduce.mechanics.castingTime).toEqual({
        kind: "action",
      });
      expect(enlargeReduce.mechanics.range).toEqual({
        kind: "point",
        feet: 30,
      });
      expect(enlargeReduce.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
      });

      const phase = enlargeReduce.mechanics.phases[0];
      expect(phase?.kind).toBe("save_gate");
      if (phase?.kind !== "save_gate") return;
      expect(phase.ability).toBe("con");
      expect(phase.saveAppliesIf).toBe("unwilling_creature_target");
      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "enlarge_reduce_target",
        label: "creature or object target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature", "object"],
            objectFilter: {
              visibility: "caster_can_see",
              targetRelation: "not_worn_or_carried",
            },
          },
        },
      });
      expect(phase.onSuccess).toEqual({ kind: "none" });

      const modeChoice = phase.onFail;
      expect(modeChoice.kind).toBe("choose_effect_mode");
      if (modeChoice.kind !== "choose_effect_mode") return;
      expect(modeChoice.label).toBe("Enlarge/Reduce effect");
      expect(modeChoice.options).toEqual([
        {
          id: "enlarge",
          displayName: "Enlarge",
          effects: [
            {
              kind: "modify_size_category",
              direction: "increase",
              steps: 1,
            },
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              on: ["ability_check"],
              abilityFilter: ["str"],
            },
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              on: ["saving_throw"],
              saveAbilityFilter: ["str"],
            },
            {
              kind: "modify_damage_numeric",
              delta: {
                kind: "fixed_dice",
                dice: 1,
                dieSize: 4,
                sign: "+",
              },
              damageSourceFilter: {
                kind: "attack_hit",
                attackRollFilter: "weapon_or_unarmed_strike",
              },
            },
          ],
        },
        {
          id: "reduce",
          displayName: "Reduce",
          effects: [
            {
              kind: "modify_size_category",
              direction: "decrease",
              steps: 1,
            },
            {
              kind: "modify_roll_advantage",
              mode: "disadvantage",
              on: ["ability_check"],
              abilityFilter: ["str"],
            },
            {
              kind: "modify_roll_advantage",
              mode: "disadvantage",
              on: ["saving_throw"],
              saveAbilityFilter: ["str"],
            },
            {
              kind: "modify_damage_numeric",
              delta: {
                kind: "fixed_dice",
                dice: 1,
                dieSize: 4,
                sign: "-",
              },
              damageSourceFilter: {
                kind: "attack_hit",
                attackRollFilter: "weapon_or_unarmed_strike",
              },
              minimumDamageTotal: 1,
            },
          ],
        },
      ]);
    }
  });

  test("distinguishes Hex's later-turn retargeting from Hunter's Mark transfer timing", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const huntersMark = result.catalog.requireUnit("hunters_mark");
      const hex = result.catalog.requireUnit("hex");
      expect(huntersMark.kind).toBe("spell");
      expect(hex.kind).toBe("spell");
      if (huntersMark.kind !== "spell" || hex.kind !== "spell") return;
      expect(huntersMark.mechanics.family).toBe("ongoing_effect");
      expect(hex.mechanics.family).toBe("ongoing_effect");
      if (
        huntersMark.mechanics.family !== "ongoing_effect" ||
        hex.mechanics.family !== "ongoing_effect" ||
        huntersMark.mechanics.attachment.kind !== "hole" ||
        hex.mechanics.attachment.kind !== "hole" ||
        huntersMark.mechanics.attachment.value.kind !== "mark" ||
        hex.mechanics.attachment.value.kind !== "mark"
      ) {
        return;
      }

      expect(
        huntersMark.mechanics.attachment.value.transfer?.availability,
      ).toEqual({ kind: "after_trigger" });
      expect(hex.mechanics.attachment.value.transfer?.availability).toEqual({
        kind: "later_turn_after_trigger",
      });
    }
  });

  test("decodes Dissonant Whispers as damage plus forced Reaction movement", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const dissonantWhispers =
        result.catalog.requireUnit("dissonant_whispers");
      expect(dissonantWhispers.kind).toBe("spell");
      if (dissonantWhispers.kind !== "spell") return;
      expect(dissonantWhispers.mechanics.family).toBe("activation");
      if (dissonantWhispers.mechanics.family !== "activation") return;

      const phase = dissonantWhispers.mechanics.phases[0];
      expect(phase?.kind).toBe("save_gate");
      if (phase?.kind !== "save_gate") return;

      expect(phase.ability).toBe("wis");
      expect(phase.onSuccess).toEqual({ kind: "half_damage" });
      expect(phase.onFail).toEqual({
        kind: "composite",
        effects: [
          {
            kind: "damage",
            damageType: "psychic",
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              base: { dice: 3, dieSize: 6 },
              perLevel: { dice: 1 },
              startingAtLevel: 1,
            },
          },
          {
            kind: "forced_reaction_movement",
            cost: "target_reaction_if_available",
            unavailable: "no_movement",
            distance: "as_far_as_possible",
            direction: "away_from_caster",
            route: "safest_available",
          },
        ],
      });
    }
  });

  test("decodes Thunderwave as save damage plus push and boom facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const thunderwave = result.catalog.requireUnit("thunderwave");
      expect(thunderwave.kind).toBe("spell");
      if (thunderwave.kind !== "spell") return;
      expect(thunderwave.mechanics.family).toBe("activation");
      if (thunderwave.mechanics.family !== "activation") return;

      const savePhase = thunderwave.mechanics.phases[0];
      expect(savePhase?.kind).toBe("save_gate");
      if (savePhase?.kind !== "save_gate") return;

      const thunderwaveArea = {
        kind: "area",
        shape: { kind: "cube", sideFeet: 15 },
        origin: { kind: "self" },
      };
      expect(savePhase.attachment).toEqual(thunderwaveArea);
      expect(savePhase.ability).toBe("con");
      expect(savePhase.onSuccess).toEqual({ kind: "half_damage" });
      expect(savePhase.onFail).toEqual({
        kind: "composite",
        effects: [
          {
            kind: "damage",
            damageType: "thunder",
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              base: { dice: 2, dieSize: 8 },
              perLevel: { dice: 1 },
              startingAtLevel: 1,
            },
          },
          {
            kind: "force_move",
            movementKind: "push",
            originDirection: "away_from_caster",
            distanceFeet: 10,
          },
        ],
      });

      const objectAndBoomPhase = thunderwave.mechanics.phases[1];
      expect(objectAndBoomPhase?.kind).toBe("direct");
      if (objectAndBoomPhase?.kind !== "direct") return;

      expect(objectAndBoomPhase.attachment).toEqual(thunderwaveArea);
      expect(objectAndBoomPhase.effects).toEqual([
        {
          kind: "push_unsecured_objects",
          objectLocation: "entirely_within_area",
          originDirection: "away_from_caster",
          distanceFeet: 10,
        },
        {
          kind: "audible",
          sound: "thunderous boom",
          audibleRadiusFeet: 300,
        },
      ]);
    }
  });

  test("decodes Hideous Laughter as multi-trigger repeat saves plus Prone self-end suppression", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const hideousLaughter = result.catalog.requireUnit("hideous_laughter");
      expect(hideousLaughter.kind).toBe("spell");
      if (hideousLaughter.kind !== "spell") return;
      expect(hideousLaughter.mechanics.family).toBe("activation");
      if (hideousLaughter.mechanics.family !== "activation") return;

      const phase = hideousLaughter.mechanics.phases[0];
      expect(phase?.kind).toBe("save_gate");
      if (phase?.kind !== "save_gate") return;

      expect(phase.ability).toBe("wis");
      expect(phase.attachment.kind).toBe("hole");
      expect(phase.onFail).toEqual({
        kind: "composite",
        effects: [
          { kind: "apply_condition", condition: "prone" },
          { kind: "apply_condition", condition: "incapacitated" },
          { kind: "suppress_condition_self_end", condition: "prone" },
        ],
      });
      expect(phase.repeatSaves).toEqual([
        {
          cadence: "end_of_target_turn",
          onSuccess: "ends_on_target",
        },
        {
          cadence: "on_target_takes_damage",
          rollMode: "advantage",
          onSuccess: "ends_on_target",
        },
      ]);
    }
  });

  test("decodes Hypnotic Pattern as sight-gated Cube control with typed target escapes", () => {
    const hypnoticPatternCollection = defineSrdUnitCollection({
      units: [assertSrd521Unit(decodeUnitRecordSync(hypnoticPatternInput))],
    });
    const result = buildUnitCatalog({
      collections: [hypnoticPatternCollection],
    });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const hypnoticPattern = result.catalog.requireUnit("hypnotic_pattern");
      expect(hypnoticPattern.kind).toBe("spell");
      if (hypnoticPattern.kind !== "spell") return;
      expect(hypnoticPattern.mechanics.family).toBe("activation");
      if (hypnoticPattern.mechanics.family !== "activation") return;

      expect(hypnoticPattern.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 1 },
        earlyEnd: [{ kind: "target_takes_damage" }],
      });

      const phase = hypnoticPattern.mechanics.phases[0];
      expect(phase?.kind).toBe("save_gate");
      if (phase?.kind !== "save_gate") return;

      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "hypnotic_pattern_point",
        label: "spell origin point",
        value: {
          kind: "area",
          shape: { kind: "cube", sideFeet: 30 },
          origin: { kind: "point_within_range" },
          occupantPerceptionFilter: "can_see_area_effect",
        },
      });
      expect(phase.ability).toBe("wis");
      expect(phase.onSuccess).toEqual({ kind: "none" });
      expect(phase.onFail).toEqual({
        kind: "composite",
        effects: [
          { kind: "apply_condition", condition: "charmed" },
          { kind: "apply_condition", condition: "incapacitated" },
          { kind: "set_speed", feet: 0 },
          {
            kind: "target_effect_escape_action",
            actor: "another_creature",
            cost: "action",
            method: "shake_awake",
            outcome: "end_current_effect",
          },
        ],
      });
    }
  });

  test("rejects Thunderwave area-only push facts outside area attachments", () => {
    const decode = Schema.decodeUnknownEither(ActivationPhaseSchema);

    expect(
      Either.isLeft(
        decode({
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "push_unsecured_objects",
              objectLocation: "entirely_within_area",
              originDirection: "away_from_caster",
              distanceFeet: 10,
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "direct",
          attachment: {
            kind: "area",
            shape: { kind: "cube", sideFeet: 15 },
            origin: { kind: "self" },
          },
          effects: [
            {
              kind: "push_unsecured_objects",
              objectLocation: "entirely_within_area",
              originDirection: "away_from_caster",
              distanceFeet: 0,
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  test("rejects non-positive or fractional Thunderwave feet facts", () => {
    const decodeAudible = Schema.decodeUnknownEither(AudibleEffectSchema);
    const decodeEffectAtom = Schema.decodeUnknownEither(EffectAtomSchema);

    expect(
      Either.isLeft(
        decodeAudible({
          kind: "audible",
          sound: "thunderous boom",
          audibleRadiusFeet: 0,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeAudible({
          kind: "audible",
          sound: "thunderous boom",
          audibleRadiusFeet: 300.5,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeEffectAtom({
          kind: "force_move",
          movementKind: "push",
          originDirection: "away_from_caster",
          distanceFeet: 10.5,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeEffectAtom({
          kind: "force_move",
          direction: "away_from_caster",
          distanceFeet: 10,
        }),
      ),
    ).toBe(true);
  });

  test("decodes Expeditious Retreat as immediate and ongoing Dash facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const expeditiousRetreat = result.catalog.requireUnit(
        "expeditious_retreat",
      );
      expect(expeditiousRetreat.kind).toBe("spell");
      if (expeditiousRetreat.kind !== "spell") return;
      expect(expeditiousRetreat.mechanics.family).toBe("ongoing_effect");
      if (expeditiousRetreat.mechanics.family !== "ongoing_effect") return;

      expect(expeditiousRetreat.mechanics.castingTime).toEqual({
        kind: "bonus_action",
      });
      expect(expeditiousRetreat.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      });
      expect(expeditiousRetreat.mechanics.initialPhase).toEqual({
        kind: "direct",
        attachment: { kind: "self" },
        effects: [
          {
            kind: "take_standard_action",
            action: "dash",
            cost: "included_in_effect",
          },
        ],
      });
      expect(expeditiousRetreat.mechanics.operations).toEqual([
        {
          trigger: { kind: "passive" },
          effect: {
            kind: "grant_alternate_action_cost",
            from: { kind: "standard_action", actions: ["dash"] },
            to: { kind: "bonus_action" },
          },
        },
      ]);
    }
  });

  test("rejects malformed Expeditious Retreat action economy facts", () => {
    const decodeEffectAtom = Schema.decodeUnknownEither(EffectAtomSchema);

    expect(
      Either.isLeft(
        decodeEffectAtom({
          kind: "take_standard_action",
          action: "dash",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeEffectAtom({
          kind: "take_standard_action",
          action: "dash",
          cost: "action_resource",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeEffectAtom({
          kind: "grant_alternate_action_cost",
          from: { kind: "standard_action", actions: ["dash"] },
          to: { kind: "action" },
        }),
      ),
    ).toBe(true);
  });

  test("decodes Jump as timed willing-target jump movement replacement", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const jump = result.catalog.requireUnit("jump");
      expect(jump.kind).toBe("spell");
      if (jump.kind !== "spell") return;
      expect(jump.mechanics.family).toBe("activation");
      if (jump.mechanics.family !== "activation") return;

      expect(jump.mechanics.castingTime).toEqual({ kind: "bonus_action" });
      expect(jump.mechanics.range).toEqual({ kind: "touch" });
      expect(jump.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "minute", amount: 1 },
      });

      const phase = jump.mechanics.phases[0];
      expect(phase?.kind).toBe("direct");
      if (phase?.kind !== "direct") return;

      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "jump_target",
        label: "willing target",
        value: {
          kind: "target",
          selection: {
            mode: "choose_up_to",
            count: {
              kind: "linear",
              base: 1,
              perSlotAboveBase: 1,
              baseLevel: 1,
            },
            targetKinds: ["creature"],
            disposition: "willing",
          },
        },
      });
      expect(phase.effects).toEqual([
        {
          kind: "jump_movement_replacement",
          frequency: "once_on_each_target_turn",
          maxJumpDistanceFeet: 30,
          movementCostFeet: 10,
        },
      ]);
    }
  });

  test("round-trips Fly as a touched willing creature target before runtime admission", () => {
    const flyCollection = defineSrdUnitCollection({
      units: [assertSrd521Unit(decodeUnitRecordSync(flyInput))],
    });
    const result = buildUnitCatalog({ collections: [flyCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const fly = result.catalog.requireUnit("fly");
      expect(fly.kind).toBe("spell");
      if (fly.kind !== "spell") return;
      expect(fly.mechanics.family).toBe("activation");
      if (fly.mechanics.family !== "activation") return;

      expect(fly.mechanics.castingTime).toEqual({ kind: "action" });
      expect(fly.mechanics.range).toEqual({ kind: "touch" });
      expect(fly.mechanics.duration).toEqual({
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      });

      const phase = fly.mechanics.phases[0];
      expect(phase?.kind).toBe("direct");
      if (phase?.kind !== "direct") return;

      expect(phase.attachment.kind).toBe("hole");
      if (phase.attachment.kind !== "hole") return;
      expect(phase.attachment.value.kind).toBe("target");
      if (phase.attachment.value.kind !== "target") return;
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(TargetSelectionSchema)(
            phase.attachment.value.selection,
          ),
        ),
      ).toBe(true);
      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "fly_target",
        label: "target",
        value: {
          kind: "target",
          selection: {
            mode: "choose_up_to",
            count: {
              kind: "linear",
              base: 1,
              perSlotAboveBase: 1,
              baseLevel: 3,
            },
            targetKinds: ["creature"],
            disposition: "willing",
          },
        },
      });
      expect(phase.effects).toEqual([
        {
          kind: "grant_speed",
          speedKind: "fly",
          feet: 60,
          hover: true,
        },
      ]);
    }
  });

  test("decodes Feather Fall as a falling-trigger Reaction mitigation", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const featherFall = result.catalog.requireUnit("feather_fall");
      expect(featherFall.kind).toBe("spell");
      if (featherFall.kind !== "spell") return;
      expect(featherFall.mechanics.family).toBe("triggered_reaction");
      if (featherFall.mechanics.family !== "triggered_reaction") return;

      expect(featherFall.mechanics.castingTime).toEqual({
        kind: "reaction",
        trigger: { kind: "self_or_visible_creature_falls", rangeFeet: 60 },
      });
      expect(featherFall.mechanics.range).toEqual({ kind: "point", feet: 60 });
      expect(featherFall.mechanics.duration).toEqual({
        kind: "timed",
        value: { unit: "minute", amount: 1 },
      });
      expect(featherFall.mechanics.interruptsTrigger).toBe(true);

      const phase = featherFall.mechanics.phases[0];
      expect(phase?.kind).toBe("direct");
      if (phase?.kind !== "direct") return;

      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "feather_fall_targets",
        label: "falling targets",
        value: {
          kind: "target",
          selection: {
            mode: "choose_up_to",
            count: 5,
            targetKinds: ["creature"],
            stateFilter: ["falling"],
          },
        },
      });
      expect(phase.effects).toEqual([
        {
          kind: "feather_fall_mitigation",
          descentRateCapFeetPerRound: 60,
          landingOutcome: "no_fall_damage_and_end_for_target",
        },
      ]);
    }
  });

  test("rejects malformed Feather Fall mitigation facts", () => {
    const decode = Schema.decodeUnknownEither(FeatherFallMitigationSchema);

    expect(
      Either.isLeft(
        decode({
          kind: "feather_fall_mitigation",
          descentRateCapFeetPerRound: 30,
          landingOutcome: "no_fall_damage_and_end_for_target",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "feather_fall_mitigation",
          descentRateCapFeetPerRound: 60,
          landingOutcome: "no_fall_damage",
        }),
      ),
    ).toBe(true);
  });

  test("rejects falling target state without creature targets", () => {
    const decode = Schema.decodeUnknownEither(TargetSelectionSchema);

    expect(
      Either.isLeft(
        decode({
          mode: "choose_up_to",
          count: 5,
          stateFilter: ["falling"],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "choose_up_to",
          count: 5,
          targetKinds: ["object"],
          stateFilter: ["falling"],
        }),
      ),
    ).toBe(true);
  });

  test("rejects creature size filters without creature target selections", () => {
    const decode = Schema.decodeUnknownEither(TargetSelectionSchema);

    expect(
      Either.isRight(
        decode({
          mode: "one",
          targetKinds: ["creature"],
          typeFilter: ["beast"],
          creatureSizeFilter: {
            kind: "exact",
            creatureSize: "tiny",
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "one",
          targetKinds: ["object"],
          creatureSizeFilter: {
            kind: "exact",
            creatureSize: "tiny",
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "one",
          creatureSizeFilter: {
            kind: "exact",
            creatureSize: "tiny",
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects malformed Jump movement replacement facts", () => {
    const decode = Schema.decodeUnknownEither(JumpMovementReplacementSchema);

    expect(
      Either.isLeft(
        decode({
          kind: "jump_movement_replacement",
          frequency: "once_per_turn",
          maxJumpDistanceFeet: 30,
          movementCostFeet: 10,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "jump_movement_replacement",
          frequency: "each_turn",
          maxJumpDistanceFeet: 30,
          movementCostFeet: 10,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "jump_movement_replacement",
          frequency: "once_on_each_target_turn",
          maxJumpDistanceFeet: 0,
          movementCostFeet: 10,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          kind: "jump_movement_replacement",
          frequency: "once_on_each_target_turn",
          maxJumpDistanceFeet: 30,
          movementCostFeet: 10.5,
        }),
      ),
    ).toBe(true);
  });

  test("rejects willing target disposition for non-creature target selections", () => {
    const decode = Schema.decodeUnknownEither(TargetSelectionSchema);

    expect(
      Either.isRight(
        decode({
          mode: "one",
          targetKinds: ["creature"],
          disposition: "willing",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "one",
          targetKinds: ["object"],
          disposition: "willing",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "choose_up_to",
          count: 2,
          targetKinds: ["creature", "object"],
          disposition: "willing",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decode({
          mode: "any_number",
          disposition: "willing",
        }),
      ),
    ).toBe(true);
  });

  test("installs expressible SRD level-1 class containers", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(
        [
          "class_barbarian",
          "class_bard",
          "class_cleric",
          "class_druid",
          "class_fighter",
          "class_monk",
          "class_paladin",
          "class_ranger",
          "class_rogue",
          "class_sorcerer",
          "class_warlock",
          "class_wizard",
        ].map((unitId) => result.catalog.requireUnit(unitId)),
      ).toEqual([
        expect.objectContaining({
          className: "barbarian",
          hitPointDie: 12,
          primaryAbilities: { abilities: ["str"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "bard",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["cha"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "cleric",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["wis"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "druid",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["wis"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "fighter",
          hitPointDie: 10,
          primaryAbilities: { abilities: ["str", "dex"], kind: "any_of" },
        }),
        expect.objectContaining({
          className: "monk",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["dex", "wis"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "paladin",
          hitPointDie: 10,
          primaryAbilities: { abilities: ["str", "cha"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "ranger",
          hitPointDie: 10,
          primaryAbilities: { abilities: ["dex", "wis"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "rogue",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["dex"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "sorcerer",
          hitPointDie: 6,
          primaryAbilities: { abilities: ["cha"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "warlock",
          hitPointDie: 8,
          primaryAbilities: { abilities: ["cha"], kind: "all_of" },
        }),
        expect.objectContaining({
          className: "wizard",
          hitPointDie: 6,
          primaryAbilities: { abilities: ["int"], kind: "all_of" },
        }),
      ]);
    }
  });

  test("authors level-1 Weapon Mastery as feature-owned choice grants", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const weaponMasteryCases = [
        {
          classUnitId: "class_fighter",
          unitId: "fighter_weapon_mastery",
          className: "fighter",
          choose: {
            kind: "class_level_total_choices",
            levels: [
              { atLevel: 1, total: 3 },
              { atLevel: 4, total: 4 },
              { atLevel: 10, total: 5 },
              { atLevel: 16, total: 6 },
            ],
          },
          changeOn: { count: 1, kind: "long_rest" },
          eligibleWeapons: { kind: "class_proficient_weapons" },
        },
        {
          classUnitId: "class_barbarian",
          unitId: "barbarian_weapon_mastery",
          className: "barbarian",
          choose: {
            kind: "class_level_total_choices",
            levels: [
              { atLevel: 1, total: 2 },
              { atLevel: 4, total: 3 },
              { atLevel: 10, total: 4 },
            ],
          },
          changeOn: { count: 1, kind: "long_rest" },
          eligibleWeapons: {
            kind: "class_proficient_weapons",
            usage: "melee",
          },
        },
        {
          classUnitId: "class_paladin",
          unitId: "paladin_weapon_mastery",
          className: "paladin",
          choose: 2,
          changeOn: { count: 2, kind: "long_rest" },
          eligibleWeapons: { kind: "class_proficient_weapons" },
        },
        {
          classUnitId: "class_ranger",
          unitId: "ranger_weapon_mastery",
          className: "ranger",
          choose: 2,
          changeOn: { count: 2, kind: "long_rest" },
          eligibleWeapons: { kind: "class_proficient_weapons" },
        },
        {
          classUnitId: "class_rogue",
          unitId: "rogue_weapon_mastery",
          className: "rogue",
          choose: 2,
          changeOn: { count: 2, kind: "long_rest" },
          eligibleWeapons: { kind: "class_proficient_weapons" },
        },
      ] as const;

      for (const expected of weaponMasteryCases) {
        const classRecord = result.catalog.requireUnit(expected.classUnitId);
        const weaponMastery = result.catalog.requireUnit(expected.unitId);

        expect(classRecord).toMatchObject({
          kind: "class",
          featureGrants: expect.arrayContaining([
            { level: 1, unitId: expected.unitId },
          ]),
        });
        expect(classRecord).not.toHaveProperty("weaponMastery");
        expect(weaponMastery).toMatchObject({
          className: expected.className,
          kind: "class_feature",
          mechanics: {
            changeOn: expected.changeOn,
            choose: expected.choose,
            eligibleWeapons: expected.eligibleWeapons,
            family: "weapon_mastery_choice",
          },
        });
      }
    }
  });

  test("keeps Monk's Focus as catalog Focus Point metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_monk")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 2, unitId: "monk_monks_focus" },
        { level: 2, unitId: "monk_unarmored_movement" },
        { level: 2, unitId: "monk_uncanny_metabolism" },
      ]),
      kind: "class",
    });
    expect(result.catalog.requireUnit("monk_monks_focus")).toMatchObject({
      acquiredAtLevel: 2,
      className: "monk",
      kind: "class_feature",
      mechanics: {
        effectSaveDc: {
          ability: "wis",
          base: 8,
          kind: "class_feature_ability_save_dc",
        },
        family: "resource_container",
        optionSet: {
          choiceKey: "monk_focus_point_feature",
          initialOptions: [
            {
              battleExecution: {
                focusPointCost: 1,
                kind: "bonus_action_unarmed_strike_sequence",
                strikeCount: 2,
              },
              id: "monk_flurry_of_blows",
              displayName: "Flurry of Blows",
            },
            {
              battleExecution: {
                focusActions: ["disengage", "dodge"],
                focusPointCost: 1,
                freeAction: "disengage",
                kind: "bonus_action_defensive_modes",
              },
              id: "monk_patient_defense",
              displayName: "Patient Defense",
            },
            {
              battleExecution: {
                focusActions: ["disengage", "dash"],
                focusPointCost: 1,
                freeAction: "dash",
                jumpDistanceMultiplier: {
                  expires: "end_of_turn",
                  multiplier: 2,
                },
                kind: "bonus_action_mobility_modes",
              },
              id: "monk_step_of_the_wind",
              displayName: "Step of the Wind",
            },
          ],
          timing: "resource_use",
        },
        resetCadence: { kind: "short_or_long_rest" },
        resource: {
          cap: {
            axis: "class",
            base: 2,
            kind: "linear_per_level",
            perLevel: 1,
            startingAtLevel: 2,
          },
          kind: "use_count",
        },
      },
      provenance: {
        kind: "srd-5.2.1",
        section: "Classes/Monk.md:30-33,76-90",
      },
    });
  });

  test("keeps Sorcerer Font of Magic as point-pool conversion metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("sorcerer_font_of_magic")).toMatchObject({
      acquiredAtLevel: 2,
      className: "sorcerer",
      kind: "class_feature",
      mechanics: {
        family: "resource_pool",
        operations: [
          {
            activationCost: { kind: "free" },
            kind: "spell_slot_to_point_pool",
            pointGain: { kind: "equal_to_spell_slot_level" },
          },
          {
            activationCost: { kind: "bonus_action" },
            createdSlotExpiry: { kind: "long_rest" },
            kind: "point_pool_to_spell_slot",
            options: [
              { minimumClassLevel: 2, pointCost: 2, spellSlotLevel: 1 },
              { minimumClassLevel: 3, pointCost: 3, spellSlotLevel: 2 },
              { minimumClassLevel: 5, pointCost: 5, spellSlotLevel: 3 },
              { minimumClassLevel: 7, pointCost: 6, spellSlotLevel: 4 },
              { minimumClassLevel: 9, pointCost: 7, spellSlotLevel: 5 },
            ],
          },
        ],
        resetCadence: { kind: "long_rest" },
        resource: {
          cap: {
            axis: "class",
            base: 2,
            kind: "linear_per_level",
            perLevel: 1,
            startingAtLevel: 2,
          },
          kind: "point_pool",
          poolId: "sorcery_points",
        },
      },
      provenance: {
        kind: "srd-5.2.1",
        section: "Classes/Sorcerer.md:33-54,87-109",
      },
    });
  });

  test("installs Warlock Magical Cunning as Pact Slot recovery metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_warlock")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 2, unitId: "warlock_magical_cunning" },
      ]),
      kind: "class",
      spellcasting: expect.objectContaining({
        kind: "pact_magic_spellcasting_creation",
      }),
    });
    expect(result.catalog.requireUnit("warlock_magical_cunning")).toMatchObject(
      {
        acquiredAtLevel: 2,
        className: "warlock",
        kind: "class_feature",
        mechanics: {
          activationCost: { kind: "one_minute_rite" },
          family: "pact_slot_recovery",
          recoveryCap: { kind: "half_maximum_rounded_up" },
          requiresExpendedSlots: true,
          resetCadence: { kind: "long_rest" },
          resource: {
            kind: "pact_slots",
            source: "class_record_pact_magic",
          },
        },
        provenance: {
          kind: "srd-5.2.1",
          section: "Classes/Warlock.md:35-36,92-94",
        },
      },
    );
  });

  test("installs Sorcerer Metamagic as shared Sorcery Point option metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_sorcerer")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 2, unitId: "sorcerer_font_of_magic" },
        { level: 2, unitId: "sorcerer_metamagic" },
      ]),
      kind: "class",
      spellcasting: expect.objectContaining({
        kind: "list_prepared_spellcasting_progression_creation",
        spellcastingProgression: expect.arrayContaining([
          expect.objectContaining({
            atLevel: 2,
            cantripCount: 4,
            preparedSpellCount: 4,
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        ]),
      }),
    });
    expect(result.catalog.requireUnit("sorcerer_metamagic")).toMatchObject({
      acquiredAtLevel: 2,
      className: "sorcerer",
      kind: "class_feature",
      mechanics: {
        changeOn: {
          count: 1,
          kind: "class_level",
          replacement: "one_known_option_with_one_unknown_option",
        },
        choiceCount: {
          kind: "class_level_total_choices",
          levels: [
            { atLevel: 2, total: 2 },
            { atLevel: 10, total: 4 },
            { atLevel: 17, total: 6 },
          ],
        },
        choiceKey: "sorcerer_metamagic_options",
        family: "metamagic_options",
        options: expect.arrayContaining([
          expect.objectContaining({
            displayName: "Careful Spell",
            id: "sorcerer_careful_spell",
            sorceryPointCost: 1,
            stackingMode: "one_per_spell",
          }),
          expect.objectContaining({
            displayName: "Heightened Spell",
            id: "sorcerer_heightened_spell",
            sorceryPointCost: 2,
            stackingMode: "one_per_spell",
          }),
          expect.objectContaining({
            displayName: "Empowered Spell",
            id: "sorcerer_empowered_spell",
            sorceryPointCost: 1,
            stackingMode: "can_combine_with_different_metamagic",
          }),
          expect.objectContaining({
            displayName: "Seeking Spell",
            id: "sorcerer_seeking_spell",
            sorceryPointCost: 1,
            stackingMode: "can_combine_with_different_metamagic",
          }),
        ]),
        selectionRepeatability: { kind: "unique" },
        spends: {
          kind: "class_feature_point_pool",
          resourceUnitId: "sorcerer_font_of_magic",
        },
        spellUseLimit: {
          kind: "one_per_spell_unless_option_allows_stacking",
        },
        timing: "class_feature_acquisition",
      },
      provenance: {
        kind: "srd-5.2.1",
        section: "Classes/Sorcerer.md:33-54,111-117,145-214",
      },
    });
  });

  test("rejects incomplete or duplicated Sorcerer Metamagic option sets", () => {
    const metamagic = decodeUnitRecordSync(sorcererMetamagicInput);
    if (
      metamagic.kind !== "class_feature" ||
      metamagic.mechanics.family !== "metamagic_options"
    ) {
      throw new Error("Expected Metamagic option metadata fixture.");
    }

    const malformedMetamagic = {
      ...metamagic,
      mechanics: {
        ...metamagic.mechanics,
        options: metamagic.mechanics.options.filter(
          (option) => option.id !== "sorcerer_twinned_spell",
        ),
      },
    };
    const firstMetamagicOption = metamagic.mechanics.options.find(
      (option) => option.id === "sorcerer_careful_spell",
    );
    if (firstMetamagicOption === undefined) {
      throw new Error("Expected Careful Spell option metadata fixture.");
    }

    const duplicatedMetamagic = {
      ...metamagic,
      mechanics: {
        ...metamagic.mechanics,
        options: [...metamagic.mechanics.options, firstMetamagicOption],
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(ClassFeatureRecordSchema)(
          malformedMetamagic,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(ClassFeatureRecordSchema)(
          duplicatedMetamagic,
        ),
      ),
    ).toBe(true);
  });

  test("rejects Font of Magic created Spell Slot options above level 5", () => {
    const fontOfMagic = decodeUnitRecordSync(sorcererFontOfMagicInput);
    if (
      fontOfMagic.kind !== "class_feature" ||
      fontOfMagic.mechanics.family !== "resource_pool"
    ) {
      throw new Error("Expected Font of Magic resource-pool fixture.");
    }

    const malformedFontOfMagic = {
      ...fontOfMagic,
      mechanics: {
        ...fontOfMagic.mechanics,
        operations: fontOfMagic.mechanics.operations.map((operation) =>
          operation.kind === "point_pool_to_spell_slot"
            ? {
                ...operation,
                options: [
                  ...operation.options,
                  {
                    minimumClassLevel: 11,
                    pointCost: 9,
                    spellSlotLevel: 6,
                  },
                ],
              }
            : operation,
        ),
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(ClassFeatureRecordSchema)(
          malformedFontOfMagic,
        ),
      ),
    ).toBe(true);
  });

  test("keeps Monk Unarmored Movement as catalog Speed metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("monk_unarmored_movement")).toMatchObject(
      {
        acquiredAtLevel: 2,
        className: "monk",
        kind: "class_feature",
        mechanics: {
          condition: {
            kind: "all_of",
            predicates: [
              {
                categories: ["light", "medium", "heavy"],
                kind: "not_wearing_armor",
              },
              { kind: "not_wielding_shield" },
            ],
          },
          family: "passive",
          grants: [{ delta: 10, kind: "modify_speed", unit: "feet" }],
        },
        provenance: {
          kind: "srd-5.2.1",
          section: "Classes/Monk.md:30-33,92-94",
        },
      },
    );
  });

  test("keeps Monk Uncanny Metabolism as catalog initiative recovery metadata", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("monk_uncanny_metabolism")).toMatchObject(
      {
        acquiredAtLevel: 2,
        className: "monk",
        kind: "class_feature",
        mechanics: {
          family: "initiative_focus_recovery",
          healing: {
            amount: {
              kind: "monk_martial_arts_die_plus_monk_level",
              martialArtsUnitId: "monk_martial_arts",
            },
            kind: "heal_hp",
            target: "self",
          },
          optional: true,
          recovery: {
            kind: "recover_all_expended_uses",
            resourceUnitId: "monk_monks_focus",
          },
          resetCadence: { kind: "long_rest" },
          trigger: { kind: "roll_initiative" },
        },
        provenance: {
          kind: "srd-5.2.1",
          section: "Classes/Monk.md:30-48,96-100",
        },
      },
    );
  });

  test("installs expressible SRD level-1 class feature records", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(
        task183ClassFeatureUnitIds.map((unitId) =>
          result.catalog.requireUnit(unitId),
        ),
      ).toEqual([
        expect.objectContaining({
          className: "bard",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "activation",
            resource: {
              cap: { ability: "cha", kind: "ability_modifier", minimum: 1 },
              kind: "use_count",
            },
          }),
        }),
        expect.objectContaining({
          className: "cleric",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            choiceKey: "divine_order",
            family: "class_feature_acquisition_choice",
          }),
        }),
        expect.objectContaining({
          className: "druid",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "passive",
            grants: expect.arrayContaining([
              { kind: "grant_language", languageId: "druidic" },
            ]),
          }),
        }),
        expect.objectContaining({
          className: "druid",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            choiceKey: "primal_order",
            family: "class_feature_acquisition_choice",
          }),
        }),
        expect.objectContaining({
          className: "monk",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "passive",
            grants: expect.arrayContaining([
              { attack: "unarmed_strike", kind: "grant_bonus_action_attack" },
            ]),
          }),
        }),
        expect.objectContaining({
          className: "ranger",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "passive",
            grants: expect.arrayContaining([
              {
                kind: "grant_spell_access",
                mode: "prepared",
                spellId: "hunters_mark",
              },
            ]),
          }),
        }),
        expect.objectContaining({
          className: "rogue",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "passive",
            grants: expect.arrayContaining([
              expect.objectContaining({ kind: "grant_expertise" }),
            ]),
          }),
        }),
        expect.objectContaining({
          className: "rogue",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "passive",
            grants: expect.arrayContaining([
              { kind: "grant_language", languageId: "thieves_cant" },
            ]),
          }),
        }),
        expect.objectContaining({
          className: "sorcerer",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            family: "activation",
            resource: { cap: { kind: "fixed", uses: 2 }, kind: "use_count" },
          }),
        }),
        expect.objectContaining({
          className: "warlock",
          kind: "class_feature",
          mechanics: expect.objectContaining({
            choiceKey: "eldritch_invocations",
            constraints: expect.objectContaining({
              selectionRepeatability: {
                default: "once",
                kind: "per_option",
                repeatableWhen: {
                  kind: "option_description_repeatable_clause",
                },
              },
            }),
            family: "feature_choice",
          }),
        }),
        expect.objectContaining({
          className: "warlock",
          kind: "class_feature",
          mechanics: {
            family: "class_spellcasting_projection",
            source: "class_record_spellcasting",
            spellcastingKind: "pact_magic_spellcasting_creation",
          },
        }),
      ]);
    }
  });

  test("installs Cleric Channel Divinity as a level-2 resource container", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_cleric")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 2, unitId: "cleric_channel_divinity" },
      ]),
      kind: "class",
      spellcasting: expect.objectContaining({
        kind: "list_prepared_spellcasting_progression_creation",
        spellcastingProgression: expect.arrayContaining([
          expect.objectContaining({
            atLevel: 2,
            cantripCount: 3,
            preparedSpellCount: 5,
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        ]),
      }),
    });
    expect(result.catalog.requireUnit("cleric_channel_divinity")).toMatchObject(
      {
        acquiredAtLevel: 2,
        className: "cleric",
        kind: "class_feature",
        mechanics: {
          effectSaveDc: { kind: "class_spellcasting_spell_save_dc" },
          family: "resource_container",
          optionSet: {
            choiceKey: "cleric_channel_divinity_effect",
            initialOptions: [
              { id: "cleric_divine_spark", displayName: "Divine Spark" },
              { id: "cleric_turn_undead", displayName: "Turn Undead" },
            ],
            timing: "resource_use",
          },
          resetCadence: {
            kind: "partial_short_full_long",
            shortRestRefill: 1,
          },
          resource: {
            cap: {
              axis: "class",
              base: 2,
              kind: "threshold_tiers",
              tiers: [
                { atLevel: 6, value: 3 },
                { atLevel: 18, value: 4 },
              ],
            },
            kind: "use_count",
          },
        },
      },
    );
  });

  test("installs Paladin Channel Divinity as a level-3 resource container", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_paladin")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: "paladin_channel_divinity" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("paladin_channel_divinity"),
    ).toMatchObject({
      acquiredAtLevel: 3,
      className: "paladin",
      kind: "class_feature",
      mechanics: {
        effectSaveDc: { kind: "class_spellcasting_spell_save_dc" },
        family: "resource_container",
        optionSet: {
          choiceKey: "paladin_channel_divinity_effect",
          initialOptions: [
            { id: "paladin_divine_sense", displayName: "Divine Sense" },
          ],
          timing: "resource_use",
        },
        resetCadence: {
          kind: "partial_short_full_long",
          shortRestRefill: 1,
        },
        resource: {
          cap: {
            kind: "fixed",
            uses: 2,
          },
          kind: "use_count",
        },
      },
    });
  });

  test("installs Rogue Fast Hands as delegated Bonus Action options", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("subclass_rogue_thief")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: "rogue_fast_hands" },
      ]),
      kind: "subclass",
    });
    expect(result.catalog.requireUnit("rogue_fast_hands")).toMatchObject({
      acquiredAtLevel: 3,
      className: "rogue",
      kind: "class_feature",
      mechanics: {
        activationCost: { kind: "bonus_action" },
        family: "bonus_action_delegated_standard_actions",
        objectUse: {
          actions: [
            { action: "utilize" },
            {
              action: "magic",
              restrictedTo: "magic_item_requires_magic_action",
            },
          ],
        },
        sleightOfHand: {
          abilityCheck: { ability: "dex", skill: "sleight_of_hand" },
          operations: [
            "pick_lock_with_thieves_tools",
            "disarm_trap_with_thieves_tools",
            "pick_pocket",
          ],
        },
      },
    });
  });

  test("installs Ranger Deft Explorer as level-2 Expertise and language choices", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("ranger_deft_explorer")).toMatchObject({
      acquiredAtLevel: 2,
      className: "ranger",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            choiceCount: {
              kind: "class_level_total_choices",
              levels: [{ atLevel: 2, total: 1 }],
            },
            kind: "grant_expertise",
            skills: { kind: "owned_skill_proficiencies_without_expertise" },
          },
          {
            count: 2,
            kind: "grant_language_choice",
            source: "character_creation_language_tables",
          },
        ],
      },
    });
  });

  test("installs Ranger Fighting Style as a feat or Druidic Warrior acquisition choice", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("ranger_fighting_style")).toMatchObject({
      acquiredAtLevel: 2,
      className: "ranger",
      kind: "class_feature",
      mechanics: {
        choiceKey: "ranger_fighting_style",
        family: "class_feature_acquisition_choice",
        options: [
          {
            id: "fighting_style_feat",
            mechanics: {
              grants: [
                {
                  category: "fighting_style",
                  kind: "grant_feat",
                },
              ],
            },
          },
          {
            id: "druidic_warrior",
            mechanics: {
              grants: [
                {
                  count: 2,
                  kind: "grant_spell_access_choice",
                  mode: "known",
                  replacement: {
                    replacementCount: 1,
                    trigger: "class_level_gain",
                  },
                  spellLevel: 0,
                  spellList: "druid",
                },
              ],
            },
          },
        ],
      },
    });
  });

  test("installs Find Familiar with catalog-backed familiar form references", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const findFamiliar = result.catalog.requireUnit("find_familiar");

      expect(findFamiliar.kind).toBe("spell");
      if (findFamiliar.kind !== "spell") {
        throw new Error("Expected Find Familiar spell record.");
      }
      expect(findFamiliar.mechanics.family).toBe("spawned_creature");
      if (findFamiliar.mechanics.family !== "spawned_creature") {
        throw new Error("Expected spawned creature mechanics.");
      }
      expect(findFamiliar.mechanics.creature).toEqual({
        kind: "familiar_form_catalog",
        normalForms: [
          { displayName: "Bat", formId: "bat", statBlockId: "stat_block_bat" },
          { displayName: "Cat", formId: "cat", statBlockId: "stat_block_cat" },
          {
            displayName: "Frog",
            formId: "frog",
            statBlockId: "stat_block_frog",
          },
          {
            displayName: "Hawk",
            formId: "hawk",
            statBlockId: "stat_block_hawk",
          },
          {
            displayName: "Lizard",
            formId: "lizard",
            statBlockId: "stat_block_lizard",
          },
          {
            displayName: "Octopus",
            formId: "octopus",
            statBlockId: "stat_block_octopus",
          },
          { displayName: "Owl", formId: "owl", statBlockId: "stat_block_owl" },
          { displayName: "Rat", formId: "rat", statBlockId: "stat_block_rat" },
          {
            displayName: "Raven",
            formId: "raven",
            statBlockId: "stat_block_raven",
          },
          {
            displayName: "Spider",
            formId: "spider",
            statBlockId: "stat_block_spider",
          },
          {
            displayName: "Weasel",
            formId: "weasel",
            statBlockId: "stat_block_weasel",
          },
        ],
        additionalNormalFormEligibility: {
          kind: "challengeRatingZeroBeast",
        },
      });
    }
  });

  test("decodes Phantom Steed as a catalog-backed mount with a speed override", () => {
    const phantomSteed = decodeUnitRecordSync(phantomSteedInput);

    expect(phantomSteed.kind).toBe("spell");
    if (phantomSteed.kind !== "spell") {
      throw new Error("Expected Phantom Steed spell record.");
    }
    expect(phantomSteed.mechanics.family).toBe("spawned_creature");
    if (phantomSteed.mechanics.family !== "spawned_creature") {
      throw new Error("Expected spawned creature mechanics.");
    }

    expect(phantomSteed.mechanics.duration).toEqual({
      kind: "timed",
      value: { unit: "hour", amount: 1 },
    });
    expect(phantomSteed.mechanics.creature).toEqual({
      kind: "catalog_ref",
      monsterId: "stat_block_riding_horse",
      displayName: "Riding Horse",
      overrides: {
        speeds: [
          {
            kind: "walk",
            feet: { kind: "literal", value: 100 },
          },
        ],
      },
    });
    expect(phantomSteed.mechanics.control).toBeUndefined();
    expect(phantomSteed.mechanics.mount).toEqual({
      riderPermission: "caster_or_chosen_creature",
      hourlyTravelMiles: 13,
      createdEquipment: {
        items: ["saddle", "bit", "bridle"],
        vanishesIfCarriedMoreThanFeetFromCreature: 10,
      },
    });
    expect(phantomSteed.mechanics.dismissal).toEqual({
      onSpellEnd: {
        kind: "gradual_fade",
        riderDismountGrace: { unit: "minute", amount: 1 },
      },
    });
  });

  test("rejects blank Find Familiar form catalog references", () => {
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...findFamiliarInput,
          mechanics: {
            ...findFamiliarInput.mechanics,
            creature: {
              kind: "familiar_form_catalog",
              normalForms: [
                {
                  displayName: " ",
                  formId: "",
                  statBlockId: "\t",
                },
              ],
              additionalNormalFormEligibility: {
                kind: "challengeRatingZeroBeast",
              },
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("authors Fighter 2 grants through canonical feature Unit ids", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const fighter = result.catalog.requireUnit("class_fighter");
      const actionSurge = result.catalog.requireUnit("fighter_action_surge");
      const tacticalMind = result.catalog.requireUnit("fighter_tactical_mind");

      expect(fighter).toMatchObject({
        kind: "class",
        featureGrants: expect.arrayContaining([
          { level: 2, unitId: "fighter_action_surge" },
          { level: 2, unitId: "fighter_tactical_mind" },
        ]),
      });
      expect(
        result.catalog
          .listUnits()
          .some((unit) => unit.id === "fighter_action_surge_l2"),
      ).toBe(false);
      expect(actionSurge).toMatchObject({
        acquiredAtLevel: 2,
        kind: "class_feature",
        mechanics: {
          family: "activation",
          resource: {
            cap: {
              axis: "class",
              base: 1,
              kind: "threshold_tiers",
              tiers: [{ atLevel: 17, value: 2 }],
            },
            kind: "use_count",
          },
          usageLimit: { kind: "once_per_turn" },
        },
      });
      expect(tacticalMind).toMatchObject({
        acquiredAtLevel: 2,
        kind: "class_feature",
        mechanics: {
          family: "failed_ability_check_resource_boost",
          spends: { resourceUnitId: "fighter_second_wind" },
        },
      });
    }
  });

  test("installs Bard level 4 Ability Score Improvement as a feat-selection grant", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_bard")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 4, unitId: "bard_ability_score_improvement_l4" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("bard_ability_score_improvement_l4"),
    ).toMatchObject({
      acquiredAtLevel: 4,
      className: "bard",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            category: "general",
            kind: "grant_feat",
            openFallback: "any_qualifying_feat",
          },
        ],
      },
    });
  });

  test("installs Druid level 4 Ability Score Improvement as a feat-selection grant", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_druid")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 4, unitId: "druid_ability_score_improvement_l4" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("druid_ability_score_improvement_l4"),
    ).toMatchObject({
      acquiredAtLevel: 4,
      className: "druid",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            category: "general",
            kind: "grant_feat",
            openFallback: "any_qualifying_feat",
          },
        ],
      },
    });
  });

  test("installs Monk level 4 Ability Score Improvement beside Slow Fall", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_monk")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 4, unitId: "monk_ability_score_improvement_l4" },
        { level: 4, unitId: "monk_slow_fall" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("monk_ability_score_improvement_l4"),
    ).toMatchObject({
      acquiredAtLevel: 4,
      className: "monk",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            category: "general",
            kind: "grant_feat",
            openFallback: "any_qualifying_feat",
          },
        ],
      },
    });
  });

  test("installs Ranger level 4 Ability Score Improvement as a feat-selection grant", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_ranger")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 4, unitId: "ranger_ability_score_improvement_l4" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("ranger_ability_score_improvement_l4"),
    ).toMatchObject({
      acquiredAtLevel: 4,
      className: "ranger",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            category: "general",
            kind: "grant_feat",
            openFallback: "any_qualifying_feat",
          },
        ],
      },
    });
  });

  test("installs Sorcerer level 4 Ability Score Improvement as a feat-selection grant", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("class_sorcerer")).toMatchObject({
      featureGrants: expect.arrayContaining([
        { level: 4, unitId: "sorcerer_ability_score_improvement_l4" },
      ]),
      kind: "class",
    });
    expect(
      result.catalog.requireUnit("sorcerer_ability_score_improvement_l4"),
    ).toMatchObject({
      acquiredAtLevel: 4,
      className: "sorcerer",
      kind: "class_feature",
      mechanics: {
        family: "passive",
        grants: [
          {
            category: "general",
            kind: "grant_feat",
            openFallback: "any_qualifying_feat",
          },
        ],
      },
    });
  });

  test("authors Fighter Champion feature grants through canonical Unit ids", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const champion = result.catalog.requireUnit("subclass_fighter_champion");

      expect(champion).toMatchObject({
        kind: "subclass",
        className: "fighter",
        featureGrants: expect.arrayContaining([
          { level: 3, unitId: "fighter_improved_critical" },
          { level: 3, unitId: "fighter_remarkable_athlete" },
        ]),
      });
    }
  });

  test.each(levelThreeClassSpecificMechanicMismatches)(
    "rejects $unitId mechanics when authored under $wrongClassName",
    ({ unitId, wrongClassName }) => {
      const result = buildUnitCatalog({ collections: [srdUnitCollection] });

      expect(result.tag).toBe("ok");
      if (result.tag !== "ok") return;

      const unit = result.catalog.requireUnit(unitId);
      if (unit.kind !== "class_feature") {
        throw new Error(`Expected ${unitId} to be a class feature.`);
      }

      expect(
        Either.isLeft(
          Schema.decodeUnknownEither(ClassFeatureRecordSchema)({
            ...unit,
            className: wrongClassName,
          }),
        ),
      ).toBe(true);
    },
  );

  test("keeps Action Surge authored through one canonical content record", () => {
    expect(
      existsSync(
        new URL("../../content/fighter_action_surge.dhall", import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL("../../content/fighter_action_surge.json", import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(new URL("../../content/action_surge.dhall", import.meta.url)),
    ).toBe(false);
    expect(
      existsSync(
        new URL("../../content/fighter_action_surge_l2.dhall", import.meta.url),
      ),
    ).toBe(false);
  });

  test.each([
    {
      coinsGp: 8,
      expectedItems: [
        { kind: "selected_tool_proficiency" },
        { itemName: "Book (prayers)", kind: "draft_owned_item" },
        { itemName: "Holy Symbol", kind: "draft_owned_item" },
        { itemName: "Parchment", kind: "draft_owned_item", quantity: 10 },
        { itemName: "Robe", kind: "draft_owned_item" },
      ],
      unitId: "background_acolyte",
    },
    {
      coinsGp: 16,
      expectedItems: [
        { kind: "unit_ref", unitId: "weapon_dagger", quantity: 2 },
        { kind: "selected_tool_proficiency" },
        { itemName: "Crowbar", kind: "draft_owned_item" },
        { itemName: "Pouches", kind: "draft_owned_item", quantity: 2 },
        { itemName: "Traveler's Clothes", kind: "draft_owned_item" },
      ],
      unitId: "background_criminal",
    },
    {
      coinsGp: 8,
      expectedItems: [
        { kind: "unit_ref", unitId: "weapon_quarterstaff" },
        { kind: "selected_tool_proficiency" },
        { itemName: "Book (history)", kind: "draft_owned_item" },
        { itemName: "Parchment", kind: "draft_owned_item", quantity: 8 },
        { itemName: "Robe", kind: "draft_owned_item" },
      ],
      unitId: "background_sage",
    },
    {
      coinsGp: 14,
      expectedItems: [
        { kind: "unit_ref", unitId: "weapon_spear" },
        { kind: "unit_ref", unitId: "weapon_shortbow" },
        { itemName: "Arrows", kind: "draft_owned_item", quantity: 20 },
        { itemName: "Healer's Kit", kind: "draft_owned_item" },
        { itemName: "Quiver", kind: "draft_owned_item" },
        { itemName: "Traveler's Clothes", kind: "draft_owned_item" },
      ],
      unitId: "background_soldier",
    },
  ])(
    "keeps $unitId option A free of unresolved Unit refs",
    ({ coinsGp, expectedItems, unitId }) => {
      const result = buildUnitCatalog({ collections: [srdUnitCollection] });

      expect(result.tag).toBe("ok");
      if (result.tag === "ok") {
        const background = result.catalog.requireUnit(unitId);
        const optionA =
          background.kind === "background"
            ? background.startingEquipment.find(
                (choice) => choice.id === "option_a",
              )
            : undefined;

        expect(background).toMatchObject({
          kind: "background",
          startingEquipment: expect.arrayContaining([
            {
              coinsGp,
              id: "option_a",
              items: expect.arrayContaining(expectedItems),
              kind: "item_bundle",
            },
          ]),
        });

        expect(optionA?.kind).toBe("item_bundle");
        if (optionA?.kind === "item_bundle") {
          for (const item of optionA.items) {
            if (item.kind === "unit_ref") {
              expect(Option.isSome(result.catalog.getUnit(item.unitId))).toBe(
                true,
              );
            }
          }
        }
      }
    },
  );

  test("authors Savage Attacker as an optional weapon-hit damage-dice reroll", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const savageAttacker = result.catalog.requireUnit("feat_savage_attacker");

      expect(savageAttacker).toMatchObject({
        kind: "feat",
        mechanics: {
          effect: {
            choose: "either_roll",
            diceScope: "weapon_damage_dice",
            kind: "reroll_weapon_damage_dice",
          },
          family: "on_hit_trigger",
          optional: true,
          trigger: { kind: "weapon_hit" },
          usageLimit: { kind: "once_per_turn" },
        },
      });
    }
  });

  test("authors SRD Magic Initiate background feat specializations", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("background_acolyte")).toMatchObject({
      kind: "background",
      originFeatId: "feat_magic_initiate_cleric",
    });
    expect(result.catalog.requireUnit("feat_magic_initiate_cleric")).toEqual(
      expect.objectContaining({
        category: "origin",
        id: "feat_magic_initiate_cleric",
        kind: "feat",
        mechanics: {
          family: "magic_initiate",
          spellList: "cleric",
        },
        name: "Magic Initiate (Cleric)",
      }),
    );

    expect(result.catalog.requireUnit("feat_magic_initiate_druid")).toEqual(
      expect.objectContaining({
        category: "origin",
        id: "feat_magic_initiate_druid",
        kind: "feat",
        mechanics: {
          family: "magic_initiate",
          spellList: "druid",
        },
        name: "Magic Initiate (Druid)",
      }),
    );

    expect(result.catalog.requireUnit("background_sage")).toMatchObject({
      kind: "background",
      originFeatId: "feat_magic_initiate_wizard",
    });
    expect(result.catalog.requireUnit("feat_magic_initiate_wizard")).toEqual(
      expect.objectContaining({
        category: "origin",
        id: "feat_magic_initiate_wizard",
        kind: "feat",
        mechanics: {
          family: "magic_initiate",
          spellList: "wizard",
        },
        name: "Magic Initiate (Wizard)",
      }),
    );
  });

  test("authors Skilled as an Origin feat with three skill-or-tool proficiency choices", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    const skilled = result.catalog.requireUnit("feat_skilled");

    expect(skilled).toMatchObject({
      category: "origin",
      id: "feat_skilled",
      kind: "feat",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "grant_proficiency",
            proficiency: {
              count: 3,
              kind: "choice",
              options: expect.arrayContaining([
                { kind: "skill", skill: "perception" },
                { kind: "tool", toolId: "alchemists_supplies" },
                { kind: "tool", toolId: "thieves_tools" },
                { kind: "tool", toolId: "tool_lute" },
              ]),
            },
          },
        ],
      },
      name: "Skilled",
      provenance: {
        kind: "srd-5.2.1",
        section: "Feats.md:53-59",
      },
    });
  });

  test("authors Grappler as a General feat with typed grapple benefit boundaries", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    const grappler = result.catalog.requireUnit("feat_grappler");

    expect(grappler).toMatchObject({
      abilityScoreIncreaseChoice: {
        abilityScope: {
          abilities: ["str", "dex"],
          kind: "specific_abilities",
        },
        maxScore: 20,
        methods: [{ kind: "one_score", increase: 1 }],
      },
      category: "general",
      id: "feat_grappler",
      kind: "feat",
      mechanics: {
        attackAdvantage: {
          mode: "advantage",
          on: ["attack_roll"],
          target: "creature_grappled_by_you",
        },
        family: "grappler",
        fastWrestler: {
          movementCost: "no_extra_grapple_drag_cost",
          targetSize: "your_size_or_smaller",
        },
        punchAndGrab: {
          options: ["damage", "grapple"],
          trigger: "attack_action_unarmed_strike_hit_on_turn",
          usageLimit: { kind: "once_per_turn" },
        },
      },
      name: "Grappler",
      provenance: {
        kind: "srd-5.2.1",
        section: "Feats.md:73-85",
      },
    });
  });

  test("authors Great Weapon Fighting as a Fighting Style feat with a typed damage die floor", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    const greatWeaponFighting = result.catalog.requireUnit(
      "feat_great_weapon_fighting",
    );

    expect(greatWeaponFighting).toMatchObject({
      category: "fighting_style",
      id: "feat_great_weapon_fighting",
      kind: "feat",
      mechanics: {
        effect: {
          dieScope: "attack_damage_dice",
          kind: "floor_damage_die_results",
          minimumResult: 3,
        },
        family: "damage_die_floor",
        optional: true,
        trigger: {
          attackWeapon: {
            kind: "melee_weapon_held_with_two_hands",
            propertyGate: "two_handed_or_versatile",
          },
          kind: "attack_damage_roll",
        },
      },
      name: "Great Weapon Fighting",
      provenance: {
        kind: "srd-5.2.1",
        section: "Feats.md:103-107",
      },
    });
  });

  test("authors Two-Weapon Fighting as a Fighting Style feat with a typed Light extra attack damage modifier fact", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    const twoWeaponFighting = result.catalog.requireUnit(
      "feat_two_weapon_fighting",
    );

    expect(twoWeaponFighting).toMatchObject({
      category: "fighting_style",
      id: "feat_two_weapon_fighting",
      kind: "feat",
      mechanics: {
        effect: {
          appliesWhen: "not_already_adding_ability_modifier",
          kind: "permit_attack_damage_ability_modifier",
          modifierSource: "attack_ability_modifier",
        },
        family: "light_extra_attack_damage_ability_modifier",
        optional: true,
        trigger: {
          attackWeapon: {
            kind: "weapon_with_light_property",
          },
          kind: "light_property_extra_attack_damage_roll",
        },
      },
      name: "Two-Weapon Fighting",
      provenance: {
        kind: "srd-5.2.1",
        section: "Feats.md:109-113",
      },
    });
  });

  test("authors Criminal's SRD Alert origin feat as one catalog identity", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag !== "ok") return;

    expect(result.catalog.requireUnit("background_criminal")).toMatchObject({
      kind: "background",
      originFeatId: "alert",
    });
    expect(result.catalog.requireUnit("alert")).toEqual(
      expect.objectContaining({
        category: "origin",
        id: "alert",
        kind: "feat",
        mechanics: {
          family: "passive",
          grants: [
            {
              delta: {
                kind: "proficiency_bonus",
                sign: "+",
              },
              kind: "modify_roll_numeric",
              on: ["initiative"],
            },
            {
              ally: "willing_ally_same_combat",
              kind: "initiative_swap",
              prohibitedByCondition: "incapacitated",
              timing: "immediately_after_initiative_roll",
            },
          ],
        },
        name: "Alert",
      }),
    );
    expect(
      result.catalog.listUnits().filter((unit) => unit.id === "alert"),
    ).toHaveLength(1);
  });

  test("rejects mismatched on-hit trigger and effect families", () => {
    const decode = Schema.decodeUnknownEither(OnHitTriggerMechanicsSchema);
    const addSneakAttackDice = {
      kind: "add_attack_damage_dice",
      damageType: "same_as_attack",
      dice: {
        kind: "class_level_table",
        dieSize: 6,
        dice: [{ atLevel: 1, count: 1 }],
      },
    };
    const sapEffect = {
      kind: "modify_roll_advantage",
      mode: "disadvantage",
      on: ["attack_roll"],
      count: 1,
      expiresOn: { kind: "target_uses_or_turn_start" },
    };
    const vexLikeEffect = {
      kind: "modify_roll_advantage",
      mode: "advantage",
      on: ["attack_roll"],
      count: 1,
      expiresOn: { kind: "end_of_next_turn" },
    };
    const rerollWeaponDamageDice = {
      kind: "reroll_weapon_damage_dice",
      diceScope: "weapon_damage_dice",
      choose: "either_roll",
    };
    const cleaveEffect = {
      kind: "grant_weapon_attack",
      attackKind: "melee_weapon_attack",
      secondaryTarget: {
        kind: "adjacent_to_primary",
        constraint: "within_5ft_and_reach",
      },
      onHit: {
        kind: "weapon_damage",
        abilityModifier: "negative_only",
      },
    };

    const invalidMechanics = [
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit" },
        effect: addSneakAttackDice,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: {
          kind: "hit_with_attack_roll",
          weaponFilter: "finesse_or_ranged",
          eligibility:
            "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
        },
        effect: sapEffect,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: {
          kind: "hit_with_attack_roll",
          weaponFilter: "finesse_or_ranged",
          eligibility:
            "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
        },
        effect: rerollWeaponDamageDice,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit_melee_only" },
        effect: rerollWeaponDamageDice,
        usageLimit: { kind: "once_per_turn" },
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit" },
        effect: cleaveEffect,
        usageLimit: { kind: "once_per_turn" },
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit" },
        effect: vexLikeEffect,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit_with_damage" },
        effect: vexLikeEffect,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit_melee_only" },
        effect: sapEffect,
        usageLimit: { kind: "once_per_turn" },
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit_melee_only" },
        effect: cleaveEffect,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit" },
        effect: sapEffect,
      },
      {
        family: "on_hit_trigger",
        optional: false,
        trigger: { kind: "weapon_hit" },
        effect: vexLikeEffect,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: {
          kind: "hit_with_attack_roll",
          weaponFilter: "finesse_or_ranged",
          eligibility:
            "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
        },
        effect: addSneakAttackDice,
      },
      {
        family: "on_hit_trigger",
        optional: true,
        trigger: { kind: "weapon_hit" },
        effect: rerollWeaponDamageDice,
        usageLimit: { kind: "once_per_round" },
      },
      {
        family: "on_hit_trigger",
        optional: false,
        trigger: {
          kind: "weapon_hit",
          weaponFilter: "finesse_or_ranged",
        },
        effect: sapEffect,
      },
      {
        family: "on_hit_trigger",
        optional: false,
        trigger: { kind: "weapon_hit" },
        effect: sapEffect,
        usageLimit: { kind: "once_per_turn" },
      },
    ];

    for (const mechanics of invalidMechanics) {
      expect(Either.isLeft(decode(mechanics))).toBe(true);
    }

    expect(
      Either.isRight(
        decode({
          family: "on_hit_trigger",
          optional: false,
          trigger: { kind: "weapon_hit_with_damage" },
          effect: vexLikeEffect,
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          category: "origin",
          description: "Invalid class-level damage dice without a class owner.",
          id: "invalid_class_level_damage_feat",
          kind: "feat",
          mechanics: {
            family: "on_hit_trigger",
            optional: true,
            trigger: {
              kind: "hit_with_attack_roll",
              weaponFilter: "finesse_or_ranged",
              eligibility:
                "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
            },
            usageLimit: { kind: "once_per_turn" },
            effect: addSneakAttackDice,
          },
          name: "Invalid Class-Level Damage Feat",
          provenance: { kind: "srd-5.2.1", section: "test" },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          acquiredAtLevel: 1,
          className: "rogue",
          description: "Invalid redundant class ownership on damage dice.",
          id: "invalid_sneak_attack",
          kind: "class_feature",
          mechanics: {
            family: "on_hit_trigger",
            optional: true,
            trigger: {
              kind: "hit_with_attack_roll",
              weaponFilter: "finesse_or_ranged",
              eligibility:
                "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
            },
            usageLimit: { kind: "once_per_turn" },
            effect: {
              ...addSneakAttackDice,
              dice: {
                ...addSneakAttackDice.dice,
                className: "fighter",
              },
            },
          },
          name: "Invalid Sneak Attack",
          provenance: { kind: "srd-5.2.1", section: "test" },
        }),
      ),
    ).toBe(true);
  });

  test("authors Orc traits with their SRD action costs and rest resets", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(result.catalog.requireUnit("orc_adrenaline_rush")).toMatchObject({
        kind: "species_trait",
        mechanics: {
          activationCost: { action: "dash", kind: "bonus_action" },
          family: "activation",
          resetCadence: { kind: "short_or_long_rest" },
        },
      });
      expect(
        result.catalog.requireUnit("orc_relentless_endurance"),
      ).toMatchObject({
        kind: "species_trait",
        mechanics: {
          effect: { kind: "prevent_drop_to_0_hp", replacementHp: 1 },
          family: "triggered_replacement",
          optional: true,
          resetCadence: { kind: "long_rest" },
          trigger: { kind: "reduced_to_0_hp_not_killed_outright" },
        },
      });
    }
  });

  test("authors Gnome species and trait source facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(result.catalog.requireUnit("species_gnome")).toMatchObject({
        kind: "species",
        species: "gnome",
        size: { kind: "fixed", size: "small" },
        speed: { walkFeet: 30 },
        traits: {
          darkvision: "species_gnome_darkvision",
          gnomishCunning: "species_gnome_gnomish_cunning",
          gnomishLineage: "species_gnome_gnomish_lineage",
        },
      });
      expect(
        result.catalog.requireUnit("species_gnome_darkvision"),
      ).toMatchObject({
        kind: "species_trait",
        species: "gnome",
        mechanics: {
          family: "passive",
          grants: [{ kind: "grant_sense", rangeFeet: 60, sense: "darkvision" }],
        },
      });
      expect(
        result.catalog.requireUnit("species_gnome_gnomish_cunning"),
      ).toMatchObject({
        kind: "species_trait",
        species: "gnome",
        mechanics: {
          family: "passive",
          grants: [
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              on: ["saving_throw"],
              saveAbilityFilter: ["int", "wis", "cha"],
            },
          ],
        },
      });
      expect(
        result.catalog.requireUnit("species_gnome_gnomish_lineage"),
      ).toMatchObject({
        kind: "species_trait",
        species: "gnome",
        mechanics: {
          choiceKey: "gnome_lineage",
          family: "species_lineage_choice",
          options: [
            {
              id: "forest_gnome",
              mechanics: {
                grants: [
                  {
                    kind: "grant_spell_access",
                    mode: "known",
                    spellId: "minor_illusion",
                  },
                  {
                    kind: "grant_spell_access",
                    mode: "prepared",
                    spellId: "speak_with_animals",
                  },
                  {
                    count: { kind: "proficiency_bonus" },
                    kind: "grant_spell_free_casts",
                    resetCadence: "long_rest",
                    spellId: "speak_with_animals",
                  },
                ],
              },
            },
            {
              clockworkDevice: {
                concurrentLimit: 3,
                creation: {
                  object: {
                    armorClass: 5,
                    hitPoints: 1,
                    kind: "clockwork_device",
                    size: "tiny",
                  },
                },
              },
              id: "rock_gnome",
              mechanics: {
                grants: [
                  {
                    kind: "grant_spell_access",
                    mode: "known",
                    spellId: "mending",
                  },
                  {
                    kind: "grant_spell_access",
                    mode: "known",
                    spellId: "prestidigitation",
                  },
                ],
              },
            },
          ],
          spellcastingAbilityChoice: {
            abilities: ["int", "wis", "cha"],
            kind: "spellcasting_ability_choice",
          },
          timing: "species_selection",
        },
      });
    }
  });

  test("authors Halfling species and trait source facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(result.catalog.requireUnit("species_halfling")).toMatchObject({
        kind: "species",
        species: "halfling",
        size: { kind: "fixed", size: "small" },
        speed: { walkFeet: 30 },
        traits: {
          brave: "species_halfling_brave",
          halflingNimbleness: "species_halfling_nimbleness",
          luck: "species_halfling_luck",
          naturallyStealthy: "species_halfling_naturally_stealthy",
        },
      });
      expect(
        result.catalog.requireUnit("species_halfling_brave"),
      ).toMatchObject({
        kind: "species_trait",
        species: "halfling",
        mechanics: {
          family: "passive",
          grants: [
            {
              conditionFilter: ["frightened"],
              kind: "modify_roll_advantage",
              mode: "advantage",
              on: ["saving_throw"],
            },
          ],
        },
      });
      expect(
        result.catalog.requireUnit("species_halfling_nimbleness"),
      ).toMatchObject({
        kind: "species_trait",
        species: "halfling",
        mechanics: {
          canStopInOccupiedSpace: false,
          family: "creature_space_movement_permission",
          moveThrough: {
            creatureSizeRelationToSelf: "larger",
            kind: "occupied_creature_space",
          },
        },
      });
      expect(result.catalog.requireUnit("species_halfling_luck")).toMatchObject(
        {
          kind: "species_trait",
          species: "halfling",
          mechanics: {
            family: "d20_test_natural_one_reroll",
            optional: true,
            reroll: {
              kind: "reroll_triggering_d20",
              use: "new_roll",
            },
            trigger: {
              dieFace: 1,
              kind: "d20_test_roll_is",
            },
          },
        },
      );
      expect(
        result.catalog.requireUnit("species_halfling_naturally_stealthy"),
      ).toMatchObject({
        kind: "species_trait",
        species: "halfling",
        mechanics: {
          action: "hide",
          allowedObscurement: {
            creatureSizeRelationToSelf: "at_least_one_size_larger",
            kind: "obscured_only_by_creature",
          },
          family: "hide_action_obscurement_permission",
        },
      });
    }
  });

  test("authors Human species and trait source facts", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(result.catalog.requireUnit("species_human")).toMatchObject({
        kind: "species",
        species: "human",
        size: { kind: "choice", options: ["medium", "small"] },
        speed: { walkFeet: 30 },
        traits: {
          resourceful: "species_human_resourceful",
          skillful: "species_human_skillful",
          versatile: "species_human_versatile",
        },
      });
      expect(
        result.catalog.requireUnit("species_human_resourceful"),
      ).toMatchObject({
        kind: "species_trait",
        species: "human",
        mechanics: {
          family: "rest_triggered_heroic_inspiration",
          grant: { kind: "heroic_inspiration" },
          trigger: { kind: "finish_rest", rest: "long" },
        },
      });
      expect(
        result.catalog.requireUnit("species_human_skillful"),
      ).toMatchObject({
        kind: "species_trait",
        species: "human",
        mechanics: {
          family: "passive",
          grants: [
            {
              kind: "grant_proficiency",
              proficiency: {
                count: 1,
                kind: "choice",
                options: expect.arrayContaining([
                  { kind: "skill", skill: "perception" },
                  { kind: "skill", skill: "stealth" },
                  { kind: "skill", skill: "survival" },
                ]),
              },
            },
          ],
        },
      });
      expect(
        result.catalog.requireUnit("species_human_versatile"),
      ).toMatchObject({
        kind: "species_trait",
        species: "human",
        mechanics: {
          family: "passive",
          grants: [{ category: "origin", kind: "grant_feat" }],
        },
      });
    }
  });

  test("validates installed species trait refs against the species aggregate", () => {
    const missingTraitCollection = {
      ...srdUnitCollection,
      units: srdUnitCollection.units.filter(
        (unit) => unit.id !== "species_tiefling_darkvision",
      ),
    } satisfies SrdUnitCollection;
    const missingTrait = buildUnitCatalog({
      collections: [missingTraitCollection],
    });

    expect(missingTrait).toMatchObject({
      tag: "invalid",
      issues: [
        {
          code: "unknownUnitReference",
          referringUnitId: "species_tiefling",
          referencedUnitId: "species_tiefling_darkvision",
        },
      ],
    });

    const mismatchedTraitCollection = {
      ...srdUnitCollection,
      units: srdUnitCollection.units.map((unit) =>
        unit.id === "species_tiefling_darkvision"
          ? ({ ...unit, species: "dwarf" } as Srd521Unit)
          : unit,
      ),
    } satisfies SrdUnitCollection;
    const mismatchedTrait = buildUnitCatalog({
      collections: [mismatchedTraitCollection],
    });

    expect(mismatchedTrait).toMatchObject({
      tag: "invalid",
      issues: [
        {
          code: "invalidSpeciesTraitReference",
          speciesUnitId: "species_tiefling",
          traitUnitId: "species_tiefling_darkvision",
          expectedSpecies: "tiefling",
          actualKind: "species_trait",
          actualSpecies: "dwarf",
        },
      ],
    });
  });

  test("rejects duplicate Unit ids across SRD collections", () => {
    const duplicate = buildUnitCatalog({
      collections: [srdUnitCollection, srdUnitCollection],
    });

    expect(duplicate.tag).toBe("invalid");
    if (duplicate.tag === "invalid") {
      expect(duplicate.issues).toContainEqual({
        code: "duplicateUnitId",
        unitId: "class_fighter",
      });
    }
  });

  test("rejects malformed SRD collections with mixed provenance", () => {
    const privateRecord = decodeUnitRecordSync({
      ...srdUnitCollection.units[0],
      provenance: {
        kind: "xphb",
        section: "structured-input-only",
      },
    });
    const malformedCollection: SrdUnitCollection = {
      kind: "srdUnitCollection",
      provenance: { kind: "srd-5.2.1" },
      units: srdUnitCollection.units.map((unit) =>
        // Cast justification: this test simulates a corrupted SRD collection
        // after generic Unit decoding accepted a non-SRD provenance.
        unit.id === privateRecord.id ? (privateRecord as Srd521Unit) : unit,
      ),
    };

    expect(buildUnitCatalog({ collections: [malformedCollection] })).toEqual({
      tag: "invalid",
      issues: [
        {
          actual: privateRecord.provenance,
          code: "mixedProvenance",
          collectionKind: "srdUnitCollection",
          expected: { kind: "srd-5.2.1" },
          unitId: privateRecord.id,
        },
      ],
    });
  });

  test("rejects SRD collections with unresolved starting-equipment Unit refs", () => {
    const soldierInput = srdUnitCollection.units.find(
      (unit) => unit.id === "background_soldier",
    );
    if (soldierInput === undefined) {
      throw new Error("background_soldier fixture missing from SRD collection");
    }

    const brokenSoldier = decodeUnitRecordSync({
      ...soldierInput,
      startingEquipment: [
        {
          id: "option_a",
          items: [{ kind: "unit_ref", unitId: "missing_equipment" }],
          kind: "item_bundle",
        },
      ],
    }) as Srd521Unit;
    const malformedCollection = defineSrdUnitCollection({
      units: [brokenSoldier],
    });

    expect(buildUnitCatalog({ collections: [malformedCollection] })).toEqual({
      tag: "invalid",
      issues: [
        {
          code: "unknownUnitReference",
          referringUnitId: "background_soldier",
          referencedUnitId: "missing_equipment",
        },
      ],
    });
  });

  test("rejects SRD collections with unresolved class spell Unit refs", () => {
    const malformedCollection = defineSrdUnitCollection({
      units: srdUnitCollection.units.filter(
        (unit) => unit.id !== "ray_of_frost",
      ),
    });

    expect(buildUnitCatalog({ collections: [malformedCollection] })).toEqual({
      tag: "invalid",
      issues: [
        {
          code: "unknownUnitReference",
          referringUnitId: "class_wizard",
          referencedUnitId: "ray_of_frost",
        },
      ],
    });
  });

  test("rejects class subclass choices that point at a different class subclass", () => {
    const fighter = srdUnitCollection.units.find(
      (unit) => unit.id === "class_fighter",
    );
    if (fighter?.kind !== "class") {
      throw new Error("class_fighter fixture missing from SRD collection");
    }
    const brokenFighter = decodeUnitRecordSync({
      ...fighter,
      subclassChoices: [
        {
          level: 3,
          options: ["subclass_wizard_evoker"],
        },
      ],
    }) as Srd521Unit;
    const malformedCollection = defineSrdUnitCollection({
      units: srdUnitCollection.units.map((unit) =>
        unit.id === "class_fighter" ? brokenFighter : unit,
      ),
    });

    expect(buildUnitCatalog({ collections: [malformedCollection] })).toEqual({
      tag: "invalid",
      issues: [
        {
          actualClassName: "wizard",
          actualKind: "subclass",
          classUnitId: "class_fighter",
          code: "invalidSubclassChoiceReference",
          expectedClassName: "fighter",
          subclassUnitId: "subclass_wizard_evoker",
        },
      ],
    });
  });

  test("defineSrdUnitCollection rejects non-SRD Units", () => {
    const privateRecord = decodeUnitRecordSync({
      ...srdUnitCollection.units[0],
      provenance: {
        kind: "xphb",
        section: "structured-input-only",
      },
    });

    expect(() =>
      defineSrdUnitCollection({
        units: [privateRecord as Srd521Unit],
      }),
    ).toThrow("SRD Unit collection contains non-SRD provenance");
  });

  test("allows non-Wizard class spell access without admitting selected Spell Units", () => {
    const collectionWithoutHellishRebuke = defineSrdUnitCollection({
      units: srdUnitCollection.units.filter(
        (unit) => unit.id !== "hellish_rebuke",
      ),
    });
    const result = buildUnitCatalog({
      collections: [collectionWithoutHellishRebuke],
    });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      expect(
        result.catalog.listUnits().some((unit) => unit.id === "hellish_rebuke"),
      ).toBe(false);
    }
  });
});
