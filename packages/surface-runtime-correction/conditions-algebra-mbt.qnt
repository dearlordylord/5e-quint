module conditionsAlgebraMbt::Impl {
  type ConditionState = {
    blinded: bool,
    charmed: bool,
    deafened: bool,
    frightened: bool,
    grappled: bool,
    invisible: bool,
    paralyzed: bool,
    petrified: bool,
    poisoned: bool,
    prone: bool,
    restrained: bool,
    stunned: bool,
    unconscious: bool,
    directIncapacitated: bool,
  }

  var qBlinded: bool
  var qCharmed: bool
  var qDeafened: bool
  var qFrightened: bool
  var qGrappled: bool
  var qInvisible: bool
  var qParalyzed: bool
  var qPetrified: bool
  var qPoisoned: bool
  var qProne: bool
  var qRestrained: bool
  var qStunned: bool
  var qUnconscious: bool
  var qDirectIncapacitated: bool
  var qHasIncapacitated: bool
  var qHasProne: bool

  pure def emptyConditionState(): ConditionState = {
    blinded: false,
    charmed: false,
    deafened: false,
    frightened: false,
    grappled: false,
    invisible: false,
    paralyzed: false,
    petrified: false,
    poisoned: false,
    prone: false,
    restrained: false,
    stunned: false,
    unconscious: false,
    directIncapacitated: false,
  }

  pure def isIncapacitated(state: ConditionState): bool =
    state.directIncapacitated or
    state.paralyzed or
    state.petrified or
    state.stunned or
    state.unconscious

  pure def hasProne(state: ConditionState): bool =
    state.prone or state.unconscious

  pure def applyCondition(state: ConditionState, condition: str): ConditionState =
    if (condition == "incapacitated")
      state.with("directIncapacitated", true)
    else if (condition == "unconscious")
      state.with("unconscious", true).with("prone", true)
    else if (condition == "blinded")
      state.with("blinded", true)
    else if (condition == "prone")
      state.with("prone", true)
    else if (condition == "paralyzed")
      state.with("paralyzed", true)
    else
      state

  pure def removeCondition(state: ConditionState, condition: str): ConditionState =
    if (condition == "incapacitated")
      state.with("directIncapacitated", false)
    else if (condition == "unconscious")
      state.with("unconscious", false)
    else if (condition == "prone" and state.unconscious)
      state
    else if (condition == "blinded")
      state.with("blinded", false)
    else if (condition == "prone")
      state.with("prone", false)
    else if (condition == "paralyzed")
      state.with("paralyzed", false)
    else
      state

  pure def currentState(): ConditionState = {
    blinded: qBlinded,
    charmed: qCharmed,
    deafened: qDeafened,
    frightened: qFrightened,
    grappled: qGrappled,
    invisible: qInvisible,
    paralyzed: qParalyzed,
    petrified: qPetrified,
    poisoned: qPoisoned,
    prone: qProne,
    restrained: qRestrained,
    stunned: qStunned,
    unconscious: qUnconscious,
    directIncapacitated: qDirectIncapacitated,
  }

  action writeState(state: ConditionState) = all {
      qBlinded' = state.blinded,
      qCharmed' = state.charmed,
      qDeafened' = state.deafened,
      qFrightened' = state.frightened,
      qGrappled' = state.grappled,
      qInvisible' = state.invisible,
      qParalyzed' = state.paralyzed,
      qPetrified' = state.petrified,
      qPoisoned' = state.poisoned,
      qProne' = state.prone,
      qRestrained' = state.restrained,
      qStunned' = state.stunned,
      qUnconscious' = state.unconscious,
      qDirectIncapacitated' = state.directIncapacitated,
      qHasIncapacitated' = isIncapacitated(state),
      qHasProne' = hasProne(state),
    }

  action init = writeState(emptyConditionState())

  action doApplyBlinded = writeState(applyCondition(currentState(), "blinded"))

  action doRemoveBlinded = writeState(removeCondition(currentState(), "blinded"))

  action doApplyProne = writeState(applyCondition(currentState(), "prone"))

  action doRemoveProne = writeState(removeCondition(currentState(), "prone"))

  action doApplyParalyzed = writeState(applyCondition(currentState(), "paralyzed"))

  action doRemoveParalyzed = writeState(removeCondition(currentState(), "paralyzed"))

  action doApplyUnconscious = writeState(applyCondition(currentState(), "unconscious"))

  action doRemoveUnconscious = writeState(removeCondition(currentState(), "unconscious"))

  action doApplyDirectIncapacitated = writeState(applyCondition(currentState(), "incapacitated"))

  action doRemoveDirectIncapacitated = writeState(removeCondition(currentState(), "incapacitated"))

  action step = any {
    doApplyBlinded,
    doRemoveBlinded,
    doApplyProne,
    doRemoveProne,
    doApplyParalyzed,
    doRemoveParalyzed,
    doApplyUnconscious,
    doRemoveUnconscious,
    doApplyDirectIncapacitated,
    doRemoveDirectIncapacitated,
  }
}
