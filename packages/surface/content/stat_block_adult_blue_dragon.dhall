let T = ./_stat_block_types.dhall
in  { challengeRating = 16
    , id = "stat_block_adult_blue_dragon"
    , kind = "statBlock"
    , name = "Adult Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:962-1010" }
    , statBlock =
        { abilityScores = { str = 25, dex = 10, con = 23, int = 16, wis = 15, cha = 20 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +12 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 8 (Some +7) 16, T.damage "lightning" 1 10 (None Integer) 5 ] (None Text))
            , T.execSome 3 (T.save "Lightning Breath" "dex" 19 (T.line 90 5) (T.damage "lightning" 11 10 (None Integer) 60) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.execSome 4
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 18 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef "invisibility" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef "mage_hand" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef "shatter" (None Natural) (None Natural) (None Text)
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:998
                        T.spellRef "scrying" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:998
                        T.spellRef "sending" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Cloaked Flight" "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 2 "Sonic Boom" "The dragon uses Spellcasting to cast Shatter. The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.exec 3 (T.multiattack "Tail Swipe" [ { count = { kind = "literal", value = +1 }, procedureOrdinal = 2 } ])
                ]
            }
        , traits = [ T.trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead." ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 212 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +10, score = 20 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +7 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +6 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +5 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 12 }, { skill = "stealth", modifier = 5 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
