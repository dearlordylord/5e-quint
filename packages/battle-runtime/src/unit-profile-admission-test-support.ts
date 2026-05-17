import * as Either from "effect/Either";
import { expect } from "vitest";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import starryWispInput from "../../surface/content/starry_wisp.json";
import trueStrikeInput from "../../surface/content/true_strike.json";
import weaponClubInput from "../../surface/content/weapon_club.json";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  abilityModifier,
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { classLevel } from "@dnd/shared/types";
import {
  attackBonus,
  damageAmount,
  type DamageType,
  difficultyClass,
  DieRollResult,
  Hp,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
  type ProficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  ActivationPhase,
  ClassName,
  EffectAtom,
  Size,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleObjectId,
  battlePerceptionRollModeForSight,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleSightObscurement,
  battleBardicInspirationGrantSupportForUnit,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  objectInvisibleBenefitDenied,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBattleReaction,
  resolveBattlePossessionAttempt,
  resolveBattleSubject,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  sameBattleSubject,
  snapshotBattle,
  spellId,
  spellSlotInvocationRef,
  startBattle,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleObjectDamageDisposition,
  type BattleObjectIgnitionDisposition,
  type BattleSpellAreaChoice,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleState,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
  type SupportedSpellInvocation,
} from "./index.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  SpellMarkedDamageRider,
  SupportedDamageSpellInvocation,
} from "./battle-reducer.ts";
import { characterBattleResourceForUnit } from "./character-battle-resources.ts";
import { conditionApplicationPreventedByCreatureTypeProtection } from "./battle-reducer/spell-condition-effects-helpers.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-state.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { applyFailedSaveSpellConditionEffects } from "./battle-reducer/spells-active-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  validateSpellDamageFill,
} from "./battle-reducer/spells-damage-fills.ts";
import { supportedPreparedHellishRebukeReactionSpellProfile } from "./battle-reducer/spells-profiles.ts";
import { hideousLaughterRepeatSavingThrowOutcomeHole } from "./battle-reducer/hideous-laughter-repeat-save.ts";
import {
  supportedPreparedHideousLaughterProfile,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./battle-reducer/spells-profiles-save-gates.ts";
import { validateSavingThrowOutcomes } from "./battle-reducer/spells-resolve-save-gates.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  battleMartialArtsAttackProjectionSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  battlePassiveSpeedKindGrantsSupportForUnit,
  parseSupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import {
  mechanicsOnlyMyceliumStepUnit,
  myceliumStepUnitId,
} from "./classic-non-srd-mechanics-test-fixtures.ts";

export const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
export const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("QMBT7 Unit profile admission test catalogs must build.");
}
export const unitLibrary = unitCatalogResult.catalog;
export const statBlockCatalog = statBlockCatalogResult.catalog;
const testUnitRecords = [
  decodeUnitRecordSync(weaponClubInput),
] satisfies ReadonlyArray<UnitRecord>;
const testUnitRecordsById: ReadonlyMap<UnitRecord["id"], UnitRecord> = new Map(
  testUnitRecords.map((unit): readonly [UnitRecord["id"], UnitRecord] => [
    unit.id,
    unit,
  ]),
);
export const fighterSecondWindUnitId = "fighter_second_wind";
export const fighterActionSurgeUnitId = "fighter_action_surge";
export const fighterTacticalMindUnitId = "fighter_tactical_mind";
export const fighterImprovedCriticalUnitId = "fighter_improved_critical";
export const fighterExtraAttackUnitId = "fighter_extra_attack";
export const barbarianRageUnitId = "barbarian_rage";
export const barbarianRecklessAttackUnitId = "barbarian_reckless_attack";
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
export const baneUnitId = "bane";
export const blessUnitId = "bless";
export const burningHandsUnitId = "burning_hands";
export const chromaticOrbUnitId = "chromatic_orb";
export const colorSprayUnitId = "color_spray";
export const counterspellUnitId = "counterspell";
export const entangleUnitId = "entangle";
export const eldritchBlastUnitId = "eldritch_blast";
export const ensnaringStrikeUnitId = "ensnaring_strike";
export const expeditiousRetreatUnitId = "expeditious_retreat";
export const jumpUnitId = "jump";
export const searingSmiteUnitId = "searing_smite";
export const trueStrikeUnitId = "true_strike";
export const iceKnifeUnitId = "ice_knife";
export const sleepUnitId = "sleep";
export const hideousLaughterUnitId = "hideous_laughter";
export const hideousLaughterDurationTicks = elapsedTimeTicks(10);
export const thunderwaveUnitId = "thunderwave";
export const dissonantWhispersUnitId = "dissonant_whispers";
export const monkDeflectAttacksUnitId = "monk_deflect_attacks";
export const defenseUnitId = "defense";
export const divineFavorUnitId = "divine_favor";
export const divineSmiteUnitId = "divine_smite";
export const divineFavorDurationTicks = elapsedTimeTicks(10);
export const archeryUnitId = "feat_archery";
export const boonOfCombatProwessUnitId = "feat_boon_of_combat_prowess";
export const savageAttackerUnitId = "feat_savage_attacker";
export const acidSplashUnitId = "acid_splash";
export const animalFriendshipUnitId = "animal_friendship";
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
export const guidingBoltUnitId = "guiding_bolt";
export const guidanceUnitId = "guidance";
export const greaseUnitId = "grease";
export const heroismUnitId = "heroism";
export const hellishRebukeUnitId = "hellish_rebuke";
export const inflictWoundsUnitId = "inflict_wounds";
export const lightUnitId = "light";
export const longstriderUnitId = "longstrider";
export const mageArmorUnitId = "mage_armor";
export const magicMissileUnitId = "magic_missile";
export const poisonSprayUnitId = "poison_spray";
export const protectionFromEvilAndGoodUnitId = "protection_from_evil_and_good";
export const produceFlameUnitId = "produce_flame";
export const resistanceUnitId = "resistance";
export const sacredFlameUnitId = "sacred_flame";
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
export const starryWispUnitId = "starry_wisp";
export const viciousMockeryUnitId = "vicious_mockery";
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
export const greaseAreaId = "unit-profile-grease-ground-area";
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

