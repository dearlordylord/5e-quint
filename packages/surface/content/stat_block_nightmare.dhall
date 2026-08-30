let T = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_nightmare"
    , kind = "statBlock"
    , name = "Nightmare"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:689-719" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 15, con = 16, int = 10, wis = 13, cha = 15 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Hooves"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "bludgeoning"
                          , dice = 2
                          , dieSize = 8
                          , flat = Some +4
                          , static = 13
                          }
                    , rest =
                          [ T.damage
                              { damageType = "fire"
                              , dice = 3
                              , dieSize = 6
                              , flat = None Integer
                              , static = 10
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Ethereal Stride"
            , description =
                "The nightmare and up to three willing creatures within 5 feet of it teleport to the Ethereal Plane from the Material Plane or vice versa."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Confer Fire Resistance"
            , description =
                "The nightmare can grant Resistance to Fire damage to a rider while it is on the nightmare."
            , effectKind = None Text
            }
        , T.trait
            { name = "Illumination"
            , description =
                "The nightmare sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "understood_but_cannot_speak"
        , languages =
          { kind = "named", languages = [ "Abyssal", "Common", "Infernal" ] }
        }
      , creatureType = "fiend"
      , hp = { kind = "literal", value = 68 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +2 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = +0 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +1 }
        ]
      , immunities =
        { conditions = None (List Text), damageTypes = Some [ "fire" ] }
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 60 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 90 }
          , hover = Some True
          }
        ]
      }
    }
