let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_piranha"
    , kind = "statBlock"
    , name = "Piranha"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1847-1870" }
    , statBlock =
      { abilityScores =
        { cha = 2, con = 9, dex = 16, int = 1, str = 2, wis = 7 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +5 (with Advantage if the target doesn't have all its Hit Points), reach 5 ft. *Hit:* 1 Piercing damage."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 1 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 8
      , savingThrowModifiers =
        [ { ability = "str", modifier = -4 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = -1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -2 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "tiny"
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Water Breathing"
            , description = "The piranha can breathe only underwater."
            , effectKind = None Text
            }
        ]
      }
    }
