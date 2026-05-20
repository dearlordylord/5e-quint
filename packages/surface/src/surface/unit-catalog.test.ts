import { existsSync } from "node:fs";

import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import findFamiliarInput from "../../content/find_familiar.json";
import moonbeamInput from "../../content/moonbeam.json";
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
] as const;

const task184WeaponMasteryUnitIds = [
  "barbarian_weapon_mastery",
  "paladin_weapon_mastery",
  "ranger_weapon_mastery",
  "rogue_weapon_mastery",
] as const;

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
  "background_soldier",
  "species_dragonborn",
  "species_dwarf",
  "species_elf",
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
  "subclass_fighter_champion",
  "subclass_wizard_evoker",
  "rogue_evasion",
  "wizard_ritual_adept",
  "wizard_arcane_recovery",
  "wizard_scholar",
  "feat_ability_score_improvement",
  "feat_archery",
  "feat_boon_of_combat_prowess",
  "defense",
  "feat_savage_attacker",
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
  "species_goliath_powerful_build",
  "species_tiefling_darkvision",
  "fire_bolt",
  "fireball",
  "light",
  "ray_of_frost",
  "detect_evil_and_good",
  "detect_magic",
  "detect_poison_and_disease",
  "mage_armor",
  "magic_missile",
  "magic_mouth",
  "mind_spike",
  "mass_cure_wounds",
  "healing_word",
  "prayer_of_healing",
  "protection_from_poison",
  "shield",
  "shatter",
  "shining_smite",
  "see_invisibility",
  "sleep",
  "spider_climb",
  "thunderwave",
  "eldritch_blast",
  "minor_illusion",
  "sorcerous_burst",
  "charm_person",
  "command",
  "dissonant_whispers",
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
  "locate_animals_or_plants",
  "locate_object",
  "hellish_rebuke",
  "hold_person",
  "invisibility",
  "rope_trick",
  "armor_chain_mail",
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
                selection: { count: 5, mode: "choose_up_to" },
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
        { kind: "revert_shape_shift_to_true_form", onlyIfTargetIsShapeShifted: true },
        { kind: "suppress_shape_shifting_while_in_area", onlyIfTargetIsShapeShifted: true },
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
      usageLimit: { kind: "once_per_turn", limitGroup: "moonbeam_save_per_turn" },
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
              kind: "hole",
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

  test("decodes Enlarge/Reduce as a creature-branch size and Strength-mode spell", () => {
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
      expect(phase.saveAppliesIf).toBe("unwilling_target");
      expect(phase.attachment).toEqual({
        kind: "hole",
        holeId: "enlarge_reduce_target",
        label: "creature target",
        value: {
          kind: "target",
          selection: {
            mode: "one",
            targetKinds: ["creature"],
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
          choose: 3,
          changeOn: { count: 1, kind: "long_rest" },
          eligibleWeapons: { kind: "class_proficient_weapons" },
        },
        {
          classUnitId: "class_barbarian",
          unitId: "barbarian_weapon_mastery",
          className: "barbarian",
          choose: 2,
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
            { id: "monk_flurry_of_blows", displayName: "Flurry of Blows" },
            { id: "monk_patient_defense", displayName: "Patient Defense" },
            { id: "monk_step_of_the_wind", displayName: "Step of the Wind" },
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

  test("keeps Soldier option A free of unresolved Unit refs", () => {
    const result = buildUnitCatalog({ collections: [srdUnitCollection] });

    expect(result.tag).toBe("ok");
    if (result.tag === "ok") {
      const soldier = result.catalog.requireUnit("background_soldier");

      expect(soldier).toMatchObject({
        kind: "background",
        startingEquipment: expect.arrayContaining([
          {
            coinsGp: 14,
            id: "option_a",
            items: expect.arrayContaining([
              { kind: "unit_ref", unitId: "weapon_spear" },
              { kind: "unit_ref", unitId: "weapon_shortbow" },
              { itemName: "Arrows", kind: "draft_owned_item", quantity: 20 },
              { itemName: "Healer's Kit", kind: "draft_owned_item" },
              { itemName: "Quiver", kind: "draft_owned_item" },
              { itemName: "Traveler's Clothes", kind: "draft_owned_item" },
            ]),
            kind: "item_bundle",
          },
        ]),
      });
    }
  });

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
