// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-removal-protection

module battleRuntimeProtectionFromPoisonTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeProtectionFromPoison.* from "./battle-runtime-protection-from-poison"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_protection_from_poison_cast_removes_poisoned_and_applies_protection = {
    val poisoned = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(RayOfSicknessPoisoned) },
    }
    val result = resolveProtectionFromPoisonSpell(poisoned, Goblin)
    all {
      assert(not(result.actionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(result.goblin.activeEffects.contains(RayOfSicknessPoisoned))),
      assert(result.goblin.activeEffects.contains(protectionFromPoisonSavingThrowAdvantageActiveEffect)),
      assert(result.goblin.activeEffects.contains(protectionFromPoisonResistanceActiveEffect)),
    }
  }

  run test_protection_from_poison_projects_save_advantage_and_damage_resistance = {
    val effects = protectionFromPoisonActiveEffects
    all {
      assert(protectionFromPoisonSavingThrowRollMode(effects) == AdvantageSavingThrow),
      assert(protectionFromPoisonSavingThrowRollMode(Set()) == NormalSavingThrow),
      assert(damageAfterProtectionFromPoisonResistance(9, Poison, effects) == 4),
      assert(damageAfterProtectionFromPoisonResistance(9, Slashing, effects) == 9),
    }
  }

  run test_protection_from_poison_protection_expires_after_duration_tick = {
    val expiringEffects = Set(
      ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: 1 }),
      ProtectionFromPoisonPoisonResistance({ durationTicks: 1 }),
    )
    all {
      assert(tickDurationActiveEffects(expiringEffects) == Set()),
      assert(tickDurationActiveEffects(protectionFromPoisonActiveEffects).contains(
        ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: protectionFromPoisonDurationTicks - 1 })
      )),
      assert(tickDurationActiveEffects(protectionFromPoisonActiveEffects).contains(
        ProtectionFromPoisonPoisonResistance({ durationTicks: protectionFromPoisonDurationTicks - 1 })
      )),
    }
  }
}
