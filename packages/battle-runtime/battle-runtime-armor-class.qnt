// -*- mode: Bluespec; -*-

module battleRuntimeArmorClass {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def mageArmorDurationTicks: int = 8 * 60 * 10

  pure def mageArmorActiveEffect(durationTicks: int): ActiveEffect =
    MageArmor({ durationTicks: durationTicks })

  pure def activeEffectsContainMageArmor(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | MageArmor(_) => true
      | _ => false
    })

  pure def activeEffectsWithoutMageArmor(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MageArmor(_) => false
      | _ => true
    })

  pure def activeEffectsMageArmorDurationTicks(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | MageArmor(data) => data.durationTicks
        | _ => 0
      })
      .fold(0, (highest, durationTicks) => if (highest > durationTicks) highest else durationTicks)

  pure def combatantArmorClass(combatant: Combatant): int =
    activeEffectArmorClass(combatant.ac, combatant.dexMod, combatant.activeEffects)

  pure def activeEffectArmorClass(baseAc: int, dexMod: int, effects: Set[ActiveEffect]): int =
    {
      val base = if (effects.exists(effect => match effect {
        | BardicInspirationDie(_) => false
        | MageArmor(_) => true
        | RayOfFrostSpeedDelta => false
        | ShieldArmorClassBonus => false
        | LongstriderSpeedDelta => false
        | ShieldOfFaithArmorClassBonus => false
        | HeroismFrightenedImmunity => false
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | BaneD20RollPenalty => false
        | BlessD20RollBonus => false
        | GuidanceAbilityCheckBonus => false
        | ThaumaturgyBoomingVoice(_) => false
        | ResistanceDamageReduction(_) => false
        | DivineFavorWeaponDamageRider(_) => false
        | HuntersMarkDamageRider(_) => false
        | HexDamageRider(_) => false
        | RayOfSicknessPoisoned => false
        | ChillTouchHitPointRegainPrevented(_) => false
        | StarryWispInvisibleBenefitDenied(_) => false
        | ShockingGraspOpportunityAttackDenied => false
        | GuidingBoltNextAttackAdvantage => false
        | ViciousMockeryNextAttackDisadvantage => false
        | WeaponMasterySapNextAttackDisadvantage(_) => false
        | ColorSprayBlinded(_) => false
        | EntangleRestrained => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | FaerieFireOutline => false
        | AnimalFriendshipCharmed(_) => false
        | CharmPersonCharmed(_) => false
        | ProtectionRelevantCharmed(_) => false
        | ProtectionRelevantFrightened(_) => false
        | ProtectionRelevantPossession(_) => false
        | ProtectionFromEvilAndGoodCreatureTypeProtection => false
        | DancingLightsEffect(_) => false
        | ProduceFlameHeldLight(_) => false
        | ShillelaghWeaponAttackOverride(_) => false
        | ExpeditiousRetreatDashBonusAction => false
        | JumpMovementReplacement(_) => false
        | FeatherFallMitigation(_) => false
        | SanctuaryWard(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
        | HideousLaughterEffect(_) => false
        | GreaseGroundHazard(_) => false
        | FogCloudObscurement(_) => false
        | CommandPending(_) => false
      })) 13 + dexMod else baseAc
      val shieldBonus = if (effects.contains(ShieldArmorClassBonus)) 5 else 0
      val shieldOfFaithBonus = if (effects.contains(ShieldOfFaithArmorClassBonus)) 2 else 0
      base + shieldBonus + shieldOfFaithBonus
    }
}
