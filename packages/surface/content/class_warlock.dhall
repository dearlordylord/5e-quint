{ armorTraining = { categories = [ "light" ], kind = "trained" }
, className = "warlock"
, description =
    "SRD Warlock class creation and level 1-5 progression facts, including Pact Magic progression, the level-2 Magical Cunning feature grant, and level-3 subclass selection."
, featureGrants =
  [ { level = 1, unitId = "warlock_eldritch_invocations" }
  , { level = 1, unitId = "warlock_pact_magic" }
  , { level = 2, unitId = "warlock_magical_cunning" }
  , { level = 4, unitId = "warlock_ability_score_improvement_l4" }
  ]
, hitPointDie = 8
, id = "class_warlock"
, kind = "class"
, multiclassProficiencies =
  { kind = "fixed"
  , proficiencies = [ { category = "light", kind = "armor_category" } ]
  }
, name = "Warlock"
, primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
, provenance =
  { kind = "srd-5.2.1"
  , section = "Classes/Warlock.md:3-24,31-45,68-102,332-390"
  }
, savingThrowProficiencies = [ "wis", "cha" ]
, skillProficiencyChoice =
  { choose = 2
  , options =
    [ "arcana"
    , "deception"
    , "history"
    , "intimidation"
    , "investigation"
    , "nature"
    , "religion"
    ]
  }
, spellcasting =
  { cantripAccess =
    { changeOn = { count = 1, kind = "class_level" }
    , choose = 2
    , kind = "known_cantrips_from_class_spell_list"
    , spellIds =
      [ "chill_touch"
      , "eldritch_blast"
      , "mage_hand"
      , "minor_illusion"
      , "poison_spray"
      , "prestidigitation"
      , "true_strike"
      ]
    }
  , featureLevel = 1
  , kind = "pact_magic_spellcasting_creation"
  , pactMagicProgression =
    [ { atLevel = 1
      , cantripTotal = 2
      , pactSlotCount = 1
      , pactSlotLevel = 1
      , preparedSpellTotal = 2
      }
    , { atLevel = 2
      , cantripTotal = 2
      , pactSlotCount = 2
      , pactSlotLevel = 1
      , preparedSpellTotal = 3
      }
    , { atLevel = 3
      , cantripTotal = 2
      , pactSlotCount = 2
      , pactSlotLevel = 2
      , preparedSpellTotal = 4
      }
    , { atLevel = 4
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 2
      , preparedSpellTotal = 5
      }
    , { atLevel = 5
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 3
      , preparedSpellTotal = 6
      }
    , { atLevel = 6
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 3
      , preparedSpellTotal = 7
      }
    , { atLevel = 7
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 4
      , preparedSpellTotal = 8
      }
    , { atLevel = 8
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 4
      , preparedSpellTotal = 9
      }
    , { atLevel = 9
      , cantripTotal = 3
      , pactSlotCount = 2
      , pactSlotLevel = 5
      , preparedSpellTotal = 10
      }
    , { atLevel = 10
      , cantripTotal = 4
      , pactSlotCount = 2
      , pactSlotLevel = 5
      , preparedSpellTotal = 10
      }
    , { atLevel = 11
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 11
      }
    , { atLevel = 12
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 11
      }
    , { atLevel = 13
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 12
      }
    , { atLevel = 14
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 12
      }
    , { atLevel = 15
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 13
      }
    , { atLevel = 16
      , cantripTotal = 4
      , pactSlotCount = 3
      , pactSlotLevel = 5
      , preparedSpellTotal = 13
      }
    , { atLevel = 17
      , cantripTotal = 4
      , pactSlotCount = 4
      , pactSlotLevel = 5
      , preparedSpellTotal = 14
      }
    , { atLevel = 18
      , cantripTotal = 4
      , pactSlotCount = 4
      , pactSlotLevel = 5
      , preparedSpellTotal = 14
      }
    , { atLevel = 19
      , cantripTotal = 4
      , pactSlotCount = 4
      , pactSlotLevel = 5
      , preparedSpellTotal = 15
      }
    , { atLevel = 20
      , cantripTotal = 4
      , pactSlotCount = 4
      , pactSlotLevel = 5
      , preparedSpellTotal = 15
      }
    ]
  , pactSlotProjection =
    { count = 1
    , kind = "pact_slots"
    , resetCadence.kind = "short_or_long_rest"
    , spellLevel = 1
    }
  , preparedAccess =
    { changeOn = { kind = "class_level", replacementCount = 1 }
    , choose = 2
    , kind = "prepared_from_class_spell_list"
    , spells =
      [ { spellId = "bane", spellLevel = 1 }
      , { spellId = "charm_person", spellLevel = 1 }
      , { spellId = "comprehend_languages", spellLevel = 1 }
      , { spellId = "detect_magic", spellLevel = 1 }
      , { spellId = "expeditious_retreat", spellLevel = 1 }
      , { spellId = "hellish_rebuke", spellLevel = 1 }
      , { spellId = "hex", spellLevel = 1 }
      , { spellId = "hideous_laughter", spellLevel = 1 }
      , { spellId = "illusory_script", spellLevel = 1 }
      , { spellId = "protection_from_evil_and_good", spellLevel = 1 }
      , { spellId = "speak_with_animals", spellLevel = 1 }
      , { spellId = "unseen_servant", spellLevel = 1 }
      , { spellId = "darkness", spellLevel = 2 }
      , { spellId = "enthrall", spellLevel = 2 }
      , { spellId = "hold_person", spellLevel = 2 }
      , { spellId = "invisibility", spellLevel = 2 }
      , { spellId = "mind_spike", spellLevel = 2 }
      , { spellId = "mirror_image", spellLevel = 2 }
      , { spellId = "misty_step", spellLevel = 2 }
      , { spellId = "ray_of_enfeeblement", spellLevel = 2 }
      , { spellId = "spider_climb", spellLevel = 2 }
      , { spellId = "suggestion", spellLevel = 2 }
      , { spellId = "counterspell", spellLevel = 3 }
      , { spellId = "dispel_magic", spellLevel = 3 }
      , { spellId = "fear", spellLevel = 3 }
      , { spellId = "fly", spellLevel = 3 }
      , { spellId = "gaseous_form", spellLevel = 3 }
      , { spellId = "hypnotic_pattern", spellLevel = 3 }
      , { spellId = "magic_circle", spellLevel = 3 }
      , { spellId = "major_image", spellLevel = 3 }
      , { spellId = "remove_curse", spellLevel = 3 }
      , { spellId = "tongues", spellLevel = 3 }
      , { spellId = "vampiric_touch", spellLevel = 3 }
      ]
    }
  , spellcastingAbility = "cha"
  , spellcastingFocus = "arcane_focus"
  }
, startingEquipment =
  [ { coinsGp = 15
    , id = "option_a"
    , items = Some
      [ { itemName = "Leather Armor"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Sickle"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Dagger", kind = "draft_owned_item", quantity = Some 2 }
      , { itemName = "Arcane Focus (orb)"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Book (occult lore)"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Scholar's Pack"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      ]
    , kind = "item_bundle"
    }
  , { coinsGp = 100
    , id = "option_b"
    , items =
        None
          (List { itemName : Text, kind : Text, quantity : Optional Natural })
    , kind = "coin_grant"
    }
  ]
, subclassChoices =
  [ { level = 3, options = [ "subclass_warlock_fiend_patron" ] } ]
, toolProficiencies.kind = "none"
, weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
}
