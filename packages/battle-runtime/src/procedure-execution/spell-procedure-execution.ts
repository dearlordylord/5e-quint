import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  AbilityModifier,
  AttackBonus,
  MovementFeet,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  DcSource,
  DiceExpr,
  Size,
  Skill,
} from "@dnd/surface/surface/types";
import type {
  BattleActiveEffectExecutionRef,
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleSpellActiveEffectTemplate,
  DirectConditionSpellActiveEffectTemplate,
  MarkedDamageRiderRetargetTiming,
  PersistentArmorSpellActiveEffect,
  SelfTransformationNaturalWeaponFacts,
  SpellCreatedHeldObjectActiveEffect,
  SpellCreatureSizeChangeActiveEffect,
  SpellLevitatedCreatureActiveEffect,
  SpellMarkedDamageRider,
  SpellObjectContactDamageActiveEffect,
  SpellTurnEndDamage,
  SpiritualWeaponActiveEffect,
} from "../active-effect/types.ts";
import type { BattleActiveEffectSource } from "../active-effect/source.ts";
import type {
  AbilityCheckRollModeSpellEffect,
  CantripSpellAttackSequenceTargeting,
  ConditionImmunityActiveEffectTemplate,
  CreatureTypeProtectionSpellTargeting,
  HealingSpellActionCost,
  HealingSpellTargeting,
  HeldLightHurlMechanicalFacts,
  MarkedDamageRiderCastAbilityCheckBehavior,
  PreparedSpellAttackSequenceTargeting,
  RollModifierSpellTargeting,
  ScalarBuffSpellEffect,
  ScalarBuffSpellTargeting,
  SpellAttackDamagePayload,
  SpellAttackDamageTargeting,
  SpellAttackMissDamage,
  SpellComponent,
  SpellFailedSaveConditionEffect,
  SpellFailedSavePostDamageRider,
  SpellObjectHitEffect,
  SpellPostDamageRider,
  SpellPostSaveAreaEffect,
  SpellSavingThrowRollModeRule,
  SpellTargetListTargeting,
} from "./spell-execution-vocabulary.ts";
import type { SpellRuleExecutionFacts } from "./spell-rule-facts.ts";
import type { BattleSpellEffectLevel } from "./spell-effect-level.ts";
import type {
  ArmorOfShadowsSpellAccess,
  ClassCantripSpellAccess,
  SpellAccessFreeCastInvocationResource,
  NoSpellInvocationResource,
  PreparedSpellAccess,
  RollModifierSpellSaveGate,
  SaveGatedConditionSpellTargeting,
  SaveGatedDamageSpellTargeting,
  SpellEffectSpellAccess,
  SpellSlotInvocationResource,
  SpellTargeting,
} from "./spell-invocation-vocabulary.ts";
import type { WeaponAttackOverrideSpellProcedureExecution } from "./weapon-attack-override.ts";

type SurfaceSkill = Skill;

export type SpellRuleExecutionFactsOwner = {
  readonly spellRuleFacts: SpellRuleExecutionFacts;
};

type SourcedBattleActiveEffect = Extract<
  BattleActiveEffect,
  BattleActiveEffectSource
>;
type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never;
type UniqueSourcedBattleActiveEffectKind = {
  readonly [Kind in SourcedBattleActiveEffect["kind"]]: IsUnion<
    Extract<SourcedBattleActiveEffect, { readonly kind: Kind }>
  > extends false
    ? Kind
    : never;
}[SourcedBattleActiveEffect["kind"]];
type SpellActiveEffectTemplate<
  Kind extends UniqueSourcedBattleActiveEffectKind,
> = BattleSpellActiveEffectTemplate<
  Extract<SourcedBattleActiveEffect, { readonly kind: Kind }>
>;
type PersistentArmorSpellActiveEffectTemplate =
  BattleSpellActiveEffectTemplate<PersistentArmorSpellActiveEffect>;

export type AbilityD20TestRollModeSaveGateSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly failedSaveDamagePenaltyEffect: SpellActiveEffectTemplate<"sourceDamageRollPenalty">;
    readonly failedSaveEffect: SpellActiveEffectTemplate<"abilityD20TestRollModeEndTurnSave">;
    readonly procedure: "abilityD20TestRollModeSaveGate";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly successEffect: SpellActiveEffectTemplate<"nextAttackRollBySelf">;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
  };

export type AfterHitDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly conditionalBonusDamage: {
      readonly targetCreatureTypes: readonly CreatureType[];
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "afterHitDamage";
    readonly resource:
      | SpellSlotInvocationResource
      | SpellAccessFreeCastInvocationResource;
  };

export type AfterHitDamageAndIlluminationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"shiningSmiteIllumination">;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "afterHitDamageAndIllumination";
    readonly resource: SpellSlotInvocationResource;
  };

export type AfterHitSaveGatedConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly dc: DcSource;
    readonly effect: SpellFailedSaveConditionEffect;
    readonly procedure: "afterHitSaveGatedCondition";
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type AfterHitTimedDamageAndSaveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"spellTurnStartDamageAndSave">;
    readonly immediateDamage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "afterHitTimedDamageAndSave";
    readonly resource: SpellSlotInvocationResource;
  };

export type AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "antimagicFieldOngoingSpellSuppression";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "selfOriginEmanation";
      readonly radiusFeet: MovementFeet;
    };
  };

export type AttackBurstSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
    readonly burst: {
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "primaryTargetOriginEmanation" }
      >;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly successDamage: "none";
    };
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "attackBurstSaveDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type BlurAttackRollDefenseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"blurred">;
    readonly procedure: "blurAttackRollDefense";
    readonly resource: SpellSlotInvocationResource;
  };

export type ChainedSpellAttackDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
    readonly damage: { readonly expr: DiceExpr };
    readonly damageTypeChoices: readonly DamageType[];
    readonly leapRangeFeet: MovementFeet;
    readonly procedure: "chainedSpellAttackDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type ChosenDamageResistanceSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly damageTypeChoices: readonly DamageType[];
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly procedure: "chosenDamageResistance";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "willing";
    };
  };

export type CloudkillAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "poison">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "cloudkillAreaHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type CommandSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly ability: "wis";
  readonly access: PreparedSpellAccess;
  readonly actionCost: "magicAction";
  readonly dc: DcSource;
  readonly procedure: "command";
  readonly resource: SpellSlotInvocationResource;
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: number;
  };
};

export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffects: readonly [
      ConditionImmunityActiveEffectTemplate,
      SpellActiveEffectTemplate<"turnStartTemporaryHitPoints">,
    ];
    readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type ConditionRemovalProtectionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly procedure: "conditionRemovalProtection";
    readonly protection: {
      readonly conditionSaveRollMode: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "conditionSavingThrowRollMode" }
        >
      >;
      readonly damageResistance: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "damageResistance" }>
      >;
    };
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type CounterspellSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly procedure: "counterspell";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly triggerComponents: readonly SpellComponent[];
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type CreatureSizeDecreaseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: Omit<
      SpellCreatureSizeChangeActiveEffect,
      "sourceProcedureRef" | "effectRef"
    >;
    readonly dc: DcSource;
    readonly procedure: "creatureSizeDecrease";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type CreatureSizeIncreaseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: Omit<
      SpellCreatureSizeChangeActiveEffect,
      "sourceProcedureRef" | "effectRef"
    >;
    readonly dc: DcSource;
    readonly procedure: "creatureSizeIncrease";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type CreatureTypeProtectionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"creatureTypeProtection">;
    readonly procedure: "creatureTypeProtection";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: CreatureTypeProtectionSpellTargeting;
  };

export type DamageReductionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly amount: { readonly dice: 1; readonly dieSize: 4 };
    readonly damageTypeChoices: readonly DamageType[];
    readonly expiresAt: BattleActiveEffectExpiration;
    readonly procedure: "damageReduction";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "willing";
    };
  };

export type DancingLightsCombinedCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly dimRadiusFeet: MovementFeet;
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly form: "combinedMediumForm";
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "dancingLightsCombinedCast";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly spacingFeet: MovementFeet;
  };

export type DancingLightsRepositionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffectRef: BattleActiveEffectExecutionRef;
    readonly sourceDancingLightsProcedureRef: BattleProcedureExecutionRef;
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "dancingLightsReposition";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly spacingFeet: MovementFeet;
  };

export type DancingLightsSeparateCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly dimRadiusFeet: MovementFeet;
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly form: "separateLights";
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "dancingLightsSeparateCast";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly spacingFeet: MovementFeet;
  };

export type DirectConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: DirectConditionSpellActiveEffectTemplate;
    readonly procedure: "directCondition";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type DirectConditionRemovalSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly conditionChoices: readonly [
      "blinded",
      "deafened",
      "paralyzed",
      "poisoned",
    ];
    readonly procedure: "directConditionRemoval";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type DirectHitPointRestorationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: HealingSpellActionCost;
    readonly healing: { readonly expr: DiceExpr };
    readonly procedure: "directHitPointRestoration";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: HealingSpellTargeting;
  };

