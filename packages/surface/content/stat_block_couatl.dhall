let T = ./_stat_block_types.dhall
in  { challengeRating = 4
    , id = "stat_block_couatl"
    , kind = "statBlock"
    , name = "Couatl"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:479-515" }
    , statBlock =
        { abilityScores = { str = 16, dex = 20, con = 17, int = 18, wis = 20, cha = 18 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.exec 1
                (T.attack "Bite" "melee" "dex" +7 (Some 5) (None T.Range) (None Text)
                  [ T.damage "piercing" 1 12 (Some +5) 11
                  , T.applyCondition "poisoned" "end_of_caster_next_turn"
                  ]
                  (None Text))
            , T.text 2 "Constrict" "Strength Saving Throw: DC 15, one Medium or smaller creature the couatl can see within 5 feet. Failure: 8 (1d6 + 5) Bludgeoning damage. The target has the Grappled condition (escape DC 13), and it has the Restrained condition until the grapple ends." "unsupported_action_shape"
            , T.execSome 3
                (T.spellcasting "Spellcasting" "wis" (Some { kind = "fixed", dc = 15 }) (None { kind : Text, value : Integer }) T.noComponents
                  [ T.atWill
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Evil and Good.
                        T.spellRef "detect_evil_and_good" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Magic.
                        T.spellRef "detect_magic" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Thoughts.
                        T.spellRef "detect_thoughts" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef "shapechange" (None Natural) (None Natural) (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell")
                      ]
                  , T.limited [ 1 ]
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Create Food and Water.
                        T.spellRef "create_food_and_water" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Dream.
                        T.spellRef "dream" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Greater Restoration.
                        T.spellRef "greater_restoration" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Scrying.
                        T.spellRef "scrying" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Sleep.
                        T.spellRef "sleep" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 1 ]
            ]
        , bonusActions =
            [ T.execSome 1
                (T.spellcasting "Divine Aid" "wis" (None { kind : Text, dc : Natural }) (None { kind : Text, value : Integer }) T.noComponents
                  [ T.limited [ 2 ]
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid, 2/Day Each: Bless.
                        T.spellRef "bless" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid, 2/Day Each: Lesser Restoration.
                        T.spellRef "lesser_restoration" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid, 2/Day Each: Sanctuary.
                        T.spellRef "sanctuary" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 2 ]
            ]
        , traits = [ T.trait "Shielded Mind" "The couatl's thoughts can't be read by any means, and other creatures can communicate with it telepathically only if it allows them." ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "all" }, telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } } }
        , creatureType = "celestial"
        , hp = { kind = "literal", value = 60 }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "piercing", "slashing" ] }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "psychic", "radiant" ] }
        , senses = [ { kind = "truesight", rangeFeet = 120, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = None Bool } ]
        , resources = [ T.resource 1 "each" (T.daily 1), T.resource 2 "shared" (T.daily 2) ]
        }
    }
