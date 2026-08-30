// This module contains only TypeScript type vocabulary, which is erased before
// runtime and therefore has no executable behavior for tests to cover.
/* v8 ignore file -- @preserve */

// Authored-free mechanical vocabulary shared by spell admission and execution.

import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  AttackBonus,
  Condition,
  MovementDeltaFeet,
  MovementFeet,
} from "@dnd/shared/types";
import type { Ability, DamageType, DiceExpr } from "@dnd/surface/surface/types";
import type {
  BattleActiveEffect,
  BattleSpellActiveEffectTemplate,
  MarkedDamageRiderFindingAdvantage,
  SpellConditionEscape,
  SpellTurnStartDamage,
} from "../active-effect/types.ts";
import type {
  SpellAttackKind,
  SpellConditionRepeatSave,
} from "../active-effect/execution-vocabulary.ts";
import type {
  MultiBeamSpellAttackBeamCount,
  MultiRaySpellAttackRayCount,
} from "../battle-reducer/domain-constants.ts";
import type { SpellTargeting } from "./spell-invocation-vocabulary.ts";

export type BattleLightEmission =
  | {
      readonly kind: "dim";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "bright";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
    };

export type BattleLightEmitterOpaqueCoverInteraction =
  | { readonly kind: "blocksEmission" }
  | { readonly kind: "doesNotBlockEmission" };

export type BattleIlluminationEmissionFacts = {
  readonly emission: BattleLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
};

export type DimIlluminationEmissionFacts = Omit<
  BattleIlluminationEmissionFacts,
  "emission"
> & {
  readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
};

export type BrightAndDimIlluminationEmissionFacts = Omit<
  BattleIlluminationEmissionFacts,
  "emission"
> & {
  readonly emission: Extract<
    BattleLightEmission,
    { readonly kind: "brightAndDim" }
  >;
};

export type BrightIlluminationEmissionFacts = Omit<
  BattleIlluminationEmissionFacts,
  "emission"
> & {
  readonly emission: Extract<BattleLightEmission, { readonly kind: "bright" }>;
};

export type BrightRadiusIlluminationEmissionFacts = Omit<
  BattleIlluminationEmissionFacts,
  "emission"
> & {
  readonly emission:
    | BrightIlluminationEmissionFacts["emission"]
    | BrightAndDimIlluminationEmissionFacts["emission"];
};

export type SpellComponent = "V" | "S" | "M";

export type BattleImmediateAreaAudibleBoom = {
  readonly sound: "thunderous boom";
  readonly audibleRadiusFeet: MovementFeet;
};

export type HealingSpellActionCost = "magicAction" | "bonusAction";

export type SpellObjectHitEffect =
  | { readonly kind: "none" }
  | { readonly kind: "igniteFlammableUnattended" };

export type SpellPostDamageRider =
  | {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
    }
  | {
      readonly kind: "condition";
      readonly condition: Condition;
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "opportunityAttackDenied";
      readonly expiresAt: "startOfTargetNextTurn";
    }
  | {
      readonly kind: "nextAttackRollAgainstTarget";
      readonly mode: "advantage";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "hitPointRegainPrevented";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "invisibleBenefitDenied";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "lightEmission";
      readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
      readonly expiresAt: "endOfCasterNextTurn";
    };

export type SpellFailedSavePostDamageRider =
  | {
      readonly kind: "nextAttackRollByTarget";
      readonly mode: "disadvantage";
      readonly expiresAt: "endOfTargetNextTurn";
    }
  | {
      readonly kind: "forcedReactionMovement";
      readonly direction: "awayFromCaster";
      readonly route: "safest";
      readonly distance: "asFarAsPossible";
      readonly cost: "targetReactionIfAvailable";
    };

export type SpellPostSaveAreaEffect =
  | {
      readonly kind: "areaObjectIgnition";
    }
  | {
      readonly kind: "areaObjectDamage";
    }
  | {
      readonly kind: "selfOriginCubePush";
      readonly creaturePush: {
        readonly distanceFeet: MovementFeet;
        readonly originDirection: "away_from_caster";
      };
      readonly unsecuredObjectPush: {
        readonly distanceFeet: MovementFeet;
        readonly originDirection: "away_from_caster";
        readonly objectLocation: "entirely_within_area";
      };
      readonly audibleBoom: BattleImmediateAreaAudibleBoom;
    };

export type SpellFailedSaveConditionExpiration =
  | "endOfCasterNextTurn"
  | "concentration"
  | {
      readonly kind: "concentration";
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: ElapsedTimeTicks;
    };

