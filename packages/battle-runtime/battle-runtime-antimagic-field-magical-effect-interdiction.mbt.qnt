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
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
  //   spells, magic items, and other magical effects can't target or otherwise
  //   affect anything inside the aura.
  // - .references/srd-5.2.1/Rules-Glossary.md "Magical Effect": a magical
  //   effect is created by a spell, magic item, or magical phenomenon.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, and Spell Effect.
  var qSpellTargetAllowed: bool
  var qSpellAreaDeliveryAllowed: bool
  var qObjectContactDeliveryAllowed: bool
  var qOtherMagicalEffectTargetAllowed: bool
  var qLastResult: str

  action recordProjection(
    spellTargetAllowed: bool,
    spellAreaDeliveryAllowed: bool,
    objectContactDeliveryAllowed: bool,
    otherMagicalEffectTargetAllowed: bool,
    lastResult: str,
  ): bool = all {
    qSpellTargetAllowed' = spellTargetAllowed,
    qSpellAreaDeliveryAllowed' = spellAreaDeliveryAllowed,
    qObjectContactDeliveryAllowed' = objectContactDeliveryAllowed,
    qOtherMagicalEffectTargetAllowed' = otherMagicalEffectTargetAllowed,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, true, true, true, "init")

  action doAllowOutsideAura = recordProjection(true, true, true, true, "allowed")

  action doRejectSpellTargetInsideAura =
    recordProjection(false, true, true, true, "invalid")

  action doRejectSpellAreaDeliveryInsideAura =
    recordProjection(true, false, true, true, "invalid")

  action doRejectObjectContactDeliveryInsideAura =
    recordProjection(true, true, false, true, "invalid")

  action doRejectOtherMagicalEffectTargetInsideAura =
    recordProjection(true, true, true, false, "invalid")

  action step = any {
    doAllowOutsideAura,
    doRejectSpellTargetInsideAura,
    doRejectSpellAreaDeliveryInsideAura,
    doRejectObjectContactDeliveryInsideAura,
    doRejectOtherMagicalEffectTargetInsideAura,
  }
}
