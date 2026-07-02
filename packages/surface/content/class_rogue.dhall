let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let WeaponProficiency : Type =
      { anyOfProperties : Optional (List Text), category : Text, kind : Text }

let ProficiencySubject : Type =
      { category : Optional Text
      , kind : Text
      , skill : Optional Text
      , toolId : Optional Text
      }

let rogueSkills =
      [ "acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight_of_hand", "stealth" ]

let rogue =
      { armorTraining = { categories = [ "light" ], kind = "trained" }
      , className = "rogue"
      , description = "SRD Rogue class creation facts, Cunning Action, subclass selection, Steady Aim, and level 4-5 feature grants."
      , featureGrants =
        [ { level = 1, unitId = "rogue_expertise" }
        , { level = 1, unitId = "rogue_sneak_attack" }
        , { level = 1, unitId = "rogue_thieves_cant" }
        , { level = 1, unitId = "rogue_weapon_mastery" }
        , { level = 2, unitId = "rogue_cunning_action" }
        , { level = 3, unitId = "rogue_steady_aim" }
        , { level = 4, unitId = "rogue_ability_score_improvement_l4" }
        , { level = 5, unitId = "rogue_cunning_strike" }
        ]
      , hitPointDie = 8
      , id = "class_rogue"
      , kind = "class"
      , multiclassProficiencies =
          { choice =
              { choiceKey = "rogue_multiclass_skill_proficiency"
              , count = 1
              , options =
                [ { kind = "skill", skill = "acrobatics" }
                , { kind = "skill", skill = "athletics" }
                , { kind = "skill", skill = "deception" }
                , { kind = "skill", skill = "insight" }
                , { kind = "skill", skill = "intimidation" }
                , { kind = "skill", skill = "investigation" }
                , { kind = "skill", skill = "perception" }
                , { kind = "skill", skill = "persuasion" }
                , { kind = "skill", skill = "sleight_of_hand" }
                , { kind = "skill", skill = "stealth" }
                ]
              }
          , fixed =
            [ { category = None Text, kind = "tool", skill = None Text, toolId = Some "thieves_tools" }
            , { category = Some "light", kind = "armor_category", skill = None Text, toolId = None Text }
            ] : List ProficiencySubject
          , kind = "mixed"
          }
      , name = "Rogue"
      , primaryAbilities = { abilities = [ "dex" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Rogue.md:3-25,33-36,38-39,57-83,85-150" }
      , savingThrowProficiencies = [ "dex", "int" ]
      , skillProficiencyChoice = { choose = 4, options = rogueSkills }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_rogue_thief" ] } ]
      , startingEquipment =
        [ { coinsGp = 8
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Leather Armor", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dagger", kind = "draft_owned_item", quantity = Some 2, unitId = None Text }
            , { itemName = Some "Shortsword", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Shortbow", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Arrows", kind = "draft_owned_item", quantity = Some 20, unitId = None Text }
            , { itemName = Some "Quiver", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Thieves' Tools", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Burglar's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 100, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies =
          { kind = "fixed", proficiencies = [ { kind = "tool", toolId = "thieves_tools" } ] }
      , weaponProficiencies =
        [ { anyOfProperties = None (List Text), category = "simple", kind = "weapon_category" }
        , { anyOfProperties = Some [ "finesse", "light" ], category = "martial", kind = "weapon_category_with_properties" }
        ] : List WeaponProficiency
      }

in  rogue
