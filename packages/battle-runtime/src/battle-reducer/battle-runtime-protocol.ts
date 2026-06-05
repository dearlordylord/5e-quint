// Runtime protocol constants and reducer-local parse result shapes extracted
// from ../battle-reducer.ts. This module owns battle hole identifiers, initial
// turn resources, supported action-resource projections, and small fill-set
// result types used by resolver modules.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete

import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import { resetTurnActionEconomy } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import {
  difficultyClass,
  Hp,
  movementFeet,
  Round,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  CreatureNamedActionOption,
  CreatureNamedMultiattack,
} from "@dnd/surface/surface/types";
import type {
  StatBlockAttackActionOption,
  StatBlockPartKey,
} from "../battle-action-options.ts";
import type {
  BattleAttackDamageDisposition,
  BattleAttackRollResult,
  BattleFill,
  BattleRolledDiceFill,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

export const INITIAL_ROUND: RoundType = Round(1);
export const INITIAL_TURN_RESOURCES = resetTurnActionEconomy({
  actionResources: [],
  currentHasBonusAction: false,
  commandHalt: null,
  jumpDistanceMultiplier: null,
  spellSlotUsesThisTurn: [],
  levelOnePlusSpellCastsThisTurn: [],
  quickenedLevelOnePlusSpellCastsThisTurn: [],
  attackRollMadeThisTurn: false,
  attackDamageRidersUsedThisTurn: [],
  recklessAttackWhileRagingUsedThisTurn: [],
  weaponDamageDiceRollChoicesUsedThisTurn: [],
  weaponMasteryCleaveAttackersUsedThisTurn: [],
  dashMovementBonusFeet: movementFeet(0),
  disengaged: false,
});
export const ATTACK_TARGET_HOLE_ID = holeId("battle:attack:target");
export const ATTACK_ROLL_HOLE_ID = holeId("battle:attack:roll");
export const SPELL_CAST_REACTION_FACTS_HOLE_ID = holeId(
  "battle:spell-cast:reaction-facts",
);
export const SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:spell-cast:reaction-facts",
);
export const ATTACK_DAMAGE_DISPOSITION_HOLE_ID = holeId(
  "battle:attack:damage-disposition",
);
export const ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:attack:target",
);
export const ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey("battle:attack:roll");
export const ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE = holeInstanceKey(
  "battle:attack:damage-disposition",
);
export const SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS = [
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;
export type SupportedStatBlockBonusActionStandardAction =
  (typeof SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS)[number];
export const ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS = [
  "dash",
  "disengage",
  "dodge",
  "help",
  "hide",
  "influence",
  "magic",
  "ready",
  "search",
  "study",
  "utilize",
] as const satisfies readonly [StandardActionKind, ...StandardActionKind[]];
export type StatBlockMultiattackActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "statBlockMultiattack" }
>;
export type ClassFeatureExtraAttackActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "classFeatureExtraAttack" }
>;
export type MonkFocusFlurryOfBlowsActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "monkFocusFlurryOfBlows" }
>;
export const HELP_ATTACK_ALLY_HOLE_ID = holeId("battle:help-attack:ally");
export const HELP_ATTACK_TARGET_HOLE_ID = holeId("battle:help-attack:target");
export const HELP_ATTACK_ALLY_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:ally",
);
export const HELP_ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:target",
);
export const SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID = holeId(
  "battle:sleep-shake-awake:target",
);
export const SLEEP_SHAKE_AWAKE_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:sleep-shake-awake:target",
);
export const DEATH_SAVING_THROW_HOLE_ID = holeId(
  "battle:end-turn:death-saving-throw",
);
export const DEATH_SAVING_THROW_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:death-saving-throw",
);
export const STAT_BLOCK_RECHARGE_ROLL_HOLE_ID = holeId(
  "battle:end-turn:stat-block-recharge-roll",
);
export const STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:stat-block-recharge-roll",
);
export const CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX =
  "battle:concentration:saving-throw";
