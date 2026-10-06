import {
  tool,
  refineOperations,
  type ChatGptExposureAccounting,
} from "./operation-exposure.ts";

export const SPELL_PROCEDURE_EXPOSURE = {
  abilityD20TestRollModeSaveGate: refineOperations(
    "spellOperations",
    "abilityD20TestRollModeSaveGate",
  ),
  afterHitDamage: refineOperations("spellOperations", "afterHitDamage"),
  afterHitDamageAndIllumination: refineOperations(
    "spellOperations",
    "afterHitDamageAndIllumination",
  ),
  afterHitSaveGatedCondition: refineOperations(
    "spellOperations",
    "afterHitSaveGatedCondition",
  ),
  afterHitTimedDamageAndSave: refineOperations(
    "spellOperations",
    "afterHitTimedDamageAndSave",
  ),
  areaMovementDistanceDamage: refineOperations(
    "spellOperations",
    "areaMovementDistanceDamage",
  ),
  attackBurstSaveDamage: refineOperations(
    "spellOperations",
    "attackBurstSaveDamage",
  ),
  chainedSpellAttackDamage: refineOperations(
    "spellOperations",
    "chainedSpellAttackDamage",
  ),
  chosenDamageResistance: refineOperations(
    "spellOperations",
    "chosenDamageResistance",
  ),
  compelledNextTurnBehavior: refineOperations(
    "spellOperations",
    "compelledNextTurnBehavior",
  ),
  compositeTargetBuffWithAftermath: refineOperations(
    "spellOperations",
    "compositeTargetBuffWithAftermath",
  ),
  conditionImmunityAndTurnStartTemporaryHitPoints: refineOperations(
    "spellOperations",
    "conditionImmunityAndTurnStartTemporaryHitPoints",
  ),
  conditionRemovalProtection: refineOperations(
    "spellOperations",
    "conditionRemovalProtection",
  ),
  controlledVerticalSuspension: refineOperations(
    "spellOperations",
    "controlledVerticalSuspension",
  ),
  creatureSizeDecrease: refineOperations(
    "spellOperations",
    "creatureSizeDecrease",
  ),
  creatureSizeIncrease: refineOperations(
    "spellOperations",
    "creatureSizeIncrease",
  ),
  creatureTypeProtection: refineOperations(
    "spellOperations",
    "creatureTypeProtection",
  ),
  damageReduction: refineOperations("spellOperations", "damageReduction"),
  directCondition: refineOperations("spellOperations", "directCondition"),
  directConditionRemoval: refineOperations(
    "spellOperations",
    "directConditionRemoval",
  ),
  directHitPointRestoration: refineOperations(
    "spellOperations",
    "directHitPointRestoration",
  ),
  directionalPersistentArea: refineOperations(
    "spellOperations",
    "directionalPersistentArea",
  ),
  duplicateHitInterception: refineOperations(
    "spellOperations",
    "duplicateHitInterception",
  ),
  fallingCreatureMitigationReaction: refineOperations(
    "spellOperations",
    "fallingCreatureMitigationReaction",
  ),
  fixedCostMovementReplacement: refineOperations(
    "spellOperations",
    "fixedCostMovementReplacement",
  ),
  grantedAlternateActionCost: refineOperations(
    "spellOperations",
    "grantedAlternateActionCost",
  ),
  grantedAreaSaveDamageAction: refineOperations(
    "spellOperations",
    "grantedAreaSaveDamageAction",
  ),
  heldLight: refineOperations("spellOperations", "heldLight"),
  heldLightHurl: refineOperations("spellOperations", "heldLightHurl"),
  linkedDefenseResistanceDamageShare: refineOperations(
    "spellOperations",
    "linkedDefenseResistanceDamageShare",
  ),
  magicSuppressionEmanation: refineOperations(
    "spellOperations",
    "magicSuppressionEmanation",
  ),
  magicalDarknessPointOrigin: refineOperations(
    "spellOperations",
    "magicalDarknessPointOrigin",
  ),
  makeStable: refineOperations("spellOperations", "makeStable"),
  markedDamageRider: refineOperations(
    "spellOperations",
    "markedDamageRider.cast",
    "markedDamageRider.transfer",
  ),
  movableLightManifestation: refineOperations(
    "spellOperations",
    "movableLightManifestation.create",
    "movableLightManifestation.reposition",
  ),
  objectContactDamage: refineOperations(
    "spellOperations",
    "objectContactDamage",
  ),
  objectContactDamageRepeat: refineOperations(
    "spellOperations",
    "objectContactDamageRepeat",
  ),
  objectLight: refineOperations("spellOperations", "objectLight"),
  ongoingSpellEnd: refineOperations("spellOperations", "ongoingSpellEnd"),
  perceptionGatedAttackRollDefense: refineOperations(
    "spellOperations",
    "perceptionGatedAttackRollDefense",
  ),
  persistentAreaSaveComposite: refineOperations(
    "spellOperations",
    "persistentAreaSaveComposite",
  ),
  persistentAreaSaveCondition: refineOperations(
    "spellOperations",
    "persistentAreaSaveCondition",
  ),
  persistentAreaSaveConditionEscape: refineOperations(
    "spellOperations",
    "persistentAreaSaveConditionEscape",
  ),
  persistentAreaSaveDamage: refineOperations(
    "spellOperations",
    "persistentAreaSaveDamage",
  ),
  persistentAreaTrait: refineOperations(
    "spellOperations",
    "persistentAreaTrait",
  ),
  persistentArmorEffect: refineOperations(
    "spellOperations",
    "persistentArmorEffect",
  ),
  repeatedDamageAllocation: refineOperations(
    "spellOperations",
    "repeatedDamageAllocation",
  ),
  rollModifier: refineOperations("spellOperations", "rollModifier"),
  saveGatedAreaControl: refineOperations(
    "spellOperations",
    "saveGatedAreaControl",
  ),
  saveGatedAttackRollAdvantage: refineOperations(
    "spellOperations",
    "saveGatedAttackRollAdvantage",
  ),
  saveGatedCondition: refineOperations("spellOperations", "saveGatedCondition"),
  saveGatedConditionImmunity: refineOperations(
    "spellOperations",
    "saveGatedConditionImmunity",
  ),
  saveGatedConditionWithRepeat: refineOperations(
    "spellOperations",
    "saveGatedConditionWithRepeat",
  ),
  saveGatedDamage: refineOperations(
    "spellOperations",
    "saveGatedDamage.action",
    "saveGatedDamage.reaction",
  ),
  saveGatedTurnConstraintBundle: refineOperations(
    "spellOperations",
    "saveGatedTurnConstraintBundle",
  ),
  scalarBuff: refineOperations("spellOperations", "scalarBuff"),
  seeInvisibleObserverSight: refineOperations(
    "spellOperations",
    "seeInvisibleObserverSight",
  ),
  selfTeleport: refineOperations("spellOperations", "selfTeleport"),
  selfTransformationMode: refineOperations(
    "spellOperations",
    "selfTransformationMode",
  ),
  spatialMeleeSpellAttackProxy: refineOperations(
    "spellOperations",
    "spatialMeleeSpellAttackProxy.createAndAttack",
    "spatialMeleeSpellAttackProxy.repositionAndAttack",
  ),
  spellAttackDamage: refineOperations("spellOperations", "spellAttackDamage"),
  spellAttackSequence: refineOperations(
    "spellOperations",
    "spellAttackSequence",
  ),
  spellCastInterruptionReaction: refineOperations(
    "spellOperations",
    "spellCastInterruptionReaction",
  ),
  spellCreatedHeldObject: refineOperations(
    "spellOperations",
    "spellCreatedHeldObject",
  ),
  spellCreatedHeldObjectAttack: refineOperations(
    "spellOperations",
    "spellCreatedHeldObjectAttack",
  ),
  spellCreatedHeldObjectReEvoke: refineOperations(
    "spellOperations",
    "spellCreatedHeldObjectReEvoke",
  ),
  spellHostedWeaponAttack: refineOperations(
    "spellOperations",
    "spellHostedWeaponAttack",
  ),
  stagedSaveCondition: refineOperations(
    "spellOperations",
    "stagedSaveCondition",
  ),
  targetingSaveInterdiction: refineOperations(
    "spellOperations",
    "targetingSaveInterdiction",
  ),
  temporaryAbilityCheckRollMode: refineOperations(
    "spellOperations",
    "temporaryAbilityCheckRollMode",
  ),
  triggeredArmorDefense: refineOperations(
    "spellOperations",
    "triggeredArmorDefense",
  ),
  weaponAttackDamageEnhancement: refineOperations(
    "spellOperations",
    "weaponAttackDamageEnhancement",
  ),
  weaponAttackOverride: refineOperations(
    "spellOperations",
    "weaponAttackOverride",
  ),
  weaponDamageRider: refineOperations("spellOperations", "weaponDamageRider"),
} as const satisfies ChatGptExposureAccounting["spellProcedures"];

