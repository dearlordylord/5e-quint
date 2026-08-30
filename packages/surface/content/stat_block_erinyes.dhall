let T = ./_stat_block_types.dhall
in  { challengeRating = 12
    , id = "stat_block_erinyes"
    , kind = "statBlock"
    , name = "Erinyes"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:81-119" }
    , statBlock =
        { abilityScores = { str = 18, dex = 16, con = 18, int = 14, wis = 14, cha = 18 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The erinyes makes three Withering Sword attacks and can use Entangling Rope.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Withering Sword", description = "Melee Attack Roll: +8, reach 5 ft. Hit: 13 (2d8 + 4) Slashing damage plus 11 (2d10) Necrotic damage.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 3, name = "Entangling Rope (Requires Magic Rope)", description = "Strength Saving Throw: DC 16, one creature the erinyes can see within 120 feet. Failure: 14 (4d6) Force damage, and the target has the Restrained condition until the rope is destroyed, the erinyes uses a Bonus Action to release the target, or the erinyes uses Entangling Rope again.", reason = "unsupported_action_shape" }
            ]
        , reactions =
            [ T.textOnly { procedureOrdinal = 1, name = "Parry", description = "Trigger: The erinyes is hit by a melee attack roll while holding a weapon. Response: The erinyes adds 4 to its AC against that attack, possibly causing it to miss.", reason = "unsupported_action_shape" } ]
        , traits =
            [ T.trait { name = "Diabolical Restoration", description = "If the erinyes dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells.", effectKind = None Text }
            , T.trait { name = "Magic Resistance", description = "The erinyes has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
            , T.trait { name = "Magic Rope", description = "The erinyes has a magic rope. While bearing it, the erinyes can use the Entangling Rope action. The rope has AC 20, HP 90, and Immunity to Poison and Psychic damage. The rope turns to dust if reduced to 0 Hit Points, if it is 5+ feet away from the erinyes for 1 hour or more, or if the erinyes dies. If the rope is damaged or destroyed, the erinyes can fully restore it when finishing a Short or Long Rest.", effectKind = None Text }
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Infernal" ] }, telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } } }
        , creatureType = "fiend"
        , creatureTypeTags = [ "devil" ]
        , hp = { kind = "literal", value = 178 }
        , initiative = { modifier = +7, score = 17 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "dex", modifier = +7 }, { ability = "con", modifier = +8 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +8 } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "persuasion", modifier = 8 } ]
        , resistances = { kind = "fixed", damageTypes = [ "cold" ] }
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "fire", "poison" ] }
        , senses = [ { kind = "truesight", rangeFeet = 120, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        }
    }
