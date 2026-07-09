-- Push — SRD 5.2.1 Weapon Mastery property.
--
-- RAW (Equipment / Mastery Properties / Push):
--   If you hit a creature with this weapon, you can push the creature up to
--   10 feet straight away from yourself if it is Large or smaller.

let masteryPush =
      { kind = "mastery"
      , id = "mastery_push"
      , name = "Push"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Push" }
      , description =
          "If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller."
      , mechanics =
          { family = "on_hit_trigger"
          , optional = True
          , trigger = { kind = "weapon_hit" }
          , effect =
              { kind = "push_creature"
              , maxDistanceFeet = 10
              , direction = "straight_away_from_self"
              , maximumTargetSize = "large"
              }
          }
      }

in  masteryPush
