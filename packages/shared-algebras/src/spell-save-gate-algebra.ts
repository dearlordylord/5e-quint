import { Match } from "effect";

import { damageAmount, type DamageAmount } from "@dnd/shared/types";

export const SPELL_SAVE_GATE_BRANCHES = [
  "savingThrowSucceeded",
  "savingThrowFailed",
] as const;
export type SpellSaveGateBranch = (typeof SPELL_SAVE_GATE_BRANCHES)[number];

export const SPELL_SAVE_GATE_DAMAGE_ON_SUCCESS = [
  "noDamage",
  "halfDamage",
] as const;
export type SpellSaveGateDamageOnSuccess =
  (typeof SPELL_SAVE_GATE_DAMAGE_ON_SUCCESS)[number];

export const SPELL_SAVE_GATE_DAMAGE_RESULTS = [
  "fullDamage",
  "halfDamage",
  "noDamage",
] as const;
export type SpellSaveGateDamageResult =
  (typeof SPELL_SAVE_GATE_DAMAGE_RESULTS)[number];

export type SpellSaveGateDamageFacts = {
  readonly branch: SpellSaveGateBranch;
  readonly damageOnSuccess: SpellSaveGateDamageOnSuccess;
};

export function spellSaveGateBranch(
  savingThrowSucceeded: boolean,
): SpellSaveGateBranch {
  return savingThrowSucceeded ? "savingThrowSucceeded" : "savingThrowFailed";
}

export function spellSaveGateFailedEffectsApply(
  branch: SpellSaveGateBranch,
): boolean {
  return branch === "savingThrowFailed";
}

export function spellSaveGateSuccessEffectsApply(
  branch: SpellSaveGateBranch,
): boolean {
  return branch === "savingThrowSucceeded";
}

export function spellSaveGateDamageResult(
  facts: SpellSaveGateDamageFacts,
): SpellSaveGateDamageResult {
  return Match.value(facts.branch).pipe(
    Match.when("savingThrowFailed", () => "fullDamage" as const),
    Match.when("savingThrowSucceeded", () =>
      Match.value(facts.damageOnSuccess).pipe(
        Match.when("halfDamage", () => "halfDamage" as const),
        Match.when("noDamage", () => "noDamage" as const),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function spellSaveGateDamageAmount(
  rawDamage: DamageAmount,
  result: SpellSaveGateDamageResult,
): DamageAmount {
  return Match.value(result).pipe(
    Match.when("fullDamage", () => rawDamage),
    Match.when("halfDamage", () =>
      damageAmount(Math.floor(Number(rawDamage) / 2)),
    ),
    Match.when("noDamage", () => damageAmount(0)),
    Match.exhaustive,
  );
}
