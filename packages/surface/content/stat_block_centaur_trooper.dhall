let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_centaur_trooper"
    , kind = "statBlock"
    , name = "Centaur Trooper"
    , provenance =
        { kind = "srd-5.2.1"
        , section = "Monsters/Monsters-C-D.md:7-36"
        }
    , statBlock =
        { abilityScores =
            { str = 18, dex = 14, con = 14, int = 9, wis = 13, cha = 11 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.text 1 "Multiattack" "The centaur makes two attacks, using Pike or Longbow in any combination." "unsupported_action_shape"
            , T.exec 2
                (T.attack "Pike" "melee" "str" +6 (Some 10) (None T.Range) (None Text)
                  [ T.damage "piercing" 1 10 (Some +4) 9 ]
                  (None Text))
            , T.exec 3
                (T.attack "Longbow" "ranged" "dex" +4 (None Natural) (Some { normal = 150, long = 600 }) (Some "arrow")
                  [ T.damage "piercing" 1 8 (Some +2) 6 ]
                  (None Text))
            ]
        , bonusActions =
            [ T.textSome 1 "Trampling Charge" "The centaur moves up to its Speed without provoking Opportunity Attacks and can move through the spaces of Medium or smaller creatures. Each creature whose space the centaur enters is targeted once by the following effect. Strength Saving Throw: DC 14. Failure: 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition." "unsupported_action_shape" [ 1 ]
            ]
        , alignment = { order = "neutral", morality = "good" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Elvish", "Sylvan" ] }
            }
        , creatureType = "fey"
        , gear =
            [ { item = "Breastplate", quantity = None Natural }
            , { item = "Longbow", quantity = None Natural }
            , { item = "Pike", quantity = None Natural }
            ]
        , hp = { kind = "literal", value = 45 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        , savingThrowModifiers =
            [ { ability = "str", modifier = +4 }
            , { ability = "dex", modifier = +2 }
            , { ability = "con", modifier = +2 }
            , { ability = "int", modifier = -1 }
            , { ability = "wis", modifier = +1 }
            , { ability = "cha", modifier = +0 }
            ]
        , skillModifiers =
            [ { skill = "athletics", modifier = 6 }
            , { skill = "perception", modifier = 3 }
            ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        }
    }
