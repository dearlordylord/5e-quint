let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_eagle"
    , kind = "statBlock"
    , name = "Eagle"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:508-528" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 12, dex = 15, int = 2, str = 6, wis = 14 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Talons"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +2
                          , static = 4
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 4 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 16
      , savingThrowModifiers =
        [ { ability = "str", modifier = -2 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "small"
      , skillModifiers = [ { modifier = +6, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "fly" }
        ]
      }
    }
