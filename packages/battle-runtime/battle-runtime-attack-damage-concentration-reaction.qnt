// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeAttackDamageConcentrationReaction {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def openBattleAttackDamageConcentration(
    state: BattleState,
    continuation: AttackDamageConcentrationContinuation,
    damage: int,
  ): BattleState =
    { ...state, interruptStack: state.interruptStack.append(PendingAttackDamageConcentration({ continuation: continuation, damage: damage })) }

  pure def resolveBattleAttackDamageConcentration(
    state: BattleState,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingAttackDamageConcentration(frame) => {
            val rest = { ...state, interruptStack: state.interruptStack.slice(0, state.interruptStack.length() - 1) }
            match frame.continuation {
              | ResumeAttackDamageToGoblin => {
                  ...rest,
                  goblin: applyDamageFromSource(
                    rest.goblin,
                    frame.damage,
                    1,
                    concentrationSaveSucceeded,
                    OrdinaryDamage,
                    Fighter,
                  ),
                  actionAvailable: false,
                }
            }
          }
        | _ => state
      }
    }

  pure def resumeAttackDamageReactionContinuation(
    state: BattleState,
    damage: int,
  ): BattleState =
    if (state.goblin.concentrating and damage > 0)
      openBattleAttackDamageConcentration(
        state,
        ResumeAttackDamageToGoblin,
        damage,
      )
    else
      {
        ...state,
        goblin: applyDamageFromSource(
          state.goblin,
          damage,
          1,
          true,
          OrdinaryDamage,
          Fighter,
        ),
        actionAvailable: false,
      }
}
