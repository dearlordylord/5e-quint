let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


let druid =
      { armorTraining = { categories = [ "light", "shield" ], kind = "trained" }
      , className = "druid"
      , description = "SRD Druid class creation facts for a level-1 character, including class-list prepared Spell Access, Spell Slots, and spellcasting focus facts."
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Druid.md:3-25,30-32,57-79" }
      , savingThrowProficiencies = [ "int", "wis" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "animal_handling", "arcana", "insight", "medicine", "nature", "perception", "religion", "survival" ] }
      , spellcasting =
          { kind = "list_prepared_spellcasting_creation"
          , spellcastingAbility = "wis"
          , cantripAccess =
              { kind = "known_cantrips_from_class_spell_list"
              , choose = 2
              , spellIds = [ "druidcraft", "produce_flame" ]
              , changeOn = { kind = "class_level", count = 1 }
              }
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 4
              , spells =
                [ { spellId = "animal_friendship", spellLevel = 1 }
                , { spellId = "cure_wounds", spellLevel = 1 }
                , { spellId = "faerie_fire", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "long_rest", replacementCount = "any" }
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
