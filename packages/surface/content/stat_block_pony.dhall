let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_pony"
    , kind = "statBlock"
    , name = "Pony"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1929-1948" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 13, dex = 10, int = 2, str = 15, wis = 11 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Hooves"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 1
                          , dieSize = 8
                          , flat = Some +3
                          , static = 7
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 11 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "medium"
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      }
    }
