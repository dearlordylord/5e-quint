import type { Ability, Skill } from "@dnd/surface/surface/types";

export type BattleReducerRouteSubjectFamily =
  | "activeFormLifecycle"
  | "battleAction"
  | "concentrationTeardown"
  | "commandEffect"
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

export type BattleReducerRouteHole =
  | "abilityCheck"
  | "abilityChoice"
  | "attackDamageDisposition"
  | "attackRoll"
  | "commandOptionChoice"
  | "companionReappearanceInitiative"
  | "concentrationSavingThrow"
  | "conditionChoice"
  | "damageTypeChoice"
  | "deathSavingThrow"
  | "grappleOutcome"
  | "gustOfWindLineDirectionChoice"
  | "hitPointHealingDistribution"
  | "interruptDecision"
  | "levitateAltitudeChange"
  | "levitateInitialRise"
  | "movement"
  | "objectDropResolution"
  | "ongoingSpellTargetChoice"
  | "rolledDice"
  | "sanctuaryInterdictionOutcome"
  | "savingThrowOutcome"
  | "selfTransformationModeChoice"
  | "shoveOutcome"
  | "skillChoice"
  | "slowSomaticSpellFailureOutcome"
  | "spellcastingAbilityCheck"
  | "spellTargetAllocation"
  | "spellTargetList"
  | "statBlockRechargeRoll"
  | "targetAbilityChoices"
  | "targetChoice"
  | "unitFeatureDecision"
  | "wildShapeEquipmentDisposition";

export type BattleReducerRouteFillKind =
  | "abilityCheck"
  | "attackDamageDisposition"
  | "attackRoll"
  | "commandOptionChoice"
  | "companionReappearanceInitiative"
  | "concentrationSavingThrow"
  | "conditionChoice"
  | "damageTypeChoice"
  | "deathSavingThrow"
  | "grappleOutcome"
  | "gustOfWindLineDirectionChoice"
  | "hitPointHealingDistribution"
  | "interruptDecision"
  | "levitateAltitudeChange"
  | "levitateInitialRise"
  | "magicWeaponTargetItem"
  | "movement"
  | "objectDropResolution"
  | "ongoingSpellTargetChoice"
  | "rolledDice"
  | "sanctuaryInterdictionOutcome"
  | "savingThrowOutcome"
  | "selfTransformationModeChoice"
  | "shoveOutcome"
  | "slowSomaticSpellFailureOutcome"
  | "spellTargetAllocation"
  | "spellTargetList"
  | "statBlockRechargeRoll"
  | "targetChoice"
  | "unitFeatureDecision"
  | "wildShapeEquipmentDisposition";

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
