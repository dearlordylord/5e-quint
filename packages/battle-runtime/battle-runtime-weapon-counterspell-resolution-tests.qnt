// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell

module battleRuntimeWeaponCounterspellResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeWeaponCounterspellResolution.* from "./battle-runtime-weapon-counterspell-resolution"

  run test_counterspell_successful_save_resumes_true_strike_weapon_attack = {
    val awaiting = openReactionWindow(initialState, {
      request: SpellCastCounterspellReactionRequest({
        eligibleReactors: Set(Goblin),
        counterspell: {
          triggeringCaster: Fighter,
          triggeringCastingResource: CounterspellMagicAction,
          triggeringSpellLevel: 0,
          triggeringSpellUsesSlot: false,
          counterspellSlotLevel: 3,
          triggeringCasterConSaveSucceeded: true,
          counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
        },
        continuation: CounterspellResumesTrueStrikeWeaponAttack,
      }),
      offeredReactors: Set(),
    })
    val resolved = resolveWeaponCounterspellReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 0),
    }
  }
}
