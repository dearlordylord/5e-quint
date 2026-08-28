import type {
  Ability,
  ActivationPhase,
  DcSource,
} from "@dnd/surface/surface/types";
import type {
  BattleEffectExecutionRef,
  BattleAreaId,
  BattleDancingLightId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  COMMAND_OPTIONS,
} from "../battle-reducer/domain-constants.ts";

export const MAGIC_WEAPON_ENHANCEMENT_BONUSES = [
  1, 2, 3,
] as const satisfies ReadonlyArray<number>;
export type MagicWeaponEnhancementBonus =
  (typeof MAGIC_WEAPON_ENHANCEMENT_BONUSES)[number];

export const BATTLE_MOVEMENT_SPEED_KINDS = [
  "walk",
  "climb",
  "swim",
  "fly",
] as const;
export type BattleMovementSpeedKind =
  (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];
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

export type BattleCommandOption = (typeof COMMAND_OPTIONS)[number];

export type BattleDancingLight = {
  readonly lightId: BattleDancingLightId;
  readonly positionId: BattleTablePositionId;
};
export type BattleDancingLightList =
  | readonly [BattleDancingLight]
  | readonly [BattleDancingLight, BattleDancingLight]
  | readonly [BattleDancingLight, BattleDancingLight, BattleDancingLight]
  | readonly [
      BattleDancingLight,
      BattleDancingLight,
      BattleDancingLight,
      BattleDancingLight,
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
      readonly activeEffectKind: "spellObjectContactDamage" | "spiritualWeapon";
      readonly effectRef: BattleEffectExecutionRef;
    }
  | {
      readonly kind: "antimagicFieldAura";
      readonly areaId: BattleAreaId;
      readonly sourceCombatantId: CombatantId;
    };
export type BattleOngoingSpellOccurrenceRef = Exclude<
  BattleOngoingSpellEffectRef,
  { readonly kind: "antimagicFieldAura" }
>;
export type BattleAntimagicFieldOngoingSpellEffectRef =
  BattleOngoingSpellOccurrenceRef;

export type BattleAntimagicFieldAuraMembership = {
  readonly kind: "antimagicFieldAuraMembership";
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
};
