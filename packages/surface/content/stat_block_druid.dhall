let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_druid"
    , kind = "statBlock"
    , name = "Druid"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:894-925" }
    , statBlock =
        { abilityScores = { str = 10, dex = 12, con = 13, int = 12, wis = 16, cha = 11 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.text 1 "Multiattack" "The druid makes two attacks, using Vine Staff or Verdant Wisp in any combination." "unsupported_action_shape"
            , T.exec 2 (T.attack "Vine Staff" "melee" "wis" +5 (Some 5) (None T.Range) (None Text) [ T.damage "bludgeoning" 1 8 (Some +3) 7, T.damage "poison" 1 4 (None Integer) 2 ] (None Text))
            , T.exec 3 (T.attack "Verdant Wisp" "ranged" "wis" +5 (None Natural) (Some { normal = 90, long = 90 }) (None Text) [ T.damage "radiant" 3 6 (None Integer) 10 ] (None Text))
            , T.textSome 4 "Spellcasting" "The druid casts one of the following spells, using Wisdom as the spellcasting ability (spell save DC 13): At Will: Druidcraft, Speak with Animals. 2/Day Each: Entangle, Thunderwave. 1/Day Each: Animal Messenger, Longstrider, Moonbeam." "unsupported_spellcasting_restriction" [ 1, 2 ]
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Druidic", "Sylvan" ] } }
        , creatureType = "humanoid"
        , creatureTypeTags = [ "druid" ]
        , gear = [ { item = "Studded Leather Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 44 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +0 } ]
        , skillModifiers = [ { skill = "medicine", modifier = 5 }, { skill = "nature", modifier = 3 }, { skill = "perception", modifier = 5 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "each" (T.daily 2), T.resource 2 "each" (T.daily 1) ]
        }
    }
