let T = ./_stat_block_types.dhall

in  { challengeRating = 5
    , id = "stat_block_otyugh"
    , kind = "statBlock"
    , name = "Otyugh"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:862-889" }
    , statBlock =
      { abilityScores =
        { str = 16, dex = 11, con = 19, int = 6, wis = 13, cha = 6 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The otyugh makes one Bite attack and two Tentacle attacks."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 2
            , name = "Bite"
            , description =
                "Melee Attack Roll: +6, reach 5 ft. Hit: 12 (2d8 + 3) Piercing damage, and the target has the Poisoned condition. Whenever the Poisoned target finishes a Long Rest, it is subjected to the following effect. Constitution Saving Throw: DC 15. Failure: The target's Hit Point maximum decreases by 5 (1d10) and doesn't return to normal until the Poisoned condition ends on the target. Success: The Poisoned condition ends."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 3
            , name = "Tentacle"
            , description =
                "Melee Attack Roll: +6, reach 10 ft. Hit: 12 (2d8 + 3) Piercing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from one of two tentacles."
            , reason = "unsupported_action_shape"
            }
        , T.textOnly
            { procedureOrdinal = 4
            , name = "Tentacle Slam"
            , description =
                "Constitution Saving Throw: DC 14, each creature Grappled by the otyugh. Failure: 16 (3d8 + 3) Bludgeoning damage, and the target has the Stunned condition until the start of the otyugh's next turn. Success: Half damage only."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Otyugh" ] }
        , telepathy = Some
          { rangeFeet = 120
          , response = Some "receiving_creature_cannot_respond"
          , requiresLanguageUnderstanding =
              None { kind : Text, languages : List Text }
          }
        }
      , creatureType = "aberration"
      , hp = { kind = "literal", value = 104 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "cha", modifier = -2 }
        , { ability = "con", modifier = +7 }
        , { ability = "dex", modifier = +0 }
        , { ability = "int", modifier = -2 }
        , { ability = "str", modifier = +3 }
        , { ability = "wis", modifier = +1 }
        ]
      , senses =
        [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
      , size = "large"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      }
    }
