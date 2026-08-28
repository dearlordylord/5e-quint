let T = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_minotaur_of_baphomet"
    , kind = "statBlock"
    , name = "Minotaur of Baphomet"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:471-495" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 11, con = 16, int = 6, wis = 16, cha = 9 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Abyssal Glaive"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 10
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 12
                          , flat = Some +4
                          , static = 10
                          }
                    , rest =
                          [ T.damage
                              { damageType = "necrotic"
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
        , T.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Gore (Recharge 5–6)"
            , description =
                "Melee Attack Roll: +6, reach 5 ft. Hit: 18 (4d6 + 4) Piercing damage. If the target is a Large or smaller creature and the minotaur moved 10+ feet straight toward it immediately before the hit, the target takes an extra 10 (3d6) Piercing damage and has the Prone condition."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , alignment = { order = "chaotic", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Abyssal" ] }
        }
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 85 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 17
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -1 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +0 }
        , { ability = "int", modifier = -2 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +3 }
        ]
      , skillModifiers =
        [ { skill = "perception", modifier = +7 }
        , { skill = "survival", modifier = +7 }
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
      , resources =
        [ T.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 5 }
            }
        ]
      }
    }
