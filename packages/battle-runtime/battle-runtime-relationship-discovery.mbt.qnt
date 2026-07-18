// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.RELATIONSHIP_DISCOVERY
//
// Self-contained literal projection witness. The paired TypeScript driver
// observes production discovery against independent pair decisions and
// mechanically ineligible candidates.
module battleRuntimeRelationshipDiscoveryMbt {
  var qHelpActDiscovered: bool
  var qHelpTableChosenAllyDiscovered: bool
  var qHelpTableChosenEnemyDiscovered: bool
  var qHelpHelperExcluded: bool
  var qHelpSelectedAllyExcludedFromEnemy: bool
  var qHelpTerminalCandidateExcluded: bool
  var qHelpInsufficientParticipantsRejected: bool
  var qCleaveTableChosenSecondTargetDiscovered: bool
  var qCleaveAttackerExcluded: bool
  var qCleaveFirstTargetExcluded: bool

  action recordProjection(
    helpActDiscovered: bool,
    helpTableChosenAllyDiscovered: bool,
    helpTableChosenEnemyDiscovered: bool,
    helpHelperExcluded: bool,
    helpSelectedAllyExcludedFromEnemy: bool,
    helpTerminalCandidateExcluded: bool,
    helpInsufficientParticipantsRejected: bool,
    cleaveTableChosenSecondTargetDiscovered: bool,
    cleaveAttackerExcluded: bool,
    cleaveFirstTargetExcluded: bool,
  ): bool = all {
    qHelpActDiscovered' = helpActDiscovered,
    qHelpTableChosenAllyDiscovered' = helpTableChosenAllyDiscovered,
    qHelpTableChosenEnemyDiscovered' = helpTableChosenEnemyDiscovered,
    qHelpHelperExcluded' = helpHelperExcluded,
    qHelpSelectedAllyExcludedFromEnemy' = helpSelectedAllyExcludedFromEnemy,
    qHelpTerminalCandidateExcluded' = helpTerminalCandidateExcluded,
    qHelpInsufficientParticipantsRejected' = helpInsufficientParticipantsRejected,
    qCleaveTableChosenSecondTargetDiscovered' = cleaveTableChosenSecondTargetDiscovered,
    qCleaveAttackerExcluded' = cleaveAttackerExcluded,
    qCleaveFirstTargetExcluded' = cleaveFirstTargetExcluded,
  }

  action init = recordProjection(
    false, false, false, false, false,
    false, false, false, false, false,
  )

  action doDiscoverHelpCandidates = recordProjection(
    true, true, true, true, true,
    true, true, false, false, false,
  )

  action doDiscoverCleaveSecondTarget = recordProjection(
    false, false, false, false, false,
    false, false, true, true, true,
  )

  action step = any {
    any { doDiscoverHelpCandidates, },
    any { doDiscoverCleaveSecondTarget, },
  }
}
// KERNEL-COVERAGE: parity-witness BATTLE.RELATIONSHIP_DISCOVERY
// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md "Help [Action]", "Ally", and
//   "Enemy" define the procedure and relationship terms.
// - .references/srd-5.2.1/Equipment.md "Cleave" requires a second creature.
// - UBIQUITOUS_LANGUAGE.md "Table Decisions" owns contextual pair decisions.
