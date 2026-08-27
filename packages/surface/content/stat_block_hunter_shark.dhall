let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_hunter_shark"
    , kind = "statBlock"
    , name = "Hunter Shark"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1508-1532" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 15, dex = 14, int = 1, str = 18, wis = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +6 (with Advantage if the target doesn't have all its Hit Points), reach 5 ft. *Hit:* 14 (3d6 + 4) Piercing damage."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 45 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers = [ { modifier = +2, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Water Breathing"
            , description = "The shark can breathe only underwater."
            , effectKind = None Text
            }
        ]
      }
    }
