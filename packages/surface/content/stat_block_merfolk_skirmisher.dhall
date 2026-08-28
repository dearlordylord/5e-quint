let T = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_merfolk_skirmisher"
    , kind = "statBlock"
    , name = "Merfolk Skirmisher"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:374-397" }
    , statBlock =
      { abilityScores =
        { str = 10, dex = 13, con = 12, int = 11, wis = 14, cha = 12 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Ocean Spear"
            , description =
                "Melee or Ranged Attack Roll: +2, reach 5 ft. or range 20/60 ft. Hit: 3 (1d6) Piercing damage plus 2 (1d4) Cold damage. If the target is a creature, its Speed decreases by 10 feet until the end of its next turn. Hit or Miss: The spear magically returns to the merfolk's hand immediately after a ranged attack."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Amphibious"
            , description = "The merfolk can breathe air and water."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Common", "Primordial (Aquan)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 11 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 12
      , size = "medium"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 10 }
          , hover = None Bool
          }
        , { kind = "swim"
          , feet = { kind = "literal", value = 40 }
          , hover = None Bool
          }
        ]
      }
    }
