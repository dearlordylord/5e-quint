let T = ./_stat_block_types.dhall
in  { challengeRating = 5
    , id = "stat_block_fire_elemental"
    , kind = "statBlock"
    , name = "Fire Elemental"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:193-226" }
    , statBlock =
        { abilityScores = { str = 10, dex = 17, con = 16, int = 6, wis = 10, cha = 7 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The elemental makes two Burn attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Burn", description = "Melee Attack Roll: +6, reach 5 ft. Hit: 10 (2d6 + 3) Fire damage. If the target is a creature or a flammable object, it starts burning.", reason = "unsupported_action_shape" }
            ]
        , traits =
            [ T.trait { name = "Fire Aura", description = "At the end of each of the elemental's turns, each creature in a 10-foot Emanation originating from the elemental takes 5 (1d10) Fire damage. Creatures and flammable objects in the Emanation start burning.", effectKind = None Text }
            , T.trait { name = "Fire Form", description = "The elemental can move through a space as narrow as 1 inch without expending extra movement to do so, and it can enter a creature's space and stop there. The first time it enters a creature's space on a turn, that creature takes 5 (1d10) Fire damage.", effectKind = None Text }
            , T.trait { name = "Illumination", description = "The elemental sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet.", effectKind = None Text }
            , T.trait { name = "Water Susceptibility", description = "The elemental takes 3 (1d6) Cold damage for every 5 feet the elemental moves in water or for every gallon of water splashed on it.", effectKind = None Text }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Ignan)" ] } }
        , creatureType = "elemental"
        , hp = { kind = "literal", value = 93 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "dex", modifier = +3 }, { ability = "con", modifier = +3 } ]
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "piercing", "slashing" ] }
        , immunities = { conditions = Some [ "exhaustion", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained", "unconscious" ], damageTypes = Some [ "fire", "poison" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        }
    }
