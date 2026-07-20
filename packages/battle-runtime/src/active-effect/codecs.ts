import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  AbilityModifier,
  AttackBonus,
  type AbilityModifier as AbilityModifierType,
  type AttackBonus as AttackBonusType,
} from "@dnd/shared/types";
import { AbilitySchema, DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import type { DamageType, DiceExpr } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { HUNTERS_MARK_FINDING_SKILLS } from "../battle-reducer/domain-constants.ts";
import type {
  MarkedDamageRiderAbilityCheckBehavior,
  SpellMarkedDamageRider,
} from "../battle-reducer.ts";
import {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  MarkedDamageRiderTransferState,
} from "./types.ts";

function exactSchema<Expected>() {
  return <Encoded, Context, Actual extends Expected>(
    schema: Schema.Schema<Actual, Encoded, Context> &
      ([Expected] extends [Actual] ? unknown : never),
  ): Schema.Schema<Actual, Encoded, Context> => schema;
}

const BattleRoundSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("PositiveInteger"),
  Schema.brand("Round"),
);

export const BattleActiveEffectExpirationSchema =
  exactSchema<BattleActiveEffectExpiration>()(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("startOfTurn"),
        combatantId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("endOfTurn"),
        combatantId: CombatantId,
        round: BattleRoundSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: Schema.optionalWith(ElapsedTimeTicksSchema, {
          exact: true,
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("duration"),
        durationTicks: ElapsedTimeTicksSchema,
      }),
      Schema.Struct({ kind: Schema.Literal("untilDispelled") }),
    ),
  );

type DurationBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "duration" }
>;

export const DurationBattleActiveEffectExpirationSchema =
  exactSchema<DurationBattleActiveEffectExpiration>()(
    Schema.Struct({
      kind: Schema.Literal("duration"),
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );

type ConcentrationBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
>;

export const ConcentrationBattleActiveEffectExpirationSchema =
  exactSchema<ConcentrationBattleActiveEffectExpiration>()(
    Schema.Struct({
      kind: Schema.Literal("concentration"),
      combatantId: CombatantId,
      durationTicks: Schema.optionalWith(ElapsedTimeTicksSchema, {
        exact: true,
      }),
    }),
  );

export const MarkedDamageRiderTransferStateSchema =
  exactSchema<MarkedDamageRiderTransferState>()(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("awaitingTargetDrop"),
        retargetTiming: Schema.Literal("sameTurn", "laterTurn"),
      }),
      Schema.Struct({
        kind: Schema.Literal("available"),
        retargetTiming: Schema.Literal("sameTurn"),
      }),
      Schema.Struct({
        kind: Schema.Literal("availableAfterTurn"),
        retargetTiming: Schema.Literal("laterTurn"),
        droppedOnTurn: Schema.Struct({
          actorId: CombatantId,
          round: BattleRoundSchema,
        }),
      }),
    ),
  );

export const MarkedDamageRiderAbilityCheckBehaviorSchema =
  exactSchema<MarkedDamageRiderAbilityCheckBehavior>()(
    Schema.Union(
      Schema.Struct({ kind: Schema.Literal("none") }),
      Schema.Struct({
        kind: Schema.Literal("abilityDisadvantage"),
        ability: AbilitySchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("findingAdvantage"),
        ability: Schema.Literal("wis"),
        skills: Schema.Tuple(
          Schema.Literal(HUNTERS_MARK_FINDING_SKILLS[0]),
          Schema.Literal(HUNTERS_MARK_FINDING_SKILLS[1]),
        ),
      }),
    ),
  );

type SpellWeaponDamageRider = Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponDamageRider" }
>;
export type SpellWeaponDamageRiderTemplate =
  {
    readonly sourceCombatantId: CombatantId;
    readonly kind: "spellWeaponDamageRider";
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly expiresAt: BattleActiveEffectExpiration;
  };

