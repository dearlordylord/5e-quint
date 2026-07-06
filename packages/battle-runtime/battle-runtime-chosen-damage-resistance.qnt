// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-chosen-damage-resistance
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-chosen-damage-resistance

module battleRuntimeChosenDamageResistance {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"

  type ProtectionFromEnergyDamageType =
    | PFEAcid
    | PFECold
    | PFEFire
    | PFELightning
    | PFEThunder
    | PFEPoison
    | PFESlashing

  type ProtectionFromEnergySource =
    | PFECaster
    | PFEOtherCaster

  type ChosenDamageResistanceEffect = {
    source: ProtectionFromEnergySource,
    damageType: ProtectionFromEnergyDamageType,
    durationTicks: int,
  }

  pure def protectionFromEnergyDurationTicks: int = 1 * 60 * 10

  pure def protectionFromEnergyDamageTypeChoices: Set[ProtectionFromEnergyDamageType] =
    Set(PFEAcid, PFECold, PFEFire, PFELightning, PFEThunder)

  pure def protectionFromEnergyDamageTypeAllowed(damageType: ProtectionFromEnergyDamageType): bool =
    protectionFromEnergyDamageTypeChoices.contains(damageType)

  pure def protectionFromEnergyRuleDamageType(damageType: ProtectionFromEnergyDamageType): RuleDamageType =
    match damageType {
      | PFEAcid => AcidDamage
      | PFECold => ColdDamage
      | PFEFire => FireDamage
      | PFELightning => LightningDamage
      | PFEThunder => ThunderDamage
      | PFEPoison => PoisonDamage
      | PFESlashing => SlashingDamage
    }

  pure def protectionFromEnergyDamageAdjustmentFacts(
    effects: Set[ChosenDamageResistanceEffect]
  ): DamageAdjustmentFacts = {
    immunities: Set(),
    resistances: effects.map(effect => protectionFromEnergyRuleDamageType(effect.damageType)),
    vulnerabilities: Set(),
  }

  pure def chosenDamageResistanceEffectsWithoutSource(
    effects: Set[ChosenDamageResistanceEffect],
    source: ProtectionFromEnergySource,
  ): Set[ChosenDamageResistanceEffect] =
    effects.filter(effect => effect.source != source)

  pure def applyChosenDamageResistance(
    effects: Set[ChosenDamageResistanceEffect],
    source: ProtectionFromEnergySource,
    damageType: ProtectionFromEnergyDamageType,
  ): Set[ChosenDamageResistanceEffect] =
    if (protectionFromEnergyDamageTypeAllowed(damageType))
      chosenDamageResistanceEffectsWithoutSource(effects, source).union(Set({
        source: source,
        damageType: damageType,
        durationTicks: protectionFromEnergyDurationTicks,
      }))
    else
      effects

  pure def tickChosenDamageResistanceDuration(
    effect: ChosenDamageResistanceEffect,
  ): Set[ChosenDamageResistanceEffect] =
    if (effect.durationTicks > 1)
      Set(effect.with("durationTicks", effect.durationTicks - 1))
    else
      Set()

  pure def tickChosenDamageResistanceDurations(
    effects: Set[ChosenDamageResistanceEffect],
  ): Set[ChosenDamageResistanceEffect] =
    effects.map(effect => tickChosenDamageResistanceDuration(effect)).flatten()

  pure def breakChosenDamageResistanceConcentration(
    effects: Set[ChosenDamageResistanceEffect],
    source: ProtectionFromEnergySource,
  ): Set[ChosenDamageResistanceEffect] =
    chosenDamageResistanceEffectsWithoutSource(effects, source)

  pure def damageAfterChosenDamageResistance(
    damage: int,
    damageType: ProtectionFromEnergyDamageType,
    effects: Set[ChosenDamageResistanceEffect],
  ): int =
    damageAmountAfterTargetAdjustments(
      damage,
      protectionFromEnergyRuleDamageType(damageType),
      protectionFromEnergyDamageAdjustmentFacts(effects),
    )

}
