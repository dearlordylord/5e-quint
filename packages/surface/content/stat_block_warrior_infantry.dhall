{ challengeRating = 0.125
, id = "stat_block_warrior_infantry"
, kind = "statBlock"
, name = "Warrior Infantry"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:627-652" }
, statBlock =
  { abilityScores = { cha = 8, con = 11, dex = 11, int = 8, str = 13, wis = 11 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description =
          "Melee or Ranged Attack Roll: +3, reach 5 ft. or range 20/60 ft. Hit: 4 (1d6 + 1) Piercing damage."
      , kind = "textOnly"
      , name = "Spear"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Common" ] }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Chain Shirt", quantity = 1 }, { item = "Spear", quantity = 1 } ]
  , hp = { kind = "literal", value = 9 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +0 }
    , { ability = "dex", modifier = +0 }
    , { ability = "int", modifier = -1 }
    , { ability = "str", modifier = +1 }
    , { ability = "wis", modifier = +0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The warrior has Advantage on an attack roll against a creature if at least one of the warrior's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
      , name = "Pack Tactics"
      }
    ]
  }
}
