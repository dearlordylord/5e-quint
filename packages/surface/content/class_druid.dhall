let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }


let druid =
      { armorTraining = { categories = [ "light", "shield" ], kind = "trained" }
      , className = "druid"
      , description = "SRD Druid class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "druid_spellcasting" }
        , { level = 1, unitId = "druid_druidic" }
        , { level = 1, unitId = "druid_primal_order" }
        ]
      , hitPointDie = 8
      , id = "class_druid"
      , kind = "class"
      , multiclassProficiencies =
          { kind = "fixed"
          , proficiencies =
            [ { category = "light", kind = "armor_category" }
            , { category = "shield", kind = "armor_category" }
            ]
          }
      , name = "Druid"
      , primaryAbilities = { abilities = [ "wis" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Druid.md:3-25,30-32" }
      , savingThrowProficiencies = [ "int", "wis" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "animal_handling", "arcana", "insight", "medicine", "nature", "perception", "religion", "survival" ] }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 9
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Leather Armor", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Shield", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Sickle", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Druidic Focus (Quarterstaff)", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Explorer's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Herbalism Kit", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 50, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies =
          { kind = "fixed", proficiencies = [ { kind = "tool", toolId = "herbalism_kit" } ] }
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  druid
