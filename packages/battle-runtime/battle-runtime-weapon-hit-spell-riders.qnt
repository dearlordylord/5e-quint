// -*- mode: Bluespec; -*-

module battleRuntimeWeaponHitSpellRiders {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def favorWeaponDamageRiderDurationTicks: int =
    battleRuntimeDivineFavorDurationTicks

  pure def activeEffectsWithoutDivineFavor(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsContainDivineFavor(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => true
      | _ => false
    })

  pure def fighterDivineFavorDamage(divineFavorDamageRoll: int, effects: Set[ActiveEffect]): int =
    if (activeEffectsContainDivineFavor(effects)) divineFavorDamageRoll else 0

  pure def divineSmiteDamageDice(slotLevel: int, targetCreatureType: RuntimeCreatureType): int =
    battleRuntimeDivineSmiteDamageDice(
      slotLevel,
      targetCreatureType == FiendCreature or targetCreatureType == UndeadCreature,
    )

  pure def activeEffectsWithoutEnsnaringStrike(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | EnsnaringStrikeRestrained(_) => false
      | _ => true
    })

  pure def activeEffectsContainEnsnaringStrike(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | EnsnaringStrikeRestrained(_) => true
      | _ => false
    })

  pure def ensnaringStrikeDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeEnsnaringStrikeDamageDice(slotLevel)

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetSize: CreatureSize): bool =
    battleRuntimeEnsnaringStrikeTargetHasSaveAdvantage(
      targetSize == Large or targetSize == Huge or targetSize == Gargantuan
    )

  pure def ensnaringStrikeDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | EnsnaringStrikeRestrained(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def searingSmiteDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeSearingSmiteDamageDice(slotLevel)

  pure def searingSmiteDurationTicks: int =
    battleRuntimeSearingSmiteDurationTicks

  pure def activeEffectsWithoutSearingSmite(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SearingSmiteBurning(_) => false
      | _ => true
    })

  pure def activeEffectsContainSearingSmite(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SearingSmiteBurning(_) => true
      | _ => false
    })

  pure def searingSmiteDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | SearingSmiteBurning(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)
}
