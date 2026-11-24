// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS

// RAW trace for the main weapon steps:
// - .references/srd-5.2.1/equipment.md#Versatile: a Versatile weapon deals its
//   parenthesized damage "when used with two hands to make a melee attack".
// - .references/srd-5.2.1/equipment.md#Two-Handed: a Two-Handed weapon
//   "requires two hands when you attack with it".
// - ASSUMPTIONS.md A58: any weapon may be held with both hands, and that grip
//   occupies both.

module characterBattleInitProjectionMbt {
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"

  type BattleInitProjectionOutcome =
    | BattleInitProjectionInit
    | BattleInitProjectionSheetHitPointsArmorClassConditionsAndProfiles
    | BattleInitProjectionSheetSpellcastingAndMetamagic
    | BattleInitProjectionRuntimeDetachedSpellChoice
    | BattleInitProjectionPurePactMagicSlotProjection
    | BattleInitProjectionMixedSpellAndPactSlotInitRejected
    | BattleInitProjectionBuildMaximumAboveBuildMaximumRejected
    | BattleInitProjectionStableRecoveryProgressDuringInitRejected
    | BattleInitProjectionVersatileWeaponOneHanded
    | BattleInitProjectionVersatileWeaponTwoHanded
    | BattleInitProjectionTwoHandedWeapon
    | BattleInitProjectionNonVersatileWeaponTwoHanded

  type BattleInitProjectionFacts = {
    characterIdentity: str,
    currentHp: int,
    maxHp: int,
    temporaryHitPoints: int,
    armorClass: int,
    poisoned: bool,
    spellLevel1Count: int,
    spellLevel1Expended: int,
    spellLevel2Count: int,
    spellLevel2Expended: int,
    spellLevel3Count: int,
    spellLevel3Expended: int,
    passiveArmorClassProfileCount: int,
    metamagicKnownOptions: int,
    selectedCantripCount: int,
    projectedCantripCount: int,
    selectedLeveledSpellCount: int,
    projectedLeveledSpellCount: int,
    mainWeaponGrip: str,
    leftHandUse: str,
    rightHandUse: str,
    mainWeaponDamageDieSize: int,
  }

  type BattleInitProjectionState = {
    outcome: BattleInitProjectionOutcome,
    accepted: bool,
    message: str,
    facts: BattleInitProjectionFacts,
    replayIndex: int,
  }

  var qState: BattleInitProjectionState

  pure def emptyProjectionFacts: BattleInitProjectionFacts = {
    characterIdentity: "none",
    currentHp: 0,
    maxHp: 0,
    temporaryHitPoints: 0,
    armorClass: 0,
    poisoned: false,
    spellLevel1Count: 0,
    spellLevel1Expended: 0,
    spellLevel2Count: 0,
    spellLevel2Expended: 0,
    spellLevel3Count: 0,
    spellLevel3Expended: 0,
    passiveArmorClassProfileCount: 0,
    metamagicKnownOptions: 0,
    selectedCantripCount: 0,
    projectedCantripCount: 0,
    selectedLeveledSpellCount: 0,
    projectedLeveledSpellCount: 0,
    mainWeaponGrip: "none",
    leftHandUse: "free",
    rightHandUse: "free",
    mainWeaponDamageDieSize: 0,
  }

  type MainWeaponFacts = {
    damageDieSize: int,
    versatile: VersatileDamage,
  }

  pure def weaponGripName(grip: WeaponGrip): str =
    match grip {
      | OneHandedGrip => "one_handed"
      | TwoHandedGrip => "two_handed"
    }

  // The main weapon holds the right hand, and the left too when both hands
  // hold it. Its damage die is the one a melee attack with it deals.
  pure def mainWeaponProjectionFacts(
    characterIdentity: str,
    weapon: MainWeaponFacts,
    grip: WeaponGrip,
  ): BattleInitProjectionFacts =
    emptyProjectionFacts
      .with("characterIdentity", characterIdentity)
      .with("mainWeaponGrip", weaponGripName(grip))
      .with("leftHandUse", if (weaponGripHandsHeld(grip) == 2) "mainWeapon" else "free")
      .with("rightHandUse", "mainWeapon")
      .with("mainWeaponDamageDieSize", weaponAttackDamageDieSize({
        damageDieSize: weapon.damageDieSize,
        versatile: weapon.versatile,
        grip: grip,
        meleeAttack: true,
      }))

  pure val versatileD8D10Weapon: MainWeaponFacts = {
    damageDieSize: 8,
    versatile: VersatileDamageDie(10),
  }
  pure val twoHandedD12Weapon: MainWeaponFacts = {
    damageDieSize: 12,
    versatile: NotVersatile,
  }
  pure val nonVersatileD4Weapon: MainWeaponFacts = {
    damageDieSize: 4,
    versatile: NotVersatile,
  }

  action recordProjection(
    outcome: BattleInitProjectionOutcome,
    accepted: bool,
    message: str,
    facts: BattleInitProjectionFacts,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      message: message,
      facts: facts,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      BattleInitProjectionInit,
      false,
      "none",
      emptyProjectionFacts,
      0,
    )

