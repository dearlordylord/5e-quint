import { Match, Schema } from "effect";

import { MetamagicOptionSchema } from "#/features/class-sorcerer.ts";
import {
  getBattleReadyableSpellPayload,
  getModeledPreparedSpellInfo,
  MODELED_PREPARED_SPELLS,
  ModeledPreparedSpellSchema,
  type ModeledPreparedSpell,
} from "#/features/spell-available-actions.ts";
import {
  getBattleReadyableSpellDelivery,
  type BattleReadyableSpellPayload,
} from "#/features/spell-registry.ts";
import {
  CLASS_NAMES,
  classHitDie,
  type ClassName,
} from "#/features/class-tables.ts";
import { relentlessRageDC } from "#/features/class-barbarian.ts";
import {
  flurryOfBlowsStrikes,
  pMartialArtsDie,
} from "#/features/class-monk.ts";
import { tirelessTempHp } from "#/features/class-ranger.ts";
import {
  slotCreationCost,
  type MetamagicOption,
} from "#/features/class-sorcerer.ts";
import type {
  BattlePosition,
  BattleContext,
  BattleCreatureState,
  BattleEvent,
  InitCreatureConfig,
  MovementProvocationKind,
} from "#/battle-machine-types.ts";
import {
  battleHasFreeHand,
  isIncapacitated,
} from "#/battle-machine-creature.ts";
import { bardicInspirationDie } from "#/features/class-bard.ts";
import { deflectAttacksReduction } from "#/features/class-monk-features.ts";
import { counterspellAutoSuccess } from "#/features/spell-abjuration.ts";
import {
  canUseHeroicInspirationNow,
  guards,
  legalArcaneRecoveryLevels,
  legalConvertPointsToSlotLevels,
  legalConvertSlotToPointsLevels,
  legalDivineSmiteLevels,
  legalFontSlotRestoreLevels,
  legalLayOnHandsAmounts,
  legalMetamagicOptions,
  legalMysticArcanumLevels,
  legalPreparedSpellSlotLevels,
  legalWildResurgenceChargeLevels,
} from "#/machine-guards.ts";
import {
  canUseProjectedActionSurge,
  canUseProjectedBattleActionSurge,
  canUseProjectedPreparedSpell,
  canUseProjectedSecondWind,
  finalizeProjectedActionSurge,
  finalizeProjectedPreparedSpell,
  finalizeProjectedSecondWind,
  projectedActionSurgeCost,
  projectedActionSurgeSummary,
  projectedBattleActionSurgeSummary,
  projectedPreparedSpellCost,
  projectedPreparedSpellSummary,
  projectedSecondWindCost,
  projectedSecondWindSummary,
  type ProjectedPreparedSpellRuntime,
} from "#/projected-action-bridge.ts";
import {
  getMonsterStatBlockByStateId,
  MONSTER_STAT_BLOCK_IDS,
  monsterSpellDailyUseId,
  monsterCatalogInitCreatureConfig,
  statBlockAttackBattleProfile,
  statBlockLegendaryAction,
  statBlockSaveEffectAction,
  statBlockTraversalMovementAction,
  statBlockTraversalMovementActionEntry,
} from "#/monster-catalog.ts";
import {
  MONSTER_BATTLE_BONUS_ACTION_OPTIONS,
  MONSTER_SAVE_TRIGGER_KINDS,
} from "#/monster-types.ts";
import { battleCurrentArmorClass } from "#/projected-persistent.ts";
import { rootEventHandlers, turnPhaseConfig } from "#/machine-states.ts";
import type { DndContext, DndEvent } from "#/machine-types.ts";
import { withinOneSize } from "#/machine-combat.ts";
import {
  armorClass,
  CONDITIONS,
  CREATURE_KINDS,
  CreatureId,
  DAMAGE_QUALIFIERS,
  DAMAGE_TYPES,
  SIZES,
  SpellSlotLevel,
  spellId,
  spellSlotLevel,
  UNARMED_STRIKE_PROFILE,
  WEAPON_PROPERTIES,
  type D20Roll,
  type SpellId,
  type SpellName,
  type SpellSlotLevel as SpellSlotLevelValue,
} from "#/types.ts";

export const RESOURCE_COST_POOLS = [
  "actionSurge",
  "arcaneRecovery",
  "bardicInspiration",
  "channelDivinity",
  "focusPoint",
  "indomitable",
  "innateSorcery",
  "layOnHandsPool",
  "magicalCunning",
  "mysticArcanum",
  "naturesVeil",
  "rage",
  "secondWind",
  "sorceryPoints",
  "spellSlot",
  "tireless",
  "uncannyMetabolism",
  "wholenessOfBody",
  "wildShape",
] as const;
export type ResourceCostPool = (typeof RESOURCE_COST_POOLS)[number];

export const RESOURCE_COST_QUOTAS = [
  "action",
  "bonusAction",
  "reaction",
  "movement",
] as const;
export type ResourceCostQuota = (typeof RESOURCE_COST_QUOTAS)[number];

export type QuotaCost =
  | {
      readonly kind: "quota";
      readonly resource: Exclude<ResourceCostQuota, "movement">;
    }
  | {
      readonly kind: "quota";
      readonly resource: "movement";
      readonly amount: number;
    };

export type PoolCost = {
  readonly kind: "pool";
  readonly resource: ResourceCostPool;
};

export type ResourceCostItem = QuotaCost | PoolCost;
export type ResourceCost = ReadonlyArray<ResourceCostItem>;

export const FREE_COST = [] as const satisfies ResourceCost;

function quotaCost(
  resource: Exclude<ResourceCostQuota, "movement">,
): QuotaCost {
  return { kind: "quota", resource };
}

function movementCost(amount: number): QuotaCost {
  return { kind: "quota", resource: "movement", amount };
}

function poolCost(resource: ResourceCostPool): PoolCost {
  return { kind: "pool", resource };
}

function costs(...items: ReadonlyArray<ResourceCostItem>): ResourceCost {
  return items;
}

function projectedCosts(
  ...parts: ReadonlyArray<
    "action" | "bonusAction" | "actionSurge" | "secondWind"
  >
): ResourceCost {
  return costs(
    ...parts.map((part) =>
      part === "action" || part === "bonusAction"
        ? quotaCost(part)
        : poolCost(part),
    ),
  );
}

function actionQuotaCost(actionType: "action" | "bonusAction"): QuotaCost {
  return quotaCost(actionType);
}

function actionTypeLabel(actionType: "action" | "bonusAction") {
  return actionType === "action" ? "action" : "bonus action";
}

export type OutcomeDescription = {
  readonly summary: string;
};

export const ACTION_SCOPES = ["creature", "battle"] as const;
export type ActionScope = (typeof ACTION_SCOPES)[number];

export type Hole<T> = { readonly options: ReadonlyArray<T> };
export type MaybeHole<T> = T | Hole<T>;
export type FillHoles<T> = {
  readonly [K in keyof T]: T[K] extends Hole<infer V> ? V : T[K];
};

const SUGGESTED_D20_CHECK_TOTAL_OPTIONS = Array.from(
  { length: 30 },
  (_, i) => i + 1,
);

function isResolvedD20CheckTotal(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

const DUMMY_EVENT: DndEvent = { type: "STABILIZE" };
const guardArgs = (
  context: DndContext,
): { context: DndContext; event: DndEvent } => ({
  context,
  event: DUMMY_EVENT,
});

function displaySpellName(spellName: SpellName): string {
  return spellName
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export const SUPPORTED_ACTION_TYPES = [
  "ENTER_COMBAT",
  "USE_HEROIC_INSPIRATION",
  "CAST_PREPARED_SPELL",
  "START_TURN",
  "USE_ACTION_SURGE",
  "USE_INDOMITABLE",
  "USE_TACTICAL_MIND",
  "CONVERT_SLOT_TO_POINTS",
  "CONVERT_POINTS_TO_SLOT",
  "ENTER_RAGE",
  "END_RAGE",
  "EXTEND_RAGE_BA",
  "DECLARE_RECKLESS",
  "USE_LAY_ON_HANDS",
  "USE_DIVINE_SMITE",
  "FLURRY_OF_BLOWS",
  "PATIENT_DEFENSE_FREE",
  "PATIENT_DEFENSE_FOCUS",
  "STEP_OF_THE_WIND_FREE",
  "STEP_OF_THE_WIND_FOCUS",
  "WHOLENESS_OF_BODY",
  "UNCANNY_METABOLISM",
  "USE_ARCANE_RECOVERY",
  "USE_OVERCHANNEL",
  "USE_METAMAGIC",
  "USE_INNATE_SORCERY",
  "USE_MAGICAL_CUNNING",
  "ENTER_WILD_SHAPE",
  "EXIT_WILD_SHAPE",
  "USE_WILD_RESURGENCE_SLOT",
  "USE_MYSTIC_ARCANUM",
  "USE_SECOND_WIND",
  "USE_TIRELESS",
  "USE_SNEAK_ATTACK",
  "USE_STEADY_AIM",
  "CUNNING_ACTION_DASH",
  "CUNNING_ACTION_DISENGAGE",
  "CUNNING_ACTION_HIDE",
  "USE_CLERIC_CHANNEL_DIVINITY",
  "USE_FONT_SLOT_RESTORE",
  "USE_PALADIN_CHANNEL_DIVINITY",
  "USE_WILD_RESURGENCE_CHARGE",
  "USE_NATURES_VEIL",
  "USE_BARDIC_INSPIRATION",
  "USE_PEERLESS_SKILL",
  "USE_RELENTLESS_RAGE",
  "SHORT_REST",
  "EXIT_COMBAT",
] as const;
export type SupportedActionType = (typeof SUPPORTED_ACTION_TYPES)[number];

type SimpleToken<T extends SupportedActionType> = {
  readonly type: T;
  readonly cost: ResourceCost;
  readonly outcome: OutcomeDescription;
};

type TokenByType = {
  readonly ENTER_COMBAT: SimpleToken<"ENTER_COMBAT">;
  readonly USE_HEROIC_INSPIRATION: SimpleToken<"USE_HEROIC_INSPIRATION">;
  readonly CAST_PREPARED_SPELL: SimpleToken<"CAST_PREPARED_SPELL"> & {
    readonly spellName: ModeledPreparedSpell;
    readonly slotLevel?: Hole<SpellSlotLevelValue>;
  };
  readonly START_TURN: SimpleToken<"START_TURN">;
  readonly USE_ACTION_SURGE: SimpleToken<"USE_ACTION_SURGE">;
  readonly USE_INDOMITABLE: SimpleToken<"USE_INDOMITABLE">;
  readonly USE_TACTICAL_MIND: SimpleToken<"USE_TACTICAL_MIND">;
  readonly CONVERT_SLOT_TO_POINTS: SimpleToken<"CONVERT_SLOT_TO_POINTS"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly CONVERT_POINTS_TO_SLOT: SimpleToken<"CONVERT_POINTS_TO_SLOT"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly ENTER_RAGE: SimpleToken<"ENTER_RAGE">;
  readonly END_RAGE: SimpleToken<"END_RAGE">;
  readonly EXTEND_RAGE_BA: SimpleToken<"EXTEND_RAGE_BA">;
  readonly DECLARE_RECKLESS: SimpleToken<"DECLARE_RECKLESS">;
  readonly USE_LAY_ON_HANDS: SimpleToken<"USE_LAY_ON_HANDS"> & {
    readonly amount: Hole<number>;
  };
  readonly USE_DIVINE_SMITE: SimpleToken<"USE_DIVINE_SMITE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly FLURRY_OF_BLOWS: SimpleToken<"FLURRY_OF_BLOWS">;
  readonly PATIENT_DEFENSE_FREE: SimpleToken<"PATIENT_DEFENSE_FREE">;
  readonly PATIENT_DEFENSE_FOCUS: SimpleToken<"PATIENT_DEFENSE_FOCUS">;
  readonly STEP_OF_THE_WIND_FREE: SimpleToken<"STEP_OF_THE_WIND_FREE">;
  readonly STEP_OF_THE_WIND_FOCUS: SimpleToken<"STEP_OF_THE_WIND_FOCUS">;
  readonly WHOLENESS_OF_BODY: SimpleToken<"WHOLENESS_OF_BODY">;
  readonly UNCANNY_METABOLISM: SimpleToken<"UNCANNY_METABOLISM">;
  readonly USE_ARCANE_RECOVERY: SimpleToken<"USE_ARCANE_RECOVERY"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly USE_OVERCHANNEL: SimpleToken<"USE_OVERCHANNEL">;
  readonly USE_METAMAGIC: SimpleToken<"USE_METAMAGIC"> & {
    readonly option: Hole<MetamagicOption>;
  };
  readonly USE_INNATE_SORCERY: SimpleToken<"USE_INNATE_SORCERY">;
  readonly USE_MAGICAL_CUNNING: SimpleToken<"USE_MAGICAL_CUNNING">;
  readonly ENTER_WILD_SHAPE: SimpleToken<"ENTER_WILD_SHAPE">;
  readonly EXIT_WILD_SHAPE: SimpleToken<"EXIT_WILD_SHAPE">;
  readonly USE_WILD_RESURGENCE_SLOT: SimpleToken<"USE_WILD_RESURGENCE_SLOT">;
  readonly USE_MYSTIC_ARCANUM: SimpleToken<"USE_MYSTIC_ARCANUM"> & {
    readonly spellLevel: Hole<SpellSlotLevelValue>;
  };
  readonly USE_SECOND_WIND: SimpleToken<"USE_SECOND_WIND">;
  readonly USE_TIRELESS: SimpleToken<"USE_TIRELESS">;
  readonly USE_SNEAK_ATTACK: SimpleToken<"USE_SNEAK_ATTACK">;
  readonly USE_STEADY_AIM: SimpleToken<"USE_STEADY_AIM">;
  readonly CUNNING_ACTION_DASH: SimpleToken<"CUNNING_ACTION_DASH">;
  readonly CUNNING_ACTION_DISENGAGE: SimpleToken<"CUNNING_ACTION_DISENGAGE">;
  readonly CUNNING_ACTION_HIDE: SimpleToken<"CUNNING_ACTION_HIDE">;
  readonly USE_CLERIC_CHANNEL_DIVINITY: SimpleToken<"USE_CLERIC_CHANNEL_DIVINITY">;
  readonly USE_FONT_SLOT_RESTORE: SimpleToken<"USE_FONT_SLOT_RESTORE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly USE_PALADIN_CHANNEL_DIVINITY: SimpleToken<"USE_PALADIN_CHANNEL_DIVINITY">;
  readonly USE_WILD_RESURGENCE_CHARGE: SimpleToken<"USE_WILD_RESURGENCE_CHARGE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>;
  };
  readonly USE_NATURES_VEIL: SimpleToken<"USE_NATURES_VEIL">;
  readonly USE_BARDIC_INSPIRATION: SimpleToken<"USE_BARDIC_INSPIRATION">;
  readonly USE_PEERLESS_SKILL: SimpleToken<"USE_PEERLESS_SKILL">;
  readonly USE_RELENTLESS_RAGE: SimpleToken<"USE_RELENTLESS_RAGE">;
  readonly SHORT_REST: SimpleToken<"SHORT_REST"> & {
    readonly availableHitDice: ReadonlyArray<{
      readonly className: ClassName;
      readonly remaining: number;
      readonly dieSize: number;
    }>;
  };
  readonly EXIT_COMBAT: SimpleToken<"EXIT_COMBAT">;
};

type CreatureActionToken = TokenByType[SupportedActionType] & {
  readonly scope: "creature";
};
export type BattleActionToken =
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ATTACK";
      readonly targetId: Hole<string>;
      readonly knockOut: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_OFF_HAND_ATTACK";
      readonly targetId: Hole<string>;
      readonly knockOut: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_LEGENDARY_ATTACK";
      readonly abilityId: string;
      readonly targetId: Hole<string>;
      readonly knockOut: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      // FIXME: so we have CreatureActionToken and BattleActionToken. first of all why is the distinction? comes from Quint? secondly, why BATTLE_ACTION_SURGE, BATTLE_ENTER_RAGE etc are Battle action tolens and not Creature action tolens. third, why they exist at all and not are authored content surface?
      readonly type: "BATTLE_ACTION_SURGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ENTER_RAGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DECLARE_RECKLESS";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      // FIXME: this is a good example of a non-authored content: grapple is a very base of the rules to encode directly into core
      readonly type: "BATTLE_GRAPPLE";
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_RELEASE_GRAPPLE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ESCAPE_GRAPPLE";
      readonly escapeSucceeded: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DASH";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DISENGAGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_BONUS_DISENGAGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DODGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_HIDE";
      readonly stealthTotal: Hole<number>;
      readonly hasCoverOrObscurement: Hole<boolean>;
      readonly outOfEnemyLineOfSight: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_BONUS_HIDE";
      readonly stealthTotal: Hole<number>;
      readonly hasCoverOrObscurement: Hole<boolean>;
      readonly outOfEnemyLineOfSight: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_SEARCH";
      readonly targetId: Hole<string>;
      readonly perceptionTotal: Hole<number>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_CAST_AOE";
      readonly spellId: string;
      readonly slotLevel: Hole<SpellSlotLevelValue>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_CAST_SAVE_SPELL";
      readonly spellId: string;
      readonly slotLevel: Hole<SpellSlotLevelValue>;
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MONSTER_SAVE_EFFECT";
      readonly abilityId: string;
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MONSTER_TRAVERSAL";
      readonly abilityId: string;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_WAKE_EFFECT";
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_HELP_ATTACK";
      readonly allyId: Hole<string>;
      readonly targetId: Hole<string>;
      readonly helperWithin5ftOfTarget: Hole<boolean>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MOVE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_PASS";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_RELEASE";
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_SPELL";
      readonly spellName: string;
      readonly slotLevel: Hole<SpellSlotLevelValue>;
      readonly targetId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_SPELL_RELEASE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "STAND_FROM_PRONE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_COUNTERSPELL";
      readonly slotLevel: Hole<SpellSlotLevelValue>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_SHIELD";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_PARRY";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_CUTTING_WORDS";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_REDIRECT_ATTACK";
      readonly allyId: Hole<string>;
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_UNCANNY_DODGE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_DEFLECT_ATTACKS";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_HELLISH_REBUKE";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_RETALIATION";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "TRIGGER_FIRE_SHIELD";
      readonly cost: ResourceCost;
      readonly outcome: OutcomeDescription;
    };
