// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-antimagic-field-action-interdiction
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-action-interdiction
//
// Self-contained literal projection witness for Antimagic Field action
// interdiction. The paired TypeScript driver executes production reducers; this
// driver asserts the SRD outcomes without importing the battle-runtime model.
module battleRuntimeAntimagicFieldActionInterdictionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AntimagicActionInterdiction

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
  //   no one can cast spells or take Magic Actions inside the aura.
  // - .references/srd-5.2.1/Rules-Glossary.md "Emanation": the origin is not
  //   included unless its creator decides otherwise.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Reaction, and
  //   Area of Effect/Emanation.
  type WitnessState = {
    qActionSpellDiscovered: bool,
    qBonusActionSpellDiscovered: bool,
    qMagicActionDiscovered: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActionSpellDiscovered: bool = qState.qActionSpellDiscovered
  pure def qBonusActionSpellDiscovered: bool = qState.qBonusActionSpellDiscovered
  pure def qMagicActionDiscovered: bool = qState.qMagicActionDiscovered

  pure def antimagicActionInterdictionState(
    actionSpellDiscovered: bool,
    bonusActionSpellDiscovered: bool,
    magicActionDiscovered: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): WitnessState = {
    qActionSpellDiscovered: actionSpellDiscovered,
    qBonusActionSpellDiscovered: bonusActionSpellDiscovered,
    qMagicActionDiscovered: magicActionDiscovered,
    protocol: protocol,
  }

  action init = all {
    qState' = antimagicActionInterdictionState(
      true,
      true,
      true,
      witnessInit(AntimagicActionInterdiction)
    ),
  }

  action doBlockDiscoveryInsideAura = all {
    qState' = antimagicActionInterdictionState(
      false,
      false,
      false,
      witnessResolved(AntimagicActionInterdiction)
    ),
  }

  action doAllowOriginExcluded = all {
    qState' = antimagicActionInterdictionState(
      true,
      true,
      true,
      witnessResolved(AntimagicActionInterdiction)
    ),
  }

  action doRejectStaleActionSpell = all {
    qState' = antimagicActionInterdictionState(
      false,
      false,
      false,
      witnessInvalid(AntimagicActionInterdiction, WStaleSubject)
    ),
  }

  action doRejectStaleMagicAction = all {
    qState' = antimagicActionInterdictionState(
      false,
      false,
      false,
      witnessInvalid(AntimagicActionInterdiction, WStaleSubject)
    ),
  }

  action doRejectTriggeredReactionSpell = all {
    qState' = antimagicActionInterdictionState(
      false,
      false,
      false,
      witnessInvalid(AntimagicActionInterdiction, WStaleSubject)
    ),
  }

  action step = any {
    any { doBlockDiscoveryInsideAura, },
    any { doAllowOriginExcluded, },
    any { doRejectStaleActionSpell, },
    any { doRejectStaleMagicAction, },
    any { doRejectTriggeredReactionSpell, },
  }
}
