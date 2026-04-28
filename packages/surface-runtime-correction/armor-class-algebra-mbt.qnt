// -*- mode: Bluespec; -*-

module armorClassAlgebraMbt {
  var qBaseKind: int // 0 stat block, 1 dex base, 2 dex+con base, 3 medium armor
  var qBaseAc: int
  var qDex: int
  var qCon: int
  var qShieldBonus: int
  var qShieldTrained: bool
  var qWieldingShield: bool
  var qUnarmoredBonus: int
  var qFloor: int
  var qCurrentAc: int

  pure def qMin(a: int, b: int): int =
    if (a <= b) a else b

  pure def qMax(a: int, b: int): int =
    if (a >= b) a else b

  pure def qBaseValue(baseKind: int, baseAc: int, dex: int, con: int): int =
    if (baseKind == 0) baseAc
    else if (baseKind == 1) baseAc + dex
    else if (baseKind == 2) baseAc + dex + con
    else baseAc + qMin(2, dex)

  pure def qBonusValue(
    baseKind: int,
    shieldBonus: int,
    shieldTrained: bool,
    wieldingShield: bool,
    unarmoredBonus: int
  ): int =
    (if (shieldTrained and wieldingShield) shieldBonus else 0)
      + (if (baseKind != 3 and not(wieldingShield)) unarmoredBonus else 0)

  pure def qArmorClass(
    baseKind: int,
    baseAc: int,
    dex: int,
    con: int,
    shieldBonus: int,
    shieldTrained: bool,
    wieldingShield: bool,
    unarmoredBonus: int,
    floor: int
  ): int =
    qMax(
      floor,
      qBaseValue(baseKind, baseAc, dex, con)
        + qBonusValue(baseKind, shieldBonus, shieldTrained, wieldingShield, unarmoredBonus)
    )

  action setState(
    baseKind: int,
    baseAc: int,
    dex: int,
    con: int,
    shieldBonus: int,
    shieldTrained: bool,
    wieldingShield: bool,
    unarmoredBonus: int,
    floor: int,
  ): bool = all {
    qBaseKind' = baseKind,
    qBaseAc' = baseAc,
    qDex' = dex,
    qCon' = con,
    qShieldBonus' = shieldBonus,
    qShieldTrained' = shieldTrained,
    qWieldingShield' = wieldingShield,
    qUnarmoredBonus' = unarmoredBonus,
    qFloor' = floor,
    qCurrentAc' = qArmorClass(baseKind, baseAc, dex, con, shieldBonus, shieldTrained, wieldingShield, unarmoredBonus, floor),
  }

  action init = setState(0, 15, 0, 0, 0, false, false, 0, 1)
  action doStatBlock = setState(0, 15, 0, 0, 0, false, false, 0, 1)
  action doUnarmoredDex2 = setState(1, 10, 2, 0, 0, false, false, 0, 1)
  action doBarbarianShield = setState(2, 10, 2, 3, 2, true, true, 0, 1)
  action doShieldNotWielded = setState(1, 10, 0, 0, 2, true, false, 0, 1)
  action doMediumDexCapped = setState(3, 14, 4, 0, 0, false, false, 0, 1)
  action doBracersUnarmored = setState(1, 10, 0, 0, 0, false, false, 2, 1)
  action doBracersWithShield = setState(1, 10, 0, 0, 0, false, true, 2, 1)
  action doFloorAfterBase = setState(1, 10, -1, 0, 0, false, false, 0, 17)

  action step = any {
    doStatBlock,
    doUnarmoredDex2,
    doBarbarianShield,
    doShieldNotWielded,
    doMediumDexCapped,
    doBracersUnarmored,
    doBracersWithShield,
    doFloorAfterBase,
  }

  val invariant =
    qBaseKind >= 0 and qBaseKind <= 3 and qCurrentAc >= 1
}
