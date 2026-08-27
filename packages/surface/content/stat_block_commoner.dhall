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
            [ T.exec 1 (T.attack "Club" "melee" "str" +2 (Some 5) (None T.Range) (None Text) [ T.damage "bludgeoning" 1 4 (None Integer) 2 ] (None Text))
            ]
        , traits = [ T.trait "Training" "The commoner has proficiency in one skill of the GM's choice and has Advantage whenever it makes an ability check using that skill." ]
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
