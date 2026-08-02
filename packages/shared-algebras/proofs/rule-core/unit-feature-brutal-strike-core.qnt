// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.brutal-strike
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureBrutalStrikeCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Classes/Barbarian.md:128-134: Level 9 Brutal Strike, Forceful Blow,
  //   and Hamstring Blow.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Advantage, Disadvantage, Hit,
  //   Damage Type, Speed, Movement, Opportunity Attack, and Quota.
  // Scope: Level 9 Brutal Strike only. Improved Brutal Strike is a distinct
  // feature increment and is intentionally not represented by these types.

  type BrutalStrikeTurnState =
    | BrutalStrikeAvailable
    | BrutalStrikeChosenThisTurn

  type BrutalStrikeAttackSelectionFacts = {
    recklessAttackUsed: bool,
    onOwnTurn: bool,
    strengthBasedAttack: bool,
    forgoesAdvantage: bool,
    hasDisadvantage: bool,
  }

  type BrutalStrikeSelection =
    | BrutalStrikeRollNotChosen({ turnState: BrutalStrikeTurnState })
    | BrutalStrikeRollChosen

  type BrutalStrikeEffectChoice =
    | NoBrutalStrikeEffect
    | ForcefulBlowChoice({ movementSegments: List[ForcefulMovementSegment] })
    | HamstringBlowChoice({ source: int })

  type ForcefulMovementSegment = {
    speedFeet: int,
    movementFeet: int,
  }

  // The effect choice exists only in the selected-hit phase. Keeping miss and
  // not-selected as distinct variants makes an early Forceful/Hamstring choice
  // unrepresentable.
  type BrutalStrikeResolutionInput =
    | BrutalStrikeWasNotSelected
    | ChosenBrutalStrikeMissed
    | ChosenBrutalStrikeHit({
        damageType: RuleDamageType,
        effectChoice: BrutalStrikeEffectChoice,
      })

  type HamstringState =
    | NoHamstring
    | ActiveHamstring({ source: int })

  type ForcefulBlowOutcome = {
    pushFeet: int,
    movementFeet: int,
  }

  type BrutalStrikeDamage = {
    dice: int,
    dieSize: int,
    damageType: RuleDamageType,
  }

  type BrutalStrikeOutcome =
    | BrutalStrikeNotSelected
    | BrutalStrikeMissed
    | BrutalStrikeDamageResolved({ damage: BrutalStrikeDamage })
    | ForcefulBlowResolved({ damage: BrutalStrikeDamage, effect: ForcefulBlowOutcome })
    | HamstringBlowResolved({ damage: BrutalStrikeDamage, hamstring: HamstringState })
    | BrutalStrikeChoiceRejected

  pure def startTurnBrutalStrikeState: BrutalStrikeTurnState =
    BrutalStrikeAvailable

  pure def brutalStrikeAttackEligible(
    turnState: BrutalStrikeTurnState,
    facts: BrutalStrikeAttackSelectionFacts,
  ): bool = all {
    turnState == BrutalStrikeAvailable,
    facts.recklessAttackUsed,
    facts.onOwnTurn,
    facts.strengthBasedAttack,
    facts.forgoesAdvantage,
    not(facts.hasDisadvantage),
  }

  pure def chooseBrutalStrikeRoll(
    turnState: BrutalStrikeTurnState,
    facts: BrutalStrikeAttackSelectionFacts,
  ): BrutalStrikeSelection =
    if (brutalStrikeAttackEligible(turnState, facts)) BrutalStrikeRollChosen
    else BrutalStrikeRollNotChosen({ turnState: turnState })

  pure def brutalStrikeTurnStateAfterSelection(
    selection: BrutalStrikeSelection,
  ): BrutalStrikeTurnState =
    match selection {
      | BrutalStrikeRollNotChosen(notChosen) => notChosen.turnState
      | BrutalStrikeRollChosen => BrutalStrikeChosenThisTurn
    }

  pure def brutalStrikeDamage(damageType: RuleDamageType): BrutalStrikeDamage = {
    dice: 1,
    dieSize: 10,
    damageType: damageType,
  }

  pure def forcefulBlowPushFeet: int = 15

  pure def forcefulBlowMovementStraightTowardTarget: bool = true

  pure def forcefulBlowMovementProvokesOpportunityAttacks: bool = false

  pure def forcefulBlowMovementFold(
    segments: List[ForcefulMovementSegment],
  ): { movementFeet: int, valid: bool } =
    segments.foldl({ movementFeet: 0, valid: true }, (acc, segment) => {
      val nextMovementFeet = acc.movementFeet + segment.movementFeet
      {
        movementFeet: nextMovementFeet,
        valid: all {
          acc.valid,
          segment.speedFeet >= 0,
          segment.movementFeet > 0,
          nextMovementFeet <= segment.speedFeet / 2,
        },
      }
    })

  pure def forcefulBlowMovementValid(
    segments: List[ForcefulMovementSegment],
  ): bool =
    forcefulBlowMovementFold(segments).valid

  pure def applyHamstringBlow(_current: HamstringState, source: int): HamstringState =
    ActiveHamstring({ source: source })

  pure def hamstringBlowSpeedDeltaFeet(state: HamstringState): int =
    match state {
      | NoHamstring => 0
      | ActiveHamstring(_) => -15
    }

  pure def hamstringBlowExpiresAtStartOfSourceTurn(
    state: HamstringState,
    source: int,
  ): bool =
    match state {
      | NoHamstring => false
      | ActiveHamstring(active) => active.source == source
    }

  pure def hamstringStateAtStartOfTurn(
    state: HamstringState,
    source: int,
  ): HamstringState =
    if (hamstringBlowExpiresAtStartOfSourceTurn(state, source)) NoHamstring
    else state

  pure def resolveBrutalStrike(
    currentHamstring: HamstringState,
    input: BrutalStrikeResolutionInput,
  ): BrutalStrikeOutcome =
    match input {
      | BrutalStrikeWasNotSelected => BrutalStrikeNotSelected
      | ChosenBrutalStrikeMissed => BrutalStrikeMissed
      | ChosenBrutalStrikeHit(hit) =>
          match hit.effectChoice {
            | NoBrutalStrikeEffect =>
                BrutalStrikeDamageResolved({ damage: brutalStrikeDamage(hit.damageType) })
            | ForcefulBlowChoice(forceful) =>
                if (forcefulBlowMovementValid(forceful.movementSegments)) {
                  ForcefulBlowResolved({
                    damage: brutalStrikeDamage(hit.damageType),
                    effect: {
                      pushFeet: forcefulBlowPushFeet,
                      movementFeet: forcefulBlowMovementFold(forceful.movementSegments).movementFeet,
                    },
                  })
                } else BrutalStrikeChoiceRejected
            | HamstringBlowChoice(hamstring) =>
                HamstringBlowResolved({
                  damage: brutalStrikeDamage(hit.damageType),
                  hamstring: applyHamstringBlow(currentHamstring, hamstring.source),
                })
          }
    }
}
