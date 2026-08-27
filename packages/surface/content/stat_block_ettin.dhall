let T = ./_stat_block_types.dhall
in  { challengeRating = 4
    , id = "stat_block_ettin"
    , kind = "statBlock"
    , name = "Ettin"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:163-189" }
    , statBlock =
        { abilityScores = { str = 21, dex = 8, con = 17, int = 6, wis = 10, cha = 8 }
        , ac = { value = { kind = "literal", value = 12 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The ettin makes one Battleaxe attack and one Morningstar attack.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Battleaxe"
                    , attackAbility = "str"
                    , attackBonus = +7
                    , reachFeet = 5
                    , onHit =
                        [ T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = Some +5, static = 14 }
                        , T.conditionIfSize { condition = "prone", maxCreatureSize = "large" }
                        ]
                    }
                }
            , T.textOnly { procedureOrdinal = 3, name = "Morningstar", description = "Melee Attack Roll: +7, reach 5 ft. Hit: 14 (2d8 + 5) Piercing damage, and the target has Disadvantage on the next attack roll it makes before the end of its next turn.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Giant" ] } }
        , creatureType = "giant"
        , gear = [ { item = "Battleaxe" }, { item = "Morningstar" } ]
        , hp = { kind = "literal", value = 85 }
        , initiative = { modifier = -1, score = 9 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "con", modifier = +3 } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 } ]
        , immunities = { conditions = Some [ "blinded", "charmed", "deafened", "frightened", "stunned", "unconscious" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        }
    }
