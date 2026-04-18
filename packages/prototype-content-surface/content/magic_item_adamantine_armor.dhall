-- Adamantine Armor — SRD 5.2.1 Magic Item (uncommon).
-- Rules: "While you're wearing it, any Critical Hit against you
-- becomes a normal hit."

let adamantineArmor =
      { kind = "magic_item"
      , id = "magic_item_adamantine_armor"
      , name = "Adamantine Armor"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#AdamantineArmor"
          }
      , description =
          "This suit of armor is reinforced with adamantine, one of the hardest substances in existence. While you're wearing it, any Critical Hit against you becomes a normal hit."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants = [ { kind = "suppress_incoming_critical_hit" } ]
          }
      , destruction = { kind = "none" }
      }

in  adamantineArmor
