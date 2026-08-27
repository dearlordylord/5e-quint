let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_tiger"
    , kind = "statBlock"
    , name = "Tiger"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2408-2432" }
    , statBlock =
      { abilityScores =
        { cha = 8, con = 14, dex = 16, int = 3, str = 17, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 2
                        , dieSize = 6
                        , flat = Some +3
                        , static = 10
                        }
                    , S.conditionIfSize
                        { condition = "prone", maxCreatureSize = "large" }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 30 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -1 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +3, skill = "perception" }
        , { modifier = +7, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
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
