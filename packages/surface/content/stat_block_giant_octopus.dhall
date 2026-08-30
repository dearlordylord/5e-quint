let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_octopus"
    , kind = "statBlock"
    , name = "Giant Octopus"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1053-1081" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 13, dex = 13, int = 5, str = 17, wis = 10 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Tentacles"
            , description =
                "*Melee Attack Roll:* +5, reach 10 ft. *Hit:* 10 (2d6 + 3) Bludgeoning damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from all eight tentacles. While Grappled, the target has the Restrained condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 45 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = -4 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +4, skill = "perception" }
        , { modifier = +5, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Water Breathing"
            , description =
                "The octopus can breathe only underwater. It can hold its breath for 1 hour outside water."
            , effectKind = None Text
            }
        ]
      , reactions =
        [ S.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Ink Cloud"
            , description =
                "*Trigger:* The octopus takes damage while underwater. *Response:* The octopus releases ink that fills a 10-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1, ownership = "shared", limit = S.daily { uses = 1 } }
        ]
      }
    }
