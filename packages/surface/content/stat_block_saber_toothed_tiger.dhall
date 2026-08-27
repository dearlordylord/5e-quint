let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_saber_toothed_tiger"
    , kind = "statBlock"
    , name = "Saber-Toothed Tiger"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2112-2142" }
    , statBlock =
      { abilityScores =
        { cha = 8, con = 15, dex = 17, int = 3, str = 18, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
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
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
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
      , hp = { kind = "literal", value = 52 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = +5 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -1 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +5, skill = "perception" }
        , { modifier = +7, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      , traits =
        [ S.trait
            { name = "Running Leap"
            , description =
                "With a 10-foot running start, the tiger can Long Jump up to 25 feet."
            , effectKind = None Text
            }
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
