{ challengeRating = 0.5
, id = "stat_block_worg"
, kind = "statBlock"
, name = "Worg"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:1186-1207" }
, statBlock =
  { abilityScores = { cha = 8, con = 13, dex = 13, int = 7, str = 16, wis = 11 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description =
          "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage, and the next attack roll made against the target before the start of the worg's next turn has Advantage."
      , kind = "textOnly"
      , name = "Bite"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Goblin", "Worg" ] }
    }
  , creatureType = "fey"
  , hp = { kind = "literal", value = 26 }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 14
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +1 }
    , { ability = "dex", modifier = +1 }
    , { ability = "int", modifier = -2 }
    , { ability = "str", modifier = +3 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 4, skill = "perception" } ]
  , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
  }
}
