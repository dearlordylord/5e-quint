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

let criminal =
      { abilityScoreIncrease =
        { abilities = [ "dex", "con", "int" ]
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
          "Minimum SRD Criminal background facts for ability scores, proficiencies, feat, and equipment."
      , id = "background_criminal"
      , kind = "background"
      , name = "Criminal"
      , originFeatId = "alert"
      , provenance =
        { kind = "srd-5.2.1", section = "Character-Origins.md:11-29,41-47" }
      , skillProficiencies = [ "sleight_of_hand", "stealth" ]
      , startingEquipment =
            [ { coinsGp = 16
              , id = "option_a"
              , items = Some
                [ { itemName = None Text
                  , kind = "unit_ref"
                  , quantity = Some 2
                  , unitId = Some "weapon_dagger"
                  }
                , { itemName = None Text
                  , kind = "selected_tool_proficiency"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Crowbar"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Pouches"
                  , kind = "draft_owned_item"
                  , quantity = Some 2
                  , unitId = None Text
                  }
                , { itemName = Some "Traveler's Clothes"
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
        { kind = "specific_tool", toolId = "thieves_tools" }
      }

in  criminal
