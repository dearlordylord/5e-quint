let S = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_black_bear"
    , kind = "statBlock"
    , name = "Black Bear"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:187-209" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 14, dex = 12, int = 2, str = 15, wis = 12 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    [ { count = { kind = "literal", value = +2 }
                      , procedureOrdinal = 2
                      }
                    ]
                  }
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 1
                        , dieSize = 6
                        , flat = Some +2
                        , static = 5
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 19 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +5, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      }
    }
