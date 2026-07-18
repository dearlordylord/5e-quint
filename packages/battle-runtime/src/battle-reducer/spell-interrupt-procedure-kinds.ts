import {
  topLevelSpellCastingTime,
  type SpellMechanicsWithTopLevelCastingTime,
  type SpellRecord,
  type TopLevelSpellCastingTime,
} from "@dnd/surface/surface/types";

export const TRIGGERED_REACTION_SPELL_PROCEDURE_CANDIDATES = [
  "shieldReaction",
  "saveGatedDamage",
  "featherFallMitigation",
  "counterspell",
] as const;
export type TriggeredReactionSpellProcedureCandidate =
  (typeof TRIGGERED_REACTION_SPELL_PROCEDURE_CANDIDATES)[number];
type ReactionCastingTime = Extract<
  TopLevelSpellCastingTime,
  { readonly kind: "reaction" }
>;
type ReactionCastingSpell = SpellRecord & {
  readonly mechanics: SpellMechanicsWithTopLevelCastingTime & {
    readonly castingTime: ReactionCastingTime;
  };
};

export const ATTACK_HIT_BONUS_ACTION_SPELL_PROCEDURES = [
  "afterHitDamage",
  "afterHitSaveGatedCondition",
  "afterHitTimedDamageAndSave",
  "afterHitDamageAndIllumination",
] as const;
export type AttackHitBonusActionSpellProcedure =
  (typeof ATTACK_HIT_BONUS_ACTION_SPELL_PROCEDURES)[number];

export function isTriggeredReactionSpellInvocation<
  TInvocation extends {
    readonly procedure: string;
    readonly spell: SpellRecord;
  },
>(
  invocation: TInvocation,
): invocation is Extract<
  TInvocation,
  { readonly procedure: TriggeredReactionSpellProcedureCandidate }
> & { readonly spell: ReactionCastingSpell } {
  return (
    TRIGGERED_REACTION_SPELL_PROCEDURE_CANDIDATES.some(
      (procedure) => procedure === invocation.procedure,
    ) && topLevelSpellCastingTime(invocation.spell.mechanics)?.kind === "reaction"
  );
}

export function isAttackHitBonusActionSpellInvocation<
  TInvocation extends { readonly procedure: string },
>(
  invocation: TInvocation,
): invocation is Extract<
  TInvocation,
  { readonly procedure: AttackHitBonusActionSpellProcedure }
> {
  return ATTACK_HIT_BONUS_ACTION_SPELL_PROCEDURES.some(
    (procedure) => procedure === invocation.procedure,
  );
}
