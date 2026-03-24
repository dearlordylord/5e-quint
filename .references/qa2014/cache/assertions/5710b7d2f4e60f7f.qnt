module _qa_5710b7d2f4e60f7f {
  import dnd.* from "./dnd"

  // Damage types have no rules of their own; cover is granted by CoverType, not damage type (PHB p.196)
  run qa_damage_types_dont_grant_cover = {
    // coverBonus takes CoverType only — DamageType is not a parameter; it cannot grant cover
    val noCover      = coverBonus(NoCover)
    val halfCover    = coverBonus(HalfCover)
    val threeFourths = coverBonus(ThreeQuartersCover)
    val totalCover   = coverBonus(TotalCover)
    assert(
      noCover == 0
      and halfCover == 2
      and threeFourths == 5
      and totalCover == 0
    )
  }
  
  // Cover bonus affects AC based solely on CoverType; the attacker's damage type is irrelevant
  run qa_cover_from_barrier_not_damage_type = {
    val roll  = 10
    val bonus = 5
    val ac    = 15
    // No cover: 10+5=15 >= 15 → hits
    val nocover   = resolveAttackRoll(roll, bonus, ac, coverBonus(NoCover))
    // Half cover: effective AC = 15+2=17, 15 < 17 → misses
    val halfcover = resolveAttackRoll(roll, bonus, ac, coverBonus(HalfCover))
    assert(nocover.hits and not(halfcover.hits))
  }
  
  // Damage types only govern resistance/immunity/vulnerability, never cover
  run qa_force_damage_type_only_affects_modifiers = {
    // Force damage resisted → halved; Fire damage not resisted → full
    val forceDmgResisted   = applyDamageModifiers(12, Force, Set(), Set(Force), Set())
    val fireDmgUnresisted  = applyDamageModifiers(12, Fire,  Set(), Set(Force), Set())
    // Cover bonus is the same regardless of which damage type an attack carries
    val coverVsForceAttack = coverBonus(HalfCover)
    val coverVsFireAttack  = coverBonus(HalfCover)
    assert(
      forceDmgResisted  == 6
      and fireDmgUnresisted == 12
      and coverVsForceAttack == coverVsFireAttack
      and coverVsForceAttack == 2
    )
  }
}
