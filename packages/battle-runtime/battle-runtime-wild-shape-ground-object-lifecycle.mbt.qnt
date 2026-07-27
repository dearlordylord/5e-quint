// -*- mode: Bluespec; -*-

module battleRuntimeWildShapeGroundObjectLifecycleMbt {
  type WildShapeUses = FourUses | ThreeUses | TwoUses
  type WildShapeGroundObjectLifecycle =
    | EffectiveLoadout({ uses: WildShapeUses })
    | Grounded({ formActive: bool, uses: WildShapeUses })
    | MergedForm({ uses: WildShapeUses })

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
  // - .references/srd-5.2.1/Equipment.md#Getting Into and Out of Armor:
  //   armor has explicit donning times; pickup cannot restore it as equipped.
  //   The Armor table separately requires a Utilize action to don a Shield.
  // - UBIQUITOUS_LANGUAGE.md: Character Sheet, Creature, and Action Lifecycle.
  //
  // The lifecycle variant separates effective-loadout, grounded, and
  // merged-form custody. Its payload retains only independently meaningful
  // facts: form activity for a grounded object and remaining uses. Armor and
  // Shield pickup rejection are separate focused runtime scenarios because
  // object kind cannot change during a custody lifecycle.

  action init = qState' = EffectiveLoadout({ uses: FourUses })

  action doFallOnWildShape = all {
    qState == EffectiveLoadout({ uses: FourUses }),
    qState' = Grounded({
      formActive: true,
      uses: ThreeUses,
    }),
  }

  action doRevertFallen = all {
    qState == Grounded({
      formActive: true,
      uses: ThreeUses,
    }),
    qState' = Grounded({
      formActive: false,
      uses: ThreeUses,
    }),
  }

  action doPickupFallenWeapon = all {
    qState == Grounded({
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = EffectiveLoadout({ uses: ThreeUses }),
  }

  action doAssumeAgainWhileFallen = all {
    qState == Grounded({
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = Grounded({
      formActive: true,
      uses: TwoUses,
    }),
  }

  action doRevertFallenAgain = all {
    qState == Grounded({
      formActive: true,
      uses: TwoUses,
    }),
    qState' = Grounded({
      formActive: false,
      uses: TwoUses,
    }),
  }

  action doPickupFallenWeaponAgain = all {
    qState == Grounded({
      formActive: false,
      uses: TwoUses,
    }),
    qState' = EffectiveLoadout({ uses: TwoUses }),
  }

  action doMergeOnWildShape = all {
    qState == EffectiveLoadout({ uses: FourUses }),
    qState' = MergedForm({ uses: ThreeUses }),
  }

  action doRevertMerged = all {
    qState == MergedForm({ uses: ThreeUses }),
    qState' = EffectiveLoadout({ uses: ThreeUses }),
  }

  action doStutter = qState' = qState

  action step = any {
    doFallOnWildShape,
    doRevertFallen,
    doPickupFallenWeapon,
    doAssumeAgainWhileFallen,
    doRevertFallenAgain,
    doPickupFallenWeaponAgain,
    doMergeOnWildShape,
    doRevertMerged,
    doStutter,
  }
}
