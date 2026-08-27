let T = ./_stat_block_types.dhall
in  { challengeRating = 0.25
    , id = "stat_block_blink_dog"
    , kind = "statBlock"
    , name = "Blink Dog"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:868-896" }
    , statBlock =
        { abilityScores = { str = 12, dex = 17, con = 12, int = 10, wis = 13, cha = 11 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.meleeAttack { name = "Bite", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 4, flat = (Some +3), static = 5 }, rest = [  ] : List T.Effect } }) }
            ]
        , bonusActions =
            [ T.resourceTextOnly { procedureOrdinal = 1, name = "Teleport (Recharge 4–6)", description = "The dog teleports up to 40 feet to an unoccupied space it can see.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , alignment = { order = "lawful", morality = "good" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Blink Dog" ] }
            , additionallyUnderstoodButCannotSpeak = Some { kind = "named", languages = [ "Elvish", "Sylvan" ] }
            }
        , creatureType = "fey"
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +1 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = +0 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 5 }, { skill = "stealth", modifier = 5 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 4 }) } ]
        }
    }
