import { Schema } from "effect";
import type { SupportedSpellInvocation } from "../battle-reducer.ts";

export type BattleSpellTargetListProcedure = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure:
      | "directHitPointRestoration"
      | "rollModifier"
      | "saveGatedDamage"
      | "abilityD20TestRollModeSaveGate"
      | "saveGatedCondition"
      | "saveGatedConditionImmunity"
      | "saveGatedAttackRollAdvantage"
      | "hideousLaughter"
      | "hypnoticPattern"
      | "slowActivePenalties"
      | "creatureTypeProtection"
      | "creatureSizeIncrease"
      | "creatureSizeDecrease"
      | "levitatedCreature"
      | "conditionRemovalProtection"
      | "chosenDamageResistance"
      | "damageReduction"
      | "scalarBuff"
      | "conditionImmunityAndTurnStartTemporaryHitPoints"
      | "jumpMovementReplacement"
      | "dragonsBreathInitial"
      | "hastePositive"
      | "featherFallMitigation"
      | "sanctuaryTargetingInterdiction"
      | "directCondition"
      | "directConditionRemoval"
      | "command"
      | "greaseGroundHazard"
      | "gustOfWindLine";
  }
>["procedure"];

const targetListProcedures = <
  const Procedures extends readonly BattleSpellTargetListProcedure[],
>(
  ...procedures: Procedures &
    (Exclude<BattleSpellTargetListProcedure, Procedures[number]> extends never
      ? unknown
      : readonly ["Missing target-list spell procedure"])
): Procedures => procedures;

export const BATTLE_SPELL_TARGET_LIST_PROCEDURES = targetListProcedures(
  "directHitPointRestoration",
  "rollModifier",
  "saveGatedDamage",
  "abilityD20TestRollModeSaveGate",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "saveGatedAttackRollAdvantage",
  "hideousLaughter",
  "hypnoticPattern",
  "slowActivePenalties",
  "creatureTypeProtection",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "levitatedCreature",
  "conditionRemovalProtection",
  "chosenDamageResistance",
  "damageReduction",
  "scalarBuff",
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  "jumpMovementReplacement",
  "dragonsBreathInitial",
  "hastePositive",
  "featherFallMitigation",
  "sanctuaryTargetingInterdiction",
  "directCondition",
  "directConditionRemoval",
  "command",
  "greaseGroundHazard",
  "gustOfWindLine",
);

export const BattleSpellTargetListProcedureSchema = Schema.Literal(
  ...BATTLE_SPELL_TARGET_LIST_PROCEDURES,
).annotations({ identifier: "BattleSpellTargetListProcedure" });
