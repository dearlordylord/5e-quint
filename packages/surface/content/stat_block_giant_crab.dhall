let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_giant_crab"
    , kind = "statBlock"
    , name = "Giant Crab"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:800-824" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 11, dex = 13, int = 1, str = 13, wis = 9 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Claw"
            , description =
                "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 4 (1d6 + 1) Bludgeoning damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 11) from one of two claws."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 13 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 9
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 30 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +3, skill = "stealth" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Amphibious"
            , description = "The crab can breathe air and water."
            , effectKind = None Text
            }
        ]
      }
    }
