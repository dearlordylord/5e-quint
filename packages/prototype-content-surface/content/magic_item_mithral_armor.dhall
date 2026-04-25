-- Mithral Armor — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#MithralArmor):
--   "Armor made of this substance can be worn under normal clothes. If
--    the armor normally imposes Disadvantage on Dexterity (Stealth)
--    checks or has a Strength requirement, the mithral version of the
--    armor doesn't."
--
-- The clothing sentence is descriptive/fictional positioning. The two
-- executable mechanics are suppression of Stealth-check Disadvantage
-- and removal of the armor Strength requirement.

let Grant
    : Type
    = { kind : Text
      , on : Optional (List Text)
      , skillFilter : Optional { kind : Text, skills : List Text }
      , requirement : Optional Text
      }

let suppressStealthDisadvantage
    : Grant
    = { kind = "suppress_roll_disadvantage"
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "stealth" ] }
      , requirement = None Text
      }

let removeStrengthRequirement
    : Grant
    = { kind = "remove_equipment_requirement"
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      , requirement = Some "strength"
      }

let armor =
      { kind = "magic_item"
      , id = "magic_item_mithral_armor"
      , name = "Mithral Armor"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#MithralArmor"
          }
      , description =
          "Mithral is a light, flexible metal. Armor made of this substance can be worn under normal clothes. If the armor normally imposes Disadvantage on Dexterity (Stealth) checks or has a Strength requirement, the mithral version of the armor doesn't."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants =
              [ suppressStealthDisadvantage, removeStrengthRequirement ]
          }
      , destruction = { kind = "none" }
      }

in  armor
