// -*- mode: Bluespec; -*-
// Focused runtime bridge: keep Brutal Strike out of the broad feature bridge's
// transitive closure so unrelated proof modules do not pay its import cost.

module battleRuntimeBrutalStrikeBridge {
  import unitFeatureBrutalStrikeCore.* from "../shared-algebras/proofs/rule-core/unit-feature-brutal-strike-core"

  pure def battleRuntimeChooseBrutalStrikeRoll(
    turnState: BrutalStrikeTurnState,
    facts: BrutalStrikeAttackSelectionFacts,
  ): BrutalStrikeSelection =
    chooseBrutalStrikeRoll(turnState, facts)

  pure def battleRuntimeBrutalStrikeOutcome(
    currentHamstring: HamstringState,
    input: BrutalStrikeResolutionInput,
  ): BrutalStrikeOutcome =
    resolveBrutalStrike(currentHamstring, input)
}
