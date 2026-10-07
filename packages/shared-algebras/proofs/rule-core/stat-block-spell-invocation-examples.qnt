// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.spell-invocation.unrestricted
module statBlockSpellInvocationExamples {
  import statBlockSpellInvocation.* from "./stat-block-spell-invocation"

  run test_stat_block_spell_level_uses_definition_unless_listed = all {
    assert(statBlockSpellCastLevel(3, DefinitionSpellLevel) == EffectiveSpellLevel(3)),
    assert(statBlockSpellCastLevel(3, ListedSpellLevel(5)) == EffectiveSpellLevel(5)),
    assert(statBlockSpellCastLevel(3, ListedSpellLevel(2)) == InvalidSpellLevel),
    assert(statBlockSpellCastLevel(0, DefinitionSpellLevel) == EffectiveSpellLevel(0)),
    assert(statBlockSpellCastLevel(0, ListedSpellLevel(1)) == InvalidSpellLevel),
  }

}
