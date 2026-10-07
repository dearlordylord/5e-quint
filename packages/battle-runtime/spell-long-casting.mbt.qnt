module spellLongCastingMbt {
  // Literal runtime observations for the RAW duration/restart/completion laws
  // in rule-core/spell-long-casting-examples.qnt. No accelerated duration.
  var qCasting: bool
  var qReady: bool
  var qEffect: bool
  action init = all { qCasting' = false, qReady' = false, qEffect' = false }
  action doStarted = all { qCasting' = true, qReady' = false, qEffect' = false }
  action doMinuteReady = all { qCasting' = true, qReady' = true, qEffect' = false }
  action doSkipped = all { qCasting' = false, qReady' = false, qEffect' = false }
  action doCompleted = all { qCasting' = false, qReady' = false, qEffect' = true }
  action step = any { doStarted, doMinuteReady, doSkipped, doCompleted }
}
