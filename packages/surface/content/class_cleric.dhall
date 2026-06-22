{ armorTraining =
  { categories = [ "light", "medium", "shield" ], kind = "trained" }
, className = "cleric"
, description =
    "SRD Cleric class creation and level 1-5 progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level 1-2 class feature grants, and the level 4 Ability Score Improvement feature grant."
, featureGrants =
  [ { level = 1, unitId = "cleric_divine_order" }
  , { level = 2, unitId = "cleric_channel_divinity" }
  , { level = 4, unitId = "cleric_ability_score_improvement_l4" }
  ]
, hitPointDie = 8
, id = "class_cleric"
, kind = "class"
, multiclassProficiencies =
  { kind = "fixed"
  , proficiencies =
    [ { category = "light", kind = "armor_category" }
    , { category = "medium", kind = "armor_category" }
    , { category = "shield", kind = "armor_category" }
    ]
  }
, name = "Cleric"
, primaryAbilities = { abilities = [ "wis" ], kind = "all_of" }
, provenance =
  { kind = "srd-5.2.1"
  , section = "Classes/Cleric.md:3-24,33-45,56-109,146-219"
  }
, savingThrowProficiencies = [ "wis", "cha" ]
, skillProficiencyChoice =
  { choose = 2
  , options = [ "history", "insight", "medicine", "persuasion", "religion" ]
  }
, spellcasting =
  { cantripAccess =
    { changeOn = { count = 1, kind = "class_level" }
    , choose = 3
    , kind = "known_cantrips_from_class_spell_list"
    , spellIds =
      [ "guidance"
      , "light"
      , "mending"
      , "resistance"
      , "sacred_flame"
      , "spare_the_dying"
      , "thaumaturgy"
      ]
    }
  , featureLevel = 1
  , kind = "list_prepared_spellcasting_progression_creation"
  , preparedAccess =
    { changeOn = { kind = "long_rest", replacementCount = "any" }
    , choose = 4
    , kind = "prepared_from_class_spell_list"
    , spells =
      [ { spellId = "bane", spellLevel = 1 }
      , { spellId = "bless", spellLevel = 1 }
      , { spellId = "command", spellLevel = 1 }
      , { spellId = "create_or_destroy_water", spellLevel = 1 }
      , { spellId = "cure_wounds", spellLevel = 1 }
      , { spellId = "detect_evil_and_good", spellLevel = 1 }
      , { spellId = "detect_magic", spellLevel = 1 }
      , { spellId = "detect_poison_and_disease", spellLevel = 1 }
      , { spellId = "guiding_bolt", spellLevel = 1 }
      , { spellId = "healing_word", spellLevel = 1 }
      , { spellId = "inflict_wounds", spellLevel = 1 }
      , { spellId = "protection_from_evil_and_good", spellLevel = 1 }
      , { spellId = "purify_food_and_drink", spellLevel = 1 }
      , { spellId = "sanctuary", spellLevel = 1 }
      , { spellId = "shield_of_faith", spellLevel = 1 }
      , { spellId = "aid", spellLevel = 2 }
      , { spellId = "augury", spellLevel = 2 }
      , { spellId = "blindness_deafness", spellLevel = 2 }
      , { spellId = "calm_emotions", spellLevel = 2 }
      , { spellId = "continual_flame", spellLevel = 2 }
      , { spellId = "enhance_ability", spellLevel = 2 }
      , { spellId = "find_traps", spellLevel = 2 }
      , { spellId = "gentle_repose", spellLevel = 2 }
      , { spellId = "hold_person", spellLevel = 2 }
      , { spellId = "lesser_restoration", spellLevel = 2 }
      , { spellId = "locate_object", spellLevel = 2 }
      , { spellId = "prayer_of_healing", spellLevel = 2 }
      , { spellId = "protection_from_poison", spellLevel = 2 }
      , { spellId = "silence", spellLevel = 2 }
      , { spellId = "spiritual_weapon", spellLevel = 2 }
      , { spellId = "warding_bond", spellLevel = 2 }
      , { spellId = "zone_of_truth", spellLevel = 2 }
      , { spellId = "animate_dead", spellLevel = 3 }
      , { spellId = "beacon_of_hope", spellLevel = 3 }
      , { spellId = "bestow_curse", spellLevel = 3 }
      , { spellId = "clairvoyance", spellLevel = 3 }
      , { spellId = "create_food_and_water", spellLevel = 3 }
      , { spellId = "daylight", spellLevel = 3 }
      , { spellId = "dispel_magic", spellLevel = 3 }
      , { spellId = "glyph_of_warding", spellLevel = 3 }
      , { spellId = "magic_circle", spellLevel = 3 }
      , { spellId = "mass_healing_word", spellLevel = 3 }
      , { spellId = "meld_into_stone", spellLevel = 3 }
      , { spellId = "protection_from_energy", spellLevel = 3 }
      , { spellId = "remove_curse", spellLevel = 3 }
      , { spellId = "revivify", spellLevel = 3 }
      , { spellId = "sending", spellLevel = 3 }
      , { spellId = "speak_with_dead", spellLevel = 3 }
      , { spellId = "spirit_guardians", spellLevel = 3 }
      , { spellId = "tongues", spellLevel = 3 }
      , { spellId = "water_walk", spellLevel = 3 }
      ]
    }
  , spellSlotProjection =
    { kind = "leveled_spell_slots"
    , resetCadence.kind = "long_rest"
    , slots = [ { count = 2, spellLevel = 1 } ]
    }
  , spellcastingAbility = "wis"
  , spellcastingFocus = "holy_symbol"
  , spellcastingProgression =
    [ { atLevel = 1
      , cantripCount = 3
      , preparedSpellCount = 4
      , spellSlots = [ { count = 2, spellLevel = 1 } ]
      }
    , { atLevel = 2
      , cantripCount = 3
      , preparedSpellCount = 5
      , spellSlots = [ { count = 3, spellLevel = 1 } ]
      }
    , { atLevel = 3
      , cantripCount = 3
      , preparedSpellCount = 6
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 2, spellLevel = 2 } ]
      }
    , { atLevel = 4
      , cantripCount = 4
      , preparedSpellCount = 7
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 3, spellLevel = 2 } ]
      }
    , { atLevel = 5
      , cantripCount = 4
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
  [ { coinsGp = 7
    , id = "option_a"
    , items = Some
      [ { itemName = "Chain Shirt", kind = "draft_owned_item" }
      , { itemName = "Shield", kind = "draft_owned_item" }
      , { itemName = "Mace", kind = "draft_owned_item" }
      , { itemName = "Holy Symbol", kind = "draft_owned_item" }
      , { itemName = "Priest's Pack", kind = "draft_owned_item" }
      ]
    , kind = "item_bundle"
    }
  , { coinsGp = 110
    , id = "option_b"
    , items = None (List { itemName : Text, kind : Text })
    , kind = "coin_grant"
    }
  ]
, subclassChoices =
  [ { level = 3, options = [ "subclass_cleric_life_domain" ] } ]
, toolProficiencies.kind = "none"
, weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
}
