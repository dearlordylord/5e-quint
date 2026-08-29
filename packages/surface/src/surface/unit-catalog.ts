// KERNEL-COVERAGE: runtime-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
import { Match, Option } from "effect";
import { UnitId as UnitIdSchema } from "@dnd/shared/game-facts";

// Content JSON is generated from the matching content/*.dhall source.
// Keep authoring changes in Dhall, then regenerate JSON and trace output.
import armorChainMailInput from "../../content/armor_chain_mail.json";
import armorChainShirtInput from "../../content/armor_chain_shirt.json";
import armorLeatherInput from "../../content/armor_leather.json";
import acidArrowInput from "../../content/acid_arrow.json";
import aidInput from "../../content/aid.json";
import alertInput from "../../content/alert.json";
import alterSelfInput from "../../content/alter_self.json";
import animalFriendshipInput from "../../content/animal_friendship.json";
import animalMessengerInput from "../../content/animal_messenger.json";
import animateObjectsInput from "../../content/animate_objects.json";
import antilifeShellInput from "../../content/antilife_shell.json";
import antimagicFieldInput from "../../content/antimagic_field.json";
import arcaneHandInput from "../../content/arcane_hand.json";
import arcanistsMagicAuraInput from "../../content/arcanists_magic_aura.json";
import auguryInput from "../../content/augury.json";
import awakenInput from "../../content/awaken.json";
import backgroundAcolyteInput from "../../content/background_acolyte.json";
import backgroundCriminalInput from "../../content/background_criminal.json";
import backgroundSageInput from "../../content/background_sage.json";
import backgroundSoldierInput from "../../content/background_soldier.json";
import bardBardicInspirationInput from "../../content/bard_bardic_inspiration.json";
import bardCuttingWordsInput from "../../content/bard_cutting_words.json";
import bardExpertiseInput from "../../content/bard_expertise.json";
import bardJackOfAllTradesInput from "../../content/bard_jack_of_all_trades.json";
import bardAbilityScoreImprovementL4Input from "../../content/bard_ability_score_improvement_l4.json";
import bardMagicalSecretsInput from "../../content/bard_magical_secrets.json";
import barbarianAbilityScoreImprovementL4Input from "../../content/barbarian_ability_score_improvement_l4.json";
import barbarianBrutalStrikeInput from "../../content/barbarian_brutal_strike.json";
import barbarianFrenzyInput from "../../content/barbarian_frenzy.json";
import barbarianPrimalKnowledgeInput from "../../content/barbarian_primal_knowledge.json";
import barbarianRageInput from "../../content/barbarian_rage.json";
import barbarianDangerSenseInput from "../../content/barbarian_danger_sense.json";
import barbarianExtraAttackInput from "../../content/barbarian_extra_attack.json";
import barbarianFastMovementInput from "../../content/barbarian_fast_movement.json";
import barbarianRecklessAttackInput from "../../content/barbarian_reckless_attack.json";
import barbarianRetaliationInput from "../../content/barbarian_retaliation.json";
import barbarianUnarmoredDefenseInput from "../../content/barbarian_unarmored_defense.json";
import barbarianWeaponMasteryInput from "../../content/barbarian_weapon_mastery.json";
import barkskinInput from "../../content/barkskin.json";
import blindnessDeafnessInput from "../../content/blindness_deafness.json";
import baneInput from "../../content/bane.json";
import bestowCurseInput from "../../content/bestow_curse.json";
import blessInput from "../../content/bless.json";
import blinkInput from "../../content/blink.json";
import blurInput from "../../content/blur.json";
import burningHandsInput from "../../content/burning_hands.json";
import classBardInput from "../../content/class_bard.json";
import classBarbarianInput from "../../content/class_barbarian.json";
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
import calmEmotionsInput from "../../content/calm_emotions.json";
import charmPersonInput from "../../content/charm_person.json";
import chillTouchInput from "../../content/chill_touch.json";
import chromaticOrbInput from "../../content/chromatic_orb.json";
import cloudkillInput from "../../content/cloudkill.json";
import clericAbilityScoreImprovementL4Input from "../../content/cleric_ability_score_improvement_l4.json";
import clericChannelDivinityInput from "../../content/cleric_channel_divinity.json";
import clericDiscipleOfLifeInput from "../../content/cleric_disciple_of_life.json";
import clericDivineInterventionInput from "../../content/cleric_divine_intervention.json";
import clericDivineOrderInput from "../../content/cleric_divine_order.json";
import clericLifeDomainSpellsInput from "../../content/cleric_life_domain_spells.json";
import clericPreserveLifeInput from "../../content/cleric_preserve_life.json";
import colorSprayInput from "../../content/color_spray.json";
import commandInput from "../../content/command.json";
import communeInput from "../../content/commune.json";
import communeWithNatureInput from "../../content/commune_with_nature.json";
import continualFlameInput from "../../content/continual_flame.json";
import contactOtherPlaneInput from "../../content/contact_other_plane.json";
import coneOfColdInput from "../../content/cone_of_cold.json";
import conjureAnimalsInput from "../../content/conjure_animals.json";
import conjureElementalInput from "../../content/conjure_elemental.json";
import contagionInput from "../../content/contagion.json";
import counterspellInput from "../../content/counterspell.json";
import creationInput from "../../content/creation.json";
import createFoodAndWaterInput from "../../content/create_food_and_water.json";
import cureWoundsInput from "../../content/cure_wounds.json";
import dancingLightsInput from "../../content/dancing_lights.json";
import darknessInput from "../../content/darkness.json";
import darkvisionInput from "../../content/darkvision.json";
import daylightInput from "../../content/daylight.json";
import dispelMagicInput from "../../content/dispel_magic.json";
import divineFavorInput from "../../content/divine_favor.json";
import divineSmiteInput from "../../content/divine_smite.json";
import dominatePersonInput from "../../content/dominate_person.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
import dreamInput from "../../content/dream.json";
import druidAbilityScoreImprovementL4Input from "../../content/druid_ability_score_improvement_l4.json";
import druidCircleOfTheLandSpellsInput from "../../content/druid_circle_of_the_land_spells.json";
import druidDruidicInput from "../../content/druid_druidic.json";
import druidLandsAidInput from "../../content/druid_lands_aid.json";
import druidNaturesWardInput from "../../content/druid_natures_ward.json";
import druidPrimalOrderInput from "../../content/druid_primal_order.json";
import druidWildCompanionInput from "../../content/druid_wild_companion.json";
import druidWildShapeInput from "../../content/druid_wild_shape.json";
import eldritchBlastInput from "../../content/eldritch_blast.json";
import enhanceAbilityInput from "../../content/enhance_ability.json";
import enlargeReduceInput from "../../content/enlarge_reduce.json";
import ensnaringStrikeInput from "../../content/ensnaring_strike.json";
import entangleInput from "../../content/entangle.json";
import enthrallInput from "../../content/enthrall.json";
import expeditiousRetreatInput from "../../content/expeditious_retreat.json";
import faerieFireInput from "../../content/faerie_fire.json";
import featherFallInput from "../../content/feather_fall.json";
import equipmentShieldInput from "../../content/equipment_shield.json";
import featAbilityScoreImprovementInput from "../../content/feat_ability_score_improvement.json";
import featArcheryInput from "../../content/feat_archery.json";
import featBoonOfCombatProwessInput from "../../content/feat_boon_of_combat_prowess.json";
import featDefenseInput from "../../content/feat_defense.json";
import featGreatWeaponFightingInput from "../../content/feat_great_weapon_fighting.json";
import featGrapplerInput from "../../content/feat_grappler.json";
import featMagicInitiateClericInput from "../../content/feat_magic_initiate_cleric.json";
import featMagicInitiateDruidInput from "../../content/feat_magic_initiate_druid.json";
import featMagicInitiateWizardInput from "../../content/feat_magic_initiate_wizard.json";
import featSavageAttackerInput from "../../content/feat_savage_attacker.json";
import featSkilledInput from "../../content/feat_skilled.json";
import featTwoWeaponFightingInput from "../../content/feat_two_weapon_fighting.json";
import fighterActionSurgeInput from "../../content/fighter_action_surge.json";
import fighterAbilityScoreImprovementL4Input from "../../content/fighter_ability_score_improvement_l4.json";
import fighterExtraAttackInput from "../../content/fighter_extra_attack.json";
import fighterFightingStyleInput from "../../content/fighter_fighting_style.json";
import fighterIndomitableInput from "../../content/fighter_indomitable.json";
import fighterHeroicWarriorInput from "../../content/fighter_heroic_warrior.json";
import fighterImprovedCriticalInput from "../../content/fighter_improved_critical.json";
import fighterRemarkableAthleteInput from "../../content/fighter_remarkable_athlete.json";
import fighterSecondWindInput from "../../content/fighter_second_wind.json";
import fighterTacticalMindInput from "../../content/fighter_tactical_mind.json";
import fighterTacticalMasterInput from "../../content/fighter_tactical_master.json";
import fighterWeaponMasteryInput from "../../content/fighter_weapon_mastery.json";
import detectEvilAndGoodInput from "../../content/detect_evil_and_good.json";
import detectMagicInput from "../../content/detect_magic.json";
import detectPoisonAndDiseaseInput from "../../content/detect_poison_and_disease.json";
import detectThoughtsInput from "../../content/detect_thoughts.json";
import dissonantWhispersInput from "../../content/dissonant_whispers.json";
import dispelEvilAndGoodInput from "../../content/dispel_evil_and_good.json";
import falseLifeInput from "../../content/false_life.json";
import fireBoltInput from "../../content/fire_bolt.json";
import fireballInput from "../../content/fireball.json";
import flameBladeInput from "../../content/flame_blade.json";
import flameStrikeInput from "../../content/flame_strike.json";
import flyInput from "../../content/fly.json";
import findFamiliarInput from "../../content/find_familiar.json";
import findTrapsInput from "../../content/find_traps.json";
import flamingSphereInput from "../../content/flaming_sphere.json";
import fogCloudInput from "../../content/fog_cloud.json";
import gaseousFormInput from "../../content/gaseous_form.json";
import geasInput from "../../content/geas.json";
import glyphOfWardingInput from "../../content/glyph_of_warding.json";
import guidanceInput from "../../content/guidance.json";
import greaseInput from "../../content/grease.json";
import greaterRestorationInput from "../../content/greater_restoration.json";
import guidingBoltInput from "../../content/guiding_bolt.json";
import gustOfWindInput from "../../content/gust_of_wind.json";
import hallowInput from "../../content/hallow.json";
import hasteInput from "../../content/haste.json";
import heatMetalInput from "../../content/heat_metal.json";
import healingWordInput from "../../content/healing_word.json";
import hellishRebukeInput from "../../content/hellish_rebuke.json";
import heroismInput from "../../content/heroism.json";
import hexInput from "../../content/hex.json";
import hideousLaughterInput from "../../content/hideous_laughter.json";
import holdMonsterInput from "../../content/hold_monster.json";
import holdPersonInput from "../../content/hold_person.json";
import hypnoticPatternInput from "../../content/hypnotic_pattern.json";
import huntersMarkInput from "../../content/hunters_mark.json";
import iceKnifeInput from "../../content/ice_knife.json";
import inflictWoundsInput from "../../content/inflict_wounds.json";
import insectPlagueInput from "../../content/insect_plague.json";
import invisibilityInput from "../../content/invisibility.json";
import jumpInput from "../../content/jump.json";
import knockInput from "../../content/knock.json";
import legendLoreInput from "../../content/legend_lore.json";
import levitateInput from "../../content/levitate.json";
import lesserRestorationInput from "../../content/lesser_restoration.json";
import lightningBoltInput from "../../content/lightning_bolt.json";
import lightInput from "../../content/light.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import longstriderInput from "../../content/longstrider.json";
import mageArmorInput from "../../content/mage_armor.json";
import magicCircleInput from "../../content/magic_circle.json";
import magicMissileInput from "../../content/magic_missile.json";
import magicMouthInput from "../../content/magic_mouth.json";
import magicWeaponInput from "../../content/magic_weapon.json";
import meldIntoStoneInput from "../../content/meld_into_stone.json";
import mendingInput from "../../content/mending.json";
import mindSpikeInput from "../../content/mind_spike.json";
import massCureWoundsInput from "../../content/mass_cure_wounds.json";
import massHealingWordInput from "../../content/mass_healing_word.json";
import misleadInput from "../../content/mislead.json";
import moonbeamInput from "../../content/moonbeam.json";
import modifyMemoryInput from "../../content/modify_memory.json";
import nondetectionInput from "../../content/nondetection.json";
import masteryCleaveInput from "../../content/mastery_cleave.json";
import masteryPushInput from "../../content/mastery_push.json";
import masterySapInput from "../../content/mastery_sap.json";
import masterySlowInput from "../../content/mastery_slow.json";
import masteryToppleInput from "../../content/mastery_topple.json";
import mistyStepInput from "../../content/misty_step.json";
import mirrorImageInput from "../../content/mirror_image.json";
import minorIllusionInput from "../../content/minor_illusion.json";
import monkAcrobaticMovementInput from "../../content/monk_acrobatic_movement.json";
import monkDeflectAttacksInput from "../../content/monk_deflect_attacks.json";
import monkEvasionInput from "../../content/monk_evasion.json";
import monkExtraAttackInput from "../../content/monk_extra_attack.json";
import monkHeightenedFocusInput from "../../content/monk_heightened_focus.json";
import monkMartialArtsInput from "../../content/monk_martial_arts.json";
import monkMonksFocusInput from "../../content/monk_monks_focus.json";
import monkOpenHandTechniqueInput from "../../content/monk_open_hand_technique.json";
import monkAbilityScoreImprovementL4Input from "../../content/monk_ability_score_improvement_l4.json";
import monkSelfRestorationInput from "../../content/monk_self_restoration.json";
import monkSlowFallInput from "../../content/monk_slow_fall.json";
import monkStunningStrikeInput from "../../content/monk_stunning_strike.json";
import monkUnarmoredDefenseInput from "../../content/monk_unarmored_defense.json";
import monkUnarmoredMovementInput from "../../content/monk_unarmored_movement.json";
import monkUncannyMetabolismInput from "../../content/monk_uncanny_metabolism.json";
import orcAdrenalineRushInput from "../../content/orc_adrenaline_rush.json";
import orcDarkvisionInput from "../../content/species_orc_darkvision.json";
import orcRelentlessEnduranceInput from "../../content/orc_relentless_endurance.json";
import elfDarkvisionInput from "../../content/darkvision_elf.json";
import paladinChannelDivinityInput from "../../content/paladin_channel_divinity.json";
import paladinAbjureFoesInput from "../../content/paladin_abjure_foes.json";
import paladinAbilityScoreImprovementL4Input from "../../content/paladin_ability_score_improvement_l4.json";
import paladinAuraOfCourageInput from "../../content/paladin_aura_of_courage.json";
import paladinExtraAttackInput from "../../content/paladin_extra_attack.json";
import paladinFightingStyleInput from "../../content/paladin_fighting_style.json";
import paladinLayOnHandsInput from "../../content/paladin_lay_on_hands.json";
import paladinOathOfDevotionSpellsInput from "../../content/paladin_oath_of_devotion_spells.json";
import paladinPaladinsSmiteInput from "../../content/paladin_paladins_smite.json";
import paladinSacredWeaponInput from "../../content/paladin_sacred_weapon.json";
import paladinWeaponMasteryInput from "../../content/paladin_weapon_mastery.json";
import passwallInput from "../../content/passwall.json";
import passWithoutTraceInput from "../../content/pass_without_trace.json";
import phantasmalForceInput from "../../content/phantasmal_force.json";
import plantGrowthInput from "../../content/plant_growth.json";
import planarBindingInput from "../../content/planar_binding.json";
import poisonSprayInput from "../../content/poison_spray.json";
import prayerOfHealingInput from "../../content/prayer_of_healing.json";
import prestidigitationInput from "../../content/prestidigitation.json";
import protectionFromEnergyInput from "../../content/protection_from_energy.json";
import protectionFromEvilAndGoodInput from "../../content/protection_from_evil_and_good.json";
import protectionFromPoisonInput from "../../content/protection_from_poison.json";
import produceFlameInput from "../../content/produce_flame.json";
import rayOfEnfeeblementInput from "../../content/ray_of_enfeeblement.json";
import rangerAbilityScoreImprovementL4Input from "../../content/ranger_ability_score_improvement_l4.json";
import rangerAbilityScoreImprovementL8Input from "../../content/ranger_ability_score_improvement_l8.json";
import rangerDeftExplorerInput from "../../content/ranger_deft_explorer.json";
import rangerExpertiseInput from "../../content/ranger_expertise.json";
import rangerExtraAttackInput from "../../content/ranger_extra_attack.json";
import rangerFavoredEnemyInput from "../../content/ranger_favored_enemy.json";
import rangerFightingStyleInput from "../../content/ranger_fighting_style.json";
import rangerHuntersPreyInput from "../../content/ranger_hunters_prey.json";
import rangerRovingInput from "../../content/ranger_roving.json";
import rangerTirelessInput from "../../content/ranger_tireless.json";
import rangerWeaponMasteryInput from "../../content/ranger_weapon_mastery.json";
import raiseDeadInput from "../../content/raise_dead.json";
import resistanceInput from "../../content/resistance.json";
import reincarnateInput from "../../content/reincarnate.json";
import removeCurseInput from "../../content/remove_curse.json";
import revivifyInput from "../../content/revivify.json";
import ropeTrickInput from "../../content/rope_trick.json";
import sendingInput from "../../content/sending.json";
import speakWithAnimalsInput from "../../content/speak_with_animals.json";
import speakWithDeadInput from "../../content/speak_with_dead.json";
import speakWithPlantsInput from "../../content/speak_with_plants.json";
import speciesDragonbornInput from "../../content/species_dragonborn.json";
import speciesDragonbornBreathWeaponInput from "../../content/species_dragonborn_breath_weapon.json";
import speciesDragonbornDamageResistanceInput from "../../content/species_dragonborn_damage_resistance.json";
import speciesDragonbornDarkvisionInput from "../../content/species_dragonborn_darkvision.json";
import speciesDwarfInput from "../../content/species_dwarf.json";
import speciesDwarfDarkvisionInput from "../../content/species_dwarf_darkvision.json";
import speciesDwarfDwarvenResilienceInput from "../../content/species_dwarf_dwarven_resilience.json";
import speciesDwarfDwarvenToughnessInput from "../../content/species_dwarf_dwarven_toughness.json";
import speciesElfInput from "../../content/species_elf.json";
import speciesGnomeInput from "../../content/species_gnome.json";
import speciesGnomeDarkvisionInput from "../../content/species_gnome_darkvision.json";
import speciesGnomeGnomishCunningInput from "../../content/species_gnome_gnomish_cunning.json";
import speciesGnomeGnomishLineageInput from "../../content/species_gnome_gnomish_lineage.json";
import speciesHalflingInput from "../../content/species_halfling.json";
import speciesHalflingBraveInput from "../../content/species_halfling_brave.json";
import speciesHalflingNimblenessInput from "../../content/species_halfling_nimbleness.json";
import speciesHalflingLuckInput from "../../content/species_halfling_luck.json";
import speciesHalflingNaturallyStealthyInput from "../../content/species_halfling_naturally_stealthy.json";
import speciesHumanInput from "../../content/species_human.json";
import speciesHumanResourcefulInput from "../../content/species_human_resourceful.json";
import speciesHumanSkillfulInput from "../../content/species_human_skillful.json";
import speciesHumanVersatileInput from "../../content/species_human_versatile.json";
import speciesGoliathInput from "../../content/species_goliath.json";
import speciesGoliathPowerfulBuildInput from "../../content/species_goliath_powerful_build.json";
import speciesOrcInput from "../../content/species_orc.json";
import speciesTieflingInput from "../../content/species_tiefling.json";
import speciesTieflingDarkvisionInput from "../../content/species_tiefling_darkvision.json";
import subclassBarbarianPathOfTheBerserkerInput from "../../content/subclass_barbarian_path_of_the_berserker.json";
import subclassBardCollegeOfLoreInput from "../../content/subclass_bard_college_of_lore.json";
import subclassClericLifeDomainInput from "../../content/subclass_cleric_life_domain.json";
import subclassDruidCircleOfTheLandInput from "../../content/subclass_druid_circle_of_the_land.json";
import subclassFighterChampionInput from "../../content/subclass_fighter_champion.json";
import subclassMonkWarriorOfTheOpenHandInput from "../../content/subclass_monk_warrior_of_the_open_hand.json";
import subclassPaladinOathOfDevotionInput from "../../content/subclass_paladin_oath_of_devotion.json";
import subclassRangerHunterInput from "../../content/subclass_ranger_hunter.json";
import subclassRogueThiefInput from "../../content/subclass_rogue_thief.json";
import subclassSorcererDraconicSorceryInput from "../../content/subclass_sorcerer_draconic_sorcery.json";
import subclassWarlockFiendPatronInput from "../../content/subclass_warlock_fiend_patron.json";
import subclassWizardEvokerInput from "../../content/subclass_wizard_evoker.json";
import rayOfFrostInput from "../../content/ray_of_frost.json";
import rayOfSicknessInput from "../../content/ray_of_sickness.json";
import rogueAbilityScoreImprovementL4Input from "../../content/rogue_ability_score_improvement_l4.json";
import rogueAbilityScoreImprovementL10Input from "../../content/rogue_ability_score_improvement_l10.json";
import rogueCunningStrikeInput from "../../content/rogue_cunning_strike.json";
import rogueCunningActionInput from "../../content/rogue_cunning_action.json";
import rogueEvasionInput from "../../content/rogue_evasion.json";
import rogueExpertiseInput from "../../content/rogue_expertise.json";
import rogueFastHandsInput from "../../content/rogue_fast_hands.json";
import rogueSecondStoryWorkInput from "../../content/rogue_second_story_work.json";
import rogueSteadyAimInput from "../../content/rogue_steady_aim.json";
import rogueUncannyDodgeInput from "../../content/rogue_uncanny_dodge.json";
import rogueSneakAttackInput from "../../content/rogue_sneak_attack.json";
import rogueSupremeSneakInput from "../../content/rogue_supreme_sneak.json";
import rogueThievesCantInput from "../../content/rogue_thieves_cant.json";
import rogueWeaponMasteryInput from "../../content/rogue_weapon_mastery.json";
import sanctuaryInput from "../../content/sanctuary.json";
import shieldInput from "../../content/shield.json";
import shieldOfFaithInput from "../../content/shield_of_faith.json";
import shatterInput from "../../content/shatter.json";
import shillelaghInput from "../../content/shillelagh.json";
import silenceInput from "../../content/silence.json";
import shiningSmiteInput from "../../content/shining_smite.json";
import shockingGraspInput from "../../content/shocking_grasp.json";
import sleepInput from "../../content/sleep.json";
import sleetStormInput from "../../content/sleet_storm.json";
import slowInput from "../../content/slow.json";
import spiderClimbInput from "../../content/spider_climb.json";
import spikeGrowthInput from "../../content/spike_growth.json";
import spiritualWeaponInput from "../../content/spiritual_weapon.json";
import sacredFlameInput from "../../content/sacred_flame.json";
import scorchingRayInput from "../../content/scorching_ray.json";
import seeInvisibilityInput from "../../content/see_invisibility.json";
import searingSmiteInput from "../../content/searing_smite.json";
import scryingInput from "../../content/scrying.json";
import seemingInput from "../../content/seeming.json";
import suggestionInput from "../../content/suggestion.json";
import summonDragonInput from "../../content/summon_dragon.json";
import sorcererAbilityScoreImprovementL4Input from "../../content/sorcerer_ability_score_improvement_l4.json";
import sorcererDraconicSpellsInput from "../../content/sorcerer_draconic_spells.json";
import sorcererDraconicResilienceInput from "../../content/sorcerer_draconic_resilience.json";
import sorcererFontOfMagicInput from "../../content/sorcerer_font_of_magic.json";
import sorcererInnateSorceryInput from "../../content/sorcerer_innate_sorcery.json";
import sorcererMetamagicInput from "../../content/sorcerer_metamagic.json";
import sorcererSorcerousRestorationInput from "../../content/sorcerer_sorcerous_restoration.json";
import sorcerousBurstInput from "../../content/sorcerous_burst.json";
import spareTheDyingInput from "../../content/spare_the_dying.json";
import starryWispInput from "../../content/starry_wisp.json";
import telekinesisInput from "../../content/telekinesis.json";
import telepathicBondInput from "../../content/telepathic_bond.json";
import teleportationCircleInput from "../../content/teleportation_circle.json";
import thaumaturgyInput from "../../content/thaumaturgy.json";
import tinyHutInput from "../../content/tiny_hut.json";
import thunderwaveInput from "../../content/thunderwave.json";
import treeStrideInput from "../../content/tree_stride.json";
import trueStrikeInput from "../../content/true_strike.json";
import waterWalkInput from "../../content/water_walk.json";
import warlockEldritchInvocationsInput from "../../content/warlock_eldritch_invocations.json";
import warlockAbilityScoreImprovementL4Input from "../../content/warlock_ability_score_improvement_l4.json";
import warlockDarkOnesBlessingInput from "../../content/warlock_dark_ones_blessing.json";
import warlockFiendishResilienceInput from "../../content/warlock_fiendish_resilience.json";
import warlockFiendSpellsInput from "../../content/warlock_fiend_spells.json";
import warlockMagicalCunningInput from "../../content/warlock_magical_cunning.json";
import warlockPactMagicInput from "../../content/warlock_pact_magic.json";
import warlockContactPatronInput from "../../content/warlock_contact_patron.json";
import viciousMockeryInput from "../../content/vicious_mockery.json";
import wardingBondInput from "../../content/warding_bond.json";
import wallOfForceInput from "../../content/wall_of_force.json";
import wallOfStoneInput from "../../content/wall_of_stone.json";
import webInput from "../../content/web.json";
import zoneOfTruthInput from "../../content/zone_of_truth.json";
import weaponClubInput from "../../content/weapon_club.json";
import weaponDaggerInput from "../../content/weapon_dagger.json";
import weaponFlailInput from "../../content/weapon_flail.json";
import weaponGreataxeInput from "../../content/weapon_greataxe.json";
import weaponLongswordInput from "../../content/weapon_longsword.json";
import weaponQuarterstaffInput from "../../content/weapon_quarterstaff.json";
import weaponShortbowInput from "../../content/weapon_shortbow.json";
import weaponShortswordInput from "../../content/weapon_shortsword.json";
import weaponSpearInput from "../../content/weapon_spear.json";
import wizardArcaneRecoveryInput from "../../content/wizard_arcane_recovery.json";
import wizardAbilityScoreImprovementL4Input from "../../content/wizard_ability_score_improvement_l4.json";
import wizardEmpoweredEvocationInput from "../../content/wizard_empowered_evocation.json";
import wizardEvocationSavantInput from "../../content/wizard_evocation_savant.json";
import wizardPotentCantripInput from "../../content/wizard_potent_cantrip.json";
import wizardRitualAdeptInput from "../../content/wizard_ritual_adept.json";
import wizardScholarInput from "../../content/wizard_scholar.json";
import animateDeadInput from "../../content/animate_dead.json";
import chainLightningInput from "../../content/chain_lightning.json";
import clairvoyanceInput from "../../content/clairvoyance.json";
import confusionInput from "../../content/confusion.json";
import controlWaterInput from "../../content/control_water.json";
import controlWeatherInput from "../../content/control_weather.json";
import createUndeadInput from "../../content/create_undead.json";
import dimensionDoorInput from "../../content/dimension_door.json";
import disguiseSelfInput from "../../content/disguise_self.json";
import druidcraftInput from "../../content/druidcraft.json";
import elementalismInput from "../../content/elementalism.json";
import etherealnessInput from "../../content/etherealness.json";
import fearInput from "../../content/fear.json";
import fingerOfDeathInput from "../../content/finger_of_death.json";
import harmInput from "../../content/harm.json";
import heroesFeastInput from "../../content/heroes_feast.json";
import iceStormInput from "../../content/ice_storm.json";
import identifyInput from "../../content/identify.json";
import mageHandInput from "../../content/mage_hand.json";
import majorImageInput from "../../content/major_image.json";
import phantasmalKillerInput from "../../content/phantasmal_killer.json";
import planeShiftInput from "../../content/plane_shift.json";
import powerWordKillInput from "../../content/power_word_kill.json";
import powerWordStunInput from "../../content/power_word_stun.json";
import projectImageInput from "../../content/project_image.json";
import resurrectionInput from "../../content/resurrection.json";
import spiritGuardiansInput from "../../content/spirit_guardians.json";
import teleportInput from "../../content/teleport.json";
import tonguesInput from "../../content/tongues.json";
import trueSeeingInput from "../../content/true_seeing.json";
import vitriolicSphereInput from "../../content/vitriolic_sphere.json";
import wallOfFireInput from "../../content/wall_of_fire.json";
import waterBreathingInput from "../../content/water_breathing.json";
import windWalkInput from "../../content/wind_walk.json";
import wordOfRecallInput from "../../content/word_of_recall.json";
import acidSplashInput from "../../content/acid_splash.json";
import { decodeUnitRecordSync } from "./schema.ts";
import type {
  MasteryRecord,
  SpellcastingClassRecord,
  Provenance,
  SrdProvenance,
  SrdUnitRecord,
  StartingEquipmentChoice,
  UnitRecord,
  WeaponRecord,
} from "./types.ts";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "./mechanics-graph-path.ts";