export type DragonsBreathInitialSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: Omit<
      SpellActiveEffectTemplate<"dragonsBreath">,
      "damageType" | "spellSaveDc"
    >;
    readonly damageTypeChoices: readonly DamageType[];
    readonly procedure: "dragonsBreathInitial";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: 1;
    };
  };

export type ExpeditiousRetreatDashSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"spellDashBonusAction">;
    readonly procedure: "expeditiousRetreatDash";
    readonly resource: SpellSlotInvocationResource;
  };

export type FeatherFallMitigationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly activeEffect: SpellActiveEffectTemplate<"featherFallMitigation">;
    readonly procedure: "featherFallMitigation";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
  };

export type FlamingSphereSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "fire">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "flamingSphere";
    readonly ramMaxMoveFeet: MovementFeet;
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphereDiameter";
      readonly diameterFeet: MovementFeet;
    };
  };

export type FogCloudObscurementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "fogCloudObscurement";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type GreaseGroundHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "greaseGroundHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export type GustOfWindLineSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "str";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly movementCost: {
      readonly multiplier: 2;
      readonly appliesTo: "towardSource";
    };
    readonly procedure: "gustOfWindLine";
    readonly pushDistanceFeet: MovementFeet;
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "selfOriginLine";
      readonly lengthFeet: MovementFeet;
      readonly widthFeet: MovementFeet;
    };
  };

export type HastePositiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffects: {
      readonly speedRatio: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "speedRatio" }>
      >;
      readonly armorClassBonus: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "spellArmorClassBonus" }>
      >;
      readonly dexteritySavingThrowAdvantage: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "savingThrowRollMode" }>
      >;
      readonly grantedActionResource: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "spellGrantedActionResource" }
        >
      >;
      readonly spellEndTargetState: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "spellEndTargetState" }>
      >;
    };
    readonly procedure: "hastePositive";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting & {
      readonly maxTargets: 1;
      readonly requiredTargetDisposition: "willing";
    };
  };

export type HeldLightSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: ClassCantripSpellAccess;
  readonly actionCost: "bonusAction";
  readonly expiresAt: BattleActiveEffectExpiration;
  readonly light: {
    readonly brightRadiusFeet: MovementFeet;
    readonly dimAdditionalFeet: MovementFeet;
  };
  readonly hurl: HeldLightHurlMechanicalFacts;
  readonly procedure: "heldLight";
  readonly resource: NoSpellInvocationResource;
};

export type HeldLightHurlSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "heldLightHurl";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly sourceEffectRef: BattleActiveEffectExecutionRef;
    readonly sourceHeldLightProcedureRef: BattleProcedureExecutionRef;
    readonly targeting: { readonly kind: "singleCreatureOrObject" };
  };

export type HideousLaughterSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly procedure: "hideousLaughter";
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
  };

export type HypnoticPatternSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "hypnoticPattern";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export type InsectPlagueAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "insectPlagueAreaHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type JumpMovementReplacementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"jumpMovementReplacement">;
    readonly procedure: "jumpMovementReplacement";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
      readonly requiredTargetDisposition: "willing";
    };
  };

export type LevitatedCreatureSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: Omit<
      Omit<SpellLevitatedCreatureActiveEffect, "altitudeFeet">,
      "sourceProcedureRef" | "effectRef"
    >;
    readonly dc: DcSource;
    readonly maxInitialRiseFeet: MovementFeet;
    readonly procedure: "levitatedCreature";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type MagicalDarknessPointOriginSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "magicalDarknessPointOrigin";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type MagicWeaponEnhancementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly bonus: 1 | 2 | 3;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "magicWeaponEnhancement";
    readonly resource: SpellSlotInvocationResource;
  };

export type MakeStableSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: ClassCantripSpellAccess;
  readonly actionCost: "magicAction";
  readonly procedure: "makeStable";
  readonly rangeFeet: MovementFeet;
  readonly resource: NoSpellInvocationResource;
};

export type MarkedDamageRiderCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
    readonly access: PreparedSpellAccess;
    readonly action: "cast";
    readonly actionCost: "bonusAction";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly expiresAt: BattleActiveEffectExpiration;
    readonly procedure: "markedDamageRider";
    readonly rangeFeet: MovementFeet;
    readonly resource:
      | SpellSlotInvocationResource
      | SpellAccessFreeCastInvocationResource;
    readonly retargetTiming: MarkedDamageRiderRetargetTiming;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type MarkedDamageRiderTransferSpellProcedureExecution = {
  readonly action: "transfer";
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "markedDamageRider";
};

export type MirrorImageHitInterceptionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"mirrorImageDuplicates">;
    readonly procedure: "mirrorImageHitInterception";
    readonly resource: SpellSlotInvocationResource;
  };

export type MoonbeamSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly ability: "con";
  readonly access: PreparedSpellAccess;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: Extract<DamageType, "radiant">;
  };
  readonly dc: DcSource;
  readonly durationTicks: ElapsedTimeTicks;
  readonly procedure: "moonbeam";
  readonly rangeFeet: MovementFeet;
  readonly repositionMaxMoveFeet: MovementFeet;
  readonly resource: SpellSlotInvocationResource;
  readonly targeting: {
    readonly kind: "pointOriginCylinder";
    readonly radiusFeet: MovementFeet;
    readonly heightFeet: MovementFeet;
  };
};

export type ObjectContactDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "objectContactDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: { readonly kind: "singleManufacturedMetalObject" };
  };

export type ObjectContactDamageRepeatSpellProcedureExecution = {
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "objectContactDamageRepeat";
};

export type ObjectLightClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly expiresAt: BattleActiveEffectExpiration;
    readonly light: {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
    };
    readonly procedure: "objectLight";
    readonly resource: NoSpellInvocationResource;
    readonly targeting: {
      readonly kind: "singleObject";
      readonly object: {
        readonly kind: "lightCantripObject";
        readonly maxSize: Size;
      };
    };
  };

export type ObjectLightPreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly expiresAt: BattleActiveEffectExpiration;
    readonly light: {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
    };
    readonly procedure: "objectLight";
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "singleObject";
      readonly object: { readonly kind: "touchedObject" };
    };
  };

export type OngoingSpellEndSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly procedure: "ongoingSpellEnd";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
  };

export type PersistentArmorEffectPreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly activeEffect: PersistentArmorSpellActiveEffectTemplate;
    readonly procedure: "persistentArmorEffect";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
  };

export type PersistentArmorEffectArmorOfShadowsSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ArmorOfShadowsSpellAccess;
    readonly activeEffect: PersistentArmorSpellActiveEffectTemplate;
    readonly procedure: "persistentArmorEffect";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
  };

export type RepeatedDamageAllocationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "repeatedDamageAllocation";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "repeatedEffectTargetAllocation";
      readonly repeatedEffectCount: number;
    };
  };

export type RollModifierWithoutAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoices: null;
    readonly access: PreparedSpellAccess | ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly effect: SpellActiveEffectTemplate<"d20RollModifier">;
    readonly procedure: "rollModifier";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource | NoSpellInvocationResource;
    readonly saveGate: RollModifierSpellSaveGate | null;
    readonly skillChoices: readonly SurfaceSkill[] | null;
    readonly targeting: RollModifierSpellTargeting;
  };

export type RollModifierWithAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoiceApplication: "single" | "perTarget";
    readonly abilityChoices: readonly Ability[];
    readonly access: PreparedSpellAccess | ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly effect: AbilityCheckRollModeSpellEffect;
    readonly procedure: "rollModifier";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource | NoSpellInvocationResource;
    readonly saveGate: RollModifierSpellSaveGate | null;
    readonly skillChoices: null;
    readonly targeting: RollModifierSpellTargeting;
  };

export type SanctuaryTargetingInterdictionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"sanctuaryWard">;
    readonly procedure: "sanctuaryTargetingInterdiction";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: 1;
    };
  };

export type SaveGatedAttackRollAdvantageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly effect: SpellActiveEffectTemplate<"faerieFireOutline">;
    readonly procedure: "saveGatedAttackRollAdvantage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargeting;
  };

export type SaveGatedConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly effect: SpellFailedSaveConditionEffect;
    readonly procedure: "saveGatedCondition";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
    readonly targetCreatureTypes: readonly CreatureType[] | null;
    readonly targeting: SaveGatedConditionSpellTargeting;
  };

export type SaveGatedConditionImmunitySpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffects: readonly [
      ConditionImmunityActiveEffectTemplate,
      ConditionImmunityActiveEffectTemplate,
    ];
    readonly dc: DcSource;
    readonly procedure: "saveGatedConditionImmunity";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targetCreatureTypes: readonly CreatureType[];
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type SaveGatedDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: ClassCantripSpellAccess;
    readonly additionalDamageComponents: readonly {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    }[];
    readonly castingTime:
      | { readonly kind: "action" }
      | { readonly kind: "reaction" };
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly dc: DcSource;
    readonly failedSaveAbilityChoices: readonly Ability[] | null;
    readonly failedSaveConditionEffects: readonly SpellFailedSaveConditionEffect[];
    readonly failedSavePostDamageRiders: readonly SpellFailedSavePostDamageRider[];
    readonly postSaveAreaEffect?: SpellPostSaveAreaEffect | undefined;
    readonly procedure: "saveGatedDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
    readonly successDamage: "none" | "half";
    readonly targeting: SaveGatedDamageSpellTargeting;
  };

