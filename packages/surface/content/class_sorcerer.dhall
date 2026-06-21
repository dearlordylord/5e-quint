let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


let sorcerer =
      { armorTraining = { kind = "none" }
      , className = "sorcerer"
      , description = "SRD Sorcerer class creation and early progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level-1 and level-2 class-feature grants, level-3 subclass selection, the level-4 Ability Score Improvement feature grant, and the level-5 Sorcerous Restoration feature grant."
      , featureGrants =
        [ { level = 1, unitId = "sorcerer_innate_sorcery" }
        , { level = 2, unitId = "sorcerer_font_of_magic" }
        , { level = 2, unitId = "sorcerer_metamagic" }
        , { level = 4, unitId = "sorcerer_ability_score_improvement_l4" }
        , { level = 5, unitId = "sorcerer_sorcerous_restoration" }
        ]
      , hitPointDie = 6
      , id = "class_sorcerer"
      , kind = "class"
      , multiclassProficiencies = { kind = "none" }
      , name = "Sorcerer"
      , primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Sorcerer.md:3-24,33-76,123-129,219-227,240-259" }
      , savingThrowProficiencies = [ "con", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "arcana", "deception", "insight", "intimidation", "persuasion", "religion" ] }
      , spellcasting =
          { kind = "list_prepared_spellcasting_progression_creation"
          , featureLevel = 1
          , spellcastingAbility = "cha"
          , cantripAccess =
              { kind = "known_cantrips_from_class_spell_list"
              , choose = 4
              , spellIds =
                [ "light"
                , "prestidigitation"
                , "shocking_grasp"
                , "sorcerous_burst"
                , "fire_bolt"
                , "acid_splash"
                , "ray_of_frost"
                ]
              , changeOn = { kind = "class_level", count = 1 }
              }
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 2
              , spells =
                [ { spellId = "burning_hands", spellLevel = 1 }
                , { spellId = "detect_magic", spellLevel = 1 }
                , { spellId = "chromatic_orb", spellLevel = 1 }
                , { spellId = "false_life", spellLevel = 1 }
                , { spellId = "mage_armor", spellLevel = 1 }
                , { spellId = "magic_missile", spellLevel = 1 }
                , { spellId = "ray_of_sickness", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                , { spellId = "alter_self", spellLevel = 2 }
                , { spellId = "scorching_ray", spellLevel = 2 }
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
              , cantripCount = 4
              , preparedSpellCount = 2
              , spellSlots = [ { spellLevel = 1, count = 2 } ]
              }
            , { atLevel = 2
              , cantripCount = 4
              , preparedSpellCount = 4
              , spellSlots = [ { spellLevel = 1, count = 3 } ]
              }
            , { atLevel = 3
              , cantripCount = 4
              , preparedSpellCount = 6
              , spellSlots =
                [ { spellLevel = 1, count = 4 }
                , { spellLevel = 2, count = 2 }
                ]
              }
            ]
          , spellcastingFocus = "arcane_focus"
          }
      , subclassChoices =
        [ { level = 3
          , options = [ "subclass_sorcerer_draconic_sorcery" ]
          }
        ]
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
