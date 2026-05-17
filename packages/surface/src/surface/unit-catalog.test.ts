import { existsSync } from "node:fs";

import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import findFamiliarInput from "../../content/find_familiar.json";
import {
  ActivationPhaseSchema,
  AudibleEffectSchema,
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
  "bard_jack_of_all_trades",
  ...task183ClassFeatureUnitIds,
  ...task184WeaponMasteryUnitIds,
  "subclass_fighter_champion",
  "subclass_wizard_evoker",
  "rogue_evasion",
  "wizard_ritual_adept",
  "wizard_arcane_recovery",
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
  "mass_cure_wounds",
  "healing_word",
  "shield",
  "shatter",
  "sleep",
  "thunderwave",
  "eldritch_blast",
  "minor_illusion",
  "sorcerous_burst",
  "charm_person",
  "command",
  "dissonant_whispers",
  "expeditious_retreat",
  "feather_fall",
  "jump",
  "hellish_rebuke",
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
                heldOrWorn: "forbidden",
              },
            },
          ],
        },
      ]);
    }
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
            heldOrWorn: "forbidden",
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
            family: "suborder_choice",
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
            family: "suborder_choice",
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
