let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_plesiosaurus"
    , kind = "statBlock"
    , name = "Plesiosaurus"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1874-1898" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 16, dex = 15, int = 2, str = 18, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 2
                        , dieSize = 6
                        , flat = Some +4
                        , static = 11
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 68 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +3, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Hold Breath"
            , description = "The plesiosaurus can hold its breath for 1 hour."
            , effectKind = None Text
            }
        ]
      }
    }
