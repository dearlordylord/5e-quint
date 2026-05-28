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
import { abilityD20TestRollModeSaveGateProfile } from "./ability-d20-test-roll-mode-save-gate.ts";
import { blurAttackRollDefenseProfile } from "./blur-attack-roll-defense.ts";
import { commandProfile } from "./command.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./condition-removal-protection.ts";
import { counterspellProfile } from "./counterspell.ts";
import { creatureSizeChangeProfile } from "./creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./creature-type-protection.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { dragonsBreathInitialProfile } from "./dragons-breath-initial.ts";
import { expeditiousRetreatDashProfile } from "./expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./feather-fall-mitigation.ts";
import { greaseGroundHazardProfile } from "./grease-ground-hazard.ts";
import { heldLightProfile } from "./held-light.ts";
import { hideousLaughterProfile } from "./hideous-laughter.ts";
import { jumpMovementReplacementProfile } from "./jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./levitated-creature.ts";
import { makeStableProfile } from "./make-stable.ts";
import { magicWeaponEnhancementProfile } from "./magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { objectLightProfile } from "./object-light.ts";
import { persistentArmorEffectProfile } from "./persistent-armor-effect.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./save-gated-condition.ts";
import { saveGatedDamageProfile } from "./save-gated-damage.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./self-transformation-mode.ts";
import { selfTeleportProfile } from "./self-teleport.ts";
import { shieldReactionProfile } from "./shield-reaction.ts";
import { sleepTargetAdmissionProfile } from "./sleep-target-admission.ts";
import { spellAttackDamageProfile } from "./spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { thaumaturgyBoomingVoiceProfile } from "./thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./warding-bond.ts";
import { weaponAttackOverrideProfile } from "./weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./weapon-damage-rider.ts";
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
  persistentArmorEffectProfile,
  magicWeaponEnhancementProfile,
  wardingBondProfile,
  creatureTypeProtectionProfile,
  conditionRemovalProtectionProfile,
  directConditionProfile,
  directConditionRemovalProfile,
  conditionImmunityAndTurnStartTemporaryHitPointsProfile,
  creatureSizeChangeProfile,
  levitatedCreatureProfile,
  scalarBuffProfile,
  directHitPointRestorationProfile,
  expeditiousRetreatDashProfile,
  jumpMovementReplacementProfile,
  featherFallMitigationProfile,
  selfTeleportProfile,
  selfTransformationModeProfile,
  dragonsBreathInitialProfile,
  sanctuaryTargetingInterdictionProfile,
  markedDamageRiderProfile,
  weaponDamageRiderProfile,
  weaponAttackOverrideProfile,
  spellHostedWeaponAttackProfile,
  saveGatedDamageProfile,
  saveGatedConditionProfile,
  saveGatedConditionImmunityProfile,
  saveGatedAttackRollAdvantageProfile,
  abilityD20TestRollModeSaveGateProfile,
  sleepTargetAdmissionProfile,
  hideousLaughterProfile,
  greaseGroundHazardProfile,
  commandProfile,
  counterspellProfile,
  shieldReactionProfile,
  spellAttackDamageProfile,
  spellAttackSequenceProfile,
  chainedSpellAttackDamageProfile,
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
