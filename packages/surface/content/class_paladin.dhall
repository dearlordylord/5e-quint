let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


let paladin =
      { armorTraining = { categories = [ "light", "medium", "heavy", "shield" ], kind = "trained" }
      , className = "paladin"
      , description = "SRD Paladin class creation, level-1 through level-3 Spellcasting facts, and the level-4 Ability Score Improvement feature grant."
      , featureGrants =
        [ { level = 1, unitId = "paladin_lay_on_hands" }
        , { level = 1, unitId = "paladin_weapon_mastery" }
        , { level = 2, unitId = "paladin_fighting_style" }
        , { level = 2, unitId = "paladin_paladins_smite" }
        , { level = 3, unitId = "paladin_channel_divinity" }
        , { level = 4, unitId = "paladin_ability_score_improvement_l4" }
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Paladin.md:3-24,33-38,66-124" }
      , savingThrowProficiencies = [ "wis", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "athletics", "insight", "intimidation", "medicine", "persuasion", "religion" ] }
      , spellcasting =
          { kind = "list_prepared_spellcasting_progression_creation"
          , featureLevel = 1
          , spellcastingAbility = "cha"
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 2
              , spells =
                [ { spellId = "heroism", spellLevel = 1 }
                , { spellId = "searing_smite", spellLevel = 1 }
                , { spellId = "bless", spellLevel = 1 }
                , { spellId = "command", spellLevel = 1 }
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
            ]
          , spellcastingFocus = "holy_symbol"
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_paladin_oath_of_devotion" ] } ]
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
