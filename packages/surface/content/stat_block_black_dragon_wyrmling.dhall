let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_black_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Black Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:654-685" }
    , statBlock =
        { abilityScores = { str = 15, dex = 14, con = 13, int = 10, wis = 11, cha = 13 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes two Rend attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Rend", description = "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage plus 2 (1d4) Acid damage.", reason = "unsupported_action_shape" }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Acid Breath", ability = "dex", dc = 11, area = (T.line { lengthFeet = 20, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 5, dieSize = 8, flat = (None Integer), static = 22 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 33 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 4 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
