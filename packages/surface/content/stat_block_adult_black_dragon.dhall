let T = ./_stat_block_types.dhall
in  { challengeRating = 14
    , id = "stat_block_adult_black_dragon"
    , kind = "statBlock"
    , name = "Adult Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:724-774" }
    , statBlock =
        { abilityScores = { str = 23, dex = 14, con = 21, int = 14, wis = 13, cha = 19 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Acid Arrow (level 3 version)." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +11 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 6 (Some +6) 13, T.damage "acid" 1 8 (None Integer) 4 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 18 (T.line 60 5) (T.damage "acid" 12 8 (None Integer) 54) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.execSome 4
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 17 }) (Some { kind = "literal", value = +9 }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef "acid_arrow" (None Natural) (Some 3) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef "fear" (None Natural) (None Natural) (None Text)
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:762
                        T.spellRef "speak_with_dead" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:762
                        T.spellRef "vitriolic_sphere" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Cloud of Insects" "Dexterity Saving Throw: DC 17, one creature the dragon can see within 120 feet. Failure: 22 (4d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 2 "Frightful Presence" "The dragon uses Spellcasting to cast Fear. The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 3 "Pounce" "The dragon moves up to half its Speed, and it makes one Rend attack." "unsupported_action_shape"
                ]
            }
        , traits =
            [ T.trait "Amphibious" "The dragon can breathe air and water."
            , T.trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead."
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 195 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +12, score = 22 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 11 }, { skill = "stealth", modifier = 7 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
