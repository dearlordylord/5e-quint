// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
import type { CreatureType } from "@dnd/shared/game-facts";
import type { Condition } from "@dnd/shared/types";
import { Match } from "effect";

import type { BattleActiveEffect } from "./types.ts";

export type CreatureTypeProtectionActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "creatureTypeProtection" }
>;

export type CreatureTypeProtectionRelevantEffect =
  | { readonly kind: "condition"; readonly condition: Condition }
  | { readonly kind: "possession" };

type RelevantEffectProtection = Extract<
  CreatureTypeProtectionActiveEffect["protections"][number],
  { readonly kind: "relevant_effect_protection" }
>;
type RelevantEffectProtectionOutcome =
  RelevantEffectProtection["outcomes"][number];

export function creatureTypeProtectionMatchesSourceCreatureType(
  effect: CreatureTypeProtectionActiveEffect,
  sourceCreatureType: CreatureType,
): boolean {
  return effect.creatureTypes.includes(sourceCreatureType);
}

export function creatureTypeProtectionGrantsAttackDisadvantage(
  effect: CreatureTypeProtectionActiveEffect,
  sourceCreatureType: CreatureType,
): boolean {
  return (
    creatureTypeProtectionMatchesSourceCreatureType(
      effect,
      sourceCreatureType,
    ) &&
    effect.protections.some((protection) =>
      Match.value(protection).pipe(
        Match.when(
          { kind: "attack_rolls_against_target" },
          ({ mode }) => mode === "disadvantage",
        ),
        Match.when({ kind: "relevant_effect_protection" }, () => false),
        Match.exhaustive,
      ),
    )
  );
}

export function creatureTypeProtectionPreventsNewApplication(
  effect: CreatureTypeProtectionActiveEffect,
  sourceCreatureType: CreatureType,
  relevantEffect: CreatureTypeProtectionRelevantEffect,
): boolean {
  return creatureTypeProtectionGrantsRelevantEffectOutcome(
    effect,
    sourceCreatureType,
    relevantEffect,
    "new_applications",
  );
}

export function creatureTypeProtectionGrantsExistingEffectSaveAdvantage(
  effect: CreatureTypeProtectionActiveEffect,
  sourceCreatureType: CreatureType,
  relevantEffect: CreatureTypeProtectionRelevantEffect,
): boolean {
  return creatureTypeProtectionGrantsRelevantEffectOutcome(
    effect,
    sourceCreatureType,
    relevantEffect,
    "new_saves_against_existing_effects",
  );
}

function creatureTypeProtectionGrantsRelevantEffectOutcome(
  effect: CreatureTypeProtectionActiveEffect,
  sourceCreatureType: CreatureType,
  relevantEffect: CreatureTypeProtectionRelevantEffect,
  outcomeKind: RelevantEffectProtectionOutcome["kind"],
): boolean {
  return (
    creatureTypeProtectionMatchesSourceCreatureType(
      effect,
      sourceCreatureType,
    ) &&
    effect.protections.some((protection) =>
      Match.value(protection).pipe(
        Match.when({ kind: "attack_rolls_against_target" }, () => false),
        Match.when(
          { kind: "relevant_effect_protection" },
          (relevantEffectProtection) =>
            relevantEffectProtectionCovers(
              relevantEffectProtection,
              relevantEffect,
            ) &&
            relevantEffectProtection.outcomes.some((outcome) =>
              relevantEffectProtectionOutcomeMatches(outcome, outcomeKind),
            ),
        ),
        Match.exhaustive,
      ),
    )
  );
}

function relevantEffectProtectionCovers(
  protection: RelevantEffectProtection,
  relevantEffect: CreatureTypeProtectionRelevantEffect,
): boolean {
  return Match.value(relevantEffect).pipe(
    Match.discriminatorsExhaustive("kind")({
      condition: ({ condition }) => protection.conditions.includes(condition),
      possession: () => protection.possession === "included",
    }),
  );
}

function relevantEffectProtectionOutcomeMatches(
  outcome: RelevantEffectProtectionOutcome,
  outcomeKind: RelevantEffectProtectionOutcome["kind"],
): boolean {
  return Match.value(outcome).pipe(
    Match.when(
      { kind: "new_applications", result: "prevented" },
      () => outcomeKind === "new_applications",
    ),
    Match.when(
      {
        kind: "new_saves_against_existing_effects",
        mode: "advantage",
      },
      () => outcomeKind === "new_saves_against_existing_effects",
    ),
    Match.exhaustive,
  );
}
