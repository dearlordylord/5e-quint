let S = ./_stat_block_types.dhall

in  { challengeRating = 4
    , id = "stat_block_hippopotamus"
    , kind = "statBlock"
    , name = "Hippopotamus"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1478-1504" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 15, dex = 7, int = 2, str = 21, wis = 12 }
      , ac.value = { kind = "literal", value = 14 }
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
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +7
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 2
                        , dieSize = 10
                        , flat = Some +5
                        , static = 16
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 82 }
      , initiative = { modifier = -2, score = 8 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +7 }
        , { ability = "dex", modifier = -2 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "large"
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Hold Breath"
            , description =
                "The hippopotamus can hold its breath for 10 minutes."
            , effectKind = None Text
            }
        ]
      }
    }
