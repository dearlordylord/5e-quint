let T = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_noble"
    , kind = "statBlock"
    , name = "Noble"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:723-750" }
    , statBlock =
      { abilityScores =
        { str = 11, dex = 12, con = 11, int = 12, wis = 14, cha = 16 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Rapier"
            , description =
                "Melee Attack Roll: +3, reach 5 ft. Hit: 5 (1d8 + 1) Piercing damage."
            , reason = "unsupported_action_shape"
            }
        ]
      , reactions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Parry"
            , description =
                "Trigger: The noble is hit by a melee attack roll while holding a weapon. Response: The noble adds 2 to its AC against that attack, possibly causing it to miss."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 2
          }
        }
      , creatureType = "humanoid"
      , gear =
        [ { item = "Breastplate", quantity = None Natural }
        , { item = "Rapier", quantity = None Natural }
        ]
      , hp = { kind = "literal", value = 9 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +3 }
        , { ability = "con", modifier = +0 }
        , { ability = "dex", modifier = +1 }
        , { ability = "int", modifier = +1 }
        , { ability = "str", modifier = +0 }
        , { ability = "wis", modifier = +2 }
        ]
      , skillModifiers =
        [ { skill = "deception", modifier = +5 }
        , { skill = "insight", modifier = +4 }
        , { skill = "persuasion", modifier = +5 }
        ]
      , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      }
    }
