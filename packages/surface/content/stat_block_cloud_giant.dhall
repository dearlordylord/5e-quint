let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_cloud_giant"
    , kind = "statBlock"
    , name = "Cloud Giant"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:228-261" }
    , statBlock =
        { abilityScores = { str = 27, dex = 10, con = 22, int = 12, wis = 16, cha = 16 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.text 1 "Multiattack" "The giant makes two attacks, using Thunderous Mace or Thundercloud in any combination. It can replace one attack with a use of Spellcasting to cast Fog Cloud." "unsupported_action_shape"
            , T.exec 2 (T.attack "Thunderous Mace" "melee" "str" +12 (Some 10) (None T.Range) (None Text) [ T.damage "bludgeoning" 3 8 (Some +8) 21, T.damage "thunder" 2 6 (None Integer) 7 ] (None Text))
            , T.exec 3 (T.attack "Thundercloud" "ranged" "str" +12 (None Natural) (Some { normal = 240, long = 240 }) (None Text) [ T.damage "thunder" 3 6 (Some +8) 18 ] (Some "The target has the Incapacitated condition until the end of its next turn."))
            , T.execSome 4 (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 15 }) (None { kind : Text, value : Integer }) T.noMaterial [ T.atWill [ T.spellRef "detect_magic" (None Natural) (None Natural) (None Text), T.spellRef "fog_cloud" (None Natural) (None Natural) (None Text), T.spellRef "light" (None Natural) (None Natural) (None Text) ], T.limited [ 1 ] [ T.spellRef "control_weather" (None Natural) (None Natural) (None Text), T.spellRef "gaseous_form" (None Natural) (None Natural) (None Text), T.spellRef "telekinesis" (None Natural) (None Natural) (None Text) ] ]) [ 1 ]
            ]
        , bonusActions =
            [ T.text 1 "Misty Step" "The giant casts the Misty Step spell, using the same spellcasting ability as Spellcasting." "unsupported_spellcasting_restriction"
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Giant" ] } }
        , creatureType = "giant"
        , hp = { kind = "literal", value = 200 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +10 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +3 } ]
        , skillModifiers = [ { skill = "insight", modifier = 7 }, { skill = "perception", modifier = 11 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 20 }, hover = Some True } ]
        , resources = [ T.resource 1 "each" (T.daily 1) ]
        }
    }
