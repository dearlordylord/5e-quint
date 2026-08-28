let T = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_ogre"
    , kind = "statBlock"
    , name = "Ogre"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:789-813" }
    , statBlock =
      { abilityScores =
        { str = 19, dex = 8, con = 16, int = 5, wis = 7, cha = 7 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Greatclub"
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
                    , rest = [] : List T.Effect
                    }
                  }
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Javelin"
            , description =
                "Melee or Ranged Attack Roll: +6, reach 5 ft. or range 30/120 ft. Hit: 11 (2d6 + 4) Piercing damage."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { order = "chaotic", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Common", "Giant" ] }
        }
      , creatureType = "giant"
      , gear =
        [ { item = "Greatclub", quantity = None Natural }
        , { item = "Javelin", quantity = Some 3 }
        ]
      , hp = { kind = "literal", value = 68 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 8
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -2 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = -1 }
        , { ability = "int", modifier = -3 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = -2 }
        ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        ]
      }
    }
