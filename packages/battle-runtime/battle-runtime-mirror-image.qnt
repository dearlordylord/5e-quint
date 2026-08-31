// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-mirror-image-hit-interception

module battleRuntimeMirrorImage {
  import battleRuntimeDuplicateHitInterception.* from "./battle-runtime-duplicate-hit-interception"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMirrorImageConstants.* from "./battle-runtime-mirror-image-constants"

  pure def mirrorImageActiveEffect(): ActiveEffect =
    MirrorImageDuplicates({
      durationTicks: mirrorImageDurationTicks,
      remainingDuplicates: mirrorImageInitialDuplicates,
    })

  pure def activeEffectsContainMirrorImageDuplicates(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | MirrorImageDuplicates(_) => true
      | _ => false
    })

  pure def activeEffectsMirrorImageRemainingDuplicates(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | MirrorImageDuplicates(data) => data.remainingDuplicates
        | _ => 0
      })
      .fold(0, (highest, count) => if (highest > count) highest else count)

  pure def mirrorImageDuplicateRollInterposes(remainingDuplicates: int, highestRoll: int): bool =
    duplicateRollInterposes(remainingDuplicates, highestRoll, mirrorImageDuplicateSuccessAtLeast)

  pure def activeEffectsContainMirrorImageBypassBlindedCondition(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ColorSprayBlinded(_) => true
      | BlindnessDeafnessBlinded(_) => true
      | _ => false
    })

  pure def mirrorImageAttackerUnaffected(
    attackerEffects: Set[ActiveEffect],
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): bool =
    activeEffectsContainMirrorImageBypassBlindedCondition(attackerEffects)
      or attackerPerceivesTargetWithBlindsightOrTruesight

  pure def mirrorImageRequiresDuplicateRollForAttackRollHit(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): bool =
    duplicateRollRequired(
      activeEffectsMirrorImageRemainingDuplicates(targetEffects),
      mirrorImageAttackerUnaffected(attackerEffects, attackerPerceivesTargetWithBlindsightOrTruesight),
    )

  pure def mirrorImageRedirectsAttackRollHit(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    highestDuplicateRoll: int,
  ): bool =
    duplicateRedirectsHit(
      activeEffectsMirrorImageRemainingDuplicates(targetEffects),
      mirrorImageAttackerUnaffected(attackerEffects, attackerPerceivesTargetWithBlindsightOrTruesight),
      highestDuplicateRoll,
      mirrorImageDuplicateSuccessAtLeast,
    )

  pure def mirrorImageAttackRollHitReplayHoles(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    mirrorImageDuplicateRollFilled: bool,
    highestDuplicateRoll: int,
    damageRollFilled: bool,
    damageRollHole: Hole,
  ): Set[Hole] =
    if (
      mirrorImageRequiresDuplicateRollForAttackRollHit(
        attackerEffects,
        targetEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
      ) and
      not(mirrorImageDuplicateRollFilled)
    )
      Set(MirrorImageDuplicateRoll)
    else if (
      mirrorImageRedirectsAttackRollHit(
        attackerEffects,
        targetEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        highestDuplicateRoll,
      ) or damageRollFilled
    )
      Set()
    else
      Set(damageRollHole)

  pure def activeEffectsAfterMirrorImageDuplicateHit(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .map(effect => match effect {
        | MirrorImageDuplicates(data) =>
          MirrorImageDuplicates({
            durationTicks: data.durationTicks,
            remainingDuplicates: remainingDuplicatesAfterIntercept(data.remainingDuplicates),
          })
        | _ => effect
      })
      .filter(effect => match effect {
        | MirrorImageDuplicates(data) => data.remainingDuplicates > 0
        | _ => true
      })

  pure def combatantAfterMirrorImageAttackRollHit(
    attackerEffects: Set[ActiveEffect],
    target: Combatant,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    highestDuplicateRoll: int,
  ): Combatant =
    if (
      mirrorImageRedirectsAttackRollHit(
        attackerEffects,
        target.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        highestDuplicateRoll,
      )
    )
      { ...target, activeEffects: activeEffectsAfterMirrorImageDuplicateHit(target.activeEffects) }
    else
      target
}
