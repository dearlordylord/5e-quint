// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SAVING_THROW.MODIFIER_COLLECTOR

// RAW trace:
// - .references/srd-5.2.1/rules-glossary.md#Dodge [Action]: "you make
//   Dexterity saving throws with Advantage. You lose these benefits if you have
//   the Incapacitated condition or if your Speed is 0."
// - .references/srd-5.2.1/rules-glossary.md#Restrained: "You have Disadvantage
//   on Dexterity saving throws."
// - .references/srd-5.2.1/rules-glossary.md#Paralyzed, #Petrified, #Stunned,
//   #Unconscious: "You automatically fail Strength and Dexterity saving
//   throws."
// - .references/srd-5.2.1/rules-glossary.md#Advantage and #Disadvantage, with
//   playing-the-game.md "D20 Tests": one source of each cancels, however many
//   there are. d20TestRollMode owns that combination.
// - .references/srd-5.2.1/rules-glossary.md#Unarmed Strike: Grapple and
//   Shove: "The target must succeed on a Strength or Dexterity saving throw
//   (it chooses which)".
// - Feature, spell and procedure sources (Haste's "Advantage on Dexterity
//   saving throws", Heightened Spell's Disadvantage, Slow's "-2 penalty to ...
//   Dexterity saving throws", Warding Bond's "+1 bonus ... to saving throws",
//   cover's "+2" and "+5 bonus to ... Dexterity saving throws") reach the save
//   as counted Advantage, Disadvantage and bonuses.
//
// Scope: how the sources that reach one target's saving throw combine. Which
// feature, effect or procedure gives a source is owned by its own core; this
// core takes each as a flag or number.

module savingThrowModifierCollectorCore {
  import d20TestRollMode.* from "./d20-test-roll-mode"

  type SavingThrowAbility =
    | StrengthSave
    | DexteritySave
    | ConstitutionSave
    | IntelligenceSave
    | WisdomSave
    | CharismaSave

  type SavingThrowCircumstances = {
    ability: SavingThrowAbility,
    dodgeBenefit: bool,
    restrained: bool,
    // Paralyzed, Petrified, Stunned or Unconscious.
    failsStrengthAndDexteritySaves: bool,
    otherAdvantageSources: int,
    otherDisadvantageSources: int,
    bonuses: List[int],
  }

  type SavingThrowRequirement =
    | AutomaticallyFailedSave
    | RolledSave({ mode: D20TestRollMode, bonus: int })

  pure def isStrengthOrDexterity(ability: SavingThrowAbility): bool =
    ability == StrengthSave or ability == DexteritySave

  pure def savingThrowRollModeSources(
    c: SavingThrowCircumstances,
  ): D20TestRollModeSources = {
    advantage:
      (c.ability == DexteritySave and c.dodgeBenefit)
        or c.otherAdvantageSources > 0,
    disadvantage:
      (c.ability == DexteritySave and c.restrained)
        or c.otherDisadvantageSources > 0,
  }

  pure def savingThrowBonus(c: SavingThrowCircumstances): int =
    c.bonuses.foldl(0, (total, bonus) => total + bonus)

  // What the table rolls for this target, or that it fails without a roll.
  pure def savingThrowRequirement(
    c: SavingThrowCircumstances,
  ): SavingThrowRequirement =
    if (c.failsStrengthAndDexteritySaves and isStrengthOrDexterity(c.ability))
      AutomaticallyFailedSave
    else
      RolledSave({
        mode: d20TestRollModeFromSources(savingThrowRollModeSources(c)),
        bonus: savingThrowBonus(c),
      })

  // A Grapple or Shove target chooses between these two saves, each with what
  // reaches it.
  pure def strengthOrDexterityChoices(
    c: SavingThrowCircumstances,
  ): List[SavingThrowRequirement] = [
    savingThrowRequirement({ ...c, ability: StrengthSave }),
    savingThrowRequirement({ ...c, ability: DexteritySave }),
  ]

  // The target can succeed only if one of its choices is rolled.
  pure def strengthOrDexteritySaveCanSucceed(c: SavingThrowCircumstances): bool =
    foldl(
      strengthOrDexterityChoices(c),
      false,
      (rolledChoiceFound, requirement) =>
        rolledChoiceFound or requirement != AutomaticallyFailedSave,
    )
}
