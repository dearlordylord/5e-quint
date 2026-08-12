// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

module battleRuntimeLight {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def shillelaghDurationTicks: int = 10

  pure def shillelaghDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 2 else 1

  pure def shillelaghDamageDieSize(characterLevel: int): int =
    if (characterLevel >= 17) 6
    else if (characterLevel >= 11) 12
    else if (characterLevel >= 5) 10
    else 8

  pure def heldWeaponForShillelaghEffect(heldWeapon: HeldWeaponForShillelagh): Set[ShillelaghWeapon] =
    match heldWeapon {
      | HeldClub => Set(ShillelaghClub)
      | HeldQuarterstaff => Set(ShillelaghQuarterstaff)
      | HeldOtherWeapon => Set()
      | HeldNoWeapon => Set()
    }

  pure def shillelaghHeldWeaponIsEligible(heldWeapon: HeldWeaponForShillelagh): bool =
    heldWeaponForShillelaghEffect(heldWeapon).size() == 1

  pure def shillelaghDamageTypeChoiceIsLegal(selected: DamageType, weaponNormal: DamageType): bool =
    selected == Force or selected == weaponNormal

  pure def shillelaghAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def activeEffectsWithoutShillelagh(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(_) => false
      | _ => true
    })

  pure def shillelaghEffect(
    weapon: ShillelaghWeapon,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): ActiveEffect =
    ShillelaghWeaponAttackOverride({
      weapon: weapon,
      damageDice: shillelaghDamageDice(characterLevel),
      damageDieSize: shillelaghDamageDieSize(characterLevel),
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      durationTicks: shillelaghDurationTicks,
    })

  pure def resolveShillelagh(
    state: BattleState,
    heldWeapon: HeldWeaponForShillelagh,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      shillelaghHeldWeaponIsEligible(heldWeapon)
    ) {
      val weapons = heldWeaponForShillelaghEffect(heldWeapon)
      val effect = weapons.map(weapon => shillelaghEffect(weapon, spellcastingAbilityModifier, characterLevel))
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutShillelagh(state.fighter.activeEffects)
            .union(effect),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def shillelaghEffectsMatchingHeldWeapon(
    effects: Set[ActiveEffect],
    heldWeapon: HeldWeaponForShillelagh,
  ): Set[ActiveEffect] = {
    val heldWeapons = heldWeaponForShillelaghEffect(heldWeapon)
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(data) => heldWeapons.contains(data.weapon)
      | _ => true
    })
  }
}