export const SPELL_OPERATION_EXPOSURE = {
  abilityD20TestRollModeSaveGate: tool("cast_spell"),
  afterHitDamage: tool("cast_spell"),
  afterHitDamageAndIllumination: tool("cast_spell"),
  afterHitSaveGatedCondition: tool("cast_spell"),
  afterHitTimedDamageAndSave: tool("cast_spell"),
  areaMovementDistanceDamage: tool("cast_spell"),
  attackBurstSaveDamage: tool("cast_spell"),
  chainedSpellAttackDamage: tool("cast_spell"),
  chosenDamageResistance: tool("cast_spell"),
  compelledNextTurnBehavior: tool("cast_spell"),
  compositeTargetBuffWithAftermath: tool("cast_spell"),
  conditionImmunityAndTurnStartTemporaryHitPoints: tool("cast_spell"),
  conditionRemovalProtection: tool("cast_spell"),
  controlledVerticalSuspension: tool("cast_spell"),
  creatureSizeDecrease: tool("cast_spell"),
  creatureSizeIncrease: tool("cast_spell"),
  creatureTypeProtection: tool("cast_spell"),
  damageReduction: tool("cast_spell"),
  directCondition: tool("cast_spell"),
  directConditionRemoval: tool("cast_spell"),
  directHitPointRestoration: tool("cast_spell"),
  directionalPersistentArea: tool("cast_spell"),
  duplicateHitInterception: tool("cast_spell"),
  fallingCreatureMitigationReaction: tool("cast_spell"),
  fixedCostMovementReplacement: tool("cast_spell"),
  grantedAlternateActionCost: tool("cast_spell"),
  grantedAreaSaveDamageAction: tool("cast_spell"),
  heldLight: tool("cast_spell"),
  heldLightHurl: tool("hurl_spell_light"),
  linkedDefenseResistanceDamageShare: tool("cast_spell"),
  magicSuppressionEmanation: tool("cast_spell"),
  magicalDarknessPointOrigin: tool("cast_spell"),
  makeStable: tool("cast_spell"),
  "markedDamageRider.cast": tool("cast_spell"),
  "markedDamageRider.transfer": tool("transfer_spell_mark"),
  "movableLightManifestation.create": tool("cast_spell"),
  "movableLightManifestation.reposition": tool("move_spell_lights"),
  objectContactDamage: tool("cast_spell"),
  objectContactDamageRepeat: tool("repeat_spell_contact_damage"),
  objectLight: tool("cast_spell"),
  ongoingSpellEnd: tool("end_ongoing_spell"),
  perceptionGatedAttackRollDefense: tool("cast_spell"),
  persistentAreaSaveComposite: tool("cast_spell"),
  persistentAreaSaveCondition: tool("cast_spell"),
  persistentAreaSaveConditionEscape: tool("cast_spell"),
  persistentAreaSaveDamage: tool("cast_spell"),
  persistentAreaTrait: tool("cast_spell"),
  persistentArmorEffect: tool("cast_spell"),
  repeatedDamageAllocation: tool("allocate_ongoing_spell_damage"),
  rollModifier: tool("cast_spell"),
  saveGatedAreaControl: tool("cast_spell"),
  saveGatedAttackRollAdvantage: tool("cast_spell"),
  saveGatedCondition: tool("cast_spell"),
  saveGatedConditionImmunity: tool("cast_spell"),
  saveGatedConditionWithRepeat: tool("cast_spell"),
  "saveGatedDamage.action": tool("cast_spell"),
  "saveGatedDamage.reaction": tool("cast_spell"),
  saveGatedTurnConstraintBundle: tool("cast_spell"),
  scalarBuff: tool("cast_spell"),
  seeInvisibleObserverSight: tool("cast_spell"),
  selfTeleport: tool("cast_spell"),
  selfTransformationMode: tool("cast_spell"),
  "spatialMeleeSpellAttackProxy.createAndAttack": tool("cast_spell"),
  "spatialMeleeSpellAttackProxy.repositionAndAttack": tool(
    "move_and_attack_with_spell_proxy",
  ),
  spellAttackDamage: tool("cast_spell"),
  spellAttackSequence: tool("cast_spell"),
  spellCastInterruptionReaction: tool("cast_spell"),
  spellCreatedHeldObject: tool("cast_spell"),
  spellCreatedHeldObjectAttack: tool("attack"),
  spellCreatedHeldObjectReEvoke: tool("re_evoke_spell_weapon"),
  spellHostedWeaponAttack: tool("cast_spell"),
  stagedSaveCondition: tool("cast_spell"),
  targetingSaveInterdiction: tool("cast_spell"),
  temporaryAbilityCheckRollMode: tool("cast_spell"),
  triggeredArmorDefense: tool("cast_spell"),
  weaponAttackDamageEnhancement: tool("cast_spell"),
  weaponAttackOverride: tool("cast_spell"),
  weaponDamageRider: tool("cast_spell"),
} as const satisfies ChatGptExposureAccounting["spellOperations"];
