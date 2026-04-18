-- Robe of the Archmagi — SRD 5.2.1 magic item (legendary, requires
-- attunement by a Sorcerer, Warlock, or Wizard).
--
-- Honest subset against the current surface:
--   • passive worn-item bonuses to spell save DC and spell attack rolls
--   • attunement restriction by class list
--
-- Deferred / omitted:
--   • Magic Resistance. "You have Advantage on saving throws against
--     spells and other magical effects." The current surface can grant
--     advantage on saving throws broadly, or filter by save ability, but
--     it cannot narrow the rider to magical/spell-caused saves only.

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , const : Optional Natural
      , abilityMod : Optional Text
      , on : Optional (List Text)
      }

let EquipmentPredicate =
      { kind : Text
      , predicates : Optional (List { kind : Text })
      }

let AttunementRestriction =
      { kind : Text
      , classes : Optional (List Text)
      }

let robeOfTheArchmagi =
      { kind = "magic_item"
      , id = "magic_item_robe_of_the_archmagi"
      , name = "Robe of the Archmagi"
      , rarity = "legendary"
      , requiresAttunement = True
      , attunementRestriction =
          Some
            { kind = "class_list"
            , classes = Some ["sorcerer", "warlock", "wizard"]
            }
      : Optional AttunementRestriction
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RobeOfTheArchmagi"
          }
      , description =
          "You gain these benefits while wearing the robe. Armor: if you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier. Magic Resistance: you have Advantage on saving throws against spells and other magical effects. War Mage: your spell save DC and spell attack bonus each increase by 2. The Magic Resistance clause is omitted from this authored subset; see proposal-magic_item_robe_of_the_archmagi.md."
      , mechanics =
          { family = "passive"
          , condition =
              Some
                { kind = "all_of"
                , predicates =
                    Some
                      [ { kind = "wearing_item" }
                      , { kind = "unarmored" }
                      ]
                }
              : Optional EquipmentPredicate
          , grants =
              [ { kind = "modify_ac_set_base"
                , delta = { kind = "fixed_dice", dice = 0, dieSize = 1, sign = "+" }
                , const = Some 15
                , abilityMod = Some "dex"
                , on = None (List Text)
                }
              , { kind = "modify_save_dc"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , const = None Natural
                , abilityMod = None Text
                , on = None (List Text)
                }
              , { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , const = None Natural
                , abilityMod = None Text
                , on = Some ["spell_attack_roll"]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  robeOfTheArchmagi