export function spellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function requireTestOrCatalogUnit(unitId: UnitRecord["id"]): UnitRecord {
  return testUnitRecordsById.get(unitId) ?? unitLibrary.requireUnit(unitId);
}

export function spellWithSaveGateRepeatSaves(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (
    base.mechanics.family !== "activation" &&
    base.mechanics.family !== "triggered_reaction"
  ) {
    throw new Error("Expected phased spell mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected first phase to be a save gate.");
  }
  const repeatPhase = {
    ...phase,
    repeatSaves: [
      { cadence: "end_of_target_turn", onSuccess: "ends_on_target" },
    ],
  } as const satisfies ActivationPhase;

  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [repeatPhase],
    },
  } as SpellRecord;
}

export function hideousLaughterWithPhase(
  base: SpellRecord,
  mapPhase: (
    phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
  ) => ActivationPhase,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Hideous Laughter activation mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Hideous Laughter save gate.");
  }
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      phases: [mapPhase(phase)],
    },
  } as SpellRecord;
}

export function thunderwaveWithoutDirectPhase(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase] = base.mechanics.phases;
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [phase],
    },
  } as SpellRecord;
}

export function thunderwaveWithoutFailedSavePush(
  base: SpellRecord,
  id: string,
): SpellRecord {
  const { phase, directPhase, damage } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [{ ...phase, onFail: damage }, directPhase],
    },
  } as SpellRecord;
}

export function thunderwaveWithFailedSaveDamage(
  base: SpellRecord,
  id: string,
  mutateDamage: (
    damage: ReturnType<typeof thunderwaveSaveGateParts>["damage"],
  ) => ReturnType<typeof thunderwaveSaveGateParts>["damage"],
): SpellRecord {
  const { phase, directPhase, damage, riders } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          onFail: {
            kind: "composite",
            effects: [mutateDamage(damage), ...riders],
          },
        },
        directPhase,
      ],
    },
  } as SpellRecord;
}

export function thunderwaveWithFixedSaveDc(
  base: SpellRecord,
  id: string,
): SpellRecord {
  const { phase, directPhase } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [{ ...phase, dc: { kind: "fixed", dc: 12 } }, directPhase],
    },
  } as SpellRecord;
}

export function thunderwaveWithSaveGateCone(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase, directPhase] = base.mechanics.phases;
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "area" ||
    directPhase === undefined
  ) {
    throw new Error("Expected Thunderwave area save gate and direct phase.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            shape: { kind: "cone", lengthFeet: 15 },
          },
        },
        directPhase,
      ],
    },
  } as SpellRecord;
}

