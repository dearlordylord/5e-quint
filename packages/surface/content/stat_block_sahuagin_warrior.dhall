{ challengeRating = 0.5
, id = "stat_block_sahuagin_warrior"
, kind = "statBlock"
, name = "Sahuagin Warrior"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:723-757" }
, statBlock =
  { abilityScores =
    { cha = 9, con = 12, dex = 11, int = 12, str = 13, wis = 13 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = "The sahuagin makes two Claw attacks."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee Attack Roll: +3, reach 5 ft. Hit: 4 (1d6 + 1) Slashing damage."
      , kind = "textOnly"
      , name = "Claw"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , bonusActions =
    [ { description =
          "The sahuagin swims up to its Swim Speed straight toward an enemy it can see."
      , kind = "textOnly"
      , name = "Aquatic Charge"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Sahuagin" ] }
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 22 }
  , initiative = { modifier = 0, score = 10 }
  , passivePerception = 15
  , resistances = { damageTypes = [ "acid", "cold" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +1 }
    , { ability = "dex", modifier = +0 }
    , { ability = "int", modifier = +1 }
    , { ability = "str", modifier = +1 }
    , { ability = "wis", modifier = +1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "medium"
  , skillModifiers = [ { modifier = 5, skill = "perception" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 40 }, kind = "swim" }
    ]
  , traits =
    [ { description =
          "The sahuagin has Advantage on attack rolls against any creature that doesn't have all its Hit Points."
      , name = "Blood Frenzy"
      }
    , { description =
          "The sahuagin can breathe air and water, but it must be submerged at least once every 4 hours to avoid suffocating outside water."
      , name = "Limited Amphibiousness"
      }
    , { description =
          "The sahuagin can magically control sharks within 120 feet of itself, using a special telepathy."
      , name = "Shark Telepathy"
      }
    ]
  }
}