export type SpellConditionCountedRepeatSave = {
  readonly kind: "counted";
  readonly save: SpellConditionRepeatSave;
  readonly successThreshold: number;
  readonly failureThreshold: number;
  readonly savingThrowDisadvantageAbilities: readonly [Ability, ...Ability[]];
};

export type SpellFailedSaveConditionEffectBase = {
  readonly expiresAt: SpellFailedSaveConditionExpiration;
};

export type SpellFailedSaveConditionNoRepeatLifecycle = {
  readonly escape: SpellConditionEscape | null;
  readonly turnStartDamage: SpellTurnStartDamage | null;
  readonly repeatSave: null;
};

export type SpellFailedSaveConditionEndTurnSaveLifecycle = {
  readonly escape: null;
  readonly turnStartDamage: null;
  readonly repeatSave:
    | SpellConditionRepeatSave
    | SpellConditionCountedRepeatSave;
};

export type SpellFailedSaveFixedConditionEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly kind: "fixed";
      readonly condition: Condition;
    };

export type SpellFailedSaveConditionChoiceEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly kind: "choice";
      readonly choices: readonly [Condition, ...Condition[]];
    };

export type SpellFailedSaveConditionEffect =
  | SpellFailedSaveFixedConditionEffect
  | SpellFailedSaveConditionChoiceEffect;

export type SpellSavingThrowRollModeRule =
  | {
      readonly kind: "hostileTarget";
      readonly mode: "advantage";
    }
  | {
      readonly kind: "creatureType";
      readonly creatureType: CreatureType;
      readonly mode: "disadvantage";
    };

export type SpellTargetListTargeting = {
  readonly kind: "targetList";
  readonly minTargets: 1;
  readonly maxTargets: number;
};

export type CreatureTypeProtectionSpellTargeting =
  | { readonly kind: "self" }
  | (SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "willing";
    });

export type ScalarBuffSpellTargeting =
  | {
      readonly kind: "self";
    }
  | (SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    });

export type ScalarBuffSpellEffect =
  | {
      readonly kind: "temporaryHitPoints";
      readonly amount: { readonly expr: DiceExpr };
    }
  | {
      readonly kind: "activeEffect";
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          {
            readonly kind:
              | "speedDelta"
              | "specialSpeedGrant"
              | "spellArmorClassBonus"
              | "spellArmorClassFloor";
          }
        >
      >;
    }
  | {
      readonly kind: "hitPointMaximumIncrease";
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "hitPointMaximumIncrease" }
        >
      >;
    };

export type RollModifierSpellTargeting =
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number | "allLegalTargets";
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    }
  | {
      readonly kind: "selfAndChosenLegalTargets";
      readonly minTargets: 1;
    };

export type AbilityCheckRollModeSpellEffect = Omit<
  BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "abilityCheckRollMode" }>
  >,
  "ability"
>;

export type ConditionImmunityActiveEffectTemplate = Omit<
  BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "conditionImmunity" }>
  >,
  "conditionHadNonSpellSource"
>;

export type HeldLightHurlMechanicalFacts = {
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "singleCreatureOrObject" }
  >;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly rangeFeet: MovementFeet;
  readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
  readonly attackBonus: AttackBonus;
};

export type SpellAttackDamageTargeting = Extract<
  SpellTargeting,
  { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
>;

export type CantripSpellAttackSequenceTargeting = {
  readonly kind: "spellAttackSequenceCreatureOrObject";
  readonly countSource: "characterLevel";
  readonly attackCount: MultiBeamSpellAttackBeamCount;
};

export type PreparedSpellAttackSequenceTargeting = {
  readonly kind: "spellAttackSequenceCreatureOrObject";
  readonly countSource: "spellSlotLevel";
  readonly attackCount: MultiRaySpellAttackRayCount;
};

export type SpellAttackDamagePayload =
  | {
      readonly kind: "fixedSpellAttackDamage";
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    }
  | {
      readonly kind: "spellAttackDamageTypeChoice";
      readonly expr: DiceExpr;
      readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
      readonly maxDieAdditionalDiceLimit: number;
    }
  | {
      readonly kind: "selectedSpellAttackDamage";
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
      readonly maxDieAdditionalDiceLimit: number;
    };

export type SpellAttackMissDamage = "none" | "halfInitialOnly";

export type HealingSpellTargeting =
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    }
  | {
      readonly kind: "pointOriginSphereTargetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
      readonly area: {
        readonly kind: "pointOriginSphere";
        readonly radiusFeet: MovementFeet;
      };
    };

export type MarkedDamageRiderCastAbilityCheckBehavior =
  | { readonly kind: "none" }
  | {
      readonly kind: "chosenAbilityDisadvantage";
      readonly choices: readonly Ability[];
    }
  | MarkedDamageRiderFindingAdvantage;
