{ challengeRating = 0.5
, id = "stat_block_warhorse_skeleton"
, kind = "statBlock"
, name = "Warhorse Skeleton"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1179-1199" }
, statBlock =
  { abilityScores = { cha = 5, con = 15, dex = 12, int = 2, str = 18, wis = 8 }
  , ac.value = { kind = "literal", value = 13 }
  , actions =
    [ { description =
          "Melee Attack Roll: +6, reach 5 ft. Hit: 7 (1d6 + 4) Bludgeoning damage. If the target is a Large or smaller creature and the skeleton moved 20+ feet straight toward it immediately before the hit, the target has the Prone condition."
      , kind = "textOnly"
      , name = "Hooves"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "lawful" }
  , communication.kind = "none"
  , creatureType = "undead"
  , hp = { kind = "literal", value = 22 }
  , immunities =
    { conditions = [ "exhaustion", "poisoned" ], damageTypes = [ "poison" ] }
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 9
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -3 }
    , { ability = "con", modifier = +2 }
    , { ability = "dex", modifier = +1 }
    , { ability = "int", modifier = -4 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = -1 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 60 }, kind = "walk" } ]
  , vulnerabilities = { damageTypes = [ "bludgeoning" ], kind = "fixed" }
  }
}
