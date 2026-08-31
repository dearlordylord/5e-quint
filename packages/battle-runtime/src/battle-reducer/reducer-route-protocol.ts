import type { Ability, Skill } from "@dnd/surface/surface/types";

export type BattleReducerRouteSubjectFamily =
  | "activeFormLifecycle"
  | "battleAction"
  | "concentrationTeardown"
  | "compelledBehaviorEffect"
  | "charmSourceDamageBreak"
  | "creatureTypeTargetAdmission"
  | "deathSavingThrow"
  | "hitPointRestoration"
  | "heldWeaponActiveEffect"
  | "interruptStackResume"
  | "metamagicBonusActionCastingTime"
  | "metamagicDamageDiceReroll"
  | "metamagicDamageTypeSubstitution"
  | "metamagicEffectiveSpellLevel"
  | "metamagicMissedSpellAttackReroll"
  | "metamagicSavingThrowProtection"
  | "metamagicSavingThrowRollMode"
  | "metamagicSpellGovernor"
  | "metamagicSpellRangeProjection"
  | "metamagicSpellDurationProjection"
  | "metamagicSpellComponentProjection"
  | "creatureStatProjection"
  | "passiveDamageAdjustment"
  | "passiveSavingThrowRollMode"
  | "passiveAbilityCheckRollMode"
  | "creatureSpaceMovementPermission"
  | "compelledMovement"
  | "movementResource"
  | "movementPresentation"
  | "specialSpeedProjection"
  | "objectLightRider"
  | "reactionSpell"
  | "reactionArmorClassEffect"
  | "reactionAfterDamageEffect"
  | "reactionSpellInterruption"
  | "reactionFallMitigation"
  | "rollModifierEffect"
  | "spellDamageReduction"
  | "saveGatedSpell"
  | "scalarBuffEffect"
  | "spatialEffect"
  | "spellHostedWeaponAttack"
  | "weaponDamageRider"
  | "protectionCharmActiveEffect"
  | "hitPointRegainPrevention"
  | "nextAttackRollMode"
  | "reactionInterdiction"
  | "repeatSaveConditionEffect"
  | "turnBoundaryEffectLifecycle"
  | "wardedTargetInterdiction"
  | "zeroHitPointSpellEffectTeardown"
  | "spellBaseArmorClassEffect"
  | "afterHitSpell"
  | "markedDamageRiderEffect"
  | "conditionImmunityTemporaryHitPointEffect"
  | "attackActionAreaSaveDamageReplacement"
  | "unitFeatureBonusAction"
  | "activeFeatureSpellSaveDc"
  | "activeFeatureSpellAttackRollMode"
  | "companionLifecycle"
  | "companionSharedSenses"
  | "companionTouchDelivery"
  | "companionReactionAttack"
  | "slotSpell"
  | "objectTargetSpellAttack"
  | "spellAttackProcedure"
  | "statBlockAction"
  | "weaponEnhancementItemTarget"
  | "weaponHostedSpellEffectCleanup"
  | "weaponAttack"
  | "weaponMasteryProperty"
  | "zeroHitPointStabilization";

export type BattleReducerRouteOwnerGroup =
  | "battleActionEconomy"
  | "battleAttackActionProcedure"
  | "battleSpellSlotAndActionEconomy"
  | "battleCompanion"
  | "battleHoleFrontier"
  | "battleTargetSelection"
  | "battleAreaShape"
  | "battleObjectTargetBoundary"
  | "battleAbilityCheckRollMode"
  | "battleAttackRoll"
  | "battleAttackRollMode"
  | "battleSpellAttackProcedure"
  | "battleAbilityCheck"
  | "battleSavingThrowOutcome"
  | "battleSavingThrowRollMode"
  | "battleHitPointAndZeroHpLifecycle"
  | "battleHitPoint"
  | "battleDamageRoll"
  | "battleDamageType"
  | "battleConcentration"
  | "battleActiveEffect"
  | "battleItemTargetBoundary"
  | "battleConditionLifecycle"
  | "battleCreatureState"
  | "battleCreatureSpaceMovement"
  | "battleDamageAdjustment"
  | "battleArmorClass"
  | "battleFeatureResource"
  | "battleStatBlockAction"
  | "battleMovementResource"
  | "battleTemporaryHitPoint"
  | "battleInterruptStack"
  | "battleLightProjection"
  | "battleSightProjection"
  | "battleObscurementProjection"
  | "battleAreaHazard"
  | "battleTablePresentation"
  | "battleTurnBoundary";