export type ActionToken = CreatureActionToken | BattleActionToken;
type ResolvedTokenByType = {
  readonly ENTER_COMBAT: { readonly type: "ENTER_COMBAT" };
  readonly USE_HEROIC_INSPIRATION: { readonly type: "USE_HEROIC_INSPIRATION" };
  readonly CAST_PREPARED_SPELL: {
    readonly type: "CAST_PREPARED_SPELL";
    readonly spellName: ModeledPreparedSpell;
    readonly slotLevel?: SpellSlotLevelValue;
  };
  readonly START_TURN: { readonly type: "START_TURN" };
  readonly USE_ACTION_SURGE: { readonly type: "USE_ACTION_SURGE" };
  readonly USE_INDOMITABLE: { readonly type: "USE_INDOMITABLE" };
  readonly USE_TACTICAL_MIND: { readonly type: "USE_TACTICAL_MIND" };
  readonly CONVERT_SLOT_TO_POINTS: {
    readonly type: "CONVERT_SLOT_TO_POINTS";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly CONVERT_POINTS_TO_SLOT: {
    readonly type: "CONVERT_POINTS_TO_SLOT";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly ENTER_RAGE: { readonly type: "ENTER_RAGE" };
  readonly END_RAGE: { readonly type: "END_RAGE" };
  readonly EXTEND_RAGE_BA: { readonly type: "EXTEND_RAGE_BA" };
  readonly DECLARE_RECKLESS: { readonly type: "DECLARE_RECKLESS" };
  readonly USE_LAY_ON_HANDS: {
    readonly type: "USE_LAY_ON_HANDS";
    readonly amount: number;
  };
  readonly USE_DIVINE_SMITE: {
    readonly type: "USE_DIVINE_SMITE";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly FLURRY_OF_BLOWS: { readonly type: "FLURRY_OF_BLOWS" };
  readonly PATIENT_DEFENSE_FREE: { readonly type: "PATIENT_DEFENSE_FREE" };
  readonly PATIENT_DEFENSE_FOCUS: { readonly type: "PATIENT_DEFENSE_FOCUS" };
  readonly STEP_OF_THE_WIND_FREE: { readonly type: "STEP_OF_THE_WIND_FREE" };
  readonly STEP_OF_THE_WIND_FOCUS: { readonly type: "STEP_OF_THE_WIND_FOCUS" };
  readonly WHOLENESS_OF_BODY: { readonly type: "WHOLENESS_OF_BODY" };
  readonly UNCANNY_METABOLISM: { readonly type: "UNCANNY_METABOLISM" };
  readonly USE_ARCANE_RECOVERY: {
    readonly type: "USE_ARCANE_RECOVERY";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly USE_OVERCHANNEL: { readonly type: "USE_OVERCHANNEL" };
  readonly USE_METAMAGIC: {
    readonly type: "USE_METAMAGIC";
    readonly option: MetamagicOption;
  };
  readonly USE_INNATE_SORCERY: { readonly type: "USE_INNATE_SORCERY" };
  readonly USE_MAGICAL_CUNNING: { readonly type: "USE_MAGICAL_CUNNING" };
  readonly ENTER_WILD_SHAPE: { readonly type: "ENTER_WILD_SHAPE" };
  readonly EXIT_WILD_SHAPE: { readonly type: "EXIT_WILD_SHAPE" };
  readonly USE_WILD_RESURGENCE_SLOT: {
    readonly type: "USE_WILD_RESURGENCE_SLOT";
  };
  readonly USE_MYSTIC_ARCANUM: {
    readonly type: "USE_MYSTIC_ARCANUM";
    readonly spellLevel: SpellSlotLevelValue;
  };
  readonly USE_SECOND_WIND: { readonly type: "USE_SECOND_WIND" };
  readonly USE_TIRELESS: { readonly type: "USE_TIRELESS" };
  readonly USE_SNEAK_ATTACK: { readonly type: "USE_SNEAK_ATTACK" };
  readonly USE_STEADY_AIM: { readonly type: "USE_STEADY_AIM" };
  readonly CUNNING_ACTION_DASH: { readonly type: "CUNNING_ACTION_DASH" };
  readonly CUNNING_ACTION_DISENGAGE: {
    readonly type: "CUNNING_ACTION_DISENGAGE";
  };
  readonly CUNNING_ACTION_HIDE: { readonly type: "CUNNING_ACTION_HIDE" };
  readonly USE_CLERIC_CHANNEL_DIVINITY: {
    readonly type: "USE_CLERIC_CHANNEL_DIVINITY";
  };
  readonly USE_FONT_SLOT_RESTORE: {
    readonly type: "USE_FONT_SLOT_RESTORE";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly USE_PALADIN_CHANNEL_DIVINITY: {
    readonly type: "USE_PALADIN_CHANNEL_DIVINITY";
  };
  readonly USE_WILD_RESURGENCE_CHARGE: {
    readonly type: "USE_WILD_RESURGENCE_CHARGE";
    readonly slotLevel: SpellSlotLevelValue;
  };
  readonly USE_NATURES_VEIL: { readonly type: "USE_NATURES_VEIL" };
  readonly USE_BARDIC_INSPIRATION: { readonly type: "USE_BARDIC_INSPIRATION" };
  readonly USE_PEERLESS_SKILL: { readonly type: "USE_PEERLESS_SKILL" };
  readonly USE_RELENTLESS_RAGE: { readonly type: "USE_RELENTLESS_RAGE" };
  readonly SHORT_REST: {
    readonly type: "SHORT_REST";
    readonly spendHitDice: ReadonlyArray<ClassName>;
  };
  readonly EXIT_COMBAT: { readonly type: "EXIT_COMBAT" };
};
type CreatureResolvedActionToken = ResolvedTokenByType[SupportedActionType] & {
  readonly scope: "creature";
};
type SpecificBattleResolvedActionToken =
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ATTACK";
      readonly targetId: string;
      readonly knockOut: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_OFF_HAND_ATTACK";
      readonly targetId: string;
      readonly knockOut: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_LEGENDARY_ATTACK";
      readonly abilityId: string;
      readonly targetId: string;
      readonly knockOut: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ACTION_SURGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ENTER_RAGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DECLARE_RECKLESS";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_GRAPPLE";
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_RELEASE_GRAPPLE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_ESCAPE_GRAPPLE";
      readonly escapeSucceeded: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DASH";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DISENGAGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_BONUS_DISENGAGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_DODGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_HIDE";
      readonly stealthTotal: number;
      readonly hasCoverOrObscurement: boolean;
      readonly outOfEnemyLineOfSight: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_BONUS_HIDE";
      readonly stealthTotal: number;
      readonly hasCoverOrObscurement: boolean;
      readonly outOfEnemyLineOfSight: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_SEARCH";
      readonly targetId: string;
      readonly perceptionTotal: number;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_CAST_AOE";
      readonly spellId: string;
      readonly slotLevel: SpellSlotLevelValue;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_CAST_SAVE_SPELL";
      readonly spellId: string;
      readonly slotLevel: SpellSlotLevelValue;
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MONSTER_SAVE_EFFECT";
      readonly abilityId: string;
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MONSTER_TRAVERSAL";
      readonly abilityId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_WAKE_EFFECT";
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_HELP_ATTACK";
      readonly allyId: string;
      readonly targetId: string;
      readonly helperWithin5ftOfTarget: boolean;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_MOVE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_PASS";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_RELEASE";
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_SPELL";
      readonly spellName: string;
      readonly slotLevel: SpellSlotLevelValue;
      readonly targetId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "BATTLE_READY_SPELL_RELEASE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "STAND_FROM_PRONE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_COUNTERSPELL";
      readonly slotLevel: SpellSlotLevelValue;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_SHIELD";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_PARRY";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_CUTTING_WORDS";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_REDIRECT_ATTACK";
      readonly allyId: string;
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_UNCANNY_DODGE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_DEFLECT_ATTACKS";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "CAST_HELLISH_REBUKE";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "USE_RETALIATION";
    }
  | {
      readonly scope: "battle";
      readonly actorId: string;
      readonly type: "TRIGGER_FIRE_SHIELD";
    };

export type BattleResolvedActionToken = SpecificBattleResolvedActionToken;
export type ResolvedActionToken =
  | CreatureResolvedActionToken
  | BattleResolvedActionToken;

export const CREATURE_CONTROL_COMMAND_TYPES = [
  "END_TURN",
  "LONG_REST",
] as const satisfies ReadonlyArray<DndEvent["type"]>;
export type CreatureControlCommandType =
  (typeof CREATURE_CONTROL_COMMAND_TYPES)[number];

export const BATTLE_CONTROL_COMMAND_TYPES = [
  "BATTLE_INIT",
  "BATTLE_ADD_CREATURE",
  "BATTLE_REMOVE_CREATURE",
  "BATTLE_START_TURN",
  "BATTLE_END_TURN",
  "BATTLE_LEGENDARY_PASS",
  "USE_LEGENDARY_ACTION",
  "USE_RECHARGE_ABILITY",
  "USE_DAILY_ABILITY",
] as const satisfies ReadonlyArray<BattleEvent["type"]>;
export type BattleControlCommandType =
  (typeof BATTLE_CONTROL_COMMAND_TYPES)[number];

export const CREATURE_DAMAGE_RECOVERY_TABLE_EVENT_TYPES = [
  "TAKE_DAMAGE",
  "HEAL",
  "GRANT_TEMP_HP",
  "STABILIZE",
  "KNOCK_OUT",
] as const satisfies ReadonlyArray<DndEvent["type"]>;
export type CreatureDamageRecoveryTableEventType =
  (typeof CREATURE_DAMAGE_RECOVERY_TABLE_EVENT_TYPES)[number];

export const CREATURE_CONDITION_EXHAUSTION_TABLE_EVENT_TYPES = [
  "APPLY_CONDITION",
  "REMOVE_CONDITION",
  "ADD_EXHAUSTION",
  "REDUCE_EXHAUSTION",
] as const satisfies ReadonlyArray<DndEvent["type"]>;
export type CreatureConditionExhaustionTableEventType =
  (typeof CREATURE_CONDITION_EXHAUSTION_TABLE_EVENT_TYPES)[number];

export const CREATURE_ENVIRONMENTAL_TABLE_EVENT_TYPES = [
  "APPLY_FALL",
] as const satisfies ReadonlyArray<DndEvent["type"]>;
export type CreatureEnvironmentalTableEventType =
  (typeof CREATURE_ENVIRONMENTAL_TABLE_EVENT_TYPES)[number];

export const CREATURE_HAZARD_TABLE_EVENT_TYPES = [
  "RECORD_HOLD_BREATH_EXPIRED",
  "RECORD_DAILY_FOOD_INTAKE",
  "RECORD_DAILY_WATER_INTAKE",
] as const;
export type CreatureHazardTableEventType =
  (typeof CREATURE_HAZARD_TABLE_EVENT_TYPES)[number];

export const DAILY_FOOD_INTAKE_KINDS = [
  "full",
  "atLeastHalf",
  "lessThanHalf",
  "none",
] as const;
export type DailyFoodIntakeKind = (typeof DAILY_FOOD_INTAKE_KINDS)[number];

export const DAILY_WATER_INTAKE_KINDS = [
  "full",
  "atLeastHalf",
  "lessThanHalf",
] as const;
export type DailyWaterIntakeKind = (typeof DAILY_WATER_INTAKE_KINDS)[number];

export const CREATURE_CONCENTRATION_TABLE_EVENT_TYPES = [
  "BREAK_CONCENTRATION",
] as const satisfies ReadonlyArray<DndEvent["type"]>;
export type CreatureConcentrationTableEventType =
  (typeof CREATURE_CONCENTRATION_TABLE_EVENT_TYPES)[number];

export const CREATURE_SEMANTIC_TRIGGER_TABLE_EVENT_TYPES = [
  "RECORD_FAILED_SAVING_THROW",
  "RECORD_FAILED_ABILITY_CHECK",
] as const;
export type CreatureSemanticTriggerTableEventType =
  (typeof CREATURE_SEMANTIC_TRIGGER_TABLE_EVENT_TYPES)[number];

export const CREATURE_TABLE_EVENT_TYPES = [
  ...CREATURE_DAMAGE_RECOVERY_TABLE_EVENT_TYPES,
  ...CREATURE_CONDITION_EXHAUSTION_TABLE_EVENT_TYPES,
  ...CREATURE_ENVIRONMENTAL_TABLE_EVENT_TYPES,
  ...CREATURE_HAZARD_TABLE_EVENT_TYPES,
  ...CREATURE_CONCENTRATION_TABLE_EVENT_TYPES,
  ...CREATURE_SEMANTIC_TRIGGER_TABLE_EVENT_TYPES,
] as const;
export type CreatureTableEventType =
  (typeof CREATURE_TABLE_EVENT_TYPES)[number];

const BATTLE_HEAL_TABLE_EVENT_TYPES = [
  "BATTLE_HEAL",
] as const satisfies ReadonlyArray<BattleEvent["type"]>;
export const BATTLE_TABLE_EVENT_TYPES = [
  ...BATTLE_HEAL_TABLE_EVENT_TYPES,
] as const satisfies ReadonlyArray<BattleEvent["type"]>;
export type BattleTableEventType = (typeof BATTLE_TABLE_EVENT_TYPES)[number];

export const TABLE_EVENT_WARNING_CODES = [
  "bypasses_semantic_action",
  "external_table_fact",
  "unsupported_domain_gap",
] as const satisfies ReadonlyArray<string>;
export type TableEventWarningCode = (typeof TABLE_EVENT_WARNING_CODES)[number];

export type TableEventWarning = {
  readonly code: TableEventWarningCode;
  readonly message: string;
};

function formatConciseSchemaValue(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readSchemaStringField(
  value: unknown,
  key: string,
): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const field = Reflect.get(value, key);
  return typeof field === "string" ? field : undefined;
}

function conciseBattleInitCreatureConfigMessage(issue: {
  readonly actual?: unknown;
}) {
  const kind = readSchemaStringField(issue.actual, "kind");
  return {
    message: `Invalid BATTLE_INIT creature config.${kind ? ` Received kind: ${JSON.stringify(kind)}.` : ` Received: ${formatConciseSchemaValue(issue.actual)}.`} Use either a raw creature config with maxHp and kind, or a Monster catalog config with statBlockId.`,
    override: true,
  };
}

const EnterCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_COMBAT"),
});
const UseHeroicInspirationResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_HEROIC_INSPIRATION"),
});
const CastPreparedSpellResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CAST_PREPARED_SPELL"),
  spellName: ModeledPreparedSpellSchema,
  slotLevel: Schema.optional(SpellSlotLevel),
});
const StartTurnResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("START_TURN"),
});
const UseActionSurgeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_ACTION_SURGE"),
});
const UseIndomitableResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_INDOMITABLE"),
});
const UseTacticalMindResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_TACTICAL_MIND"),
});
const ConvertSlotToPointsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CONVERT_SLOT_TO_POINTS"),
  slotLevel: SpellSlotLevel,
});
const ConvertPointsToSlotResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CONVERT_POINTS_TO_SLOT"),
  slotLevel: SpellSlotLevel,
});
const EnterRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_RAGE"),
});
const EndRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("END_RAGE"),
});
const ExtendRageBAResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXTEND_RAGE_BA"),
});
const DeclareRecklessResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("DECLARE_RECKLESS"),
});
const UseLayOnHandsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_LAY_ON_HANDS"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
});
const UseDivineSmiteResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_DIVINE_SMITE"),
  slotLevel: SpellSlotLevel,
});
const FlurryOfBlowsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("FLURRY_OF_BLOWS"),
});
const PatientDefenseFreeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("PATIENT_DEFENSE_FREE"),
});
const PatientDefenseFocusResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("PATIENT_DEFENSE_FOCUS"),
});
const StepOfTheWindFreeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("STEP_OF_THE_WIND_FREE"),
});
const StepOfTheWindFocusResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("STEP_OF_THE_WIND_FOCUS"),
});
const WholenessOfBodyResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("WHOLENESS_OF_BODY"),
});
const UncannyMetabolismResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("UNCANNY_METABOLISM"),
});
const UseArcaneRecoveryResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_ARCANE_RECOVERY"),
  slotLevel: SpellSlotLevel,
});
const UseOverchannelResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_OVERCHANNEL"),
});
const UseMetamagicResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_METAMAGIC"),
  option: MetamagicOptionSchema,
});
const UseInnateSorceryResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_INNATE_SORCERY"),
});
const UseMagicalCunningResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_MAGICAL_CUNNING"),
});
const EnterWildShapeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_WILD_SHAPE"),
});
const ExitWildShapeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXIT_WILD_SHAPE"),
});
const UseWildResurgenceSlotResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_WILD_RESURGENCE_SLOT"),
});
const UseMysticArcanumResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_MYSTIC_ARCANUM"),
  spellLevel: SpellSlotLevel,
});
const UseSecondWindResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_SECOND_WIND"),
});
const UseTirelessResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_TIRELESS"),
});
const UseSneakAttackResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_SNEAK_ATTACK"),
});
const UseSteadyAimResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_STEADY_AIM"),
});
const CunningActionDashResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_DASH"),
});
const CunningActionDisengageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_DISENGAGE"),
});
const CunningActionHideResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_HIDE"),
});
const UseClericChannelDivinityResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_CLERIC_CHANNEL_DIVINITY"),
});
const UseFontSlotRestoreResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_FONT_SLOT_RESTORE"),
  slotLevel: SpellSlotLevel,
});
const UsePaladinChannelDivinityResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_PALADIN_CHANNEL_DIVINITY"),
});
const UseWildResurgenceChargeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_WILD_RESURGENCE_CHARGE"),
  slotLevel: SpellSlotLevel,
});
const UseNaturesVeilResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_NATURES_VEIL"),
});
const UseBardicInspirationResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_BARDIC_INSPIRATION"),
});
const UsePeerlessSkillResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_PEERLESS_SKILL"),
});
const UseRelentlessRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_RELENTLESS_RAGE"),
});
const ShortRestResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("SHORT_REST"),
  spendHitDice: Schema.Array(Schema.Literal(...CLASS_NAMES)),
});
const ExitCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXIT_COMBAT"),
});

const PrimaryCreatureResolvedActionTokenSchema = Schema.Union(
  EnterCombatResolvedActionSchema,
  UseHeroicInspirationResolvedActionSchema,
  CastPreparedSpellResolvedActionSchema,
  StartTurnResolvedActionSchema,
  UseActionSurgeResolvedActionSchema,
  UseIndomitableResolvedActionSchema,
  UseTacticalMindResolvedActionSchema,
  ConvertSlotToPointsResolvedActionSchema,
  ConvertPointsToSlotResolvedActionSchema,
  EnterRageResolvedActionSchema,
  EndRageResolvedActionSchema,
  ExtendRageBAResolvedActionSchema,
  DeclareRecklessResolvedActionSchema,
  UseLayOnHandsResolvedActionSchema,
  UseDivineSmiteResolvedActionSchema,
  FlurryOfBlowsResolvedActionSchema,
  PatientDefenseFreeResolvedActionSchema,
  PatientDefenseFocusResolvedActionSchema,
  StepOfTheWindFreeResolvedActionSchema,
  StepOfTheWindFocusResolvedActionSchema,
  WholenessOfBodyResolvedActionSchema,
  UncannyMetabolismResolvedActionSchema,
).pipe(Schema.attachPropertySignature("scope", "creature"));

const SecondaryCreatureResolvedActionTokenSchema = Schema.Union(
  UseArcaneRecoveryResolvedActionSchema,
  UseOverchannelResolvedActionSchema,
  UseMetamagicResolvedActionSchema,
  UseInnateSorceryResolvedActionSchema,
  UseMagicalCunningResolvedActionSchema,
  EnterWildShapeResolvedActionSchema,
  ExitWildShapeResolvedActionSchema,
  UseWildResurgenceSlotResolvedActionSchema,
  UseMysticArcanumResolvedActionSchema,
  UseSecondWindResolvedActionSchema,
  UseTirelessResolvedActionSchema,
  UseSneakAttackResolvedActionSchema,
  UseSteadyAimResolvedActionSchema,
  CunningActionDashResolvedActionSchema,
  CunningActionDisengageResolvedActionSchema,
  CunningActionHideResolvedActionSchema,
  UseClericChannelDivinityResolvedActionSchema,
  UseFontSlotRestoreResolvedActionSchema,
  UsePaladinChannelDivinityResolvedActionSchema,
  UseWildResurgenceChargeResolvedActionSchema,
  UseNaturesVeilResolvedActionSchema,
  UseBardicInspirationResolvedActionSchema,
  UsePeerlessSkillResolvedActionSchema,
  UseRelentlessRageResolvedActionSchema,
  ShortRestResolvedActionSchema,
  ExitCombatResolvedActionSchema,
).pipe(Schema.attachPropertySignature("scope", "creature"));

const CastCounterspellBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("CAST_COUNTERSPELL"),
  slotLevel: SpellSlotLevel,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleAttackResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_ATTACK"),
  targetId: Schema.String,
  knockOut: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleOffHandAttackResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_OFF_HAND_ATTACK"),
  targetId: Schema.String,
  knockOut: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleLegendaryAttackResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_LEGENDARY_ATTACK"),
  abilityId: Schema.String,
  targetId: Schema.String,
  knockOut: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleActionSurgeResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_ACTION_SURGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleEnterRageResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_ENTER_RAGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleDeclareRecklessResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_DECLARE_RECKLESS"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleGrappleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_GRAPPLE"),
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReleaseGrappleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_RELEASE_GRAPPLE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleEscapeGrappleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_ESCAPE_GRAPPLE"),
  escapeSucceeded: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleDashResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_DASH"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleDisengageResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_DISENGAGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleBonusDisengageResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_BONUS_DISENGAGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleDodgeResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_DODGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleHideResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_HIDE"),
  stealthTotal: Schema.Number,
  hasCoverOrObscurement: Schema.Boolean,
  outOfEnemyLineOfSight: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleBonusHideResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_BONUS_HIDE"),
  stealthTotal: Schema.Number,
  hasCoverOrObscurement: Schema.Boolean,
  outOfEnemyLineOfSight: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleSearchResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_SEARCH"),
  targetId: Schema.String,
  perceptionTotal: Schema.Number,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleCastAoeResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_CAST_AOE"),
  spellId: Schema.String,
  slotLevel: SpellSlotLevel,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleCastSaveSpellResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_CAST_SAVE_SPELL"),
  spellId: Schema.String,
  slotLevel: SpellSlotLevel,
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleMonsterSaveEffectResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_MONSTER_SAVE_EFFECT"),
  abilityId: Schema.String,
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleMonsterTraversalResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_MONSTER_TRAVERSAL"),
  abilityId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleWakeEffectResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_WAKE_EFFECT"),
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleHelpAttackResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_HELP_ATTACK"),
  allyId: Schema.String,
  targetId: Schema.String,
  helperWithin5ftOfTarget: Schema.Boolean,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleMoveResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_MOVE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReadyResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_READY"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReadyPassResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_READY_PASS"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReadyReleaseResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_READY_RELEASE"),
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReadySpellResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_READY_SPELL"),
  spellName: Schema.String,
  slotLevel: SpellSlotLevel,
  targetId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleReadySpellReleaseResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("BATTLE_READY_SPELL_RELEASE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const StandFromProneBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("STAND_FROM_PRONE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const CastShieldBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("CAST_SHIELD"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseParryBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_PARRY"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseCuttingWordsBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_CUTTING_WORDS"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseRedirectAttackBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_REDIRECT_ATTACK"),
  allyId: Schema.String,
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseUncannyDodgeBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_UNCANNY_DODGE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseDeflectAttacksBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_DEFLECT_ATTACKS"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const CastHellishRebukeBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("CAST_HELLISH_REBUKE"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const UseRetaliationBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("USE_RETALIATION"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const TriggerFireShieldBattleResolvedActionSchema = Schema.Struct({
  actorId: Schema.String,
  type: Schema.Literal("TRIGGER_FIRE_SHIELD"),
}).pipe(Schema.attachPropertySignature("scope", "battle"));

const BattleResolvedActionTokenSchema = Schema.Union(
  BattleAttackResolvedActionSchema,
  BattleOffHandAttackResolvedActionSchema,
  BattleLegendaryAttackResolvedActionSchema,
  BattleActionSurgeResolvedActionSchema,
  BattleEnterRageResolvedActionSchema,
  BattleDeclareRecklessResolvedActionSchema,
  BattleGrappleResolvedActionSchema,
  BattleReleaseGrappleResolvedActionSchema,
  BattleEscapeGrappleResolvedActionSchema,
  BattleDashResolvedActionSchema,
  BattleDisengageResolvedActionSchema,
  BattleBonusDisengageResolvedActionSchema,
  BattleDodgeResolvedActionSchema,
  BattleHideResolvedActionSchema,
  BattleBonusHideResolvedActionSchema,
  BattleSearchResolvedActionSchema,
  BattleCastAoeResolvedActionSchema,
  BattleCastSaveSpellResolvedActionSchema,
  BattleMonsterSaveEffectResolvedActionSchema,
  BattleMonsterTraversalResolvedActionSchema,
  BattleWakeEffectResolvedActionSchema,
  BattleHelpAttackResolvedActionSchema,
  BattleMoveResolvedActionSchema,
  BattleReadyResolvedActionSchema,
  BattleReadyPassResolvedActionSchema,
  BattleReadyReleaseResolvedActionSchema,
  BattleReadySpellResolvedActionSchema,
  BattleReadySpellReleaseResolvedActionSchema,
  StandFromProneBattleResolvedActionSchema,
  CastCounterspellBattleResolvedActionSchema,
  CastShieldBattleResolvedActionSchema,
  UseParryBattleResolvedActionSchema,
  UseCuttingWordsBattleResolvedActionSchema,
  UseRedirectAttackBattleResolvedActionSchema,
  UseUncannyDodgeBattleResolvedActionSchema,
  UseDeflectAttacksBattleResolvedActionSchema,
  CastHellishRebukeBattleResolvedActionSchema,
  UseRetaliationBattleResolvedActionSchema,
  TriggerFireShieldBattleResolvedActionSchema,
);

export const RESOLVED_ACTION_SCHEMAS = [
  PrimaryCreatureResolvedActionTokenSchema,
  SecondaryCreatureResolvedActionTokenSchema,
  BattleResolvedActionTokenSchema,
] as const;
export const ResolvedActionTokenSchema = Schema.Union(
  PrimaryCreatureResolvedActionTokenSchema,
  SecondaryCreatureResolvedActionTokenSchema,
  BattleResolvedActionTokenSchema,
);

const CreatureEndTurnControlSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("END_TURN"),
});
const CreatureLongRestControlSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("LONG_REST"),
});

const BattleWeaponProfileSchema = Schema.Struct({
  name: Schema.String,
  damageType: Schema.Literal(...DAMAGE_TYPES),
  isMelee: Schema.Boolean,
  properties: Schema.Set(Schema.Literal(...WEAPON_PROPERTIES)),
  diceCount: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  damageDie: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  versatileDie: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  damageQualifiers: Schema.optional(
    Schema.Set(Schema.Literal(...DAMAGE_QUALIFIERS)),
  ),
});

