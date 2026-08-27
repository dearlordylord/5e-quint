let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_draft_horse"
    , kind = "statBlock"
    , name = "Draft Horse"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:485-504" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 15, dex = 10, int = 2, str = 18, wis = 11 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Hooves"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +4
                          , static = 6
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 15 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "large"
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      }
    }
