let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_toad"
    , kind = "statBlock"
    , name = "Giant Toad"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1267-1294" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 13, dex = 13, int = 2, str = 15, wis = 10 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage plus 5 (2d4) Poison damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 12)."
            , reason = "unsupported_action_shape"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Swallow"
            , description =
                "The toad swallows a Medium or smaller target it is grappling. While swallowed, the target isn't Grappled but has the Blinded and Restrained conditions, and it has Total Cover against attacks and other effects outside the toad. In addition, the target takes 10 (3d6) Acid damage at the end of each of the toad's turns. The toad can have only one target swallowed at a time, and it can't use Bite while it has a swallowed target. If the toad dies, a swallowed creature is no longer Restrained and can escape from the corpse using 5 feet of movement, exiting with the Prone condition."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 39 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Amphibious"
            , description = "The toad can breathe air and water."
            , effectKind = None Text
            }
        , S.trait
            { name = "Standing Leap"
            , description =
                "The toad's Long Jump is up to 20 feet and its High Jump is up to 10 feet with or without a running start."
            , effectKind = None Text
            }
        ]
      }
    }
