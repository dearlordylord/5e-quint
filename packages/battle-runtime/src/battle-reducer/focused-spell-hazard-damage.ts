import {
  spellSaveGateBranch,
  spellSaveGateDamageAmount,
  spellSaveGateDamageResult,
} from "@dnd/shared-algebras/spell-save-gate-algebra";
import { damageAmount } from "@dnd/shared/types";

export function halfDamageAfterSuccessfulSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return Number(
    spellSaveGateDamageAmount(
      damageAmount(input.rolledDamage),
      spellSaveGateDamageResult({
        branch: spellSaveGateBranch(input.savingThrowSucceeded),
        damageOnSuccess: "halfDamage",
      }),
    ),
  );
}

export function applyDamageToPositiveHitPoints<
  Vitals extends {
    readonly hitPoints: number;
    readonly temporaryHitPoints: number;
    readonly dead: boolean;
  },
>(vitals: Vitals, rawDamage: number): Vitals {
  if (vitals.dead) return vitals;
  const resolvedDamage = Math.max(0, Math.floor(rawDamage));
  const absorbedByTemporaryHitPoints = Math.min(
    vitals.temporaryHitPoints,
    resolvedDamage,
  );
  const nextHitPoints = Math.max(
    0,
    vitals.hitPoints - (resolvedDamage - absorbedByTemporaryHitPoints),
  );
  return {
    ...vitals,
    hitPoints: nextHitPoints,
    temporaryHitPoints:
      vitals.temporaryHitPoints - absorbedByTemporaryHitPoints,
    dead: nextHitPoints === 0,
  };
}