export const REACTION_DECISION_HOLE_ID = holeId("battle:reaction:decision");
export const REACTION_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:decision",
);
export const MOVEMENT_HOLE_ID = holeId("battle:movement");
export const MOVEMENT_HOLE_INSTANCE = holeInstanceKey("battle:movement");
export const LEVITATE_ALTITUDE_CHANGE_HOLE_ID = holeId(
  "battle:levitate:altitude-change",
);
export const LEVITATE_ALTITUDE_CHANGE_HOLE_INSTANCE = holeInstanceKey(
  "battle:levitate:altitude-change",
);
export const LEVITATE_INITIAL_RISE_HOLE_ID = holeId(
  "battle:levitate:initial-rise",
);
export const LEVITATE_INITIAL_RISE_HOLE_INSTANCE = holeInstanceKey(
  "battle:levitate:initial-rise",
);
export const HIDE_ABILITY_CHECK_HOLE_ID = holeId("battle:hide:stealth-check");
export const HIDE_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:hide:stealth-check",
);
export const SEARCH_TARGET_HOLE_ID = holeId("battle:search:target");
export const SEARCH_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:target",
);
export const SEARCH_ABILITY_CHECK_HOLE_ID = holeId(
  "battle:search:perception-check",
);
export const SEARCH_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:perception-check",
);
export const GRAPPLE_TARGET_HOLE_ID = holeId("battle:grapple:target");
export const GRAPPLE_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:grapple:target",
);
export const GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:grapple:outcome");
export const GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:grapple:outcome",
);
export const SHOVE_TARGET_HOLE_ID = holeId("battle:shove:target");
export const SHOVE_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:shove:target",
);
export const SHOVE_OUTCOME_HOLE_ID = holeId("battle:shove:outcome");
export const SHOVE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:shove:outcome",
);
export const ESCAPE_GRAPPLE_OUTCOME_HOLE_ID = holeId(
  "battle:escape-grapple:outcome",
);
export const ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:escape-grapple:outcome",
);
export const ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID = holeId(
  "battle:escape-spell-restraint:athletics-check",
);
export const ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE =
  holeInstanceKey("battle:escape-spell-restraint:athletics-check");
export const REACTION_MODIFIER_ROLL_HOLE_ID = holeId(
  "battle:reaction:modifier-roll",
);
export const REACTION_MODIFIER_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:modifier-roll",
);
export const HIDE_DC = difficultyClass(15);
export type SupportedStatBlockBonusActionOption = {
  readonly option: Omit<CreatureNamedActionOption, "options"> & {
    readonly options: readonly SupportedStatBlockBonusActionStandardAction[];
  };
  readonly part: StatBlockPartKey;
};
export type SupportedStatBlockMultiattack = {
  readonly multiattack: CreatureNamedMultiattack;
  readonly dispatches: readonly StatBlockAttackActionOption[];
};
export type SupportedLiteralMultiattackDispatch =
  CreatureNamedMultiattack["dispatches"][number] & {
    readonly count: Extract<
      CreatureNamedMultiattack["dispatches"][number]["count"],
      { readonly kind: "literal" }
    >;
  };
export type AttackFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly attackRoll: BattleAttackRollResult | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly hideousLaughterDamageRepeatSaves: readonly Extract<
        BattleFill,
        { readonly kind: "savingThrowOutcome" }
      >[];
      readonly damageDisposition: BattleAttackDamageDisposition;
      readonly damageDispositionFilled: boolean;
      readonly damageRoll: BattleRolledDiceFill | undefined;
      readonly mirrorImageDuplicateRoll: BattleRolledDiceFill | undefined;
      readonly spellDamageReductionRoll: BattleRolledDiceFill | undefined;
      readonly sourceDamageRollPenaltyRolls: readonly BattleRolledDiceFill[];
      readonly attackDamageReductionRedirectTarget:
        | Extract<BattleFill, { readonly kind: "targetChoice" }>
        | undefined;
      readonly attackDamageReductionRedirectSave:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly attackDamageReductionRedirectDamage:
        | BattleRolledDiceFill
        | undefined;
      readonly weaponMasteryToppleSavingThrow:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly openHandTechniqueDecision:
        | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
        | undefined;
      readonly openHandTechniqueSavingThrow:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly weaponMasteryCleaveDecision:
        | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
        | undefined;
      readonly weaponMasteryCleaveTarget:
        | Extract<BattleFill, { readonly kind: "targetChoice" }>
        | undefined;
      readonly weaponMasteryCleaveAttackRoll:
        | Extract<BattleFill, { readonly kind: "attackRoll" }>
        | undefined;
      readonly weaponMasteryCleaveDamageRoll: BattleRolledDiceFill | undefined;
      readonly weaponMasteryCleaveDamageDisposition: BattleAttackDamageDisposition;
      readonly weaponMasteryCleaveDamageDispositionFilled: boolean;
      readonly remarkableAthleteCriticalHitMovementDecision:
        | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
        | undefined;
      readonly remarkableAthleteCriticalHitMovement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
      readonly weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision:
        | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
        | undefined;
      readonly weaponMasteryCleaveRemarkableAthleteCriticalHitMovement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };
export type GrappleFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly outcome:
        | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };
export type ShoveFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly outcome:
        | Extract<BattleFill, { readonly kind: "shoveOutcome" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };
export type UnitFeatureRolledDiceFill =
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

export type HpDamageProjection = {
  readonly effectiveDamage: number;
  readonly currentTempHp: number;
  readonly tempHpAbsorbed: number;
  readonly currentHp: number;
  readonly hpDamage: number;
  readonly nextHp: Hp;
  readonly massiveDamageKills: boolean;
};
