let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }

let SpellSlot : Type = { count : Natural, spellLevel : Natural }

let SpellcastingProgressionRow : Type =
      { atLevel : Natural, cantripCount : Natural, preparedSpellCount : Natural, spellSlots : List SpellSlot }


let rangerSkills =
      [ "animal_handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival" ]

let ranger =
      { armorTraining = { categories = [ "light", "medium", "shield" ], kind = "trained" }
      , className = "ranger"
      , description = "SRD Ranger class creation and early progression facts through level 3, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level-2 class-feature grants, and level-3 subclass selection."
      , featureGrants =
        [ { level = 1, unitId = "ranger_favored_enemy" }
        , { level = 1, unitId = "ranger_weapon_mastery" }
        , { level = 2, unitId = "ranger_deft_explorer" }
        , { level = 2, unitId = "ranger_fighting_style" }
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Ranger.md:3-24,33-36,58-99,156-177" }
      , savingThrowProficiencies = [ "str", "dex" ]
      , skillProficiencyChoice = { choose = 3, options = rangerSkills }
      , spellcasting =
          { kind = "list_prepared_spellcasting_progression_creation"
          , featureLevel = 1
          , spellcastingAbility = "wis"
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 2
              , spells =
                [ { spellId = "cure_wounds", spellLevel = 1 }
                , { spellId = "ensnaring_strike", spellLevel = 1 }
                , { spellId = "longstrider", spellLevel = 1 }
                , { spellId = "hunters_mark", spellLevel = 1 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "long_rest", replacementCount = 1 }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingProgression =
              [ { atLevel = 1
                , cantripCount = 0
                , preparedSpellCount = 2
                , spellSlots = [ { spellLevel = 1, count = 2 } ]
                }
              , { atLevel = 2
                , cantripCount = 0
                , preparedSpellCount = 3
                , spellSlots = [ { spellLevel = 1, count = 2 } ]
                }
              , { atLevel = 3
                , cantripCount = 0
                , preparedSpellCount = 4
                , spellSlots = [ { spellLevel = 1, count = 3 } ]
                }
              ] : List SpellcastingProgressionRow
          , spellcastingFocus = "druidic_focus"
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_ranger_hunter" ] } ]
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
