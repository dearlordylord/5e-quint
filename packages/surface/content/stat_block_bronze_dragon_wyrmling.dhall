let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_bronze_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Bronze Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1272-1307" }
    , statBlock =
        { abilityScores = { str = 17, dex = 10, con = 15, int = 12, wis = 11, cha = 15 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Rend" "melee" "str" +5 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 10 (Some +3) 8 ] (None Text))
            , T.execSome 3 (T.save "Lightning Breath" "dex" 12 (T.line 40 5) (T.damage "lightning" 3 10 (None Integer) 16) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Repulsion Breath" "Strength Saving Throw: DC 12, each creature in a 30-foot Cone. Failure: The target is pushed up to 30 feet straight away from the dragon and has the Prone condition." "unsupported_action_shape"
            ]
        , traits = [ T.trait "Amphibious" "The dragon can breathe air and water." ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 39 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 2 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
