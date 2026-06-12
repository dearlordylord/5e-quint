// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

module battleRuntimeWeaponHostedAttackAndRidersMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WeaponHostedScenario =
    | TrueStrikeRadiantHit
    | ShillelaghHeldWeaponOverride
    | DivineFavorWeaponDamageRider
    | MagicWeaponEnhancement
    | Done

  type WeaponHostedPhase =
    | Fresh
    | SpellChoiceNeeded
    | AttackRollNeeded
    | AttackDamageNeeded
    | ActiveEffectApplied
    | WeaponTargetNeeded
    | AfterWeaponDamage
    | Cleaned

  type WeaponHostedHole =
    | DamageTypeChoice
    | TargetChoice
    | AttackRoll
    | AttackDamageRoll
    | MagicWeaponTargetItem

  type WeaponHostedWitnessState = {
    qScenario: WeaponHostedScenario,
    qPhase: WeaponHostedPhase,
    qTargetHp: int,
    qBonusActionAvailable: bool,
    qSlotExpended: bool,
    qActiveEffectPresent: bool,
    qAttackBonus: int,
    qDamageTypeChoiceApplied: bool,
    qDamageRiderPresent: bool,
    qWeaponEnhancementBonus: int,
    protocol: WitnessProtocol[WeaponHostedHole],
  }

  var qState: WeaponHostedWitnessState

  pure val noHoles: Set[WeaponHostedHole] = Set()
  pure val targetInitialHp: int = 20

  pure def damageAfter(hp: int, damage: int): int =
    if (hp - damage < 0) 0 else hp - damage

  pure def protocolFor(
    holes: Set[WeaponHostedHole],
    result: WitnessResult,
  ): WitnessProtocol[WeaponHostedHole] = {
    holes: holes,
    result: result,
  }

  action recordProjection(
    scenario: WeaponHostedScenario,
    phase: WeaponHostedPhase,
    targetHp: int,
    bonusActionAvailable: bool,
    slotExpended: bool,
    activeEffectPresent: bool,
    attackBonus: int,
    damageTypeChoiceApplied: bool,
    damageRiderPresent: bool,
    weaponEnhancementBonus: int,
    holes: Set[WeaponHostedHole],
    result: WitnessResult,
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qPhase: phase,
      qTargetHp: targetHp,
      qBonusActionAvailable: bonusActionAvailable,
      qSlotExpended: slotExpended,
      qActiveEffectPresent: activeEffectPresent,
      qAttackBonus: attackBonus,
      qDamageTypeChoiceApplied: damageTypeChoiceApplied,
      qDamageRiderPresent: damageRiderPresent,
      qWeaponEnhancementBonus: weaponEnhancementBonus,
      protocol: protocolFor(holes, result),
    },
  }

  action recordFreshScenario(scenario: WeaponHostedScenario): bool =
    recordProjection(
      scenario,
      Fresh,
      targetInitialHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    )

  action init = recordProjection(
    TrueStrikeRadiantHit,
    Fresh,
    targetInitialHp,
    true,
    false,
    false,
    0,
    false,
    false,
    0,
    noHoles,
    WInit,
  )

  action doDiscoverTrueStrike = all {
    qState.qScenario == TrueStrikeRadiantHit,
    qState.qPhase == Fresh,
    qState.protocol.holes == noHoles,
    recordProjection(
      TrueStrikeRadiantHit,
      SpellChoiceNeeded,
      qState.qTargetHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      Set(DamageTypeChoice, TargetChoice),
      WNeedsHoles,
    ),
  }

  action doFillTrueStrikeRadiantTarget = all {
    qState.qScenario == TrueStrikeRadiantHit,
    qState.qPhase == SpellChoiceNeeded,
    qState.protocol.holes == Set(DamageTypeChoice, TargetChoice),
    recordProjection(
      TrueStrikeRadiantHit,
      AttackRollNeeded,
      qState.qTargetHp,
      true,
      false,
      false,
      6,
      true,
      false,
      0,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillTrueStrikeHit = all {
    qState.qScenario == TrueStrikeRadiantHit,
    qState.qPhase == AttackRollNeeded,
    qState.protocol.holes == Set(AttackRoll),
    recordProjection(
      TrueStrikeRadiantHit,
      AttackDamageNeeded,
      qState.qTargetHp,
      true,
      false,
      false,
      6,
      true,
      true,
      0,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillTrueStrikeDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    nondet riderDiePip = Set(1, 5).oneOf()
    all {
      qState.qScenario == TrueStrikeRadiantHit,
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        TrueStrikeRadiantHit,
        Cleaned,
        damageAfter(qState.qTargetHp, weaponDiePip + 3 + riderDiePip),
        true,
        false,
        false,
        6,
        true,
        true,
        0,
        noHoles,
        WResolved,
      ),
    }
  }

  action doStartShillelagh = all {
    qState.qScenario == TrueStrikeRadiantHit,
    qState.qPhase == Cleaned,
    qState.protocol.holes == noHoles,
    recordFreshScenario(ShillelaghHeldWeaponOverride),
  }

  action doCastShillelagh = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == Fresh,
    qState.protocol.holes == noHoles,
    recordProjection(
      ShillelaghHeldWeaponOverride,
      ActiveEffectApplied,
      qState.qTargetHp,
      false,
      false,
      true,
      5,
      true,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action doDiscoverShillelaghAttack = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == ActiveEffectApplied,
    qState.qActiveEffectPresent,
    qState.protocol.holes == noHoles,
    recordProjection(
      ShillelaghHeldWeaponOverride,
      WeaponTargetNeeded,
      qState.qTargetHp,
      false,
      false,
      true,
      5,
      true,
      false,
      0,
      Set(TargetChoice),
      WNeedsHoles,
    ),
  }

  action doFillShillelaghTarget = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == WeaponTargetNeeded,
    qState.protocol.holes == Set(TargetChoice),
    recordProjection(
      ShillelaghHeldWeaponOverride,
      AttackRollNeeded,
      qState.qTargetHp,
      false,
      false,
      true,
      5,
      true,
      false,
      0,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillShillelaghHit = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == AttackRollNeeded,
    qState.protocol.holes == Set(AttackRoll),
    recordProjection(
      ShillelaghHeldWeaponOverride,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      false,
      true,
      5,
      true,
      false,
      0,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillShillelaghDamage = {
    nondet damageDiePip = Set(1, 4).oneOf()
    all {
      qState.qScenario == ShillelaghHeldWeaponOverride,
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        ShillelaghHeldWeaponOverride,
        AfterWeaponDamage,
        damageAfter(qState.qTargetHp, (damageDiePip * 2) + 3),
        false,
        false,
        true,
        5,
        true,
        false,
        0,
        noHoles,
        WResolved,
      ),
    }
  }

  action doCleanShillelaghLetGo = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == AfterWeaponDamage,
    qState.qActiveEffectPresent,
    qState.protocol.holes == noHoles,
    recordProjection(
      ShillelaghHeldWeaponOverride,
      Cleaned,
      qState.qTargetHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action doStartDivineFavor = all {
    qState.qScenario == ShillelaghHeldWeaponOverride,
    qState.qPhase == Cleaned,
    qState.protocol.holes == noHoles,
    recordFreshScenario(DivineFavorWeaponDamageRider),
  }

  action doCastDivineFavor = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == Fresh,
    qState.protocol.holes == noHoles,
    recordProjection(
      DivineFavorWeaponDamageRider,
      ActiveEffectApplied,
      qState.qTargetHp,
      false,
      true,
      true,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action doDiscoverDivineFavorAttack = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == ActiveEffectApplied,
    qState.qActiveEffectPresent,
    qState.protocol.holes == noHoles,
    recordProjection(
      DivineFavorWeaponDamageRider,
      WeaponTargetNeeded,
      qState.qTargetHp,
      false,
      true,
      true,
      0,
      false,
      false,
      0,
      Set(TargetChoice),
      WNeedsHoles,
    ),
  }

  action doFillDivineFavorTarget = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == WeaponTargetNeeded,
    qState.protocol.holes == Set(TargetChoice),
    recordProjection(
      DivineFavorWeaponDamageRider,
      AttackRollNeeded,
      qState.qTargetHp,
      false,
      true,
      true,
      0,
      false,
      false,
      0,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillDivineFavorHit = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == AttackRollNeeded,
    qState.protocol.holes == Set(AttackRoll),
    recordProjection(
      DivineFavorWeaponDamageRider,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      true,
      0,
      false,
      true,
      0,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillDivineFavorDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    nondet riderDiePip = Set(1, 3).oneOf()
    all {
      qState.qScenario == DivineFavorWeaponDamageRider,
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        DivineFavorWeaponDamageRider,
        AfterWeaponDamage,
        damageAfter(qState.qTargetHp, weaponDiePip + riderDiePip),
        false,
        true,
        true,
        0,
        false,
        false,
        0,
        noHoles,
        WResolved,
      ),
    }
  }

  action doCleanDivineFavorDuration = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == AfterWeaponDamage,
    qState.qActiveEffectPresent,
    qState.protocol.holes == noHoles,
    recordProjection(
      DivineFavorWeaponDamageRider,
      Cleaned,
      qState.qTargetHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action doStartMagicWeapon = all {
    qState.qScenario == DivineFavorWeaponDamageRider,
    qState.qPhase == Cleaned,
    qState.protocol.holes == noHoles,
    recordFreshScenario(MagicWeaponEnhancement),
  }

  action doDiscoverMagicWeapon = all {
    qState.qScenario == MagicWeaponEnhancement,
    qState.qPhase == Fresh,
    qState.protocol.holes == noHoles,
    recordProjection(
      MagicWeaponEnhancement,
      WeaponTargetNeeded,
      qState.qTargetHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      Set(MagicWeaponTargetItem),
      WNeedsHoles,
    ),
  }

  action doFillMagicWeaponTarget = all {
    qState.qScenario == MagicWeaponEnhancement,
    qState.qPhase == WeaponTargetNeeded,
    qState.protocol.holes == Set(MagicWeaponTargetItem),
    recordProjection(
      MagicWeaponEnhancement,
      ActiveEffectApplied,
      qState.qTargetHp,
      false,
      true,
      true,
      0,
      false,
      false,
      1,
      noHoles,
      WResolved,
    ),
  }

  action doCleanMagicWeaponDuration = all {
    qState.qScenario == MagicWeaponEnhancement,
    qState.qPhase == ActiveEffectApplied,
    qState.qActiveEffectPresent,
    qState.protocol.holes == noHoles,
    recordProjection(
      MagicWeaponEnhancement,
      Cleaned,
      qState.qTargetHp,
      true,
      false,
      false,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action doFinish = all {
    qState.qScenario == MagicWeaponEnhancement,
    qState.qPhase == Cleaned,
    qState.protocol.holes == noHoles,
    recordProjection(
      Done,
      Cleaned,
      qState.qTargetHp,
      qState.qBonusActionAvailable,
      qState.qSlotExpended,
      false,
      0,
      false,
      false,
      0,
      noHoles,
      WResolved,
    ),
  }

  action step = any {
    doDiscoverTrueStrike,
    doFillTrueStrikeRadiantTarget,
    doFillTrueStrikeHit,
    doFillTrueStrikeDamage,
    doStartShillelagh,
    doCastShillelagh,
    doDiscoverShillelaghAttack,
    doFillShillelaghTarget,
    doFillShillelaghHit,
    doFillShillelaghDamage,
    doCleanShillelaghLetGo,
    doStartDivineFavor,
    doCastDivineFavor,
    doDiscoverDivineFavorAttack,
    doFillDivineFavorTarget,
    doFillDivineFavorHit,
    doFillDivineFavorDamage,
    doCleanDivineFavorDuration,
    doStartMagicWeapon,
    doDiscoverMagicWeapon,
    doFillMagicWeaponTarget,
    doCleanMagicWeaponDuration,
    doFinish,
  }
}
