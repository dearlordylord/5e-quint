// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
//
// Composite slice for Mirror Image attack-roll hit interception. The slice
// starts after the caller has resolved an Attack Roll hit/miss fact and stops
// before normal attack damage application.
//
// Intentionally out of scope:
//   - spell casting, Spell Slot spending, duration ticking, and Concentration
//   - Armor Class, d20 attack resolution, target selection, and damage rolls
//   - Hit Point damage, death/Unconscious lifecycle, and initiative
//   - spatial adjudication for whether Blindsight or Truesight applies

module battleRuntimeMirrorImageHitInterception {
  import battleRuntimeMirrorImageConstants.* from "./battle-runtime-mirror-image-constants"

  pure def mirrorImageHitInterceptionInitialDuplicates: int =
    mirrorImageInitialDuplicates

  type MirrorImageHitInterceptionInputState = {
    remainingDuplicates: int,
  }

  type MirrorImageHitInterceptionState = {
    remainingDuplicates: int,
    normalDamageContinues: bool,
  }

  type MirrorImageHitInterceptionFills = {
    attackHits: bool,
    attackerBlinded: bool,
    attackerHasBlindsight: bool,
    attackerHasTruesight: bool,
    duplicateRollSucceeds: bool,
  }

  pure def mirrorImageAttackerUnaffectedByFacts(fills: MirrorImageHitInterceptionFills): bool =
    fills.attackerBlinded
      or fills.attackerHasBlindsight
      or fills.attackerHasTruesight

  pure def mirrorImageHitInterceptionDuplicateCountAfterDestroy(remainingDuplicates: int): int =
    if (remainingDuplicates < 2) 0 else remainingDuplicates - 1

  pure def resolveMirrorImageHitInterception(
    state: MirrorImageHitInterceptionInputState,
    fills: MirrorImageHitInterceptionFills,
  ): MirrorImageHitInterceptionState =
    if (not(fills.attackHits)) {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: false,
    } else if (
      state.remainingDuplicates == 0 or mirrorImageAttackerUnaffectedByFacts(fills)
    ) {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: true,
    } else if (not(fills.duplicateRollSucceeds)) {
      remainingDuplicates: state.remainingDuplicates,
      normalDamageContinues: true,
    } else {
      remainingDuplicates:
        mirrorImageHitInterceptionDuplicateCountAfterDestroy(state.remainingDuplicates),
      normalDamageContinues: false,
    }
}
