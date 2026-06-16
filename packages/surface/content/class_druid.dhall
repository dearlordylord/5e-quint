let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }

let SpellSlot : Type = { count : Natural, spellLevel : Natural }

let SpellcastingProgressionRow : Type =
      { atLevel : Natural, cantripCount : Natural, preparedSpellCount : Natural, spellSlots : List SpellSlot }


let druid =
      { armorTraining = { categories = [ "light", "shield" ], kind = "trained" }
      , className = "druid"
      , description = "SRD Druid class creation and early progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level 1-2 class feature grants, level 3 subclass selection, and the level 4 Ability Score Improvement feature grant."
      , featureGrants =
        [ { level = 1, unitId = "druid_druidic" }
        , { level = 1, unitId = "druid_primal_order" }
        , { level = 2, unitId = "druid_wild_shape" }
        , { level = 2, unitId = "druid_wild_companion" }
        , { level = 4, unitId = "druid_ability_score_improvement_l4" }
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Druid.md:3-35,57-79,134-136" }
      , savingThrowProficiencies = [ "int", "wis" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "animal_handling", "arcana", "insight", "medicine", "nature", "perception", "religion", "survival" ] }
      , spellcasting =
          { kind = "list_prepared_spellcasting_progression_creation"
          , featureLevel = 1
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
                , { spellId = "entangle", spellLevel = 1 }
                , { spellId = "faerie_fire", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                , { spellId = "aid", spellLevel = 2 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "long_rest", replacementCount = "any" }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingProgression =
              [ { atLevel = 1
                , cantripCount = 2
                , preparedSpellCount = 4
                , spellSlots = [ { spellLevel = 1, count = 2 } ]
                }
              , { atLevel = 2
                , cantripCount = 2
                , preparedSpellCount = 5
                , spellSlots = [ { spellLevel = 1, count = 3 } ]
                }
              , { atLevel = 3
                , cantripCount = 2
                , preparedSpellCount = 6
                , spellSlots =
                  [ { spellLevel = 1, count = 4 }
                  , { spellLevel = 2, count = 2 }
                  ]
                }
              ] : List SpellcastingProgressionRow
          , spellcastingFocus = "druidic_focus"
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_druid_circle_of_the_land" ] } ]
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