export function thunderwaveSaveGateParts(base: SpellRecord) {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase, directPhase] = base.mechanics.phases;
  if (phase?.kind !== "save_gate" || directPhase === undefined) {
    throw new Error("Expected Thunderwave save gate and direct phase.");
  }
  if (phase.onFail.kind !== "composite") {
    throw new Error("Expected Thunderwave composite failed-save effect.");
  }
  const [damage, ...riders] = phase.onFail.effects;
  if (damage?.kind !== "damage") {
    throw new Error("Expected Thunderwave failed-save damage.");
  }
  return { phase, directPhase, damage, riders };
}

export function eldritchBlastWithTargetCount(
  base: SpellRecord,
  id: string,
  count: unknown,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Eldritch Blast activation mechanics.");
  }
  const [phase] = base.mechanics.phases;
  if (
    phase?.kind !== "attack_roll" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected Eldritch Blast target hole.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              selection: {
                ...phase.attachment.value.selection,
                count,
              },
            },
          },
        },
      ],
    },
  } as SpellRecord;
}

export function singleSpellcastingSourceClassName(
  classLevels: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"],
): ClassName {
  if (classLevels.length !== 1) {
    throw new Error("Test spellcasting fixtures require one source class.");
  }
  const [classLevel] = classLevels;
  return classLevel.className;
}

