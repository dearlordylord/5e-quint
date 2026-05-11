import { existsSync } from "node:fs";

import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeUnitRecordEither,
  decodeUnitRecordSync,
  OnHitTriggerMechanicsSchema,
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
  "species_orc",
  "fighter_fighting_style",
  "fighter_second_wind",
  "fighter_weapon_mastery",
  "fighter_action_surge",
  "fighter_tactical_mind",
  "fighter_improved_critical",
  "barbarian_fast_movement",
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
  "mastery_sap",
  "orc_adrenaline_rush",
  "orc_darkvision",
  "orc_relentless_endurance",
  "fire_bolt",
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
  "sleep",
  "thunderwave",
  "eldritch_blast",
  "minor_illusion",
  "charm_person",
  "command",
  "dissonant_whispers",
  "hellish_rebuke",
  "armor_chain_mail",
  "equipment_shield",
  "weapon_dagger",
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
