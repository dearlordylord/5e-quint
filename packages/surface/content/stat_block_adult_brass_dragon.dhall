let T = ./_stat_block_types.dhall
in  { challengeRating = 13
    , id = "stat_block_adult_brass_dragon"
    , kind = "statBlock"
    , name = "Adult Brass Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1166-1216" }
    , statBlock =
        { abilityScores = { str = 23, dex = 10, con = 21, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +11 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 10 (Some +6) 17, T.damage "fire" 1 8 (None Integer) 4 ] (None Text))
            , T.execSome 3 (T.save "Fire Breath" "dex" 18 (T.line 60 5) (T.damage "fire" 10 8 (None Integer) 45) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Sleep Breath" "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it." "unsupported_action_shape"
            , T.execSome 5
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 16 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef "minor_illusion" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef "scorching_ray" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef "shapechange" (None Natural) (None Natural) (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell")
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef "speak_with_animals" (None Natural) (None Natural) (None Text)
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1204
                        T.spellRef "detect_thoughts" (None Natural) (None Natural) (None Text)
                      , -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1204
                        T.spellRef "control_weather" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Blazing Light" "The dragon uses Spellcasting to cast Scorching Ray." "unsupported_action_shape"
                , T.text 2 "Pounce" "The dragon moves up to half its Speed, and it makes one Rend attack." "unsupported_action_shape"
                , T.text 3 "Scorching Sands" "Dexterity Saving Throw: DC 16, one creature the dragon can see within 120 feet. Failure: 27 (6d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn." "unsupported_action_shape"
                ]
            }
        , traits = [ T.trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead." ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 172 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , initiative = { modifier = +10, score = 20 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "history", modifier = 7 }, { skill = "perception", modifier = 11 }, { skill = "persuasion", modifier = 8 }, { skill = "stealth", modifier = 5 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