export function spellBattle(input: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5 | 6;
    readonly count: number;
  }[];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly targetAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly targetResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly targetUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly targetSpellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly targetPreparedSpells?: readonly SpellRecord[];
  readonly casterClassLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly casterProficiencyBonus?: ProficiencyBonus;
  readonly casterWeaponProficiencies?: readonly WeaponProficiency[];
  readonly statBlockTargets?: readonly {
    readonly combatantId: CombatantId;
    readonly statBlock: StatBlockRecord;
    readonly initiative: number;
    readonly side?: typeof partySide | typeof oppositionSide;
  }[];
}): BattleState {
  const casterClassLevels = input.casterClassLevels ?? [
    { className: "wizard", level: 1 },
  ];
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: singleSpellcastingSourceClassName(casterClassLevels),
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: input.casterProficiencyBonus ?? proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
        },
        ...(input.attack === undefined ? {} : { attack: input.attack }),
        classLevels: casterClassLevels,
        ...(input.casterWeaponProficiencies === undefined
          ? {}
          : { weaponProficiencies: input.casterWeaponProficiencies }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetAttack === undefined
          ? {}
          : { attack: input.targetAttack }),
        ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
        ...(input.targetMaxHp === undefined
          ? {}
          : { maxHp: input.targetMaxHp }),
        ...(input.targetResources === undefined
          ? {}
          : { resources: input.targetResources }),
        ...(input.targetUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.targetUnitRefs }),
        ...(input.targetSpellcasting === undefined &&
        input.targetPreparedSpells === undefined
          ? {}
          : {
              spellcasting: input.targetSpellcasting ?? {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: input.targetPreparedSpells ?? [],
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }),
      }),
      ...(input.extraTargetIds ?? []).map((combatantId, index) =>
        characterCreature({
          combatantId,
          displayName: `Target ${index + 2}`,
          initiative: 9 - index,
          side: oppositionSide,
        }),
      ),
      ...(input.statBlockTargets ?? []).map((target) =>
        statBlockCreature({
          combatantId: target.combatantId,
          statBlock: target.statBlock,
          initiative: target.initiative,
          ...(target.side === undefined ? {} : { side: target.side }),
        }),
      ),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function resolvedAnimalFriendshipState(
  beastId: CombatantId,
  additionalStatBlockTargets: NonNullable<
    Parameters<typeof spellBattle>[0]["statBlockTargets"]
  >,
): BattleState {
  const spell = spellRecord(animalFriendshipUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    statBlockTargets: [
      {
        combatantId: beastId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 9,
      },
      ...additionalStatBlockTargets,
    ],
  });
  const act = spellAct({ state, spellId: animalFriendshipUnitId });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    animalFriendshipUnitId,
    [beastId],
  );
  const saveHole = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      savingThrowOutcomeFill(saveHole, [
        { targetId: beastId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Animal Friendship to resolve.");
  }
  return resolved.state;
}

export function archeryBattle(input: {
  readonly attack: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleState {
  const characterUnitRefs = input.characterUnitRefs ?? [archeryBattleUnitRef()];
  const result = startBattle({
    battleId: battleId("unit-profile-archery-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Archer",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function savageAttackerBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleState {
  const savageAttackerUnitRef = savageAttackerBattleUnitRef();
  const result = startBattle({
    battleId: battleId("unit-profile-savage-attacker-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Savage Attacker",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: input.characterUnitRefs ?? [savageAttackerUnitRef],
        ...(input.classLevels === undefined
          ? {}
          : { classLevels: input.classLevels }),
        ...(input.unitFeatures === undefined
          ? {}
          : { unitFeatures: input.unitFeatures }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function combatProwessBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly cantrips?: readonly SpellRecord[];
  readonly targetPreparedSpells?: readonly SpellRecord[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-combat-prowess-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Peerless Aim User",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: [combatProwessBattleUnitRef()],
        ...(input.cantrips === undefined
          ? {}
          : {
              spellcasting: {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: input.cantrips,
                preparedSpells: [],
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [],
              },
            }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetPreparedSpells === undefined
          ? {}
          : {
              spellcasting: {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: input.targetPreparedSpells,
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }),
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function extraAttackBattle(
  characterUnitRefs: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"],
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-extra-attack-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Extra Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        characterUnitRefs,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function fastMovementBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-fast-movement-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Fast Barbarian",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [fastMovementBattleUnitRef()],
        classLevels: [{ className: "barbarian", level: classLevel(5) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function rovingBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-roving-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Roving Ranger",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [rovingBattleUnitRef()],
        classLevels: [{ className: "ranger", level: classLevel(6) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function relentlessEnduranceBattle(input: {
  readonly targetHp: number;
  readonly targetMaxHp?: number;
  readonly usesRemaining?: number;
}): BattleState {
  const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-relentless-endurance-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Orc Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp,
        maxHp: input.targetMaxHp ?? 12,
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [
          {
            unitId: orcRelentlessEnduranceUnitId,
            supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
          },
        ],
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function adrenalineRushBattle(
  input: { readonly tempHp?: number; readonly usesRemaining?: number } = {},
): BattleState {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-adrenaline-rush-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Orc",
        initiative: 20,
        side: partySide,
        tempHp: input.tempHp ?? 0,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [adrenalineRushBattleUnitRef()],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function adrenalineRushDashAct(
  state: BattleState,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  const act = discoverBattleActs(state).find(isBonusActionWalkDashAct);
  expect(isBonusActionWalkDashAct(act)).toBe(true);
  if (!isBonusActionWalkDashAct(act)) {
    throw new Error("Expected Adrenaline Rush Bonus Action Dash act.");
  }
  return act;
}

function isBonusActionWalkDashAct(
  act: AvailableBattleAct | undefined,
): act is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  return (
    act !== undefined &&
    act.subject.tag === "bonusActionStandardAction" &&
    act.subject.action === "dash" &&
    act.subject.speedKind === "walk"
  );
}

export function adrenalineRushDashSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
> {
  return {
    tag: "bonusActionStandardAction",
    actorId: spellCasterId,
    sourceUnitId: orcAdrenalineRushUnitId,
    action: "dash",
    speedKind: "walk",
  };
}

export function relentlessEnduranceDisposition(
  state: BattleState,
  damageRoll: number,
): Extract<BattleHole, { readonly kind: "attackDamageDisposition" }> & {
  readonly prefixFills: readonly BattleFill[];
} {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const awaitingDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  const disposition = requireResultHole(
    awaitingDisposition,
    "attackDamageDisposition",
  );
  return {
    ...disposition,
    prefixFills: [targetFill, rollFill, damageFill],
  };
}

export function relentlessEnduranceDamageResult(
  state: BattleState,
  damageRoll: number,
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const withoutDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  if (
    withoutDisposition.tag !== "needsHoles" ||
    !withoutDisposition.holes.some(
      (hole) => hole.kind === "attackDamageDisposition",
    )
  ) {
    return withoutDisposition;
  }
  const disposition = requireResultHole(
    withoutDisposition,
    "attackDamageDisposition",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      rollFill,
      damageFill,
      attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
    ],
  });
}

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

export function resolveWeaponAttack(
  state: BattleState,
  attackName: "Longsword" | "Shortbow",
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject(attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      ],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4]]),
    ],
  });
}

export function extraAttackBattleUnitRef(
  unitId:
    | typeof fighterExtraAttackUnitId
    | typeof paladinExtraAttackUnitId = fighterExtraAttackUnitId,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId,
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function attackDamageRiderBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rogueSneakAttackUnitId,
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function savageAttackerBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(savageAttackerUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: savageAttackerUnitId,
      supportProfiles: [WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function archeryBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = archeryFeatureUnit();
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: archeryUnitId,
      supportProfiles: [archerySupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function combatProwessBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: boonOfCombatProwessUnitId,
      supportProfiles: [combatProwessSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function fastMovementBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: barbarianFastMovementUnitId,
      supportProfiles: [fastMovementSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function rovingBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rangerRovingUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rangerRovingUnitId,
      supportProfiles: [rovingSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function adrenalineRushBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: orcAdrenalineRushUnitId,
      supportProfiles: [adrenalineRushSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function fastMovementSupportProfile() {
  return {
    kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

export function rovingSupportProfile() {
  return {
    kind: PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
    speed: rovingSpeedBonusProfile(),
    grants: rovingSpeedKindGrants(),
  } as const;
}

export function adrenalineRushSupportProfile() {
  return {
    kind: BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    dashTemporaryHitPoints: adrenalineRushProfilePayload(),
  } as const;
}

export function adrenalineRushProfilePayload() {
  return {
    activationCost: { kind: "bonusAction", action: "dash" },
    temporaryHitPoints: { amount: { kind: "proficiencyBonus" } },
    resource: {
      cap: { kind: "proficiencyBonus" },
      resetCadence: "shortOrLongRest",
    },
  } as const;
}

export function rovingSpeedBonusProfile() {
  return {
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

export function rovingSpeedKindGrants() {
  return [
    { speedKind: "climb", feet: { kind: "walkSpeed" } },
    { speedKind: "swim", feet: { kind: "walkSpeed" } },
  ] as const;
}

export function rovingMovementHole(
  state: BattleState,
): Extract<BattleHole, { readonly kind: "movement" }> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Roving Movement act.");
  }
  return requireHole(act.initialHoles, "movement");
}

export function archeryFeatureUnit(): PassiveFeatUnit {
  const unit = unitLibrary.requireUnit(archeryUnitId);
  expect(isPassiveFeatUnit(unit)).toBe(true);
  if (!isPassiveFeatUnit(unit)) {
    throw new Error("Expected Archery passive feat Unit.");
  }
  return unit;
}

export function isPassiveFeatUnit(unit: UnitRecord): unit is PassiveFeatUnit {
  return unit.kind === "feat" && unit.mechanics.family === "passive";
}

export function heavyArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
  };
}

export function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly armorClass?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["armorClass"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [{ className: "wizard", level: 1 }],
      ...(input.weaponProficiencies === undefined
        ? {}
        : { weaponProficiencies: input.weaponProficiencies }),
      armorClass:
        input.armorClass !== undefined
          ? input.armorClass
          : attack === null
            ? defaultArmorClassState()
            : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: `main:${attack.weapon.id}`,
                unitId: attack.weapon.id,
                grip: "one_handed" as const,
              },
            },
      attack,
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

export function statBlockWithCreatureType(
  creatureType: StatBlockRecord["statBlock"]["creatureType"],
): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  return {
    ...base,
    id: `stat_block_test_${creatureType}`,
    name: `Test ${creatureType}`,
    statBlock: {
      ...base.statBlock,
      displayName: `Test ${creatureType}`,
      creatureType,
    },
  };
}

export function legendaryActionStatBlock(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: "stat_block_command_legendary",
    name: "Command Legendary",
    statBlock: {
      ...base.statBlock,
      displayName: "Command Legendary",
      legendaryActions: {
        uses: 1,
        actions: {
          attacks: [
            {
              ...scimitar,
              name: "Tail Swipe",
            },
          ],
        },
      },
    },
  };
}

export function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: number;
  readonly side?: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side ?? oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      maxHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      tempHp: Hp(0),
    },
  };
}

export function statBlockLiteralNumber(
  value: StatBlockRecord["statBlock"]["hp"],
): number {
  if (typeof value === "number") {
    return value;
  }
  if (value.kind === "literal") {
    return value.value;
  }
  throw new Error("Expected literal stat block number.");
}

export function statBlockAttackAct(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === attackName,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${attackName} stat block attack act.`);
  }
  return act;
}

export function zeroAbilityWeaponAttack(
  unitId: Extract<UnitRecord, { readonly kind: "weapon" }>["id"],
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = requireTestOrCatalogUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

export function withSameClubMainAndOffHand(
  state: BattleState,
  offHandAttack: ReturnType<typeof zeroAbilityWeaponAttack>,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character caster.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      origin: {
        ...caster.origin,
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_club",
            unitId: "weapon_club",
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: "off:weapon_club",
            unitId: "weapon_club",
          },
        },
        offHandAttack,
      },
    }),
  };
}

export function weaponAttackRollHole(input: {
  readonly state: BattleState;
  readonly attackName: "Longsword" | "Shortbow";
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: input.actorId,
    action: "attack",
    attackName: input.attackName,
  };
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
}

export function weaponAttackSubject(
  attackName: "Longsword" | "Shortbow",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: spellCasterId,
    action: "attack",
    attackName,
  };
}

export function requireResultHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result.`);
  }
  return requireHole(result.holes, kind);
}

export function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

export function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "abilityCheck" }>,
  total: number,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "abilityCheck" }
  >["spatialFacts"],
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: { total },
    ...(spatialFacts === undefined ? {} : { spatialFacts }),
  };
}

export function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct {
  const act = maybeSpellAct(input);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

export function maybeSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      (input.slotLevel === undefined ||
        (candidate.subject.invocation.tag === "spellSlot" &&
          Number(candidate.subject.invocation.slotLevel) === input.slotLevel)),
  );
}

export function bonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action spell act.`);
  }
  return act;
}

export function bonusSpellActForItem(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly componentWeaponItemId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      candidate.subject.componentWeaponItemId === input.componentWeaponItemId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(
      `Expected ${input.spellId} Bonus Action spell act for ${input.componentWeaponItemId}.`,
    );
  }
  return act;
}

export function bonusActionDashSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionDashSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionDashSpellAct =>
      candidate.subject.tag === "bonusActionDashSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action Dash spell act.`);
  }
  return act;
}

export function jumpMovementReplacementAct(
  state: BattleState,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >;
} {
  const act = maybeJumpMovementReplacementAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Jump movement replacement act.");
  }
  return act;
}

export function maybeJumpMovementReplacementAct(state: BattleState):
  | (AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "jumpMovementReplacement";
        }
      >;
    })
  | undefined {
  return discoverBattleActs(state).find(isJumpMovementReplacementAct);
}

function isJumpMovementReplacementAct(
  candidate: AvailableBattleAct,
): candidate is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >;
} {
  return (
    candidate.subject.tag === "runtimeCommand" &&
    candidate.subject.command === "jumpMovementReplacement"
  );
}

