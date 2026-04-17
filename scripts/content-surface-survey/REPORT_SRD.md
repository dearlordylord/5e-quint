# Content surface coverage — SRD report

_Generated from `survey-results-srd.jsonl` (882 units)._

## Outcome distribution

| Verdict | Count |
| --- | --- |
| `structural_widening` | 307 |
| `refused` | 239 |
| `clean` | 116 |
| `surface_widening` | 111 |
| `atom_widening` | 56 |
| `invalid` | 39 |
| `dm_agenda` | 14 |

## Per-kind outcome breakdown

| Kind | clean | surface | atom | structural | total |
| --- | --- | --- | --- | --- | --- |
| class_feature | 4 | 23 | 5 | 126 | 158 |
| feat | 3 | 0 | 0 | 6 | 9 |
| magic_item | 20 | 30 | 23 | 106 | 179 |
| mastery | 3 | 0 | 0 | 1 | 4 |
| species_trait | 4 | 0 | 0 | 17 | 21 |
| spell | 82 | 58 | 28 | 51 | 219 |

## Atom frequency (units-that-emit-it)

| Atom | Units |
| --- | --- |
| `activate` | 100 |
| `action_quota` | 85 |
| `spell_root` | 84 |
| `spell_slot` | 72 |
| `target` | 60 |
| `expire` | 49 |
| `direct_apply` | 45 |
| `save_gate` | 36 |
| `damage` | 33 |
| `scale_die_count` | 29 |
| `concentrate` | 25 |
| `concentration_lock` | 25 |
| `persist` | 24 |
| `self` | 24 |
| `magic_item_root` | 22 |
| `apply_condition` | 20 |
| `area` | 19 |
| `grant` | 16 |
| `on_hit_window` | 16 |
| `scale_target_count` | 16 |
| `attack_roll` | 14 |
| `half_damage` | 14 |
| `bonus_action_quota` | 12 |
| `use_count` | 12 |
| `item_destruction` | 11 |
| `modify_roll_numeric` | 11 |
| `attunement_slot` | 9 |
| `composite` | 8 |
| `grant_spell_access` | 8 |
| `heal` | 8 |
| `charge_pool` | 7 |
| `grant_resistance` | 7 |
| `modify_ac` | 7 |
| `scale_numeric_bonus` | 7 |
| `modify_roll_advantage` | 6 |
| `rest_window` | 6 |
| `class_feature_root` | 5 |
| `duration_window` | 4 |
| `grant_sense` | 4 |
| `grant_speed` | 4 |
| `species_trait_root` | 4 |
| `feat_root` | 3 |
| `grant_condition_immunity` | 3 |
| `grant_extra_action` | 3 |
| `mastery_root` | 3 |
| `remove_condition` | 3 |
| `repeat_save` | 3 |
| `set_ability_score` | 3 |
| `grant_temp_hp` | 2 |
| `modify_speed` | 2 |
| `restrict_action_set` | 2 |
| `teleport` | 2 |
| `turn_start_window` | 2 |
| `attack_slot` | 1 |
| `commit` | 1 |
| `deny_opportunity_attack` | 1 |
| `detect` | 1 |
| `force_move` | 1 |
| `interrupt_resolution` | 1 |
| `mark` | 1 |
| `mark_target` | 1 |
| `modify_max_hp` | 1 |
| `negate_named_effect` | 1 |
| `post_action_window` | 1 |
| `prepare` | 1 |
| `prompt` | 1 |
| `reaction_quota` | 1 |
| `reaction_window` | 1 |
| `release` | 1 |
| `respond` | 1 |
| `set_speed` | 1 |
| `store` | 1 |
| `transfer_mark` | 1 |
| `wearing_armor` | 1 |

## Widening-proposal frequency (normalized)

Claude's raw proposal text is normalized to canonical tags via regex rules; unmatched proposals fall through with their raw name. Frequency = number of distinct units that proposed this widening.

| Canonical widening | Units | Pressure cases |
| --- | --- | --- |
| `grant_spell_access` | 36 | bard_words_of_creation_l20, cleric_divine_order_l1, cleric_greater_divine_intervention_l20, druid_circle_of_the_land_spells_l3, druid_druidic_l1, druid_spellcasting_l1, +30 more |
| `conditional_bonus_damage` | 23 | barbarian_brutal_strike_l9, barbarian_instinctive_pounce_l7, barbarian_reckless_attack_l2, call_lightning, clairvoyance, cleric_blessed_strikes_l7, +17 more |
| `apply_condition_effect` | 21 | befuddlement, cleric_channel_divinity, cleric_channel_divinity_l2, command, conjure_elemental, conjure_fey, +15 more |
| `MagicItemRecord` | 21 | magic_item_ammunition_1_2_or_3, magic_item_bowl_of_commanding_water_elementals, magic_item_carpet_of_flying, magic_item_cloak_of_invisibility, magic_item_crystal_ball_of_mind_reading, magic_item_cube_of_force, +15 more |
| `grant_sense` | 14 | arcane_eye, comprehend_languages, feat_boon_of_truesight, find_the_path, locate_object, magic_item_eyes_of_minute_seeing, +8 more |
| `modify_speed_effect` | 13 | barbarian_brutal_strike_l9, barbarian_fast_movement_l5, magic_item_boots_of_speed, magic_item_cloak_of_arachnida, magic_item_cloak_of_the_manta_ray, monk_unarmored_movement_l2, +7 more |
| `grant_resistance_effect` | 12 | barbarian_rage, druid_natures_sanctuary_l14, druid_natures_ward_l10, fire_shield, magic_item_potion_of_gaseous_form, magic_item_shield_of_missile_attraction, +6 more |
| `object_attachment` | 12 | arcane_lock, continual_flame, daylight, fabricate, gentle_repose, heat_metal, +6 more |
| `grant_feat` | 11 | bard_epic_boon_l19, cleric_ability_score_improvement_l4, cleric_epic_boon_l19, druid_ability_score_improvement_l4, fighter_epic_boon_l19, monk_epic_boon_l19, +5 more |
| `reaction_activation` | 11 | counterspell, fighter_indomitable, hellish_rebuke, magic_item_dwarven_plate, magic_item_gloves_of_missile_snaring, magic_item_quarterstaff_of_the_acrobat, +5 more |
| `modify_ability_score` | 9 | barbarian_primal_champion_l20, feat_boon_of_combat_prowess, magic_item_headband_of_intellect, magic_item_ioun_stone, magic_item_tome_of_clear_thought, magic_item_tome_of_leadership_and_influence, +3 more |
| `passive_class_feature family` | 9 | barbarian_indomitable_might_l18, barbarian_primal_champion_l20, barbarian_unarmored_defense_l1, bard_words_of_creation_l20, fighter_survivor_l18, monk_evasion_l7, +3 more |
| `passive_grant family for ClassFeatureMechanics` | 9 | barbarian_weapon_mastery_l1, cleric_epic_boon_l19, fighter_epic_boon_l19, ranger_ability_score_improvement_l4, ranger_feral_senses_l18, rogue_ability_score_improvement_l4, +3 more |
| `anchored_trigger_family` | 8 | antipathy_sympathy, clone, contingency, delayed_blast_fireball, forbiddance, magic_item_eversmoking_bottle, +2 more |
| `bonus_action_activation` | 7 | arcane_eye, conjure_woodland_beings, divine_smite, ensnaring_strike, magic_item_instant_fortress, magic_item_pipes_of_the_sewers, +1 more |
| `MagicItemRecord + magic_item family` | 7 | magic_item_amulet_of_the_planes, magic_item_boots_of_speed, magic_item_figurine_of_wondrous_power, magic_item_instant_fortress, magic_item_ioun_stone, magic_item_javelin_of_lightning, +1 more |
| `MagicItemRecord + magic_item mechanics family` | 7 | magic_item_armor_of_vulnerability, magic_item_candle_of_invocation, magic_item_eversmoking_bottle, magic_item_frost_brand, magic_item_gem_of_seeing, magic_item_gloves_of_missile_snaring, +1 more |
| `remove_condition_effect` | 7 | conjure_elemental, greater_restoration, mass_heal, paladin_restoring_touch_l14, power_word_heal, ranger_tireless_l10, +1 more |
| `grant_proficiency` | 6 | bard_bonus_proficiencies_l3, cleric_divine_order_l1, magic_item_elven_chain, monk_disciplined_survivor_l14, ranger_expertise_l9, rogue_slippery_mind_l15 |
| `grant_temp_hp` | 6 | cleric_improved_blessed_strikes_l14, druid_wild_shape_l2, polymorph, ranger_tireless_l10, shapechange, true_polymorph |
| `passive family for ClassFeatureMechanics` | 6 | barbarian_danger_sense_l2, druid_natures_ward_l10, monk_unarmored_defense_l1, ranger_expertise_l9, ranger_roving_l6, rogue_evasion_l7 |
| `heal_hp_effect` | 5 | cleric_disciple_of_life_l3, mass_heal, power_word_heal, regenerate, resurrection |
| `MagicItemMechanics.composite` | 5 | magic_item_rope_of_climbing, magic_item_staff_of_power, magic_item_staff_of_the_magi, magic_item_staff_of_the_woodlands, magic_item_talisman_of_pure_good |
| `MagicItemRecord + magic_item UnitRecord kind` | 5 | magic_item_adamantine_armor, magic_item_censer_of_controlling_air_elementals, magic_item_cloak_of_arachnida, magic_item_elven_chain, magic_item_manual_of_quickness_of_action |
| `passive_class_feature` | 5 | monk_disciplined_survivor_l14, paladin_aura_expansion_l18, ranger_precise_hunter_l17, rogue_reliable_talent_l7, wizard_ritual_adept_l1 |
| `triggered_reaction_family` | 5 | bard_countercharm_l7, magic_item_rod_of_absorption, magic_item_shield_of_the_cavalier, magic_item_staff_of_the_magi, wizard_evocation_savant_l3 |
| `DcSource.fixed` | 4 | magic_item_sword_of_wounding, magic_item_wand_of_fireballs, magic_item_wand_of_lightning_bolts, magic_item_wand_of_paralysis |
| `EquipmentPredicate.holding_item` | 4 | magic_item_rod_of_alertness, magic_item_sentinel_shield, magic_item_staff_of_the_woodlands, magic_item_wand_of_fear |
| `grant_feat_choice` | 4 | barbarian_ability_score_improvement_l4, bard_ability_score_improvement_l4, rogue_ability_score_improvement_l4, wizard_epic_boon_l19 |
| `MagicItemRecord + MagicItemMechanics family` | 4 | magic_item_folding_boat, magic_item_hat_of_many_spells, magic_item_helm_of_teleportation, magic_item_necklace_of_fireballs |
| `modify_ac_effect` | 4 | magic_item_elven_chain, magic_item_quarterstaff_of_the_acrobat, magic_item_robe_of_the_archmagi, warding_bond |
| `per_turn_reset` | 4 | cloudkill, incendiary_cloud, monk_martial_arts, ranger_superior_hunters_prey_l11 |
| `reduce_damage_taken` | 4 | magic_item_gloves_of_missile_snaring, magic_item_ring_of_warmth, resistance, rogue_evasion_l7 |
| `RestResetCadence: dawn` | 4 | magic_item_brazier_of_commanding_fire_elementals, magic_item_cloak_of_arachnida, magic_item_dagger_of_venom, magic_item_javelin_of_lightning |
| `stat_block_projection` | 4 | magic_item_instant_fortress, magic_item_staff_of_the_woodlands, shapechange, wind_walk |
| `ability_check in RollKind` | 3 | magic_item_eyes_of_minute_seeing, species_goliath_large_form, species_goliath_powerful_build |
| `ActivationPhase.unconditional` | 3 | greater_restoration, power_word_heal, reincarnate |
| `composite_magic_item_mechanics` | 3 | magic_item_rod_of_alertness, magic_item_staff_of_fire, magic_item_staff_of_frost |
| `Condition: poisoned` | 3 | magic_item_dagger_of_venom, rogue_cunning_strike_l5, stinking_cloud |
| `difficult_terrain` | 3 | blade_barrier, conjure_minor_elementals, spike_growth |
| `grant_condition_immunity` | 3 | druid_natures_ward_l10, magic_item_periapt_of_proof_against_poison, paladin_aura_of_courage_l10 |
| `magic_item_record` | 3 | magic_item_apparatus_of_the_crab, magic_item_bag_of_holding, magic_item_lantern_of_revealing |
| `modify_damage_numeric` | 3 | magic_item_scimitar_of_speed, magic_item_staff_of_the_woodlands, magic_item_weapon_1_2_or_3 |
| `passive (ClassFeatureMechanics family)` | 3 | druid_druidic_l1, fighter_superior_critical_l15, monk_body_and_mind_l20 |
| `passive_grant` | 3 | barbarian_ability_score_improvement_l4, bard_epic_boon_l19, cleric_divine_order_l1 |
| `passive_grant (class feature family)` | 3 | bard_bonus_proficiencies_l3, paladin_fighting_style_l2, sorcerer_elemental_affinity_l6 |
| `ritual_casting` | 3 | magic_item_manual_of_gainful_exercise, speak_with_animals, water_walk |
| `SpeciesTraitRecord` | 3 | species_dwarf_dwarven_resilience, species_elf_elven_lineage, species_halfling_naturally_stealthy |
| `transport_exile` | 3 | magic_item_robe_of_stars, magic_item_rod_of_security, plane_shift |
| `weapon_property_filter` | 3 | magic_item_scimitar_of_speed, magic_item_staff_of_thunder_and_lightning, rogue_sneak_attack_l1 |
| `alter_appearance` | 2 | disguise_self, seeming |
| `alter_terrain` | 2 | control_water, move_earth |
| `ClassFeatureActivationCost { kind: "action" }` | 2 | druid_natures_sanctuary_l14, ranger_tireless_l10 |
| `ClassFeatureActivationCost.action` | 2 | cleric_divine_spark, druid_wild_companion_l2 |
| `ClassFeatureActivationMechanics.duration` | 2 | druid_wild_shape_l2, monk_superior_defense_l18 |
| `Condition: incapacitated` | 2 | contact_other_plane, magic_item_dust_of_sneezing_and_choking |
| `Condition.invisible` | 2 | mislead, ranger_natures_veil_l14 |
| `creature_type_filter` | 2 | magic_circle, magic_item_mace_of_smiting |
| `crit_window` | 2 | feat_boon_of_irresistible_offense, magic_item_mace_of_smiting |
| `cunning_strike_option` | 2 | rogue_devious_strikes_l14, rogue_supreme_sneak_l9 |
| `cylinder area shape` | 2 | conjure_celestial, moonbeam |
| `DcSource: fixed_dc` | 2 | contact_other_plane, magic_item_crystal_ball_of_mind_reading |
| `Duration.permanent` | 2 | astral_projection, sequester |
| `FeatRecord` | 2 | feat_boon_of_spell_recall, feat_great_weapon_fighting |
| `FeatRecord + FeatMechanics family` | 2 | feat_boon_of_combat_prowess, feat_magic_initiate |
| `feature_augmentation` | 2 | paladin_restoring_touch_l14, warlock_eldritch_master_l20 |
| `grant_feat (ClassFeatureEffect variant)` | 2 | barbarian_epic_boon_l19, warlock_epic_boon_l19 |
| `hazard_zone` | 2 | blade_barrier, wall_of_ice |
| `linear_per_level` | 2 | druid_spellcasting_l1, wizard_arcane_recovery_l1 |
| `magic_action activation cost` | 2 | magic_item_censer_of_controlling_air_elementals, magic_item_gem_of_seeing |
| `MagicItemRecord + magic_item kind` | 2 | magic_item_eyes_of_minute_seeing, magic_item_glamoured_studded_leather |
| `MagicItemRecord + passive_property family` | 2 | magic_item_cloak_of_displacement, magic_item_goggles_of_night |
| `MagicItemRecord + passive_while_attuned family` | 2 | magic_item_cloak_of_the_manta_ray, magic_item_periapt_of_proof_against_poison |
| `MagicItemRecord.attunementRestriction` | 2 | magic_item_wand_of_lightning_bolts, magic_item_wand_of_paralysis |
| `modify_ability_score (permanent)` | 2 | magic_item_manual_of_gainful_exercise, magic_item_manual_of_quickness_of_action |
| `modify_damage_roll_numeric` | 2 | magic_item_staff_of_the_magi, magic_item_staff_of_thunder_and_lightning |
| `modify_roll_advantage in ClassFeatureEffect` | 2 | fighter_studied_attacks_l13, ranger_precise_hunter_l17 |
| `modify_roll_floor` | 2 | magic_item_periapt_of_wound_closure, rogue_reliable_talent_l7 |
| `multi_mechanics_magic_item` | 2 | magic_item_rod_of_absorption, magic_item_staff_of_charming |
| `multi_operation_ongoing_effect` | 2 | holy_aura, mislead |
| `obscure_area` | 2 | magic_item_wand_of_wonder, stinking_cloud |
| `passive ClassFeatureMechanics family` | 2 | barbarian_feral_instinct_l7, druid_beast_spells_l18 |
| `passive_advancement` | 2 | cleric_ability_score_improvement_l4, paladin_epic_boon_l19 |
| `passive_class_feature_family` | 2 | druid_elemental_fury_l7, ranger_relentless_hunter_l13 |
| `passive_trigger (class feature family)` | 2 | barbarian_relentless_rage_l11, monk_perfect_focus_l15 |
| `proximity_predicate` | 2 | antipathy_sympathy, magic_item_pipes_of_the_sewers |
| `random_table_resolution` | 2 | magic_item_deck_of_illusions, magic_item_wand_of_wonder |
| `RollKind: 'ability_check'` | 2 | magic_item_candle_of_invocation, magic_item_mithral_armor |
| `RollKind: "ability_check"` | 2 | enthrall, warlock_dark_ones_own_luck_l6 |
| `scale_attack_count` | 2 | fighter_extra_attack, ranger_extra_attack_l5 |
| `SpeciesTraitRecord + species_trait family` | 2 | species_goliath_large_form, species_orc_adrenaline_rush |
| `SpeciesTraitRecord + species_trait mechanics family` | 2 | species_gnome_gnomish_lineage, species_goliath_powerful_build |
| `spellcasting_grant` | 2 | paladin_spellcasting_l1, warlock_pact_magic_l1 |
| `subclass_choice` | 2 | druid_druid_subclass_l3, warlock_warlock_subclass_l3 |
| `subclass_grant` | 2 | fighter_fighter_subclass_l3, sorcerer_sorcerer_subclass_l3 |
| `subclass_selection` | 2 | cleric_cleric_subclass_l3, rogue_rogue_subclass_l3 |
| `UseCountCap.ability_modifier` | 2 | bard_bardic_inspiration_l1, ranger_natures_veil_l14 |
| `UseCountCap.unlimited` | 2 | barbarian_rage, rogue_cunning_action_l2 |
| `"ability_check" in RollKind` | 1 | foresight |
| `"initiative" in RollKind` | 1 | barbarian_feral_instinct_l7 |
| `ability_check escape dismissal` | 1 | ensnaring_strike |
| `ability_check phase / operation` | 1 | tsunami |
| `ability_check resolution in item activation context` | 1 | magic_item_amulet_of_the_planes |
| `ability_check resolution phase in ActivationPhase` | 1 | magic_item_hat_of_many_spells |
| `ability_check variant of RollKind` | 1 | thaumaturgy |
| `ability_check_by_caster (ActivationPhase)` | 1 | dispel_magic |
| `ability_check_counter (target-initiated)` | 1 | detect_thoughts |
| `ability_check_gate (DC 10 Strength Athletics)` | 1 | magic_item_portable_hole |
| `ability_check_modifier effect in ClassFeatureEffect` | 1 | cleric_divine_order_l1 |
| `ability_modifier flat in DiceExpr` | 1 | conjure_fey |
| `ability_modifier LevelAxis` | 1 | animate_objects |
| `ability_modifier variant of LevelAxis` | 1 | cleric_sear_undead_l5 |
| `ability_modifier_times (DiceAmount variant)` | 1 | cleric_improved_blessed_strikes_l14 |
| `ability_scoped_roll_disadvantage` | 1 | bestow_curse |
| `ability_score_damage_bonus effect` | 1 | druid_elemental_fury_l7 |
| `ability_score_floor effect on roll totals` | 1 | barbarian_indomitable_might_l18 |
| `ability_score_increase surface type` | 1 | feat_boon_of_truesight |
| `ability_score_substitution on attack/damage rolls` | 1 | monk_martial_arts_l1 |
| `acquiredAtLevel / level-unlock gate for species traits` | 1 | species_goliath_large_form |
| `ActionRestriction — one_of_action_or_bonus_action` | 1 | slow |
| `activated ability study regimen` | 1 | magic_item_tome_of_leadership_and_influence |
| `activated_property family for MagicItemMechanics` | 1 | magic_item_glamoured_studded_leather |
| `ActivatedAbilityHeader.earlyEndOnSave` | 1 | magic_item_potion_of_mind_reading |
| `ActivatedAbilityMechanics.operations` | 1 | magic_item_potion_of_mind_reading |
| `ActivatedAbilityMechanics.range` | 1 | magic_item_rod_of_rulership |
| `ActivatedAbilityMechanics.usagePenalty (or equivalent trigger on ActivationPhase)` | 1 | magic_item_ring_of_x_ray_vision |
| `activation precondition guard` | 1 | magic_item_folding_boat |
| `activation_cost field on OngoingOperation` | 1 | telekinesis |
| `activation_phase.random_embedded_spell_cast` | 1 | magic_item_wand_of_wonder |
| `activation_plus_ongoing` | 1 | wall_of_fire |
| `ActivationPhase — direct kind` | 1 | create_food_and_water |
| `ActivationPhase / direct` | 1 | fabricate |
| `ActivationPhase attack_roll: spellcasting_ability_override property` | 1 | true_strike |
| `ActivationPhase or resolution: 'ability_check'` | 1 | magic_item_iron_bands |
| `ActivationPhase: repeat_save` | 1 | conjure_elemental |
| `ActivationPhase: save_advantage_condition` | 1 | dominate_beast |
| `ActivationPhase.ability_check_gate` | 1 | magic_item_ring_of_the_ram |
| `ActivationPhase.attack_roll.attackKind: melee_weapon_attack` | 1 | magic_item_shield_of_the_cavalier |
| `ActivationPhase.direct_apply` | 1 | spare_the_dying |
| `ActivationPhase.direct_damage` | 1 | divine_smite |
| `ActivationPhase.direct_effect` | 1 | mass_heal |
| `ActivationPhase.probability_check` | 1 | sending |
| `ActivationPhase.release_embedded_payload` | 1 | magic_item_robe_of_useful_items |
| `ActivationResource: item_spell_energy_reservoir` | 1 | magic_item_rod_of_absorption |
| `ActivationResource.embedded_inventory` | 1 | magic_item_robe_of_useful_items |
| `add_ability_mod_to_damage` | 1 | cleric_blessed_strikes_l7 |
| `advantage_on_ability` | 1 | barbarian_rage |
| `allow_only variant for ActionRestriction` | 1 | wind_walk |
| `alter_appearance.piercing_check` | 1 | disguise_self |
| `alter_creature_kind` | 1 | true_polymorph |
| `alter_damage_type` | 1 | magic_item_javelin_of_lightning |
| `alter_item_kind` | 1 | magic_item_folding_boat |
| `alter_memory` | 1 | modify_memory |
| `alter_object_shape` | 1 | stone_shape |
| `alter_object_state (for Invisible Hand)` | 1 | thaumaturgy |
| `alter_size` | 1 | magic_item_potion_of_diminution |
| `AnchorTarget { kind: "self" }` | 1 | contingency |
| `AnchorTarget: creature_or_object` | 1 | antipathy_sympathy |
| `AnchorTarget.area.shape.circle` | 1 | teleportation_circle |
| `AnchorTarget.vessel` | 1 | clone |
| `apply_obscurement (or grant_heavy_obscurement area effect)` | 1 | magic_item_eversmoking_bottle |
| `apply_stat_override` | 1 | magic_jar |
| `apply_visual_mark (Effect variant, timed)` | 1 | prestidigitation |
| `area — directional_damage` | 1 | wall_of_fire |
| `Area attachment slot-scaling for radius` | 1 | confusion |
| `area_effect_direction_toggle` | 1 | magic_circle |
| `area_enter_or_end_turn window` | 1 | conjure_celestial |
| `area_save_gate OngoingOperation` | 1 | moonbeam |
| `area_shape_contiguous_cubes` | 1 | fire_storm |
| `area_shape_wall` | 1 | wind_wall |
| `area.shape — line and ring` | 1 | wall_of_fire |
| `area.shape.cylinder` | 1 | magic_circle |
| `AreaEventTrigger: enter_or_turn_start` | 1 | web |
| `AreaOperation: escape_check` | 1 | web |
| `AreaOrigin — self_centered (emanation) origin` | 1 | antilife_shell |
| `AreaOrigin: self_emanation` | 1 | magic_item_dust_of_sneezing_and_choking |
| `AreaOrigin::emanates_from_caster` | 1 | conjure_woodland_beings |
| `AreaOrigin::on_caster` | 1 | spirit_guardians |
| `AreaOrigin::self_centered` | 1 | antimagic_field |
| `AreaOrigin.emanation_from_caster` | 1 | holy_aura |
| `AreaSaveGateOperation` | 1 | insect_plague |
| `AreaShapeDescriptor — wall (straight and ring)` | 1 | blade_barrier |
| `armor_condition predicate (conditional modifier)` | 1 | barbarian_fast_movement_l5 |
| `armor-type condition guard on passive effects` | 1 | ranger_roving_l6 |
| `assume_form` | 1 | druid_wild_shape_l2 |
| `assume_form duration: conditional_expiry with multiple triggers` | 1 | druid_wild_shape_l2 |
| `Attachment { kind: "location" }` | 1 | clairvoyance |
| `Attachment area shape: line` | 1 | magic_item_javelin_of_lightning |
| `Attachment: sensor` | 1 | magic_item_crystal_ball_of_mind_reading |
| `Attachment.area with self_move_per_turn` | 1 | incendiary_cloud |
| `Attachment.area.shape — cube` | 1 | major_image |
| `Attachment.area.shape.cone` | 1 | prismatic_spray |
| `Attachment.area.shape.emanation` | 1 | daylight |
| `Attachment.kind: consumable_pool` | 1 | goodberry |
| `Attachment.location_or_target` | 1 | scrying |
| `Attachment.trigger_source` | 1 | hellish_rebuke |
| `Attachment.weapon` | 1 | shillelagh |
| `attack_proxy_family` | 1 | magic_item_dancing_sword |
| `AttackKind: 'ranged_weapon_attack' (non-spell)` | 1 | magic_item_iron_bands |
| `AttackKind: melee_weapon_attack / ranged_weapon_attack` | 1 | true_strike |
| `attune procedure in surface types` | 1 | magic_item_dancing_sword |
| `attunement flag on MagicItemRecord (optional, not required here)` | 1 | magic_item_helm_of_comprehending_languages |
| `attunement mechanics` | 1 | magic_item_headband_of_intellect |
| `attunement procedure` | 1 | magic_item_defender |
| `attunement requirement on item record` | 1 | magic_item_periapt_of_proof_against_poison |
| `attunement requirement on MagicItemRecord` | 1 | magic_item_periapt_of_wound_closure |
| `attunement surface field` | 1 | magic_item_instant_fortress |
| `attunement surface field on MagicItemRecord` | 1 | magic_item_brooch_of_shielding |
| `attunement_slot resource in surface types` | 1 | magic_item_amulet_of_the_planes |
| `attunement_slot resource in types.ts` | 1 | magic_item_dwarven_plate |
| `attunement_slot resource on surface` | 1 | magic_item_boots_of_speed |
| `AttunementRequirement` | 1 | magic_item_pearl_of_power |
| `AttunementRequirement on MagicItemRecord` | 1 | magic_item_hat_of_disguise |
| `aura_scope attachment for class features` | 1 | paladin_aura_of_courage_l10 |
| `Automatic-failure state on ability check (repeated-failure lock)` | 1 | magic_item_iron_bands |
| `BanishmentOperation (OngoingOperation kind: "transport_exile")` | 1 | maze |
| `barrier (or block_travel + block_targeting area)` | 1 | magic_item_bead_of_force |
| `bearer-triggered early end for active timed item effects` | 1 | magic_item_wings_of_flying |
| `bind_creature` | 1 | planar_binding |
| `block_condition_from_source` | 1 | magic_circle |
| `block_gas_passage` | 1 | wind_wall |
| `block_hp_regain` | 1 | magic_item_sword_of_wounding |
| `block_information_magic` | 1 | magic_item_ring_of_mind_shielding |
| `block_speed_reduction` | 1 | magic_item_ring_of_free_action |
| `block_state_transition` | 1 | gentle_repose |
| `block_travel_operation` | 1 | forcecage |
| `bond_objects` | 1 | magic_item_sovereign_glue |
| `bonus_action dismiss lifecycle` | 1 | magic_item_censer_of_controlling_air_elementals |
| `bonus_action_exclusion_filter` | 1 | monk_fleet_step_l11 |
| `bonus_action_gate on traversal transition` | 1 | water_walk |
| `bonus_action_unlock` | 1 | rogue_cunning_action_l2 |
| `bonus_damage` | 1 | barbarian_rage |
| `bound_item_escape_loop` | 1 | magic_item_rope_of_entanglement |
| `branch_choice upgrade meta-structure` | 1 | cleric_improved_blessed_strikes_l14 |
| `branching_choice variant for rest-time player decision` | 1 | druid_circle_of_the_land_spells_l3 |
| `break_object` | 1 | magic_item_ring_of_the_ram |
| `breathe_underwater` | 1 | magic_item_ring_of_elemental_command |
| `cantrip_damage_trigger (ClassFeatureMechanics family)` | 1 | cleric_improved_blessed_strikes_l14 |
| `cast_named_spell_via_charge` | 1 | magic_item_cubic_gate |
| `cast_time_choice` | 1 | bestow_curse |
| `cast_time_choice (choose variant on cast)` | 1 | demiplane |
| `cast_time_choice (damage type chosen at cast)` | 1 | resistance |
| `cast_time_command_choice` | 1 | command |
| `cast_with_borrowed_caster_stats` | 1 | magic_item_ring_of_spell_storing |
| `CastConstraint / cast_condition` | 1 | control_weather |
| `caster_relative_attack_scope` | 1 | bestow_curse |
| `caster_sanctuary_anchor (persistent caster-level state)` | 1 | word_of_recall |
| `CastingTime or OngoingCost — magic_action recurrence` | 1 | animal_shapes |
| `change_size` | 1 | species_goliath_large_form |
| `character_advancement` | 1 | wizard_ability_score_improvement_l4 |
| `charge resource in types.ts` | 1 | magic_item_cloak_of_arachnida |
| `charge resource with dice-based daily recharge` | 1 | magic_item_cube_of_force |
| `charge resource with random starting count` | 1 | magic_item_necklace_of_fireballs |
| `charge_gain_from_absorbed_spell_level_with_overflow_branch` | 1 | magic_item_staff_of_the_magi |
| `charge_pool with day-recharge (Goat of Traveling pattern)` | 1 | magic_item_figurine_of_wondrous_power |
| `charge_pool with spell-level capacity tracking` | 1 | magic_item_ring_of_spell_storing |
| `charge_pool_dispatcher family` | 1 | magic_item_cube_of_force |
| `charge_recharge_daily_dice` | 1 | magic_item_cubic_gate |
| `charge_refund_on_roll` | 1 | rogue_use_magic_device_l13 |
| `charge-based spell casting (item charges, expend 1 to cast a named spell)` | 1 | magic_item_luck_blade |
| `ChargeResource (consumable single-use item)` | 1 | magic_item_bead_of_force |
| `ChargeResource with attunement_slot linkage` | 1 | magic_item_helm_of_teleportation |
| `choice_spell_family` | 1 | prestidigitation |
| `ChoiceAtAcquisition for skill selection` | 1 | wizard_scholar_l2 |
| `choose_effect_dispatch` | 1 | cleric_channel_divinity |
| `choose_lineage_branch` | 1 | species_elf_elven_lineage |
| `choose_one_of` | 1 | cleric_blessed_strikes_l7 |
| `choose_one_of DamageType at activation time` | 1 | druid_elemental_fury_l7 |
| `choose_one_of effect composition` | 1 | barbarian_brutal_strike_l9 |
| `choose_one_of_N_options (top-level class feature choice structure)` | 1 | ranger_hunters_prey_l3 |
| `choose_one_of_subfeatures` | 1 | druid_elemental_fury_l7 |
| `choose_one_package` | 1 | cleric_divine_order_l1 |
| `ChooseEffect (player chooses one-of N effects)` | 1 | monk_open_hand_technique_l3 |
| `circular_portal_shape` | 1 | gate |
| `class_feature timed duration with complex break conditions` | 1 | cleric_channel_divinity |
| `class_feature.mechanics.family = persistent_resource_bundle` | 1 | monk_focus_points |
| `class_feature.on_hit_trigger` | 1 | rogue_sneak_attack |
| `class_feature.on_hit_trigger.qualifying_predicates` | 1 | rogue_sneak_attack |
| `class_feature.passive` | 1 | fighter_extra_attack |
| `class_feature.shared_save_dc_formula` | 1 | monk_focus_points |
| `class_level_threshold scaling on area radius` | 1 | magic_item_holy_avenger |
| `ClassFeatureActivationCost — { kind: "action" } or { kind: "magic_action" }` | 1 | paladin_abjure_foes_l9 |
| `ClassFeatureActivationCost (or item activation cost): magic_action` | 1 | magic_item_cloak_of_invisibility |
| `ClassFeatureActivationCost { kind: 'short_rest' }` | 1 | wizard_arcane_recovery_l1 |
| `ClassFeatureActivationCost / quota model for consumer-side cost` | 1 | goodberry |
| `ClassFeatureActivationCost or trigger filter: qualifying_spell_cast` | 1 | wizard_overchannel_l14 |
| `ClassFeatureActivationCost: action` | 1 | cleric_channel_divinity |
| `ClassFeatureActivationCost: action / magic_action` | 1 | cleric_channel_divinity_l2 |
| `ClassFeatureActivationCost: cost_from_feature_pool (or similar trigger model)` | 1 | paladin_restoring_touch_l14 |
| `ClassFeatureActivationCost: magic_action` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `ClassFeatureActivationCost: post_d20_test_failure` | 1 | rogue_stroke_of_luck_l20 |
| `ClassFeatureActivationCost: reaction` | 1 | bard_countercharm_l7 |
| `ClassFeatureActivationCost: short_rest_trigger` | 1 | druid_natural_recovery_l6 |
| `ClassFeatureActivationCost: sneak_attack_dice` | 1 | rogue_supreme_sneak_l9 |
| `ClassFeatureActivationCost: spell_slot` | 1 | bard_font_of_inspiration_l5 |
| `ClassFeatureActivationCost: triggered_on_roll (or post_roll reactive cost)` | 1 | warlock_dark_ones_own_luck_l6 |
| `ClassFeatureActivationCost.focus_points` | 1 | monk_superior_defense_l18 |
| `ClassFeatureActivationCost.magic_action` | 1 | magic_item_wand_of_paralysis |
| `ClassFeatureActivationCost.magic_action (or a parallel activation-cost type for items)` | 1 | magic_item_eversmoking_bottle |
| `ClassFeatureActivationCost.minutes` | 1 | warlock_magical_cunning_l2 |
| `ClassFeatureActivationCost.study` | 1 | magic_item_tome_of_understanding |
| `ClassFeatureActivationCost.triggered_on_event` | 1 | fighter_indomitable_l9 |
| `ClassFeatureActivationCost.utilize` | 1 | magic_item_universal_solvent |
| `ClassFeatureActivationMechanics — duration field` | 1 | sorcerer_innate_sorcery_l1 |
| `ClassFeatureActivationMechanics — multi-effect choice compositor` | 1 | rogue_fast_hands_l3 |
| `ClassFeatureActivationMechanics dual-effect support (passive + activated)` | 1 | paladin_paladins_smite_l2 |
| `ClassFeatureActivationMechanics::duration (turn-scoped expiry)` | 1 | barbarian_reckless_attack_l2 |
| `ClassFeatureActivationMechanics.activationWindow` | 1 | monk_superior_defense_l18 |
| `ClassFeatureEffect — ability_check` | 1 | rogue_fast_hands_l3 |
| `ClassFeatureEffect — grant_standard_action_as_bonus_action` | 1 | rogue_fast_hands_l3 |
| `ClassFeatureEffect — modify_roll_advantage variant` | 1 | sorcerer_innate_sorcery_l1 |
| `ClassFeatureEffect — save_gate_condition` | 1 | paladin_abjure_foes_l9 |
| `ClassFeatureEffect / cast_named_spell_free` | 1 | paladin_paladins_smite_l2 |
| `ClassFeatureEffect: damage (with save_gate)` | 1 | cleric_channel_divinity |
| `ClassFeatureEffect: grant_extra_turn variant` | 1 | rogue_thiefs_reflexes_l17 |
| `ClassFeatureEffect: modify_roll_numeric` | 1 | warlock_dark_ones_own_luck_l6 |
| `ClassFeatureEffect: modify_save_outcome` | 1 | monk_evasion_l7 |
| `ClassFeatureEffect: player_choice branch (heal vs. damage)` | 1 | cleric_channel_divinity |
| `ClassFeatureEffect: player_choice_fork (heal or save_gate_damage)` | 1 | cleric_channel_divinity_l2 |
| `ClassFeatureEffect: recover_resource_use` | 1 | bard_font_of_inspiration_l5 |
| `ClassFeatureEffect: reroll_save_with_advantage` | 1 | bard_countercharm_l7 |
| `ClassFeatureEffect: substitute_d20_result (with value: 20)` | 1 | rogue_stroke_of_luck_l20 |
| `ClassFeatureEffect: suppress_condition_removal` | 1 | rogue_supreme_sneak_l9 |
| `ClassFeatureEffect: upgrade_reset_cadence (or new family: passive_modifier)` | 1 | bard_font_of_inspiration_l5 |
| `ClassFeatureEffect::exempt_from_spell` | 1 | wizard_sculpt_spells_l6 |
| `ClassFeatureEffect::grant_free_cast` | 1 | sorcerer_dragon_companion_l18 |
| `ClassFeatureEffect::modify_roll_advantage` | 1 | barbarian_reckless_attack_l2 |
| `ClassFeatureEffect::modify_roll_substitute (maximize damage)` | 1 | wizard_overchannel_l14 |
| `ClassFeatureEffect::self_damage_consequence` | 1 | wizard_overchannel_l14 |
| `ClassFeatureEffect.choose_effect` | 1 | cleric_divine_spark |
| `ClassFeatureEffect.grant_inspiration_die` | 1 | bard_bardic_inspiration_l1 |
| `ClassFeatureEffect.grant_speed` | 1 | sorcerer_dragon_wings_l14 |
| `ClassFeatureEffect.invoke_spell` | 1 | druid_wild_companion_l2 |
| `ClassFeatureEffect.modify_roll_reroll_with_bonus` | 1 | fighter_indomitable_l9 |
| `ClassFeatureEffect.ongoing_state` | 1 | barbarian_rage |
| `ClassFeatureEffect.refill_spell_slots` | 1 | warlock_magical_cunning_l2 |
| `ClassFeatureEffect.save_gate_damage` | 1 | cleric_divine_spark |
| `ClassFeatureMechanics family: "passive_rest_trigger"` | 1 | ranger_tireless_l10 |
| `ClassFeatureMechanics: area attachment / multi-target` | 1 | cleric_channel_divinity |
| `ClassFeatureMechanicsHeader.duration (timed with condition expiry)` | 1 | druid_natures_sanctuary_l14 |
| `ClassFeatureOnHitTriggerMechanics (family: on_hit_trigger)` | 1 | monk_open_hand_technique_l3 |
| `ClassFeaturePassiveMechanics` | 1 | rogue_slippery_mind_l15 |
| `ClassFeaturePassiveOnHitMechanics` | 1 | paladin_radiant_strikes_l11 |
| `command_creature (Effect union variant)` | 1 | animal_messenger |
| `command_obedience (timed, post-release)` | 1 | magic_item_iron_flask |
| `command_word activation cost (multi-command pattern)` | 1 | magic_item_folding_boat |
| `CommandCompanionsOperation` | 1 | animate_objects |
| `Companion duration: timed with dismiss option` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `companion_command_operation` | 1 | create_undead |
| `companion_creation spell family` | 1 | animate_dead |
| `companion_creation_effect` | 1 | create_undead |
| `companion_creation_spell_family` | 1 | create_undead |
| `companion_summoning_per_charge_family` | 1 | magic_item_pipes_of_the_sewers |
| `CompanionEffect in the Effect union` | 1 | animate_dead |
| `compelled_movement` | 1 | antipathy_sympathy |
| `composable_magic_item_mechanics` | 1 | magic_item_sun_blade |
| `compound_magic_item_properties` | 1 | magic_item_shield_of_the_cavalier |
| `compound_spell (activation_with_ongoing)` | 1 | regenerate |
| `compound/sequence Effect variant` | 1 | befuddlement |
| `CompoundClassFeatureMechanics` | 1 | druid_natural_recovery_l6 |
| `concentrate_to_permanent — Duration variant for conditional permanence` | 1 | wall_of_stone |
| `Condition — "frightened"` | 1 | paladin_abjure_foes_l9 |
| `Condition (type expansion)` | 1 | greater_restoration |
| `Condition enum: blinded, unconscious` | 1 | rogue_devious_strikes_l14 |
| `Condition extends blinded | deafened | poisoned` | 1 | mass_heal |
| `condition_gate (Speed = 0 suppression)` | 1 | magic_item_cloak_of_displacement |
| `condition_grappled` | 1 | magic_item_apparatus_of_the_crab |
| `condition_immunity` | 1 | gaseous_form |
| `condition_persistence_gate (or protect_condition)` | 1 | contagion |
| `condition_suppressor on passive effects` | 1 | barbarian_danger_sense_l2 |
| `condition_triggered_expiry in Duration or lifecycle atoms` | 1 | species_dragonborn_draconic_flight |
| `condition_use_block on ClassFeatureActivationCost or feature-level guard` | 1 | rogue_evasion_l7 |
| `Condition: 'invisible' | 'unconscious'` | 1 | sequester |
| `Condition: 'restrained'` | 1 | magic_item_iron_bands |
| `Condition: "restrained"` | 1 | conjure_elemental |
| `Condition: blinded | charmed | deafened | frightened | paralyzed | stunned` | 1 | paladin_restoring_touch_l14 |
| `Condition: blinded | deafened | stunned` | 1 | divine_word |
| `Condition: charmed` | 1 | dominate_beast |
| `Condition: charmed, incapacitated` | 1 | modify_memory |
| `Condition: compelled_honesty (behavioral speech constraint)` | 1 | zone_of_truth |
| `Condition: frightened, charmed` | 1 | antipathy_sympathy |
| `Condition: frightened, incapacitated` | 1 | cleric_channel_divinity |
| `Condition: frightened, incapacitated (and others beyond prone)` | 1 | cleric_channel_divinity_l2 |
| `Condition: invisible` | 1 | magic_item_cloak_of_invisibility |
| `Condition: no_spellcasting (or equivalent named condition)` | 1 | befuddlement |
| `Condition: restrained` | 1 | web |
| `Condition: restrained, blinded, petrified` | 1 | prismatic_wall |
| `Condition.blinded` | 1 | holy_aura |
| `Condition.incapacitated` | 1 | monk_superior_defense_l18 |
| `Condition.stable` | 1 | spare_the_dying |
| `Condition.unconscious` | 1 | astral_projection |
| `conditional sense extension: grant if absent, extend if present` | 1 | magic_item_goggles_of_night |
| `conditional trigger predicate (Bloodied + HP > 0)` | 1 | fighter_survivor_l18 |
| `conditional_expiry_on_offensive_action` | 1 | mislead |
| `conditional_on_feature_not_used (negative feature interlock)` | 1 | monk_perfect_focus_l15 |
| `conditional_on_target_size` | 1 | magic_item_shield_of_the_cavalier |
| `conditional_passive_family` | 1 | sorcerer_arcane_apotheosis_l20 |
| `ConditionalSaveAdvantage (save_gate pre-modifier)` | 1 | modify_memory |
| `ConditionalSpeedModifier (load-based halving)` | 1 | magic_item_carpet_of_flying |
| `ConditionExpiry — { kind: "until_takes_damage" }` | 1 | paladin_abjure_foes_l9 |
| `conjure_companion family` | 1 | conjure_animals |
| `conjure_sensor (new spell family)` | 1 | arcane_eye |
| `conjured_spirit_zone` | 1 | conjure_elemental |
| `consumable_object_pool` | 1 | goodberry |
| `consume_item activation + stored_spell payload` | 1 | magic_item_potion_of_animal_friendship |
| `control_duration in Duration or a new control_link surface type` | 1 | animate_dead |
| `control_duration_with_recast_maintenance` | 1 | create_undead |
| `controllable_hazardous_item` | 1 | magic_item_sphere_of_annihilation |
| `convert_resource` | 1 | druid_archdruid_l20 |
| `create_companion` | 1 | magic_item_bowl_of_commanding_water_elementals |
| `create_companion (surface gap)` | 1 | true_polymorph |
| `create_companion + command_companion subgraph for magic items` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `create_companion effect variant in spell Effect type` | 1 | planar_ally |
| `create_companion mechanics subgraph` | 1 | magic_item_figurine_of_wondrous_power |
| `create_illusion` | 1 | magic_item_deck_of_illusions |
| `create_light_zone` | 1 | daylight |
| `create_object — OngoingOperation variant` | 1 | wall_of_stone |
| `create_object (Effect variant)` | 1 | prestidigitation |
| `create_object mechanics family with persistent object HP/AC profile` | 1 | magic_item_instant_fortress |
| `create_object operation in OngoingOperation` | 1 | silent_image |
| `create_object subgraph for Rock Gnome clockwork device (create_object atom + duration + activation + cap)` | 1 | species_gnome_gnomish_lineage |
| `create_object_operation` | 1 | dancing_lights |
| `create_obscurement` | 1 | magic_item_staff_of_swarming_insects |
| `create_planar_portal` | 1 | gate |
| `create_portal` | 1 | demiplane |
| `create_sensory_effect (Effect variant)` | 1 | prestidigitation |
| `create_space family (pocket_dimension / spatial_pocket)` | 1 | rope_trick |
| `CreateObjectOperation on OngoingOperation` | 1 | minor_illusion |
| `creature_compulsion (new payload family)` | 1 | animal_messenger |
| `creature_investigation_check dispel gate` | 1 | silent_image |
| `creature_type_filter on DamageOnHitOperation` | 1 | magic_item_holy_avenger |
| `creature_type_predicate` | 1 | divine_word |
| `CreatureTypeFilter on OngoingOperation` | 1 | antilife_shell |
| `crit-specific hit trigger` | 1 | magic_item_sword_of_life_stealing |
| `cross_feature_reference attachment or effect target` | 1 | barbarian_improved_brutal_strike_l17 |
| `cross_trait_spellcasting_ability reference` | 1 | species_tiefling_otherworldly_presence |
| `cross_unit_property_override effect variant` | 1 | ranger_foe_slayer_l20 |
| `cumulative_pre_dawn_failure_policy` | 1 | magic_item_wind_fan |
| `cumulative_use_probability` | 1 | magic_item_potion_of_longevity |
| `curse_state (attune_triggered, survives_item_removal)` | 1 | magic_item_armor_of_vulnerability |
| `d20_outcome_filter (trigger predicate: roll = 1)` | 1 | halfling_luck |
| `daily_at_dawn recharge cadence (dice-based)` | 1 | magic_item_gem_of_seeing |
| `damage (weapon-type) effect in ClassFeatureEffect` | 1 | barbarian_brutal_strike_l9 |
| `damage variant of ClassFeatureEffect` | 1 | cleric_sear_undead_l5 |
| `damage_linked amount for modify_max_hp` | 1 | harm |
| `damage_mirror` | 1 | warding_bond |
| `damage_on_hit (ClassFeatureEffect)` | 1 | paladin_radiant_strikes_l11 |
| `damage_on_hit ClassFeatureEffect variant` | 1 | rogue_sneak_attack_l1 |
| `damage_roll as a RollKind` | 1 | magic_item_holy_avenger |
| `damage_roll in RollKind` | 1 | magic_weapon |
| `damage_substitute effect (new ClassFeatureEffect or OngoingOperation variant)` | 1 | monk_martial_arts |
| `damage_taken_reaction (retaliatory reaction that deals damage to the attacker)` | 1 | species_goliath_giant_ancestry |
| `damage_threshold_window (trigger: reduced_to_0_hp)` | 1 | species_orc_relentless_endurance |
| `damage_type_choice_at_use` | 1 | conjure_minor_elementals |
| `damage_type_from_weapon_hit` | 1 | rogue_sneak_attack |
| `DamageEffect: player_choice damage type (or weapon_normal sentinel)` | 1 | true_strike |
| `DamageType { kind: 'weapon_damage_type' }` | 1 | mastery_graze |
| `DamageType choice-at-use-time` | 1 | cleric_divine_spark |
| `DamageTypeRef.gm_determined_table` | 1 | magic_item_potion_of_resistance |
| `dawn reset cadence` | 1 | magic_item_censer_of_controlling_air_elementals |
| `dawn reset cadence in RestResetCadence` | 1 | magic_item_luck_blade |
| `dawn_reset` | 1 | magic_item_dragon_scale_mail |
| `dawn_reset (RestResetCadence)` | 1 | magic_item_bowl_of_commanding_water_elementals |
| `day_cooldown variant of RestResetCadence (or new ItemRechargeKind)` | 1 | magic_item_figurine_of_wondrous_power |
| `DcSource: fixed` | 1 | magic_item_dagger_of_venom |
| `DcSource: fixed numeric DC` | 1 | magic_item_cube_of_force |
| `DcSource.contextual_save_modifier` | 1 | scrying |
| `DcSource.fixed_dc` | 1 | magic_item_rod_of_rulership |
| `DcSource.item_fixed_dc` | 1 | magic_item_medallion_of_thoughts |
| `deafened condition in Condition type` | 1 | storm_of_vengeance |
| `death_saving_throw window or filter on save_gate` | 1 | magic_item_periapt_of_wound_closure |
| `decapitate_or_kill_target` | 1 | magic_item_vorpal_sword |
| `deflect_projectile` | 1 | wind_wall |
| `deny_condition_benefit` | 1 | shining_smite |
| `designation_recall` | 1 | word_of_recall |
| `destroy_creature` | 1 | magic_item_talisman_of_pure_good |
| `destroy_target` | 1 | magic_item_talisman_of_ultimate_evil |
| `dice_cost resource (forgo Sneak Attack damage dice)` | 1 | rogue_cunning_strike_l5 |
| `dice_plus_flat` | 1 | monk_wholeness_of_body_l6 |
| `DiceAmount — accumulating_per_event` | 1 | delayed_blast_fireball |
| `DiceAmount — flat_plus_ability_mod variant` | 1 | fighter_survivor_l18 |
| `DiceAmount { kind: 'ability_modifier' }` | 1 | mastery_graze |
| `DiceAmount or Effect conditional_by_creature_type` | 1 | divine_smite |
| `DiceAmount: ability_score_value` | 1 | feat_boon_of_irresistible_offense |
| `DiceAmount: weapon_damage kind` | 1 | true_strike |
| `DiceAmount.equals_target_stat` | 1 | animal_shapes |
| `DiceAmount.lookup_table` | 1 | magic_item_ring_of_shooting_stars |
| `DiceAmount.per_charge_spent` | 1 | magic_item_ring_of_the_ram |
| `DiceAmount.pool` | 1 | mass_heal |
| `DiceAmount.resource_remaining_multiplier` | 1 | magic_item_staff_of_power |
| `DiceAmount.restore_all` | 1 | power_word_heal |
| `DiceExpr flat: { kind: "ability_modifier"; ability: Ability } | number` | 1 | ranger_tireless_l10 |
| `DiceExpr or DiceAmount: ability_modifier damage addend` | 1 | magic_item_shield_of_the_cavalier |
| `DiceExpr or DiceAmount: abilityModifier addend` | 1 | flame_blade |
| `DiceExpr: ability_modifier addend` | 1 | cleric_channel_divinity_l2 |
| `DiceExpr.abilityModifier` | 1 | cleric_divine_spark |
| `die_token_activation_subgraph` | 1 | bard_bardic_inspiration |
| `difficult_terrain_exception` | 1 | magic_item_ring_of_elemental_command |
| `direct_effect activation phase` | 1 | resurrection |
| `disable_actions` | 1 | barbarian_rage |
| `discern_location` | 1 | magic_item_dragon_scale_mail |
| `disjunctive precondition gate for on-hit triggers` | 1 | rogue_sneak_attack_l1 |
| `disjunctive_resource` | 1 | druid_wild_companion_l2 |
| `dissolve_adhesive` | 1 | magic_item_universal_solvent |
| `distance_based_repeat_save escape` | 1 | antipathy_sympathy |
| `distance_proportional DiceAmount` | 1 | spike_growth |
| `DM-agenda: Gate to GM-chosen Outer Plane` | 1 | magic_item_candle_of_invocation |
| `drop_held_items in spell Effect` | 1 | command |
| `dual_entity_container_state` | 1 | magic_jar |
| `dual_mode_activation` | 1 | magic_item_ring_of_the_ram |
| `dual_slot_cast — simultaneous dual spell-slot consumption` | 1 | contingency |
| `dual_stream_spell` | 1 | wind_wall |
| `duplicate_pool resource` | 1 | mirror_image |
| `Duration — permanent_until_dispelled` | 1 | continual_flame |
| `Duration — self_break_on_caster_movement condition` | 1 | antilife_shell |
| `Duration — slot-conditioned override (concentration → until-dispelled at slot ≥ 4)` | 1 | major_image |
| `Duration { kind: "timed", selfBreak: true }` | 1 | light |
| `Duration early-end: item_interaction (no action required)` | 1 | magic_item_cloak_of_invisibility |
| `Duration or dispersal lifecycle: conditional_dispersal (time + environmental trigger)` | 1 | magic_item_eversmoking_bottle |
| `Duration slot-scaling variant` | 1 | animal_messenger |
| `Duration termination: dispersed_by_named_spell_or_effect` | 1 | stinking_cloud |
| `duration_budget resource (timed use pool)` | 1 | magic_item_boots_of_speed |
| `duration_end_trigger.dispersed_by_strong_wind` | 1 | magic_item_staff_of_swarming_insects |
| `Duration: conditional_expiry (hp_drop or self_action)` | 1 | gaseous_form |
| `Duration: permanent` | 1 | arcane_lock |
| `Duration: slot_scaled_concentration` | 1 | dominate_beast |
| `Duration: while_worn (item-conditioned expiry)` | 1 | magic_item_hat_of_disguise |
| `Duration.concentration_escalates_to_permanent` | 1 | true_polymorph |
| `Duration.permanent_until_dispelled` | 1 | magic_jar |
| `Duration.slot_scaled_timed` | 1 | magic_circle |
| `Duration.timed_or_condition` | 1 | monk_superior_defense_l18 |
| `DurationEndTrigger — caster_dismisses_as_bonus_action` | 1 | magic_item_potion_of_gaseous_form |
| `DurationEndTrigger.target_stops_holding_item` | 1 | magic_item_wand_of_enemy_detection |
| `dynamic_group_duration` | 1 | magic_item_rod_of_security |
| `early_termination_condition` | 1 | barbarian_rage |
| `Effect — create_object kind` | 1 | create_food_and_water |
| `Effect — debuff effects` | 1 | slow |
| `Effect / create_object` | 1 | fabricate |
| `effect_menu family` | 1 | thaumaturgy |
| `Effect: ModifyRollNumericEffect (using v4 atom modify_roll_numeric)` | 1 | enthrall |
| `Effect.restore_max_hp` | 1 | greater_restoration |
| `Effect.transport_exile` | 1 | prismatic_spray |
| `Effect.transport_exile (for spells)` | 1 | divine_word |
| `EffectAtom.break_concentration` | 1 | magic_item_thunderous_greatclub |
| `EffectAtom.bypass_resistance` | 1 | magic_item_vorpal_sword |
| `EffectAtom.detect.property = hostile_creature with nearest-direction readout` | 1 | magic_item_wand_of_enemy_detection |
| `EffectAtom.move_object` | 1 | magic_item_talisman_of_the_sphere |
| `EffectCure: named_spell_targets` | 1 | magic_item_dust_of_sneezing_and_choking |
| `emanation attachment with friendly-creature scope` | 1 | magic_item_holy_avenger |
| `embedded_payload_inventory` | 1 | magic_item_robe_of_useful_items |
| `embedded_spell_cast_gate` | 1 | magic_item_spell_scroll |
| `emit_light` | 1 | magic_item_sun_blade |
| `enablement_condition predicate for passive features` | 1 | monk_unarmored_movement_l2 |
| `end_ongoing_effect` | 1 | dispel_magic |
| `endsOnRecast flag on Duration` | 1 | minor_illusion |
| `entity_link` | 1 | astral_projection |
| `environment_modification` | 1 | passwall |
| `equipment_condition predicate for passive features` | 1 | monk_unarmored_defense_l1 |
| `equipment_guard (passive condition predicate)` | 1 | barbarian_unarmored_defense_l1 |
| `EquipmentPredicate.holding_shield` | 1 | magic_item_shield_1_2_or_3 |
| `EquipmentPredicate.unarmored` | 1 | magic_item_robe_of_the_archmagi |
| `escalating_save_dc (resource type)` | 1 | barbarian_relentless_rage_l11 |
| `EscapeCondition on OngoingEffectMechanics (or new OngoingOperation kind: "escape_condition")` | 1 | maze |
| `expand_action_eligibility` | 1 | species_halfling_naturally_stealthy |
| `expand_damage_type_scope (ClassFeatureEffect variant)` | 1 | monk_deflect_energy_l13 |
| `expand_emanation_radius` | 1 | paladin_aura_expansion_l18 |
| `expire -> descend_on_end` | 1 | magic_item_winged_boots |
| `extend_spell_duration` | 1 | planar_binding |
| `extended_casting_time` | 1 | clone |
| `extinguish_flames (or modify_environment)` | 1 | magic_item_frost_brand |
| `extradimensional_imprisonment (duration: indefinite, until released)` | 1 | magic_item_iron_flask |
| `extradimensional_space` | 1 | demiplane |
| `faint_to_observer outcome / perceptual state effect` | 1 | minor_illusion |
| `fall_on_exit lifecycle / forced_move effect` | 1 | tsunami |
| `familiarity_table_resolution` | 1 | teleport |
| `feat_category_choice (FeatScope variant)` | 1 | paladin_epic_boon_l19 |
| `feat_record` | 1 | feat_boon_of_irresistible_offense |
| `FeatRecord / feat mechanics family` | 1 | feat_boon_of_truesight |
| `Feature suppression condition gate (Incapacitated)` | 1 | monk_evasion_l7 |
| `feature_linked resistance selection (resistance type bound to another feature's choice)` | 1 | druid_natures_ward_l10 |
| `feature_upgrade` | 1 | cleric_greater_divine_intervention_l20 |
| `fixed_dc` | 1 | magic_item_potion_of_poison |
| `fixed_dc override on stored spell grant` | 1 | magic_item_potion_of_animal_friendship |
| `fixed_long_recharge_cadence` | 1 | magic_item_tome_of_clear_thought |
| `fixed_numeric_attack_bonus` | 1 | magic_item_apparatus_of_the_crab |
| `flat numeric delta in RollModifierOperation` | 1 | magic_weapon |
| `flat numeric modifier in OngoingOperation (not DiceDelta)` | 1 | warding_bond |
| `focus_point (ClassFeatureActivationCost variant)` | 1 | monk_disciplined_survivor_l14 |
| `focus_point_resource (new variant of ClassFeatureResource)` | 1 | monk_quivering_palm_l17 |
| `for_each_active_effect_iteration` | 1 | dispel_magic |
| `force_action` | 1 | bestow_curse |
| `force_drop_object` | 1 | heat_metal |
| `force_hit (or modify_roll_outcome: miss_to_hit)` | 1 | feat_boon_of_combat_prowess |
| `force_move` | 1 | telekinesis |
| `force_move (area displacement on object creation)` | 1 | magic_item_instant_fortress |
| `force_move (in Effect union)` | 1 | wall_of_ice |
| `force_move (push away)` | 1 | magic_item_bead_of_force |
| `force_move effect in ClassFeatureEffect` | 1 | barbarian_brutal_strike_l9 |
| `force_move in spell Effect` | 1 | command |
| `force_move per-charge distance` | 1 | magic_item_ring_of_the_ram |
| `forgo_attack (ClassFeatureActivationCost)` | 1 | monk_quivering_palm_l17 |
| `forgo_attack_roll alternative activation` | 1 | magic_item_javelin_of_lightning |
| `free_cast_once_per_rest resource pattern` | 1 | feat_magic_initiate |
| `FreeSpellCastEffect` | 1 | druid_natural_recovery_l6 |
| `frightened in Condition` | 1 | conjure_fey |
| `frightened in Condition type` | 1 | weird |
| `GM-determined property selection (chosen at item creation / attunement)` | 1 | magic_item_armor_of_vulnerability |
| `grant_action_option_access` | 1 | speak_with_animals |
| `grant_alternate_speed variant of ClassFeatureEffect (climb, swim)` | 1 | ranger_roving_l6 |
| `grant_at_will_cast (ClassFeatureEffect variant)` | 1 | wizard_spell_mastery_l18 |
| `grant_bonus_action_attack` | 1 | monk_martial_arts_l1 |
| `grant_bonus_action_option` | 1 | rogue_cunning_action_l2 |
| `grant_bonus_action_weapon_attack` | 1 | magic_item_scimitar_of_speed |
| `grant_bonus_attack_damage` | 1 | magic_item_potion_of_growth |
| `grant_cantrip_known with swappable-on-long-rest` | 1 | species_elf_elven_lineage |
| `grant_condition_immunity (with sourceFilter: 'magic')` | 1 | magic_item_ring_of_free_action |
| `grant_cover` | 1 | blade_barrier |
| `grant_cover (Half Cover to area occupants)` | 1 | druid_natures_sanctuary_l14 |
| `grant_creature_communication` | 1 | speak_with_animals |
| `grant_die_token` | 1 | bard_bardic_inspiration |
| `grant_environmental_adaptation` | 1 | magic_item_potion_of_water_breathing |
| `grant_environmental_immunity` | 1 | magic_item_ring_of_warmth |
| `grant_extra_turn` | 1 | rogue_thiefs_reflexes_l17 |
| `grant_feat (new ClassFeatureEffect variant)` | 1 | druid_epic_boon_l19 |
| `grant_feat effect atom` | 1 | warlock_ability_score_improvement_l4 |
| `grant_feat_choice (ClassFeatureEffect variant)` | 1 | fighter_fighting_style_l1 |
| `grant_feat_choice effect variant in ClassFeatureEffect` | 1 | monk_ability_score_improvement_l4 |
| `grant_feature_use_at_waived_cost` | 1 | monk_fleet_step_l11 |
| `grant_fly_speed effect in SpeciesTraitEffect (or ClassFeatureEffect)` | 1 | species_dragonborn_draconic_flight |
| `grant_free_spell_cast (as ClassFeatureEffect variant)` | 1 | paladin_faithful_steed_l5 |
| `grant_free_spell_cast (ClassFeatureEffect variant)` | 1 | warlock_contact_patron_l9 |
| `grant_heroic_inspiration` | 1 | fighter_heroic_warrior_l10 |
| `grant_illumination` | 1 | light |
| `grant_immunity` | 1 | magic_item_periapt_of_proof_against_poison |
| `grant_immunity (condition or damage type)` | 1 | wind_walk |
| `grant_immunity effect variant (named-source immunity)` | 1 | magic_item_brooch_of_shielding |
| `grant_information` | 1 | detect_thoughts |
| `grant_language` | 1 | magic_item_ring_of_elemental_command |
| `grant_light` | 1 | continual_flame |
| `grant_mastery_access ClassFeatureEffect variant` | 1 | barbarian_weapon_mastery_l1 |
| `grant_movement (ClassFeatureEffect variant)` | 1 | fighter_tactical_shift_l5 |
| `grant_movement_through_openings` | 1 | magic_item_potion_of_gaseous_form |
| `grant_option_set (ClassFeatureEffect variant)` | 1 | sorcerer_metamagic_l2 |
| `grant_save_auto_succeed (modifier on named-spell cast)` | 1 | warlock_contact_patron_l9 |
| `grant_scroll_access` | 1 | rogue_use_magic_device_l13 |
| `grant_speed.speedKind: "fall"` | 1 | magic_item_ring_of_feather_falling |
| `grant_spell_list_access` | 1 | paladin_spellcasting_l1 |
| `grant_spell_slot_pool (ClassFeatureEffect variant or resource shape)` | 1 | sorcerer_spellcasting_l1 |
| `grant_spell_slots` | 1 | paladin_spellcasting_l1 |
| `grant_spellcasting (ClassFeatureMechanics family)` | 1 | druid_spellcasting_l1 |
| `grant_temporary_hp` | 1 | species_orc_adrenaline_rush |
| `grant_temporary_hp effect (ClassFeatureEffect variant)` | 1 | species_orc_adrenaline_rush |
| `grant_thrown_property` | 1 | magic_item_quarterstaff_of_the_acrobat |
| `grant_traversal_mode` | 1 | water_walk |
| `grant_underwater_breathing` | 1 | magic_item_cloak_of_the_manta_ray |
| `grant_vulnerability` | 1 | magic_item_armor_of_vulnerability |
| `granted_subfeature_activations` | 1 | monk_focus_points |
| `GrantExpertiseEffect (variant of ClassFeatureEffect)` | 1 | wizard_scholar_l2 |
| `GrantMasteryAccessEffect (or GrantWeaponMasterySlots) in ClassFeatureEffect` | 1 | rogue_weapon_mastery_l1 |
| `half_class_level_floor (DiceAmount or amount variant)` | 1 | sorcerer_sorcerous_restoration_l5 |
| `heal amount: flat formula 2 + slot_level` | 1 | cleric_blessed_healer_l6 |
| `heal in spell Effect union` | 1 | conjure_celestial |
| `heavily_obscured_zone (vision obscurement area effect)` | 1 | storm_of_vengeance |
| `hit_die_window` | 1 | magic_item_periapt_of_wound_closure |
| `hourly_hit_die_heal` | 1 | magic_item_rod_of_security |
| `hp_below_max_predicate (conditional filter on damage_on_hit)` | 1 | ranger_hunters_prey_l3 |
| `hp_threshold_gate` | 1 | divine_word |
| `hp_threshold_gate (new ActivationPhase variant)` | 1 | power_word_kill |
| `ignore_difficult_terrain` | 1 | magic_item_ring_of_free_action |
| `imprecise_transport (Off Target / Similar Area outcome branches)` | 1 | teleport |
| `incoming attack_roll trigger (worn-item scope)` | 1 | magic_item_adamantine_armor |
| `Incoming roll modifier scope for OngoingOperation` | 1 | foresight |
| `increment leveled exhaustion by 1` | 1 | magic_item_sword_of_sharpness |
| `Initiative placement for summoned companion` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `initiative_window (new RestResetCadence kind or new trigger type)` | 1 | monk_perfect_focus_l15 |
| `instant_kill` | 1 | power_word_kill |
| `instant_kill_at_hp_threshold` | 1 | magic_item_mace_of_smiting |
| `inter_plane_reentry` | 1 | astral_projection |
| `interact_object` | 1 | mage_hand |
| `intercept_hit` | 1 | mirror_image |
| `item dormancy recharge cadence` | 1 | magic_item_tome_of_leadership_and_influence |
| `item_contact_or_possession_trigger` | 1 | magic_item_talisman_of_ultimate_evil |
| `item_depletion with timed_recharge lifecycle` | 1 | magic_item_manual_of_gainful_exercise |
| `item_destroy (or 'destroy_item' effect)` | 1 | magic_item_iron_bands |
| `item_disenchantment_on_last_charge_roll` | 1 | magic_item_staff_of_striking |
| `item_doffed expiry variant for lifecycle atoms` | 1 | magic_item_glamoured_studded_leather |
| `item_form_state_machine` | 1 | magic_item_quarterstaff_of_the_acrobat |
| `item_interaction_destroy_gate` | 1 | magic_item_bag_of_holding |
| `item_object_state_and_lifecycle` | 1 | magic_item_rope_of_entanglement |
| `item_soul_vessel` | 1 | magic_item_ring_of_mind_shielding |
| `item_state (empty / occupied) as activation precondition` | 1 | magic_item_iron_flask |
| `item_triggered_passive_hazard` | 1 | magic_item_talisman_of_pure_good |
| `item-bound weapon scoping for passive grants` | 1 | magic_item_weapon_1_2_or_3 |
| `item-exposure named-spell trigger` | 1 | magic_item_robe_of_eyes |
| `ItemActivationMechanics (magic action cost)` | 1 | magic_item_carpet_of_flying |
| `ItemDestructionPolicy.last_charge_outcome_table` | 1 | magic_item_staff_of_power |
| `ItemDestructionPolicy.on_companion_death` | 1 | magic_item_ring_of_djinni_summoning |
| `kill` | 1 | divine_word |
| `layer_destruction_condition` | 1 | prismatic_wall |
| `level_grant family for ClassFeatureMechanics` | 1 | bard_ability_score_improvement_l4 |
| `level_up_grant` | 1 | sorcerer_ability_score_improvement_l4 |
| `level_up_grant family for ClassFeatureMechanics` | 1 | warlock_ability_score_improvement_l4 |
| `level-sum charge counter` | 1 | magic_item_ioun_stone |
| `LevelAxis or scaling kind for time-based area growth` | 1 | magic_item_eversmoking_bottle |
| `LevelAxis::use_count_before_long_rest` | 1 | wizard_overchannel_l14 |
| `lever_multimode_activation` | 1 | magic_item_apparatus_of_the_crab |
| `lift_form_restriction (or: modify_spellcasting_restriction)` | 1 | druid_beast_spells_l18 |
| `lineage_choice mechanics family` | 1 | species_dragonborn_draconic_ancestry |
| `lineage_choice subgraph (choose between Forest Gnome and Rock Gnome at character creation)` | 1 | species_gnome_gnomish_lineage |
| `linear_per_round (LevelAxis: 'round')` | 1 | tsunami |
| `location attachment on Attachment` | 1 | minor_illusion |
| `long_rest_expiry lifecycle atom or Duration variant for created resources` | 1 | sorcerer_font_of_magic_l2 |
| `magic_item compound mechanics (passive + on_hit_trigger)` | 1 | magic_item_vorpal_sword |
| `magic_item kind + mechanics family` | 1 | magic_item_iron_flask |
| `magic_item_ability_set` | 1 | magic_item_staff_of_thunder_and_lightning |
| `magic_item_activation family` | 1 | magic_item_deck_of_illusions |
| `magic_item_combined_passive_and_activation` | 1 | magic_item_talisman_of_the_sphere |
| `magic_item_companion_creation_family` | 1 | magic_item_staff_of_the_python |
| `magic_item_composite_mechanics` | 1 | magic_item_rod_of_lordly_might |
| `magic_item_mixed_mechanics` | 1 | magic_item_talisman_of_ultimate_evil |
| `magic_item_mode_switch` | 1 | magic_item_rod_of_lordly_might |
| `magic_item_multi_mechanics_bundle` | 1 | magic_item_robe_of_stars |
| `magic_item_on_hit_trigger` | 1 | magic_item_sword_of_wounding |
| `magic_item_on_hit_trigger_activation` | 1 | magic_item_staff_of_withering |
| `magic_item_record + passive_property family` | 1 | magic_item_mithral_armor |
| `magic_item_root + MagicItemRecord kind` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `magic_item_variant_family` | 1 | magic_item_wand_of_the_war_mage_1_2_or_3 |
| `MagicItemActivationCost.magic_action` | 1 | magic_item_pearl_of_power |
| `MagicItemEffect: cast_stored_spell (expend charge to cast a named spell)` | 1 | magic_item_helm_of_teleportation |
| `MagicItemEffect.refund_spell_slot` | 1 | magic_item_pearl_of_power |
| `MagicItemMechanics / spell_grant family` | 1 | magic_item_hat_of_disguise |
| `MagicItemMechanics ongoing_effect family` | 1 | magic_item_ring_of_regeneration |
| `MagicItemMechanics.embedded_spell_scroll` | 1 | magic_item_spell_scroll |
| `MagicItemMechanics.mixed_mode` | 1 | magic_item_ring_of_mind_shielding |
| `MagicItemMechanics.mixed_passive_and_activation` | 1 | magic_item_thunderous_greatclub |
| `MagicItemMechanics.on_hit_trigger` | 1 | magic_item_rod_of_lordly_might |
| `MagicItemMechanics.ongoing_effect` | 1 | magic_item_rope_of_entanglement |
| `MagicItemMechanics.passive_plus_activation` | 1 | magic_item_scimitar_of_speed |
| `MagicItemMechanics.spawned_creature` | 1 | magic_item_stone_of_controlling_earth_elementals |
| `MagicItemRecord / magic_item kind` | 1 | magic_item_manual_of_gainful_exercise |
| `MagicItemRecord / magic_item UnitRecord kind` | 1 | magic_item_dwarven_plate |
| `MagicItemRecord + magic_item kind in UnitRecord` | 1 | magic_item_giant_slayer |
| `MagicItemRecord + magic_item payload family` | 1 | magic_item_iron_bands |
| `MagicItemRecord + magic_item_root family` | 1 | magic_item_bead_of_force |
| `MagicItemRecord + MagicItemMechanics` | 1 | magic_item_luck_blade |
| `MagicItemRecord + passive_grant family` | 1 | magic_item_brooch_of_shielding |
| `MagicItemRecord + passive_while_worn mechanics family` | 1 | magic_item_helm_of_comprehending_languages |
| `MagicItemRecord + stored_spell_grant family` | 1 | magic_item_potion_of_animal_friendship |
| `MagicItemRecord attunement class restriction` | 1 | magic_item_staff_of_charming |
| `MagicItemRecord attunement qualifier` | 1 | magic_item_wand_of_fireballs |
| `MagicItemRecord attunement restriction metadata` | 1 | magic_item_staff_of_healing |
| `MagicItemRecord bundled rarity variants` | 1 | magic_item_shield_1_2_or_3 |
| `MagicItemRecord.attunement_class_filter` | 1 | magic_item_robe_of_the_archmagi |
| `MagicItemRecord.attunement_restriction` | 1 | magic_item_wand_of_polymorph |
| `manifested_item_mode` | 1 | magic_item_sun_blade |
| `manipulate_object_state (Effect variant)` | 1 | prestidigitation |
| `mark-scoped attachment for class feature modifiers` | 1 | ranger_precise_hunter_l17 |
| `MasteryTrigger (or new ClassFeatureTrigger) :: action_source_hit` | 1 | monk_open_hand_technique_l3 |
| `MasteryTrigger variant: weapon_or_wild_shape_beast_attack` | 1 | druid_elemental_fury_l7 |
| `maximize_hit_die_recovery` | 1 | magic_item_potion_of_vitality |
| `maximize_weapon_damage_dice` | 1 | magic_item_sword_of_sharpness |
| `menu_activation` | 1 | cleric_channel_divinity_l2 |
| `menu_of_effects (choose one at use-time)` | 1 | rogue_cunning_strike_l5 |
| `metamagic_use` | 1 | sorcerer_arcane_apotheosis_l20 |
| `mid_spell_form_change_activation` | 1 | shapechange |
| `milestone_grant` | 1 | wizard_epic_boon_l19 |
| `mixed_duration_phases` | 1 | magic_item_potion_of_vitality |
| `mixed_magic_item_mechanics` | 1 | magic_item_scarab_of_protection |
| `mobile area attachment (sphere moveable by occupants)` | 1 | magic_item_bead_of_force |
| `modify_age` | 1 | magic_item_potion_of_longevity |
| `modify_attunement_cap` | 1 | rogue_use_magic_device_l13 |
| `modify_cast_properties (or metamagic_substitute)` | 1 | sorcerer_dragon_companion_l18 |
| `modify_casting_rule` | 1 | wizard_ritual_adept_l1 |
| `modify_crit_threshold` | 1 | fighter_superior_critical_l15 |
| `modify_hp_multiplier (or scale_heal_multiplier)` | 1 | magic_item_periapt_of_wound_closure |
| `modify_material_property (Effect variant, timed)` | 1 | prestidigitation |
| `modify_max_hp effect in ClassFeatureEffect (or species-trait equivalent)` | 1 | species_dwarf_dwarven_toughness |
| `modify_max_hp variant in Effect` | 1 | harm |
| `modify_movement` | 1 | jump |
| `modify_named_spell_targeting (secondary adjacent target)` | 1 | bard_words_of_creation_l20 |
| `modify_proficiency_bonus` | 1 | magic_item_ioun_stone |
| `modify_roll_advantage as a passive species-trait effect` | 1 | species_gnome_gnomish_cunning |
| `modify_roll_advantage conditioned on active condition + chosen-ability parameter` | 1 | contagion |
| `modify_roll_advantage magical_source_filter` | 1 | magic_item_robe_of_the_archmagi |
| `modify_roll_advantage on incoming attacks (attachment direction: self as target)` | 1 | magic_item_cloak_of_displacement |
| `modify_roll_advantage scoped to enemy Opportunity Attacks against self` | 1 | magic_item_boots_of_speed |
| `modify_roll_advantage variant for ClassFeatureEffect` | 1 | barbarian_danger_sense_l2 |
| `modify_roll_advantage.abilityCheckAbilityFilter` | 1 | magic_item_staff_of_withering |
| `modify_roll_advantage.abilityCheckFilter` | 1 | magic_item_potion_of_growth |
| `modify_roll_advantage.attackKindFilter` | 1 | magic_item_spellguard_shield |
| `modify_roll_advantage.sourceFilter` | 1 | magic_item_spellguard_shield |
| `modify_roll_numeric spell_attack_filter` | 1 | magic_item_robe_of_the_archmagi |
| `modify_roll_numeric with per-rest decay schedule` | 1 | resurrection |
| `modify_roll_numeric.attackFilter = spell_attack` | 1 | magic_item_talisman_of_pure_good |
| `modify_roll_reroll (ClassFeatureEffect variant)` | 1 | monk_disciplined_survivor_l14 |
| `modify_roll_substitute (surface shape for die-result floor)` | 1 | feat_great_weapon_fighting |
| `modify_roll_substitute_ability surface type` | 1 | monk_martial_arts |
| `modify_roll_threshold (death save 18–20 → 20)` | 1 | fighter_survivor_l18 |
| `modify_save_dc` | 1 | magic_item_robe_of_the_archmagi |
| `modify_size_category` | 1 | magic_item_potion_of_growth |
| `modify_size_category (passive, for encumbrance rules)` | 1 | species_goliath_powerful_build |
| `modify_spell_damage_with_ability_mod (ClassFeatureEffect or OngoingOperation variant)` | 1 | sorcerer_elemental_affinity_l6 |
| `modify_spell_dc` | 1 | sorcerer_innate_sorcery_l1 |
| `modify_terrain (difficult terrain area effect)` | 1 | storm_of_vengeance |
| `modify_weapon_damage_numeric` | 1 | magic_item_staff_of_striking |
| `modify_world_state` | 1 | control_weather |
| `ModifyRollAdvantageOperation (new OngoingOperation variant)` | 1 | foresight |
| `movable area attachment` | 1 | moonbeam |
| `move effect for ClassFeatureEffect (Withdraw: half speed, no OA)` | 1 | rogue_cunning_strike_l5 |
| `move effect in ClassFeatureEffect` | 1 | barbarian_instinctive_pounce_l7 |
| `moveable attachment` | 1 | conjure_celestial |
| `moveable_area_dual_effect` | 1 | conjure_celestial |
| `moving_area (new Attachment property or variant)` | 1 | cloudkill |
| `moving_area attachment or lifecycle atom` | 1 | tsunami |
| `multi_activation class feature (primary + secondary repositioning activation)` | 1 | druid_natures_sanctuary_l14 |
| `multi_effect_selection — select N from a named effect list` | 1 | barbarian_improved_brutal_strike_l17 |
| `multi_family_mechanics` | 1 | magic_item_ring_of_elemental_command |
| `multi_grant_class_feature` | 1 | paladin_faithful_steed_l5 |
| `multi_layer_traversal` | 1 | prismatic_wall |
| `multi_mechanic_class_feature` | 1 | bard_font_of_inspiration_l5 |
| `multi_mode_ongoing` | 1 | detect_thoughts |
| `multi_mode_ongoing_effect` | 1 | control_water |
| `multi_property_activated_mechanics` | 1 | magic_item_ring_of_shooting_stars |
| `multi_target_n selection (n distinct creatures) for Attachment` | 1 | storm_of_vengeance |
| `multi-charge consumption with linear damage scaling` | 1 | magic_item_necklace_of_fireballs |
| `multi-variant item (one item slug, several named sub-configurations)` | 1 | magic_item_figurine_of_wondrous_power |
| `Narrative scope scaling (slot-based time-window)` | 1 | modify_memory |
| `negate_instant_death` | 1 | death_ward |
| `negate_named_effect` | 1 | magic_item_ring_of_feather_falling |
| `negate_spell_by_level (ReactionEffect variant)` | 1 | magic_item_ioun_stone |
| `negate_spell_on_save_success` | 1 | magic_item_ring_of_spell_turning |
| `negotiation_gate` | 1 | planar_ally |
| `no_resource (or absent resource) in ClassFeatureMechanicsHeader` | 1 | rogue_weapon_mastery_l1 |
| `object (Attachment kind)` | 1 | telekinesis |
| `object / surface (Attachment kind)` | 1 | prestidigitation |
| `object_creation_spell` | 1 | wall_of_ice |
| `object_proxy spell mechanics family` | 1 | mage_hand |
| `object_stats — new surface shape for created objects` | 1 | wall_of_stone |
| `object_stats (AC, HP per section, immunities, vulnerabilities)` | 1 | wall_of_ice |
| `object_surface attachment` | 1 | passwall |
| `obliterate_creature_remains` | 1 | magic_item_sphere_of_annihilation |
| `on_attack_window` | 1 | ranger_hunters_prey_l3 |
| `on_damage_taken_window` | 1 | magic_item_cloak_of_displacement |
| `on_damage_window (ClassFeatureTrigger)` | 1 | ranger_superior_hunters_prey_l11 |
| `on_expiry cleanup: eject_occupants` | 1 | passwall |
| `on_feature_trigger class-feature mechanics family` | 1 | cleric_sear_undead_l5 |
| `on_flurry_hit (ClassFeatureActivationCost)` | 1 | monk_quivering_palm_l17 |
| `on_hit_consume trigger for UseCountResource` | 1 | magic_item_ammunition_1_2_or_3 |
| `on_hit_trigger family for class features` | 1 | druid_elemental_fury_l7 |
| `on_hit_trigger family for class_feature` | 1 | barbarian_brutal_strike_l9 |
| `on_hit_trigger family for ClassFeatureMechanics` | 1 | rogue_sneak_attack_l1 |
| `on_incoming_hit_window` | 1 | mirror_image |
| `on_miss_trigger` | 1 | mastery_graze |
| `on_miss_trigger (class feature family)` | 1 | fighter_studied_attacks_l13 |
| `on_received_hit_window` | 1 | fire_shield |
| `on_section_destroyed_window` | 1 | wall_of_ice |
| `on_sneak_attack_hit_trigger (class feature family)` | 1 | rogue_cunning_strike_l5 |
| `on_use_trigger (ClassFeatureMechanics family)` | 1 | fighter_tactical_shift_l5 |
| `ongoing_effect with choice-set and in-duration swap` | 1 | alter_self |
| `OngoingEffect: repeat_save per turn` | 1 | magic_item_dust_of_sneezing_and_choking |
| `OngoingEffectMechanics.operations (array, currently single field)` | 1 | heat_metal |
| `OngoingEffectMechanics.operations (array, not singular)` | 1 | warding_bond |
| `OngoingOperation — block_travel variant` | 1 | antilife_shell |
| `OngoingOperation — create_object` | 1 | major_image |
| `OngoingOperation — damage_on_area_entry_or_turn_end` | 1 | wall_of_fire |
| `OngoingOperation — grant_passive_effect` | 1 | alter_self |
| `OngoingOperation — modify_natural_weapon` | 1 | alter_self |
| `OngoingOperation — optional_trigger + per_turn_limit modifiers` | 1 | conjure_woodland_beings |
| `OngoingOperation — random_behavior_table variant` | 1 | confusion |
| `OngoingOperation (kind: terrain_reshape)` | 1 | move_earth |
| `OngoingOperation (or ActivationPhase) — passive ability_check detection` | 1 | major_image |
| `OngoingOperation { kind: "remote_sense" }` | 1 | clairvoyance |
| `OngoingOperation / death_guard` | 1 | death_ward |
| `OngoingOperation kind = "maximize_healing_received"` | 1 | beacon_of_hope |
| `OngoingOperation kind = "roll_advantage"` | 1 | beacon_of_hope |
| `OngoingOperation: area_save_gate` | 1 | web |
| `OngoingOperation: effect_bundle (or array<OngoingOperation>)` | 1 | gaseous_form |
| `OngoingOperation: lock_object (block_access)` | 1 | arcane_lock |
| `OngoingOperation: modify_roll_advantage` | 1 | shining_smite |
| `OngoingOperation: repeat_save (damage-triggered)` | 1 | dominate_beast |
| `OngoingOperation: telepathic_command_link` | 1 | dominate_beast |
| `OngoingOperation::area_contact_save_gate` | 1 | conjure_woodland_beings |
| `OngoingOperation::area_save_gate` | 1 | spirit_guardians |
| `OngoingOperation::block_transit` | 1 | antimagic_field |
| `OngoingOperation::grant_capability` | 1 | speak_with_animals |
| `OngoingOperation::suppress_magic` | 1 | antimagic_field |
| `OngoingOperation::suppress_ongoing_spells` | 1 | antimagic_field |
| `OngoingOperation.advantage_modifier` | 1 | holy_aura |
| `OngoingOperation.alter_appearance` | 1 | disguise_self |
| `OngoingOperation.area_save_gate` | 1 | incendiary_cloud |
| `OngoingOperation.block_detection` | 1 | sequester |
| `OngoingOperation.block_sight (heavily_obscured)` | 1 | incendiary_cloud |
| `OngoingOperation.block_travel` | 1 | magic_circle |
| `OngoingOperation.bonus_action_damage_pulse` | 1 | heat_metal |
| `OngoingOperation.conditional_dispel` | 1 | daylight |
| `OngoingOperation.conjured_weapon_attack` | 1 | flame_blade |
| `OngoingOperation.create_illusory_double` | 1 | mislead |
| `OngoingOperation.force_move_aura` | 1 | control_water |
| `OngoingOperation.grant_traversal_mode` | 1 | water_walk |
| `OngoingOperation.kind: heal_on_consume` | 1 | goodberry |
| `OngoingOperation.modify_roll_advantage_scoped` | 1 | magic_circle |
| `OngoingOperation.modify_roll_substitute` | 1 | shillelagh |
| `OngoingOperation.save_gate` | 1 | control_water |
| `OngoingOperation.save_gate_on_entry_attempt` | 1 | magic_circle |
| `OngoingOperation.sensory_link` | 1 | mislead |
| `OngoingTrigger: on_combat_start` | 1 | magic_item_weapon_of_warning |
| `OngoingTrigger.on_time_interval` | 1 | magic_item_ring_of_regeneration |
| `open_choice (choose-one-of-N at character creation)` | 1 | species_goliath_giant_ancestry |
| `open_choice constraint on grant_feat` | 1 | fighter_epic_boon_l19 |
| `open_fissure` | 1 | magic_item_thunderous_greatclub |
| `option_grant family for class features` | 1 | sorcerer_metamagic_l2 |
| `optional or unlimited UseCountResource` | 1 | barbarian_brutal_strike_l9 |
| `override_save_outcome` | 1 | magic_item_scarab_of_protection |
| `pact_magic_slot_pool` | 1 | warlock_pact_magic_l1 |
| `paired-item invalidation lifecycle` | 1 | magic_item_sending_stones |
| `pass_through_terrain` | 1 | magic_item_ring_of_elemental_command |
| `Passive gate: weapon_within_reach` | 1 | magic_item_weapon_of_warning |
| `passive_always_on family for MagicItemMechanics` | 1 | magic_item_glamoured_studded_leather |
| `passive_always_on mechanics family` | 1 | feat_great_weapon_fighting |
| `passive_aura (class-feature family)` | 1 | paladin_aura_of_courage_l10 |
| `passive_aura_family` | 1 | magic_item_lantern_of_revealing |
| `passive_aura_magic_item` | 1 | magic_item_weapon_of_warning |
| `passive_benefit (bypass_resistance, always-on)` | 1 | feat_boon_of_irresistible_offense |
| `passive_bundle` | 1 | magic_item_dragon_scale_mail |
| `passive_bundle family (multi-effect always-on attunement)` | 1 | magic_item_cloak_of_arachnida |
| `passive_conditional family for ClassFeatureMechanics` | 1 | monk_unarmored_movement_l2 |
| `passive_container_family` | 1 | magic_item_bag_of_holding |
| `passive_enchantment family` | 1 | magic_item_defender |
| `passive_equip mechanics family` | 1 | magic_item_eyes_of_minute_seeing |
| `passive_grant (class-feature family)` | 1 | fighter_fighting_style_l1 |
| `passive_grant (ClassFeature family)` | 1 | sorcerer_spellcasting_l1 |
| `passive_grant (new ClassFeatureMechanics family)` | 1 | druid_epic_boon_l19 |
| `passive_grant family for class features` | 1 | monk_ability_score_improvement_l4 |
| `passive_grant mechanics family` | 1 | species_orc_darkvision |
| `passive_hit_intercept` | 1 | mirror_image |
| `passive_initiative_trigger family for ClassFeatureMechanics` | 1 | bard_superior_inspiration_l18 |
| `passive_item_bonus family (always-on numeric modifier while wielded/on person)` | 1 | magic_item_luck_blade |
| `passive_modifier` | 1 | barbarian_fast_movement_l5 |
| `passive_modifier (class feature family)` | 1 | ranger_extra_attack_l5 |
| `passive_modifier (new ClassFeatureMechanics family)` | 1 | barbarian_extra_attack_l5 |
| `passive_modifier family for ClassFeatureMechanics` | 1 | ranger_foe_slayer_l20 |
| `passive_persistent mechanics family` | 1 | magic_item_adamantine_armor |
| `passive_property mechanics family` | 1 | magic_item_elven_chain |
| `passive_reactive_trigger mechanics family for species traits` | 1 | species_orc_relentless_endurance |
| `passive_scope_modifier` | 1 | monk_deflect_energy_l13 |
| `passive_spell_cast_modifier family for ClassFeatureMechanics` | 1 | wizard_sculpt_spells_l6 |
| `passive_spell_cast_trigger` | 1 | feat_boon_of_spell_recall |
| `passive_spell_grant` | 1 | wizard_evocation_savant_l3 |
| `passive_spell_grant family for ClassFeatureMechanics` | 1 | sorcerer_draconic_spells_l3 |
| `passive_spell_modifier family` | 1 | sorcerer_dragon_companion_l18 |
| `passive_trait (ClassFeatureMechanics family)` | 1 | rogue_use_magic_device_l13 |
| `passive_trait family` | 1 | species_dwarf_dwarven_resilience |
| `passive_trigger (class-feature family)` | 1 | fighter_heroic_warrior_l10 |
| `passive_trigger family for ClassFeatureMechanics` | 1 | cleric_disciple_of_life_l3 |
| `passive_trigger_class_feature_family` | 1 | monk_fleet_step_l11 |
| `passive_triggered_class_feature` | 1 | druid_archdruid_l20 |
| `passive_upgrade family for ClassFeatureMechanics` | 1 | barbarian_improved_brutal_strike_l17 |
| `passive_weapon_bonus family` | 1 | magic_item_mace_of_smiting |
| `passive_weapon_bonus family (always-on +N to attack and damage rolls)` | 1 | magic_item_giant_slayer |
| `passive_while_holding mechanics family (or passive_aura)` | 1 | magic_item_frost_brand |
| `passive_while_worn mechanics family` | 1 | magic_item_dwarven_plate |
| `per_card_use_count` | 1 | magic_item_deck_of_illusions |
| `per-target history modifier on save advantage` | 1 | magic_item_iron_flask |
| `per-turn repeat save gated on applied condition` | 1 | weird |
| `periodic re-targeting within concentration (window or mechanism variant)` | 1 | move_earth |
| `periodic_damage OngoingOperation` | 1 | ensnaring_strike |
| `periodic_heal (hourly cadence)` | 1 | magic_item_ioun_stone |
| `periodic_heal (OngoingOperation union)` | 1 | regenerate |
| `permanent condition-scoped modify_roll_advantage` | 1 | species_dwarf_dwarven_resilience |
| `permanent duration endsOn: 'wearer_bonus_action' (or DurationEndTrigger { kind: 'wearer_spends_bonus_action' })` | 1 | magic_item_ring_of_invisibility |
| `permanent_feat_grant family` | 1 | warlock_epic_boon_l19 |
| `permanent_grant` | 1 | monk_epic_boon_l19 |
| `permanent_grant family for ClassFeatureMechanics` | 1 | barbarian_epic_boon_l19 |
| `permanent_progression` | 1 | druid_ability_score_improvement_l4 |
| `persistent_activation` | 1 | call_lightning |
| `persistent_area_save family` | 1 | zone_of_truth |
| `PerSizeClassSlotScaling` | 1 | animate_objects |
| `PerTurnRollCheckOperation` | 1 | blink |
| `placement_displacement — automatic force_move without save or roll` | 1 | wall_of_stone |
| `planar_origin_filter on save_gate precondition` | 1 | magic_item_iron_flask |
| `plane_conditional_grants` | 1 | magic_item_ring_of_elemental_command |
| `plane_keyed_side_selection` | 1 | magic_item_cubic_gate |
| `player_choice_damage_type` | 1 | cleric_blessed_strikes_l7 |
| `point_pool resource (cross-feature shared pool)` | 1 | sorcerer_metamagic_l2 |
| `point_pool UseCountResource variant (or parallel type)` | 1 | sorcerer_font_of_magic_l2 |
| `polymorph_creature` | 1 | animal_shapes |
| `PolymorphFormSource — named_spell_form` | 1 | magic_item_potion_of_gaseous_form |
| `pool_with_options_menu` | 1 | paladin_fighting_style_l2 |
| `portal_creation_and_lifecycle` | 1 | magic_item_well_of_many_worlds |
| `possess_creature` | 1 | magic_jar |
| `post-cast caster-state penalty (conditional on target property)` | 1 | resurrection |
| `post-effect randomized cooldown reset cadence` | 1 | magic_item_wings_of_flying |
| `prerequisite_feature link (requires Reckless Attack)` | 1 | barbarian_brutal_strike_l9 |
| `prevent_hp_floor` | 1 | death_ward |
| `prevent_ko (or set_hp_floor)` | 1 | species_orc_relentless_endurance |
| `probabilistic_gate resolution` | 1 | mirror_image |
| `probabilistic_override (Obsidian Steed 10% disobedience)` | 1 | magic_item_figurine_of_wondrous_power |
| `probabilistic_roll_gate` | 1 | feat_boon_of_spell_recall |
| `project_astral_form` | 1 | astral_projection |
| `Proximity constraint on activation` | 1 | magic_item_brazier_of_commanding_fire_elementals |
| `proximity_and_fill_activation_condition` | 1 | magic_item_bowl_of_commanding_water_elementals |
| `proximity_aura trigger` | 1 | prismatic_wall |
| `proximity_tether self-break condition` | 1 | mage_hand |
| `proximity_window` | 1 | conjure_animals |
| `proxy_conjure family` | 1 | conjure_fey |
| `random_behavior_table` | 1 | confusion |
| `random_dispatch_table` | 1 | prismatic_spray |
| `random_outcome_table — stochastic failure branch with d100 dispatch` | 1 | magic_item_hat_of_many_spells |
| `Range — self_radius_miles` | 1 | control_weather |
| `Range with threshold-tier scaling` | 1 | spare_the_dying |
| `Range.unlimited` | 1 | sending |
| `rarity axis in LevelAxis` | 1 | magic_item_ammunition_1_2_or_3 |
| `reaction_quota or optional resource (ClassFeatureMechanicsHeader)` | 1 | ranger_superior_hunters_defense_l15 |
| `ReactionEffect::save_gate_negate_current_casting` | 1 | counterspell |
| `receive_spell_into_item` | 1 | magic_item_ring_of_spell_storing |
| `reconfigure_on_long_rest cadence in RestResetCadence` | 1 | rogue_weapon_mastery_l1 |
| `RecoverSpellSlotsEffect` | 1 | druid_natural_recovery_l6 |
| `recurring_action_cost on persistent object (per-turn command)` | 1 | mage_hand |
| `recurring_at_levels on ClassFeatureRecord (or passive_grant mechanics)` | 1 | ranger_ability_score_improvement_l4 |
| `redirect_attack_target` | 1 | magic_item_shield_of_missile_attraction |
| `reduce_damage_on_receive (new OngoingOperation variant)` | 1 | resistance |
| `reduce_damage_taken (damage mitigation via reaction roll)` | 1 | species_goliath_giant_ancestry |
| `reduce_forced_movement (effect)` | 1 | magic_item_dwarven_plate |
| `refill_resource_to_floor (new ClassFeatureEffect variant)` | 1 | bard_superior_inspiration_l18 |
| `refill_resource_to_minimum (new ClassFeatureEffect kind)` | 1 | monk_perfect_focus_l15 |
| `reflect_spell` | 1 | magic_item_ring_of_spell_turning |
| `reflect_triggering_spell` | 1 | magic_item_staff_of_charming |
| `refund_spell_slot` | 1 | feat_boon_of_spell_recall |
| `refund_spell_slots (new ClassFeatureEffect variant)` | 1 | warlock_eldritch_master_l20 |
| `remove_curse` | 1 | greater_restoration |
| `remove_equipment_prerequisite` | 1 | magic_item_mithral_armor |
| `repeat_phase_per_charge` | 1 | magic_item_ring_of_shooting_stars |
| `repeat_save (save at end of each of target's turns)` | 1 | rogue_cunning_strike_l5 |
| `repeat_save ActivationPhase variant` | 1 | contagion |
| `repeat_save in spell Effect context` | 1 | prismatic_wall |
| `repeat_save on ongoing_effect — per-turn end-of-turn save to break` | 1 | confusion |
| `repeat_save surface type` | 1 | rogue_devious_strikes_l14 |
| `repeat_save with non-combat cadence (30-day interval)` | 1 | befuddlement |
| `repeat_save_condition_progression` | 1 | prismatic_spray |
| `repeat_save_per_turn` | 1 | bestow_curse |
| `repeating_area_save_gate` | 1 | stinking_cloud |
| `replace_damage_die` | 1 | monk_martial_arts_l1 |
| `replace_failed_save_with_success` | 1 | magic_item_staff_of_charming |
| `replace_on_recast in Duration or lifecycle` | 1 | magic_weapon |
| `replace_species_traits` | 1 | reincarnate |
| `replace_stored_spell_on_rest (or analogous atom for swapping a mastered spell reference on long rest)` | 1 | wizard_spell_mastery_l18 |
| `replaceable_on_level_up (modifier on feat-choice effects)` | 1 | fighter_fighting_style_l1 |
| `reposition_objects_operation` | 1 | dancing_lights |
| `reroll_failed_d20_test (triggered by failed D20 Test, must-use-second-roll constraint)` | 1 | magic_item_luck_blade |
| `reroll_saving_throw in ClassFeatureEffect` | 1 | fighter_indomitable |
| `ResetCadence: century_recharge (consumable magic item)` | 1 | magic_item_manual_of_quickness_of_action |
| `Resolution.ability_check_escape` | 1 | control_water |
| `Resolution.probability_gate` | 1 | control_water |
| `resource_below_threshold (conditional gate)` | 1 | monk_perfect_focus_l15 |
| `resource_conversion ClassFeatureEffect variant` | 1 | sorcerer_font_of_magic_l2 |
| `resource_pool family for class features` | 1 | sorcerer_font_of_magic_l2 |
| `Resource: burn_time (consumable duration resource)` | 1 | magic_item_candle_of_invocation |
| `rest_configured_passive` | 1 | warlock_fiendish_resilience_l10 |
| `rest_time_choice_grant` | 1 | druid_circle_of_the_land_spells_l3 |
| `restore_ability_score` | 1 | greater_restoration |
| `restore_body_part` | 1 | magic_item_ring_of_regeneration |
| `restore_class_resource (ClassFeatureEffect variant)` | 1 | sorcerer_sorcerous_restoration_l5 |
| `restore_life` | 1 | reincarnate |
| `restrained (Condition type)` | 1 | telekinesis |
| `RestResetCadence — daily_at_dawn variant` | 1 | magic_item_pipes_of_the_sewers |
| `RestResetCadence: 'dawn'` | 1 | magic_item_iron_bands |
| `RestResetCadence: daily_at_dawn (or recharge_at_dawn)` | 1 | magic_item_cloak_of_invisibility |
| `RestResetCadence: daily_at_dawn (with dice refill)` | 1 | magic_item_helm_of_teleportation |
| `RestResetCadence: daily_at_dawn_dice` | 1 | magic_item_cube_of_force |
| `RestResetCadence: per_combat (or absent for passive)` | 1 | rogue_thiefs_reflexes_l17 |
| `RestResetCadence: rolled_long_rests` | 1 | cleric_greater_divine_intervention_l20 |
| `RestResetCadence: time_based` | 1 | magic_item_frost_brand |
| `RestResetCadence.century` | 1 | magic_item_tome_of_understanding |
| `RestResetCadence.cooldown_timed_random` | 1 | magic_item_well_of_many_worlds |
| `RestResetCadence.daily_at_dawn` | 1 | magic_item_medallion_of_thoughts |
| `RestResetCadence.dawn` | 1 | magic_item_pearl_of_power |
| `RestResetCadence.dusk` | 1 | magic_item_robe_of_stars |
| `RestResetCadence.long_rest_or_spend_resource` | 1 | sorcerer_dragon_wings_l14 |
| `RestResetCadence.timed_after_use` | 1 | magic_item_ring_of_djinni_summoning |
| `restrict_turn in spell Effect (or a new restrict_action_set_on_target variant)` | 1 | command |
| `restrict_turn_economy` | 1 | rogue_devious_strikes_l14 |
| `RestTriggeredActivation or optional resource in ClassFeatureMechanicsHeader` | 1 | wizard_memorize_spell_l5 |
| `retaliatory_damage (OngoingOperation or EffectTarget variant)` | 1 | fire_shield |
| `return_on_end` | 1 | magic_item_rod_of_security |
| `return_to_hand` | 1 | magic_item_quarterstaff_of_the_acrobat |
| `reveal_invisible` | 1 | magic_item_lantern_of_revealing |
| `roll modifier for weapon damage rolls` | 1 | magic_item_vorpal_sword |
| `rolled_duration` | 1 | magic_item_potion_of_diminution |
| `RollKind — death_saving_throw` | 1 | fighter_survivor_l18 |
| `RollKind: 'ability_check' / 'initiative'` | 1 | magic_item_ioun_stone |
| `RollKind.ability_check` | 1 | heat_metal |
| `RollKind.damage_roll` | 1 | magic_item_quarterstaff_of_the_acrobat |
| `save_gate CR-conditional auto-succeed` | 1 | animal_messenger |
| `save_gate with willing bypass (consent filter)` | 1 | seeming |
| `save_gate_damage (ClassFeatureEffect)` | 1 | monk_quivering_palm_l17 |
| `save_gate_on_magic_action` | 1 | telekinesis |
| `save_gate_on_presence (new OngoingOperation variant)` | 1 | cloudkill |
| `save_gate_ongoing_operation` | 1 | call_lightning |
| `save_gate.conditional_target_disadvantage` | 1 | magic_item_talisman_of_pure_good |
| `save_gate.target_type_disadvantage` | 1 | magic_item_talisman_of_ultimate_evil |
| `save_gated_onset` | 1 | polymorph |
| `save_gated_persistent_debuff` | 1 | slow |
| `save_half_damage_branch` | 1 | hellish_rebuke |
| `save_source_filter_against_spells` | 1 | magic_item_scarab_of_protection |
| `SaveGate: creature_type_exemption filter` | 1 | magic_item_dust_of_sneezing_and_choking |
| `SaveSuccessEffect.reuse_lock` | 1 | scrying |
| `scalable delta on RollModifierOperation` | 1 | magic_weapon |
| `scale_attack_count (new ClassFeatureEffect variant)` | 1 | barbarian_extra_attack_l5 |
| `scale_attack_count on activation attack phases` | 1 | eldritch_blast |
| `scale_feature_parameter — upgrade a named damage expression on a sibling feature` | 1 | barbarian_improved_brutal_strike_l17 |
| `scoped_advantage_on_save` | 1 | magic_item_dragon_scale_mail |
| `scrutiny_check_window` | 1 | seeming |
| `self_and_nearby (Attachment variant)` | 1 | word_of_recall |
| `self_break_condition (Duration or SpellMechanicsHeader field)` | 1 | sanctuary |
| `self_plus_choose_up_to attachment mode` | 1 | wind_walk |
| `sense_presence` | 1 | detect_thoughts |
| `sense-gated roll modifier predicate` | 1 | magic_item_robe_of_eyes |
| `SenseKind.x_ray_vision` | 1 | magic_item_ring_of_x_ray_vision |
| `set_ac_formula (ClassFeatureEffect variant)` | 1 | barbarian_unarmored_defense_l1 |
| `set_base_ac_formula effect for ClassFeatureEffect` | 1 | monk_unarmored_defense_l1 |
| `set_hp (effect atom)` | 1 | barbarian_relentless_rage_l11 |
| `set_spellcasting_ability` | 1 | paladin_spellcasting_l1 |
| `set_spellcasting_ability (ClassFeatureEffect variant)` | 1 | sorcerer_spellcasting_l1 |
| `shared non-spell on_hit_trigger family for magic items` | 1 | magic_item_sword_of_life_stealing |
| `shared_resource_activation_menu` | 1 | magic_item_staff_of_swarming_insects |
| `shed_light` | 1 | magic_item_robe_of_scintillating_colors |
| `short_rest_trigger (ClassFeatureActivationCost variant)` | 1 | sorcerer_sorcerous_restoration_l5 |
| `shunt_on_expiry (expiry effect variant)` | 1 | demiplane |
| `size_constraint on save_gate (Large or smaller)` | 1 | rogue_cunning_strike_l5 |
| `size_filter on save_gate (Advantage for Large+)` | 1 | ensnaring_strike |
| `SizeVariant (GM-chosen or random table)` | 1 | magic_item_carpet_of_flying |
| `slot_conditional_duration` | 1 | bestow_curse |
| `slot_scaled_creature_type_substitution` | 1 | create_undead |
| `slot_scaled_duration` | 1 | planar_binding |
| `SlotScaling<number> for companion count` | 1 | animate_dead |
| `smite_activation family` | 1 | shining_smite |
| `sneak_attack_dice_cost resource` | 1 | rogue_devious_strikes_l14 |
| `somatic_failure_chance` | 1 | slow |
| `sorcery_points` | 1 | sorcerer_arcane_apotheosis_l20 |
| `soul_displacement` | 1 | magic_jar |
| `soul_transfer` | 1 | clone |
| `space_creation` | 1 | demiplane |
| `spawned_creature mechanics family for magic items` | 1 | magic_item_ring_of_djinni_summoning |
| `spawned_object_companion` | 1 | magic_item_ring_of_shooting_stars |
| `species_trait kind + SpeciesTraitRecord` | 1 | species_dragonborn_draconic_ancestry |
| `species_trait UnitRecord kind + species_trait_root source atom` | 1 | species_goliath_giant_ancestry |
| `species_trait_record` | 1 | species_tiefling_otherworldly_presence |
| `SpeciesTraitRecord (kind = "species_trait")` | 1 | species_orc_relentless_endurance |
| `SpeciesTraitRecord + passive mechanics family` | 1 | species_dragonborn_darkvision |
| `SpeciesTraitRecord + passive_grant family` | 1 | species_orc_darkvision |
| `SpeciesTraitRecord + passive_modifier family` | 1 | species_gnome_gnomish_cunning |
| `SpeciesTraitRecord + passive_modifier mechanics family` | 1 | species_dwarf_dwarven_toughness |
| `SpeciesTraitRecord + passive_trigger family` | 1 | halfling_luck |
| `SpeciesTraitRecord + SpeciesTraitMechanics` | 1 | species_dragonborn_draconic_flight |
| `Spell Effect variants: block_targeting, block_travel, transport_exile, fall_on_end` | 1 | rope_trick |
| `spell_cast_option` | 1 | wizard_overchannel_l14 |
| `spell_cast_trigger condition: heal_targets_other_than_self` | 1 | cleric_blessed_healer_l6 |
| `spell_cast_trigger family for class features` | 1 | cleric_blessed_healer_l6 |
| `spell_dependency_lifecycle` | 1 | magic_item_crystal_ball_of_mind_reading |
| `spell_invocation_override.creature_type` | 1 | druid_wild_companion_l2 |
| `spell_invocation_override.duration_cap` | 1 | druid_wild_companion_l2 |
| `spell_reservoir` | 1 | magic_item_ring_of_spell_storing |
| `spell_selection_from_book (surface shape for class feature spell reference)` | 1 | wizard_spell_mastery_l18 |
| `spell_slot_cost_substitution` | 1 | magic_item_rod_of_absorption |
| `spell_slot_schedule (new surface type for class slot tables)` | 1 | ranger_spellcasting_l1 |
| `spell_slot_table resource (multi-level, class-level-scaled)` | 1 | druid_spellcasting_l1 |
| `spell_source_filter on modify_roll_advantage` | 1 | magic_item_ring_of_spell_turning |
| `spellcasting_ability_choice (build-time choice binding)` | 1 | feat_magic_initiate |
| `spellcasting_grant (new ClassFeatureMechanics family)` | 1 | ranger_spellcasting_l1 |
| `SpellEffect.grant_reaction_use` | 1 | power_word_heal |
| `StandardActionKind — bonus_action and reaction` | 1 | confusion |
| `stat_block_replacement` | 1 | polymorph |
| `Status: suffocating` | 1 | magic_item_dust_of_sneezing_and_choking |
| `store_and_release_class_feature` | 1 | monk_quivering_palm_l17 |
| `stored_spell payload family (Reserve variant)` | 1 | magic_item_ioun_stone |
| `stored_spell_reference — cast-time constrained spell capture` | 1 | contingency |
| `stored_spell_scroll_payload` | 1 | magic_item_spell_scroll |
| `study_activation_cost` | 1 | magic_item_tome_of_clear_thought |
| `stunned in Condition type` | 1 | wind_walk |
| `subclass_acquisition` | 1 | wizard_wizard_subclass_l3 |
| `succeed_on_save` | 1 | magic_item_ring_of_evasion |
| `summon_creature_family` | 1 | planar_ally |
| `SummonCreaturesOperation` | 1 | animate_objects |
| `summoning mechanics family (create_companion)` | 1 | magic_item_censer_of_controlling_air_elementals |
| `suppress_concentration_break` | 1 | ranger_relentless_hunter_l13 |
| `suppress_crit (or promote deferred crit_window)` | 1 | magic_item_adamantine_armor |
| `suppress_roll_disadvantage (or extend modify_roll_advantage to passive scope)` | 1 | magic_item_mithral_armor |
| `suppress_slot_cost` | 1 | wizard_spell_mastery_l18 |
| `table_reroll_meta_outcome` | 1 | prismatic_spray |
| `target selection: choose_any_in_range (unbounded)` | 1 | seeming |
| `target_reaction_escape — save_gate where on-success grants target a Reaction move` | 1 | wall_of_stone |
| `targeting_interception (OngoingOperation variant)` | 1 | sanctuary |
| `TargetSelection — ability_modifier_count` | 1 | paladin_abjure_foes_l9 |
| `TargetSelection { mode: "any" }` | 1 | enthrall |
| `TargetSelection fixed-count mode` | 1 | water_walk |
| `TargetSelection.any_chosen_in_range` | 1 | divine_word |
| `TargetSelection.any_number` | 1 | mass_heal |
| `TargetSelection.any_willing` | 1 | animal_shapes |
| `TargetSelection.mode = "any_number"` | 1 | beacon_of_hope |
| `telepathy_gate` | 1 | magic_item_ring_of_mind_shielding |
| `teleport (self-movement to unoccupied seen space)` | 1 | species_goliath_giant_ancestry |
| `Threshold-tiers count scaling in grant_mastery_access` | 1 | barbarian_weapon_mastery_l1 |
| `ThresholdTiers<number> for speed amount (class axis)` | 1 | monk_unarmored_movement_l2 |
| `time_of_day_precondition` | 1 | create_undead |
| `toggle_deactivation activation cost` | 1 | magic_item_boots_of_speed |
| `toggle_effect family (stateful open/close with two distinct persistent states)` | 1 | magic_item_eversmoking_bottle |
| `toggle_state family (open/close activated object)` | 1 | magic_item_portable_hole |
| `TransitionDelay` | 1 | control_weather |
| `transport (Effect variant)` | 1 | word_of_recall |
| `transport Effect variant` | 1 | teleport |
| `transport_exile (extradimensional containment with gate destruction interaction)` | 1 | magic_item_portable_hole |
| `transport_exile in spell Effect context` | 1 | prismatic_wall |
| `transport_exile with random table destination` | 1 | magic_item_amulet_of_the_planes |
| `traversal_damage (new OngoingOperation variant)` | 1 | spike_growth |
| `traversal_window` | 1 | spike_growth |
| `Trigger condition: save_failure_against_condition_type (with range filter)` | 1 | bard_countercharm_l7 |
| `trigger guard: condition_occupancy_check` | 1 | conjure_elemental |
| `trigger variant for natural-20 weapon attack` | 1 | magic_item_sword_of_sharpness |
| `trigger_condition (class-feature trigger shape)` | 1 | barbarian_relentless_rage_l11 |
| `trigger-parameterized repeat-save drawback` | 1 | magic_item_robe_of_eyes |
| `triggered passive mechanics for magic items` | 1 | magic_item_robe_of_eyes |
| `triggered_optional_class_feature` | 1 | monk_disciplined_survivor_l14 |
| `triggered_save_on_creature_action_operation` | 1 | forcecage |
| `turn_renewal` | 1 | barbarian_rage |
| `turn_scheduled_effect_sequence` | 1 | storm_of_vengeance |
| `turn_start_repeating_save_gate` | 1 | tsunami |
| `unconditional_phase (ActivationPhase)` | 1 | plane_shift |
| `UseCountCap — ability_modifier_minimum variant` | 1 | monk_wholeness_of_body_l6 |
| `UseCountCap — unlimited` | 1 | rogue_fast_hands_l3 |
| `UseCountCap { kind: 'unlimited' }` | 1 | magic_item_ring_of_invisibility |
| `UseCountCap { kind: "ability_score_derived"; ability: Ability; minimum: number }` | 1 | ranger_tireless_l10 |
| `UseCountCap proficiency_bonus variant` | 1 | species_orc_adrenaline_rush |
| `UseCountCap: ability_modifier_derived` | 1 | warlock_dark_ones_own_luck_l6 |
| `UseCountCap: ability_score_derived` | 1 | bard_bardic_inspiration |
| `UseCountCap::unlimited` | 1 | barbarian_reckless_attack_l2 |
| `UseCountCap.proficiency_bonus` | 1 | species_goliath_giant_ancestry |
| `UseCountCap.random_initial_quantity` | 1 | magic_item_universal_solvent |
| `UseCountResource or new external_pool_resource` | 1 | monk_superior_defense_l18 |
| `UseCountResource: cross-feature resource reference (consumes Wild Shape use)` | 1 | druid_natures_sanctuary_l14 |
| `UseCountResource: dice-based recharge amount` | 1 | magic_item_cloak_of_invisibility |
| `UseCountResource: passive/unlimited` | 1 | wizard_sculpt_spells_l6 |
| `utilize_action_cost` | 1 | magic_item_lantern_of_revealing |
| `variable_bonus_split operation` | 1 | magic_item_defender |
| `vehicle_object_family` | 1 | magic_item_apparatus_of_the_crab |
| `visibility_filter on modify_roll_advantage and save_gate area` | 1 | magic_item_robe_of_scintillating_colors |
| `waive_concentration` | 1 | magic_item_crystal_ball_of_mind_reading |
| `waive_resource_cost` | 1 | sorcerer_arcane_apotheosis_l20 |
| `waive_spell_slot_cost (effect atom)` | 1 | magic_item_candle_of_invocation |
| `wake_sleep` | 1 | magic_item_weapon_of_warning |
| `weapon attachment variant` | 1 | magic_weapon |
| `weapon_attack_override` | 1 | shillelagh |
| `weapon_damage_type as a DamageType variant or special alias` | 1 | magic_item_giant_slayer |
| `weapon_damage_type_reference` | 1 | magic_item_vicious_weapon |
| `weapon_on_hit_bonus_damage_vs_creature_type` | 1 | magic_item_sun_blade |
| `weapon_type variable DamageType` | 1 | rogue_sneak_attack_l1 |
| `WeaponCategoryRestriction surface type` | 1 | barbarian_weapon_mastery_l1 |
| `web_immunity / traverse_difficult_terrain_as_normal (movement filter immunity)` | 1 | magic_item_cloak_of_arachnida |
| `world_state_control` | 1 | control_weather |
| `zone_object_creation` | 1 | prismatic_wall |

## Structural widenings (new payload families / subgraphs)

### animal_messenger

- **creature_compulsion (new payload family)** (new_subgraph) — The spell's core pattern is: save gate on a target creature → on fail, the creature is compelled to autonomously perform a multi-step task (travel to location + deliver message) for the spell's duration. No existing SpellMechanics family mo
- **command_creature (Effect union variant)** (new_variant) — The Effect union is {damage | none}. Compelling an existing wild creature to perform an autonomous task cannot be represented by either. v4 has 'command_companion' but that targets an already-bound companion; this spell compels an unbound w
- **Duration slot-scaling variant** (new_variant) — Duration.timed only holds a fixed DurationValue. Animal Messenger's duration scales with slot level: 24 hours base, +48 hours per slot above 2. There is no slot-scaled Duration shape in the surface types.
- **save_gate CR-conditional auto-succeed** (new_variant) — Creatures with CR > 0 automatically succeed on the saving throw; the save only matters for CR 0 beasts. This conditional bypass on a save gate has no surface representation. It is not the same as 'save DC that auto-fails or auto-succeeds' —

### animate_dead

- **companion_creation spell family** (new_subgraph) — Animate Dead creates one or more undead companions that persist independently for 24 hours under the caster's control. None of the four existing SpellMechanics families can honestly represent this shape: ongoing_effect requires concentratio
- **CompanionEffect in the Effect union** (new_variant) — The Effect type (DamageEffect | NoneEffect) has no variant for companion creation. Even if activation phases were extended, they cannot carry a create_companion result. A CompanionEffect variant (or a dedicated companion_creation family tha
- **control_duration in Duration or a new control_link surface type** (new_variant) — The spell's Duration is Instantaneous (the cast itself), but the control relationship lasts 24 hours and must be renewed. This is neither concentration nor a timed spell duration. A surface representation of the control_link lifetime (inclu
- **SlotScaling<number> for companion count** (new_variant) — Higher-level casting adds +2 creatures per slot above 3. The SlotScaling<T> type exists and is used for target counts (Bless), but there is no surface field on any SpellMechanics family that would hold a slot-scaled companion count. This wi

### antipathy_sympathy

- **proximity_triggered_enchantment family** (new_subgraph) — The spell plants a timed (10-day, non-concentration) effect on a target creature/object. Creatures of a caster-specified kind that enter within 120 ft must make a WIS saving throw. No existing family supports this: ongoing_effect only has r
- **AnchoredSignal: save_gate_with_condition** (new_variant) — Even if anchored_trigger were extended, AnchoredSignal only has audible/mental notification variants. Antipathy/Sympathy needs the release to fire a WIS save gate that applies Frightened or Charmed — a deterministic mechanical effect, not a
- **Condition: frightened, charmed** (new_variant) — The current Condition type is a single-member union: 'prone'. Antipathy applies Frightened; Sympathy applies Charmed. Both are standard SRD conditions with distinct behavioral rules. The closed Condition type must be widened to include at l
- **AnchoredFilter: creature_kind_specification** (new_variant) — The existing AnchoredFilter only models creature_exemption_list (creatures that will NOT trigger the effect). Antipathy/Sympathy uses the dual concept: specify what kind of creature IS affected. These are oppositely-scoped filters and canno
- **compelled_movement** (new_atom) — The conditions in this spell carry a mandatory movement compulsion: Frightened creatures must spend their movement fleeing; Charmed creatures must spend their movement approaching (and cannot willingly move away if within 5 ft). This is dis
- **distance_based_repeat_save escape** (new_subgraph) — The spell has a positional repeat-save mechanism: if the affected creature ends its turn more than 120 ft from the target, it makes a WIS save; on success the effect ends and the creature is immune for 1 minute. The v4 repeat_save atom exis
- **AnchorTarget: creature_or_object** (new_variant) — Current AnchorTarget covers location (door_or_window) and area (cube). Antipathy/Sympathy anchors to a specific creature or object (Huge or smaller). The anchor IS the repulsion/attraction locus — creatures measure their 120 ft proximity to

### arcane_eye

- **conjure_sensor (new spell family)** (new_subgraph) — Arcane Eye creates a persistent, movable conjured sensor object that continuously delivers sensory information to the caster. No existing spell family covers this pattern: ongoing_effect is for roll-modifying or damage-on-hit effects on cre
- **create_sensor_object — new OngoingOperation kind backed by v4 create_object + grant_sense** (new_variant) — OngoingOperation supports only roll_modifier and damage_on_hit. Neither represents 'conjure a persistent sensor object at a location that relays sensory information to the caster'. A new operation kind is needed; v4 already names create_obj
- **command_object — recurring Bonus Action cost to move the conjured object** (new_variant) — The caster spends a Bonus Action on each turn to move the eye up to 30 ft. No existing spell mechanics structure captures a recurring action-cost substructure for commanding a conjured object. Class features have activationCost but spell fa

### astral_projection

- **Duration.permanent** (new_variant) — Astral Projection has duration 'Permanent (ends on Dispel)'. The Duration union only covers instantaneous, concentration, and timed. A new variant { kind: 'permanent' } (or { kind: 'until_dispelled' }) is needed for this and similar indefin
- **project_astral_form** (new_atom) — The spell's primary effect splits each target into a body (left in suspended animation) and an astral form (on the Astral Plane). This is not transport_exile (which exiles an entity entirely) nor create_companion (which creates a separate N
- **entity_link** (new_atom) — The silver cord establishes a bi-directional death link between the astral form and the body: if the cord is cut, both die; if either reaches 0 HP, the spell ends for that target. This is a linked-entity lifecycle constraint with no analogu
- **inter_plane_reentry** (new_subgraph) — When an astral form leaves the Astral Plane, the body and possessions teleport along the silver cord to the new plane. This is a conditional plane-crossing that moves the physical body — not a spell effect firing on exit, but a structural r
- **Condition.unconscious** (new_variant) — The spell applies the Unconscious condition to each target's left-behind body. The Condition type is currently the literal 'prone' only. Unconscious is a standard SRD condition that will be needed for many other spells and effects.

### barbarian_ability_score_improvement_l4

- **passive_grant** (new_subgraph) — The Ability Score Improvement feature is a permanent, passive character-progression benefit with no activation cost, no use-count resource, and no rest-reset cadence. The only existing ClassFeatureMechanics family ('activation') requires al
- **grant_feat_choice** (new_atom) — No existing ClassFeatureEffect atom covers granting a feat selection. The feature's effect is permanently granting a feat (the ASI feat or another qualifying feat). This is distinct from grant_proficiency, grant_extra_action, heal_hp, or an

### barbarian_brutal_strike_l9

- **on_hit_trigger family for class_feature** (new_subgraph) — Brutal Strike fires on a weapon-attack hit (conditional on Reckless Attack), not as a discrete activated feature. The only ClassFeatureMechanics family is 'activation', which demands a use-count resource and an activationCost. Brutal Strike
- **optional or unlimited UseCountResource** (new_variant) — ClassFeatureMechanicsHeader unconditionally requires a 'resource: UseCountResource'. Brutal Strike has no per-rest cap — it is available on every eligible attack. The surface needs either an optional resource field or an 'unlimited' variant
- **force_move effect in ClassFeatureEffect** (new_variant) — Forceful Blow pushes the target 15 ft. The v4 atom 'force_move' exists in the taxonomy but is not a member of the ClassFeatureEffect union (only grant_extra_action and heal_hp are). The surface needs to admit force_move here.
- **modify_speed effect in ClassFeatureEffect** (new_variant) — Hamstring Blow reduces the target's Speed by 15 ft until start of next turn. The v4 atom 'modify_speed' exists but is not a member of ClassFeatureEffect.
- **damage (weapon-type) effect in ClassFeatureEffect** (new_variant) — Brutal Strike adds +1d10 damage of the same type as the weapon. The v4 'damage' atom exists, but ClassFeatureEffect has no damage variant. Encoding the extra-damage rider requires admitting a damage effect here.
- **choose_one_of effect composition** (new_variant) — Brutal Strike lets the barbarian pick exactly one of N effect options at resolution time (Forceful Blow or Hamstring Blow). The surface has no mechanism for 'choose one from a set of effects'. This is distinct from multi-phase sequences (wh
- **prerequisite_feature link (requires Reckless Attack)** (new_variant) — Brutal Strike is gated on using Reckless Attack this turn, creating a cross-feature dependency. The surface has no way to model 'this feature activates only when another named feature was also used this turn'.
- **self move without opportunity attacks post-hit rider** (new_variant) — Forceful Blow also grants the attacker movement (up to half Speed) toward the target without provoking Opportunity Attacks. This is an attacker-self movement effect triggered post-hit. The v4 atoms 'move' and 'deny_opportunity_attack' exist

### barbarian_danger_sense_l2

- **passive family for ClassFeatureMechanics** (new_subgraph) — Danger Sense is always-on with no activation cost, no resource, and no reset cadence. The only current ClassFeatureMechanics family is 'activation', which mandates all three. A 'passive' family is needed for features that apply continuously
- **modify_roll_advantage variant for ClassFeatureEffect** (new_variant) — The current ClassFeatureEffect union is GrantExtraActionEffect | HealHpEffect. Danger Sense requires a 'modify_roll_advantage' effect scoped to a specific ability's saving throws. The v4 atom 'modify_roll_advantage' exists in the taxonomy b
- **condition_suppressor on passive effects** (new_variant) — The advantage is suppressed when the creature has the Incapacitated condition. There is no surface type for condition-gated suppression of a passive effect. The v4 atom 'suppress' exists but no surface grammar for 'this effect is suppressed

### barbarian_epic_boon_l19

- **permanent_grant family for ClassFeatureMechanics** (new_subgraph) — Epic Boon is a one-time character-progression grant that happens at level-up. It is not activated, has no use-count resource, no rest-reset cadence, and no fixed-effect payload. The current ClassFeatureMechanics type only models the 'activa
- **grant_feat (ClassFeatureEffect variant)** (new_atom) — Even if a 'permanent_grant' family were added, the effect payload would need a 'grant_feat' atom to express 'player chooses one feat from a named category (Epic Boon feats) or any qualifying feat'. No such atom exists in v4 or in the curren

### barbarian_extra_attack_l5

- **passive_modifier (new ClassFeatureMechanics family)** (new_subgraph) — Extra Attack is an always-on rule change with no activation cost, no use-count resource, and no rest reset cadence. The sole existing ClassFeatureMechanics family ('activation') requires all three via ClassFeatureMechanicsHeader. Filling th
- **scale_attack_count (new ClassFeatureEffect variant)** (new_variant) — Extra Attack scales the number of attacks produced within a single Attack action, not the action economy. The existing grant_extra_action effect grants an additional Action (as Action Surge does). Using it here would falsely imply the barba

### barbarian_fast_movement_l5

- **passive_modifier** (new_subgraph) — Fast Movement is always-on with no activation cost, no use count, and no reset cadence. The only class-feature family is 'activation', which requires all three of those fields. A 'passive' family (or always_on family) is needed to encode fe
- **modify_speed effect in ClassFeatureEffect** (new_variant) — modify_speed exists as a v4 atom but is absent from the ClassFeatureEffect union (which only has GrantExtraActionEffect | HealHpEffect). A passive family would still need a modify_speed variant in ClassFeatureEffect to express the +10 ft sp
- **armor_condition predicate (conditional modifier)** (new_variant) — The bonus is conditional on not wearing Heavy armor. The surface has no mechanism to express a runtime predicate ('while condition X holds') on a passive effect. A conditional gate on passive modifiers — at minimum a closed enum of armor-ca

### barbarian_feral_instinct_l7

- **passive ClassFeatureMechanics family** (new_subgraph) — Feral Instinct is always-on with no activation cost, no use-count resource, and no rest reset. The only existing ClassFeatureMechanics family is 'activation', which requires all three header fields (activationCost, resource, resetCadence).
- **"initiative" in RollKind** (new_variant) — RollKind is currently 'attack_roll' | 'saving_throw'. Initiative is a Dexterity check used at combat start — neither an attack roll nor a saving throw. Encoding advantage on initiative requires extending RollKind (or a parallel InitiativeKi

### barbarian_improved_brutal_strike_l17

- **passive_upgrade family for ClassFeatureMechanics** (new_subgraph) — Improved Brutal Strike (L17) is a passive, always-on enhancement of an existing feature. It has no activation cost, no use-count resource, and no reset cadence. The only current ClassFeatureMechanics family is 'activation', which requires a
- **cross_feature_reference attachment or effect target** (new_variant) — Both sub-effects of this feature operate on parameters of barbarian_brutal_strike_l9, not on a creature or area. The surface has no mechanism to point an effect at another named feature record as its scope. A cross-feature reference (target
- **multi_effect_selection — select N from a named effect list** (new_variant) — The second component grants the ability to select *two* Brutal Strike effects simultaneously instead of one. The existing surface has no concept of 'effect multiplicity count' or 'choose N from a feature's effect menu'. This is distinct fro
- **scale_feature_parameter — upgrade a named damage expression on a sibling feature** (new_variant) — The damage increase ('increases to 2d10') does not describe a self-contained DiceAmount; it is a write to a specific parameter slot of an already-authored feature. The existing scale_* atoms (scale_die_count, scale_numeric_bonus, etc.) all

### barbarian_indomitable_might_l18

- **passive_class_feature family** (new_subgraph) — Indomitable Might is permanently active with no activation cost, no use count, and no rest reset. The only current ClassFeatureMechanics family is 'activation', which structurally requires activationCost + UseCountResource + resetCadence. A
- **ability_score_floor effect on roll totals** (new_variant) — The mechanic replaces the roll total with the creature's Strength score when the total falls below that score — a conditional minimum/floor keyed to an ability score value. No existing ClassFeatureEffect variant (grant_extra_action, heal_hp

### barbarian_instinctive_pounce_l7

- **activation_rider** (new_subgraph) — Instinctive Pounce fires 'as part of the Bonus Action you take to enter your Rage' — it has no independent activation cost, no use count, and no reset cadence. The current surface only models class features as independently activated units
- **move effect in ClassFeatureEffect** (new_variant) — The effect 'move up to half your Speed' is a move effect. ClassFeatureEffect currently only covers grant_extra_action and heal_hp. A move variant (or fractional-speed move variant) is needed to express this mechanically.

### barbarian_primal_champion_l20

- **passive_class_feature family** (new_subgraph) — Primal Champion grants a permanent ability-score increase at level-up with no activation, no resource, no reset cadence, and no use count. The only existing ClassFeatureMechanics family is 'activation', which mandates activationCost + resou
- **modify_ability_score** (new_atom) — The sole mechanical content of Primal Champion is a permanent +4 to STR and CON with a hard cap of 25. No existing ClassFeatureEffect covers this: grant_extra_action and heal_hp are both wrong. The v4 taxonomy lists 'modify_ability_score as

### barbarian_relentless_rage_l11

- **passive_trigger (class feature family)** (new_subgraph) — Relentless Rage fires automatically when a specific game-state condition is met (drop to 0 HP while Rage is active). This is not a player-initiated activation — there is no activationCost of free or bonus_action. The existing 'activation' f
- **escalating_save_dc (resource type)** (new_variant) — The DC starts at 10 and increases by 5 per use within a rest period, then resets on Short or Long Rest. This is not a use-count cap — it is a mutable save DC tracked per rest. UseCountResource and UseCountCap have no representation for this
- **set_hp (effect atom)** (new_atom) — The on-success outcome sets HP to a specific derived value (2 × Barbarian level). This is distinct from heal_hp which adds HP to the current total. A set_hp effect atom is needed to model HP-floor or HP-set operations.
- **trigger_condition (class-feature trigger shape)** (new_variant) — The trigger is conditioned on two simultaneous facts: HP dropped to 0, AND Rage is active. The surface has no type for compound state-condition triggers on class features.

### barbarian_unarmored_defense_l1

- **passive_class_feature family** (new_subgraph) — Unarmored Defense is always-on while conditions hold (no armor worn). It has no activation cost, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which structurally requires all three via C
- **set_ac_formula (ClassFeatureEffect variant)** (new_variant) — The effect replaces the base AC formula with 10 + DEX mod + CON mod. This is not representable as modify_ac (which takes a fixed numeric delta in the current ReactionEffect shape), not heal_hp, and not grant_extra_action. A new ClassFeature
- **equipment_guard (passive condition predicate)** (new_variant) — The passive applies only when no armor is worn. This requires a closed predicate grammar for 'not wearing armor type X' that gates a passive effect. The current surface has no guard/condition vocabulary for passive features — only the impli

### barbarian_weapon_mastery_l1

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Weapon Mastery is not activated — it is a passive, always-on grant of the ability to use mastery properties. The current ClassFeatureMechanics has only the 'activation' family, whose header (activationCost / resource / resetCadence) is cate
- **grant_mastery_access ClassFeatureEffect variant** (new_variant) — The effect is granting the ability to use mastery properties for a player-chosen set of weapon types. This is neither grant_extra_action nor heal_hp. A new ClassFeatureEffect variant is needed — grant_mastery_access — capturing: (a) count o
- **WeaponCategoryRestriction surface type** (new_variant) — The grant restricts eligible weapons to 'Simple or Martial Melee weapons.' The current type system has no weapon-category filter. A closed type encoding weapon kind (simple | martial) and attack mode (melee | ranged) is needed to make valid
- **Threshold-tiers count scaling in grant_mastery_access** (new_variant) — The number of mastery-accessible weapon types scales with barbarian level according to the Barbarian Features table (2 at L1, growing at higher levels). The existing ThresholdTiers<number> shape can represent this, but it must be wired into

### bard_ability_score_improvement_l4

- **level_grant family for ClassFeatureMechanics** (new_subgraph) — ASI is not an activated ability. It has no activation cost, no use-count resource, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires all three. A new family (e.g. 'level_grant' or 'passive_
- **grant_feat_choice** (new_atom) — The mechanic grants a feat from the open feat catalog (specifically the ASI feat, or any qualifying feat). No existing ClassFeatureEffect covers an open-ended feat menu. The closest v4 atoms (grant_proficiency, grant_spell_access) are more

### bard_bonus_proficiencies_l3

- **passive_grant (class feature family)** (new_subgraph) — Bonus Proficiencies is a permanent passive grant conferred at level-up. It has no activation cost, no use-count resource, and no reset cadence. The only existing class-feature family ('activation') requires all three of those fields, making
- **grant_proficiency in ClassFeatureEffect** (new_variant) — Even if a passive_grant family were added, the ClassFeatureEffect union (GrantExtraActionEffect | HealHpEffect) does not include proficiency granting. The v4 atom 'grant_proficiency' exists in the taxonomy but has no corresponding surface t

### bard_countercharm_l7

- **triggered_reaction (class_feature family)** (new_subgraph) — Countercharm fires on an external event (creature in range fails a save against charm/fear) and costs a Reaction. ClassFeatureMechanics has no triggered_reaction family — only activation. The spell surface has TriggeredReactionMechanics but
- **ClassFeatureActivationCost: reaction** (new_variant) — Even if the triggered_reaction family were added, the activation cost union needs a 'reaction' variant. Currently ClassFeatureActivationCost only supports 'free' and 'bonus_action'.
- **ClassFeatureEffect: reroll_save_with_advantage** (new_variant) — The effect is 'cause the save to be rerolled, and the new roll has Advantage'. This combines modify_roll_reroll and modify_roll_advantage (both v4 atoms) but neither appears in ClassFeatureEffect, which only has grant_extra_action and heal_
- **Trigger condition: save_failure_against_condition_type (with range filter)** (new_variant) — The trigger is 'fails a saving throw against an effect that applies the Charmed or Frightened condition' — a save-failure event filtered by the condition type the effect applies, scoped to creatures within 30 feet. No trigger grammar exists

### bard_epic_boon_l19

- **passive_grant** (new_subgraph) — Epic Boon is a permanent, passive level-up grant — not an activated feature. It has no use_count, no reset cadence, no activation cost. The existing 'activation' family mandates all three via ClassFeatureMechanicsHeader. A new family (e.g.
- **grant_feat** (new_atom) — The effect is granting access to an entire feat unit record — not a narrowly scoped runtime effect. No v4 effect atom covers this. grant_proficiency and grant_spell_access are the closest analogues, but a feat grant enables a full separate

### bard_font_of_inspiration_l5

- **multi_mechanic_class_feature** (new_subgraph) — Font of Inspiration has two independent sub-mechanics: (1) a passive reset-cadence upgrade for Bardic Inspiration (not an activation at all), and (2) a spell-slot-cost recovery activation. The current ClassFeatureMechanics = ClassFeatureAct
- **ClassFeatureActivationCost: spell_slot** (new_variant) — The spell-slot recovery sub-mechanic is triggered by spending a spell slot with no action required. ClassFeatureActivationCost only supports 'free' and 'bonus_action'. A new variant is needed to represent spell-slot expenditure as an activa
- **ClassFeatureEffect: recover_resource_use** (new_variant) — The effect of the spell-slot sub-mechanic is regaining 1 expended use of a named resource (Bardic Inspiration). ClassFeatureEffect only contains GrantExtraActionEffect and HealHpEffect — neither can represent refilling a use_count resource.
- **ClassFeatureEffect: upgrade_reset_cadence (or new family: passive_modifier)** (new_variant) — The first sub-mechanic passively changes the reset cadence of Bardic Inspiration from long-rest-only to short-or-long-rest. This is not an activation — it is a persistent rule modification on another feature's resource. The current surface

### bard_superior_inspiration_l18

- **passive_initiative_trigger family for ClassFeatureMechanics** (new_subgraph) — The feature fires automatically when the bard rolls Initiative — not on player activation. The existing ClassFeatureMechanics only has the 'activation' family, which models player-initiated use of a feature with an explicit cost. There is n
- **refill_resource_to_floor (new ClassFeatureEffect variant)** (new_atom) — The effect is not grant_extra_action or heal_hp — it sets the bard's Bardic Inspiration use count to at least N (floor=2) if currently below that floor. This is a conditional partial-refill of a named external resource, not a self-heal or e

### bard_words_of_creation_l20

- **passive_class_feature family** (new_subgraph) — Words of Creation is a permanent passive modifier. The existing ClassFeatureMechanics only covers 'activation' family (requires use_count, activationCost, resetCadence). None of those fields apply: there is no activation, no use count, and
- **grant_spell_access variant of ClassFeatureEffect** (new_variant) — The feature grants always-prepared access to two named spells. The v4 taxonomy has a grant_spell_access atom, but ClassFeatureEffect union only contains GrantExtraActionEffect | HealHpEffect. A new variant is needed, e.g. { kind: 'grant_spe
- **modify_named_spell_targeting (secondary adjacent target)** (new_atom) — The feature allows optionally targeting a second creature within 10 feet of the first when casting the two named spells. This is a class-feature-granted modification of specific spells' cast-time target selection — not slot-level scaling, n

### blade_barrier

- **hazard_zone** (new_subgraph) — Blade Barrier creates a persistent area that fires a DEX save gate every time any creature enters the zone or ends its turn there, for the full concentration duration. No existing family models repeated-event-triggered save gates over a dur
- **AreaShapeDescriptor — wall (straight and ring)** (new_variant) — Blade Barrier creates a wall: either straight (length × height × thickness) or ringed (diameter × height × thickness). Neither is representable with existing AreaShapeDescriptor variants. 'line' is 2D with no height field. A wall is a verti
- **difficult_terrain** (new_atom) — Blade Barrier makes its space Difficult Terrain for the concentration duration. No current EffectAtom covers terrain modification. TAXONOMY_atoms_graph.md §12 notes 'difficult_terrain (2 hits)' as survey pressure not yet promoted to v4.
- **grant_cover** (new_atom) — The wall grants Three-Quarters Cover, which modifies incoming attack rolls and DEX saves for creatures behind it. Cover as a mechanically modeled effect is absent from v4 EffectAtom.

### call_lightning

- **persistent_activation** (new_subgraph) — Call Lightning casts once (concentration, up to 10 min) and grants a repeatable Magic-action-costed activation each turn that fires a save_gate → area damage. No existing family (ongoing_effect, activation, triggered_reaction, anchored_trig
- **save_gate_ongoing_operation** (new_variant) — The recurring lightning strike resolves through a DEX save_gate → area damage. The current OngoingOperation union only allows roll_modifier and damage_on_hit (attack-roll-keyed riders). There is no variant for a save-gated damage operation
- **conditional_damage_bonus** (new_variant) — The outdoor-storm +1d10 is a runtime context predicate (caster is outdoors in a pre-existing storm). This is neither slot-scaling nor level-scaling; it is a conditional bonus with no parallel in the current DiceAmount or scaling vocabulary.

### cleric_ability_score_improvement_l4

- **passive_advancement** (new_subgraph) — ASI is not an activation — it has no activationCost, no use_count resource, and no reset cadence. It is permanently granted at a specific class level. The current ClassFeatureMechanics surface only has an 'activation' family, which requires
- **grant_feat** (new_atom) — The effect of ASI is granting a feat choice (specifically Ability Score Improvement or any qualifying feat). No existing ClassFeatureEffect variant covers this. The available effects are GrantExtraActionEffect and HealHpEffect. A new effect

### cleric_blessed_healer_l6

- **spell_cast_trigger family for class features** (new_subgraph) — Blessed Healer is a passive, unlimited rider that fires automatically after a qualifying spell cast. It has no activation cost, no use-count resource, and no reset cadence. The existing 'activation' family mandates UseCountResource + RestRe
- **spell_cast_trigger condition: heal_targets_other_than_self** (new_variant) — The trigger predicate filters on: (a) spell uses a spell slot, (b) spell restores HP, (c) at least one target is not the caster. None of the existing window/attachment grammar expresses this compound condition on the casting event itself.
- **heal amount: flat formula 2 + slot_level** (new_variant) — The heal amount is purely flat and scales with the slot level used for the triggering cast, not with class level or character level. DiceAmount's linear_per_level with axis=slot could approximate this (base={dice:0,dieSize:1,flat:2}, perLev

### cleric_blessed_strikes_l7

- **choose_one_of** (new_subgraph) — Blessed Strikes presents two mutually exclusive mechanical options; the player picks one permanently. No ClassFeatureMechanics family represents a 'choose one alternative' structure. The single activation family encodes exactly one effect,
- **damage_on_hit_rider (ClassFeatureEffect)** (new_variant) — Divine Strike adds extra damage on a weapon hit, once per turn. ClassFeatureEffect only contains grant_extra_action and heal_hp. The on_hit_trigger family exists only in MasteryMechanics. A class feature that grants a per-turn on-hit damage
- **player_choice_damage_type** (new_variant) — Divine Strike lets the player choose Necrotic or Radiant at the moment of the hit. DamageType is a single closed string; there is no 'one of [type_a, type_b] chosen at activation' variant. This is distinct from a fixed type.
- **add_ability_mod_to_damage** (new_atom) — Potent Spellcasting adds the caster's Wisdom modifier (an ability score) to the damage dealt by cantrips. No v4 atom models this. modify_roll_numeric covers roll bonuses (Bless, Bane). scale_numeric_bonus covers level-scaled flat bonuses. N

### cleric_channel_divinity

- **choose_effect_dispatch** (new_subgraph) — Channel Divinity is a use-count pool whose activation lets the player choose one of several registered sub-effects. No existing ClassFeatureMechanics family supports a 'choose one from list' dispatcher — the 'activation' family has a single
- **ClassFeatureActivationCost: action** (new_variant) — Both Divine Spark and Turn Undead cost a Magic action (one of the 12 standard action kinds). ClassFeatureActivationCost only models 'free' and 'bonus_action' — no 'action' variant exists.
- **ClassFeatureEffect: damage (with save_gate)** (new_variant) — Divine Spark's damage branch requires a Constitution saving throw followed by full or half Necrotic/Radiant damage. ClassFeatureEffect has only GrantExtraActionEffect and HealHpEffect — no damage variant and no save_gate resolution.
- **ClassFeatureEffect: player_choice branch (heal vs. damage)** (new_variant) — Divine Spark offers a runtime player-choice between healing and damage at activation. This is not a save branch (caster decides, not a roll outcome). There is no 'player_choice' discriminant anywhere in the ClassFeature family.
- **ClassFeatureEffect: apply_conditions (area, multi-condition)** (new_variant) — Turn Undead applies Frightened + Incapacitated simultaneously to all chosen Undead that fail a Wisdom save within a 30 ft area. ClassFeatureEffect has no condition application, no area scoping, and the Condition type only includes 'prone'.
- **Condition: frightened, incapacitated** (new_variant) — Turn Undead applies two conditions absent from the current Condition type, which only includes 'prone'.
- **ClassFeatureMechanics: area attachment / multi-target** (new_variant) — Turn Undead targets all chosen Undead within 30 ft of the caster. ClassFeatureActivationMechanics has no attachment or target-scope field; it only carries a single ClassFeatureEffect with a fixed 'self' or 'target_creature' field.
- **class_feature timed duration with complex break conditions** (new_subgraph) — Turn Undead's effect lasts 1 minute and ends early on three distinct conditions (creature takes damage; caster has Incapacitated; caster dies). ClassFeatureMechanics has no duration or early-break model.

### cleric_channel_divinity_l2

- **menu_activation** (new_subgraph) — Channel Divinity is a use-count pool that, on activation, dispatches to one of N named sub-effects chosen by the player. ClassFeatureActivationMechanics has a singular `effect` field; it cannot represent a choosable menu without fabricating
- **ClassFeatureActivationCost: action / magic_action** (new_variant) — Both Divine Spark and Turn Undead cost a Magic action. ClassFeatureActivationCost only has `free` and `bonus_action`. A Magic action consumes the character's Action quota and is the specific `magic` StandardActionKind — distinct from both f
- **DiceExpr: ability_modifier addend** (new_variant) — Divine Spark's heal/damage amount is 1d8 + Wisdom modifier, where the Wis modifier is a runtime value derived from the character sheet. DiceExpr.flat is a fixed integer with no way to express 'add an ability score modifier'.
- **ClassFeatureEffect: player_choice_fork (heal or save_gate_damage)** (new_variant) — Divine Spark lets the cleric choose at activation time between healing the target or forcing a CON save for damage. This is a deterministic caster election (not a resolution branch). No ClassFeatureEffect variant models a player-directed fo
- **ClassFeatureEffect: apply_condition (multi-condition, timed, early-expiry)** (new_variant) — Turn Undead applies Frightened and Incapacitated simultaneously for up to 1 minute, with three early-expiry conditions. ClassFeatureEffect only has GrantExtraActionEffect and HealHpEffect; neither covers condition application.
- **Condition: frightened, incapacitated (and others beyond prone)** (new_variant) — The Condition type is a closed enum containing only `prone`. Turn Undead requires `frightened` and `incapacitated`. Widening Condition is a prerequisite for any apply_condition effect variant.

### cleric_cleric_subclass_l3

- **subclass_selection** (new_subgraph) — The unit's sole mechanic is a permanent character-progression gate: at level 3, the player chooses a subclass. The existing ClassFeatureMechanics has only one family, 'activation', which requires activationCost + resource (use_count) + rese

### cleric_disciple_of_life_l3

- **passive_trigger family for ClassFeatureMechanics** (new_subgraph) — Disciple of Life is always-on: it fires automatically whenever the cleric casts a healing spell with a spell slot. It has no activation cost, no use-count resource, and no reset cadence. The only existing ClassFeatureMechanics family is 'ac
- **augment_spell_heal effect type** (new_variant) — The feature adds a flat HP bonus (2 + slot_level) to healing done by any spell the cleric casts with a spell slot. This is not modeled by HealHpEffect (which makes the feature itself the source of healing, like Second Wind or Divine Spark)

### cleric_divine_order_l1

- **passive_grant** (new_subgraph) — Divine Order grants permanent proficiencies / access at character creation — no activation cost, no use-count resource, no rest reset. The only existing ClassFeatureMechanics family is 'activation', which requires all three. A 'passive_gran
- **choose_one_package** (new_subgraph) — The feature requires the player to pick one of two named option sets (Protector vs Thaumaturge) at character creation. No choose/branch mechanic exists in any ClassFeatureMechanics family. The v4 taxonomy includes a 'choose' procedure atom
- **grant_proficiency effect in ClassFeatureEffect** (new_variant) — The v4 atom 'grant_proficiency' exists in the taxonomy but is absent from the ClassFeatureEffect union. Protector's weapon + armor grants require it. Even if a passive_grant family were added, this effect variant would still need to be surf
- **grant_spell_access effect in ClassFeatureEffect** (new_variant) — The v4 atom 'grant_spell_access' exists in the taxonomy but is absent from ClassFeatureEffect. Thaumaturge's extra cantrip grant requires it.
- **ability_check_modifier effect in ClassFeatureEffect** (new_variant) — Thaumaturge grants a bonus to Intelligence (Arcana or Religion) checks equal to Wisdom modifier (min +1). This is a roll modifier on ability checks, not saving throws or attack rolls. The v4 atom 'modify_roll_numeric' exists but only covers

### cleric_epic_boon_l19

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Epic Boon is a permanent level-up reward with no activation, no resource pool, and no reset cadence. The sole existing ClassFeatureMechanics family ('activation') requires all three of activationCost + resource + resetCadence. None apply he
- **grant_feat** (new_atom) — The sole effect of Epic Boon is acquiring a feat permanently. No ClassFeatureEffect variant covers this: grant_extra_action is a per-turn combat action grant; heal_hp is HP restoration. The v4 atom inventory has grant_proficiency and grant_

### cleric_greater_divine_intervention_l20

- **feature_upgrade** (new_subgraph) — Greater Divine Intervention does not activate independently. It augments the option set of Divine Intervention (cleric L10): when the player uses that feature, they may now additionally choose Wish. No ClassFeatureMechanics family models 'c
- **RestResetCadence: rolled_long_rests** (new_variant) — The penalty reset cadence when Wish is chosen is '2d4 Long Rests' — a dice-rolled count of long rests, not a fixed number and not any existing cadence variant. RestResetCadence is a closed union of fixed rest categories with no slot for a D
- **ClassFeatureEffect: grant_spell_access** (new_variant) — The new capability is access to the Wish spell via the Divine Intervention invocation path. ClassFeatureEffect only contains grant_extra_action and heal_hp. The v4 atom grant_spell_access exists in the taxonomy but has no corresponding surf

### cleric_improved_blessed_strikes_l14

- **passive_on_hit_rider (ClassFeatureMechanics family)** (new_subgraph) — Divine Strike branch is a passive always-on weapon-hit damage rider. ClassFeatureMechanics only has 'activation' family which requires activationCost + resource + resetCadence + effect. A passive on-hit rider has none of these — it fires au
- **cantrip_damage_trigger (ClassFeatureMechanics family)** (new_subgraph) — Potent Spellcasting branch fires an optional rider when the cleric casts a Cleric cantrip and deals damage. No existing family covers a spell-cast-triggered optional effect with no activation cost or resource. It is not a player-initiated a
- **grant_temp_hp (ClassFeatureEffect variant)** (new_variant) — Potent Spellcasting grants Temporary Hit Points, not regular HP healing. Temporary HP is mechanically distinct — it forms a separate buffer, does not stack with other temp HP, and is not equivalent to healing. The existing heal_hp effect co
- **ability_modifier_times (DiceAmount variant)** (new_variant) — The Temp HP amount is '2 × Wisdom modifier' — a scalar multiple of an ability score modifier. DiceAmount supports fixed dice, threshold tiers, and linear-per-level, but cannot express derived-from-ability-score amounts. A new variant such a
- **branch_choice upgrade meta-structure** (new_subgraph) — Improved Blessed Strikes upgrades whichever of the two Blessed Strikes options the cleric selected at L7. The surface has no way to represent a feature that upgrades one of N prior choices. This is a branch-choice structure at the ClassFeat

### cleric_sear_undead_l5

- **on_feature_trigger class-feature mechanics family** (new_subgraph) — Sear Undead is not independently activated — it fires automatically whenever Turn Undead is used. No existing ClassFeatureMechanics family represents a passive save-gate rider on another feature's resolution. The only family is 'activation'
- **ability_modifier variant of LevelAxis** (new_variant) — The die count scales with the caster's Wisdom modifier, not any level axis. LevelAxis currently covers character, class, slot, subclass, proficiency_bonus — none of which model ability-score-derived scaling. A new axis variant (e.g., abilit
- **damage variant of ClassFeatureEffect** (new_variant) — ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect. Sear Undead's payload is Radiant damage. A DamageEffect variant (matching the spell-surface DamageEffect shape: damageType + DiceAmount) is needed for class feature effects.

### conjure_animals

- **conjure_companion family** (new_subgraph) — Conjure Animals creates a persistent, mobile companion entity with its own spatial position. No existing spell family (ongoing_effect, activation, triggered_reaction, anchored_trigger) can honestly encode a spell that: (a) creates a compani
- **proximity_window** (new_atom) — The pack triggers a save gate 'whenever the pack moves within 10 feet of a creature' or 'whenever a creature enters a space within 10 feet of the pack or ends its turn there.' This is a proximity-to-companion zone trigger. It is distinct fr
- **proximity-conditioned passive rider on caster** (new_variant) — The caster gains Advantage on Strength saving throws while within 5 feet of the pack. This is an ongoing passive effect on the caster conditioned on runtime spatial proximity to the companion — not encodable as a roll_modifier on the compan

### conjure_celestial

- **moveable_area_dual_effect** (new_subgraph) — Conjure Celestial creates a cylinder that (a) can be repositioned up to 30 ft per turn when the caster moves, and (b) applies a caster-chosen effect (heal or damage) to each creature it touches. No existing spell family supports a moveable
- **heal in spell Effect union** (new_variant) — Spell Effect = DamageEffect | NoneEffect. Healing Light restores HP equal to 4d12 + spellcasting modifier. There is no HealEffect in the spell Effect type (heal_hp exists only in ClassFeatureEffect). This must be added before any area-heal
- **cylinder area shape** (new_variant) — The current Attachment area shape only models sphere (radiusFeet). Conjure Celestial uses a cylinder (10-ft radius, 40-ft high), which is geometrically distinct and cannot be approximated as a sphere without misrepresenting the rule.
- **area_enter_or_end_turn window** (new_variant) — The spell fires when the cylinder moves into a creature's space, when a creature enters the cylinder, or when a creature ends its turn in the cylinder. post_action_window approximates 'after a creature acts' but does not cleanly express ent
- **moveable attachment** (new_variant) — No Attachment shape supports repositioning. The cylinder can be moved up to 30 ft per turn as part of the caster's movement. This is structurally distinct from a static area attachment and requires a new attachment modifier or family.

### conjure_elemental

- **conjured_spirit_zone** (new_subgraph) — The spell places a persistent entity (spirit) at a location that independently opens save-gate windows when creatures enter or start turns nearby. No existing family models a concentration-duration, location-bound entity that acts as an aut
- **Condition: "restrained"** (new_variant) — The Condition type is closed at 'prone'. Conjure Elemental applies the Restrained condition, which is mechanically distinct from Prone and required for the repeat-save guard ('if the spirit has no creature Restrained').
- **Effect: apply_condition** (new_variant) — The Effect union is DamageEffect | NoneEffect. Conjure Elemental's on-fail branch applies a condition (Restrained) in addition to dealing damage. apply_condition is in the v4 atom inventory but not surfaced in the Effect union.
- **Effect: remove_condition** (new_variant) — The on-success branch of the repeat save removes the Restrained condition. remove_condition is in the v4 atom inventory but not in the Effect union.
- **ActivationPhase: repeat_save** (new_variant) — The Restrained target repeats the DEX save at the start of each of its turns — a repeat_save phase. This resolution atom is in v4 but has no corresponding ActivationPhase variant in types.ts. The existing phase variants are attack_roll and
- **trigger guard: condition_occupancy_check** (new_variant) — The save is only available when the spirit currently has zero Restrained creatures. This is a conditional trigger guard keyed on runtime condition state of attached targets. No existing surface shape models a trigger that is gated on whethe

### conjure_fey

- **proxy_conjure family** (new_subgraph) — Conjure Fey conjures a persistent proxy entity, allows an optional melee spell attack on cast from the proxy's position, and then allows a Bonus Action on each subsequent turn to teleport the proxy and repeat the attack. No existing SpellMe
- **apply_condition variant in Effect** (new_variant) — The on-hit effect applies Frightened directly (no save gate). The Effect type only has 'damage' and 'none'. There is no 'apply_condition' variant in Effect. The apply_condition atom exists in v4 and in MasteryEffect (via SaveGateRiderResult
- **frightened in Condition** (new_variant) — The Condition type currently only contains 'prone'. Conjure Fey unconditionally applies Frightened on hit, requiring Frightened to be added to the closed Condition enum.
- **ability_modifier flat in DiceExpr** (new_variant) — The damage is '3d12 plus your spellcasting ability modifier'. DiceExpr.flat is typed as number (a static integer). The caster's spellcasting ability modifier is a runtime-resolved character-sheet value, not a fixed number. A new flat source

### contingency

- **AnchorTarget { kind: "self" }** (new_variant) — Contingency's anchor is the caster themselves, not a location or area. AnchorTarget currently only has 'location' and 'area' variants.
- **AnchoredEvent { kind: "player_described_condition"; description: string }** (new_variant) — Contingency's trigger is an arbitrary free-form condition described by the player at cast time. The current AnchoredEvent closed enum (physical_contact, enters_area) cannot represent open-ended trigger conditions. This is a genuine structur
- **AnchoredSignal { kind: "stored_spell_release" }** (new_variant) — The signal emitted when the trigger fires is 'release the stored contingent spell on the caster'. AnchoredSignal only has 'audible' and 'mental'. The stored spell is the payload, not a notification signal.
- **stored_spell_reference — cast-time constrained spell capture** (new_subgraph) — Contingency captures a second spell at cast time (constrained to: level ≤5, action casting time, self-targetable). This spell's full payload is held and released on trigger. No existing surface type represents a 'choose a spell at cast time
- **dual_slot_cast — simultaneous dual spell-slot consumption** (new_subgraph) — Casting Contingency expends two spell slots simultaneously: one L6 slot for Contingency and one L1–5 slot for the contingent spell. The current surface models a single spell_slot resource per cast. No multi-slot consumption pattern exists.

### control_water

- **multi_mode_ongoing_effect** (new_subgraph) — Control Water grants the caster a choice among four mechanically distinct ongoing modes at cast time, re-selectable by spending a Magic action on subsequent turns. No existing family models 'choose one of N functionally distinct ongoing mod
- **OngoingOperation.save_gate** (new_variant) — The Whirlpool mode deals 2d8 bludgeoning damage via a Strength saving throw when a creature enters or ends its turn in the whirlpool. This is a save_gate embedded in an ongoing effect (fires on creature's turn, not just on cast). OngoingOpe
- **OngoingOperation.force_move_aura** (new_variant) — The Whirlpool mode pulls creatures 10 ft toward the whirlpool center each turn. This is a recurring area-pull (force_move) embedded in an ongoing effect. force_move exists in v4 but is not exposed in any OngoingOperation surface variant.
- **alter_terrain** (new_atom) — Flood (raise water level 20 ft, create traveling wave), Part Water (create trench + wall), and Redirect Flow (change water flow direction) are all environmental terrain-manipulation effects. The v4 taxonomy has block_travel and create_objec
- **Resolution.probability_gate** (new_variant) — The Flood mode's wave has a 25% chance of capsizing Huge or smaller vehicles. This is a raw probability gate (not a saving throw, not an ability check) — a direct random outcome with no ability-score anchor. The current resolution atoms (at
- **Resolution.ability_check_escape** (new_variant) — Escaping the Whirlpool requires the creature to spend an action + succeed on a Strength (Athletics) check against the caster's spell save DC. This is an ability_check embedded as an escape condition in an ongoing area effect. The ability_ch

### control_weather

- **world_state_control** (new_subgraph) — Control Weather's core mechanic is a staged world-state mutation: the caster shifts one of three weather axes (precipitation, temperature, wind) by ±1 on a DM-initialized discrete table, repeatably during concentration. No existing spell fa
- **Range — self_radius_miles** (new_variant) — The spell's affected area is a 5-mile radius sphere centered on the caster. The existing Range union supports self (no extent), touch, and point (feet to target). A self-centered large-radius variant is needed — the sphere is fixed around t
- **CastConstraint / cast_condition** (new_variant) — The spell requires the caster to be outdoors at cast time and terminates early if the caster goes indoors. No surface type models preconditions on the physical environment required for casting, or location-based early termination of a conce
- **TransitionDelay** (new_variant) — After the caster changes weather conditions, 1d4×10 minutes must pass before the new conditions take effect. No surface type models a random delay between a caster's in-spell action and its effect manifesting in the world. This is mechanica
- **modify_world_state** (new_atom) — The spell's entire effect output is shifting the stage of a discrete environmental variable (weather axis) within a large area. All v4 effect atoms target creatures, rolls, movement, or named effects on creatures/objects. No atom covers mut

### create_undead

- **companion_creation_spell_family** (new_subgraph) — Create Undead is instantaneous but its purpose is producing persistent autonomous companions. No existing spell family captures this: activation requires attack_roll/save_gate phases with damage/none effects; ongoing_effect requires concent
- **companion_creation_effect** (new_variant) — The Effect type (DamageEffect | NoneEffect) has no variant for creating a companion creature. The v4 atom 'create_companion' exists in the taxonomy but has no surface expression in any spell Effect type.
- **companion_command_operation** (new_variant) — The ongoing Bonus Action command loop — mentally directing animated creatures each turn within 120 ft — is a persistent per-turn operation not captured by OngoingOperation (roll_modifier | damage_on_hit). The v4 atom 'command_companion' exi
- **control_duration_with_recast_maintenance** (new_variant) — The 24-hour control window that expires unless the caster recasts the spell on the same creature is a novel lifecycle pattern. The existing lifecycle atoms (concentrate, persist, expire, dismiss) don't capture 'expires unless refreshed by r
- **time_of_day_precondition** (new_variant) — The night-only casting restriction ('You can cast this spell only at night') is a precondition on the cast itself that has no surface representation. No existing CastingTime variant or surface type captures a time-of-day gate.
- **slot_scaled_creature_type_substitution** (new_variant) — Higher-level upcasting for Create Undead does not just scale a count — it substitutes creature types at different slot thresholds (Slot 8: 5 Ghouls OR 2 Ghasts/Wights; Slot 9: 6 Ghouls OR 3 Ghasts/Wights OR 2 Mummies). Existing SlotScaling<

### delayed_blast_fireball

- **AnchoredSignal — damage_area** (new_variant) — The bead's explosion produces a Dex save against fire damage in a 20-ft sphere. AnchoredSignal only supports audible/mental notification signals. The tracer's traceAnchoredTrigger folds signal content into a label string rather than wiring
- **DiceAmount — accumulating_per_event** (new_variant) — The spell's damage starts at 12d6 and grows by 1d6 each time the caster's turn ends without the spell ending. This is runtime state accumulation driven by a recurring in-combat event, not level-based scaling. None of the five LevelAxis valu
- **anchored_trigger — touch/reposition composite event** (new_subgraph) — A creature physically touching the bead triggers a save gate (not a simple AnchoredEvent). The two branches are mechanically distinct: (fail) immediately terminate concentration and detonate, (success) the creature may throw the bead up to
- **AnchoredEvent — spell_expires / concentration_ends** (new_variant) — The primary detonation trigger is 'when the spell ends' — either concentration breaks or the 1-minute duration elapses. This maps to the lifecycle atom expire, but is not modeled as an AnchoredEvent kind. The existing kinds (physical_contac

### demiplane

- **space_creation** (new_subgraph) — Demiplane creates a persistent extradimensional space accessed through a door object. The existing families (ongoing_effect, activation, triggered_reaction, anchored_trigger) cannot honestly represent this: ongoing_effect requires a roll_mo
- **create_portal** (new_atom) — The door created by Demiplane is not a passive object but a traversable portal connecting two locations/spaces. The existing create_object atom does not carry the 'leads to space' semantic — a portal has a destination, bidirectional travers
- **extradimensional_space** (new_atom) — The spell creates a named pocket dimension with explicit physical dimensions. No v4 atom or Attachment variant represents a caster-owned extradimensional space that persists between castings and can be connected to across casts. It is disti
- **shunt_on_expiry (expiry effect variant)** (new_variant) — When the spell ends, creatures inside can optionally be moved to the nearest unoccupied space outside, landing prone. This is an on-expiry effect with creature movement + condition application. The existing lifecycle atoms (expire, persist)
- **cast_time_choice (choose variant on cast)** (new_variant) — The caster chooses at cast time between creating a new demiplane or connecting the door to a prior-cast demiplane. The v4 'choose' procedure atom exists but there is no surface type variant in SpellMechanics to model a cast-time choice that

### detect_thoughts

- **multi_mode_ongoing** (new_subgraph) — Detect Thoughts activates one of two effects on cast and allows re-selection each subsequent turn via Magic action. The current ongoing_effect family has a single operation field; there is no mechanism for player-choice between N operations
- **sense_presence** (new_atom) — The Sense Thoughts mode grants awareness of nearby thinking creatures — a detection/informational effect. No existing v4 effect atom covers presence-sensing. The current Effect union is DamageEffect | NoneEffect; grant_sense in v4 covers se
- **grant_information** (new_atom) — The Read Thoughts mode's save-gate fail branch grants informational content (surface thoughts, then on probe: reasoning/emotions). No v4 effect atom covers information disclosure as a mechanical outcome. The save gate exists but its onFail
- **ability_check_counter (target-initiated)** (new_variant) — The target can spend their action to make an Intelligence (Arcana) check against the caster's spell save DC to end the spell. This is a target-initiated ability_check resolution that terminates the caster's ongoing concentration effect — no

### dispel_magic

- **for_each_active_effect_iteration** (new_subgraph) — Dispel Magic must check each ongoing spell above the slot-level threshold separately, with a distinct DC per spell (10 + that spell's level). The phases array is an encode-time fixed sequence; it cannot represent a dynamic per-spell loop ov
- **ability_check_by_caster (ActivationPhase)** (new_variant) — The resolution is a caster-side ability check against a spell-level-derived DC. The existing save_gate phase is the target's saving throw against the caster's DC — inverted. The v4 resolution atom ability_check exists but is not exposed in
- **end_ongoing_effect** (new_atom) — The caster's successful check terminates an ongoing spell on the target. No v4 effect atom covers this: negate_named_effect requires naming a specific spell at encode time; expire and break are lifecycle atoms describing natural spell end,

### druid_ability_score_improvement_l4

- **permanent_progression** (new_subgraph) — ASI and feat-grant features are applied once at level-up, permanently modifying the character. They have no activation cost, no use-count resource, no reset cadence, and no transient effect — the entire 'activation' family shape is wrong. A
- **grant_feat** (new_atom) — The core mechanic is granting a feat choice (either the ASI feat or another qualifying feat). No existing ClassFeatureEffect covers this. 'grant_proficiency' is unrelated. The v4 effect atom inventory has no atom for feat grants or permanen

### druid_archdruid_l20

- **passive_triggered_class_feature** (new_subgraph) — Evergreen Wild Shape fires automatically on initiative roll with no player action — a conditional passive triggered by an engine event. ClassFeatureMechanics has only the 'activation' family (player-initiated). A triggered-passive family dr
- **convert_resource** (new_atom) — Nature Magician converts N uses of Wild Shape into a spell slot of level 2N — a cross-resource conversion at a configurable exchange rate. ClassFeatureEffect has only grant_extra_action and heal_hp; no conversion or exchange effect exists i

### druid_beast_spells_l18

- **passive ClassFeatureMechanics family** (new_subgraph) — Beast Spells has no activation event, no use count, and no reset cadence. It is permanently active whenever Wild Shape is active. The only existing ClassFeatureMechanics family is 'activation', which mandates activationCost + resource (UseC
- **lift_form_restriction (or: modify_spellcasting_restriction)** (new_atom) — The feature's effect is granting permission to cast spells while in Beast form, with a carved-out exception for costly/consumed Material components. This is not 'grant_extra_action' or 'heal_hp'. It is a conditional permission modifier on t

### druid_circle_of_the_land_spells_l3

- **rest_time_choice_grant** (new_subgraph) — The feature's mechanical pattern is: Long Rest completion triggers a player choice from a closed enum (land type), which determines which prepared-spell list is granted for the next adventuring day. No existing ClassFeatureMechanics family
- **grant_spell_access variant on ClassFeatureEffect** (new_variant) — ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect. The v4 taxonomy includes a 'grant_spell_access' atom (Section 9, Effect Atoms), but it is not surfaced in the TS type for class features. This unit needs it, as do analogous domain
- **level_gated_list variant on grant_spell_access payload** (new_variant) — The granted spells are not a flat list — they unlock progressively by class level (L3 grants 3 spells, L5 adds 1 more, L7 adds 1 more, L9 adds 1 more). This is distinct from a simple 'all spells prepared at once' grant. The grant_spell_acce
- **branching_choice variant for rest-time player decision** (new_variant) — The druid chooses one of four mutually exclusive land types at long rest. The v4 taxonomy has a 'choose' procedure atom, but ClassFeatureMechanics has no mechanism to express a rest-time player choice that gates which downstream effect fire

### druid_druid_subclass_l3

- **subclass_choice** (new_subgraph) — A subclass selection feature is a permanent character-progression gate made at level-up. It has no activation cost, no use count, no reset cadence, and no discrete runtime effect. The only existing ClassFeatureMechanics family is 'activatio

### druid_druidic_l1

- **passive (ClassFeatureMechanics family)** (new_variant) — Druidic is not activated — it is an always-on feature that grants effects at class acquisition with no activation cost, no use-count resource, and no rest reset. The current ClassFeatureMechanics union has only 'activation', which requires
- **grant_spell_access (ClassFeatureEffect variant)** (new_variant) — The 'grant_spell_access' atom exists in the v4 taxonomy but has no representation in ClassFeatureEffect (which only includes GrantExtraActionEffect and HealHpEffect). Druidic grants 'Speak with Animals' as always-prepared — a spell-access g

### druid_elemental_fury_l7

- **choose_one_of_subfeatures** (new_subgraph) — The feature grants ONE of two sub-features selected at the time the druid reaches level 7. There is no wrapper shape in ClassFeatureMechanics for 'choose one of N sub-features at acquisition.' The current surface only models a single mechan
- **passive_class_feature_family** (new_subgraph) — Potent Spellcasting is a permanently-active modifier with no activation cost, no resource, and no rest reset. The only ClassFeatureMechanics family is 'activation', which requires activationCost, resource, and resetCadence — none of which a
- **ability_score_damage_bonus effect** (new_variant) — Potent Spellcasting adds the Wisdom modifier (an ability-score-derived value, not a fixed dice amount) to cantrip damage. ClassFeatureEffect supports only GrantExtraActionEffect and HealHpEffect. A new effect type is needed: a numeric damag
- **on_hit_trigger family for class features** (new_subgraph) — Primal Strike is an on-hit damage rider once per turn, triggered by a weapon or Wild Shape Beast-form attack. This shape exists in the mastery vocabulary (OnHitTriggerMechanics) but not in ClassFeatureMechanics. No honest mapping exists wit
- **choose_one_of DamageType at activation time** (new_variant) — Primal Strike's 1d8 elemental damage type is chosen by the player at the moment of the hit, from the set {cold, fire, lightning, thunder}. DamageEffect.damageType is a single fixed DamageType with no 'choose_one_of' variant. A new surface s
- **MasteryTrigger variant: weapon_or_wild_shape_beast_attack** (new_variant) — Primal Strike fires on 'a weapon or a Beast form's attack in Wild Shape.' The existing MasteryTrigger variants only cover weapon_hit and weapon_hit_melee_only. Wild Shape Beast-form natural attacks are not weapon attacks and require a new t

### druid_epic_boon_l19

- **passive_grant (new ClassFeatureMechanics family)** (new_subgraph) — The 'gain a feat at level N' mechanic is a permanent passive grant with no activation cost, no use-count resource, and no reset cadence. The only ClassFeatureMechanics family is 'activation', which mandates activationCost + resource + reset
- **grant_feat (new ClassFeatureEffect variant)** (new_variant) — Even if a passive_grant family existed, ClassFeatureEffect only supports grant_extra_action and heal_hp. Granting a feat (specifically an Epic Boon feat, or any feat the character qualifies for) is a distinct effect shape. It carries a choi

### druid_natures_sanctuary_l14

- **ClassFeatureActivationCost { kind: "action" }** (new_variant) — Nature's Sanctuary is activated with a Magic action, which is a standard action kind. ClassFeatureActivationCost only has `free` and `bonus_action`. Action-cost class features are a common pattern (compare Channel Divinity, Wild Shape itsel
- **ClassFeatureMechanicsHeader.duration (timed with condition expiry)** (new_variant) — The feature creates a persistent zone that lasts 1 minute or until a condition (Incapacitated) or death. ClassFeatureMechanicsHeader has no duration field at all — it models only instantaneous activations. A timed class feature zone require
- **multi_activation class feature (primary + secondary repositioning activation)** (new_subgraph) — The feature has two distinct activation clauses: (1) the primary Magic action that creates the area, and (2) a Bonus Action on subsequent turns to reposition the Cube. The current activation family supports exactly one activation cost and o
- **UseCountResource: cross-feature resource reference (consumes Wild Shape use)** (new_variant) — The feature does not have its own use-count pool; it consumes a use from Wild Shape, which is a separate class feature with its own resource. The surface has no mechanism to express consumption of another feature's `use_count` pool. A cross
- **grant_cover (Half Cover to area occupants)** (new_atom) — The zone grants Half Cover (+2 AC, +2 DEX saves) to creatures within it. v4 has `modify_ac` as a reaction effect atom, but no `grant_cover` atom expressing a persistent zone-conditional AC/save modifier keyed to area occupancy. Half Cover i
- **ClassFeatureEffect: grant_resistance_from_feature (cross-feature state projection)** (new_variant) — The zone propagates the *current* Resistance type granted by Nature's Ward (a separate L10 class feature) to allies in the area. This requires projecting runtime state from another feature into the effect. v4 has `grant_resistance` but no m

### druid_natures_ward_l10

- **passive family for ClassFeatureMechanics** (new_subgraph) — Nature's Ward is always-on with no activation, no use-count resource, and no reset cadence. The surface only supports the 'activation' family, which mandates activationCost + resource + resetCadence. A new 'passive' family is required for p
- **grant_resistance effect in ClassFeatureEffect** (new_variant) — The v4 atom 'grant_resistance' exists but is not reachable from ClassFeatureEffect. ClassFeatureEffect only offers GrantExtraActionEffect and HealHpEffect. Damage resistance needs to be expressible as a class feature effect.
- **grant_condition_immunity** (new_atom) — Condition immunity (immune to Poisoned) is mechanically distinct from remove_condition (which ends an active condition) and from apply_condition. v4 has no atom for permanently preventing a condition from being applied. This is a new runtim
- **feature_linked resistance selection (resistance type bound to another feature's choice)** (new_variant) — The resistance type is not fixed — it depends on the druid's current land choice from Circle Spells. Encoding this requires a surface shape that can reference another feature's selection as the resistance type parameter, which is absent fro

### druid_spellcasting_l1

- **grant_spellcasting (ClassFeatureMechanics family)** (new_subgraph) — Spellcasting is a passive infrastructure grant, not an activated feature. The existing 'activation' family requires an activation cost, a use_count resource with a cap, and a single effect from {grant_extra_action, heal_hp}. None of these m
- **spell_slot_table resource (multi-level, class-level-scaled)** (new_variant) — Druid spell slots are a two-dimensional resource: indexed by spell slot level (1–9) AND scaled by class level per a class-specific table. UseCountResource models a single integer cap, optionally tiered by class level. It cannot express a po
- **cantrip_pool (known-cantrip count scaling by class level with threshold_tiers)** (new_variant) — The cantrip pool is a known-spell count (not slots) that starts at 2 and gains +1 at class levels 4 and 10. This is a threshold_tiers<number> scaled by the 'class' axis. No existing ClassFeatureEffect variant models 'grants N known cantrips
- **prepared_spell_list (prepared-spell count scaling by class level, Long Rest changeable)** (new_variant) — Prepared spells are a distinct resource from known spells: the count scales by class level (a table), the list is chosen from all Druid spells for which you have slots, and the entire list can be swapped on a Long Rest. This is not a use_co

### druid_wild_companion_l2

- **ClassFeatureActivationCost.action** (new_variant) — Wild Companion requires a Magic action to activate. ClassFeatureActivationCost only has 'free' and 'bonus_action'; there is no 'action' or 'magic_action' variant.
- **disjunctive_resource** (new_subgraph) — The feature consumes either a spell slot OR a use of Wild Shape — two distinct resource pools belonging to different features. UseCountResource models a single pool with a fixed cap; it cannot express an either/or choice across pools, nor c
- **ClassFeatureEffect.invoke_spell** (new_variant) — The effect is casting a specific named spell (Find Familiar) with parameter overrides: no material component, familiar creature type forced to Fey, and duration capped at Long Rest. ClassFeatureEffect only has GrantExtraActionEffect and Hea
- **spell_invocation_override.creature_type** (new_variant) — The familiar is forced to be the Fey creature type rather than the type normally allowed by Find Familiar. There is no surface atom or variant for overriding a spell's summoned creature type at invocation time.
- **spell_invocation_override.duration_cap** (new_variant) — The familiar disappears at Long Rest rather than persisting indefinitely (Find Familiar's normal duration). There is no surface shape for capping or overriding a spell's duration when invoked via a class feature.

### feat_boon_of_combat_prowess

- **FeatRecord + FeatMechanics family** (new_subgraph) — UnitRecord has no 'feat' kind. types.ts only defines SpellRecord, ClassFeatureRecord, and MasteryRecord. Feats require a new top-level record kind with its own mechanics header (at minimum: no class/level requirement, may bundle ASI + activ
- **force_hit (or modify_roll_outcome: miss_to_hit)** (new_atom) — Peerless Aim converts a missed attack roll into a hit without rerolling. This is distinct from modify_roll_reroll (reroll keeping higher/lower), modify_roll_substitute (replace with a fixed numeric value), and modify_roll_numeric (add a die
- **modify_ability_score** (new_atom) — Ability Score Increase is the canonical ASI rider shared by most feats. TAXONOMY §12 already records this as a known deferred atom ('modify_ability_score as a runtime effect versus as pre-runtime character state'). It is out-of-scope for th

### feat_boon_of_irresistible_offense

- **feat_record** (new_subgraph) — No UnitRecord kind for 'feat' exists. The surface defines only spell, class_feature, and mastery records. A feat is a distinct kind with prerequisites, multiple independent benefit buckets, and no single mechanics family mapping to existing
- **crit_window** (new_atom) — Overwhelming Strike triggers specifically on a natural 20, not on any hit. The v4 taxonomy explicitly records crit_window as a deferred single-feat pressure case for this exact feat. on_hit_window cannot distinguish a critical hit from an o
- **DiceAmount: ability_score_value** (new_variant) — Overwhelming Strike's damage equals the character's current STR or DEX score (the one boosted by the feat) — a flat integer derived from a runtime stat. No existing DiceAmount variant (fixed, threshold_tiers, linear_per_level) can express a
- **passive_benefit (bypass_resistance, always-on)** (new_variant) — Overcome Defenses is an always-on passive — no activation, no trigger, no quota consumed. The bypass_resistance v4 atom exists, but the current surface has no passive benefit carrier. All existing ClassFeatureEffect variants are activated e

### feat_boon_of_spell_recall

- **FeatRecord** (new_subgraph) — UnitRecord in types.ts has no 'feat' kind. SpellRecord | ClassFeatureRecord | MasteryRecord is the exhaustive union; feat_root exists in the v4 taxonomy atom inventory but has never been given a corresponding surface record type.
- **passive_spell_cast_trigger** (new_subgraph) — Free Casting fires passively on every spell cast with a L1-4 slot — not an activation. The existing activation family requires an explicit activation cost. A passive trigger on spell_cast_window needs a new feat/feature family (analogous to
- **probabilistic_roll_gate** (new_subgraph) — The check is: roll 1d4, compare result to slot level (a runtime parameter). No surface type models a probabilistic check against a dynamic integer parameter. This is structurally distinct from save_gate (ability check, fixed DC) and attack_
- **refund_spell_slot** (new_variant) — The effect on a successful check is that the spell slot is not expended — a conditional resource refund. The v4 taxonomy lists 'refund' as a procedure atom, but types.ts has no surface variant for it. The closest effect in ClassFeatureEffec

### feat_boon_of_truesight

- **FeatRecord / feat mechanics family** (new_subgraph) — UnitRecord has no 'feat' variant. No FeatRecord type exists in types.ts, and no feat mechanics family is defined. Feats are a distinct source-root atom (feat_root) in v4 taxonomy but have no surface encoding path.
- **grant_sense surface type** (new_variant) — Truesight is a special sense granted permanently by this feat. The v4 atom 'grant_sense' exists in the taxonomy but there is no corresponding surface type in types.ts to carry its parameters (sense kind, range in feet, permanent vs. timed).
- **ability_score_increase surface type** (new_variant) — The feat grants +1 to a chosen ability score (max 30). The v4 taxonomy explicitly marks 'modify_ability_score as a runtime effect versus as pre-runtime character state' as out-of-scope. A feat record family would need to either include this

### feat_great_weapon_fighting

- **FeatRecord** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. There is no FeatRecord. feat_root is a v4 source atom and feats are a distinct SRD unit type with mechanics unlike class features (no className, no acquiredAtLevel, different pr
- **modify_roll_substitute (surface shape for die-result floor)** (new_variant) — The core mechanic is a die-result substitution: any damage die showing 1 or 2 is treated as 3. This is not a numeric delta (modify_roll_numeric adds a fixed bonus), not advantage/disadvantage, and not a standard reroll (a reroll could produ
- **passive_always_on mechanics family** (new_variant) — Great Weapon Fighting is unconditionally active whenever the weapon condition is met — no activation, no resource, no reset cadence. ClassFeatureActivationMechanics requires activationCost + resource (use_count) + resetCadence. Even activat

### feat_magic_initiate

- **FeatRecord + FeatMechanics family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. There is no 'feat' kind. The v4 taxonomy has feat_root as a source atom, but the surface has no FeatRecord type and no FeatMechanics family. Magic Initiate cannot be placed into
- **grant_spell_access effect** (new_variant) — The core mechanic grants cantrips and a prepared level-1 spell from a chosen class spell list. ClassFeatureEffect only supports grant_extra_action and heal_hp. Even if FeatRecord existed, this effect type is absent from the surface. grant_s
- **free_cast_once_per_rest resource pattern** (new_variant) — The Level 1 Spell benefit permits one free cast per Long Rest AND normal slot-based casting of the same spell. UseCountResource models a consumable pool; it does not model 'one free cast path plus an unlimited spell-slot path for the same s
- **spellcasting_ability_choice (build-time choice binding)** (new_variant) — The feat requires choosing Int, Wis, or Cha as the spellcasting ability at feat acquisition. No surface type encodes a build-time ability choice that binds to the feat's granted spells.

### fighter_epic_boon_l19

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Epic Boon is a permanent character-sheet acquisition with no activation cost, no use-count resource, and no rest reset. The existing 'activation' family requires all three. A new family (e.g. 'passive_grant' or 'level_grant') is needed for
- **grant_feat** (new_atom) — The effect of Epic Boon is acquiring a feat of the player's choice from the Epic Boon category. No ClassFeatureEffect variant covers this. The v4 taxonomy has grant_proficiency and grant_spell_access but no grant_feat atom.
- **open_choice constraint on grant_feat** (new_variant) — The feat is not a fixed selection — the player chooses from the Epic Boon feat category (or any feat they qualify for). This is an open-choice picker pattern that the current surface has no way to encode for feat grants. The surface would n

### fighter_extra_attack

- **class_feature.passive** (new_subgraph) — Extra Attack is always-on and modifies the Attack action directly; it is not an activated feature with a cost, resource, or reset cadence.
- **scale_attack_count** (new_atom) — The mechanic changes how many attacks occur within one Attack action, which is distinct from granting an extra action.

### fighter_fighter_subclass_l3

- **subclass_grant** (new_subgraph) — The feature's entire mechanic is a character-build branching point: at level 3 the player chooses a subclass and gains its features for the rest of their career. This is not an activation (no cost, no resource, no reset cadence, no effect).

### fighter_fighting_style_l1

- **passive_grant (class-feature family)** (new_subgraph) — Fighting Style is a permanent passive benefit acquired at level 1. It has no activationCost, no use-count resource, and no rest-reset cadence. The existing activation family is intrinsically wrong for a once-granted passive feat slot. A new
- **grant_feat_choice (ClassFeatureEffect variant)** (new_variant) — The effect is granting access to a feat drawn from a named category (Fighting Style feats), with the player choosing which one. This is distinct from grant_extra_action or heal_hp. The closed category constraint and the player-choice semant
- **replaceable_on_level_up (modifier on feat-choice effects)** (new_variant) — The feature explicitly permits swapping the chosen feat for a different one from the same category whenever the fighter gains a level. This is a character-progression mechanic with no analog in current atoms — it is not a rest-window reset

### fighter_heroic_warrior_l10

- **passive_trigger (class-feature family)** (new_subgraph) — Heroic Warrior fires automatically at the start of every turn during combat — no player activation, no use-count resource, no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which models explicitly triggered f
- **grant_heroic_inspiration** (new_atom) — The effect of this feature is granting Heroic Inspiration — a meta-resource that allows rerolling any die. ClassFeatureEffect is currently GrantExtraActionEffect | HealHpEffect. Neither covers this. The v4 effect atom inventory has no 'gran

### fighter_studied_attacks_l13

- **on_miss_trigger (class feature family)** (new_subgraph) — Studied Attacks fires automatically whenever the fighter misses an attack roll — no player-initiated activation, no use-count resource, no rest reset cadence. The only existing class feature family is 'activation', which requires activation
- **modify_roll_advantage in ClassFeatureEffect** (new_variant) — The feature grants Advantage on attack rolls. modify_roll_advantage exists in v4 taxonomy and is already present in MasteryEffect, but ClassFeatureEffect only contains GrantExtraActionEffect | HealHpEffect. Threading this effect type into c

### fighter_superior_critical_l15

- **passive (ClassFeatureMechanics family)** (new_variant) — Superior Critical is a permanent always-on modifier with no activation cost, no use-count resource, and no reset cadence. The existing ClassFeatureMechanics only has the 'activation' family, which requires all three. A new 'passive' family
- **modify_crit_threshold** (new_atom) — The mechanic widens the d20 range that counts as a Critical Hit from 20 to 18–20. No existing v4 effect atom covers this. TAXONOMY_atoms_graph.md §12 notes 'crit_window distinct from on_hit_window' as a deferred residue atom (single-feat pr

### fighter_survivor_l18

- **passive_class_feature family** (new_subgraph) — ClassFeatureMechanics only has the 'activation' family, which requires activationCost + UseCountResource + resetCadence. Both Defy Death (always-on passive) and Heroic Rally (automatic turn-start trigger, no cost, no use count) cannot be ho
- **DiceAmount — flat_plus_ability_mod variant** (new_variant) — Heroic Rally heals '5 plus your Constitution modifier'. DiceAmount only supports dice-based expressions with static flat bonuses; it has no way to express a dynamic ability modifier addend. A new variant like {kind: 'flat_plus_ability_mod',
- **RollKind — death_saving_throw** (new_variant) — Defy Death grants Advantage specifically on Death Saving Throws, which are mechanically distinct from ordinary saving throws (no ability modifier, automatic outcomes at 1/20, three-failure death). Current RollKind is 'attack_roll' | 'saving
- **conditional trigger predicate (Bloodied + HP > 0)** (new_variant) — Heroic Rally fires only when the character is Bloodied (HP ≤ half max) AND has at least 1 HP. No current surface type models a conditional predicate on HP state that gates an automatic effect. This is a new kind of trigger condition not pre
- **modify_roll_threshold (death save 18–20 → 20)** (new_atom) — Defy Death's second clause widens the automatic-success threshold on Death Saving Throws from 20 to 18–20. v4 has no atom for 'treat rolls ≥ N as the maximum result' on a specific roll type. This is mechanically distinct from modify_roll_ad

### fighter_tactical_shift_l5

- **on_use_trigger (ClassFeatureMechanics family)** (new_subgraph) — Tactical Shift fires automatically when Second Wind is activated — it is not independently activated. No 'on_use_trigger' or 'passive_rider' family exists in ClassFeatureMechanics. The existing 'activation' family requires an independent ac
- **grant_movement (ClassFeatureEffect variant)** (new_variant) — The effect grants movement (up to half Speed) with opportunity attack denial. Neither GrantExtraActionEffect nor HealHpEffect covers this. The v4 taxonomy has 'move' and 'deny_opportunity_attack' atoms, but no surface shape in ClassFeatureE

### forbiddance

- **area_ward** (new_subgraph) — Forbiddance combines two mechanically distinct layers that no existing family captures: (1) an always-on persistent prohibition on magical travel into/through the warded area, and (2) event-triggered damage to creature-type-filtered creatur
- **AnchoredEvent.ends_turn_in_area** (new_variant) — The damage fires both on entry AND when a creature ends its turn in the area. anchored_trigger only has physical_contact and enters_area. This variant is needed even if anchored_trigger is not the right family for Forbiddance, as it will re
- **AnchoredFilter.creature_type_whitelist** (new_variant) — Forbiddance's damage applies only to creature types the caster designates at cast time (Aberrations, Celestials, Elementals, Fey, Fiends, Undead). The existing AnchoredFilter only supports creature_exemption_list (individual creature identi
- **AnchoredFilter.password_exemption** (new_variant) — Creatures that speak a designated password as they enter are immune to the damage. This is a runtime speech-check exemption, distinct from identity-based creature exemption lists.
- **AreaWardEffect.block_travel** (new_variant) — The primary spell effect — prohibiting teleportation, portals, and planar travel into/through the area — is a persistent area prohibition with no representation in any existing surface type. The v4 atom block_travel exists, but no surface m

### goodberry

- **consumable_object_pool** (new_subgraph) — Goodberry creates N distinct objects (berries) that any holder can activate using their own Bonus Action. No existing family models 'N consumable items created at cast time, each activatable by any holder at the holder's cost, each triggeri
- **Attachment.kind: consumable_pool** (new_variant) — The existing attachment kinds (self, target, area, mark) attach to creatures or locations at cast time. Goodberry's berries are physical objects placed in the caster's hand and distributed later — attachment is to the holder of an item, not
- **OngoingOperation.kind: heal_on_consume** (new_variant) — OngoingOperation is RollModifierOperation | DamageOnHitOperation. Neither carries a heal. Goodberry's per-berry effect is heal_hp (1 HP to consumer). A third variant is needed to express 'heal the consumer on activation of a consumable.'
- **ClassFeatureActivationCost / quota model for consumer-side cost** (new_variant) — Current quota nodes always represent the caster consuming their own action economy. Goodberry's activation cost is the *consumer's* Bonus Action — a different creature's quota. The surface has no way to express 'holder (not caster) expends

### halfling_luck

- **SpeciesTraitRecord + passive_trigger family** (new_subgraph) — No species_trait kind exists in UnitRecord. The union covers only spell, class_feature, and mastery. A SpeciesTraitRecord with a passive_trigger mechanics family is the minimum structural addition needed.
- **d20_outcome_filter (trigger predicate: roll = 1)** (new_variant) — The passive_trigger family needs a way to express 'fires when d20 result equals 1'. No surface type currently models a trigger keyed on a specific numeric die outcome. A new trigger predicate variant is required alongside the passive_trigge

### holy_aura

- **AreaOrigin.emanation_from_caster** (new_variant) — Holy Aura's area is a 30-foot Emanation centered on the caster that moves with them. Existing AreaOrigin variants (point_within_range, on_primary_target) do not model an origin anchored to and moving with the caster.
- **OngoingOperation.advantage_modifier** (new_variant) — The aura grants Advantage on saving throws to chosen creatures and Disadvantage on attack rolls to enemies attacking them. OngoingOperation only has roll_modifier (dice delta) and damage_on_hit — neither can express advantage/disadvantage.
- **multi_operation_ongoing_effect** (new_subgraph) — Holy Aura has three simultaneous ongoing effects (saving-throw advantage, attack-roll disadvantage, triggered save gate). The ongoing_effect family has a singular operation field. It must become operations: ReadonlyArray<OngoingOperation> t
- **creature_type_gated_save_rider** (new_subgraph) — The third effect is a conditional save gate that only triggers when the attacker is a Fiend or Undead — a creature-type filter on the trigger. No existing surface type or v4 atom models this creature-type gate on a reactive melee-hit trigge
- **Condition.blinded** (new_variant) — The save rider inflicts the Blinded condition on failure. Condition currently only contains 'prone'.

### mage_hand

- **object_proxy spell mechanics family** (new_subgraph) — Mage Hand creates a persistent, controllable object proxy. No existing SpellMechanics family models this pattern. The four existing families all require passive operations (roll_modifier, damage_on_hit), instantaneous phases (attack_roll, s
- **interact_object** (new_atom) — The hand's capability set is a deterministic, SRD-enumerated list of environment-object interactions. No v4 effect atom covers non-combat object interaction. The create_object v4 atom covers creating the hand but not what it can do. The SRD
- **recurring_action_cost on persistent object (per-turn command)** (new_variant) — Controlling the hand on subsequent turns costs a Magic action each time. This is a recurring action-quota cost on a created object — not modeled in any existing surface type. ClassFeatureActivationCost is class-feature-specific; spell surfa
- **proximity_tether self-break condition** (new_variant) — The hand vanishes if it is ever more than 30 feet from the caster. This is a distance-based self-break on a created object. The v4 lifecycle atom self_break exists but the surface has no type for it, and no existing Duration or lifecycle va

### magic_item_adamantine_armor

- **MagicItemRecord + magic_item UnitRecord kind** (new_subgraph) — types.ts UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. There is no magic_item kind. The v4 TAXONOMY has magic_item_root as a source atom but the surface has no corresponding record type. No family can be coerced to represen
- **passive_persistent mechanics family** (new_subgraph) — Adamantine Armor is an always-on passive modifier that fires while the item is worn, with no activation cost, no use count, and no rest reset. None of the three existing families (ongoing_effect, activation, on_hit_trigger) model a worn-ite
- **suppress_crit (or promote deferred crit_window)** (new_atom) — The effect converts an incoming critical hit to a normal hit. No v4 atom covers this. The TAXONOMY §12 explicitly defers crit_window as 'single-feat pressure, not promoted'. Adamantine Armor is a second independent pressure point (magic ite
- **incoming attack_roll trigger (worn-item scope)** (new_variant) — All existing attack_roll resolution atoms trace outgoing attacks (attacker's roll). Adamantine Armor fires on incoming attack rolls against the wearer. The surface has no trigger variant scoped to 'attack roll targeting the item bearer'. A

### magic_item_ammunition_1_2_or_3

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The surface only supports spell | class_feature | mastery. A MagicItemRecord type and corresponding mechanics family are required before any magic item can be encoded.
- **rarity axis in LevelAxis** (new_variant) — The +1/+2/+3 bonus is determined by rarity (Uncommon/Rare/Very Rare), not by character level, class level, slot level, or proficiency bonus. LevelAxis has no rarity member.
- **on_hit_consume trigger for UseCountResource** (new_variant) — The ammunition loses its magic when it hits a target — a single-use-per-hit consumption trigger. RestResetCadence models rest-based refill; it has no variant for 'consumed on hit' or 'destroyed on use'.

### magic_item_amulet_of_the_planes

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord has no magic_item kind. types.ts exports SpellRecord | ClassFeatureRecord | MasteryRecord only. A MagicItemRecord with at least one mechanics family (e.g. 'activated_item') is required before any magic item can be encoded.
- **attunement_slot resource in surface types** (new_variant) — v4 atom inventory lists 'attunement_slot' as a resource atom. No surface type currently models it. Magic items that require attunement must express consumption of an attunement slot.
- **ability_check resolution in item activation context** (new_variant) — The item's activation branches on a DC 15 Intelligence (Arcana) check. v4 has 'ability_check' as a resolution atom, but no surface ActivationPhase or item-mechanics type supports it. SpellMechanics has save_gate and attack_roll phases; neit
- **transport_exile with random table destination** (new_variant) — On a failed check, the effect transports creatures to a destination determined by 1d100 → conditional sub-rolls (1d6, 1d8). v4 has 'transport_exile' as an effect atom but no surface type models random-table destination selection. The random

### magic_item_apparatus_of_the_crab

- **magic_item_record** (new_subgraph) — UnitRecord does not include a MagicItemRecord kind. The v4 taxonomy has magic_item_root but no corresponding record type, mechanics family, or tracer branch exists in the surface. Every magic item hits this blocker before any mechanic-level
- **vehicle_object_family** (new_subgraph) — The apparatus is a rideable object with its own stat block (AC, HP, Speed, damage immunities). No mechanics family models an object with independent stats that occupants pilot. This is structurally distinct from all four spell families and
- **lever_multimode_activation** (new_subgraph) — Ten levers each have an Up and Down mode producing independent effects (movement, attack, light, window, depth control, hatch). No mechanics family models a multi-mode stateful control panel where a single Utilize action dispatches to one o
- **fixed_numeric_attack_bonus** (new_variant) — The claw attacks use +8 to hit — a fixed numeric bonus unrelated to caster spell save DC or weapon-attack-rooted DC formula. DcSource has caster_spell_save_dc and weapon_attack_dc (base + ability mod + PB); neither covers a hardcoded intege
- **condition_grappled** (new_variant) — Lever 5 down applies the Grappled condition with escape DC 15. The Condition type only contains 'prone'. Grappled is a distinct SRD condition requiring its own variant.

### magic_item_armor_of_vulnerability

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — No magic_item kind exists in UnitRecord. types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord. The magic_item_root atom exists in TAXONOMY_atoms_graph.md v4 but has no corresponding TypeScript record type, mechanics header
- **grant_vulnerability** (new_atom) — The curse grants Vulnerability to two damage types. v4 includes grant_resistance but has no symmetric grant_vulnerability counterpart. These are mechanically distinct (resistance halves; vulnerability doubles). A new effect atom is required
- **curse_state (attune_triggered, survives_item_removal)** (new_variant) — The curse is activated on attunement and persists past removing the armor. No existing lifecycle atom (expire, dismiss, persist) captures an effect that detaches from its source item and requires a named-spell intervention to end. This is a
- **GM-determined property selection (chosen at item creation / attunement)** (new_variant) — The resistance type is determined by the GM at item creation or attunement, not chosen by the player at cast time. The only existing cast-time choice pattern in the surface is AnchoredFilter.creature_exemption_list (chosen_at_cast). A magic

### magic_item_bag_of_holding

- **magic_item_record** (new_subgraph) — UnitRecord has no magic_item kind. types.ts defines only SpellRecord | ClassFeatureRecord | MasteryRecord. Magic items need a new top-level record kind with its own mechanics header (rarity, attunement requirement, item type) and at least o
- **passive_container_family** (new_subgraph) — The bag's primary mechanic is extradimensional storage — a passive property with capacity constraints (weight, volume), a weight override (always 5 lbs), and a time-limited air supply. No existing mechanics family models passive item proper
- **item_interaction_destroy_gate** (new_subgraph) — The cross-item interaction mechanic — placing the bag inside another extradimensional item destroys both and opens a planar gate that sucks nearby creatures through — is a conditional destruction effect triggered by an inventory-placement i

### magic_item_bead_of_force

- **MagicItemRecord + magic_item_root family** (new_subgraph) — UnitRecord has no 'magic_item' kind. traceUnit() has no case for it. The v4 taxonomy lists magic_item_root as a source atom, but types.ts never defines MagicItemRecord or any magic-item mechanics family.
- **ChargeResource (consumable single-use item)** (new_variant) — The bead is destroyed on activation — a single-charge consumable. The v4 atom 'charge' exists but types.ts has no ChargeResource or item-level use-count that maps to an item being consumed.
- **barrier (or block_travel + block_targeting area)** (new_atom) — The item creates an impenetrable transparent force sphere that blocks attacks, effects, and egress. v4 lists block_travel and block_targeting as effect atoms, but neither is in the current Effect union in types.ts, and a persistent barrier
- **apply_condition / trap (containment)** (new_atom) — Creatures that fail the save and are completely within the area are trapped inside. This is not a named SRD condition; it is a movement-blocking containment state tied to the barrier object. Not representable as apply_condition (no matching
- **force_move (push away)** (new_atom) — Creatures that succeed the save or are partially inside are pushed away from the sphere's center. v4 lists force_move, but it is absent from the current Effect union in types.ts.
- **mobile area attachment (sphere moveable by occupants)** (new_variant) — An enclosed creature can use a Utilize action to push the sphere up to half its Speed. The current Attachment area shape is a static origin; there is no grammar for an area that moves as a result of occupant actions.

### magic_item_boots_of_speed

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord has no magic_item variant. There is no MagicItemRecord type, no magic item payload family, and no magic_item_root source atom wired into the surface. The entire encoding path is missing.
- **modify_speed effect on surface** (new_variant) — The boots double the wearer's Speed while active. The v4 atom modify_speed exists in the taxonomy but is not present in any surface type. A magic item effect surface type would need to include it, with a multiplier (×2) or additive-flat var
- **modify_roll_advantage scoped to enemy Opportunity Attacks against self** (new_variant) — The boots impose Disadvantage on attack rolls made by other creatures against the wearer, but only for Opportunity Attacks specifically. The existing RollKind union (attack_roll | saving_throw) has no sub-kind for Opportunity Attacks. The e
- **duration_budget resource (timed use pool)** (new_variant) — The item's active power depletes from a shared 10-minute total across activations, not a discrete use count. This is a continuous-time budget that refills on Long Rest. UseCountResource (kind: use_count) models discrete counts; there is no
- **toggle_deactivation activation cost** (new_variant) — The effect is ended by a second heel-click (same gesture as activation). This is a deliberate toggle pattern — the active state is self-terminating via re-invocation. No existing ClassFeatureActivationCost or effect family models voluntary
- **attunement_slot resource on surface** (new_variant) — The item requires attunement. The v4 atom attunement_slot exists in the taxonomy (§7 Resource Atoms) but is not present in any surface type. A MagicItemRecord encoding path would need to surface attune + attunement_slot.

### magic_item_bowl_of_commanding_water_elementals

- **MagicItemRecord** (new_subgraph) — UnitRecord does not include a magic_item kind. types.ts has no MagicItemRecord type and the tracer has no handler for kind='magic_item'. This blocks all magic items from being encoded.
- **dawn_reset (RestResetCadence)** (new_variant) — The bowl resets at the next dawn — not a short or long rest. No existing RestResetCadence variant covers calendar-time resets.
- **create_companion** (new_atom) — The core effect is summoning a named creature type (Water Elemental) that obeys commands and acts on the user's initiative. The v4 taxonomy lists create_companion as an effect atom but it is absent from types.ts Effect union and from ClassF
- **proximity_and_fill_activation_condition** (new_variant) — Activation requires (a) the bowl to be filled with water and (b) the user to be within 5 feet of it. No existing activation-condition or gate shape covers item-state + range prerequisites.

### magic_item_brazier_of_commanding_fire_elementals

- **magic_item_root + MagicItemRecord kind** (new_subgraph) — UnitRecord has no magic_item kind. SpellRecord | ClassFeatureRecord | MasteryRecord are the only options. magic_item_root already exists in the v4 atom inventory but there is no corresponding surface type family.
- **RestResetCadence: dawn** (new_variant) — The brazier recharges at dawn, not on a short or long rest. No dawn cadence exists in RestResetCadence.
- **ClassFeatureActivationCost: magic_action** (new_variant) — The activation cost is a Magic action. ClassFeatureActivationCost only supports free and bonus_action.
- **create_companion + command_companion subgraph for magic items** (new_subgraph) — The core mechanic is summoning a creature (Fire Elemental) that obeys the user. create_companion and command_companion are v4 atoms but nothing in the surface types encodes a summoning effect family for magic items.
- **Companion duration: timed with dismiss option** (new_variant) — The elemental persists 1 hour, dies, or is dismissed as a Bonus Action. Dismissal-as-bonus-action is a new duration termination shape not present on any existing Duration variant.
- **Proximity constraint on activation** (new_variant) — Activation requires the user to be within 5 feet of the brazier. No proximity-to-item constraint exists in any activation cost or precondition shape.
- **Initiative placement for summoned companion** (new_variant) — The companion takes its turn immediately after the user on their Initiative count. No initiative-placement shape exists for summoned creatures.

### magic_item_brooch_of_shielding

- **MagicItemRecord + passive_grant family** (new_subgraph) — No MagicItemRecord exists in UnitRecord. The surface union only has SpellRecord | ClassFeatureRecord | MasteryRecord. Magic items need a top-level record kind ('magic_item') and a mechanics family for always-on passive effects ('passive_gra
- **attunement surface field on MagicItemRecord** (new_variant) — Items requiring attunement need a field (or attunement_slot resource reference) on the record. The v4 taxonomy has 'attunement_slot' as a resource atom, but there is no surface field or mechanics family to express it.
- **grant_immunity effect variant (named-source immunity)** (new_variant) — The brooch grants Immunity to damage specifically from Magic Missile — not general Force immunity and not a reaction-triggered negate. The existing negate_named_effect atom lives inside TriggeredReactionMechanics.effects and requires a reac

### magic_item_candle_of_invocation

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — UnitRecord has no 'magic_item' kind. The tracer's exhaustive switch covers only 'spell', 'class_feature', and 'mastery'. A new top-level record type and at least one mechanics family (e.g. 'activated_item' or 'persistent_item') are required
- **RollKind: 'ability_check'** (new_variant) — The candle grants Advantage on D20 Tests, which in SRD 5.2.1 means attack rolls, saving throws, AND ability checks. The current RollKind union is 'attack_roll' | 'saving_throw' — it cannot represent the full D20 Test scope.
- **Resource: burn_time (consumable duration resource)** (new_variant) — The candle tracks remaining burn time (4 hours total, deducted in 1-minute increments when lit). Neither 'use_count' nor 'charge' models a continuous-time consumable that can be snuffed and resumed. A 'burn_time' resource variant is needed.
- **waive_spell_slot_cost (effect atom)** (new_atom) — The candle allows Clerics and Druids within its light to cast prepared level 1 spells without expending spell slots. This is not 'grant_spell_access' (they already have the spells); it is a conditional resource-waiver. No existing effect at
- **DM-agenda: Gate to GM-chosen Outer Plane** (new_subgraph) — The alternative Gate mode links to a plane 'chosen by the GM or determined by rolling on a table'. The destination is DM-adjudicated, placing this outside deterministic core mechanics. If encoded at all it would require a dm_agenda signal.

### magic_item_carpet_of_flying

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The union only has SpellRecord, ClassFeatureRecord, and MasteryRecord. The v4 taxonomy lists magic_item_root as a source atom but types.ts has no corresponding record type, mechanics header, or paylo
- **ItemActivationMechanics (magic action cost)** (new_variant) — The carpet is activated by taking a Magic action. ClassFeatureActivationCost only models 'free' and 'bonus_action'. A magic-action activation cost (one of the StandardActionKind values) is not encodable.
- **SizeVariant (GM-chosen or random table)** (new_variant) — The carpet exists in 4 size variants with different Fly Speed and carry capacity, chosen by the GM or via a 1d100 table. No variant-table encoding exists in any mechanics family.
- **ConditionalSpeedModifier (load-based halving)** (new_variant) — The carpet's Fly Speed is halved when carrying more than its normal capacity. No conditional speed modifier shape (predicated on carried weight vs. capacity threshold) exists in any surface type.

### magic_item_censer_of_controlling_air_elementals

- **MagicItemRecord + magic_item UnitRecord kind** (new_subgraph) — UnitRecord is currently SpellRecord | ClassFeatureRecord | MasteryRecord. There is no magic_item variant. The v4 taxonomy lists magic_item_root as a source atom but the surface type system has no corresponding record kind or mechanics famil
- **summoning mechanics family (create_companion)** (new_subgraph) — The core effect is summoning a specific named creature type (Air Elemental) that obeys commands, acts on its own initiative, and persists until dismissed/dead/time-expired. The v4 taxonomy has a create_companion effect atom, but no surface
- **dawn reset cadence** (new_variant) — The censer recharges at next dawn — a wall-clock/day-cycle reset that is not any of the existing RestResetCadence kinds (short_or_long_rest | long_rest | short_rest | partial_short_full_long). Many magic items use this pattern; it needs its
- **magic_action activation cost** (new_variant) — The item is activated by taking the Magic action (a standard action kind in SRD 5.2.1). ClassFeatureActivationCost only allows free | bonus_action. A magic_action variant is needed for items and features that spend the Magic action.
- **bonus_action dismiss lifecycle** (new_variant) — The elemental can be dismissed as a Bonus Action by the wielder, as a named dismissal cost mid-duration. The existing expire/dismiss lifecycle atoms don't carry an action-cost on the dismiss itself — this is a wielder-chosen early terminati

### magic_item_cloak_of_arachnida

- **MagicItemRecord + magic_item UnitRecord kind** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. There is no MagicItemRecord variant and no magic_item family in types.ts. The v4 taxonomy has magic_item_root but the TS surface has never been widened to expose it. No honest e
- **passive_bundle family (multi-effect always-on attunement)** (new_subgraph) — The cloak grants four simultaneous passive benefits while worn and attuned. No existing spell/class-feature/mastery family models a bundle of heterogeneous always-on passive effects. The closest spell families (ongoing_effect, triggered_rea
- **RestResetCadence: dawn** (new_variant) — The Web property resets at the next dawn, not at a short or long rest. The current RestResetCadence union has short_or_long_rest, long_rest, short_rest, partial_short_full_long — none of which map to dawn.
- **charge resource in types.ts** (new_variant) — The Web casting property uses a per-dawn charge. The v4 taxonomy has a 'charge' resource atom, but types.ts only exposes use_count and spell_slot. A charge with dawn reset is mechanically distinct from use_count with rest reset.
- **grant_climb_speed (or modify_speed variant with speed-kind discriminant)** (new_atom) — Spider Climb grants a Climb Speed equal to the wearer's Speed. The v4 taxonomy has modify_speed but types.ts has no ClassFeatureEffect or magic-item effect variant for granting a typed movement speed. A 'climb' speed kind needs to be distin
- **web_immunity / traverse_difficult_terrain_as_normal (movement filter immunity)** (new_atom) — Spider Walk grants immunity to being restrained by webs and allows moving through web difficult terrain freely. No v4 atom covers 'immunity to a specific terrain/restraint type'. block_travel (v4) models blocking movement but not its negati

### magic_item_cloak_of_displacement

- **MagicItemRecord + passive_property family** (new_subgraph) — No magic_item kind exists in UnitRecord. The cloak is a worn item with an always-active passive property (not a spell, class feature, or mastery). A new top-level record kind and a mechanics family for passive worn/attuned effects are both
- **on_damage_taken_window** (new_atom) — The suppression of the displacement property is triggered by the wearer taking damage. The v4 window inventory has on_hit_window (attacker side) but no window that opens when the bearer of an effect receives damage. The cloak's temporary-di
- **condition_gate (Speed = 0 suppression)** (new_variant) — The cloak is suppressed whenever the wearer's Speed is 0. This is a continuous runtime-state predicate, not a windowed event. The current atom vocabulary has no gate or suppress condition tied to a numeric movement-speed check.
- **modify_roll_advantage on incoming attacks (attachment direction: self as target)** (new_variant) — The existing modify_roll_advantage atom applies to rolls made by the bearer. The cloak's effect must apply disadvantage to rolls made by OTHER creatures targeting the bearer. The current surface schema's attachment grammar has no way to exp

### magic_item_cloak_of_invisibility

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The type union is SpellRecord | ClassFeatureRecord | MasteryRecord only. A MagicItemRecord with its own mechanics family (or families) is required before any magic item can be encoded.
- **Condition: invisible** (new_variant) — The Cloak applies the Invisible condition. The Condition type currently only contains 'prone'. 'invisible' must be added.
- **RestResetCadence: daily_at_dawn (or recharge_at_dawn)** (new_variant) — Charges regain at dawn, not on a short or long rest. No dawn-based recharge cadence exists in RestResetCadence.
- **UseCountResource: dice-based recharge amount** (new_variant) — The recharge is a dice roll (1d3), not a fixed integer. UseCountResource.cap and all reset cadences assume fixed integer refill amounts.
- **ClassFeatureActivationCost (or item activation cost): magic_action** (new_variant) — The cloak is activated by taking the Magic action. Only 'free' and 'bonus_action' exist as activation cost variants. 'magic_action' is a named action type in StandardActionKind but has no activation cost variant.
- **Duration early-end: item_interaction (no action required)** (new_variant) — The effect ends early when the wearer pulls the hood down, which requires no action. This is an item-interaction early-end trigger not representable by existing Duration or lifecycle atoms.

### magic_item_cloak_of_the_manta_ray

- **MagicItemRecord + passive_while_attuned family** (new_subgraph) — No magic_item kind exists in UnitRecord. UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. The cloak requires a top-level MagicItemRecord type and a mechanics family for always-on passive effects granted while the item is worn
- **grant_underwater_breathing** (new_atom) — Underwater breathing is not a sense (grant_sense covers darkvision, blindsight, etc.) and is not covered by any existing v4 effect atom. It is a distinct physiological capability — the ability to breathe water as air.
- **modify_speed (grant swim speed variant)** (new_variant) — modify_speed exists in the v4 taxonomy atom inventory but is not surfaced in types.ts Effect types. Even if surfaced, it would need a variant that grants a new speed type (swim) at a fixed value, not just modifies an existing speed.

### magic_item_crystal_ball_of_mind_reading

- **MagicItemRecord** (new_subgraph) — UnitRecord has no 'magic_item' kind. The taxonomy lists magic_item_root as a source atom but there is no MagicItemRecord type or any MagicItemMechanics family in types.ts. No honest encoding is possible without this top-level record shape.
- **DcSource: fixed_dc** (new_variant) — The item provides spells at a fixed save DC of 17 that is independent of the wielder's spellcasting ability. Existing DcSource variants are caster_spell_save_dc and weapon_attack_dc — neither represents a hardcoded DC.
- **waive_concentration** (new_atom) — Detect Thoughts normally requires concentration, but the item explicitly removes that requirement for the copy it grants. No existing effect atom represents removing a spell's concentration requirement.
- **spell_dependency_lifecycle** (new_atom) — The Detect Thoughts granted by the item ends when Scrying ends — a cross-spell lifecycle dependency that is not modeled by existing lifecycle atoms (concentrate, persist, expire, dismiss). The Detect Thoughts is not concentration but is sti
- **Attachment: sensor** (new_variant) — Detect Thoughts targets creatures within 30 feet of the Scrying sensor, not within 30 feet of the caster. No existing Attachment variant represents 'range from a remote sensor created by another active spell'.
- **magic_item grant_spell_access mechanics family** (new_subgraph) — The item's core behavior is granting access to two spells (Scrying and Detect Thoughts) with modified parameters. There is no mechanics family for item-granted spell access with per-spell parameter overrides (fixed DC, waived concentration,

### magic_item_cube_of_force

- **MagicItemRecord** (new_subgraph) — UnitRecord has no 'magic_item' kind. SpellRecord | ClassFeatureRecord | MasteryRecord exhausts the union. A MagicItemRecord would need rarity, attunement flag, and a mechanics payload family distinct from spell/class-feature/mastery.
- **charge_pool_dispatcher family** (new_subgraph) — The item's core mechanic is a renewable charge pool (starts 10, regains 1d6 daily at dawn) where pressing one of six faces spends N charges and casts a specific spell at a fixed DC. No existing family (ongoing_effect, activation, triggered_
- **charge resource with dice-based daily recharge** (new_variant) — UseCountResource only models use_count with rest-based or fixed reset. The Cube of Force uses a shared charge pool (10 charges max) that regains 1d6 charges daily at dawn — a dice-roll partial recharge on a time cadence not expressible by R
- **DcSource: fixed numeric DC** (new_variant) — DcSource supports caster_spell_save_dc and weapon_attack_dc only. The Cube of Force specifies a fixed save DC of 17 that does not derive from the user's stats — requires a new { kind: 'fixed'; value: number } variant.
- **RestResetCadence: daily_at_dawn_dice** (new_variant) — RestResetCadence covers short_rest, long_rest, short_or_long_rest, and partial_short_full_long. A daily recharge that yields a random dice amount (1d6) at a fixed real-time cadence (dawn) is not a rest event and cannot be expressed with the

### magic_item_cubic_gate

- **MagicItemRecord** (new_subgraph) — The surface type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord has no magic_item variant. The v4 taxonomy lists magic_item_root as a source atom and the survey corpus includes many magic items (tier 2), but the TypeScript su
- **charge_recharge_daily_dice** (new_variant) — The item has 3 charges and regains 1d3 expended charges daily at dawn. The existing UseCountResource + RestResetCadence only models rest-based fixed refills. This requires a new recharge cadence variant: daily-at-dawn with a dice-valued ref
- **cast_named_spell_via_charge** (new_variant) — Each of the two item modes (Gate, Plane Shift) works by expending a charge to cast a named spell. The surface has no shape for 'consume charge → cast spell by reference'. The v4 atom inventory has stored_spell (attachment) and grant_spell_a
- **plane_keyed_side_selection** (new_variant) — The six faces are each keyed to a different plane determined by the GM. The portal or shift destination is the plane keyed to the pressed side. This is a DM-agenda assignment at item creation time, but the mechanical consequence (transport

### magic_item_dagger_of_venom

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The union only covers spell, class_feature, and mastery. Magic items require their own top-level record kind with distinct mechanics families (passive item properties, activated item charges, etc.).
- **RestResetCadence: dawn** (new_variant) — The dagger's poison coating resets at next dawn, which is not covered by short_rest, long_rest, short_or_long_rest, or partial_short_full_long.
- **Condition: poisoned** (new_variant) — The save gate on-fail result applies the Poisoned condition, but the Condition type currently only supports 'prone'.
- **DcSource: fixed** (new_variant) — The poison save uses a fixed DC 15 — not caster_spell_save_dc (no caster) and not weapon_attack_dc (which is 8 + ability mod + PB). A fixed numeric DC is a distinct variant.

### magic_item_dancing_sword

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The current union is SpellRecord | ClassFeatureRecord | MasteryRecord. Magic items need a new top-level record type (UnitMetadata & { kind: 'magic_item'; requiresAttunement: boolean; mechanics: Magic
- **attack_proxy_family** (new_subgraph) — The Dancing Sword creates an autonomous weapon proxy that flies, repositions, and attacks independently using the wielder's attack roll and ability modifier. It tracks a 4-attack budget before auto-returning. No existing mechanics family (o
- **attune procedure in surface types** (new_variant) — Attunement is a prerequisite for this item and is listed as a v4 atom ('attune') in TAXONOMY_atoms_graph.md, but there is no attunement_slot resource, no attune procedure, and no attunement_slot cap in types.ts. Any honest MagicItemRecord e

### magic_item_deck_of_illusions

- **MagicItemRecord** (new_variant) — UnitRecord has no magic_item kind. The tracer's exhaustive switch on unit.kind throws on any value other than spell, class_feature, mastery. A MagicItemRecord needs at minimum: id, name, provenance, description, kind: 'magic_item', attuneme
- **magic_item_activation family** (new_subgraph) — Magic items have a distinct activation pattern: the item itself is a persistent resource container (charges or consumable cards); activation draws from that resource and fires an effect. This does not reduce to SpellMechanics (no level/scho
- **create_illusion** (new_atom) — The Deck creates an illusory creature — not a real companion, not an inert object. SRD specifies it looks and behaves like a real creature but can do no harm, objects pass through it, and it is identifiable by a DC 15 INT (Investigation) ch
- **random_table_resolution** (new_variant) — The creature created is determined by rolling on a d100 table at draw time. No existing surface type models non-deterministic table-resolved outcomes. This is not a save_gate or attack_roll — it is a DM-visible random selection from a close
- **per_card_use_count** (new_variant) — Each card in the deck is individually consumable: once its illusion ends, its image disappears and the card cannot be used again. The existing UseCountResource models a refillable pool; deck-card depletion is a non-refilling, per-instance r

### magic_item_defender

- **MagicItemRecord** (new_subgraph) — UnitRecord has no magic_item kind. types.ts only exports SpellRecord | ClassFeatureRecord | MasteryRecord. A MagicItemRecord family is required before any magic item can be encoded.
- **passive_enchantment family** (new_subgraph) — The +3 bonus to attack rolls and damage rolls is a passive always-on property of the weapon, not an activated effect. No existing mechanics family (activation, ongoing_effect, on_hit_trigger) models a passive item enchantment that applies w
- **attunement procedure** (new_subgraph) — The item requires attunement. The v4 taxonomy has an 'attune' procedure atom and 'attunement_slot' resource atom, but neither is represented in types.ts. Encoding attunement requires new surface types for the attune procedure and attunement
- **variable_bonus_split operation** (new_variant) — The transfer mechanic lets the wielder dynamically reallocate a shared +N bonus between two targets (attack/damage rolls vs AC). The split is a free integer choice per first-attack-of-turn (e.g., +1 attack/+2 AC, or +0 attack/+3 AC). Curren

### magic_item_dragon_scale_mail

- **MagicItemRecord** (new_variant) — No magic_item kind exists in UnitRecord. types.ts defines UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord only. The v4 taxonomy has magic_item_root but the surface schema has no corresponding record type.
- **passive_bundle** (new_subgraph) — Dragon Scale Mail's three passive benefits (+1 AC, Advantage on breath weapon saves, Resistance) are always-on while attuned and worn. No existing mechanics family models a set of always-on passive effects that activate on attunement rather
- **scoped_advantage_on_save** (new_variant) — The Advantage rider applies specifically to saving throws against dragon breath weapons. The existing modify_roll_advantage type accepts only a list of RollKind values (attack_roll, saving_throw) with no mechanism to filter by trigger conte
- **discern_location** (new_atom) — The active ability (Magic action, once per dawn) outputs directional/distance information about the nearest creature of a specified type within a range. No v4 atom covers this. grant_sense covers perceptual senses (darkvision, truesight) bu
- **dawn_reset** (new_variant) — The active use recharges at the next dawn. The existing RestResetCadence type covers short_rest, long_rest, short_or_long_rest, and partial_short_full_long. Dawn is a time-of-day event, not a rest event, and cannot be expressed by any exist

### magic_item_dust_of_sneezing_and_choking

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord. The v4 taxonomy has magic_item_root but the surface schema has no corresponding record shape, mechanics header, or payload fami
- **AreaOrigin: self_emanation** (new_variant) — The dust creates a 30-foot Emanation originating from the user, not from a chosen point within range. AreaOrigin currently has point_within_range and on_primary_target. Neither is 'centered on self at cast time'.
- **Condition: incapacitated** (new_variant) — Condition type only defines 'prone'. Incapacitated is a standard SRD condition applied on a failed save. At minimum incapacitated (and likely all SRD conditions) must be added.
- **Status: suffocating** (new_variant) — Suffocating is not a named SRD condition but a rules state (creature cannot breathe). It is a distinct mechanical status from Incapacitated and needs its own atom or surface variant.
- **SaveGate: creature_type_exemption filter** (new_variant) — Certain creature types (Constructs, Elementals, Oozes, Plants, Undead) auto-succeed on the save. There is no surface type for creature-type-based exemptions on save gates.
- **OngoingEffect: repeat_save per turn** (new_variant) — The applied condition persists until the target succeeds on a CON save at the end of each of its turns. The v4 taxonomy has repeat_save as an atom, but there is no surface shape for per-turn repeat saves in either the spell or (nonexistent)
- **EffectCure: named_spell_targets** (new_variant) — The effect ends if the creature is targeted by Lesser Restoration. There is no surface type for named-spell-as-cure triggers on ongoing conditions.

### magic_item_dwarven_plate

- **MagicItemRecord / magic_item UnitRecord kind** (new_subgraph) — types.ts UnitRecord is SpellRecord | ClassFeatureRecord | MasteryRecord — no MagicItemRecord exists. The taxonomy has magic_item_root but the surface has never been widened to include the kind.
- **passive_while_worn mechanics family** (new_subgraph) — The +2 AC bonus is always-on with no activation cost, no use-count resource, and no rest reset. The existing ClassFeatureActivationMechanics family requires all three. A 'passive_while_worn' family (or equivalent 'passive' family) is needed
- **reduce_forced_movement (effect)** (new_atom) — The reaction effect reduces the distance of forced movement by up to 10 feet. No v4 atom covers this: force_move emits forced displacement, modify_speed changes speed, and modify_ac changes AC. Reducing forced movement distance is mechanica
- **ReactionTrigger: moved_against_will_along_ground** (new_variant) — The reaction trigger is 'moved against your will along the ground' — a forced-movement trigger. The existing ReactionTrigger union covers hit_by_attack_roll, targeted_by_named_spell, and any_of, but has no variant for forced-movement events
- **attunement_slot resource in types.ts** (new_variant) — Dwarven Plate is Very Rare and requires attunement. The v4 taxonomy lists attunement_slot as a resource atom, but it is absent from types.ts UseCountResource and the broader resource type vocabulary. The item's lifecycle must consume an att

### magic_item_elven_chain

- **MagicItemRecord + magic_item UnitRecord kind** (new_subgraph) — No magic_item kind exists in UnitRecord. types.ts only defines SpellRecord, ClassFeatureRecord, and MasteryRecord. The v4 taxonomy lists magic_item_root as a source atom and attune as a procedure atom, but the schema layer never wired them
- **passive_property mechanics family** (new_subgraph) — Elven Chain's +1 AC and proficiency grant are always-on while worn — no activation cost, no use-count, no spell slot. The existing families (activation for class features, on_hit_trigger for masteries, spell families for spells) all require
- **grant_proficiency as a surface effect type** (new_variant) — grant_proficiency exists in v4 taxonomy (§9 Effect Atoms) but is not exposed in types.ts as any Effect or ClassFeatureEffect variant. Elven Chain's training override — 'considered trained with this armor even if you lack training' — require
- **modify_ac as a standalone passive effect (not just ReactionEffect)** (new_variant) — modify_ac appears in types.ts only as a ReactionEffect (Shield-style: fires once, during a triggered reaction window). Elven Chain's +1 AC is a persistent addend while worn — not reaction-gated. A passive modify_ac variant (or a worn_proper

### magic_item_eversmoking_bottle

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. There is no MagicItemRecord type. The v4 taxonomy defines magic_item_root as a source atom, but types.ts has never been widened to include the corresponding record or any mechan
- **ClassFeatureActivationCost.magic_action (or a parallel activation-cost type for items)** (new_variant) — The bottle costs a Magic action to activate. Existing ClassFeatureActivationCost only supports 'free' and 'bonus_action'. Magic action is a distinct SRD action kind that consumes the Magic action quota.
- **toggle_effect family (stateful open/close with two distinct persistent states)** (new_subgraph) — The bottle has a stateful toggle: open produces an active, growing emanation; close transitions the cloud to a fixed, slowly dispersing state. No existing mechanics family models a persistent object toggle where opening and closing produce
- **Attachment kind: emanation_from_object (item-anchored sphere that follows the item)** (new_variant) — The smoke fills a 60-ft Emanation originating from the bottle itself — an item attachment, not self (creature) or a placed area. Current Attachment kinds are self | target | area | mark. None models an area that originates from and moves wi
- **LevelAxis or scaling kind for time-based area growth** (new_variant) — The Emanation grows 10 ft per minute while open (60 ft → 120 ft cap). Existing LevelAxis values are character | class | slot | subclass | proficiency_bonus — none cover time-based (per-minute) growth. A new axis or a separate time-growth sh
- **apply_obscurement (or grant_heavy_obscurement area effect)** (new_atom) — The smoke makes the affected area Heavily Obscured — a vision-blocking environmental effect. The v4 taxonomy has block_targeting but no surface effect type represents granting obscurement to an area. This is mechanically distinct from block
- **Duration or dispersal lifecycle: conditional_dispersal (time + environmental trigger)** (new_variant) — The fixed cloud disperses after 10 minutes OR after 1 minute in strong wind (Gust of Wind). No existing Duration or lifecycle atom handles a dual-condition dispersal (timer + named environmental event). The timed Duration in types.ts has no

### magic_item_eyes_of_minute_seeing

- **MagicItemRecord + magic_item kind** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord — no MagicItemRecord exists. The tracer's traceUnit switch has no 'magic_item' branch and would throw. The v4 taxonomy lists magic_item_root as a source atom, but the surface typ
- **passive_equip mechanics family** (new_subgraph) — Eyes of Minute Seeing has no activation, no casting time, no use count, no reset cadence. Its effects are always-on while the item is worn. No existing mechanics family (activation, ongoing_effect, triggered_reaction, anchored_trigger, on_h
- **grant_sense (surface exposure)** (new_atom) — grant_sense exists in the v4 taxonomy (§9 Effect Atoms) but is not defined in types.ts as a surface type. The Darkvision-within-1-foot effect maps directly to grant_sense, but the surface type system has no GrantSenseEffect variant. The tra
- **ability_check in RollKind** (new_variant) — RollKind = 'attack_roll' | 'saving_throw'. The Advantage on Intelligence (Investigation) checks effect needs a third variant 'ability_check' (or a typed sub-variant like 'intelligence_check'). The existing modify_roll_advantage shape requir

### magic_item_figurine_of_wondrous_power

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord has no magic_item kind. The taxonomy lists magic_item_root as a source atom but types.ts has no MagicItemRecord, no MagicItemMechanics, and no mechanics family to house it. Every existing family (activation, ongoing_effect, on_hi
- **day_cooldown variant of RestResetCadence (or new ItemRechargeKind)** (new_variant) — Figurine recharge is measured in days (2, 5, 7, 15, 30 days) — not short/long rest. RestResetCadence has no variant for calendar-time recharge. A new closed type (e.g. DayCooldown { days: number }) is needed.
- **charge_pool with day-recharge (Goat of Traveling pattern)** (new_variant) — Goat of Traveling uses a 24-charge pool where each hour of use costs 1 charge and the pool recharges after 7 days when empty. This is neither use_count (fixed cap + rest reset) nor spell_slot. Needs a charge resource with duration-based con
- **multi-variant item (one item slug, several named sub-configurations)** (new_variant) — The Figurine of Wondrous Power is a single item category with nine distinct named variants (Bronze Griffon, Ebony Fly, Golden Lions, Ivory Goats × 3, Marble Elephant, Obsidian Steed, Onyx Dog, Serpentine Owl, Silver Raven). No surface type
- **create_companion mechanics subgraph** (new_subgraph) — The core effect is summoning a named creature that acts as a friendly companion with initiative placement, obeys commands, and reverts on 0 HP or dismissal. The v4 atom create_companion exists but there is no surface mechanics shape that ex
- **probabilistic_override (Obsidian Steed 10% disobedience)** (new_atom) — The Obsidian Steed has a 10% per-use chance to ignore all commands including revert. This is not representable by any existing resolution atom (attack_roll, save_gate, ability_check). It requires a probability-weighted override that bypasse

### magic_item_folding_boat

- **MagicItemRecord + MagicItemMechanics family** (new_subgraph) — UnitRecord has no 'magic_item' kind. types.ts defines only SpellRecord, ClassFeatureRecord, MasteryRecord. magic_item_root exists in v4 taxonomy but no corresponding record type or mechanics family exists in the surface.
- **alter_item_kind** (new_atom) — The Folding Boat's core mechanic is transforming between three physical forms (box → Rowboat, box → Keelboat, vessel → box). The v4 taxonomy lists alter_item_kind under Effect Atoms, but it is absent from types.ts. This atom would be requir
- **command_word activation cost (multi-command pattern)** (new_variant) — The item exposes three discrete command words, each a Magic action, with different effects. No multi-command-word surface structure exists. ClassFeatureActivationCost has 'free' and 'bonus_action'; there is no 'magic_action' cost kind and n
- **activation precondition guard** (new_variant) — The third command word is conditionally effective — it only works 'if no creatures are aboard'. No precondition check shape exists anywhere in the surface type system.

### magic_item_frost_brand

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — No `magic_item` kind exists in the UnitRecord union. types.ts defines only SpellRecord | ClassFeatureRecord | MasteryRecord. The v4 taxonomy lists `magic_item_root` as a source atom but it is not wired into the surface schema. A MagicItemRe
- **passive_while_holding mechanics family (or passive_aura)** (new_subgraph) — Frost Brand grants Fire resistance unconditionally while the weapon is held/attuned. No existing mechanics family covers a passive always-on effect tied to item possession. The ClassFeatureActivationMechanics requires an activationCost; OnH
- **RestResetCadence: time_based** (new_variant) — The flame-extinguishing property recharges after 1 hour, not after a short or long rest. RestResetCadence is a closed union covering short_or_long_rest | long_rest | short_rest | partial_short_full_long. A time_based variant (e.g., { kind:
- **extinguish_flames (or modify_environment)** (new_atom) — The draw-action property extinguishes all nonmagical flames in a 30-foot radius. No v4 effect atom covers environmental flame manipulation. The closest existing atoms (damage, apply_condition, force_move) do not represent this.

### magic_item_gem_of_seeing

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — UnitRecord in types.ts has no 'magic_item' kind. The tracer's exhaustive switch on unit.kind covers only spell | class_feature | mastery. A MagicItemRecord type and at least one magic-item mechanics family (charge-based activation) must be
- **daily_at_dawn recharge cadence (dice-based)** (new_variant) — The gem regains 1d3 charges daily at dawn. RestResetCadence only models short-rest and long-rest refills; no variant covers time-of-day recharge with a random dice amount.
- **magic_action activation cost** (new_variant) — Activation costs a Magic action (one of the 12 StandardActionKind values). ClassFeatureActivationCost only has 'free' and 'bonus_action'; a 'magic_action' variant is needed for magic items that consume the Magic action.
- **grant_sense effect (Truesight)** (new_variant) — The primary effect is Truesight out to 120 ft for 10 minutes. The v4 atom 'grant_sense' exists in TAXONOMY_atoms_graph.md but no corresponding TypeScript surface type exists in any Effect union (ClassFeatureEffect, Effect, ReactionEffect).

### magic_item_giant_slayer

- **MagicItemRecord + magic_item kind in UnitRecord** (new_subgraph) — UnitRecord has no 'magic_item' kind. types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord. The TAXONOMY lists magic_item_root as a v4 source atom but the surface has never been extended to include it. All magic items are b
- **passive_weapon_bonus family (always-on +N to attack and damage rolls)** (new_variant) — The +1 bonus to attack rolls and damage rolls is always-on while wielding; no existing family (activation, on_hit_trigger, ongoing_effect) models a passive item property that requires no activation, no quota, and no concentration. A new fam
- **creature_type_filter on on-hit trigger (Giant-only rider)** (new_variant) — MasteryTrigger only gates on weapon_hit / weapon_hit_melee_only with no creature-type predicate. Giant Slayer's rider fires only against creatures of type Giant. Encoding this without a filter would dishonestly apply the rider to all weapon
- **weapon_damage_type as a DamageType variant or special alias** (new_variant) — DamageType is a closed enum of specific damage types (slashing, piercing, etc.). Giant Slayer deals 'damage of the weapon's type', which is resolved at runtime from the weapon. There is no 'weapon_damage_type' or 'inherited' variant in Dama

### magic_item_glamoured_studded_leather

- **MagicItemRecord + magic_item kind** (new_subgraph) — UnitRecord has no magic_item kind. SpellRecord, ClassFeatureRecord, and MasteryRecord all require domain-specific header fields (spell level/school, className/acquiredAtLevel, on_hit_trigger family) that are inapplicable to a magic item. A
- **passive_always_on family for MagicItemMechanics** (new_subgraph) — The +1 AC bonus is always active while wearing — no activation cost, no resource consumed, no trigger. All current families (activation, ongoing_effect, triggered_reaction, anchored_trigger, on_hit_trigger) require an activation event or sp
- **activated_property family for MagicItemMechanics** (new_subgraph) — The glamour property is a Bonus Action activation that applies alter_item_kind effect. It needs: bonus_action_quota consumed, alter_item_kind effect (v4 atom exists), and a novel expiry model ('until you use this property again or doff the
- **item_doffed expiry variant for lifecycle atoms** (new_variant) — The glamour lasts 'until you use this property again or doff the armor.' Neither turn_start_window, turn_end_window, rest_window, nor expire covers an equip/doff event. An item_doffed lifecycle event (or equip_window atom) is needed to repr

### magic_item_gloves_of_missile_snaring

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord has no magic_item variant. The v4 taxonomy lists magic_item_root as a source atom, but src/surface/types.ts has no MagicItemRecord type, no magic_item kind discriminant, and no m
- **reduce_damage_taken** (new_atom) — The item's core mechanic reduces incoming damage by 1d10 + Dex modifier. None of the existing effect atoms cover this: damage applies outgoing damage, modify_ac is a static AC delta, grant_resistance halves a damage type, modify_roll_numeri
- **ReactionTrigger: hit_by_ranged_or_thrown_weapon_attack** (new_variant) — The existing ReactionTrigger union has hit_by_attack_roll (used by Shield) but carries no weapon-kind filter. This item fires specifically on ranged or thrown weapon attack rolls, not melee or spell attacks. Encoding it as bare hit_by_attac

### magic_item_goggles_of_night

- **MagicItemRecord + passive_property family** (new_subgraph) — No MagicItemRecord exists in UnitRecord. Magic items that are always-on while worn need a new top-level record kind and a new mechanics family distinct from spell/class-feature/mastery activation patterns.
- **grant_sense surface type (darkvision with range)** (new_variant) — The v4 atom inventory lists grant_sense but types.ts has no surface type expressing it. A darkvision grant requires a sense kind (darkvision) and a range in feet.
- **conditional sense extension: grant if absent, extend if present** (new_variant) — The item has two branches: grant 60ft darkvision if the wearer lacks it, or extend existing darkvision by 60ft. This conditional-extension pattern does not map to any existing effect atom or surface shape.

### magic_item_hat_of_disguise

- **MagicItemRecord** (new_subgraph) — UnitRecord has no 'magic_item' kind. The surface type union only contains SpellRecord | ClassFeatureRecord | MasteryRecord. A MagicItemRecord variant (with id, name, provenance, description, and a MagicItemMechanics discriminant) is require
- **MagicItemMechanics / spell_grant family** (new_subgraph) — The hat's mechanic is: while attuned and wearing the item, you may cast a named spell (Disguise Self) at will with no spell slot consumed. No existing family (ongoing_effect, activation, triggered_reaction, anchored_trigger, class-feature a
- **Duration: while_worn (item-conditioned expiry)** (new_variant) — The spell ends when the hat is removed. Disguise Self's normal duration is 1 hour (timed), but here the expiry is additionally conditioned on the item being worn. None of the existing Duration variants (instantaneous, concentration, timed)
- **AttunementRequirement on MagicItemRecord** (new_variant) — The item requires attunement. The attune procedure atom exists in v4, but the surface type has no field or subtype to record whether a magic item requires attunement and which attunement_slot it binds. MagicItemRecord needs an attunement fi

### magic_item_hat_of_many_spells

- **MagicItemRecord + MagicItemMechanics family** (new_subgraph) — No 'magic_item' kind exists in UnitRecord. The taxonomy defines magic_item_root as a source atom but the surface has no record shape for magic items at all. A MagicItemRecord (with id, name, provenance, description, attunement requirements,
- **ability_check resolution phase in ActivationPhase** (new_variant) — The Unknown Spell property is gated by an Intelligence (Arcana) ability check, not a saving throw. The ability_check atom exists in v4 taxonomy but there is no ActivationPhase variant (nor ClassFeatureMechanics variant) for ability_check re
- **grant_spell_access effect (runtime-selected, unknown spell from list)** (new_variant) — The core success outcome is casting a spell not in the caster's repertoire, chosen at activation time, from a class list, at a castable slot level. The grant_spell_access atom exists in v4 taxonomy but there is no surface variant for runtim
- **random_outcome_table — stochastic failure branch with d100 dispatch** (new_subgraph) — On a failed ability check, a d100 table fires with 10 distinct outcome bands, several of which nest further sub-tables (d10, d4, d6). Outcomes include conditions (Stunned, Poisoned, Petrified), creature summoning, object creation, portal op

### magic_item_headband_of_intellect

- **MagicItemRecord** (new_subgraph) — UnitRecord in types.ts is SpellRecord | ClassFeatureRecord | MasteryRecord. There is no magic_item kind or MagicItemMechanics family. The v4 taxonomy lists magic_item_root as a source atom and attune as a procedure atom, but the surface has
- **modify_ability_score** (new_atom) — The headband's sole mechanical effect is setting the wearer's Intelligence to 19. This is a passive ability-score override, not covered by any existing effect atom. TAXONOMY v4 §12 explicitly lists this as out-of-scope: 'modify_ability_scor
- **attunement mechanics** (new_variant) — The item requires attunement. The v4 taxonomy has attunement_slot (resource) and attune (procedure) atoms, but no surface type captures the attunement lifecycle for magic items (equip → attune → effect active; unequip/break attunement → eff

### magic_item_helm_of_comprehending_languages

- **MagicItemRecord + passive_while_worn mechanics family** (new_subgraph) — The unit's kind is 'magic_item', which does not exist in the UnitRecord union (SpellRecord | ClassFeatureRecord | MasteryRecord). No MagicItemRecord type or associated mechanics family is defined in types.ts. The tracer's traceUnit switch h
- **attunement flag on MagicItemRecord (optional, not required here)** (new_variant) — Magic items in the SRD may or may not require attunement. This item does not (no 'Requires Attunement' tag), but a MagicItemRecord type must be able to represent both states without making attunement the default assumption. An optional 'req

### magic_item_helm_of_teleportation

- **MagicItemRecord + MagicItemMechanics family** (new_subgraph) — UnitRecord in types.ts has no magic_item kind. The v4 taxonomy lists magic_item_root as a source atom, but no MagicItemRecord or MagicItemMechanics type exists in the surface layer. This blocks encoding any magic item.
- **RestResetCadence: daily_at_dawn (with dice refill)** (new_variant) — The helm regains 1d3 charges daily at dawn. No existing RestResetCadence variant covers dawn-cycle recharge, and none support a dice-roll refill amount (all existing variants use fixed integers).
- **ChargeResource with attunement_slot linkage** (new_variant) — Charge-based items differ structurally from use_count class features: they carry a DiceAmount-typed refill (1d3), link to an attunement_slot, and the resource is on the item rather than the character. UseCountResource has no dice-roll refil
- **MagicItemEffect: cast_stored_spell (expend charge to cast a named spell)** (new_variant) — The item's core effect is 'expend 1 charge to cast Teleport from the item'. This is a stored_spell + attune + activate pattern. No surface type currently models spell-from-item casting. The closest existing surface shapes (GrantExtraActionE

### magic_item_holy_avenger

- **MagicItemRecord + magic_item mechanics family** (new_subgraph) — UnitRecord has no magic_item variant. types.ts defines only SpellRecord, ClassFeatureRecord, and MasteryRecord. Magic items require a distinct record kind (attunement, rarity, equip-slot) and a mechanics family that can express passive pers
- **creature_type_filter on DamageOnHitOperation** (new_variant) — The extra 2d10 Radiant damage fires only against Fiends and Undead. DamageOnHitOperation has no targetFilter field. A closed enum of creature types (fiend, undead, dragon, …) would be needed as a filter predicate on the damage rider.
- **emanation attachment with friendly-creature scope** (new_variant) — The aura is a self-centered emanation (not a point-origin sphere). It applies to the wielder and all 'Friendly' creatures inside it. Existing Attachment has `area` with shape `sphere` and `origin: point_within_range | on_primary_target` — n
- **class_level_threshold scaling on area radius** (new_variant) — The emanation radius jumps from 10 ft to 30 ft when the wielder has 17+ Paladin levels. No existing DiceAmount or scaling variant addresses threshold-tiered growth of an attachment's radius based on a named class level. A ThresholdTiers<num
- **damage_roll as a RollKind** (new_variant) — RollKind = 'attack_roll' | 'saving_throw'. The +3 bonus applies to damage rolls, which are neither. Expressing weapon bonus modifiers (attack + damage) requires adding 'damage_roll' to RollKind or introducing a dedicated weapon_modifier sur

### magic_item_instant_fortress

- **MagicItemRecord + magic_item family** (new_subgraph) — types.ts has no MagicItemRecord. UnitRecord is SpellRecord | ClassFeatureRecord | MasteryRecord — magic_item is not representable at all. The TAXONOMY lists magic_item_root as a v4 source atom but the surface type system never gained the co
- **create_object mechanics family with persistent object HP/AC profile** (new_subgraph) — The Instant Fortress's primary effect is conjuring a physical structure with its own AC, HP, damage immunities, and resistances. No existing spell or class-feature mechanics family encodes 'create a persistent destructible object with typed
- **attunement surface field** (new_variant) — The item requires attunement, which the surface has no way to record. The v4 attunement_slot resource atom exists, but no surface record type exposes an attunement field.
- **bidirectional_transform activation (grow/shrink)** (new_variant) — The item has two command-word activations: one grows the statuette into a tower, and one shrinks it back (conditional on the tower being empty). No existing family models a reversible object-transform with a precondition on reversal.
- **force_move (area displacement on object creation)** (new_atom) — Creatures in the area where the tower appears are pushed to adjacent unoccupied spaces. This is a force_move effect triggered by object instantiation, not by an attack roll or save gate. force_move exists in v4 taxonomy but no surface encod
- **Bonus Action door-control sub-activation** (new_variant) — The door opens and closes via a separate Bonus Action command — a second distinct activation on the same item that modifies a property of the created object. No surface mechanic covers sub-activations on created objects.

### magic_item_ioun_stone

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. No MagicItemRecord exists. The tracer exhaustive switch covers only 'spell', 'class_feature', 'mastery' — kind: 'magic_item' throws unhandled.
- **modify_ability_score** (new_atom) — Agility, Fortitude, Insight, Intellect, Leadership, Strength variants grant +2 to an ability score capped at 20. Taxonomy v4 explicitly lists modify_ability_score as out-of-scope residue. First concrete pressure from magic item validation.
- **negate_spell_by_level (ReactionEffect variant)** (new_variant) — Absorption cancels any spell of level 4 or lower; Greater Absorption level 8 or lower. Existing negate_named_effect requires a specific spellId. A level-ceiling negate needs a new variant shape.
- **level-sum charge counter** (new_variant) — Absorption burns out after absorbing 20 cumulative spell levels, not 20 uses. Existing charge atom tracks discrete use counts. A running level-sum counter with a maximum cap is a structurally distinct shape.
- **periodic_heal (hourly cadence)** (new_atom) — Regeneration grants 15 HP at end of each hour. No existing window atom covers an hourly real-time cadence — rest_window covers short/long rests, turn_end_window covers combat turns. An hour-cadence window is a new shape.
- **modify_proficiency_bonus** (new_atom) — Mastery variant increases PB by 1. No v4 effect atom covers direct PB modification as a worn-item passive. scale_numeric_bonus modifies existing numeric values inside a feature; this is a persistent bonus to the PB stat itself.
- **RollKind: 'ability_check' / 'initiative'** (new_variant) — Awareness grants Advantage on Initiative rolls and Wisdom (Perception) checks. RollKind = 'attack_roll' | 'saving_throw' only — no ability_check or initiative variant exists.
- **stored_spell payload family (Reserve variant)** (new_subgraph) — Reserve stores up to 4 spell levels; any creature can cast spells into it; owner casts stored spells using original caster's DC/attack bonus. This is a multi-party spell-storage/relay flow with no existing family analog.

### magic_item_iron_bands

- **MagicItemRecord + magic_item payload family** (new_subgraph) — UnitRecord has no magic_item kind. The TAXONOMY has magic_item_root as a v4 source atom, but types.ts defines no corresponding record shape or mechanics family. Any honest encoding of Iron Bands (or any magic item) requires this structural
- **Condition: 'restrained'** (new_variant) — Iron Bands applies the Restrained condition on a hit. The Condition type currently only includes 'prone', which was added for Topple mastery. Restrained is a distinct SRD condition with different mechanical consequences.
- **AttackKind: 'ranged_weapon_attack' (non-spell)** (new_variant) — Iron Bands uses a ranged attack roll with Dex modifier + Proficiency Bonus — the same formula as a ranged weapon attack, not a spell attack roll. AttackKind only covers ranged_spell_attack and melee_spell_attack.
- **RestResetCadence: 'dawn'** (new_variant) — Iron Bands recharges at the next dawn, which is a distinct cadence not expressible by short_rest, long_rest, short_or_long_rest, or partial_short_full_long.
- **ActivationPhase or resolution: 'ability_check'** (new_variant) — A creature touching the bands can take an Action to make a DC 20 Strength (Athletics) check to break free. This is an ability_check resolution (v4 taxonomy has the atom, but it is absent from the surface ActivationPhase discriminated union)
- **item_destroy (or 'destroy_item' effect)** (new_atom) — On a successful Athletics check the iron bands are destroyed. No v4 effect atom covers item self-destruction as a mechanical outcome. The closest atoms (alter_item_kind, fall_on_end) do not cover this.
- **Automatic-failure state on ability check (repeated-failure lock)** (new_atom) — After a failed break-free attempt, further attempts by that creature automatically fail for 24 hours. This is a stateful cooldown on an ability-check attempt that has no analog in the current atom inventory.

### magic_item_iron_flask

- **magic_item kind + mechanics family** (new_subgraph) — UnitRecord has no 'magic_item' variant. The TAXONOMY v4 defines magic_item_root as a source atom but types.ts has never been widened to include a MagicItemRecord kind or any corresponding mechanics family. Without this, no honest encoding i
- **planar_origin_filter on save_gate precondition** (new_variant) — The trapping save only fires when 'the target is native to a plane of existence other than the one you're on'. This is a guard condition on the save gate that depends on the target's planar origin — a concept with no representation in DcSou
- **item_state (empty / occupied) as activation precondition** (new_variant) — The trapping action can only be taken when 'the flask is empty'. This is a mutable item-level state (empty vs. contains a creature) that gates activation — no current surface type models persistent item state as an activation precondition.
- **per-target history modifier on save advantage** (new_variant) — 'If the target has been trapped by the flask before, it has Advantage on the save.' This is conditional advantage based on a per-target usage history — the save modifier depends on whether this specific target has been trapped by this speci
- **extradimensional_imprisonment (duration: indefinite, until released)** (new_atom) — The trapping effect is not a timed exile (transport_exile maps to banishment-style temporary removal). The creature 'remains in the flask until released' with no time limit and no repeated save opportunity — this is a permanent-until-explic
- **command_obedience (timed, post-release)** (new_atom) — After releasing the creature, 'the creature then obeys your commands for 1 hour'. This is a timed obedience/domination effect with edge-case behavior (defends itself if no commands or harmful commands issued). The v4 command_companion atom

### magic_item_javelin_of_lightning

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord — there is no MagicItemRecord. The v4 taxonomy includes magic_item_root as a source atom with validation passes logged, but the surface types.ts has no corresponding record kind
- **alter_damage_type** (new_atom) — The always-available passive property lets the wielder substitute Lightning for Piercing damage on any hit. No existing effect atom covers damage-type substitution. This is mechanically distinct from grant_resistance (reduces incoming damag
- **Attachment area shape: line** (new_variant) — The Lightning Bolt property creates a 5-foot-wide Line between the caster and the target. The current Attachment area shape union only contains sphere. A line shape (defined by two endpoints — self and target, with a width) is structurally
- **RestResetCadence: dawn** (new_variant) — The Lightning Bolt property resets at the next dawn, which is neither a short rest, long rest, nor the partial_short_full_long pattern. Dawn-cadence resets appear across many magic items and require a distinct cadence variant.
- **forgo_attack_roll alternative activation** (new_subgraph) — The Lightning Bolt property explicitly lets the player skip making a ranged attack roll and instead fire a save-gated AoE. The surface has no mechanism for 'in place of the normal attack roll resolution, substitute an AoE save_gate.' This i

### magic_item_lantern_of_revealing

- **magic_item_record** (new_subgraph) — UnitRecord has no magic_item kind. MagicItemRecord is absent from the type system entirely — SpellRecord, ClassFeatureRecord, and MasteryRecord are the only options, none of which accept item-specific metadata (rarity, attunement, item type
- **passive_aura_family** (new_subgraph) — The lantern's core mechanic is a persistent spatial effect (light emission + invisibility reveal) that is always-on while the item is lit. No existing mechanics family covers passive item properties — all families require an activation even
- **reveal_invisible** (new_atom) — Making invisible creatures and objects perceptible within the lantern's Bright Light is mechanically distinct from grant_sense (which grants a sense capability to a creature) and from any existing effect atom. The effect suppresses the conc
- **utilize_action_cost** (new_variant) — The hood-lowering uses a Utilize action. ClassFeatureActivationCost only has 'free' and 'bonus_action'; StandardActionKind includes 'utilize' but no activation cost variant maps to it. A magic item mechanics layer would need utilize_action

### magic_item_luck_blade

- **MagicItemRecord + MagicItemMechanics** (new_subgraph) — UnitRecord only covers spell | class_feature | mastery. There is no magic_item kind at all. The entire record shape, mechanics header, and family taxonomy are missing.
- **dawn reset cadence in RestResetCadence** (new_variant) — Both Luck and Wish properties reset 'until the next dawn'. RestResetCadence has short_or_long_rest, long_rest, short_rest, partial_short_full_long — none covers a dawn-based reset, which is the standard magic item recharge cadence.
- **passive_item_bonus family (always-on numeric modifier while wielded/on person)** (new_variant) — The +1 attack/damage (while wielded) and +1 saving throws (while on person) are persistent, passive bonuses — not activations, not concentration. No existing ClassFeatureMechanics or MasteryMechanics family captures an always-on numeric mod
- **charge-based spell casting (item charges, expend 1 to cast a named spell)** (new_variant) — Wish property requires a charge resource with a randomised initial count (1d3) that is not refilled — charges are destroyed, and when 0 remain the property itself is destroyed. The charge atom exists in v4 but the surface has no family for
- **reroll_failed_d20_test (triggered by failed D20 Test, must-use-second-roll constraint)** (new_variant) — Luck property is 'reroll one failed D20 Test, must use the second roll.' The modify_roll_reroll atom exists in v4 but the surface type has no shape for 'triggered on a failed roll' (as opposed to a general reroll) and no constraint encoding

### magic_item_mace_of_smiting

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. types.ts defines SpellRecord | ClassFeatureRecord | MasteryRecord only. The taxonomy lists magic_item_root as a source atom but the surface type system has no corresponding record type or mechanics f
- **crit_window** (new_atom) — The extra damage fires specifically on a critical hit (rolling a natural 20). The existing on_hit_window covers any hit; crit_window is mechanically distinct. The taxonomy already notes this as a known weak spot (single-feat pressure from B
- **creature_type_filter** (new_variant) — Both the bonus escalation (+1 → +3) and the crit damage escalation (7 → 14) are conditioned on whether the target is a Construct. No creature-type predicate exists on any Attachment, DcSource, DiceAmount, or effect variant. This is a new co
- **instant_kill_at_hp_threshold** (new_atom) — If a Construct has 25 HP or fewer after taking the crit damage, it is destroyed. This is a deterministic instant-kill conditioned on post-damage remaining HP. v4 has no effect atom for HP-threshold destruction; apply_condition covers condit
- **passive_weapon_bonus family** (new_subgraph) — The +1 to attack and damage rolls is a passive always-on property of the weapon itself, active every time the weapon is used — not an activation, not a spell, not a mastery on-hit rider. There is no passive-property family for magic items i

### magic_item_manual_of_gainful_exercise

- **MagicItemRecord / magic_item kind** (new_subgraph) — UnitRecord has no magic_item variant. The taxonomy has magic_item_root as a source atom and the unit kind is tagged magic_item, but types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord. No family (attunement, single-use co
- **downtime_ritual activation cost** (new_variant) — The item's activation requires 48 hours of study/practice over 6 days or fewer — a downtime-duration cost. ClassFeatureActivationCost only covers 'free' and 'bonus_action'; CastingTime.minutes covers long casts but is spell-scoped. No varia
- **modify_ability_score (permanent)** (new_atom) — The core effect is a permanent +2 to the Strength ability score (capped at 30). No effect atom covers permanent ability-score modification. TAXONOMY v4 §12 explicitly lists 'modify_ability_score as a runtime effect' as out-of-scope / not pr
- **item_depletion with timed_recharge lifecycle** (new_variant) — After use, the item loses its magic entirely and regains it only after 100 years. This is a one-use depletion + century-scale recharge — distinct from charge-based resources (which refill on rest) and from spell slot consumption. No lifecyc

### magic_item_manual_of_quickness_of_action

- **MagicItemRecord + magic_item UnitRecord kind** (new_subgraph) — UnitRecord has no magic_item variant. The taxonomy atom graph lists magic_item_root as a source atom, but types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord. A new top-level kind with its own mechanics family is required
- **modify_ability_score (permanent)** (new_atom) — The item permanently raises Dexterity by 2. The taxonomy defers modify_ability_score as 'out-of-scope for the core mechanics graph' (§12). A permanent ability score increase is the entire mechanic of this item; without it no honest trace is
- **ResetCadence: century_recharge (consumable magic item)** (new_variant) — The item is single-use and recharges after 100 years. This is mechanically distinct from short_rest / long_rest / partial_short_full_long cadences. Magic items in this family follow a 'loses magic, regains in N years' lifecycle not represen

### magic_item_medallion_of_thoughts

- **MagicItemRecord** (new_subgraph) — No magic_item UnitRecord kind exists. UnitRecord is SpellRecord | ClassFeatureRecord | MasteryRecord. A MagicItemRecord top-level kind and a corresponding magic-item mechanics family are required before any magic item can be encoded.
- **RestResetCadence.daily_at_dawn** (new_variant) — The medallion regains 1d4 charges daily at dawn — a time-of-day cadence with no rest trigger. The current RestResetCadence union only covers short/long rest variants.
- **DcSource.item_fixed_dc** (new_variant) — The medallion casts Detect Thoughts at a fixed save DC 13, independent of the wearer's spellcasting stat. DcSource only models caster_spell_save_dc and weapon_attack_dc.

### magic_item_mithral_armor

- **magic_item_record + passive_property family** (new_subgraph) — UnitRecord has no 'magic_item' kind. MagicItemRecord must be added to the union. Mithral Armor's mechanics are passive, always-on item properties — not activations, reactions, or on-hit riders. A new family (e.g. 'passive_property') is need
- **RollKind: 'ability_check'** (new_variant) — Stealth is a Dexterity (Stealth) ability check, not an attack roll or saving throw. The current RollKind union is 'attack_roll' | 'saving_throw'. Encoding disadvantage suppression on ability checks requires a third variant.
- **suppress_roll_disadvantage (or extend modify_roll_advantage to passive scope)** (new_atom) — The existing modify_roll_advantage atom is a rider on an on-hit window (mastery). Mithral Armor's stealth suppression is a passive, persistent removal of disadvantage on a roll kind — no trigger, no window, no activation. A passive-scope va
- **remove_equipment_prerequisite** (new_atom) — Mithral Armor removes the Strength prerequisite of the base armor. There is no existing atom for suppressing or overriding equipment prerequisites (Strength requirements on armor). The closest is alter_item_kind, but that changes the item's

### magic_item_necklace_of_fireballs

- **MagicItemRecord + MagicItemMechanics family** (new_subgraph) — No MagicItemRecord exists in UnitRecord. The v4 taxonomy lists magic_item_root as a source atom but types.ts has no corresponding record kind or mechanics family. All magic item encoding is blocked at the top-level kind.
- **charge resource with random starting count** (new_variant) — The necklace starts with 1d6+3 beads — a random initial charge count, not representable by UseCountCap (fixed | threshold_tiers). Requires a new cap variant or a dedicated charge resource type with a dice-roll initializer.
- **multi-charge consumption with linear damage scaling** (new_subgraph) — The item allows simultaneous multi-bead use: each additional bead beyond the first adds 1d6 fire damage (cap 12d6). This is a charge-count-to-damage-scale relation not expressible with any existing operation or effect type — it is not slot

### magic_item_pearl_of_power

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The surface union is SpellRecord | ClassFeatureRecord | MasteryRecord — magic items cannot be represented at all.
- **RestResetCadence.dawn** (new_variant) — Pearl of Power resets at next dawn, not at a short or long rest. No existing RestResetCadence variant covers a daily dawn reset.
- **MagicItemActivationCost.magic_action** (new_variant) — The item is activated by taking the Magic action, which is a StandardActionKind but is not covered by ClassFeatureActivationCost (free | bonus_action).
- **MagicItemEffect.refund_spell_slot** (new_variant) — The core effect is recovering an expended spell slot. No existing ClassFeatureEffect variant (grant_extra_action | heal_hp) can represent this. v4 has a 'refund' procedure atom but the surface has no corresponding effect shape.
- **AttunementRequirement** (new_variant) — Magic items can require attunement, with optional constraints on who can attune (e.g., 'by a Spellcaster'). No attunement field exists anywhere in the current surface types. v4 has attunement_slot as a resource atom but the surface has no a

### magic_item_periapt_of_proof_against_poison

- **MagicItemRecord + passive_while_attuned family** (new_subgraph) — UnitRecord has no magic_item variant. The item's mechanic is a passive always-on effect while worn and attuned — no activation, no cost, no reset. No existing mechanics family (activation, ongoing_effect, on_hit_trigger, etc.) honestly repr
- **grant_immunity** (new_atom) — v4 has grant_resistance (halved damage) but not grant_immunity (no damage/effect). These are mechanically distinct in SRD 5.2.1 — immunity fully negates while resistance halves. A separate atom is required to avoid a dishonest encoding that
- **grant_condition_immunity** (new_atom) — v4 has apply_condition and remove_condition but no atom for granting permanent immunity to a condition. Condition immunity is mechanically distinct from resistance (which applies only to damage) and from remove_condition (which is a one-tim
- **attunement requirement on item record** (new_variant) — The item requires attunement. v4 has attunement_slot as a resource atom and attune as a procedure atom, but the surface has no field on a hypothetical MagicItemRecord to express requires_attunement as a gate. This is a structural surface ga

### magic_item_periapt_of_wound_closure

- **MagicItemRecord** (new_subgraph) — UnitRecord has no magic_item kind. types.ts defines only SpellRecord | ClassFeatureRecord | MasteryRecord. The v4 taxonomy lists magic_item_root as a source atom and the survey queue includes magic_item units, but no corresponding TypeScrip
- **modify_roll_floor** (new_atom) — Life Preservation sets a minimum roll value of 10 on death saving throws. This is mechanically distinct from modify_roll_numeric (additive delta) and modify_roll_advantage (advantage/disadvantage). A floor/clamp atom is needed to express 't
- **death_saving_throw window or filter on save_gate** (new_variant) — Life Preservation fires specifically on death saving throws, which are not saves against a caster DC but a fixed-DC survival mechanic. No window atom or save-gate variant targets this event.
- **hit_die_window** (new_atom) — Natural Healing Boost fires when a creature rolls a Hit Point Die (spends a Hit Die during a rest). No existing window atom covers Hit Die expenditure. rest_window covers rest completion, not the individual die roll within a rest.
- **modify_hp_multiplier (or scale_heal_multiplier)** (new_atom) — Natural Healing Boost doubles the HP restored by a Hit Die roll. This is a multiplier effect — not a fixed heal amount, not a numeric addend, not a die-size or die-count change. No existing effect or scaling atom models HP multiplication.
- **attunement requirement on MagicItemRecord** (new_variant) — The item requires attunement. The v4 taxonomy has attune (procedure) and attunement_slot (resource), but the surface has no field or type modeling whether a magic item requires attunement and how many slots it consumes.

### magic_item_pipes_of_the_sewers

- **MagicItemRecord** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord — no magic_item kind exists. The v4 taxonomy lists magic_item_root as a source atom but types.ts has no MagicItemRecord type and no corresponding mechanics family. All magic item
- **RestResetCadence — daily_at_dawn variant** (new_variant) — The pipes regain 1d3 charges daily at dawn — a calendar-time recharge, not tied to short or long rests. The current RestResetCadence union covers only rest-based cadences (short_or_long_rest, long_rest, short_rest, partial_short_full_long).
- **Activation cost — magic_action_plus_bonus_action compound cost** (new_variant) — Using the pipes requires two sequential action costs: first play as a Magic action, then spend a Bonus Action to expend charges. No surface type for compound activation costs exists; ClassFeatureActivationCost only covers free or bonus_acti
- **companion_summoning_per_charge_family** (new_subgraph) — The item summons one Swarm of Rats per charge expended (up to 3 at once), conditioned on enough rats existing within half a mile (GM-adjudicated). The v4 atom create_companion exists but no surface mechanics family covers per-charge compani
- **proximity_triggered_save_gate_for_companion_control** (new_subgraph) — When an uncontrolled swarm enters 30 ft while the pipes are being played, it makes DC 15 Wis save. On fail it becomes Friendly (controlled, obeys commands). On success it is immune for 24 hours. Control persists only while player takes Magi

### magic_item_portable_hole

- **MagicItemRecord + magic_item family** (new_subgraph) — UnitRecord in types.ts is the union SpellRecord | ClassFeatureRecord | MasteryRecord. There is no MagicItemRecord. The v4 taxonomy lists magic_item_root as a source atom and the survey queue contains many magic_item slugs, but the surface t
- **toggle_state family (open/close activated object)** (new_subgraph) — The Portable Hole has two discrete operational states (open, closed) each reached by a Magic action. Neither the activation (class feature) nor any spell family captures a stateful physical object that persists between activations with togg
- **ability_check_gate (DC 10 Strength Athletics)** (new_atom) — The escape mechanic requires a creature inside to make a DC 10 Strength (Athletics) check — an ability_check resolution with a fixed DC, not a save_gate. The v4 taxonomy has ability_check as a resolution atom but the surface type Effect/Act
- **transport_exile (extradimensional containment with gate destruction interaction)** (new_variant) — The Bag-of-Holding interaction creates a one-way gate to the Astral Plane and destroys both items, then forcibly transports all creatures within 10 feet. This is a conditional item-interaction trigger that emits transport_exile, but no mech

### magic_item_potion_of_animal_friendship

- **MagicItemRecord + stored_spell_grant family** (new_subgraph) — No magic_item kind exists in UnitRecord (types.ts only defines SpellRecord | ClassFeatureRecord | MasteryRecord). The taxonomy lists magic_item_root but the surface has no corresponding record type or payload family.
- **fixed_dc override on stored spell grant** (new_variant) — The potion specifies a hardcoded save DC 13, independent of any caster's spell save DC. Existing DcSource only has caster_spell_save_dc and weapon_attack_dc. A stored spell grant needs a fixed_dc variant.
- **consume_item activation + stored_spell payload** (new_subgraph) — Magic items that grant spell access via consumption (drinking) need an activation model: consume the item (charge/item destroyed) → cast stored spell at fixed level. No existing family covers item-consumption-as-activation.

### magic_item_potion_of_diminution

- **MagicItemRecord** (new_subgraph) — No magic_item kind exists in UnitRecord. The surface schema covers spell, class_feature, and mastery only. Magic items require their own top-level record type with an appropriate mechanics family (consumable, charged, passive-worn, attuned,
- **rolled_duration** (new_variant) — DurationValue requires a fixed numeric amount. The Potion of Diminution has a 1d4-hour duration — a rolled/random duration that cannot be expressed as a fixed DurationValue.
- **alter_size** (new_atom) — The 'reduce' effect of Enlarge/Reduce is multi-component: the creature's size category drops by one, weapon damage dice are reduced, and the creature has disadvantage on Strength checks and Strength saving throws. No existing v4 effect atom

### magic_item_quarterstaff_of_the_acrobat

- **item_form_state_machine** (new_subgraph) — The item exists in three discrete forms (quarterstaff, 6-inch rod, 10-foot pole). Properties 'Acrobatic Assist', 'Attack Deflection', and 'Ranged Weapon' are form-conditional. No existing mechanics family can express form-conditional grant
- **RollKind.damage_roll** (new_variant) — The +2 weapon bonus applies to both attack rolls and damage rolls. RollKind covers attack_roll, saving_throw, ability_check, initiative, death_saving_throw — but not damage_roll. The damage bonus cannot be encoded without this variant.
- **grant_thrown_property** (new_atom) — The quarterstaff form gains the Thrown weapon property with a normal range of 30 feet and a long range of 120 feet. No existing atom grants a weapon property. This is mechanically distinct from grant_speed, modify_speed, or force_move.
- **return_to_hand** (new_atom) — After a ranged attack with the weapon, it flies back to the thrower's hand immediately. No existing atom models weapon auto-return. This is a post-attack lifecycle effect with no current analog.
- **magic_item_reaction_trigger** (new_subgraph) — Attack Deflection is a reaction triggered by 'being hit by an attack' — structurally identical to the Shield spell's trigger. TriggeredReactionMechanics exists only as a spell family. MagicItemMechanics is restricted to PassiveMechanics | A
- **modify_ac_vs_triggering_attack** (new_atom) — The +5 AC from Attack Deflection applies specifically against the triggering attack — it is a retroactive modification to whether that single attack hit. This is distinct from modify_ac (which modifies AC generally for the spell/effect's du

### magic_item_ring_of_djinni_summoning

- **spawned_creature mechanics family for magic items** (new_subgraph) — MagicItemMechanics is currently PassiveMechanics | ActivatedAbilityMechanics. The Ring of Djinni Summoning's core mechanic is summoning a named creature with a stat block, which requires the spawned_creature family (currently only available
- **RestResetCadence.timed_after_use** (new_variant) — The 24-hour cooldown is 'after the djinni departs, it can't be summoned again for 24 hours'. This is not a rest-based reset nor a dawn reset — it is a fixed-duration cooldown measured from the activation event. RestResetCadence has no such
- **ItemDestructionPolicy.on_companion_death** (new_variant) — The ring becomes nonmagical if the djinni dies — a destruction condition triggered by a summoned creature's death, not by charge exhaustion (last_charge_roll) or pool depletion (permanent_on_empty). A new destruction policy variant tied to

### magic_item_ring_of_elemental_command

- **multi_family_mechanics** (new_subgraph) — The ring co-presents three distinct mechanic families on one item: a passive grant (Elemental Bane), a Magic-action save-gate activation (Elemental Compulsion), and a charge-pool spellcasting system (Spellcasting). MagicItemMechanics = Pass
- **plane_conditional_grants** (new_variant) — Elemental Focus properties and spell lists are conditionally active based on the ring's linked Elemental Plane (Air / Earth / Fire / Water). No current surface type models a plane-variant or enum-keyed conditional passive grant set. This is
- **grant_language** (new_atom) — Four Elemental Focus variants grant knowledge of an elemental language (Auran, Terran, Ignan, Aquan). No language-grant atom exists in EffectAtom or anywhere in the current surface.
- **difficult_terrain_exception** (new_atom) — Earth variant: terrain composed of rubble, rocks, or dirt is not Difficult Terrain for the wearer. No existing atom models conditional exemptions from difficult terrain movement penalties for specific terrain types.
- **pass_through_terrain** (new_atom) — Earth variant grants the ability to move through solid earth or rock (treating it as difficult terrain, without disturbing the matter). This is not a speed mode (grant_speed covers fly/swim/climb/burrow) — it is a phasing-style movement thr
- **breathe_underwater** (new_atom) — Water variant grants the ability to breathe underwater. No atom models alternate breathing environments. Distinct from grant_sense (darkvision/blindsight) and grant_speed (swim speed is a separate co-present grant).

### magic_item_ring_of_mind_shielding

- **MagicItemMechanics.mixed_mode** (new_variant) — The item combines always-on passive protection, an activated Magic action toggle, and a death-triggered post-mortem state. The current magic-item surface only allows one mechanics family at a time: passive or activation.
- **block_information_magic** (new_atom) — The passive protection is not resistance, condition immunity, or targeting denial. It specifically blocks magic that reads thoughts or reveals lie/alignment/creature-type information.
- **telepathy_gate** (new_atom) — The item regulates telepathic communication in two directions: outside creatures may communicate only with the wearer's permission, but a housed soul can always communicate with the wearer.
- **item_soul_vessel** (new_subgraph) — The death-triggered soul-storage behavior creates persistent occupant state on the item and grants a new communication channel while that state persists.

### magic_item_ring_of_shooting_stars

- **multi_property_activated_mechanics** (new_subgraph) — MagicItemMechanics is PassiveMechanics | ActivatedAbilityMechanics — a single mechanics slot. The ring has four independent properties (at-will spells, Faerie Fire, Lightning Spheres, Shooting Stars) all drawing from a shared charge pool. N
- **spawned_object_companion** (new_subgraph) — Lightning Spheres creates up to 4 persistent objects (not creatures) with: concentration duration, Dim Light shedding, Bonus Action movement per turn (30 ft each, max 120 ft from caster), and proximity auto-discharge (within 5 ft triggers a
- **DiceAmount.lookup_table** (new_variant) — Lightning Spheres damage depends on how many spheres the player chose to create: 1→4d12, 2→5d4, 3→2d6, 4→2d4. This is a player-choice lookup table, not threshold_tiers by any LevelAxis (character/class/slot/subclass/proficiency_bonus). The
- **repeat_phase_per_charge** (new_subgraph) — Shooting Stars fires one save_gate area-of-effect per charge spent (1–3 charges). Each mote targets a separately chosen point within 60 ft; the N motes are simultaneous but independent (different points). The phases array is fixed-length (s

### magic_item_ring_of_spell_storing

- **spell_reservoir** (new_subgraph) — The ring's core mechanic is a dynamic spell pool whose contents are determined at runtime by external casters. No existing payload family models an item that receives spells cast into it by arbitrary creatures and stores them as a variable-
- **receive_spell_into_item** (new_atom) — There is no trigger or operation for 'another creature casts a spell while touching this item, which absorbs the spell rather than resolving it.' The on_caster_attack_hit / on_attached_turn_start / on_creature_enters_area trigger vocabulary
- **grant_spell_access.mode = stored_dynamic** (new_variant) — grant_spell_access requires a fixed spellId known at authoring time. The ring releases whichever spell happens to be stored — the spell identity is runtime state, not a compile-time constant. A 'stored_dynamic' mode (or equivalent) is neede
- **cast_with_borrowed_caster_stats** (new_variant) — When the wearer releases a stored spell, the spell uses the original caster's slot level, save DC, attack bonus, and spellcasting ability — not the wearer's. No existing SpellAccessMode or EffectAtom variant models borrowed-caster-stats sem
- **charge_pool with spell-level capacity tracking** (new_variant) — The ring's 5-level capacity is consumed in variable chunks (1–5 per stored spell). The existing charge_pool resource only tracks a numeric count; it has no notion of 'this charge expenditure corresponds to a particular stored spell with spe

### magic_item_ring_of_the_ram

- **dual_mode_activation** (new_subgraph) — The ring has two mutually exclusive activation modes chosen at use time (attack OR object-break). The current activation family models phases as a sequential list joined by branches_on_completion. No construct exists for 'choose one of N al
- **DiceAmount.per_charge_spent** (new_variant) — Damage is 2d10 Force per charge spent (1→2d10, 2→4d10, 3→6d10). resource_spent captures charge-variable amounts but carries no dice-per-charge formula. A new variant is needed: { kind: 'per_charge_spent', perCharge: DiceExpr }.
- **force_move per-charge distance** (new_variant) — Push distance is 5 ft per charge spent (1→5 ft, 2→10 ft, 3→15 ft). The force_move atom has a fixed distanceFeet field with no scaling hook. A per-charge variant or a distanceFeetPerCharge field is needed.
- **ActivationPhase.ability_check_gate** (new_variant) — The object-breaking mode triggers a Strength check (not an attack roll, not a saving throw). The v4 taxonomy includes ability_check as a resolution atom, but the surface ActivationPhase union only covers attack_roll, save_gate, and direct.
- **break_object** (new_atom) — The on-success outcome of the Strength check is breaking a nonmagical object. No v4 effect atom covers physical object destruction. The nearest atoms (damage, force_move, block_travel) target creatures or spaces. A break_object atom targeti

### magic_item_robe_of_stars

- **magic_item_multi_mechanics_bundle** (new_subgraph) — The current magic-item surface allows exactly one mechanics family, but this item has an always-on passive benefit plus separate activated abilities. A single record needs to compose passive and activation behavior honestly.
- **RestResetCadence.dusk** (new_variant) — The item's expendable stars recharge on a fixed daily dusk cadence, and the current surface only models dawn, rests, or never.
- **transport_exile** (new_atom) — The Astral Plane feature is not ordinary teleportation. It moves the wearer and carried gear to another plane, persists there until a later activation, and returns them to the previous plane at the prior space or nearest unoccupied space.

### magic_item_robe_of_useful_items

- **embedded_payload_inventory** (new_subgraph) — The robe is a finite heterogeneous stock of latent payloads. Each activation must choose one remaining patch, consume that exact patch, and release a different downstream payload. Current magic-item activation records only model a fixed pha
- **ActivationResource.embedded_inventory** (new_variant) — A scalar use counter or charge pool cannot honestly represent named per-patch stock such as two lanterns, two daggers, two ropes, plus a variable set of extra patches from a table.
- **ActivationPhase.release_embedded_payload** (new_variant) — The released payload is not a single fixed effect. Different patches become mundane objects, creatures, consumable magic items, or a spell scroll of a chosen level. That requires a release step that can dispatch to heterogeneous stored payl

### magic_item_rod_of_absorption

- **multi_mechanics_magic_item** (new_subgraph) — Rod of Absorption combines at least three independent mechanics: a reactive spell-absorption effect, a separate spell-slot-substitution casting mechanic, and attunement-visible stored-energy state. MagicItemMechanics = PassiveMechanics | Ac
- **triggered_reaction_magic_item** (new_subgraph) — The rod's absorption mechanic is not a free-standing reaction activation; it is a trigger-bound response to a spell that targets only the wielder and creates no area. ActivatedAbilityMechanics can consume a reaction quota but cannot encode
- **ActivationResource: item_spell_energy_reservoir** (new_variant) — The rod tracks current stored spell-energy levels and a separate lifetime absorbed total capped at 50 over the rod's existence. Existing charge_pool models a spendable pool with a cap and reset cadence, but not externally gained energy plus
- **spell_slot_cost_substitution** (new_subgraph) — The rod does not grant access to a named spell. It lets the wielder spend stored item energy in place of spell slots when casting any spell they have prepared or know, subject to slot-level constraints. Existing grant_spell_access cannot ex

### magic_item_rod_of_alertness

- **composite_magic_item_mechanics** (new_subgraph) — Rod of Alertness combines always-on held properties and a separate activated planted-aura property in the same item. Current MagicItemMechanics is a union of passive or activation, so one record cannot carry both honestly.
- **EquipmentPredicate.holding_item** (new_variant) — The rod's passive benefits and spell access are gated by holding the rod. Existing equipment predicates can express wearing armor or wielding a weapon, but not holding a magic item.
- **activated_item anchored/planted attachment with pull-to-end dismissal** (new_variant) — The protective aura is centered on the planted rod, persists for 10 minutes, and ends early when a creature takes a Magic action to pull the rod from the ground. Current activated-item phases do not encode a planted anchor with a manual dis

### magic_item_rod_of_lordly_might

- **magic_item_mode_switch** (new_subgraph) — The item has six mutually exclusive persistent button states, each entered by a Bonus Action and lasting until another button is pressed or toggled off. The current MagicItemRecord can carry only one mechanics family and has no way to repre
- **magic_item_composite_mechanics** (new_subgraph) — The rod combines always-on weapon bonuses, persistent alternate forms, on-hit optional riders with dawn resets, and a separate Magic action fear ability. The current magic-item surface forces one top-level mechanics family (`passive` or `ac
- **MagicItemMechanics.on_hit_trigger** (new_variant) — Drain Life and Paralyze are optional riders that trigger when the wielder hits with a melee attack using the rod. `on_hit_trigger` exists only for mastery, not for magic items, so these cannot be represented without widening the magic-item

### magic_item_rope_of_climbing

- **MagicItemMechanics.composite** (new_variant) — The item combines activated command behavior, a passive rider tied to a knotted state, and item durability/regeneration. The current magic-item surface only permits one mechanics family at a time.

### magic_item_rope_of_entanglement

- **MagicItemMechanics.ongoing_effect** (new_variant) — The rope is activated with a Magic action, but its core effect persists as an active restraint with later release and escape handling. The current magic-item surface only allows passive or one-shot activation mechanics.
- **bound_item_escape_loop** (new_subgraph) — A restrained target gets its own action-based escape attempt against fixed DC 15, choosing between two different skill-based ability checks, and success ends only this rope-bound restraint.
- **item_object_state_and_lifecycle** (new_subgraph) — The rope itself has combat-facing object stats, passive regeneration on a timed cadence, location changes depending on who is holding it, and deterministic destruction at 0 HP. That is item-owned runtime state, not a simple rider on the res

### magic_item_scarab_of_protection

- **mixed_magic_item_mechanics** (new_subgraph) — The item combines always-on passive benefits with a separate reaction-based charge-spend ability, but MagicItemMechanics currently allows only one family at a time.
- **save_source_filter_against_spells** (new_variant) — Current roll-advantage shaping can narrow by save ability, but not by the source of the save such as spells.
- **failed_saving_throw_reaction_trigger** (new_variant) — The preservation benefit triggers after a failed save and needs source predicates for Necromancy spells or harmful effects from Undead.
- **override_save_outcome** (new_atom) — The reaction rewrites an already failed saving throw into a success, which is not modeled by numeric modifiers or advantage.

### magic_item_scimitar_of_speed

- **MagicItemMechanics.passive_plus_activation** (new_variant) — Scimitar of Speed combines always-on weapon bonuses with a repeatable turn-based attack rider. The current surface forces a magic item to be either passive or activation, so the unit cannot be represented as one honest record.
- **modify_damage_numeric** (new_atom) — The surface has `modify_roll_numeric` for attack-roll bonuses but no passive atom for adding a fixed bonus to weapon damage rolls.
- **item_instance_weapon_filter** (new_variant) — The current weapon filter only distinguishes melee versus ranged. This item's bonuses apply to attacks and damage made with this specific weapon, not to all melee weapons.
- **grant_bonus_action_weapon_attack** (new_subgraph) — The current surface can grant an extra action, but not a constrained bonus-action attack with a named weapon each turn.

### magic_item_shield_of_the_cavalier

- **compound_magic_item_properties** (new_subgraph) — Shield of the Cavalier combines an always-on passive AC bonus, an Attack-action replacement attack property, and a separate reaction property that creates a persistent field. MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics
- **non_spell_triggered_reaction_for_magic_items** (new_variant) — Protective Field is a reaction-shaped item property with an explicit trigger and a concentration-bounded persistent area. The existing triggered_reaction family is spell-only, while ActivatedAbilityMechanics has reaction cost but no trigger
- **ActivationPhase.attack_roll.attackKind: melee_weapon_attack** (new_variant) — Forceful Bash is not a spell attack. The current attack phase only supports ranged_spell_attack and melee_spell_attack, so encoding this as a spell attack would be a category lie.
- **DiceExpr or DiceAmount: ability_modifier damage addend** (new_variant) — The hit damage is 2d6 + 2 + Strength modifier. DiceExpr can encode a flat bonus and spellcastingMod only; it cannot express adding a named ability modifier to non-spell damage.
- **conditional_on_target_size** (new_variant) — The prone rider applies only if the target creature is your size or smaller. Existing EffectAtom composition can apply condition and force movement, but it cannot gate only part of the on-hit bundle on a size comparison between source and t

### magic_item_spell_scroll

- **stored_spell_scroll_payload** (new_subgraph) — Spell Scroll is not a fixed spell-grant item like a wand or ring. It is a one-shot item that stores one arbitrary spell record, inherits that spell's normal casting time, suppresses Material components, and destroys itself only after a comp
- **MagicItemMechanics.embedded_spell_scroll** (new_variant) — The item's rarity, save DC, and attack bonus vary with the embedded spell's level, and the spell itself is not statically known at the item-type level. Existing `passive` and `activation` mechanics require a concrete authored effect sequenc
- **embedded_spell_cast_gate** (new_variant) — Using the scroll depends on reader state outside the current item grammar: whether the spell is on the reader's spell list, whether its level exceeds what the reader can normally cast, and an ability check with DC `10 + spell level` on that

### magic_item_sphere_of_annihilation

- **controllable_hazardous_item** (new_subgraph) — The sphere is a persistent world object with transient controller ownership, an action-based Arcana control attempt, a duration-limited control state, and a follow-up bonus-action movement command that resolves saves and damage when the obj
- **obliterate_creature_remains** (new_atom) — The sphere's damage has an extra deterministic rider when it reduces a creature to 0 HP: the creature is obliterated and leaves no physical remains, while possessions remain. Current effect atoms can deal damage, but they cannot express thi

### magic_item_staff_of_charming

- **multi_mechanics_magic_item** (new_subgraph) — Staff of Charming has three independent mechanics that do not fit a single existing MagicItemMechanics value: a charge-based activated spellcasting property, a reaction-based spell reflection property, and a separate once-per-dawn failed-sa
- **MagicItemRecord attunement class restriction** (new_variant) — The record can express only requiresAttunement: boolean. It cannot encode that attunement is limited to specific classes, which is part of the item's deterministic eligibility rule.
- **reaction trigger for successful spell save against self-only spell** (new_variant) — Reflect Enchantment fires only after a successful saving throw against an Enchantment spell that targets only you. Existing reaction triggers cover hit-by-attack, targeted-by-named-spell, or creature-casts-spell, but not success on a save a
- **reflect_triggering_spell** (new_atom) — The effect is not just negation or Counterspell-style cancellation. It redirects the triggering spell onto its caster as if you had cast it. Existing atoms such as negate_triggering_spell and negate_named_effect do not express re-targeting
- **reactionless trigger on failed spell save** (new_variant) — Resist Enchantment fires when you fail a saving throw against an Enchantment spell that targets only you, with no action or reaction cost. Existing ActivatedAbilityMechanics requires an activation cost and phases initiated by the user; it c
- **replace_failed_save_with_success** (new_atom) — The item changes the outcome of a completed saving throw from failure to success. Current surface atoms can add bonuses or advantage before resolution, but there is no effect atom that substitutes the resolved save result after the roll is

### magic_item_staff_of_fire

- **composite_magic_item_mechanics** (new_variant) — The current magic-item surface only allows one mechanics family at a time (`passive` or `activation`). Staff of Fire needs a passive fire-resistance grant while held and an independent charge-based spellcasting payload with dawn recharge an

### magic_item_staff_of_frost

- **composite_magic_item_mechanics** (new_variant) — The item simultaneously grants a passive resistance effect and a separate charge-based spellcasting activation, but MagicItemMechanics currently allows only one family at a time.

### magic_item_staff_of_power

- **MagicItemMechanics.composite** (new_variant) — The item needs one record to express always-on bonuses, charge-cast spell access, and a separate destructive activated ability. The current union only allows passive or activation, not both together.
- **ItemDestructionPolicy.last_charge_outcome_table** (new_variant) — The staff's last-charge behavior is not simple destruction or permanent emptying. It can degrade into a reduced-property item or regain charges on a specific die result.
- **DiceAmount.resource_remaining_multiplier** (new_variant) — Retributive Strike damage is computed from charges currently in the item, not a fixed dice expression, slot scaling, or resource spent this activation.

### magic_item_staff_of_striking

- **magic_item_on_hit_charge_rider** (new_subgraph) — The existing magic-item surface only allows `passive` or `activation`. Staff of Striking needs a persistent weapon bonus and a separate optional rider that triggers on a melee hit with the item, spends 1-3 charges, and adds scalable extra d
- **modify_weapon_damage_numeric** (new_atom) — The current surface can add to attack rolls, AC, saves, and grant extra damage instances, but it cannot express a flat bonus to the weapon's own damage rolls made with a specific item.
- **item_disenchantment_on_last_charge_roll** (new_variant) — The current destruction policy only models destruction or permanent uselessness on pool exhaustion. Staff of Striking instead remains as a mundane quarterstaff after the last-charge d20 roll.

### magic_item_staff_of_the_magi

- **MagicItemMechanics.composite** (new_variant) — The item has multiple independent mechanics families at once: passive held bonuses, charge-based spell activation, a triggered reaction, and a distinct destructive activation. The current magic-item record allows only one mechanics family.
- **TriggeredReactionMechanics for magic items** (new_variant) — Spell Absorption is a genuine reaction-shaped item ability with a trigger and effect. Existing triggered-reaction support is spell-only, while activated magic items have no trigger grammar.
- **charge_gain_from_absorbed_spell_level_with_overflow_branch** (new_subgraph) — The surface can spend charges and recharge at dawn, but it cannot gain charges from a reacted-to spell's level or branch on exceeding the pool cap into a second ability.
- **modify_damage_roll_numeric** (new_atom) — The passive quarterstaff rider grants a bonus to weapon damage rolls made with the item. Current atoms can modify AC, attack rolls, saves, and checks, but not damage rolls.

### magic_item_staff_of_the_python

- **magic_item_companion_creation_family** (new_variant) — The item's primary mechanic is an activated magic item that creates and controls a companion creature, but MagicItemMechanics only permits passive or generic activation families and has no honest spawned-creature shape.

### magic_item_staff_of_the_woodlands

- **MagicItemMechanics.composite** (new_variant) — The item has always-on held-item bonuses and separate charge-based activated abilities at the same time. The current magic-item surface is an exclusive union of passive or activation, so encoding only one side would be dishonest.
- **EquipmentPredicate.holding_item** (new_variant) — The passive spell-attack bonus applies only while holding this item. Existing passive gates only model armor and weapon-category predicates, not item-specific held-state.
- **modify_damage_numeric** (new_atom) — The staff adds a flat bonus to damage rolls made with the weapon form. The current surface can modify attack rolls and AC, but it has no effect atom for weapon damage-roll bonuses.
- **item_to_object_transform** (new_subgraph) — Tree Form changes the item into a planted tree, later reverts it to staff form, and forces riders on creatures in the tree when it reverts. That is not representable by the existing passive/activation shapes.

### magic_item_staff_of_thunder_and_lightning

- **magic_item_ability_set** (new_subgraph) — The item combines shared passive grants with multiple named item abilities that have different trigger/cost/resource shapes and separate once-per-dawn usage tracking.
- **modify_damage_roll_numeric** (new_atom) — The passive quarterstaff bonus includes weapon damage-roll modification, which the current effect vocabulary cannot express.
- **weapon_filter.specific_item_or_weapon** (new_variant) — The passive bonus is scoped to attacks and damage made with this specific staff, but current weapon filters only distinguish melee versus ranged.

### magic_item_staff_of_withering

- **magic_item_on_hit_trigger_activation** (new_subgraph) — The item's core mechanic is an optional charge spend inside a quarterstaff hit window that adds extra damage and opens a saving throw rider. Existing magic-item families only support passive grants or explicit activations, not weapon-hit-tr
- **modify_roll_advantage.abilityCheckAbilityFilter** (new_variant) — The failed-save rider applies to any Strength or Constitution ability check, not just named skills. The current surface can filter saving throws by ability and ability checks by skill, but it cannot express raw ability-based check filtering

### magic_item_stone_of_controlling_earth_elementals

- **MagicItemMechanics.spawned_creature** (new_variant) — The item deterministically creates and governs a temporary companion with its own placement, control model, dismissal, and recharge cadence. The current magic-item surface only permits passive grants or activation phases, not companion-spaw

### magic_item_sun_blade

- **manifested_item_mode** (new_subgraph) — The item has a persistent manifested/unmanifested state that gates all of its weapon behavior, but the current magic-item surface has no way to model a stateful mode toggle on top of passive grants.
- **composable_magic_item_mechanics** (new_variant) — Sun Blade is neither purely passive nor an honest resource-spending activation. It needs one item record to combine repeatable no-resource activations with passive while-active grants.
- **emit_light** (new_atom) — The item deterministically emits bright and dim light, and the emitted light has the sunlight tag plus adjustable radii.
- **weapon_on_hit_bonus_damage_vs_creature_type** (new_atom) — The item adds extra weapon-hit damage only against a closed creature-type subset, which is not representable by existing passive grants.

### magic_item_sword_of_life_stealing

- **shared non-spell on_hit_trigger family for magic items** (new_subgraph) — The item is neither an always-on passive grant nor a player-activated ability. Its mechanic is a weapon-attack rider that resolves from a hit event while the item is wielded.
- **crit-specific hit trigger** (new_variant) — Existing hit-trigger shapes can express a weapon hit, but not the stricter natural-20 trigger required by this item.
- **target creature-type exclusion on on-hit rider** (new_variant) — The rider is suppressed against Constructs and Undead, so the trigger/effect needs a target-side creature-type exclusion gate.

### magic_item_sword_of_sharpness

- **triggered passive weapon rider family for magic items** (new_subgraph) — Sword of Sharpness is not an always-on passive grant and not an activated ability. Its mechanics are conditional weapon-hit and critical-hit riders attached to wielding the item. Current MagicItemMechanics only allows passive or activation,
- **trigger variant for natural-20 weapon attack** (new_variant) — The creature rider keys off a natural 20 on the d20, not merely a hit. Existing on-hit trigger shapes only express weapon_hit or melee-only weapon_hit, so they cannot distinguish this stricter trigger.
- **maximize_weapon_damage_dice** (new_atom) — The object rider replaces the rolled weapon damage dice result with its maximum value. Existing atoms can add damage or modify d20 rolls, but they cannot maximize an already-resolving weapon damage roll.
- **increment leveled exhaustion by 1** (new_variant) — apply_condition with condition=exhaustion only captures presence of the condition, not gaining one additional exhaustion level. Sword of Sharpness needs an incremental leveled-condition effect.

### magic_item_sword_of_wounding

- **magic_item_on_hit_trigger** (new_subgraph) — The item is a weapon-hit rider, but MagicItemRecord only supports passive grants or activated abilities. It needs an on-hit trigger family analogous to mastery-side on_hit_trigger.
- **DcSource.fixed** (new_variant) — The save uses a fixed item DC 15, which is not representable by caster spell save DC, weapon attack DC, or innate DC.
- **block_hp_regain** (new_atom) — The effect prevents a target from regaining hit points for a duration. Existing atoms cover healing, max-HP changes, and healing maximization, but not a healing-prevention lockout.

### magic_item_talisman_of_pure_good

- **MagicItemMechanics.composite** (new_variant) — The item combines passive grants, passive triggered punishment, and a charge-based activated ability. The current magic-item surface only allows one family at a time.
- **modify_roll_numeric.attackFilter = spell_attack** (new_variant) — The passive bonus applies to spell attack rolls specifically, not all attack rolls.
- **item_triggered_passive_hazard** (new_subgraph) — The hostile-touch damage is a passive item effect with touch and turn-end holding triggers, which the current magic-item families cannot express.
- **save_gate.conditional_target_disadvantage** (new_variant) — Pure Rebuke changes the save only for targets of certain creature types while remaining otherwise targetable by any creature.
- **destroy_creature** (new_atom) — The failure branch destroys the target outright instead of dealing damage or applying a condition.

### magic_item_talisman_of_the_sphere

- **magic_item_combined_passive_and_activation** (new_subgraph) — The item has an always-on passive rider and a separate turn-gated activated capability. Current magic items must choose exactly one mechanics family: passive or activation.
- **Attachment.object** (new_variant) — The activated half targets and moves another specific object, not self, a creature target, an area, or a mark.
- **EffectAtom.move_object** (new_variant) — The surface lacks an authored way to express deterministic movement of an external object with a distance formula derived from an ability modifier.

### magic_item_talisman_of_ultimate_evil

- **magic_item_mixed_mechanics** (new_subgraph) — The item needs passive grants and a separate activated charge-based ability on the same record, but MagicItemMechanics is currently passive-or-activation only.
- **item_contact_or_possession_trigger** (new_subgraph) — The talisman deals damage on touch and repeats that damage at end of turn while the creature continues holding or carrying it; PassiveMechanics cannot encode item-owned triggered damage.
- **save_gate.target_type_disadvantage** (new_variant) — The activation needs a creature-type-conditional penalty on the target's saving throw, which the current save_gate surface cannot express.
- **destroy_target** (new_atom) — The failed-save branch annihilates the target rather than merely damaging, moving, or conditioning it.

### magic_item_thunderous_greatclub

- **MagicItemMechanics.mixed_passive_and_activation** (new_variant) — The item has always-on attunement effects and separate activated properties with their own action economy and recharge. The current magic-item surface is a union of `passive | activation`, so one record cannot represent both honestly.
- **EffectAtom.break_concentration** (new_variant) — The Earthquake property forces concentrating creatures to lose concentration on a failed Constitution save. The v4 taxonomy has a `break` lifecycle atom, but the authored surface and tracer expose no effect shape for concentration break.
- **open_fissure** (new_atom) — The Earthquake property creates new terrain topology, causes creatures at chosen ground spots to fall or be displaced with the fissure edge, and collapses structures into the fissure. That is not representable with existing movement, area,

### magic_item_vicious_weapon

- **passive_on_hit_rider_for_non_mastery_units** (new_subgraph) — The existing magic-item mechanics families only cover always-on passive grants and resource-based activations. Vicious Weapon is an always-armed on-hit rider that adds extra damage when the wielder hits with the weapon, which requires a tri
- **weapon_damage_type_reference** (new_variant) — The extra damage is not a fixed damage type. It inherits the struck weapon's normal damage type, and the current surface only supports fixed damage types or author-time/cast-time choices.

### magic_item_vorpal_sword

- **magic_item compound mechanics (passive + on_hit_trigger)** (new_subgraph) — Vorpal Sword has always-on weapon bonuses and a separate nat-20 on-hit rider. Current MagicItemMechanics allows only passive or activation, not an honest composition of passive grants with a weapon-hit trigger.
- **EffectAtom.bypass_resistance** (new_variant) — The current authored surface cannot represent a weapon effect that ignores resistance to a specific damage type, even though v4 taxonomy already distinguishes this concept from granting resistance.
- **roll modifier for weapon damage rolls** (new_variant) — The surface can modify attack rolls, saving throws, ability checks, initiative, and death saves, but it has no honest passive rider for '+3 to damage rolls made with this weapon'.
- **decapitate_or_kill_target** (new_atom) — The item's core rider is not just extra damage. On a natural 20 with the weapon, it severs a head and can kill the creature outright, with conditional fallback damage instead. No current effect atom models severing a body part or instant de
- **critical-hit natural-20 rider with fallback replacement** (new_subgraph) — The trigger is specifically a natural 20 on the d20 for the attack roll, not a generic weapon hit. The rider also branches into fallback extra damage when the decapitation is prevented by immunity, anatomy, size adjudication, or Legendary R

### magic_item_weapon_of_warning

- **passive_aura_magic_item** (new_subgraph) — Weapon of Warning is a non-spell persistent aura centered on the attuned wielder that affects self and nearby allies. MagicItemMechanics only allows PassiveMechanics or ActivatedAbilityMechanics; PassiveMechanics has no attachment, radius,
- **Passive gate: weapon_within_reach** (new_variant) — The current passive-gating vocabulary only covers always / wearing_armor / wielding_weapon. Weapon of Warning turns on specifically while the item is within reach, which is not representable by those predicates.
- **OngoingTrigger: on_combat_start** (new_variant) — The Alarm rider fires at a specific lifecycle boundary, combat start. No current ongoing trigger variant covers that event.
- **wake_sleep** (new_atom) — The item wakes subjects who are sleeping naturally but explicitly does not wake magically sleeping subjects. The current condition vocabulary has no natural-vs-magical sleep distinction, and remove_condition cannot express this selective wa

### magic_jar

- **soul_displacement** (new_subgraph) — Magic Jar's primary mechanic is the caster's soul vacating the body and inhabiting a physical container. This is not an 'activate' procedure on a target — it is the caster themselves becoming a disembodied soul stored in an object. The cast
- **possess_creature** (new_atom) — Possession is not command_companion (that is for summoned creatures the caster controls externally). Possession replaces the caster's in-world stat block with the host's physical stats while the caster retains mental/class stats. It also si
- **apply_stat_override** (new_atom) — Mid-spell replacement of a specific subset of the possessor's statistics (HP, HD, STR, DEX, CON, Speed, senses) with the host's values while retaining all other statistics is not modify_ac, modify_speed, or any existing effect atom. It is a
- **Duration.permanent_until_dispelled** (new_variant) — Magic Jar's duration is 'permanent (ends: dispel)' — it persists indefinitely without concentration and without a timed window. The existing Duration union only has instantaneous, concentration (with upTo DurationValue), and timed (with a f
- **dual_entity_container_state** (new_subgraph) — At any point during the spell, the container may hold zero, one, or two souls (caster's soul while body is empty; target's soul when caster is possessing; both when caster returns). Each soul has independent mobility constraints and death c

### mastery_graze

- **on_miss_trigger** (new_subgraph) — Graze fires when the attack roll misses, not when it hits. MasteryMechanics = OnHitTriggerMechanics is the only family; there is no on_miss_trigger mastery family. A new family (or a new trigger variant on OnHitTriggerMechanics) is required
- **DiceAmount { kind: 'ability_modifier' }** (new_variant) — Graze damage equals the ability modifier used for the attack — a scalar, not a dice expression. DiceAmount only supports fixed/threshold_tiers/linear_per_level, all of which require a DiceExpr base. An ability_modifier variant is needed.
- **DamageType { kind: 'weapon_damage_type' }** (new_variant) — Graze damage type is 'same as the weapon's damage', not a fixed closed-enum string. DamageType is a string union of 13 concrete types; no variant expresses weapon-relative type inheritance.

### mirror_image

- **passive_hit_intercept** (new_subgraph) — Mirror Image creates a persistent passive trigger that fires automatically when the caster is hit by an attack roll — no reaction cost, no player prompt, no Prepare/Prompt/Commit chain. This is structurally distinct from triggered_reaction
- **duplicate_pool resource** (new_variant) — The spell creates exactly 3 destroyable tokens (duplicates) that serve as an ablative HP-like pool for the spell's interception mechanism. This is not use_count (which tracks activations of a feature), not spell_slot (consumed at cast), and
- **on_incoming_hit_window** (new_variant) — Mirror Image fires before the hit resolves — between the attacker rolling a hit and damage being applied. The existing on_hit_window fires after a hit is confirmed (attacker-side, grants a rider). Mirror Image needs an incoming-hit window o
- **probabilistic_gate resolution** (new_variant) — The interception check is 'roll Nd6, succeed if any die >= 3' where N = remaining duplicate count. This is neither an attack_roll, save_gate, nor ability_check. It is a pool-size-dependent probabilistic check with a fixed threshold. The sur
- **intercept_hit** (new_atom) — The successful resolution redirects the hit from the caster to a duplicate (destroying the duplicate). v4 has block_targeting (prevents being targeted before a roll) and grant_resistance (halves damage). Neither covers 'hit is retroactively

### mislead

- **multi_operation_ongoing_effect** (new_subgraph) — Mislead emits two simultaneous ongoing effects with different expiry conditions: (1) invisible on self, expiring on attack/damage/spell; (2) illusory double persisting for the full concentration hour. The ongoing_effect family only supports
- **Condition.invisible** (new_variant) — The invisible condition is required by Mislead's primary mechanic. The current Condition union in types.ts only contains 'prone'.
- **OngoingOperation.apply_condition** (new_variant) — apply_condition exists as a v4 effect atom but is absent from OngoingOperation; Mislead needs to grant the invisible condition as an ongoing effect on the caster.
- **conditional_expiry_on_offensive_action** (new_variant) — Invisibility ends when the caster makes an attack roll, deals damage, or casts a spell — none of the existing RiderExpiry or Duration/expire variants cover this pattern. This is a new expiry trigger bound to the caster performing an offensi
- **OngoingOperation.create_illusory_double** (new_variant) — The illusory double is a persistent, controllable, intangible entity. The v4 atom create_companion covers persistent summoned entities, but it is not present in types.ts Effect or OngoingOperation. The double also carries a repeated sub-act
- **OngoingOperation.sensory_link** (new_variant) — Caster sees and hears through the double's location. The v4 atoms telepathic_link and grant_sense are candidates, but neither appears in types.ts Effect or OngoingOperation.

### monk_ability_score_improvement_l4

- **passive_grant family for class features** (new_subgraph) — Ability Score Improvement is a permanent passive feature granted on leveling up. The only existing ClassFeatureMechanics family is 'activation', whose header mandates activationCost, resource (UseCountResource), and resetCadence. None of th
- **grant_feat_choice effect variant in ClassFeatureEffect** (new_variant) — The unit's core mechanic is granting the player a feat selection. ClassFeatureEffect only covers GrantExtraActionEffect and HealHpEffect. A new variant is needed to represent 'gain a feat (defaulting to ASI feat) or another qualified feat'.

### monk_body_and_mind_l20

- **passive (ClassFeatureMechanics family)** (new_variant) — Body and Mind is a permanent, passive character-progression effect that grants a one-time ability score increase at level 20. It has no activation cost, no use-count resource, and no reset cadence — all three fields required by the only exi
- **modify_ability_score** (new_atom) — The sole mechanical content of this feature is a permanent increase to two ability scores (Dexterity and Wisdom, +4, capped at 25). No existing ClassFeatureEffect covers this: 'grant_extra_action' is action-economy, 'heal_hp' is HP restorat

### monk_deflect_energy_l13

- **passive_scope_modifier** (new_subgraph) — Deflect Energy is a permanent always-on modifier that widens the damage type filter on Deflect Attacks. It has no activation cost, no use count, no resource, and no trigger — the activation family cannot represent it without lying about all
- **expand_damage_type_scope (ClassFeatureEffect variant)** (new_variant) — Even if a passive family existed, no current ClassFeatureEffect variant can express 'remove the damage type restriction on feature X'. A new effect variant is needed that names the target feature and declares the restriction being lifted.

### monk_disciplined_survivor_l14

- **passive_class_feature** (new_subgraph) — The first bullet of Disciplined Survivor is a permanent passive grant (proficiency in all saving throws). It has no activation cost, no use count, and no reset cadence. The existing ClassFeatureMechanics only has `activation` family, which
- **grant_proficiency (ClassFeatureEffect variant)** (new_variant) — The passive saving throw proficiency grant requires a `grant_proficiency` effect. ClassFeatureEffect is currently limited to `grant_extra_action | heal_hp`. The v4 taxonomy includes `grant_proficiency` as an effect atom (§9), but it is not
- **triggered_optional_class_feature** (new_subgraph) — The reroll mechanic is a trigger-gated optional ability: it fires on a specific event (failed saving throw = post_roll_window on failure), the player chooses whether to invoke it (optional), and it consumes a Focus Point. This is not a play
- **focus_point (ClassFeatureActivationCost variant)** (new_variant) — The reroll costs 1 Focus Point — a monk-specific resource distinct from action economy (not `free`, not `bonus_action`). ClassFeatureActivationCost has no cost variant for expending a class-specific point resource. This is the same pattern
- **modify_roll_reroll (ClassFeatureEffect variant)** (new_variant) — The reroll effect is `modify_roll_reroll` from v4 taxonomy §9, but this atom is not represented in ClassFeatureEffect (only `grant_extra_action | heal_hp`). The effect forces a reroll of a specific roll already made, with the constraint `mu

### monk_epic_boon_l19

- **permanent_grant** (new_subgraph) — The only existing ClassFeatureMechanics family is 'activation', whose header mandates activationCost, resource (use_count), and resetCadence. Epic Boon is a one-time permanent acquisition at level-up — not an activatable feature with a use
- **grant_feat** (new_atom) — The v4 effect atom inventory has grant_proficiency and grant_spell_access but no 'grant_feat'. A permanent-grant family would need a corresponding effect atom to record what is granted at level-up.

### monk_evasion_l7

- **passive_class_feature family** (new_subgraph) — Evasion is a permanent, always-on modifier with no activation cost, no use-count resource, and no reset cadence. The only ClassFeatureMechanics family is 'activation', which requires all three. Encoding Evasion as 'activation' with kind=fre
- **ClassFeatureEffect: modify_save_outcome** (new_variant) — Evasion replaces the standard save_gate outcome branches (success=half, fail=full) with (success=0, fail=half) for a specific class of incoming effects (Dex half-damage saves targeting the feature owner). No existing ClassFeatureEffect vari
- **Feature suppression condition gate (Incapacitated)** (new_variant) — The feature explicitly does not apply when the Incapacitated condition is present. This is a passive suppression predicate with no surface representation in the current ClassFeatureMechanics schema. The v4 atom 'suppress' exists but there i

### monk_fleet_step_l11

- **passive_trigger_class_feature_family** (new_subgraph) — Fleet Step fires automatically on a conditioned window (bonus_action_window, excluding Step of the Wind itself). It has no explicit activation, no use_count, and no rest reset. The current ClassFeatureMechanics union contains only 'activati
- **grant_feature_use_at_waived_cost** (new_variant) — The effect is 'grant use of Step of the Wind without expending an additional Bonus Action'. Existing ClassFeatureEffect variants (grant_extra_action, heal_hp) do not cover this — grant_extra_action grants a generic extra action, not a speci
- **bonus_action_exclusion_filter** (new_variant) — The trigger has a named-feature exclusion condition ('other than Step of the Wind'). The current surface has no filter grammar on window triggers for class features. A closed filter shape — or a ConditionedTrigger variant — is needed to rep

### monk_focus_points

- **class_feature.mechanics.family = persistent_resource_bundle** (new_variant) — The unit is a passive feature that creates a level-scaled resource pool, restores it on rest, and grants multiple subordinate activations rather than being one activation itself.
- **granted_subfeature_activations** (new_subgraph) — The feature grants three distinct downstream options with different costs and effects, including no-cost and paid branches.
- **class_feature.shared_save_dc_formula** (new_variant) — The feature establishes a reusable save DC formula for other Monk features, which is not an activation effect.

### monk_martial_arts

- **passive_class_feature family** (new_subgraph) — Martial Arts is permanently active under a condition (unarmed/monk-weapon, no armor/shield). It has no use-count resource and no reset cadence. The current ClassFeatureMechanics only has the 'activation' family, which requires both. A 'pass
- **damage_substitute effect (new ClassFeatureEffect or OngoingOperation variant)** (new_variant) — The Martial Arts Die replaces — not adds to — the normal weapon/unarmed damage die with 1d6 (scaling to d8/d10/d12 by class level). This is a damage override. No existing DamageEffect, heal, or roll_modifier shape covers 'roll X instead of
- **modify_roll_substitute_ability surface type** (new_variant) — Dexterous Attacks allows using DEX instead of STR for attack and damage rolls, and for Grapple/Shove save DCs. The v4 taxonomy names 'modify_roll_substitute' as an atom, but types.ts has no surface shape that encodes which ability feeds a r
- **UseCountCap: unlimited (or per-turn-reset cadence)** (new_variant) — The Bonus Unarmed Strike can be used every turn with no cap and no rest reset. UseCountCap only supports 'fixed' (a specific number) and ThresholdTiers. RestResetCadence has no 'per_turn' or 'unlimited' variant. Even if the bonus-unarmed-st

### monk_martial_arts_l1

- **passive_class_feature family** (new_subgraph) — Martial Arts grants three always-on benefits that are active while the monk meets preconditions (unarmored, wielding only monk weapons, no shield). No existing ClassFeatureMechanics family handles condition-gated passive features without a
- **grant_bonus_action_attack** (new_atom) — Bonus Unarmed Strike grants the option to make a specific attack (Unarmed Strike) as a Bonus Action. grant_extra_action grants a full extra action (which may exclude Magic); it does not model a scoped bonus-action attack. A distinct effect
- **replace_damage_die** (new_atom) — Martial Arts Die replaces the normal damage die of Unarmed Strikes and Monk weapons with the Martial Arts die (1d6, scaling via scale_die_size to d12 at Monk L17). modify_roll_substitute exists in v4 taxonomy but covers roll-result substitu
- **ability_score_substitution on attack/damage rolls** (new_variant) — Dexterous Attacks permits using DEX in place of STR for attack and damage rolls of Unarmed Strikes and Monk weapons, and for the save DC of Grapple/Shove. This is a conditional ability-score substitution on rolls, not a numeric bonus (modif

### monk_open_hand_technique_l3

- **ClassFeatureOnHitTriggerMechanics (family: on_hit_trigger)** (new_subgraph) — Open Hand Technique fires on a hit from a specific action source (Flurry of Blows), not from a free activation. ClassFeatureMechanics has only the 'activation' family, which presupposes an activationCost + use_count resource. This unit need
- **MasteryTrigger (or new ClassFeatureTrigger) :: action_source_hit** (new_variant) — The trigger is constrained to 'attacks granted by Flurry of Blows'. Existing MasteryTrigger variants (weapon_hit, weapon_hit_melee_only) filter by weapon kind, not by action source. A new variant carrying an action source identifier (e.g. '
- **ChooseEffect (player chooses one-of N effects)** (new_variant) — The feature presents a menu of three independent effects and the player picks one per trigger. Neither ClassFeatureEffect nor MasteryEffect has a 'choose_from' composition. The v4 taxonomy lists 'choose' as a procedure atom but there is no
- **SaveGateRiderResult :: deny_opportunity_attack** (new_variant) — Addle grants an automatic on-hit effect (no save) that denies Opportunity Attacks until turn start. deny_opportunity_attack is a v4 effect atom but is absent from SaveGateRiderResult and ClassFeatureEffect. Additionally, Addle has no save g
- **SaveGateRiderResult :: force_move** (new_variant) — Push force-moves the target up to 15 feet on a failed STR save. force_move is a v4 atom but is absent from SaveGateRiderResult (which only has apply_condition and none) and from ClassFeatureEffect.

### monk_perfect_focus_l15

- **passive_trigger (class feature family)** (new_subgraph) — Perfect Focus fires automatically on a game event (Initiative roll) with no player activation choice. The only existing class feature family is 'activation', which models player-chosen abilities. A new family is needed for passive, event-tr
- **initiative_window (new RestResetCadence kind or new trigger type)** (new_variant) — The trigger is rolling Initiative — a specific combat-start event with no existing representation in RestResetCadence (short_rest, long_rest, short_or_long_rest, partial_short_full_long) or ClassFeatureActivationCost.
- **refill_resource_to_minimum (new ClassFeatureEffect kind)** (new_variant) — The effect is 'regain Focus Points until you have 4' — a partial refill of a named shared resource pool to a minimum threshold. This is not heal_hp (no HP involved) and not grant_extra_action. No existing ClassFeatureEffect variant covers c
- **resource_below_threshold (conditional gate)** (new_variant) — The effect only applies if the caster's current Focus Points count is at or below a specific threshold (3). This 'if you have N or fewer' conditional is not modeled anywhere in the current surface types.
- **conditional_on_feature_not_used (negative feature interlock)** (new_variant) — The effect is suppressed if the monk also used Uncanny Metabolism on the same Initiative roll. This mutual exclusion interlock between two features has no surface representation.

### monk_quivering_palm_l17

- **store_and_release_class_feature** (new_subgraph) — Quivering Palm is structurally a two-phase feature: (1) plant vibrations on a Flurry of Blows hit while spending Focus Points, creating a persistent marked state on one creature; (2) later detonate with a separate activation cost, firing a
- **focus_point_resource (new variant of ClassFeatureResource)** (new_variant) — The plant phase consumes 4 Focus Points — a pooled class resource with its own cap, reset cadence, and partial-refill rules (see Monk's Focus). UseCountResource with kind='use_count' models a per-feature charge count, not the shared Focus P
- **on_flurry_hit (ClassFeatureActivationCost)** (new_variant) — The plant activation is gated on landing a hit during Flurry of Blows — an attack-conditional trigger, not a free action or a bonus action. ClassFeatureActivationCost only supports 'free' | 'bonus_action'.
- **forgo_attack (ClassFeatureActivationCost)** (new_variant) — The detonation can alternatively be triggered by giving up one attack from the Attack action — a cost type absent from ClassFeatureActivationCost. This is distinct from 'action' (which uses the whole action) and from 'bonus_action'. An 'act
- **save_gate_damage (ClassFeatureEffect)** (new_variant) — The detonation fires a Constitution saving throw dealing 10d12 Force damage on fail, half on success. ClassFeatureEffect only supports grant_extra_action and heal_hp. A damage-dealing save gate effect is needed.

### monk_unarmored_defense_l1

- **passive family for ClassFeatureMechanics** (new_subgraph) — Unarmored Defense is always-on with no activation step, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires activationCost/resource/resetCadence — none of which apply here. A 'p
- **set_base_ac_formula effect for ClassFeatureEffect** (new_variant) — The feature replaces the creature's base AC with a formula referencing two named ability modifiers (DEX + WIS) rather than applying a flat delta. No existing ClassFeatureEffect (grant_extra_action, heal_hp) or ReactionEffect (modify_ac with
- **equipment_condition predicate for passive features** (new_variant) — The AC formula only applies when the monk is not wearing armor and not wielding a Shield. This 'while not equipped with X' conditional has no surface representation. A predicate type is needed to gate passive effects on equipment state.

### monk_unarmored_movement_l2

- **passive_conditional family for ClassFeatureMechanics** (new_subgraph) — Unarmored Movement is always-on given a condition (no armor, no shield). It has no activation cost, no use-count resource, and no reset cadence. The current `activation` family structurally requires all three of those fields; forcing them i
- **modify_speed effect for ClassFeatureEffect** (new_variant) — The unit's core effect is a numeric speed bonus. The v4 atom `modify_speed` exists in the taxonomy but is absent from the `ClassFeatureEffect` union in types.ts, which only covers `grant_extra_action` and `heal_hp`. Adding a `ModifySpeedEff
- **enablement_condition predicate for passive features** (new_variant) — The speed bonus is conditional on armor/shield absence. The surface has no predicate type to express 'feature is active only while <condition> holds'. This is distinct from a target filter or save gate — it is an ongoing enablement guard th
- **ThresholdTiers<number> for speed amount (class axis)** (new_variant) — The speed bonus scales by monk class level through threshold tiers (L2: +10, L6: +15, L10: +20, L14: +25, L18: +30). The `ThresholdTiers<number>` type exists in types.ts but is not wired into any `ClassFeatureEffect` amount field (since `mo

### paladin_aura_expansion_l18

- **passive_class_feature** (new_subgraph) — Aura Expansion is permanently active from the moment it is acquired — no trigger, no cost, no use-count pool, no reset cadence. ClassFeatureMechanics only has the 'activation' family, which requires all three. A new 'passive' family is need
- **expand_emanation_radius** (new_atom) — The mechanic is a radius upgrade on a named existing class feature. No v4 effect atom covers this. modify_range applies to spell/attack targeting range, not the spatial footprint of a persistent aura that is continuously evaluated each turn

### paladin_aura_of_courage_l10

- **passive_aura (class-feature family)** (new_subgraph) — Aura of Courage is always-on: no activation cost, no use count, no reset cadence. The single existing class-feature family ('activation') requires all three, making any encoding dishonest. A 'passive_aura' family is needed whose mechanics h
- **grant_condition_immunity** (new_atom) — The feature grants Immunity (not resistance) to the Frightened condition. The v4 atom inventory has 'grant_resistance' and 'apply_condition'/'remove_condition', but Immunity is a distinct game concept in SRD 5.2.1 (separate rule tier from r
- **aura_scope attachment for class features** (new_variant) — The aura's spatial scope ('while in your Aura of Protection') is a named, always-active radius around the paladin. The current Attachment union (self / target / area / mark) is designed for spells with cast-time targeting. Class feature aur

### paladin_epic_boon_l19

- **passive_advancement** (new_subgraph) — Class features that are granted permanently at a given level (no activation, no resource, no reset) have no mechanics family in the surface. All existing ClassFeatureMechanics share the 'activation' family which mandates activationCost, res
- **grant_feat** (new_atom) — The effect of this feature is gaining a feat permanently. No effect atom in v4 captures feat grants. The closest candidate (grant_proficiency) models a proficiency bonus, not a full feat with its own mechanics. A feat grant opens a player-c
- **feat_category_choice (FeatScope variant)** (new_variant) — The feat selection is scoped to a category ('Epic Boon feat') with an open fallback ('or another feat of your choice for which you qualify'). The surface has no type for a player-resolved choice over a feat category. This is a distinct sele

### paladin_faithful_steed_l5

- **multi_grant_class_feature** (new_subgraph) — Faithful Steed grants two distinct effects at level-up time: a passive always-prepared grant and an active free-cast use-count resource. The current ClassFeatureMechanics only has a single `activation` family with one `effect` field. No exi
- **grant_spell_access (as ClassFeatureEffect variant)** (new_variant) — The 'always prepared' mechanic adds a named spell to the paladin's always-prepared list. The v4 taxonomy has `grant_spell_access` as an effect atom but ClassFeatureEffect only has GrantExtraActionEffect | HealHpEffect. A new variant is need
- **grant_free_spell_cast (as ClassFeatureEffect variant)** (new_variant) — The free-cast mechanic allows casting a specific named spell once per long rest without expending a spell slot. This is mechanically distinct from grant_extra_action (which grants a generic action) and from heal_hp. A new ClassFeatureEffect

### paladin_fighting_style_l2

- **passive_grant (class feature family)** (new_subgraph) — The feature grants a permanent benefit at level-up with no activation cost, no use_count resource, and no rest reset. The only existing class feature family is 'activation', which requires all three of those. A 'passive_grant' (or 'level_ch
- **grant_feat** (new_atom) — The primary mechanic is granting a feat (one of the Fighting Style feats). No 'grant_feat' atom exists in v4 taxonomy or the surface types. This is distinct from 'grant_spell_access' — it grants an entire feat, not just spell access.
- **grant_spell_access in ClassFeatureEffect** (new_variant) — The Blessed Warrior option grants access to two Cleric cantrips with a specified spellcasting ability (Charisma). The v4 taxonomy has a 'grant_spell_access' effect atom, but ClassFeatureEffect in types.ts only has GrantExtraActionEffect | H
- **choose_option mechanic (level-up menu)** (new_variant) — The feature presents a menu: pick a Fighting Style feat OR pick Blessed Warrior. This is a 'choose one from set' pattern at level-up. No surface shape captures a top-level class feature that branches into mutually exclusive options at chara

### paladin_radiant_strikes_l11

- **ClassFeaturePassiveOnHitMechanics** (new_subgraph) — Radiant Strikes is a permanent passive rider on every qualifying attack hit. It requires no activation, no resource pool, and no rest reset. The existing ClassFeatureMechanics = ClassFeatureActivationMechanics family mandates activationCost
- **damage_on_hit (ClassFeatureEffect)** (new_variant) — ClassFeatureEffect only contains grant_extra_action and heal_hp. The extra Radiant damage rider on every weapon/unarmed hit is neither. DamageOnHitOperation already exists in the spell surface (OngoingOperation) and could be reused or mirro

### paladin_restoring_touch_l14

- **feature_augmentation** (new_subgraph) — Restoring Touch is not a standalone activated feature. It fires as a rider when Lay On Hands is used, granting an optional remove_condition effect within that activation. No existing class-feature family models 'this feature augments anothe
- **ClassFeatureActivationCost: cost_from_feature_pool (or similar trigger model)** (new_variant) — The cost is variable: 5 HP drawn from the Lay On Hands healing pool per condition removed. This is neither 'free' nor 'bonus_action'. It is a per-application expenditure from a sibling feature's resource — a cost shape the surface cannot re
- **ClassFeatureEffect: remove_condition** (new_variant) — The v4 atom 'remove_condition' exists in the taxonomy but ClassFeatureEffect in types.ts only supports grant_extra_action and heal_hp. Restoring Touch's sole effect is removing one or more conditions — not healing and not granting an extra
- **Condition: blinded | charmed | deafened | frightened | paralyzed | stunned** (new_variant) — The surface Condition type currently contains only 'prone' (introduced for Topple mastery). Restoring Touch requires six additional conditions. These are all standard SRD 5.2.1 conditions and will be needed by future units regardless.

### paladin_spellcasting_l1

- **spellcasting_grant** (new_subgraph) — Spellcasting is a passive persistent capability grant, not an activation. The feature permanently establishes a spell slot pool, grants access to a prepared spell list, and sets the spellcasting ability. The existing 'activation' family req
- **grant_spell_slots** (new_variant) — The feature grants a spell slot pool as a class-level resource (long-rest reset, tiered by class level per the Paladin Features table). No ClassFeatureEffect variant covers this. The v4 atom 'spell_slot' is an individual spell consumption n
- **grant_spell_list_access** (new_variant) — The feature grants access to the paladin spell list with a prepared-spells count that scales by class level. The v4 atom 'grant_spell_access' exists but is absent from ClassFeatureEffect. The preparation rule (choose N spells, replace one o
- **set_spellcasting_ability** (new_variant) — The feature sets Charisma as the spellcasting ability, which governs spell attack rolls and spell save DCs. There is no surface concept for this at all — it is neither a ClassFeatureEffect nor a scaling node.

### passwall

- **environment_modification** (new_subgraph) — Passwall creates a traversable passage in a solid surface for a timed duration with a cleanup effect on expiry. No existing spell family models this: 'ongoing_effect' requires a roll or damage operation on creatures; 'activation' requires a
- **object_surface attachment** (new_variant) — Passwall targets a point on a specific solid surface (a material-typed surface: wood, plaster, or stone). The existing 'location' attachment (door_or_window, from Alarm) is a closed enum that does not cover material-typed wall/ceiling/floor
- **on_expiry cleanup: eject_occupants** (new_variant) — When the passage expires, creatures and objects inside are safely ejected to the nearest unoccupied space. This is a deterministic cleanup behavior tied to the lifecycle 'expire' atom, but no existing lifecycle atom or effect covers spatial

### planar_ally

- **summon_creature_family** (new_subgraph) — Planar Ally conjures a free-willed creature into an unoccupied space within range. No existing spell mechanics family supports this shape: 'activation' phases are restricted to attack_roll and save_gate; 'ongoing_effect' requires a persiste
- **create_companion effect variant in spell Effect type** (new_variant) — The spell Effect type only has 'damage' and 'none'. The v4 atom 'create_companion' exists in the taxonomy (Section 9, Effect Atoms) but is absent from the surface Effect union. Summoning a creature to the battlefield requires this variant.
- **negotiation_gate** (new_subgraph) — After the creature appears it is under no compulsion. The caster must negotiate a service for payment; if no agreement is reached, the creature immediately leaves. This conditional outcome driven by DM adjudication has no representation in

### plane_shift

- **unconditional_phase (ActivationPhase)** (new_variant) — Plane Shift has no attack roll and no saving throw. It transports willing creatures with no resolution gate. The activation family requires every phase to be attack_roll or save_gate, which makes it impossible to honestly encode any spell t
- **transport_exile** (new_atom) — The v4 taxonomy lists transport_exile as an effect atom but it is absent from types.ts Effect union. Without it, the transport mechanic cannot be expressed even if a suitable phase existed. DamageEffect | NoneEffect does not cover interplan

### prestidigitation

- **choice_spell_family** (new_subgraph) — Prestidigitation's core structure is 'at cast time, choose one of N distinct options, each with its own effect.' No existing spell family models this. The four current families (ongoing_effect, activation, triggered_reaction, anchored_trigg
- **create_sensory_effect (Effect variant)** (new_variant) — The Sensory Effect option produces an instantaneous harmless sensory phenomenon. The current Effect union (DamageEffect | NoneEffect) cannot represent this. A 'create_sensory_effect' effect variant or an 'environmental_effect' family is nee
- **manipulate_object_state (Effect variant)** (new_variant) — Fire Play and Clean/Soil produce deterministic state changes on environmental objects (a fire is lit or extinguished; an object is clean or soiled). No Effect type covers object-state manipulation. The v4 taxonomy has 'create_object' and 'a
- **modify_material_property (Effect variant, timed)** (new_variant) — Minor Sensation modifies a material property (temperature, flavor) for a timed duration. This is a deterministic, non-damage, non-condition effect with no existing surface representation.
- **apply_visual_mark (Effect variant, timed)** (new_variant) — Magic Mark places a visual marking on an object or surface for 1 hour. Attachment target is an object or surface (v4 atoms 'object'/'location'), neither of which is in the Attachment type. Effect type for applying a cosmetic mark is also ab
- **create_object (Effect variant)** (new_variant) — 'create_object' exists in the v4 atom taxonomy but is absent from the surface types.ts Effect union. Minor Creation requires it. The trinket has a bounded duration (end of next turn) and explicit zero-damage, zero-monetary-worth constraints
- **object / surface (Attachment kind)** (new_variant) — Several Prestidigitation options target objects or surfaces, not creatures or areas. The Attachment type has no 'object' or 'surface' kind. v4 taxonomy lists 'object' and 'location' attachment atoms.

### prismatic_spray

- **random_dispatch_table** (new_subgraph) — Prismatic Spray's core mechanic is a per-target 1d8 roll that selects one of 8 mutually exclusive effect outcomes. No existing payload family models 'randomly select one branch from a table'. The activation family uses ordered sequential ph
- **Attachment.area.shape.cone** (new_variant) — Prismatic Spray fires a 60-foot cone. The current area attachment only supports shape: sphere. A cone shape variant is needed.
- **repeat_save_condition_progression** (new_subgraph) — Ray 6 (Indigo) imposes Restrained then tracks non-consecutive CON saves toward either 3 successes (condition ends) or 3 failures (Petrified). This is a condition_progression atom (present in v4 taxonomy) but there is no surface type that ex
- **Effect.transport_exile** (new_variant) — Ray 7 (Violet) on a failed WIS save teleports the creature to another plane of existence. The v4 atom transport_exile exists but there is no surface Effect variant exposing it.
- **table_reroll_meta_outcome** (new_subgraph) — Ray 8 (Special) causes the target to be struck by two rays: roll twice, rerolling any 8. This is a recursive table invocation with a reroll filter — not expressible in any current shape even with widening of the above items.

### prismatic_wall

- **zone_object_creation** (new_subgraph) — Prismatic Wall creates a persistent physical barrier (wall or globe) that occupies space, has its own AC (10), and affects creatures that enter or pass through it. None of the four existing spell families (ongoing_effect, activation, trigge
- **multi_layer_traversal** (new_subgraph) — The wall has 7 ordered layers that each fire a DEX saving throw as a creature passes through, one layer at a time. This is not the existing 'phases' array on ActivationMechanics (which models sequential attack/save resolutions against a tar
- **Condition: restrained, blinded, petrified** (new_variant) — The current surface Condition type is a closed string literal containing only 'prone'. Indigo layer applies Restrained (escalating to Petrified on 3 failures). The proximity aura and Violet layer apply Blinded. These three conditions are no
- **repeat_save in spell Effect context** (new_variant) — The Indigo layer requires tracking 3 successes and 3 failures across successive CON saves at the end of each turn, resolving to either condition-end or Petrified. The v4 atom 'repeat_save' / 'condition_progression' exists in the taxonomy bu
- **transport_exile in spell Effect context** (new_variant) — The Violet layer on a failed WIS save teleports the creature to another plane (DM's choice). The v4 atom 'transport_exile' exists in the taxonomy but is not in the surface Effect discriminated union. Adding it to Effect would be a surface w
- **layer_destruction_condition** (new_variant) — Each of the 7 layers has a unique destruction condition: specific damage thresholds of a given type (Red: 25+ cold damage; Blue: 25+ fire damage; Yellow: 60+ force damage), specific spells by name (Gust of Wind destroys Orange; Passwall des
- **proximity_aura trigger** (new_variant) — The wall triggers a CON save for any creature that moves within 20 feet of it or starts its turn there. This is not 'enters_area' (which fires when a creature enters an area) but a radial proximity check relative to the wall object's edge.

### ranger_ability_score_improvement_l4

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Ability Score Improvement is a permanent character-progression grant that fires at level-up. It has no activation cost, no use-count resource, and no rest reset cadence. The current surface only supports the 'activation' family, which struc
- **grant_feat** (new_atom) — The mechanic is 'you receive a feat' (specifically the ASI feat, or any feat you qualify for). The current ClassFeatureEffect union (GrantExtraActionEffect | HealHpEffect) has no variant for feat grants. The v4 atom taxonomy also lacks a 'g
- **recurring_at_levels on ClassFeatureRecord (or passive_grant mechanics)** (new_variant) — The feature is gained at Ranger levels 4, 8, 12, and 16. The current ClassFeatureRecord has a single acquiredAtLevel field. Recurring per-class-level grants either need a list of levels or a threshold-tier schedule on the feature record its

### ranger_expertise_l9

- **passive family for ClassFeatureMechanics** (new_subgraph) — Expertise is a permanent, one-time proficiency upgrade with no activation cost, no use-count resource, and no rest reset. The only existing ClassFeatureMechanics family is 'activation', which requires all three of those fields. Forcing this
- **grant_proficiency variant of ClassFeatureEffect** (new_variant) — The v4 atom 'grant_proficiency' exists in the taxonomy but is absent from the ClassFeatureEffect union (which only has grant_extra_action and heal_hp). Expertise specifically grants double-proficiency (Expertise) on chosen skills, which map

### ranger_extra_attack_l5

- **passive_modifier (class feature family)** (new_subgraph) — Extra Attack is a permanent, always-on modification to the Attack action. It has no activation cost, no use-count resource, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires all three of th
- **scale_attack_count** (new_atom) — The v4 taxonomy already names this atom ('The number of attacks per Attack action grows with level. Example: Extra Attack (2 → 4)'), but the surface ClassFeatureMechanics type has no family that can emit it. Once a passive_modifier family e

### ranger_feral_senses_l18

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Feral Senses is a permanent always-on trait with no activation event, no use count, and no rest reset cadence. The only current ClassFeatureMechanics family is 'activation', which structurally requires activationCost + resource + resetCaden
- **grant_sense variant in ClassFeatureEffect** (new_variant) — Even if a passive_grant family existed, ClassFeatureEffect only offers grant_extra_action and heal_hp. Blindsight is a special sense — the v4 atom inventory already contains grant_sense (Effect Atoms section), but it is absent from the Clas

### ranger_foe_slayer_l20

- **passive_modifier family for ClassFeatureMechanics** (new_subgraph) — Foe Slayer is a permanent always-on character milestone with no activation, no resource, and no reset cadence. The current ClassFeatureMechanics only supports the 'activation' family (activationCost + resource + resetCadence + effect). That
- **cross_unit_property_override effect variant** (new_variant) — Even if a passive family were added, no ClassFeatureEffect variant can express 'change the die size of a specific named spell's damage output'. This requires a cross-unit reference (pointing at hunter's_mark) with a property override (dieSi

### ranger_hunters_prey_l3

- **passive_on_hit_rider (class feature family)** (new_subgraph) — Colossus Slayer is a passive weapon-hit rider on the class feature record. The only class feature family is 'activation', which requires an activationCost + use_count resource + resetCadence + effect. Colossus Slayer has none of these — it
- **passive_on_attack_rider (class feature family)** (new_subgraph) — Horde Breaker fires when the ranger *makes* a weapon attack (before resolution, not on hit). There is no 'on_attack_window' atom — only 'on_hit_window'. The trigger is pre-resolution, granting a second optional weapon attack against a diffe
- **choose_one_of_N_options (top-level class feature choice structure)** (new_subgraph) — Hunter's Prey is not a single feature — it is a container that grants one of two sub-options, replaceable on Short or Long Rest. There is no vocabulary in UnitRecord, ClassFeatureRecord, or ClassFeatureMechanics for 'choose one of these var
- **hp_below_max_predicate (conditional filter on damage_on_hit)** (new_variant) — Colossus Slayer's +1d8 only applies if the target is currently missing HP. This is a runtime predicate on the creature's HP state that gates whether the rider fires. No existing atom or filter variant captures this check. The closest existi
- **on_attack_window** (new_atom) — Horde Breaker's trigger is 'when you make an attack with a weapon' — before attack roll resolution. The v4 atom inventory has on_hit_window and on_miss_window (post-resolution) but no pre-resolution attack window. This is a distinct timing

### ranger_precise_hunter_l17

- **passive_class_feature** (new_subgraph) — Precise Hunter is a permanently-active modifier with no activation, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires activationCost + resource (use_count) + resetCadence. A '
- **modify_roll_advantage in ClassFeatureEffect** (new_variant) — The effect is Advantage on attack rolls scoped to the Hunter's Mark target. ClassFeatureEffect currently only covers GrantExtraActionEffect and HealHpEffect. A modify_roll_advantage variant (already present in MasteryEffect and v4 taxonomy)
- **mark-scoped attachment for class feature modifiers** (new_variant) — The advantage is conditional on the target being the current Hunter's Mark target. This requires a way to scope a roll modifier to 'attacks against the marked creature' — distinct from a general advantage buff and related to the mark attach

### ranger_relentless_hunter_l13

- **passive_class_feature_family** (new_subgraph) — Relentless Hunter is always-on with no activation, no use-count resource, and no reset cadence. The only ClassFeatureMechanics family is 'activation', which requires activationCost, resource (use_count), and resetCadence — none of which exi
- **suppress_concentration_break** (new_atom) — The feature suppresses the concentration saving throw that fires when the bearer takes damage while concentrating on Hunter's Mark. No v4 effect atom covers 'prevent damage from triggering the concentration check for a named spell'. The exi

### ranger_roving_l6

- **passive family for ClassFeatureMechanics** (new_subgraph) — Roving is always-on with no activation trigger, no use-count resource, and no rest-reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires all three of those fields. A 'passive' family is needed for fea
- **modify_speed variant of ClassFeatureEffect** (new_variant) — The v4 atom 'modify_speed' exists in the taxonomy but is not surfaced as a ClassFeatureEffect variant. Roving needs to express: increase walking Speed by +10 ft. The current ClassFeatureEffect union only contains GrantExtraActionEffect and
- **grant_alternate_speed variant of ClassFeatureEffect (climb, swim)** (new_variant) — Roving grants a Climb Speed and a Swim Speed each equal to the character's walking Speed. This is not a flat numeric increase but a derived assignment (value = base walking speed). No existing effect covers granting a new movement type whos
- **armor-type condition guard on passive effects** (new_variant) — The Speed bonus is conditional: 'while you aren't wearing Heavy armor'. The surface has no conditional predicate type for passive effects. This guard is a closed armor-category filter, not a runtime roll or save.

### ranger_spellcasting_l1

- **spellcasting_grant (new ClassFeatureMechanics family)** (new_subgraph) — Spellcasting (Ranger L1) is a passive system-grant feature, not an activated feature with a use-count. The only existing ClassFeatureMechanics family 'activation' requires activationCost + UseCountResource + ClassFeatureEffect. None of thes
- **grant_spell_access (ClassFeatureEffect variant)** (new_variant) — The v4 atom 'grant_spell_access' exists in the taxonomy (Effect Atoms) but has no corresponding ClassFeatureEffect variant in types.ts. Ranger Spellcasting needs to express: (a) access to the Ranger spell list, (b) a per-class-level count o
- **spell_slot_schedule (new surface type for class slot tables)** (new_variant) — Spell slot allocation is not a use_count: it is a 2D table of (class level → per-spell-level slot counts). UseCountResource models a single integer cap (fixed or threshold-tiered), which cannot express a multi-level slot schedule (e.g., 2 L

### ranger_superior_hunters_prey_l11

- **passive_rider (class feature family)** (new_subgraph) — Superior Hunter's Prey fires automatically on a game event (dealing damage to a marked creature). It is not an 'activation' — there is no action/bonus action cost, no rest-based resource, and no use_count that resets on rest. The only Class
- **on_damage_window (ClassFeatureTrigger)** (new_variant) — The trigger is 'when you deal damage to a creature marked by Hunter's Mark' — a damage event conditioned on a spell mark being present on the target. This is neither an on_hit_window (which is attack-roll-scoped) nor any existing ClassFeatu
- **once_per_turn (ClassFeature reset cadence or usage limit)** (new_variant) — The usage limit is 'once per turn', which has no analog in RestResetCadence (all variants reset on short or long rest). MasteryUsageLimit.once_per_turn exists but is typed only for MasteryMechanics; ClassFeatureMechanics has no such variant
- **damage_cross_ref (ClassFeatureEffect or PassiveRiderEffect)** (new_variant) — The damage amount is not a standalone DiceExpr — it is 'that spell's extra damage', a reference to Hunter's Mark's DamageOnHitOperation amount. No effect type in ClassFeatureEffect or anywhere else in the surface can represent a damage amou
- **secondary_creature_within_range (target selection for passive rider effect)** (new_variant) — The damage is applied to a 'different creature that you can see within 30 feet of the first creature' — a secondary target relative to the primary (marked) target. SecondaryTargetSelection exists only in MasteryMechanics (GrantWeaponAttackR

### ranger_tireless_l10

- **ClassFeatureActivationCost { kind: "action" }** (new_variant) — The Temporary Hit Points sub-feature costs a Magic action (i.e., the standard Action to cast a spell or use a magic feature). The current ClassFeatureActivationCost only allows 'free' and 'bonus_action'. 'action' is a distinct, common activ
- **grant_temp_hp** (new_atom) — The effect grants Temporary Hit Points, which are mechanically distinct from regular healing (heal_hp). Temporary HP form a separate HP buffer, don't stack, and are not subject to the same interactions as real HP recovery. The v4 taxonomy h
- **UseCountCap { kind: "ability_score_derived"; ability: Ability; minimum: number }** (new_variant) — The use count scales with Wisdom modifier (minimum 1), not a fixed number or a level-threshold schedule. UseCountCap currently supports 'fixed' and 'threshold_tiers'. An ability-score-derived use count is a distinct cap shape needed for sev
- **DiceExpr flat: { kind: "ability_modifier"; ability: Ability } | number** (new_variant) — The temp HP amount is 1d8 + Wisdom modifier. DiceExpr.flat is currently a static number. An ability modifier addend is a distinct shape needed to honestly encode the heal/temp-HP amount here.
- **ClassFeatureMechanics family: "passive_rest_trigger"** (new_subgraph) — The Decrease Exhaustion sub-feature has no activation cost, no use count, and no reset cadence — it fires automatically whenever a Short Rest ends. There is no existing ClassFeatureMechanics family that can honestly model a passive rest-tri
- **reduce_exhaustion (or: extend remove_condition to cover exhaustion levels)** (new_atom) — Decreasing an exhaustion level by 1 is a partial-reduction effect distinct from 'remove_condition' (which would clear it entirely). Exhaustion is not in the current Condition type either. v4 has 'remove_condition' but exhaustion level decre

### regenerate

- **compound_spell (activation_with_ongoing)** (new_subgraph) — Regenerate has both an immediate activation phase (4d8+15 heal on cast) and a persistent ongoing effect (1 HP/turn for 1 hour). No current family models this combination. The activation family covers one-shot resolution; the ongoing_effect
- **HealEffect (spell Effect union)** (new_variant) — Spell Effect is currently `DamageEffect | NoneEffect`. The immediate 4d8+15 HP restoration on cast is a heal, not damage. The class-feature layer already has HealHpEffect; the spell layer needs a corresponding heal variant so the tracer can
- **periodic_heal (OngoingOperation union)** (new_variant) — OngoingOperation is currently `RollModifierOperation | DamageOnHitOperation`. The per-turn 1-HP regen is a time-gated heal that fires at the start of each of the target's turns, not on a hit and not a roll modifier. A new periodic_heal vari
- **restore_body (or extend apply_condition / return_on_end)** (new_atom) — Severed body part regrowth has no counterpart in the v4 atom inventory. It is a physical restoration effect triggered after a time delay (2 minutes). The closest atom `return_on_end` handles returning state at spell end, not restoring physi

### resurrection

- **direct_effect activation phase** (new_subgraph) — Resurrection is instantaneous and applies effects directly to a touched dead creature — no attack roll, no saving throw. The current ActivationPhase union (attack_roll | save_gate) has no variant for unconditional direct-effect delivery. Th
- **heal_hp in spell Effect union** (new_variant) — HealHpEffect exists in the class-feature layer but is absent from the spell Effect union (damage | none). Resurrection restores all HP to the target.
- **cleanse / remove_condition in spell Effect union** (new_variant) — The v4 remove_condition atom exists but is not in the spell Effect union. Resurrection neutralizes poisons and closes all mortal wounds.
- **modify_roll_numeric with per-rest decay schedule** (new_atom) — The target receives a -4 penalty to D20 Tests that decreases by 1 per Long Rest until reaching 0. No existing atom models a persistent numeric modifier with a step-down rest-based decay. Additionally, 'D20 Tests' (attack rolls + saves + abi
- **post-cast caster-state penalty (conditional on target property)** (new_atom) — If the target has been dead ≥ 365 days, the caster suffers until their next Long Rest: cannot cast spells and has Disadvantage on D20 Tests. This involves (a) effects targeting the caster rather than the spell's attachment target, (b) condi

### rogue_ability_score_improvement_l4

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — ASI is a permanent passive grant acquired at level-up. It has no activation cost, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which structurally requires activationCost + resource + re
- **grant_feat_choice** (new_atom) — No existing ClassFeatureEffect covers granting a feat or a choice among feats. The two existing effects are grant_extra_action and heal_hp, both runtime combat effects. A feat grant is a character-advancement effect: it fires once at level

### rogue_cunning_action_l2

- **bonus_action_unlock** (new_subgraph) — Cunning Action is a passive, unlimited-use unlock that lets the rogue spend their Bonus Action to perform Dash, Disengage, or Hide. The current ClassFeatureMechanicsHeader mandates resource: UseCountResource and resetCadence: RestResetCaden
- **UseCountCap.unlimited** (new_variant) — UseCountCap currently only allows 'fixed' or 'threshold_tiers', both of which imply an exhaustible pool. Cunning Action has no pool — it is available every turn. A new variant (e.g., { kind: 'unlimited' }) is required to represent truly unl
- **grant_bonus_action_option** (new_atom) — The effect of Cunning Action is to allow specific standard actions (Dash, Disengage, Hide) to be taken as a Bonus Action. The existing grant_extra_action atom means 'one additional action beyond your normal action', which is what Action Sur

### rogue_cunning_strike_l5

- **on_sneak_attack_hit_trigger (class feature family)** (new_subgraph) — Cunning Strike fires when Sneak Attack damage is dealt — it is not a standalone activation. No existing ClassFeatureMechanics family has an on-hit trigger shape. The mastery 'on_hit_trigger' family covers weapon hits but is not usable for c
- **dice_cost resource (forgo Sneak Attack damage dice)** (new_variant) — Each Cunning Strike effect costs 1d6 of Sneak Attack damage — the rogue removes those dice before rolling. This 'forgo N damage dice' pattern does not exist in any current resource atom. It is not use_count, action_quota, bonus_action_quota
- **menu_of_effects (choose one at use-time)** (new_subgraph) — Cunning Strike exposes a set of effects the rogue selects from each time the trigger fires. The current surface has no construct for 'pick one of N effects when activating'. ClassFeatureActivationMechanics has a single effect field; mastery
- **Condition: poisoned** (new_variant) — The Poison effect applies the Poisoned condition. The current Condition type only contains 'prone'. Poisoned must be added to the Condition union.
- **repeat_save (save at end of each of target's turns)** (new_variant) — The Poison effect includes a repeating save: 'At the end of each of its turns, the Poisoned target repeats the save, ending the effect on itself on a success.' This is a distinct resolution shape from the single save_gate atom — it is a per
- **size_constraint on save_gate (Large or smaller)** (new_variant) — The Trip effect only applies to targets that are Large or smaller. No current surface type allows a target-size predicate to gate whether the effect fires.
- **move effect for ClassFeatureEffect (Withdraw: half speed, no OA)** (new_variant) — The Withdraw effect grants movement (up to half Speed) without provoking Opportunity Attacks. Neither 'move' nor 'deny_opportunity_attack' (both v4 atoms) exist in the ClassFeatureEffect union. They would need to be added.

### rogue_devious_strikes_l14

- **cunning_strike_option** (new_subgraph) — Devious Strikes adds options to the Cunning Strike menu. Each option triggers on a Sneak Attack hit (not an independent activation), costs a subset of the rogue's sneak attack dice, and fires a save-gate rider on the target. No existing cla
- **sneak_attack_dice_cost resource** (new_variant) — Each option costs dice from the rogue's per-attack Sneak Attack pool (2d6, 3d6, or 6d6). This is not a use_count, not a spell_slot, and not a charge — it is a fractional expenditure from a per-attack dice pool. No existing UseCountResource
- **Condition enum: blinded, unconscious** (new_variant) — The Condition surface type is closed to only 'prone'. Obscure requires 'blinded' and Knock Out requires 'unconscious'. Both are standard SRD 5.2.1 conditions used as apply_condition targets.
- **repeat_save surface type** (new_variant) — Knock Out requires the target to repeat the CON save at the end of each of its turns. The v4 taxonomy includes 'repeat_save' as a resolution atom, but types.ts has no surface representation for repeat saves in class feature riders.
- **restrict_turn_economy** (new_atom) — Daze restricts the target to choosing exactly one of {move, take an action, take a bonus action} on its next turn. This is distinct from the existing restrict_action_set atom (which filters which action type is valid within an extra-action

### rogue_evasion_l7

- **passive family for ClassFeatureMechanics** (new_subgraph) — Evasion fires automatically on a trigger (DEX save for half-damage) with no activation cost, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which structurally requires all three. A 'passi
- **reduce_damage_taken** (new_atom) — Evasion negates damage entirely on a successful DEX save (0x instead of 1/2x). This is mechanically distinct from grant_resistance (which halves damage). The v4 taxonomy §12 records this atom as a known residue under 'reduce_damage_taken di
- **condition_use_block on ClassFeatureActivationCost or feature-level guard** (new_variant) — The incapacitated-blocks-feature constraint ('You can't use this feature if you have the Incapacitated condition') has no representation in the current surface. This is a secondary gap — it would need a condition-gating field on the feature

### rogue_reliable_talent_l7

- **passive_class_feature** (new_subgraph) — Reliable Talent is always-on with no activation decision, no use_count, and no reset cadence. The sole existing ClassFeatureMechanics family ('activation') mandates all three. A 'passive' family is needed for always-on class features that f
- **modify_roll_floor** (new_variant) — The effect replaces any d20 roll of 9 or lower with 10 — a conditional floor substitution. v4 has modify_roll_substitute, which could in principle cover this, but the exact shape (floor threshold + proficiency-gated trigger) may require an

### rogue_rogue_subclass_l3

- **subclass_selection** (new_subgraph) — Subclass selection at level 3 is a one-time character-progression choice with no activation cost, no use-count resource, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires all three. No exis

### rogue_slippery_mind_l15

- **ClassFeaturePassiveMechanics** (new_subgraph) — Slippery Mind grants proficiency in Wisdom and Charisma saving throws permanently upon reaching level 15. It is never activated, consumes no resource, and has no reset cadence. The only existing class feature family is 'activation', which r
- **GrantProficiencyEffect** (new_variant) — The grant_proficiency atom exists in v4 taxonomy (§9 Effect Atoms) but is absent from ClassFeatureEffect, which only has GrantExtraActionEffect | HealHpEffect. Slippery Mind's mechanic is purely a proficiency grant on two saving throws (Wis

### rogue_sneak_attack

- **class_feature.on_hit_trigger** (new_variant) — Sneak Attack is a passive class feature whose core mechanic is an on-hit rider, but class_feature only supports the activation family.
- **class_feature.on_hit_trigger.qualifying_predicates** (new_variant) — The surface needs to express Sneak Attack's eligibility gates: finesse or ranged weapon, advantage OR nearby non-incapacitated ally, and no disadvantage.
- **damage_type_from_weapon_hit** (new_variant) — Existing damage surfaces require a fixed damage type, but Sneak Attack inherits the damage type from the qualifying weapon hit.

### rogue_sneak_attack_l1

- **on_hit_trigger family for ClassFeatureMechanics** (new_subgraph) — Sneak Attack is a passive damage rider on weapon attack rolls, not an activated feature. ClassFeatureMechanics only has the 'activation' family. A new family analogous to MasteryMechanics.OnHitTriggerMechanics is needed for class features t
- **damage_on_hit ClassFeatureEffect variant** (new_variant) — ClassFeatureEffect is limited to grant_extra_action and heal_hp. Sneak Attack needs a damage-rider effect type with a scaling DiceAmount.
- **weapon_type variable DamageType** (new_variant) — DamageType is a closed 13-value enum. Sneak Attack's damage type inherits from the weapon, which is not representable as any fixed literal. A variant such as 'weapon_damage_type' or a tagged union that marks the type as derived from the wea
- **disjunctive precondition gate for on-hit triggers** (new_variant) — Sneak Attack fires only if Advantage is held OR (ally within 5 ft AND no Disadvantage). No existing surface type models disjunctive/conjunctive preconditions on attack-roll riders. The mastery trigger vocabulary (weapon_hit / weapon_hit_mel
- **weapon_property filter (Finesse or Ranged)** (new_variant) — Sneak Attack is restricted to Finesse or Ranged weapons. No existing trigger or attachment type models a weapon-property filter.

### rogue_supreme_sneak_l9

- **cunning_strike_option** (new_subgraph) — Cunning Strike options are not standalone activated features. They are embedded choices made at Sneak Attack resolution time, cost Sneak Attack dice from the ongoing pool, have no separate activation, no use_count, and no rest-reset cadence
- **ClassFeatureActivationCost: sneak_attack_dice** (new_variant) — The cost 'N Sneak Attack dice' is not representable in ClassFeatureActivationCost (free | bonus_action). A die-pool-from-feature cost variant is needed.
- **ClassFeatureEffect: suppress_condition_removal** (new_variant) — The effect suppresses the automatic removal of the Invisible condition that would normally occur after making an attack. ClassFeatureEffect (grant_extra_action | heal_hp) has no variant for condition-removal suppression.

### rogue_thiefs_reflexes_l17

- **passive_class_feature family** (new_subgraph) — Thief's Reflexes has no activation cost, no use count, no rest reset, and no resource. It is an always-on passive modifier that fires at the start of every combat. The current ClassFeatureMechanics only has family 'activation', which requir
- **grant_extra_turn** (new_atom) — The feature grants a second full turn in the initiative order — not an extra action within an existing turn. This is mechanically distinct from grant_extra_action (Action Surge): the rogue participates in the initiative sequence a second ti
- **ClassFeatureEffect: grant_extra_turn variant** (new_variant) — Even if a passive family were added, ClassFeatureEffect needs a new variant. The existing union (GrantExtraActionEffect | HealHpEffect) has no entry for granting an additional turn in the initiative order. The new variant would need at mini
- **RestResetCadence: per_combat (or absent for passive)** (new_variant) — The current RestResetCadence options (short_or_long_rest, long_rest, short_rest, partial_short_full_long) all describe rest-based refills for use_count resources. Thief's Reflexes has no expendable resource — it applies every combat automat

### rogue_use_magic_device_l13

- **passive_trait (ClassFeatureMechanics family)** (new_subgraph) — Use Magic Device grants three always-on benefits with no activation cost, no use count, and no rest reset cadence. The only existing ClassFeatureMechanics family ('activation') mandates activationCost, resource, and resetCadence. A passive_
- **modify_attunement_cap** (new_atom) — The Attunement benefit extends the character's attunement slot count from 3 to 4. No existing ClassFeatureEffect or v4 effect atom covers a numeric change to the attunement capacity. The v4 atom 'attunement_slot' is a consumed resource, not
- **charge_refund_on_roll** (new_atom) — The Charges benefit introduces a stochastic 'roll 1d6, on 6 do not expend charges' mechanic triggered on each magic item charge expenditure. v4 has 'refund' as a procedure atom but no surface shape for a probabilistic die-gated charge refun
- **grant_scroll_access** (new_atom) — The Scrolls benefit unlocks use of any Spell Scroll with Intelligence as spellcasting ability, plus a level-scaled DC ability check for higher-level scrolls (DC 10 + spell level) and item destruction on failure. v4 has 'grant_spell_access'

### rogue_weapon_mastery_l1

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Weapon Mastery is a passive/preparatory feature — it is always-on once configured at level-up or rest. The current surface only has the 'activation' family, which implies a runtime trigger, an activation cost, and a use-count resource. None
- **GrantMasteryAccessEffect (or GrantWeaponMasterySlots) in ClassFeatureEffect** (new_variant) — The current ClassFeatureEffect union is GrantExtraActionEffect | HealHpEffect. Neither variant models 'unlock use of mastery properties for N chosen weapon kinds'. A new variant is required to represent this access-granting pattern.
- **no_resource (or absent resource) in ClassFeatureMechanicsHeader** (new_variant) — ClassFeatureMechanicsHeader mandates resource: UseCountResource. Weapon Mastery has no use count — the feature is continuously active. The surface needs either an optional resource field or a 'no_resource' variant to represent passive featu
- **reconfigure_on_long_rest cadence in RestResetCadence** (new_variant) — The existing RestResetCadence variants (short_or_long_rest, long_rest, short_rest, partial_short_full_long) all describe refilling a use-count pool. Weapon Mastery's Long Rest interaction changes which weapon kinds are selected — a reconfig

### rope_trick

- **create_space family (pocket_dimension / spatial_pocket)** (new_subgraph) — Rope Trick creates a persistent extradimensional space that creatures can voluntarily enter and inhabit for the spell's duration. This requires a payload family that models: (1) an object/location attachment (the rope + portal at its tip),
- **object attachment in Attachment union (types.ts)** (new_variant) — The rope is the attachment target (casting time: Touch, caster touches a rope). The v4 taxonomy includes 'object' as an attachment atom, but it is absent from the types.ts Attachment union. Rope Trick must attach to the rope as an object to
- **Spell Effect variants: block_targeting, block_travel, transport_exile, fall_on_end** (new_variant) — The spell's persistent effects require: (1) blocking all attacks/spells/effects from passing through the portal boundary (block_targeting + block_travel), (2) transporting entering creatures into the extradimensional space (transport_exile)

### shapechange

- **form_transformation** (new_subgraph) — Shapechange replaces the caster's entire stat block with another creature's stat block while retaining a specific set of personal attributes. No existing spell family or OngoingOperation variant can express this — ongoing_effect only suppor
- **grant_temp_hp** (new_atom) — Shapechange grants Temporary Hit Points equal to the first form's HP on cast. Temp HP is mechanically distinct from regular HP healing — they form a separate pool, do not stack, and vanish at spell end. The current heal_hp effect atom cover
- **mid_spell_form_change_activation** (new_variant) — The caster can use the Magic action during the spell's duration to adopt a different eligible form. This is a repeatable, mid-spell re-activation that costs a Magic action and re-applies the stat-block replacement. The current surface has n

### shining_smite

- **smite_activation family** (new_subgraph) — Shining Smite (and smite spells generally) fire as a Bonus Action taken AFTER a weapon hit already resolved. The immediate 2d6 Radiant damage applies to that triggering hit—not to a new spell-originated attack roll, and not to subsequent hi
- **CastingTime: bonus_action_conditional (after-hit trigger)** (new_variant) — CastingTime's bonus_action variant carries no condition field. Smite spells restrict the bonus action to 'immediately after hitting a creature with a Melee weapon or Unarmed Strike.' This timing constraint is mechanically significant: the h
- **OngoingOperation: modify_roll_advantage** (new_variant) — The ongoing effect grants Advantage on attack rolls made against the target. OngoingOperation only supports roll_modifier (numeric delta) and damage_on_hit. There is no advantage/disadvantage variant. The atom modify_roll_advantage exists i
- **deny_condition_benefit** (new_atom) — The spell prevents the target from benefiting from the Invisible condition without removing it. The Invisible condition may still be present on the creature; only its mechanical benefits (concealment, attack disadvantage/advantage) are supp

### slow

- **save_gated_persistent_debuff** (new_subgraph) — Slow applies an area save gate that, on failure, imposes a bundle of ongoing debuffs persisting for the concentration duration, with a per-creature repeat_save at end of each affected creature's turn to individually end the effect. No exist
- **Effect — debuff effects** (new_variant) — Effect is currently DamageEffect | NoneEffect. Slow's on-fail effects are a bundle of debuffs (modify_speed, modify_ac, modify_roll_numeric on Dex saves, restrict_action_set / deny reactions). All these atoms exist in v4 but are not reachab
- **ActionRestriction — one_of_action_or_bonus_action** (new_variant) — Slow restricts affected creatures to take either an action or a bonus action per turn, not both. The existing ActionRestriction.exclude can block specific StandardActionKind members but cannot model the 'choose at most one of {action, bonus
- **somatic_failure_chance** (new_atom) — Slow imposes a 25% probability that any spell with a Somatic component cast by an affected creature fails outright. This is probabilistic spell interference triggered by the debuff state. No v4 atom models a probability-gated failure inject

### sorcerer_ability_score_improvement_l4

- **level_up_grant** (new_subgraph) — ASI is a permanent character-progression grant delivered at level-up, not an activated feature. It has no activation cost, no use count, and no reset cadence. The current 'activation' family for ClassFeatureMechanics requires all three. A n
- **grant_feat** (new_atom) — The feature grants a feat (or an ability score increase, which is itself modeled as a feat per SRD 5.2.1). Neither GrantExtraActionEffect nor HealHpEffect covers this. The v4 taxonomy defers 'modify_ability_score' as out-of-scope; 'grant_fe

### sorcerer_arcane_apotheosis_l20

- **conditional_passive_family** (new_subgraph) — Arcane Apotheosis activates no action — it is a passive benefit that applies automatically inside another feature's active window (Innate Sorcery). The only ClassFeatureMechanics family is 'activation', which models features the player expl
- **waive_resource_cost** (new_atom) — The mechanic reduces the Sorcery Point cost of one Metamagic use per turn to zero. No existing ClassFeatureEffect variant expresses cost-waiving on a class resource. Current variants are 'grant_extra_action' and 'heal_hp' only.
- **sorcery_points** (new_atom) — Sorcery Points are a sorcerer-specific resource pool (Font of Magic) distinct from use_count, spell_slot, and charge. The surface has no resource atom for this pool, which funds both Metamagic options and spell-slot conversions.
- **metamagic_use** (new_atom) — Metamagic is a sorcerer-specific spell-modification system (Quickened, Twinned, Empowered, etc.) triggered at cast time using Sorcery Points. It does not fit any existing window or procedure atom. Encoding Arcane Apotheosis requires naming

### sorcerer_draconic_spells_l3

- **passive_spell_grant family for ClassFeatureMechanics** (new_subgraph) — The unit grants always-prepared spells at specific class levels with no activation cost, no use-count resource, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires all three. A passive, level
- **grant_spell_access variant for ClassFeatureEffect** (new_variant) — ClassFeatureEffect is currently GrantExtraActionEffect | HealHpEffect. Neither represents spell access. The v4 atom grant_spell_access exists but is unreachable from any ClassFeatureMechanics path.

### sorcerer_dragon_companion_l18

- **passive_spell_modifier family** (new_subgraph) — The feature permanently waives the material component for Summon Dragon. There is no class feature family for always-on passive modifications to how a specific named spell is cast. ClassFeatureMechanics only has the 'activation' family, whi
- **ClassFeatureEffect::grant_free_cast** (new_variant) — The feature grants one slot-less casting of a named spell per long rest. ClassFeatureEffect is currently GrantExtraActionEffect | HealHpEffect — there is no variant for granting free access to a specific spell with a use_count resource and
- **modify_cast_properties (or metamagic_substitute)** (new_atom) — At the moment of casting, the sorcerer may voluntarily trade away the Concentration requirement in exchange for reducing the spell's duration to 1 minute. This is a player-choice, cast-time property substitution with no v4 atom. suppress ac

### sorcerer_elemental_affinity_l6

- **passive_grant (class feature family)** (new_subgraph) — Elemental Affinity's resistance component is a permanent passive trait — no activation, no use count, no reset cadence. The only existing class feature family ('activation') mandates a UseCountResource and RestResetCadence, making it struct
- **grant_resistance (ClassFeatureEffect variant)** (new_variant) — The v4 atom 'grant_resistance' exists, but there is no ClassFeatureEffect variant that carries it. ClassFeatureEffect currently covers only 'grant_extra_action' and 'heal_hp'. Encoding resistance requires a new variant such as { kind: 'gran
- **modify_spell_damage_with_ability_mod (ClassFeatureEffect or OngoingOperation variant)** (new_variant) — The damage bonus is a conditional rider: when the sorcerer casts a spell dealing the chosen damage type, they may add their Charisma modifier to one damage roll. This is neither a fixed DiceDelta (DiceDelta has dice count + die size, not an

### sorcerer_font_of_magic_l2

- **resource_pool family for class features** (new_subgraph) — Font of Magic's primary mechanic is establishing a named, level-scaled spendable point pool (Sorcery Points). The existing 'activation' family models a one-shot feature that consumes a use_count and produces a single ClassFeatureEffect. A b
- **resource_conversion ClassFeatureEffect variant** (new_variant) — Two distinct conversions are needed: (1) expend a spell slot of level N to gain N Sorcery Points (no action), and (2) expend SP per a cost table to create a temporary spell slot (Bonus Action). Neither operation maps to GrantExtraActionEffe
- **point_pool UseCountResource variant (or parallel type)** (new_variant) — UseCountResource with ThresholdTiers<number> cap is structurally close but semantically wrong. A use_count is discrete (used / not used). Sorcery Points are a fractionally-spendable pool whose current value can range from 0 to max in any in
- **long_rest_expiry lifecycle atom or Duration variant for created resources** (new_variant) — The spell slot created by the SP→Slot operation carries an expiry condition ('vanishes when you finish a Long Rest') that is distinct from the slot's normal lifetime. No existing Duration, lifecycle atom, or effect shape represents 'this re

### sorcerer_metamagic_l2

- **option_grant family for class features** (new_subgraph) — Metamagic does not activate with a cost — it passively grants access to N spell-modifying options chosen from a menu. The only existing ClassFeatureMechanics family ('activation') requires activationCost + resource (use_count) + resetCadenc
- **point_pool resource (cross-feature shared pool)** (new_variant) — Sorcery Points are a shared numeric pool defined by Font of Magic and referenced by individual Metamagic options at use time. UseCountResource is per-feature and self-contained (has its own cap + resetCadence). There is no mechanism to refe
- **grant_option_set (ClassFeatureEffect variant)** (new_variant) — The effect of the Metamagic feature is granting access to N spell-modifying options from a closed menu, with a count that scales by class level. ClassFeatureEffect currently only supports grant_extra_action and heal_hp. A new variant for 'g

### sorcerer_sorcerer_subclass_l3

- **subclass_grant** (new_subgraph) — Subclass selection is a one-time character-progression gate with no activation cost, no resource, no rest reset, and no combat-relevant effect. The existing class_feature/activation family requires activationCost + resource + resetCadence +

### sorcerer_spellcasting_l1

- **passive_grant (ClassFeature family)** (new_subgraph) — Spellcasting is not activated — it permanently grants a spell slot pool and spell list access with no activation cost, no use-count, and no explicit reset cadence tied to the feature itself. The existing activation family mandates activatio
- **grant_spell_access (ClassFeatureEffect variant)** (new_variant) — The v4 taxonomy lists grant_spell_access as an effect atom, but it does not appear in the ClassFeatureEffect union type (which only contains GrantExtraActionEffect and HealHpEffect). Spellcasting grants cantrip and prepared-spell list acces
- **grant_spell_slot_pool (ClassFeatureEffect variant or resource shape)** (new_variant) — The spell_slot resource atom exists in v4, but there is no surface type that models a class feature granting a full leveled slot table (e.g. 2 L1 slots at sorcerer L1, growing per class progression). This is distinct from a simple use_count
- **set_spellcasting_ability (ClassFeatureEffect variant)** (new_variant) — Charisma is designated as the spellcasting ability, which determines spell attack rolls and save DCs for all sorcerer spells. This is a deterministic, class-feature-granted runtime fact (not DM adjudication), but it maps to no existing Clas

### species_dragonborn_darkvision

- **SpeciesTraitRecord + passive mechanics family** (new_subgraph) — UnitRecord has no 'species_trait' kind. types.ts defines UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord — species traits are wholly absent. Darkvision is also always-on with no activation, no resource, no reset; no existing m
- **grant_sense effect variant in surface types** (new_variant) — v4 taxonomy lists 'grant_sense' as an effect atom, but it appears in no effect union in types.ts (not ClassFeatureEffect, not MasteryEffect, not ReactionEffect). Darkvision is precisely a sense grant — the only honest atom is grant_sense wi

### species_dragonborn_draconic_ancestry

- **species_trait kind + SpeciesTraitRecord** (new_subgraph) — UnitRecord in types.ts has no species_trait variant. The tracer's traceUnit switch handles only spell, class_feature, and mastery — there is no code path for a species trait record at all.
- **lineage_choice mechanics family** (new_subgraph) — Draconic Ancestry is a passive character-creation parameter choice: the player selects a dragon type which sets a damage type used by Breath Weapon and Damage Resistance. This pattern — a deferred-parameter selection with no activation cost

### species_dragonborn_draconic_flight

- **SpeciesTraitRecord + SpeciesTraitMechanics** (new_subgraph) — UnitRecord has no 'species_trait' kind. The taxonomy defines species_trait_root as a source atom, but types.ts never defines SpeciesTraitRecord or a corresponding mechanics family. No honest encoding is possible without this record kind.
- **grant_fly_speed effect in SpeciesTraitEffect (or ClassFeatureEffect)** (new_variant) — The effect grants 'a Fly Speed equal to your Speed.' The v4 taxonomy lists modify_speed as an atom, but ClassFeatureEffect (and any species-trait equivalent) does not include it. A new effect variant encoding fly speed — equal to or indepen
- **condition_triggered_expiry in Duration or lifecycle atoms** (new_variant) — The duration ends on three conditions: (1) 10-minute timer, (2) voluntary retraction (no action), (3) the Incapacitated condition. The existing Duration type covers 'timed' for (1) but has no shape for condition-triggered expiry. The lifecy

### species_dwarf_dwarven_resilience

- **SpeciesTraitRecord** (new_variant) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord — there is no species_trait kind. The record wrapper (id, name, provenance, description, kind, mechanics) has no matching shape for species traits.
- **passive_trait family** (new_subgraph) — Species traits are always-on at character creation — no activation cost, no resource, no reset cadence. The existing ClassFeatureActivationMechanics forces activation + use_count + resetCadence onto every feature. A new family (e.g. passive
- **grant_resistance effect in species/passive mechanics** (new_variant) — grant_resistance is a v4 atom but it appears nowhere in ClassFeatureEffect or any surface type accessible to non-mastery, non-spell units. The passive family needs a surface-level effect type that can carry grant_resistance with a damage ty
- **permanent condition-scoped modify_roll_advantage** (new_variant) — The existing ModifyRollAdvantageRider (used in mastery riders) requires count and expiresOn — it is an expiring on-hit rider, not a permanent passive effect. Dwarven Resilience's advantage has no expiry and is gated on a specific condition

### species_dwarf_dwarven_toughness

- **SpeciesTraitRecord + passive_modifier mechanics family** (new_subgraph) — UnitRecord has no 'species_trait' kind. ClassFeatureRecord requires activationCost/resource/resetCadence — all inapplicable to a permanently-on passive trait. A new top-level record type and a 'passive_modifier' (or 'passive_grant') mechani
- **modify_max_hp effect in ClassFeatureEffect (or species-trait equivalent)** (new_variant) — The v4 atom 'modify_max_hp' exists in the taxonomy and TAXONOMY §12 notes it covers Dwarven Toughness, but ClassFeatureEffect only allows GrantExtraActionEffect | HealHpEffect. A passive species-trait mechanics family would need to expose m

### species_elf_elven_lineage

- **SpeciesTraitRecord** (new_subgraph) — No UnitRecord kind exists for species traits. types.ts defines only SpellRecord, ClassFeatureRecord, and MasteryRecord. Elven Lineage is a species trait and cannot be honestly encoded as any of these — forcing it into ClassFeatureRecord wou
- **choose_lineage_branch** (new_subgraph) — The trait requires selecting one of three lineages at character creation, each granting a different bundle of effects at levels 1, 3, and 5. No existing mechanics family models a branching choose-at-creation structure with per-branch effect
- **spell_access_once_per_long_rest_without_slot** (new_subgraph) — The level 3 and 5 spell unlocks grant a prepared spell castable once per long rest without consuming a spell slot (and also castable normally with slots). This is a distinct resource pattern — a use_count=1 / long_rest_reset tied to a speci
- **grant_sense with range extension** (new_variant) — Drow lineage extends Darkvision range to 120 feet. The v4 atom grant_sense exists but there is no surface type or mechanics family to host it for a species trait. Range extension rather than grant-from-scratch is also a novel shape.
- **modify_speed (species trait context)** (new_variant) — Wood Elf lineage increases Speed to 35 feet. The v4 atom modify_speed exists but there is no surface mechanics family to encode it as a species trait effect.
- **grant_cantrip_known with swappable-on-long-rest** (new_variant) — High Elf gets Prestidigitation and may replace it with any Wizard cantrip on each Long Rest. This is a novel resource shape: a known-cantrip slot whose content refreshes/replaces on long rest. grant_spell_access in v4 does not have a 'swapp

### species_gnome_gnomish_cunning

- **SpeciesTraitRecord + passive_modifier family** (new_subgraph) — UnitRecord has no species_trait kind. The trait is passive and always-on — no activation cost, no use-count resource, no reset cadence. No existing family (activation, on_hit_trigger, ongoing_effect, etc.) can represent this honestly.
- **modify_roll_advantage as a passive species-trait effect** (new_variant) — The v4 atom modify_roll_advantage exists but is only wired into MasteryEffect (on-hit riders). A passive_modifier family for species traits would need a SpeciesTraitEffect variant that expresses unconditional advantage on a closed set of sa

### species_gnome_gnomish_lineage

- **SpeciesTraitRecord + species_trait mechanics family** (new_subgraph) — UnitRecord only has SpellRecord | ClassFeatureRecord | MasteryRecord. There is no species_trait kind and no mechanics family to hold species-trait payloads. This is a top-level structural gap.
- **lineage_choice subgraph (choose between Forest Gnome and Rock Gnome at character creation)** (new_subgraph) — The trait presents a mutually exclusive choice made once at character creation. The v4 atom `choose` exists but there is no surface family or mechanics header that models a character-creation choice between two distinct spell/feature bundle
- **innate_spellcasting family (grant_spell_access + PB-keyed use_count + long_rest reset + optional spell-slot override)** (new_subgraph) — Forest Gnome grants Speak with Animals as an always-prepared innate spell with PB uses, Long Rest refill, and an 'or use your own spell slots' fallback. No existing surface family models innate spellcasting from a species trait. The LevelAx
- **create_object subgraph for Rock Gnome clockwork device (create_object atom + duration + activation + cap)** (new_subgraph) — Rock Gnome can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device with AC 5, 1 HP, 8-hour duration, Bonus Action activation, max 3 in existence, Utilize to dismantle. The v4 atom create_object exists, but no surface

### species_goliath_giant_ancestry

- **species_trait UnitRecord kind + species_trait_root source atom** (new_subgraph) — UnitRecord has no species_trait variant. The v4 taxonomy lists species_trait_root as a source atom, but types.ts only exposes spell, class_feature, and mastery. No honest encoding is possible until this kind is added.
- **open_choice (choose-one-of-N at character creation)** (new_subgraph) — Giant Ancestry presents six mutually exclusive sub-options from which the player picks one permanently. No surface family models this choose-one-of-N selection at character creation. The v4 `choose` procedure atom exists but there is no aut
- **UseCountCap.proficiency_bonus** (new_variant) — The feature's use count equals the character's Proficiency Bonus, which scales with character level on a fixed schedule. The current UseCountCap variants (fixed, threshold_tiers) cannot express PB-scaling directly.
- **teleport (self-movement to unoccupied seen space)** (new_atom) — Cloud's Jaunt teleports the user up to 30 feet to an unoccupied space they can see. This is a movement effect distinct from force_move, move, or transport_exile. No current effect atom covers voluntary self-teleportation.
- **modify_speed (temporary speed reduction on target)** (new_atom) — Frost's Chill reduces the target's Speed by 10 feet until the start of the attacker's next turn. modify_speed exists in the v4 taxonomy but is not surfaced in any current effect type in types.ts.
- **reduce_damage_taken (damage mitigation via reaction roll)** (new_atom) — Stone's Endurance lets the user roll 1d12 + CON modifier and subtract that total from incoming damage. This is reduce_damage_taken, a known residue atom in v4 taxonomy (§12 Known Remaining Weak Spots) that was explicitly not promoted. Singl
- **damage_taken_reaction (retaliatory reaction that deals damage to the attacker)** (new_subgraph) — Storm's Thunder fires when the user takes damage from a creature within 60 feet, dealing 1d8 Thunder back to that creature as a Reaction. This is a retaliatory damage reaction not modeled by any existing window/resolution/effect chain in th

### species_goliath_large_form

- **SpeciesTraitRecord + species_trait family** (new_subgraph) — UnitRecord is SpellRecord | ClassFeatureRecord | MasteryRecord — no species_trait kind exists. The tracer has no branch for species_trait_root and cannot process this unit at all.
- **modify_speed in ClassFeatureEffect (or equivalent species-trait effect)** (new_variant) — The trait grants +10 Speed for its duration. modify_speed exists in v4 atom inventory but is absent from ClassFeatureEffect (grant_extra_action | heal_hp only). A species-trait effect union would also need this variant.
- **ability_check in RollKind** (new_variant) — The trait grants Advantage on Strength checks. RollKind covers only attack_roll and saving_throw; ability checks are not representable, so modify_roll_advantage cannot be applied to the correct roll kind.
- **change_size** (new_atom) — The trait transforms the creature's occupied size to Large for the duration. No existing v4 effect atom covers creature size change. alter_item_kind is scoped to items and does not apply.
- **acquiredAtLevel / level-unlock gate for species traits** (new_variant) — The trait becomes available only at character level 5. ClassFeatureRecord has acquiredAtLevel, but no equivalent field exists for species traits, and the current surface has no general level-threshold guard on feature activation.

### species_goliath_powerful_build

- **SpeciesTraitRecord + species_trait mechanics family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord. No SpeciesTraitRecord exists. The taxonomy defines species_trait_root as a source atom but types.ts defines no mechanics family or record shape to hold it. Every species trait f
- **ability_check in RollKind** (new_variant) — The grapple-escape mechanic grants Advantage specifically on ability checks (Athletics / Acrobatics). RollKind = 'attack_roll' | 'saving_throw' — ability checks are absent. Even if a species_trait record existed, modify_roll_advantage on ab
- **modify_size_category (passive, for encumbrance rules)** (new_atom) — Counting as one size larger for carrying capacity is a non-combat passive property that modifies character-sheet calculations (Lifting/Carrying from SRD Equipment). It has no combat mechanic counterpart and likely sits outside core runtime

### species_halfling_naturally_stealthy

- **SpeciesTraitRecord** (new_subgraph) — UnitRecord has no species_trait kind. The surface schema (types.ts) defines SpellRecord | ClassFeatureRecord | MasteryRecord only. species_trait_root exists in the v4 taxonomy atom inventory but has no corresponding authored record type.
- **expand_action_eligibility** (new_atom) — The mechanic is a permanent passive modification of the precondition for taking an action (Hide). It neither activates nor consumes resources — it widens the set of circumstances under which the action is legally available. No v4 effect ato

### species_orc_adrenaline_rush

- **SpeciesTraitRecord + species_trait family** (new_subgraph) — UnitRecord has no species_trait kind. The v4 taxonomy defines species_trait_root but types.ts provides no SpeciesTraitRecord shape. Orc Adrenaline Rush cannot be encoded without this structural addition.
- **grant_temporary_hp effect (ClassFeatureEffect variant)** (new_variant) — The feature grants Temporary Hit Points equal to Proficiency Bonus on activation. HealHpEffect restores actual HP; temporary HP is mechanically distinct (buffer layer, non-stacking). No GrantTemporaryHpEffect exists in ClassFeatureEffect.
- **grant_temporary_hp** (new_atom) — v4 taxonomy has no grant_temporary_hp atom. The heal atom covers HP restoration; temporary HP is a separate mechanical concept with different rules (non-stackable buffer, lost first before real HP). Needs a distinct atom.
- **UseCountCap proficiency_bonus variant** (new_variant) — Use count equals Proficiency Bonus (2-6 scaling with character level). Current UseCountCap supports fixed uses or threshold_tiers. While LevelAxis includes proficiency_bonus, expressing use count = PB cleanly needs either a dedicated cap va

### species_orc_darkvision

- **SpeciesTraitRecord + passive_grant family** (new_subgraph) — No UnitRecord kind exists for species_trait. The tracer's exhaustive switch throws on any kind other than spell, class_feature, or mastery. A new top-level record kind and at minimum one new mechanics family are required.
- **passive_grant mechanics family** (new_variant) — Darkvision (Orc) is a purely passive, always-on trait with no activation cost, no resource, no reset cadence, and no roll. No existing mechanics family models this shape. A new family (e.g. 'passive_grant') is needed to express traits that
- **grant_sense surface shape** (new_variant) — The v4 atom 'grant_sense' exists in the taxonomy but types.ts has no surface type for it. A typed surface shape is needed: { kind: 'grant_sense'; sense: 'darkvision' | 'blindsight' | ...; rangeFeet: number }.

### species_orc_relentless_endurance

- **SpeciesTraitRecord (kind = "species_trait")** (new_variant) — UnitRecord has no species_trait kind. The surface types only know spell, class_feature, and mastery. Every species trait requires this new top-level record type before any mechanics can be encoded.
- **passive_reactive_trigger mechanics family for species traits** (new_subgraph) — Relentless Endurance fires when an external combat event occurs (reduction to 0 HP). This is not player-activated (no action cost), not a spell reaction (no spell infrastructure), and not a mastery on-hit rider. A new family is needed: a pa
- **prevent_ko (or set_hp_floor)** (new_atom) — The effect is not heal_hp (which adds dice to current HP). It sets HP to exactly 1, replacing a would-be reduction to 0. No v4 effect atom covers 'prevent knockout by setting HP to a fixed floor'. This is a distinct deterministic operation
- **damage_threshold_window (trigger: reduced_to_0_hp)** (new_atom) — The reactive trigger that arms Relentless Endurance is a new window kind: fires when incoming damage would reduce the character to 0 HP. Not an on_hit_window (that tracks attacker hits, not defender HP floor). Not a post_action_window (whic

### species_tiefling_otherworldly_presence

- **species_trait_record** (new_subgraph) — No UnitRecord kind exists for species traits. types.ts defines SpellRecord, ClassFeatureRecord, and MasteryRecord only. The v4 taxonomy has species_trait_root as a source atom but the surface has no corresponding record family to host it.
- **grant_spell_access mechanic for species traits** (new_variant) — The core mechanic is a passive permanent grant of cantrip knowledge (Thaumaturgy). The v4 atom grant_spell_access exists but there is no surface type in ClassFeatureMechanics or any other mechanics family that can carry a passive spell-acce
- **cross_trait_spellcasting_ability reference** (new_variant) — The spellcasting ability for this cantrip is not a fixed Ability value but a reference to whatever ability the player chose for Fiendish Legacy. No existing surface type models a spellcasting ability as a cross-trait reference — Ability is

### stinking_cloud

- **repeating_area_save_gate** (new_subgraph) — Stinking Cloud creates a concentration area whose only ongoing mechanic is a save gate that fires at the start of each creature's turn while inside the area. No existing family encodes a repeating per-turn save trigger: ongoing_effect only
- **Condition: poisoned** (new_variant) — The Condition type currently only includes 'prone'. Stinking Cloud's save-failure result is the Poisoned condition. The type must be widened to include 'poisoned' (and likely the full SRD condition set) before any spell that inflicts Poison
- **SaveGateRiderResult: compound (apply_condition + restrict_action)** (new_variant) — The Poisoned condition in this spell carries an embedded action restriction: while Poisoned in this way, the creature cannot take an action or a Bonus Action. SaveGateRiderResult currently supports either apply_condition or none, with no co
- **obscure_area** (new_atom) — The cloud is Heavily Obscured, which deterministically affects attack roll advantage/disadvantage for any attack into or out of the area. No v4 atom covers 'make this area heavily obscured'. The closest candidate (block_targeting) is narrow
- **Duration termination: dispersed_by_named_spell_or_effect** (new_variant) — The cloud can be dispersed by a strong wind (e.g. Gust of Wind), which is a secondary termination condition beyond concentration dropping. No current Duration or lifecycle variant captures 'also ends when a named external effect acts on the

### storm_of_vengeance

- **turn_scheduled_effect_sequence** (new_subgraph) — Storm of Vengeance fires a completely different mechanical effect at the start of each caster turn (turns 1–10). No existing family supports a turn-indexed schedule of distinct resolutions over a concentration spell's duration. This is the
- **unconditional_damage phase variant for ActivationPhase** (new_variant) — Turns 2 and 4 deal area damage automatically — no saving throw, no attack roll. The current ActivationPhase union only has attack_roll and save_gate. A third variant is needed for area damage that always applies.
- **deafened condition in Condition type** (new_variant) — Turn 1 applies the Deafened condition on a failed CON save. The Condition type only contains 'prone'.
- **multi_target_n selection (n distinct creatures) for Attachment** (new_variant) — Turn 3 calls six bolts to strike six *different* creatures or objects. The current TargetSelection only supports 'one' or 'choose_up_to' (slot-scaled). A fixed multi-target selection with individual saves per target is not representable.
- **modify_terrain (difficult terrain area effect)** (new_atom) — Turns 5-10 establish difficult terrain across the storm area. No v4 atom covers terrain modification. block_travel is the closest but it models a wall/barrier, not area-wide movement cost doubling.
- **heavily_obscured_zone (vision obscurement area effect)** (new_atom) — Turns 5-10 make the area Heavily Obscured. No v4 atom covers area-wide vision obscurement. This is mechanically distinct from block_targeting (which concerns spell targeting, not vision).

### teleport

- **familiarity_table_resolution** (new_subgraph) — Teleport's resolution is a DM-rolled 1d100 against a familiarity-indexed probability table with four outcome branches (On Target, Off Target, Similar Area, Mishap). This is neither an attack_roll nor a save_gate — there is no flat-percentag
- **transport Effect variant** (new_variant) — The primary effect of Teleport is moving the caster plus up to eight willing creatures (or a Large-or-smaller object) to a chosen destination. The v4 atom inventory includes transport_exile but it does not appear in the surface Effect union
- **imprecise_transport (Off Target / Similar Area outcome branches)** (new_variant) — Two of the four outcome branches describe transport that lands in the wrong place: Off Target places the party 2d12 miles away in a random direction; Similar Area places them in the nearest thematically similar location. Neither is expressi

### thaumaturgy

- **effect_menu family** (new_subgraph) — Thaumaturgy presents 6 named effects; the caster picks one per cast and may have up to 3 of its 1-minute effects active simultaneously. No existing spell family represents 'choose one from a named menu of effects'. The activation family use
- **ability_check variant of RollKind** (new_variant) — Booming Voice grants Advantage on Charisma (Intimidation) checks. RollKind only has 'attack_roll' and 'saving_throw'. Ability checks are a third distinct resolution type required to encode this rider via the existing modify_roll_advantage e
- **alter_object_state (for Invisible Hand)** (new_atom) — Invisible Hand deterministically changes the state of an environmental object (door/window open or closed). The v4 atom 'object' exists as an attachment kind, but there is no effect atom for altering an object's state. The other cosmetic ef

### tsunami

- **turn_start_repeating_save_gate** (new_subgraph) — Tsunami fires a save gate at the start of each caster turn for the spell's duration (6 rounds). No existing spell family models a save gate that recurs on a turn-start trigger. ongoing_effect operations are limited to roll_modifier and dama
- **linear_per_round (LevelAxis: 'round')** (new_variant) — Tsunami's recurring damage decreases by 1d10 per round elapsed: 5d10 → 4d10 → 3d10 → 2d10 → 1d10 → 0. The existing LevelAxis enum ('character' | 'class' | 'slot' | 'subclass' | 'proficiency_bonus') has no 'round' axis. LinearPerLevel<T> wit
- **ability_check phase / operation** (new_variant) — Creatures inside the wall must succeed on a Strength (Athletics) check against the caster's spell save DC in order to move. This is an ability_check (v4 atom exists in taxonomy) gating movement, not a saving throw and not an attack roll. Ne
- **moving_area attachment or lifecycle atom** (new_variant) — The wall moves 50 feet away from the caster at the start of each caster turn. No existing Attachment type (self, target, area, mark) models a spatially-moving area. The area's position is dynamic, not fixed at cast time. This requires eithe
- **fall_on_exit lifecycle / forced_move effect** (new_variant) — Creatures that exit the wall fall to the ground. The v4 taxonomy has fall_on_end (lifecycle) and force_move (effect), but neither maps cleanly to 'fall when a creature moves out of an area voluntarily.' This is an on-exit trigger tied to th

### wall_of_fire

- **activation_plus_ongoing** (new_subgraph) — Wall of Fire has two mechanically distinct phases that must coexist: (1) an instantaneous save_gate that fires when the wall appears, and (2) an ongoing area damage zone that fires when creatures enter or end their turn inside/near the wall
- **area.shape — line and ring** (new_variant) — Attachment.area.shape currently only supports 'sphere'. Wall of Fire requires a line shape (60 ft long × 20 ft high × 1 ft thick) or a ring shape (20 ft diameter × 20 ft high). Neither is expressible. Multiple other wall spells (Wall of Ice
- **OngoingOperation — damage_on_area_entry_or_turn_end** (new_variant) — The existing OngoingOperation variants are 'roll_modifier' and 'damage_on_hit' (which fires on attack-roll hits against a creature in the attachment scope). Wall of Fire needs an operation that fires when a creature enters the area OR ends
- **area — directional_damage** (new_variant) — Wall of Fire designates one side of the wall as the damage-dealing side and the other as inert. This directional property of an area effect has no representation in the current Attachment or operation grammar. A wall shape naturally has two

### wall_of_ice

- **object_creation_spell** (new_subgraph) — Wall of Ice creates a persistent physical object (the wall) with per-section AC, HP, damage immunities, and vulnerability. No existing spell family models 'create a damageable object'. The wall is not an ongoing_effect (no persistent operat
- **on_section_destroyed_window** (new_atom) — When a wall section reaches 0 HP, a frigid air zone is spawned in that space. No existing window atom handles 'when an object or object-section is destroyed'. post_action_window covers creature actions; rest_window covers rest events. A new
- **hazard_zone** (new_atom) — The frigid air left behind is a persistent hazard zone that issues save gates when creatures move through it. It is not concentration-dependent (the caster may drop concentration on the wall while zones persist), it is not a creature attach
- **force_move (in Effect union)** (new_variant) — When the wall appears and cuts through a creature's space, the creature is pushed to one side—this is a forced movement effect that fires before (and independently of) the save gate. The v4 atom force_move exists in TAXONOMY_atoms_graph.md
- **object_stats (AC, HP per section, immunities, vulnerabilities)** (new_variant) — The created object requires structured per-section statistics that have no representation in any current surface type. Even if an object_creation family were added, a new ObjectStats sub-type would be needed to carry AC, hpPerSection, immun

### wall_of_stone

- **create_object — OngoingOperation variant** (new_variant) — The spell's primary mechanic is spawning a persistent physical object (the stone wall) with AC, HP, and damage immunities. OngoingOperation only covers roll_modifier and damage_on_hit; there is no operation for object creation.
- **object_stats — new surface shape for created objects** (new_variant) — Created objects need AC, HP formula (HP per inch of thickness), and damage type immunities recorded as part of the record. None of these fields exist in any current Effect or Attachment shape.
- **placement_displacement — automatic force_move without save or roll** (new_variant) — When the wall appears, any creature in the intersected space is pushed automatically to one side — no save, no attack roll, caster chooses which side. This is a geometric displacement keyed on object placement, not expressible as an on_hit_
- **target_reaction_escape — save_gate where on-success grants target a Reaction move** (new_variant) — The enclosure DEX save grants the surrounded creature the option to spend its own Reaction to move up to its Speed. Existing save_gate mechanics are caster-rooted; there is no surface shape for a save outcome that grants the target a Reacti
- **concentrate_to_permanent — Duration variant for conditional permanence** (new_variant) — Maintaining concentration for the full 10-minute duration causes the wall to become permanent and non-dispellable. The current Duration union (instantaneous / concentration-upTo / timed) has no variant that expresses 'if concentration compl

### warlock_ability_score_improvement_l4

- **level_up_grant family for ClassFeatureMechanics** (new_subgraph) — Ability Score Improvement is a permanent character-progression benefit granted once at level-up. It has no activation cost, no use-count resource, and no reset cadence — none of the structural fields required by the only existing ClassFeatu
- **grant_feat effect atom** (new_atom) — The effect of the feature is to grant the player a feat (specifically the Ability Score Improvement feat or another qualifying feat). No existing ClassFeatureEffect covers feat grants. The v4 taxonomy notes modify_ability_score is currently

### warlock_eldritch_master_l20

- **feature_augmentation** (new_subgraph) — Eldritch Master is not self-activated. It fires when another named class feature (Magical Cunning) is used. No existing ClassFeatureMechanics family covers 'conditional on another named feature being activated' as the trigger pattern. The a
- **refund_spell_slots (new ClassFeatureEffect variant)** (new_variant) — The effect is a full refund of a named spell slot pool (Pact Magic). ClassFeatureEffect only covers grant_extra_action and heal_hp. No variant exists for spell slot recovery. This is a surface_widening contribution layered on top of the str

### warlock_epic_boon_l19

- **permanent_feat_grant family** (new_subgraph) — Epic Boon grants a feat permanently at level-up. The only existing ClassFeatureMechanics family is 'activation', which requires activationCost + resource + resetCadence — all inapplicable to a permanent one-time character acquisition. No fa
- **grant_feat (ClassFeatureEffect variant)** (new_variant) — ClassFeatureEffect has no variant for feat acquisition. Existing variants are grant_extra_action and heal_hp, both of which are runtime effects of an activated feature. A feat grant is a permanent character ability acquisition during charac

### warlock_fiend_spells_l3

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Fiend Spells has no activation cost, no use_count resource, and no rest reset. Spells are 'always prepared' — a permanent passive benefit with no player decision point beyond having the requisite warlock level. The only existing ClassFeatur
- **grant_spell_access variant for ClassFeatureEffect** (new_variant) — ClassFeatureEffect currently supports only GrantExtraActionEffect and HealHpEffect. Granting always-prepared spells requires a grant_spell_access effect variant. The v4 taxonomy already includes grant_spell_access as an effect atom, so no a
- **ThresholdTiers<SpellId[]> payload for grant_spell_access** (new_variant) — The spell grants are gated by warlock class-level thresholds (3, 5, 7, 9), each tier adding a new batch of spell IDs. The existing ThresholdTiers<T> is parameterized over T but only used with numeric T in the current surface. A list-valued

### warlock_fiendish_resilience_l10

- **rest_configured_passive** (new_subgraph) — Fiendish Resilience is not activated during play. It is a persistent passive whose damage-type choice is made at rest time and stays in effect indefinitely until replaced. The sole existing class-feature family (activation) mandates use_cou
- **grant_resistance (ClassFeatureEffect variant)** (new_variant) — ClassFeatureEffect only contains grant_extra_action and heal_hp. The v4 atom inventory includes grant_resistance, but no corresponding surface variant exists for class features. Even if the structural family gap were resolved, a GrantResist

### warlock_pact_magic_l1

- **spellcasting_grant** (new_subgraph) — Pact Magic is not an activated feature with a discrete effect — it is a persistent spellcasting framework. It grants cantrips, a spell slot pool (with pact-specific rules: all slots same level, count+level both scale by class level), and a
- **grant_spell_access** (new_variant) — ClassFeatureEffect needs a variant to represent granting a spell list (cantrips + prepared spells) with counts that scale by class level. This is mechanically distinct from grant_extra_action and heal_hp, and is needed for all spellcasting
- **pact_magic_slot_pool** (new_variant) — The Pact Magic slot pool has two co-scaling dimensions (slot count AND slot level, both indexed by class level), all slots at the same level. This is not representable as a use_count resource cap (which only scales one scalar value). A dedi

### warlock_warlock_subclass_l3

- **subclass_choice** (new_subgraph) — The unit's entire mechanic is a permanent character-progression choice made at level-up: the player selects a subclass archetype, and that archetype grants features for the rest of the character's career. No existing ClassFeatureMechanics f

### weird

- **apply_condition in spell Effect type** (new_variant) — The initial save gate applies Frightened on a failed save. The current spell Effect type is DamageEffect | NoneEffect. The mastery surface already has apply_condition as a SaveGateRiderResult variant, but spells have no equivalent. Encoding
- **frightened in Condition type** (new_variant) — The Condition type currently only includes 'prone'. Weird's primary ongoing rider is gated on the Frightened condition, which must be representable in the closed Condition union before any condition-applying or condition-checking surface ty
- **per-turn repeat save gated on applied condition** (new_subgraph) — Frightened targets make a WIS save at the end of each of their turns for the spell's duration: failing deals 5d10 psychic, succeeding ends the spell on that target. This is a repeat_save (v4 resolution atom) fired by a turn_end_window, gate

### wind_walk

- **transform_form family** (new_subgraph) — Wind Walk transforms targets into a different physical form (gaseous cloud) with a persistent state bundle (new movement mode, damage resistance, condition immunity, action restrictions) and a reversible toggle (cloud ↔ normal via Magic act
- **stunned in Condition type** (new_variant) — Condition is currently restricted to 'prone'. Wind Walk inflicts Stunned during the revert-to-normal transition, requiring 'stunned' to be added to the Condition union.
- **grant_immunity (condition or damage type)** (new_atom) — Wind Walk grants immunity to the Prone condition in cloud form. The v4 atom inventory has 'grant_resistance' but no 'grant_immunity'. Immunity is a mechanically distinct concept (immune = no effect, resistant = half damage) and cannot be ho
- **allow_only variant for ActionRestriction** (new_variant) — The current ActionRestriction type supports 'exclude' (denylist). Cloud form restricts targets to only Dash and Magic — an allowlist. A new variant { kind: 'allow_only', actions: ReadonlyArray<StandardActionKind> } is needed.
- **modify_speed / grant_fly_speed as SpellEffect variant** (new_variant) — Wind Walk grants a Fly Speed of 300 feet with hover. The v4 atoms 'modify_speed' and 'grant_hover' exist in the taxonomy but are not available as variants of Effect or any ongoing spell operation type. They would need to be added to the eff
- **self_plus_choose_up_to attachment mode** (new_variant) — Wind Walk targets the caster plus up to 10 willing others. No current Attachment kind combines self-inclusion with a choose_up_to selection. The closest is { kind: 'target', selection: { mode: 'choose_up_to', count: ... } } which excludes t

### wind_wall

- **dual_stream_spell** (new_subgraph) — Wind Wall has two mechanically distinct streams that must both be represented honestly: (1) an instantaneous STR save → 4d8 Bludgeoning on appearance (activation-shaped), and (2) persistent ongoing environmental/travel-blocking effects for
- **area_shape_wall** (new_variant) — Wind Wall creates a linear wall (up to 50 ft long × 15 ft high × 1 ft thick, continuous path along ground). The existing Attachment area shape only supports { kind: 'sphere'; radiusFeet: number }. A wall shape (length × height, path-shaped)
- **deflect_projectile** (new_atom) — Wind Wall passively auto-misses ordinary ranged projectiles (arrows, bolts) aimed at targets on the far side of the wall. This is neither block_travel (movement) nor interrupt_resolution (reaction-based) nor block_targeting (targeting preve
- **block_gas_passage** (new_atom) — Wind Wall blocks fog, smoke, gas-type environmental effects AND creatures in Gaseous Form from passing through. The existing block_travel atom covers creature movement but has no creature-type or substance filtering (Small-or-smaller flying

### wizard_ability_score_improvement_l4

- **character_advancement** (new_subgraph) — ASI is a level-up benefit, not an in-game activation. The existing `activation` family requires activationCost + use_count resource + resetCadence + effect — none of which apply. A new ClassFeatureMechanics family is needed for permanent on
- **modify_ability_score** (new_atom) — The ASI feat permanently modifies ability scores — pre-runtime character state. The v4 taxonomy explicitly defers this atom as out-of-scope ('modify_ability_score as a runtime effect versus as pre-runtime character state — currently treated
- **grant_feat** (new_atom) — The feature grants a feat choice (ASI feat or any qualifying feat). No existing ClassFeatureEffect variant represents this. grant_spell_access exists for spells but has no parallel for feats.

### wizard_epic_boon_l19

- **milestone_grant** (new_subgraph) — Epic Boon is permanently acquired at level 19 with no activation cost, no use count, and no reset cadence. The existing 'activation' family is entirely inapplicable — its required fields (activationCost, resource, resetCadence) have no hone
- **grant_feat_choice** (new_variant) — The effect is permanently gaining a qualifying feat from a named category (Epic Boon feats) or any feat for which the character qualifies. Neither GrantExtraActionEffect nor HealHpEffect covers this; no ClassFeatureEffect variant does.

### wizard_evocation_savant_l3

- **passive_spell_grant** (new_subgraph) — Evocation Savant is not an activation: it has no activationCost, no use_count resource, and no reset cadence. It is a passive benefit that fires at acquisition and at each new spell-slot-level milestone. No existing ClassFeatureMechanics fa
- **grant_spell_access (ClassFeatureEffect variant)** (new_variant) — The effect of this feature is adding spells to the wizard's spellbook. The v4 atom 'grant_spell_access' exists in the taxonomy but there is no corresponding ClassFeatureEffect variant in types.ts. ClassFeatureEffect only contains GrantExtra
- **on_new_spell_slot_level trigger/window** (new_variant) — The ongoing grant fires 'whenever you gain access to a new level of spell slots in this class' — a character-progression event. This is distinct from rest_window, turn_start_window, and all other v4 window atoms, which are combat or rest ca

### wizard_overchannel_l14

- **spell_cast_option** (new_subgraph) — Overchannel fires as a choice made at spell-cast time, not as a standalone activation. No class feature family models 'when you cast a qualifying spell, you may invoke this to modify the cast outcome.' The activation family assumes activate
- **ClassFeatureEffect::modify_roll_substitute (maximize damage)** (new_variant) — The core payoff is replacing the spell's damage roll with the maximum possible value. The v4 atom modify_roll_substitute covers this concept but it is not exposed as a ClassFeatureEffect variant. Needs a new variant such as { kind: 'maximiz
- **ClassFeatureEffect::self_damage_consequence** (new_variant) — Repeated use before a Long Rest causes the caster to take Necrotic damage immediately after casting. Self-damage-as-activation-consequence is absent from ClassFeatureEffect. Needs a variant such as { kind: 'self_damage'; damageType: DamageT
- **LevelAxis::use_count_before_long_rest** (new_variant) — The escalating penalty scales with the number of times the feature has been used within the current Long Rest window. LevelAxis has no variant for 'use count since last Long Rest.' Needs e.g. axis: 'use_count_before_long_rest' so DiceAmount
- **ClassFeatureActivationCost or trigger filter: qualifying_spell_cast** (new_variant) — The scope of Overchannel is restricted to Wizard spells using levels 1–5 slots that deal damage. There is no 'qualifying spell cast' trigger/filter in the class-feature surface — the activation family has no way to express a conditional tri

### wizard_ritual_adept_l1

- **passive_class_feature** (new_subgraph) — Ritual Adept is always-on from level 1. It has no activation event, no use count, and no reset cadence. The surface only has 'activation' family for ClassFeatureMechanics, which requires activationCost + UseCountResource + RestResetCadence
- **modify_casting_rule** (new_atom) — The effect is not granting new spells (grant_spell_access) but modifying how existing spellbook entries may be cast: removes the preparation requirement for Ritual-tagged spells, replacing it with a physical-book requirement. No v4 effect a

### wizard_scholar_l2

- **passive_grant family for ClassFeatureMechanics** (new_subgraph) — Scholar is a permanent passive benefit granted at acquisition time. It has no activation cost, no use-count resource, and no rest-reset cadence. The existing 'activation' family requires all three and represents an on-demand action. Forcing
- **GrantExpertiseEffect (variant of ClassFeatureEffect)** (new_variant) — The effect is Expertise: double proficiency bonus on ability checks with the chosen skill. The v4 atom inventory contains 'grant_proficiency', but ClassFeatureEffect has no variant for it. A GrantExpertiseEffect (or GrantProficiencyEffect w
- **ChoiceAtAcquisition for skill selection** (new_variant) — Scholar requires the player to choose one skill from a closed list at feature-acquisition time (Arcana, History, Investigation, Medicine, Nature, or Religion). The surface has no mechanism to express 'choose one from list at acquisition' fo

### wizard_wizard_subclass_l3

- **subclass_acquisition** (new_subgraph) — The feature has no activation, no resource, no reset cadence, and no concrete effect. Its entire purpose is to grant the character a subclass whose features are themselves separate units. No existing ClassFeatureMechanics family (currently

### word_of_recall

- **designation_recall** (new_subgraph) — Word of Recall has two mechanically distinct cast modes under one spell card: a designation cast (plant persistent sanctuary marker on caster) and a recall cast (teleport group to that marker). No existing payload family models this dual-mo
- **transport (Effect variant)** (new_variant) — The recall cast's core effect is instantaneous teleportation to a named/designated location. The surface Effect type only has damage and none. The v4 atom transport_exile exists but covers banishment/demiplane exile, not voluntary teleport
- **self_and_nearby (Attachment variant)** (new_variant) — The recall cast's attachment is caster + up to 5 willing creatures within 5 feet. This is not self (caster only), target (other creatures, not including caster by default), area (indiscriminate AoE), or mark (stateful binding). A new attach
- **caster_sanctuary_anchor (persistent caster-level state)** (new_variant) — The designation cast stores a location permanently on the caster's character state — it has no duration, no target, no trigger. This is not a spell effect on a creature, not an anchored location trigger, not a timed persist. It is a new kin

### zone_of_truth

- **persistent_area_save family** (new_subgraph) — Zone of Truth plants a persistent non-concentration area that evaluates each creature on first entry in a turn or on turn-start via a save gate. No existing spell family handles this pattern: activation fires a save once at cast; anchored_t
- **Condition: compelled_honesty (behavioral speech constraint)** (new_variant) — The effect on a failed save is a behavioral restriction on speech ('can't speak a deliberate lie while in the radius'). This is not any of the 14 standard SRD conditions. The current Condition type in types.ts only includes 'prone'. The con


## Option A vs Option B — rubric verdict

Axis signals scan both widening NAMES and JUSTIFICATIONS (since Claude
often names the atom but hides the scaling axis in the justification
text, e.g. "hp_pool" named but "5 × paladin level" in justification).

`class_level_tiers` units: **10**
`linear_per_level` units: **18** — cleric_blessed_healer_l6, cleric_disciple_of_life_l3, cleric_improved_blessed_strikes_l14, feat_boon_of_irresistible_offense, fighter_indomitable, fighter_indomitable_l9, harm, magic_item_necklace_of_fireballs, magic_item_ring_of_invisibility, mass_heal, mastery_graze, power_word_heal, sorcerer_sorcerous_restoration_l5, sorcerer_spellcasting_l1, spike_growth, tsunami, wizard_arcane_recovery_l1, wizard_overchannel_l14
`pb_linked_scaling` units: **0**
`subclass_level_tiers` units: **0**
Other new axes (pb_linked + subclass_level): **0**

**Verdict: Option B** — class_level_tiers in 10 units ≥ 3 AND (linear_per_level in 18 ≥ 2 OR new-axis proposals in 0 ≥ 1).
