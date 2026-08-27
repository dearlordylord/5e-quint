let S = ./_stat_block_types.dhall

in  { challengeRating = 4
    , id = "stat_block_archelon"
    , kind = "statBlock"
    , name = "Archelon"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:82-108" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 13, dex = 16, int = 4, str = 18, wis = 14 }
      , ac.value = { kind = "literal", value = 17 }
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
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 3
                          , dieSize = 6
                          , flat = Some +4
                          , static = 14
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 90 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "huge"
      , skillModifiers = [ { modifier = +5, skill = "stealth" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
        , { feet = { kind = "literal", value = 80 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Amphibious"
            , description = "The archelon can breathe air and water."
            , effectKind = None Text
            }
        ]
      }
    }