export type Srd521CollectionProvenance = Pick<SrdProvenance, "kind">;

export type UnitId = UnitRecord["id"];

export type Srd521Provenance = SrdProvenance;

export type Srd521Unit = SrdUnitRecord;

export type SrdUnitCollection = {
  readonly kind: "srdUnitCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly units: readonly Srd521Unit[];
};

export type UnitCatalog = {
  readonly getUnit: (id: string) => Option.Option<UnitRecord>;
  readonly listUnits: () => readonly UnitRecord[];
  readonly requireUnit: (id: string) => UnitRecord;
};

type NonMasteryUnitRecord = Exclude<UnitRecord, MasteryRecord>;

export type WeaponMasteryReferenceResolution =
  | {
      readonly tag: "resolved";
      readonly weapon: WeaponRecord;
      readonly mastery: MasteryRecord;
    }
  | {
      readonly tag: "missing";
      readonly weapon: WeaponRecord;
      readonly masteryUnitId: UnitId;
    }
  | {
      readonly tag: "wrong-kind";
      readonly weapon: WeaponRecord;
      readonly masteryUnitId: UnitId;
      readonly actualKind: NonMasteryUnitRecord["kind"];
    };

export type WeaponMasteryReferenceIssue =
  | {
      readonly code: "unknownWeaponMasteryReference";
      readonly root: { readonly kind: "unit"; readonly id: UnitId };
      readonly mechanicsPath: UnitMechanicsPath;
      readonly fieldName: "masteryUnitId";
      readonly masteryUnitId: UnitId;
    }
  | {
      readonly code: "invalidWeaponMasteryReference";
      readonly root: { readonly kind: "unit"; readonly id: UnitId };
      readonly mechanicsPath: UnitMechanicsPath;
      readonly fieldName: "masteryUnitId";
      readonly masteryUnitId: UnitId;
      readonly actualKind: NonMasteryUnitRecord["kind"];
    };

