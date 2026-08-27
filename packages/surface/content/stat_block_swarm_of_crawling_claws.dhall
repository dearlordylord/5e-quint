let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_swarm_of_crawling_claws"
    , kind = "statBlock"
    , name = "Swarm of Crawling Claws"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:521-546" }
    , statBlock =
        { abilityScores = { str = 14, dex = 14, con = 11, int = 5, wis = 10, cha = 4 }
        , ac = { value = { kind = "literal", value = 12 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Swarm of Grasping Hands", description = "Melee Attack Roll: +4, reach 5 ft. Hit: 20 (4d8 + 2) Necrotic damage, or 11 (2d8 + 2) Necrotic damage if the swarm is Bloodied. If the target is a Medium or smaller creature, it has the Prone condition.", reason = "unsupported_action_shape" }
            ]
        , traits = [ T.trait { name = "Swarm", description = "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny creature. The swarm can't regain Hit Points or gain Temporary Hit Points.", effectKind = (None Text) } ]
        , alignment = { order = "neutral", morality = "evil" }
        , communication = { kind = "understood_but_cannot_speak", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "undead"
        , creatureTypeTags = [ "swarm" ]
        , hp = { kind = "literal", value = 49 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = -3 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -3 } ]
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "piercing", "slashing" ] }
        , immunities = { conditions = Some [ "charmed", "exhaustion", "frightened", "grappled", "incapacitated", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned" ], damageTypes = Some [ "necrotic", "poison" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
