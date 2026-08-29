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
  BattleEffectExecutionRef,
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
  ControlledVerticalSuspensionActiveEffect,
  SpellMarkedDamageRider,
  SpellObjectContactDamageActiveEffect,
  SpellTurnEndDamage,
  SpatialMeleeSpellAttackProxyActiveEffect,
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
  CantripSpellAccess,
  LeveledSpellInvocationResource,
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
import { Schema } from "effect";

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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly activeEffect: SpellActiveEffectTemplate<"afterHitDamageAndIllumination">;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "afterHitDamageAndIllumination";
    readonly resource: LeveledSpellInvocationResource;
  };

export type AfterHitSaveGatedConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly dc: DcSource;
    readonly effect: SpellFailedSaveConditionEffect;
    readonly procedure: "afterHitSaveGatedCondition";
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
  };

export type MagicSuppressionEmanationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "magicSuppressionEmanation";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type PerceptionGatedAttackRollDefenseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"perceptionGatedAttackRollDefense">;
    readonly procedure: "perceptionGatedAttackRollDefense";
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "willing";
    };
  };

export type SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "poison">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "sourceTurnTranslation";
      readonly distanceFeet: MovementFeet;
      readonly direction: "awayFromSource";
      readonly movedAreaOperation: "saveDamage";
      readonly environmentalEnd: "strongWind";
    };
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type CompelledNextTurnBehaviorSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly procedure: "compelledNextTurnBehavior";
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type SpellCastInterruptionReactionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly procedure: "spellCastInterruptionReaction";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type CreatureTypeProtectionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"creatureTypeProtection">;
    readonly procedure: "creatureTypeProtection";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: CreatureTypeProtectionSpellTargeting;
  };

export type DamageReductionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
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

export type CombinedMovableLightManifestationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly dimRadiusFeet: MovementFeet;
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly form: "combinedMediumForm";
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly spacingFeet: MovementFeet;
  };

export type RepositionMovableLightManifestationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffectRef: BattleEffectExecutionRef;
    readonly sourceManifestationProcedureRef: BattleProcedureExecutionRef;
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "movableLightManifestation";
    readonly operation: "reposition";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly spacingFeet: MovementFeet;
  };

export type SeparateMovableLightManifestationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly dimRadiusFeet: MovementFeet;
    readonly expiresAt: {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    } & { readonly durationTicks: ElapsedTimeTicks };
    readonly form: "separateLights";
    readonly maxMoveFeet: MovementFeet;
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type DirectHitPointRestorationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: HealingSpellActionCost;
    readonly healing: { readonly expr: DiceExpr };
    readonly procedure: "directHitPointRestoration";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: HealingSpellTargeting;
  };

export type GrantedAreaSaveDamageActionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: Omit<
      SpellActiveEffectTemplate<"grantedAreaSaveDamageAction">,
      "damageType" | "spellSaveDc"
    >;
    readonly damageTypeChoices: readonly DamageType[];
    readonly procedure: "grantedAreaSaveDamageAction";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: 1;
    };
  };

export type GrantedAlternateActionCostSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"spellDashBonusAction">;
    readonly procedure: "grantedAlternateActionCost";
    readonly resource: LeveledSpellInvocationResource;
  };

export type FallingCreatureMitigationReactionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly activeEffect: SpellActiveEffectTemplate<"fallingCreatureMitigationReaction">;
    readonly procedure: "fallingCreatureMitigationReaction";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
  };

export type CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "fire">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "bonusAction";
      readonly movedAreaOperation: "saveDamage";
      readonly collisionDisposition: "stopAndAffectAdjacent";
    };
    readonly ramMaxMoveFeet: MovementFeet;
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphereDiameter";
      readonly diameterFeet: MovementFeet;
    };
  };

export type PersistentAreaTraitSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaTrait";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type PersistentAreaSaveConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveCondition";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginGroundSquare";
      readonly sideFeet: MovementFeet;
    };
  };

export type DirectionalPersistentAreaSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "str";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly movementCost: {
      readonly multiplier: 2;
      readonly appliesTo: "towardSource";
    };
    readonly procedure: "directionalPersistentArea";
    readonly pushDistanceFeet: MovementFeet;
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "selfOriginLine";
      readonly lengthFeet: MovementFeet;
      readonly widthFeet: MovementFeet;
    };
  };

export type CompositeTargetBuffWithAftermathSpellProcedureExecution =
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
    readonly procedure: "compositeTargetBuffWithAftermath";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting & {
      readonly maxTargets: 1;
      readonly requiredTargetDisposition: "willing";
    };
  };

export type HeldLightSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: CantripSpellAccess;
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
    readonly access: CantripSpellAccess;
    readonly attackBonus: AttackBonus;
    readonly attackKind: "ranged_spell_attack";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly procedure: "heldLightHurl";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly sourceEffectRef: BattleEffectExecutionRef;
    readonly sourceHeldLightProcedureRef: BattleProcedureExecutionRef;
    readonly targeting: { readonly kind: "singleCreatureOrObject" };
  };

export type SaveGatedConditionWithRepeatSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly procedure: "saveGatedConditionWithRepeat";
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
  };

export type SaveGatedAreaControlSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "saveGatedAreaControl";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export type StationaryPersistentAreaSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "stationary" };
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type FixedCostMovementReplacementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"fixedCostMovementReplacement">;
    readonly procedure: "fixedCostMovementReplacement";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
      readonly requiredTargetDisposition: "willing";
    };
  };

export type ControlledVerticalSuspensionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: Omit<
      Omit<ControlledVerticalSuspensionActiveEffect, "altitudeFeet">,
      "sourceProcedureRef" | "effectRef"
    >;
    readonly dc: DcSource;
    readonly maxInitialRiseFeet: MovementFeet;
    readonly procedure: "controlledVerticalSuspension";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellTargetListTargeting;
  };

export type MagicalDarknessPointOriginSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "magicalDarknessPointOrigin";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type WeaponAttackDamageEnhancementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly bonus: 1 | 2 | 3;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "weaponAttackDamageEnhancement";
    readonly resource: LeveledSpellInvocationResource;
  };

export type MakeStableSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: CantripSpellAccess;
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
  readonly activeEffectRef: BattleEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "markedDamageRider";
};

export type DuplicateHitInterceptionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"duplicateHitInterception">;
    readonly procedure: "duplicateHitInterception";
    readonly resource: LeveledSpellInvocationResource;
  };

export type DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "con";
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "radiant">;
    };
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "magicAction";
      readonly movedAreaOperation: "saveDamage";
      readonly collisionDisposition: "ignoreObstacles";
    };
    readonly rangeFeet: MovementFeet;
    readonly repositionMaxMoveFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: { readonly kind: "singleManufacturedMetalObject" };
  };

export type ObjectContactDamageRepeatSpellProcedureExecution = {
  readonly activeEffectRef: BattleEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "objectContactDamageRepeat";
};

export type ObjectLightClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
  };

export type PersistentArmorEffectPreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly activeEffect: PersistentArmorSpellActiveEffectTemplate;
    readonly procedure: "persistentArmorEffect";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "repeatedEffectTargetAllocation";
      readonly repeatedEffectCount: number;
    };
  };

export type RollModifierWithoutAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoices: null;
    readonly access: PreparedSpellAccess | CantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly effect: SpellActiveEffectTemplate<"d20RollModifier">;
    readonly procedure: "rollModifier";
    readonly rangeFeet: MovementFeet;
    readonly resource:
      | LeveledSpellInvocationResource
      | NoSpellInvocationResource;
    readonly saveGate: RollModifierSpellSaveGate | null;
    readonly skillChoices: readonly SurfaceSkill[] | null;
    readonly targeting: RollModifierSpellTargeting;
  };

