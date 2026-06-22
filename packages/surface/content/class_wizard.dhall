{ armorTraining.kind = "none"
, className = "wizard"
, description =
    "SRD Wizard class creation facts, including level 1-5 spellbook, prepared spells, Spell Slots, Ritual Adept, Arcane Recovery, Scholar, and spellcasting focus facts."
, featureGrants =
  [ { level = 1, unitId = "wizard_ritual_adept" }
  , { level = 1, unitId = "wizard_arcane_recovery" }
  , { level = 2, unitId = "wizard_scholar" }
  , { level = 4, unitId = "wizard_ability_score_improvement_l4" }
  ]
, hitPointDie = 6
, id = "class_wizard"
, kind = "class"
, multiclassProficiencies.kind = "none"
, name = "Wizard"
, primaryAbilities = { abilities = [ "int" ], kind = "all_of" }
, provenance =
  { kind = "srd-5.2.1"
  , section = "Classes/Wizard.md:3-25,31-43,56-82,94-114,138-266"
  }
, savingThrowProficiencies = [ "int", "wis" ]
, skillProficiencyChoice =
  { choose = 2
  , options =
    [ "arcana"
    , "history"
    , "insight"
    , "investigation"
    , "medicine"
    , "nature"
    , "religion"
    ]
  }
, spellcasting =
  { cantripAccess =
    { changeOn = { count = 1, kind = "long_rest" }
    , choose = 3
    , kind = "known_cantrips"
    , spellIds =
      [ "acid_splash"
      , "chill_touch"
      , "dancing_lights"
      , "elementalism"
      , "fire_bolt"
      , "light"
      , "mage_hand"
      , "mending"
      , "message"
      , "minor_illusion"
      , "poison_spray"
      , "prestidigitation"
      , "ray_of_frost"
      , "shocking_grasp"
      , "true_strike"
      ]
    }
  , featureLevel = 1
  , kind = "wizard_spellcasting_creation"
  , preparedAccess =
    { changeOn.kind = "long_rest"
    , choose = 4
    , kind = "prepared_from_spellbook"
    , spellIds =
      [ "alarm"
      , "burning_hands"
      , "charm_person"
      , "chromatic_orb"
      , "color_spray"
      , "comprehend_languages"
      , "detect_magic"
      , "disguise_self"
      , "expeditious_retreat"
      , "false_life"
      , "feather_fall"
      , "find_familiar"
      , "floating_disk"
      , "fog_cloud"
      , "grease"
      , "hideous_laughter"
      , "ice_knife"
      , "identify"
      , "illusory_script"
      , "jump"
      , "longstrider"
      , "mage_armor"
      , "magic_missile"
      , "protection_from_evil_and_good"
      , "ray_of_sickness"
      , "shield"
      , "silent_image"
      , "sleep"
      , "thunderwave"
      , "unseen_servant"
      , "acid_arrow"
      , "alter_self"
      , "arcane_lock"
      , "arcanists_magic_aura"
      , "augury"
      , "blindness_deafness"
      , "blur"
      , "continual_flame"
      , "darkness"
      , "darkvision"
      , "detect_thoughts"
      , "dragons_breath"
      , "enhance_ability"
      , "enlarge_reduce"
      , "flaming_sphere"
      , "gentle_repose"
      , "gust_of_wind"
      , "hold_person"
      , "invisibility"
      , "knock"
      , "levitate"
      , "locate_object"
      , "magic_mouth"
      , "magic_weapon"
      , "mind_spike"
      , "mirror_image"
      , "misty_step"
      , "ray_of_enfeeblement"
      , "rope_trick"
      , "scorching_ray"
      , "see_invisibility"
      , "shatter"
      , "spider_climb"
      , "suggestion"
      , "web"
      , "animate_dead"
      , "bestow_curse"
      , "blink"
      , "clairvoyance"
      , "counterspell"
      , "dispel_magic"
      , "fear"
      , "fireball"
      , "fly"
      , "gaseous_form"
      , "glyph_of_warding"
      , "haste"
      , "hypnotic_pattern"
      , "lightning_bolt"
      , "magic_circle"
      , "major_image"
      , "nondetection"
      , "phantom_steed"
      , "protection_from_energy"
      , "remove_curse"
      , "sending"
      , "sleet_storm"
      , "slow"
      , "speak_with_dead"
      , "stinking_cloud"
      , "tiny_hut"
      , "tongues"
      , "vampiric_touch"
      , "water_breathing"
      ]
    }
  , spellSlotProjection =
    { kind = "leveled_spell_slots"
    , resetCadence.kind = "long_rest"
    , slots = [ { count = 2, spellLevel = 1 } ]
    }
  , spellbookAccess =
    { choose = 6
    , kind = "spellbook"
    , spells =
      [ { spellId = "alarm", spellLevel = 1 }
      , { spellId = "burning_hands", spellLevel = 1 }
      , { spellId = "charm_person", spellLevel = 1 }
      , { spellId = "chromatic_orb", spellLevel = 1 }
      , { spellId = "color_spray", spellLevel = 1 }
      , { spellId = "comprehend_languages", spellLevel = 1 }
      , { spellId = "detect_magic", spellLevel = 1 }
      , { spellId = "disguise_self", spellLevel = 1 }
      , { spellId = "expeditious_retreat", spellLevel = 1 }
      , { spellId = "false_life", spellLevel = 1 }
      , { spellId = "feather_fall", spellLevel = 1 }
      , { spellId = "find_familiar", spellLevel = 1 }
      , { spellId = "floating_disk", spellLevel = 1 }
      , { spellId = "fog_cloud", spellLevel = 1 }
      , { spellId = "grease", spellLevel = 1 }
      , { spellId = "hideous_laughter", spellLevel = 1 }
      , { spellId = "ice_knife", spellLevel = 1 }
      , { spellId = "identify", spellLevel = 1 }
      , { spellId = "illusory_script", spellLevel = 1 }
      , { spellId = "jump", spellLevel = 1 }
      , { spellId = "longstrider", spellLevel = 1 }
      , { spellId = "mage_armor", spellLevel = 1 }
      , { spellId = "magic_missile", spellLevel = 1 }
      , { spellId = "protection_from_evil_and_good", spellLevel = 1 }
      , { spellId = "ray_of_sickness", spellLevel = 1 }
      , { spellId = "shield", spellLevel = 1 }
      , { spellId = "silent_image", spellLevel = 1 }
      , { spellId = "sleep", spellLevel = 1 }
      , { spellId = "thunderwave", spellLevel = 1 }
      , { spellId = "unseen_servant", spellLevel = 1 }
      , { spellId = "acid_arrow", spellLevel = 2 }
      , { spellId = "alter_self", spellLevel = 2 }
      , { spellId = "arcane_lock", spellLevel = 2 }
      , { spellId = "arcanists_magic_aura", spellLevel = 2 }
      , { spellId = "augury", spellLevel = 2 }
      , { spellId = "blindness_deafness", spellLevel = 2 }
      , { spellId = "blur", spellLevel = 2 }
      , { spellId = "continual_flame", spellLevel = 2 }
      , { spellId = "darkness", spellLevel = 2 }
      , { spellId = "darkvision", spellLevel = 2 }
      , { spellId = "detect_thoughts", spellLevel = 2 }
      , { spellId = "dragons_breath", spellLevel = 2 }
      , { spellId = "enhance_ability", spellLevel = 2 }
      , { spellId = "enlarge_reduce", spellLevel = 2 }
      , { spellId = "flaming_sphere", spellLevel = 2 }
      , { spellId = "gentle_repose", spellLevel = 2 }
      , { spellId = "gust_of_wind", spellLevel = 2 }
      , { spellId = "hold_person", spellLevel = 2 }
      , { spellId = "invisibility", spellLevel = 2 }
      , { spellId = "knock", spellLevel = 2 }
      , { spellId = "levitate", spellLevel = 2 }
      , { spellId = "locate_object", spellLevel = 2 }
      , { spellId = "magic_mouth", spellLevel = 2 }
      , { spellId = "magic_weapon", spellLevel = 2 }
      , { spellId = "mind_spike", spellLevel = 2 }
      , { spellId = "mirror_image", spellLevel = 2 }
      , { spellId = "misty_step", spellLevel = 2 }
      , { spellId = "ray_of_enfeeblement", spellLevel = 2 }
      , { spellId = "rope_trick", spellLevel = 2 }
      , { spellId = "scorching_ray", spellLevel = 2 }
      , { spellId = "see_invisibility", spellLevel = 2 }
      , { spellId = "shatter", spellLevel = 2 }
      , { spellId = "spider_climb", spellLevel = 2 }
      , { spellId = "suggestion", spellLevel = 2 }
      , { spellId = "web", spellLevel = 2 }
      , { spellId = "animate_dead", spellLevel = 3 }
      , { spellId = "bestow_curse", spellLevel = 3 }
      , { spellId = "blink", spellLevel = 3 }
      , { spellId = "clairvoyance", spellLevel = 3 }
      , { spellId = "counterspell", spellLevel = 3 }
      , { spellId = "dispel_magic", spellLevel = 3 }
      , { spellId = "fear", spellLevel = 3 }
      , { spellId = "fireball", spellLevel = 3 }
      , { spellId = "fly", spellLevel = 3 }
      , { spellId = "gaseous_form", spellLevel = 3 }
      , { spellId = "glyph_of_warding", spellLevel = 3 }
      , { spellId = "haste", spellLevel = 3 }
      , { spellId = "hypnotic_pattern", spellLevel = 3 }
      , { spellId = "lightning_bolt", spellLevel = 3 }
      , { spellId = "magic_circle", spellLevel = 3 }
      , { spellId = "major_image", spellLevel = 3 }
      , { spellId = "nondetection", spellLevel = 3 }
      , { spellId = "phantom_steed", spellLevel = 3 }
      , { spellId = "protection_from_energy", spellLevel = 3 }
      , { spellId = "remove_curse", spellLevel = 3 }
      , { spellId = "sending", spellLevel = 3 }
      , { spellId = "sleet_storm", spellLevel = 3 }
      , { spellId = "slow", spellLevel = 3 }
      , { spellId = "speak_with_dead", spellLevel = 3 }
      , { spellId = "stinking_cloud", spellLevel = 3 }
      , { spellId = "tiny_hut", spellLevel = 3 }
      , { spellId = "tongues", spellLevel = 3 }
      , { spellId = "vampiric_touch", spellLevel = 3 }
      , { spellId = "water_breathing", spellLevel = 3 }
      ]
    }
  , spellcastingAbility = "int"
  , spellcastingFocuses = [ "arcane_focus", "spellbook" ]
  , spellcastingProgression =
    [ { atLevel = 1
      , cantripCount = 3
      , preparedSpellCount = 4
      , spellSlots = [ { count = 2, spellLevel = 1 } ]
      , spellbookSpellCount = 6
      }
    , { atLevel = 2
      , cantripCount = 3
      , preparedSpellCount = 5
      , spellSlots = [ { count = 3, spellLevel = 1 } ]
      , spellbookSpellCount = 8
      }
    , { atLevel = 3
      , cantripCount = 3
      , preparedSpellCount = 6
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 2, spellLevel = 2 } ]
      , spellbookSpellCount = 10
      }
    , { atLevel = 4
      , cantripCount = 4
      , preparedSpellCount = 7
      , spellSlots =
        [ { count = 4, spellLevel = 1 }, { count = 3, spellLevel = 2 } ]
      , spellbookSpellCount = 12
      }
    , { atLevel = 5
      , cantripCount = 4
      , preparedSpellCount = 9
      , spellSlots =
        [ { count = 4, spellLevel = 1 }
        , { count = 3, spellLevel = 2 }
        , { count = 2, spellLevel = 3 }
        ]
      , spellbookSpellCount = 14
      }
    ]
  }
, startingEquipment =
  [ { coinsGp = 5
    , id = "option_a"
    , items = Some
      [ { itemName = "Dagger", kind = "draft_owned_item", quantity = Some 2 }
      , { itemName = "Arcane Focus (Quarterstaff)"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Robe"
        , kind = "draft_owned_item"
        , quantity = None Natural
        }
      , { itemName = "Spellbook"
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
  , { coinsGp = 55
    , id = "option_b"
    , items =
        None
          (List { itemName : Text, kind : Text, quantity : Optional Natural })
    , kind = "coin_grant"
    }
  ]
, subclassChoices = [ { level = 3, options = [ "subclass_wizard_evoker" ] } ]
, toolProficiencies.kind = "none"
, weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
}
