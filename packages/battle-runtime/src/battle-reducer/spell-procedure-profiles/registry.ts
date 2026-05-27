// Central registry of Spell Procedure Profiles. During migration, registered
// profiles live here while unmigrated profiles continue to use scattered
// dispatch sites in spells-resolve.ts, spells-discovery.ts, etc. As profiles
// migrate, they are added here and the corresponding scattered code is
// removed.
//
// Lookup is partial during migration: registeredSpellProcedureProfile()
// returns null for procedures that have not been migrated, and callers fall
// back to their existing dispatch.

import { damageReductionProfile } from "./damage-reduction.ts";
import { blurAttackRollDefenseProfile } from "./blur-attack-roll-defense.ts";
import { heldLightProfile } from "./held-light.ts";
import { makeStableProfile } from "./make-stable.ts";
import { objectLightProfile } from "./object-light.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import { thaumaturgyBoomingVoiceProfile } from "./thaumaturgy-booming-voice.ts";
import type { AnySpellProcedureProfile } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";

export const REGISTERED_SPELL_PROCEDURE_PROFILES = [
  damageReductionProfile,
  rollModifierProfile,
  makeStableProfile,
  heldLightProfile,
  objectLightProfile,
  thaumaturgyBoomingVoiceProfile,
  blurAttackRollDefenseProfile,
  seeInvisibleObserverSightProfile,
] as const satisfies ReadonlyArray<AnySpellProcedureProfile>;

// Procedure literal type derived from the registry. As more profiles
// migrate, this widens automatically without a hand-maintained union.
export type RegisteredSpellProcedure =
  (typeof REGISTERED_SPELL_PROCEDURE_PROFILES)[number]["procedure"];

const REGISTRY_BY_PROCEDURE: ReadonlyMap<
  SupportedSpellInvocation["procedure"],
  AnySpellProcedureProfile
> = new Map(
  REGISTERED_SPELL_PROCEDURE_PROFILES.map(
    (p) => [p.procedure, p as AnySpellProcedureProfile] as const,
  ),
);

export function registeredSpellProcedureProfile(
  procedure: SupportedSpellInvocation["procedure"],
): AnySpellProcedureProfile | null {
  return REGISTRY_BY_PROCEDURE.get(procedure) ?? null;
}

// Typed lookup for callers that have already narrowed by procedure literal.
// Returns the profile with its concrete procedure, invocation, and resolve
// input types preserved.
export function spellProcedureProfileFor<P extends RegisteredSpellProcedure>(
  procedure: P,
): Extract<
  (typeof REGISTERED_SPELL_PROCEDURE_PROFILES)[number],
  { readonly procedure: P }
> {
  const found = REGISTRY_BY_PROCEDURE.get(procedure);
  if (found === undefined) {
    throw new Error(
      `spellProcedureProfileFor: procedure ${procedure} is in RegisteredSpellProcedure but missing from registry map`,
    );
  }
  return found as unknown as Extract<
    (typeof REGISTERED_SPELL_PROCEDURE_PROFILES)[number],
    { readonly procedure: P }
  >;
}