export type WeaponMasteryReferenceClosure = {
  readonly referenceCount: number;
  readonly resolvedCount: number;
  readonly unresolvedCount: number;
  readonly issues: readonly WeaponMasteryReferenceIssue[];
};

/**
 * Resolve a weapon's authored mastery Unit reference against the installed
 * catalog. Resolution is exact by branded Unit id; display names are never
 * consulted at this boundary.
 */
export function resolveWeaponMasteryReference(
  weapon: WeaponRecord,
  unitCatalog: UnitCatalog,
): WeaponMasteryReferenceResolution {
  const referenced = unitCatalog.getUnit(weapon.masteryUnitId);
  if (Option.isNone(referenced)) {
    return {
      tag: "missing",
      weapon,
      masteryUnitId: weapon.masteryUnitId,
    };
  }
  if (referenced.value.kind !== "mastery") {
    return {
      tag: "wrong-kind",
      weapon,
      masteryUnitId: weapon.masteryUnitId,
      actualKind: referenced.value.kind,
    };
  }
  return { tag: "resolved", weapon, mastery: referenced.value };
}

/**
 * Report exact authored weapon-to-mastery closure for caller-selected weapon
 * roots against an installed catalog. Missing mastery content remains a
 * diagnostic; this report does not invent a target or make an incomplete
 * catalog appear executable.
 */
