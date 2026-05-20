import { Option } from "effect";

// Content JSON is generated from the matching content/*.dhall source.
// Keep authoring changes in Dhall, then regenerate JSON and trace output.
import armorChainMailInput from "../../content/armor_chain_mail.json";
import aidInput from "../../content/aid.json";
import alterSelfInput from "../../content/alter_self.json";
import animalFriendshipInput from "../../content/animal_friendship.json";
import animalMessengerInput from "../../content/animal_messenger.json";
import arcanistsMagicAuraInput from "../../content/arcanists_magic_aura.json";
import auguryInput from "../../content/augury.json";
import backgroundSoldierInput from "../../content/background_soldier.json";
import bardBardicInspirationInput from "../../content/bard_bardic_inspiration.json";
import bardCuttingWordsInput from "../../content/bard_cutting_words.json";
import bardExpertiseInput from "../../content/bard_expertise.json";
import bardJackOfAllTradesInput from "../../content/bard_jack_of_all_trades.json";
import barbarianRageInput from "../../content/barbarian_rage.json";
import barbarianDangerSenseInput from "../../content/barbarian_danger_sense.json";
import barbarianFastMovementInput from "../../content/barbarian_fast_movement.json";
import barbarianRecklessAttackInput from "../../content/barbarian_reckless_attack.json";
import barbarianUnarmoredDefenseInput from "../../content/barbarian_unarmored_defense.json";
import barbarianWeaponMasteryInput from "../../content/barbarian_weapon_mastery.json";
import barkskinInput from "../../content/barkskin.json";
import blindnessDeafnessInput from "../../content/blindness_deafness.json";
import baneInput from "../../content/bane.json";
import blessInput from "../../content/bless.json";
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
import clericChannelDivinityInput from "../../content/cleric_channel_divinity.json";
import clericDivineOrderInput from "../../content/cleric_divine_order.json";
import colorSprayInput from "../../content/color_spray.json";
import commandInput from "../../content/command.json";
import continualFlameInput from "../../content/continual_flame.json";
import counterspellInput from "../../content/counterspell.json";
import cureWoundsInput from "../../content/cure_wounds.json";
import dancingLightsInput from "../../content/dancing_lights.json";
import darknessInput from "../../content/darkness.json";
import darkvisionInput from "../../content/darkvision.json";
import divineFavorInput from "../../content/divine_favor.json";
import divineSmiteInput from "../../content/divine_smite.json";
import druidDruidicInput from "../../content/druid_druidic.json";
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
import featSavageAttackerInput from "../../content/feat_savage_attacker.json";
import fighterActionSurgeInput from "../../content/fighter_action_surge.json";
import fighterExtraAttackInput from "../../content/fighter_extra_attack.json";
import fighterFightingStyleInput from "../../content/fighter_fighting_style.json";
import fighterImprovedCriticalInput from "../../content/fighter_improved_critical.json";
import fighterSecondWindInput from "../../content/fighter_second_wind.json";
import fighterTacticalMindInput from "../../content/fighter_tactical_mind.json";
import fighterWeaponMasteryInput from "../../content/fighter_weapon_mastery.json";
import detectEvilAndGoodInput from "../../content/detect_evil_and_good.json";
import detectMagicInput from "../../content/detect_magic.json";
import detectPoisonAndDiseaseInput from "../../content/detect_poison_and_disease.json";
import dissonantWhispersInput from "../../content/dissonant_whispers.json";
import falseLifeInput from "../../content/false_life.json";
import fireBoltInput from "../../content/fire_bolt.json";
import fireballInput from "../../content/fireball.json";
import flameBladeInput from "../../content/flame_blade.json";
import findFamiliarInput from "../../content/find_familiar.json";
import findTrapsInput from "../../content/find_traps.json";
import flamingSphereInput from "../../content/flaming_sphere.json";
import fogCloudInput from "../../content/fog_cloud.json";
import guidanceInput from "../../content/guidance.json";
import greaseInput from "../../content/grease.json";
import guidingBoltInput from "../../content/guiding_bolt.json";
import gustOfWindInput from "../../content/gust_of_wind.json";
import heatMetalInput from "../../content/heat_metal.json";
import healingWordInput from "../../content/healing_word.json";
import hellishRebukeInput from "../../content/hellish_rebuke.json";
import heroismInput from "../../content/heroism.json";
import hexInput from "../../content/hex.json";
import hideousLaughterInput from "../../content/hideous_laughter.json";
import holdPersonInput from "../../content/hold_person.json";
import huntersMarkInput from "../../content/hunters_mark.json";
import iceKnifeInput from "../../content/ice_knife.json";
import inflictWoundsInput from "../../content/inflict_wounds.json";
import invisibilityInput from "../../content/invisibility.json";
import jumpInput from "../../content/jump.json";
import knockInput from "../../content/knock.json";
import levitateInput from "../../content/levitate.json";
import lesserRestorationInput from "../../content/lesser_restoration.json";
import lightInput from "../../content/light.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import longstriderInput from "../../content/longstrider.json";
import mageArmorInput from "../../content/mage_armor.json";
import magicMissileInput from "../../content/magic_missile.json";
import magicMouthInput from "../../content/magic_mouth.json";
import mindSpikeInput from "../../content/mind_spike.json";
import massCureWoundsInput from "../../content/mass_cure_wounds.json";
import massHealingWordInput from "../../content/mass_healing_word.json";
import moonbeamInput from "../../content/moonbeam.json";
import masteryCleaveInput from "../../content/mastery_cleave.json";
import masterySapInput from "../../content/mastery_sap.json";
import masteryToppleInput from "../../content/mastery_topple.json";
import mistyStepInput from "../../content/misty_step.json";
import mirrorImageInput from "../../content/mirror_image.json";
import minorIllusionInput from "../../content/minor_illusion.json";
import monkDeflectAttacksInput from "../../content/monk_deflect_attacks.json";
import monkMartialArtsInput from "../../content/monk_martial_arts.json";
import monkMonksFocusInput from "../../content/monk_monks_focus.json";
import monkUnarmoredDefenseInput from "../../content/monk_unarmored_defense.json";
import monkUnarmoredMovementInput from "../../content/monk_unarmored_movement.json";
import monkUncannyMetabolismInput from "../../content/monk_uncanny_metabolism.json";
import orcAdrenalineRushInput from "../../content/orc_adrenaline_rush.json";
import orcDarkvisionInput from "../../content/species_orc_darkvision.json";
import orcRelentlessEnduranceInput from "../../content/orc_relentless_endurance.json";
import elfDarkvisionInput from "../../content/darkvision_elf.json";
import paladinExtraAttackInput from "../../content/paladin_extra_attack.json";
import paladinFightingStyleInput from "../../content/paladin_fighting_style.json";
import paladinLayOnHandsInput from "../../content/paladin_lay_on_hands.json";
import paladinPaladinsSmiteInput from "../../content/paladin_paladins_smite.json";
import paladinWeaponMasteryInput from "../../content/paladin_weapon_mastery.json";
import passWithoutTraceInput from "../../content/pass_without_trace.json";
import poisonSprayInput from "../../content/poison_spray.json";
import prayerOfHealingInput from "../../content/prayer_of_healing.json";
import protectionFromEvilAndGoodInput from "../../content/protection_from_evil_and_good.json";
import protectionFromPoisonInput from "../../content/protection_from_poison.json";
import produceFlameInput from "../../content/produce_flame.json";
import rangerDeftExplorerInput from "../../content/ranger_deft_explorer.json";
import rangerExtraAttackInput from "../../content/ranger_extra_attack.json";
import rangerFavoredEnemyInput from "../../content/ranger_favored_enemy.json";
import rangerFightingStyleInput from "../../content/ranger_fighting_style.json";
import rangerRovingInput from "../../content/ranger_roving.json";
import rangerWeaponMasteryInput from "../../content/ranger_weapon_mastery.json";
import resistanceInput from "../../content/resistance.json";
import ropeTrickInput from "../../content/rope_trick.json";
import speciesDragonbornInput from "../../content/species_dragonborn.json";
import speciesDragonbornBreathWeaponInput from "../../content/species_dragonborn_breath_weapon.json";
import speciesDragonbornDamageResistanceInput from "../../content/species_dragonborn_damage_resistance.json";
import speciesDragonbornDarkvisionInput from "../../content/species_dragonborn_darkvision.json";
import speciesDwarfInput from "../../content/species_dwarf.json";
import speciesDwarfDarkvisionInput from "../../content/species_dwarf_darkvision.json";
import speciesDwarfDwarvenResilienceInput from "../../content/species_dwarf_dwarven_resilience.json";
import speciesElfInput from "../../content/species_elf.json";
import speciesGoliathInput from "../../content/species_goliath.json";
import speciesGoliathPowerfulBuildInput from "../../content/species_goliath_powerful_build.json";
import speciesOrcInput from "../../content/species_orc.json";
import speciesTieflingInput from "../../content/species_tiefling.json";
import speciesTieflingDarkvisionInput from "../../content/species_tiefling_darkvision.json";
import subclassFighterChampionInput from "../../content/subclass_fighter_champion.json";
import subclassWizardEvokerInput from "../../content/subclass_wizard_evoker.json";
import rayOfFrostInput from "../../content/ray_of_frost.json";
import rayOfSicknessInput from "../../content/ray_of_sickness.json";
import rogueCunningActionInput from "../../content/rogue_cunning_action.json";
import rogueEvasionInput from "../../content/rogue_evasion.json";
import rogueExpertiseInput from "../../content/rogue_expertise.json";
import rogueUncannyDodgeInput from "../../content/rogue_uncanny_dodge.json";
import rogueSneakAttackInput from "../../content/rogue_sneak_attack.json";
import rogueThievesCantInput from "../../content/rogue_thieves_cant.json";
import rogueWeaponMasteryInput from "../../content/rogue_weapon_mastery.json";
import sanctuaryInput from "../../content/sanctuary.json";
import shieldInput from "../../content/shield.json";
import shieldOfFaithInput from "../../content/shield_of_faith.json";
import shatterInput from "../../content/shatter.json";
import shillelaghInput from "../../content/shillelagh.json";
import shiningSmiteInput from "../../content/shining_smite.json";
import shockingGraspInput from "../../content/shocking_grasp.json";
import sleepInput from "../../content/sleep.json";
import spiderClimbInput from "../../content/spider_climb.json";
import sacredFlameInput from "../../content/sacred_flame.json";
import scorchingRayInput from "../../content/scorching_ray.json";
import seeInvisibilityInput from "../../content/see_invisibility.json";
import searingSmiteInput from "../../content/searing_smite.json";
import sorcererFontOfMagicInput from "../../content/sorcerer_font_of_magic.json";
import sorcererInnateSorceryInput from "../../content/sorcerer_innate_sorcery.json";
import sorcererMetamagicInput from "../../content/sorcerer_metamagic.json";
import sorcerousBurstInput from "../../content/sorcerous_burst.json";
import spareTheDyingInput from "../../content/spare_the_dying.json";
import starryWispInput from "../../content/starry_wisp.json";
import thaumaturgyInput from "../../content/thaumaturgy.json";
import thunderwaveInput from "../../content/thunderwave.json";
import trueStrikeInput from "../../content/true_strike.json";
import warlockEldritchInvocationsInput from "../../content/warlock_eldritch_invocations.json";
import warlockMagicalCunningInput from "../../content/warlock_magical_cunning.json";
import viciousMockeryInput from "../../content/vicious_mockery.json";
import wardingBondInput from "../../content/warding_bond.json";
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
import wizardRitualAdeptInput from "../../content/wizard_ritual_adept.json";
import wizardScholarInput from "../../content/wizard_scholar.json";
import acidSplashInput from "../../content/acid_splash.json";
import { decodeUnitRecordSync } from "./schema.ts";
import type {
  Provenance,
  StartingEquipmentChoice,
  UnitRecord,
  WizardSpellcastingCreation,
} from "./types.ts";