export type RollModifierWithAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoiceApplication: "single" | "perTarget";
    readonly abilityChoices: readonly Ability[];
    readonly access: PreparedSpellAccess | CantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly effect: AbilityCheckRollModeSpellEffect;
    readonly procedure: "rollModifier";
    readonly rangeFeet: MovementFeet;
    readonly resource:
      | LeveledSpellInvocationResource
      | NoSpellInvocationResource;
    readonly saveGate: RollModifierSpellSaveGate | null;
    readonly skillChoices: null;
    readonly targeting: RollModifierSpellTargeting;
  };

export type TargetingSaveInterdictionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"targetingSaveInterdiction">;
    readonly procedure: "targetingSaveInterdiction";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly effect: SpellActiveEffectTemplate<"saveGatedTargetProjection">;
    readonly procedure: "saveGatedAttackRollAdvantage";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targetCreatureTypes: readonly CreatureType[];
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type SaveGatedDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: Ability;
    readonly access: CantripSpellAccess;
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
    readonly resource: LeveledSpellInvocationResource;
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
  readonly resource: LeveledSpellInvocationResource;
  readonly targeting: ScalarBuffSpellTargeting;
};

export type SeeInvisibleObserverSightSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"seeInvisibleAndEthereal">;
    readonly procedure: "seeInvisibleObserverSight";
    readonly resource: LeveledSpellInvocationResource;
  };

export type SelfTeleportSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly maxDistanceFeet: MovementFeet;
    readonly procedure: "selfTeleport";
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
  };

export type TriggeredArmorDefenseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly armorClassBonus: number;
    readonly negatesRepeatedDamageAllocation: true;
    readonly procedure: "triggeredArmorDefense";
    readonly resource: LeveledSpellInvocationResource;
  };

export const StagedSaveConditionAutomaticSuccessPredicatesSchema = Schema.Tuple(
  [
    Schema.Struct({ kind: Schema.Literal("doesNotSleep") }),
    Schema.Struct({
      kind: Schema.Literal("conditionImmunity"),
      condition: Schema.Literal("exhaustion"),
    }),
  ],
);
export type StagedSaveConditionAutomaticSuccessPredicates =
  typeof StagedSaveConditionAutomaticSuccessPredicatesSchema.Type;

export const StagedSaveConditionEscapeActionSchema = Schema.Struct({
  kind: Schema.Literal("endCurrentEffect"),
  actor: Schema.Literal("anotherCreature"),
  cost: Schema.Literal("action"),
  method: Schema.Literal("shakeAwake"),
});
export type StagedSaveConditionEscapeAction =
  typeof StagedSaveConditionEscapeActionSchema.Type;

export type StagedSaveConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly procedure: "stagedSaveCondition";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
    readonly automaticSuccessPredicates: StagedSaveConditionAutomaticSuccessPredicates;
    readonly escapeAction: StagedSaveConditionEscapeAction;
  };

export type PersistentAreaSaveCompositeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveComposite";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCylinder";
      readonly radiusFeet: MovementFeet;
      readonly heightFeet: MovementFeet;
    };
  };

export type SaveGatedTurnConstraintBundleSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "wis";
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly maxTargets: 6;
    readonly procedure: "saveGatedTurnConstraintBundle";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

export type SpellAttackDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
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
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: SpellAttackDamageTargeting;
  };

export type SpellAttackSequenceClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
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
    readonly resource: LeveledSpellInvocationResource;
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
    readonly resource: LeveledSpellInvocationResource;
  };

export type SpellCreatedHeldObjectAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly sourceEffectRef: BattleEffectExecutionRef;
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
    readonly sourceEffectRef: BattleEffectExecutionRef;
    readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    readonly procedure: "spellCreatedHeldObjectReEvoke";
    readonly resource: NoSpellInvocationResource;
  };

export type SpellHostedWeaponAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
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

export type AreaMovementDistanceDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
    readonly damagePerFeet: MovementFeet;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "areaMovementDistanceDamage";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    };
  };

