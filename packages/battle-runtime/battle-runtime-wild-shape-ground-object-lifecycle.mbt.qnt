// -*- mode: Bluespec; -*-

module battleRuntimeWildShapeGroundObjectLifecycleMbt {
  type WildShapeGroundObjectLifecycle =
    | HeldWithFourUses
    | FallenActive
    | FallenReverted
    | HeldWithThreeUses
    | MergedActive

  var qState: WildShapeGroundObjectLifecycle

  // RAW trace:
  // - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape,
  //   Objects: equipment can fall in the space, merge into the form, or be
  //   worn. Merged equipment has no effect until the form ends.
  // - .references/srd-5.2.1/Classes/Druid.md#Druid Features:
  //   the level-17 Number of Uses entry grants four Wild Shape uses, and
  //   assuming a form expends one use.
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh:
  //   the spell requires a Club or Quarterstaff the caster is holding.
  // - .references/srd-5.2.1/Playing-the-Game.md#Interacting with Things:
  //   picking up an object is an object interaction.
  // - UBIQUITOUS_LANGUAGE.md: Character Sheet, Creature, and Action Lifecycle.
  //
  // The lifecycle variant is the only stored fact. Custody, form activity,
  // Shillelagh eligibility, provenance, and remaining Wild Shape uses are
  // projections of that phase, so contradictory combinations are
  // unrepresentable.

  action init = qState' = HeldWithFourUses

  action doFallOnWildShape = all {
    qState == HeldWithFourUses,
    qState' = FallenActive,
  }

  action doRevertFallen = all {
    qState == FallenActive,
    qState' = FallenReverted,
  }

  action doPickupFallen = all {
    qState == FallenReverted,
    qState' = HeldWithThreeUses,
  }

  action doMergeOnWildShape = all {
    qState == HeldWithFourUses,
    qState' = MergedActive,
  }

  action doRevertMerged = all {
    qState == MergedActive,
    qState' = HeldWithThreeUses,
  }

  action doStutter = qState' = qState

  action step = any {
    doFallOnWildShape,
    doRevertFallen,
    doPickupFallen,
    doMergeOnWildShape,
    doRevertMerged,
    doStutter,
  }
}
