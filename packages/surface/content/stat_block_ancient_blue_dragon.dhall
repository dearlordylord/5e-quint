let T = ./_stat_block_types.dhall
in  { challengeRating = 23
    , id = "stat_block_ancient_blue_dragon"
    , kind = "statBlock"
    , name = "Ancient Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1012-1060" }
    , statBlock =
        { abilityScores = { str = 29, dex = 10, con = 27, int = 18, wis = 17, cha = 25 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter (level 3 version)." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +16 (Some 15) (None T.Range) (None Text) [ T.damage "slashing" 2 8 (Some +9) 18, T.damage "lightning" 2 10 (None Integer) 11 ] (None Text))
            , T.execSome 3 (T.save "Lightning Breath" "dex" 23 (T.line 120 10) (T.damage "lightning" 16 10 (None Integer) 88) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.execSome 4
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 22 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef "invisibility" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef "mage_hand" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef "shatter" (None Natural) (Some 3) (None Text)
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1048
                        T.spellRef "scrying" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1048
                        T.spellRef "sending" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Cloaked Flight" "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 2 "Sonic Boom" "The dragon uses Spellcasting to cast Shatter (level 3 version). The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.exec 3 (T.multiattack "Tail Swipe" [ { count = { kind = "literal", value = +1 }, procedureOrdinal = 2 } ])
                ]
            }
        , traits = [ T.trait "Legendary Resistance (4/Day, or 5/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead." ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 481 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +14, score = 24 }
        , passivePerception = 27
        , savingThrowModifiers = [ { ability = "str", modifier = +9 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +8 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +10 }, { ability = "cha", modifier = +7 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 17 }, { skill = "stealth", modifier = 7 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