export type CreateSpatialMeleeSpellAttackProxySpellProcedureExecution =
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
    readonly procedure: "spatialMeleeSpellAttackProxy";
    readonly operation: "createAndAttack";
    readonly rangeFeet: MovementFeet;
    readonly repeatMoveMaxFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: { readonly kind: "singleCombatant" };
  };

export type RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution = {
  readonly activeEffectRef: BattleEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: "spatialMeleeSpellAttackProxy";
  readonly operation: "repositionAndAttack";
};

export const TemporaryAbilityCheckRollModeSelectedModeSchema = Schema.Struct({
  kind: Schema.Literal("abilityCheckRollMode"),
  ability: Schema.Literal("cha"),
  skill: Schema.Literal("intimidation"),
  rollMode: Schema.Literal("advantage"),
  effectDuration: Schema.Literal("spellDuration"),
});
export type TemporaryAbilityCheckRollModeSelectedMode =
  typeof TemporaryAbilityCheckRollModeSelectedModeSchema.Type;

export const TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema =
  Schema.Struct({ maximumActive: Schema.Literal(3) });
export type TemporaryAbilityCheckRollModeConcurrentDurationModeLimit =
  typeof TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema.Type;

export type TemporaryAbilityCheckRollModeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CantripSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"temporaryAbilityCheckRollMode">;
    readonly procedure: "temporaryAbilityCheckRollMode";
    readonly rangeFeet: MovementFeet;
    readonly resource: NoSpellInvocationResource;
    readonly selectedMode: TemporaryAbilityCheckRollModeSelectedMode;
    readonly concurrentDurationModeLimit: TemporaryAbilityCheckRollModeConcurrentDurationModeLimit;
  };

export type LinkedDefenseResistanceDamageShareSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "magicAction";
    readonly activeEffect: SpellActiveEffectTemplate<"linkedDefenseResistanceDamageShare">;
    readonly connectionRangeFeet: MovementFeet;
    readonly procedure: "linkedDefenseResistanceDamageShare";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
  };

export type WeaponDamageRiderSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PreparedSpellAccess;
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpellActiveEffectTemplate<"spellWeaponDamageRider">;
    readonly procedure: "weaponDamageRider";
    readonly resource: LeveledSpellInvocationResource;
  };

export type PersistentAreaSaveConditionEscapeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: "dex";
    readonly access: PreparedSpellAccess;
    readonly dc: DcSource;
    readonly durationTicks: ElapsedTimeTicks;
    readonly procedure: "persistentAreaSaveConditionEscape";
    readonly rangeFeet: MovementFeet;
    readonly resource: LeveledSpellInvocationResource;
    readonly targeting: {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    };
  };

/**
 * Authored-free facts shared by companion admission and the retained-companion
 * lifecycle. Its execution carries the ritual-or-slot casting distinction
 * directly, so it does not invent a battle action or duplicate durable
 * companion state.
 */
export type SpawnedCompanionLifecycleExecutionFacts = {
  readonly procedure: "spawnedCompanionLifecycle";
  readonly casting: {
    readonly kind: "ritualOrPreparedSlot";
    readonly castingTimeMinutes: 60;
    readonly nonRitualSlotLevel: 1;
  };
  readonly initialPlacement: {
    readonly kind: "unoccupiedSpaceWithinRange";
    readonly rangeFeet: MovementFeet;
  };
  readonly formEligibility: {
    readonly baseCreatureType: "beast";
    readonly challengeRating: 0;
    readonly creatureTypeOverrides: readonly ["celestial", "fey", "fiend"];
  };
  readonly lifecycle: {
    readonly maximumCompanionsPerOwner: 1;
    readonly recastDisposition: "adoptEligibleForm";
    readonly zeroHitPointsDisposition: "disappearUntilRecast";
    readonly temporaryDismissal: {
      readonly actionCost: "magicAction";
      readonly destination: "pocketDimension";
    };
    readonly recall: {
      readonly actionCost: "magicAction";
      readonly destination: "unoccupiedSpaceWithinRange";
      readonly rangeFeet: MovementFeet;
    };
  };
  readonly control: {
    readonly initiative: "own";
    readonly agency: "independentObeysCommands";
    readonly canAttack: false;
  };
  readonly telepathyRangeFeet: MovementFeet;
  readonly sharedSensesActionCost: "bonusAction";
  readonly touchSpellProxy: {
    readonly requiredSpellRange: "touch";
    readonly companionRangeFeet: MovementFeet;
    readonly companionActionCost: "reaction";
    readonly timing: "cast";
  };
};

