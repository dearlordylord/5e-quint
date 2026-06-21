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

let ClassSpellAccess
    : Type
    = { spellId : Text, spellLevel : Natural }

let cleric =
      { armorTraining =
        { categories = [ "light", "medium", "shield" ], kind = "trained" }
      , className = "cleric"
      , description =
          "SRD Cleric class creation and early progression facts, including class-list prepared Spell Access, Spell Slots, spellcasting focus facts, level 1-2 class feature grants, and the level 4 Ability Score Improvement feature grant."
      , featureGrants =
        [ { level = 1, unitId = "cleric_divine_order" }
        , { level = 2, unitId = "cleric_channel_divinity" }
        , { level = 4, unitId = "cleric_ability_score_improvement_l4" }
        ]
      , hitPointDie = 8
      , id = "class_cleric"
      , kind = "class"
      , multiclassProficiencies =
        { kind = "fixed"
        , proficiencies =
          [ { category = "light", kind = "armor_category" }
          , { category = "medium", kind = "armor_category" }
          , { category = "shield", kind = "armor_category" }
          ]
        }
      , name = "Cleric"
      , primaryAbilities = { abilities = [ "wis" ], kind = "all_of" }
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Cleric.md:3-24,33-109,142-179" }
      , savingThrowProficiencies = [ "wis", "cha" ]
      , skillProficiencyChoice =
        { choose = 2
        , options =
          [ "history", "insight", "medicine", "persuasion", "religion" ]
        }
      , spellcasting =
        { kind = "list_prepared_spellcasting_progression_creation"
        , featureLevel = 1
        , spellcastingAbility = "wis"
        , cantripAccess =
          { kind = "known_cantrips_from_class_spell_list"
          , choose = 3
          , spellIds = [ "guidance", "sacred_flame", "thaumaturgy" ]
          , changeOn = { kind = "class_level", count = 1 }
          }
        , preparedAccess =
          { kind = "prepared_from_class_spell_list"
          , choose = 4
          , spells =
                [ { spellId = "bless", spellLevel = 1 }
                , { spellId = "cure_wounds", spellLevel = 1 }
                , { spellId = "guiding_bolt", spellLevel = 1 }
                , { spellId = "shield_of_faith", spellLevel = 1 }
                , { spellId = "healing_word", spellLevel = 1 }
                , { spellId = "inflict_wounds", spellLevel = 1 }
                , { spellId = "sanctuary", spellLevel = 1 }
                , { spellId = "aid", spellLevel = 2 }
                ]
              : List ClassSpellAccess
          , changeOn = { kind = "long_rest", replacementCount = "any" }
          }
        , spellSlotProjection =
          { kind = "leveled_spell_slots"
          , slots = [ { spellLevel = 1, count = 2 } ]
          , resetCadence.kind = "long_rest"
          }
        , spellcastingProgression =
          [ { atLevel = 1
            , cantripCount = 3
            , preparedSpellCount = 4
            , spellSlots = [ { spellLevel = 1, count = 2 } ]
            }
          , { atLevel = 2
            , cantripCount = 3
            , preparedSpellCount = 5
            , spellSlots = [ { spellLevel = 1, count = 3 } ]
            }
          , { atLevel = 3
            , cantripCount = 3
            , preparedSpellCount = 6
            , spellSlots =
              [ { spellLevel = 1, count = 4 }
              , { spellLevel = 2, count = 2 }
              ]
            }
          ]
        , spellcastingFocus = "holy_symbol"
        }
      , subclassChoices =
        [ { level = 3, options = [ "subclass_cleric_life_domain" ] } ]
      , startingEquipment =
            [ { coinsGp = 7
              , id = "option_a"
              , items = Some
                [ { itemName = Some "Chain Shirt"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Shield"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Mace"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Holy Symbol"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                , { itemName = Some "Priest's Pack"
                  , kind = "draft_owned_item"
                  , quantity = None Natural
                  , unitId = None Text
                  }
                ]
              , kind = "item_bundle"
              }
            , { coinsGp = 110
              , id = "option_b"
              , items = None (List StartingItem)
              , kind = "coin_grant"
              }
            ]
          : List StartingEquipmentOption
      , toolProficiencies.kind = "none"
      , weaponProficiencies =
        [ { category = "simple", kind = "weapon_category" } ]
      }

in  cleric
