import type { OperationDomains } from "./execution-domains.ts";
import {
  tool,
  tools,
  boundContinuation,
  internal,
  type ChatGptExposure,
  type ChatGptExposureAccounting,
} from "./operation-exposure.ts";

const UNIT_PROCEDURE_EXPOSURE = {
  acrobaticMovement: internal(),
  alternateActionCost: tools("dash", "disengage", "hide"),
  attackActionAreaSaveDamageReplacement: tool(
    "replace_attack_with_area_damage",
  ),
  attackActionAttackCountScaling: internal(),
  attackDamageDieFloor: boundContinuation(),
  attackDamageReductionZeroDamageRedirect: boundContinuation(),
  attackDamageRider: boundContinuation(),
  attackRollDefense: boundContinuation(),
  attackRollMissToHitReplacement: boundContinuation(),
  bardicInspirationGrant: tool("grant_inspiration_die"),
  bonusActionDashTemporaryHitPoints: tool("dash"),
  bonusActionDelegatedStandardActions: tools("dash", "disengage", "hide"),
  bonusActionHealingMovementRider: boundContinuation(),
  ongoingFeatureActivationMovementRider: boundContinuation(),
  passiveInitiativeRollMode: internal(),
  brutalStrike: boundContinuation(),
  creatureSpaceMovementPermission: internal(),
  cunningStrike: boundContinuation(),
  cunningStrikeOptionGrant: boundContinuation(),
  d20TestNaturalOneReroll: boundContinuation(),
  druidWildCompanionSpellCast: tool("cast_spell"),
  druidWildShapeKnownForm: tools("assume_beast_form", "revert_beast_form"),
  enemyZeroHitPointTemporaryHitPoints: internal(),
  extraActionGrant: tool("gain_extra_action"),
  failedAbilityCheckResourceBoost: boundContinuation(),
  failedSavingThrowReroll: boundContinuation(),
  grappler: internal(),
  hideActionObscurementPermission: internal(),
  huntersPrey: boundContinuation(),
  initiativeProficiencyAndSwap: internal(),
  lightExtraAttackDamageAbilityModifier: internal(),
  magicActionAreaSaveDamageHealing: tool("apply_area_damage_and_healing"),
  magicActionHealingPool: tool("heal_from_resource_pool"),
  magicActionSaveGatedCondition: tool("apply_feature_condition"),
  markedCreatureDefensesDisclosure: internal(),
  martialArtsAttackProjection: internal(),
  monkFocusBattleOptions: tools(
    "begin_flurry",
    "focus_disengage_and_dodge",
    "focus_dash_and_disengage",
    "dash",
    "disengage",
  ),
  ongoingFeature: tool("sustain_ongoing_feature"),
  openHandTechnique: boundContinuation(),
  paladinSacredWeapon: tools("imbue_held_weapon", "dismiss_weapon_imbuement"),
  passiveAbilityCheckRollMode: internal(),
  passiveArmorClassBonus: internal(),
  passiveDamageResistance: internal(),
  passiveRangedAttackRollBonus: internal(),
  passiveSavingThrowRollMode: internal(),
  passiveSpeedBonus: internal(),
  passiveSpeedKindGrants: internal(),
  potentCantrip: internal(),
  reactionRollOrDamageReduction: boundContinuation(),
  remarkableAthlete: internal(),
  retaliationReactionAttack: boundContinuation(),
  rogueSteadyAim: tool("steady_aim"),
  saveDamageReplacement: internal(),
  selfBonusActionHealing: tool("heal_self"),
  spellSlotHealingModifier: internal(),
  stunningStrike: boundContinuation(),
  tacticalMasterReplacement: boundContinuation(),
  weaponDamageDiceRollChoice: boundContinuation(),
  weaponMasteryCleave: boundContinuation(),
  weaponMasteryPush: boundContinuation(),
  weaponMasterySap: internal(),
  weaponMasterySlow: internal(),
  weaponMasteryTopple: boundContinuation(),
  weaponOrUnarmedCriticalRange19: internal(),
  zeroHitPointReplacement: boundContinuation(),
} as const satisfies Readonly<
  Record<
    | OperationDomains["unitFeatureProcedures"]
    | OperationDomains["unitSupportProcedures"],
    ChatGptExposure
  >
>;

