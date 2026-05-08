let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }


let paladin =
      { armorTraining = { categories = [ "light", "medium", "heavy", "shield" ], kind = "trained" }
      , className = "paladin"
      , description = "SRD Paladin class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "paladin_lay_on_hands" }
        , { level = 1, unitId = "paladin_spellcasting" }
        , { level = 1, unitId = "paladin_weapon_mastery" }
        ]
      , hitPointDie = 10
      , id = "class_paladin"
      , kind = "class"
      , multiclassProficiencies =
          { kind = "fixed"
          , proficiencies =
            [ { category = "martial", kind = "weapon_category" }
            , { category = "light", kind = "armor_category" }
            , { category = "medium", kind = "armor_category" }
            , { category = "shield", kind = "armor_category" }
            ]
          }
      , name = "Paladin"
      , primaryAbilities = { abilities = [ "str", "cha" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Paladin.md:3-24,33-35" }
      , savingThrowProficiencies = [ "wis", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "athletics", "insight", "intimidation", "medicine", "persuasion", "religion" ] }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 9
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Chain Mail", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Shield", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Longsword", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Javelin", kind = "draft_owned_item", quantity = Some 6, unitId = None Text }
            , { itemName = Some "Holy Symbol", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Priest's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 150, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies = { kind = "none" }
      , weaponProficiencies =
        [ { category = "simple", kind = "weapon_category" }
        , { category = "martial", kind = "weapon_category" }
        ]
      }

in  paladin
