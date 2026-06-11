// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.find-familiar-lifecycle

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
  import battleRuntimeModel.* from "./battle-runtime-model"

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
        if (owner == present.owner and owner != present.familiar and not(ordinaryCombatants.contains(present.familiar))) {
          PresentFindFamiliar({
            owner: owner,
            familiar: present.familiar,
            identity: present.identity,
            protocol: OrdinaryFamiliarLikeOneAtATime,
            form: form,
            creatureTypeOverride: creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
          })
        } else prior
      | _ =>
        if (owner == familiar or ordinaryCombatants.contains(familiar)) prior
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
    if (owner == familiar or ordinaryCombatants.contains(familiar)) prior
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
      })

  pure def temporarilyDismissFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    magicActionAvailable: bool,
    heldObjectIds: Set[int]
  ): FindFamiliarLifecycleResult =
    match prior {
      | PresentFindFamiliar(present) =>
        if (magicActionAvailable) {
          lifecycle: TemporarilyDismissedFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
            form: present.form,
            creatureTypeOverride: present.creatureTypeOverride,
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
  ): FindFamiliarLifecycleResult =
    match prior {
      | PresentFindFamiliar(present) => {
          lifecycle: DismissedForeverFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
          }),
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | TemporarilyDismissedFindFamiliar(absent) => {
          lifecycle: DismissedForeverFindFamiliar({
            owner: absent.owner,
            identity: absent.identity,
            protocol: absent.protocol,
          }),
          itemDropBoundaryEvents: Set(),
          magicActionSpent: false,
        }
      | DisappearedAtZeroHitPointsFindFamiliar(absent) => {
          lifecycle: DismissedForeverFindFamiliar({
            owner: absent.owner,
            identity: absent.identity,
            protocol: absent.protocol,
          }),
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

  pure def reappearFindFamiliarLifecycle(
    prior: FindFamiliarLifecycle,
    ordinaryCombatants: Set[Actor],
    familiar: Actor,
    initiative: int,
    magicActionAvailable: bool
  ): FindFamiliarLifecycleResult =
    match prior {
      | TemporarilyDismissedFindFamiliar(absent) =>
        if (magicActionAvailable and absent.owner != familiar and not(ordinaryCombatants.contains(familiar))) {
          lifecycle: PresentFindFamiliar({
            owner: absent.owner,
            familiar: familiar,
            identity: absent.identity,
            protocol: absent.protocol,
            form: absent.form,
            creatureTypeOverride: absent.creatureTypeOverride,
            initiative: initiative,
            placement: FindFamiliarUnoccupiedSpaceWithin30Feet,
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
          lifecycle: DisappearedAtZeroHitPointsFindFamiliar({
            owner: present.owner,
            identity: present.identity,
            protocol: present.protocol,
            form: present.form,
            creatureTypeOverride: present.creatureTypeOverride,
          }),
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
    if (actorIsPresentFindFamiliar(lifecycle, actor)) false else actionAvailable

  pure def opportunityAttackAvailableForActor(lifecycle: FindFamiliarLifecycle, actor: Actor, reactionAvailable: bool): bool =
    if (actorIsPresentFindFamiliar(lifecycle, actor)) false else reactionAvailable

  pure def findFamiliarTelepathicConnection(
    lifecycle: FindFamiliarLifecycle,
    owner: Actor,
    familiarWithin100Feet: bool,
  ): Set[FindFamiliarTelepathicConnection] =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (present.owner == owner and familiarWithin100Feet)
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
        if (present.owner == owner and familiarWithin100Feet and bonusActionAvailable)
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
    familiarReactionAvailable: bool,
  ): FindFamiliarTouchSpellDelivery =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (present.owner == owner and spellHasTouchRange and familiarWithin100Feet and familiarReactionAvailable)
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
    familiarReactionAvailable: bool,
    supportedFamiliarActionAttack: bool,
  ): PactOfTheChainFamiliarReactionAttack =
    match lifecycle {
      | PresentFindFamiliar(present) =>
        if (
          present.owner == owner and
          pactOfTheChainSelected and
          ownerAttackActionAttackAvailable and
          familiarReactionAvailable and
          supportedFamiliarActionAttack
        )
          PactFamiliarReactionAttackResolved
        else
          PactFamiliarReactionAttackRejected
      | _ => PactFamiliarReactionAttackRejected
    }
}
