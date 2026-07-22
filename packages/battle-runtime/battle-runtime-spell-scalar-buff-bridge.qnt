// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeSpellScalarBuffBridge {
  import spellScalarBuffProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"

  type BattleRuntimeScalarBuffProfile =
    | BattleRuntimeFalseLifeScalarBuff
    | BattleRuntimeLongstriderScalarBuff
    | BattleRuntimeShieldOfFaithScalarBuff
    | BattleRuntimeSpiderClimbScalarBuff
    | BattleRuntimeFlyScalarBuff
    | BattleRuntimeBarkskinScalarBuff
    | BattleRuntimeHeroismScalarBuff
    | BattleRuntimeAidScalarBuff
  type BattleRuntimeScalarBuffEffect =
    | BattleRuntimeLongstriderSpeedIncreaseEffect
    | BattleRuntimeShieldOfFaithArmorClassBonusEffect
    | BattleRuntimeSpiderClimbClimbSpeedGrantEffect
    | BattleRuntimeFlySpeedHoverGrantEffect
    | BattleRuntimeBarkskinArmorClassFloorEffect
    | BattleRuntimeHeroismFrightenedImmunityEffect
    | BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect({ amount: int })
    | BattleRuntimeAidHitPointMaximumIncreaseEffect({ amount: int })
  type BattleRuntimeScalarBuffActiveEffectProjection =
    | BattleRuntimeScalarBuffPersistentEffectProjection({ effect: BattleRuntimeScalarBuffEffect })
    | BattleRuntimeScalarBuffImmediateTemporaryHitPointProjection({ amount: int })
  type BattleRuntimeScalarBuffProjectionDomain =
    | BattleRuntimeScalarBuffArmorClassProjectionDomain
    | BattleRuntimeScalarBuffSpeedProjectionDomain
    | BattleRuntimeScalarBuffSpecialSpeedProjectionDomain
    | BattleRuntimeScalarBuffHitPointMaximumProjectionDomain
    | BattleRuntimeScalarBuffTemporaryHitPointProjectionDomain
    | BattleRuntimeScalarBuffConditionImmunityProjectionDomain
  pure def battleRuntimeScalarBuffProfile(
    profile: BattleRuntimeScalarBuffProfile
  ): ScalarBuffSpellProfile =
    match profile {
      | BattleRuntimeFalseLifeScalarBuff => FalseLifeScalarBuffProfile
      | BattleRuntimeLongstriderScalarBuff => LongstriderScalarBuffProfile
      | BattleRuntimeShieldOfFaithScalarBuff => ShieldOfFaithScalarBuffProfile
      | BattleRuntimeSpiderClimbScalarBuff => SpiderClimbScalarBuffProfile
      | BattleRuntimeFlyScalarBuff => FlyScalarBuffProfile
      | BattleRuntimeBarkskinScalarBuff => BarkskinScalarBuffProfile
      | BattleRuntimeHeroismScalarBuff => HeroismScalarBuffProfile
      | BattleRuntimeAidScalarBuff => AidScalarBuffProfile
    }
  pure def battleRuntimeScalarBuffUsesBonusAction(profile: BattleRuntimeScalarBuffProfile): bool =
    scalarBuffSpellAction(battleRuntimeScalarBuffProfile(profile)) == BonusActionSpellInvocation
  pure def battleRuntimeScalarBuffMaximumTargets(profile: BattleRuntimeScalarBuffProfile, slotLevel: int): int =
    scalarBuffMaximumTargets(battleRuntimeScalarBuffProfile(profile), slotLevel)
  pure def battleRuntimeScalarBuffTemporaryHitPoints(
    profile: BattleRuntimeScalarBuffProfile,
    slotLevel: int,
    rolledDice: int
  ): int =
    scalarBuffTemporaryHitPoints(battleRuntimeScalarBuffProfile(profile), slotLevel, rolledDice)
  pure def battleRuntimeScalarBuffEffect(effect: ScalarBuffEffect): BattleRuntimeScalarBuffEffect =
    match effect {
      | LongstriderSpeedIncreaseEffect => BattleRuntimeLongstriderSpeedIncreaseEffect
      | ShieldOfFaithArmorClassBonusEffect => BattleRuntimeShieldOfFaithArmorClassBonusEffect
      | SpiderClimbClimbSpeedGrantEffect => BattleRuntimeSpiderClimbClimbSpeedGrantEffect
      | FlySpeedHoverGrantEffect => BattleRuntimeFlySpeedHoverGrantEffect
      | BarkskinArmorClassFloorEffect => BattleRuntimeBarkskinArmorClassFloorEffect
      | HeroismFrightenedImmunityEffect => BattleRuntimeHeroismFrightenedImmunityEffect
      | HeroismTurnStartTemporaryHitPointsEffect(data) => BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect(data)
      | AidHitPointMaximumIncreaseEffect(data) => BattleRuntimeAidHitPointMaximumIncreaseEffect(data)
    }
  pure def battleRuntimeScalarBuffEffects(
    profile: BattleRuntimeScalarBuffProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
  ): Set[BattleRuntimeScalarBuffEffect] =
    scalarBuffEffects(battleRuntimeScalarBuffProfile(profile), spellcastingAbilityModifier, slotLevel)
      .map(battleRuntimeScalarBuffEffect)
  pure def battleRuntimeScalarBuffActiveEffectProjection(
    projection: ScalarBuffActiveEffectProjection
  ): BattleRuntimeScalarBuffActiveEffectProjection =
    match projection {
      | ScalarBuffPersistentEffectProjection(data) =>
        BattleRuntimeScalarBuffPersistentEffectProjection({
          effect: battleRuntimeScalarBuffEffect(data.effect),
        })
      | ScalarBuffImmediateTemporaryHitPointProjection(data) =>
        BattleRuntimeScalarBuffImmediateTemporaryHitPointProjection(data)
    }
  pure def battleRuntimeScalarBuffActiveEffectProjections(
    profile: BattleRuntimeScalarBuffProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
    rolledDice: int,
  ): Set[BattleRuntimeScalarBuffActiveEffectProjection] =
    scalarBuffActiveEffectProjections(
      battleRuntimeScalarBuffProfile(profile),
      spellcastingAbilityModifier,
      slotLevel,
      rolledDice,
    )
      .map(battleRuntimeScalarBuffActiveEffectProjection)
  pure def battleRuntimeScalarBuffProjectionDomain(
    domain: ScalarBuffProjectionDomain
  ): BattleRuntimeScalarBuffProjectionDomain =
    match domain {
      | ScalarBuffArmorClassProjectionDomain => BattleRuntimeScalarBuffArmorClassProjectionDomain
      | ScalarBuffSpeedProjectionDomain => BattleRuntimeScalarBuffSpeedProjectionDomain
      | ScalarBuffSpecialSpeedProjectionDomain => BattleRuntimeScalarBuffSpecialSpeedProjectionDomain
      | ScalarBuffHitPointMaximumProjectionDomain => BattleRuntimeScalarBuffHitPointMaximumProjectionDomain
      | ScalarBuffTemporaryHitPointProjectionDomain => BattleRuntimeScalarBuffTemporaryHitPointProjectionDomain
      | ScalarBuffConditionImmunityProjectionDomain => BattleRuntimeScalarBuffConditionImmunityProjectionDomain
    }
  pure def battleRuntimeScalarBuffRequiresConcentration(profile: BattleRuntimeScalarBuffProfile): bool =
    scalarBuffRequiresConcentration(battleRuntimeScalarBuffProfile(profile))
}