const BattleInitRawCreatureConfigSchema = Schema.Struct({
  id: Schema.String,
  maxHp: Schema.Number.pipe(Schema.int(), Schema.positive()),
  maxHpReduction: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  kind: Schema.Literal(...CREATURE_KINDS),
  creatureSize: Schema.optional(Schema.Literal(...SIZES)),
  baseArmorClass: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  ),
  caster: Schema.optional(Schema.Boolean),
  rogueLevel: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  monkLevel: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  strMod: Schema.optional(Schema.Number.pipe(Schema.int())),
  dexMod: Schema.optional(Schema.Number.pipe(Schema.int())),
  legendaryActions: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  legendaryResistances: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  hasEvasion: Schema.optional(Schema.Boolean),
  saveMiscBonus: Schema.optional(Schema.Number.pipe(Schema.int())),
  saveAdvantageContexts: Schema.optional(
    Schema.Set(Schema.Literal(...MONSTER_SAVE_TRIGGER_KINDS)),
  ),
  critRange: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
  ),
  isWearingArmor: Schema.optional(Schema.Boolean),
  defenseArmorClassBonus: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  greatWeaponFightingDamageFloor: Schema.optional(Schema.Boolean),
  hiddenDiscoveryDc: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  rangedWeaponAttackRollBonus: Schema.optional(
    Schema.Number.pipe(Schema.int()),
  ),
  fighterLevel: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  barbarianLevel: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  meleeDamageBonus: Schema.optional(Schema.Number.pipe(Schema.int())),
  sneakAttackDice: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  bardLevel: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  bardicInspirationCharges: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  parryAcBonus: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  lightPropertyExtraAttackAddsAbilityModifier: Schema.optional(Schema.Boolean),
  prone: Schema.optional(Schema.Boolean),
  baseWalkSpeed: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  initiativeRoll: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
  ),
  initiativeRollB: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
  ),
  surprised: Schema.optional(Schema.Boolean),
  hasShieldEquipped: Schema.optional(Schema.Boolean),
  mainHandUsesTwoHands: Schema.optional(Schema.Boolean),
  mainHandWeapon: Schema.optional(BattleWeaponProfileSchema),
  offHandWeapon: Schema.optional(BattleWeaponProfileSchema),
  battleBonusActionOptions: Schema.optional(
    Schema.Array(Schema.Literal(...MONSTER_BATTLE_BONUS_ACTION_OPTIONS)),
  ),
});
const BattleInitCatalogCreatureConfigSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("Monster"),
  statBlockId: Schema.Literal(...MONSTER_STAT_BLOCK_IDS),
  initiativeRoll: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
  ),
  initiativeRollB: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
  ),
  surprised: Schema.optional(Schema.Boolean),
});
export const BattleInitCreatureConfigSchema = Schema.Union(
  BattleInitRawCreatureConfigSchema,
  BattleInitCatalogCreatureConfigSchema,
).annotations({
  message: conciseBattleInitCreatureConfigMessage,
});
const BattleInitControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_INIT"),
  creatures: Schema.NonEmptyArray(BattleInitCreatureConfigSchema),
});
const BattleAddCreatureControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_ADD_CREATURE"),
  creatures: Schema.NonEmptyArray(BattleInitCreatureConfigSchema),
  insertAtIndex: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
});
const BattleRemoveCreatureControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_REMOVE_CREATURE"),
  creatureIds: Schema.NonEmptyArray(Schema.String),
});
const BattleStartTurnControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_START_TURN"),
  rechargeD6: Schema.Number.pipe(Schema.int(), Schema.between(1, 6)),
  sotDmg: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  sotDt: Schema.Literal(...DAMAGE_TYPES),
  sotHeal: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  sotSaveResult: Schema.Boolean,
  sotConSave: Schema.Boolean,
  deathSaveRoll: Schema.Number.pipe(Schema.int(), Schema.between(0, 20)),
});
const BattleEndTurnControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_END_TURN"),
  eotSaveSucceeded: Schema.Boolean,
  eotDmg: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  eotDt: Schema.Literal(...DAMAGE_TYPES),
  eotConSave: Schema.Boolean,
});
const BattleLegendaryPassControlSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal("BATTLE_LEGENDARY_PASS"),
});
const BattleMonsterAbilityControlFields = {
  scope: Schema.Literal("battle"),
  monsterId: Schema.String,
  abilityId: Schema.String,
} as const;
const BattleUseLegendaryActionControlSchema = Schema.Struct({
  ...BattleMonsterAbilityControlFields,
  type: Schema.Literal("USE_LEGENDARY_ACTION"),
});
const BattleUseRechargeAbilityControlSchema = Schema.Struct({
  ...BattleMonsterAbilityControlFields,
  type: Schema.Literal("USE_RECHARGE_ABILITY"),
});
const BattleUseDailyAbilityControlSchema = Schema.Struct({
  ...BattleMonsterAbilityControlFields,
  type: Schema.Literal("USE_DAILY_ABILITY"),
});

export const ControlCommandSchema = Schema.Union(
  CreatureEndTurnControlSchema,
  CreatureLongRestControlSchema,
  BattleInitControlSchema,
  BattleAddCreatureControlSchema,
  BattleRemoveCreatureControlSchema,
  BattleStartTurnControlSchema,
  BattleEndTurnControlSchema,
  BattleLegendaryPassControlSchema,
  BattleUseLegendaryActionControlSchema,
  BattleUseRechargeAbilityControlSchema,
  BattleUseDailyAbilityControlSchema,
);
const CONTROL_COMMAND_SCHEMA_BY_TYPE = {
  END_TURN: CreatureEndTurnControlSchema,
  LONG_REST: CreatureLongRestControlSchema,
  BATTLE_INIT: BattleInitControlSchema,
  BATTLE_ADD_CREATURE: BattleAddCreatureControlSchema,
  BATTLE_REMOVE_CREATURE: BattleRemoveCreatureControlSchema,
  BATTLE_START_TURN: BattleStartTurnControlSchema,
  BATTLE_END_TURN: BattleEndTurnControlSchema,
  BATTLE_LEGENDARY_PASS: BattleLegendaryPassControlSchema,
  USE_LEGENDARY_ACTION: BattleUseLegendaryActionControlSchema,
  USE_RECHARGE_ABILITY: BattleUseRechargeAbilityControlSchema,
  USE_DAILY_ABILITY: BattleUseDailyAbilityControlSchema,
} as const;
export type ControlCommand = Schema.Schema.Type<typeof ControlCommandSchema>;
export type BattleInitControlCreatureConfig = Schema.Schema.Type<
  typeof BattleInitCreatureConfigSchema
>;

export function controlCommandSchemaForType(
  type: string,
): typeof ControlCommandSchema {
  return CONTROL_COMMAND_SCHEMA_BY_TYPE[
    type as keyof typeof CONTROL_COMMAND_SCHEMA_BY_TYPE
  ] as unknown as typeof ControlCommandSchema;
}

export function toBattleInitCreatureConfig(
  config: BattleInitControlCreatureConfig,
): InitCreatureConfig {
  if ("statBlockId" in config) {
    return monsterCatalogInitCreatureConfig({
      id: CreatureId(config.id),
      statBlockId: config.statBlockId,
      initiativeRoll: config.initiativeRoll,
      initiativeRollB: config.initiativeRollB,
      surprised: config.surprised,
    });
  }
  const { baseArmorClass: rawBaseArmorClass, ...rest } = config;
  return {
    ...rest,
    id: CreatureId(config.id),
    ...(rawBaseArmorClass == null
      ? {}
      : { baseArmorClass: armorClass(rawBaseArmorClass) }),
  };
}

const TableEventSemanticActionSchema = Schema.Struct({
  kind: Schema.Literal("spell", "feature"),
  name: Schema.String,
});
const TableEventDamageTypeSetSchema = Schema.Array(
  Schema.Literal(...DAMAGE_TYPES),
);
const TableEventDamageModifiersSchema = {
  resistances: Schema.optional(TableEventDamageTypeSetSchema),
  vulnerabilities: Schema.optional(TableEventDamageTypeSetSchema),
  immunities: Schema.optional(TableEventDamageTypeSetSchema),
} as const;
const TableEventSemanticActionField = {
  semanticAction: Schema.optional(TableEventSemanticActionSchema),
} as const;
const CreatureTakeDamageTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("TAKE_DAMAGE"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  damageType: Schema.Literal(...DAMAGE_TYPES),
  isCritical: Schema.optional(Schema.Boolean),
  ...TableEventDamageModifiersSchema,
  ...TableEventSemanticActionField,
});
const CreatureHealTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("HEAL"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  ...TableEventSemanticActionField,
});
const CreatureGrantTempHpTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("GRANT_TEMP_HP"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  keepOld: Schema.Boolean,
  ...TableEventSemanticActionField,
});
const CreatureStabilizeTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("STABILIZE"),
  ...TableEventSemanticActionField,
});
const CreatureKnockOutTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("KNOCK_OUT"),
  ...TableEventSemanticActionField,
});
const ConditionSchema = Schema.Literal(...CONDITIONS);
const ConditionImmunitiesField = {
  conditionImmunities: Schema.optional(Schema.Array(ConditionSchema)),
} as const;
const CreatureApplyConditionTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("APPLY_CONDITION"),
  condition: ConditionSchema,
  ...ConditionImmunitiesField,
  ...TableEventSemanticActionField,
});
const CreatureRemoveConditionTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("REMOVE_CONDITION"),
  condition: ConditionSchema,
  ...TableEventSemanticActionField,
});
const CreatureAddExhaustionTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("ADD_EXHAUSTION"),
  levels: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(6),
  ),
  exhaustionImmune: Schema.optional(Schema.Boolean),
  ...TableEventSemanticActionField,
});
const CreatureReduceExhaustionTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("REDUCE_EXHAUSTION"),
  levels: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(6),
  ),
  ...TableEventSemanticActionField,
});
const CreatureApplyFallTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("APPLY_FALL"),
  damageRoll: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ...TableEventDamageModifiersSchema,
  ...TableEventSemanticActionField,
});
const CreatureBreakConcentrationTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("BREAK_CONCENTRATION"),
  ...TableEventSemanticActionField,
});
const CreatureRecordFailedSavingThrowTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("RECORD_FAILED_SAVING_THROW"),
});
const CreatureRecordFailedAbilityCheckTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("RECORD_FAILED_ABILITY_CHECK"),
});
const CreatureRecordHoldBreathExpiredTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("RECORD_HOLD_BREATH_EXPIRED"),
  ...TableEventSemanticActionField,
});
const CreatureRecordDailyFoodIntakeTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("RECORD_DAILY_FOOD_INTAKE"),
  intake: Schema.Literal(...DAILY_FOOD_INTAKE_KINDS),
  conSaveSucceeded: Schema.optional(Schema.Boolean),
  ...TableEventSemanticActionField,
});
const CreatureRecordDailyWaterIntakeTableEventSchema = Schema.Struct({
  scope: Schema.Literal("creature"),
  type: Schema.Literal("RECORD_DAILY_WATER_INTAKE"),
  intake: Schema.Literal(...DAILY_WATER_INTAKE_KINDS),
  ...TableEventSemanticActionField,
});
const BattleHealTableEventSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  type: Schema.Literal(...BATTLE_HEAL_TABLE_EVENT_TYPES),
  targetId: Schema.String,
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  ...TableEventSemanticActionField,
});
const BattleTableEventSchema = BattleHealTableEventSchema;

export const TableEventCommandSchema = Schema.Union(
  CreatureTakeDamageTableEventSchema,
  CreatureHealTableEventSchema,
  CreatureGrantTempHpTableEventSchema,
  CreatureStabilizeTableEventSchema,
  CreatureKnockOutTableEventSchema,
  CreatureApplyConditionTableEventSchema,
  CreatureRemoveConditionTableEventSchema,
  CreatureAddExhaustionTableEventSchema,
  CreatureReduceExhaustionTableEventSchema,
  CreatureApplyFallTableEventSchema,
  CreatureBreakConcentrationTableEventSchema,
  CreatureRecordFailedSavingThrowTableEventSchema,
  CreatureRecordFailedAbilityCheckTableEventSchema,
  CreatureRecordHoldBreathExpiredTableEventSchema,
  CreatureRecordDailyFoodIntakeTableEventSchema,
  CreatureRecordDailyWaterIntakeTableEventSchema,
  BattleTableEventSchema,
);
const TABLE_EVENT_COMMAND_SCHEMA_BY_TYPE = {
  TAKE_DAMAGE: CreatureTakeDamageTableEventSchema,
  HEAL: CreatureHealTableEventSchema,
  GRANT_TEMP_HP: CreatureGrantTempHpTableEventSchema,
  STABILIZE: CreatureStabilizeTableEventSchema,
  KNOCK_OUT: CreatureKnockOutTableEventSchema,
  APPLY_CONDITION: CreatureApplyConditionTableEventSchema,
  REMOVE_CONDITION: CreatureRemoveConditionTableEventSchema,
  ADD_EXHAUSTION: CreatureAddExhaustionTableEventSchema,
  REDUCE_EXHAUSTION: CreatureReduceExhaustionTableEventSchema,
  APPLY_FALL: CreatureApplyFallTableEventSchema,
  BREAK_CONCENTRATION: CreatureBreakConcentrationTableEventSchema,
  RECORD_FAILED_SAVING_THROW: CreatureRecordFailedSavingThrowTableEventSchema,
  RECORD_FAILED_ABILITY_CHECK: CreatureRecordFailedAbilityCheckTableEventSchema,
  RECORD_HOLD_BREATH_EXPIRED: CreatureRecordHoldBreathExpiredTableEventSchema,
  RECORD_DAILY_FOOD_INTAKE: CreatureRecordDailyFoodIntakeTableEventSchema,
  RECORD_DAILY_WATER_INTAKE: CreatureRecordDailyWaterIntakeTableEventSchema,
  BATTLE_HEAL: BattleHealTableEventSchema,
} as const;
export type TableEventCommand = Schema.Schema.Type<
  typeof TableEventCommandSchema
>;

export function tableEventCommandSchemaForType(
  type: string,
): typeof TableEventCommandSchema {
  return TABLE_EVENT_COMMAND_SCHEMA_BY_TYPE[
    type as keyof typeof TABLE_EVENT_COMMAND_SCHEMA_BY_TYPE
  ] as unknown as typeof TableEventCommandSchema;
}

export type RecordTableEventAppliedResult<State> = {
  readonly success: true;
  readonly appliedEvent: TableEventCommand;
  readonly warnings: ReadonlyArray<TableEventWarning>;
  readonly state: State;
};

export type RecordTableEventUnsupportedResult<State> = {
  readonly success: false;
  readonly appliedEvent: null;
  readonly warnings: ReadonlyArray<TableEventWarning>;
  readonly state: State;
  readonly error: {
    readonly code: "TABLE_EVENT_NOT_IMPLEMENTED";
    readonly message: string;
    readonly event: TableEventCommand;
  };
};

export type RecordTableEventNotAcceptedResult<State> = {
  readonly success: false;
  readonly appliedEvent: null;
  readonly warnings: ReadonlyArray<TableEventWarning>;
  readonly state: State;
  readonly error: {
    readonly code: "TABLE_EVENT_NOT_ACCEPTED";
    readonly message: string;
    readonly event: TableEventCommand;
  };
};

export type RecordTableEventResult<State> =
  | RecordTableEventAppliedResult<State>
  | RecordTableEventUnsupportedResult<State>
  | RecordTableEventNotAcceptedResult<State>;

export type StartTurnRuntimeInputs = {
  readonly extraAttacks?: number;
  readonly deathSaveRoll?: D20Roll;
  readonly deathSaveRoll2?: D20Roll;
  readonly rechargedAbilities?: ReadonlyArray<string>;
};

export type UseSecondWindRuntimeInputs = {
  readonly d10Roll: number;
};

export type UseActionSurgeRuntimeInputs = Record<string, never>;

export type UseTacticalMindRuntimeInputs = {
  readonly boostedCheckSucceeds: boolean;
};

export type WholenessOfBodyRuntimeInputs = {
  readonly healRoll: number;
};

export type UncannyMetabolismRuntimeInputs = {
  readonly healRoll: number;
};

export type UseTirelessRuntimeInputs = {
  readonly d8Roll: number;
};

export type UsePeerlessSkillRuntimeInputs = {
  readonly success: boolean;
};

export type UseRelentlessRageRuntimeInputs = {
  readonly conSaveSucceeded: boolean;
};

export type ShortRestRuntimeInputs = {
  readonly hdRolls: ReadonlyArray<{
    readonly className: ClassName;
    readonly roll: number;
  }>;
};

export type ResolutionRequest =
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "ENTER_COMBAT" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "ENTER_COMBAT" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_HEROIC_INSPIRATION" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_HEROIC_INSPIRATION" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CAST_PREPARED_SPELL" }
      >;
      readonly outcome: string;
      readonly runtime: "none" | "projectedPreparedSpell";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CAST_PREPARED_SPELL" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "START_TURN" }
      >;
      readonly outcome: string;
      readonly runtime: "startTurn";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_ACTION_SURGE" }
      >;
      readonly outcome: string;
      readonly runtime: "actionSurge";
      readonly event: Extract<DndEvent, { readonly type: "USE_ACTION_SURGE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_INDOMITABLE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_INDOMITABLE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_TACTICAL_MIND" }
      >;
      readonly outcome: string;
      readonly runtime: "tacticalMind";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CONVERT_SLOT_TO_POINTS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CONVERT_SLOT_TO_POINTS" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CONVERT_POINTS_TO_SLOT" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CONVERT_POINTS_TO_SLOT" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "ENTER_RAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "ENTER_RAGE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "END_RAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "END_RAGE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "EXTEND_RAGE_BA" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "EXTEND_RAGE_BA" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "DECLARE_RECKLESS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "DECLARE_RECKLESS" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_LAY_ON_HANDS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_LAY_ON_HANDS" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_DIVINE_SMITE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_DIVINE_SMITE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "FLURRY_OF_BLOWS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "FLURRY_OF_BLOWS" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "PATIENT_DEFENSE_FREE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "PATIENT_DEFENSE_FREE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "PATIENT_DEFENSE_FOCUS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "PATIENT_DEFENSE_FOCUS" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "STEP_OF_THE_WIND_FREE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "STEP_OF_THE_WIND_FREE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "STEP_OF_THE_WIND_FOCUS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "STEP_OF_THE_WIND_FOCUS" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "WHOLENESS_OF_BODY" }
      >;
      readonly outcome: string;
      readonly runtime: "wholenessOfBody";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "UNCANNY_METABOLISM" }
      >;
      readonly outcome: string;
      readonly runtime: "uncannyMetabolism";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_ARCANE_RECOVERY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_ARCANE_RECOVERY" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_OVERCHANNEL" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_OVERCHANNEL" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_METAMAGIC" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_METAMAGIC" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_INNATE_SORCERY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_INNATE_SORCERY" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_MAGICAL_CUNNING" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_MAGICAL_CUNNING" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "ENTER_WILD_SHAPE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "ENTER_WILD_SHAPE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "EXIT_WILD_SHAPE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "EXIT_WILD_SHAPE" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_WILD_RESURGENCE_SLOT" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_WILD_RESURGENCE_SLOT" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_MYSTIC_ARCANUM" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_MYSTIC_ARCANUM" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_SECOND_WIND" }
      >;
      readonly outcome: string;
      readonly runtime: "secondWind";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_TIRELESS" }
      >;
      readonly outcome: string;
      readonly runtime: "tireless";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_SNEAK_ATTACK" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_SNEAK_ATTACK" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_STEADY_AIM" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_STEADY_AIM" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CUNNING_ACTION_DASH" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CUNNING_ACTION_DASH" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CUNNING_ACTION_DISENGAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CUNNING_ACTION_DISENGAGE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "CUNNING_ACTION_HIDE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "CUNNING_ACTION_HIDE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_FONT_SLOT_RESTORE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_FONT_SLOT_RESTORE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_WILD_RESURGENCE_CHARGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_WILD_RESURGENCE_CHARGE" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_NATURES_VEIL" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "USE_NATURES_VEIL" }>;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_BARDIC_INSPIRATION" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        DndEvent,
        { readonly type: "USE_BARDIC_INSPIRATION" }
      >;
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_PEERLESS_SKILL" }
      >;
      readonly outcome: string;
      readonly runtime: "peerlessSkill";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "USE_RELENTLESS_RAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "relentlessRage";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "SHORT_REST" }
      >;
      readonly outcome: string;
      readonly runtime: "shortRest";
    }
  | {
      readonly token: Extract<
        ResolvedActionToken,
        { readonly type: "EXIT_COMBAT" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<DndEvent, { readonly type: "EXIT_COMBAT" }>;
    };

export type ResolutionRuntimeInputs =
  | { readonly runtime: "none" }
  | { readonly runtime: "startTurn"; readonly values: StartTurnRuntimeInputs }
  | {
      readonly runtime: "actionSurge";
      readonly values: UseActionSurgeRuntimeInputs;
    }
  | {
      readonly runtime: "projectedPreparedSpell";
      readonly values: ProjectedPreparedSpellRuntime;
    }
  | {
      readonly runtime: "tacticalMind";
      readonly values: UseTacticalMindRuntimeInputs;
    }
  | {
      readonly runtime: "wholenessOfBody";
      readonly values: WholenessOfBodyRuntimeInputs;
    }
  | {
      readonly runtime: "uncannyMetabolism";
      readonly values: UncannyMetabolismRuntimeInputs;
    }
  | {
      readonly runtime: "secondWind";
      readonly values: UseSecondWindRuntimeInputs;
    }
  | { readonly runtime: "tireless"; readonly values: UseTirelessRuntimeInputs }
  | {
      readonly runtime: "peerlessSkill";
      readonly values: UsePeerlessSkillRuntimeInputs;
    }
  | {
      readonly runtime: "relentlessRage";
      readonly values: UseRelentlessRageRuntimeInputs;
    }
  | { readonly runtime: "shortRest"; readonly values: ShortRestRuntimeInputs };

export type FinalizedAction =
  | { readonly ok: true; readonly event: DndEvent; readonly outcome: string }
  | { readonly ok: false; readonly error: ActionResolutionError };

export type FinalizedBattleAction =
  | { readonly ok: true; readonly event: BattleEvent; readonly outcome: string }
  | { readonly ok: false; readonly error: ActionResolutionError };

export type BattleResolutionRequest =
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        {
          readonly type:
            | "BATTLE_ATTACK"
            | "BATTLE_OFF_HAND_ATTACK"
            | "BATTLE_LEGENDARY_ATTACK";
        }
      >;
      readonly outcome: string;
      readonly runtime: "battleAttack";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_GRAPPLE" }
      >;
      readonly outcome: string;
      readonly runtime: "battleGrapple";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_ACTION_SURGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_ACTION_SURGE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_ENTER_RAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_ENTER_RAGE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_DECLARE_RECKLESS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_DECLARE_RECKLESS" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_RELEASE_GRAPPLE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RELEASE_GRAPPLE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_ESCAPE_GRAPPLE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_ESCAPE_GRAPPLE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_DASH" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_DASH" }>;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_DISENGAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_DISENGAGE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_BONUS_DISENGAGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_BONUS_DISENGAGE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_DODGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_DODGE" }>;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_HIDE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_HIDE" }>;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_BONUS_HIDE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_BONUS_HIDE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_SEARCH" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_SEARCH" }>;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_CAST_AOE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_CAST_AOE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_CAST_SAVE_SPELL" }
      >;
      readonly outcome: string;
      readonly runtime: "battleSaveSpell";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_MONSTER_SAVE_EFFECT" }
      >;
      readonly outcome: string;
      readonly runtime: "monsterSaveEffect";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_MONSTER_TRAVERSAL" }
      >;
      readonly outcome: string;
      readonly runtime: "monsterTraversalMovement";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_WAKE_EFFECT" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_WAKE_EFFECT" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_HELP_ATTACK" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_HELP_ATTACK" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_MOVE" }
      >;
      readonly outcome: string;
      readonly runtime: "battleMove";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_READY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_READY" }>;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_READY_PASS" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_READY_PASS" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_READY_RELEASE" }
      >;
      readonly outcome: string;
      readonly runtime: "readyAttack";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_READY_SPELL" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_READY_SPELL" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "BATTLE_READY_SPELL_RELEASE" }
      >;
      readonly outcome: string;
      readonly runtime: "readySpellRelease";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "STAND_FROM_PRONE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_STAND_FROM_PRONE" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "CAST_COUNTERSPELL" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RESOLVE_COUNTERSPELL" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "CAST_COUNTERSPELL" }
      >;
      readonly outcome: string;
      readonly runtime: "counterspell";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_UNCANNY_DODGE" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RESOLVE_DMG_REACTION" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "CAST_SHIELD" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RESOLVE_HIT_REACTION" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_PARRY" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RESOLVE_HIT_REACTION" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_CUTTING_WORDS" }
      >;
      readonly outcome: string;
      readonly runtime: "cuttingWords";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_REDIRECT_ATTACK" }
      >;
      readonly outcome: string;
      readonly runtime: "none";
      readonly event: Extract<
        BattleEvent,
        { readonly type: "BATTLE_RESOLVE_HIT_REACTION" }
      >;
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_DEFLECT_ATTACKS" }
      >;
      readonly outcome: string;
      readonly runtime: "deflectAttacks";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "CAST_HELLISH_REBUKE" }
      >;
      readonly outcome: string;
      readonly runtime: "hellishRebuke";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "USE_RETALIATION" }
      >;
      readonly outcome: string;
      readonly runtime: "retaliation";
    }
  | {
      readonly token: Extract<
        BattleResolvedActionToken,
        { readonly type: "TRIGGER_FIRE_SHIELD" }
      >;
      readonly outcome: string;
      readonly runtime: "fireShield";
    };

