let S = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_killer_whale"
    , kind = "statBlock"
    , name = "Killer Whale"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1588-1612" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 13, dex = 14, int = 3, str = 19, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 5
                        , dieSize = 6
                        , flat = Some +4
                        , static = 21
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 90 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 120 } ]
      , size = "huge"
      , skillModifiers =
        [ { modifier = +3, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Hold Breath"
            , description = "The whale can hold its breath for 30 minutes."
            , effectKind = None Text
            }
        ]
      }
    }
