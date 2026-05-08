let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }


let sorcerer =
      { armorTraining = { kind = "none" }
      , className = "sorcerer"
      , description = "SRD Sorcerer class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "sorcerer_spellcasting" }
        , { level = 1, unitId = "sorcerer_innate_sorcery" }
        ]
      , hitPointDie = 6
      , id = "class_sorcerer"
      , kind = "class"
      , multiclassProficiencies = { kind = "none" }
      , name = "Sorcerer"
      , primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Sorcerer.md:3-24,33-35" }
      , savingThrowProficiencies = [ "con", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "arcana", "deception", "insight", "intimidation", "persuasion", "religion" ] }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 28
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Spear", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dagger", kind = "draft_owned_item", quantity = Some 2, unitId = None Text }
            , { itemName = Some "Arcane Focus (crystal)", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dungeoneer's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 50, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies = { kind = "none" }
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  sorcerer