export type Srd521CollectionProvenance = {
  readonly kind: "srd-5.2.1";
};

export type UnitId = UnitRecord["id"];

export type Srd521Provenance = Provenance & {
  readonly kind: "srd-5.2.1";
};

export type Srd521Unit = UnitRecord & {
  readonly provenance: Srd521Provenance;
};

export type SrdUnitCollection = {
  readonly kind: "srdUnitCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly units: readonly Srd521Unit[];
};

export type UnitCatalog = {
  readonly getUnit: (id: UnitId) => Option.Option<UnitRecord>;
  readonly listUnits: () => readonly UnitRecord[];
  readonly requireUnit: (id: UnitId) => UnitRecord;
};

export type UnitCatalogBuildIssue =
  | {
      readonly code: "duplicateUnitId";
      readonly unitId: UnitId;
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
  if (!isSrd521Unit(unit)) {
    throw new Error(`Unit is not SRD 5.2.1: ${unit.id}`);
  }

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
    backgroundSoldierInput,
    speciesDragonbornInput,
    speciesDwarfInput,
    speciesElfInput,
    speciesGoliathInput,
    speciesOrcInput,
    speciesTieflingInput,
    subclassFighterChampionInput,
    subclassWizardEvokerInput,
    fighterFightingStyleInput,
    fighterSecondWindInput,
    fighterWeaponMasteryInput,
    fighterActionSurgeInput,
    fighterExtraAttackInput,
    fighterTacticalMindInput,
    fighterImprovedCriticalInput,
    barbarianRageInput,
    barbarianUnarmoredDefenseInput,
    barbarianRecklessAttackInput,
    barbarianDangerSenseInput,
    barbarianFastMovementInput,
    barbarianWeaponMasteryInput,
    bardBardicInspirationInput,
    bardCuttingWordsInput,
    bardExpertiseInput,
    bardJackOfAllTradesInput,
    clericChannelDivinityInput,
    clericDivineOrderInput,
    druidDruidicInput,
    druidPrimalOrderInput,
    druidWildShapeInput,
    druidWildCompanionInput,
    monkMartialArtsInput,
    monkMonksFocusInput,
    monkUnarmoredDefenseInput,
    monkUnarmoredMovementInput,
    monkUncannyMetabolismInput,
    monkDeflectAttacksInput,
    rangerDeftExplorerInput,
    rangerFavoredEnemyInput,
    rangerFightingStyleInput,
    rogueCunningActionInput,
    rogueEvasionInput,
    rogueUncannyDodgeInput,
    rogueExpertiseInput,
    rogueSneakAttackInput,
    rogueThievesCantInput,
    sorcererInnateSorceryInput,
    sorcererFontOfMagicInput,
    sorcererMetamagicInput,
    warlockEldritchInvocationsInput,
    warlockMagicalCunningInput,
    wizardRitualAdeptInput,
    wizardArcaneRecoveryInput,
    wizardScholarInput,
    featAbilityScoreImprovementInput,
    featArcheryInput,
    featBoonOfCombatProwessInput,
    featDefenseInput,
    featSavageAttackerInput,
    paladinLayOnHandsInput,
    paladinFightingStyleInput,
    paladinPaladinsSmiteInput,
    paladinExtraAttackInput,
    paladinWeaponMasteryInput,
    rangerExtraAttackInput,
    rangerRovingInput,
    rangerWeaponMasteryInput,
    rogueWeaponMasteryInput,
    masteryCleaveInput,
    masterySapInput,
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
    speciesGoliathPowerfulBuildInput,
    speciesTieflingDarkvisionInput,
    acidSplashInput,
    aidInput,
    alterSelfInput,
    animalFriendshipInput,
    animalMessengerInput,
    arcanistsMagicAuraInput,
    auguryInput,
    barkskinInput,
    blindnessDeafnessInput,
    baneInput,
    blessInput,
    blurInput,
    burningHandsInput,
    calmEmotionsInput,
    chillTouchInput,
    chromaticOrbInput,
    colorSprayInput,
    commandInput,
    continualFlameInput,
    counterspellInput,
    cureWoundsInput,
    dancingLightsInput,
    darknessInput,
    darkvisionInput,
    dissonantWhispersInput,
    divineFavorInput,
    divineSmiteInput,
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
    findFamiliarInput,
    findTrapsInput,
    flamingSphereInput,
    fogCloudInput,
    guidanceInput,
    greaseInput,
    guidingBoltInput,
    gustOfWindInput,
    heatMetalInput,
    heroismInput,
    hexInput,
    huntersMarkInput,
    iceKnifeInput,
    inflictWoundsInput,
    invisibilityInput,
    jumpInput,
    knockInput,
    levitateInput,
    lesserRestorationInput,
    locateAnimalsOrPlantsInput,
    locateObjectInput,
    lightInput,
    longstriderInput,
    mistyStepInput,
    passWithoutTraceInput,
    poisonSprayInput,
    prayerOfHealingInput,
    protectionFromEvilAndGoodInput,
    protectionFromPoisonInput,
    produceFlameInput,
    rayOfFrostInput,
    rayOfSicknessInput,
    resistanceInput,
    ropeTrickInput,
    sacredFlameInput,
    sanctuaryInput,
    scorchingRayInput,
    seeInvisibilityInput,
    searingSmiteInput,
    shockingGraspInput,
    sorcerousBurstInput,
    spareTheDyingInput,
    starryWispInput,
    thaumaturgyInput,
    viciousMockeryInput,
    detectEvilAndGoodInput,
    detectMagicInput,
    detectPoisonAndDiseaseInput,
    mageArmorInput,
    magicMissileInput,
    magicMouthInput,
    mindSpikeInput,
    mirrorImageInput,
    moonbeamInput,
    massCureWoundsInput,
    massHealingWordInput,
    healingWordInput,
    shieldInput,
    shieldOfFaithInput,
    shatterInput,
    shillelaghInput,
    shiningSmiteInput,
    sleepInput,
    spiderClimbInput,
    thunderwaveInput,
    trueStrikeInput,
    eldritchBlastInput,
    minorIllusionInput,
    charmPersonInput,
    hellishRebukeInput,
    hideousLaughterInput,
    wardingBondInput,
    holdPersonInput,
    armorChainMailInput,
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
      }
    }
  }

  for (const collection of input.collections) {
    for (const unit of collection.units) {
      issues.push(...findUnknownStartingEquipmentRefs(unit, records));
      issues.push(...findUnknownWizardSpellRefs(unit, records));
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
      getUnit: (id) => Option.fromNullable(records.get(id)),
      listUnits: () => Array.from(records.values()),
      requireUnit: (id) => records.get(id)!,
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
  for (const traitUnitId of Object.values(unit.traits)) {
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

// Wizard spellbook access names authored Spell Definition records; class-list
// Spell Access records source legality from class spell lists and do not force
// every selected Spell Definition to be installed in this catalog.
function findUnknownWizardSpellRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (
    unit.kind !== "class" ||
    !("spellcasting" in unit) ||
    unit.spellcasting === undefined ||
    unit.spellcasting.kind !== "wizard_spellcasting_creation"
  ) {
    return [];
  }

  const spellIds = wizardSpellReferenceIds(unit.spellcasting);

  return spellIds.flatMap((spellId) =>
    records.has(spellId)
      ? []
      : [
          {
            code: "unknownUnitReference",
            referringUnitId: unit.id,
            referencedUnitId: spellId,
          } satisfies UnitCatalogBuildIssue,
        ],
  );
}

function wizardSpellReferenceIds(
  spellcasting: WizardSpellcastingCreation,
): readonly UnitId[] {
  return distinctUnitIds([
    ...spellcasting.cantripAccess.spellIds,
    ...spellcasting.spellbookAccess.spells.map((spell) => spell.spellId),
    ...spellcasting.preparedAccess.spellIds,
  ]);
}

function distinctUnitIds(unitIds: readonly UnitId[]): readonly UnitId[] {
  return Array.from(new Set(unitIds));
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
      (subclassUnitId): readonly UnitCatalogBuildIssue[] => {
        const referenced = records.get(subclassUnitId);
        if (referenced == null) {
          return [
            {
              code: "unknownUnitReference",
              referringUnitId: unit.id,
              referencedUnitId: subclassUnitId,
            } satisfies UnitCatalogBuildIssue,
          ];
        }
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
            ...("className" in referenced
              ? { actualClassName: referenced.className }
              : {}),
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
