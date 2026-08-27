let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_panther"
    , kind = "statBlock"
    , name = "Panther"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1819-1843" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 10, dex = 16, int = 3, str = 14, wis = 14 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Rend"
                  , attackAbility = "dex"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 1
                        , dieSize = 6
                        , flat = Some +3
                        , static = 6
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 13 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers =
        [ { modifier = +4, skill = "perception" }
        , { modifier = +7, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 50 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "climb" }
        ]
      , bonusActions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.actionOption
                  { name = "Nimble Escape", options = [ "disengage", "hide" ] }
            }
        ]
      }
    }
