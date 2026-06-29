// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic weapon-hosted item/attack capability routes.
// These facts describe reducer-facing shape and capability, not authored spell,
// item, attack, catalog, or source-section identity.
module battleRuntimeWeaponHostedCapabilityFacts {
  type WeaponHostedAttackHostFact =
    | HeldWeaponAvailableAttackHost
    | SpellProcedureSuppliedWeaponAttackHost

  type WeaponHostedComponentFact =
    | ComponentWeaponChoiceRequired
    | HeldWeaponAlreadyChosen

  type WeaponHostedAttackProfileFact =
    | SpellcastingAbilityAttackProfile
    | SpellcastingAbilityDamageProfile
    | WeaponDamageDieOverride
    | DamageTypeChoiceProfile
    | ExtraDamageDiceProfile

  type WeaponHostedAttackFrontierFact =
    | TargetChoiceFrontier
    | AttackRollFrontier
    | DamageRollFrontier
    | HitPointApplicationFrontier

  type WeaponHostedCapabilityFact =
    | RouteWeaponHostedAttackHost({
        host: WeaponHostedAttackHostFact,
      })
    | RouteWeaponHostedComponent({
        component: WeaponHostedComponentFact,
      })
    | RouteWeaponHostedAttackProfile({
        profile: WeaponHostedAttackProfileFact,
      })
    | RouteWeaponHostedAttackFrontier({
        frontier: WeaponHostedAttackFrontierFact,
      })
}