export interface SpellProcedureExecutionByProcedure {
  readonly abilityD20TestRollModeSaveGate: AbilityD20TestRollModeSaveGateSpellProcedureExecution;
  readonly afterHitDamage: AfterHitDamageSpellProcedureExecution;
  readonly afterHitDamageAndIllumination: AfterHitDamageAndIlluminationSpellProcedureExecution;
  readonly afterHitSaveGatedCondition: AfterHitSaveGatedConditionSpellProcedureExecution;
  readonly afterHitTimedDamageAndSave: AfterHitTimedDamageAndSaveSpellProcedureExecution;
  readonly magicSuppressionEmanation: MagicSuppressionEmanationSpellProcedureExecution;
  readonly attackBurstSaveDamage: AttackBurstSaveDamageSpellProcedureExecution;
  readonly perceptionGatedAttackRollDefense: PerceptionGatedAttackRollDefenseSpellProcedureExecution;
  readonly chainedSpellAttackDamage: ChainedSpellAttackDamageSpellProcedureExecution;
  readonly chosenDamageResistance: ChosenDamageResistanceSpellProcedureExecution;
  readonly persistentAreaSaveDamage:
    | StationaryPersistentAreaSaveDamageSpellProcedureExecution
    | SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution
    | CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution
    | DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution;
  readonly compelledNextTurnBehavior: CompelledNextTurnBehaviorSpellProcedureExecution;
  readonly conditionImmunityAndTurnStartTemporaryHitPoints: ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution;
  readonly conditionRemovalProtection: ConditionRemovalProtectionSpellProcedureExecution;
  readonly spellCastInterruptionReaction: SpellCastInterruptionReactionSpellProcedureExecution;
  readonly creatureSizeDecrease: CreatureSizeDecreaseSpellProcedureExecution;
  readonly creatureSizeIncrease: CreatureSizeIncreaseSpellProcedureExecution;
  readonly creatureTypeProtection: CreatureTypeProtectionSpellProcedureExecution;
  readonly damageReduction: DamageReductionSpellProcedureExecution;
  readonly movableLightManifestation:
    | CombinedMovableLightManifestationSpellProcedureExecution
    | RepositionMovableLightManifestationSpellProcedureExecution
    | SeparateMovableLightManifestationSpellProcedureExecution;
  readonly directCondition: DirectConditionSpellProcedureExecution;
  readonly directConditionRemoval: DirectConditionRemovalSpellProcedureExecution;
  readonly directHitPointRestoration: DirectHitPointRestorationSpellProcedureExecution;
  readonly grantedAreaSaveDamageAction: GrantedAreaSaveDamageActionSpellProcedureExecution;
  readonly grantedAlternateActionCost: GrantedAlternateActionCostSpellProcedureExecution;
  readonly fallingCreatureMitigationReaction: FallingCreatureMitigationReactionSpellProcedureExecution;
  readonly persistentAreaTrait: PersistentAreaTraitSpellProcedureExecution;
  readonly persistentAreaSaveCondition: PersistentAreaSaveConditionSpellProcedureExecution;
  readonly directionalPersistentArea: DirectionalPersistentAreaSpellProcedureExecution;
  readonly compositeTargetBuffWithAftermath: CompositeTargetBuffWithAftermathSpellProcedureExecution;
  readonly heldLight: HeldLightSpellProcedureExecution;
  readonly heldLightHurl: HeldLightHurlSpellProcedureExecution;
  readonly saveGatedConditionWithRepeat: SaveGatedConditionWithRepeatSpellProcedureExecution;
  readonly saveGatedAreaControl: SaveGatedAreaControlSpellProcedureExecution;
  readonly fixedCostMovementReplacement: FixedCostMovementReplacementSpellProcedureExecution;
  readonly controlledVerticalSuspension: ControlledVerticalSuspensionSpellProcedureExecution;
  readonly magicalDarknessPointOrigin: MagicalDarknessPointOriginSpellProcedureExecution;
  readonly weaponAttackDamageEnhancement: WeaponAttackDamageEnhancementSpellProcedureExecution;
  readonly makeStable: MakeStableSpellProcedureExecution;
  readonly markedDamageRider:
    | MarkedDamageRiderCastSpellProcedureExecution
    | MarkedDamageRiderTransferSpellProcedureExecution;
  readonly duplicateHitInterception: DuplicateHitInterceptionSpellProcedureExecution;
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
  readonly targetingSaveInterdiction: TargetingSaveInterdictionSpellProcedureExecution;
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
  readonly triggeredArmorDefense: TriggeredArmorDefenseSpellProcedureExecution;
  readonly stagedSaveCondition: StagedSaveConditionSpellProcedureExecution;
  readonly persistentAreaSaveComposite: PersistentAreaSaveCompositeSpellProcedureExecution;
  readonly saveGatedTurnConstraintBundle: SaveGatedTurnConstraintBundleSpellProcedureExecution;
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
  readonly areaMovementDistanceDamage: AreaMovementDistanceDamageSpellProcedureExecution;
  readonly spatialMeleeSpellAttackProxy:
    | CreateSpatialMeleeSpellAttackProxySpellProcedureExecution
    | RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution;
  readonly temporaryAbilityCheckRollMode: TemporaryAbilityCheckRollModeSpellProcedureExecution;
  readonly spawnedCompanionLifecycle: SpawnedCompanionLifecycleExecutionFacts;
  readonly linkedDefenseResistanceDamageShare: LinkedDefenseResistanceDamageShareSpellProcedureExecution;
  readonly weaponAttackOverride: WeaponAttackOverrideSpellProcedureExecution;
  readonly weaponDamageRider: WeaponDamageRiderSpellProcedureExecution;
  readonly persistentAreaSaveConditionEscape: PersistentAreaSaveConditionEscapeSpellProcedureExecution;
}

