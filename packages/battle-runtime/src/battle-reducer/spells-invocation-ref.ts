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
    Match.when({ resource: { tag: "spellSlot" } }, (value) =>
      spellSlotInvocationRef(
        value.spell.id,
        value.resource.slotLevel,
        value.procedure,
      ),
    ),
    Match.when(
      {
        resource: { tag: "classFeatureFreeCast" },
      },
      (value) =>
        classFeatureFreeCastSpellInvocationRef(
          value.spell.id,
          value.resource.resourcePoolRef,
          value.procedure,
        ),
    ),
    Match.when(
      { access: { tag: "classCantrip" }, resource: { tag: "none" } },
      (value) => cantripSpellInvocationRef(value.spell.id, value.procedure),
    ),
    Match.when({ access: { tag: "armorOfShadows" } }, (value) =>
      armorOfShadowsSpellInvocationRef(value.spell.id),
    ),
    Match.when(
      {
        access: { tag: "spellEffect" },
        procedure: "markedDamageRider",
      },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          "markedDamageRiderTransfer",
        ),
    ),
    Match.when(
      {
        access: { tag: "spellEffect" },
        procedure: "objectContactDamageRepeat",
      },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          value.procedure,
        ),
    ),
    Match.when(
      {
        access: { tag: "spellEffect" },
        procedure: "spiritualWeaponRepeatAttack",
      },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          value.procedure,
        ),
    ),
    Match.when(
      {
        access: { tag: "spellEffect" },
        procedure: "spellCreatedHeldObjectAttack",
      },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          value.procedure,
        ),
    ),
    Match.when(
      {
        access: { tag: "spellEffect" },
        procedure: "spellCreatedHeldObjectReEvoke",
      },
      (value) =>
        spellEffectInvocationRef(
          value.spell.id,
          value.access.sourceCombatantId,
          value.procedure,
        ),
    ),
    Match.exhaustive,
  );
}
