import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  battleAreaId,
  battleCombatantSide,
  battleLineDirectionId,
  battleObjectId,
  combatantId,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleSubject,
} from "./index.ts";

export const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

export const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("QMBT7 Unit profile admission Unit catalog must build.");
}

export const unitLibrary = unitCatalogResult.catalog;

if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "QMBT7 Unit profile admission Stat Block catalog must build.",
  );
}

export const statBlockCatalog = statBlockCatalogResult.catalog;

export const fighterSecondWindUnitId = "fighter_second_wind";

export const fighterActionSurgeUnitId = "fighter_action_surge";

export const fighterTacticalMindUnitId = "fighter_tactical_mind";

export const fighterImprovedCriticalUnitId = "fighter_improved_critical";

export const fighterExtraAttackUnitId = "fighter_extra_attack";

export const barbarianRageUnitId = "barbarian_rage";

export const barbarianRecklessAttackUnitId = "barbarian_reckless_attack";

export const barbarianDangerSenseUnitId = "barbarian_danger_sense";

export const barbarianFastMovementUnitId = "barbarian_fast_movement";

export const rangerRovingUnitId = "ranger_roving";

export const orcAdrenalineRushUnitId = "orc_adrenaline_rush";

export const orcRelentlessEnduranceUnitId = "orc_relentless_endurance";

export const rogueCunningActionUnitId = "rogue_cunning_action";

export const rogueEvasionUnitId = "rogue_evasion";

export const rogueUncannyDodgeUnitId = "rogue_uncanny_dodge";

export const rogueSneakAttackUnitId = "rogue_sneak_attack";

export const bardBardicInspirationUnitId = "bard_bardic_inspiration";

export const bardCuttingWordsUnitId = "bard_cutting_words";

export const sorcererInnateSorceryUnitId = "sorcerer_innate_sorcery";

export const monkMartialArtsUnitId = "monk_martial_arts";

export const monkUnarmoredMovementUnitId = "monk_unarmored_movement";

export const baneUnitId = "bane";

export const barkskinUnitId = "barkskin";

export const blindnessDeafnessUnitId = "blindness_deafness";

export const blessUnitId = "bless";

export const blurUnitId = "blur";

export const burningHandsUnitId = "burning_hands";

export const calmEmotionsUnitId = "calm_emotions";

export const chromaticOrbUnitId = "chromatic_orb";

export const colorSprayUnitId = "color_spray";

export const continualFlameUnitId = "continual_flame";

export const counterspellUnitId = "counterspell";

export const dispelMagicUnitId = "dispel_magic";

export const entangleUnitId = "entangle";

export const eldritchBlastUnitId = "eldritch_blast";

export const enhanceAbilityUnitId = "enhance_ability";

export const ensnaringStrikeUnitId = "ensnaring_strike";

export const expeditiousRetreatUnitId = "expeditious_retreat";

export const jumpUnitId = "jump";

export const mistyStepUnitId = "misty_step";

export const mirrorImageUnitId = "mirror_image";

export const searingSmiteUnitId = "searing_smite";

export const shiningSmiteUnitId = "shining_smite";

export const trueStrikeUnitId = "true_strike";

export const iceKnifeUnitId = "ice_knife";

export const sleepUnitId = "sleep";

export const hideousLaughterUnitId = "hideous_laughter";

export const hideousLaughterDurationTicks = elapsedTimeTicks(10);

export const holdPersonUnitId = "hold_person";

export const holdPersonDurationTicks = elapsedTimeTicks(10);

export const invisibilityUnitId = "invisibility";

export const invisibilityDurationTicks = elapsedTimeTicks(600);

export const lesserRestorationUnitId = "lesser_restoration";

export const thunderwaveUnitId = "thunderwave";

export const dissonantWhispersUnitId = "dissonant_whispers";

export const monkDeflectAttacksUnitId = "monk_deflect_attacks";

export const monkMonksFocusUnitId = "monk_monks_focus";

export const defenseUnitId = "defense";

export const divineFavorUnitId = "divine_favor";

export const divineSmiteUnitId = "divine_smite";

export const divineFavorDurationTicks = elapsedTimeTicks(10);

export const archeryUnitId = "feat_archery";

export const boonOfCombatProwessUnitId = "feat_boon_of_combat_prowess";

export const savageAttackerUnitId = "feat_savage_attacker";

export const acidSplashUnitId = "acid_splash";

export const animalFriendshipUnitId = "animal_friendship";

export const antimagicFieldUnitId = "antimagic_field";

export const aidUnitId = "aid";

export const alterSelfUnitId = "alter_self";

export const charmPersonUnitId = "charm_person";

export const chillTouchUnitId = "chill_touch";

export const commandUnitId = "command";

export const commandLegendaryActorId = combatantId(
  "unit-profile-command-legendary",
);

export const fireBoltUnitId = "fire_bolt";

export const fireballUnitId = "fireball";

export const shatterUnitId = "shatter";

export const falseLifeUnitId = "false_life";

export const faerieFireUnitId = "faerie_fire";

export const flameBladeUnitId = "flame_blade";

export const flamingSphereUnitId = "flaming_sphere";

export const moonbeamUnitId = "moonbeam";

