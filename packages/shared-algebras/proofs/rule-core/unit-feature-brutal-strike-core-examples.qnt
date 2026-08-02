// -*- mode: Bluespec; -*-

module unitFeatureBrutalStrikeCoreExamples {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import unitFeatureBrutalStrikeCore.* from "./unit-feature-brutal-strike-core"

  pure def admittedBrutalStrikeSelectionFacts: BrutalStrikeAttackSelectionFacts = {
    recklessAttackUsed: true,
    onOwnTurn: true,
    strengthBasedAttack: true,
    forgoesAdvantage: true,
    hasDisadvantage: false,
  }

  pure def chosenBrutalStrikeRoll: BrutalStrikeSelection =
    chooseBrutalStrikeRoll(BrutalStrikeAvailable, admittedBrutalStrikeSelectionFacts)

  run test_brutal_strike_requires_every_raw_attack_gate = {
    val admitted = admittedBrutalStrikeSelectionFacts
    all {
      assert(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted)),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeChosenThisTurn, admitted))),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted.with("recklessAttackUsed", false)))),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted.with("onOwnTurn", false)))),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted.with("strengthBasedAttack", false)))),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted.with("forgoesAdvantage", false)))),
      assert(not(brutalStrikeAttackEligible(BrutalStrikeAvailable, admitted.with("hasDisadvantage", true)))),
    }
  }

  run test_chosen_roll_consumes_the_turn_quota_even_when_it_misses = {
    val firstSelection = chosenBrutalStrikeRoll
    val consumedState = brutalStrikeTurnStateAfterSelection(firstSelection)
    val secondSelection = chooseBrutalStrikeRoll(consumedState, admittedBrutalStrikeSelectionFacts)
    val miss = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeMissed,
    )
    all {
      assert(firstSelection == BrutalStrikeRollChosen),
      assert(consumedState == BrutalStrikeChosenThisTurn),
      assert(miss == BrutalStrikeMissed),
      assert(secondSelection == BrutalStrikeRollNotChosen({ turnState: BrutalStrikeChosenThisTurn })),
      assert(startTurnBrutalStrikeState == BrutalStrikeAvailable),
      assert(
        chooseBrutalStrikeRoll(startTurnBrutalStrikeState, admittedBrutalStrikeSelectionFacts)
          == BrutalStrikeRollChosen
      ),
    }
  }

  run test_hit_can_add_brutal_strike_damage_without_an_effect = {
    val result = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: NoBrutalStrikeEffect,
      }),
    )
    assert(
      result == BrutalStrikeDamageResolved({
        damage: { dice: 1, dieSize: 10, damageType: SlashingDamage },
      })
    )
  }

  run test_forceful_blow_preserves_zero_partial_and_half_speed_movement = {
    val noMovement = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List(),
        }),
      }),
    )
    val partialMovement = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List({ speedFeet: 30, movementFeet: 10 }),
        }),
      }),
    )
    val halfSpeedMovement = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List({ speedFeet: 30, movementFeet: 15 }),
        }),
      }),
    )
    all {
      assert(
        match noMovement {
          | ForcefulBlowResolved(outcome) =>
              outcome.damage == { dice: 1, dieSize: 10, damageType: SlashingDamage }
                and outcome.effect == { pushFeet: 15, movementFeet: 0 }
          | _ => false
        }
      ),
      assert(
        match partialMovement {
          | ForcefulBlowResolved(outcome) => outcome.effect.movementFeet == 10
          | _ => false
        }
      ),
      assert(
        match halfSpeedMovement {
          | ForcefulBlowResolved(outcome) => outcome.effect.movementFeet == 15
          | _ => false
        }
      ),
      assert(forcefulBlowMovementStraightTowardTarget),
      assert(not(forcefulBlowMovementProvokesOpportunityAttacks)),
    }
  }

  run test_forceful_blow_rejects_movement_outside_raw_bound = {
    all {
      assert(
        resolveBrutalStrike(
          NoHamstring,
          ChosenBrutalStrikeHit({
            damageType: BludgeoningDamage,
            effectChoice: ForcefulBlowChoice({
              movementSegments: List({ speedFeet: 30, movementFeet: 16 }),
            }),
          }),
        ) == BrutalStrikeChoiceRejected
      ),
      assert(
        resolveBrutalStrike(
          NoHamstring,
          ChosenBrutalStrikeHit({
            damageType: BludgeoningDamage,
            effectChoice: ForcefulBlowChoice({
              movementSegments: List({ speedFeet: 30, movementFeet: 0 }),
            }),
          }),
        ) == BrutalStrikeChoiceRejected
      ),
      assert(
        resolveBrutalStrike(
          NoHamstring,
          ChosenBrutalStrikeHit({
            damageType: BludgeoningDamage,
            effectChoice: ForcefulBlowChoice({
              movementSegments: List({ speedFeet: 30, movementFeet: -1 }),
            }),
          }),
        ) == BrutalStrikeChoiceRejected
      ),
    }
  }

  run test_forceful_blow_switches_speeds_after_subtracting_distance_moved = {
    val switched = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: BludgeoningDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List(
            { speedFeet: 30, movementFeet: 10 },
            { speedFeet: 40, movementFeet: 10 },
          ),
        }),
      }),
    )
    val exceedsSwitchedSpeed = resolveBrutalStrike(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: BludgeoningDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List(
            { speedFeet: 40, movementFeet: 10 },
            { speedFeet: 30, movementFeet: 6 },
          ),
        }),
      }),
    )
    all {
      assert(
        match switched {
          | ForcefulBlowResolved(outcome) => outcome.effect.movementFeet == 20
          | _ => false
        }
      ),
      assert(exceedsSwitchedSpeed == BrutalStrikeChoiceRejected),
    }
  }

  run test_hamstring_blow_most_recent_source_replaces_globally = {
    val prior = ActiveHamstring({ source: 1 })
    val result = resolveBrutalStrike(
      prior,
      ChosenBrutalStrikeHit({
        damageType: PiercingDamage,
        effectChoice: HamstringBlowChoice({ source: 2 }),
      }),
    )
    all {
      assert(
        match result {
          | HamstringBlowResolved(outcome) => all {
              outcome.damage == { dice: 1, dieSize: 10, damageType: PiercingDamage },
              outcome.hamstring == ActiveHamstring({ source: 2 }),
              hamstringBlowSpeedDeltaFeet(outcome.hamstring) == -15,
              not(hamstringBlowExpiresAtStartOfSourceTurn(outcome.hamstring, 1)),
              hamstringBlowExpiresAtStartOfSourceTurn(outcome.hamstring, 2),
              hamstringStateAtStartOfTurn(outcome.hamstring, 1) == outcome.hamstring,
              hamstringStateAtStartOfTurn(outcome.hamstring, 2) == NoHamstring,
            }
          | _ => false
        }
      ),
    }
  }
}
