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
