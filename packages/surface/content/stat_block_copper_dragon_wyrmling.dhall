let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_copper_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Copper Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:319-344" }
    , statBlock =
        { abilityScores = { str = 15, dex = 12, con = 13, int = 14, wis = 11, cha = 13 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 10, flat = (Some +2), static = 7 }, rest = [] : List T.Effect } } }
            , T.resourceExecutable { procedureOrdinal = 2, procedure = T.NonSpellProcedure.saveArea { name = "Acid Breath", ability = "dex", dc = 11, area = (T.line { lengthFeet = 20, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 4, dieSize = 8, flat = (None Integer), static = 18 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.textOnly { procedureOrdinal = 3, name = "Slowing Breath", description = "Constitution Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 3 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