export type BattleResolutionRuntimeInputs =
  | { readonly runtime: "none" }
  | {
      readonly runtime: "battleAttack";
      readonly values: {
        readonly attackRoll: number;
        readonly targetAc: number;
        readonly weaponDamage: number;
        readonly attackerWithin5ft: boolean;
        readonly attackerWithin60ft?: boolean;
        readonly hostileWithin5ft: boolean;
        readonly targetCanSeeAttacker: boolean;
        readonly attackerCanSeeTarget: boolean;
        readonly frightSourceInLOS: boolean;
        readonly hasAllyAdjacentToTarget: boolean;
        readonly hitReactionCandidates: ReadonlyArray<string>;
      };
    }
  | {
      readonly runtime: "battleGrapple";
      readonly values: {
        readonly targetSaveFailed: boolean;
      };
    }
  | {
      readonly runtime: "battleMove";
      readonly values: {
        readonly provocationKind: MovementProvocationKind;
        readonly threatened: ReadonlyArray<string>;
      };
    }
  | {
      readonly runtime: "battleSaveSpell";
      readonly values: {
        readonly saveRoll: number;
        readonly saveRollB?: number;
      };
    }
  | {
      readonly runtime: "readyAttack";
      readonly values: {
        readonly atkRoll: number;
        readonly dmg: number;
        readonly tgtAc: number;
        readonly crit: boolean;
        readonly knockOut: boolean;
      };
    }
  | {
      readonly runtime: "monsterSaveEffect";
      readonly values: {
        readonly saveRoll: number;
        readonly saveRollB?: number;
        readonly actorCanSeeTarget: boolean;
      };
    }
  | {
      readonly runtime: "monsterTraversalMovement";
      readonly values: {
        readonly destination: BattlePosition;
        readonly movementSpent: number;
        readonly enteredCreatures: ReadonlyArray<{
          readonly targetId: string;
          readonly saveRoll: number;
          readonly saveRollB?: number;
        }>;
      };
    }
  | {
      readonly runtime: "counterspell";
      readonly values: { readonly saveSucceeded: boolean };
    }
  | {
      readonly runtime: "cuttingWords";
      readonly values: { readonly reduction: number };
    }
  | {
      readonly runtime: "deflectAttacks";
      readonly values: { readonly d10Roll: number };
    }
  | {
      readonly runtime: "readySpellRelease";
      readonly values: {
        readonly saveRoll: number;
        readonly saveRollB?: number;
      };
    }
  | {
      readonly runtime: "hellishRebuke";
      readonly values: {
        readonly damage: number;
        readonly saveSucceeded: boolean;
      };
    }
  | {
      readonly runtime: "retaliation";
      readonly values: {
        readonly attackRoll: number;
        readonly damage: number;
        readonly targetAc: number;
        readonly critical: boolean;
      };
    }
  | {
      readonly runtime: "fireShield";
      readonly values: { readonly damage: number };
    };

export type ActionResolutionErrorCode =
  | "ACTION_NOT_AVAILABLE"
  | "ACTION_NOT_SUPPORTED"
  | "RUNTIME_INPUT_MISMATCH"
  | "INVALID_RUNTIME_INPUT";

export type ActionResolutionError = {
  readonly code: ActionResolutionErrorCode;
  readonly message: string;
};

export type PreviewedAction =
  | {
      readonly ok: true;
      readonly summary: string;
      readonly cost: ResourceCost;
      readonly runtime: ResolutionRequest["runtime"];
      readonly eventType?: DndEvent["type"];
    }
  | { readonly ok: false; readonly error: ActionResolutionError };

export type PreviewedBattleAction =
  | {
      readonly ok: true;
      readonly summary: string;
      readonly cost: ResourceCost;
      readonly runtime: BattleResolutionRequest["runtime"];
      readonly eventType?: BattleEvent["type"];
    }
  | { readonly ok: false; readonly error: ActionResolutionError };

type ActionSpec<T extends SupportedActionType> = {
  readonly buildToken: (
    context: DndContext,
  ) => TokenByType[T] | ReadonlyArray<TokenByType[T]> | null;
};

function creatureActionToken<T extends TokenByType[SupportedActionType]>(
  token: T,
): T & { readonly scope: "creature" } {
  return { scope: "creature", ...token };
}

const ACTION_SPECS: { readonly [K in SupportedActionType]: ActionSpec<K> } = {
  ENTER_COMBAT: {
    buildToken: (context) =>
      !context.inCombat && !context.dead
        ? {
            type: "ENTER_COMBAT",
            cost: FREE_COST,
            outcome: {
              summary: "Enter combat (begin tracking turns and action economy)",
            },
          }
        : null,
  },
  USE_HEROIC_INSPIRATION: {
    buildToken: (context) =>
      canUseHeroicInspirationNow(context)
        ? {
            type: "USE_HEROIC_INSPIRATION",
            cost: FREE_COST,
            outcome: {
              summary:
                "Spend Heroic Inspiration to reroll a die and use the new roll",
            },
          }
        : null,
  },
  CAST_PREPARED_SPELL: {
    buildToken: (context) =>
      MODELED_PREPARED_SPELLS.flatMap((spellName) => {
        if (!context.preparedSpells.has(spellId(spellName))) return [];
        if (canUseProjectedPreparedSpell(context, spellName)) {
          return [
            {
              type: "CAST_PREPARED_SPELL" as const,
              spellName,
              cost: projectedCosts(...projectedPreparedSpellCost(spellName)),
              outcome: {
                summary: projectedPreparedSpellSummary(context, spellName),
              },
            },
          ];
        }
        const spell = getModeledPreparedSpellInfo(spellName);
        if (spell == null || spell.baseLevel === 0) return [];
        const slotLevels = legalPreparedSpellSlotLevels(context, spellName);
        if (slotLevels.length === 0) return [];
        return [
          {
            type: "CAST_PREPARED_SPELL" as const,
            spellName,
            slotLevel: { options: slotLevels },
            cost:
              spell.castingTime === "bonusAction"
                ? costs(quotaCost("bonusAction"), poolCost("spellSlot"))
                : costs(quotaCost("action"), poolCost("spellSlot")),
            outcome: {
              summary: spell.concentration
                ? `Cast ${displaySpellName(spellName)} with a spell slot of the chosen level and begin concentrating on it`
                : `Cast ${displaySpellName(spellName)} with a spell slot of the chosen level`,
            },
          },
        ];
      }),
  },
  START_TURN: {
    buildToken: (context) =>
      context.inCombat
        ? {
            type: "START_TURN",
            cost: FREE_COST,
            outcome: {
              summary:
                "Start your turn (reset action economy, process start-of-turn effects)",
            },
          }
        : null,
  },
  USE_ACTION_SURGE: {
    buildToken: (context) =>
      canUseProjectedActionSurge(context)
        ? {
            type: "USE_ACTION_SURGE",
            cost: projectedCosts(...projectedActionSurgeCost()),
            outcome: {
              summary: projectedActionSurgeSummary(context),
            },
          }
        : null,
  },
  USE_INDOMITABLE: {
    buildToken: (context) =>
      guards.canIndomitable(guardArgs(context))
        ? {
            type: "USE_INDOMITABLE",
            cost: costs(poolCost("indomitable")),
            outcome: {
              summary:
                "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level",
            },
          }
        : null,
  },
  USE_TACTICAL_MIND: {
    buildToken: (context) =>
      guards.canTacticalMind(guardArgs(context))
        ? {
            type: "USE_TACTICAL_MIND",
            cost: costs(poolCost("secondWind")),
            outcome: {
              summary:
                "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
            },
          }
        : null,
  },
  CONVERT_SLOT_TO_POINTS: {
    buildToken: (context) => {
      const slotLevels = legalConvertSlotToPointsLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "CONVERT_SLOT_TO_POINTS",
        slotLevel: { options: slotLevels },
        cost: costs(poolCost("spellSlot")),
        outcome: {
          summary:
            "Expend a spell slot to gain sorcery points equal to its level",
        },
      };
    },
  },
  CONVERT_POINTS_TO_SLOT: {
    buildToken: (context) => {
      const slotLevels = legalConvertPointsToSlotLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "CONVERT_POINTS_TO_SLOT",
        slotLevel: { options: slotLevels },
        cost: costs(quotaCost("bonusAction"), poolCost("sorceryPoints")),
        outcome: {
          summary:
            "Spend sorcery points to create a spell slot of the chosen level",
        },
      };
    },
  },
  ENTER_RAGE: {
    buildToken: (context) =>
      guards.canEnterRage(guardArgs(context))
        ? {
            type: "ENTER_RAGE",
            cost: costs(quotaCost("bonusAction"), poolCost("rage")),
            outcome: {
              summary:
                "Enter a Rage, expend one Rage use, and consume your bonus action",
            },
          }
        : null,
  },
  END_RAGE: {
    buildToken: (context) =>
      guards.isRaging(guardArgs(context))
        ? {
            type: "END_RAGE",
            cost: FREE_COST,
            outcome: { summary: "End your Rage" },
          }
        : null,
  },
  EXTEND_RAGE_BA: {
    buildToken: (context) =>
      guards.canExtendRageBA(guardArgs(context))
        ? {
            type: "EXTEND_RAGE_BA",
            cost: costs(quotaCost("bonusAction")),
            outcome: {
              summary:
                "Use your bonus action to keep your Rage going this turn",
            },
          }
        : null,
  },
  DECLARE_RECKLESS: {
    buildToken: (context) =>
      guards.canDeclareReckless(guardArgs(context))
        ? {
            type: "DECLARE_RECKLESS",
            cost: FREE_COST,
            outcome: { summary: "Declare Reckless Attack for this turn" },
          }
        : null,
  },
  USE_LAY_ON_HANDS: {
    buildToken: (context) => {
      const amounts = legalLayOnHandsAmounts(context);
      if (amounts.length === 0) return null;
      return {
        type: "USE_LAY_ON_HANDS",
        amount: { options: amounts },
        cost: costs(quotaCost("bonusAction"), poolCost("layOnHandsPool")),
        outcome: {
          summary: "Spend Lay on Hands points to restore up to that many HP",
        },
      };
    },
  },
  USE_DIVINE_SMITE: {
    buildToken: (context) => {
      const slotLevels = legalDivineSmiteLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "USE_DIVINE_SMITE",
        slotLevel: { options: slotLevels },
        cost: costs(quotaCost("bonusAction"), poolCost("spellSlot")),
        outcome: {
          summary:
            "Expend a spell slot of the chosen level to use Divine Smite",
        },
      };
    },
  },
  FLURRY_OF_BLOWS: {
    buildToken: (context) => {
      const monk = context.classStates.monk;
      if (!monk || !guards.canMonkFocusBA(guardArgs(context))) return null;
      return {
        type: "FLURRY_OF_BLOWS",
        cost: costs(quotaCost("bonusAction"), poolCost("focusPoint")),
        outcome: {
          summary: `Spend 1 Focus Point to make ${flurryOfBlowsStrikes(monk.level)} unarmed strike${flurryOfBlowsStrikes(monk.level) === 1 ? "" : "s"} as a bonus action`,
        },
      };
    },
  },
  PATIENT_DEFENSE_FREE: {
    buildToken: (context) =>
      guards.canMonkFreeBA(guardArgs(context))
        ? {
            type: "PATIENT_DEFENSE_FREE",
            cost: costs(quotaCost("bonusAction")),
            outcome: { summary: "Take the Disengage action as a bonus action" },
          }
        : null,
  },
  PATIENT_DEFENSE_FOCUS: {
    buildToken: (context) =>
      guards.canMonkFocusBA(guardArgs(context))
        ? {
            type: "PATIENT_DEFENSE_FOCUS",
            cost: costs(quotaCost("bonusAction"), poolCost("focusPoint")),
            outcome: {
              summary:
                "Spend 1 Focus Point to Disengage and Dodge as a bonus action",
            },
          }
        : null,
  },
  STEP_OF_THE_WIND_FREE: {
    buildToken: (context) =>
      guards.canMonkFreeBA(guardArgs(context))
        ? {
            type: "STEP_OF_THE_WIND_FREE",
            cost: costs(quotaCost("bonusAction")),
            outcome: { summary: "Take the Dash action as a bonus action" },
          }
        : null,
  },
  STEP_OF_THE_WIND_FOCUS: {
    buildToken: (context) =>
      guards.canMonkFocusBA(guardArgs(context))
        ? {
            type: "STEP_OF_THE_WIND_FOCUS",
            cost: costs(quotaCost("bonusAction"), poolCost("focusPoint")),
            outcome: {
              summary:
                "Spend 1 Focus Point to Dash and Disengage as a bonus action",
            },
          }
        : null,
  },
  WHOLENESS_OF_BODY: {
    buildToken: (context) => {
      const monk = context.classStates.monk;
      if (!monk || !guards.canWholenessOfBody(guardArgs(context))) return null;
      // The current machine stores wholenessMax (max charges), which is derived from
      // Wisdom modifier with a minimum of 1. That preserves the exact modifier only
      // when WIS >= 1; low-WIS monks would need explicit modifier state for exact text.
      return {
        type: "WHOLENESS_OF_BODY",
        cost: costs(quotaCost("bonusAction"), poolCost("wholenessOfBody")),
        outcome: {
          summary: `Heal 1d${pMartialArtsDie(monk.level)} + ${monk.wholenessMax} HP (minimum 1)`,
        },
      };
    },
  },
  UNCANNY_METABOLISM: {
    buildToken: (context) => {
      const monk = context.classStates.monk;
      if (!monk || !guards.canUncannyMetabolism(guardArgs(context)))
        return null;
      return {
        type: "UNCANNY_METABOLISM",
        cost: costs(poolCost("uncannyMetabolism")),
        outcome: {
          summary: `Regain all expended Focus Points and heal 1d${pMartialArtsDie(monk.level)} + ${monk.level} HP`,
        },
      };
    },
  },
  USE_ARCANE_RECOVERY: {
    buildToken: (context) => {
      const slotLevels = legalArcaneRecoveryLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "USE_ARCANE_RECOVERY",
        slotLevel: { options: slotLevels },
        cost: costs(poolCost("arcaneRecovery")),
        outcome: {
          summary:
            "Recover one expended spell slot of the chosen level and use Arcane Recovery",
        },
      };
    },
  },
  USE_OVERCHANNEL: {
    buildToken: (context) => {
      if (!guards.canOverchannel(guardArgs(context))) return null;
      if (context.pendingResolution?.kind !== "overchannel") return null;
      return {
        type: "USE_OVERCHANNEL",
        cost: FREE_COST,
        outcome: {
          summary: `Overchannel the qualifying ${displaySpellName(context.pendingResolution.spellName)} cast at slot level ${context.pendingResolution.slotLevel} for maximum damage`,
        },
      };
    },
  },
  USE_METAMAGIC: {
    buildToken: (context) => {
      const legalOptions = legalMetamagicOptions(context);
      // Presence of the token means "there is at least one legal option right now".
      // If legality shrinks to zero during the current cast (for example after using
      // a non-stackable Metamagic option), omit the whole token rather than returning
      // an empty hole payload that the caller could not execute.
      if (legalOptions.length === 0) return null;
      return {
        type: "USE_METAMAGIC",
        option: { options: legalOptions },
        cost: costs(poolCost("sorceryPoints")),
        outcome: {
          summary:
            "Apply a currently legal known Metamagic option to the spell you are casting",
        },
      };
    },
  },
  USE_INNATE_SORCERY: {
    buildToken: (context) => {
      if (!guards.canInnateSorcery(guardArgs(context))) return null;
      const sorcerer = context.classStates.sorcerer;
      return {
        type: "USE_INNATE_SORCERY",
        cost: costs(
          quotaCost("bonusAction"),
          poolCost(
            sorcerer && sorcerer.innateSorceryCharges > 0
              ? "innateSorcery"
              : "sorceryPoints",
          ),
        ),
        outcome: {
          summary: "Use a bonus action to activate Innate Sorcery for 1 minute",
        },
      };
    },
  },
  USE_MAGICAL_CUNNING: {
    buildToken: (context) =>
      guards.canMagicalCunning(guardArgs(context))
        ? {
            type: "USE_MAGICAL_CUNNING",
            cost: costs(poolCost("magicalCunning")),
            outcome: {
              summary:
                "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
            },
          }
        : null,
  },
  ENTER_WILD_SHAPE: {
    buildToken: (context) =>
      guards.canEnterWildShape(guardArgs(context))
        ? {
            type: "ENTER_WILD_SHAPE",
            cost: costs(quotaCost("bonusAction"), poolCost("wildShape")),
            outcome: {
              summary: `Shape-shift into a beast form, gaining ${context.classStates.druid?.level ?? 0} temporary HP`,
            },
          }
        : null,
  },
  EXIT_WILD_SHAPE: {
    buildToken: (context) =>
      guards.canExitWildShape(guardArgs(context))
        ? {
            type: "EXIT_WILD_SHAPE",
            cost: costs(quotaCost("bonusAction")),
            outcome: {
              summary: "Revert from beast form to your normal form",
            },
          }
        : null,
  },
  USE_WILD_RESURGENCE_SLOT: {
    buildToken: (context) =>
      guards.canWildResurgenceSlot(guardArgs(context)) &&
      context.slotsCurrent[0] < context.slotsMax[0]
        ? {
            type: "USE_WILD_RESURGENCE_SLOT",
            cost: costs(poolCost("wildShape")),
            outcome: {
              summary:
                "Expend one Wild Shape use to regain a level 1 spell slot; once per Long Rest",
            },
          }
        : null,
  },
  USE_MYSTIC_ARCANUM: {
    buildToken: (context) => {
      const spellLevels = legalMysticArcanumLevels(context);
      if (spellLevels.length === 0) return null;
      return {
        type: "USE_MYSTIC_ARCANUM",
        spellLevel: { options: spellLevels },
        cost: costs(poolCost("mysticArcanum")),
        outcome: {
          summary:
            "Cast an unused Mystic Arcanum spell of the chosen level without expending a slot",
        },
      };
    },
  },
  USE_SECOND_WIND: {
    buildToken: (context) =>
      canUseProjectedSecondWind(context)
        ? {
            type: "USE_SECOND_WIND",
            cost: projectedCosts(...projectedSecondWindCost()),
            outcome: {
              summary: projectedSecondWindSummary(context),
            },
          }
        : null,
  },
  USE_TIRELESS: {
    buildToken: (context) => {
      const ranger = context.classStates.ranger;
      if (!ranger || !guards.canTireless(guardArgs(context))) return null;
      return {
        type: "USE_TIRELESS",
        cost: costs(quotaCost("action"), poolCost("tireless")),
        outcome: {
          summary: `Gain 1d8 + ${ranger.tirelessMax} temporary HP (minimum 1)`,
        },
      };
    },
  },
  USE_SNEAK_ATTACK: {
    buildToken: (context) =>
      guards.canSneakAttack(guardArgs(context))
        ? {
            type: "USE_SNEAK_ATTACK",
            cost: FREE_COST,
            outcome: {
              summary: "Apply Sneak Attack damage to the qualifying hit",
            },
          }
        : null,
  },
  USE_STEADY_AIM: {
    buildToken: (context) =>
      guards.canSteadyAim(guardArgs(context))
        ? {
            type: "USE_STEADY_AIM",
            cost: costs(quotaCost("bonusAction")),
            outcome: {
              summary:
                "Use Steady Aim to gain Advantage on your next attack roll; your speed becomes 0 until end of turn",
            },
          }
        : null,
  },
  CUNNING_ACTION_DASH: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_DASH",
            cost: costs(quotaCost("bonusAction")),
            outcome: { summary: "Take the Dash action as a bonus action" },
          }
        : null,
  },
  CUNNING_ACTION_DISENGAGE: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_DISENGAGE",
            cost: costs(quotaCost("bonusAction")),
            outcome: { summary: "Take the Disengage action as a bonus action" },
          }
        : null,
  },
  CUNNING_ACTION_HIDE: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_HIDE",
            cost: costs(quotaCost("bonusAction")),
            outcome: { summary: "Take the Hide action as a bonus action" },
          }
        : null,
  },
  USE_CLERIC_CHANNEL_DIVINITY: {
    buildToken: (context) =>
      guards.canClericCD(guardArgs(context))
        ? {
            type: "USE_CLERIC_CHANNEL_DIVINITY",
            cost: costs(poolCost("channelDivinity")),
            outcome: { summary: "Expend one Cleric Channel Divinity use" },
          }
        : null,
  },
  USE_FONT_SLOT_RESTORE: {
    buildToken: (context) => {
      const slotLevels = legalFontSlotRestoreLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "USE_FONT_SLOT_RESTORE",
        slotLevel: { options: slotLevels },
        cost: costs(poolCost("spellSlot")),
        outcome: {
          summary: "Expend a spell slot to regain one Bardic Inspiration use",
        },
      };
    },
  },
  USE_PALADIN_CHANNEL_DIVINITY: {
    buildToken: (context) =>
      guards.canPaladinCD(guardArgs(context))
        ? {
            type: "USE_PALADIN_CHANNEL_DIVINITY",
            cost: costs(poolCost("channelDivinity")),
            outcome: { summary: "Expend one Paladin Channel Divinity use" },
          }
        : null,
  },
  USE_WILD_RESURGENCE_CHARGE: {
    buildToken: (context) => {
      const slotLevels = legalWildResurgenceChargeLevels(context);
      if (slotLevels.length === 0) return null;
      return {
        type: "USE_WILD_RESURGENCE_CHARGE",
        slotLevel: { options: slotLevels },
        cost: costs(poolCost("spellSlot")),
        outcome: {
          summary: "Expend a spell slot to regain one Wild Shape use",
        },
      };
    },
  },
  USE_NATURES_VEIL: {
    buildToken: (context) =>
      guards.canNaturesVeil(guardArgs(context))
        ? {
            type: "USE_NATURES_VEIL",
            cost: costs(quotaCost("bonusAction"), poolCost("naturesVeil")),
            outcome: {
              summary: "Expend one Nature's Veil use to become Invisible",
            },
          }
        : null,
  },
  USE_BARDIC_INSPIRATION: {
    buildToken: (context) =>
      guards.canBardicInspiration(guardArgs(context))
        ? {
            type: "USE_BARDIC_INSPIRATION",
            cost: costs(
              quotaCost("bonusAction"),
              poolCost("bardicInspiration"),
            ),
            outcome: {
              summary:
                "Expend one Bardic Inspiration use to inspire another creature",
            },
          }
        : null,
  },
  USE_PEERLESS_SKILL: {
    buildToken: (context) => {
      if (!guards.canPeerlessSkill(guardArgs(context))) return null;
      const mode =
        context.pendingResolution?.kind === "peerlessSkill"
          ? context.pendingResolution.mode
          : "abilityCheck";
      return {
        type: "USE_PEERLESS_SKILL",
        cost: costs(poolCost("bardicInspiration")),
        outcome: {
          summary:
            mode === "attackRoll"
              ? "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds"
              : "Add your Bardic Inspiration die to the failed ability check; expend it only if the check now succeeds",
        },
      };
    },
  },
  USE_RELENTLESS_RAGE: {
    buildToken: (context) => {
      if (!guards.canRelentlessRage(guardArgs(context))) return null;
      const barbarian = context.classStates.barbarian;
      if (!barbarian) return null;
      const dc = relentlessRageDC(barbarian.relentlessRageTimesUsed);
      return {
        type: "USE_RELENTLESS_RAGE",
        cost: FREE_COST,
        outcome: {
          summary: `Make a DC ${dc} Constitution save to stay at ${2 * barbarian.level} HP instead of dropping to 0`,
        },
      };
    },
  },
  SHORT_REST: {
    buildToken: (context) => {
      if (!canBenefitFromShortRest(context)) return null;
      const availableHitDice = shortRestAvailableHitDice(context);
      return {
        type: "SHORT_REST",
        availableHitDice,
        cost: FREE_COST,
        outcome: {
          summary:
            availableHitDice.length === 0
              ? "Finish a short rest and recharge short-rest features"
              : "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features",
        },
      };
    },
  },
  EXIT_COMBAT: {
    buildToken: (context) =>
      context.inCombat
        ? {
            type: "EXIT_COMBAT",
            cost: FREE_COST,
            // A33 leaves initiative-roster teardown to the caller, so this
            // remains available even if the creature is dead or unconscious.
            outcome: {
              summary:
                "Stop tracking this creature in combat and initiative order",
            },
          }
        : null,
  },
};