type DynamicActiveEffectSpellProcedureExecution =
  | MarkedDamageRiderTransferSpellProcedureExecution
  | ObjectContactDamageRepeatSpellProcedureExecution
  | RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution;

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

export type RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellEffectSpellAccess;
    readonly resource: NoSpellInvocationResource;
    readonly procedure: "spatialMeleeSpellAttackProxy";
    readonly operation: "repositionAndAttack";
    readonly actionCost: "bonusAction";
    readonly activeEffect: SpatialMeleeSpellAttackProxyActiveEffect;
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
    : Execution extends RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution
      ? RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution
      : never;
export type SpellProcedureKey = keyof SpellProcedureExecutionByProcedure;
export type BattleSpellProcedureKey = Exclude<
  SpellProcedureKey,
  "spawnedCompanionLifecycle"
>;
type AnySpellProcedureExecution =
  SpellProcedureExecutionByProcedure[SpellProcedureKey];
type AnyBattleSpellProcedureExecution =
  SpellProcedureExecutionByProcedure[BattleSpellProcedureKey];
export type SpellProcedureInput<
  P extends SpellProcedureKey = SpellProcedureKey,
> =
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
export type BattleStoredSpellProcedureExecution =
  SpellProcedureExecution<AnyBattleSpellProcedureExecution>;
export type RuntimeSpellProcedureExecution =
  SpellExecutableExecutionOf<BattleStoredSpellProcedureExecution>;
export type BattleSpellProcedureExecution<
  Input extends SpellProcedureInput = BattleStoredSpellProcedureExecution,
> = SpellExecutableExecutionOf<Input> & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};