const SHARED_UNIT_PROCEDURE_EXPOSURE = {
  acrobaticMovement: UNIT_PROCEDURE_EXPOSURE["acrobaticMovement"],
  attackActionAreaSaveDamageReplacement:
    UNIT_PROCEDURE_EXPOSURE["attackActionAreaSaveDamageReplacement"],
  attackActionAttackCountScaling:
    UNIT_PROCEDURE_EXPOSURE["attackActionAttackCountScaling"],
  attackDamageDieFloor: UNIT_PROCEDURE_EXPOSURE["attackDamageDieFloor"],
  attackDamageRider: UNIT_PROCEDURE_EXPOSURE["attackDamageRider"],
  attackRollMissToHitReplacement:
    UNIT_PROCEDURE_EXPOSURE["attackRollMissToHitReplacement"],
  bardicInspirationGrant: UNIT_PROCEDURE_EXPOSURE["bardicInspirationGrant"],
  bonusActionDashTemporaryHitPoints:
    UNIT_PROCEDURE_EXPOSURE["bonusActionDashTemporaryHitPoints"],
  bonusActionDelegatedStandardActions:
    UNIT_PROCEDURE_EXPOSURE["bonusActionDelegatedStandardActions"],
  creatureSpaceMovementPermission:
    UNIT_PROCEDURE_EXPOSURE["creatureSpaceMovementPermission"],
  d20TestNaturalOneReroll: UNIT_PROCEDURE_EXPOSURE["d20TestNaturalOneReroll"],
  druidWildShapeKnownForm: UNIT_PROCEDURE_EXPOSURE["druidWildShapeKnownForm"],
  enemyZeroHitPointTemporaryHitPoints:
    UNIT_PROCEDURE_EXPOSURE["enemyZeroHitPointTemporaryHitPoints"],
  failedAbilityCheckResourceBoost:
    UNIT_PROCEDURE_EXPOSURE["failedAbilityCheckResourceBoost"],
  failedSavingThrowReroll: UNIT_PROCEDURE_EXPOSURE["failedSavingThrowReroll"],
  grappler: UNIT_PROCEDURE_EXPOSURE["grappler"],
  hideActionObscurementPermission:
    UNIT_PROCEDURE_EXPOSURE["hideActionObscurementPermission"],
  initiativeProficiencyAndSwap:
    UNIT_PROCEDURE_EXPOSURE["initiativeProficiencyAndSwap"],
  lightExtraAttackDamageAbilityModifier:
    UNIT_PROCEDURE_EXPOSURE["lightExtraAttackDamageAbilityModifier"],
  magicActionAreaSaveDamageHealing:
    UNIT_PROCEDURE_EXPOSURE["magicActionAreaSaveDamageHealing"],
  magicActionHealingPool: UNIT_PROCEDURE_EXPOSURE["magicActionHealingPool"],
  magicActionSaveGatedCondition:
    UNIT_PROCEDURE_EXPOSURE["magicActionSaveGatedCondition"],
  martialArtsAttackProjection:
    UNIT_PROCEDURE_EXPOSURE["martialArtsAttackProjection"],
  monkFocusBattleOptions: UNIT_PROCEDURE_EXPOSURE["monkFocusBattleOptions"],
  openHandTechnique: UNIT_PROCEDURE_EXPOSURE["openHandTechnique"],
  paladinSacredWeapon: UNIT_PROCEDURE_EXPOSURE["paladinSacredWeapon"],
  passiveAbilityCheckRollMode:
    UNIT_PROCEDURE_EXPOSURE["passiveAbilityCheckRollMode"],
  passiveArmorClassBonus: UNIT_PROCEDURE_EXPOSURE["passiveArmorClassBonus"],
  passiveRangedAttackRollBonus:
    UNIT_PROCEDURE_EXPOSURE["passiveRangedAttackRollBonus"],
  passiveSavingThrowRollMode:
    UNIT_PROCEDURE_EXPOSURE["passiveSavingThrowRollMode"],
  passiveSpeedBonus: UNIT_PROCEDURE_EXPOSURE["passiveSpeedBonus"],
  passiveSpeedKindGrants: UNIT_PROCEDURE_EXPOSURE["passiveSpeedKindGrants"],
  potentCantrip: UNIT_PROCEDURE_EXPOSURE["potentCantrip"],
  reactionRollOrDamageReduction:
    UNIT_PROCEDURE_EXPOSURE["reactionRollOrDamageReduction"],
  remarkableAthlete: UNIT_PROCEDURE_EXPOSURE["remarkableAthlete"],
  retaliationReactionAttack:
    UNIT_PROCEDURE_EXPOSURE["retaliationReactionAttack"],
  rogueSteadyAim: UNIT_PROCEDURE_EXPOSURE["rogueSteadyAim"],
  saveDamageReplacement: UNIT_PROCEDURE_EXPOSURE["saveDamageReplacement"],
  spellSlotHealingModifier: UNIT_PROCEDURE_EXPOSURE["spellSlotHealingModifier"],
  stunningStrike: UNIT_PROCEDURE_EXPOSURE["stunningStrike"],
  weaponDamageDiceRollChoice:
    UNIT_PROCEDURE_EXPOSURE["weaponDamageDiceRollChoice"],
  zeroHitPointReplacement: UNIT_PROCEDURE_EXPOSURE["zeroHitPointReplacement"],
} as const satisfies Readonly<
  Record<
    Extract<
      OperationDomains["unitFeatureProcedures"],
      OperationDomains["unitSupportProcedures"]
    >,
    ChatGptExposure
  >