const SpellWeaponDamageRiderMechanicalFields = {
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("spellWeaponDamageRider"),
  damage: Schema.Struct({
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  expiresAt: BattleActiveEffectExpirationSchema,
};

export const SpellWeaponDamageRiderTemplateSchema =
  exactSchema<SpellWeaponDamageRiderTemplate>()(
    Schema.Struct(SpellWeaponDamageRiderMechanicalFields),
  );

export const SpellWeaponDamageRiderSchema = exactSchema<SpellWeaponDamageRider>()(
  Schema.Struct({
    sourceProcedureRef: BattleProcedureExecutionRef,
    ...SpellWeaponDamageRiderMechanicalFields,
  }),
);

export type SpellMarkedDamageRiderTemplate =
  {
    readonly sourceCombatantId: CombatantId;
    readonly kind: "spellMarkedDamageRider";
    readonly targetCombatantId: CombatantId;
    readonly transfer: MarkedDamageRiderTransferState;
    readonly abilityCheckBehavior: MarkedDamageRiderAbilityCheckBehavior;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly expiresAt: BattleActiveEffectExpiration;
  };

const SpellMarkedDamageRiderMechanicalFields = {
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("spellMarkedDamageRider"),
  targetCombatantId: CombatantId,
  transfer: MarkedDamageRiderTransferStateSchema,
  abilityCheckBehavior: MarkedDamageRiderAbilityCheckBehaviorSchema,
  damage: Schema.Struct({
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  expiresAt: BattleActiveEffectExpirationSchema,
};

export const SpellMarkedDamageRiderTemplateSchema =
  exactSchema<SpellMarkedDamageRiderTemplate>()(
    Schema.Struct(SpellMarkedDamageRiderMechanicalFields),
  );

export const SpellMarkedDamageRiderSchema = exactSchema<SpellMarkedDamageRider>()(
  Schema.Struct({
    sourceProcedureRef: BattleProcedureExecutionRef,
    effectRef: BattleActiveEffectExecutionRef,
    ...SpellMarkedDamageRiderMechanicalFields,
  }),
);

export type ThaumaturgyBoomingVoiceTemplate = {
  readonly sourceCombatantId: CombatantId;
  readonly kind: "thaumaturgyBoomingVoice";
  readonly expiresAt: DurationBattleActiveEffectExpiration;
};

export const ThaumaturgyBoomingVoiceTemplateSchema =
  exactSchema<ThaumaturgyBoomingVoiceTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("thaumaturgyBoomingVoice"),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  );

export type BlurredActiveEffectTemplate = {
  readonly sourceCombatantId: CombatantId;
  readonly kind: "blurred";
  readonly expiresAt: ConcentrationBattleActiveEffectExpiration;
};

export const BlurredActiveEffectTemplateSchema =
  exactSchema<BlurredActiveEffectTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("blurred"),
      expiresAt: ConcentrationBattleActiveEffectExpirationSchema,
    }),
  );

export type WardingBondActiveEffectTemplate = {
  readonly sourceCombatantId: CombatantId;
  readonly kind: "wardingBond";
  readonly expiresAt: DurationBattleActiveEffectExpiration;
};

export const WardingBondActiveEffectTemplateSchema =
  exactSchema<WardingBondActiveEffectTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("wardingBond"),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  );

export type SpellWeaponAttackOverrideTemplate = {
  readonly sourceCombatantId: CombatantId;
  readonly kind: "spellWeaponAttackOverride";
  readonly weaponItemId: string;
  readonly spellcastingAbilityModifier: AbilityModifierType;
  readonly attackBonus: AttackBonusType;
  readonly damage: {
    readonly expr: DiceExpr;
  };
  readonly damageTypeChoices: readonly [DamageType, DamageType];
  readonly expiresAt: DurationBattleActiveEffectExpiration;
};

export const SpellWeaponAttackOverrideTemplateSchema =
  exactSchema<SpellWeaponAttackOverrideTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("spellWeaponAttackOverride"),
      weaponItemId: Schema.String,
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damage: Schema.Struct({ expr: DiceExprSchema }),
      damageTypeChoices: Schema.Tuple(DamageTypeSchema, DamageTypeSchema),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  );
