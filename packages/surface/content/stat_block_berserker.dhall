let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_berserker"
    , kind = "statBlock"
    , name = "Berserker"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:622-650" }
    , statBlock =
        { abilityScores = { str = 16, dex = 12, con = 17, int = 9, wis = 11, cha = 9 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.exec 1 (T.attack "Greataxe" "melee" "str" +5 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 12 (Some +3) 9 ] (None Text))
            ]
        , traits = [ T.trait "Bloodied Frenzy" "While Bloodied, the berserker has Advantage on attack rolls and saving throws." ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Greataxe", quantity = None Natural }, { item = "Hide Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 67 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = -1 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -1 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
