// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: qnt-owner table-caller.marked-creature-defenses
// RAW: classes.md:6813-6816; playing-the-game.md:1181-1197.
// Literal integration witness; marked-creature-disclosure-core owns semantics.
module battleRuntimeMarkedCreatureDefensesMbt {
  type DefenseWitness = {
    qActiveResistanceDisclosed: bool, qExpiredResistanceDisclosed: bool,
    qActiveConditionImmunityDisclosed: bool, qExpiredConditionImmunityDisclosed: bool,
    qBaseImmunitiesRetained: bool, qBaseVulnerabilityRetained: bool,
  }
  var qState: DefenseWitness
  action init = qState' = {
    qActiveResistanceDisclosed: false, qExpiredResistanceDisclosed: false,
    qActiveConditionImmunityDisclosed: false, qExpiredConditionImmunityDisclosed: false,
    qBaseImmunitiesRetained: false, qBaseVulnerabilityRetained: false,
  }
  action doResolveMarkedDefenses = all {
    not(qState.qActiveResistanceDisclosed),
    qState' = {
      qActiveResistanceDisclosed: true, qExpiredResistanceDisclosed: false,
      qActiveConditionImmunityDisclosed: true, qExpiredConditionImmunityDisclosed: false,
      qBaseImmunitiesRetained: true, qBaseVulnerabilityRetained: true,
    },
  }
  action step = any {
    doResolveMarkedDefenses,
  }
}
