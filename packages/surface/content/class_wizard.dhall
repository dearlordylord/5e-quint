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

let SpellSlotCapacity : Type = { spellLevel : Natural, count : Natural }

let WizardSpellcastingProgressionRow
    : Type
    = { atLevel : Natural
      , cantripCount : Natural
      , spellbookSpellCount : Natural
      , preparedSpellCount : Natural
      , spellSlots : List SpellSlotCapacity
      }

let wizard =
      { armorTraining = { kind = "none" }
      , className = "wizard"
      , description =
          "SRD Wizard class creation facts, including level-scaled spellbook, prepared spells, Spell Slots, Ritual Adept, Arcane Recovery, Scholar, and spellcasting focus facts."
      , featureGrants =
        [ { level = 1, unitId = "wizard_ritual_adept" }
        , { level = 1, unitId = "wizard_arcane_recovery" }
        , { level = 2, unitId = "wizard_scholar" }
        ]
      , hitPointDie = 6
      , id = "class_wizard"
      , kind = "class"
      , multiclassProficiencies = { kind = "none" }
      , name = "Wizard"
      , primaryAbilities = { abilities = [ "int" ], kind = "all_of" }
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Classes/Wizard.md:3-25,31-39,56-82,94-114,134-190"
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
          , featureLevel = 1
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
                , { spellId = "feather_fall", spellLevel = 1 }
                , { spellId = "mage_armor", spellLevel = 1 }
                , { spellId = "magic_missile", spellLevel = 1 }
                , { spellId = "shield", spellLevel = 1 }
                , { spellId = "sleep", spellLevel = 1 }
                , { spellId = "thunderwave", spellLevel = 1 }
                , { spellId = "chromatic_orb", spellLevel = 1 }
                , { spellId = "acid_arrow", spellLevel = 2 }
                , { spellId = "continual_flame", spellLevel = 2 }
                , { spellId = "darkness", spellLevel = 2 }
                , { spellId = "gust_of_wind", spellLevel = 2 }
                , { spellId = "mirror_image", spellLevel = 2 }
                , { spellId = "misty_step", spellLevel = 2 }
                , { spellId = "scorching_ray", spellLevel = 2 }
                , { spellId = "shatter", spellLevel = 2 }
                ] : List SpellbookSpell
              }
          , preparedAccess =
              { kind = "prepared_from_spellbook"
              , choose = 4
              , spellIds =
                [ "detect_magic"
                , "feather_fall"
                , "mage_armor"
                , "magic_missile"
                , "shield"
                , "sleep"
                , "thunderwave"
                , "chromatic_orb"
                , "acid_arrow"
                , "continual_flame"
                , "darkness"
                , "gust_of_wind"
                , "mirror_image"
                , "misty_step"
                , "scorching_ray"
                , "shatter"
                ]
              , changeOn = { kind = "long_rest" }
              }
          , spellSlotProjection =
              { kind = "leveled_spell_slots"
              , slots = [ { spellLevel = 1, count = 2 } ]
              , resetCadence = { kind = "long_rest" }
              }
          , spellcastingProgression =
              [ { atLevel = 1
                , cantripCount = 3
                , spellbookSpellCount = 6
                , preparedSpellCount = 4
                , spellSlots = [ { spellLevel = 1, count = 2 } ]
                }
              , { atLevel = 2
                , cantripCount = 3
                , spellbookSpellCount = 8
                , preparedSpellCount = 5
                , spellSlots = [ { spellLevel = 1, count = 3 } ]
                }
              , { atLevel = 3
                , cantripCount = 3
                , spellbookSpellCount = 10
                , preparedSpellCount = 6
                , spellSlots =
                  [ { spellLevel = 1, count = 4 }
                  , { spellLevel = 2, count = 2 }
                  ]
                }
              , { atLevel = 4
                , cantripCount = 4
                , spellbookSpellCount = 12
                , preparedSpellCount = 7
                , spellSlots =
                  [ { spellLevel = 1, count = 4 }
                  , { spellLevel = 2, count = 3 }
                  ]
                }
              , { atLevel = 5
                , cantripCount = 4
                , spellbookSpellCount = 14
                , preparedSpellCount = 9
                , spellSlots =
                  [ { spellLevel = 1, count = 4 }
                  , { spellLevel = 2, count = 3 }
                  , { spellLevel = 3, count = 2 }
                  ]
                }
              ] : List WizardSpellcastingProgressionRow
          , spellcastingFocuses = [ "arcane_focus", "spellbook" ]
          }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_wizard_evoker" ] } ]
      , toolProficiencies = { kind = "none" }
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
      , weaponProficiencies = [ { category = "simple", kind = "weapon_category" } ]
      }

in  wizard
