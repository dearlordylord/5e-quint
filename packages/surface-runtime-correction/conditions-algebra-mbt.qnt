module conditionsAlgebraMbt::Impl {
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

  pure def qComputeHasIncapacitated(
    directIncapacitated: bool,
    paralyzed: bool,
    petrified: bool,
    stunned: bool,
    unconscious: bool,
  ): bool =
    directIncapacitated or paralyzed or petrified or stunned or unconscious

  pure def qComputeHasProne(prone: bool, unconscious: bool): bool =
    prone or unconscious

  action init = all {
    qBlinded' = false,
    qCharmed' = false,
    qDeafened' = false,
    qFrightened' = false,
    qGrappled' = false,
    qInvisible' = false,
    qParalyzed' = false,
    qPetrified' = false,
    qPoisoned' = false,
    qProne' = false,
    qRestrained' = false,
    qStunned' = false,
    qUnconscious' = false,
    qDirectIncapacitated' = false,
    qHasIncapacitated' = false,
    qHasProne' = false,
  }

  action doApplyBlinded = all {
    qBlinded' = true,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

  action doRemoveBlinded = all {
    qBlinded' = false,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

  action doApplyProne = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = true,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(true, qUnconscious),
  }

  action doRemoveProne = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = if (qUnconscious) qProne else false,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(if (qUnconscious) qProne else false, qUnconscious),
  }

  action doApplyParalyzed = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = true,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      true,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

  action doRemoveParalyzed = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = false,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      false,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

  action doApplyUnconscious = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = true,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = true,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      true,
    ),
    qHasProne' = qComputeHasProne(true, true),
  }

  action doRemoveUnconscious = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = false,
    qDirectIncapacitated' = qDirectIncapacitated,
    qHasIncapacitated' = qComputeHasIncapacitated(
      qDirectIncapacitated,
      qParalyzed,
      qPetrified,
      qStunned,
      false,
    ),
    qHasProne' = qComputeHasProne(qProne, false),
  }

  action doApplyDirectIncapacitated = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = true,
    qHasIncapacitated' = qComputeHasIncapacitated(
      true,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

  action doRemoveDirectIncapacitated = all {
    qBlinded' = qBlinded,
    qCharmed' = qCharmed,
    qDeafened' = qDeafened,
    qFrightened' = qFrightened,
    qGrappled' = qGrappled,
    qInvisible' = qInvisible,
    qParalyzed' = qParalyzed,
    qPetrified' = qPetrified,
    qPoisoned' = qPoisoned,
    qProne' = qProne,
    qRestrained' = qRestrained,
    qStunned' = qStunned,
    qUnconscious' = qUnconscious,
    qDirectIncapacitated' = false,
    qHasIncapacitated' = qComputeHasIncapacitated(
      false,
      qParalyzed,
      qPetrified,
      qStunned,
      qUnconscious,
    ),
    qHasProne' = qComputeHasProne(qProne, qUnconscious),
  }

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
