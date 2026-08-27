let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_giant_weasel"
    , kind = "statBlock"
    , name = "Giant Weasel"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1378-1398" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 10, dex = 17, int = 4, str = 11, wis = 12 }
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
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 9 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +0 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers =
        [ { modifier = +5, skill = "acrobatics" }
        , { modifier = +3, skill = "perception" }
        , { modifier = +5, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      }
    }
