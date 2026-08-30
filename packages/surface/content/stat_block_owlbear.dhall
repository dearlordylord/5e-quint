let T = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_owlbear"
    , kind = "statBlock"
    , name = "Owlbear"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:893-917" }
    , statBlock =
      { abilityScores =
        { str = 20, dex = 12, con = 17, int = 3, wis = 12, cha = 7 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    { first =
                      { procedureOrdinal = 2
                      , count = { kind = "literal", value = +2 }
                      }
                    , rest = [] : List T.Dispatch
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.meleeAttack
                  { name = "Rend"
                  , attackAbility = "str"
                  , attackBonus = +7
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 2
                          , dieSize = 8
                          , flat = Some +5
                          , static = 14
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 59 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -2 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "str", modifier = +5 }
        , { ability = "wis", modifier = +1 }
        ]
      , skillModifiers = [ { skill = "perception", modifier = +5 } ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        , { kind = "climb"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        ]
      }
    }
