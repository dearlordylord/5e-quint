// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-antimagic-field-magical-effect-interdiction
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-magical-effect-interdiction
//
// Self-contained literal projection witness for Antimagic Field magical-effect
// targeting and delivery interdiction. The paired TypeScript driver executes
// production reducers; this driver asserts the SRD outcomes without importing
// the battle-runtime model.
module battleRuntimeAntimagicFieldMagicalEffectInterdictionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AntimagicMagicalEffectInterdiction

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
  //   spells, magic items, and other magical effects can't target or otherwise
  //   affect anything inside the aura.
  // - .references/srd-5.2.1/Rules-Glossary.md "Magical Effect": a magical
  //   effect is created by a spell, magic item, or magical phenomenon.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, and Spell Effect.
  type WitnessState = {
    qSpellTargetAllowed: bool,
    qSpellAreaDeliveryAllowed: bool,
    qObjectContactDeliveryAllowed: bool,
    qOtherMagicalEffectTargetAllowed: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qSpellTargetAllowed: bool = qState.qSpellTargetAllowed
  pure def qSpellAreaDeliveryAllowed: bool = qState.qSpellAreaDeliveryAllowed
  pure def qObjectContactDeliveryAllowed: bool = qState.qObjectContactDeliveryAllowed
  pure def qOtherMagicalEffectTargetAllowed: bool = qState.qOtherMagicalEffectTargetAllowed

  pure def antimagicMagicalEffectInterdictionState(
    spellTargetAllowed: bool,
    spellAreaDeliveryAllowed: bool,
    objectContactDeliveryAllowed: bool,
    otherMagicalEffectTargetAllowed: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): WitnessState = {
    qSpellTargetAllowed: spellTargetAllowed,
    qSpellAreaDeliveryAllowed: spellAreaDeliveryAllowed,
    qObjectContactDeliveryAllowed: objectContactDeliveryAllowed,
    qOtherMagicalEffectTargetAllowed: otherMagicalEffectTargetAllowed,
    protocol: protocol,
  }

  action init = all {
    qState' = antimagicMagicalEffectInterdictionState(
      true,
      true,
      true,
      true,
      witnessInit(AntimagicMagicalEffectInterdiction)
    ),
  }

  action doAllowOutsideAura = all {
    qState' = antimagicMagicalEffectInterdictionState(
      true,
      true,
      true,
      true,
      witnessResolved(AntimagicMagicalEffectInterdiction)
    ),
  }

  action doRejectSpellTargetInsideAura = all {
    qState' = antimagicMagicalEffectInterdictionState(
      false,
      true,
      true,
      true,
      witnessInvalid(AntimagicMagicalEffectInterdiction, WInvalidFill)
    ),
  }

  action doRejectSpellAreaDeliveryInsideAura = all {
    qState' = antimagicMagicalEffectInterdictionState(
      true,
      false,
      true,
      true,
      witnessInvalid(AntimagicMagicalEffectInterdiction, WInvalidFill)
    ),
  }

  action doRejectObjectContactDeliveryInsideAura = all {
    qState' = antimagicMagicalEffectInterdictionState(
      true,
      true,
      false,
      true,
      witnessInvalid(AntimagicMagicalEffectInterdiction, WInvalidFill)
    ),
  }

  action doRejectOtherMagicalEffectTargetInsideAura = all {
    qState' = antimagicMagicalEffectInterdictionState(
      true,
      true,
      true,
      false,
      witnessInvalid(AntimagicMagicalEffectInterdiction, WInvalidFill)
    ),
  }

  action step = any {
    any { doAllowOutsideAura, },
    any { doRejectSpellTargetInsideAura, },
    any { doRejectSpellAreaDeliveryInsideAura, },
    any { doRejectObjectContactDeliveryInsideAura, },
    any { doRejectOtherMagicalEffectTargetInsideAura, },
  }
}
