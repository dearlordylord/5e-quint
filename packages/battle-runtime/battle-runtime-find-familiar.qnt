// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.companion-lifecycle

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
//
// Focused semantic core for SRD Find Familiar companion lifecycle state.
// RAW anchors:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md lines 305-315:
//   chosen form and creature type, one-familiar replacement, own Initiative,
//   no ordinary attacks, telepathy, shared senses, Touch spell delivery,
//   temporary/permanent dismissal, 0-HP disappearance, and carried item drops.
// - .references/srd-5.2.1/Classes/Warlock.md lines 280-286:
//   Pact of the Chain Find Familiar access, special form choice, and owner
//   Attack-action forgo/reaction familiar attack.
// - .references/srd-5.2.1/Classes/Druid.md lines 124-128:
//   Wild Companion casts Find Familiar with a fixed Fey familiar that disappears
//   when the Druid finishes a Long Rest.
// - UBIQUITOUS_LANGUAGE.md: Companion Control, Companion Execution, Magic
//   Action, Bonus Action, Reaction, and Attack Roll.

module battleRuntimeFindFamiliar {
  import battleRuntimeSpawnedCompanionLifecycle.* from "./battle-runtime-spawned-companion-lifecycle"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def spawnedCompanionStageForFindFamiliar(
    lifecycle: FindFamiliarLifecycle,
  ): SpawnedCompanionLifecycleStage =
    match lifecycle {
      | NoFindFamiliar => NoSpawnedCompanion
      | PresentFindFamiliar(_) => PresentSpawnedCompanion
      | TemporarilyDismissedFindFamiliar(_) => TemporarilyDismissedSpawnedCompanion
      | DisappearedAtZeroHitPointsFindFamiliar(_) => DisappearedAtZeroHitPointsSpawnedCompanion
      | DismissedForeverFindFamiliar(_) => PermanentlyDismissedSpawnedCompanion
    }

