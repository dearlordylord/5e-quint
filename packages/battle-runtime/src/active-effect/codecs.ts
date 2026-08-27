import {
  AbilitySchema,
  DamageTypeSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
import type { DamageType, DiceExpr } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { HUNTERS_MARK_FINDING_SKILLS } from "../battle-reducer/domain-constants.ts";
import {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleActiveEffect,
  MarkedDamageRiderAbilityCheckBehavior,
  MarkedDamageRiderTransferState,
  SpellMarkedDamageRider,
} from "./types.ts";
import type {
  BattleActiveEffectExpiration,
  DurationBattleActiveEffectExpiration,
} from "./expiration.ts";
import { BattleRoundSchema } from "./round-codec.ts";
import {
  BattleActiveEffectExpirationSchema,
  ConcentrationBattleActiveEffectExpirationSchema,
  DurationBattleActiveEffectExpirationSchema,
} from "./expiration-codecs.ts";
export type { SpellWeaponAttackOverrideTemplate } from "../procedure-facts/weapon-attack-override.ts";
export { SpellWeaponAttackOverrideTemplateSchema } from "../procedure-execution/weapon-attack-override.ts";
export {
  BattleActiveEffectExpirationSchema,
  ConcentrationBattleActiveEffectExpirationSchema,
  DurationBattleActiveEffectExpirationSchema,
} from "./expiration-codecs.ts";

type ConcentrationBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
>;

function exactSchema<Expected>() {
  return <Encoded, Actual extends Expected>(
    schema: Schema.Codec<Actual, Encoded, never, never> &
      ([Expected] extends [Actual] ? unknown : never),
  ): Schema.Codec<Actual, Encoded, never, never> => schema;
}

export const MarkedDamageRiderTransferStateSchema =
  exactSchema<MarkedDamageRiderTransferState>()(
    Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("awaitingTargetDrop"),
        retargetTiming: Schema.Literals(["sameTurn", "laterTurn"]),
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
    ]),
  );

export const MarkedDamageRiderAbilityCheckBehaviorSchema =
  exactSchema<MarkedDamageRiderAbilityCheckBehavior>()(
    Schema.Union([
      Schema.Struct({ kind: Schema.Literal("none") }),
      Schema.Struct({
        kind: Schema.Literal("abilityDisadvantage"),
        ability: AbilitySchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("findingAdvantage"),
        ability: Schema.Literal("wis"),
        skills: Schema.Tuple([
          Schema.Literal(HUNTERS_MARK_FINDING_SKILLS[0]),
          Schema.Literal(HUNTERS_MARK_FINDING_SKILLS[1]),
        ]),
      }),
    ]),
  );

type SpellWeaponDamageRider = Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponDamageRider" }
>;
export type SpellWeaponDamageRiderTemplate = {
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

export const SpellWeaponDamageRiderSchema =
  exactSchema<SpellWeaponDamageRider>()(
    Schema.Struct({
      sourceProcedureRef: BattleProcedureExecutionRef,
      ...SpellWeaponDamageRiderMechanicalFields,
    }),
  );

export type SpellMarkedDamageRiderTemplate = {
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

export const SpellMarkedDamageRiderSchema =
  exactSchema<SpellMarkedDamageRider>()(
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
