let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let ClassSpellAccess : Type = { spellId : Text, spellLevel : Natural }


let sorcerer =
      { armorTraining = { kind = "none" }
      , className = "sorcerer"
      , description = "SRD Sorcerer class creation facts for a level-1 character, including class-list prepared Spell Access, Spell Slots, and spellcasting focus facts."
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
      , provenance = { kind = "srd-5.2.1", section = "Classes/Sorcerer.md:3-24,33-35,56-76" }
      , savingThrowProficiencies = [ "con", "cha" ]
      , skillProficiencyChoice =
        { choose = 2, options = [ "arcana", "deception", "insight", "intimidation", "persuasion", "religion" ] }
      , spellcasting =
          { kind = "list_prepared_spellcasting_creation"
          , spellcastingAbility = "cha"
          , cantripAccess =
              { kind = "known_cantrips_from_class_spell_list"
              , choose = 4
              , spellIds =
                [ "light"
                , "prestidigitation"
                , "shocking_grasp"
                , "sorcerous_burst"
                ]
              , changeOn = { kind = "class_level", count = 1 }
              }
          , preparedAccess =
              { kind = "prepared_from_class_spell_list"
              , choose = 2
              , spells =
                [ { spellId = "burning_hands", spellLevel = 1 }
                , { spellId = "detect_magic", spellLevel = 1 }
                ] : List ClassSpellAccess
              , changeOn = { kind = "class_level", replacementCount = 1 }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingFocus = "arcane_focus"
          }
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
