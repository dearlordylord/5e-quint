let T = ./_stat_block_types.dhall
in  { challengeRating = 14
    , id = "stat_block_adult_copper_dragon"
    , kind = "statBlock"
    , name = "Adult Copper Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:379-425" }
    , statBlock =
        { abilityScores = { str = 23, dex = 12, con = 21, int = 18, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast Mind Spike (level 4 version)." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +11 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 10 (Some +6) 17, T.damage "acid" 1 8 (None Integer) 4 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 18 (T.line 60 5) (T.damage "acid" 12 8 (None Integer) 54) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Slowing Breath" "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn." "unsupported_action_shape"
            , T.execSome 5
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 17 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Detect Magic.
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Mind Spike.
                        T.spellRef "mind_spike" (None Natural) (Some 4) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Minor Illusion.
                        T.spellRef "minor_illusion" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef "shapechange" (None Natural) (None Natural) (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell")
                      ]
                  , T.limited [ 2 ]
                      [ -- RAW: Monsters/Monsters-C-D.md:379-425 — 1/Day Each: Greater Restoration.
                        T.spellRef "greater_restoration" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — 1/Day Each: Major Image.
                        T.spellRef "major_image" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , legendaryActions = { uses = 3, entries = [ T.text 1 "Giggling Magic" "Charisma Saving Throw: DC 17, one creature the dragon can see within 90 feet. Failure: 24 (7d6) Psychic damage. Until the end of its next turn, the target rolls 1d6 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. Failure or Success: The dragon can't take this action again until the start of its next turn." "unsupported_action_shape", T.text 2 "Mind Jolt" "The dragon uses Spellcasting to cast Mind Spike (level 4 version). The dragon can't take this action again until the start of its next turn." "unsupported_action_shape", T.text 3 "Pounce" "The dragon moves up to half its Speed, and it makes one Rend attack." "unsupported_action_shape" ] }
        , traits = [ T.trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead." ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 184 }
        , initiative = { modifier = +11, score = 21 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "deception", modifier = 9 }, { skill = "perception", modifier = 12 }, { skill = "stealth", modifier = 6 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5), T.resource 2 "each" (T.daily 1) ]
        }
    }