const ROOT_ACTIONS = new Set(Object.keys(rootEventHandlers));
const ACTING_ACTIONS = new Set(Object.keys(turnPhaseConfig.states.acting.on));
const OUT_OF_COMBAT_ACTIONS = new Set(
  Object.keys(turnPhaseConfig.states.outOfCombat.on),
);
const WAITING_ACTIONS = new Set(
  Object.keys(turnPhaseConfig.states.waitingForTurn.on),
);

function isAcceptedByMachine(
  type: SupportedActionType,
  tags: ReadonlySet<string>,
): boolean {
  if (ROOT_ACTIONS.has(type)) return true;
  if (ACTING_ACTIONS.has(type) && tags.has("canAct")) return true;
  if (OUT_OF_COMBAT_ACTIONS.has(type) && tags.has("outOfCombat")) return true;
  if (WAITING_ACTIONS.has(type) && tags.has("inCombat") && !tags.has("canAct"))
    return true;
  return false;
}

export const EXPOSED_ACTION_TYPES = SUPPORTED_ACTION_TYPES;

export function getAvailableActions(
  context: DndContext,
  tags: ReadonlySet<string>,
): ReadonlyArray<ActionToken> {
  return SUPPORTED_ACTION_TYPES.flatMap((type) => {
    if (!isAcceptedByMachine(type, tags)) return [];
    const builtToken = ACTION_SPECS[type].buildToken(context);
    if (builtToken == null) return [];
    if (Array.isArray(builtToken))
      return builtToken.map((entry) => creatureActionToken(entry));
    const singleToken = builtToken as TokenByType[SupportedActionType];
    return [creatureActionToken(singleToken)];
  });
}

function battleToken<T extends BattleActionToken>(token: Omit<T, "scope">): T {
  return { scope: "battle", ...token } as T;
}

function hitReactionToken(
  actorId: string,
  reaction: "RShield" | "RParry" | "RCuttingWords" | "RRedirectAttack",
  redirectOptions: ReadonlyArray<string> = [],
): BattleActionToken {
  return Match.value(reaction).pipe(
    Match.when("RShield", () =>
      battleToken({
        actorId,
        type: "CAST_SHIELD",
        cost: costs(quotaCost("reaction"), poolCost("spellSlot")),
        outcome: {
          summary:
            "Use your reaction to cast Shield against the triggering attack",
        },
      }),
    ),
    Match.when("RParry", () =>
      battleToken({
        actorId,
        type: "USE_PARRY",
        cost: costs(quotaCost("reaction")),
        outcome: {
          summary:
            "Use your reaction to add your Parry bonus against the triggering melee weapon attack",
        },
      }),
    ),
    Match.when("RCuttingWords", () =>
      battleToken({
        actorId,
        type: "USE_CUTTING_WORDS",
        cost: costs(quotaCost("reaction"), poolCost("bardicInspiration")),
        outcome: {
          summary:
            "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll",
        },
      }),
    ),
    Match.when("RRedirectAttack", () =>
      battleToken({
        actorId,
        type: "USE_REDIRECT_ATTACK",
        allyId: { options: redirectOptions },
        cost: costs(quotaCost("reaction")),
        outcome: {
          summary:
            "Use your reaction to swap places with a nearby Small or Medium ally and redirect the triggering attack",
        },
      }),
    ),
    Match.exhaustive,
  );
}

function damageReactionToken(
  actorId: string,
  // FIXME: UncannyDodge, too, is a character ability and was supposed to be a surface...
  reaction: "RUncannyDodge" | "RDeflectAttacks",
): BattleActionToken {
  return Match.value(reaction).pipe(
    Match.when("RUncannyDodge", () =>
      battleToken({
        actorId,
        type: "USE_UNCANNY_DODGE",
        cost: costs(quotaCost("reaction")),
        outcome: {
          summary:
            "Use your reaction to halve the triggering attack's damage against you",
        },
      }),
    ),
    Match.when("RDeflectAttacks", () =>
      battleToken({
        actorId,
        type: "USE_DEFLECT_ATTACKS",
        cost: costs(quotaCost("reaction")),
        outcome: {
          summary:
            "Use your reaction to reduce the triggering attack's damage with Deflect Attacks",
        },
      }),
    ),
    Match.exhaustive,
  );
}

function afterDamageReactionTokens(
  context: BattleContext,
): ReadonlyArray<BattleActionToken> {
  // TODO: This generic token enumerator currently recomputes rule-specific
  // legality for Hellish Rebuke, Retaliation, and Fire Shield. Keep parity, but
  // move those checks closer to the owning spell/feature surfaces instead of
  // extending this generic action-listing layer.
  const awaitCtx = context.awaitCtx;
  const interrupt = awaitCtx?.interrupt;
  if (awaitCtx == null || interrupt?.tag !== "PIAfterDamage") return [];
  const ad = interrupt.ctx;
  const tokens: Array<BattleActionToken> = [];
  for (const actorId of awaitCtx.eligible) {
    if (awaitCtx.offered.has(actorId)) continue;
    if (actorId !== ad.damagedCreature) continue;
    const actor = context.creatures.get(actorId);
    if (
      actor == null ||
      !actor.reactionAvailable ||
      actor.dead ||
      isIncapacitated(actor)
    ) {
      continue;
    }
    if (
      ad.sourceVisibleToDamagedCreature &&
      ad.sourceWithin60ftOfDamagedCreature &&
      actor.preparedSpells.has(spellId("hellish_rebuke")) &&
      actor.slotsCurrent.some((remaining) => remaining > 0)
    ) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "CAST_HELLISH_REBUKE" }>
        >({
          actorId,
          type: "CAST_HELLISH_REBUKE",
          cost: costs(quotaCost("reaction"), poolCost("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Hellish Rebuke against the creature that damaged you",
          },
        }),
      );
    }
    if (ad.sourceWithin5ftOfDamagedCreature && actor.barbarianLevel >= 10) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "USE_RETALIATION" }>
        >({
          actorId,
          type: "USE_RETALIATION",
          cost: costs(quotaCost("reaction")),
          outcome: {
            summary:
              "Use your reaction to make a melee attack against the creature that damaged you",
          },
        }),
      );
    }
    const fireShieldPayload = actor.activeEffects.find(
      (effect) =>
        effect.reactivePayload?.trigger === "meleeHitWithin5ft" &&
        ad.sourceWithin5ftOfDamagedCreature &&
        ad.sourceHitWithMeleeAttackRoll,
    )?.reactivePayload;
    if (fireShieldPayload != null) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "TRIGGER_FIRE_SHIELD" }>
        >({
          actorId,
          type: "TRIGGER_FIRE_SHIELD",
          cost: FREE_COST,
          outcome: {
            summary: `Apply Fire Shield's ${fireShieldPayload.damageType} damage to the attacker`,
          },
        }),
      );
    }
  }
  return tokens;
}

function battleCounterspellSlotLevels(
  actorId: string,
  context: BattleContext,
): ReadonlyArray<SpellSlotLevelValue> {
  const reactor = context.creatures.get(CreatureId(actorId));
  if (reactor == null) return [];
  return reactor.slotsCurrent.flatMap((remaining, index) =>
    index >= 2 && remaining > 0 ? [spellSlotLevel(index + 1)] : [],
  );
}

function battleCastableSpellSlotOptions(
  actor: BattleCreatureState,
  currentSpellId: SpellId,
  payload: BattleReadyableSpellPayload | undefined,
): ReadonlyArray<SpellSlotLevelValue> {
  return currentReadyableSpellPayloads(actor, currentSpellId, payload)
    .map((p) => p.slotLevel)
    .sort((a, b) => a - b);
}

function isDailyMonsterSpell(
  actor: BattleCreatureState,
  currentSpellId: SpellId,
): boolean {
  return (
    actor.dailyUsesRemaining[monsterSpellDailyUseId(currentSpellId)] != null
  );
}

function battleCastableSpellCost(
  actor: BattleCreatureState,
  currentSpellId: SpellId,
): ResourceCost {
  return isDailyMonsterSpell(actor, currentSpellId)
    ? costs(quotaCost("action"))
    : costs(quotaCost("action"), poolCost("spellSlot"));
}

function battleCastableSpellSpend(
  actor: BattleCreatureState,
  currentSpellId: SpellId,
): string {
  return isDailyMonsterSpell(actor, currentSpellId)
    ? "action and one daily use"
    : "action and a spell slot";
}

function battleSpellCastBlocked(actor: BattleCreatureState): boolean {
  return (
    actor.actionSurgeActionPending ||
    actor.ragingBlocksSpells ||
    actor.slotExpendedThisTurn ||
    actor.readyableSpellPayloads.size === 0
  );
}

function battleActiveAoeSpellTokens(
  actorId: string,
  actor: BattleCreatureState,
): ReadonlyArray<BattleActionToken> {
  if (battleSpellCastBlocked(actor)) return [];
  const tokens: Array<
    Extract<BattleActionToken, { readonly type: "BATTLE_CAST_AOE" }>
  > = [];
  for (const [currentSpellId, payload] of actor.readyableSpellPayloads) {
    if (!actor.preparedSpells.has(currentSpellId)) continue;
    if (getBattleReadyableSpellDelivery(currentSpellId) !== "aoe") continue;
    const slotOptions = battleCastableSpellSlotOptions(
      actor,
      currentSpellId,
      payload,
    );
    if (slotOptions.length === 0) continue;
    tokens.push(
      battleToken<
        Extract<BattleActionToken, { readonly type: "BATTLE_CAST_AOE" }>
      >({
        actorId,
        type: "BATTLE_CAST_AOE",
        spellId: currentSpellId,
        slotLevel: { options: slotOptions },
        cost: battleCastableSpellCost(actor, currentSpellId),
        outcome: {
          summary: `Spend your ${battleCastableSpellSpend(actor, currentSpellId)} to cast ${displaySpellName(
            currentSpellId as SpellName,
          )} through the battle-owned area save loop`,
        },
      }),
    );
  }
  return tokens.sort((a, b) =>
    String(a.spellId).localeCompare(String(b.spellId)),
  );
}

function battleActiveSaveSpellTokens(
  actorId: string,
  actor: BattleCreatureState,
  context: BattleContext,
): ReadonlyArray<BattleActionToken> {
  if (battleSpellCastBlocked(actor)) return [];
  const targetOptions = [...context.creatures.keys()]
    .filter((creatureId) => creatureId !== actorId)
    .sort();
  if (targetOptions.length === 0) return [];
  const tokens: Array<
    Extract<BattleActionToken, { readonly type: "BATTLE_CAST_SAVE_SPELL" }>
  > = [];
  for (const [currentSpellId, payload] of actor.readyableSpellPayloads) {
    if (!actor.preparedSpells.has(currentSpellId)) continue;
    if (getBattleReadyableSpellDelivery(currentSpellId) !== "singleTarget")
      continue;
    const slotOptions = battleCastableSpellSlotOptions(
      actor,
      currentSpellId,
      payload,
    );
    if (slotOptions.length === 0) continue;
    tokens.push(
      battleToken<
        Extract<BattleActionToken, { readonly type: "BATTLE_CAST_SAVE_SPELL" }>
      >({
        actorId,
        type: "BATTLE_CAST_SAVE_SPELL",
        spellId: currentSpellId,
        slotLevel: { options: slotOptions },
        targetId: { options: targetOptions },
        cost: battleCastableSpellCost(actor, currentSpellId),
        outcome: {
          summary: `Spend your ${battleCastableSpellSpend(actor, currentSpellId)} to cast ${displaySpellName(
            currentSpellId as SpellName,
          )} against the chosen target with an explicit save roll`,
        },
      }),
    );
  }
  return tokens.sort((a, b) =>
    String(a.spellId).localeCompare(String(b.spellId)),
  );
}

function battleActiveReadyableSpellTokens(
  actorId: string,
  actor: BattleCreatureState,
  context: BattleContext,
): ReadonlyArray<BattleActionToken> {
  if (battleSpellCastBlocked(actor)) return [];
  const targetOptions = [...context.creatures.keys()]
    .filter((creatureId) => creatureId !== actorId)
    .sort();
  if (targetOptions.length === 0) return [];
  const tokens: Array<
    Extract<BattleActionToken, { readonly type: "BATTLE_READY_SPELL" }>
  > = [];
  for (const [spellName, payload] of actor.readyableSpellPayloads) {
    if (!actor.preparedSpells.has(spellName)) continue;
    if (getBattleReadyableSpellDelivery(spellName) === "aoe") continue;
    const slotOptions = battleCastableSpellSlotOptions(
      actor,
      spellName,
      payload,
    );
    if (slotOptions.length === 0) continue;
    tokens.push(
      battleToken<
        Extract<BattleActionToken, { readonly type: "BATTLE_READY_SPELL" }>
      >({
        actorId,
        type: "BATTLE_READY_SPELL",
        spellName: spellName as SpellName,
        slotLevel: { options: slotOptions },
        targetId: { options: targetOptions },
        cost: costs(quotaCost("action"), poolCost("spellSlot")),
        outcome: {
          summary: `Spend your action and a spell slot to Ready ${displaySpellName(
            spellName as SpellName,
          )} and hold it with Concentration`,
        },
      }),
    );
  }
  return tokens.sort((a, b) => a.spellName.localeCompare(b.spellName));
}

function canUseBattleAttack(actor: BattleCreatureState): boolean {
  return actor.actionsRemaining > 0 || actor.extraAttacksRemaining > 0;
}

function canUseBattleOffHandAttack(actor: BattleCreatureState): boolean {
  const mainHand = actor.mainHandWeapon;
  const offHand = actor.offHandWeapon;
  return (
    !actor.bonusActionUsed &&
    actor.attackActionUsed &&
    actor.lightAttackUsedThisTurn &&
    mainHand != null &&
    offHand != null &&
    mainHand.isMelee &&
    offHand.isMelee &&
    mainHand.properties.has("light") &&
    offHand.properties.has("light")
  );
}

function battleAttackCost(actor: BattleCreatureState): ResourceCost {
  return actor.attackActionUsed && actor.extraAttacksRemaining > 0
    ? FREE_COST
    : costs(quotaCost("action"));
}

function squaresBetween(
  attacker: BattleCreatureState,
  target: BattleCreatureState,
): number {
  return Math.max(
    Math.abs(attacker.battlePosition.row - target.battlePosition.row),
    Math.abs(attacker.battlePosition.col - target.battlePosition.col),
  );
}

function canBattleAttackUseMeleeLane(
  weapon: typeof UNARMED_STRIKE_PROFILE | BattleCreatureState["mainHandWeapon"],
  attackerWithin5ft: boolean,
): boolean {
  if (weapon == null || !weapon.isMelee) return false;
  return attackerWithin5ft || !weapon.properties.has("thrown");
}

function battleAttackTargetGroups(params: {
  readonly context: BattleContext;
  readonly attackerId: string;
  readonly targetOptions: ReadonlyArray<string>;
  readonly weapon:
    | typeof UNARMED_STRIKE_PROFILE
    | BattleCreatureState["mainHandWeapon"];
}): ReadonlyArray<{
  readonly targetOptions: ReadonlyArray<string>;
  readonly knockOutOptions: ReadonlyArray<boolean>;
}> {
  const attacker = params.context.creatures.get(CreatureId(params.attackerId));
  if (attacker == null) return [];
  const meleeTargets: Array<string> = [];
  const rangedTargets: Array<string> = [];
  for (const targetId of params.targetOptions) {
    const target = params.context.creatures.get(CreatureId(targetId));
    if (target == null) continue;
    if (
      canBattleAttackUseMeleeLane(
        params.weapon,
        squaresBetween(attacker, target) <= 1,
      )
    ) {
      meleeTargets.push(targetId);
    } else {
      rangedTargets.push(targetId);
    }
  }
  return [
    ...(meleeTargets.length > 0
      ? [
          {
            targetOptions: meleeTargets,
            knockOutOptions: [false, true] as const,
          },
        ]
      : []),
    ...(rangedTargets.length > 0
      ? [
          {
            targetOptions: rangedTargets,
            knockOutOptions: [false] as const,
          },
        ]
      : []),
  ];
}

function currentReadyableSpellPayloads(
  actor: BattleCreatureState,
  spellName: string,
  storedPayload: BattleReadyableSpellPayload | undefined,
): ReadonlyArray<BattleReadyableSpellPayload> {
  if (storedPayload == null) return [];
  const monsterDailyUses =
    actor.dailyUsesRemaining[monsterSpellDailyUseId(spellId(spellName))];
  if (monsterDailyUses != null) {
    return monsterDailyUses > 0 ? [storedPayload] : [];
  }
  return actor.slotsCurrent.flatMap((remaining, index) => {
    const slotLevel = spellSlotLevel(index + 1);
    if (slotLevel < storedPayload.baseLevel || remaining <= 0) return [];
    const payload = getBattleReadyableSpellPayload(
      spellName as SpellName,
      slotLevel,
    );
    return payload == null ? [] : [payload];
  });
}

function currentReadyableSpellPayload(
  actor: BattleCreatureState,
  spellName: string,
  slotLevel: SpellSlotLevelValue,
): BattleReadyableSpellPayload | null {
  const storedPayload = actor.readyableSpellPayloads.get(spellId(spellName));
  return (
    currentReadyableSpellPayloads(actor, spellName, storedPayload).find(
      (payload) => payload.slotLevel === slotLevel,
    ) ?? null
  );
}

