let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_wolf_spider"
    , kind = "statBlock"
    , name = "Giant Wolf Spider"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1402-1426" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 13, dex = 16, int = 3, str = 12, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "dex"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +3
                          , static = 5
                          }
                    , rest =
                      [ S.damage
                          { damageType = "poison"
                          , dice = 2
                          , dieSize = 4
                          , flat = None Integer
                          , static = 5
                          }
                      ]
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 11 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "medium"
      , skillModifiers =
        [ { modifier = +3, skill = "perception" }
        , { modifier = +7, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Spider Climb"
            , description =
                "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
            , effectKind = None Text
            }
        ]
      }
    }
