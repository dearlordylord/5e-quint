// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION

module characterCreationMagicInitiateSpellAccess {
  // RAW: Character-Origins.md lines 3-16, 49-55, and 231-243; Feats.md lines 33-45.
  // The model owns creation-time exact choice closure for a Magic Initiate
  // source selected through a background or Human. Free-cast lifecycle and
  // casting execution belong to the Character Sheet and battle owners.

  type GrantPath = BackgroundGrant | HumanGrant
  type Ability = Intelligence | Wisdom | Charisma
  type SpellId = CantripA | CantripB | CantripC | LevelOneA | LevelOneB | LevelOneC | OffList
  type SpellListId = ClericList | DruidList | WizardList

  type AcquiredMagicInitiateSpellLists = {
    background: SpellListId,
    human: SpellListId,
  }

  type SpellList = {
    cantrips: Set[SpellId],
    levelOneSpells: Set[SpellId],
  }

  type MagicInitiateSpellAccess = {
    grantPath: GrantPath,
    cantrips: Set[SpellId],
    levelOneSpell: SpellId,
    spellcastingAbility: Ability,
  }

  type Finalization = Incomplete | Ready(MagicInitiateSpellAccess)

  type MagicInitiateDraft = {
    grantPath: GrantPath,
    spellListId: SpellListId,
    spellList: SpellList,
    cantrips: Set[SpellId],
    levelOneSpells: Set[SpellId],
    spellcastingAbilities: Set[Ability],
  }

  pure def spellListForId(spellListId: SpellListId): SpellList = match spellListId {
    | ClericList => {
        cantrips: Set(CantripA, CantripB),
        levelOneSpells: Set(LevelOneA),
      }
    | DruidList => {
        cantrips: Set(CantripB, CantripC),
        levelOneSpells: Set(LevelOneB),
      }
    | WizardList => {
        cantrips: Set(CantripA, CantripC),
        levelOneSpells: Set(LevelOneC),
      }
  }

  pure def selectedSpellListId(
    path: GrantPath,
    acquired: AcquiredMagicInitiateSpellLists,
  ): SpellListId = match path {
    | BackgroundGrant => acquired.background
    | HumanGrant => acquired.human
  }

  pure def acquiredSpellListsAreDistinct(
    acquired: AcquiredMagicInitiateSpellLists,
  ): bool = acquired.background != acquired.human

  pure def emptyDraft(
    path: GrantPath,
    spellListId: SpellListId,
  ): MagicInitiateDraft = {
    grantPath: path,
    spellListId: spellListId,
    spellList: spellListForId(spellListId),
    cantrips: Set(),
    levelOneSpells: Set(),
    spellcastingAbilities: Set(),
  }

  pure def draftForAcquisition(
    path: GrantPath,
    acquired: AcquiredMagicInitiateSpellLists,
  ): MagicInitiateDraft =
    emptyDraft(path, selectedSpellListId(path, acquired))

  pure def choicesCloseExactly(draft: MagicInitiateDraft): bool = and {
    draft.spellList == spellListForId(draft.spellListId),
    draft.cantrips.size() == 2,
    draft.cantrips.subseteq(draft.spellList.cantrips),
    draft.levelOneSpells.size() == 1,
    draft.levelOneSpells.subseteq(draft.spellList.levelOneSpells),
    draft.spellcastingAbilities.size() == 1,
  }

  pure def selectedLevelOneSpell(draft: MagicInitiateDraft): SpellId =
    if (draft.levelOneSpells.contains(LevelOneA)) LevelOneA
    else if (draft.levelOneSpells.contains(LevelOneB)) LevelOneB
    else LevelOneC

  pure def selectedSpellcastingAbility(draft: MagicInitiateDraft): Ability =
    if (draft.spellcastingAbilities.contains(Intelligence)) Intelligence
    else if (draft.spellcastingAbilities.contains(Wisdom)) Wisdom
    else Charisma

  pure def finalize(draft: MagicInitiateDraft): Finalization =
    if (choicesCloseExactly(draft)) {
      Ready({
        grantPath: draft.grantPath,
        cantrips: draft.cantrips,
        levelOneSpell: selectedLevelOneSpell(draft),
        spellcastingAbility: selectedSpellcastingAbility(draft),
      })
    } else Incomplete

  pure def readyImpliesExactLegalClosure(draft: MagicInitiateDraft): bool = match finalize(draft) {
    | Incomplete => true
    | Ready(access) => and {
        draft.spellList == spellListForId(draft.spellListId),
        access.cantrips.size() == 2,
        access.cantrips.subseteq(draft.spellList.cantrips),
        draft.spellList.levelOneSpells.contains(access.levelOneSpell),
        draft.spellcastingAbilities.contains(access.spellcastingAbility),
      }
  }
}
