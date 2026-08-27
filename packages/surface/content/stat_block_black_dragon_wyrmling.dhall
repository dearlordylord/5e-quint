let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_black_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Black Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:652-687" }
    , statBlock =
        { abilityScores = { str = 15, dex = 14, con = 13, int = 10, wis = 11, cha = 13 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Rend" "melee" "str" +4 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 6 (Some +2) 5, T.damage "acid" 1 4 (None Integer) 2 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 11 (T.line 20 5) (T.damage "acid" 5 8 (None Integer) 22) { kind = "half_damage" } (None Text)) [ 1 ]
            ]
        , traits = [ T.trait "Amphibious" "The dragon can breathe air and water." ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 33 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 4 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
