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

let soldier =
      { abilityScoreIncrease =
        { abilities = [ "str", "dex", "con" ]
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
          "Minimum SRD Soldier background facts for ability scores, proficiencies, feat, and equipment."
      , id = "background_soldier"
      , kind = "background"
      , name = "Soldier"
      , originFeatId = "feat_savage_attacker"
      , provenance =
        { kind = "srd-5.2.1", section = "Character-Origins.md:11-29,57-63" }
      , skillProficiencies = [ "athletics", "intimidation" ]
      , startingEquipment =
            [ { coinsGp = 14
              , id = "option_a"
              , items = Some
                [ { itemName = None Text
                  , kind = "unit_ref"
                  , quantity = None Natural
                  , unitId = Some "weapon_spear"
                  }
                , { itemName = None Text
                  , kind = "unit_ref"
                  , quantity = None Natural
                  , unitId = Some "weapon_shortbow"
                  }
                , { itemName = Some "Arrows"
                  , kind = "draft_owned_item"
                  , quantity = Some 20
                  , unitId = None Text
                  }
                , { itemName = None Text
                  , kind = "selected_tool_proficiency"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Healer's Kit"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Quiver"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
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
        { category = "gaming_set", choose = 1, kind = "tool_category_choice" }
      }

in  soldier
