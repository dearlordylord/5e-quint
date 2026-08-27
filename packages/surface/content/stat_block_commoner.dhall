let T = ./_stat_block_types.dhall
in  { challengeRating = 0
    , id = "stat_block_commoner"
    , kind = "statBlock"
    , name = "Commoner"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:289-313" }
    , statBlock =
        { abilityScores = { str = 10, dex = 10, con = 10, int = 10, wis = 10, cha = 10 }
        , ac = { value = { kind = "literal", value = 10 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Club", attackAbility = "str", attackBonus = +2, reachFeet = 5, onHit = { first = T.damage { damageType = "bludgeoning", dice = 1, dieSize = 4, flat = (None Integer), static = 2 }, rest = [] : List T.Effect } } }
            ]
        , traits = [ T.trait { name = "Training", description = "The commoner has proficiency in one skill of the GM's choice and has Advantage whenever it makes an ability check using that skill.", effectKind = (None Text) } ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Club", quantity = None Natural } ]
        , hp = { kind = "literal", value = 4 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = +0 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
