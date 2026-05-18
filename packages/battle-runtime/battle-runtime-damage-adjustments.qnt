// -*- mode: Bluespec; -*-

module battleRuntimeDamageAdjustments {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def damageAfterAdjustments(
    damage: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    damageAmountAfterTargetAdjustments(
      damage,
      ruleDamageType(damageType),
      damageAdjustmentFacts(resistances, vulnerabilities, immunities),
    )

  pure def ruleDamageType(damageType: DamageType): RuleDamageType =
    match damageType {
      | Acid => AcidDamage
      | Bludgeoning => BludgeoningDamage
      | Poison => PoisonDamage
      | Force => ForceDamage
      | Cold => ColdDamage
      | Slashing => SlashingDamage
      | Piercing => PiercingDamage
      | Radiant => RadiantDamage
      | Necrotic => NecroticDamage
      | Lightning => LightningDamage
      | Psychic => PsychicDamage
      | Fire => FireDamage
      | Thunder => ThunderDamage
    }

  pure def damageTypeFromRuleDamageType(damageType: RuleDamageType): DamageType =
    match damageType {
      | AcidDamage => Acid
      | BludgeoningDamage => Bludgeoning
      | ColdDamage => Cold
      | FireDamage => Fire
      | ForceDamage => Force
      | LightningDamage => Lightning
      | NecroticDamage => Necrotic
      | PiercingDamage => Piercing
      | PoisonDamage => Poison
      | PsychicDamage => Psychic
      | RadiantDamage => Radiant
      | SlashingDamage => Slashing
      | ThunderDamage => Thunder
    }

  pure def damageAdjustmentFacts(
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType]
  ): DamageAdjustmentFacts = {
    immuneAcid: immunities.contains(Acid),
    immuneBludgeoning: immunities.contains(Bludgeoning),
    immuneCold: immunities.contains(Cold),
    immuneFire: immunities.contains(Fire),
    immuneForce: immunities.contains(Force),
    immuneLightning: immunities.contains(Lightning),
    immuneNecrotic: immunities.contains(Necrotic),
    immunePiercing: immunities.contains(Piercing),
    immunePoison: immunities.contains(Poison),
    immunePsychic: immunities.contains(Psychic),
    immuneRadiant: immunities.contains(Radiant),
    immuneSlashing: immunities.contains(Slashing),
    immuneThunder: immunities.contains(Thunder),
    resistantAcid: resistances.contains(Acid),
    resistantBludgeoning: resistances.contains(Bludgeoning),
    resistantCold: resistances.contains(Cold),
    resistantFire: resistances.contains(Fire),
    resistantForce: resistances.contains(Force),
    resistantLightning: resistances.contains(Lightning),
    resistantNecrotic: resistances.contains(Necrotic),
    resistantPiercing: resistances.contains(Piercing),
    resistantPoison: resistances.contains(Poison),
    resistantPsychic: resistances.contains(Psychic),
    resistantRadiant: resistances.contains(Radiant),
    resistantSlashing: resistances.contains(Slashing),
    resistantThunder: resistances.contains(Thunder),
    vulnerableAcid: vulnerabilities.contains(Acid),
    vulnerableBludgeoning: vulnerabilities.contains(Bludgeoning),
    vulnerableCold: vulnerabilities.contains(Cold),
    vulnerableFire: vulnerabilities.contains(Fire),
    vulnerableForce: vulnerabilities.contains(Force),
    vulnerableLightning: vulnerabilities.contains(Lightning),
    vulnerableNecrotic: vulnerabilities.contains(Necrotic),
    vulnerablePiercing: vulnerabilities.contains(Piercing),
    vulnerablePoison: vulnerabilities.contains(Poison),
    vulnerablePsychic: vulnerabilities.contains(Psychic),
    vulnerableRadiant: vulnerabilities.contains(Radiant),
    vulnerableSlashing: vulnerabilities.contains(Slashing),
    vulnerableThunder: vulnerabilities.contains(Thunder),
  }

  pure def sameTypeDamageAfterAdjustments(
    damageParts: List[int],
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    damageAfterAdjustments(
      damageParts.foldl(0, (total, damage) => total + damage),
      damageType,
      resistances,
      vulnerabilities,
      immunities,
    )

  pure def resistanceDamageReductionAvailable(effects: Set[ActiveEffect], damageType: DamageType): bool =
    effects.exists(effect => match effect {
      | ResistanceDamageReduction(data) => data.damageType == damageType and not(data.usedThisTurn)
      | _ => false
    })

  pure def damageAfterResistanceSpellReduction(damage: int, damageType: DamageType, effects: Set[ActiveEffect], reductionRoll: int): int =
    if (damage > 0 and resistanceDamageReductionAvailable(effects, damageType))
      if (damage - reductionRoll < 0) 0 else damage - reductionRoll
    else
      damage

  pure def activeEffectsAfterResistanceSpellReduction(effects: Set[ActiveEffect], damageType: DamageType): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) =>
          if (data.damageType == damageType and not(data.usedThisTurn))
            ResistanceDamageReduction({ ...data, usedThisTurn: true })
          else
            effect
      | _ => effect
    })

}