export function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function requireCombatant(
  state: BattleState,
  combatantId: CombatantId,
): NonNullable<
  BattleState["combatants"] extends ReadonlyMap<CombatantId, infer C>
    ? C
    : never
> {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

export function requireSpellDamageReductionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "rolledDice" }> & {
  readonly spellDamageReduction: unknown;
} {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "rolledDice" }> & {
      readonly spellDamageReduction: unknown;
    } => candidate.kind === "rolledDice" && "spellDamageReduction" in candidate,
  );
  if (hole === undefined) {
    throw new Error("Expected spell damage reduction roll hole.");
  }
  return hole;
}

export function withResistanceEffect(
  state: BattleState,
  targetId: CombatantId,
  damageType: DamageType,
  usedThisTurn: boolean,
): BattleState {
  const target = requireCombatant(state, targetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "spellDamageReduction" as const,
          sourceSpellId: resistanceUnitId,
          sourceCombatantId: spellCasterId,
          damageType,
          amount: { dice: 1 as const, dieSize: 4 as const },
          usedThisTurn,
          expiresAt: {
            kind: "concentration" as const,
            combatantId: spellCasterId,
          },
        },
      ],
    }),
  };
}

export function completedWeaponDamageInput(state: BattleState): {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
} {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const attack = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  return {
    subject,
    fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[4]])],
  };
}

