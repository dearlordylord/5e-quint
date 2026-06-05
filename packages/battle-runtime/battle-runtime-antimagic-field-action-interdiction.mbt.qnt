// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-antimagic-field-action-interdiction
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-action-interdiction
//
// Self-contained literal projection witness for Antimagic Field action
// interdiction. The paired TypeScript driver executes production reducers; this
// driver asserts the SRD outcomes without importing the battle-runtime model.
module battleRuntimeAntimagicFieldActionInterdictionMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
  //   no one can cast spells or take Magic Actions inside the aura.
  // - .references/srd-5.2.1/Rules-Glossary.md "Emanation": the origin is not
  //   included unless its creator decides otherwise.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Reaction, and
  //   Area of Effect/Emanation.
  var qActionSpellDiscovered: bool
  var qBonusActionSpellDiscovered: bool
  var qMagicActionDiscovered: bool
  var qLastResult: str
  var qLastInvalidReason: str

  action recordProjection(
    actionSpellDiscovered: bool,
    bonusActionSpellDiscovered: bool,
    magicActionDiscovered: bool,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qActionSpellDiscovered' = actionSpellDiscovered,
    qBonusActionSpellDiscovered' = bonusActionSpellDiscovered,
    qMagicActionDiscovered' = magicActionDiscovered,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
  }

  action init = recordProjection(true, true, true, "init", "")

  action doBlockDiscoveryInsideAura =
    recordProjection(false, false, false, "discovered", "")

  action doAllowOriginExcluded =
    recordProjection(true, true, true, "discovered", "")

  action doRejectStaleActionSpell =
    recordProjection(false, false, false, "invalid", "staleSubject")

  action doRejectStaleMagicAction =
    recordProjection(false, false, false, "invalid", "staleSubject")

  action doRejectTriggeredReactionSpell =
    recordProjection(false, false, false, "invalid", "staleSubject")

  action step = any {
    doBlockDiscoveryInsideAura,
    doAllowOriginExcluded,
    doRejectStaleActionSpell,
    doRejectStaleMagicAction,
    doRejectTriggeredReactionSpell,
  }
}