export type SaveGatedDamagePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly additionalDamageComponents: readonly {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    }[];
    readonly castingTime:
      | { readonly kind: "action" }
      | { readonly kind: "reaction" };
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly dc: DcSource;
    readonly failedSaveAbilityChoices: readonly Ability[] | null;
    readonly failedSaveConditionEffects: readonly SpellFailedSaveConditionEffect[];
    readonly failedSavePostDamageRiders: readonly SpellFailedSavePostDamageRider[];
    readonly postSaveAreaEffect?: SpellPostSaveAreaEffect | undefined;
    readonly procedure: "saveGatedDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
    readonly successDamage: "none" | "half";
    readonly targeting: SaveGatedDamageSpellTargeting;
  };

export type ScalarBuffSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: PreparedSpellAccess;
  readonly actionCost: HealingSpellActionCost;
  readonly effect: ScalarBuffSpellEffect;
  readonly procedure: "scalarBuff";
  readonly rangeFeet: MovementFeet;
  readonly resource: SpellSlotInvocationResource;
  readonly targeting: ScalarBuffSpellTargeting;
};

export type SeeInvisibleObserverSightSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"seeInvisibleAndEthereal">;
    readonly procedure: "seeInvisibleObserverSight";
    readonly resource: SpellSlotInvocationResource;
  };

export type SelfTeleportSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly maxDistanceFeet: MovementFeet;
    readonly procedure: "selfTeleport";
    readonly resource: SpellSlotInvocationResource;
  };

export type SelfTransformationModeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly modeChoices: readonly [
      "aquaticAdaptation" | "changeAppearance" | "naturalWeapons",
      ...("aquaticAdaptation" | "changeAppearance" | "naturalWeapons")[],
    ];
    readonly naturalWeaponFacts: SelfTransformationNaturalWeaponFacts;
    readonly procedure: "selfTransformationMode";
    readonly resource: SpellSlotInvocationResource;
  };

export type ShieldReactionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly armorClassBonus: number;
    readonly negatesRepeatedDamageAllocation: true;
    readonly procedure: "shieldReaction";
    readonly resource: SpellSlotInvocationResource;
  };

export type SleepTargetAdmissionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly procedure: "sleepTargetAdmission";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type SleetStormAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "sleetStormAreaHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCylinder";
      readonly radiusFeet: MovementFeet;
      readonly heightFeet: MovementFeet;
    };
  };

export type SlowActivePenaltiesSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly maxTargets: 6;
    readonly procedure: "slowActivePenalties";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export type SpellAttackDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
    readonly damage: SpellAttackDamagePayload;
    readonly laterDamage: SpellTurnEndDamage | null;
    readonly missDamage: SpellAttackMissDamage;
    readonly objectHitEffect: SpellObjectHitEffect;
    readonly postDamageRiders: readonly SpellPostDamageRider[];
    readonly procedure: "spellAttackDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly targeting: SpellAttackDamageTargeting;
  };

export type SpellAttackDamagePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
    readonly damage: SpellAttackDamagePayload;
    readonly laterDamage: SpellTurnEndDamage | null;
    readonly missDamage: SpellAttackMissDamage;
    readonly objectHitEffect: SpellObjectHitEffect;
    readonly postDamageRiders: readonly SpellPostDamageRider[];
    readonly procedure: "spellAttackDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellAttackDamageTargeting;
  };

export type SpellAttackSequenceClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "spellAttackSequence";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly targeting: CantripSpellAttackSequenceTargeting;
  };

export type SpellAttackSequencePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "spellAttackSequence";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: PreparedSpellAttackSequenceTargeting;
  };

export type SpellCreatedHeldObjectSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: Omit<
      SpellCreatedHeldObjectActiveEffect,
      "sourceProcedureRef" | "effectRef"
    > & { readonly objectState: { readonly kind: "held" } };
    readonly procedure: "spellCreatedHeldObject";
    readonly resource: SpellSlotInvocationResource;
  };

export type SpellCreatedHeldObjectAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly sourceEffectRef: BattleActiveEffectExecutionRef;
    readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "melee_spell_attack";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "spellCreatedHeldObjectAttack";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type SpellCreatedHeldObjectReEvokeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly actionCost: "bonusAction";
    readonly sourceEffectRef: BattleActiveEffectExecutionRef;
    readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    readonly procedure: "spellCreatedHeldObjectReEvoke";
    readonly resource: NoSpellInvocationResource;
  };

