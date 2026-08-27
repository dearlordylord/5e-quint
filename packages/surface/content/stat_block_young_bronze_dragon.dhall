let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_young_bronze_dragon"
    , kind = "statBlock"
    , name = "Young Bronze Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1309-1344" }
    , statBlock =
        { abilityScores = { str = 21, dex = 10, con = 19, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Repulsion Breath." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +8 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 10 (Some +5) 16 ] (None Text))
            , T.execSome 3 (T.save "Lightning Breath" "dex" 15 (T.line 60 5) (T.damage "lightning" 9 10 (None Integer) 49) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Repulsion Breath" "Strength Saving Throw: DC 15, each creature in a 30-foot Cone. Failure: The target is pushed up to 40 feet straight away from the dragon and has the Prone condition." "unsupported_action_shape"
            ]
        , traits = [ T.trait "Amphibious" "The dragon can breathe air and water." ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 142 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 17
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "insight", modifier = 4 }, { skill = "perception", modifier = 7 }, { skill = "stealth", modifier = 3 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
