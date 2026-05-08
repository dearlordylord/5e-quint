let StartingItem
    : Type
    = { itemName : Optional Text
      , kind : Text
      , quantity : Optional Natural
      , unitId : Optional Text
      }

let StartingEquipmentOption
    : Type
    = { coinsGp : Natural
      , id : Text
      , items : Optional (List StartingItem)
      , kind : Text
      }

let SpellbookSpell : Type = { spellId : Text, spellLevel : Natural }

let wizard =
      { armorTraining = { kind = "none" }
      , className = "wizard"
      , description =
          "SRD Wizard class creation facts for a level-1 character, including spellbook, prepared spells, Spell Slots, Ritual Adept, Arcane Recovery, and spellcasting focus facts."
      , featureGrants =
        [ { level = 1, unitId = "wizard_ritual_adept" }
        , { level = 1, unitId = "wizard_arcane_recovery" }
        ]
      , hitPointDie = 6
      , id = "class_wizard"
      , kind = "class"
      , multiclassProficiencies = { kind = "none" }
      , name = "Wizard"
      , primaryAbilities = { abilities = [ "int" ], kind = "all_of" }
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Classes/Wizard.md:3-25,31-35,56-82,94-114,134-190"
        }
      , savingThrowProficiencies = [ "int", "wis" ]
      , skillProficiencyChoice =
        { choose = 2
        , options =
          [ "arcana"
          , "history"
          , "insight"
          , "investigation"
          , "medicine"
          , "nature"
          , "religion"
          ]
        }
      , spellcasting =
          { kind = "wizard_spellcasting_creation"
          , spellcastingAbility = "int"
          , cantripAccess =
              { kind = "known_cantrips"
              , choose = 3
              , spellIds = [ "light", "fire_bolt", "ray_of_frost" ]
              , changeOn = { kind = "long_rest", count = 1 }
              }
          , spellbookAccess =
              { kind = "spellbook"
              , choose = 6
              , spells =
                [ { spellId = "detect_magic", spellLevel = 1 }
                , { spellId = "mage_armor", spellLevel = 1 }
                , { spellId = "magic_missile", spellLevel = 1 }
                , { spellId = "shield", spellLevel = 1 }
                , { spellId = "sleep", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                ] : List SpellbookSpell
              }
          , preparedAccess =
              { kind = "prepared_from_spellbook"
              , choose = 4
              , spellIds =
                [ "detect_magic", "mage_armor", "magic_missile", "sleep" ]
              , changeOn = { kind = "long_rest" }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingFocuses = [ "arcane_focus", "spellbook" ]
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_wizard_evoker" ] } ]
      , startingEquipment =
        [ { coinsGp = 5
          , id = "option_a"
          , items = Some
            [ { itemName = Some "Dagger"
              , kind = "draft_owned_item"
              , quantity = Some 2
              , unitId = None Text
              }
            , { itemName = Some "Arcane Focus (Quarterstaff)"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Robe"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Spellbook"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            , { itemName = Some "Scholar's Pack"
              , kind = "draft_owned_item"
              , quantity = None Natural
              , unitId = None Text
              }
            ]
          , kind = "item_bundle"
          }
        , { coinsGp = 55
          , id = "option_b"
          , items = None (List StartingItem)
          , kind = "coin_grant"
          }
        ] : List StartingEquipmentOption
      , weaponProficiencies = [ "simple" ]
      }

in  wizard
