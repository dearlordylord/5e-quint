// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
module battleRuntimeAttackFacts {
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def attackHits(total: int, naturalD20: int, armorClass: int, criticalThreshold: int): bool =
    resolveAttackRoll({
      naturalD20: naturalD20,
      total: total,
      armorClass: armorClass,
      criticalThreshold: criticalThreshold,
    }).hits

  pure def attackIsCritical(naturalD20: int, criticalThreshold: int): bool =
    naturalD20MeetsCriticalThreshold(naturalD20, criticalThreshold)

  pure def fighterCriticalThreshold(state: BattleState): int =
    battleRuntimeChampionCriticalThreshold(state.fighter.criticalRange == ImprovedCriticalRange19)

  pure def attackCriticalThreshold(state: BattleState, attacker: Actor): int =
    if (attacker == Fighter) fighterCriticalThreshold(state) else 20

  pure def withFighterImprovedCriticalRange19(state: BattleState): BattleState =
    { ...state, fighter: { ...state.fighter, criticalRange: ImprovedCriticalRange19 } }

  pure def withFighterSneakAttack(state: BattleState): BattleState =
    { ...state, fighter: { ...state.fighter, sneakAttackSupported: true } }

  pure def withFighterExtraAttack(state: BattleState): BattleState =
    withFighterExtraAttackAdditionalAttacks(state, OneAdditionalAttack)

  pure def withFighterExtraAttackAdditionalAttacks(
    state: BattleState,
    additionalAttacks: AttackActionAdditionalAttacks,
  ): BattleState =
    { ...state, fighter: { ...state.fighter, extraAttackAdditionalAttacks: additionalAttacks } }

  pure def withGoblinHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, goblin: { ...state.goblin, hp: hp, tempHp: tempHp } }

  pure def withFighterHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, fighter: { ...state.fighter, hp: hp, tempHp: tempHp } }

  pure def fighterWeaponAttackDamageRoll(weaponDamageRoll: int): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineFavor(
    weaponDamageRoll: int,
    divineFavorDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: divineFavorDamageRoll, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineSmite(
    weaponDamageRoll: int,
    divineSmiteDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: divineSmiteDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithHuntersMark(
    weaponDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def fighterSpellAttackDamageRoll(spellDamageRoll: int): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterSpellAttackDamageRollWithHuntersMark(
    spellDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def cleaveSecondHitDamage(weaponDamageRoll: int, attackAbilityModifier: int): int =
    weaponDamageRoll + (if (attackAbilityModifier < 0) attackAbilityModifier else 0)

  pure def weaponMasteryToppleSaveDc(attackAbilityModifier: int, proficiencyBonus: int): int =
    8 + attackAbilityModifier + proficiencyBonus

  pure def trueStrikeBonusDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 3
    else if (characterLevel >= 11) 2
    else if (characterLevel >= 5) 1
    else 0

  pure def trueStrikeDamageTypeChoiceIsLegal(selectedDamageType: DamageType, weaponDamageType: DamageType): bool =
    selectedDamageType == Radiant or selectedDamageType == weaponDamageType

  pure def pactBladeDamageTypeChoiceIsLegal(selectedDamageType: DamageType, weaponDamageType: DamageType): bool =
    selectedDamageType == weaponDamageType or selectedDamageType == Necrotic or selectedDamageType == Psychic or selectedDamageType == Radiant

  pure def pactBladeAbilityModifierChoiceIsLegal(selectedAbilityModifier: int, baseAbilityModifier: int, charismaModifier: int): bool =
    selectedAbilityModifier == baseAbilityModifier or selectedAbilityModifier == charismaModifier

  pure def pactBladeAttackModifier(selectedAbilityModifier: int, proficiencyBonus: int): int =
    selectedAbilityModifier + proficiencyBonus

  pure def trueStrikeWeaponAttackModifier(spellcastingAbilityModifier: int, proficiencyBonus: int): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def trueStrikeBonusDamage(bonusDamageRoll: int, characterLevel: int): int =
    if (trueStrikeBonusDamageDice(characterLevel) > 0) bonusDamageRoll else 0

  pure def trueStrikeDamageAfterAdjustments(
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
  ): int =
    damageAfterAdjustments(
      weaponDamageRoll + spellcastingAbilityModifier,
      selectedDamageType,
      Set(),
      Set(),
      Set(),
    ) +
    damageAfterAdjustments(
      trueStrikeBonusDamage(bonusDamageRoll, characterLevel),
      Radiant,
      Set(),
      Set(),
      Set(),
    )

  pure def fighterSneakAttackEligible(
    state: BattleState,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
  ): bool =
    state.fighter.sneakAttackSupported and
    not(state.fighter.sneakAttackUsedThisTurn) and
    (rollHasAdvantage or (allyAdjacent and not(rollHasDisadvantage)))

  pure def uncannyDodgeDamage(damage: int): int =
    battleRuntimeUncannyDodgeDamage(damage)

  pure def deflectAttacksDamage(damage: int, deflectRoll: int, dexMod: int, monkLevel: int): int =
    battleRuntimeDeflectAttacksDamage(damage, deflectRoll, dexMod, monkLevel)

  pure def deflectAttacksRedirectTargetEligible(
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool,
  ): bool =
    battleRuntimeDeflectAttacksRedirectTargetEligible(
      targetSeen,
      attackWasMelee,
      targetWithinFiveFeet,
      targetWithinSixtyFeet,
      targetBehindTotalCover,
    )

  pure def deflectAttacksRedirectDamage(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexMod: int,
  ): int =
    battleRuntimeDeflectAttacksRedirectDamage(
      reducedDamage,
      focusUsesRemaining,
      targetEligible,
      savingThrowSucceeded,
      firstMartialArtsRoll,
      secondMartialArtsRoll,
      dexMod,
    )

  pure def deflectAttacksRedirectFocusRemaining(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
  ): int =
    battleRuntimeDeflectAttacksRedirectFocusRemaining(reducedDamage, focusUsesRemaining, targetEligible)
}
