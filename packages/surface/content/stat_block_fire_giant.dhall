let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_fire_giant"
    , kind = "statBlock"
    , name = "Fire Giant"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:230-255" }
    , statBlock =
        { abilityScores = { str = 25, dex = 9, con = 23, int = 10, wis = 14, cha = 13 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The giant makes two attacks, using Flame Sword or Hammer Throw in any combination.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Flame Sword"
                    , attackAbility = "str"
                    , attackBonus = +11
                    , reachFeet = 10
                    , onHit =
                        [ T.damage { damageType = "slashing", dice = 4, dieSize = 6, flat = Some +7, static = 21 }
                        , T.damage { damageType = "fire", dice = 3, dieSize = 6, flat = None Integer, static = 10 }
                        ]
                    }
                }
            , T.textOnly { procedureOrdinal = 3, name = "Hammer Throw", description = "Ranged Attack Roll: +11, range 60/240 ft. Hit: 23 (3d10 + 7) Bludgeoning damage plus 4 (1d8) Fire damage, and the target is pushed up to 15 feet straight away from the giant and has Disadvantage on the next attack roll it makes before the end of its next turn.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Giant" ] } }
        , creatureType = "giant"
        , hp = { kind = "literal", value = 162 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +7 }, { ability = "con", modifier = +6 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +5 } ]
        , skillModifiers = [ { skill = "athletics", modifier = 11 }, { skill = "perception", modifier = 6 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
