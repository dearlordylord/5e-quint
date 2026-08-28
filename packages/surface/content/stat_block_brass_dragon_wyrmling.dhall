let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_brass_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Brass Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1102-1129" }
    , statBlock =
        { abilityScores = { str = 15, dex = 10, con = 13, int = 10, wis = 11, cha = 13 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 10, flat = (Some +2), static = 7 }, rest = [  ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 2, procedure = T.NonSpellProcedure.saveArea ({ name = "Fire Breath", ability = "dex", dc = 11, area = (T.line { lengthFeet = 20, widthFeet = 5 }), onFail = (T.damage { damageType = "fire", dice = 4, dieSize = 6, flat = (None Integer), static = 14 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.textOnly { procedureOrdinal = 3, name = "Sleep Breath", description = "Constitution Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 1 minute. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 22 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 2 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 15 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
