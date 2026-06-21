let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


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
      , description = "SRD Bard class creation and early progression facts, including level 1-2 class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level 1-2 class feature grants, and the level 4 Ability Score Improvement feature grant."
      , featureGrants =
        [ { level = 1, unitId = "bard_bardic_inspiration" }
        , { level = 2, unitId = "bard_expertise" }
        , { level = 2, unitId = "bard_jack_of_all_trades" }
        , { level = 4, unitId = "bard_ability_score_improvement_l4" }
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Bard.md:3-26,34-37,69-103,109-111,158-184" }
      , savingThrowProficiencies = [ "dex", "cha" ]
      , skillProficiencyChoice = { choose = 3, options = allSkills }
      , spellcasting =
          { kind = "list_prepared_spellcasting_progression_creation"
          , featureLevel = 1
          , spellcastingAbility = "cha"
          , cantripAccess =
              { kind = "known_cantrips_from_class_spell_list"
              , choose = 2
              , spellIds = [ "dancing_lights", "vicious_mockery" ]
              , changeOn = { kind = "class_level", count = 1 }
              }
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 4
              , spells =
                [ { spellId = "animal_friendship", spellLevel = 1 }
                , { spellId = "charm_person", spellLevel = 1 }
                , { spellId = "color_spray", spellLevel = 1 }
                , { spellId = "cure_wounds", spellLevel = 1 }
                , { spellId = "dissonant_whispers", spellLevel = 1 }
                , { spellId = "healing_word", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                , { spellId = "aid", spellLevel = 2 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "class_level", replacementCount = 1 }
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
            ]
          , spellcastingFocus = "musical_instrument"
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_bard_college_of_lore" ] } ]
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
