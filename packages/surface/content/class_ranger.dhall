{ armorTraining =
  { categories = [ "light", "medium", "shield" ], kind = "trained" }
, className = "ranger"
, description =
    "SRD Ranger class creation and level 1-5 progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level-2 class-feature grants, level-3 subclass selection, and the level-4 Ability Score Improvement feature grant."
, featureGrants =
  [ { level = 1, unitId = "ranger_favored_enemy" }
  , { level = 1, unitId = "ranger_weapon_mastery" }
  , { level = 2, unitId = "ranger_deft_explorer" }
  , { level = 2, unitId = "ranger_fighting_style" }
  , { level = 4, unitId = "ranger_ability_score_improvement_l4" }
  ]
, hitPointDie = 10
, id = "class_ranger"
, kind = "class"
, multiclassProficiencies =
  { choice =
    { choiceKey = "ranger_multiclass_skill_proficiency"
    , count = 1
    , options =
      [ { kind = "skill", skill = "animal_handling" }
      , { kind = "skill", skill = "athletics" }
      , { kind = "skill", skill = "insight" }
      , { kind = "skill", skill = "investigation" }
      , { kind = "skill", skill = "nature" }
      , { kind = "skill", skill = "perception" }
      , { kind = "skill", skill = "stealth" }
      , { kind = "skill", skill = "survival" }
      ]
    }
  , fixed =
    [ { category = "martial", kind = "weapon_category" }
    , { category = "light", kind = "armor_category" }
    , { category = "medium", kind = "armor_category" }
    , { category = "shield", kind = "armor_category" }
    ]
  , kind = "mixed"
  }
, name = "Ranger"
, primaryAbilities = { abilities = [ "dex", "wis" ], kind = "all_of" }
, provenance =
  { kind = "srd-5.2.1"
  , section = "Classes/Ranger.md:3-24,33-43,58-99,106-109,160-196"
  }
, savingThrowProficiencies = [ "str", "dex" ]
, skillProficiencyChoice =
  { choose = 3
  , options =
    [ "animal_handling"
    , "athletics"
    , "insight"
    , "investigation"
    , "nature"
    , "perception"
    , "stealth"
    , "survival"
    ]
  }
, spellcasting =
  { featureLevel = 1
  , kind = "list_prepared_spellcasting_progression_creation"
  , preparedAccess =
    { changeOn = { kind = "long_rest", replacementCount = 1 }
    , choose = 2
    , kind = "prepared_from_class_spell_list"
    , spells =
      [ { spellId = "alarm", spellLevel = 1 }
      , { spellId = "animal_friendship", spellLevel = 1 }
      , { spellId = "cure_wounds", spellLevel = 1 }
      , { spellId = "detect_magic", spellLevel = 1 }
      , { spellId = "detect_poison_and_disease", spellLevel = 1 }
      , { spellId = "ensnaring_strike", spellLevel = 1 }
      , { spellId = "entangle", spellLevel = 1 }
      , { spellId = "fog_cloud", spellLevel = 1 }
      , { spellId = "goodberry", spellLevel = 1 }
      , { spellId = "hunters_mark", spellLevel = 1 }
      , { spellId = "jump", spellLevel = 1 }
      , { spellId = "longstrider", spellLevel = 1 }
      , { spellId = "speak_with_animals", spellLevel = 1 }
      , { spellId = "aid", spellLevel = 2 }
      , { spellId = "animal_messenger", spellLevel = 2 }
      , { spellId = "barkskin", spellLevel = 2 }
      , { spellId = "darkvision", spellLevel = 2 }
      , { spellId = "enhance_ability", spellLevel = 2 }
      , { spellId = "find_traps", spellLevel = 2 }
      , { spellId = "gust_of_wind", spellLevel = 2 }
      , { spellId = "lesser_restoration", spellLevel = 2 }
      , { spellId = "locate_animals_or_plants", spellLevel = 2 }
      , { spellId = "locate_object", spellLevel = 2 }
      , { spellId = "magic_weapon", spellLevel = 2 }
      , { spellId = "pass_without_trace", spellLevel = 2 }
      , { spellId = "protection_from_poison", spellLevel = 2 }
      , { spellId = "silence", spellLevel = 2 }
      , { spellId = "spike_growth", spellLevel = 2 }
      ]
    }
  , spellSlotProjection =
    { kind = "leveled_spell_slots"
    , resetCadence.kind = "long_rest"
    , slots = [ { count = 2, spellLevel = 1 } ]
    }
  , spellcastingAbility = "wis"
  , spellcastingFocus = "druidic_focus"
  , spellcastingProgression =
    [ { atLevel = 1
      , cantripCount = 0
      , preparedSpellCount = 2
      , spellSlots = [ { count = 2, spellLevel = 1 } ]
      }
    , { atLevel = 2
      , cantripCount = 0
      , preparedSpellCount = 3
      , spellSlots = [ { count = 2, spellLevel = 1 } ]
      }
    , { atLevel = 3
      , cantripCount = 0
      , preparedSpellCount = 4
      , spellSlots = [ { count = 3, spellLevel = 1 } ]
      }
    , { atLevel = 4
      , cantripCount = 0
      , preparedSpellCount = 5
      , spellSlots = [ { count = 3, spellLevel = 1 } ]
      }
    , { atLevel = 5
      , cantripCount = 0
      , preparedSpellCount = 6
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 2, spellLevel = 2 } ]
      }
    ]
  }
, startingEquipment =
  [ { coinsGp = 7
    , id = "option_a"
    , items = Some
      [ { itemName = "Studded Leather Armor"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Scimitar"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Shortsword"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Longbow"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Arrows", kind = "draft_owned_item", quantity = Some 20 }
      , { itemName = "Quiver"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Druidic Focus (sprig of mistletoe)"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Explorer's Pack"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      ]
    , kind = "item_bundle"
    }
  , { coinsGp = 150
    , id = "option_b"
    , items =
        None
          (List { itemName : Text, kind : Text, quantity : Optional Natural })
    , kind = "coin_grant"
    }
  ]
, subclassChoices = [ { level = 3, options = [ "subclass_ranger_hunter" ] } ]
, toolProficiencies.kind = "none"
, weaponProficiencies =
  [ { category = "simple", kind = "weapon_category" }
  , { category = "martial", kind = "weapon_category" }
  ]
}
