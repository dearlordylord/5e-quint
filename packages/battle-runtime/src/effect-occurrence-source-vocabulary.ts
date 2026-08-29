import type { BattleEffectExecutionRef } from "./identity.ts";

export const EFFECT_OCCURRENCE_SOURCE_KINDS = [
  "nextAttackRollBySelf",
  "sleepPendingRepeatSave",
  "stagedSaveConditionPendingRepeat",
  "spellCondition",
  "spellConditionEndTurnSave",
  "spellConditionRepeatSave",
  "spellTurnEndDamage",
  "spellTurnStartDamageAndSave",
] as const;

export type EffectOccurrenceSourceKind =
  (typeof EFFECT_OCCURRENCE_SOURCE_KINDS)[number];

export type EffectOccurrenceSourceProcedure = {
  readonly kind: "effectOccurrenceSource";
  readonly effectRef: BattleEffectExecutionRef;
  readonly effectKind: EffectOccurrenceSourceKind;
};