export function getAvailableBattleActions(
  context: BattleContext,
): ReadonlyArray<BattleActionToken> {
  if (context.readyCtx != null) {
    const activeReadyTokens: Array<BattleActionToken> = [];
    for (const actorId of context.readyCtx.eligibleCreatures) {
      const actor = context.creatures.get(actorId);
      if (actor == null || !actor.readiedAction || !actor.reactionAvailable)
        continue;
      activeReadyTokens.push(
        battleToken({
          actorId,
          type: "BATTLE_READY_PASS",
          cost: FREE_COST,
          outcome: { summary: "Decline to release your readied action" },
        }),
      );
      if (actor.readiedSpellParams == null) {
        const targetOptions = [...context.creatures.keys()]
          .filter((creatureId) => creatureId !== actorId)
          .sort();
        if (targetOptions.length > 0) {
          activeReadyTokens.push(
            battleToken<
              Extract<
                BattleActionToken,
                { readonly type: "BATTLE_READY_RELEASE" }
              >
            >({
              actorId,
              type: "BATTLE_READY_RELEASE",
              targetId: { options: targetOptions },
              cost: costs(quotaCost("reaction")),
              outcome: {
                summary:
                  "Spend your reaction to release the readied attack against the chosen target",
              },
            }),
          );
        }
      } else {
        activeReadyTokens.push(
          battleToken<
            Extract<
              BattleActionToken,
              { readonly type: "BATTLE_READY_SPELL_RELEASE" }
            >
          >({
            actorId,
            type: "BATTLE_READY_SPELL_RELEASE",
            cost: costs(quotaCost("reaction")),
            outcome: {
              summary:
                "Spend your reaction to release the readied spell against its chosen target",
            },
          }),
        );
      }
    }
    return activeReadyTokens;
  }

  if (context.laCtx != null) {
    const selected = context.selectedMonsterCommand;
    if (selected == null || selected.type !== "USE_LEGENDARY_ACTION") return [];
    const actor = context.creatures.get(selected.monsterId);
    const statBlock = getMonsterStatBlockByStateId(actor?.monsterStatBlockId);
    const legendary =
      statBlock == null
        ? null
        : statBlockLegendaryAction(statBlock, selected.abilityId);
    if (
      actor == null ||
      statBlock == null ||
      actor.dead ||
      isIncapacitated(actor) ||
      legendary == null ||
      legendary.kind !== "legendaryAction" ||
      legendary.attackId == null ||
      actor.legendaryActionsRemaining < legendary.cost
    ) {
      return [];
    }
    const attackProfile = statBlockAttackBattleProfile(
      statBlock,
      legendary.attackId,
    );
    const targetOptions = [...context.creatures.entries()]
      .filter(
        ([targetId, target]) => targetId !== selected.monsterId && !target.dead,
      )
      .map(([targetId]) => targetId)
      .sort();
    if (attackProfile == null || targetOptions.length === 0) return [];
    return battleAttackTargetGroups({
      context,
      attackerId: selected.monsterId,
      targetOptions,
      weapon: attackProfile,
    }).map((targetGroup) =>
      battleToken<
        Extract<BattleActionToken, { readonly type: "BATTLE_LEGENDARY_ATTACK" }>
      >({
        actorId: selected.monsterId,
        type: "BATTLE_LEGENDARY_ATTACK",
        abilityId: selected.abilityId,
        targetId: { options: [...targetGroup.targetOptions] },
        knockOut: { options: [...targetGroup.knockOutOptions] },
        cost: FREE_COST,
        outcome: {
          summary: `Resolve ${legendary.name} through the battle attack boundary using explicit roll, AC, visibility, adjacency, and reaction-candidate facts`,
        },
      }),
    );
  }

  const awaitCtx = context.awaitCtx;
  if (awaitCtx == null) {
    const activeCreatureId = context.initiative[context.turnIndex];
    if (activeCreatureId == null) return [];
    const activeCreature = context.creatures.get(activeCreatureId);
    if (
      !context.turnStarted ||
      activeCreature == null ||
      activeCreature.dead ||
      isIncapacitated(activeCreature)
    ) {
      return [];
    }
    const tokens: Array<BattleActionToken> = [];
    if (canUseBattleAttack(activeCreature)) {
      const targetOptions = [...context.creatures.entries()]
        .filter(
          ([targetId, target]) => targetId !== activeCreatureId && !target.dead,
        )
        .map(([targetId]) => targetId)
        .sort();
      const weapon = activeCreature.mainHandWeapon ?? UNARMED_STRIKE_PROFILE;
      for (const targetGroup of battleAttackTargetGroups({
        context,
        attackerId: activeCreatureId,
        targetOptions,
        weapon,
      })) {
        tokens.push(
          battleToken<
            Extract<BattleActionToken, { readonly type: "BATTLE_ATTACK" }>
          >({
            actorId: activeCreatureId,
            type: "BATTLE_ATTACK",
            targetId: { options: [...targetGroup.targetOptions] },
            knockOut: { options: [...targetGroup.knockOutOptions] },
            cost: battleAttackCost(activeCreature),
            outcome: {
              summary:
                "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
            },
          }),
        );
      }
    }
    if (canUseBattleOffHandAttack(activeCreature)) {
      const targetOptions = [...context.creatures.entries()]
        .filter(
          ([targetId, target]) => targetId !== activeCreatureId && !target.dead,
        )
        .map(([targetId]) => targetId)
        .sort();
      const weapon = activeCreature.offHandWeapon;
      if (weapon != null) {
        for (const targetGroup of battleAttackTargetGroups({
          context,
          attackerId: activeCreatureId,
          targetOptions,
          weapon,
        })) {
          tokens.push(
            battleToken<
              Extract<
                BattleActionToken,
                { readonly type: "BATTLE_OFF_HAND_ATTACK" }
              >
            >({
              actorId: activeCreatureId,
              type: "BATTLE_OFF_HAND_ATTACK",
              targetId: { options: [...targetGroup.targetOptions] },
              knockOut: { options: [...targetGroup.knockOutOptions] },
              cost: costs(quotaCost("bonusAction")),
              outcome: {
                summary:
                  "Make the Light property's extra attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
              },
            }),
          );
        }
      }
    }
    if (canUseProjectedBattleActionSurge(activeCreature)) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_ACTION_SURGE",
          cost: projectedCosts(...projectedActionSurgeCost()),
          outcome: {
            summary: projectedBattleActionSurgeSummary(
              activeCreatureId,
              activeCreature,
            ),
          },
        }),
      );
    }
    if (
      !activeCreature.bonusActionUsed &&
      !activeCreature.ragingBlocksSpells &&
      activeCreature.barbarianLevel > 0 &&
      activeCreature.rageCharges > 0
    ) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_ENTER_RAGE",
          cost: costs(quotaCost("bonusAction"), poolCost("rage")),
          outcome: {
            summary:
              "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
          },
        }),
      );
    }
    if (
      !activeCreature.bonusActionUsed &&
      activeCreature.battleBonusActionOptions.includes("hide")
    ) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "BATTLE_BONUS_HIDE" }>
        >({
          actorId: activeCreatureId,
          type: "BATTLE_BONUS_HIDE",
          stealthTotal: { options: SUGGESTED_D20_CHECK_TOTAL_OPTIONS },
          hasCoverOrObscurement: { options: [true, false] },
          outOfEnemyLineOfSight: { options: [true, false] },
          cost: costs(quotaCost("bonusAction")),
          outcome: {
            summary:
              "Spend your bonus action to hide using explicit Stealth, cover or obscurement, and line-of-sight facts",
          },
        }),
      );
    }
    if (
      !activeCreature.bonusActionUsed &&
      activeCreature.battleBonusActionOptions.includes("disengage")
    ) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_BONUS_DISENGAGE",
          cost: costs(quotaCost("bonusAction")),
          outcome: {
            summary:
              "Spend your bonus action so your movement does not provoke opportunity attacks this turn",
          },
        }),
      );
    }
    if (
      activeCreature.barbarianLevel >= 2 &&
      activeCreature.actionsRemaining > 0 &&
      !activeCreature.attackActionUsed &&
      !activeCreature.recklessThisTurn
    ) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_DECLARE_RECKLESS",
          cost: FREE_COST,
          outcome: {
            summary: "Declare Reckless Attack for this turn",
          },
        }),
      );
    }
    if (
      canUseBattleAttack(activeCreature) &&
      activeCreature.grapplingTarget == null &&
      battleHasFreeHand(activeCreature)
    ) {
      const targetOptions = [...context.creatures.entries()]
        .filter(
          ([targetId, target]) =>
            targetId !== activeCreatureId &&
            !target.dead &&
            target.grappledBy == null &&
            withinOneSize(activeCreature.creatureSize, target.creatureSize),
        )
        .map(([targetId]) => targetId)
        .sort();
      if (targetOptions.length > 0) {
        tokens.push(
          battleToken<
            Extract<BattleActionToken, { readonly type: "BATTLE_GRAPPLE" }>
          >({
            actorId: activeCreatureId,
            type: "BATTLE_GRAPPLE",
            targetId: { options: targetOptions },
            cost: battleAttackCost(activeCreature),
            outcome: {
              summary:
                "Attempt to grapple the chosen target using the battle-owned size check and an explicit resolved Strength or Dexterity save outcome",
            },
          }),
        );
      }
    }
    if (activeCreature.grapplingTarget != null) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_RELEASE_GRAPPLE",
          cost: FREE_COST,
          outcome: {
            summary:
              "Release the creature you are grappling; no action required",
          },
        }),
      );
    }
    if (
      activeCreature.grappledBy != null &&
      activeCreature.actionsRemaining > 0
    ) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "BATTLE_ESCAPE_GRAPPLE" }>
        >({
          actorId: activeCreatureId,
          type: "BATTLE_ESCAPE_GRAPPLE",
          escapeSucceeded: { options: [true, false] },
          cost: costs(quotaCost("action")),
          outcome: {
            summary:
              "Spend your action to attempt to escape the grapple with a resolved Athletics or Acrobatics check",
          },
        }),
      );
    }
    if (activeCreature.actionsRemaining > 0) {
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "BATTLE_HIDE" }>
        >({
          actorId: activeCreatureId,
          type: "BATTLE_HIDE",
          stealthTotal: { options: SUGGESTED_D20_CHECK_TOTAL_OPTIONS },
          hasCoverOrObscurement: { options: [true, false] },
          outOfEnemyLineOfSight: { options: [true, false] },
          cost: costs(quotaCost("action")),
          outcome: {
            summary:
              "Spend your action to hide using explicit Stealth, cover or obscurement, and line-of-sight facts",
          },
        }),
      );
      const hiddenTargetIds = [...context.creatures]
        .filter(
          ([targetId, target]) =>
            targetId !== activeCreatureId && target.hiddenDiscoveryDc > 0,
        )
        .map(([targetId]) => targetId);
      if (hiddenTargetIds.length > 0) {
        tokens.push(
          battleToken<
            Extract<BattleActionToken, { readonly type: "BATTLE_SEARCH" }>
          >({
            actorId: activeCreatureId,
            type: "BATTLE_SEARCH",
            targetId: { options: hiddenTargetIds },
            perceptionTotal: { options: SUGGESTED_D20_CHECK_TOTAL_OPTIONS },
            cost: costs(quotaCost("action")),
            outcome: {
              summary:
                "Spend your action to Search for a hidden creature with an explicit Wisdom check total",
            },
          }),
        );
      }
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_DASH",
          cost: costs(quotaCost("action")),
          outcome: { summary: "Spend your action to gain extra movement" },
        }),
      );
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_DISENGAGE",
          cost: costs(quotaCost("action")),
          outcome: {
            summary:
              "Spend your action so your movement does not provoke opportunity attacks this turn",
          },
        }),
      );
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_DODGE",
          cost: costs(quotaCost("action")),
          outcome: {
            summary:
              "Spend your action to impose disadvantage on attacks against you until your next turn starts",
          },
        }),
      );
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_READY",
          cost: costs(quotaCost("action")),
          outcome: {
            summary:
              "Spend your action to ready an attack for release with your reaction",
          },
        }),
      );
      const helpAllyOptions: Array<string> = [];
      const helpTargetOptions: Array<string> = [];
      for (const [id, creature] of context.creatures) {
        if (id === activeCreatureId || creature.dead) continue;
        helpTargetOptions.push(id);
        if (!isIncapacitated(creature)) helpAllyOptions.push(id);
      }
      helpAllyOptions.sort();
      helpTargetOptions.sort();
      if (helpAllyOptions.length >= 1 && helpTargetOptions.length >= 2) {
        tokens.push(
          battleToken<
            Extract<BattleActionToken, { readonly type: "BATTLE_HELP_ATTACK" }>
          >({
            actorId: activeCreatureId,
            type: "BATTLE_HELP_ATTACK",
            allyId: { options: helpAllyOptions },
            targetId: { options: helpTargetOptions },
            helperWithin5ftOfTarget: { options: [true] },
            cost: costs(quotaCost("action")),
            outcome: {
              summary:
                "Spend your action to Help an ally's next attack against the target within 5 feet of you",
            },
          }),
        );
      }
      tokens.push(
        ...battleActiveAoeSpellTokens(activeCreatureId, activeCreature),
      );
      tokens.push(
        ...battleActiveSaveSpellTokens(
          activeCreatureId,
          activeCreature,
          context,
        ),
      );
      tokens.push(
        ...battleActiveReadyableSpellTokens(
          activeCreatureId,
          activeCreature,
          context,
        ),
      );
      const activeStatBlock = getMonsterStatBlockByStateId(
        activeCreature.monsterStatBlockId,
      );
      if (activeStatBlock != null) {
        const selected = context.selectedMonsterCommand;
        for (const ability of [
          ...activeStatBlock.actions,
          ...activeStatBlock.bonusActions,
        ]) {
          if (ability.kind !== "traversalMovementAction") continue;
          const traversalEntry = statBlockTraversalMovementActionEntry(
            activeStatBlock,
            ability.id,
          );
          if (traversalEntry == null) continue;
          const { actionType } = traversalEntry;
          if (
            (actionType === "action" && activeCreature.actionsRemaining <= 0) ||
            (actionType === "bonusAction" && activeCreature.bonusActionUsed)
          ) {
            continue;
          }
          const requiresRecharge =
            activeStatBlock.rechargeAbilities[ability.id] != null;
          const requiresDaily =
            activeStatBlock.dailyAbilities[ability.id] != null;
          if (requiresRecharge) {
            if (
              selected?.type !== "USE_RECHARGE_ABILITY" ||
              selected.monsterId !== activeCreatureId ||
              selected.abilityId !== ability.id ||
              !activeCreature.rechargeAvailable[ability.id]
            ) {
              continue;
            }
          } else if (requiresDaily) {
            if (
              selected?.type !== "USE_DAILY_ABILITY" ||
              selected.monsterId !== activeCreatureId ||
              selected.abilityId !== ability.id ||
              (activeCreature.dailyUsesRemaining[ability.id] ?? 0) <= 0
            ) {
              continue;
            }
          }
          tokens.push(
            battleToken<
              Extract<
                BattleActionToken,
                {
                  readonly type: "BATTLE_MONSTER_TRAVERSAL";
                }
              >
            >({
              actorId: activeCreatureId,
              type: "BATTLE_MONSTER_TRAVERSAL",
              abilityId: ability.id,
              cost: costs(actionQuotaCost(actionType)),
              outcome: {
                summary: `Spend your ${actionTypeLabel(actionType)} to move through creature spaces with explicit destination, movement, and entered-creature save facts`,
              },
            }),
          );
        }
        for (const ability of activeStatBlock.actions) {
          if (ability.kind !== "saveEffectAction") continue;
          const targetOptions = [...context.creatures.entries()]
            .filter(
              ([targetId, target]) =>
                targetId !== activeCreatureId &&
                !target.dead &&
                Math.max(
                  Math.abs(
                    activeCreature.battlePosition.row -
                      target.battlePosition.row,
                  ),
                  Math.abs(
                    activeCreature.battlePosition.col -
                      target.battlePosition.col,
                  ),
                ) *
                  5 <=
                  ability.save.rangeFeet,
            )
            .map(([targetId]) => targetId)
            .sort();
          if (targetOptions.length === 0) continue;
          tokens.push(
            battleToken<
              Extract<
                BattleActionToken,
                {
                  readonly type: "BATTLE_MONSTER_SAVE_EFFECT";
                }
              >
            >({
              actorId: activeCreatureId,
              type: "BATTLE_MONSTER_SAVE_EFFECT",
              abilityId: ability.id,
              targetId: { options: targetOptions },
              cost: costs(quotaCost("action")),
              outcome: {
                summary:
                  "Force the chosen target to resolve the monster's single-target saving throw action using explicit save rolls and visibility facts",
              },
            }),
          );
        }
      }
      const wakeTargetOptions = [...context.creatures.entries()]
        .filter(([targetId, target]) => {
          if (
            targetId === activeCreatureId ||
            target.dead ||
            target.hp === 0 ||
            !target.unconscious ||
            Math.max(
              Math.abs(
                activeCreature.battlePosition.row - target.battlePosition.row,
              ),
              Math.abs(
                activeCreature.battlePosition.col - target.battlePosition.col,
              ),
            ) > 1
          ) {
            return false;
          }
          return target.activeEffects.some((effect) =>
            (effect.conditionalGrantedConditions ?? []).some(
              (conditional) =>
                conditional.condition === "unconscious" &&
                conditional.endsEarlyOnWakeActionWithinFeet != null,
            ),
          );
        })
        .map(([targetId]) => targetId)
        .sort();
      if (wakeTargetOptions.length > 0) {
        tokens.push(
          battleToken<
            Extract<BattleActionToken, { readonly type: "BATTLE_WAKE_EFFECT" }>
          >({
            actorId: activeCreatureId,
            type: "BATTLE_WAKE_EFFECT",
            targetId: { options: wakeTargetOptions },
            cost: costs(quotaCost("action")),
            outcome: {
              summary:
                "Take an action to wake the chosen adjacent creature from a conditional unconscious effect while leaving the underlying condition in place",
            },
          }),
        );
      }
    }
    if (activeCreature.prone) {
      const standCost = Math.floor(activeCreature.effectiveSpeed / 2);
      if (standCost > 0 && standCost <= activeCreature.movementRemaining) {
        tokens.push(
          battleToken({
            actorId: activeCreatureId,
            type: "STAND_FROM_PRONE",
            cost: costs(movementCost(standCost)),
            outcome: {
              summary:
                "Spend half your Speed in movement to stand up from Prone",
            },
          }),
        );
      }
    }
    if (!activeCreature.prone && activeCreature.movementRemaining >= 5) {
      tokens.push(
        battleToken({
          actorId: activeCreatureId,
          type: "BATTLE_MOVE",
          cost: costs(movementCost(5)),
          outcome: {
            summary:
              "Spend 5 feet of movement to move one checkpoint, supplying the explicit provocation kind and threatening-reach creature set",
          },
        }),
      );
    }
    return tokens;
  }

  const interrupt = awaitCtx.interrupt;
  if (interrupt.tag === "PIAttackHit") {
    const tokens: Array<BattleActionToken> = [];
    for (const [actorId, legalReactions] of interrupt.ctx
      .legalReactionsByCreature) {
      if (!awaitCtx.eligible.has(actorId)) continue;
      for (const reaction of legalReactions) {
        tokens.push(
          hitReactionToken(
            actorId,
            reaction,
            Array.from(
              interrupt.ctx.redirectableAlliesByReactor.get(actorId)?.keys() ??
                [],
            ),
          ),
        );
      }
    }
    return tokens;
  }

  if (interrupt.tag === "PIAttackDamage") {
    const tokens: Array<BattleActionToken> = [];
    for (const [actorId, legalReactions] of interrupt.ctx
      .legalReactionsByCreature) {
      if (!awaitCtx.eligible.has(actorId)) continue;
      for (const reaction of legalReactions) {
        tokens.push(damageReactionToken(actorId, reaction));
      }
    }
    return tokens;
  }

  if (interrupt.tag === "PISpellCast") {
    const tokens: Array<BattleActionToken> = [];
    for (const actorId of awaitCtx.eligible) {
      const slotLevels = battleCounterspellSlotLevels(actorId, context);
      if (slotLevels.length === 0) continue;
      tokens.push(
        battleToken<
          Extract<BattleActionToken, { readonly type: "CAST_COUNTERSPELL" }>
        >({
          actorId,
          type: "CAST_COUNTERSPELL",
          slotLevel: { options: slotLevels },
          cost: costs(quotaCost("reaction"), poolCost("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Counterspell against the triggering spell",
          },
        }),
      );
    }
    return tokens;
  }

  if (interrupt.tag === "PIAfterDamage") {
    return afterDamageReactionTokens(context);
  }

  return [];
}

function availableBattleTokenForResolved(
  context: BattleContext,
  token: BattleResolvedActionToken,
): BattleActionToken | undefined {
  return getAvailableBattleActions(context).find((candidate) => {
    if (candidate.type !== token.type || candidate.actorId !== token.actorId)
      return false;
    if (
      candidate.type === "BATTLE_READY_SPELL" &&
      token.type === "BATTLE_READY_SPELL"
    ) {
      return candidate.spellName === token.spellName;
    }
    if (candidate.type === "BATTLE_SEARCH" && token.type === "BATTLE_SEARCH") {
      return candidate.targetId.options.includes(token.targetId);
    }
    if (
      (candidate.type === "BATTLE_ATTACK" ||
        candidate.type === "BATTLE_OFF_HAND_ATTACK" ||
        candidate.type === "BATTLE_LEGENDARY_ATTACK") &&
      candidate.type === token.type
    ) {
      if (
        candidate.type === "BATTLE_LEGENDARY_ATTACK" &&
        token.type === "BATTLE_LEGENDARY_ATTACK" &&
        candidate.abilityId !== token.abilityId
      ) {
        return false;
      }
      if (!candidate.targetId.options.includes(token.targetId)) return false;
      return candidate.knockOut.options.includes(token.knockOut);
    }
    if (
      candidate.type === "BATTLE_GRAPPLE" &&
      token.type === "BATTLE_GRAPPLE"
    ) {
      return candidate.targetId.options.includes(token.targetId);
    }
    if (
      candidate.type === "BATTLE_CAST_AOE" &&
      token.type === "BATTLE_CAST_AOE"
    ) {
      return (
        candidate.spellId === token.spellId &&
        candidate.slotLevel.options.includes(token.slotLevel)
      );
    }
    if (
      candidate.type === "BATTLE_CAST_SAVE_SPELL" &&
      token.type === "BATTLE_CAST_SAVE_SPELL"
    ) {
      return (
        candidate.spellId === token.spellId &&
        candidate.slotLevel.options.includes(token.slotLevel) &&
        candidate.targetId.options.includes(token.targetId)
      );
    }
    if (
      candidate.type === "BATTLE_MONSTER_SAVE_EFFECT" &&
      token.type === "BATTLE_MONSTER_SAVE_EFFECT"
    ) {
      return (
        candidate.abilityId === token.abilityId &&
        candidate.targetId.options.includes(token.targetId)
      );
    }
    if (
      candidate.type === "BATTLE_MONSTER_TRAVERSAL" &&
      token.type === "BATTLE_MONSTER_TRAVERSAL"
    ) {
      return candidate.abilityId === token.abilityId;
    }
    if (
      candidate.type === "BATTLE_WAKE_EFFECT" &&
      token.type === "BATTLE_WAKE_EFFECT"
    ) {
      return candidate.targetId.options.includes(token.targetId);
    }
    if (
      candidate.type === "BATTLE_HELP_ATTACK" &&
      token.type === "BATTLE_HELP_ATTACK"
    ) {
      return (
        candidate.allyId.options.includes(token.allyId) &&
        candidate.targetId.options.includes(token.targetId)
      );
    }
    if (
      candidate.type === "USE_REDIRECT_ATTACK" &&
      token.type === "USE_REDIRECT_ATTACK"
    ) {
      return candidate.allyId.options.includes(token.allyId);
    }
    return true;
  });
}

