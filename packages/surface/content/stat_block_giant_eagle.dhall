let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_eagle"
    , kind = "statBlock"
    , name = "Giant Eagle"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:860-883" }
    , statBlock =
      { abilityScores =
        { cha = 10, con = 13, dex = 17, int = 8, str = 16, wis = 14 }
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
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "slashing"
                        , dice = 1
                        , dieSize = 4
                        , flat = Some +3
                        , static = 5
                        }
                    , S.damage
                        { damageType = "radiant"
                        , dice = 1
                        , dieSize = 6
                        , flat = None Integer
                        , static = 3
                        }
                    ]
                  }
            }
        ]
      , alignment = { morality = "good", order = "neutral" }
      , communication =
        { kind = "understood_but_cannot_speak"
        , languages =
          { kind = "named"
          , languages = [ "Celestial", "Common", "Primordial (Auran)" ]
          }
        }
      , creatureType = "celestial"
      , hp = { kind = "literal", value = 26 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 16
      , resistances =
        { damageTypes = [ "necrotic", "radiant" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -1 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = +0 }
        ]
      , size = "large"
      , skillModifiers = [ { modifier = +6, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 80 }, kind = "fly" }
        ]
      }
    }
