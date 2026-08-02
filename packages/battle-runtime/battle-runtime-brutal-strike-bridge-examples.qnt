// -*- mode: Bluespec; -*-

module battleRuntimeBrutalStrikeBridgeExamples {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import unitFeatureBrutalStrikeCore.* from "../shared-algebras/proofs/rule-core/unit-feature-brutal-strike-core"
  import battleRuntimeBrutalStrikeBridge.* from "./battle-runtime-brutal-strike-bridge"

  run test_brutal_strike_runtime_projection_uses_level_nine_rule_core = {
    val selectionFacts = {
      recklessAttackUsed: true,
      onOwnTurn: true,
      strengthBasedAttack: true,
      forgoesAdvantage: true,
      hasDisadvantage: false,
    }
    val selection = battleRuntimeChooseBrutalStrikeRoll(
      BrutalStrikeAvailable,
      selectionFacts,
    )
    val damageOnly = battleRuntimeBrutalStrikeOutcome(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: NoBrutalStrikeEffect,
      }),
    )
    val forceful = battleRuntimeBrutalStrikeOutcome(
      NoHamstring,
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: ForcefulBlowChoice({
          movementSegments: List({ speedFeet: 30, movementFeet: 10 }),
        }),
      }),
    )
    val hamstring = battleRuntimeBrutalStrikeOutcome(
      ActiveHamstring({ source: 1 }),
      ChosenBrutalStrikeHit({
        damageType: SlashingDamage,
        effectChoice: HamstringBlowChoice({ source: 2 }),
      }),
    )
    all {
      assert(selection == BrutalStrikeRollChosen),
      assert(brutalStrikeTurnStateAfterSelection(selection) == BrutalStrikeChosenThisTurn),
      assert(
        battleRuntimeChooseBrutalStrikeRoll(
          brutalStrikeTurnStateAfterSelection(selection),
          selectionFacts,
        ) == BrutalStrikeRollNotChosen({ turnState: BrutalStrikeChosenThisTurn })
      ),
      assert(
        damageOnly == BrutalStrikeDamageResolved({
          damage: { dice: 1, dieSize: 10, damageType: SlashingDamage },
        })
      ),
      assert(
        match forceful {
          | ForcefulBlowResolved(outcome) => all {
              outcome.damage.damageType == SlashingDamage,
              outcome.effect.pushFeet == 15,
              outcome.effect.movementFeet == 10,
            }
          | _ => false
        }
      ),
      assert(
        match hamstring {
          | HamstringBlowResolved(outcome) =>
              outcome.hamstring == ActiveHamstring({ source: 2 })
          | _ => false
        }
      ),
    }
  }
}
