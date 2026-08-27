let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_frog"
    , kind = "statBlock"
    , name = "Giant Frog"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:940-970" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 11, dex = 13, int = 2, str = 12, wis = 10 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 11)."
            , reason = "unsupported_action_shape"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Swallow"
            , description =
                "The frog swallows a Small or smaller target it is grappling. While swallowed, the target isn't Grappled but has the Blinded and Restrained conditions, and it has Total Cover against attacks and other effects outside the frog. While swallowing the target, the frog can't use Bite, and if the frog dies, the swallowed target is no longer Restrained and can escape from the corpse using 5 feet of movement, exiting with the Prone condition."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 18 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 30 } ]
      , size = "medium"
      , skillModifiers =
        [ { modifier = +2, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Amphibious"
            , description = "The frog can breathe air and water."
            , effectKind = None Text
            }
        , S.trait
            { name = "Standing Leap"
            , description =
                "The frog's Long Jump is up to 20 feet and its High Jump is up to 10 feet with or without a running start."
            , effectKind = None Text
            }
        ]
      }
    }
