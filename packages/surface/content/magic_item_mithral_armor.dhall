-- Mithral Armor — SRD 5.2.1 magic armor template.
let SkillFilter = { kind : Text, skills : List Text }

let Effect =
      { kind : Text
      , on : Optional (List Text)
      , skillFilter : Optional SkillFilter
      , requirement : Optional Text
      }

let suppressStealthDisadvantage
    : Effect
    = { kind = "suppress_roll_disadvantage"
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "stealth" ] }
      , requirement = None Text
      }

let removeStrengthRequirement
    : Effect
    = { kind = "remove_equipment_requirement"
      , on = None (List Text)
      , skillFilter = None SkillFilter
      , requirement = Some "strength"
      }

let armor =
      { kind = "armor_template"
      , template = "any_armor_magic"
      , id = "magic_item_mithral_armor"
      , name = "Mithral Armor"
      , provenance = { kind = "srd-5.2.1", section = "Magic-Items/Items-I-P.md#Mithral Armor" }

      , armorApplicability =
        { kind = "any_armor"
        , categories = [ "medium", "heavy" ]
        , excludedArmorIds = [ "armor_hide_armor" ]
        }
      , variants =
        [ { id = "magic_item_mithral_armor"
          , name = "Mithral Armor"
          , magic =
            { rarity = "uncommon"
            , attunement.requiresAttunement = False
            , mechanics =
              { family = "passive"
              , condition = Some { kind = "wearing_item" }
              , grants =
                [ suppressStealthDisadvantage, removeStrengthRequirement ]
              }
            , destruction.kind = "none"
            }
          }
        ]
      }

in  armor