export function inspectWeaponMasteryReferenceClosure(input: {
  readonly weaponRoots: readonly WeaponRecord[];
  readonly unitCatalog: UnitCatalog;
}): WeaponMasteryReferenceClosure {
  const issues: WeaponMasteryReferenceIssue[] = [];
  let resolvedCount = 0;

  for (const weapon of input.weaponRoots) {
    const resolution = resolveWeaponMasteryReference(weapon, input.unitCatalog);
    Match.value(resolution).pipe(
      Match.when({ tag: "resolved" }, () => {
        resolvedCount += 1;
      }),
      Match.when(
        { tag: "missing" },
        ({ weapon: missingWeapon, masteryUnitId }) => {
          issues.push({
            code: "unknownWeaponMasteryReference",
            root: { kind: "unit", id: missingWeapon.id },
            mechanicsPath: weaponMasteryReferenceMechanicsPath(),
            fieldName: "masteryUnitId",
            masteryUnitId,
          });
        },
      ),
      Match.when(
        { tag: "wrong-kind" },
        ({ weapon: wrongKindWeapon, masteryUnitId, actualKind }) => {
          issues.push({
            code: "invalidWeaponMasteryReference",
            root: { kind: "unit", id: wrongKindWeapon.id },
            mechanicsPath: weaponMasteryReferenceMechanicsPath(),
            fieldName: "masteryUnitId",
            masteryUnitId,
            actualKind,
          });
        },
      ),
      Match.exhaustive,
    );
  }

  return {
    referenceCount: input.weaponRoots.length,
    resolvedCount,
    unresolvedCount: issues.length,
    issues,
  };
}

function weaponMasteryReferenceMechanicsPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

export type AuthoredUnitReferenceResolution = {
  readonly authoredReference: string;
  readonly canonicalUnitId: UnitId;
  readonly unit: UnitRecord;
};

/**
 * Resolve a source-authored Unit reference at the catalog boundary.
 *
 * Authored source may retain punctuation that is not part of the canonical
 * Unit id (for example, a possessive apostrophe). Compare the supplied value
 * to catalog-owned ids directly first, then use the deterministic authored
 * reference key. No alias table is maintained, and an ambiguous key is not
 * resolved.
 */
export function resolveAuthoredUnitReference(
  authoredReference: string,
  units: readonly UnitRecord[],
): AuthoredUnitReferenceResolution | undefined {
  const exact = units.find((unit) => unit.id === authoredReference);
  if (exact !== undefined) {
    return {
      authoredReference,
      canonicalUnitId: exact.id,
      unit: exact,
    };
  }

  const key = authoredUnitReferenceKey(authoredReference);
  const matches = units.filter(
    (unit) => authoredUnitReferenceKey(unit.id) === key,
  );
  return matches.length === 1
    ? {
        authoredReference,
        canonicalUnitId: matches[0]!.id,
        unit: matches[0]!,
      }
    : undefined;
}

function authoredUnitReferenceKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u0027\u2019]/g, "");
}

export type ClassSpellListName = SpellcastingClassRecord["className"];

export type ClassSpellList = {
  readonly cantrips: readonly UnitId[];
  readonly leveled: readonly {
    readonly spellId: UnitId;
    readonly spellLevel: number;
  }[];
};

function isSpellcastingClassRecord(
  unit: UnitRecord,
): unit is SpellcastingClassRecord {
  return unit.kind === "class" && unit.spellcasting !== undefined;
}

function classSpellListFromRecord(
  classRecord: SpellcastingClassRecord,
): ClassSpellList {
  const spellcasting = classRecord.spellcasting;
  const leveled =
    spellcasting.kind === "wizard_spellcasting_creation"
      ? spellcasting.spellbookAccess.spells
      : spellcasting.preparedAccess.spells;

  return {
    cantrips:
      spellcasting.cantripAccess?.spellIds.map((id) => UnitIdSchema.make(id)) ??
      [],
    leveled: leveled.map((spell) => ({
      ...spell,
      spellId: UnitIdSchema.make(spell.spellId),
    })),
  };
}

export function classSpellListForSpellcastingClassRecord(
  classRecord: SpellcastingClassRecord,
): ClassSpellList {
  return classSpellListFromRecord(classRecord);
}

export function spellcastingClassRecordForClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
}): SpellcastingClassRecord | undefined {
  return input.unitLibrary
    .listUnits()
    .find(
      (unit): unit is SpellcastingClassRecord =>
        isSpellcastingClassRecord(unit) && unit.className === input.className,
    );
}

export function classSpellListForClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
}): ClassSpellList | undefined {
  const classRecord = spellcastingClassRecordForClassName(input);
  return classRecord === undefined || !isSpellcastingClassRecord(classRecord)
    ? undefined
    : classSpellListFromRecord(classRecord);
}

export function classSpellListPreparedSpellLevel(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
  readonly spellId: UnitId;
}): number | undefined {
  return classSpellListForClassName(input)?.leveled.find(
    (spell) => spell.spellId === input.spellId,
  )?.spellLevel;
}

