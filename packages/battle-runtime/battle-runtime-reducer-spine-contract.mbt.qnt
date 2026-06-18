// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT

module battleRuntimeReducerSpineContractMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Thin reducer-spine witness, not a rule owner. Weapon attack, spell slot,
  // damage, turn-boundary, and interrupt details remain with focused QNT owners.

  type ReducerSpineStage =
    | ReducerNotStarted
    | ReducerBattleStarted
    | ReducerActDiscovered
    | ReducerSubjectNeedsHoles
    | ReducerSubjectResolved
    | ReducerTurnAdvanced

  type ReducerSpineEntrypoint =
    | NoReducerEntrypoint
    | StartBattleEntrypoint
    | DiscoverBattleActsEntrypoint
    | ResolveBattleSubjectEntrypoint

  type ReducerSpineSubject =
    | NoReducerSubject
    | SlotSpellSubject
    | WeaponAttackSubject
    | EndTurnSubject

  type ReducerSpineActor =
    | NoSpineActor
    | CasterActor
    | TargetActor

  type ReducerSpineSpellSlotUse =
    | NoSpellSlotUse
    | PendingSpellSlotUse
    | CommittedSpellSlotUse

  var qStage: ReducerSpineStage
  var qEntrypoint: ReducerSpineEntrypoint
  var qSubject: ReducerSpineSubject
  var qCurrentActor: ReducerSpineActor
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qCasterReactionAvailable: bool
  var qTargetReactionAvailable: bool
  var qSpellSlotUse: ReducerSpineSpellSlotUse
  var qInterruptDepth: int
  var qCasterHp: int
  var qTargetHp: int

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  action init = all {
    qStage' = ReducerNotStarted,
    qEntrypoint' = NoReducerEntrypoint,
    qSubject' = NoReducerSubject,
    qCurrentActor' = NoSpineActor,
    qProtocol' = witnessInit(witnessHoleType),
    qActionAvailable' = false,
    qBonusActionAvailable' = false,
    qCasterReactionAvailable' = false,
    qTargetReactionAvailable' = false,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 0,
    qTargetHp' = 0,
  }

  // startBattle creates durable battle reducer state from creature init.
  action doStartBattle = all {
    qStage == ReducerNotStarted,
    qStage' = ReducerBattleStarted,
    qEntrypoint' = StartBattleEntrypoint,
    qSubject' = NoReducerSubject,
    qCurrentActor' = CasterActor,
    qProtocol' = witnessResolved(witnessHoleType),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 13,
  }

  // discoverBattleActs projects the current actor's legal frontier and initial
  // public holes without mutating reducer-owned vitals.
  action doDiscoverSlotSpell = all {
    qStage == ReducerBattleStarted,
    qStage' = ReducerActDiscovered,
    qEntrypoint' = DiscoverBattleActsEntrypoint,
    qSubject' = SlotSpellSubject,
    qCurrentActor' = CasterActor,
    qProtocol' = witnessNeedsHoles(Set(SpellTargetAllocationHoleKind)),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 13,
  }

  // resolveBattleSubject accepts the table's spell targeting fill and advances
  // the public frontier. This fixture's slot is committed when damage resolves.
  action doResolveSlotSpellTargets = all {
    qStage == ReducerActDiscovered,
    qSubject == SlotSpellSubject,
    qProtocol.holes == Set(SpellTargetAllocationHoleKind),
    qStage' = ReducerSubjectNeedsHoles,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = SlotSpellSubject,
    qCurrentActor' = CasterActor,
    qProtocol' = witnessNeedsHoles(Set(RolledDiceHoleKind)),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 13,
  }

  // Accepted damage commits the slot use and mutates battle-owned Hit Points.
  action doResolveSlotSpellDamage = all {
    qStage == ReducerSubjectNeedsHoles,
    qSubject == SlotSpellSubject,
    qProtocol.holes == Set(RolledDiceHoleKind),
    qStage' = ReducerSubjectResolved,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = SlotSpellSubject,
    qCurrentActor' = CasterActor,
    qProtocol' = witnessResolved(witnessHoleType),
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = CommittedSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 7,
  }

  // End Turn is a runtime command subject resolved through the same reducer
  // entrypoint; it advances the durable turn owner and resets turn resources.
  action doEndTurnToTarget = all {
    qStage == ReducerSubjectResolved,
    qStage' = ReducerTurnAdvanced,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = EndTurnSubject,
    qCurrentActor' = TargetActor,
    qProtocol' = witnessResolved(witnessHoleType),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 7,
  }

  // The next actor's weapon attack reuses discoverBattleActs for its frontier.
  action doDiscoverWeaponAttack = all {
    qStage == ReducerTurnAdvanced,
    qStage' = ReducerActDiscovered,
    qEntrypoint' = DiscoverBattleActsEntrypoint,
    qSubject' = WeaponAttackSubject,
    qCurrentActor' = TargetActor,
    qProtocol' = witnessNeedsHoles(Set(TargetChoiceHoleKind)),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 7,
  }

  action doResolveWeaponTarget = all {
    qStage == ReducerActDiscovered,
    qSubject == WeaponAttackSubject,
    qProtocol.holes == Set(TargetChoiceHoleKind),
    qStage' = ReducerSubjectNeedsHoles,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = WeaponAttackSubject,
    qCurrentActor' = TargetActor,
    qProtocol' = witnessNeedsHoles(Set(AttackRollHoleKind)),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 7,
  }

  action doResolveWeaponAttackHit = all {
    qStage == ReducerSubjectNeedsHoles,
    qSubject == WeaponAttackSubject,
    qProtocol.holes == Set(AttackRollHoleKind),
    qStage' = ReducerSubjectNeedsHoles,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = WeaponAttackSubject,
    qCurrentActor' = TargetActor,
    qProtocol' = witnessNeedsHoles(Set(RolledDiceHoleKind)),
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 12,
    qTargetHp' = 7,
  }

  action doResolveWeaponDamage = all {
    qStage == ReducerSubjectNeedsHoles,
    qSubject == WeaponAttackSubject,
    qProtocol.holes == Set(RolledDiceHoleKind),
    qStage' = ReducerSubjectResolved,
    qEntrypoint' = ResolveBattleSubjectEntrypoint,
    qSubject' = WeaponAttackSubject,
    qCurrentActor' = TargetActor,
    qProtocol' = witnessResolved(witnessHoleType),
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qCasterReactionAvailable' = true,
    qTargetReactionAvailable' = true,
    qSpellSlotUse' = NoSpellSlotUse,
    qInterruptDepth' = 0,
    qCasterHp' = 6,
    qTargetHp' = 7,
  }

  action step = any {
    doStartBattle,
    doDiscoverSlotSpell,
    doResolveSlotSpellTargets,
    doResolveSlotSpellDamage,
    doEndTurnToTarget,
    doDiscoverWeaponAttack,
    doResolveWeaponTarget,
    doResolveWeaponAttackHit,
    doResolveWeaponDamage,
  }
}
