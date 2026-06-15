// -*- mode: Bluespec; -*-

module characterCreationRuntimeSliceTests {
  import characterCreationRuntimeSlice.* from "./character-creation-runtime-slice"

  run test_initial_hole_discovery = {
    assert(openCreationHoles(emptyDraft) == initialHoleIds)
  }

  run test_initial_batch_rediscovery = {
    match fillCreationHoles(emptyDraft, 0, initialManifestFills) {
      | Accepted(v) =>
          all {
            assert(v.draft.revision == 1),
            assert(hasProgression(v.draft)),
            assert(v.holes == afterInitialHoleIds),
            assert(v.finalization == Incomplete),
          }
      | Rejected(_) => assert(false)
    }
  }

  run test_progression_fill_is_one_character_progression_selection = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HProgression, options: [OClassFighterLevel2] }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft.progression == SelectedProgression(fighterLevel2Progression)),
            assert(characterProgressionTotalLevel(fighterLevel2Progression) == 2),
            assert(selectedProgressionClassLevel(v.draft.progression, FighterClassUnit) == 2),
            assert(selectedProgressionClassLevel(v.draft.progression, WizardClassUnit) == 0),
          }
      | Rejected(_) => assert(false)
    }
  }

  run test_complete_manifest_finalizes = {
    all {
      assert(completeManifestDraft.revision == 4),
      assert(openCreationHoles(completeManifestDraft) == Set()),
      assert(finalizeDraft(completeManifestDraft) == Ready),
    }
  }

  run test_invalid_primary_class_fill_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HProgression, options: [OBackgroundSoldier] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.holes == initialHoleIds),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HProgression, code: InvalidChoice })),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_stale_revision_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 1, []) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.holes == initialHoleIds),
            assert(v.issues.batch == Set(StaleRevision)),
            assert(v.issues.fills == Set()),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_wrong_fill_kind_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HProgression,
        method: StandardArray,
        scores: fighterStandardArray,
      }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.holes == initialHoleIds),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HProgression, code: WrongFillKind })),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_unopened_protocol_hole_rejected_as_unknown_hole = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLoadoutArmor, options: [OLoadoutWorn] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.holes == initialHoleIds),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HLoadoutArmor, code: UnknownHole })),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_closed_initial_hole_rejected_as_unknown_hole = {
    match fillCreationHoles(afterInitialManifest, 1, [
      FChoice({ hole: HProgression, options: [OClassFighterLevel1] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == afterInitialManifest),
            assert(v.holes == afterInitialHoleIds),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HProgression, code: UnknownHole })),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_unsupported_language_fill_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageElvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HLanguages, code: UnsupportedChoice })),
          }
    }
  }

  run test_duplicate_choice_option_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageDwarvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.issues.fills == Set({ fillIndex: 0, hole: HLanguages, code: InvalidChoice })),
          }
    }
  }

  run test_duplicate_fill_rejected_atomically = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == emptyDraft),
            assert(v.holes == initialHoleIds),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == Set({ fillIndex: 1, hole: HLanguages, code: DuplicateFill })),
            assert(v.finalization == Incomplete),
          }
    }
  }

  run test_standard_array_assignment_accepts_any_ability_order = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HAbilityScores,
        method: StandardArray,
        scores: {
          strength: 14,
          dexterity: 15,
          constitution: 13,
          intelligence: 8,
          wisdom: 10,
          charisma: 12,
        },
      }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft.abilityScores),
            assert(v.draft.revision == 1),
          }
      | Rejected(_) => assert(false)
    }
  }

  run test_cardinality_issues_are_distinct = {
    val tooFew = fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish] }),
    ])
    val tooMany = fillCreationHoles(emptyDraft, 0, [
      FChoice({
        hole: HLanguages,
        options: [OLanguageDwarvish, OLanguageGoblin, OLanguageElvish],
      }),
    ])
    all {
      match tooFew {
        | Accepted(_) => assert(false)
        | Rejected(v) => assert(v.issues.fills == Set({ fillIndex: 0, hole: HLanguages, code: TooFewChoices }))
      },
      match tooMany {
        | Accepted(_) => assert(false)
        | Rejected(v) => assert(v.issues.fills == Set({ fillIndex: 0, hole: HLanguages, code: TooManyChoices }, { fillIndex: 0, hole: HLanguages, code: UnsupportedChoice }))
      },
    }
  }

  run test_later_hole_valid_but_unsupported_options_are_distinct = {
    match fillCreationHoles(afterInitialManifest, 1, [
      FChoice({ hole: HClassSkills, options: [OSkillPerception, OSkillAthletics] }),
      FChoice({ hole: HBackgroundEquipment, options: [OBackgroundEquipmentPack] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          assert(v.issues.fills == Set(
            { fillIndex: 0, hole: HClassSkills, code: UnsupportedChoice },
            { fillIndex: 1, hole: HBackgroundEquipment, code: UnsupportedChoice },
          ))
    }
  }
}
