export const TRIGGERED_REACTION_SPELL_PROCEDURE_CANDIDATES = [
  "shieldReaction",
  "saveGatedDamage",
  "featherFallMitigation",
  "counterspell",
] as const;
export type TriggeredReactionSpellProcedureCandidate =
  (typeof TRIGGERED_REACTION_SPELL_PROCEDURE_CANDIDATES)[number];
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
    readonly castingTime?: { readonly kind: string };
  },
>(
  invocation: TInvocation,
): invocation is
  | Extract<
      TInvocation,
      {
        readonly procedure: Exclude<
          TriggeredReactionSpellProcedureCandidate,
          "saveGatedDamage"
        >;
      }
    >
  | (Extract<TInvocation, { readonly procedure: "saveGatedDamage" }> & {
      readonly castingTime: { readonly kind: "reaction" };
    }) {
  if (invocation.procedure === "saveGatedDamage") {
    return invocation.castingTime?.kind === "reaction";
  }
  return (
    invocation.procedure === "shieldReaction" ||
    invocation.procedure === "featherFallMitigation" ||
    invocation.procedure === "counterspell"
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