export function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = "Unarmed Strike",
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      attackName === "Shortbow"
        ? {
            kind: "attackTargetInRangedRange",
            actorId,
            targetId,
            attackName,
            rangeBand: "normal",
          }
        : {
            kind: "attackTargetInMeleeReach",
            actorId,
            targetId,
            attackName,
          },
    ],
  };
}

export function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
    readonly missToHitReplacementUnitId?: string;
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.missToHitReplacementUnitId === undefined
        ? {}
        : { missToHitReplacementUnitId: value.missToHitReplacementUnitId }),
    },
  };
}

export function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
    readonly jumpMovementReplacement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["jumpMovementReplacement"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.jumpMovementReplacement === undefined
        ? {}
        : { jumpMovementReplacement: value.jumpMovementReplacement }),
    },
  };
}

export function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export function knownWillingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = spellTargetFill(hole, spellId, casterId, targetId);
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;

export function spellObjectTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
  readonly damageDisposition?: BattleObjectDamageDisposition;
  readonly ignitionDisposition?: BattleObjectIgnitionDisposition;
  readonly attackerCanSeeObject?: boolean;
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("produce-flame-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        armorClass: armorClass(13),
        damageDisposition: input.damageDisposition ?? { kind: "tableResolved" },
      },
      ...(input.ignitionDisposition === undefined
        ? []
        : [
            {
              kind: "spellObjectIgnition" as const,
              casterId: input.casterId,
              objectId,
              spellId: input.spellId,
              disposition: input.ignitionDisposition,
            },
          ]),
      ...(input.attackerCanSeeObject === undefined
        ? []
        : [
            {
              kind: "spellObjectTargetSight" as const,
              casterId: input.casterId,
              objectId,
              spellId: input.spellId,
              attackerCanSeeObject: input.attackerCanSeeObject,
            },
          ]),
    ],
  };
}

