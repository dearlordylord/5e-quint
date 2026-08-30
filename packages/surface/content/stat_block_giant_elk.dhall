let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_giant_elk"
    , kind = "statBlock"
    , name = "Giant Elk"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:887-908" }
    , statBlock =
      { abilityScores =
        { cha = 10, con = 14, dex = 18, int = 7, str = 19, wis = 14 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Ram"
            , description =
                "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 11 (2d6 + 4) Bludgeoning damage plus 5 (2d4) Radiant damage. If the target is a Huge or smaller creature and the elk moved 20+ feet straight toward it immediately before the hit, the target takes an extra 5 (2d4) Bludgeoning damage and has the Prone condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = { morality = "good", order = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Celestial" ] }
        , additionallyUnderstoodButCannotSpeak = Some
          { kind = "named", languages = [ "Common", "Elvish", "Sylvan" ] }
        }
      , creatureType = "celestial"
      , hp = { kind = "literal", value = 42 }
      , initiative = { modifier = +6, score = 16 }
      , passivePerception = 14
      , resistances =
        { damageTypes = [ "necrotic", "radiant" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = +6 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -2 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = +0 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 90 } ]
      , size = "huge"
      , skillModifiers = [ { modifier = +4, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 60 }, kind = "walk" } ]
      }
    }