export const webUnitId = "web";

export const guidingBoltUnitId = "guiding_bolt";

export const guidanceUnitId = "guidance";

export const greaseUnitId = "grease";

export const gustOfWindUnitId = "gust_of_wind";

export const heatMetalUnitId = "heat_metal";

export const heroismUnitId = "heroism";

export const hellishRebukeUnitId = "hellish_rebuke";

export const inflictWoundsUnitId = "inflict_wounds";

export const lightUnitId = "light";

export const darknessUnitId = "darkness";

export const longstriderUnitId = "longstrider";

export const mageArmorUnitId = "mage_armor";

export const magicMissileUnitId = "magic_missile";

export const mindSpikeUnitId = "mind_spike";

export const mindSpikeDurationTicks = elapsedTimeTicks(600);

export const magicWeaponUnitId = "magic_weapon";

export const magicWeaponDurationTicks = elapsedTimeTicks(600);

export const passWithoutTraceUnitId = "pass_without_trace";

export const poisonSprayUnitId = "poison_spray";

export const protectionFromEvilAndGoodUnitId = "protection_from_evil_and_good";

export const protectionFromPoisonUnitId = "protection_from_poison";

export const produceFlameUnitId = "produce_flame";

export const resistanceUnitId = "resistance";

export const sacredFlameUnitId = "sacred_flame";

export const scorchingRayUnitId = "scorching_ray";

export const shillelaghUnitId = "shillelagh";

export const sorcerousBurstUnitId = "sorcerous_burst";

export const cureWoundsUnitId = "cure_wounds";

export const dancingLightsUnitId = "dancing_lights";

export const healingWordUnitId = "healing_word";

export const massCureWoundsUnitId = "mass_cure_wounds";

export const massHealingWordUnitId = "mass_healing_word";

export const rayOfFrostUnitId = "ray_of_frost";

export const rayOfSicknessUnitId = "ray_of_sickness";

export const shieldUnitId = "shield";

export const shieldOfFaithUnitId = "shield_of_faith";

export const shockingGraspUnitId = "shocking_grasp";

export const spiderClimbUnitId = "spider_climb";

export const starryWispUnitId = "starry_wisp";

export const viciousMockeryUnitId = "vicious_mockery";

export const wardingBondUnitId = "warding_bond";

export const paladinExtraAttackUnitId = "paladin_extra_attack";

export const rangerExtraAttackUnitId = "ranger_extra_attack";

export const archerySupportProfile = {
  kind: PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  attackRoll: {
    bonus: 2,
    weaponFilter: { kind: "weaponCategory", category: "ranged" },
  },
} as const;

export const extraAttackSupportProfile = {
  kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  additionalAttacks: 1,
} as const;

export const combatProwessSupportProfile = {
  kind: ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  replacement: {
    optional: true,
    trigger: "missWithAttackRoll",
    effect: "replaceMissWithHit",
    resetCadence: "startOfNextTurn",
  },
} as const;

export const spellCasterId = combatantId("unit-profile-spell-caster");

export const spellTargetId = combatantId("unit-profile-spell-target");

export const thunderwaveSecondTargetId = combatantId(
  "unit-profile-thunderwave-target-2",
);

export const ensnaringStrikeHelperId = combatantId(
  "unit-profile-ensnaring-helper",
);

export const greaseAreaId = battleAreaId("unit-profile-grease-ground-area");

export const flamingSphereAreaId = battleAreaId(
  "unit-profile-flaming-sphere-area",
);

export const moonbeamAreaId = battleAreaId("unit-profile-moonbeam-area");

export const webAreaId = battleAreaId("unit-profile-web-area");

export const gustOfWindAreaId = battleAreaId(
  "unit-profile-gust-of-wind-line-area",
);

export const gustOfWindNorthDirectionId = battleLineDirectionId(
  "unit-profile-gust-of-wind-direction-north",
);

export const gustOfWindEastDirectionId = battleLineDirectionId(
  "unit-profile-gust-of-wind-direction-east",
);

export const thunderwaveObjectId = battleObjectId(
  "unit-profile-thunderwave-object",
);

export const massHealingTargetIds = [
  spellTargetId,
  combatantId("unit-profile-spell-target-2"),
  combatantId("unit-profile-spell-target-3"),
  combatantId("unit-profile-spell-target-4"),
  combatantId("unit-profile-spell-target-5"),
  combatantId("unit-profile-spell-target-6"),
  combatantId("unit-profile-spell-target-7"),
] as const;

export const partySide = battleCombatantSide("party");

export const oppositionSide = battleCombatantSide("opposition");

export type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

export type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};

export type BonusActionDashSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionDashSpell" }
  >;
};

export type PassiveFeatUnit = Extract<UnitRecord, { readonly kind: "feat" }> & {
  readonly mechanics: Extract<
    Extract<UnitRecord, { readonly kind: "feat" }>["mechanics"],
    { readonly family: "passive" }
  >;
};

export function unitMechanicsVariant(
  base: UnitRecord,
  overrides: {
    readonly id: string;
    readonly mechanics: unknown;
  },
): UnitRecord {
  return {
    ...base,
    id: overrides.id,
    mechanics: overrides.mechanics,
  } as UnitRecord;
}
