// -*- mode: Bluespec; -*-

module characterCreationMagicInitiateSpellAccessTests {
  import characterCreationMagicInitiateSpellAccess.* from "./character-creation-magic-initiate-spell-access"

  type CreationReplayState = {
    draft: MagicInitiateDraft,
    acquiredSpellLists: AcquiredMagicInitiateSpellLists,
  }

  var replayState: CreationReplayState

  action init: bool = {
    nondet path = Set(BackgroundGrant, HumanGrant).oneOf()
    nondet backgroundSpellList = Set(ClericList, DruidList, WizardList).oneOf()
    nondet humanSpellList = Set(ClericList, DruidList, WizardList).oneOf()
    replayState' = {
      draft: draftForAcquisition(path, {
        background: backgroundSpellList,
        human: humanSpellList,
      }),
      acquiredSpellLists: {
        background: backgroundSpellList,
        human: humanSpellList,
      },
    }
  }

  action chooseCantrip(spellId: SpellId): bool = all {
    replayState.draft.spellList.cantrips.contains(spellId),
    replayState.draft.cantrips.size() < 2,
    not(replayState.draft.cantrips.contains(spellId)),
    replayState' = {
      draft: {
        ...replayState.draft,
        cantrips: replayState.draft.cantrips.union(Set(spellId)),
      },
      acquiredSpellLists: replayState.acquiredSpellLists,
    },
  }

  action chooseLevelOneSpell(spellId: SpellId): bool = all {
    replayState.draft.spellList.levelOneSpells.contains(spellId),
    replayState.draft.levelOneSpells.size() == 0,
    replayState' = {
      draft: {
        ...replayState.draft,
        levelOneSpells: Set(spellId),
      },
      acquiredSpellLists: replayState.acquiredSpellLists,
    },
  }

  action chooseSpellcastingAbility(ability: Ability): bool = all {
    replayState.draft.spellcastingAbilities.size() == 0,
    replayState' = {
      draft: {
        ...replayState.draft,
        spellcastingAbilities: Set(ability),
      },
      acquiredSpellLists: replayState.acquiredSpellLists,
    },
  }

  action step: bool = {
    nondet spellId = Set(CantripA, CantripB, CantripC, LevelOneA, LevelOneB, LevelOneC, OffList).oneOf()
    nondet ability = Set(Intelligence, Wisdom, Charisma).oneOf()
    any {
      chooseCantrip(spellId),
      chooseLevelOneSpell(spellId),
      chooseSpellcastingAbility(ability),
    }
  }

  val humanGrantNotYetReached: bool =
    replayState.draft.grantPath != HumanGrant

  pure def closedDraft(path: GrantPath): MagicInitiateDraft = {
    ...emptyDraft(path, WizardList),
    cantrips: spellListForId(WizardList).cantrips,
    levelOneSpells: spellListForId(WizardList).levelOneSpells,
    spellcastingAbilities: Set(Intelligence),
  }

  pure def closedDraftForAcquisition(
    path: GrantPath,
    acquired: AcquiredMagicInitiateSpellLists,
  ): MagicInitiateDraft = {
    ...draftForAcquisition(path, acquired),
    cantrips: spellListForId(selectedSpellListId(path, acquired)).cantrips,
    levelOneSpells: spellListForId(selectedSpellListId(path, acquired)).levelOneSpells,
    spellcastingAbilities: Set(Intelligence),
  }

  pure val sameSpellListAcquisition: AcquiredMagicInitiateSpellLists = {
    background: WizardList,
    human: WizardList,
  }

  pure val sameClericSpellListAcquisition: AcquiredMagicInitiateSpellLists = {
    background: ClericList,
    human: ClericList,
  }

  pure val sameDruidSpellListAcquisition: AcquiredMagicInitiateSpellLists = {
    background: DruidList,
    human: DruidList,
  }

  pure val differentSpellListAcquisition: AcquiredMagicInitiateSpellLists = {
    background: WizardList,
    human: ClericList,
  }

  pure val clericDruidAcquisition: AcquiredMagicInitiateSpellLists = {
    background: ClericList,
    human: DruidList,
  }

  pure val clericWizardAcquisition: AcquiredMagicInitiateSpellLists = {
    background: ClericList,
    human: WizardList,
  }

  pure val druidClericAcquisition: AcquiredMagicInitiateSpellLists = {
    background: DruidList,
    human: ClericList,
  }

  pure val druidWizardAcquisition: AcquiredMagicInitiateSpellLists = {
    background: DruidList,
    human: WizardList,
  }

  pure val wizardDruidAcquisition: AcquiredMagicInitiateSpellLists = {
    background: WizardList,
    human: DruidList,
  }

  run test_same_background_and_human_spell_list_is_rejected =
    all {
      not(acquiredSpellListsAreDistinct(sameClericSpellListAcquisition)),
      not(acquiredSpellListsAreDistinct(sameDruidSpellListAcquisition)),
      not(acquiredSpellListsAreDistinct(sameSpellListAcquisition)),
    }

  run test_different_background_and_human_spell_lists_are_accepted =
    acquiredSpellListsAreDistinct(differentSpellListAcquisition)

  run test_all_supported_distinct_background_and_human_spell_list_pairs_are_accepted = all {
    acquiredSpellListsAreDistinct(clericDruidAcquisition),
    acquiredSpellListsAreDistinct(clericWizardAcquisition),
    acquiredSpellListsAreDistinct(druidClericAcquisition),
    acquiredSpellListsAreDistinct(druidWizardAcquisition),
    acquiredSpellListsAreDistinct(differentSpellListAcquisition),
    acquiredSpellListsAreDistinct(wizardDruidAcquisition),
  }

  run test_background_draft_uses_its_acquired_spell_list = all {
    closedDraftForAcquisition(BackgroundGrant, clericDruidAcquisition).spellListId == ClericList,
    closedDraftForAcquisition(BackgroundGrant, clericDruidAcquisition).spellList == spellListForId(ClericList),
  }

  run test_human_draft_uses_its_acquired_spell_list = all {
    closedDraftForAcquisition(HumanGrant, clericDruidAcquisition).spellListId == DruidList,
    closedDraftForAcquisition(HumanGrant, clericDruidAcquisition).spellList == spellListForId(DruidList),
  }

  run test_each_supported_spell_list_reaches_finalization_for_each_grant_path = all {
    match finalize(closedDraftForAcquisition(BackgroundGrant, sameClericSpellListAcquisition)) {
      | Ready(access) => access.grantPath == BackgroundGrant and access.levelOneSpell == LevelOneA
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(HumanGrant, sameDruidSpellListAcquisition)) {
      | Ready(access) => access.grantPath == HumanGrant and access.levelOneSpell == LevelOneB
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(BackgroundGrant, differentSpellListAcquisition)) {
      | Ready(access) => access.grantPath == BackgroundGrant and access.levelOneSpell == LevelOneC
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(BackgroundGrant, druidClericAcquisition)) {
      | Ready(access) => access.grantPath == BackgroundGrant and access.levelOneSpell == LevelOneB
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(BackgroundGrant, sameSpellListAcquisition)) {
      | Ready(access) => access.grantPath == BackgroundGrant and access.levelOneSpell == LevelOneC
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(HumanGrant, differentSpellListAcquisition)) {
      | Ready(access) => access.grantPath == HumanGrant and access.levelOneSpell == LevelOneA
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(HumanGrant, clericDruidAcquisition)) {
      | Ready(access) => access.grantPath == HumanGrant and access.levelOneSpell == LevelOneB
      | Incomplete => false
    },
    match finalize(closedDraftForAcquisition(HumanGrant, clericWizardAcquisition)) {
      | Ready(access) => access.grantPath == HumanGrant and access.levelOneSpell == LevelOneC
      | Incomplete => false
    }
  }

  run test_background_and_human_paths_finalize_exact_choices = all {
    match finalize(closedDraft(BackgroundGrant)) {
      | Ready(access) => access.grantPath == BackgroundGrant and access.cantrips.size() == 2
      | Incomplete => false
    },
    match finalize(closedDraft(HumanGrant)) {
      | Ready(access) => access.grantPath == HumanGrant and access.levelOneSpell == LevelOneC
      | Incomplete => false
    },
  }

  run test_incomplete_choices_do_not_finalize =
    finalize({ ...closedDraft(BackgroundGrant), cantrips: Set(CantripA) }) == Incomplete

  run test_duplicate_cantrip_cannot_satisfy_exact_two =
    finalize({ ...closedDraft(BackgroundGrant), cantrips: Set(CantripA, CantripA) }) == Incomplete

  run test_off_list_choices_do_not_finalize = all {
    finalize({ ...closedDraft(HumanGrant), cantrips: Set(CantripA, OffList) }) == Incomplete,
    finalize({ ...closedDraft(HumanGrant), levelOneSpells: Set(OffList) }) == Incomplete,
  }
}
