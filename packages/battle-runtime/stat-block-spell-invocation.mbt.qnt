module statBlockSpellInvocationMbt {
  import statBlockSpellInvocation.* from "../shared-algebras/proofs/rule-core/stat-block-spell-invocation"

  var qResult: StatBlockSpellCastLevel

  action init = qResult' = EffectiveSpellLevel(1)

  action doJoin = {
    nondet definitionLevel = 0.to(9).oneOf()
    nondet listedLevel = 0.to(9).oneOf()
    nondet useDefinitionLevel = Set(true, false).oneOf()
    qResult' = statBlockSpellCastLevel(
      definitionLevel,
      if (useDefinitionLevel) DefinitionSpellLevel else ListedSpellLevel(listedLevel)
    )
  }

  action step = any { doJoin }
}