export type SpellHostedWeaponAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly attackBonus: AttackBonus;
    readonly bonusDamage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    } | null;
    readonly componentWeaponObjectId: BattleObjectId;
    readonly damageTypeChoices: readonly DamageType[];
    readonly procedure: "spellHostedWeaponAttack";
    readonly resource: NoSpellInvocationResource;
    readonly spellcastingAbilityModifier: AbilityModifier;
  };

export type SpikeGrowthMovementHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
    readonly damagePerFeet: MovementFeet;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "spikeGrowthMovementHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type SpiritualWeaponAttackProxySpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly attackBonus: AttackBonus;
    readonly attackKind: "melee_spell_attack";
    readonly damage: {
      readonly kind: "fixedSpellAttackDamage";
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "force">;
    };
    readonly durationTicks: ElapsedTimeTicks;
    readonly forceReachFeet: MovementFeet;
    readonly procedure: "spiritualWeaponAttackProxy";
    readonly rangeFeet: MovementFeet;
    readonly repeatMoveMaxFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type SpiritualWeaponRepeatAttackSpellProcedureExecution = {
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "spiritualWeaponRepeatAttack";
};

export type ThaumaturgyBoomingVoiceSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ClassCantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"thaumaturgyBoomingVoice">;
    readonly procedure: "thaumaturgyBoomingVoice";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
  };

export type WardingBondSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"wardingBond">;
    readonly connectionRangeFeet: MovementFeet;
    readonly procedure: "wardingBond";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
  };

export type WeaponDamageRiderSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"spellWeaponDamageRider">;
    readonly procedure: "weaponDamageRider";
    readonly resource: SpellSlotInvocationResource;
  };

