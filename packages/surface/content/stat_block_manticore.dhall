let T = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_manticore"
    , kind = "statBlock"
    , name = "Manticore"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:126-151" }
    , statBlock =
      { abilityScores =
        { str = 17, dex = 16, con = 17, int = 7, wis = 12, cha = 8 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The manticore makes three attacks, using Rend or Tail Spike in any combination."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Rend"
            , description =
                "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Slashing damage."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Tail Spike"
            , description =
                "Ranged Attack Roll: +5, range 100/200 ft. Hit: 7 (1d8 + 3) Piercing damage."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { order = "lawful", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Common" ] }
        }
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 68 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -1 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +3 }
        , { ability = "int", modifier = -2 }
        , { ability = "str", modifier = +3 }
        , { ability = "wis", modifier = +1 }
        ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 50 }
          , hover = None Bool
          }
        ]
      }
    }
