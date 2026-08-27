let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_dryad"
    , kind = "statBlock"
    , name = "Dryad"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:929-968" }
    , statBlock =
        { abilityScores = { str = 10, dex = 12, con = 11, int = 14, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.text 1 "Multiattack" "The dryad makes one Vine Lash or Thorn Burst attack, and it can use Spellcasting to cast Charm Monster." "unsupported_action_shape"
            , T.exec 2 (T.attack "Vine Lash" "melee" "cha" +6 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 1 8 (Some +4) 8 ] (None Text))
            , T.exec 3 (T.attack "Thorn Burst" "ranged" "cha" +6 (None Natural) (Some { normal = 60, long = 60 }) (None Text) [ T.damage "piercing" 1 6 (Some +4) 7 ] (None Text))
            , T.execSome 4
                (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 14 }) (None { kind : Text, value : Integer }) T.noMaterial
                  [ T.atWill
                      [ -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Animal Friendship.
                        T.spellRef "animal_friendship" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Charm Monster, lasts 24 hours; ends early if the dryad casts it again.
                        T.spellRef "charm_monster" (None Natural) (None Natural) (Some "lasts 24 hours; ends early if the dryad casts the spell again")
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Druidcraft.
                        T.spellRef "druidcraft" (None Natural) (None Natural) (None Text)
                      ]
                  , T.limited [ 1 ]
                      [ -- RAW: Monsters/Monsters-C-D.md:929-968 — 1/Day Each: Entangle.
                        T.spellRef "entangle" (None Natural) (None Natural) (None Text)
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — 1/Day Each: Pass without Trace.
                        T.spellRef "pass_without_trace" (None Natural) (None Natural) (None Text)
                      ]
                  ]) [ 1 ]
            ]
        , bonusActions =
            [ T.text 1 "Tree Stride" "If within 5 feet of a Large or bigger tree, the dryad teleports to an unoccupied space within 5 feet of a second Large or bigger tree that is within 60 feet of the previous tree." "unsupported_action_shape"
            ]
        , traits = [ T.trait "Magic Resistance" "The dryad has Advantage on saving throws against spells and other magical effects.", T.trait "Speak with Beasts and Plants" "The dryad can communicate with Beasts and Plants as if they shared a language." ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Elvish", "Sylvan" ] } }
        , creatureType = "fey"
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 5 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "each" (T.daily 1) ]
        }
    }
