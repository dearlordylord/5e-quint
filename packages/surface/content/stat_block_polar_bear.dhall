let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_polar_bear"
    , kind = "statBlock"
    , name = "Polar Bear"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1902-1925" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 16, dex = 14, int = 2, str = 20, wis = 13 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    { first =
                      { count = { kind = "literal", value = +2 }
                      , procedureOrdinal = 2
                      }
                    , rest = [] : List S.Dispatch
                    }
                  }
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +7
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 8
                          , flat = Some +5
                          , static = 9
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 42 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 15
      , resistances = { damageTypes = [ "cold" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +5 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +5, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      }
    }