  action doProjectSheetHitPointsArmorClassConditionsAndProfiles = all {
    qState.replayIndex == 0,
    recordProjection(
      BattleInitProjectionSheetHitPointsArmorClassConditionsAndProfiles,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-fighter")
        .with("currentHp", 6)
        .with("maxHp", 9)
        .with("temporaryHitPoints", 4)
        .with("armorClass", 17)
        .with("poisoned", true)
        .with("passiveArmorClassProfileCount", 1),
      1,
    ),
  }

  action doProjectSheetSpellcastingAndMetamagic = all {
    qState.replayIndex == 1,
    recordProjection(
      BattleInitProjectionSheetSpellcastingAndMetamagic,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-sorcerer")
        .with("currentHp", 24)
        .with("maxHp", 27)
        .with("armorClass", 12)
        .with("spellLevel1Count", 4)
        .with("spellLevel1Expended", 1)
        .with("spellLevel2Count", 3)
        .with("spellLevel3Count", 3)
        .with("metamagicKnownOptions", 2),
      2,
    ),
  }

  action doRejectBuildMaximumAboveBuildMaximum = all {
    qState.replayIndex == 5,
    recordProjection(
      BattleInitProjectionBuildMaximumAboveBuildMaximumRejected,
      false,
      "Character battle initialization max HP exceeds build-derived max HP.",
      emptyProjectionFacts,
      6,
    ),
  }

  action doProjectPurePactMagicSlot = all {
    qState.replayIndex == 3,
    recordProjection(
      BattleInitProjectionPurePactMagicSlotProjection,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-warlock")
        .with("currentHp", 8)
        .with("maxHp", 9)
        .with("armorClass", 12)
        .with("spellLevel1Count", 1),
      4,
    ),
  }

  action doRejectMixedSpellAndPactSlotInit = all {
    qState.replayIndex == 4,
    recordProjection(
      BattleInitProjectionMixedSpellAndPactSlotInitRejected,
      false,
      "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.",
      emptyProjectionFacts,
      5,
    ),
  }

  action doProjectRuntimeDetachedSpellChoice = all {
    qState.replayIndex == 2,
    recordProjection(
      BattleInitProjectionRuntimeDetachedSpellChoice,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-runtime-detached-spell")
        .with("currentHp", 7)
        .with("maxHp", 7)
        .with("armorClass", 12)
        .with("selectedCantripCount", 2)
        .with("projectedCantripCount", 2)
        .with("selectedLeveledSpellCount", 1)
        .with("projectedLeveledSpellCount", 0),
      3,
    ),
  }

  action doRejectStableRecoveryProgressDuringInit = all {
    qState.replayIndex == 6,
    recordProjection(
      BattleInitProjectionStableRecoveryProgressDuringInitRejected,
      false,
      "Battle handoff cannot preserve in-progress Stable recovery timers.",
      emptyProjectionFacts,
      7,
    ),
  }

  action doProjectVersatileWeaponOneHanded = all {
    qState.replayIndex == 7,
    recordProjection(
      BattleInitProjectionVersatileWeaponOneHanded,
      true,
      "none",
      mainWeaponProjectionFacts("character:battle-init-versatile-weapon-one-handed", versatileD8D10Weapon, OneHandedGrip),
      8,
    ),
  }

  action doProjectVersatileWeaponTwoHanded = all {
    qState.replayIndex == 8,
    recordProjection(
      BattleInitProjectionVersatileWeaponTwoHanded,
      true,
      "none",
      mainWeaponProjectionFacts("character:battle-init-versatile-weapon-two-handed", versatileD8D10Weapon, TwoHandedGrip),
      9,
    ),
  }

  action doProjectTwoHandedWeapon = all {
    qState.replayIndex == 9,
    recordProjection(
      BattleInitProjectionTwoHandedWeapon,
      true,
      "none",
      mainWeaponProjectionFacts("character:battle-init-two-handed-weapon", twoHandedD12Weapon, TwoHandedGrip),
      10,
    ),
  }

  action doProjectNonVersatileWeaponTwoHanded = all {
    qState.replayIndex == 10,
    recordProjection(
      BattleInitProjectionNonVersatileWeaponTwoHanded,
      true,
      "none",
      mainWeaponProjectionFacts("character:battle-init-non-versatile-weapon-two-handed", nonVersatileD4Weapon, TwoHandedGrip),
      11,
    ),
  }

  action step = any {
    doProjectSheetHitPointsArmorClassConditionsAndProfiles,
    doProjectSheetSpellcastingAndMetamagic,
    doProjectRuntimeDetachedSpellChoice,
    doProjectPurePactMagicSlot,
    doRejectMixedSpellAndPactSlotInit,
    doRejectBuildMaximumAboveBuildMaximum,
    doRejectStableRecoveryProgressDuringInit,
    doProjectVersatileWeaponOneHanded,
    doProjectVersatileWeaponTwoHanded,
    doProjectTwoHandedWeapon,
    doProjectNonVersatileWeaponTwoHanded,
  }
}
