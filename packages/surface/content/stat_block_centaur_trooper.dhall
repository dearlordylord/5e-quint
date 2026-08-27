let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_centaur_trooper"
    , kind = "statBlock"
    , name = "Centaur Trooper"
    , provenance =
        { kind = "srd-5.2.1"
        , section = "Monsters/Monsters-C-D.md:7-36"
        }
    , statBlock =
        { abilityScores =
            { str = 18, dex = 14, con = 14, int = 9, wis = 13, cha = 11 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The centaur makes two attacks, using Pike or Longbow in any combination.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Pike", attackAbility = "str", attackBonus = +6, reachFeet = 10, onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 10, flat = (Some +4), static = 9 }, rest = [] : List T.Effect } } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Longbow", attackAbility = "dex", attackBonus = +4, rangeFeet = { normal = 150, long = 600 }, ammunition = (Some "arrow"), onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 8, flat = (Some +2), static = 6 }, rest = [] : List T.Effect } } }
            ]
        , bonusActions =
            [ T.resourceTextOnly { procedureOrdinal = 1, name = "Trampling Charge", description = "The centaur moves up to its Speed without provoking Opportunity Attacks and can move through the spaces of Medium or smaller creatures. Each creature whose space the centaur enters is targeted once by the following effect. Strength Saving Throw: DC 14. Failure: 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [] : List Natural } }
            ]
        , alignment = { order = "neutral", morality = "good" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Elvish", "Sylvan" ] }
            }
        , creatureType = "fey"
        , gear =
            [ { item = "Breastplate", quantity = None Natural }
            , { item = "Longbow", quantity = None Natural }
            , { item = "Pike", quantity = None Natural }
            ]
        , hp = { kind = "literal", value = 45 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        , savingThrowModifiers =
            [ { ability = "str", modifier = +4 }
            , { ability = "dex", modifier = +2 }
            , { ability = "con", modifier = +2 }
            , { ability = "int", modifier = -1 }
            , { ability = "wis", modifier = +1 }
            , { ability = "cha", modifier = +0 }
            ]
        , skillModifiers =
            [ { skill = "athletics", modifier = 6 }
            , { skill = "perception", modifier = 3 }
            ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        }
    }
