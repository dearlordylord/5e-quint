// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.spell-invocation.unrestricted
// SRD 5.2.1 monsters.md:401-403; spells.md:79-95.
module statBlockSpellInvocation {
  type StatBlockSpellCastLevelOverride =
    | DefinitionSpellLevel
    | ListedSpellLevel(int)

  type StatBlockSpellCastLevel =
    | EffectiveSpellLevel(int)
    | InvalidSpellLevel

  // monsters.md: Spellcasting uses the lowest possible level unless listed
  // otherwise. spells.md: Spell Level fixes cantrips at level zero.
  pure def statBlockSpellCastLevel(
    definitionLevel: int,
    override: StatBlockSpellCastLevelOverride
  ): StatBlockSpellCastLevel = {
    val level = match override {
      | DefinitionSpellLevel => definitionLevel
      | ListedSpellLevel(value) => value
    }
    if (level < definitionLevel or (definitionLevel == 0 and level != 0))
      InvalidSpellLevel
    else EffectiveSpellLevel(level)
  }
}
