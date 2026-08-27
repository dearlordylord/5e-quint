let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_young_blue_dragon"
    , kind = "statBlock"
    , name = "Young Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:931-960" }
    , statBlock =
        { abilityScores = { str = 21, dex = 10, con = 19, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +3 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Rend" "melee" "str" +9 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 6 (Some +5) 12, T.damage "lightning" 1 10 (None Integer) 5 ] (None Text))
            , T.execSome 3 (T.save "Lightning Breath" "dex" 16 (T.line 60 5) (T.damage "lightning" 10 10 (None Integer) 55) { kind = "half_damage" } (None Text)) [ 1 ]
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 152 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 19
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +5 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 9 }, { skill = "stealth", modifier = 4 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
