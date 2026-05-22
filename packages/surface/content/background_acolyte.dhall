let AbilityScoreMethod
    : Type
    = { eachIncrease : Optional Natural
      , kind : Text
      , maxScore : Natural
      , primaryIncrease : Optional Natural
      , secondaryIncrease : Optional Natural
      }

let StartingItem
    : Type
    = { itemName : Optional Text
      , kind : Text
      , quantity : Optional Natural
      , unitId : Optional Text
      }

let StartingEquipmentOption
    : Type
    = { coinsGp : Natural
      , id : Text
      , items : Optional (List StartingItem)
      , kind : Text
      }

let acolyte =
      { abilityScoreIncrease =
        { abilities = [ "int", "wis", "cha" ]
        , methods =
          [ { eachIncrease = None Natural
            , kind = "two_scores"
            , maxScore = 20
            , primaryIncrease = Some 2
            , secondaryIncrease = Some 1
            }
          , { eachIncrease = Some 1
            , kind = "three_scores"
            , maxScore = 20
            , primaryIncrease = None Natural
            , secondaryIncrease = None Natural
            }
          ]
        }
      , description =
          "Minimum SRD Acolyte background facts for ability scores, proficiencies, feat, and equipment."
      , id = "background_acolyte"
      , kind = "background"
      , name = "Acolyte"
      , originFeatId = "feat_magic_initiate_cleric"
      , provenance =
        { kind = "srd-5.2.1", section = "Character-Origins.md:11-29,33-39" }
      , skillProficiencies = [ "insight", "religion" ]
      , startingEquipment =
            [ { coinsGp = 8
              , id = "option_a"
              , items = Some
                [ { itemName = None Text
                  , kind = "selected_tool_proficiency"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Book (prayers)"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Holy Symbol"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Parchment"
                  , kind = "draft_owned_item"
                  , quantity = Some 10
                  , unitId = None Text
                  }
                , { itemName = Some "Robe"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                ]
              , kind = "item_bundle"
              }
            , { coinsGp = 50
              , id = "option_b"
              , items = None (List StartingItem)
              , kind = "coin_grant"
              }
            ]
          : List StartingEquipmentOption
      , toolProficiency =
        { kind = "specific_tool", toolId = "calligraphers_supplies" }
      }

in  acolyte
