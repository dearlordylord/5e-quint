{ challengeRating = 1
, id = "stat_block_pirate"
, kind = "statBlock"
, name = "Pirate"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:67-90" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 12, dex = 16, int = 8, str = 10, wis = 12 }
  , ac.value = { kind = "literal", value = 14 }
  , actions =
    [ { description =
          "The pirate makes two Dagger attacks. It can replace one attack with a use of Enthralling Panache."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee or Ranged Attack Roll: +5, reach 5 ft. or range 20/60 ft. Hit: 5 (1d4 + 3) Piercing damage."
      , kind = "textOnly"
      , name = "Dagger"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Wisdom Saving Throw: DC 12, one creature the pirate can see within 30 feet. Failure: The target has the Charmed condition until the start of the pirate's next turn."
      , kind = "textOnly"
      , name = "Enthralling Panache"
      , procedureOrdinal = 3
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Dagger", quantity = 6 }
    , { item = "Leather Armor", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 33 }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 11
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +4 }
    , { ability = "con", modifier = +1 }
    , { ability = "dex", modifier = +3 }
    , { ability = "int", modifier = -1 }
    , { ability = "str", modifier = +0 }
    , { ability = "wis", modifier = +1 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
