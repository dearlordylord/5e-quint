let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


let rangerSkills =
      [ "animal_handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival" ]

let ranger =
      { armorTraining = { categories = [ "light", "medium", "shield" ], kind = "trained" }
      , className = "ranger"
      , description = "SRD Ranger class creation facts for a level-1 character, including class-list prepared Spell Access, Spell Slots, and spellcasting focus facts."
      , featureGrants =
        [ { level = 1, unitId = "ranger_favored_enemy" }
        , { level = 1, unitId = "ranger_weapon_mastery" }
        ]
      , hitPointDie = 10
      , id = "class_ranger"
      , kind = "class"
      , multiclassProficiencies =
          { choice =
              { choiceKey = "ranger_multiclass_skill_proficiency"
              , count = 1
              , options =
                [ { kind = "skill", skill = "animal_handling" }
                , { kind = "skill", skill = "athletics" }
                , { kind = "skill", skill = "insight" }
                , { kind = "skill", skill = "investigation" }
                , { kind = "skill", skill = "nature" }
                , { kind = "skill", skill = "perception" }
                , { kind = "skill", skill = "stealth" }
                , { kind = "skill", skill = "survival" }
                ]
              }
          , fixed =
            [ { category = "martial", kind = "weapon_category" }
            , { category = "light", kind = "armor_category" }
            , { category = "medium", kind = "armor_category" }
            , { category = "shield", kind = "armor_category" }
            ]
          , kind = "mixed"
          }
      , name = "Ranger"
      , primaryAbilities = { abilities = [ "dex", "wis" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Ranger.md:3-24,33-35,58-74" }
      , savingThrowProficiencies = [ "str", "dex" ]
      , skillProficiencyChoice = { choose = 3, options = rangerSkills }
      , spellcasting =
          { kind = "list_prepared_spellcasting_creation"
          , featureLevel = 1
          , spellcastingAbility = "wis"
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 2
              , spells =
                [ { spellId = "cure_wounds", spellLevel = 1 }
                , { spellId = "ensnaring_strike", spellLevel = 1 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "long_rest", replacementCount = 1 }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingFocus = "druidic_focus"
          }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 7
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Studded Leather Armor", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Scimitar", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Shortsword", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Longbow", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Arrows", kind = "draft_owned_item", quantity = Some 20, unitId = None Text }
            , { itemName = Some "Quiver", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Druidic Focus (sprig of mistletoe)", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Explorer's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
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

in  ranger