export function resolveBattleAction(
  context: BattleContext,
  token: BattleResolvedActionToken,
): BattleResolutionRequest | ActionResolutionError {
  const availableToken = availableBattleTokenForResolved(context, token);
  if (availableToken == null) {
    return {
      code: "ACTION_NOT_AVAILABLE",
      message: `${token.type} is not currently available for ${token.actorId} in this battle state.`,
    };
  }

  if (token.type === "BATTLE_ACTION_SURGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_ACTION_SURGE" },
    };
  }
  if (
    token.type === "BATTLE_ATTACK" ||
    token.type === "BATTLE_OFF_HAND_ATTACK" ||
    token.type === "BATTLE_LEGENDARY_ATTACK"
  ) {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "battleAttack",
    };
  }
  if (token.type === "BATTLE_GRAPPLE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "battleGrapple",
    };
  }
  if (token.type === "BATTLE_ENTER_RAGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_ENTER_RAGE" },
    };
  }
  if (token.type === "BATTLE_DECLARE_RECKLESS") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_DECLARE_RECKLESS" },
    };
  }
  if (token.type === "BATTLE_RELEASE_GRAPPLE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_RELEASE_GRAPPLE" },
    };
  }
  if (token.type === "BATTLE_ESCAPE_GRAPPLE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_ESCAPE_GRAPPLE",
        escapeSucceeded: token.escapeSucceeded,
      },
    };
  }
  if (
    (token.type === "BATTLE_HIDE" || token.type === "BATTLE_BONUS_HIDE") &&
    !isResolvedD20CheckTotal(token.stealthTotal)
  ) {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message:
        token.type === "BATTLE_HIDE"
          ? "Hide Stealth total must be an integer."
          : "Bonus Hide Stealth total must be an integer.",
    };
  }
  if (
    token.type === "BATTLE_SEARCH" &&
    !isResolvedD20CheckTotal(token.perceptionTotal)
  ) {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: "Search Wisdom check total must be an integer.",
    };
  }
  if (token.type === "BATTLE_HIDE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_HIDE",
        stealthTotal: token.stealthTotal,
        hasCoverOrObscurement: token.hasCoverOrObscurement,
        outOfEnemyLineOfSight: token.outOfEnemyLineOfSight,
      },
    };
  }
  if (token.type === "BATTLE_BONUS_HIDE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_BONUS_HIDE",
        stealthTotal: token.stealthTotal,
        hasCoverOrObscurement: token.hasCoverOrObscurement,
        outOfEnemyLineOfSight: token.outOfEnemyLineOfSight,
      },
    };
  }
  if (token.type === "BATTLE_SEARCH") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_SEARCH",
        targetId: CreatureId(token.targetId),
        perceptionTotal: token.perceptionTotal,
      },
    };
  }
  if (token.type === "BATTLE_CAST_AOE") {
    if (
      !("spellId" in availableToken) ||
      availableToken.spellId !== token.spellId ||
      !("slotLevel" in availableToken) ||
      !availableToken.slotLevel.options.includes(token.slotLevel)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} ${token.spellId} at slot level ${token.slotLevel} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    const actor = context.creatures.get(CreatureId(token.actorId));
    const payload =
      actor == null
        ? null
        : currentReadyableSpellPayload(actor, token.spellId, token.slotLevel);
    if (payload == null) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.spellId} has no battle-owned AoE spell payload for ${token.actorId}.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_CAST_AOE",
        saveDC: payload.release.saveDC,
        dmgOnFail: payload.release.damageOnFail,
        halfOnSave: payload.release.halfOnSuccess,
        dt: payload.release.damageType,
        cond: payload.release.conditionOnFail,
        applyCond: payload.release.applyCondition,
        saveAbility: payload.release.saveAbility,
        slotLvl: payload.slotLevel,
        spellName: token.spellId,
        ritual: false,
      },
    };
  }
  if (token.type === "BATTLE_CAST_SAVE_SPELL") {
    if (
      availableToken.type !== "BATTLE_CAST_SAVE_SPELL" ||
      availableToken.spellId !== token.spellId ||
      !availableToken.slotLevel.options.includes(token.slotLevel) ||
      !availableToken.targetId.options.includes(token.targetId)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} ${token.spellId} at slot level ${token.slotLevel} against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "battleSaveSpell",
    };
  }
  if (token.type === "BATTLE_MONSTER_SAVE_EFFECT") {
    if (
      !("abilityId" in availableToken) ||
      availableToken.abilityId !== token.abilityId ||
      !("targetId" in availableToken) ||
      !availableToken.targetId.options.includes(token.targetId)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} ${token.abilityId} against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "monsterSaveEffect",
    };
  }
  if (token.type === "BATTLE_MONSTER_TRAVERSAL") {
    if (
      !("abilityId" in availableToken) ||
      availableToken.abilityId !== token.abilityId
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} ${token.abilityId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "monsterTraversalMovement",
    };
  }
  if (token.type === "BATTLE_WAKE_EFFECT") {
    if (
      !("targetId" in availableToken) ||
      !availableToken.targetId.options.includes(token.targetId)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_WAKE_EFFECT",
        targetId: CreatureId(token.targetId),
      },
    };
  }
  if (token.type === "BATTLE_HELP_ATTACK") {
    if (
      availableToken.type !== "BATTLE_HELP_ATTACK" ||
      !availableToken.allyId.options.includes(token.allyId) ||
      !availableToken.targetId.options.includes(token.targetId) ||
      token.allyId === token.targetId
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `BATTLE_HELP_ATTACK with allyId ${token.allyId} against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_HELP_ATTACK",
        allyId: CreatureId(token.allyId),
        targetId: CreatureId(token.targetId),
        helperWithin5ftOfTarget: token.helperWithin5ftOfTarget,
      },
    };
  }
  if (token.type === "BATTLE_MOVE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "battleMove",
    };
  }

  if (token.type === "BATTLE_DASH") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_DASH" },
    };
  }
  if (token.type === "BATTLE_DISENGAGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_DISENGAGE" },
    };
  }
  if (token.type === "BATTLE_BONUS_DISENGAGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_BONUS_DISENGAGE" },
    };
  }
  if (token.type === "BATTLE_DODGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_DODGE" },
    };
  }
  if (token.type === "BATTLE_READY") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_READY" },
    };
  }
  if (token.type === "BATTLE_READY_PASS") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_READY_PASS" },
    };
  }
  if (token.type === "BATTLE_READY_RELEASE") {
    if (
      !("targetId" in availableToken) ||
      !availableToken.targetId.options.includes(token.targetId)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `BATTLE_READY_RELEASE against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "readyAttack",
    };
  }
  if (token.type === "BATTLE_READY_SPELL") {
    if (
      !("spellName" in availableToken) ||
      availableToken.spellName !== token.spellName ||
      !("slotLevel" in availableToken) ||
      !availableToken.slotLevel.options.includes(token.slotLevel) ||
      !("targetId" in availableToken) ||
      !availableToken.targetId.options.includes(token.targetId)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} ${token.spellName} against ${token.targetId} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    const actor = context.creatures.get(CreatureId(token.actorId));
    const payload =
      actor == null
        ? null
        : currentReadyableSpellPayload(actor, token.spellName, token.slotLevel);
    if (payload == null) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.spellName} has no battle-owned ready spell payload for ${token.actorId}.`,
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_READY_SPELL",
        targetId: CreatureId(token.targetId),
        saveDC: payload.release.saveDC,
        dmgOnFail: payload.release.damageOnFail,
        halfOnSave: payload.release.halfOnSuccess,
        dt: payload.release.damageType,
        cond: payload.release.conditionOnFail,
        applyCond: payload.release.applyCondition,
        saveAbility: payload.release.saveAbility,
        slotLvl: payload.slotLevel,
        spellName: token.spellName,
      },
    };
  }
  if (token.type === "BATTLE_READY_SPELL_RELEASE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "readySpellRelease",
    };
  }
  if (token.type === "STAND_FROM_PRONE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: { type: "BATTLE_STAND_FROM_PRONE" },
    };
  }
  if (token.type === "CAST_COUNTERSPELL") {
    if (
      !("slotLevel" in availableToken) ||
      !availableToken.slotLevel.options.includes(token.slotLevel)
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `CAST_COUNTERSPELL at slot level ${token.slotLevel} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    const interrupt = context.awaitCtx?.interrupt;
    if (interrupt == null || interrupt.tag !== "PISpellCast") {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} is not currently available for ${token.actorId} in this battle state.`,
      };
    }
    const targetSpellLevel = interrupt.ctx.slotLvl;
    if (targetSpellLevel == null) {
      return {
        code: "ACTION_NOT_SUPPORTED",
        message: `Counterspell cannot resolve ${interrupt.ctx.spellName} because its spell level is not modeled yet.`,
      };
    }
    if (counterspellAutoSuccess(targetSpellLevel, token.slotLevel)) {
      return {
        token,
        outcome: availableToken.outcome.summary,
        runtime: "none",
        event: {
          type: "BATTLE_RESOLVE_COUNTERSPELL",
          reactorId: CreatureId(token.actorId),
          decision: { tag: "RCounterspell", saveSucceeded: false },
          csSlotLvl: token.slotLevel,
        },
      };
    }
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "counterspell",
    };
  }
  if (token.type === "USE_UNCANNY_DODGE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_DMG_REACTION",
        reactorId: CreatureId(token.actorId),
        decision: { tag: "RUncannyDodge" },
      },
    };
  }
  if (token.type === "CAST_SHIELD") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: CreatureId(token.actorId),
        decision: { tag: "RShield" },
      },
    };
  }
  if (token.type === "USE_PARRY") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: CreatureId(token.actorId),
        decision: {
          tag: "RParry",
          bonus:
            context.creatures.get(CreatureId(token.actorId))?.parryAcBonus ?? 0,
        },
      },
    };
  }
  if (token.type === "USE_CUTTING_WORDS") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "cuttingWords",
    };
  }
  if (token.type === "USE_REDIRECT_ATTACK") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: CreatureId(token.actorId),
        decision: {
          tag: "RRedirectAttack",
          allyId: CreatureId(token.allyId),
        },
      },
    };
  }
  if (token.type === "USE_DEFLECT_ATTACKS") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "deflectAttacks",
    };
  }
  if (token.type === "CAST_HELLISH_REBUKE") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "hellishRebuke",
    };
  }
  if (token.type === "USE_RETALIATION") {
    return {
      token,
      outcome: availableToken.outcome.summary,
      runtime: "retaliation",
    };
  }
  return {
    token,
    outcome: availableToken.outcome.summary,
    runtime: "fireShield",
  };
}

export function finalizeBattleResolution(
  request: BattleResolutionRequest,
  runtimeInputs: BattleResolutionRuntimeInputs,
  context: BattleContext,
): FinalizedBattleAction {
  if (request.runtime === "none") {
    if (runtimeInputs.runtime !== "none")
      return battleRuntimeMismatch("none", runtimeInputs.runtime);
    return { ok: true, event: request.event, outcome: request.outcome };
  }

  return Match.value(request).pipe(
    Match.when({ runtime: "battleAttack" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "battleAttack") {
        return battleRuntimeMismatch("battleAttack", runtimeInputs.runtime);
      }
      if (
        request.token.type !== "BATTLE_ATTACK" &&
        request.token.type !== "BATTLE_OFF_HAND_ATTACK" &&
        request.token.type !== "BATTLE_LEGENDARY_ATTACK"
      ) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Battle-attack runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      if (actor == null) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_AVAILABLE",
            message: `${request.token.type} is not currently available for ${request.token.actorId} in this battle state.`,
          },
        };
      }
      const weapon =
        request.token.type === "BATTLE_ATTACK"
          ? (actor.mainHandWeapon ?? UNARMED_STRIKE_PROFILE)
          : request.token.type === "BATTLE_OFF_HAND_ATTACK"
            ? actor.offHandWeapon
            : (() => {
                const statBlock = getMonsterStatBlockByStateId(
                  actor.monsterStatBlockId,
                );
                const legendary =
                  statBlock == null
                    ? null
                    : statBlockLegendaryAction(
                        statBlock,
                        request.token.abilityId,
                      );
                if (
                  statBlock == null ||
                  legendary == null ||
                  legendary.kind !== "legendaryAction" ||
                  legendary.attackId == null
                ) {
                  return null;
                }
                return statBlockAttackBattleProfile(
                  statBlock,
                  legendary.attackId,
                );
              })();
      if (weapon == null) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_AVAILABLE",
            message: `${request.token.type} is not currently available for ${request.token.actorId} in this battle state.`,
          },
        };
      }
      const {
        attackRoll,
        targetAc,
        weaponDamage,
        attackerWithin5ft,
        attackerWithin60ft,
        hostileWithin5ft,
        targetCanSeeAttacker,
        attackerCanSeeTarget,
        frightSourceInLOS,
        hasAllyAdjacentToTarget,
        hitReactionCandidates,
      } = runtimeInputs.values;
      if (attackRoll < 1 || attackRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Battle attack roll must be between 1 and 20.",
          },
        };
      }
      if (targetAc < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Battle target AC must be non-negative.",
          },
        };
      }
      if (actor.mainHandWeapon == null && !attackerWithin5ft) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message:
              "Unarmed strike runtime must confirm the target is within 5 feet.",
          },
        };
      }
      if (weaponDamage < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Battle weapon damage must be non-negative.",
          },
        };
      }
      if (!attackerWithin5ft && attackerWithin60ft === undefined) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message:
              "Battle attack runtime must include attackerWithin60ft when attackerWithin5ft is false.",
          },
        };
      }
      const isMelee = canBattleAttackUseMeleeLane(weapon, attackerWithin5ft);
      const targetCreature = context.creatures.get(
        CreatureId(request.token.targetId),
      );
      const actualTargetAc =
        targetCreature == null
          ? armorClass(targetAc)
          : battleCurrentArmorClass(targetCreature);
      const commonEvent = {
        targetId: CreatureId(request.token.targetId),
        attackRoll,
        crit: attackRoll >= actor.critRange,
        tAc: actualTargetAc,
        knockOut: request.token.knockOut,
        attackerWithin5ft,
        ...(attackerWithin60ft !== undefined ? { attackerWithin60ft } : {}),
        hostileWithin5ft,
        targetCanSeeAttacker,
        attackerCanSeeTarget,
        frightSourceInLOS,
        hasAllyAdjacentToTarget,
        saDmg: 0,
        hitReactionCandidates: new Set(
          hitReactionCandidates.map((id) => CreatureId(id)),
        ),
      };
      return {
        ok: true,
        event:
          request.token.type === "BATTLE_ATTACK"
            ? {
                type: "BATTLE_ATTACK",
                ...commonEvent,
                diceCount: weapon.diceCount ?? 1,
                dieSize: weapon.damageDie ?? 0,
                dmg: weaponDamage,
                dt: weapon.damageType,
                damageQualifiers: weapon.damageQualifiers ?? new Set(),
                isMelee,
                weaponProperties: weapon.properties,
                isFinesse: weapon.properties.has("finesse"),
              }
            : request.token.type === "BATTLE_OFF_HAND_ATTACK"
              ? {
                  type: "BATTLE_OFF_HAND_ATTACK",
                  ...commonEvent,
                  dmg: weaponDamage,
                }
              : {
                  type: "BATTLE_LEGENDARY_ATTACK",
                  monsterId: CreatureId(request.token.actorId),
                  abilityId: request.token.abilityId,
                  laTarget: CreatureId(request.token.targetId),
                  laAtkRoll: attackRoll,
                  laDmg: weaponDamage,
                  laDt: weapon.damageType,
                  damageQualifiers: weapon.damageQualifiers ?? new Set(),
                  laCrit: attackRoll >= actor.critRange,
                  laTgtAc: actualTargetAc,
                  knockOut: request.token.knockOut,
                  isMelee,
                  weaponProperties: weapon.properties,
                  isFinesse: weapon.properties.has("finesse"),
                  attackerWithin5ft,
                  ...(attackerWithin60ft !== undefined
                    ? { attackerWithin60ft }
                    : {}),
                  hostileWithin5ft,
                  targetCanSeeAttacker,
                  attackerCanSeeTarget,
                  frightSourceInLOS,
                  hasAllyAdjacentToTarget,
                  saDmg: 0,
                  hitReactionCandidates: new Set(
                    hitReactionCandidates.map((id) => CreatureId(id)),
                  ),
                },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "battleGrapple" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "battleGrapple") {
        return battleRuntimeMismatch("battleGrapple", runtimeInputs.runtime);
      }
      if (request.token.type !== "BATTLE_GRAPPLE") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Battle-grapple runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_GRAPPLE",
          targetId: CreatureId(request.token.targetId),
          targetSaveFailed: runtimeInputs.values.targetSaveFailed,
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "battleSaveSpell" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "battleSaveSpell") {
        return battleRuntimeMismatch("battleSaveSpell", runtimeInputs.runtime);
      }
      if (request.token.type !== "BATTLE_CAST_SAVE_SPELL") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Save-spell runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const { saveRoll, saveRollB } = runtimeInputs.values;
      if (saveRoll < 1 || saveRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Battle save-spell primary save roll must be 1-20.",
          },
        };
      }
      if (saveRollB != null && (saveRollB < 1 || saveRollB > 20)) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Battle save-spell secondary save roll must be 1-20.",
          },
        };
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      const payload =
        actor == null
          ? null
          : currentReadyableSpellPayload(
              actor,
              request.token.spellId,
              request.token.slotLevel,
            );
      if (payload == null) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_AVAILABLE",
            message: `${request.token.type} ${request.token.spellId} is not currently available for ${request.token.actorId} in this battle state.`,
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_CAST_SAVE_SPELL",
          targetId: CreatureId(request.token.targetId),
          saveDC: payload.release.saveDC,
          saveRoll,
          ...(saveRollB != null ? { saveRollB } : {}),
          dmgOnFail: payload.release.damageOnFail,
          halfOnSave: payload.release.halfOnSuccess,
          dt: payload.release.damageType,
          cond: payload.release.conditionOnFail,
          applyCond: payload.release.applyCondition,
          saveAbility: payload.release.saveAbility,
          slotLvl: payload.slotLevel,
          spellName: request.token.spellId,
          ritual: false,
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "battleMove" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "battleMove") {
        return battleRuntimeMismatch("battleMove", runtimeInputs.runtime);
      }
      if (request.token.type !== "BATTLE_MOVE") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Battle-move runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const { provocationKind, threatened } = runtimeInputs.values;
      const creatureIds = new Set([...context.creatures.keys()].map(String));
      const unknownThreatener = threatened.find((id) => !creatureIds.has(id));
      if (unknownThreatener != null) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: `Battle-move threatened creature ${unknownThreatener} is not a participant in this battle.`,
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_MOVE",
          provocationKind,
          threatened: new Set(threatened.map((id) => CreatureId(id))),
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "readyAttack" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "readyAttack") {
        return battleRuntimeMismatch("readyAttack", runtimeInputs.runtime);
      }
      if (request.token.type !== "BATTLE_READY_RELEASE") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Ready-attack runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      const attackRoll = runtimeInputs.values.atkRoll;
      const damage = runtimeInputs.values.dmg;
      const targetAc = runtimeInputs.values.tgtAc;
      if (attackRoll < 1 || attackRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Ready attack roll must be between 1 and 20.",
          },
        };
      }
      if (damage < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Ready attack damage must be non-negative.",
          },
        };
      }
      const targetCreature = context.creatures.get(
        CreatureId(request.token.targetId),
      );
      return {
        ok: true,
        event: {
          type: "BATTLE_READY_RELEASE",
          releaserId: CreatureId(request.token.actorId),
          targetId: CreatureId(request.token.targetId),
          atkRoll: attackRoll,
          dmg: damage,
          dt: actor?.mainHandWeapon?.damageType ?? "slashing",
          damageQualifiers:
            actor?.mainHandWeapon?.damageQualifiers ?? new Set(),
          crit: runtimeInputs.values.crit,
          tgtAc:
            targetCreature == null
              ? armorClass(targetAc)
              : battleCurrentArmorClass(targetCreature),
          knockOut: runtimeInputs.values.knockOut,
          isMelee: actor?.mainHandWeapon?.isMelee ?? true,
          weaponProperties: actor?.mainHandWeapon?.properties ?? new Set(),
          attackerWithin5ft: true,
          attackerWithin60ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          saDmg: 0,
          hitReactionCandidates: new Set(),
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "monsterSaveEffect" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "monsterSaveEffect") {
        return battleRuntimeMismatch(
          "monsterSaveEffect",
          runtimeInputs.runtime,
        );
      }
      if (request.token.type !== "BATTLE_MONSTER_SAVE_EFFECT") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Monster save-effect runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      const statBlock = getMonsterStatBlockByStateId(actor?.monsterStatBlockId);
      const ability =
        statBlock == null
          ? null
          : statBlockSaveEffectAction(statBlock, request.token.abilityId);
      if (actor == null || ability == null) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_AVAILABLE",
            message: `${request.token.type} is not currently available for ${request.token.actorId} in this battle state.`,
          },
        };
      }
      const { saveRoll, saveRollB, actorCanSeeTarget } = runtimeInputs.values;
      if (saveRoll < 1 || saveRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message:
              "Monster save-effect primary roll must be between 1 and 20.",
          },
        };
      }
      if (saveRollB != null && (saveRollB < 1 || saveRollB > 20)) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message:
              "Monster save-effect secondary roll must be between 1 and 20.",
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_MONSTER_SAVE_EFFECT",
          abilityId: request.token.abilityId,
          targetId: CreatureId(request.token.targetId),
          saveRoll,
          ...(saveRollB != null ? { saveRollB } : {}),
          actorCanSeeTarget,
        },
        outcome: request.outcome,
      };
    }),
    Match.when(
      { runtime: "monsterTraversalMovement" },
      (): FinalizedBattleAction => {
        if (runtimeInputs.runtime !== "monsterTraversalMovement") {
          return battleRuntimeMismatch(
            "monsterTraversalMovement",
            runtimeInputs.runtime,
          );
        }
        if (request.token.type !== "BATTLE_MONSTER_TRAVERSAL") {
          return {
            ok: false,
            error: {
              code: "ACTION_NOT_SUPPORTED",
              message: `Monster traversal runtime cannot finalize ${request.token.type}.`,
            },
          };
        }
        const actor = context.creatures.get(CreatureId(request.token.actorId));
        const statBlock = getMonsterStatBlockByStateId(
          actor?.monsterStatBlockId,
        );
        const ability =
          statBlock == null
            ? null
            : statBlockTraversalMovementAction(
                statBlock,
                request.token.abilityId,
              );
        if (actor == null || ability == null) {
          return {
            ok: false,
            error: {
              code: "ACTION_NOT_AVAILABLE",
              message: `${request.token.type} is not currently available for ${request.token.actorId} in this battle state.`,
            },
          };
        }
        const { destination, movementSpent, enteredCreatures } =
          runtimeInputs.values;
        if (
          !Number.isInteger(destination.row) ||
          !Number.isInteger(destination.col)
        ) {
          return {
            ok: false,
            error: {
              code: "INVALID_RUNTIME_INPUT",
              message:
                "Monster traversal destination must use integer row and col coordinates.",
            },
          };
        }
        if (!Number.isInteger(movementSpent) || movementSpent < 0) {
          return {
            ok: false,
            error: {
              code: "INVALID_RUNTIME_INPUT",
              message:
                "Monster traversal movement spent must be a non-negative integer.",
            },
          };
        }
        const seenTargets = new Set<string>();
        for (const entered of enteredCreatures) {
          if (seenTargets.has(entered.targetId)) {
            return {
              ok: false,
              error: {
                code: "INVALID_RUNTIME_INPUT",
                message:
                  "Monster traversal entered-creature list must target each creature at most once.",
              },
            };
          }
          seenTargets.add(entered.targetId);
          if (entered.saveRoll < 1 || entered.saveRoll > 20) {
            return {
              ok: false,
              error: {
                code: "INVALID_RUNTIME_INPUT",
                message:
                  "Monster traversal primary save roll must be between 1 and 20.",
              },
            };
          }
          if (
            entered.saveRollB != null &&
            (entered.saveRollB < 1 || entered.saveRollB > 20)
          ) {
            return {
              ok: false,
              error: {
                code: "INVALID_RUNTIME_INPUT",
                message:
                  "Monster traversal secondary save roll must be between 1 and 20.",
              },
            };
          }
        }
        return {
          ok: true,
          event: {
            type: "BATTLE_MONSTER_TRAVERSAL",
            abilityId: request.token.abilityId,
            destination,
            movementSpent,
            enteredCreatures: enteredCreatures.map((entered) => ({
              targetId: CreatureId(entered.targetId),
              saveRoll: entered.saveRoll,
              ...(entered.saveRollB != null
                ? { saveRollB: entered.saveRollB }
                : {}),
            })),
          },
          outcome: request.outcome,
        };
      },
    ),
    Match.when({ runtime: "readySpellRelease" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "readySpellRelease") {
        return battleRuntimeMismatch(
          "readySpellRelease",
          runtimeInputs.runtime,
        );
      }
      if (request.token.type !== "BATTLE_READY_SPELL_RELEASE") {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_SUPPORTED",
            message: `Ready-spell runtime cannot finalize ${request.token.type}.`,
          },
        };
      }
      const saveRoll = runtimeInputs.values.saveRoll;
      const saveRollB = runtimeInputs.values.saveRollB;
      if (saveRoll < 1 || saveRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Ready spell save roll must be between 1 and 20.",
          },
        };
      }
      if (saveRollB != null && (saveRollB < 1 || saveRollB > 20)) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message:
              "Ready spell secondary save roll must be between 1 and 20.",
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_READY_SPELL_RELEASE",
          releaserId: CreatureId(request.token.actorId),
          saveRoll,
          ...(saveRollB != null ? { saveRollB } : {}),
        },
        outcome: request.outcome,
      };
    }),
    Match.when(
      { runtime: "counterspell" },
      (counterspellRequest): FinalizedBattleAction => {
        if (runtimeInputs.runtime !== "counterspell")
          return battleRuntimeMismatch("counterspell", runtimeInputs.runtime);
        if (counterspellRequest.token.type !== "CAST_COUNTERSPELL") {
          return {
            ok: false,
            error: {
              code: "ACTION_NOT_SUPPORTED",
              message: `Counterspell runtime cannot finalize ${counterspellRequest.token.type}.`,
            },
          };
        }
        return {
          ok: true,
          event: {
            type: "BATTLE_RESOLVE_COUNTERSPELL",
            reactorId: CreatureId(counterspellRequest.token.actorId),
            decision: {
              tag: "RCounterspell",
              saveSucceeded: runtimeInputs.values.saveSucceeded,
            },
            csSlotLvl: counterspellRequest.token.slotLevel,
          },
          outcome: counterspellRequest.outcome,
        };
      },
    ),
    Match.when({ runtime: "cuttingWords" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "cuttingWords")
        return battleRuntimeMismatch("cuttingWords", runtimeInputs.runtime);
      const bardLevel =
        context.creatures.get(CreatureId(request.token.actorId))?.bardLevel ??
        0;
      const maxReduction = bardicInspirationDie(bardLevel);
      const reduction = runtimeInputs.values.reduction;
      if (reduction < 1 || reduction > maxReduction) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: `Cutting Words reduction must be between 1 and ${maxReduction}.`,
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_RESOLVE_HIT_REACTION",
          reactorId: CreatureId(request.token.actorId),
          decision: { tag: "RCuttingWords", reduction },
        },
        outcome: `${request.outcome} (${reduction})`,
      };
    }),
    Match.when({ runtime: "deflectAttacks" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "deflectAttacks") {
        return battleRuntimeMismatch("deflectAttacks", runtimeInputs.runtime);
      }
      const reactor = context.creatures.get(CreatureId(request.token.actorId));
      const d10Roll = runtimeInputs.values.d10Roll;
      if (d10Roll < 1 || d10Roll > 10) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Deflect Attacks d10 roll must be between 1 and 10.",
          },
        };
      }
      const amount = deflectAttacksReduction(
        d10Roll,
        reactor?.dexMod ?? 0,
        reactor?.monkLevel ?? 0,
      );
      return {
        ok: true,
        event: {
          type: "BATTLE_RESOLVE_DMG_REACTION",
          reactorId: CreatureId(request.token.actorId),
          decision: { tag: "RDeflectAttacks", amount },
        },
        outcome: `${request.outcome} (${amount})`,
      };
    }),
    Match.when({ runtime: "hellishRebuke" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "hellishRebuke") {
        return battleRuntimeMismatch("hellishRebuke", runtimeInputs.runtime);
      }
      const damage = runtimeInputs.values.damage;
      if (damage < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Hellish Rebuke damage must be non-negative.",
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_AFTER_DAMAGE_SPELL_REACTION",
          reactorId: CreatureId(request.token.actorId),
          reactionDmg: damage,
          reactionSaved: runtimeInputs.values.saveSucceeded,
          reactionDt: "fire",
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "retaliation" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "retaliation") {
        return battleRuntimeMismatch("retaliation", runtimeInputs.runtime);
      }
      const { attackRoll, damage, critical } = runtimeInputs.values;
      if (attackRoll < 1 || attackRoll > 20) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Retaliation attack roll must be between 1 and 20.",
          },
        };
      }
      if (damage < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Retaliation damage must be non-negative.",
          },
        };
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      return {
        ok: true,
        event: {
          type: "BATTLE_AFTER_DAMAGE_RETALIATION",
          reactorId: CreatureId(request.token.actorId),
          retAtkRoll: attackRoll,
          retDmg: damage,
          retDt: actor?.mainHandWeapon?.damageType ?? "slashing",
          retCrit: critical,
        },
        outcome: request.outcome,
      };
    }),
    Match.when({ runtime: "fireShield" }, (): FinalizedBattleAction => {
      if (runtimeInputs.runtime !== "fireShield") {
        return battleRuntimeMismatch("fireShield", runtimeInputs.runtime);
      }
      const actor = context.creatures.get(CreatureId(request.token.actorId));
      const payload = actor?.activeEffects.find(
        (effect) => effect.reactivePayload?.trigger === "meleeHitWithin5ft",
      )?.reactivePayload;
      if (payload == null) {
        return {
          ok: false,
          error: {
            code: "ACTION_NOT_AVAILABLE",
            message: "Fire Shield has no active reactive payload.",
          },
        };
      }
      const damage = runtimeInputs.values.damage;
      if (damage < 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_RUNTIME_INPUT",
            message: "Fire Shield damage must be non-negative.",
          },
        };
      }
      return {
        ok: true,
        event: {
          type: "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT",
          reactorId: CreatureId(request.token.actorId),
          reactionDmg: damage,
          reactionDt: payload.damageType,
        },
        outcome: request.outcome,
      };
    }),
    Match.exhaustive,
  );
}

export function previewBattleAction(
  context: BattleContext,
  token: BattleResolvedActionToken,
): PreviewedBattleAction {
  const request = resolveBattleAction(context, token);
  if ("code" in request) return { ok: false, error: request };
  const availableToken = availableBattleTokenForResolved(context, token);
  return {
    ok: true,
    summary: availableToken?.outcome.summary ?? token.type,
    cost: availableToken?.cost ?? FREE_COST,
    runtime: request.runtime,
    eventType: request.runtime === "none" ? request.event.type : undefined,
  };
}

function runtimeMismatch(
  expected: ResolutionRuntimeInputs["runtime"],
  actual: ResolutionRuntimeInputs["runtime"],
): FinalizedAction {
  return {
    ok: false as const,
    error: {
      code: "RUNTIME_INPUT_MISMATCH" as const,
      message: `Expected ${expected} runtime inputs, received ${actual}.`,
    },
  };
}

function battleRuntimeMismatch(
  expected: BattleResolutionRuntimeInputs["runtime"],
  actual: BattleResolutionRuntimeInputs["runtime"],
): FinalizedBattleAction {
  return {
    ok: false,
    error: {
      code: "RUNTIME_INPUT_MISMATCH",
      message: `Expected ${expected} runtime inputs, received ${actual}.`,
    },
  };
}

function availableTokenForType(
  context: DndContext,
  tags: ReadonlySet<string>,
  type: SupportedActionType,
): CreatureActionToken | undefined {
  return getAvailableActions(context, tags).find(
    (token): token is CreatureActionToken =>
      token.scope === "creature" && token.type === type,
  );
}

function shortRestAvailableHitDice(context: DndContext): ReadonlyArray<{
  readonly className: ClassName;
  readonly remaining: number;
  readonly dieSize: number;
}> {
  return CLASS_NAMES.flatMap((className) => {
    const remaining = context.hitDiceRemaining[className];
    return remaining > 0
      ? [{ className, remaining, dieSize: classHitDie(className) }]
      : [];
  });
}

function canBenefitFromShortRest(context: DndContext): boolean {
  if (context.inCombat || context.hp < 1) return false;
  if (shortRestAvailableHitDice(context).length > 0) return true;
  if (context.pactSlotsCurrent < context.pactSlotsMax) return true;
  if (Object.values(context.rechargeAvailable).some((available) => !available))
    return true;

  const fighter = context.classStates.fighter;
  if (
    fighter &&
    (fighter.secondWindCharges < fighter.secondWindMax ||
      fighter.actionSurgeCharges < fighter.actionSurgeMax)
  ) {
    return true;
  }

  const barbarian = context.classStates.barbarian;
  if (
    barbarian &&
    (barbarian.rageCharges < barbarian.rageMaxCharges ||
      barbarian.relentlessRageTimesUsed > 0)
  ) {
    return true;
  }

  const monk = context.classStates.monk;
  if (monk && monk.focusPoints < monk.focusMax) return true;

  const paladin = context.classStates.paladin;
  if (
    paladin &&
    paladin.paladinChannelDivinityCharges < paladin.paladinChannelDivinityMax
  )
    return true;

  const cleric = context.classStates.cleric;
  if (
    cleric &&
    cleric.clericChannelDivinityCharges < cleric.clericChannelDivinityMax
  )
    return true;

  const druid = context.classStates.druid;
  if (druid && druid.wildShapeCharges < druid.wildShapeMax) return true;

  const bard = context.classStates.bard;
  if (bard && bard.bardicInspirationCharges < bard.bardicInspirationMax)
    return true;

  const sorcerer = context.classStates.sorcerer;
  if (sorcerer && !sorcerer.sorcerousRestorationUsed) return true;

  return false;
}

function isLegalShortRestSpendPlan(
  context: DndContext,
  spendHitDice: ReadonlyArray<ClassName>,
): boolean {
  if (context.inCombat || context.hp < 1) return false;
  const remaining = { ...context.hitDiceRemaining };
  for (const className of spendHitDice) {
    if (remaining[className] <= 0) return false;
    remaining[className]--;
  }
  return true;
}

export function resolveAction(
  context: DndContext,
  tags: ReadonlySet<string>,
  token: ResolvedActionToken,
): ResolutionRequest | ActionResolutionError {
  // FIXME: why not compile time check in this function at least? quint parity?
  if (token.scope === "battle") {
    return {
      code: "ACTION_NOT_SUPPORTED",
      message: `${token.type} is battle-scoped and cannot execute through the creature action pipeline.`,
    };
  }
  if (token.type === "CAST_PREPARED_SPELL") {
    if (
      // FIXME: only null slots?? I don't get it
      token.slotLevel == null &&
      canUseProjectedPreparedSpell(context, token.spellName)
    ) {
      return {
        token,
        outcome: projectedPreparedSpellSummary(context, token.spellName),
        runtime: "projectedPreparedSpell",
        event: {
          type: "CAST_PREPARED_SPELL",
          spellName: token.spellName,
        },
      };
    }
    if (!isAcceptedByMachine(token.type, tags)) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} is not currently available in this state.`,
      };
    }
    const spell = getModeledPreparedSpellInfo(token.spellName);
    if (spell == null) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.spellName} is not currently available in this state.`,
      };
    }
    if (
      token.slotLevel == null ||
      !legalPreparedSpellSlotLevels(context, token.spellName).includes(
        token.slotLevel,
      )
    ) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${displaySpellName(token.spellName)} with a level ${token.slotLevel} slot is not currently available in this state.`,
      };
    }
    return {
      token,
      outcome: spell.concentration
        ? `Cast ${displaySpellName(token.spellName)} with a level ${token.slotLevel} spell slot and begin concentrating on it`
        : `Cast ${displaySpellName(token.spellName)} with a level ${token.slotLevel} spell slot`,
      runtime: "none",
      event: {
        type: "CAST_PREPARED_SPELL",
        spellName: token.spellName,
        slotLevel: token.slotLevel,
      },
    };
  }

  const available = availableTokenForType(context, tags, token.type);
  if (available == null) {
    return {
      code: "ACTION_NOT_AVAILABLE" as const,
      message: `${token.type} is not currently available in this state.`,
    };
  }

  switch (token.type) {
    case "ENTER_COMBAT":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "ENTER_COMBAT" },
      };
    case "USE_HEROIC_INSPIRATION":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_HEROIC_INSPIRATION" },
      };
    case "START_TURN":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "startTurn",
      };
    case "USE_ACTION_SURGE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "actionSurge",
        event: { type: "USE_ACTION_SURGE" },
      };
    case "USE_INDOMITABLE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_INDOMITABLE" },
      };
    case "USE_TACTICAL_MIND":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "tacticalMind",
      };
    case "CONVERT_SLOT_TO_POINTS":
      if (!legalConvertSlotToPointsLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Level ${token.slotLevel} slot conversion is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to gain ${token.slotLevel} sorcery points`,
        runtime: "none",
        event: { type: "CONVERT_SLOT_TO_POINTS", slotLevel: token.slotLevel },
      };
    case "CONVERT_POINTS_TO_SLOT":
      if (!legalConvertPointsToSlotLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Creating a level ${token.slotLevel} slot is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Spend ${slotCreationCost(token.slotLevel)} sorcery points to create a level ${token.slotLevel} spell slot`,
        runtime: "none",
        event: { type: "CONVERT_POINTS_TO_SLOT", slotLevel: token.slotLevel },
      };
    case "ENTER_RAGE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "ENTER_RAGE" },
      };
    case "END_RAGE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "END_RAGE" },
      };
    case "EXTEND_RAGE_BA":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "EXTEND_RAGE_BA" },
      };
    case "DECLARE_RECKLESS":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "DECLARE_RECKLESS" },
      };
    case "USE_LAY_ON_HANDS":
      if (!legalLayOnHandsAmounts(context).includes(token.amount)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Spending ${token.amount} Lay on Hands points is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Spend ${token.amount} Lay on Hands point${token.amount === 1 ? "" : "s"} to restore up to ${token.amount} HP`,
        runtime: "none",
        event: { type: "USE_LAY_ON_HANDS", amount: token.amount },
      };
    case "USE_DIVINE_SMITE":
      if (!legalDivineSmiteLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Divine Smite with a level ${token.slotLevel} slot is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to use Divine Smite`,
        runtime: "none",
        event: { type: "USE_DIVINE_SMITE", slotLevel: token.slotLevel },
      };
    case "FLURRY_OF_BLOWS":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "FLURRY_OF_BLOWS" },
      };
    case "PATIENT_DEFENSE_FREE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "PATIENT_DEFENSE_FREE" },
      };
    case "PATIENT_DEFENSE_FOCUS":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "PATIENT_DEFENSE_FOCUS" },
      };
    case "STEP_OF_THE_WIND_FREE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "STEP_OF_THE_WIND_FREE" },
      };
    case "STEP_OF_THE_WIND_FOCUS":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "STEP_OF_THE_WIND_FOCUS" },
      };
    case "WHOLENESS_OF_BODY":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "wholenessOfBody",
      };
    case "UNCANNY_METABOLISM":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "uncannyMetabolism",
      };
    case "USE_ARCANE_RECOVERY":
      if (!legalArcaneRecoveryLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Arcane Recovery for a level ${token.slotLevel} slot is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Recover one expended level ${token.slotLevel} spell slot`,
        runtime: "none",
        event: { type: "USE_ARCANE_RECOVERY", slotLevel: token.slotLevel },
      };
    case "USE_OVERCHANNEL":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_OVERCHANNEL" },
      };
    case "USE_METAMAGIC": {
      const legalOptions = legalMetamagicOptions(context);
      if (!legalOptions.includes(token.option)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `${token.option} Metamagic is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Apply ${token.option} Metamagic`,
        runtime: "none",
        event: { type: "USE_METAMAGIC", option: token.option },
      };
    }
    case "USE_INNATE_SORCERY":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_INNATE_SORCERY" },
      };
    case "USE_MAGICAL_CUNNING":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_MAGICAL_CUNNING" },
      };
    case "ENTER_WILD_SHAPE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "ENTER_WILD_SHAPE" },
      };
    case "EXIT_WILD_SHAPE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "EXIT_WILD_SHAPE" },
      };
    case "USE_WILD_RESURGENCE_SLOT":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_WILD_RESURGENCE_SLOT" },
      };
    case "USE_MYSTIC_ARCANUM":
      if (!legalMysticArcanumLevels(context).includes(token.spellLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Mystic Arcanum level ${token.spellLevel} is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Cast your Mystic Arcanum spell of level ${token.spellLevel}`,
        runtime: "none",
        event: { type: "USE_MYSTIC_ARCANUM", spellLevel: token.spellLevel },
      };
    case "USE_SECOND_WIND":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "secondWind",
      };
    case "USE_TIRELESS":
      return { token, outcome: available.outcome.summary, runtime: "tireless" };
    case "USE_SNEAK_ATTACK":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_SNEAK_ATTACK" },
      };
    case "USE_STEADY_AIM":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_STEADY_AIM" },
      };
    case "CUNNING_ACTION_DASH":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "CUNNING_ACTION_DASH" },
      };
    case "CUNNING_ACTION_DISENGAGE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "CUNNING_ACTION_DISENGAGE" },
      };
    case "CUNNING_ACTION_HIDE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "CUNNING_ACTION_HIDE" },
      };
    case "USE_CLERIC_CHANNEL_DIVINITY":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_CLERIC_CHANNEL_DIVINITY" },
      };
    case "USE_FONT_SLOT_RESTORE":
      if (!legalFontSlotRestoreLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Font of Inspiration restore with a level ${token.slotLevel} slot is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to regain one Bardic Inspiration use`,
        runtime: "none",
        event: { type: "USE_FONT_SLOT_RESTORE", slotLevel: token.slotLevel },
      };
    case "USE_PALADIN_CHANNEL_DIVINITY":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_PALADIN_CHANNEL_DIVINITY" },
      };
    case "USE_WILD_RESURGENCE_CHARGE":
      if (!legalWildResurgenceChargeLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Wild Resurgence with a level ${token.slotLevel} slot is not currently available in this state.`,
        };
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to regain one Wild Shape use`,
        runtime: "none",
        event: {
          type: "USE_WILD_RESURGENCE_CHARGE",
          slotLevel: token.slotLevel,
        },
      };
    case "USE_NATURES_VEIL":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_NATURES_VEIL" },
      };
    case "USE_BARDIC_INSPIRATION":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "USE_BARDIC_INSPIRATION" },
      };
    case "USE_PEERLESS_SKILL":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "peerlessSkill",
      };
    case "USE_RELENTLESS_RAGE":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "relentlessRage",
      };
    case "SHORT_REST":
      if (!isLegalShortRestSpendPlan(context, token.spendHitDice)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message:
            "The chosen short-rest hit-die spending plan is not currently available in this state.",
        };
      }
      return {
        token,
        outcome:
          token.spendHitDice.length === 0
            ? "Finish a short rest and recharge short-rest features"
            : `Finish a short rest and spend hit dice in this order: ${token.spendHitDice.join(", ")}`,
        runtime: "shortRest",
      };
    case "EXIT_COMBAT":
      return {
        token,
        outcome: available.outcome.summary,
        runtime: "none",
        event: { type: "EXIT_COMBAT" },
      };
  }
}

export function finalizeResolution(
  request: ResolutionRequest,
  runtimeInputs: ResolutionRuntimeInputs,
  context: DndContext,
): FinalizedAction {
  return Match.value(request).pipe(
    Match.when(
      { runtime: "none" },
      (resolved): FinalizedAction =>
        runtimeInputs.runtime === "none"
          ? {
              ok: true as const,
              event: resolved.event,
              outcome: resolved.outcome,
            }
          : runtimeMismatch("none", runtimeInputs.runtime),
    ),
    Match.when({ runtime: "startTurn" }, (resolved): FinalizedAction => {
      if (runtimeInputs.runtime !== "startTurn")
        return runtimeMismatch("startTurn", runtimeInputs.runtime);
      return {
        ok: true as const,
        event: {
          ...runtimeInputs.values,
          type: "START_TURN" as const,
        },
        outcome: resolved.outcome,
      };
    }),
    Match.when({ runtime: "actionSurge" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "actionSurge")
        return runtimeMismatch("actionSurge", runtimeInputs.runtime);
      return {
        ok: true,
        ...finalizeProjectedActionSurge(context),
      };
    }),
    Match.when(
      { runtime: "projectedPreparedSpell" },
      (resolved): FinalizedAction => {
        if (runtimeInputs.runtime !== "projectedPreparedSpell") {
          return runtimeMismatch(
            "projectedPreparedSpell",
            runtimeInputs.runtime,
          );
        }
        return {
          ok: true,
          ...finalizeProjectedPreparedSpell(
            context,
            resolved.token.spellName,
            runtimeInputs.values,
          ),
        };
      },
    ),
    Match.when({ runtime: "tacticalMind" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "tacticalMind")
        return runtimeMismatch("tacticalMind", runtimeInputs.runtime);
      return {
        ok: true as const,
        event: {
          type: "USE_TACTICAL_MIND" as const,
          boostedCheckSucceeds: runtimeInputs.values.boostedCheckSucceeds,
        },
        outcome: runtimeInputs.values.boostedCheckSucceeds
          ? "Tactical Mind turned the failed ability check into a success"
          : "Tactical Mind failed to turn the ability check into a success, so Second Wind was not expended",
      };
    }),
    Match.when({ runtime: "wholenessOfBody" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "wholenessOfBody")
        return runtimeMismatch("wholenessOfBody", runtimeInputs.runtime);
      const monkLevel = context.classStates.monk?.level ?? 0;
      const maxDie = pMartialArtsDie(monkLevel);
      const wisMod = context.classStates.monk?.wholenessMax ?? 0;
      const minHeal = Math.max(1, 1 + wisMod);
      const maxHeal = Math.max(1, maxDie + wisMod);
      if (
        runtimeInputs.values.healRoll < minHeal ||
        runtimeInputs.values.healRoll > maxHeal
      ) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Wholeness of Body heal amount must be between ${minHeal} and ${maxHeal}, received ${runtimeInputs.values.healRoll}.`,
          },
        };
      }
      return {
        ok: true as const,
        event: {
          type: "WHOLENESS_OF_BODY" as const,
          healRoll: runtimeInputs.values.healRoll,
        },
        outcome: `Healed ${runtimeInputs.values.healRoll} HP with Wholeness of Body`,
      };
    }),
    Match.when({ runtime: "uncannyMetabolism" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "uncannyMetabolism")
        return runtimeMismatch("uncannyMetabolism", runtimeInputs.runtime);
      const monkLevel = context.classStates.monk?.level ?? 0;
      const maxDie = pMartialArtsDie(monkLevel);
      if (
        runtimeInputs.values.healRoll < 1 ||
        runtimeInputs.values.healRoll > maxDie
      ) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Uncanny Metabolism die roll must be between 1 and ${maxDie}, received ${runtimeInputs.values.healRoll}.`,
          },
        };
      }
      return {
        ok: true as const,
        event: {
          type: "UNCANNY_METABOLISM" as const,
          healRoll: runtimeInputs.values.healRoll,
        },
        outcome: `Regained all Focus Points and healed 1d${maxDie}(${runtimeInputs.values.healRoll}) + ${monkLevel} = ${
          runtimeInputs.values.healRoll + monkLevel
        } HP`,
      };
    }),
    Match.when({ runtime: "secondWind" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "secondWind")
        return runtimeMismatch("secondWind", runtimeInputs.runtime);
      return {
        ok: true,
        ...finalizeProjectedSecondWind(context, runtimeInputs.values.d10Roll),
      };
    }),
    Match.when({ runtime: "tireless" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "tireless")
        return runtimeMismatch("tireless", runtimeInputs.runtime);
      if (runtimeInputs.values.d8Roll < 1 || runtimeInputs.values.d8Roll > 8) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Tireless d8 roll must be between 1 and 8, received ${runtimeInputs.values.d8Roll}.`,
          },
        };
      }
      const wisComponent = context.classStates.ranger?.tirelessMax ?? 0;
      const tempHp = tirelessTempHp(runtimeInputs.values.d8Roll, wisComponent);
      return {
        ok: true as const,
        event: {
          type: "USE_TIRELESS" as const,
          d8Roll: runtimeInputs.values.d8Roll,
        },
        outcome: `Gained 1d8(${runtimeInputs.values.d8Roll}) + ${Math.max(1, wisComponent)} = ${tempHp} temporary HP`,
      };
    }),
    Match.when({ runtime: "peerlessSkill" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "peerlessSkill")
        return runtimeMismatch("peerlessSkill", runtimeInputs.runtime);
      const mode =
        context.pendingResolution?.kind === "peerlessSkill"
          ? context.pendingResolution.mode
          : "abilityCheck";
      return {
        ok: true as const,
        event: {
          type: "USE_PEERLESS_SKILL" as const,
          success: runtimeInputs.values.success,
        },
        outcome: runtimeInputs.values.success
          ? `Peerless Skill turned the failed ${mode === "attackRoll" ? "attack roll" : "ability check"} into a success`
          : `Peerless Skill failed to turn the ${mode === "attackRoll" ? "attack roll" : "ability check"} into a success, so Bardic Inspiration was not expended`,
      };
    }),
    Match.when({ runtime: "relentlessRage" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "relentlessRage")
        return runtimeMismatch("relentlessRage", runtimeInputs.runtime);
      const barbarianLevel = context.classStates.barbarian?.level ?? 0;
      return {
        ok: true as const,
        event: {
          type: "USE_RELENTLESS_RAGE" as const,
          conSaveSucceeded: runtimeInputs.values.conSaveSucceeded,
        },
        outcome: runtimeInputs.values.conSaveSucceeded
          ? `Relentless Rage succeeded; HP becomes ${2 * barbarianLevel}`
          : "Relentless Rage failed; HP remains 0",
      };
    }),
    Match.when({ runtime: "shortRest" }, (resolved): FinalizedAction => {
      if (runtimeInputs.runtime !== "shortRest")
        return runtimeMismatch("shortRest", runtimeInputs.runtime);
      if (
        runtimeInputs.values.hdRolls.length !==
        resolved.token.spendHitDice.length
      ) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Short Rest expected ${resolved.token.spendHitDice.length} hit-die roll(s), received ${runtimeInputs.values.hdRolls.length}.`,
          },
        };
      }
      for (const [
        index,
        expectedClassName,
      ] of resolved.token.spendHitDice.entries()) {
        const actual = runtimeInputs.values.hdRolls[index];
        const dieSize = classHitDie(expectedClassName);
        if (actual == null || actual.className !== expectedClassName) {
          return {
            ok: false as const,
            error: {
              code: "INVALID_RUNTIME_INPUT" as const,
              message: `Short Rest roll ${index + 1} must be for ${expectedClassName}, received ${actual?.className ?? "missing"}.`,
            },
          };
        }
        if (actual.roll < 1 || actual.roll > dieSize) {
          return {
            ok: false as const,
            error: {
              code: "INVALID_RUNTIME_INPUT" as const,
              message: `Short Rest roll ${index + 1} for ${expectedClassName} must be between 1 and ${dieSize}, received ${actual.roll}.`,
            },
          };
        }
      }
      return {
        ok: true as const,
        event: {
          type: "SHORT_REST" as const,
          hdRolls: runtimeInputs.values.hdRolls,
        },
        outcome:
          resolved.token.spendHitDice.length === 0
            ? resolved.outcome
            : `Spent hit dice in order: ${runtimeInputs.values.hdRolls
                .map(
                  ({ className, roll }) =>
                    `${className} d${classHitDie(className)}(${roll})`,
                )
                .join(", ")}`,
      };
    }),
    Match.exhaustive,
  );
}

export function previewAction(
  context: DndContext,
  tags: ReadonlySet<string>,
  token: ResolvedActionToken,
): PreviewedAction {
  const request = resolveAction(context, tags, token);
  if ("code" in request) return { ok: false, error: request };
  const availableToken = getAvailableActions(context, tags).find(
    (candidate) => candidate.type === token.type,
  );
  return {
    ok: true,
    summary: availableToken?.outcome.summary ?? token.type,
    cost: availableToken?.cost ?? FREE_COST,
    runtime: request.runtime,
    eventType: request.runtime === "none" ? request.event.type : undefined,
  };
}
