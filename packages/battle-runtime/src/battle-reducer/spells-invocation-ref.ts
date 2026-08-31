// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// Outer presentation projection: this is the sole reducer-adjacent boundary
// allowed to join authored spell identity to a mechanical invocation reference.

import {
  armorOfShadowsSpellInvocationRef,
  scopedCantripSpellInvocationRef,
  scopedSpellAccessFreeCastSpellInvocationRef,
  spellEffectInvocationRef,
  scopedSpellSlotInvocationRef,
  type SpellInvocationRef,
} from "../battle-subjects.ts";
import type { SupportedSpellInvocation } from "../battle-state-execution.ts";
import type { CantripSpellAccess } from "../procedure-execution/spell-invocation-vocabulary.ts";
import { isCantripSpellAccess } from "../procedure-execution/spell-invocation-vocabulary.ts";
import { Match } from "effect";

type CantripSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly access: CantripSpellAccess }
>;
type AuthoredSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly access: unknown; readonly spell: unknown }
>;

function isCantripSpellInvocation(
  invocation: AuthoredSpellInvocation,
): invocation is CantripSpellInvocation {
  return isCantripSpellAccess(invocation.access);
}

function invocationSourceRef(invocation: AuthoredSpellInvocation) {
  return invocation.spell.castingSource.tag === "spellAccess"
    ? {
        tag: "spellAccess" as const,
        spellAccessRef: invocation.spell.castingSource.spellAccessRef,
      }
    : { tag: "classSpellcasting" as const };
}

export function supportedSpellInvocationRef(
  invocation: AuthoredSpellInvocation,
): SpellInvocationRef {
  return Match.value(invocation).pipe(
    Match.when({ access: { tag: "prepared" } }, (value) =>
      Match.value(value.resource).pipe(
        Match.when({ tag: "spellAccessFreeCast" }, (resource) =>
          scopedSpellAccessFreeCastSpellInvocationRef(
            value.spell.id,
            resource.resourcePoolRef,
            value.procedure,
            invocationSourceRef(value),
          ),
        ),
        Match.when({ tag: "spellSlot" }, (resource) =>
          scopedSpellSlotInvocationRef(
            value.spell.id,
            resource.slotLevel,
            value.procedure,
            invocationSourceRef(value),
          ),
        ),
        Match.exhaustive,
      ),
    ),
    Match.when(isCantripSpellInvocation, (value) =>
      scopedCantripSpellInvocationRef(
        value.spell.id,
        value.procedure,
        invocationSourceRef(value),
      ),
    ),
    Match.when({ access: { tag: "armorOfShadows" } }, (value) =>
      armorOfShadowsSpellInvocationRef(value.spell.id),
    ),
    Match.when({ access: { tag: "spellEffect" } }, (value) =>
      Match.value(value.procedure).pipe(
        Match.when("markedDamageRider", () =>
          spellEffectInvocationRef(
            value.spell.id,
            value.access.sourceCombatantId,
            "markedDamageRiderTransfer",
          ),
        ),
        Match.when("objectContactDamageRepeat", () =>
          spellEffectInvocationRef(
            value.spell.id,
            value.access.sourceCombatantId,
            "objectContactDamageRepeat",
          ),
        ),
        Match.when("spatialMeleeSpellAttackProxy", () =>
          spellEffectInvocationRef(
            value.spell.id,
            value.access.sourceCombatantId,
            "spatialMeleeSpellAttackProxy",
          ),
        ),
        Match.when("spellCreatedHeldObjectAttack", () =>
          spellEffectInvocationRef(
            value.spell.id,
            value.access.sourceCombatantId,
            "spellCreatedHeldObjectAttack",
          ),
        ),
        Match.when("spellCreatedHeldObjectReEvoke", () =>
          spellEffectInvocationRef(
            value.spell.id,
            value.access.sourceCombatantId,
            "spellCreatedHeldObjectReEvoke",
          ),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}
