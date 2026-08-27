let T = ./_stat_block_types.dhall
in  { challengeRating = 6
    , id = "stat_block_young_brass_dragon"
    , kind = "statBlock"
    , name = "Young Brass Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1133-1164" }
    , statBlock =
        { abilityScores = { str = 19, dex = 10, con = 17, int = 12, wis = 11, cha = 15 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace two attacks with a use of Sleep Breath." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +7 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 10 (Some +4) 15 ] (None Text))
            , T.execSome 3 (T.save "Fire Breath" "dex" 14 (T.line 40 5) (T.damage "fire" 11 6 (None Integer) 38) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Sleep Breath" "Constitution Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 1 minute. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it." "unsupported_action_shape"
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 110 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "persuasion", modifier = 5 }, { skill = "stealth", modifier = 3 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