export function allCantripsFromClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
  readonly spellIds: readonly UnitId[];
}): boolean {
  const cantrips = new Set(classSpellListForClassName(input)?.cantrips ?? []);
  return input.spellIds.every((spellId) => cantrips.has(spellId));
}

export function allCantripsFromAnyClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellIds: readonly UnitId[];
}): boolean {
  return input.spellIds.every((spellId) =>
    input.unitLibrary
      .listUnits()
      .filter(isSpellcastingClassRecord)
      .some((classRecord) =>
        allCantripsFromClassSpellList({
          className: classRecord.className,
          spellIds: [spellId],
          unitLibrary: input.unitLibrary,
        }),
      ),
  );
}

export function allLeveledSpellsFromAnyClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spells: readonly {
    readonly spellId: UnitId;
    readonly spellLevel: number;
  }[];
}): boolean {
  return input.spells.every((spell) =>
    input.unitLibrary
      .listUnits()
      .filter(isSpellcastingClassRecord)
      .some(
        (classRecord) =>
          classSpellListPreparedSpellLevel({
            className: classRecord.className,
            spellId: spell.spellId,
            unitLibrary: input.unitLibrary,
          }) === spell.spellLevel,
      ),
  );
}

export type UnitCatalogBuildIssue =
  | {
      readonly code: "duplicateUnitId";
      readonly unitId: UnitId;
    }
  | {
      readonly code: "duplicateSpellcastingClassName";
      readonly className: SpellcastingClassRecord["className"];
      readonly unitIds: readonly [UnitId, UnitId];
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdUnitCollection["kind"];
      readonly expected: Srd521CollectionProvenance;
      readonly actual: Provenance;
      readonly unitId: UnitId;
    }
  | {
      readonly code: "unknownUnitReference";
      readonly referringUnitId: UnitId;
      readonly referencedUnitId: UnitId;
    }
  | {
      readonly code: "invalidSubclassChoiceReference";
      readonly classUnitId: UnitId;
      readonly subclassUnitId: UnitId;
      readonly expectedClassName: string;
      readonly actualKind: UnitRecord["kind"];
      readonly actualClassName?: string;
    }
  | {
      readonly code: "invalidSpeciesTraitReference";
      readonly speciesUnitId: UnitId;
      readonly traitUnitId: UnitId;
      readonly expectedSpecies: string;
      readonly actualKind: UnitRecord["kind"];
      readonly actualSpecies?: string;
    };

export type UnitCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: UnitCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly UnitCatalogBuildIssue[];
    };

export function isSrd521Provenance(
  value: Provenance,
): value is Srd521Provenance {
  return value.kind === "srd-5.2.1";
}

export function isSrd521Unit(unit: UnitRecord): unit is Srd521Unit {
  return isSrd521Provenance(unit.provenance);
}

export function assertSrd521Unit(unit: UnitRecord): Srd521Unit {
  /* v8 ignore start -- @preserve -- callers must establish SRD provenance before invoking this assertion; a non-SRD Unit violates that internal precondition */
  if (!isSrd521Unit(unit)) {
    throw new Error(`Unit is not SRD 5.2.1: ${unit.id}`);
  }
  /* v8 ignore stop -- @preserve */

  return unit;
}

export function defineSrdUnitCollection(input: {
  readonly units: readonly Srd521Unit[];
}): SrdUnitCollection {
  const collection = {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: input.units,
  } as const satisfies SrdUnitCollection;
  const provenanceIssues = validateSrdUnitCollection(collection);

  if (provenanceIssues.length > 0) {
    throw new Error("SRD Unit collection contains non-SRD provenance");
  }

  return collection;
}

