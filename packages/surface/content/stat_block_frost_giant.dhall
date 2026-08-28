let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_frost_giant"
    , kind = "statBlock"
    , name = "Frost Giant"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:299-328" }
    , statBlock =
        { abilityScores = { str = 23, dex = 9, con = 21, int = 9, wis = 10, cha = 12 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The giant makes two attacks, using Frost Axe or Great Bow in any combination.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Frost Axe"
                    , attackAbility = "str"
                    , attackBonus = +9
                    , reachFeet = 10
                    , onHit =
                        { first = T.damage { damageType = "slashing", dice = 2, dieSize = 12, flat = Some +6, static = 19 }, rest = [ T.damage { damageType = "cold", dice = 2, dieSize = 8, flat = None Integer, static = 9 } ] }
                    }
                }
            , T.textOnly { procedureOrdinal = 3, name = "Great Bow", description = "Ranged Attack Roll: +9, range 150/600 ft. Hit: 17 (2d10 + 6) Piercing damage plus 7 (2d6) Cold damage, and the target's Speed decreases by 10 feet until the end of its next turn.", reason = "unsupported_action_shape" }
            ]
        , bonusActions =
            [ T.resourceTextOnly { procedureOrdinal = 1, name = "War Cry (Recharge 5–6)", description = "The giant or one creature of its choice that can see or hear it gains 16 (2d10 + 5) Temporary Hit Points and has Advantage on attack rolls until the start of the giant's next turn.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [] : List Natural } } ]
        , alignment = { order = "neutral", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Giant" ] } }
        , creatureType = "giant"
        , hp = { kind = "literal", value = 149 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "con", modifier = +5 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = +4 } ]
        , skillModifiers = [ { skill = "athletics", modifier = 9 }, { skill = "perception", modifier = 3 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "cold" ] }
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = T.recharge { minimumRoll = 5 } } ]
        }
    }
