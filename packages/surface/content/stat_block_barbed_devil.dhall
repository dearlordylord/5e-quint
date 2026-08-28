let T = ./_stat_block_types.dhall
in  { challengeRating = 5
    , id = "stat_block_barbed_devil"
    , kind = "statBlock"
    , name = "Barbed Devil"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:477-515" }
    , statBlock =
        { abilityScores = { str = 16, dex = 17, con = 18, int = 12, wis = 14, cha = 14 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The devil makes one Claws attack and one Tail attack, or it makes two Hurl Flame attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Claws", description = "Melee Attack Roll: +6, reach 5 ft. Hit: 10 (2d6 + 3) Piercing damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13) from both claws.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 3, name = "Tail", description = "Melee Attack Roll: +6, reach 10 ft. Hit: 14 (2d10 + 3) Slashing damage.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 4, name = "Hurl Flame", description = "Ranged Attack Roll: +5, range 150 ft. Hit: 17 (5d6) Fire damage. If the target is a flammable object that isn't being worn or carried, it starts burning.", reason = "unsupported_action_shape" }
            ]
        , traits =
            [ T.trait { name = "Barbed Hide", description = "At the start of each of its turns, the devil deals 5 (1d10) Piercing damage to any creature it is grappling or any creature grappling it.", effectKind = None Text }
            , T.trait { name = "Diabolical Restoration", description = "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells.", effectKind = None Text }
            , T.trait { name = "Magic Resistance", description = "The devil has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Infernal" ] }
            , telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } }
            }
        , creatureType = "fiend"
        , creatureTypeTags = [ "devil" ]
        , hp = { kind = "literal", value = 110 }
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "fire", "poison" ] }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 18
        , resistances = { kind = "fixed", damageTypes = [ "cold" ] }
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +7 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +5 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = Some "unimpeded_by_magical_darkness" } ]
        , skillModifiers = [ { skill = "deception", modifier = 5 }, { skill = "insight", modifier = 5 }, { skill = "perception", modifier = 8 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