export const srdUnitCollection = defineSrdUnitCollection({
  units: [
    classBarbarianInput,
    classBardInput,
    classClericInput,
    classDruidInput,
    classFighterInput,
    classMonkInput,
    classPaladinInput,
    classRangerInput,
    classRogueInput,
    classSorcererInput,
    classWarlockInput,
    classWizardInput,
    backgroundAcolyteInput,
    backgroundCriminalInput,
    backgroundSageInput,
    backgroundSoldierInput,
    speciesDragonbornInput,
    speciesDwarfInput,
    speciesElfInput,
    speciesGnomeInput,
    speciesHalflingInput,
    speciesHumanInput,
    speciesGoliathInput,
    speciesOrcInput,
    speciesTieflingInput,
    subclassBarbarianPathOfTheBerserkerInput,
    subclassBardCollegeOfLoreInput,
    subclassClericLifeDomainInput,
    subclassDruidCircleOfTheLandInput,
    subclassFighterChampionInput,
    subclassMonkWarriorOfTheOpenHandInput,
    subclassPaladinOathOfDevotionInput,
    subclassRangerHunterInput,
    subclassRogueThiefInput,
    subclassSorcererDraconicSorceryInput,
    subclassWarlockFiendPatronInput,
    subclassWizardEvokerInput,
    fighterFightingStyleInput,
    fighterSecondWindInput,
    fighterWeaponMasteryInput,
    fighterActionSurgeInput,
    fighterExtraAttackInput,
    fighterTacticalMindInput,
    fighterIndomitableInput,
    fighterTacticalMasterInput,
    fighterAbilityScoreImprovementL4Input,
    fighterHeroicWarriorInput,
    fighterImprovedCriticalInput,
    fighterRemarkableAthleteInput,
    barbarianAbilityScoreImprovementL4Input,
    barbarianFrenzyInput,
    barbarianRageInput,
    barbarianUnarmoredDefenseInput,
    barbarianRecklessAttackInput,
    barbarianDangerSenseInput,
    barbarianExtraAttackInput,
    barbarianFastMovementInput,
    barbarianBrutalStrikeInput,
    barbarianPrimalKnowledgeInput,
    barbarianRetaliationInput,
    barbarianWeaponMasteryInput,
    bardBardicInspirationInput,
    bardCuttingWordsInput,
    bardExpertiseInput,
    bardJackOfAllTradesInput,
    bardAbilityScoreImprovementL4Input,
    bardMagicalSecretsInput,
    clericAbilityScoreImprovementL4Input,
    clericChannelDivinityInput,
    clericDiscipleOfLifeInput,
    clericDivineOrderInput,
    clericLifeDomainSpellsInput,
    clericDivineInterventionInput,
    clericPreserveLifeInput,
    druidAbilityScoreImprovementL4Input,
    druidCircleOfTheLandSpellsInput,
    druidDruidicInput,
    druidLandsAidInput,
    druidNaturesWardInput,
    druidPrimalOrderInput,
    druidWildShapeInput,
    druidWildCompanionInput,
    monkMartialArtsInput,
    monkMonksFocusInput,
    monkAcrobaticMovementInput,
    monkUnarmoredDefenseInput,
    monkUnarmoredMovementInput,
    monkUncannyMetabolismInput,
    monkDeflectAttacksInput,
    monkEvasionInput,
    monkExtraAttackInput,
    monkAbilityScoreImprovementL4Input,
    monkHeightenedFocusInput,
    monkSelfRestorationInput,
    monkSlowFallInput,
    monkStunningStrikeInput,
    monkOpenHandTechniqueInput,
    rangerAbilityScoreImprovementL4Input,
    rangerAbilityScoreImprovementL8Input,
    rangerDeftExplorerInput,
    rangerExpertiseInput,
    rangerFavoredEnemyInput,
    rangerFightingStyleInput,
    rangerTirelessInput,
    rogueAbilityScoreImprovementL4Input,
    rogueAbilityScoreImprovementL10Input,
    rogueCunningActionInput,
    rogueEvasionInput,
    rogueUncannyDodgeInput,
    rogueExpertiseInput,
    rogueFastHandsInput,
    rogueSecondStoryWorkInput,
    rogueSteadyAimInput,
    rogueSneakAttackInput,
    rogueCunningStrikeInput,
    rogueSupremeSneakInput,
    rogueThievesCantInput,
    sorcererInnateSorceryInput,
    sorcererFontOfMagicInput,
    sorcererMetamagicInput,
    sorcererSorcerousRestorationInput,
    sorcererAbilityScoreImprovementL4Input,
    sorcererDraconicResilienceInput,
    sorcererDraconicSpellsInput,
    warlockEldritchInvocationsInput,
    warlockDarkOnesBlessingInput,
    warlockFiendishResilienceInput,
    warlockPactMagicInput,
    warlockMagicalCunningInput,
    warlockAbilityScoreImprovementL4Input,
    warlockFiendSpellsInput,
    warlockContactPatronInput,
    wizardRitualAdeptInput,
    wizardArcaneRecoveryInput,
    wizardScholarInput,
    wizardAbilityScoreImprovementL4Input,
    wizardEmpoweredEvocationInput,
    wizardEvocationSavantInput,
    wizardPotentCantripInput,
    featAbilityScoreImprovementInput,
    featArcheryInput,
    featBoonOfCombatProwessInput,
    featDefenseInput,
    featGreatWeaponFightingInput,
    featGrapplerInput,
    alertInput,
    featMagicInitiateClericInput,
    featMagicInitiateDruidInput,
    featMagicInitiateWizardInput,
    featSavageAttackerInput,
    featSkilledInput,
    featTwoWeaponFightingInput,
    paladinChannelDivinityInput,
    paladinLayOnHandsInput,
    paladinFightingStyleInput,
    paladinPaladinsSmiteInput,
    paladinOathOfDevotionSpellsInput,
    paladinSacredWeaponInput,
    paladinAbjureFoesInput,
    paladinExtraAttackInput,
    paladinAbilityScoreImprovementL4Input,
    paladinAuraOfCourageInput,
    paladinWeaponMasteryInput,
    rangerExtraAttackInput,
    rangerHuntersPreyInput,
    rangerRovingInput,
    rangerWeaponMasteryInput,
    rogueWeaponMasteryInput,
    masteryCleaveInput,
    masteryPushInput,
    masterySapInput,
    masterySlowInput,
    masteryToppleInput,
    orcAdrenalineRushInput,
    orcDarkvisionInput,
    orcRelentlessEnduranceInput,
    elfDarkvisionInput,
    speciesDragonbornBreathWeaponInput,
    speciesDragonbornDamageResistanceInput,
    speciesDragonbornDarkvisionInput,
    speciesDwarfDarkvisionInput,
    speciesDwarfDwarvenResilienceInput,
    speciesDwarfDwarvenToughnessInput,
    speciesGnomeDarkvisionInput,
    speciesGnomeGnomishCunningInput,
    speciesGnomeGnomishLineageInput,
    speciesHalflingBraveInput,
    speciesHalflingNimblenessInput,
    speciesHalflingLuckInput,
    speciesHalflingNaturallyStealthyInput,
    speciesHumanResourcefulInput,
    speciesHumanSkillfulInput,
    speciesHumanVersatileInput,
    speciesGoliathPowerfulBuildInput,
    speciesTieflingDarkvisionInput,
    animateDeadInput,
    chainLightningInput,
    clairvoyanceInput,
    confusionInput,
    controlWaterInput,
    controlWeatherInput,
    createUndeadInput,
    dimensionDoorInput,
    disguiseSelfInput,
    druidcraftInput,
    elementalismInput,
    etherealnessInput,
    fearInput,
    fingerOfDeathInput,
    harmInput,
    heroesFeastInput,
    iceStormInput,
    identifyInput,
    mageHandInput,
    majorImageInput,
    phantasmalKillerInput,
    planeShiftInput,
    powerWordKillInput,
    powerWordStunInput,
    projectImageInput,
    resurrectionInput,
    spiritGuardiansInput,
    teleportInput,
    tonguesInput,
    trueSeeingInput,
    vitriolicSphereInput,
    wallOfFireInput,
    waterBreathingInput,
    windWalkInput,
    wordOfRecallInput,
    acidSplashInput,
    acidArrowInput,
    aidInput,
    alterSelfInput,
    animalFriendshipInput,
    animalMessengerInput,
    animateObjectsInput,
    antilifeShellInput,
    antimagicFieldInput,
    arcaneHandInput,
    arcanistsMagicAuraInput,
    auguryInput,
    awakenInput,
    barkskinInput,
    blindnessDeafnessInput,
    baneInput,
    bestowCurseInput,
    blessInput,
    blinkInput,
    blurInput,
    burningHandsInput,
    calmEmotionsInput,
    chillTouchInput,
    chromaticOrbInput,
    cloudkillInput,
    colorSprayInput,
    commandInput,
    communeInput,
    communeWithNatureInput,
    continualFlameInput,
    contactOtherPlaneInput,
    coneOfColdInput,
    conjureAnimalsInput,
    conjureElementalInput,
    contagionInput,
    counterspellInput,
    creationInput,
    createFoodAndWaterInput,
    cureWoundsInput,
    dancingLightsInput,
    darknessInput,
    darkvisionInput,
    daylightInput,
    dispelEvilAndGoodInput,
    dispelMagicInput,
    dissonantWhispersInput,
    divineFavorInput,
    divineSmiteInput,
    dominatePersonInput,
    dragonsBreathInput,
    dreamInput,
    enhanceAbilityInput,
    enlargeReduceInput,
    ensnaringStrikeInput,
    entangleInput,
    enthrallInput,
    expeditiousRetreatInput,
    faerieFireInput,
    featherFallInput,
    falseLifeInput,
    fireBoltInput,
    fireballInput,
    flameBladeInput,
    flameStrikeInput,
    findFamiliarInput,
    findTrapsInput,
    flamingSphereInput,
    fogCloudInput,
    geasInput,
    guidanceInput,
    greaseInput,
    greaterRestorationInput,
    guidingBoltInput,
    gustOfWindInput,
    hallowInput,
    hasteInput,
    heatMetalInput,
    heroismInput,
    hexInput,
    huntersMarkInput,
    iceKnifeInput,
    inflictWoundsInput,
    insectPlagueInput,
    invisibilityInput,
    jumpInput,
    knockInput,
    legendLoreInput,
    levitateInput,
    lesserRestorationInput,
    lightningBoltInput,
    locateAnimalsOrPlantsInput,
    locateObjectInput,
    lightInput,
    longstriderInput,
    mendingInput,
    mistyStepInput,
    misleadInput,
    modifyMemoryInput,
    passwallInput,
    telekinesisInput,
    wallOfForceInput,
    wallOfStoneInput,
    passWithoutTraceInput,
    phantasmalForceInput,
    plantGrowthInput,
    planarBindingInput,
    poisonSprayInput,
    prayerOfHealingInput,
    prestidigitationInput,
    protectionFromEnergyInput,
    protectionFromEvilAndGoodInput,
    protectionFromPoisonInput,
    produceFlameInput,
    rayOfEnfeeblementInput,
    rayOfFrostInput,
    rayOfSicknessInput,
    raiseDeadInput,
    reincarnateInput,
    resistanceInput,
    removeCurseInput,
    revivifyInput,
    ropeTrickInput,
    sendingInput,
    speakWithAnimalsInput,
    speakWithDeadInput,
    speakWithPlantsInput,
    sacredFlameInput,
    sanctuaryInput,
    scorchingRayInput,
    scryingInput,
    seeInvisibilityInput,
    searingSmiteInput,
    seemingInput,
    shockingGraspInput,
    sorcerousBurstInput,
    spareTheDyingInput,
    starryWispInput,
    telepathicBondInput,
    teleportationCircleInput,
    thaumaturgyInput,
    tinyHutInput,
    treeStrideInput,
    viciousMockeryInput,
    waterWalkInput,
    detectEvilAndGoodInput,
    detectMagicInput,
    detectPoisonAndDiseaseInput,
    detectThoughtsInput,
    mageArmorInput,
    magicCircleInput,
    magicMissileInput,
    magicMouthInput,
    magicWeaponInput,
    meldIntoStoneInput,
    mindSpikeInput,
    mirrorImageInput,
    moonbeamInput,
    nondetectionInput,
    massCureWoundsInput,
    massHealingWordInput,
    healingWordInput,
    shieldInput,
    shieldOfFaithInput,
    shatterInput,
    shillelaghInput,
    silenceInput,
    shiningSmiteInput,
    sleepInput,
    sleetStormInput,
    slowInput,
    flyInput,
    gaseousFormInput,
    glyphOfWardingInput,
    spiderClimbInput,
    spikeGrowthInput,
    spiritualWeaponInput,
    suggestionInput,
    summonDragonInput,
    zoneOfTruthInput,
    thunderwaveInput,
    trueStrikeInput,
    eldritchBlastInput,
    minorIllusionInput,
    charmPersonInput,
    hellishRebukeInput,
    hideousLaughterInput,
    hypnoticPatternInput,
    wardingBondInput,
    webInput,
    holdMonsterInput,
    holdPersonInput,
    armorChainMailInput,
    armorChainShirtInput,
    armorLeatherInput,
    equipmentShieldInput,
    weaponClubInput,
    weaponDaggerInput,
    weaponGreataxeInput,
    weaponLongswordInput,
    weaponSpearInput,
    weaponFlailInput,
    weaponShortbowInput,
    weaponShortswordInput,
    weaponQuarterstaffInput,
  ].map((unit) => assertSrd521Unit(decodeUnitRecordSync(unit))),
});

