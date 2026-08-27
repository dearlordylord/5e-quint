let T = ./_stat_block_types.dhall
in  { challengeRating = 21
    , id = "stat_block_ancient_black_dragon"
    , kind = "statBlock"
    , name = "Ancient Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:776-826" }
    , statBlock =
        { abilityScores = { str = 27, dex = 14, con = 25, int = 16, wis = 15, cha = 22 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Acid Arrow (level 4 version)." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +15 (Some 15) (None T.Range) (None Text) [ T.damage "slashing" 2 8 (Some +8) 17, T.damage "acid" 2 8 (None Integer) 9 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 22 (T.line 90 10) (T.damage "acid" 15 8 (None Integer) 67) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.execSome 4
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 21 }) (Some { kind = "literal", value = +13 }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef "acid_arrow" (None Natural) (Some 4) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef "fear" (None Natural) (None Natural) (None Text)
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef "create_undead" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef "speak_with_dead" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef "vitriolic_sphere" (None Natural) (Some 5) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Cloud of Insects" "Dexterity Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 33 (6d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 2 "Frightful Presence" "The dragon uses Spellcasting to cast Fear. The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                , T.text 3 "Pounce" "The dragon moves up to half its Speed, and it makes one Rend attack." "unsupported_action_shape"
                ]
            }
        , traits =
            [ T.trait "Amphibious" "The dragon can breathe air and water."
            , T.trait "Legendary Resistance (4/Day, or 5/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead."
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 367 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +16, score = 26 }
        , passivePerception = 26
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +9 }, { ability = "con", modifier = +7 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +9 }, { ability = "cha", modifier = +6 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 16 }, { skill = "stealth", modifier = 9 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
