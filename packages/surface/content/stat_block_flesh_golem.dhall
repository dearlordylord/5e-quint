let T = ./_stat_block_types.dhall
in  { challengeRating = 5
    , id = "stat_block_flesh_golem"
    , kind = "statBlock"
    , name = "Flesh Golem"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:259-295" }
    , statBlock =
        { abilityScores = { str = 19, dex = 9, con = 18, int = 6, wis = 10, cha = 5 }
        , ac = { value = { kind = "literal", value = 9 } }
        , actions =
            [ T.executable
                { procedureOrdinal = 1
                , procedure = T.multiattack { name = "Multiattack", dispatches = { first = { procedureOrdinal = 2, count = { kind = "literal", value = +2 } }, rest = [] : List T.Dispatch } }
                }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Slam"
                    , attackAbility = "str"
                    , attackBonus = +7
                    , reachFeet = 5
                    , onHit =
                        { first = T.damage { damageType = "bludgeoning", dice = 2, dieSize = 8, flat = Some +4, static = 13 }, rest = [ T.damage { damageType = "lightning", dice = 1, dieSize = 8, flat = None Integer, static = 4 } ] }
                    }
                }
            ]
        , traits =
            [ T.trait { name = "Aversion to Fire", description = "If the golem takes Fire damage, it has Disadvantage on attack rolls and ability checks until the end of its next turn.", effectKind = None Text }
            , T.trait { name = "Berserk", description = "Whenever the golem starts its turn Bloodied, roll 1d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object. Once the golem goes berserk, it remains so until it is destroyed or it is no longer Bloodied.\n\nThe golem's creator, if within 60 feet of the berserk golem, can try to calm it by taking an action to make a DC 15 Charisma (Persuasion) check; the golem must be able to hear its creator. If this check succeeds, the golem ceases being berserk until the start of its next turn, at which point it resumes rolling for the Berserk trait again if it is still Bloodied.", effectKind = None Text }
            , T.trait { name = "Immutable Form", description = "The golem can't shape-shift.", effectKind = None Text }
            , T.trait { name = "Lightning Absorption", description = "Whenever the golem is subjected to Lightning damage, it regains a number of Hit Points equal to the Lightning damage dealt.", effectKind = None Text }
            , T.trait { name = "Magic Resistance", description = "The golem has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "understood_but_cannot_speak", languages = { kind = "named_plus_other_languages", languages = [ "Common" ], additionalLanguages = 1 } }
        , creatureType = "construct"
        , hp = { kind = "literal", value = 127 }
        , initiative = { modifier = -1, score = 9 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "con", modifier = +4 } ]
        , immunities = { conditions = Some [ "charmed", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned" ], damageTypes = Some [ "lightning", "poison" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
