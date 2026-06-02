// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.readied-action-time-spell
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellReadiedSpellResponseCore {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"

  // RAW anchors:
  // - Rules-Glossary.md: Ready, Reaction, Concentration, and Magic.
  // - Spells/Gaining-and-Casting.md: Casting Time, Spell Slots, cantrips,
  //   and spell resource expenditure.
  // - UBIQUITOUS_LANGUAGE.md: Readied Spell Response, Reaction,
  //   Concentration, Reserve, and Spend.

  type ReadiedSpellHeldEffect =
    | NoReadiedSpellHeldEffect
    | HeldReadiedSpellEffect({ profile: SpellDefinitionProfile })
    | HeldRepeatedDamageAllocationReadiedSpellEffect

  type ReadiedSpellProcedureState = {
    reaction: ReactionProtocolState,
    heldEffect: ReadiedSpellHeldEffect,
  }

  type ReadiedSpellRelease =
    | NoReadiedSpellRelease
    | ReleasedReadiedSpell({ profile: SpellDefinitionProfile })
    | ReleasedRepeatedDamageAllocationReadiedSpell

  type ReadiedSpellReleaseResult = {
    readiedSpell: ReadiedSpellProcedureState,
    released: ReadiedSpellRelease,
  }

  type ReadiedSpellHoldResult = {
    spellcasting: SpellcastingProcedureState,
    readiedSpell: ReadiedSpellProcedureState,
    held: bool,
    slotExpended: bool,
  }

  pure def initialReadiedSpellProcedureState: ReadiedSpellProcedureState = {
    reaction: initialReactionProtocolState,
    heldEffect: NoReadiedSpellHeldEffect,
  }

  pure def readiedSpellProfileAdmitted(profile: SpellDefinitionProfile): bool =
    spellProfileAction(profile) == ActionTimeSpellInvocation

  pure def asReadiedSpellProfile(profile: SpellDefinitionProfile): ReadiedSpellHeldEffect =
    if (readiedSpellProfileAdmitted(profile)) {
      HeldReadiedSpellEffect({ profile: profile })
    } else {
      NoReadiedSpellHeldEffect
    }

  pure def isHeldReadiedSpellEffect(effect: ReadiedSpellHeldEffect): bool =
    match effect {
      | HeldReadiedSpellEffect(_) => true
      | HeldRepeatedDamageAllocationReadiedSpellEffect => true
      | NoReadiedSpellHeldEffect => false
    }

  pure def legalReadiedSpellHeldEffect(effect: ReadiedSpellHeldEffect): bool =
    match effect {
      | HeldReadiedSpellEffect(v) => readiedSpellProfileAdmitted(v.profile)
      | HeldRepeatedDamageAllocationReadiedSpellEffect => true
      | NoReadiedSpellHeldEffect => true
    }

  pure def legalReadiedSpellProcedureState(state: ReadiedSpellProcedureState): bool = all {
    legalReactionProtocolState(state.reaction),
    legalReadiedSpellHeldEffect(state.heldEffect),
  }

  pure def legalReadiedSpellRelease(release: ReadiedSpellRelease): bool =
    match release {
      | ReleasedReadiedSpell(v) => readiedSpellProfileAdmitted(v.profile)
      | ReleasedRepeatedDamageAllocationReadiedSpell => true
      | NoReadiedSpellRelease => true
    }

  pure def readiedSpellReleaseForHeldEffect(effect: ReadiedSpellHeldEffect): ReadiedSpellRelease =
    match effect {
      | HeldReadiedSpellEffect(v) =>
        if (readiedSpellProfileAdmitted(v.profile)) {
          ReleasedReadiedSpell({ profile: v.profile })
        } else {
          NoReadiedSpellRelease
        }
      | HeldRepeatedDamageAllocationReadiedSpellEffect => ReleasedRepeatedDamageAllocationReadiedSpell
      | NoReadiedSpellHeldEffect => NoReadiedSpellRelease
    }

  pure def readiedSpellDissipationWindow(window: ReactionWindowState): ReactionWindowState =
    if (reactionWindowIsKind(window, ReadiedSpellReactionWindow)) {
      advanceContinuation(window)
    } else window

  pure def dissipateReadiedSpellIfConcentrationBroken(
    state: ReadiedSpellProcedureState
  ): ReadiedSpellProcedureState =
    if (isHeldReadiedSpellEffect(state.heldEffect)
      and state.reaction.concentration.reactor == NoConcentration) {
      {
        reaction: state.reaction.with(
          "reactionWindow",
          readiedSpellDissipationWindow(state.reaction.reactionWindow)
        ),
        heldEffect: NoReadiedSpellHeldEffect,
      }
    } else state

  pure def holdReadiedSpellResponse(
    spellcasting: SpellcastingProcedureState,
    state: ReadiedSpellProcedureState,
    facts: SpellInvocationFacts,
    triggerSelected: bool,
    canConcentrate: bool
  ): ReadiedSpellHoldResult = {
    val held = asReadiedSpellProfile(facts.profile)
    val resourceFacts = spellInvocationResourceFacts(facts)
    val invocation = resolveSpellInvocationResourceWithActionCost(
      spellcasting,
      resourceFacts,
      StandardActionCost(ReadyAction)
    )
    val admitted = all {
      triggerSelected,
      canConcentrate,
      readiedSpellProfileAdmitted(facts.profile),
      invocation.admitted,
    }
    val slotExpended = admitted and invocation.slotExpended
    if (not(admitted)) {
      spellcasting: spellcasting,
      readiedSpell: state,
      held: false,
      slotExpended: false,
    } else {
      spellcasting: invocation.state,
      readiedSpell: {
        reaction: state.reaction.with(
          "reactor",
          state.reaction.reactor.with("turn", invocation.state.turn)
        ).with(
          "concentration",
          startConcentration(state.reaction.concentration, Reactor, canConcentrate)
        ),
        heldEffect: held,
      },
      held: true,
      slotExpended: slotExpended,
    }
  }

  pure def holdRepeatedDamageAllocationReadiedSpellResponse(
    spellcasting: SpellcastingProcedureState,
    state: ReadiedSpellProcedureState,
    facts: RepeatedDamageAllocationInvocationFacts,
    triggerSelected: bool,
    canConcentrate: bool
  ): ReadiedSpellHoldResult = {
    val resourceFacts = repeatedDamageAllocationInvocationResourceFacts(facts)
    val invocation = resolveSpellInvocationResourceWithActionCost(
      spellcasting,
      resourceFacts,
      StandardActionCost(ReadyAction)
    )
    val admitted = all {
      triggerSelected,
      canConcentrate,
      resourceFacts.invocationAction == ActionTimeSpellInvocation,
      invocation.admitted,
    }
    val slotExpended = admitted and invocation.slotExpended
    if (not(admitted)) {
      spellcasting: spellcasting,
      readiedSpell: state,
      held: false,
      slotExpended: false,
    } else {
      spellcasting: invocation.state,
      readiedSpell: {
        reaction: state.reaction.with(
          "reactor",
          state.reaction.reactor.with("turn", invocation.state.turn)
        ).with(
          "concentration",
          startConcentration(state.reaction.concentration, Reactor, canConcentrate)
        ),
        heldEffect: HeldRepeatedDamageAllocationReadiedSpellEffect,
      },
      held: true,
      slotExpended: slotExpended,
    }
  }

  pure def offerReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellProcedureState = {
    val postDissipation = dissipateReadiedSpellIfConcentrationBroken(state)
    if (isHeldReadiedSpellEffect(postDissipation.heldEffect) and postDissipation.reaction.concentration.reactor == Concentrating) {
      postDissipation.with("reaction", postDissipation.reaction.with(
        "reactionWindow",
        offerReactionWindow(postDissipation.reaction.reactionWindow, ReadiedSpellReactionWindow)
      ))
    } else postDissipation
  }

  pure def releaseReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellReleaseResult = {
    val postDissipation = dissipateReadiedSpellIfConcentrationBroken(state)
    val canRelease = all {
      isHeldReadiedSpellEffect(postDissipation.heldEffect),
      legalReadiedSpellHeldEffect(postDissipation.heldEffect),
      postDissipation.reaction.concentration.reactor == Concentrating,
      reactionWindowIsKind(postDissipation.reaction.reactionWindow, ReadiedSpellReactionWindow),
    }
    val choice = resolveReactionChoice(
      postDissipation.reaction.reactor.turn,
      postDissipation.reaction.reactionWindow,
      TakeReadiedSpellReaction
    )
    if (not(canRelease) or choice.reactionWindow == postDissipation.reaction.reactionWindow) {
      readiedSpell: postDissipation,
      released: NoReadiedSpellRelease,
    }
    else {
      readiedSpell: {
        reaction: {
          interruptedActor: postDissipation.reaction.interruptedActor,
          reactor: postDissipation.reaction.reactor.with("turn", choice.turn),
          reactionWindow: choice.reactionWindow,
          concentration: endConcentration(postDissipation.reaction.concentration, Reactor),
        },
        heldEffect: NoReadiedSpellHeldEffect,
      },
      released: readiedSpellReleaseForHeldEffect(postDissipation.heldEffect),
    }
  }
}
