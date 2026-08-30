let T = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_mummy"
    , kind = "statBlock"
    , name = "Mummy"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:499-526" }
    , statBlock =
      { abilityScores =
        { str = 16, dex = 8, con = 15, int = 6, wis = 12, cha = 12 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The mummy makes two Rotting Fist attacks and uses Dreadful Glare."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Rotting Fist"
            , description =
                "Melee Attack Roll: +5, reach 5 ft. Hit: 8 (1d10 + 3) Bludgeoning damage plus 10 (3d6) Necrotic damage. If the target is a creature, it is cursed. While cursed, the target can't regain Hit Points, its Hit Point maximum doesn't return to normal when finishing a Long Rest, and its Hit Point maximum decreases by 10 (3d6) every 24 hours that elapse. A creature dies and turns to dust if reduced to 0 Hit Points by this attack."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Dreadful Glare"
            , description =
                "Wisdom Saving Throw: DC 11, one creature the mummy can see within 60 feet. Failure: The target has the Frightened condition until the end of the mummy's next turn. Success: The target is immune to this mummy's Dreadful Glare for 24 hours."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { order = "lawful", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named_plus_other_languages"
          , languages = [ "Common" ]
          , additionalLanguages = 2
          }
        }
      , creatureType = "undead"
      , hp = { kind = "literal", value = 58 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +1 }
        , { ability = "con", modifier = +2 }
        , { ability = "dex", modifier = -1 }
        , { ability = "int", modifier = -2 }
        , { ability = "str", modifier = +3 }
        , { ability = "wis", modifier = +3 }
        ]
      , vulnerabilities = { kind = "fixed", damageTypes = [ "fire" ] }
      , immunities =
        { conditions = Some
          [ "charmed", "exhaustion", "frightened", "paralyzed", "poisoned" ]
        , damageTypes = Some [ "necrotic", "poison" ]
        }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 20 }
          , hover = None Bool
          }
        ]
      }
    }
