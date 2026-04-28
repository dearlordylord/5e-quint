-- Adamantine Armor — SRD 5.2.1 magic armor template.
let MagicTrait =
      { rarity : Text
      , attunement : { requiresAttunement : Bool }
      , mechanics : { family : Text, grants : List { kind : Text } }
      , destruction : { kind : Text }
      }

let armor =
      { kind = "armor_template"
      , template = "any_armor_magic"
      , id = "magic_item_adamantine_armor"
      , name = "Adamantine Armor"
      , provenance =
        { kind = "srd-5.2.1", section = "MagicItems#AdamantineArmor" }
      , description =
          "This suit of armor is reinforced with adamantine. While you're wearing it, any Critical Hit against you becomes a normal hit."
      , armorApplicability =
        { kind = "any_armor"
        , categories = [ "medium", "heavy" ]
        , excludedArmorIds = [ "armor_hide_armor" ]
        }
      , variants =
        [ { id = "magic_item_adamantine_armor"
          , name = "Adamantine Armor"
          , magic =
            { rarity = "uncommon"
            , attunement.requiresAttunement = False
            , mechanics =
              { family = "passive"
              , grants = [ { kind = "suppress_incoming_critical_hit" } ]
              }
            , destruction.kind = "none"
            }
          }
        ]
      }

in  armor
