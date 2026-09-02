-- Nick — SRD 5.2.1 Mastery Property.
-- The Light property's extra attack can be made as part of the Attack action
-- instead of as a Bonus Action, at most once per turn.

let masteryNick =
      { kind = "mastery"
      , id = "mastery_nick"
      , name = "Nick"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Nick" }
      , mechanics =
          { family = "light_property_extra_attack_timing"
          , optional = True
          , trigger = { kind = "light_property_extra_attack" }
          , replacement = { from = "bonus_action", to = "attack_action" }
          , usageLimit = { kind = "once_per_turn" }
          }
      }

in  masteryNick
