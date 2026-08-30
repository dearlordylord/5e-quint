{ challengeRating = 0.5
, id = "stat_block_satyr"
, kind = "statBlock"
, name = "Satyr"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:793-818" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 11, dex = 16, int = 12, str = 12, wis = 10 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description =
          "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Bludgeoning damage. If the target is a Medium or smaller creature, the satyr pushes the target up to 10 feet straight away from itself."
      , kind = "textOnly"
      , name = "Hooves"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Wisdom Saving Throw: DC 12, one creature the satyr can see within 90 feet. Failure: 5 (1d6 + 2) Psychic damage."
      , kind = "textOnly"
      , name = "Mockery"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "chaotic" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named", languages = [ "Common", "Elvish", "Sylvan" ] }
    }
  , creatureType = "fey"
  , hp = { kind = "literal", value = 31 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 12
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 2 }
    , { ability = "con", modifier = 0 }
    , { ability = "dex", modifier = 3 }
    , { ability = "int", modifier = 1 }
    , { ability = "str", modifier = 1 }
    , { ability = "wis", modifier = 0 }
    ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 2, skill = "perception" }
    , { modifier = 6, skill = "performance" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The satyr has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    ]
  }
}
