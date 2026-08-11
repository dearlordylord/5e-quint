// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.INVOCATION_RESOURCE_PROCEDURE

module battleRuntimeSpellcastingFacts {
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def canDiscoverSpellActs(canCastSpells: bool, raging: bool): bool =
    canCastSpells and not(battleRuntimeRagePreventsSpellcasting(raging))

  pure def fighterRageDamageBonus(barbarianLevel: int): int =
    battleRuntimeRageDamageBonus(barbarianLevel)

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def innateSorceryAppliesToSpell(
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): bool =
    innateSorceryActive and spellSourceClass == SorcererSpellSource

  pure def sorcererSpellSaveDcWithInnateSorcery(
    baseDc: int,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): int =
    baseDc + (if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass)) 1 else 0)

  pure def sorcererSpellAttackRollModeWithInnateSorcery(
    baseline: SpellAttackRollMode,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): SpellAttackRollMode =
    if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == DisadvantageSpellAttackRoll)
      NormalSpellAttackRoll
    else if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == NormalSpellAttackRoll)
      AdvantageSpellAttackRoll
    else
      baseline
}
