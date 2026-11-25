// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.TARGET_COVER
// KERNEL-COVERAGE: qnt-owner BATTLE.SAVE.DEXTERITY_COVER

// RAW trace:
// - .references/srd-5.2.1/rules-glossary.md#Cover: Half Cover gives +2 to AC
//   and Dexterity saving throws, Three-Quarters Cover gives +5 to both, and
//   Total Cover means the target can't be targeted directly.
// - .references/srd-5.2.1/playing-the-game.md#Cover: only the most protective
//   degree applies. The table adjudicates that degree from the geometry and
//   supplies it; this core owns what the degree does to an attack and to a
//   saving throw.
// - .references/srd-5.2.1/spells.md "Sacred Flame": an effect can deny a
//   target the benefit of Half Cover and Three-Quarters Cover for its save.
// - .references/srd-5.2.1/spells.md "A Clear Path to the Target": a spell
//   can't target something behind Total Cover.
module coverDefenseCore {
  type CoverDegree =
    | NoCover
    | HalfCover
    | ThreeQuartersCover
    | TotalCover

  pure def coverAllowsDirectTargeting(cover: CoverDegree): bool =
    match cover {
      | TotalCover => false
      | _ => true
    }

  pure def coverArmorClassBonus(cover: CoverDegree): int =
    match cover {
      | HalfCover => 2
      | ThreeQuartersCover => 5
      | _ => 0
    }

  pure def armorClassBehindCover(armorClass: int, cover: CoverDegree): int =
    armorClass + coverArmorClassBonus(cover)

  type SavingThrowAbility =
    | StrengthSave
    | DexteritySave
    | ConstitutionSave
    | IntelligenceSave
    | WisdomSave
    | CharismaSave

  pure def savingThrowBenefitsFromCover(ability: SavingThrowAbility): bool =
    match ability {
      | DexteritySave => true
      | _ => false
    }

  // The bonus a target adds to a saving throw for its degree of cover. An
  // effect that denies the benefit of cover for its save gives no bonus.
  pure def coverSavingThrowBonus(
    ability: SavingThrowAbility,
    coverBenefitDenied: bool,
    cover: CoverDegree,
  ): int =
    if (savingThrowBenefitsFromCover(ability) and not(coverBenefitDenied))
      coverArmorClassBonus(cover)
    else
      0
}
