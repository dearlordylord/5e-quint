// RAW: SRD 5.2.1 rules-glossary.md:451-459, monsters.md:401-409.
// Literal projection witness: expected cleanup facts; production owns mutable lifecycle.
module statBlockSpellConcentrationMbt {
  type ConcentrationScenario = | Initial | Cast | VoluntaryEnd | FailedDamageSave | Dead | Incapacitated | DurationExpired | Replacement
  var qStage: int
  var qScenario: ConcentrationScenario
  var qConcentrating: bool
  var qEffectCount: int
  var qSourceMatches: bool

  action init = all { qStage' = 0, qScenario' = Initial, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doCast = all { qStage == 0, qStage' = 1, qScenario' = Cast, qConcentrating' = true, qEffectCount' = 1, qSourceMatches' = true }
  action doVoluntaryEnd = all { qStage == 1, qStage' = 2, qScenario' = VoluntaryEnd, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doFailedDamageSave = all { qStage == 2, qStage' = 3, qScenario' = FailedDamageSave, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doDeath = all { qStage == 3, qStage' = 4, qScenario' = Dead, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doIncapacitated = all { qStage == 4, qStage' = 5, qScenario' = Incapacitated, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doDurationExpiry = all { qStage == 5, qStage' = 6, qScenario' = DurationExpired, qConcentrating' = false, qEffectCount' = 0, qSourceMatches' = false }
  action doReplacement = all { qStage == 6, qStage' = 7, qScenario' = Replacement, qConcentrating' = true, qEffectCount' = 1, qSourceMatches' = true }

  action step = any { doCast, doVoluntaryEnd, doFailedDamageSave, doDeath, doIncapacitated, doDurationExpiry, doReplacement }
}
