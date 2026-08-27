let T = ./_stat_block_types.dhall
in  { challengeRating = 7
    , id = "stat_block_young_black_dragon"
    , kind = "statBlock"
    , name = "Young Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:689-722" }
    , statBlock =
        { abilityScores = { str = 19, dex = 14, con = 17, int = 12, wis = 11, cha = 15 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +3 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Rend" "melee" "str" +7 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 4 (Some +4) 9, T.damage "acid" 1 6 (None Integer) 3 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 14 (T.line 30 5) (T.damage "acid" 14 6 (None Integer) 49) { kind = "half_damage" } (None Text)) [ 1 ]
            ]
        , traits = [ T.trait "Amphibious" "The dragon can breathe air and water." ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 127 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "stealth", modifier = 5 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
