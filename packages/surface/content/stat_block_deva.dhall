let T = ./_stat_block_types.dhall
in  { challengeRating = 10
    , id = "stat_block_deva"
    , kind = "statBlock"
    , name = "Deva"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:669-708" }
    , statBlock =
        { abilityScores = { str = 18, dex = 18, con = 18, int = 17, wis = 20, cha = 20 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Holy Mace" "melee" "str" +8 (Some 5) (None T.Range) (None Text) [ T.damage "bludgeoning" 1 6 (Some +4) 7, T.damage "radiant" 4 8 (None Integer) 18 ] (None Text))
            , T.execSome 3
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 17 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: Monsters/Monsters-C-D.md:669-708 — At Will: Detect Evil and Good.
                        T.spellRef "detect_evil_and_good" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef "shapechange" (None Natural) (None Natural) (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell")
                      ]
                  , T.limited [ 1 ]
                      [ -- RAW: Monsters/Monsters-C-D.md:669-708 — 1/Day Each: Commune.
                        T.spellRef "commune" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — 1/Day Each: Raise Dead.
                        T.spellRef "raise_dead" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 1 ]
            ]
        , bonusActions =
            [ T.textSome 1 "Divine Aid (2/Day)" "The deva casts Cure Wounds, Lesser Restoration, or Remove Curse, using the same spellcasting ability as Spellcasting." "unsupported_spellcasting_restriction" [ 2 ]
            ]
        , traits = [ T.trait "Exalted Restoration" "If the deva dies outside Mount Celestia, its body disappears in smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia.", T.trait "Magic Resistance" "The deva has Advantage on saving throws against spells and other magical effects." ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "all" }, telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } } }
        , creatureType = "celestial"
        , creatureTypeTags = [ "angel" ]
        , hp = { kind = "literal", value = 229 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 19
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +9 }, { ability = "cha", modifier = +9 } ]
        , resistances = { kind = "fixed", damageTypes = [ "radiant" ] }
        , immunities = { conditions = Some [ "charmed", "exhaustion", "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "insight", modifier = 9 }, { skill = "perception", modifier = 9 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = Some True } ]
        , resources = [ T.resource 1 "each" (T.daily 1), T.resource 2 "shared" (T.daily 2) ]
        }
    }