>;

export const UNIT_FEATURE_EXPOSURE = {
  ...SHARED_UNIT_PROCEDURE_EXPOSURE,
  extraActionGrant: UNIT_PROCEDURE_EXPOSURE["extraActionGrant"],
  ongoingFeature: UNIT_PROCEDURE_EXPOSURE["ongoingFeature"],
  selfBonusActionHealing: UNIT_PROCEDURE_EXPOSURE["selfBonusActionHealing"],
} as const satisfies ChatGptExposureAccounting["unitFeatureProcedures"];

export const UNIT_SUPPORT_EXPOSURE = {
  ongoingFeatureActivationMovementRider:
    UNIT_PROCEDURE_EXPOSURE["ongoingFeatureActivationMovementRider"],
  passiveInitiativeRollMode:
    UNIT_PROCEDURE_EXPOSURE["passiveInitiativeRollMode"],
  ...SHARED_UNIT_PROCEDURE_EXPOSURE,
  alternateActionCost: UNIT_PROCEDURE_EXPOSURE["alternateActionCost"],
  attackDamageReductionZeroDamageRedirect:
    UNIT_PROCEDURE_EXPOSURE["attackDamageReductionZeroDamageRedirect"],
  attackRollDefense: UNIT_PROCEDURE_EXPOSURE["attackRollDefense"],
  bonusActionHealingMovementRider:
    UNIT_PROCEDURE_EXPOSURE["bonusActionHealingMovementRider"],
  brutalStrike: UNIT_PROCEDURE_EXPOSURE["brutalStrike"],
  cunningStrike: UNIT_PROCEDURE_EXPOSURE["cunningStrike"],
  cunningStrikeOptionGrant: UNIT_PROCEDURE_EXPOSURE["cunningStrikeOptionGrant"],
  druidWildCompanionSpellCast:
    UNIT_PROCEDURE_EXPOSURE["druidWildCompanionSpellCast"],
  huntersPrey: UNIT_PROCEDURE_EXPOSURE["huntersPrey"],
  markedCreatureDefensesDisclosure:
    UNIT_PROCEDURE_EXPOSURE["markedCreatureDefensesDisclosure"],
  passiveDamageResistance: UNIT_PROCEDURE_EXPOSURE["passiveDamageResistance"],
  tacticalMasterReplacement:
    UNIT_PROCEDURE_EXPOSURE["tacticalMasterReplacement"],
  weaponMasteryCleave: UNIT_PROCEDURE_EXPOSURE["weaponMasteryCleave"],
  weaponMasteryPush: UNIT_PROCEDURE_EXPOSURE["weaponMasteryPush"],
  weaponMasterySap: UNIT_PROCEDURE_EXPOSURE["weaponMasterySap"],
  weaponMasterySlow: UNIT_PROCEDURE_EXPOSURE["weaponMasterySlow"],
  weaponMasteryTopple: UNIT_PROCEDURE_EXPOSURE["weaponMasteryTopple"],
  weaponOrUnarmedCriticalRange19:
    UNIT_PROCEDURE_EXPOSURE["weaponOrUnarmedCriticalRange19"],
} as const satisfies ChatGptExposureAccounting["unitSupportProcedures"];
