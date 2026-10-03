// RAW: .references/srd-5.2.1/classes.md:6825-6832.
// Literal integration witness; rules authority is attack-roll-defense-core.qnt.
module battleRuntimeAttackRollDefenseMbt {
  type DefenseWitness = {
    qOpportunityDisadvantage: bool,
    qOrdinaryDisadvantage: bool,
    qRepeatDisadvantage: bool,
    qMissDisadvantage: bool,
    qNextTurnDisadvantage: bool,
  }
  var qState: DefenseWitness
  action init = qState' = {
    qOpportunityDisadvantage: false,
    qOrdinaryDisadvantage: false,
    qRepeatDisadvantage: false,
    qMissDisadvantage: false,
    qNextTurnDisadvantage: false,
  }
  action doResolveDefense = all {
    not(qState.qOpportunityDisadvantage),
    qState' = {
      qOpportunityDisadvantage: true,
      qOrdinaryDisadvantage: false,
      qRepeatDisadvantage: true,
      qMissDisadvantage: false,
      qNextTurnDisadvantage: false,
    },
  }
  action step = any {
    doResolveDefense,
  }
}
