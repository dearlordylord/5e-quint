let S = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_ape"
    , kind = "statBlock"
    , name = "Ape"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:54-78" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 14, dex = 14, int = 6, str = 16, wis = 12 }
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
                  { name = "Fist"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +3
                          , static = 5
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        , S.resourceExecutable
            { procedureOrdinal = 3
            , procedure =
                S.rangedAttack
                  { name = "Rock"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , rangeFeet = { normal = 25, long = 50 }
                  , ammunition = None Text
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 2
                          , dieSize = 6
                          , flat = Some +3
                          , static = 10
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 19 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -2 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "medium"
      , skillModifiers =
        [ { modifier = +5, skill = "athletics" }
        , { modifier = +3, skill = "perception" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      , resources =
        [ S.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = S.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
