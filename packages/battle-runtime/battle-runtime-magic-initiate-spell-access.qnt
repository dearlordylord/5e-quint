// -*- mode: Bluespec; -*-
//
// RAW: .references/srd-5.2.1/Feats.md, "Magic Initiate"
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: qnt-owner battle.spell-access-magic-initiate-casting

module battleRuntimeMagicInitiateSpellAccess {
  type FeatSource = FirstFeatSource | SecondFeatSource
  type SpellAccessSource =
    | ClassSpellAccess
    | FeatSpellAccess({ sourceIdentity: FeatSource })

  type SpellAccessSpell = CantripSpell | LevelOnePreparedSpell

  type SpellcastingAbility = Intelligence | Wisdom | Charisma

  type SpellAccessKey = {
    source: SpellAccessSource,
    spell: SpellAccessSpell,
  }

  type SpellAccess = {
    identity: SpellAccessKey,
    spellcastingAbility: SpellcastingAbility,
  }

  type SpellAccessResourceState = {
    actionsRemaining: int,
    freeCastExpended: SpellAccessKey -> int,
    ordinarySlotUsesRemaining: int -> int,
  }

  type SpellAccessPayment =
    | NoSlotPayment
    | FreeLongRestPayment
    | OrdinarySlotPayment({ slotLevel: int })

  type SpellAccessCastOutcome =
    | SpellAccessCastRejected
    | SpellAccessCastAccepted({
        state: SpellAccessResourceState,
        payment: SpellAccessPayment,
        spellcastingAbility: SpellcastingAbility,
      })

  pure def legalSpellAccessResourceState(state: SpellAccessResourceState): bool = all {
    state.actionsRemaining >= 0,
    state.freeCastExpended.keys().forall(accessKey => all {
      match accessKey.source {
        | FeatSpellAccess(_) => true
        | ClassSpellAccess => false
      },
      accessKey.spell == LevelOnePreparedSpell,
      state.freeCastExpended.get(accessKey).in(Set(0, 1)),
    }),
    state.ordinarySlotUsesRemaining.keys().forall(slotLevel => all {
      slotLevel >= 1,
      slotLevel <= 9,
      state.ordinarySlotUsesRemaining.get(slotLevel) >= 0,
    }),
  }

  pure def spellAccessIsClassSource(access: SpellAccess): bool =
    access.identity.source == ClassSpellAccess

  pure def spellAccessIsFeatSource(access: SpellAccess): bool = match access.identity.source {
    | ClassSpellAccess => false
    | FeatSpellAccess(_) => true
  }

  pure def spellAccessIsCantrip(access: SpellAccess): bool =
    access.identity.spell == CantripSpell

  pure def spellAccessIsLevelOnePreparedSpell(access: SpellAccess): bool =
    access.identity.spell == LevelOnePreparedSpell

  pure def spellAccessSatisfiesClassOnlyPredicate(access: SpellAccess): bool =
    spellAccessIsClassSource(access)

  pure def spellAccessCastingAbility(access: SpellAccess): SpellcastingAbility =
    access.spellcastingAbility

  pure def spellAccessFreeCastActionAvailable(
    access: SpellAccess,
    state: SpellAccessResourceState
  ): bool = all {
    legalSpellAccessResourceState(state),
    spellAccessIsFeatSource(access),
    spellAccessIsLevelOnePreparedSpell(access),
    state.freeCastExpended.keys().contains(access.identity),
    state.freeCastExpended.get(access.identity) == 0,
  }

  pure def ordinarySlotPaymentIsEligible(payment: SpellAccessPayment): bool =
    match payment {
      | OrdinarySlotPayment(data) => all {
          data.slotLevel >= 1,
          data.slotLevel <= 9,
        }
      | _ => true
    }

  pure def spellAccessPaymentIsAvailable(
    access: SpellAccess,
    state: SpellAccessResourceState,
    payment: SpellAccessPayment
  ): bool = all {
    legalSpellAccessResourceState(state),
    state.actionsRemaining > 0,
    ordinarySlotPaymentIsEligible(payment),
    match payment {
      | NoSlotPayment => spellAccessIsCantrip(access)
      | FreeLongRestPayment => spellAccessFreeCastActionAvailable(access, state)
      | OrdinarySlotPayment(_) => all {
          spellAccessIsLevelOnePreparedSpell(access),
          state.ordinarySlotUsesRemaining.keys().contains(
            match payment {
              | OrdinarySlotPayment(data) => data.slotLevel
              | _ => 0
            }
          ),
          match payment {
            | OrdinarySlotPayment(data) =>
                state.ordinarySlotUsesRemaining.get(data.slotLevel) > 0
            | _ => false
          },
        }
    },
  }

  pure def spendSpellAccessFreeCast(
    access: SpellAccess,
    state: SpellAccessResourceState
  ): SpellAccessResourceState =
    if (spellAccessFreeCastActionAvailable(access, state))
      {
        ...state,
        freeCastExpended: state.freeCastExpended.put(
          access.identity,
          state.freeCastExpended.get(access.identity) + 1
        ),
      }
    else state

  pure def spendSpellAccessOrdinarySlot(
    state: SpellAccessResourceState,
    slotLevel: int
  ): SpellAccessResourceState =
    if (state.ordinarySlotUsesRemaining.keys().contains(slotLevel) and
        state.ordinarySlotUsesRemaining.get(slotLevel) > 0)
      {
        ...state,
        ordinarySlotUsesRemaining: state.ordinarySlotUsesRemaining.put(
          slotLevel,
          state.ordinarySlotUsesRemaining.get(slotLevel) - 1
        ),
      }
    else state

  pure def restoreSpellAccessFreeCastsAfterLongRest(
    state: SpellAccessResourceState
  ): SpellAccessResourceState = {
    ...state,
    freeCastExpended: state.freeCastExpended.keys().mapBy(accessKey => 0),
  }

  pure def resolveSpellAccessCast(
    access: SpellAccess,
    state: SpellAccessResourceState,
    payment: SpellAccessPayment
  ): SpellAccessCastOutcome =
    {
      val actionSpent = {
        ...state,
        actionsRemaining: state.actionsRemaining - 1,
      }
      if (not(spellAccessPaymentIsAvailable(access, state, payment)))
        SpellAccessCastRejected
      else match payment {
        | NoSlotPayment => SpellAccessCastAccepted({
            state: actionSpent,
            payment: payment,
            spellcastingAbility: spellAccessCastingAbility(access),
          })
        | FreeLongRestPayment => SpellAccessCastAccepted({
            state: spendSpellAccessFreeCast(access, actionSpent),
            payment: payment,
            spellcastingAbility: spellAccessCastingAbility(access),
          })
        | OrdinarySlotPayment(data) => SpellAccessCastAccepted({
            state: spendSpellAccessOrdinarySlot(actionSpent, data.slotLevel),
            payment: payment,
            spellcastingAbility: spellAccessCastingAbility(access),
          })
      }
    }
}
