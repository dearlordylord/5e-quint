// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
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
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import type { SpellProcedureAnyTargetListInvocationClassifier } from "./spell-procedure-profiles/profile.ts";
import { registeredSpellProcedureProfile } from "./spell-procedure-profiles/registry.ts";

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
  const profile = registeredSpellProcedureProfile(invocation.procedure);
  if (profile === null) {
    return false;
  }

  return targetListInvocationClassifierMatches(
    profile.targetListInvocation,
    invocation,
  );
}

function targetListInvocationClassifierMatches(
  classifier: SpellProcedureAnyTargetListInvocationClassifier,
  invocation: SupportedSpellInvocation,
): invocation is TargetListSpellInvocation {
  if (classifier.kind === "none") {
    return false;
  }
  if (classifier.kind === "always") {
    return true;
  }
  return (
    "targeting" in invocation &&
    invocation.targeting.kind === classifier.targetingKind
  );
}

export function activeOngoingFeaturesPreventSpellcasting(
  actor: BattleCreatureState,
): boolean {
  return (
    activeDruidWildShapeEffect(actor) !== null ||
    [...activeOngoingFeatureOccurrencesForCombatant(actor)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(
          actor,
          key,
        )?.actionRestrictions.includes("spellcasting") === true,
    )
  );
}
