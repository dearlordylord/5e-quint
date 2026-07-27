// -*- mode: Bluespec; -*-

module battleRuntimeWildShapeGroundObjectLifecycleMbt {
  type LifecycleObjectKind = Weapon | Armor | Shield
  type WildShapeUses = FourUses | ThreeUses | TwoUses
  type WildShapeGroundObjectLifecycle =
    | EffectiveLoadout({ objectKind: LifecycleObjectKind, uses: WildShapeUses })
    | Grounded({ objectKind: LifecycleObjectKind, formActive: bool, uses: WildShapeUses })
    | MergedForm({ objectKind: LifecycleObjectKind, uses: WildShapeUses })

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
  // facts: object kind, form activity for a grounded object, and uses.

  action init = qState' =
    EffectiveLoadout({ objectKind: Weapon, uses: FourUses })

  action doFallOnWildShape = all {
    qState == EffectiveLoadout({ objectKind: Weapon, uses: FourUses }),
    qState' = Grounded({
      objectKind: Weapon,
      formActive: true,
      uses: ThreeUses,
    }),
  }

  action doRevertFallen = all {
    qState == Grounded({
      objectKind: Weapon,
      formActive: true,
      uses: ThreeUses,
    }),
    qState' = Grounded({
      objectKind: Weapon,
      formActive: false,
      uses: ThreeUses,
    }),
  }

  action doPickupFallenWeapon = all {
    qState == Grounded({
      objectKind: Weapon,
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = EffectiveLoadout({ objectKind: Weapon, uses: ThreeUses }),
  }

  action doAssumeAgainWhileFallen = all {
    qState == Grounded({
      objectKind: Weapon,
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = Grounded({
      objectKind: Weapon,
      formActive: true,
      uses: TwoUses,
    }),
  }

  action doRevertFallenAgain = all {
    qState == Grounded({
      objectKind: Weapon,
      formActive: true,
      uses: TwoUses,
    }),
    qState' = Grounded({
      objectKind: Weapon,
      formActive: false,
      uses: TwoUses,
    }),
  }

  action doPickupFallenWeaponAgain = all {
    qState == Grounded({
      objectKind: Weapon,
      formActive: false,
      uses: TwoUses,
    }),
    qState' = EffectiveLoadout({ objectKind: Weapon, uses: TwoUses }),
  }

  action doFallArmorAndRevert = all {
    qState == EffectiveLoadout({ objectKind: Weapon, uses: FourUses }),
    qState' = Grounded({
      objectKind: Armor,
      formActive: false,
      uses: ThreeUses,
    }),
  }

  action doRejectArmorHeldWeaponPickup = all {
    qState == Grounded({
      objectKind: Armor,
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = qState,
  }

  action doFallShieldAndRevert = all {
    qState == EffectiveLoadout({ objectKind: Weapon, uses: FourUses }),
    qState' = Grounded({
      objectKind: Shield,
      formActive: false,
      uses: ThreeUses,
    }),
  }

  action doRejectShieldHeldWeaponPickup = all {
    qState == Grounded({
      objectKind: Shield,
      formActive: false,
      uses: ThreeUses,
    }),
    qState' = qState,
  }

  action doMergeOnWildShape = all {
    qState == EffectiveLoadout({ objectKind: Weapon, uses: FourUses }),
    qState' = MergedForm({ objectKind: Weapon, uses: ThreeUses }),
  }

  action doRevertMerged = all {
    qState == MergedForm({ objectKind: Weapon, uses: ThreeUses }),
    qState' = EffectiveLoadout({ objectKind: Weapon, uses: ThreeUses }),
  }

  action doStutter = qState' = qState

  action step = any {
    doFallOnWildShape,
    doRevertFallen,
    doPickupFallenWeapon,
    doAssumeAgainWhileFallen,
    doRevertFallenAgain,
    doPickupFallenWeaponAgain,
    doFallArmorAndRevert,
    doRejectArmorHeldWeaponPickup,
    doFallShieldAndRevert,
    doRejectShieldHeldWeaponPickup,
    doMergeOnWildShape,
    doRevertMerged,
    doStutter,
  }
}
