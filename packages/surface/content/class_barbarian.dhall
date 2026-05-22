let StartingItem : Type =
      { itemName : Optional Text
      , kind : Text
      , quantity : Optional Natural
      , unitId : Optional Text
      }

let StartingEquipmentOption : Type =
      { coinsGp : Natural
      , id : Text
      , items : Optional (List StartingItem)
      , kind : Text
      }

let barbarian =
      { armorTraining =
          { categories = [ "light", "medium", "shield" ], kind = "trained" }
      , className = "barbarian"
      , description = "SRD Barbarian class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "barbarian_rage" }
        , { level = 1, unitId = "barbarian_unarmored_defense" }
        , { level = 1, unitId = "barbarian_weapon_mastery" }
        ]
      , hitPointDie = 12
      , id = "class_barbarian"
      , kind = "class"
      , multiclassProficiencies =
          { kind = "fixed"
          , proficiencies =
            [ { category = "martial", kind = "weapon_category" }
            , { category = "shield", kind = "armor_category" }
            ]
          }
      , name = "Barbarian"
      , primaryAbilities = { abilities = [ "str" ], kind = "all_of" }
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Barbarian.md:3-25,35" }
      , savingThrowProficiencies = [ "str", "con" ]
      , skillProficiencyChoice =
        { choose = 2
        , options =
          [ "animal_handling"
          , "athletics"
          , "intimidation"
          , "nature"
          , "perception"
          , "survival"
          ]
        }
      , subclassChoices =
        [ { level = 3
          , options = [ "subclass_barbarian_path_of_the_berserker" ]
          }
        ]
      , toolProficiencies = { kind = "none" }
      , startingEquipment =
        [ { coinsGp = 15
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Greataxe"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Handaxe"
              , kind = "draft_owned_item"
              , quantity = Some 4
              , unitId = None Text
              }
            , { itemName = Some "Explorer's Pack"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 75
          , id = "option_b"
          , items = None (List StartingItem)
          , kind = "coin_grant"
          }
        ] : List StartingEquipmentOption
      , weaponProficiencies =
        [ { category = "simple", kind = "weapon_category" }
        , { category = "martial", kind = "weapon_category" }
        ]
      }

in  barbarian