export type WebRestraintHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "webRestraintHazard";
    readonly rangeFeet: MovementFeet;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export interface SpellProcedureExecutionByProcedure {
  readonly abilityD20TestRollModeSaveGate: AbilityD20TestRollModeSaveGateSpellProcedureExecution;
  readonly afterHitDamage: AfterHitDamageSpellProcedureExecution;
  readonly afterHitDamageAndIllumination: AfterHitDamageAndIlluminationSpellProcedureExecution;
  readonly afterHitSaveGatedCondition: AfterHitSaveGatedConditionSpellProcedureExecution;
  readonly afterHitTimedDamageAndSave: AfterHitTimedDamageAndSaveSpellProcedureExecution;
  readonly antimagicFieldOngoingSpellSuppression: AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution;
  readonly attackBurstSaveDamage: AttackBurstSaveDamageSpellProcedureExecution;
  readonly blurAttackRollDefense: BlurAttackRollDefenseSpellProcedureExecution;
  readonly chainedSpellAttackDamage: ChainedSpellAttackDamageSpellProcedureExecution;
  readonly chosenDamageResistance: ChosenDamageResistanceSpellProcedureExecution;
  readonly cloudkillAreaHazard: CloudkillAreaHazardSpellProcedureExecution;
  readonly command: CommandSpellProcedureExecution;
  readonly conditionImmunityAndTurnStartTemporaryHitPoints: ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution;
  readonly conditionRemovalProtection: ConditionRemovalProtectionSpellProcedureExecution;
  readonly counterspell: CounterspellSpellProcedureExecution;
  readonly creatureSizeDecrease: CreatureSizeDecreaseSpellProcedureExecution;
  readonly creatureSizeIncrease: CreatureSizeIncreaseSpellProcedureExecution;
  readonly creatureTypeProtection: CreatureTypeProtectionSpellProcedureExecution;
  readonly damageReduction: DamageReductionSpellProcedureExecution;
  readonly dancingLightsCombinedCast: DancingLightsCombinedCastSpellProcedureExecution;
  readonly dancingLightsReposition: DancingLightsRepositionSpellProcedureExecution;
  readonly dancingLightsSeparateCast: DancingLightsSeparateCastSpellProcedureExecution;
  readonly directCondition: DirectConditionSpellProcedureExecution;
  readonly directConditionRemoval: DirectConditionRemovalSpellProcedureExecution;
  readonly directHitPointRestoration: DirectHitPointRestorationSpellProcedureExecution;
  readonly dragonsBreathInitial: DragonsBreathInitialSpellProcedureExecution;
  readonly expeditiousRetreatDash: ExpeditiousRetreatDashSpellProcedureExecution;
  readonly featherFallMitigation: FeatherFallMitigationSpellProcedureExecution;
  readonly flamingSphere: FlamingSphereSpellProcedureExecution;
  readonly fogCloudObscurement: FogCloudObscurementSpellProcedureExecution;
  readonly greaseGroundHazard: GreaseGroundHazardSpellProcedureExecution;
  readonly gustOfWindLine: GustOfWindLineSpellProcedureExecution;
  readonly hastePositive: HastePositiveSpellProcedureExecution;
  readonly heldLight: HeldLightSpellProcedureExecution;
  readonly heldLightHurl: HeldLightHurlSpellProcedureExecution;
  readonly hideousLaughter: HideousLaughterSpellProcedureExecution;
  readonly hypnoticPattern: HypnoticPatternSpellProcedureExecution;
  readonly insectPlagueAreaHazard: InsectPlagueAreaHazardSpellProcedureExecution;
  readonly jumpMovementReplacement: JumpMovementReplacementSpellProcedureExecution;
  readonly levitatedCreature: LevitatedCreatureSpellProcedureExecution;
  readonly magicalDarknessPointOrigin: MagicalDarknessPointOriginSpellProcedureExecution;
  readonly magicWeaponEnhancement: MagicWeaponEnhancementSpellProcedureExecution;
  readonly makeStable: MakeStableSpellProcedureExecution;
  readonly markedDamageRider:
    | MarkedDamageRiderCastSpellProcedureExecution
    | MarkedDamageRiderTransferSpellProcedureExecution;
  readonly mirrorImageHitInterception: MirrorImageHitInterceptionSpellProcedureExecution;
  readonly moonbeam: MoonbeamSpellProcedureExecution;
  readonly objectContactDamage: ObjectContactDamageSpellProcedureExecution;
  readonly objectContactDamageRepeat: ObjectContactDamageRepeatSpellProcedureExecution;
  readonly objectLight:
    | ObjectLightClassCantripSpellProcedureExecution
    | ObjectLightPreparedSpellProcedureExecution;
  readonly ongoingSpellEnd: OngoingSpellEndSpellProcedureExecution;
  readonly persistentArmorEffect:
    | PersistentArmorEffectPreparedSpellProcedureExecution
    | PersistentArmorEffectArmorOfShadowsSpellProcedureExecution;
  readonly repeatedDamageAllocation: RepeatedDamageAllocationSpellProcedureExecution;
  readonly rollModifier:
    | RollModifierWithoutAbilityChoiceApplicationSpellProcedureExecution
    | RollModifierWithAbilityChoiceApplicationSpellProcedureExecution;
  readonly sanctuaryTargetingInterdiction: SanctuaryTargetingInterdictionSpellProcedureExecution;
  readonly saveGatedAttackRollAdvantage: SaveGatedAttackRollAdvantageSpellProcedureExecution;
  readonly saveGatedCondition: SaveGatedConditionSpellProcedureExecution;
  readonly saveGatedConditionImmunity: SaveGatedConditionImmunitySpellProcedureExecution;
  readonly saveGatedDamage:
    | SaveGatedDamageClassCantripSpellProcedureExecution
    | SaveGatedDamagePreparedSpellProcedureExecution;
  readonly scalarBuff: ScalarBuffSpellProcedureExecution;
  readonly seeInvisibleObserverSight: SeeInvisibleObserverSightSpellProcedureExecution;
  readonly selfTeleport: SelfTeleportSpellProcedureExecution;
  readonly selfTransformationMode: SelfTransformationModeSpellProcedureExecution;
  readonly shieldReaction: ShieldReactionSpellProcedureExecution;
  readonly sleepTargetAdmission: SleepTargetAdmissionSpellProcedureExecution;
  readonly sleetStormAreaHazard: SleetStormAreaHazardSpellProcedureExecution;
  readonly slowActivePenalties: SlowActivePenaltiesSpellProcedureExecution;
  readonly spellAttackDamage:
    | SpellAttackDamageClassCantripSpellProcedureExecution
    | SpellAttackDamagePreparedSpellProcedureExecution;
  readonly spellAttackSequence:
    | SpellAttackSequenceClassCantripSpellProcedureExecution
    | SpellAttackSequencePreparedSpellProcedureExecution;
  readonly spellCreatedHeldObject: SpellCreatedHeldObjectSpellProcedureExecution;
  readonly spellCreatedHeldObjectAttack: SpellCreatedHeldObjectAttackSpellProcedureExecution;
  readonly spellCreatedHeldObjectReEvoke: SpellCreatedHeldObjectReEvokeSpellProcedureExecution;
  readonly spellHostedWeaponAttack: SpellHostedWeaponAttackSpellProcedureExecution;
  readonly spikeGrowthMovementHazard: SpikeGrowthMovementHazardSpellProcedureExecution;
  readonly spiritualWeaponAttackProxy: SpiritualWeaponAttackProxySpellProcedureExecution;
  readonly spiritualWeaponRepeatAttack: SpiritualWeaponRepeatAttackSpellProcedureExecution;
  readonly thaumaturgyBoomingVoice: ThaumaturgyBoomingVoiceSpellProcedureExecution;
  readonly wardingBond: WardingBondSpellProcedureExecution;
  readonly weaponAttackOverride: WeaponAttackOverrideSpellProcedureExecution;
  readonly weaponDamageRider: WeaponDamageRiderSpellProcedureExecution;
  readonly webRestraintHazard: WebRestraintHazardSpellProcedureExecution;
}