export const BATTLE_REDUCER_ROUTE_HOLE_KINDS = [
  "abilityCheck",
  "abilityChoice",
  "attackDamageDisposition",
  "attackRoll",
  "compelledBehaviorOptionChoice",
  "companionReappearanceInitiative",
  "concentrationSavingThrow",
  "conditionChoice",
  "damageTypeChoice",
  "deathSavingThrow",
  "grappleOutcome",
  "directionalPersistentAreaDirectionChoice",
  "hitPointHealingDistribution",
  "interruptDecision",
  "controlledVerticalSuspensionAltitudeChange",
  "controlledVerticalSuspensionInitialRise",
  "movement",
  "objectDropResolution",
  "ongoingSpellTargetChoice",
  "readyDeclaration",
  "rolledDice",
  "targetingSaveInterdictionOutcome",
  "savingThrowOutcome",
  "selfTransformationModeChoice",
  "shoveOutcome",
  "skillChoice",
  "turnConstraintSomaticSpellFailureOutcome",
  "spellcastingAbilityCheck",
  "spellTargetAllocation",
  "spellTargetList",
  "startTurnOccurrenceOrder",
  "statBlockRechargeRoll",
  "targetAbilityChoices",
  "targetChoice",
  "temporaryHitPointChoice",
  "unitFeatureDecision",
  "wildShapeEquipmentDisposition",
] as const;

export type BattleReducerRouteHole =
  (typeof BATTLE_REDUCER_ROUTE_HOLE_KINDS)[number];

export const BATTLE_REDUCER_ROUTE_FILL_KINDS = [
  "abilityCheck",
  "attackDamageDisposition",
  "attackRoll",
  "compelledBehaviorOptionChoice",
  "companionReappearanceInitiative",
  "concentrationSavingThrow",
  "conditionChoice",
  "damageTypeChoice",
  "deathSavingThrow",
  "grappleOutcome",
  "directionalPersistentAreaDirectionChoice",
  "hitPointHealingDistribution",
  "interruptDecision",
  "controlledVerticalSuspensionAltitudeChange",
  "controlledVerticalSuspensionInitialRise",
  "weaponAttackDamageEnhancementTargetItem",
  "movement",
  "objectDropResolution",
  "ongoingSpellTargetChoice",
  "readyDeclaration",
  "rolledDice",
  "targetingSaveInterdictionOutcome",
  "savingThrowOutcome",
  "selfTransformationModeChoice",
  "shoveOutcome",
  "turnConstraintSomaticSpellFailureOutcome",
  "spellTargetAllocation",
  "spellTargetList",
  "startTurnOccurrenceOrder",
  "statBlockRechargeRoll",
  "targetChoice",
  "temporaryHitPointChoice",
  "unitFeatureDecision",
  "wildShapeEquipmentDisposition",
] as const;

export type BattleReducerRouteFillKind =
  (typeof BATTLE_REDUCER_ROUTE_FILL_KINDS)[number];

export type BattleReducerRouteFill =
  | BattleReducerRouteFillKind
  | {
      readonly kind: "skillChoice";
      readonly skill: Skill;
    }
  | {
      readonly kind: "abilityChoice";
      readonly ability: Ability;
    }
  | {
      readonly kind: "targetAbilityChoices";
      readonly choices: {
        readonly primary: Ability;
        readonly secondary: Ability;
      };
    };

export type BattleReducerRouteEvent =
  | {
      readonly kind: "startBattle";
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "discoverBattleActs";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubject";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly fill: BattleReducerRouteFill;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubjectWithoutFill";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleInterrupt";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly fill: BattleReducerRouteFill;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    };

export type BattleReducerRouteEvents = readonly [
  BattleReducerRouteEvent,
  ...BattleReducerRouteEvent[],
];
