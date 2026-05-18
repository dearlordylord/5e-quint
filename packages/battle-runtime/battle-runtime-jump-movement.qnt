// -*- mode: Bluespec; -*-

module battleRuntimeJumpMovement {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def jumpMovementReplacementMaxTargets(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def jumpMovementReplacementActiveEffect(): ActiveEffect =
    JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })

  pure def jumpMovementReplacementLandingIsLegal(landing: JumpMovementLandingFact): bool =
    landing != JumpIllegalLanding

  pure def jumpMovementReplacementLandingAppliesProne(landing: JumpMovementLandingFact): bool =
    landing == JumpLegalLandingAcrobaticsFailed

  pure def activeEffectsContainAvailableJumpMovementReplacement(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | JumpMovementReplacement(data) => not(data.usedThisTurn)
      | _ => false
    })

  pure def activeEffectsAfterJumpMovementReplacementUse(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | JumpMovementReplacement(data) => JumpMovementReplacement({ ...data, usedThisTurn: true })
      | _ => effect
    })
}
