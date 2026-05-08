let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }


let cleric =
      { armorTraining = { categories = [ "light", "medium", "shield" ], kind = "trained" }
      , className = "cleric"
      , description = "SRD Cleric class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "cleric_spellcasting" }
        , { level = 1, unitId = "cleric_divine_order" }
        ]
      , hitPointDie = 8
      , id = "class_cleric"
      , kind = "class"
      , multiclassProficiencies =
          { kind = "fixed"
          , proficiencies =
            [ { category = "light", kind = "armor_category" }
            , { category = "medium", kind = "armor_category" }
            , { category = "shield", kind = "armor_category" }
            ]
          }
      , name = "Cleric"
      , primaryAbilities = { abilities = [ "wis" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Cleric.md:3-24,33-35" }
      , savingThrowProficiencies = [ "wis", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "history", "insight", "medicine", "persuasion", "religion" ] }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 7
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Chain Shirt", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Shield", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Mace", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Holy Symbol", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Priest's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 110, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies = { kind = "none" }
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  cleric
