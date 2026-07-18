// KERNEL-COVERAGE: qnt-owner BATTLE.RELATIONSHIP_DISCOVERY
module battleRuntimeRelationshipDiscovery {
  // .references/srd-5.2.1/Rules-Glossary.md "Help [Action]", "Ally", and
  // "Enemy" supply the rule and relationship terms. UBIQUITOUS_LANGUAGE.md
  // "Table Decisions" owns the contextual, pairwise interpretation. These
  // predicates own only the reducer-known constraints surrounding the table
  // decisions.
  pure def helpAttackAllyCandidate(
    helperId: int,
    candidateAllyId: int,
    candidateAllyTerminal: bool,
    anotherLiveCandidateExists: bool,
  ): bool =
    candidateAllyId != helperId and
    not(candidateAllyTerminal) and
    anotherLiveCandidateExists

  pure def helpAttackEnemyCandidate(
    helperId: int,
    allyId: int,
    candidateEnemyId: int,
    candidateEnemyTerminal: bool,
  ): bool =
    candidateEnemyId != helperId and
    candidateEnemyId != allyId and
    not(candidateEnemyTerminal)

  // .references/srd-5.2.1/Equipment.md "Cleave" requires a second
  // creature, not an enemy. Distance and reach remain separate table facts.
  pure def cleaveSecondTargetCandidate(
    attackerId: int,
    firstTargetId: int,
    candidateSecondTargetId: int,
  ): bool =
    candidateSecondTargetId != attackerId and
    candidateSecondTargetId != firstTargetId
}
