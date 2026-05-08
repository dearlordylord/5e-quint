let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }


let ProficiencySubject : Type =
      { category : Optional Text
      , kind : Text
      , skill : Optional Text
      , toolId : Optional Text
      }

let allSkills =
      [ "acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival" ]

let bard =
      { armorTraining = { categories = [ "light" ], kind = "trained" }
      , className = "bard"
      , description = "SRD Bard class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "bard_bardic_inspiration" }
        , { level = 1, unitId = "bard_spellcasting" }
        ]
      , hitPointDie = 8
      , id = "class_bard"
      , kind = "class"
      , multiclassProficiencies =
          { fixed = [ { category = "light", kind = "armor_category" } ]
          , choices =
            [ { choiceKey = "bard_multiclass_skill_proficiency"
              , count = 1
              , options =
                [ { category = None Text, kind = "skill", skill = Some "acrobatics", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "animal_handling", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "arcana", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "athletics", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "deception", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "history", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "insight", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "intimidation", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "investigation", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "medicine", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "nature", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "perception", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "performance", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "persuasion", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "religion", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "sleight_of_hand", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "stealth", toolId = None Text }
                , { category = None Text, kind = "skill", skill = Some "survival", toolId = None Text }
                ] : List ProficiencySubject
              }
            , { choiceKey = "bard_multiclass_musical_instrument_proficiency"
              , count = 1
              , options =
                [ { category = Some "musical_instrument"
                  , kind = "tool_category"
                  , skill = None Text
                  , toolId = None Text
                  }
                ] : List ProficiencySubject
              }
            ]
          , kind = "mixed_choices"
          }
      , name = "Bard"
      , primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Bard.md:3-25,34-36" }
      , savingThrowProficiencies = [ "dex", "cha" ]
      , skillProficiencyChoice = { choose = 3, options = allSkills }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 19
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Leather Armor", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dagger", kind = "draft_owned_item", quantity = Some 2, unitId = None Text }
            , { itemName = Some "Musical Instrument", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Entertainer's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 90, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies =
          { count = 3
          , kind = "choice"
          , options = [ { category = "musical_instrument", kind = "tool_category" } ]
          }
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  bard
