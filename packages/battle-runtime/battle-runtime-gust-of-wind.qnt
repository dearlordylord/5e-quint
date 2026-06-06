// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-gust-of-wind-line
module battleRuntimeGustOfWind {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  type GustOfWindLineEffect =
    | NoGustOfWindLine
    | ActiveGustOfWindLine({
        source: Actor,
        areaId: int,
        directionId: int,
        heightenedTarget: AreaSpellEffectHeightenedTarget,
        castRound: int,
        durationTicks: int,
      })

  type GustOfWindLineRuntimeState = {
    battle: BattleState,
    effect: GustOfWindLineEffect,
  }

  pure def gustOfWindLineLengthFeet(): int = 60

  pure def gustOfWindLineWidthFeet(): int = 10

  pure def gustOfWindLineDurationTicks(): int = 10

  pure def gustOfWindLinePushFeet(): int = 15

  pure val noHeightenedSpellTarget = NoHeightenedSpellTarget

  pure def gustOfWindLineMovementCost(totalDistanceFeet: int, closerDistanceFeet: int): int =
    totalDistanceFeet + closerDistanceFeet

  pure def gustOfWindLineMovementFactValid(
    effect: GustOfWindLineEffect,
    source: Actor,
    areaId: int,
    directionId: int,
    totalDistanceFeet: int,
    closerDistanceFeet: int,
    spentFeet: int,
  ): bool =
    match effect {
      | ActiveGustOfWindLine(active) =>
          active.source == source and
            active.areaId == areaId and
            active.directionId == directionId and
            totalDistanceFeet > 0 and
            closerDistanceFeet > 0 and
            closerDistanceFeet <= totalDistanceFeet and
            spentFeet == gustOfWindLineMovementCost(totalDistanceFeet, closerDistanceFeet)
      | NoGustOfWindLine => false
    }

  pure def gustOfWindLineSaveFactsValid(
    effect: GustOfWindLineEffect,
    source: Actor,
    areaId: int,
    directionId: int,
    targetInLine: bool,
    saveFailed: bool,
    pushedDistanceFeet: int,
    pushProvokesOpportunityAttacks: bool,
  ): bool =
    match effect {
      | ActiveGustOfWindLine(active) =>
          active.source == source and
            active.areaId == areaId and
            active.directionId == directionId and
            targetInLine and
            (if (saveFailed) {
              pushedDistanceFeet == gustOfWindLinePushFeet and
                not(pushProvokesOpportunityAttacks)
            } else {
              pushedDistanceFeet == 0 and
                not(pushProvokesOpportunityAttacks)
            })
      | NoGustOfWindLine => false
    }

  pure def gustOfWindLineHeightenedDisadvantageApplies(
    effect: GustOfWindLineEffect,
    target: Actor,
  ): bool =
    match effect {
      | ActiveGustOfWindLine(active) =>
          match active.heightenedTarget {
            | HeightenedSpellTarget(data) => data.target == target
            | NoHeightenedSpellTarget => false
          }
      | NoGustOfWindLine => false
    }

  pure def resolveGustOfWindLineCast(
    state: GustOfWindLineRuntimeState,
    actor: Actor,
    slotLevel: int,
    areaId: int,
    directionId: int,
    heightenedTarget: AreaSpellEffectHeightenedTarget,
    initialSaveFactsValid: bool,
  ): GustOfWindLineRuntimeState =
    if (
      currentActor(state.battle) == actor and
        actor == Fighter and
        slotLevel >= 2 and
        state.battle.actionAvailable and
        canActorExpendSpellSlotThisTurn(state.battle, actor) and
        not(state.battle.fighter.unconscious) and
        not(state.battle.fighter.incapacitated) and
        not(fighterHasRage(state.battle)) and
        initialSaveFactsValid
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state.battle, actor)
      {
        battle: commitActorSpellSlotUse({
          ...withoutPrior,
          fighter: { ...withoutPrior.fighter, concentrating: true },
          actionAvailable: false,
        }, actor),
        effect: ActiveGustOfWindLine({
          source: actor,
          areaId: areaId,
          directionId: directionId,
          heightenedTarget: heightenedTarget,
          castRound: state.battle.initiative.round,
          durationTicks: gustOfWindLineDurationTicks,
        }),
      }
    } else {
      state
    }

  pure def resolveGustOfWindLineDirectionChange(
    state: GustOfWindLineRuntimeState,
    actor: Actor,
    newDirectionId: int,
  ): GustOfWindLineRuntimeState =
    match state.effect {
      | ActiveGustOfWindLine(active) =>
          if (
            active.source == actor and
              currentActor(state.battle) == actor and
              actor == Fighter and
              state.battle.bonusActionAvailable and
              state.battle.initiative.round > active.castRound and
              not(state.battle.fighter.unconscious) and
              not(state.battle.fighter.incapacitated)
          )
            {
              battle: { ...state.battle, bonusActionAvailable: false },
              effect: ActiveGustOfWindLine({
                ...active,
                directionId: newDirectionId,
              }),
            }
          else
            state
      | NoGustOfWindLine => state
    }

  pure def resolveGustOfWindLineEndTurn(
    state: GustOfWindLineRuntimeState,
    actor: Actor,
    saveFactsValid: bool,
  ): GustOfWindLineRuntimeState =
    if (currentActor(state.battle) == actor and saveFactsValid)
      { ...state, battle: endTurn(state.battle) }
    else
      state

}
