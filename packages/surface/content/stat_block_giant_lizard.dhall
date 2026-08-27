let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_lizard"
    , kind = "statBlock"
    , name = "Giant Lizard"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1026-1049" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 13, dex = 12, int = 2, str = 15, wis = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +2
                        , static = 6
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
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Spider Climb"
            , description =
                "The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check."
            , effectKind = None Text
            }
        ]
      }
    }
