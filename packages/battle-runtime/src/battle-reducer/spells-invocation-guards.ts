// Spell invocation predicates and lightweight projections extracted from
// ../battle-reducer.ts. Keeps narrowing logic close to the spell invocation
// vocabulary while the reducer facade continues to own the public type surface.

import type {
  BattleCreatureState,
  DamageSpellSource,
  PreparedDamageSpellSource,
  ScalarBuffSpellTargeting,
  SupportedSpellInvocation,
  TargetListSpellInvocation,
} from "../battle-reducer.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state.ts";

export function isPreparedDamageSpellSource(
  source: DamageSpellSource,
): source is PreparedDamageSpellSource {
  return source.access.tag === "prepared";
}

export function damageSpellSource(
  source: DamageSpellSource,
): DamageSpellSource {
  return isPreparedDamageSpellSource(source)
    ? { access: source.access, resource: source.resource }
    : { access: source.access, resource: source.resource };
}

export function isScalarBuffTargetListInvocation(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
> & {
  readonly targeting: Extract<
    ScalarBuffSpellTargeting,
    { readonly kind: "targetList" }
  >;
} {
  return invocation.targeting.kind === "targetList";
}

export function isTargetListSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is TargetListSpellInvocation {
  return (
    invocation.procedure === "directHitPointRestoration" ||
    (invocation.procedure === "scalarBuff" &&
      invocation.targeting.kind === "targetList") ||
    invocation.procedure === "rollModifier" ||
    invocation.procedure === "damageReduction" ||
    (invocation.procedure === "saveGatedCondition" &&
      invocation.targeting.kind === "targetList") ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure === "conditionRemovalProtection" ||
    invocation.procedure === "directConditionRemoval" ||
    invocation.procedure ===
      "conditionImmunityAndTurnStartTemporaryHitPoints" ||
    invocation.procedure === "jumpMovementReplacement" ||
    invocation.procedure === "featherFallMitigation" ||
    invocation.procedure === "sanctuaryTargetingInterdiction" ||
    invocation.procedure === "directCondition"
  );
}

export function activeOngoingFeaturesPreventSpellcasting(
  actor: BattleCreatureState,
): boolean {
  return [...activeOngoingFeatureOccurrencesForCombatant(actor)].some(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(
        actor,
        key,
      )?.actionRestrictions.includes("spellcasting") === true,
  );
}
