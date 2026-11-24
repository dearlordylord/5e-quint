import type {
  Ability,
  ActivationPhase,
  DcSource,
  Skill,
} from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  BattleEffectExecutionRef,
  BattleAreaId,
  BattleMovableLightId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  COMPELLED_BEHAVIOR_OPTIONS,
} from "../battle-reducer/domain-constants.ts";

export const WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES = [
  1, 2, 3,
] as const satisfies ReadonlyArray<number>;
export type WeaponAttackDamageEnhancementBonus =
  (typeof WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES)[number];

export const BATTLE_MOVEMENT_SPEED_KINDS = [
  "walk",
  "climb",
  "swim",
  "fly",
] as const;
export type BattleMovementSpeedKind =
  (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];
/**
 * How a creature moves along one part of its path. SRD 5.2.1 "Movement and
 * Position": a move can combine climbing, crawling and swimming with regular
 * movement; each of those costs 1 extra foot per foot ("Climbing",
 * "Crawling", "Swimming" in the Rules Glossary), and climbing or swimming
 * ignores that cost when the creature uses its Climb or Swim Speed.
 */
export const BATTLE_MOVEMENT_PATH_ACTIVITIES = [
  "ordinary",
  "climbing",
  "swimming",
  "crawling",
] as const;
export type BattleMovementPathActivity =
  (typeof BATTLE_MOVEMENT_PATH_ACTIVITIES)[number];
/**
 * Whether a part of the path is Difficult Terrain, as the table adjudicates
 * it. Difficult Terrain isn't cumulative (SRD 5.2.1 Rules Glossary), so a
 * space is either Difficult Terrain or not; `areaDifficultTerrain` marks the
 * feet inside the spell areas the movement's `areaDifficultTerrain` fact
 * cites, and `tableTerrain` marks any other Difficult Terrain.
 */
export const BATTLE_MOVEMENT_PATH_DIFFICULT_TERRAIN = [
  "none",
  "tableTerrain",
  "areaDifficultTerrain",
] as const;
export type BattleMovementPathDifficultTerrain =
  (typeof BATTLE_MOVEMENT_PATH_DIFFICULT_TERRAIN)[number];
export const BATTLE_SPECIAL_SPEED_KINDS = [
  "climb",
  "swim",
  "fly",
] as const satisfies ReadonlyArray<Exclude<BattleMovementSpeedKind, "walk">>;
export type BattleSpecialSpeedKind =
  (typeof BATTLE_SPECIAL_SPEED_KINDS)[number];

export type BattleD20RollModifierDelta = {
  readonly sign: "+" | "-";
} & (
  | { readonly kind: "fixedNumber"; readonly amount: number }
  | {
      readonly dice: number;
      readonly dieSize: (typeof BATTLE_D20_ROLL_MODIFIER_DIE_SIZES)[number];
    }
);

export type BattleD20RollModifierSkillFilter =
  | { readonly kind: "none" }
  | { readonly kind: "fixed"; readonly skill: Skill }
  | {
      readonly kind: "choice";
      readonly options: ReadonlyNonEmptyArray<Skill>;
    };

export type BattleCompelledBehaviorOption =
  (typeof COMPELLED_BEHAVIOR_OPTIONS)[number];

export type BattleMovableLight = {
  readonly lightId: BattleMovableLightId;
  readonly positionId: BattleTablePositionId;
};
export type BattleMovableLightList =
  | readonly [BattleMovableLight]
  | readonly [BattleMovableLight, BattleMovableLight]
  | readonly [BattleMovableLight, BattleMovableLight, BattleMovableLight]
  | readonly [
      BattleMovableLight,
      BattleMovableLight,
      BattleMovableLight,
      BattleMovableLight,
    ];

export type SpellAttackKind = Extract<
  ActivationPhase,
  { readonly kind: "attack_roll" }
>["attackKind"];

export type SpellConditionRepeatSave = {
  readonly ability: Ability;
  readonly dc: DcSource;
};

export type BattleOngoingSpellEffectRef =
  | {
      readonly kind: "spellLightEmitter";
      readonly effectRef: BattleEffectExecutionRef;
    }
  | {
      readonly kind: "spellActiveEffect";
      readonly activeEffectKind:
        | "spellObjectContactDamage"
        | "spatialMeleeSpellAttackProxy";
      readonly effectRef: BattleEffectExecutionRef;
    }
  | {
      readonly kind: "magicSuppressionEmanation";
      readonly effectRef: BattleEffectExecutionRef;
      readonly areaId: BattleAreaId;
      readonly sourceCombatantId: CombatantId;
    };
export type BattleOngoingSpellOccurrenceRef = Exclude<
  BattleOngoingSpellEffectRef,
  { readonly kind: "magicSuppressionEmanation" }
>;
export type BattleMagicSuppressionOngoingSpellEffectRef =
  BattleOngoingSpellOccurrenceRef;

export type BattleMagicSuppressionEmanationMembership = {
  readonly kind: "magicSuppressionEmanationMembership";
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
};
