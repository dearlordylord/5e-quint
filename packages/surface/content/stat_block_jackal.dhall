let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_jackal"
    , kind = "statBlock"
    , name = "Jackal"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1564-1584" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 11, dex = 15, int = 3, str = 8, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +1
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 4
                        , flat = Some -1
                        , static = 1
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 3 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = -1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 90 } ]
      , size = "small"
      , skillModifiers =
        [ { modifier = +5, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      }
    }