export function spellObjectLightTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly size?: Size;
  readonly wornOrCarried?: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectLightTarget" }
  >["wornOrCarried"];
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("light-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectLightTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        size: input.size ?? "medium",
        wornOrCarried: input.wornOrCarried ?? { kind: "nobody" },
      },
    ],
  };
}

export function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  if (hole.spell.targeting.kind === "pointOriginSphereTargetList") {
    return {
      kind: "spellTargetList",
      holeId: hole.holeId,
      value: { targetIds },
      spatialFacts: [
        {
          kind: "spellTargetsInPointOriginSphere",
          casterId,
          spellId,
          areaId: `test:${spellId}:point-origin-sphere`,
          radiusFeet: hole.spell.targeting.area.radiusFeet,
          targetIds,
        },
      ],
    };
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId,
    })),
  };
}

export function jumpSpellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.flatMap((targetId) => [
      {
        kind: "spellTarget" as const,
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "spellTargetKnownWilling" as const,
        casterId,
        targetId,
        spellId,
      },
    ]),
  };
}

export function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole &&
      hole.spell.procedure !== "rollModifier" &&
      hole.spell.targeting.kind !== "singleCombatant" &&
      hole.spell.targeting.kind !== "targetList"
        ? {
            area: {
              originAnchorId: spellCasterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

export function faerieFireObjectOutlineFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  affectedObjectIds: readonly ReturnType<typeof battleObjectId>[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "faerieFireArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [],
        affectedObjectIds,
      },
      outcomes: [],
    },
  };
}

export function thunderwaveSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: thunderwaveArea(
        outcomes.map((outcome) => outcome.targetId),
        outcomes.flatMap((outcome) =>
          outcome.succeeded ? [] : [outcome.targetId],
        ),
      ),
      outcomes,
    },
  };
}

export function thunderwaveArea(
  affectedTargetIds: readonly CombatantId[],
  failedTargetIds: readonly CombatantId[],
): Extract<BattleSpellAreaChoice, { readonly kind: "thunderwaveArea" }> {
  return {
    kind: "thunderwaveArea",
    originAnchorId: spellCasterId,
    affectedTargetIds,
    creaturePushes: failedTargetIds.map((targetId) => ({
      targetId,
      disposition: {
        kind: "pushed" as const,
        distanceFeet: movementFeet(10),
        destinationId: battleTablePositionId(`pushed:${targetId}`),
        provokesOpportunityAttacks: false as const,
      },
    })),
    unsecuredObjectPushes: [
      {
        objectId: thunderwaveObjectId,
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(10),
          destinationId: battleTablePositionId("pushed:thunderwave-object"),
          provokesOpportunityAttacks: false,
        },
      },
    ],
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

export function greaseSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "greaseGroundArea",
        areaId: greaseAreaId,
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

export function singleTargetSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes: [{ targetId, succeeded }] },
  };
}

export function commandApproachMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly movedWithinFiveFeetOfCaster: boolean;
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: [],
      commandApproach: {
        kind: "commandApproachShortestDirectRouteTowardCaster",
        movedWithinFiveFeetOfCaster: value.movedWithinFiveFeetOfCaster,
      },
    },
  };
}

export function commandFleeMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      commandFlee: {
        kind: "commandFleeFastestAvailableRouteAwayFromCaster",
      },
    },
  };
}

export function greaseGroundHazardSaveAct(
  state: BattleState,
  actorId: CombatantId,
  trigger: "entersArea" | "endsTurnInArea",
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "greaseGroundHazardSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "greaseGroundHazardSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.trigger === trigger &&
      candidate.subject.areaId === greaseAreaId,
  );
  if (act === undefined) {
    throw new Error(`Expected Grease ${trigger} save act.`);
  }
  return act;
}