export function buildUnitCatalog(input: {
  readonly collections: readonly SrdUnitCollection[];
}): UnitCatalogBuildResult {
  const issues: UnitCatalogBuildIssue[] = [];
  const records = new Map<UnitId, UnitRecord>();
  const spellcastingClassOwners = new Map<
    SpellcastingClassRecord["className"],
    UnitId
  >();

  for (const collection of input.collections) {
    issues.push(...validateSrdUnitCollection(collection));

    for (const unit of collection.units) {
      if (records.has(unit.id)) {
        issues.push({
          code: "duplicateUnitId",
          unitId: unit.id,
        });
      } else {
        records.set(unit.id, unit);
        if (isSpellcastingClassRecord(unit)) {
          const existingUnitId = spellcastingClassOwners.get(unit.className);
          if (existingUnitId === undefined) {
            spellcastingClassOwners.set(unit.className, unit.id);
          } else {
            issues.push({
              code: "duplicateSpellcastingClassName",
              className: unit.className,
              unitIds: [existingUnitId, unit.id],
            });
          }
        }
      }
    }
  }

  for (const collection of input.collections) {
    for (const unit of collection.units) {
      issues.push(...findUnknownStartingEquipmentRefs(unit, records));
      issues.push(...findInvalidSubclassChoiceRefs(unit, records));
      issues.push(...findInvalidSpeciesTraitRefs(unit, records));
    }
  }
  // Class feature grant refs are intentionally not catalog-validated yet:
  // this first vertical slice can load partial class progressions while
  // unimplemented higher-level feature Units are still absent. Consumers that
  // need a granted feature Unit dereference it at the point of use. Once the
  // catalog has an explicit supported-level horizon, validate all grant refs
  // inside that horizon here.

  if (issues.length > 0) {
    return { tag: "invalid", issues };
  }

  return {
    tag: "ok",
    catalog: {
      getUnit: (id) => Option.fromNullable(records.get(UnitIdSchema.make(id))),
      listUnits: () => Array.from(records.values()),
      requireUnit: (id) => records.get(UnitIdSchema.make(id))!,
    },
  };
}

function findInvalidSpeciesTraitRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (unit.kind !== "species") {
    return [];
  }

  const issues: UnitCatalogBuildIssue[] = [];
  for (const rawTraitUnitId of Object.values(unit.traits)) {
    const traitUnitId = UnitIdSchema.make(rawTraitUnitId);
    const referenced = records.get(traitUnitId);
    if (referenced == null) {
      issues.push({
        code: "unknownUnitReference",
        referringUnitId: unit.id,
        referencedUnitId: traitUnitId,
      });
      continue;
    }
    if (
      referenced.kind === "species_trait" &&
      referenced.species === unit.species
    ) {
      continue;
    }

    issues.push({
      code: "invalidSpeciesTraitReference",
      speciesUnitId: unit.id,
      traitUnitId,
      expectedSpecies: unit.species,
      actualKind: referenced.kind,
      /* v8 ignore next -- @preserve -- only malformed species-trait catalog composition reaches this diagnostic projection */
      ...("species" in referenced ? { actualSpecies: referenced.species } : {}),
    });
  }

  return issues;
}

function findUnknownStartingEquipmentRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (!hasStartingEquipment(unit)) {
    return [];
  }

  return unit.startingEquipment.flatMap((choice) =>
    choice.kind === "item_bundle"
      ? choice.items.flatMap((item) =>
          item.kind === "unit_ref" && !records.has(item.unitId)
            ? [
                {
                  code: "unknownUnitReference",
                  referringUnitId: unit.id,
                  referencedUnitId: item.unitId,
                } satisfies UnitCatalogBuildIssue,
              ]
            : [],
        )
      : [],
  );
}

function hasStartingEquipment(unit: UnitRecord): unit is UnitRecord & {
  readonly startingEquipment: readonly StartingEquipmentChoice[];
} {
  return unit.kind === "class" || unit.kind === "background";
}

function findInvalidSubclassChoiceRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (unit.kind !== "class") {
    return [];
  }

  return unit.subclassChoices.flatMap((choice) =>
    choice.options.flatMap(
      (rawSubclassUnitId): readonly UnitCatalogBuildIssue[] => {
        const subclassUnitId = UnitIdSchema.make(rawSubclassUnitId);
        const referenced = records.get(subclassUnitId);
        /* v8 ignore start -- @preserve -- an unresolved subclass id is malformed class-catalog composition */
        if (referenced == null) {
          return [
            {
              code: "unknownUnitReference",
              referringUnitId: unit.id,
              referencedUnitId: subclassUnitId,
            } satisfies UnitCatalogBuildIssue,
          ];
        }
        /* v8 ignore stop -- @preserve */
        if (
          referenced.kind === "subclass" &&
          referenced.className === unit.className
        ) {
          return [];
        }

        return [
          {
            code: "invalidSubclassChoiceReference",
            classUnitId: unit.id,
            subclassUnitId,
            expectedClassName: unit.className,
            actualKind: referenced.kind,
            /* v8 ignore start -- @preserve -- only malformed subclass catalog composition reaches this diagnostic projection */
            ...("className" in referenced
              ? { actualClassName: referenced.className }
              : {}),
            /* v8 ignore stop -- @preserve */
          } satisfies UnitCatalogBuildIssue,
        ];
      },
    ),
  );
}

function validateSrdUnitCollection(
  collection: SrdUnitCollection,
): readonly UnitCatalogBuildIssue[] {
  return collection.units.flatMap((unit) =>
    isSrd521Provenance(unit.provenance)
      ? []
      : [
          {
            code: "mixedProvenance",
            collectionKind: collection.kind,
            expected: collection.provenance,
            actual: unit.provenance,
            unitId: unit.id,
          } satisfies UnitCatalogBuildIssue,
        ],
  );
}
