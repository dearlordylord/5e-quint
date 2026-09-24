{ challengeRating = 2
, id = "stat_block_griffon"
, kind = "statBlock"
, name = "Griffon"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:8526-8594" }
, statBlock =
  { abilityScores = { cha = 8, con = 16, dex = 15, int = 2, str = 18, wis = 13 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description = "The griffon makes two Rend attacks."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee Attack Roll: +6, reach 5 ft. Hit: 8 (1d8 + 4) Piercing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 14) from both of the griffon's front claws."
      , kind = "textOnly"
      , name = "Rend"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = "unaligned"
  , communication.kind = "none"
  , creatureType = "monstrosity"
  , hp = { kind = "literal", value = 59 }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 15
  , savingThrowModifiers =
    [ { ability = "str", modifier = +4 }
    , { ability = "dex", modifier = +2 }
    , { ability = "con", modifier = +3 }
    , { ability = "int", modifier = -4 }
    , { ability = "wis", modifier = +1 }
    , { ability = "cha", modifier = -1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , skillModifiers = [ { modifier = 5, skill = "perception" } ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 80 }, kind = "fly" }
    ]
  }
}
