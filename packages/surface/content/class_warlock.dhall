let StartingItem : Type =
      { itemName : Optional Text, kind : Text, quantity : Optional Natural, unitId : Optional Text }

let StartingEquipmentOption : Type =
      { coinsGp : Natural, id : Text, items : Optional (List StartingItem), kind : Text }

let warlock =
      { armorTraining = { categories = [ "light" ], kind = "trained" }
      , className = "warlock"
      , description = "SRD Warlock class creation facts for a level-1 character."
      , featureGrants =
        [ { level = 1, unitId = "warlock_eldritch_invocations" }
        , { level = 1, unitId = "warlock_pact_magic" }
        ]
      , hitPointDie = 8
      , id = "class_warlock"
      , kind = "class"
      , multiclassProficiencies =
          { kind = "fixed"
          , proficiencies = [ { category = "light", kind = "armor_category" } ]
          }
      , name = "Warlock"
      , primaryAbilities = { abilities = [ "cha" ], kind = "all_of" }
      , provenance = { kind = "srd-5.2.1", section = "Classes/Warlock.md:3-24,35" }
      , savingThrowProficiencies = [ "wis", "cha" ]
      , skillProficiencyChoice =
        { choose = 2
        , options = [ "arcana", "deception", "history", "intimidation", "investigation", "nature", "religion" ]
        }
      , spellcasting =
          { cantripAccess =
              { changeOn = { count = 1, kind = "class_level" }
              , choose = 2
              , kind = "known_cantrips_from_class_spell_list"
              , spellIds = [ "eldritch_blast", "minor_illusion" ]
              }
          , kind = "pact_magic_spellcasting_creation"
          , pactSlotProjection =
              { count = 1
              , kind = "pact_slots"
              , resetCadence = { kind = "short_or_long_rest" }
              , spellLevel = 1
              }
          , preparedAccess =
              { changeOn = { kind = "class_level", replacementCount = 1 }
              , choose = 2
              , kind = "prepared_from_class_spell_list"
              , spells =
                [ { spellId = "charm_person", spellLevel = 1 }
                , { spellId = "hellish_rebuke", spellLevel = 1 }
                ]
              }
          , spellcastingAbility = "cha"
          , spellcastingFocus = "arcane_focus"
          }
      , subclassChoices = [] : List { level : Natural, options : List Text }
      , startingEquipment =
        [ { coinsGp = 15
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Leather Armor", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Sickle", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Dagger", kind = "draft_owned_item", quantity = Some 2, unitId = None Text }
            , { itemName = Some "Arcane Focus (orb)", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Book (occult lore)", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            , { itemName = Some "Scholar's Pack", kind = "draft_owned_item", quantity = None Natural, unitId = None Text }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 100, id = "option_b", items = None (List StartingItem), kind = "coin_grant" }
        ] : List StartingEquipmentOption
      , toolProficiencies = { kind = "none" }
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  warlock
