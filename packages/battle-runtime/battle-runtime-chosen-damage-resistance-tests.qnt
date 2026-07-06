module battleRuntimeChosenDamageResistanceTests {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import battleRuntimeChosenDamageResistance.* from "./battle-runtime-chosen-damage-resistance"

  run test_protection_from_energy_choice_set_is_exact = {
    all {
      assert(protectionFromEnergyDamageTypeChoices == Set(PFEAcid, PFECold, PFEFire, PFELightning, PFEThunder)),
      assert(not(protectionFromEnergyDamageTypeAllowed(PFEPoison))),
      assert(not(protectionFromEnergyDamageTypeAllowed(PFESlashing))),
    }
  }

  run test_protection_from_energy_applies_matching_resistance_only = {
    val effects = applyChosenDamageResistance(Set(), PFECaster, PFEFire)
    all {
      assert(damageAfterChosenDamageResistance(9, PFEFire, effects) == 4),
      assert(damageAfterChosenDamageResistance(9, PFECold, effects) == 9),
      assert(damageAfterChosenDamageResistance(9, PFESlashing, effects) == 9),
    }
  }

  run test_protection_from_energy_recast_replaces_same_caster_choice = {
    val fire = applyChosenDamageResistance(Set(), PFECaster, PFEFire)
    val cold = applyChosenDamageResistance(fire, PFECaster, PFECold)
    all {
      assert(not(cold.contains({
        source: PFECaster,
        damageType: PFEFire,
        durationTicks: protectionFromEnergyDurationTicks,
      }))),
      assert(cold.contains({
        source: PFECaster,
        damageType: PFECold,
        durationTicks: protectionFromEnergyDurationTicks,
      })),
    }
  }

  run test_protection_from_energy_concentration_break_removes_source_effect = {
    val caster = applyChosenDamageResistance(Set(), PFECaster, PFEFire)
    val bothCasters = applyChosenDamageResistance(caster, PFEOtherCaster, PFECold)
    val afterBreak = breakChosenDamageResistanceConcentration(bothCasters, PFECaster)
    all {
      assert(not(afterBreak.contains({
        source: PFECaster,
        damageType: PFEFire,
        durationTicks: protectionFromEnergyDurationTicks,
      }))),
      assert(afterBreak.contains({
        source: PFEOtherCaster,
        damageType: PFECold,
        durationTicks: protectionFromEnergyDurationTicks,
      })),
    }
  }

  run test_protection_from_energy_duration_ticks_and_expires = {
    val applied = applyChosenDamageResistance(Set(), PFECaster, PFEFire)
    val ticked = tickChosenDamageResistanceDurations(applied)
    val expiring = Set({
      source: PFECaster,
      damageType: PFEFire,
      durationTicks: 1,
    })
    all {
      assert(applied.contains({
        source: PFECaster,
        damageType: PFEFire,
        durationTicks: protectionFromEnergyDurationTicks,
      })),
      assert(ticked.contains({
        source: PFECaster,
        damageType: PFEFire,
        durationTicks: protectionFromEnergyDurationTicks - 1,
      })),
      assert(tickChosenDamageResistanceDurations(expiring) == Set()),
    }
  }

}
