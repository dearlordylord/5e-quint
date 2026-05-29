// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// Spell invocation reference projections extracted from spells-holes-fills.ts.

import { spellId } from "../identity.ts";
import type { SpellInvocationRef } from "../battle-subjects.ts";
import {
  isPreparedDamageSpellSource,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellProcedureProfileFor } from "./spell-procedure-profiles/registry.ts";

export function supportedSpellInvocationRef(
  invocation: SupportedSpellInvocation,
): SpellInvocationRef {
  const profile = spellProcedureProfileFor(invocation.procedure);
  // Registry lookup preserves the procedure/invocation pairing, but the
  // heterogeneous profile methods erase to a union at this call site.
  return profile.invocationRef(invocation as never);
}

export function damageSpellInvocationRef(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "heldLightHurl"
        | "spellAttackSequence"
        | "spellAttackDamage"
        | "saveGatedDamage";
    }
  >,
): SpellInvocationRef {
  if (
    invocation.procedure !== "heldLightHurl" &&
    isPreparedDamageSpellSource(invocation)
  ) {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: invocation.procedure,
    };
  }
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: invocation.procedure,
  };
}

export function sameSpellInvocationRef(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (
    left.tag !== right.tag ||
    left.spellId !== right.spellId ||
    left.procedure !== right.procedure
  ) {
    return false;
  }
  if (left.tag === "cantrip" && right.tag === "cantrip") {
    return true;
  }
  if (left.tag === "spellEffect" && right.tag === "spellEffect") {
    return left.sourceCombatantId === right.sourceCombatantId;
  }
  if (
    left.tag === "classFeatureFreeCast" &&
    right.tag === "classFeatureFreeCast"
  ) {
    return left.resourceUnitId === right.resourceUnitId;
  }
  if (left.tag === "armorOfShadows" && right.tag === "armorOfShadows") {
    return true;
  }
  return left.tag === "spellSlot" && right.tag === "spellSlot"
    ? left.slotLevel === right.slotLevel
    : false;
}

export function supportedSpellInvocationMatchesRef(
  invocation: SupportedSpellInvocation,
  ref: SpellInvocationRef,
): boolean {
  return sameSpellInvocationRef(supportedSpellInvocationRef(invocation), ref);
}
