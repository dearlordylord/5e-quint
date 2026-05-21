// Active Effect lifecycle model: expiration, early-end, effect bases, and the
// shared payload vocabulary that battle active effects are built from. This is
// pure type vocabulary with leaf dependencies only; the BattleActiveEffect union
// and its runtime live in battle-reducer.ts / battle-reducer/ and depend on these
// types one-directionally. See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  AbilityModifier,
  AttackBonus,
  DamageDieSize,
  Round as RoundType,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  DcSource,
  DiceExpr,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
  type SelfTransformationNonNaturalWeaponModeKind,
} from "../battle-reducer/domain-constants.ts";
import type { CombatantId } from "../identity.ts";

export type BattleActiveEffectExpiration =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: CombatantId;
      readonly round: RoundType;
    }
  | {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly kind: "untilDispelled";
    };
export type TurnAnchoredBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "startOfTurn" } | { readonly kind: "endOfTurn" }
>;
export type BattleSpellEffectEarlyEnd =
  | { readonly kind: "targetDonsArmor" }
  | { readonly kind: "concentrationBroken" };
export type BattleTargetDonsArmorEarlyEnd = Extract<
  BattleSpellEffectEarlyEnd,
  { readonly kind: "targetDonsArmor" }
>;
export type BattleConcentrationBrokenEarlyEnd = Extract<
  BattleSpellEffectEarlyEnd,
  { readonly kind: "concentrationBroken" }
>;
export type BattleSpellEffectBase = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type BattleUnitFeatureEffectBase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type SpellConditionAbilityCheckSuccessEnd =
  (typeof SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS)[number];
export type ProtectionFromEvilAndGoodPreventedCondition =
  (typeof PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS)[number];
export type BattlePossessionAttemptDisposition =
  | {
      readonly tag: "prevented";
      readonly prevention: "creatureTypeProtection";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly tag: "unprevented";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "unknownSourceCombatant"
        | "unknownSourceCreatureType"
        | "unknownTargetCombatant";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    };
export type SpellConditionEscape =
  | {
      readonly kind: "abilityCheck";
      readonly ability: "str";
      readonly skill: "athletics";
      readonly successEnds: SpellConditionAbilityCheckSuccessEnd;
    }
  | {
      readonly kind: "targetDamagedByCasterOrAlly";
    };
export type SpellTurnStartDamage = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
};
export type SpellTurnStartDamageSave = {
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly successEnds: "spell";
};
export type MarkedDamageRiderRetargetTiming = "sameTurn" | "laterTurn";
export type BattleTurnAnchor = {
  readonly actorId: CombatantId;
  readonly round: RoundType;
};
export type MarkedDamageRiderTransferState =
  | {
      readonly kind: "awaitingTargetDrop";
      readonly retargetTiming: MarkedDamageRiderRetargetTiming;
    }
  | {
      readonly kind: "available";
      readonly retargetTiming: "sameTurn";
    }
  | {
      readonly kind: "availableAfterTurn";
      readonly retargetTiming: "laterTurn";
      readonly droppedOnTurn: BattleTurnAnchor;
    };
export type SelfTransformationNaturalWeaponFacts = {
  readonly damage: {
    readonly dice: 1;
    readonly dieSize: DamageDieSize;
    readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
  };
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
};
export type SelfTransformationModeEffectPayload = {
  readonly naturalWeaponFacts: SelfTransformationNaturalWeaponFacts;
} & (
  | {
      readonly mode: SelfTransformationNonNaturalWeaponModeKind;
    }
  | {
      readonly mode: "naturalWeapons";
      readonly naturalWeaponDamageType: DamageType;
    }
);