  pure def castFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    ordinaryCombatants: Set[Actor],
    owner: Actor,
    familiar: Actor,
    form: FindFamiliarForm,
    creatureTypeOverride: FindFamiliarCreatureTypeOverride,
    initiative: int
  ): FindFamiliarLifecycle =
    match prior {
      | PresentFindFamiliar(present) =>
        if (owner == present.owner and spawnedCompanionIdentityAdmitted(
          owner == present.familiar,
          ordinaryCombatants.contains(present.familiar),
        )) {
          PresentFindFamiliar({
            owner: owner,
            familiar: present.familiar,
            identity: present.identity,
            protocol: OrdinaryFamiliarLikeOneAtATime,
            form: form,
            creatureTypeOverride: creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
            reactionAvailable: present.reactionAvailable,
          })
        } else prior
      | TemporarilyDismissedFindFamiliar(absent) =>
        if (not(spawnedCompanionIdentityAdmitted(owner == familiar, ordinaryCombatants.contains(familiar)))) prior
        else
          PresentFindFamiliar({
            owner: owner,
            familiar: familiar,
            identity: absent.identity,
            protocol: OrdinaryFamiliarLikeOneAtATime,
            form: form,
            creatureTypeOverride: creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
            reactionAvailable: absent.reactionAvailable,
          })
      | DisappearedAtZeroHitPointsFindFamiliar(absent) =>
        if (not(spawnedCompanionIdentityAdmitted(owner == familiar, ordinaryCombatants.contains(familiar)))) prior
        else
          PresentFindFamiliar({
            owner: owner,
            familiar: familiar,
            identity: absent.identity,
            protocol: OrdinaryFamiliarLikeOneAtATime,
            form: form,
            creatureTypeOverride: creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
            reactionAvailable: absent.reactionAvailable,
          })
      | _ =>
        if (not(spawnedCompanionIdentityAdmitted(owner == familiar, ordinaryCombatants.contains(familiar)))) prior
        else
          PresentFindFamiliar({
            owner: owner,
            familiar: familiar,
            identity: BattleOnlyFindFamiliarIdentity,
            protocol: OrdinaryFamiliarLikeOneAtATime,
            form: form,
            creatureTypeOverride: creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
            reactionAvailable: true,
          })
    }

  pure def admitRetainedFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    ordinaryCombatants: Set[Actor],
    owner: Actor,
    familiar: Actor,
    durableCompanion: Actor,
    protocol: FindFamiliarProtocol,
    form: FindFamiliarForm,
    creatureTypeOverride: FindFamiliarCreatureTypeOverride,
    initiative: int
  ): FindFamiliarLifecycle =
    if (not(spawnedCompanionIdentityAdmitted(owner == familiar, ordinaryCombatants.contains(familiar)))) prior
    else
      PresentFindFamiliar({
        owner: owner,
        familiar: familiar,
        identity: RetainedFindFamiliarIdentity({ durableCompanion: durableCompanion }),
        protocol: protocol,
        form: form,
        creatureTypeOverride: creatureTypeOverride,
        initiative: initiative,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
        reactionAvailable: true,
      })

  pure def temporarilyDismissFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    magicActionAvailable: bool,
    heldObjectIds: Set[int]
  ): FindFamiliarLifecycleResult =
    match prior {
      | PresentFindFamiliar(present) =>
        if (
          spawnedCompanionStageAfterTemporaryDismissal(
            spawnedCompanionStageForFindFamiliar(prior),
            magicActionAvailable,
          ) == TemporarilyDismissedSpawnedCompanion
        ) {
          lifecycle: TemporarilyDismissedFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
            form: present.form,
            creatureTypeOverride: present.creatureTypeOverride,
            reactionAvailable: present.reactionAvailable,
          }),
          itemDropBoundaryEvents: heldObjectIds.map(objectId => {
            owner: present.owner,
            familiar: present.familiar,
            objectId: objectId,
          }),
          magicActionSpent: true,
        } else {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | _ => {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
    }

  // Permanent dismissal retains owner+identity as the DismissedForeverFindFamiliar
  // tombstone (not NoFindFamiliar) so settlement can clear the owner's durable
  // companion slot rather than conflating it with "never admitted".
  pure def permanentlyDismissFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle
  ): FindFamiliarLifecycleResult = {
    val nextStage = spawnedCompanionStageAfterPermanentDismissal(
      spawnedCompanionStageForFindFamiliar(prior),
    )
    match prior {
      | PresentFindFamiliar(present) => {
          lifecycle: if (nextStage == PermanentlyDismissedSpawnedCompanion) DismissedForeverFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
          }) else prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | TemporarilyDismissedFindFamiliar(absent) => {
          lifecycle: if (nextStage == PermanentlyDismissedSpawnedCompanion) DismissedForeverFindFamiliar({
            owner: absent.owner,
            identity: absent.identity,
            protocol: absent.protocol,
          }) else prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | DisappearedAtZeroHitPointsFindFamiliar(absent) => {
          lifecycle: if (nextStage == PermanentlyDismissedSpawnedCompanion) DismissedForeverFindFamiliar({
            owner: absent.owner,
            identity: absent.identity,
            protocol: absent.protocol,
          }) else prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | DismissedForeverFindFamiliar(_) => {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | NoFindFamiliar => {
          lifecycle: NoFindFamiliar,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
      }
    }
  }

  pure def reappearFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    ordinaryCombatants: Set[Actor],
    familiar: Actor,
    initiative: int,
    magicActionAvailable: bool
  ): FindFamiliarLifecycleResult =
    match prior {
      | TemporarilyDismissedFindFamiliar(absent) =>
        if (spawnedCompanionStageAfterReappearance(
          spawnedCompanionStageForFindFamiliar(prior),
          magicActionAvailable,
          spawnedCompanionIdentityAdmitted(
            absent.owner == familiar,
            ordinaryCombatants.contains(familiar),
          ),
        ) == PresentSpawnedCompanion) {
          lifecycle: PresentFindFamiliar({
            owner: absent.owner,
            familiar: familiar,
            identity: absent.identity,
            protocol: absent.protocol,
            form: absent.form,
            creatureTypeOverride: absent.creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithin30Feet,
            reactionAvailable: absent.reactionAvailable,
          }),
          itemDropBoundaryEvents: Set(),
          magicActionSpent: true,
        } else {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | _ => {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
    }

  pure def zeroHitPointDisappearFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    heldObjectIds: Set[int]
  ): FindFamiliarLifecycleResult =
    match prior {
      | PresentFindFamiliar(present) => {
          lifecycle: if (spawnedCompanionStageAfterZeroHitPoints(
            spawnedCompanionStageForFindFamiliar(prior),
          ) == DisappearedAtZeroHitPointsSpawnedCompanion) DisappearedAtZeroHitPointsFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
            form: present.form,
            creatureTypeOverride: present.creatureTypeOverride,
            reactionAvailable: present.reactionAvailable,
          }) else prior,
          itemDropBoundaryEvents: heldObjectIds.map(objectId => {
            owner: present.owner,
            familiar: present.familiar,
            objectId: objectId,
          }),
          magicActionSpent: false,
        }
      | _ => {
          lifecycle: prior,
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
    }

  pure def findFamiliarCombatants(lifecycle: FindFamiliarLifecycle): Set[Actor] =
    match lifecycle {
      | PresentFindFamiliar(present) => Set(present.familiar)
      | _ => Set()
    }

  pure def battleCombatantsWithFindFamiliar(baseCombatants: Set[Actor], lifecycle: FindFamiliarLifecycle): Set[Actor] =
    baseCombatants.union(findFamiliarCombatants(lifecycle))

  pure def actorIsPresentFindFamiliar(lifecycle: FindFamiliarLifecycle, actor: Actor): bool =
    findFamiliarCombatants(lifecycle).contains(actor)

  pure def findFamiliarNonAttackActionAvailable(lifecycle: FindFamiliarLifecycle, actor: Actor, actionAvailable: bool): bool =
    actorIsPresentFindFamiliar(lifecycle, actor) and actionAvailable

  pure def ordinaryAttackActionAvailableForActor(lifecycle: FindFamiliarLifecycle, actor: Actor, actionAvailable: bool): bool =
    spawnedCompanionOrdinaryAttackAvailable(actorIsPresentFindFamiliar(lifecycle, actor), actionAvailable)

  pure def opportunityAttackAvailableForActor(lifecycle: FindFamiliarLifecycle, actor: Actor, reactionAvailable: bool): bool =
    spawnedCompanionOpportunityAttackAvailable(actorIsPresentFindFamiliar(lifecycle, actor), reactionAvailable)

  pure def findFamiliarTelepathicConnection(
    lifecycle: FindFamiliarLifecycle,
    owner: Actor,
    familiarWithin100Feet: bool,
  ): Set[FindFamiliarTelepathicConnection] =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (spawnedCompanionConnectionAvailable(present.owner == owner, familiarWithin100Feet))
          Set({
            owner: present.owner,
            familiar: present.familiar,
            rangeFeet: 100,
            sharedLanguageRequired: false,
          })
        else Set()
      | _ => Set()
    }

  pure def shareFindFamiliarSenses(
    lifecycle: FindFamiliarLifecycle,
    owner: Actor,
    familiarWithin100Feet: bool,
    bonusActionAvailable: bool,
  ): Set[FindFamiliarSharedSenses] =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (spawnedCompanionSharedSensesAvailable(
          present.owner == owner,
          familiarWithin100Feet,
          bonusActionAvailable,
        ))
          Set({
            owner: present.owner,
            familiar: present.familiar,
            expiresAtStartOfOwnerNextTurn: true,
            gainsSight: true,
            gainsHearing: true,
            gainsSpecialSenses: true,
          })
        else Set()
      | _ => Set()
    }

  pure def findFamiliarTouchSpellDelivery(
    lifecycle: FindFamiliarLifecycle,
    owner: Actor,
    spellHasTouchRange: bool,
    familiarWithin100Feet: bool,
  ): FindFamiliarTouchSpellDelivery =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (spawnedCompanionTouchDeliveryAvailable(
          present.owner == owner,
          spellHasTouchRange,
          familiarWithin100Feet,
          present.reactionAvailable,
        ))
          { spellCast: true, familiarReactionSpent: true }
        else
          { spellCast: false, familiarReactionSpent: false }
      | _ => { spellCast: false, familiarReactionSpent: false }
    }

  pure def pactOfTheChainFamiliarReactionAttack(
    lifecycle: FindFamiliarLifecycle,
    owner: Actor,
    pactOfTheChainSelected: bool,
    ownerAttackActionAttackAvailable: bool,
    supportedFamiliarActionAttack: bool,
  ): PactOfTheChainFamiliarReactionAttack =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (spawnedCompanionGrantedReactionAttackAvailable(
          present.owner == owner,
          pactOfTheChainSelected,
          ownerAttackActionAttackAvailable,
          present.reactionAvailable,
          supportedFamiliarActionAttack,
        ))
          PactFamiliarReactionAttackResolved
        else
          PactFamiliarReactionAttackRejected
      | _ => PactFamiliarReactionAttackRejected
    }
}
