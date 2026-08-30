let T = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_magmin"
    , kind = "statBlock"
    , name = "Magmin"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:94-122" }
    , statBlock =
      { abilityScores =
        { str = 7, dex = 15, con = 12, int = 8, wis = 11, cha = 10 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Touch"
            , description =
                "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (2d4 + 2) Fire damage. If the target is a creature or a flammable object that isn't being worn or carried, it starts burning."
            , reason = "unsupported_action_shape"
            }
        ]
      , bonusActions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Ignited Illumination"
            , description =
                "The magmin sets itself ablaze or extinguishes its flames. While ablaze, the magmin sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Death Burst"
            , description =
                "The magmin explodes when it dies. Dexterity Saving Throw: DC 11, each creature in a 10-foot Emanation originating from the magmin. Failure: 7 (2d6) Fire damage. Success: Half damage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "chaotic", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Primordial (Ignan)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 13 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 10
      , immunities =
        { conditions = None (List Text), damageTypes = Some [ "fire" ] }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "small"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      }
    }