export function greaseGroundHazardEndTurnAct(
  state: BattleState,
  actorId: CombatantId,
): ReturnType<typeof greaseGroundHazardSaveAct> {
  return greaseGroundHazardSaveAct(state, actorId, "endsTurnInArea");
}

export function skillChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "skillChoice" }>,
  value: Extract<BattleFill, { readonly kind: "skillChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "skillChoice" }> {
  return { kind: "skillChoice", holeId: hole.holeId, value };
}

export function isSelectedSorcerousBurstDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedDamageSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
> {
  return (
    invocation.procedure === "spellAttackDamage" &&
    invocation.damage.kind === "selectedSorcerousBurstDamage"
  );
}

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
  weaponDamageDiceRollChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["weaponDamageDiceRollChoice"],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    ...(weaponDamageDiceRollChoice === undefined
      ? {}
      : { weaponDamageDiceRollChoice }),
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

export function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

export function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
}

export function spellActInvocation(
  act: ActionSpellAct,
): SupportedSpellInvocation {
  const hole = act.initialHoles[0];
  return spellHoleInvocation(hole === undefined ? [] : [hole]);
}

export function spellHoleInvocation(
  holes: readonly BattleHole[],
): SupportedSpellInvocation {
  const hole = holes[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}

export {
  ALTERNATE_ACTION_COST_ACTIONS,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  DieRollResult,
  Either,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  Hp,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  abilityModifier,
  applyBattleHitPointDamage,
  applyCondition,
  applyFailedSaveSpellConditionEffects,
  applyPreparedSlotSpellDamage,
  armorClass,
  attackBonus,
  battleBardicInspirationGrantSupportForUnit,
  battleCombatantSide,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  battleId,
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleMartialArtsAttackProjectionSupportForUnit,
  battleObjectId,
  battlePassiveSpeedKindGrantsSupportForUnit,
  battlePerceptionRollModeForSight,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleSightObscurement,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  breakBattleConcentration,
  buildStatBlockCatalog,
  buildUnitCatalog,
  canSpendAction,
  cantripSpellInvocationRef,
  characterBattleResourceForUnit,
  characterId,
  classLevel,
  combatantId,
  conditionApplicationPreventedByCreatureTypeProtection,
  damageAmount,
  decodeUnitRecordSync,
  defaultArmorClassState,
  difficultyClass,
  discoverBattleActs,
  elapsedTimeTicks,
  eldritchBlastInput,
  endTurn,
  hasCondition,
  hideousLaughterRepeatSavingThrowOutcomeHole,
  holeId,
  initiativeScore,
  mechanicsOnlyMyceliumStepUnit,
  movementDeltaFeet,
  movementFeet,
  myceliumStepInput,
  myceliumStepUnitId,
  objectInvisibleBenefitDenied,
  parseSupportedUnitFeatureProfile,
  proficiencyBonus,
  resolveBattlePossessionAttempt,
  resolveBattleReaction,
  resolveBattleSubject,
  resourceCount,
  sameBattleSubject,
  snapshotBattle,
  spellDamageHole,
  spellId,
  spellSavingThrowOutcomeHole,
  spellSlotInvocationRef,
  spellSlotLevel,
  srdStatBlockCollection,
  srdUnitCollection,
  starryWispInput,
  startBattle,
  supportedPreparedHellishRebukeReactionSpellProfile,
  supportedPreparedHideousLaughterProfile,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSleepTargetAdmissionProfile,
  trueStrikeInput,
  validateSavingThrowOutcomes,
  validateSpellDamageFill,
  weaponClubInput,
};
export type {
  ActivationPhase,
  AvailableBattleAct,
  BattleActiveEffect,
  BattleCreatureInit,
  BattleCreatureState,
  BattleFill,
  BattleHole,
  BattleObjectDamageDisposition,
  BattleObjectIgnitionDisposition,
  BattleSpellAreaChoice,
  BattleSpellSavingThrowOutcomeHole,
  BattleState,
  BattleSubject,
  BattleTargetSpatialFact,
  ClassName,
  CombatantId,
  DamageType,
  EffectAtom,
  ProficiencyBonus,
  Size,
  SpellMarkedDamageRider,
  SpellRecord,
  StatBlockRecord,
  SupportedDamageSpellInvocation,
  SupportedSpellInvocation,
  UnitRecord,
  WeaponProficiency,
};
