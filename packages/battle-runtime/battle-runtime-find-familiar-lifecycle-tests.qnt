// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.companion-lifecycle

module battleRuntimeFindFamiliarLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"


  run test_find_familiar_cast_and_recast_keeps_one_owner_record = {
    val cat = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val rat = castFindFamiliarLifecycle(
      cat,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarRat,
      FindFamiliarCelestial,
      12
    )

    all {
      assert(cat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 18,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
        reactionAvailable: true,
      })),
      assert(findFamiliarCombatants(cat) == Set(Goblin)),
      assert(battleCombatantsWithFindFamiliar(Set(Fighter), cat) == Set(Fighter, Goblin)),
      assert(rat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarCelestial,
        initiative: 12,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
        reactionAvailable: true,
      })),
    }
  }

  run test_find_familiar_turn_resources_and_no_attack_gate = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )

    all {
      assert(actorIsPresentFindFamiliar(present, Goblin)),
      assert(not(actorIsPresentFindFamiliar(present, Fighter))),
      assert(findFamiliarNonAttackActionAvailable(present, Goblin, true)),
      assert(not(findFamiliarNonAttackActionAvailable(present, Goblin, false))),
      assert(not(ordinaryAttackActionAvailableForActor(present, Goblin, true))),
      assert(ordinaryAttackActionAvailableForActor(present, Fighter, true)),
      assert(not(opportunityAttackAvailableForActor(present, Goblin, true))),
      assert(opportunityAttackAvailableForActor(present, Fighter, true)),
    }
  }

  run test_find_familiar_cast_rejects_ordinary_combatant_identity = {
    val ownerCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val ordinaryCombatantCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter, Goblin),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )

    all {
      assert(ownerCollision == NoFindFamiliar),
      assert(ordinaryCombatantCollision == NoFindFamiliar),
    }
  }

  run test_find_familiar_dismiss_reappear_and_drop_events = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFiend,
      16
    )
    val dismissed = temporarilyDismissFindFamiliarLifecycle(present, true, Set(1))
    val blockedReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      false
    )
    val blockedIdentityReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter, Goblin),
      Goblin,
      15,
      true
    )
    val reappeared = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      true
    )
    val forever = permanentlyDismissFindFamiliarLifecycle(reappeared.lifecycle)

    all {
      assert(dismissed.lifecycle == TemporarilyDismissedFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
        reactionAvailable: true,
      })),
      assert(dismissed.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 1,
      })),
      assert(dismissed.magicActionSpent),
      assert(blockedReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedReappearance.magicActionSpent)),
      assert(blockedIdentityReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedIdentityReappearance.magicActionSpent)),
      assert(reappeared.lifecycle == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
        initiative: 15,
        placement: FindFamiliarUnoccupiedSpaceWithin30Feet,
        reactionAvailable: true,
      })),
      assert(reappeared.magicActionSpent),
      assert(forever.lifecycle == DismissedForeverFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
      })),
      assert(not(forever.magicActionSpent)),
      assert(forever.itemDropBoundaryEvents == Set()),
    }
  }

  run test_retained_find_familiar_temporary_dismissal_preserves_identity_and_protocol = {
    val present = admitRetainedFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      Fighter,
      OwnerLongRestFamiliarLikeOneAtATime,
      FindFamiliarBat,
      FindFamiliarFey,
      16
    )
    val dismissed = temporarilyDismissFindFamiliarLifecycle(present, true, Set())

    all {
      assert(dismissed.lifecycle == TemporarilyDismissedFindFamiliar({
        owner: Fighter,
        identity: RetainedFindFamiliarIdentity({ durableCompanion: Fighter }),
        protocol: OwnerLongRestFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFey,
        reactionAvailable: true,
      })),
      assert(dismissed.magicActionSpent),
      assert(dismissed.itemDropBoundaryEvents == Set()),
    }
  }

  run test_find_familiar_zero_hit_points_disappears_until_recast = {
    val present = PresentFindFamiliar({
      owner: Fighter,
      familiar: Goblin,
      identity: BattleOnlyFindFamiliarIdentity,
      protocol: OrdinaryFamiliarLikeOneAtATime,
      form: FindFamiliarCat,
      creatureTypeOverride: FindFamiliarFey,
      initiative: 18,
      placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      reactionAvailable: false,
    })
    val disappeared = zeroHitPointDisappearFindFamiliarLifecycle(present, Set(3))
    val recast = castFindFamiliarLifecycle(
      disappeared.lifecycle,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarRat,
      FindFamiliarFey,
      17
    )

    all {
      assert(disappeared.lifecycle == DisappearedAtZeroHitPointsFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
        reactionAvailable: false,
      })),
      assert(disappeared.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 3,
      })),
      assert(not(disappeared.magicActionSpent)),
      assert(recast == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 17,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
        reactionAvailable: false,
      })),
    }
  }

  run test_find_familiar_telepathy_shared_senses_and_touch_delivery = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFey,
      18
    )
    val connection = findFamiliarTelepathicConnection(present, Fighter, true)
    val outOfRangeConnection = findFamiliarTelepathicConnection(present, Fighter, false)
    val sharedSenses = shareFindFamiliarSenses(present, Fighter, true, true)
    val noBonusActionSharedSenses = shareFindFamiliarSenses(present, Fighter, true, false)
    val presentWithoutReaction = match present {
      | PresentFindFamiliar(value) => PresentFindFamiliar({ ...value, reactionAvailable: false })
      | _ => present
    }
    val delivered = findFamiliarTouchSpellDelivery(present, Fighter, true, true)
    val nonTouch = findFamiliarTouchSpellDelivery(present, Fighter, false, true)
    val noReaction = findFamiliarTouchSpellDelivery(presentWithoutReaction, Fighter, true, true)

    all {
      assert(connection == Set({
        owner: Fighter,
        familiar: Goblin,
        rangeFeet: 100,
        sharedLanguageRequired: false,
      })),
      assert(outOfRangeConnection == Set()),
      assert(sharedSenses == Set({
        owner: Fighter,
        familiar: Goblin,
        expiresAtStartOfOwnerNextTurn: true,
        gainsSight: true,
        gainsHearing: true,
        gainsSpecialSenses: true,
      })),
      assert(noBonusActionSharedSenses == Set()),
      assert(delivered == { spellCast: true, familiarReactionSpent: true }),
      assert(nonTouch == { spellCast: false, familiarReactionSpent: false }),
      assert(noReaction == { spellCast: false, familiarReactionSpent: false }),
    }
  }

  run test_pact_of_the_chain_familiar_reaction_attack_requires_pact_owner_attack_and_reaction = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )
    val presentWithoutReaction = match present {
      | PresentFindFamiliar(value) => PresentFindFamiliar({ ...value, reactionAvailable: false })
      | _ => present
    }
    val resolved = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, true)
    val nonPact = pactOfTheChainFamiliarReactionAttack(present, Fighter, false, true, true)
    val noOwnerAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, false, true)
    val noReaction = pactOfTheChainFamiliarReactionAttack(presentWithoutReaction, Fighter, true, true, true)
    val unsupportedAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, false)
    val wrongOwner = pactOfTheChainFamiliarReactionAttack(present, Goblin, true, true, true)

    all {
      assert(resolved == PactFamiliarReactionAttackResolved),
      assert(nonPact == PactFamiliarReactionAttackRejected),
      assert(noOwnerAttack == PactFamiliarReactionAttackRejected),
      assert(noReaction == PactFamiliarReactionAttackRejected),
      assert(unsupportedAttack == PactFamiliarReactionAttackRejected),
      assert(wrongOwner == PactFamiliarReactionAttackRejected),
    }
  }
}
