-- Robe of the Archmagi — SRD 5.2.1 magic item (legendary, requires
-- attunement by a Sorcerer, Warlock, or Wizard).
--
-- Honest subset against the current surface:
--   • passive worn-item bonuses to spell save DC and spell attack rolls
--   • attunement restriction by class list
--
-- Deferred / omitted:
--   • Armor. "If you aren't wearing armor, your base Armor Class is 15
--     plus your Dexterity modifier." The current surface cannot express
--     a conjunction of equipment predicates (`wearing_item` AND
--     `unarmored`) on a passive grant.
--   • Magic Resistance. "You have Advantage on saving throws against
--     spells and other magical effects." The current surface can grant
--     advantage on saving throws broadly, or filter by save ability, but
--     it cannot narrow the rider to magical/spell-caused saves only.

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      }

let WearingItemCondition = { kind : Text }

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
          "You gain these benefits while wearing the robe. Armor: if you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier. Magic Resistance: you have Advantage on saving throws against spells and other magical effects. War Mage: your spell save DC and spell attack bonus each increase by 2. The Armor and Magic Resistance clauses are omitted from this authored subset; see proposal-magic_item_robe_of_the_archmagi.md."
      , mechanics =
          { family = "passive"
          , condition = Some { kind = "wearing_item" }
          , grants =
              [ { kind = "modify_save_dc"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = None (List Text)
                }
              , { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = Some ["spell_attack_roll"]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  robeOfTheArchmagi
