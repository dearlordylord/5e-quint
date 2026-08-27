let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_bearded_devil"
    , kind = "statBlock"
    , name = "Bearded Devil"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:548-581" }
    , statBlock =
        { abilityScores = { str = 16, dex = 15, con = 15, int = 9, wis = 11, cha = 14 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The devil makes one Beard attack and one Infernal Glaive attack.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Beard", description = "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage, and the target has the Poisoned condition until the start of the devil's next turn. Until this poison ends, the target can't regain Hit Points.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 3, name = "Infernal Glaive", description = "Melee Attack Roll: +5, reach 10 ft. Hit: 8 (1d10 + 3) Slashing damage. If the target is a creature and doesn't already have an infernal wound, it is subjected to the following effect. Constitution Saving Throw: DC 12. Failure: The target receives an infernal wound. While wounded, the target loses 5 (1d10) Hit Points at the start of each of its turns. The wound closes after 1 minute, after a spell restores Hit Points to the target, or after the target or a creature within 5 feet of it takes an action to stanch the wound, doing so by succeeding on a DC 12 Wisdom (Medicine) check.", reason = "unsupported_action_shape" }
            ]
        , traits = [ T.trait { name = "Magic Resistance", description = "The devil has Advantage on saving throws against spells and other magical effects.", effectKind = None Text } ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Infernal" ] }
            , telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } }
            }
        , creatureType = "fiend"
        , creatureTypeTags = [ "devil" ]
        , hp = { kind = "literal", value = 58 }
        , immunities = { conditions = Some [ "frightened", "poisoned" ], damageTypes = Some [ "fire", "poison" ] }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 10
        , resistances = { kind = "fixed", damageTypes = [ "cold" ] }
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = -1 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = Some "unimpeded_by_magical_darkness" } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
