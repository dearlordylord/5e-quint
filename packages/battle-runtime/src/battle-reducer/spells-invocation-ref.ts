// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// Outer presentation projection: this is the sole reducer-adjacent boundary
// allowed to join authored spell identity to a mechanical invocation reference.

import {
  armorOfShadowsSpellInvocationRef,
  cantripSpellInvocationRef,
  classFeatureFreeCastSpellInvocationRef,
  spellEffectInvocationRef,
  spellSlotInvocationRef,
  type SpellInvocationRef,
} from "../battle-subjects.ts";
import type { SupportedSpellInvocation } from "../battle-reducer.ts";
import { Match } from "effect";

export function supportedSpellInvocationRef(
  invocation: SupportedSpellInvocation,
): SpellInvocationRef {
  return Match.value(invocation).pipe(
    Match.when(
      { access: { tag: "classCantrip" } },
      (value) => cantripSpellInvocationRef(value.spell.id, value.procedure),
    ),
    Match.when(
      { access: { tag: "prepared" } },
      (value) => {
        if (value.resource.tag === "spellSlot") {
          return spellSlotInvocationRef(
            value.spell.id,
            value.resource.slotLevel,
            value.procedure,
          );
        }
        return classFeatureFreeCastSpellInvocationRef(
          value.spell.id,
          value.resource.resourcePoolRef,
          value.procedure,
        );
      },
    ),
    Match.when(
      { access: { tag: "armorOfShadows" } },
      (value) => armorOfShadowsSpellInvocationRef(value.spell.id),
    ),
    Match.when(
      { access: { tag: "spellEffect" } },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          value.procedure === "markedDamageRider"
            ? "markedDamageRiderTransfer"
            : value.procedure,
        ),
    ),
    Match.exhaustive,
  );
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
  return supportedSpellInvocationRef(invocation);
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
    return left.resourcePoolRef === right.resourcePoolRef;
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
