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

let fighter =
      { armorTraining =
          { categories = [ "light", "medium", "heavy", "shield" ]
          , kind = "trained"
          }
      , className = "fighter"
      , description =
          "Minimum SRD Fighter class creation facts through level 2."
      , featureGrants =
        [ { level = 1, unitId = "fighter_fighting_style" }
        , { level = 1, unitId = "fighter_second_wind" }
        , { level = 1, unitId = "fighter_weapon_mastery" }
        , { level = 2, unitId = "fighter_action_surge" }
        , { level = 2, unitId = "fighter_tactical_mind" }
        ]
      , hitPointDie = 10
      , id = "class_fighter"
      , kind = "class"
      , name = "Fighter"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Classes/Fighter.md:3-13,17-20,29-32,56-84"
        }
      , savingThrowProficiencies = [ "str", "con" ]
      , skillProficiencyChoice =
        { choose = 2
        , options =
          [ "acrobatics"
          , "animal_handling"
          , "athletics"
          , "history"
          , "insight"
          , "intimidation"
          , "persuasion"
          , "perception"
          , "survival"
          ]
        }
      , startingEquipment =
        [ { coinsGp = 4
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Chain Mail"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Greatsword"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Flail"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Javelin"
              , kind = "draft_owned_item"
              , quantity = Some 8
              , unitId = None Text
              }
            , { itemName = Some "Dungeoneer's Pack"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 11
          , id = "option_b"
          , items = Some
            [ { itemName = Some "Studded Leather Armor"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Scimitar"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Shortsword"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Longbow"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Arrows"
              , kind = "draft_owned_item"
              , quantity = Some 20
              , unitId = None Text
              }
            , { itemName = Some "Quiver"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Dungeoneer's Pack"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 155
          , id = "option_c"
          , items = None (List StartingItem)
          , kind = "coin_grant"
          }
        ] : List StartingEquipmentOption
      , weaponProficiencies = [ "simple", "martial" ]
      }

in  fighter
