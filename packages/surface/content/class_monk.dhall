let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let WeaponProficiency : Type =
      { anyOfProperties : Optional (List Text), category : Text, kind : Text }

let monk =
      { armorTraining = { kind = "none" }
      , className = "monk"
      , description = "SRD Monk class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "monk_martial_arts" }
        , { level = 1, unitId = "monk_unarmored_defense" }
        , { level = 2, unitId = "monk_monks_focus" }
        , { level = 2, unitId = "monk_unarmored_movement" }
        , { level = 2, unitId = "monk_uncanny_metabolism" }
        ]
      , hitPointDie = 8
      , id = "class_monk"
      , kind = "class"
      , multiclassProficiencies = { kind = "none" }
      , name = "Monk"
      , primaryAbilities = { abilities = [ "dex", "wis" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Monk.md:3-25,28-33" }
      , savingThrowProficiencies = [ "str", "dex" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "acrobatics", "athletics", "history", "insight", "religion", "stealth" ] }
      , subclassChoices =
        [ { level = 3
          , options = [ "subclass_monk_warrior_of_the_open_hand" ]
          }
        ]
      , startingEquipment =
        [ { coinsGp = 11
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Spear", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dagger", kind = "draft_owned_item", quantity = Some 5, unitId = None Text }
            , { itemName = Some "Artisan's Tools or Musical Instrument", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Explorer's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 50, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies =
          { count = 1
          , kind = "choice"
          , options =
            [ { category = "artisan_tool", kind = "tool_category" }
            , { category = "musical_instrument", kind = "tool_category" }
            ]
          }
      , weaponProficiencies =
        [ { anyOfProperties = None (List Text), category = "simple", kind = "weapon_category" }
        , { anyOfProperties = Some [ "light" ], category = "martial", kind = "weapon_category_with_properties" }
        ] : List WeaponProficiency
      }

in  monk
