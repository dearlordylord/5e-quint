// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellScalarBuffProjectionCore {
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Casting Time and Using a Higher-Level
  //   Spell Slot.
  // - Rules-Glossary.md: Armor Class, Concentration, Fly Speed, Speed, and
  //   Temporary Hit Points.
  // - Playing-the-Game.md: Temporary Hit Points.
  // - Spells/Descriptions-A-D.md: Aid and Barkskin.
  // - Spells/Descriptions-E-L.md: False Life, Fly, Heroism, and Longstrider.
  // - Spells/Descriptions-S-Z.md: Shield of Faith and Spider Climb.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Effect, Concentration,
  //   Speed, Armor Class, Hit Point Maximum, and Temporary Hit Points.

  type ScalarBuffSpellProfile =
    | FalseLifeScalarBuffProfile
    | LongstriderScalarBuffProfile
    | ShieldOfFaithScalarBuffProfile
    | SpiderClimbScalarBuffProfile
    | FlyScalarBuffProfile
    | BarkskinScalarBuffProfile
    | HeroismScalarBuffProfile
    | AidScalarBuffProfile

  type ScalarBuffEffect =
    | LongstriderSpeedIncreaseEffect
    | ShieldOfFaithArmorClassBonusEffect
    | SpiderClimbClimbSpeedGrantEffect
    | FlySpeedHoverGrantEffect
    | BarkskinArmorClassFloorEffect
    | HeroismFrightenedImmunityEffect
    | HeroismTurnStartTemporaryHitPointsEffect({ amount: int })
    | AidHitPointMaximumIncreaseEffect({ amount: int })

  type ScalarBuffActiveEffectProjection =
    | ScalarBuffPersistentEffectProjection({ effect: ScalarBuffEffect })
    | ScalarBuffImmediateTemporaryHitPointProjection({ amount: int })

  type ScalarBuffProjectionDomain =
    | ScalarBuffArmorClassProjectionDomain
    | ScalarBuffSpeedProjectionDomain
    | ScalarBuffSpecialSpeedProjectionDomain
    | ScalarBuffHitPointMaximumProjectionDomain
    | ScalarBuffTemporaryHitPointProjectionDomain
    | ScalarBuffConditionImmunityProjectionDomain

  pure def scalarBuffSpellAction(profile: ScalarBuffSpellProfile): SpellInvocationAction =
    if (profile == ShieldOfFaithScalarBuffProfile or profile == BarkskinScalarBuffProfile) BonusActionSpellInvocation else ActionTimeSpellInvocation

  pure def scalarBuffMaximumTargets(profile: ScalarBuffSpellProfile, slotLevel: int): int =
    if (profile == LongstriderScalarBuffProfile) slotLevel
    else if (profile == SpiderClimbScalarBuffProfile) 1 + (if (slotLevel > 2) slotLevel - 2 else 0)
    else if (profile == FlyScalarBuffProfile) 1 + (if (slotLevel > 3) slotLevel - 3 else 0)
    else if (profile == HeroismScalarBuffProfile) 1 + (if (slotLevel > 1) slotLevel - 1 else 0)
    else if (profile == AidScalarBuffProfile) 3
    else 1

  pure def scalarBuffTemporaryHitPoints(profile: ScalarBuffSpellProfile, slotLevel: int, rolledDice: int): int =
    if (profile == FalseLifeScalarBuffProfile) rolledDice + 4 + ((if (slotLevel > 1) slotLevel - 1 else 0) * 5)
    else 0

  pure def scalarBuffAidHitPointMaximumIncrease(slotLevel: int): int =
    5 + ((if (slotLevel > 2) slotLevel - 2 else 0) * 5)

  pure def scalarBuffEffects(
    profile: ScalarBuffSpellProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
  ): Set[ScalarBuffEffect] =
    match profile {
      | FalseLifeScalarBuffProfile => Set()
      | LongstriderScalarBuffProfile => Set(LongstriderSpeedIncreaseEffect)
      | ShieldOfFaithScalarBuffProfile => Set(ShieldOfFaithArmorClassBonusEffect)
      | SpiderClimbScalarBuffProfile => Set(SpiderClimbClimbSpeedGrantEffect)
      | FlyScalarBuffProfile => Set(FlySpeedHoverGrantEffect)
      | BarkskinScalarBuffProfile => Set(BarkskinArmorClassFloorEffect)
      | HeroismScalarBuffProfile => Set(
          HeroismFrightenedImmunityEffect,
          HeroismTurnStartTemporaryHitPointsEffect({ amount: spellcastingAbilityModifier }),
        )
      | AidScalarBuffProfile => Set(AidHitPointMaximumIncreaseEffect({ amount: scalarBuffAidHitPointMaximumIncrease(slotLevel) }))
    }

  pure def scalarBuffActiveEffectProjections(
    profile: ScalarBuffSpellProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
    rolledDice: int,
  ): Set[ScalarBuffActiveEffectProjection] =
    scalarBuffEffects(profile, spellcastingAbilityModifier, slotLevel)
      .map(effect => ScalarBuffPersistentEffectProjection({ effect: effect }))
      .union(
        if (scalarBuffTemporaryHitPoints(profile, slotLevel, rolledDice) > 0)
          Set(ScalarBuffImmediateTemporaryHitPointProjection({ amount: scalarBuffTemporaryHitPoints(profile, slotLevel, rolledDice) }))
        else
          Set()
      )

  pure def scalarBuffProjectionDomain(
    projection: ScalarBuffActiveEffectProjection
  ): ScalarBuffProjectionDomain =
    match projection {
      | ScalarBuffPersistentEffectProjection(data) =>
        match data.effect {
          | LongstriderSpeedIncreaseEffect => ScalarBuffSpeedProjectionDomain
          | ShieldOfFaithArmorClassBonusEffect => ScalarBuffArmorClassProjectionDomain
          | SpiderClimbClimbSpeedGrantEffect => ScalarBuffSpecialSpeedProjectionDomain
          | FlySpeedHoverGrantEffect => ScalarBuffSpecialSpeedProjectionDomain
          | BarkskinArmorClassFloorEffect => ScalarBuffArmorClassProjectionDomain
          | HeroismFrightenedImmunityEffect => ScalarBuffConditionImmunityProjectionDomain
          | HeroismTurnStartTemporaryHitPointsEffect(_) => ScalarBuffTemporaryHitPointProjectionDomain
          | AidHitPointMaximumIncreaseEffect(_) => ScalarBuffHitPointMaximumProjectionDomain
        }
      | ScalarBuffImmediateTemporaryHitPointProjection(_) => ScalarBuffTemporaryHitPointProjectionDomain
    }

  pure def scalarBuffProfileProjectionDomains(
    profile: ScalarBuffSpellProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
    rolledDice: int,
  ): Set[ScalarBuffProjectionDomain] =
    scalarBuffActiveEffectProjections(
      profile,
      spellcastingAbilityModifier,
      slotLevel,
      rolledDice,
    ).map(scalarBuffProjectionDomain)

  pure def scalarBuffRequiresConcentration(profile: ScalarBuffSpellProfile): bool =
    profile == ShieldOfFaithScalarBuffProfile or profile == SpiderClimbScalarBuffProfile or profile == FlyScalarBuffProfile or profile == HeroismScalarBuffProfile
}
