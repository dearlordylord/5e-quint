// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
//
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points:
//   a creature that reaches 0 Hit Points and does not die instantly gains the
//   Unconscious condition.
// - .references/srd-5.2.1/Rules-Glossary.md#Unconscious: Unconscious implies
//   Incapacitated.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration and #Incapacitated:
//   Concentration ends when the creature has the Incapacitated condition.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith:
//   the concentrating spell grants +2 AC to a selected creature.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast:
//   separate attack rolls resolve for separate beams.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Unconscious, Incapacitated,
//   Concentration, Spell Effect.
//
// Boundary: bounded fixture-world composition witness for a same-resolution
// ordering seam. Eldritch Blast drops a concentrating Shield of Faith source to
// 0 HP with the first beam; dropping that source to 0 HP tears down the linked
// Spell Effect before the second beam's attack is evaluated.
module battleRuntimeZeroHitPointMidResolutionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | ZeroHitPointMidResolution

  type ZeroHitPointMidResolutionScenario =
    | Init
    | SpellAttackSequenceResolved

  type WitnessState = {
    qScenario: ZeroHitPointMidResolutionScenario,
    qSourceHp: int,
    qSourceUnconscious: bool,
    qSourceConcentrating: bool,
    qShieldOfFaithPresent: bool,
    qProtectedTargetHp: int,
    qSourceDamage: int,
    qProtectedTargetDamage: int,
    qProtectedTargetDamageIfShieldOfFaithRemained: int,
    qZeroHpAppliedBeforeSecondBeam: bool,
    qTeardownBeforeSecondBeam: bool,
    qRemainderUsedPostTeardownState: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qScenario: ZeroHitPointMidResolutionScenario = qState.qScenario
  pure def qSourceHp: int = qState.qSourceHp
  pure def qSourceUnconscious: bool = qState.qSourceUnconscious
  pure def qSourceConcentrating: bool = qState.qSourceConcentrating
  pure def qShieldOfFaithPresent: bool = qState.qShieldOfFaithPresent
  pure def qProtectedTargetHp: int = qState.qProtectedTargetHp
  pure def qSourceDamage: int = qState.qSourceDamage
  pure def qProtectedTargetDamage: int = qState.qProtectedTargetDamage
  pure def qProtectedTargetDamageIfShieldOfFaithRemained: int =
    qState.qProtectedTargetDamageIfShieldOfFaithRemained
  pure def qZeroHpAppliedBeforeSecondBeam: bool = qState.qZeroHpAppliedBeforeSecondBeam
  pure def qTeardownBeforeSecondBeam: bool = qState.qTeardownBeforeSecondBeam
  pure def qRemainderUsedPostTeardownState: bool = qState.qRemainderUsedPostTeardownState

  action recordProjection(
    scenario: ZeroHitPointMidResolutionScenario,
    sourceHp: int,
    sourceUnconscious: bool,
    sourceConcentrating: bool,
    shieldOfFaithPresent: bool,
    protectedTargetHp: int,
    sourceDamage: int,
    protectedTargetDamage: int,
    protectedTargetDamageIfShieldOfFaithRemained: int,
    zeroHpAppliedBeforeSecondBeam: bool,
    teardownBeforeSecondBeam: bool,
    remainderUsedPostTeardownState: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qSourceHp: sourceHp,
      qSourceUnconscious: sourceUnconscious,
      qSourceConcentrating: sourceConcentrating,
      qShieldOfFaithPresent: shieldOfFaithPresent,
      qProtectedTargetHp: protectedTargetHp,
      qSourceDamage: sourceDamage,
      qProtectedTargetDamage: protectedTargetDamage,
      qProtectedTargetDamageIfShieldOfFaithRemained: protectedTargetDamageIfShieldOfFaithRemained,
      qZeroHpAppliedBeforeSecondBeam: zeroHpAppliedBeforeSecondBeam,
      qTeardownBeforeSecondBeam: teardownBeforeSecondBeam,
      qRemainderUsedPostTeardownState: remainderUsedPostTeardownState,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    Init,
    4,
    false,
    true,
    true,
    12,
    0,
    0,
    0,
    false,
    false,
    false,
    witnessInit(ZeroHitPointMidResolution),
  )

  action doResolveEldritchBlast = all {
    qScenario == Init,
    recordProjection(
      SpellAttackSequenceResolved,
      0,
      true,
      false,
      false,
      8,
      6,
      4,
      0,
      true,
      true,
      true,
      witnessResolved(ZeroHitPointMidResolution),
    ),
  }

  action step = any {
    doResolveEldritchBlast,
  }
}
