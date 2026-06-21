{ armorTraining = { categories = [ "light" ], kind = "trained" }
, className = "bard"
, description =
    "SRD Bard class creation and level 1-5 progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level 1-2 class feature grants, and the level 4 Ability Score Improvement feature grant."
, featureGrants =
  [ { level = 1, unitId = "bard_bardic_inspiration" }
  , { level = 2, unitId = "bard_expertise" }
  , { level = 2, unitId = "bard_jack_of_all_trades" }
  , { level = 4, unitId = "bard_ability_score_improvement_l4" }
  ]
, hitPointDie = 8
, id = "class_bard"
, kind = "class"
, multiclassProficiencies =
  { choices =
    [ { choiceKey = "bard_multiclass_skill_proficiency"
      , count = 1
      , options =
        [ { category = None Text, kind = "skill", skill = Some "acrobatics" }
        , { category = None Text
          , kind = "skill"
          , skill = Some "animal_handling"
          }
        , { category = None Text, kind = "skill", skill = Some "arcana" }
        , { category = None Text, kind = "skill", skill = Some "athletics" }
        , { category = None Text, kind = "skill", skill = Some "deception" }
        , { category = None Text, kind = "skill", skill = Some "history" }
        , { category = None Text, kind = "skill", skill = Some "insight" }
        , { category = None Text, kind = "skill", skill = Some "intimidation" }
        , { category = None Text, kind = "skill", skill = Some "investigation" }
        , { category = None Text, kind = "skill", skill = Some "medicine" }
        , { category = None Text, kind = "skill", skill = Some "nature" }
        , { category = None Text, kind = "skill", skill = Some "perception" }
        , { category = None Text, kind = "skill", skill = Some "performance" }
        , { category = None Text, kind = "skill", skill = Some "persuasion" }
        , { category = None Text, kind = "skill", skill = Some "religion" }
        , { category = None Text
          , kind = "skill"
          , skill = Some "sleight_of_hand"
          }
        , { category = None Text, kind = "skill", skill = Some "stealth" }
        , { category = None Text, kind = "skill", skill = Some "survival" }
        ]
      }
    , { choiceKey = "bard_multiclass_musical_instrument_proficiency"
      , count = 1
      , options =
        [ { category = Some "musical_instrument"
          , kind = "tool_category"
          , skill = None Text
          }
        ]
      }
    ]
  , fixed = [ { category = "light", kind = "armor_category" } ]
  , kind = "mixed_choices"
  }
, name = "Bard"
, primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
, provenance =
  { kind = "srd-5.2.1"
  , section = "Classes/Bard.md:3-26,34-45,69-103,109-111,143-230"
  }
, savingThrowProficiencies = [ "dex", "cha" ]
, skillProficiencyChoice =
  { choose = 3
  , options =
    [ "acrobatics"
    , "animal_handling"
    , "arcana"
    , "athletics"
    , "deception"
    , "history"
    , "insight"
    , "intimidation"
    , "investigation"
    , "medicine"
    , "nature"
    , "perception"
    , "performance"
    , "persuasion"
    , "religion"
    , "sleight_of_hand"
    , "stealth"
    , "survival"
    ]
  }
, spellcasting =
  { cantripAccess =
    { changeOn = { count = 1, kind = "class_level" }
    , choose = 2
    , kind = "known_cantrips_from_class_spell_list"
    , spellIds =
      [ "dancing_lights"
      , "light"
      , "mage_hand"
      , "mending"
      , "message"
      , "minor_illusion"
      , "prestidigitation"
      , "starry_wisp"
      , "true_strike"
      , "vicious_mockery"
      ]
    }
  , featureLevel = 1
  , kind = "list_prepared_spellcasting_progression_creation"
  , preparedAccess =
    { changeOn = { kind = "class_level", replacementCount = 1 }
    , choose = 4
    , kind = "prepared_from_class_spell_list"
    , spells =
      [ { spellId = "animal_friendship", spellLevel = 1 }
      , { spellId = "bane", spellLevel = 1 }
      , { spellId = "charm_person", spellLevel = 1 }
      , { spellId = "color_spray", spellLevel = 1 }
      , { spellId = "command", spellLevel = 1 }
      , { spellId = "comprehend_languages", spellLevel = 1 }
      , { spellId = "cure_wounds", spellLevel = 1 }
      , { spellId = "detect_magic", spellLevel = 1 }
      , { spellId = "disguise_self", spellLevel = 1 }
      , { spellId = "dissonant_whispers", spellLevel = 1 }
      , { spellId = "faerie_fire", spellLevel = 1 }
      , { spellId = "feather_fall", spellLevel = 1 }
      , { spellId = "healing_word", spellLevel = 1 }
      , { spellId = "heroism", spellLevel = 1 }
      , { spellId = "hideous_laughter", spellLevel = 1 }
      , { spellId = "identify", spellLevel = 1 }
      , { spellId = "illusory_script", spellLevel = 1 }
      , { spellId = "longstrider", spellLevel = 1 }
      , { spellId = "silent_image", spellLevel = 1 }
      , { spellId = "sleep", spellLevel = 1 }
      , { spellId = "speak_with_animals", spellLevel = 1 }
      , { spellId = "thunderwave", spellLevel = 1 }
      , { spellId = "unseen_servant", spellLevel = 1 }
      , { spellId = "aid", spellLevel = 2 }
      , { spellId = "animal_messenger", spellLevel = 2 }
      , { spellId = "blindness_deafness", spellLevel = 2 }
      , { spellId = "calm_emotions", spellLevel = 2 }
      , { spellId = "detect_thoughts", spellLevel = 2 }
      , { spellId = "enhance_ability", spellLevel = 2 }
      , { spellId = "enlarge_reduce", spellLevel = 2 }
      , { spellId = "enthrall", spellLevel = 2 }
      , { spellId = "heat_metal", spellLevel = 2 }
      , { spellId = "hold_person", spellLevel = 2 }
      , { spellId = "invisibility", spellLevel = 2 }
      , { spellId = "knock", spellLevel = 2 }
      , { spellId = "lesser_restoration", spellLevel = 2 }
      , { spellId = "locate_animals_or_plants", spellLevel = 2 }
      , { spellId = "locate_object", spellLevel = 2 }
      , { spellId = "magic_mouth", spellLevel = 2 }
      , { spellId = "mirror_image", spellLevel = 2 }
      , { spellId = "see_invisibility", spellLevel = 2 }
      , { spellId = "shatter", spellLevel = 2 }
      , { spellId = "silence", spellLevel = 2 }
      , { spellId = "suggestion", spellLevel = 2 }
      , { spellId = "zone_of_truth", spellLevel = 2 }
      , { spellId = "bestow_curse", spellLevel = 3 }
      , { spellId = "clairvoyance", spellLevel = 3 }
      , { spellId = "dispel_magic", spellLevel = 3 }
      , { spellId = "fear", spellLevel = 3 }
      , { spellId = "glyph_of_warding", spellLevel = 3 }
      , { spellId = "hypnotic_pattern", spellLevel = 3 }
      , { spellId = "major_image", spellLevel = 3 }
      , { spellId = "mass_healing_word", spellLevel = 3 }
      , { spellId = "nondetection", spellLevel = 3 }
      , { spellId = "plant_growth", spellLevel = 3 }
      , { spellId = "sending", spellLevel = 3 }
      , { spellId = "slow", spellLevel = 3 }
      , { spellId = "speak_with_dead", spellLevel = 3 }
      , { spellId = "speak_with_plants", spellLevel = 3 }
      , { spellId = "stinking_cloud", spellLevel = 3 }
      , { spellId = "tiny_hut", spellLevel = 3 }
      , { spellId = "tongues", spellLevel = 3 }
      ]
    }
  , spellSlotProjection =
    { kind = "leveled_spell_slots"
    , resetCadence.kind = "long_rest"
    , slots = [ { count = 2, spellLevel = 1 } ]
    }
  , spellcastingAbility = "cha"
  , spellcastingFocus = "musical_instrument"
  , spellcastingProgression =
    [ { atLevel = 1
      , cantripCount = 2
      , preparedSpellCount = 4
      , spellSlots = [ { count = 2, spellLevel = 1 } ]
      }
    , { atLevel = 2
      , cantripCount = 2
      , preparedSpellCount = 5
      , spellSlots = [ { count = 3, spellLevel = 1 } ]
      }
    , { atLevel = 3
      , cantripCount = 2
      , preparedSpellCount = 6
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 2, spellLevel = 2 } ]
      }
    , { atLevel = 4
      , cantripCount = 3
      , preparedSpellCount = 7
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 3, spellLevel = 2 } ]
      }
    , { atLevel = 5
      , cantripCount = 3
      , preparedSpellCount = 9
      , spellSlots =
        [ { count = 4, spellLevel = 1 }
        , { count = 3, spellLevel = 2 }
        , { count = 2, spellLevel = 3 }
        ]
      }
    ]
  }
, startingEquipment =
  [ { coinsGp = 19
    , id = "option_a"
    , items = Some
      [ { itemName = "Leather Armor"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Dagger", kind = "draft_owned_item", quantity = Some 2 }
      , { itemName = "Musical Instrument"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Entertainer's Pack"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      ]
    , kind = "item_bundle"
    }
  , { coinsGp = 90
    , id = "option_b"
    , items =
        None
          (List { itemName : Text, kind : Text, quantity : Optional Natural })
    , kind = "coin_grant"
    }
  ]
, subclassChoices =
  [ { level = 3, options = [ "subclass_bard_college_of_lore" ] } ]
, toolProficiencies =
  { count = 3
  , kind = "choice"
  , options = [ { category = "musical_instrument", kind = "tool_category" } ]
  }
, weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
}