type DynamicActiveEffectSpellProcedureExecution =
  | MarkedDamageRiderTransferSpellProcedureExecution
  | ObjectContactDamageRepeatSpellProcedureExecution
  | SpiritualWeaponRepeatAttackSpellProcedureExecution;

export type MarkedDamageRiderTransferLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly resource: NoSpellInvocationResource;
    readonly procedure: "markedDamageRider";
    readonly action: "transfer";
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellMarkedDamageRider;
    readonly rangeFeet: MovementFeet;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type ObjectContactDamageRepeatLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly resource: NoSpellInvocationResource;
    readonly procedure: "objectContactDamageRepeat";
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellObjectContactDamageActiveEffect;
  };

export type SpiritualWeaponRepeatAttackLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly resource: NoSpellInvocationResource;
    readonly procedure: "spiritualWeaponRepeatAttack";
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpiritualWeaponActiveEffect;
    readonly targeting: { readonly kind: "singleCombatant" };
    readonly damage: {
      readonly kind: "fixedSpellAttackDamage";
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly attackKind: "melee_spell_attack";
    readonly attackBonus: AttackBonus;
    readonly forceReachFeet: MovementFeet;
    readonly repeatMoveMaxFeet: MovementFeet;
  };

type LiveDynamicSpellProcedureExecution<
  Execution extends DynamicActiveEffectSpellProcedureExecution,
> = Execution extends MarkedDamageRiderTransferSpellProcedureExecution
  ? MarkedDamageRiderTransferLiveSpellProcedureExecution
  : Execution extends ObjectContactDamageRepeatSpellProcedureExecution
    ? ObjectContactDamageRepeatLiveSpellProcedureExecution
    : Execution extends SpiritualWeaponRepeatAttackSpellProcedureExecution
      ? SpiritualWeaponRepeatAttackLiveSpellProcedureExecution
      : never;
export type SpellProcedureKey = keyof SpellProcedureExecutionByProcedure;
type AnySpellProcedureExecution =
  SpellProcedureExecutionByProcedure[SpellProcedureKey];
type SpellProcedureInput<P extends SpellProcedureKey = SpellProcedureKey> =
  | Extract<AnySpellProcedureExecution, { readonly procedure: P }>
  | { readonly procedure: P; readonly access: unknown };
type SpellProcedureExecutionForInput<Input extends SpellProcedureInput> =
  SpellProcedureExecutionByProcedure[Input["procedure"]] extends infer Execution
    ? Execution extends { readonly access: infer ExecutionAccess }
      ? Input extends { readonly access: infer InputAccess }
        ? InputAccess extends ExecutionAccess
          ? Execution
          : never
        : Execution
      : Execution
    : never;
export type SpellProcedureExecution<
  Input extends SpellProcedureInput = AnySpellProcedureExecution,
> = Input extends SpellProcedureInput
  ? SpellProcedureExecutionForInput<Input>
  : never;
export type SpellExecutableExecutionOf<Input extends SpellProcedureInput> =
  Input extends { readonly spellRuleFacts: SpellRuleExecutionFacts }
    ? Input extends DynamicActiveEffectSpellProcedureExecution
      ? LiveDynamicSpellProcedureExecution<Input>
      : Input
    : SpellProcedureExecution<Input> extends infer Execution
      ? Execution extends DynamicActiveEffectSpellProcedureExecution
        ? LiveDynamicSpellProcedureExecution<Execution>
        : Execution
      : never;
export type RuntimeSpellProcedureExecution =
  SpellExecutableExecutionOf<SpellProcedureExecution>;
export type BattleSpellProcedureExecution<
  Input extends SpellProcedureInput = SpellProcedureExecution,
> = SpellExecutableExecutionOf<Input> & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};
