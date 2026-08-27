let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_animated_rug_of_smothering"
    , kind = "statBlock"
    , name = "Animated Rug of Smothering"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:152-176" }
    , statBlock =
        { abilityScores = { cha = 1, con = 10, dex = 14, int = 1, str = 17, wis = 3 }
        , ac.value = { kind = "literal", value = 12 }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Smother", description = "Smother. Melee Attack Roll: +5, reach 5 ft. Hit: 10 (2d6 + 3) Bludgeoning damage. If the target is a Medium or smaller creature, the rug can give it the Grappled condition (escape DC 13) instead of dealing damage. Until the grapple ends, the target has the Blinded and Restrained conditions, is suffocating, and takes 10 (2d6 + 3) Bludgeoning damage at the start of each of its turns. The rug can smother only one creature at a time. While grappling the target, the rug can't take this action, the rug halves the damage it takes (round down), and the target takes the same amount of damage.", reason = "unsupported_action_shape" }
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "construct"
        , hp = { kind = "literal", value = 27 }
        , immunities = { conditions = [ "charmed", "deafened", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned" ], damageTypes = [ "poison", "psychic" ] }
        , initiative = { modifier = 4, score = 14 }
        , passivePerception = 6
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = -5 }, { ability = "wis", modifier = -4 }, { ability = "cha", modifier = -5 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
        , size = "large"
        , speeds = [ { feet = { kind = "literal", value = 10 }, kind = "walk" } ]
        }
    }
